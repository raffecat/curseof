
function getElem(id) { return document.getElementById(id); }
function showStatus(msg) { getElem('p').firstChild.nodeValue = msg; }
function removeElem(id,e) { (e=getElem(id)).parentNode.removeChild(e); }

var redMark, blueMark; // debugging.

function initGame() {
  showStatus( 'Loading...' );

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
  var map = null; // current map.
  var panX=0, panY=0, panSpd=1;
  var loadLatch=false, levelNum=0;
  var scene_L=0, scene_B=0, scene_R=0, scene_T=0;

  function render(dt) {
    if (!ready) return;

    // cycle through maps with 'M' for testing.
    if (keys[77]) {
      if (!loadLatch) {
        loadLatch = true;
        levelNum += 1;
        if (levelNum > 3) levelNum = 0;
        var socket = $.w; // injected global.
        socket.emit('r',levelNum);
      }
    } else {
      loadLatch = false;
    }

    // update all movers.
    for (var i=0; i<movers.length; i++) {
      var s = movers[i];
      s.update(s, dt);
    }

    // move the player.
    if (player) {
      walkMove(player, dt, map, movers);
    }

    // center the camera on the player.
    if (keys[16]) {
      // camera panning with arrow keys (hold shift to pan)
      if (keys[37]) panX += dt * panSpd; if (keys[39]) panX -= dt * panSpd;
      if (keys[40]) panY += dt * panSpd; if (keys[38]) panY -= dt * panSpd;
    } else if (player) {
      panX = player.x;
      panY = player.y;
    }

    // confine the camera to the scene.
    var camHW = Math.floor(GL_width * 0.5), camHH = Math.floor(GL_height * 0.5);
    var camL = scene_L + camHW, camB = scene_B + camHH, camR = scene_R - camHW, camT = scene_T - camHH;
    if (camL >= camR) {
      cameraTransform[12] = -Math.floor((scene_L + scene_R) * 0.5); // center of scene.
    } else if (panX < camL) {
      cameraTransform[12] = -camL;
    } else if (panX > camR) {
      cameraTransform[12] = -camR;
    } else {
      cameraTransform[12] = -Math.floor(panX);
    }
    if (camB >= camT) {
      cameraTransform[13] = -Math.floor((scene_B + scene_T) * 0.5); // center of scene.
    } else if (panY < camB) {
      cameraTransform[13] = -camB;
    } else if (panY > camT) {
      cameraTransform[13] = -camT;
    } else {
      cameraTransform[13] = -Math.floor(panY);
    }

    // animate all sprites.
    animateEnts(sprites, dt);

    // render the room geometry.
    GL_viewMatrix(cameraTransform);
    roomGeom.draw(tileImg.tex);

    // render all lines (in world space)
    for (var i=0; i<lines.length; i++) {
      var s = lines[i];
      s.geom.draw(s.tex, 0, 6);
    }

    // render all sprites.
    for (var i=0; i<sprites.length; i++) {
      var s = sprites[i];
      spriteTransform[0] = (s.flip ? -1 : 1);
      spriteTransform[12] = cameraTransform[12] + s.x;
      spriteTransform[13] = cameraTransform[13] + s.y;
      GL_viewMatrix(spriteTransform);
      var frame = s.frames[s.index];
      s.geom.draw(s.tex, frame.iofs, frame.inum);
    }
  }

  GLRenderer(render); // for GL_* functions.

  // images.

  function loadImage(src, done) {
    var img = new Image();
    img['onload'] = function() {
      img['onload'] = img['onerror'] = null; // gc
      done(img);
    };
    img['onerror'] = function() {
      img['onload'] = img['onerror'] = null; // gc
      log("EImage");
      done(null);
    };
    img['src'] = src;
  }

  function ImageLoader(src, obj, done) {
    obj.name = src;
    if (obj.wrap == null) obj.wrap = false;
    if (obj.opaque == null) obj.opaque = false;
    loadImage(src, function (img) {
      if (img) {
        obj.data = img;
        obj.width = img['width'];   // Image.width
        obj.height = img['height']; // Image.height
        obj.tex = GL_Texture(obj);
      }
      done();
    });
  }

  var images = CacheLoader(ImageLoader);

  var quadVerts = new FloatArray([ -1,-1,0,0, 1,-1,1,0, -1,1,0,1, 1,1,1,1 ]);
  var quadInds = new Uint16Array([0,1,2, 1,3,2]);

  // load tiles.
  var tileImg = images.get('/assets/tiles.png', {opaque:true,wrap:false});
  var roomGeom = GL_Geometry();

  var healthImg = images.get('/assets/health.png', {opaque:false,wrap:false});
  var belleImg = images.get('/assets/belle.png', {opaque:false,wrap:false});
  var torchImg = images.get('/assets/flame.png', {opaque:false,wrap:false});
  var batImg = images.get('/assets/bat.png', {opaque:false,wrap:false});
  var crawlerImg = images.get('/assets/crawler.png', {opaque:false,wrap:false});
  var spiderImg = images.get('/assets/spider.png', {opaque:false,wrap:false});
  var springImg = images.get('/assets/spring.png', {opaque:false,wrap:false});
  var ropeImg = images.get('/assets/rope.png', {opaque:false,wrap:true});
  var sliverImg = images.get('/assets/sliver.png', {opaque:false,wrap:true});

  var redImg = images.get('/assets/red.png', {opaque:false,wrap:false});
  var blueImg = images.get('/assets/blue.png', {opaque:false,wrap:false});
  var redTS, blueTS;

  // wait for all the images to finish loading.
  images.wait(startGame);

  var belleTS, torchTS, springTS, crawlerTS, batTS, spiderTS;
  var tileSet = [];

  var esmeWalk = [ 1, 300, 2, 300, 3, 300, 2, 300 ];
  var esmeWalkIdle = [ 0, 1000 ];
  var esmeClimb = [ 5, 220, 6, 230 ];
  var esmeClimbIdle = [ 5, 1000 ];
  var esmeJump = [ 4, 1000 ];
  var torchAnim = [ 0, 200, 1, 200, 2, 200 ];
  var springIdle = [ 0, 1000 ];
  var springBounce = [ 3, 200, 2, 200, 1, 200, 0, 1000 ];
  var crawlerWalk = [ 0, 1000 ];
  var batFly = [ 0, 500, 1, 500 ];
  var spiderIdle = [ 0, 1000 ];

  function startGame() {
    tileSet = TileSet(tileImg, 32);

    // generate frame sets.
    belleTS   = FrameSet(belleImg,   32, 32, 7, 0);
    torchTS   = FrameSet(torchImg,   32, 32, 3, 0);
    springTS  = FrameSet(springImg,  32, 32, 4, 0);
    crawlerTS = FrameSet(crawlerImg, 32, 32, 1, 0);
    batTS     = FrameSet(batImg,     32, 32, 2, 0);
    spiderTS  = FrameSet(spiderImg,  32, 32, 1, 0);

    redTS = FrameSet(redImg,  32, 32, 1, 0);
    blueTS = FrameSet(blueImg,  32, 32, 1, 0);

    // send a room request to the server.
    var socket = $.w; // injected global.
    socket.on('r', loadRoom);
    socket.emit('r',0);
  }

  function addSprite(ts, x, y, anim) {
    var spr = { x:x, y:y, tex:ts.tex, geom:ts.geom, frames:ts.frames, flip:false, index:0 };
    setAnim(spr, anim);
    sprites.push(spr); // render.
    return spr;
  }

  function pathLeftRight(spr, left, right, speed) {
    movers.push(spr); // update.
    spr.mins = left;
    spr.maxs = right;
    spr.pos = spr.x; // moves along X axis.
    spr.speed = speed;
    spr.update = function(s, dt) {
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
  }

  function spawnTorch(x, y, data, ofs) {
    addSprite(torchTS, x, y, torchAnim);
    return ofs;
  }

  function spawnRope(x, y, data, ofs) {
    var bottom = y - data[ofs]; // rope height.
    var speed = 2.5 * (60/1000);
    var geom = GL_Geometry(quadVerts, quadInds, true, true); // dynamic.
    var spr = { x:x, tex:ropeImg.tex, geom:geom, mins:bottom, maxs:y, pos:bottom, speed:-speed };
    movers.push(spr); // update.
    lines.push(spr);  // render.
    spr.update = function(s, dt) {
      s.pos += dt * s.speed;
      if (s.pos <= s.mins) {
        s.pos = s.mins; // FIXME: inaccurate.
        s.speed = -s.speed;
      } else if (s.pos >= s.maxs) {
        s.pos = s.maxs; // FIXME: inaccurate.
        s.speed = -s.speed;
      }
      // update the rope geometry.
      var hw = 4, rope_v = 1/32;
      var L = s.x - hw + 1, R = s.x + hw + 1;
      var T = s.maxs, B = Math.floor(s.pos); // snap to nearest pixel.
      var v1 = (T-B) * rope_v; // repeat texture.
      quadVerts[0] = L; quadVerts[1] = B;    quadVerts[2] = 0; quadVerts[3] = v1;
      quadVerts[4] = R; quadVerts[5] = B;    quadVerts[6] = 1; quadVerts[7] = v1;
      quadVerts[8] = L; quadVerts[9] = T;    quadVerts[10] = 0; quadVerts[11] = 0;
      quadVerts[12] = R; quadVerts[13] = T;  quadVerts[14] = 1; quadVerts[15] = 0;
      s.geom.update(quadVerts);
    };
    spr.is_rope = true; // for walkMove.
    return ofs+1;
  }

  function spawnSpring(x, y, data, ofs) {
    addSprite(springTS, x, y, springBounce);
    return ofs;
  }

  function spawnCrawler(x, y, data, ofs) {
    var left = data[ofs], right = data[ofs+1];
    var speed = 2 * (60/1000);
    var spr = addSprite(crawlerTS, x, y, crawlerWalk);
    pathLeftRight(spr, left, right, speed);
    return ofs+2;
  }

  function spawnBat(x, y, data, ofs) {
    var left = data[ofs], right = data[ofs+1];
    var speed = 3 * (60/1000);
    var spr = addSprite(batTS, x, y, batFly);
    pathLeftRight(spr, left, right, speed);
    return ofs+2;
  }

  function spawnSpider(x, y, data, ofs) {
    var bottom = y - data[ofs]; // travel height.
    var speed = 1 * (60/1000);
    var spr = addSprite(spiderTS, x, y, spiderIdle);
    spr.thread = GL_Geometry(quadVerts, quadInds, true, true); // dynamic.
    lines.push({ tex:sliverImg.tex, geom:spr.thread });  // render.
    movers.push(spr); // update.
    spr.mins = bottom;
    spr.maxs = spr.y;
    spr.pos = bottom; // moves along Y-axis.
    spr.speed = -speed;
    spr.update = function(s, dt) {
      // move the spider.
      s.pos += dt * s.speed;
      if (s.pos <= s.mins) {
        s.pos = s.mins; // FIXME: inaccurate.
        s.speed = -s.speed;
      } else if (s.pos >= s.maxs) {
        s.pos = s.maxs; // FIXME: inaccurate.
        s.speed = -s.speed;
      }
      s.y = Math.floor(s.pos); // snap to nearest pixel.
      // update the thread geometry.
      var hw = 1, rope_v = 1/32;
      var L = s.x - hw, R = s.x + hw;
      var T = s.maxs + 16, B = s.y; // snap to nearest pixel.
      var v1 = (T-B) * rope_v; // repeat texture.
      quadVerts[0] = L; quadVerts[1] = B;    quadVerts[2] = 0; quadVerts[3] = v1;
      quadVerts[4] = R; quadVerts[5] = B;    quadVerts[6] = 1; quadVerts[7] = v1;
      quadVerts[8] = L; quadVerts[9] = T;    quadVerts[10] = 0; quadVerts[11] = 0;
      quadVerts[12] = R; quadVerts[13] = T;  quadVerts[14] = 1; quadVerts[15] = 0;
      s.thread.update(quadVerts);
    };
    return ofs+1;
  }

  function spawnPlayer(x, y, data, ofs) {
    var spr = addSprite(belleTS, x, y, esmeWalkIdle);
    spr.accX = 0;
    spr.accY = 0;
    spr.velX = 0;
    spr.velY = 0;
    spr.onground = true;
    spr.onrope = false;
    spr.walkAnim = esmeWalk;
    spr.walkIdle = esmeWalkIdle;
    spr.climbAnim = esmeClimb;
    spr.climbIdle = esmeClimbIdle;
    spr.jumpAnim = esmeJump;
    player = spr; // update.
    return ofs;
  }

  var codeMap = {
    "1": spawnTorch,
    "2": spawnRope,
    "5": spawnSpring,
    "8": spawnCrawler,
    "9": spawnBat,
    "10": spawnSpider,
    "48": spawnPlayer,
  };

  function loadRoom(data) {
    // log("Room:", data.width, data.height, data.map, data.spawn);

    // [width, height, {tile}, num_spawn, {type,x,y}]
    var map_w = data[0], map_h = data[1], ofs = 2;
    var drawSize = 32;

    // reset room state.
    movers = [];
    lines = [];
    sprites = [];
    player = null;
    map = data;

    redMark = addSprite(redTS, 0, 0, spiderIdle);
    blueMark = addSprite(blueTS, 0, 0, spiderIdle);

    // generate geometry for all non-empty room tiles.
    ofs = MapGeom(roomGeom, tileSet, data, ofs, map_w, map_h);

    // spawn sprites.
    var num_spawn = data[ofs++];
    for (var i=0; i<num_spawn; i++) {
      // NB. sprites are relative to the top-left corner of the map (y is always negative)
      var tt = data[ofs], x = data[ofs+1], y = data[ofs+2]; ofs += 3;
      var spawn = codeMap[tt]; // type of sprite.
      if (spawn) {
        ofs = spawn(x, y, data, ofs);
      } else { log("Espawn:"+tt); break; }
    }

    scene_L = -64;
    scene_B = -64;
    scene_R = (drawSize * map_w) + 64;
    scene_T = (drawSize * map_h) + 64;

    // center the camera on the middle of the map.
    if (!player) {
      // origin is the bottom-left corner of the map.
      // translate the scene by negative half map width and height.
      panX = Math.floor(drawSize * map_w * 0.5);
      panY = Math.floor(drawSize * map_h * 0.5);
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
