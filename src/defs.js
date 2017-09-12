
var debug = true;

var log = debug && window.console && console.log && console.log.bind && console.log.bind(console) || function(){};
var trace = log;

var FloatArray = window.Float32Array || window.WebGLFloatArray;
var Uint16Array = window.Uint16Array;

// var hasOwn = Object.prototype.hasOwnProperty;
