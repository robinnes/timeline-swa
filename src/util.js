import {TIME} from './constants.js';
import {appState} from './canvas.js';

// --- Helper functions

export const pxToTime = x => TIME.EPOCH + appState.offsetMs + (x * appState.msPerPx);

export const timeToPx = t => (t - TIME.EPOCH - appState.offsetMs + (1000 * 60 * 60 * 12)) / appState.msPerPx;

export const pxPerDay = x => (1 / (msPerPx / TIME.MS_PER_DAY));


// **********************************************************************************************************************

import {DRAW} from './constants.js';
import {zoomSpec} from './render.js';

export function debugVars() {
  if (!appState.selected.event) return;
  
  const ctx = canvas.getContext('2d');
  const sig = appState.selected.event.significance;
  const spec = zoomSpec(sig);
  const leftLabel = window.innerWidth - 100;
  const leftValue = window.innerWidth - 30;
  let top = window.innerHeight - 75;

  ctx.save();
  ctx.font = DRAW.LABEL_FONT;
  ctx.fillStyle = 'rgba(9, 247, 49, 0.5)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  
  //if (highlightedEvent) {
  //  const t = highlightedEvent.label;
  //  ctx.fillText(t, window.innerWidth - 30, window.innerHeight - 95);
  //}
  
  ctx.fillText("factor:", leftLabel, top);
  ctx.fillText(Math.round(spec.factor*1000)/1000, leftValue, top);
  top += 20;
  ctx.fillText(`fade(${sig}):`, leftLabel, top);
  ctx.fillText(Math.round((spec.fade)*1000)/1000, leftValue, top);
  top += 20;
  ctx.fillText(`size(${sig}):`, leftLabel, top);
  ctx.fillText(Math.round((spec.size)*1000)/1000, leftValue, top);
  
  ctx.restore();
  
};
