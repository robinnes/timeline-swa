import {canvas, resize, tick, initialLoad} from './canvas.js';

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

import {tickSpec} from './ticks.js';
const t = 1774085570380;
for (const ts of tickSpec.values()) {
  const func = ts.panelLabel;
  console.log({mode:ts.mode, label:func(t)})
}
*/