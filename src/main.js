import {canvas, resize, tick, initialLoad} from './canvas.js';

// Kick things off
resize();
requestAnimationFrame(tick);
canvas.focus();
initialLoad("robinnes");

/*
import {parseLabel} from './label.js';
const st = 'one two three';
console.log(parseLabel(st));
*/