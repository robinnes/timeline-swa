import {canvas, resize, tick, initialLoad} from './canvas.js';

// Kick things off
resize();
requestAnimationFrame(tick);
canvas.focus();
initialLoad();

/*
import {parseLabel} from './label.js';
//const st = "Born to <a href=\"#\" tl=\"sherryinnes\">Sherry Innes</a>";
//const st = "Born to Sherry Innes";
//const st = "The Boys the boys the boys the boys the boys the boys the boys the boys the boys the boys";
const st = "hello";
const x = parseLabel(st, "thumb");
//console.log(x.multiRow, x.multiWidth);
*/