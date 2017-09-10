#!/usr/bin/node

process.chdir(__dirname);

var fs = require('fs');
var http = require('http'), server = http.createServer();

var devMode = ~process.argv.indexOf('--dev');

var io = require('socket.io').listen(server, {
    origins: devMode ? '*:*' : 'curse.raffe.io:*',
    'log level': devMode ? 3 : 2
});
var port = devMode ? 443 : 4430;

var jsFiles = ['game'];

var scripts = {};
if (!devMode) {
    jsFiles.forEach(function(name){
        scripts[name] = fs.readFileSync('gen/'+name+'.js', 'utf8');
    });
}

io.sockets.on('connection', function (socket) {

    socket.on('init', function (data) {
        if ( devMode ) {
            socket.emit( 'z', fs.readFileSync('gen/game.js','utf8') );
        } else {
            socket.emit( 'z', scripts.game );
        }
    });

});

server.listen(port);
