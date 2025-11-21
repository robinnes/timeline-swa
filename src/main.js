import {canvas, resize, tick, initialLoad} from './canvas.js';
import * as appmenu from './appmenu.js';

// Kick things off
resize();
requestAnimationFrame(tick);
canvas.focus();
initialLoad("robinnes");

