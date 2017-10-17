"use strict";

import { log } from './defs';
import { imageCache } from './images';
import { Geometry, white } from './glr';
import { FrameSet, updateQuad, quadVerts, quadInds } from './geom';
import { setAnim } from './engine';

// game state for spawns.
export const sprites = [];
export const movers = [];
export const lines = [];

// spawn functions from spawn.js
export const codeMap = {
  "1": spawnTorch,
  "2": spawnRope,
  "5": spawnSpring,
  "8": spawnCrawler,
  "9": spawnBat,
  "10": spawnSpider,
  "13": spawnBlip,
  "14": spawnPlatLR,
  "56": spawnDoor,
  "57": spawnDoor,
  "58": spawnDoor,
  "59": spawnDoor,
  "64": spawnItem,
  "65": spawnItem,
  "66": spawnItem,
  "67": spawnItem,
};

export var playerFS; // player frame-set.

const noAnimate = [ 0, 1000 ];
const torchAnim = [ 0, 200, 1, 200, 2, 200 ];
const springBounce = [ 3, 200, 2, 200, 1, 200, 0, 1000 ];
const crawlerWalk = [ 0, 220, 1, 160 ];
const batFly = [ 0, 180, 1, 180, 2, 270 ];
const spiderDown = [ 0, 1000 ];
const spiderUp = [ 1, 100, 2, 100 ];

const spriteImg = imageCache.get('/assets/sprites.png', {opaque:false,wrap:false});
const ropeImg = imageCache.get('/assets/rope.png', {opaque:false,wrap:true});
const sliverImg = imageCache.get('/assets/sliver.png', {opaque:false,wrap:true});

var torchFS, batFS, crawlFS, spiderFS, springFS, blipFS;
const doorFS = [], keyFS = [];

imageCache.wait(function(){
  torchFS = FrameSet(spriteImg, 32, 32, 0, 3);
  blipFS = FrameSet(spriteImg, 32, 32, 3, 1);
  batFS = FrameSet(spriteImg, 32, 32, 8, 3);
  crawlFS = FrameSet(spriteImg, 32, 32, 11, 2);
  spiderFS = FrameSet(spriteImg, 32, 32, 13, 3);
  playerFS = FrameSet(spriteImg, 32, 32, 16, 7);
  springFS = FrameSet(spriteImg, 32, 32, 24, 4);
  for (let i=0; i<8; i++) {
    doorFS[i] = FrameSet(spriteImg, 32, 32, 40+i, 1);
    keyFS[i] = FrameSet(spriteImg, 32, 32, 48+i, 1);
  }
});

export function addSprite(ts, x, y, anim, enemy) {
  const spr = { x:x, y:y, visible:true, is_rope:false, is_enemy:enemy, is_platform:false, update:null,
                color:white, tex:ts.tex, geom:ts.geom, frames:ts.frames, flip:false, index:0 };
  setAnim(spr, anim);
  sprites.push(spr); // render.
  return spr;
}

function pathLeftRight(spr, left, right, speed, flipper) {
  movers.push(spr); // update.
  const mins = left;
  const maxs = right;
  var pos = spr.x; // moves along X axis.
  spr.update = function(s, dt) {
    const oldpos = pos;
    pos += dt * speed;
    if (pos <= mins) {
      pos = mins + (mins - pos); // reflect the overrun.
      speed = -speed;
      if (flipper) s.flip = true;
    } else if (pos >= maxs) {
      pos = maxs - (pos - maxs); // reflect the overrun.
      speed = -speed;
      s.flip = false;
    }
    s.velX = pos - oldpos; // for walkMove on platforms.
    s.x = Math.floor(pos); // snap to nearest pixel.
  };
}

function spawnTorch(x, y, data, ofs) {
  addSprite(torchFS, x, y, torchAnim, false);
  return ofs;
}

