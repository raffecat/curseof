(function(){
  var canvas = document.getElementById("c");

  function resizeCanvas() {
    canvas.width = window.innerWidth || document.documentElement.clientWidth;
    canvas.height = window.innerHeight || document.documentElement.clientHeight;
    //console.log("resize", canvas.width, canvas.height);
  }
  window.onresize = resizeCanvas;
  resizeCanvas();

  if (!window.WebGLRenderingContext) {
    // the browser doesn't even know what WebGL is
    window.location = "http://get.webgl.org";
    return;
  }
  var opts = {depth:true, antialias:false};
  var gl = canvas.getContext("webgl", opts) ||
           canvas.getContext("experimental-webgl", opts);
  if (!gl) {
    // browser supports WebGL but initialization failed.
    window.location = "http://get.webgl.org/troubleshooting";
    return;
  }

  window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                 window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

  var a=0, d=0.01;

  function render() {
    window.requestAnimationFrame(render);

    gl.clearColor(0, 0, a, 1); a += d; if (a>1||a<0) d=-d;
    gl.clear(gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT|gl.COLOR_BUFFER_BIT);

  }
  render();

})();



/*
  function load( url, callback ) {
    // asynchronous loader with retry.
    function attempt() {
      var request = new XMLHttpRequest();
      request.open("GET", url, true); // async.
      request.responseType = "text";
      request.onload = function() {
        this.onload = this.onerror = null;
        if (this.status === 200) {
          callback(this.responseText);
        } else {
          setTimeout(attempt, 1000);
        }
      };
      request.onerror = function() {
        this.onload = this.onerror = null;
        setTimeout(attempt, 1000);
      };
      request.send();
    }
    attempt();
  }
*/


// xhr.responseType = 'blob';
// xhr.onload = function(e) {
//  if (this.status == 200) {
//    var img = document.createElement('img');
//    img.onload = function(e) {
//      window.URL.revokeObjectURL(img.src); // clean up.
//    };
//    img.src = window.URL.createObjectURL(this.response);
//    document.body.appendChild(img);
//
//    var blob = new Blob([this.response], {type: 'image/png'});


