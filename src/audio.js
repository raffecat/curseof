"use strict";

import { log } from './defs';

// https://www.html5rocks.com/en/tutorials/webaudio/intro/
// https://webaudio.github.io/web-audio-api/#idl-def-AudioBufferSourceNode

// Webkit/blink browsers need prefix, Safari won't work without window.
var Snd_Ctx = new (window['AudioContext'] || window['webkitAudioContext'])();

export function Sample(src) {
  var sample = { buf:null };
  var req = new XMLHttpRequest();
  req.open('GET', src, true);
  req['responseType'] = 'arraybuffer';
  function done() {
    req['onload'] = null; req['onerror'] = null; req = null;
  }
  req['onload'] = function () {
    Snd_Ctx['decodeAudioData'](req['response'], function (buf) {
      sample.buf = buf;
      done();
    }, function () { log("EAudio:"+src); done(); });
  };
  req['onerror'] = function () {
    log("EAudio:"+src); done();
  };
  req.send();
  return sample;
}

export function play(sample) {
  if (sample.buf) {
    var source = Snd_Ctx.createBufferSource();
    source['buffer'] = sample.buf;
    source.connect(Snd_Ctx.destination);
    source.start(0);
  }
}
