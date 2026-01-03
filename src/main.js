import {canvas, resize, tick, initialLoad} from './canvas.js';
import {updateAuthMenuItem} from './appmenu.js';

// Kick things off
resize();
//updateAuthMenuItem();
requestAnimationFrame(tick);
canvas.focus();
//initialLoad("robinnes");

/*
import {parseLabel} from './label.js';
const st = 'one two three';
console.log(parseLabel(st));
*/