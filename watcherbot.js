var version = '0.3.0',
	sys = require('sys'),
	os = require('os'),
	fs = require('fs'),
	net = require('net'),
	util = require('util'),
	moment = require('moment'),
	xmpp = require('simple-xmpp'),
	humanize = require('humanize'),
	exec = require('child_process').exec,
	//ping = require('ping-wrapper2'),
	hostnamearray = os.hostname().split('.'),
	hostname = hostnamearray[0];

var config = require('./config.json');

var pretext = config.nick + '> ';

xmpp.on('online', function() {
	util.log('Connected to ' + config.host );
	xmpp.join(config.muc + '/' + config.nick );
	util.log('Joined ' + config.muc );

});

xmpp.on('chat', function(from, message) {
	if (message.indexOf('hello') !== -1) {
		xmpp.send(from, pretext + 'Hello from ' + os.hostname());
	}
	if (message.indexOf('version') !== -1) {
		xmpp.send(from, pretext  + 'WatcherBot ' + version);
	}

	if (message.indexOf('uptime') !== -1) {
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

		xmpp.send(from, pretext + hostname + " " + upstring +
			'\n' + pretext + "loadavg: " + loadavg[0].toFixed(2) + " " + loadavg[1].toFixed(2) + " " + loadavg[2].toFixed(2) +
			'\n' + pretext + "mem: " + humanize.filesize(os.totalmem()) + "/" + humanize.filesize(os.freemem())
		);
	}

	if (message.indexOf('status') !== -1) {
		exec(config.statscmd + ' | grep -e "Services Ok" -e "Hosts Up" | sed "s/       / /g"', function(error, stdout, stderr) {
			var array1 = stdout.split("\n");
			for ( i = 0; i < array1.length; i++) {
    				array1[i] = pretext + array1[i];
			}
			stdout = array1.join("\n");
			xmpp.send(from, stdout + config.baseurl + "/icinga/");
		});
	}

	if (message.indexOf('url') !== -1) {
		xmpp.send(from, pretext + config.baseurl);
	}

});

  
// Create socket for alert data to be sent to MUC
fs.stat(config.botsock, function (err) {
	if (!err) fs.unlinkSync(config.botsock);
	var localsocket  = net.createServer(function(connection) {
		util.log('Socket created at s'+config.botsock);
		connection.on('end', function() {
			util.log('socket disconnected');
		});

		connection.on('data', function(chunk) {
			// util.log('got socket data:' +  chunk);
  			xmpp.send(config.muc, pretext + chunk , true);
		});
	});
	localsocket.listen(config.botsock, function() {
		util.log('socket bound on '+config.botsock);
	});
});

xmpp.on('groupchat', function(conference, from, message, stamp) {
	if(from != config.nick)
		if (message.indexOf('!hello') !== -1) {
  			xmpp.send(conference, pretext + 'Hello from ' + os.hostname() , true);
		}
		if (message.indexOf('!version') !== -1) {
  			xmpp.send(conference, pretext  + 'WatcherBot ' + version , true);
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
	
  			xmpp.send(conference, 
				pretext + hostname + " " + upstring +
				'\n' + pretext + "loadavg: " + loadavg[0].toFixed(2) + " " + loadavg[1].toFixed(2) + " " + loadavg[2].toFixed(2) +
				'\n' + pretext + "mem: " + humanize.filesize(os.totalmem()) + "/" + humanize.filesize(os.freemem()) , true
			);
		}

		if (message.indexOf('!status') !== -1) {
			exec(config.statscmd + ' | grep -e "Services Ok" -e "Hosts Up" | sed "s/       / /g"', function(error, stdout, stderr) {
				var array1 = stdout.split("\n");
				for ( i = 0; i < array1.length; i++) {
    					array1[i] = pretext + array1[i];
				}
				stdout = array1.join("\n");
  				xmpp.send(conference, stdout + config.baseurl + "/icinga/" , true);
			});
		}
	
		if (message.indexOf('!url') !== -1) {
  			xmpp.send(conference, pretext + config.baseurl, true);
		}
});

xmpp.on('error', function(err) {
    console.error(err);
});

xmpp.connect({
	jid	: config.jid,
  	password: config.password,
  	host	: config.host,
        port	: config.port
});

//xmpp.on('subscribe', function(from) {
//if (from === 'twh@talk.sinewavetech.com') {
//    xmpp.acceptSubscription(from);
//    }
//});

//xmpp.subscribe('twh@talk.sinewavetech.com');
// check for incoming subscription requests
//xmpp.getRoster();
