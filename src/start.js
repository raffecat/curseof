
function getElem(id) { return document.getElementById(id); }
function showStatus(msg) { getElem('p').firstChild.nodeValue = msg; }
function removeElem(id,e) { (e=getElem(id)).parentNode.removeChild(e); }

var redMark, blueMark; // debugging.

// sounds.
var jumpSound = Snd_Sample('/assets/jump.wav');
var painSound = Snd_Sample('/assets/ouch.wav');

// game state for spawns.
var sprites = [];
var movers = [];
var lines = [];

function initGame() {
  showStatus( 'Loading...' );

  var IDENTITY = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

  var noTransform = new FloatArray(IDENTITY);
  var cameraTransform = new FloatArray(IDENTITY);
  var spriteTransform = new FloatArray(IDENTITY);

  var maxHealth = 103;
  var savedHealth = maxHealth; // new game.

  // rendering.

  var tileSet = [];
  var ready = false;
  var freeze = false;
  var player = null;
  var map = null; // current map.
  var panX=0, panY=0, panSpd=1;
  var loadLatch=false, levelNum=0;
  var scene_L=0, scene_B=0, scene_R=0, scene_T=0;
  var clipHeight = 40;
  var healthBar;

  function updateHealthBar() {
    if (player) {
      var health = Math.max(0, player.health);
      var L = -GL_halfW + 8, R = L + (2 * health);
      var T = GL_halfH-8, B = T-15;
      var u = (R-L) / (2 * maxHealth);
      updateQuad(healthBar, L, B, R, T, 0, 0, u, 1);
    }
  }

  function render(dt) {
    if (!ready) return;

    // cycle through maps with 'M' for testing.
    if (1) {
      if (keys[77]) {
        if (!loadLatch) {
          loadLatch = true;
          levelNum += 1;
          if (levelNum > 3) levelNum = 0;
          $.w.emit('r',levelNum);
        }
      } else {
        loadLatch = false;
      }
    }

    // update all movers.
    for (var i=0; i<movers.length; i++) {
      var s = movers[i];
      s.update(s, dt);
    }

    // move the player.
    if (player && !freeze) {
      walkMove(player, dt, map, movers);
      updateHealthBar();
      if (player.health < 1) {
        // DEAD.
        freeze = true;
      }
    }

    // center the camera on the player.
    if (keys[16]) {
      // camera panning with arrow keys (hold shift to pan)
      if (keys[37]) panX -= dt * panSpd; if (keys[39]) panX += dt * panSpd;
      if (keys[40]) panY -= dt * panSpd; if (keys[38]) panY += dt * panSpd;
    } else if (player) {
      panX = player.x;
      panY = player.y;
    }

    // confine the camera to the scene.
    var camHW = Math.floor(GL_width * 0.5), camHH = Math.floor(GL_height * 0.5);
    var camL = scene_L + camHW, camB = scene_B + camHH, camR = scene_R - camHW, camT = scene_T - camHH;
    if (camL >= camR) {
      cameraTransform[12] = -Math.floor((scene_L + scene_R) * 0.5); // center of scene.
    } else if (panX < camL) {
      cameraTransform[12] = -camL;
    } else if (panX > camR) {
      cameraTransform[12] = -camR;
    } else {
      cameraTransform[12] = -Math.floor(panX);
    }
    if (camB >= camT) {
      cameraTransform[13] = -Math.floor((scene_B + scene_T) * 0.5); // center of scene.
    } else if (panY < camB) {
      cameraTransform[13] = -camB;
    } else if (panY > camT) {
      cameraTransform[13] = -camT;
    } else {
      cameraTransform[13] = -Math.floor(panY);
    }

    // animate all sprites.
    animateEnts(sprites, dt);

    // draw the health bar.
    GL_viewMatrix(noTransform);
    healthBar.draw(healthImg.tex);

    GL_setClip(0, 0, GL_width, GL_height - clipHeight);

    // render the room geometry.
    GL_viewMatrix(cameraTransform);
    roomGeom.draw(tileImg.tex);

    // render all lines (in world space)
    for (var i=0; i<lines.length; i++) {
      var s = lines[i];
      s.geom.draw(s.tex, 0, 6);
    }

    // render all sprites.
    for (var i=0; i<sprites.length; i++) {
      var s = sprites[i];
      if (s.visible) {
        spriteTransform[0] = (s.flip ? -1 : 1);
        spriteTransform[12] = cameraTransform[12] + s.x;
        spriteTransform[13] = cameraTransform[13] + s.y;
        GL_viewMatrix(spriteTransform);
        GL_setColor(s.color);
        var frame = s.frames[s.index];
        s.geom.draw(s.tex, frame.iofs, frame.inum);
      }
    }

    GL_endClip();
  }

  GLRenderer(render); // for GL_* functions.

  // load tiles.

  var tileImg = imageCache.get('/assets/tiles.png', {opaque:true,wrap:false});
  var roomGeom = GL_Geometry();

  var healthImg = imageCache.get('/assets/health.png', {opaque:false,wrap:false});
  var belleImg = imageCache.get('/assets/belle.png', {opaque:false,wrap:false,fs:7});

  //var redImg = imageCache.get('/assets/red.png', {opaque:false,wrap:false});
  //var blueImg = imageCache.get('/assets/blue.png', {opaque:false,wrap:false});
  //var redTS, blueTS;

  // wait for all the images to finish loading.
  imageCache.wait(startGame);

  function startGame() {
    tileSet = TileSet(tileImg, 32);
    healthBar = GL_Geometry(quadVerts, quadInds, true, true); // dynamic.

    //redTS = FrameSet(redImg,  32, 32, 1, 0);
    //blueTS = FrameSet(blueImg,  32, 32, 1, 0);

    // send a room request to the server.
    var socket = $.w; // injected global.
    socket.on('r', loadRoom);
    socket.emit('r',0);
  }

  // load maps.

  // spawn functions from spawn.js
  var codeMap = {
    "1": spawnTorch,
    "2": spawnRope,
    "5": spawnSpring,
    "8": spawnCrawler,
    "9": spawnBat,
    "10": spawnSpider,
    "13": spawnBlip,
    "14": spawnPlatLR,
  };

  function loadRoom(data) {
    // log("Room:", data.width, data.height, data.map, data.spawn);
    var startX = data[0], startY = data[1];
    map = data[2]; // current map.

    // [width, height, {tile}, num_spawn, {type,x,y}]
    var map_w = map[0], map_h = map[1], ofs = 2;
    var drawSize = 32;

    // save player health before loading.
    if (player) savedHealth = player.health;

    // reset room state.
    movers = [];
    lines = [];
    sprites = [];
    player = null;

    // redMark = addSprite(redTS, 0, 0, spiderIdle);
    // blueMark = addSprite(blueTS, 0, 0, spiderIdle);

    // generate geometry for all non-empty room tiles.
    ofs = MapGeom(roomGeom, tileSet, map, ofs, map_w, map_h);

    // spawn sprites.
    var num_spawn = map[ofs++];
    for (var i=0; i<num_spawn; i++) {
      // NB. sprites are relative to the bottom-left corner of the map.
      var tt = map[ofs], x = map[ofs+1], y = map[ofs+2]; ofs += 3;
      var spawn = codeMap[tt]; // type of sprite.
      if (spawn) {
        ofs = spawn(x, y, map, ofs);
      } else { log("Espawn:"+tt); break; }
    }

    // spawn exit triggers.
    var num_exits = map[ofs++];
    for (var i=0; i<num_exits; i++) {
      spawnExit(i, map, ofs);
      ofs += 4;
    }

    // spawn the player.
    if (startX) {
      spawnPlayer(startX, startY);
    }

    scene_L = 0;
    scene_B = 0;
    scene_R = (drawSize * map_w);
    scene_T = (drawSize * map_h) + clipHeight;

    // center the camera on the middle of the map.
    if (!player) {
      // origin is the bottom-left corner of the map.
      // translate the scene by negative half map width and height.
      panX = Math.floor(drawSize * map_w * 0.5);
      panY = Math.floor(drawSize * map_h * 0.5);
    }

    if (!ready) hideStatus(); // finished loading.

    ready = true;   // start rendering.
    freeze = false; // start playing.
  }

  function spawnExit(index, data, ofs) {
    var L = data[ofs], B = data[ofs+1], R = data[ofs+2], T = data[ofs+3];
    var spr = { x:0, y:0, is_rope:false, is_enemy:false };
    movers.push(spr); // update.
    spr.update = function(s, dt) {
      if (player && !freeze) {
        if (player.x >= L && player.x <= R && player.y >= B && player.y <= T) {
          freeze = true;
          $.w.emit('x',index);
        }
      }
    };
  }

  var esmeWalk = [ 1, 300, 2, 300, 3, 300, 2, 300 ];
  var esmeWalkIdle = [ 0, 1000 ];
  var esmeClimb = [ 5, 220, 6, 230 ];
  var esmeClimbIdle = [ 5, 1000 ];
  var esmeJump = [ 4, 1000 ];

  function spawnPlayer(x, y) {
    var spr = addSprite(belleImg.ts, x, y, esmeWalkIdle, false);
    spr.health = savedHealth;
    spr.lastDmg = 250; // reset the timer.
    spr.accX = 0;
    spr.accY = 0;
    spr.velX = 0;
    spr.velY = 0;
    spr.jumpHeld = 0;
    spr.onground = true;
    spr.onrope = false;
    spr.walkAnim = esmeWalk;
    spr.walkIdle = esmeWalkIdle;
    spr.climbAnim = esmeClimb;
    spr.climbIdle = esmeClimbIdle;
    spr.jumpAnim = esmeJump;
    player = spr; // update.
  }

  function hideStatus() {
    // hide the loader and start the game.
    removeElem('p'); removeElem('l');
  }
}

(function(){
  try {
    initGame();
  } catch (err) {
    window.console && console.log(err);
    if ( ~err.toString().indexOf('WebGL') ) {
        showStatus( 'No WebGL' );
    } else if ( ~err.toString().indexOf('getContext') ) {
        showStatus( 'No canvas' );
    } else {
        showStatus( 'Error 3' );
    }
  }
})();
