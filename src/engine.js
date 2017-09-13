
function setAnim(ent, anim) {
  // start or restart an animation.
  ent.anim = anim;
  ent.animOfs = 0;       // current animation entry.
  ent.animTr = anim[1];  // time remaining on current frame.
  ent.index = anim[0];   // current frame index.
}

function toAnim(ent, anim) {
  // change animation without restarting.
  if (ent.anim !== anim) {
    setAnim(ent, anim);
  }
}

function animateEnts(ents, delta) {
  for (var i=0; i<ents.length; i++) {
    var ent = ents[i];
    var dt = delta;
    var anim = ent.anim;        // animation frames [index, ticks, ...]
    var animOfs = ent.animOfs;  // current animation entry.
    var animTr = ent.animTr;    // time remaining on current frame.
    while (dt >= animTr) {
      // advance to the next frame.
      dt -= animTr;
      animOfs += 2;
      if (animOfs >= anim.length) {
        animOfs = 0;            // TODO: include a loop-point in the anim.
      }
      animTr = anim[animOfs+1]; // duration of this frame.
    }
    ent.animOfs = animOfs;      // current animation entry.
    ent.animTr = animTr - dt;   // time remaining for next frame.
    ent.index = anim[animOfs];  // current frame to render.
  }
}

var solidTiles = { 2:1, 3:1, 4:1, 5:1, 12:1, 13:1, 18:1, 19:1, 34:1, 35:1, 68:1, 69:1, 70:1 };
var climbTiles = { 8:1, 10:1 };
var painTiles = { 1:1, 9:1, 11:1, 26:1 };

function hitTestMap(map, L, B, R, T, res) {
  // hit-test a rect against the tile map, returning min/max height.
  var w = map[0], h = map[1], base = 2; // NB. first row at offset=2.
  var x0 = Math.max(Math.floor(L / 32), 0);    // min 0
  var x1 = Math.min(Math.floor(R / 32), w-1);  // max w-1
  var y0 = Math.max(Math.floor(B / 32), 0);    // min 0
  var y1 = Math.min(Math.floor(T / 32), h-1);  // max h-1
  //log("x0="+x0+"  x1="+x1+"  y0="+y0+"  y1="+y1);
  var hitL = L, hitB = B, hitR = R, hitT = T;
  var climb = false, pain = false;
  for (var y = y0; y <= y1; y++) {
    var row = base + (y * w);
    for (var x = x0; x <= x1; x++) {
      var t = map[row+x];
      if (solidTiles[t]) {
        // determine the edges of the solid tile.
        // TODO: maybe R,T should be +31 not +32 ?! (consider pixels of tile)
        var tileL = x * 32, tileB = y * 32, tileR = tileL + 32, tileT = tileB + 32;
        // record the minimum and maximum solid edges found.
        // exclude opposing edges that are outside the query rect, otherwise
        // we get false positives from the back-edges of adjacent solid tiles.
        if (tileR > hitL && tileR < R) hitL = tileR;
        if (tileT > hitB && tileT < T) hitB = tileT;
        if (tileL < hitR && tileL > L) hitR = tileL;
        if (tileB < hitT && tileB > B) hitT = tileB;
      }
      // record the tile tags found.
      if (climbTiles[t]) climb = true;
      if (painTiles[t]) pain = true;
    }
  }
  res.hitL = hitL; res.hitB = hitB;
  res.hitR = hitR; res.hitT = hitT;
  res.climb = climb; res.pain = pain;
}

var jumpVelocity = 5 * (60/1000);
var gravity = 0.01 * (60/1000);
var walkSpeed = 3 * (60/1000);
var climbSpeed = 3 * (60/1000);
var maxVelX = 8 * (60/1000);
var maxVelY = 10 * (60/1000);
var res = {};

