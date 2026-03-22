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
import {tickSpec} from './ticks.js';
const t = 1774085570380;
for (const ts of tickSpec.values()) {
  const func = ts.label[ts.label.length-1].text;
  console.log({mode:ts.mode, label:func(t)})
}


const d = Date.parse("2025-10-");
console.log(new Date(d).toLocaleString(undefined, {year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'numeric', timeZone:'UTC'}));

*/