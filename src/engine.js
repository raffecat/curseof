
function animateEnts(ents, delta) {
  for (var i=0; i<ents.length; i++) {
    var ent = ents[i];
    var dt = delta;
    var frames = ent.frames; // animation frames.
    var index = ent.index; // current frame index.
    var remain = ent.remain; // time remaining on current frame.
    while (dt >= remain) {
      // advance to the next frame.
      dt -= remain;
      index += 1;
      if (index >= frames.length) {
        if (ent.loop) {
          index = 0; // loop the animation.
        } else {
          index = frames.length-1; // stay on the last frame.
          remain = 1000; // big number to avoid spinning this loop.
          break;
        }
      }
      remain = frames[index].ticks; // duration of this frame.
    }
    ent.index = index;
    ent.remain = remain - dt; // remaining for next frame.
  }
}

/*
function renderEnts(ents, gl) {
  for (var i=0; i<ents.length; i++) {
    var ent = ents[i];
    var frame = ent.frames[ent.index];
    // all triangles for all quads/shapes in one frame are batched together.
    gl.drawRangeElements(gl.TRIANGLES, frame.firstIdx, frame.lastIdx, frame.numIdx, gl.UNSIGNED_SHORT, frame.idxOfs);
  }
}
*/

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
      actor.velY = climbSpeed;
    } else if (down) {
      actor.velY = -climbSpeed;
    } else {
      actor.velY = 0; // stop falling.
    }
  } else {
    actor.velY -= gravity;
  }
  if (right) {
    actor.flip = false;
    actor.velX = walkSpeed;
  } else if (left) {
    actor.flip = true;
    actor.velX = -walkSpeed;
  } else {
    actor.velX = 0;
  }
  if (actor.onground) {
    if (jump) {
      //actor.onground = false;
      //actor.onrope = false;
      actor.velY = jumpVelocity;
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