function spawnRope(x, y, data, ofs) {
  const bottom = y - data[ofs]; // rope height.
  const mins = bottom;
  const maxs = y;
  var speed = -2.5 * (60/1000);
  var pos = bottom;
  const geom = Geometry(quadVerts, quadInds, true, true); // dynamic.
  const rope = { x:x, y:y, visible:true, is_rope:true, is_enemy:false, is_platform:false, update:updateRope };
  movers.push(rope);
  function updateRope(s, dt) {
    pos += dt * speed;
    if (pos <= mins) {
      pos = mins; // FIXME: inaccurate.
      speed = -speed;
    } else if (pos >= maxs) {
      pos = maxs; // FIXME: inaccurate.
      speed = -speed;
    }
    // update the rope geometry.
    const rope_v = 1/32;
    const L = s.x - 4, R = s.x + 4; // texture is 8px wide with 6px rope!
    const T = maxs, B = Math.floor(pos); // snap to nearest pixel.
    const v1 = (T-B) * rope_v; // repeat texture.
    updateQuad(geom, L, B, R, T, 0, 0, 1, v1);
    // update rope collision state.
    rope.maxs = T;
    rope.pos = B;
  }
  lines.push({ tex:ropeImg.tex, geom:geom });  // render.
  return ofs+1;
}

function spawnSpring(x, y, data, ofs) {
  addSprite(springFS, x, y, springBounce, false);
  return ofs;
}

function spawnCrawler(x, y, data, ofs) {
  const left = data[ofs], right = data[ofs+1];
  const speed = 2 * (60/1000);
  const spr = addSprite(crawlFS, x, y, crawlerWalk, true);
  pathLeftRight(spr, left, right, speed, true);
  spr.flip = true;
  return ofs+2;
}

function spawnBat(x, y, data, ofs) {
  const left = data[ofs], right = data[ofs+1];
  const speed = 3 * (60/1000);
  const spr = addSprite(batFS, x, y, batFly, true);
  pathLeftRight(spr, left, right, speed, true);
  spr.flip = true;
  return ofs+2;
}

function spawnSpider(x, y, data, ofs) {
  const bottom = y - data[ofs]; // travel height.
  const speed = 1 * (60/1000);
  const spr = addSprite(spiderFS, x, y, spiderDown, true);
  spr.thread = Geometry(quadVerts, quadInds, true, true); // dynamic.
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
      setAnim(s, spiderUp);
    } else if (s.pos >= s.maxs) {
      s.pos = s.maxs; // FIXME: inaccurate.
      s.speed = -s.speed;
      setAnim(s, spiderDown);
    }
    s.y = Math.floor(s.pos); // snap to nearest pixel.
    // update the thread geometry.
    const hw = 1, rope_v = 1/32;
    const L = s.x - hw, R = s.x + hw;
    const T = s.maxs + 16, B = s.y; // snap to nearest pixel.
    const v1 = (T-B) * rope_v; // repeat texture.
    updateQuad(s.thread, L, B, R, T, 0, 0, 1, v1);
  };
  return ofs+1;
}

function spawnBlip(x, y, data, ofs) {
  // Platform that disappears shortly after it is touched.
  const spr = addSprite(blipFS, x, y, noAnimate, false);
  spr.is_platform = true;
  spr.touched = false;
  spr.velX = 0; // for walkMove collisions.
  var pt = 0;
  movers.push(spr); // update.
  spr.update = function(s, dt) {
    if (spr.touched) {
      // touched by a player, increase the timer and vanish.
      pt += dt;
      if (pt > 1000) {
        spr.visible = false;
        spr.is_platform = false;
        spr.touched = false;
        pt = 0;
      }
    } else if (!spr.visible) {
      // vanished, increase the timer and reappear.
      pt += dt;
      if (pt > 2000) {
        spr.visible = true;
        spr.is_platform = true;
        pt = 0;
      }
    }
  };
  return ofs;
}

function spawnPlatLR(x, y, data, ofs) {
  // Platform moving left and right.
  const left = data[ofs], right = data[ofs+1];
  const speed = 2 * (60/1000);
  const spr = addSprite(blipFS, x, y, noAnimate, false);
  spr.is_platform = true;
  spr.touched = false; // for walkMove dead-store.
  pathLeftRight(spr, left, right, speed, false);
  return ofs+2;
}

function spawnDoor(x, y, data, ofs, code) {
  const index = code - 56; // first door.
  if (!doorFS[index]) { log("EDoor"); return ofs; }
  addSprite(doorFS[index], x, y, noAnimate, false);
  return ofs;
}

function spawnItem(x, y, data, ofs, code) {
  const index = code - 64; // first item.
  if (!keyFS[index]) { log("EItem"); return ofs; }
  addSprite(keyFS[index], x, y, noAnimate, false);
  return ofs;
}
