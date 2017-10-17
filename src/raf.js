"use strict";

export var requestAnimationFrame;

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel
var lastTime = 0;
var vendors = ['ms', 'moz', 'webkit', 'o'];
var AF = 'AnimationFrame', raf = 'request'+AF, RAF = 'Request'+AF;
function simulate(callback) {
    var currTime = Date.now(), timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
    var id = setTimeout( function() { callback( currTime + timeToCall ); }, timeToCall );
    lastTime = currTime + timeToCall;
    return id;
}
(function(win){
  requestAnimationFrame = win[raf];
  for (var x=0; x<vendors.length && !requestAnimationFrame; ++x) {
    requestAnimationFrame = win[vendors[x]+RAF];
  }
  if (!requestAnimationFrame) {
    requestAnimationFrame = simulate;
  }
}(window));
