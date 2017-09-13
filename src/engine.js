
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
  var w = map[0], h = map[1], base = map[2];
  var x0 = Math.max(0, Math.floor(L / 32));    // min 0
  var x1 = Math.min(Math.floor(R / 32), w-1);  // max w-1
  var y0 = Math.max(0, Math.floor(B / 32));    // min 0
  var y1 = Math.min(Math.floor(T / 32), h-1);  // max h-1
  var minL = R, minB = T, minR = L, minT = B;
  var climb = false, pain = false;
  for (var y = y0; y <= y1; y++) {
    var row = y * w;
    for (var x = x0; x <= x1; x++) {
      var t = map[row+x];
      if (solidTiles[t]) {
        // determine the edges of the solid tile.
        var tileL = x * 32, tileB = y * 32, tileR = tileL + 32, tileT = tileB + 32;
        // record the minimum and maximum solid edges found.
        if (minL > tileL) minL = tileL;
        if (minB > tileB) minB = tileB;
        if (minR < tileR) minR = tileR;
        if (minT < tileT) minT = tileT;
      }
      // record the tile tags found.
      if (climbTiles[t]) climb = true;
      if (painTiles[t]) pain = true;
    }
  }
  res.minL = minL; res.minB = minB;
  res.minR = minR; res.minT = minT;
  res.climb = climb; res.pain = pain;
}

var jumpVelocity = 6 * (60/1000);
var gravity = 1 * (60/1000);
var walkSpeed = 3 * (60/1000);
var climbSpeed = 3 * (60/1000);
var maxVelX = 8 * (60/1000);
var maxVelY = 8 * (60/1000);

function walkMove(actor, dt) {
  // based on the previously rendered frame, which the player has seen,
  // use the current actor state (onground, onladder) to process input,
  // giving velocity for this frame.
  var jump = keys[32]; // Space.
  var left = keys[65]; // A.
  var right = keys[68]; // D.
  var down = keys[83]; // S.
  var up = keys[87]; // W.
  if (actor.onrope) {
    if (up) {
      toAnim(actor, actor.climbAnim);
      actor.velY = climbSpeed;
    } else if (down) {
      toAnim(actor, actor.climbAnim);
      actor.velY = -climbSpeed;
    } else {
      if (actor.velY != 0) {
        // stop falling.
        toAnim(actor, actor.climbIdle);
        actor.velY = 0;
      }
    }
  } else {
    actor.velY -= gravity;
  }
  if (right) {
    toAnim(actor, actor.walkAnim);
    actor.flip = false;
    actor.velX = walkSpeed;
  } else if (left) {
    toAnim(actor, actor.walkAnim);
    actor.flip = true;
    actor.velX = -walkSpeed;
  } else {
    if (actor.velX != 0) {
      // stop walking.
      toAnim(actor, actor.walkIdle);
      actor.velX = 0;
    }
  }
  if (actor.onground) {
    if (jump) {
      //actor.onground = false;
      //actor.onrope = false;
      actor.velY = jumpVelocity;
      toAnim(actor, actor.walkAnim);
    }
  }
  if (actor.velX > maxVelX) actor.velX = maxVelX;
  if (actor.velX < -maxVelX) actor.velX = -maxVelX;
  if (actor.velY > maxVelY) actor.velY = maxVelY;
  if (actor.velY < -maxVelY) actor.velY = -maxVelY;
  // query for max-Y hit in actor rect extended with downward motion.
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
  actor.posX += dt * actor.velX;
  actor.posY += dt * actor.velY;
  actor.x = Math.floor(actor.posX);
  actor.y = Math.floor(actor.posY);
}
