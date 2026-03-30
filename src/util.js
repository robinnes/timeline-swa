import {TIME} from './constants.js';
import {appState, getCanvasViewport} from './canvas.js';

// --- Helper functions

export const pxToTime = x => {
  const vp = getCanvasViewport();
  return TIME.EPOCH + appState.offsetMs + ((x - vp.left) * appState.msPerPx);
};

export const timeToPx = t => {
  const vp = getCanvasViewport();
  //return vp.left + ((t - TIME.EPOCH - appState.offsetMs + (1000 * 60 * 60 * 12)) / appState.msPerPx);
  return vp.left + ((t - TIME.EPOCH - appState.offsetMs) / appState.msPerPx);
};

export function showGlobalBusyCursor() {
  const style = document.createElement('style');
  style.id = 'global-busy-cursor';
  style.textContent = `* { cursor: wait !important; }`;
  document.head.appendChild(style);
}

export function hideGlobalBusyCursor() {
  const style = document.getElementById('global-busy-cursor');
  if (style) style.remove();
}

export function htmlToPlainText(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return d.innerText;
}
/*
export function formatTextDate(txtDate) {
  const d = new Date(txtDate); // adjusts for TZ, so must also be undone with timeZone:"UTC"
  return d.toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric", timeZone:"UTC"});
}
*/
export async function isLocalEnv() {
  const isLocal = (location.hostname === "127.0.0.1");
  return isLocal;
}

export function uuid() {
  return crypto.randomUUID();
}

// **********************************************************************************************************************

import {DRAW} from './constants.js';
import {zoomSpec} from './render.js';

export function debugVars() {
  const ctx = canvas.getContext('2d');
  const leftLabel = window.innerWidth - 300;
  const leftValue = window.innerWidth - 200;
  let top = window.innerHeight - 95;

  const round = (value) => {
    return Math.round(value*1000)/1000;    // need to test
  };

  const fmtDate = (timestamp) => {
    return new Date(timestamp).toLocaleString(undefined, {year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone:'UTC'}) 
  };

  const display = (label, value) => {
    ctx.fillText(label, leftLabel, top);
    ctx.fillText(value, leftValue, top);
    top += 20;
  };

  const i = appState.selected.item;
  if (!i) return;

  ctx.save();
  ctx.font = DRAW.LABEL_FONT;
  ctx.fillStyle = 'rgba(9, 247, 49, 0.5)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  display('_tFrom', fmtDate(i._tFrom));
  display('_fLeft', fmtDate(i._fLeft));
  display('_fRight', fmtDate(i._fRight));
  display('_tTo', fmtDate(i._tTo));
  
  ctx.restore();
  
};
