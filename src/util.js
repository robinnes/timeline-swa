import {TIME} from './constants.js';
import {appState, getCanvasViewport, timelineCache} from './canvas.js';

// --- Helper functions

export const pxToTime = x => {
  const vp = getCanvasViewport();
  return TIME.EPOCH + appState.offsetMs + ((x - vp.left) * appState.msPerPx);
};

export const timeToPx = t => {
  const vp = getCanvasViewport();
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

export async function isLocalEnv() {
  const isLocal = (location.hostname === "127.0.0.1");
  return isLocal;
}

export function uuid() {
  return crypto.randomUUID();
}

export function timestampToTemporal(t) {
  // convert timestamp integer t to ISO string representation e.g. "2021-07-01T12:34:56"
  const d = new Date(t);

  const zeroPad = (st, digits) => {
    return ('0000' + st).slice(digits * -1);
  };

  const year = zeroPad(d.toLocaleString(undefined, {year:'numeric', timeZone:'UTC'}), 4);
  const month = zeroPad(d.toLocaleString(undefined, {month:'numeric', timeZone:'UTC'}), 2);
  const day = zeroPad(d.toLocaleString(undefined, {day:'numeric', timeZone:'UTC'}), 2);
  const min = zeroPad(d.toLocaleString(undefined, {minute:'numeric', timeZone:'UTC'}), 2);

  // hour is trickier: "12 AM" -> "00", etc.
  const hString = d.toLocaleString(undefined, {hour:'2-digit', timeZone:'UTC'}).split(" ");
  const h = parseInt(hString[0]);  const ampm = hString[1];
  const hInt = (h===12 && ampm==="AM") ? 0 : (ampm==="AM" || h===12) ? h : h + 12;
  const hour = zeroPad(hInt.toString(), 2);

  return `${year}-${month}-${day}T${hour}:${min}:00`;
}

// **********************************************************************************************************************

import {DRAW} from './constants.js';
import {zoomSpec} from './render.js';

export function debugVars() {
  const ctx = canvas.getContext('2d');
  const leftLabel = window.innerWidth - 300;
  const leftValue = window.innerWidth - 200;
  let top = window.innerHeight - 180;

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

  ctx.save();
  ctx.font = DRAW.LABEL_FONT;
  ctx.fillStyle = 'rgba(9, 247, 49, 0.5)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  /*
  const tl = timelineCache.values().next().value;
  const i = tl?.items[0];
  if (!i) return;
  const spec = zoomSpec(i);
  const factor = Math.log10(appState.msPerPx);
  display('factor', round(factor));
  display('', '');
  display('itemType', i.itemType);
  display('dateSpecification', i.dateSpecification);
  display('prominence', i.prominence);
  display('', '');
  display('size', round(spec.size));
  display('fade', round(spec.fade));
  display('displayLabel', spec.displayLabel);
  */

  const tl = timelineCache.values().next().value;  // the first timeline in the cache
  const i = tl?.items[0];
  if (!i) return;

  display('_dateTime', fmtDate(i._dateTime));
  display('_dateFrom', fmtDate(i._dateFrom));
  display('_dateTo', fmtDate(i._dateTo));
  display('', '');
  
  display('_tFrom', fmtDate(i._tFrom));
  display('_fLeft', fmtDate(i._fLeft));
  display('_fRight', fmtDate(i._fRight));
  display('_tTo', fmtDate(i._tTo));
  
  display('dateFrom', fmtDate(i.dateFrom?.ts));
  display('dateTo', fmtDate(i.dateTo?.ts));
  display('fadeLeft', fmtDate(i.fadeLeft?.ts));
  display('fadeRight', fmtDate(i.fadeRight?.ts));

  ctx.restore();
  
};
