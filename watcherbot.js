var version = '0.2.1',
    os = require('os'),
    fs = require('fs'),
    sys = require('sys'),
    net = require('net'),
    util = require('util'),
    nconf = require('nconf'),
    moment = require('moment'),
    xmpp = require('node-xmpp'),
    request = require('request'),
    humanize = require('humanize'),
    ping = require('ping-wrapper2'),
    exec = require('child_process').exec,
    random = require('underscore').random,
    hostnamearray = os.hostname().split('.'),
    hostname = hostnamearray[0];

nconf.argv()
    .env()
    .file({ file: 'config.json'}
);

var jid = nconf.get('xmpp.jid'),
    password = nconf.get('xmpp.pass'),
    xmpp_server = nconf.get('xmpp.server'),
    room_jid = nconf.get('xmpp.muc'),
    room_nick = nconf.get('xmpp.mucnick'),
    room_passwd = nconf.get('xmpp.mucpass'),
    weburl = nconf.get('watcher.icinga'),
    statscmd = nconf.get('watcher.statscmd'),
    botsocket = nconf.get('watcher.socket');

// Create socket for alert data to be sent to MUC
fs.stat(botsocket, function (err) {
    if (!err) fs.unlinkSync(botsocket);
    var localsocket  = net.createServer(function(connection) {
        util.log('Socket created at s'+botsocket);
        connection.on('end', function() {
            util.log('socket disconnected');
        });

        connection.on('data', function(chunk) {
            util.log('got data:' +  chunk);
            var params = {};
            params.to = room_jid;
            params.type = 'groupchat';
            cl.send(new xmpp.Element('message', params).c('body').t('LLDC-EG: ' + chunk));
        });
    });
    localsocket.listen(botsocket, function() { //'listening' listener
        util.log('Socket bound on '+botsocket);
    });
});

util.log('Connecting to XMPP server '+xmpp_server);
var cl = new xmpp.Client({
    jid: jid + '/' + hostname,
    password: password,
    host: xmpp_server || null
});

// Once connected, set available presence and join room
cl.on('online', function() {
    // set ourselves as online
    cl.send(new xmpp.Element('presence', { }).
        c('show').t('chat')
    );

    // join room (and request no chat history)
    util.log("Joining " + room_jid);
    cl.send(function() {
        el = new xmpp.Element('presence', { to: room_jid+'/'+room_nick });
        x = el.c('x', { xmlns: 'http://jabber.org/protocol/muc' });
        x.c('history', { maxstanzas: 0, seconds: 1});
        if (room_passwd != "") {
            x.c('password').t(room_passwd);
        }
        return x;
    }()); // immediately called

    var params = {};
    params.to = room_jid;
    params.type = 'groupchat';
    //cl.send(new xmpp.Element('message', params).c('body').t('Hidey ho!'));

    // send keepalive data or server will disconnect us after 150s of inactivity
    setInterval(function() {
        cl.send(' ');
    }, 30000);
});

