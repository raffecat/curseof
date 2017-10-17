"use strict";

export function getElem(id) { return document.getElementById(id); }
export function removeElem(id,e) { (e=getElem(id)).parentNode.removeChild(e); }
