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
var rooms = {};
var scripts = {};

function loadFiles() {
  rooms = JSON.parse(fs.readFileSync('gen/rooms.json', 'utf8'));
  jsFiles.forEach(function(name){
    scripts[name] = fs.readFileSync('gen/'+name+'.js', 'utf8');
  });
}

loadFiles();

io.sockets.on('connection', function (socket) {

  if (devMode) loadFiles(); // reload data files.

  socket.on('init', function (data) {
    socket.emit( 'z', scripts.game );
  });

  socket.on('r', function (id) {
    // change room.
    if (rooms[id]) {
      socket.emit( 'r', rooms[id] );
    }
  });

});

server.listen(port);
