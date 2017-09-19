
var torchAnim = [ 0, 200, 1, 200, 2, 200 ];
var springIdle = [ 0, 1000 ];
var springBounce = [ 3, 200, 2, 200, 1, 200, 0, 1000 ];
var crawlerWalk = [ 0, 1000 ];
var batFly = [ 0, 500, 1, 500 ];
var spiderIdle = [ 0, 1000 ];
var blipIdle = [ 0, 0xFFFFFFFF ];

var torchImg = imageCache.get('/assets/flame.png', {opaque:false,wrap:false,fs:3});
var batImg = imageCache.get('/assets/bat.png', {opaque:false,wrap:false,fs:2});
var crawlerImg = imageCache.get('/assets/crawler.png', {opaque:false,wrap:false,fs:1});
var spiderImg = imageCache.get('/assets/spider.png', {opaque:false,wrap:false,fs:1});
var springImg = imageCache.get('/assets/spring.png', {opaque:false,wrap:false,fs:4});
var ropeImg = imageCache.get('/assets/rope.png', {opaque:false,wrap:true});
var sliverImg = imageCache.get('/assets/sliver.png', {opaque:false,wrap:true});
var blipImg = imageCache.get('/assets/blip.png', {opaque:false,wrap:false,fs:2});

function addSprite(ts, x, y, anim, enemy) {
  var spr = { x:x, y:y, visible:true, is_rope:false, is_enemy:enemy, is_platform:false,
              color:GL_white, tex:ts.tex, geom:ts.geom, frames:ts.frames, flip:false, index:0 };
  setAnim(spr, anim);
  sprites.push(spr); // render.
  return spr;
}

function pathLeftRight(spr, left, right, speed, flipper) {
  movers.push(spr); // update.
  spr.mins = left;
  spr.maxs = right;
  spr.pos = spr.x; // moves along X axis.
  spr.speed = speed;
  spr.update = function(s, dt) {
    var move = dt * s.speed;
    s.pos += move;
    s.velX = move;
    if (s.pos <= s.mins) {
      s.pos = s.mins; // FIXME: inaccurate.
      s.speed = -s.speed;
      if (flipper) s.flip = true;
    } else if (s.pos >= s.maxs) {
      s.pos = s.maxs; // FIXME: inaccurate.
      s.speed = -s.speed;
      s.flip = false;
    }
    s.x = Math.floor(s.pos); // snap to nearest pixel.
  };
}

function spawnTorch(x, y, data, ofs) {
  addSprite(torchImg.ts, x, y, torchAnim, false);
  return ofs;
}

function spawnRope(x, y, data, ofs) {
  var bottom = y - data[ofs]; // rope height.
  var speed = 2.5 * (60/1000);
  var geom = GL_Geometry(quadVerts, quadInds, true, true); // dynamic.
  var spr = { x:x, y:y, visible:true, is_rope:true, is_enemy:false, is_platform:false,
              tex:ropeImg.tex, geom:geom, mins:bottom, maxs:y, pos:bottom, speed:-speed };
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
    var rope_v = 1/32;
    var L = s.x - 4, R = s.x + 4; // texture is 8px wide with 6px rope!
    var T = s.maxs, B = Math.floor(s.pos); // snap to nearest pixel.
    var v1 = (T-B) * rope_v; // repeat texture.
    updateQuad(s.geom, L, B, R, T, 0, 0, 1, v1);
  };
  return ofs+1;
}

function spawnSpring(x, y, data, ofs) {
  addSprite(springImg.ts, x, y, springBounce, false);
  return ofs;
}

function spawnCrawler(x, y, data, ofs) {
  var left = data[ofs], right = data[ofs+1];
  var speed = 2 * (60/1000);
  var spr = addSprite(crawlerImg.ts, x, y, crawlerWalk, true);
  pathLeftRight(spr, left, right, speed, true);
  spr.flip = true;
  return ofs+2;
}

function spawnBat(x, y, data, ofs) {
  var left = data[ofs], right = data[ofs+1];
  var speed = 3 * (60/1000);
  var spr = addSprite(batImg.ts, x, y, batFly, true);
  pathLeftRight(spr, left, right, speed, true);
  spr.flip = true;
  return ofs+2;
}

function spawnSpider(x, y, data, ofs) {
  var bottom = y - data[ofs]; // travel height.
  var speed = 1 * (60/1000);
  var spr = addSprite(spiderImg.ts, x, y, spiderIdle, true);
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
    updateQuad(s.thread, L, B, R, T, 0, 0, 1, v1);
  };
  return ofs+1;
}

function spawnBlip(x, y, data, ofs) {
  var spr = addSprite(blipImg.ts, x, y, blipIdle, false);
  spr.is_platform = true;
  spr.touched = false;
  spr.velX = 0; // for walkMove collisions.
  spr.pt = 0;
  movers.push(spr); // update.
  spr.update = function(s, dt) {
    if (spr.touched) {
      // touched by a player, increase the timer and vanish.
      spr.pt += dt;
      if (spr.pt > 1000) {
        spr.visible = false;
        spr.is_platform = false;
        spr.touched = false;
        spr.pt = 0;
      }
    } else if (!spr.visible) {
      // vanished, increase the timer and reappear.
      spr.pt += dt;
      if (spr.pt > 2000) {
        spr.visible = true;
        spr.is_platform = true;
        spr.pt = 0;
      }
    }
  };
  return ofs;
}

function spawnPlatLR(x, y, data, ofs) {
  var left = data[ofs], right = data[ofs+1];
  var speed = 2 * (60/1000);
  var spr = addSprite(blipImg.ts, x, y, blipIdle, false);
  spr.is_platform = true;
  spr.touched = false; // for walkMove dead-store.
  pathLeftRight(spr, left, right, speed, false);
  return ofs+2;
}
