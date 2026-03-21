import {canvas, resize, tick, initialLoad} from './canvas.js';

// Kick things off
resize();
requestAnimationFrame(tick);
canvas.focus();
initialLoad();

/*
import {parseLabel} from './label.js';
const st = "Born to <a href=\"#\" tl=\"sherryinnes\">Sherry Innes</a>";
//const st = "one two three four five six seven eight nine";
const x = parseLabel(st, null);
console.log(x.multiRow, x.multiWidth);
*/

/*
const d = new Date(Date.UTC(2020, 11, 20, 12, 23, 16, 738));
console.log(d);
d.setUTCMinutes(0,0,0);
console.log(d);
*/
