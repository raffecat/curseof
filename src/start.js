
function getElem(id) { return document.getElementById(id); }
function showStatus(msg) { getElem('p').firstChild.nodeValue = msg; }
function removeElem(id,e) { (e=getElem(id)).parentNode.removeChild(e); }

var log = window.console && console.log && console.log.bind && console.log.bind(console) || function(){};
var trace = log;

function initGame() {
  var renderer = GLRenderer();

  var FloatArray = window.WebGLFloatArray || window.Float32Array;
  var Uint16Array = window.Uint16Array;

  var IDENTITY = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  var noTransform = new FloatArray(IDENTITY); // TODO.
  var currentTransform = noTransform; // TODO.

  var cameraTransform = new FloatArray(IDENTITY);

  // rendering.

  var tileImg;
  var tileGeom;
  var layers = [];
  var spd = 1;

  function render(dt) {
    // camera panning (hold shift to speed up)
    var sspd = keys[16] ? (spd * 10) : spd;
    if (keys[37]) {
      cameraTransform[12] += dt * sspd;
    } else if (keys[39]) {
      cameraTransform[12] -= dt * sspd;
    }
    if (keys[38]) {
      cameraTransform[13] += dt * sspd;
    } else if (keys[40]) {
      cameraTransform[13] -= dt * sspd;
    }

    renderer.setViewMatrix(cameraTransform);
    if (tileImg.texture) {
      tileGeom.draw(tileImg.texture);
    }

    // render all layers.
    for (var i=0; i<layers.length; i++) {
      layers[i].render(dt);
    }
  }

  renderer.render = render;

  // images.

  function loadImage(src, done) {
    var img = new Image();
    img.onload = function() {
      img.onload = img.onerror = null; // gc
      done(img);
    };
    img.onerror = function() {
      img.onload = img.onerror = null; // gc
      log("EImage");
      done(null);
    };
    img.src = src;
  }

  function ImageLoader(src, obj, done) {
    obj.name = src;
    if (obj.wrap == null) obj.wrap = false;
    if (obj.opaque == null) obj.opaque = false;
    loadImage(src, function (img) {
      if (img) {
        log(img, obj);
        obj.data = img;
        obj.width = img.width;
        obj.height = img.height;
        obj.texture = renderer.newTexture(obj);
      }
      done();
    });
  }

  var images = CacheLoader(ImageLoader);

  var w = (256/2), h = (384/2);
  var quadVerts = new FloatArray([ -w,-h,0,1, w,-h,1,1, -w,h,0,0, w,h,1,0 ]);
  var quadInds = new Uint16Array([0,1,2, 1,3,2]);

  // load tiles.
  tileImg = images.get('/assets/tiles.png', {opaque:true,wrap:false});
  tileGeom = renderer.newGeometry(quadVerts, quadInds);

  // wait for all the images to finish loading.
  images.wait(startGame);

  function startGame() {
    // hide the loader and start the game.
    trace("STARTING");
    removeElem('p'); removeElem('l');
  }
}

(function(){
  try {
    initGame();
  } catch (err) {
    window.console && console.log(err);
    if ( ~err.toString().indexOf('WebGL') ) {
        showStatus( 'No WebGL' );
    } else if ( ~err.toString().indexOf('getContext') ) {
        showStatus( 'No canvas' );
    } else {
        showStatus( 'Error 3' );
    }
  }
})();
