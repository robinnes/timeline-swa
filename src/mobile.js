import * as Util from './util.js';
import {appState, draw, getCanvasViewport} from './canvas.js';
import { TIME, DRAW } from './constants.js';

const active = new Map(); // pointerId -> {x,y}
export let isTouchPanning = false;
let lastTouchX = 0;

// Pinch state
let pinching = false;
let pinchStartDist = 0;
let pinchStartMsPerPx = 0;
let pinchMidX = 0;
let pinchMidT = 0;

/* ------------------- Utility functions -------------------- */

function distance(p1, p2){
  const dx = p1.x - p2.x, dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}
function midpoint(p1, p2){
  return { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
}


/* ------------------- Touch navigation: drag and pinch -------------------- */

canvas.addEventListener('pointerdown', (e)=>{
  if (e.pointerType !== 'touch') return;
  canvas.setPointerCapture(e.pointerId);
  active.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (active.size === 1) {
    const only = active.get(e.pointerId);
    isTouchPanning = true;
    lastTouchX = only.x;
  } else if (active.size === 2) {
    const [p1, p2] = [...active.values()];
    pinching = true;
    isTouchPanning = false;

    pinchStartDist = distance(p1, p2);
    pinchStartMsPerPx = appState.msPerPx;

    const mid = midpoint(p1, p2);
    pinchMidX = mid.x;
    pinchMidT = Util.pxToTime(pinchMidX);
  }
}, { passive:true });


canvas.addEventListener('pointermove', (e)=>{
  if (e.pointerType !== 'touch') return;
  if (active.has(e.pointerId)) e.preventDefault();

  if (!active.has(e.pointerId)) return;
  active.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pinching && active.size >= 2) {
    const [p1, p2] = [...active.values()];
    const dist = distance(p1, p2);
    if (pinchStartDist > 0 && dist > 0) {
      const scale = pinchStartDist / dist; // >1 when pinching out
      const vp = getCanvasViewport();
      appState.msPerPx = Math.max(TIME.MIN_MS_PER_PX, Math.min(TIME.MAX_MS_PER_PX, pinchStartMsPerPx * scale));
      appState.offsetMs = pinchMidT - TIME.EPOCH - ((pinchMidX - vp.left) * appState.msPerPx);
      draw(true);
    }
  } else if (isTouchPanning && active.size === 1) {
    const only = [...active.values()][0];
    const dx = only.x - lastTouchX;
    lastTouchX = only.x;
    appState.offsetMs -= dx * appState.msPerPx;
    appState.momentum.lastDragSpeed = dx * appState.msPerPx;  // for momentum
    draw(false);
  }
}, { passive:false });


function endPointer(e){
  if (e.pointerType !== 'touch') return;
  if (active.has(e.pointerId)) active.delete(e.pointerId);
  if (active.size < 2) {
    pinching = false;
    pinchStartDist = 0;
  }
  if (active.size === 0) {
    isTouchPanning = false;
    // Convert last drag frame delta into per-second velocity estimate using last frame dt
    const now = performance.now();
    const dt = Math.max(16.7, now - (appState.momentum.lastTick || now)) / 1000; // ~1 frame if unknown
    appState.momentum.vOffsetMs = (appState.momentum.lastDragSpeed || 0) / dt;
    appState.momentum.lastDragSpeed = 0
  } else if (active.size === 1) {
    const only = [...active.values()][0];
    isTouchPanning = true;
    lastTouchX = only.x;
  }
}

canvas.addEventListener('pointerup', endPointer, { passive:true });
canvas.addEventListener('pointercancel', endPointer, { passive:true });
canvas.addEventListener('pointerleave', (e)=>{
  if (active.has(e.pointerId)) endPointer(e);
}, { passive:true });


/* Optional: double-tap to center on today (mobile)
let lastTapTime = 0;
canvas.addEventListener('pointerdown', (e)=>{
  if (e.pointerType !== 'touch') return;
  const now = performance.now();
  if (now - lastTapTime < 300 && active.size <= 1) {
    offsetMs = (Date.now() - EPOCH) - (window.innerWidth/2) * msPerPx;
    draw();
  }
  lastTapTime = now;
}, { capture: true });
*/


/* ------------------- Debug -------------------- */

export function debugMobile() {
  //if (!appState.selected.event) return;
  
  const ctx = canvas.getContext('2d');
  //const sig = appState.selected.event.significance;
  //const spec = zoomSpec(sig);
  const leftLabel = window.innerWidth - 250;
  const leftValue = window.innerWidth - 100;
  let top = window.innerHeight - 95;

  ctx.save();
  ctx.font = DRAW.LABEL_FONT;
  ctx.fillStyle = 'rgba(9, 247, 49, 0.5)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  //if (highlightedEvent) {
  //  const t = highlightedEvent.label;
  //  ctx.fillText(t, window.innerWidth - 30, window.innerHeight - 95);
  //}
  /*
  ctx.fillText("factor:", leftLabel, top);
  ctx.fillText(Math.round(spec.factor*1000)/1000, leftValue, top);
  top += 20;
  ctx.fillText(`fade(${sig}):`, leftLabel, top);
  ctx.fillText(Math.round((spec.fade)*1000)/1000, leftValue, top);
  top += 20;
  ctx.fillText(`size(${sig}):`, leftLabel, top);
  ctx.fillText(Math.round((spec.size)*1000)/1000, leftValue, top);
  */
  ctx.fillText("isTouchPanning:", leftLabel, top);
  ctx.fillText(isTouchPanning, leftValue, top);
  top += 20;
  ctx.fillText("pinching:", leftLabel, top);
  ctx.fillText(pinching, leftValue, top);
  top += 20;
  ctx.fillText("active.size:", leftLabel, top);
  ctx.fillText(active.size, leftValue, top);
  top += 20;

  ctx.restore();
  
};

