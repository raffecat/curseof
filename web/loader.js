function status(t) {
  document.getElementById('p').firstChild.nodeValue = t;
}

// Set Error 1 message in case of script error below.
status('Crashed!');

function loadScript( url, callback ) {
  // asynchronous script loader with retry.
  function attempt() {
    var head = document.getElementsByTagName("style")[0];
    var sc = document.createElement("script");
    function finish() { sc.onload = sc.onerror = null; }
    sc.type = "text/javascript"; sc.async = true;
    sc.onload = function() { finish(); callback(); };
    sc.onerror = function() { finish(); sc.parentNode.removeChild(sc); setTimeout(attempt, 1000); };
    sc.src = url;
    head.parentNode.insertBefore(sc, head);
  }
  attempt();
}

var ioHost = 'http://'+window.location.hostname+':443';
loadScript( ioHost + "/socket.io/socket.io.js", scriptLoaded );
function scriptLoaded() {
  var socket = io.connect(ioHost);
  var state = { w: socket };
  socket.on('z', function (data) { var fn = Function('$',data)(state); });
  socket.emit('init',{});
}

// All looks good, started connecting.
status('Connecting...');
