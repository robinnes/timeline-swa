import {canvas, resize, tick, initialLoad} from './canvas.js';

resize();
requestAnimationFrame(tick);
canvas.focus();
initialLoad();


/*
import {parseLabel, processLinks} from './label.js';
const st = "Born to <a href=\"#\" tl=\"sherryinnes\">Sherry Innes</a>";
//const st = "one two three four five six seven eight nine";
const x = parseLabel(st, null);
console.log(x.multiRow, x.multiWidth);

const st = "Born to <a href=\"#\" tl=\"sherryinnes\" tag=\"werioupwerytpwepiu\">Sherry Innes</a>";
const {words, totalWidth} = processLinks(st);
console.log(words[2].link);
*/