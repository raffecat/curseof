
var mouseIsDown = false;

if (0) {

  function onMouseDown(event) {
    event.preventDefault();
    // if (event.button === 0) {}
    mouseIsDown = true;
    document.addEventListener( 'mousemove', onMouseMove, false );
    document.addEventListener( 'mouseup', onMouseUp, false );
  }

  function onMouseMove(event) {
    event.preventDefault();
    if (mouseIsDown) {
    }
  }

  function onMouseUp(event) {
    mouseIsDown = false;
    document.removeEventListener( 'mousemove', onMouseMove, false );
    document.removeEventListener( 'mouseup', onMouseUp, false );
  }

  function onMouseWheel(event) {
    var delta = event.wheelDelta;
  }

  document.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
  document.addEventListener( 'mousedown', onMouseDown, false );
  document.addEventListener( 'mousewheel', onMouseWheel, false );

}

var keys = [];

if (1) {

  function onKeyDown(event) {
    // event.preventDefault();
    var code = event.keyCode || event.which;
    keys[code] = true;
  }

  function onKeyUp(event) {
    var code = event.keyCode || event.which;
    keys[code] = false;
  }

  document.addEventListener( 'keydown', onKeyDown, false );
  document.addEventListener( 'keyup', onKeyUp, false );

}
