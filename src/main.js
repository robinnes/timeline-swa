import {canvas, resize, tick, initialLoad} from './canvas.js';

// Kick things off
resize();
requestAnimationFrame(tick);
canvas.focus();
initialLoad();

/*
const st = "Born to <a href=\"#\" tl=\"sherryinnes\">Sherry Innes</a>";
//const regex = /<a\s+href="#"\s+tl="([^"]*)">(.*?)<\/a>/;
const regex = /<a\s+href="#"\s+([a-z]+)="([^"]*)">(.*?)<\/a>/;
const r = regex.exec(st);
console.log(r);
*/


/*
import {parseLabel} from './label.js';
const st = "Born to <a href=\"#\" tl=\"sherryinnes\">Sherry Innes</a>";
//const st = "one two three four five six seven eight nine";
const x = parseLabel(st, null);
console.log(x.multiRow, x.multiWidth);
*/