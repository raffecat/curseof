(function(){

  // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
  // requestAnimationFrame polyfill by Erik Möller
  // fixes from Paul Irish and Tino Zijdel
  var lastTime = 0;
  var vendors = [ 'ms', 'moz', 'webkit', 'o' ];
  var AF = 'AnimationFrame', raf = 'request'+AF, caf = 'cancel'+AF, RAF = 'Request'+AF, Can = 'Cancel';
  function simulate( callback, element ) {
      var currTime = Date.now(), timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
      var id = setTimeout( function() { callback( currTime + timeToCall ); }, timeToCall );
      lastTime = currTime + timeToCall;
      return id;
  }
  (function(win){
      for ( var x = 0; x < vendors.length && !win[raf]; ++ x ) {
        win[raf] = win[ vendors[ x ] + RAF ];
        win[caf] = win[ vendors[ x ] + Can+AF ] || win[ vendors[ x ] + Can+RAF ];
      }
      if ( win[raf] === undefined ) {
        win[raf] = simulate;
      }
      win[caf] = win[caf] || function ( id ) { clearTimeout( id ) };
  }(window));

}());
