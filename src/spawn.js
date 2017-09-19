
var torchAnim = [ 0, 200, 1, 200, 2, 200 ];
var springIdle = [ 0, 1000 ];
var springBounce = [ 3, 200, 2, 200, 1, 200, 0, 1000 ];
var crawlerWalk = [ 0, 1000 ];
var batFly = [ 0, 500, 1, 500 ];
var spiderIdle = [ 0, 1000 ];

var torchImg = imageCache.get('/assets/flame.png', {opaque:false,wrap:false,fs:3});
var batImg = imageCache.get('/assets/bat.png', {opaque:false,wrap:false,fs:2});
var crawlerImg = imageCache.get('/assets/crawler.png', {opaque:false,wrap:false,fs:1});
var spiderImg = imageCache.get('/assets/spider.png', {opaque:false,wrap:false,fs:1});
var springImg = imageCache.get('/assets/spring.png', {opaque:false,wrap:false,fs:4});
var ropeImg = imageCache.get('/assets/rope.png', {opaque:false,wrap:true});
var sliverImg = imageCache.get('/assets/sliver.png', {opaque:false,wrap:true});

function addSprite(ts, x, y, anim, enemy) {
  var spr = { x:x, y:y, is_rope:false, is_enemy:enemy, color:GL_white, tex:ts.tex, geom:ts.geom, frames:ts.frames, flip:false, index:0 };
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
  addSprite(torchImg.ts, x, y, torchAnim, false);
  return ofs;
}

function spawnRope(x, y, data, ofs) {
  var bottom = y - data[ofs]; // rope height.
  var speed = 2.5 * (60/1000);
  var geom = GL_Geometry(quadVerts, quadInds, true, true); // dynamic.
  var spr = { x:x, y:y, is_rope:true, is_enemy:false, tex:ropeImg.tex, geom:geom, mins:bottom, maxs:y, pos:bottom, speed:-speed };
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
  pathLeftRight(spr, left, right, speed);
  spr.flip = true;
  return ofs+2;
}

function spawnBat(x, y, data, ofs) {
  var left = data[ofs], right = data[ofs+1];
  var speed = 3 * (60/1000);
  var spr = addSprite(batImg.ts, x, y, batFly, true);
  pathLeftRight(spr, left, right, speed);
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
