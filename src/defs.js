"use strict";

export var debug = true;

var c;

export var log = debug && (c=window['console']) && c['log'] && c['log']['bind'] && c['log']['bind'](c) || function(){};
export var trace = log;

export var FloatArray = window.Float32Array || window.WebGLFloatArray;
export var Uint16Array = window.Uint16Array;
