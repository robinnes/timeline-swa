import {canvas, resize, tick, initialLoad} from './canvas.js';
//import {updateAppMenu} from './appmenu.js';

// Kick things off
resize();
//updateAppMenu();
requestAnimationFrame(tick);
canvas.focus();
initialLoad();

/*
import {parseLabel} from './label.js';
const st = 'one two three';
console.log(parseLabel(st));
*/