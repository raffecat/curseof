
function MapGeom(geom, tileSet, data, ofs, map_w, map_h) {
  // generate geometry for all non-empty room tiles.
  var drawSize = 32;
  var verts = new FloatArray(4 * 4 * map_w * map_h); // [x,y,u,v] * [L,B,R,T] * w * h
  var inds = new Uint16Array(6 * map_w * map_h);     // [0,1,2,1,3,2] * w * h
  var wr = 0, vofs = 0, iofs = 0;
  for (var y=0; y<map_h; y++) {
    for (var x=0; x<map_w; x++) {
      var v = data[ofs++];
      if (v) { // tile zero is never rendered.
        var t = tileSet[v];
        if (t) { // protect against out-of-bounds.
          var L = x * drawSize, T = -y * drawSize; // top-left of this tile.
          var R = L + drawSize, B = T - drawSize; // bottom-right of this tile.
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
  geom.update(usedVerts, usedInds);
  return ofs;
}

function TileSet(image, tileSize) {
  var img_w = image.width, img_h = image.height;
  var ts_w = Math.floor(img_w/tileSize), ts_h = Math.floor(img_h/tileSize);
  var ts_u = tileSize/img_w, ts_v = tileSize/img_h;
  var tileSet = [];
  for (var y=0; y<ts_h; y++) {
    for (var x=0; x<ts_w; x++) {
      tileSet.push({ u0: x * ts_u, v0: (y+1) * ts_v, u1: (x+1) * ts_u, v1: y * ts_v });
    }
  }
  return tileSet;
}

function FrameSet(renderer, image, tileW, tileH, num_frames, yOfs, ticks) {
  var img_w = image.width, img_h = image.height;
  var ts_u = tileW/img_w;
  var L = -tileW/2, B = -tileH/2; // bottom-left of this tile.
  var R = L + tileW, T = B + tileH; // top-right of this tile.
  var frames = [];
  var verts = new FloatArray(16 * num_frames); // [x,y,u,v] * [L,B,R,T] * num_frames
  var inds = new Uint16Array(6 * num_frames);  // [0,1,2,1,3,2] * num_frames
  var wr = 0, vofs = 0, iofs = 0;
  var v0 = (yOfs+tileH)/img_h, v1 = yOfs/img_h;
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
  var geom = renderer.newGeometry(verts, inds); // num_frames * 16, num_frames * 6
  return { frames:frames, image:image, geom:geom };
}
