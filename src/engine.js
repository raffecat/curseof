
function animateEnts(ents, delta) {
  for (var i=0; i<ents.length; i++) {
    var ent = ents[i];
    var dt = delta;
    var frames = ent.frames; // animation frames.
    var index = ent.index; // current frame index.
    var remain = ent.remin; // time remaining on current frame.
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

function renderEnts(ents, gl) {
  for (var i=0; i<ents.length; i++) {
    var ent = ents[i];
    var frame = ent.frames[ent.index];
    // all triangles for all quads/shapes in one frame are batched together.
    gl.drawRangeElements(gl.TRIANGLES, frame.firstIdx, frame.lastIdx, frame.numIdx, gl.UNSIGNED_SHORT, frame.idxOfs);
  }
}
