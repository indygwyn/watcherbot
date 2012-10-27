var fs    = require('fs'),
    nconf = require('nconf');

nconf.argv()
     .env()
     .file({ file: './config.json' });

nconf.set( 'xmpp.jid', 'username@jabber.org' );
nconf.set( 'xmpp.pass', 'mysecretpasswrod' );
nconf.set( 'xmpp.server', 'jabber.org' );
nconf.set( 'xmpp.muc', 'myroom@conference.jabber.org' );
nconf.set( 'xmpp.mucpass', 'chatroompasswrod' );
nconf.set( 'xmpp.mucnick', 'chatroomnickname' );

nconf.set( 'watcher.observium', 'http://www.observium.org/wiki/Main_Page' );
nconf.set( 'watcher.icinga', 'http://https://www.icinga.org' );
nconf.set( 'watcher.rancid', 'http://www.shrubbery.net/rancid/' );
nconf.set( 'watcher.smokeping', 'http://oss.oetiker.ch/smokeping/' );
nconf.set( 'watcher.wiki', 'https://www.dokuwiki.org/dokuwiki' );
nconf.set( 'watcher.socket', '/tmp/watcherbot.sock' );

nconf.save(function (err) {
    fs.readFile('./config.json', function (err, data) {
        console.dir(JSON.parse(data.toString()))
    });
});