cl.on('stanza', function(stanza) {
    // always log error stanzas
    if (stanza.attrs.type == 'error') {
        util.log('[error] ' + stanza);
        return;
    }

    // ignore everything that isn't a room message
    if (!stanza.is('message') || !stanza.attrs.type == 'groupchat') {
        return;
    }

    // ignore messages we sent
    if (stanza.attrs.from == room_jid+'/'+room_nick) {
        return;
    }

    var body = stanza.getChild('body');
    // message without body is probably a topic change
    if (!body) {
        return;
    }
    var message = body.getText();

    // is private ?
    var params = {};
    if (stanza.attrs.from.indexOf(room_jid) === 0) {
        params.to = room_jid;
        params.type = 'groupchat';

        // mentation ?
        if (message.substring(0, room_nick.length) == room_nick) {
            response = stanza.attrs.from.substring(room_jid.length + 1) + ': ' + response;
        }
    } else {
        params.to = stanza.attrs.from;
        params.type = 'chat';
    }

    if (message.indexOf('!version') !== -1) {
        cl.send(new xmpp.Element('message', params).c('body').t(room_nick+': watcherbot '+version));
    }

    // Look for messages like "!weather 94085"
    if (message.indexOf('!weather') !== -1) {
        var search = message.substring(9);
        util.log('Fetching weather for: "' + search + '"');

        // hit Yahoo API
        var query = 'select item from weather.forecast where location = "'+search+'"';
        var uri = 'http://query.yahooapis.com/v1/public/yql?format=json&q='+encodeURIComponent(query);
        request({'uri': uri}, function(error, response, body) {
            body = JSON.parse(body);
            var item = body.query.results.channel.item;
            if (!item.condition) {
                response = item.title;
            } else {
                response = item.title+': '+item.condition.temp+' degrees and '+item.condition.text;
            }

            // send response
            cl.send(new xmpp.Element('message', params).  c('body').t(response));
        });
    }

    if (message.indexOf('!hello') !== -1) {
        cl.send(new xmpp.Element('message', params).c('body').t('Hi there from ' + os.hostname()));
    }

    if (message.indexOf('!help') !== -1) {
        var helps = [
            "Help, I need somebody",
            "Help, not just anybody",
            "Help, you know I need someone, help",
            "Help me if you can, I'm feeling down",
            "Help me, get my feet back on the ground",
            ]
        cl.send(new xmpp.Element('message', params).c('body').t(helps[_.random(0, helps.length)]));
    }

    if (message.indexOf('!uptime') !== -1) {
        var loadavg = os.loadavg(),
            uptime = os.uptime(),
            upstring = '';
        var years = moment.duration(uptime,'seconds').years(),
            months = moment.duration(uptime,'seconds').months(),
            days = moment.duration(uptime,'seconds').days(),
            hours = moment.duration(uptime,'seconds').hours(),
            minutes = moment.duration(uptime,'seconds').minutes();

        if (years !== 0) upstring += years + ' years ';
        if (months !== 0) upstring += months + ' months ';
        if (days !== 0) upstring += days + ' days ';
        if (hours !== 0) upstring += hours + ' hours ';
        if (minutes !== 0) upstring += minutes + ' minutes ';
        if (seconds !== 0) upstring += seconds + ' seconds';

        cl.send(new xmpp.Element('message', params).c('body').t(
            hostname + " " + upstring +
            "\nloadavg: " + loadavg[0].toFixed(2) + " " + loadavg[1].toFixed(2) + " " + loadavg[2].toFixed(2) +
            "\nmem: " + humanize.filesize(os.totalmem()) + "/" + humanize.filesize(os.freemem())
        ));
    }

    if (message.indexOf('!status') !== -1) {
        exec(statscmd + ' | grep -e "Services Ok" -e "Hosts Up" | sed "s/       / /g"', function(error, stdout, stderr) {
            cl.send(new xmpp.Element('message', params).c('body').t(room_nick+'\n' + stdout + weburl));
        });
    }

    if (message.indexOf('!url') !== -1) {
        cl.send(new xmpp.Element('message', params).c('body').t(room_nick+'\n' + weburl));
    }

    if (message.indexOf('!psy') !== -1) {
        cl.send(new xmpp.Element('message', params).c('body').t('Oppan gang-namseutayil - http://www.youtube.com/watch?v=9bZkp7q19f0\n'));
    }

    if (message.indexOf('!trolo') !== -1) {
        cl.send(new xmpp.Element('message', params).c('body').t('Trolololo - http://trololololololololololo.com\nhttp://www.youtube.com/watch?v=dIR3XFuY4Qs\n'));
    }

    if (message.indexOf('!xkcd') !== -1) {
        var helps = [
            "http://xkcd.com/327/",
            "http://xkcd.com/149/",
            "http://xkcd.com/208/",
        ]
        cl.send(new xmpp.Element('message', params).c('body').t(helps[random(0, helps.length)]));
    }

    if (message.indexOf('!ping') !== -1) {
        var splits = message.split(" ");
        if (splits.length == 2) {
            var pinghost = splits[1];
        } else {
            var pinghost = 'google.com';
        }
          var ping = new ping(pinghost);

        util.log('Pinging ' + pinghost);

          ping.on('data', function(data) {
            return util.log(util.inspect(data));
          });

          ping.on('exit', function(data) {
            cl.send(new xmpp.Element('message', params).c('body').t(
                room_nick + ' - ' + pinghost + ' ping statistics\n' +
                data.sent + ' packets transmitted, ' + data.recieved + ' received,  ' +  data.loss + ' packet loss, time ' +  data.time + 'ms')
            );
            return util.log(util.inspect(data));
          });
    }
});

