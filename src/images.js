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
    }
    done();
  });
}

var imageCache = CacheLoader(ImageLoader);
