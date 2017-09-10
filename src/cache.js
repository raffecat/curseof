function CacheLoader(loader) {
  var cache = {};
  var loading = 0;
  var queue = [];

  function get(key, obj) {
    if (cache[key]) return cache[key];
    if (obj == null) obj = {};
    cache[key] = obj;
    // begin loading.
    loading++;
    loader(key, obj, function () {
      if (!--loading) {
        if (queue.length) {
          // log("CacheLoader: calling callbacks");
          var q = queue;
          queue = [];
          for (var i=0;i<q.length;i++) q[i]();
        }
      }
    });
    return obj;
  }

  function wait(cb) {
    if (loading) {
      // log("queued cb");
      queue.push(cb);
    } else {
      // log("run cb immediately");
      cb();
    }
  }

  return {
    get: get,
    wait: wait,
    cache: cache
  }
}