function walkMove(actor, dt, map, movers) {

  var jump = keys[32]; // Space.
  var left = keys[65]; // A.
  var right = keys[68]; // D.
  var down = keys[83]; // S.
  var up = keys[87]; // W.

  if (actor.onrope) {
    if (actor.velY > 0) actor.velY -= dt * gravity; // apply gravity if jumping.
    if (actor.velY < 0) actor.velY = 0; // never fall.
  } else {
    if (actor.onground) actor.velY = 0; // reset fall velocity.
    actor.velY -= dt * gravity; // always apply gravity.
    if (actor.velY < -maxVelY) actor.velY = -maxVelY;
  }

  var moveX = 0;
  var moveY = dt * actor.velY;
  var turnTo = null;

  if (left) {
    moveX = dt * -walkSpeed;
    actor.flip = true;
    if (actor.onground) turnTo = actor.walkAnim;
  } else if (right) {
    moveX = dt * walkSpeed;
    actor.flip = false;
    if (actor.onground) turnTo = actor.walkAnim;
  } else {
    // stop walking.
    if (actor.anim === actor.walkAnim) {
      turnTo = actor.walkIdle;
    }
  }

  if (actor.onrope) {
    if (up) {
      moveY = dt * climbSpeed;
      turnTo = actor.climbAnim; // overrides walk,idle,jump.
    } else if (down) {
      moveY = dt * -climbSpeed;
      actor.velY = dt * -2 * gravity; // for dropping off the bottom.
      turnTo = actor.climbAnim; // overrides walk,idle,jump.
    } else {
      // stop climbing.
      if (actor.anim === actor.climbAnim) {
        turnTo = actor.climbIdle;
      }
    }
  } else {
    // stop climbing.
    if (actor.anim === actor.climbAnim || actor.anim === actor.climbIdle) {
      turnTo = actor.jumpAnim; // falling.
    }
  }

  if (jump) {
    if (!actor.jumpHeld) {
      actor.jumpHeld = true;
      if (actor.onground || actor.onrope) {
        // actor.onground = false; // covered below.
        // actor.onrope = false;   // covered below.
        actor.velY = jumpVelocity;
        moveY = dt * jumpVelocity;
        turnTo = actor.jumpAnim; // overrides everything.
      }
    }
  } else {
    actor.jumpHeld = false;
  }

  // apply the animation with highest precedence.
  if (turnTo) {
    toAnim(actor, turnTo);
  } else if (actor.onground && actor.anim === actor.jumpAnim) {
    toAnim(actor, actor.walkIdle);
  }

  // accumulate intent-to-move over frames, but only move by whole pixels.
  actor.accX += moveX; actor.accY += moveY;
  // use bitwise OR to truncate (number of whole pixels)
  var dx = actor.accX|0, dy = actor.accY|0;
  // remove the whole-number part from the accumulators.
  actor.accX -= dx; actor.accY -= dy;

  // player is rendered 16 pixels on either side of its (x,y) position.
  // in other words, the anchor point is on the top-right of the bottom-left 16x16 quarter.
  // subtract (16,16) for the bottom-left corner of the player.
  // add (31,31) for the top-right pixel of the player (-1 to avoid adjacent tiles)

  // hit-test the actor bounds, expanded by vertical movement.
  // must collide separately - diagonal movement sticks to walls and floors.
  // vertical movement first, so players can catch ledges as they fall.
  actor.onground = false; // unless set below.
  var L = actor.x-14, R = L+28, B = actor.y-16, T = B+30; // (-4,-2) from size.
  if (dy < 0) {
    // moving down.
    hitTestMap(map, L, B+dy, R, T, res);
    actor.onrope = res.climb;
    actor.y += res.hitB - B; // vector from B to HitPos.
    if (res.hitB === B) {
      // did hit the ground.
      actor.onground = true;
    }
  } else if (dy > 0) {
    // moving up (trace 1 extra pixel so we can stay 1 pixel away from the surface)
    hitTestMap(map, L, B, R, T+dy+1, res);
    actor.onrope = res.climb;
    actor.y += (res.hitT-1) - T; // vector from T to HitPos.
    if ((res.hitT-1) === T) {
      // have hit the ceiling.
      actor.velY = 0;
    }
  } else {
    // not moving vertically.
    // must check for (loss of) ground below feet.
    hitTestMap(map, L, B-1, R, T, res);
    actor.onrope = res.climb;
    if (res.hitB === B) {
      // did hit the ground.
      actor.onground = true;
    }
  }

  // hit-test the actor bounds, expanded by horizontal movement.
  B = actor.y-16; T = B+30; // (-4,-2) from size.
  if (dx < 0) {
    // moving left.
    hitTestMap(map, L+dx, B, R, T, res);
    actor.onrope = res.climb;
    actor.x += res.hitL - L; // vector from L to HitPos.
  } else if (dx > 0) {
    // moving right (trace 1 extra pixel so we can stay 1 pixel away from the surface)
    hitTestMap(map, L, B, R+dx+1, T, res);
    actor.onrope = res.climb;
    actor.x += (res.hitR-1) - R; // vector from R to HitPos.
  }

  // test for ropes.
  L = actor.x-14, R = L+28; // (-4,-2) from size.
  for (var i=0; i<movers.length; i++) {
    var rope = movers[i];
    if (rope.is_rope) {
      if (rope.x >= L && rope.x <= R && rope.maxs > B && rope.pos < (T-4)) {
        actor.onrope = true;
      }
    }
  }

  // if solid within actor rect:
  //   (must move or be crushed)
  //   if max-Y is within step-height at bottom of actor:
  //     query for min-Y solid in actor rect moved up (feet above max-Y)
  //     if hit:
  //       player cannot move up (set iscrushed)
  //     else:
  //       move up to ground and set onground.
  //       set onladder = climbable within actor rect.
  //   else if min-Y is within duck-height at top of actor:
  //     query for max-Y solid in actor rect moved down (head below min-Y) expanded downward by 1.
  //     if solid max-Y is above 1:
  //       player cannot move down (set iscrushed)
  //     if solid max-Y is == 1:
  //       move down to ground and set onground.
  //     else:
  //       move down, clear onground (is falling)
  //   else:
  //     set iscrushed (must move horizontally or die)
  // else if climbable within actor rect:
  //   set onground and onladder.
  // else
  //   if max-Y is below actor:
  //     if not climbing:
  //       move down to ground.
  //     
}

