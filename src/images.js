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
      if (obj.fs) {
        // need to generate a frame-set for the image.
        obj.ts = FrameSet(obj, 32, 32, obj.fs, 0);
      }
    }
    done();
  });
}

var imageCache = CacheLoader(ImageLoader);
