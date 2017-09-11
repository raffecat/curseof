
function getElem(id) { return document.getElementById(id); }
function showStatus(msg) { getElem('p').firstChild.nodeValue = msg; }
function removeElem(id,e) { (e=getElem(id)).parentNode.removeChild(e); }

var log = window.console && console.log && console.log.bind && console.log.bind(console) || function(){};
var trace = log;

function initGame() {
  showStatus( 'Loading...' );

  var renderer = GLRenderer();

  var FloatArray = window.WebGLFloatArray || window.Float32Array;
  var Uint16Array = window.Uint16Array;

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
    if (keys[38]) panY += dt * sspd; else if (keys[40]) panY -= dt * sspd;
    cameraTransform[12] = Math.floor(panX);
    cameraTransform[13] = Math.floor(panY);

    // update all movers.
    for (var i=0; i<movers.length; i++) {
      var s = movers[i];
      s.update(s, dt);
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

  var ts_w = 256, ts_h = 384;
  //var w = (ts_w/2), h = (ts_h/2);
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

  // tile set.
  var tileSize = 32, ts_u = tileSize/ts_w, ts_v = tileSize/ts_h;
  var tileSet = [];
  for (var y=0; y<(ts_h/tileSize); y++) {
    for (var x=0; x<(ts_w/tileSize); x++) {
      tileSet.push({ u0: x * ts_u, v0: (y+1) * ts_v, u1: (x+1) * ts_u, v1: y * ts_v });
    }
  }

  function FrameSet(image, tileSize, num_frames, yOfs, ticks) {
    var drawSize = tileSize;
    var img_w = image.width, img_h = image.height;
    var ts_u = tileSize/img_w;
    var geom = renderer.newGeometry(); // num_frames * 16, num_frames * 6
    var L = -tileSize/2, B = -tileSize/2; // bottom-left of this tile.
    var R = L + drawSize, T = B + drawSize; // top-right of this tile.
    var frames = [];
    var verts = new FloatArray(16 * num_frames); // [x,y,u,v] * [L,B,R,T] * num_frames
    var inds = new Uint16Array(6 * num_frames);  // [0,1,2,1,3,2] * num_frames
    var wr = 0, vofs = 0, iofs = 0;
    var v0 = yOfs/img_h, v1 = (yOfs+tileSize)/img_h;
    for (var x=0; x<num_frames; x++) {
      var u0 = x * ts_u, u1 = (x+1) * ts_u;
      // generate vertices.
      verts[wr+0] = L;  verts[wr+1] = B;  verts[wr+2] = u0;  verts[wr+3] = v0;
      verts[wr+4] = R;  verts[wr+5] = B;  verts[wr+6] = u1;  verts[wr+7] = v0;
      verts[wr+8] = L;  verts[wr+9] = T;  verts[wr+10] = u0; verts[wr+11] = v1;
      verts[wr+12] = R; verts[wr+13] = T; verts[wr+14] = u1; verts[wr+15] = v1;
      wr += 16; // have used 16 floats.
      // generate indices.
      var base = iofs;
      inds[iofs+0] = vofs+0; inds[iofs+1] = vofs+1; inds[iofs+2] = vofs+2;
      inds[iofs+3] = vofs+1; inds[iofs+4] = vofs+3; inds[iofs+5] = vofs+2;
      iofs += 6; // have used 6 indices.
      vofs += 4; // have used 4 vertices.
      // generate frame.
      frames.push({
        iofs: (base*2), inum: (iofs-base), ticks: ticks
      });
    }
    geom.update(verts, inds);
    return { frames:frames, image:image, geom:geom };
  }

  var belleTS, torchTS, ropeTS, springTS, crawlerTS, batTS, spiderTS;
  var tilesetMap = {};

  function startGame() {
    // generate frame sets.
    belleTS   = FrameSet(belleImg,   32, 6, 0, 1000);
    torchTS   = FrameSet(torchImg,   32, 3, 0, 200);
    springTS  = FrameSet(springImg,  32, 4, 0, 1000);
    crawlerTS = FrameSet(crawlerImg, 32, 1, 0, 1000);
    batTS     = FrameSet(batImg,     32, 2, 0, 500);
    spiderTS  = FrameSet(spiderImg,  32, 1, 0, 1000);
    ropeTS    = FrameSet(ropeImg,    8, 1, 0, 1000);
    sliverTS  = FrameSet(sliverImg,  2, 1, 0, 1000);

    // healthTS = FrameSet(healthImg, 1, 0);
    // sliverTS = FrameSet(sliverImg, 1, 0);

    tilesetMap = {
      "1": torchTS,
      "2": ropeTS,
      "5": springTS,
      "8": crawlerTS,
      "9": batTS,
      "10": spiderTS,
    };

    // send a room request to the server.
    var socket = GS.w; // injected globals.
    socket.on('r', loadRoom);
    socket.emit('r',0);
  }

  function loadRoom(data) {
    // log("Room:", data.width, data.height, data.map, data.spawn);

    // [width, height, {tile}, num_spawn, {type,x,y}]
    var map_w = data[0], map_h = data[1], rd = 2;
    var drawSize = 32;
    var ox = -Math.floor(drawSize * map_w * 0.5);
    var oy = -Math.floor(drawSize * map_h * 0.5);

    // reset the camera position.
    panX = ox;
    panY = oy;

    // generate geometry for all non-empty room tiles.
    var verts = new FloatArray(4 * 4 * map_w * map_h); // [x,y,u,v] * [L,B,R,T] * w * h
    var inds = new Uint16Array(6 * map_w * map_h);     // [0,1,2,1,3,2] * w * h
    var wr = 0, vofs = 0, iofs = 0;
    for (var y=0; y<map_h; y++) {
      for (var x=0; x<map_w; x++) {
        var v = data[rd++];
        if (v) { // tile zero is never rendered.
          var t = tileSet[v];
          if (t) { // protect against out-of-bounds.
            var L = x * drawSize, T = y * drawSize; // top-left of this tile.
            var R = L + drawSize, B = T + drawSize; // bottom-right of this tile.
            var u0 = t.u0, v0 = t.v0, u1 = t.u1, v1 = t.v1;
            // log("tile", v, L,B,R,T, u0,v0,u1,v1);
            verts[wr+0] = L;  verts[wr+1] = B;  verts[wr+2] = u0;  verts[wr+3] = v0;
            verts[wr+4] = R;  verts[wr+5] = B;  verts[wr+6] = u1;  verts[wr+7] = v0;
            verts[wr+8] = L;  verts[wr+9] = T;  verts[wr+10] = u0; verts[wr+11] = v1;
            verts[wr+12] = R; verts[wr+13] = T; verts[wr+14] = u1; verts[wr+15] = v1;
            wr += 16; // have used 16 floats.
            inds[iofs+0] = vofs+0; inds[iofs+1] = vofs+1; inds[iofs+2] = vofs+2;
            inds[iofs+3] = vofs+1; inds[iofs+4] = vofs+3; inds[iofs+5] = vofs+2;
            iofs += 6; // have used 6 indices.
            vofs += 4; // have used 4 vertices.
          }
        }
      }
    }
    var usedVerts = new FloatArray(verts.buffer, 0, wr);  // view, sized to fit.
    var usedInds = new Uint16Array(inds.buffer, 0, iofs); // view, sized to fit.
    roomGeom.update(usedVerts, usedInds);

    // spawn sprites.
    sprites = [];
    movers = [];
    var num_spawn = data[rd++];
    for (var i=0; i<num_spawn; i++) {
      var tt = data[rd], x = data[rd+1], y = data[rd+2]; rd += 3;
      var ts = tilesetMap[tt]; // type of sprite.
      var mins = (tt===8||tt===9||tt===2||tt===10) ? data[rd++] : 0;
      var maxs = (tt===8||tt===9) ? data[rd++] : 0;
      var speed = 0;
      if (tt===2) speed = 2.5 * (60/1000);
      if (tt===8) speed = 2 * (60/1000);
      if (tt===9) speed = 3 * (60/1000);
      if (tt===10) speed = 1 * (60/1000);
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
          spr.maxs = spr.y; // current Y is the maximum.
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
