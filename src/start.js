
function getElem(id) { return document.getElementById(id); }
function showStatus(msg) { getElem('p').firstChild.nodeValue = msg; }
function removeElem(id,e) { (e=getElem(id)).parentNode.removeChild(e); }

function initGame() {
  showStatus( 'Loading...' );

  var renderer = GLRenderer();

  var IDENTITY = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  var noTransform = new FloatArray(IDENTITY); // TODO.
  var currentTransform = noTransform; // TODO.

  var cameraTransform = new FloatArray(IDENTITY);
  var spriteTransform = new FloatArray(IDENTITY);

  // rendering.

  var ready = false;
  var movers = [];
  var lines = [];
  var sprites = [];
  var player = null;
  var panX=0, panY=0, spd = 1;
  var loadLatch=false, levelNum=0;

  function render(dt) {
    if (!(ready && tileImg.texture)) return;

    // cycle through maps with 'M' for testing.
    if (keys[77]) {
      if (!loadLatch) {
        loadLatch = true;
        levelNum += 1;
        if (levelNum > 3) levelNum = 0;
        var socket = GS.w; // injected globals.
        socket.emit('r',levelNum);
      }
    } else {
      loadLatch = false;
    }

    // camera panning with arrow keys (hold shift to speed up)
    var sspd = keys[16] ? (spd * 10) : spd;
    if (keys[37]) panX += dt * sspd; else if (keys[39]) panX -= dt * sspd;
    if (keys[40]) panY += dt * sspd; else if (keys[38]) panY -= dt * sspd;
    cameraTransform[12] = Math.floor(panX);
    cameraTransform[13] = Math.floor(panY);

    // update all movers.
    for (var i=0; i<movers.length; i++) {
      var s = movers[i];
      s.update(s, dt);
    }

    // move the player.
    if (player) {
      walkMove(player, dt);
    }

    // animate all sprites.
    animateEnts(sprites, dt);

    // render the room geometry.
    renderer.setViewMatrix(cameraTransform);
    roomGeom.draw(tileImg.texture);

    // render all lines (in world space)
    for (var i=0; i<lines.length; i++) {
      var s = lines[i];
      s.geom.draw(s.image.texture, 0, 6);
    }

    // render all sprites.
    for (var i=0; i<sprites.length; i++) {
      var s = sprites[i];
      spriteTransform[0] = (s.flip ? -1 : 1);
      spriteTransform[12] = cameraTransform[12] + s.x;
      spriteTransform[13] = cameraTransform[13] + s.y;
      renderer.setViewMatrix(spriteTransform);
      //log(i, s.index, s.remain, s.loop);
      var frame = s.frames[s.index];
      s.geom.draw(s.image.texture, frame.iofs, frame.inum);
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
        obj.data = img;
        obj.width = img.width;
        obj.height = img.height;
        obj.texture = renderer.newTexture(obj);
      }
      done();
    });
  }

  var images = CacheLoader(ImageLoader);

  //var quadVerts = new FloatArray([ -w,-h,0,0, w,-h,1,0, -w,h,0,1, w,h,1,1 ]);
  //var quadInds = new Uint16Array([0,1,2, 1,3,2]);

  // load tiles.
  var tileImg = images.get('/assets/tiles.png', {opaque:true,wrap:false});
  var roomGeom = renderer.newGeometry();

  var healthImg = images.get('/assets/health.png', {opaque:false,wrap:false});
  var belleImg = images.get('/assets/belle.png', {opaque:false,wrap:false});
  var torchImg = images.get('/assets/flame.png', {opaque:false,wrap:false});
  var batImg = images.get('/assets/bat.png', {opaque:false,wrap:false});
  var crawlerImg = images.get('/assets/crawler.png', {opaque:false,wrap:false});
  var spiderImg = images.get('/assets/spider.png', {opaque:false,wrap:false});
  var springImg = images.get('/assets/spring.png', {opaque:false,wrap:false});
  var ropeImg = images.get('/assets/rope.png', {opaque:false,wrap:true});
  var sliverImg = images.get('/assets/sliver.png', {opaque:false,wrap:true});

  // wait for all the images to finish loading.
  images.wait(startGame);

  var belleTS, torchTS, ropeTS, springTS, crawlerTS, batTS, spiderTS;
  var tileSet = [];
  var codeMap = {};

  function startGame() {
    tileSet = TileSet(tileImg, 32);

    // generate frame sets.
    belleTS   = FrameSet(renderer, belleImg,   32, 6, 0, 1000);
    torchTS   = FrameSet(renderer, torchImg,   32, 3, 0, 200);
    springTS  = FrameSet(renderer, springImg,  32, 4, 0, 1000);
    crawlerTS = FrameSet(renderer, crawlerImg, 32, 1, 0, 1000);
    batTS     = FrameSet(renderer, batImg,     32, 2, 0, 500);
    spiderTS  = FrameSet(renderer, spiderImg,  32, 1, 0, 1000);
    ropeTS    = FrameSet(renderer, ropeImg,    8, 1, 0, 1000);
    sliverTS  = FrameSet(renderer, sliverImg,  2, 1, 0, 1000);

    // healthTS = FrameSet(healthImg, 1, 0);
    // sliverTS = FrameSet(sliverImg, 1, 0);

    codeMap = {
      "1": torchTS,
      "2": ropeTS,
      "5": springTS,
      "8": crawlerTS,
      "9": batTS,
      "10": spiderTS,
      "48": belleTS,
    };

    // send a room request to the server.
    var socket = GS.w; // injected globals.
    socket.on('r', loadRoom);
    socket.emit('r',0);
  }

  function loadRoom(data) {
    // log("Room:", data.width, data.height, data.map, data.spawn);

    // [width, height, {tile}, num_spawn, {type,x,y}]
    var map_w = data[0], map_h = data[1], ofs = 2;
    var drawSize = 32;

    // origin is the top-left corner of the map.
    var ox = -Math.floor(drawSize * map_w * 0.5);
    var oy = Math.floor(drawSize * map_h * 0.5);

    // reset room state.
    movers = [];
    lines = [];
    sprites = [];
    player = null;
    panX = ox;
    panY = oy;

    // generate geometry for all non-empty room tiles.
    ofs = MapGeom(roomGeom, tileSet, data, ofs, map_w, map_h);

    // spawn sprites.
    var num_spawn = data[ofs++];
    for (var i=0; i<num_spawn; i++) {
      // NB. sprites are relative to the top-left corner of the map (y is always negative)
      var tt = data[ofs], x = data[ofs+1], y = data[ofs+2]; ofs += 3;
      var ts = codeMap[tt]; // type of sprite.
      var mins = (tt===8||tt===9) ? data[ofs++] : 0;
      var maxs = (tt===8||tt===9||tt===2||tt===10) ? data[ofs++] : 0;
      var speed = 0;
      if (tt===2) speed = 2.5 * (60/1000);
      if (tt===8) speed = 2 * (60/1000);
      if (tt===9) speed = 3 * (60/1000);
      if (tt===10) speed = 1 * (60/1000);
      if (tt===48) speed = 2 * (60/1000);
      if (ts) {
        var spr = { x:x, y:y, image:ts.image, geom:ts.geom, flip:false,
                    mins:mins, maxs:maxs, pos:0, speed:-speed, update:null,
                    frames:ts.frames, index:0, remain:ts.frames[0].ticks, loop:true };
        sprites.push(spr);
        if (tt===8||tt===9) {
          movers.push(spr);
          spr.pos = spr.x; // moves along X axis.
          spr.update = function(s, dt){
            s.pos += dt * s.speed;
            if (s.pos <= s.mins) {
              s.pos = s.mins; // FIXME: inaccurate.
              s.speed = -s.speed;
              s.flip = true;
            } else if (s.pos >= s.maxs) {
              s.pos = s.maxs; // FIXME: inaccurate.
              s.speed = -s.speed;
              s.flip = false;
            }
            s.x = Math.floor(s.pos); // snap to nearest pixel.
          };
        } else if (tt===2||tt===10) {
          movers.push(spr);
          spr.mins = spr.y; // current Y is the lowest value.
          spr.pos = spr.y; // moves along Y axis.
          spr.update = function(s, dt){
            s.pos += dt * s.speed;
            if (s.pos <= s.mins) {
              s.pos = s.mins; // FIXME: inaccurate.
              s.speed = -s.speed;
            } else if (s.pos >= s.maxs) {
              s.pos = s.maxs; // FIXME: inaccurate.
              s.speed = -s.speed;
            }
            s.y = Math.floor(s.pos); // snap to nearest pixel.
          };
        } else if (tt===48) {
          // player spawn point.
          spr.posX = spr.x;
          spr.posY = spr.y;
          spr.velX = 0;
          spr.velY = 0;
          spr.onground = true;
          spr.onrope = true;
          player = spr;
        }
        // log("spawn", i, ts.frames[0].ticks);
      }
    }

    if (!ready) hideStatus(); // finished loading.
    ready = true;
  }

  function hideStatus() {
    // hide the loader and start the game.
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
