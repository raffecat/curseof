#!/usr/bin/node

process.chdir(__dirname);

var fs = require('fs');
var http = require('http'), server = http.createServer();
var hasOwn = Object.prototype.hasOwnProperty;
var log = console.log;

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

  var inRoom = 0;
  var room = null;

  if (devMode) loadFiles(); // reload data files.

  socket.on('init', function (data) {
    socket.emit( 'z', scripts.game );
  });

  socket.on('r', function (id) {
    // change room.
    if (hasOwn.call(rooms, id)) {
      inRoom = id;
      room = rooms[id];
      socket.emit( 'r', [room.startX, room.startY, room.map] );
    }
  });

  socket.on('x', function (exit) {
    // follow an exit to a new room.
    if (room) {
      var exits = room.exits || [];
      var ofs = exit * 2;
      if (ofs+1 < exits.length) {
        var toRoom = exits[ofs], entry = exits[ofs+1];
        if (hasOwn.call(rooms, toRoom)) {
          // swicth rooms.
          inRoom = toRoom;
          room = rooms[toRoom];
          // find the entrance.
          var startX = room.startX || 0;
          var startY = room.startY || 0;
          var entries = room.entry || [];
          var entryOfs = entry * 2;
          if (entryOfs+1 < entries.length) {
            startX = entries[entryOfs];
            startY = entries[entryOfs+1];
          } else {
            log("bad room-entry "+entry+" in exit "+exit+" from room "+inRoom);
          }
          // notify the client.
          socket.emit( 'r', [startX, startY, room.map] );
        } else {
          log("bad room-id "+toRoom+" in exit "+exit+" from room "+inRoom);
        }
      } else {
        log("bad exit "+exit+" from room "+inRoom);
      }
    }
  });

});

server.listen(port);
