var GL_width, GL_height, GL_halfW, GL_halfH, GL_white;  // output: backing buffer size.
var GL_Texture, GL_Geometry, GL_viewMatrix, GL_setClip, GL_endClip, GL_setColor;  // output: entry points.

function GLRenderer(renderScene) {

  // IE11 is VERY sensitive to draw calls (1500 is very jumpy)
  // IE11 becomes CPU bound as canvas size increases (full screen is bad)
  // ^ due to WEBGL11258: Temporarily switching to software rendering to display WebGL content.

  // Firefox and Chrome seem fine with 1500 draw calls at any size.
  // Chrome is VERY sensitive to GC, causing periodic stutter (every 30 seconds)

  var canvas = document.createElement('canvas');
  document.body.insertBefore(canvas, document.body.firstChild);

  // https://www.khronos.org/webgl/wiki/HandlingContextLost
  canvas.addEventListener("webglcontextlost", function(event) {
      event.preventDefault();
      destWebGL();
  }, false);
  canvas.addEventListener("webglcontextrestored", initWebGL, false);


  // ---- resize.

  var sizeDirty = false;

  function sizeViewport() {
    sizeDirty = false;

    // high-definition displays:
    // read window.devicePixelRatio, scale the canvas.width/height by that factor,
    // set its style to the original window width and height (both in CSS pixels)
    var dpr = 1; // window.devicePixelRatio || 1;
    log("dpr: "+dpr);
    var width = window.innerWidth || (document.documentElement ? document.documentElement.offsetWidth : document.body.offsetWidth);
    var height = window.innerHeight || (document.documentElement ? document.documentElement.offsetHeight : document.body.offsetHeight);
    var backingWidth = dpr * width;
    var backingHeight = dpr * height;
    canvas['width'] = backingWidth;
    canvas['height'] = backingHeight;
    canvas['style']['width'] = width+'px';
    canvas['style']['height'] = height+'px';

    if (gl) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    projMatrix = new FloatArray(ortho(-backingWidth/2, backingWidth/2, -backingHeight/2, backingHeight/2, -1, 1));

    // ensure exact pixel alignment if the backing width or height is an odd number.
    // offset by half a pixel, and hide the extra pixel from the rest of the app.
    if (backingWidth%2!==0) projMatrix[12] += 0.5/backingWidth;   // half a pixel wide.
    if (backingHeight%2!==0) projMatrix[13] += 0.5/backingHeight; // half a pixel high.

    GL_width = backingWidth;
    GL_height = backingHeight;
    GL_halfW = Math.floor(GL_width * 0.5);  // half width in whole pixels.
    GL_halfH = Math.floor(GL_height * 0.5); // half height in whole pixels.
  }

  function ortho(left, right, bottom, top, znear, zfar) {
    var tx = -(right+left)/(right-left);
    var ty = -(top+bottom)/(top-bottom);
    var tz = -(zfar+znear)/(zfar-znear);

    return [2/(right-left), 0, 0, tx,
            0, 2/(top-bottom), 0, ty,
            0, 0, -2/(zfar-znear), tz,
            0, 0, 0, 1];
  }

  function resizeHandler() {
    // Defer resizing the canvas until next frame.
    // This approach avoids flicker in IE (clears canvas on resize)
    // and avoids many extra redraws during Firefox fullscreen transition.
    sizeDirty = true;
  }

  window.addEventListener('resize', resizeHandler, false);


  // ---- debug.

  var drawCalls = 0;
  var blendCalls = 0;
  var texChange = 0;
  var lastDT = 0;

  if (0) {
    var dcDisp = document.createElement('div');
    var dcText = document.createTextNode('0');
    dcDisp.setAttribute('style', 'position:absolute;top:2px;right:4px;font:14px sans-serif;color:#fff;z-index:20');
    dcDisp.appendChild(dcText);
    document.body.appendChild(dcDisp);
    var drawDebug = (function () {
      dcText.nodeValue = ' dc: '+drawCalls+' bm: '+blendCalls+' tc: '+texChange+' dt: '+(Math.round(lastDT*10)/10);
      drawCalls = 0;
      blendCalls = 0;
      texChange = 0;
    });
  }


  // ---- GL context.

  var gl;
  // var clearBits;

  var vertexPositionAttribute;
  var textureCoordAttribute;
  var projMatrixAttribute;
  var modelViewAttribute;
  var colorAttribute;
  var samplerAttribute;

  var texList = [];
  var geomList = [];

  var blendState = false;
  var currentTex = null;

  var white = { r:0.0, g:0.0, b:0.0, a:1.0 };
  var currentColor = white;
  GL_white = white;

  var lastTS = null;

  function initWebGL() {

    trace("initWebGL");

    // TODO try "webgl.min_capability_mode" and "webgl.disable-extensions" in Firefox settings.
    // webgl.getParameter(webgl.MAX_TEXTURE_SIZE)
    // OES_texture_float does not imply render to float texture; use checkFramebufferStatus().

    var glopts = {
      alpha: false, // default true.
      depth: false, // default true.
      stencil: false,
      antialias: false, // default true.
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: true // default false.
    };

    gl = canvas.getContext("webgl", glopts) || canvas.getContext("experimental-webgl", glopts);

    if (!gl) {
      // detect major performance caveat.
      glopts.failIfMajorPerformanceCaveat = false;
      gl = canvas.getContext("webgl", glopts) || canvas.getContext("experimental-webgl", glopts);
      if (gl) {
        var msg = document.createElement('div');
        msg.setAttribute('style', 'position:absolute;top:2px;left:4px;padding:1px 2px;font:12px sans-serif;color:#442;background-color:#cde;z-index:20');
        msg.innerHTML = 'WebGL: slow rendering path';
        document.body.appendChild(msg);
      } else {
        log("EWebGL");
        return;
      }
    }

    /*
    clearBits = gl.COLOR_BUFFER_BIT;
    if (glopts.stencil) clearBits |= gl.STENCIL_BUFFER_BIT;
    if (glopts.depth) clearBits |= gl.DEPTH_BUFFER_BIT;
    */

    // shaders.

    var vertexShader = getShader(gl, "vertex", gl.VERTEX_SHADER);
    var fragmentShader = getShader(gl, "fragment", gl.FRAGMENT_SHADER);

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);

    // good idea on desktop browsers, since OpenGL requires attribute 0 enabled.
    gl.bindAttribLocation(shaderProgram, 0, "aVertexPosition");

    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      log("EShader");
    }

    gl.useProgram(shaderProgram);

    vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    projMatrixAttribute = gl.getUniformLocation(shaderProgram, "uPMatrix");
    modelViewAttribute = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    colorAttribute = gl.getUniformLocation(shaderProgram, "uColor");
    samplerAttribute = gl.getUniformLocation(shaderProgram, "uSampler");

    gl.enableVertexAttribArray(vertexPositionAttribute);
    gl.enableVertexAttribArray(textureCoordAttribute);

    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(samplerAttribute, 0);

    // using premultiplied alpha.
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.BLEND);

    // render state.

    blendState = false;
    currentTex = null;

    // textures.

    trace("binding textures, texList length", texList.length);

    for (var i=0; i<texList.length; i++) {
      texList[i](gl);
    }

    // geometry buffers.

    for (var i=0; i<geomList.length; i++) {
      geomList[i](gl);
    }

    // start rendering.

    sizeViewport();

    lastTS = null;
    trace("starting frame loop");
    requestAnimationFrame(frameLoop);
  }

  function destWebGL() {
    trace("destWebGL");

    gl = null;
    currentTex = null;

    vertexPositionAttribute = null;
    textureCoordAttribute = null;
    projMatrixAttribute = null;
    modelViewAttribute = null;
    colorAttribute = null;
    samplerAttribute = null;

    for (var i=0; i<texList.length; i++) {
      texList[i]();
    }
    for (var i=0; i<geomList.length; i++) {
      geomList[i]();
    }
  }

  function nextFrame() {
    requestAnimationFrame(frameLoop);
  }

  function frameLoop(ts) {
    if (!gl) return; // stop when context is lost.
    if (sizeDirty) sizeViewport();
    requestAnimationFrame(frameLoop);
    var dt = ts - (lastTS || ts);
    lastTS = ts;
    if (dt > 50) dt = 50; // 20 fps.
    render(dt);
  }


  // ---- renderer.

  var IDENTITY = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

  var projMatrix = new FloatArray(IDENTITY);

  function render(dt) {
    lastDT = dt;
    // trace("render", dt);

    // WebGL implicitly clears the buffer after compositing.
    //gl.clearColor(0.2, 0.2, 0.3, 1.0);
    //gl.clear(clearBits); // seems to consume CPU in IE11 fallback.

    gl.uniform4f(colorAttribute, GL_white.r, GL_white.g, GL_white.b, GL_white.a);
    currentColor = white;

    gl.uniformMatrix4fv(projMatrixAttribute, false, projMatrix);

    renderScene(dt); // input function.

    //gl.flush();

    if (drawDebug) drawDebug();

    for (;;) {
      var err = gl.getError();
      if (err) { log("GL:",err); } else break;
    }
  }

  function setViewMatrix(matrix) {
    // FIXME: only applies to the current shader!
    gl.uniformMatrix4fv(modelViewAttribute, false, matrix);
  }

  function setClip(L,B,R,T) {
    gl.scissor(L,B,R,T);
    gl.enable(gl.SCISSOR_TEST);
  }

  function endClip() {
    gl.disable(gl.SCISSOR_TEST);
  }

  function setColor(col) {
    if (col !== currentColor) {
      currentColor = col;
      gl.uniform4f(colorAttribute, col.r, col.g, col.b, col.a);
    }
  }

  // ---- textures.

  function newTexture(img) {
    // return a wrapper object that manages the GL texture.
    var data = img.data;
    var wrap = img.wrap;

    function update(img) {
      if (img) {
        data = img.data;
      }
      if (gl && data) {
        //trace("upload texture");
        currentTex = tex._t;
        gl.bindTexture(gl.TEXTURE_2D, tex._t);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
        // gl.generateMipmap(gl.TEXTURE_2D);
      }
    }

    function bind(gl) {
      if (gl) {
        currentTex = tex._t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex._t);
        update();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); // LINEAR
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // LINEAR_MIPMAP_LINEAR
        if (!wrap) {
          // NB. cannot wrap (must clamp to edge) for non-power-of-two textures.
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
      } else {
        tex._t = null;
      }
    }

    var tex = {
      _t: null,
      width: img.width,
      height: img.height,
      opaque: img.opaque || false,
      update: update
    };

    img = null; // gc.
    texList.push(bind); // register.
    if (gl) bind(gl); // initialize.

    return tex;
  }


  // ---- geometry.

  function newGeometry(pts, indices, dynamicVerts, dynamicInds) {

    var vertBuf, indicesBuf;
    var numInds = 0;

    function update(verts, inds) {
      if (verts) {
        gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
        if (pts && pts.length >= verts.length) {
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
        } else {
          // must reallocate the vertex buffer.
          gl.bufferData(gl.ARRAY_BUFFER, verts, dynamicVerts ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        }
        pts = verts; // for bind()
      }
      if (inds) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuf);
        if (indices && indices.length >= inds.length) {
          gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, inds);
        } else {
          // must reallocate the element array.
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, inds, dynamicInds ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        }
        indices = inds; // for bind()
        numInds = inds.length;
      }
    }

    function bind(gl) {
      if (gl) {
        vertBuf = gl.createBuffer();
        indicesBuf = gl.createBuffer();
        if (pts) {
          gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
          gl.bufferData(gl.ARRAY_BUFFER, pts, dynamicVerts ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        }
        if (indices) {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuf);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, dynamicInds ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
          numInds = indices.length;
        }
      } else {
        vertBuf = coordBuf = indicesBuf = null;
        numInds = 0;
      }
    }

    function draw(tex, iofs, inum) {
      if (!numInds) return;

      //trace("draw", numInds, tex._t);

      // make the texture (wrapper) active.
      if (currentTex != tex._t) {
        currentTex = tex._t;
        gl.bindTexture(gl.TEXTURE_2D, tex._t);
        texChange++;

        // also change blend mode if necessary.
        var needTrans = !tex.opaque;
        if (blendState !== needTrans) {
          blendState = needTrans;
          if (blendState) {
            gl.enable(gl.BLEND);
            blendCalls++;
          } else {
            gl.disable(gl.BLEND);
            blendCalls++;
          }
        }
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuf);

      // FIXME: create a VAO.
      gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 4*4, 0); // 4 floats, offset 0
      gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 4*4, 2*4); // 4 floats, offset 2

      if (iofs == null) { iofs = 0; inum = numInds; }

      gl.drawElements(gl.TRIANGLES, inum, gl.UNSIGNED_SHORT, iofs);
      drawCalls++;
    }

    var buf = {
      draw: draw,
      update: update
    };

    geomList.push(bind); // register.
    if (gl) bind(gl); // initialise.

    return buf;
  }

  // ---- shaders.

  function getShader(gl, id, glType) {
    var source = ShaderLibrary[id];
    if (!source) {
      log("EShader:"+id);
      return null;
    }

    var shader = gl.createShader(glType);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        log(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
  }

  GL_Texture = newTexture;
  GL_Geometry = newGeometry;
  GL_viewMatrix = setViewMatrix;
  GL_setClip = setClip;
  GL_endClip = endClip;
  GL_setColor = setColor;

  initWebGL();

  // TEST context loss.
  // setTimeout(function(){ destWebGL(); initWebGL(); }, 10*1000);
}
