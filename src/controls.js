
var mouseIsDown = false;

function onMouseDown(event) {
  event.preventDefault();
  if (event.button === 0) {
  } else if (event.button === 1) {
  } else if (event.button === 2) {
  }
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

var keys = [];

var jump = false;
var moveUp = false;
var moveDown = false;
var moveLeft = false;
var moveRight = false;

function onKeyDown(event) {
  // event.preventDefault();
  var code = event.keyCode || event.which;
  keys[code] = true;
  switch (code) {
    case 32: /*Space*/ jump = true; break;

    case 38: /*up*/
    case 87: /*W*/ moveUp = true; break;

    case 40: /*down*/
    case 83: /*S*/ moveDown = true; break;

    case 37: /*left*/
    case 65: /*A*/ moveLeft = true; break;

    case 39: /*right*/
    case 68: /*D*/ moveRight = true; break;
  }
}

function onKeyUp(event) {
  var code = event.keyCode || event.which;
  keys[code] = false;
  switch (code) {
    case 32: /*Space*/ jump = false; break;

    case 38: /*up*/
    case 87: /*W*/ moveUp = false; break;

    case 40: /*down*/
    case 83: /*S*/ moveDown = false; break;

    case 37: /*left*/
    case 65: /*A*/ moveLeft = false; break;

    case 39: /*right*/
    case 68: /*D*/ moveRight = false; break;
  }
}

document.addEventListener( 'keydown', onKeyDown, false );
document.addEventListener( 'keyup', onKeyUp, false );

document.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
document.addEventListener( 'mousedown', onMouseDown, false );
document.addEventListener( 'mousewheel', onMouseWheel, false );