/*

  redMark.y = actor.y + dy; redMark.x = actor.x + 16;
  blueMark.y = actor.y + dy; blueMark.x = actor.x;

  var L = actor.x-14, R = L+28, B = actor.y-16, T = B+29; // (-4,-2) from size.
  if (dy < 0) B += dy; else T += dy; // extend in the direction of Y motion.
  hitTestMap(map, L, B, R, T, res);

  if (res.hitB < B) { // can move down.
    actor.y += dy;
    var diff = B - res.hitB; // always negative or zero.
    log("diff "+diff);
    if (dy < diff) dy = diff; // limit dy.
    // if (actor.y < res.hitB+16) actor.y = res.hitB+16; // move to bottom edge of tile.
  } else if (dy > 0) { // moving up.
    var diff = T - res.hitT; // always positive or zero.
    if (dy > diff) dy = diff; // limit dy.
    // if (actor.y > res.hitT-16) actor.y = res.hitT-16; // stay 1px below the tile above.
  }

  if (actor.velX > maxVelX) actor.velX = maxVelX;
  if (actor.velX < -maxVelX) actor.velX = -maxVelX;
  if (actor.velY > maxVelY) actor.velY = maxVelY;
  if (actor.velY < -maxVelY) actor.velY = -maxVelY;

  if (state !== actor.state) {
    actor.state = state;
    switch (state) {
      case st_stand_left: setAnim(actor, actor.walkIdle); actor.flip = true; break;
      case st_stand_right: setAnim(actor, actor.walkIdle); actor.flip = false; break;
      case st_walk_left: setAnim(actor, actor.walkAnim); actor.flip = true; break;
      case st_walk_right: setAnim(actor, actor.walkAnim); actor.flip = false; break;
      case st_fall_left: setAnim(actor, actor.jumpAnim); actor.flip = true; break;
      case st_fall_right: setAnim(actor, actor.jumpAnim); actor.flip = false; break;
      case st_jump_left: setAnim(actor, actor.jumpAnim); actor.flip = true; break;
      case st_jump_right: setAnim(actor, actor.jumpAnim); actor.flip = false; break;
      case st_climbing: setAnim(actor, actor.climbAnim); actor.flip = false; break;
    }
  }

*/
