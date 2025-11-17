import {canvas, resize, tick, initialLoad} from './canvas.js';

// Kick things off
resize();
requestAnimationFrame(tick);
canvas.focus();
initialLoad();
