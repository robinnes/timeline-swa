import * as Util from './util.js';
import {appState, draw, getCanvasViewport} from './canvas.js';
import {TIME, DRAW} from './constants.js';
export const canvas = document.getElementById('canvas');

const active = new Map(); // pointerId -> touch state

export let isTouchPanning = false;

let pinching = false;
let pinchStartDist = 0;
let pinchStartMsPerPx = 0;
let pinchMidX = 0;
let pinchMidT = 0;
let pinchEverOccurred = false;

// tap / double-tap
const TAP_MAX_MS = 250;
const TAP_MAX_MOVE = 10;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DIST = 24;
const DOUBLE_TAP_ZOOM_FACTOR = 0.5; // zoom in by 2x

let pendingTapTimer = null;
let lastTap = null;

/* ------------------- Helpers -------------------- */

function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

function midpoint(p1, p2) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
}

function clampMsPerPx(v) {
  return Math.max(TIME.MIN_MS_PER_PX, Math.min(TIME.MAX_MS_PER_PX, v));
}

function setMousePosition(x, y) {
  appState.mouseX = x;
  appState.mouseY = y;
}

/* ------------------- Tap -------------------- */

function queueSyntheticClick(x, y) {
  if (pendingTapTimer) clearTimeout(pendingTapTimer);

  pendingTapTimer = window.setTimeout(() => {
    setMousePosition(x, y);
    draw(false); // update highlight under the tap point first
setMousePosition(0, 0);
    canvas.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y
    }));

    pendingTapTimer = null;
    lastTap = { x, y, t: performance.now() };
  }, DOUBLE_TAP_MS);
}

function cancelQueuedTap() {
  if (pendingTapTimer) {
    clearTimeout(pendingTapTimer);
    pendingTapTimer = null;
  }
}

function qualifiesAsTap(p) {
  const dt = performance.now() - p.downTime;
  const move = Math.hypot(p.x - p.startX, p.y - p.startY);
  return dt <= TAP_MAX_MS && move <= TAP_MAX_MOVE && !pinchEverOccurred;
}

/* ------------------- Pinch zoom -------------------- */

function beginPinch() {
  const pts = [...active.values()];
  if (pts.length < 2) return;

  const [p1, p2] = pts;
  pinching = true;
  pinchEverOccurred = true;
  isTouchPanning = false;

  pinchStartDist = distance(p1, p2);
  pinchStartMsPerPx = appState.msPerPx;

  const mid = midpoint(p1, p2);
  pinchMidX = mid.x;
  pinchMidT = Util.pxToTime(pinchMidX);
}

function updatePinch() {
  const pts = [...active.values()];
  if (pts.length < 2 || !pinching) return;

  const [p1, p2] = pts;
  const dist = distance(p1, p2);
  if (pinchStartDist <= 0 || dist <= 0) return;

  const scale = pinchStartDist / dist; // fingers apart => dist bigger => zoom in
  const vp = getCanvasViewport();

  appState.msPerPx = clampMsPerPx(pinchStartMsPerPx * scale);
  appState.offsetMs = pinchMidT - TIME.EPOCH - ((pinchMidX - vp.left) * appState.msPerPx);

  draw(true);
}


/* ------------------- Pan -------------------- */

function beginPan(pointer) {
  isTouchPanning = true;
  appState.pan.isPanning = false; // mouse-only flag
  appState.momentum.vOffsetMs = 0;
  appState.momentum.lastDragSpeed = 0;
  appState.momentum.lastX = pointer.x;
}

function updatePan(pointer) {
  const dx = pointer.x - pointer.prevX;
  if (dx === 0) return;

  appState.offsetMs -= dx * appState.msPerPx;
  appState.momentum.lastDragSpeed = dx * appState.msPerPx;
  draw(false);
}

function finishPanMomentum() {
  const now = performance.now();
  const dt = Math.max(16.7, now - (appState.momentum.lastTick || now)) / 1000;
  appState.momentum.vOffsetMs = (appState.momentum.lastDragSpeed || 0) / dt;
  appState.momentum.lastDragSpeed = 0;
}


/* ------------------- Touch handlers -------------------- */

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;

  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);

  const p = {
    id: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    prevX: e.clientX,
    prevY: e.clientY,
    x: e.clientX,
    y: e.clientY,
    downTime: performance.now()
  };

  active.set(e.pointerId, p);
  setMousePosition(e.clientX, e.clientY);

  if (active.size === 1) {
    pinchEverOccurred = false;
    beginPan(p);
  } else if (active.size === 2) {
    cancelQueuedTap();
    beginPinch();
  }
}, { passive: false });

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'touch') return;
  if (!active.has(e.pointerId)) return;

  e.preventDefault();

  const p = active.get(e.pointerId);
  p.prevX = p.x;
  p.prevY = p.y;
  p.x = e.clientX;
  p.y = e.clientY;

  setMousePosition(e.clientX, e.clientY);

  if (active.size >= 2) {
    updatePinch();
    return;
  }

  if (active.size === 1 && !pinching) {
    const moveFromStart = Math.hypot(p.x - p.startX, p.y - p.startY);
    if (moveFromStart > TAP_MAX_MOVE) {
      isTouchPanning = true;
    }

    if (isTouchPanning) {
      updatePan(p);
    }
  }
}, { passive: false });

function endPointer(e) {
  if (e.pointerType !== 'touch') return;
  if (!active.has(e.pointerId)) return;

  e.preventDefault();

  const p = active.get(e.pointerId);
  const wasTap = qualifiesAsTap(p);

  active.delete(e.pointerId);

  if (pinching && active.size < 2) {
    pinching = false;
    pinchStartDist = 0;
  }

  if (active.size === 1) {
    // continue panning with the remaining finger after pinch ends
    const survivor = [...active.values()][0];
    survivor.startX = survivor.x;
    survivor.startY = survivor.y;
    survivor.prevX = survivor.x;
    survivor.prevY = survivor.y;
    beginPan(survivor);
  } else if (active.size === 0) {
    if (isTouchPanning && !wasTap) {
      finishPanMomentum();
    }
    isTouchPanning = false;
  }

  if (wasTap) {
    const x = p.x;
    const y = p.y;

//    if (isDoubleTapCandidate(x, y)) {
//      doDoubleTapZoom(x, y);
//    } else {
      queueSyntheticClick(x, y);
//    }
  }
}

canvas.addEventListener('pointerup', endPointer, { passive: false });
canvas.addEventListener('pointercancel', endPointer, { passive: false });
canvas.addEventListener('pointerleave', (e) => {
  if (active.has(e.pointerId)) endPointer(e);
}, { passive: false });


/* ------------------- Double-tap zoom -------------------- */

function isDoubleTapCandidate(x, y) {
  if (!lastTap) return false;
  const dt = performance.now() - lastTap.t;
  const d = Math.hypot(x - lastTap.x, y - lastTap.y);
  return dt <= DOUBLE_TAP_MS && d <= DOUBLE_TAP_DIST;
}

function doDoubleTapZoom(x, y) {
  cancelQueuedTap();
  setMousePosition(x, y);
  zoomAtX(x, DOUBLE_TAP_ZOOM_FACTOR);
  lastTap = null;
}

function zoomAtX(x, factor) {
  const vp = getCanvasViewport();
  const tAtX = Util.pxToTime(x);
  const newMsPerPx = clampMsPerPx(appState.msPerPx * factor);

  appState.msPerPx = newMsPerPx;
  appState.offsetMs = tAtX - TIME.EPOCH - ((x - vp.left) * appState.msPerPx);

  draw(true);
}


/* ------------------- Debug -------------------- */

export function debugMobile() {
  const ctx = canvas.getContext('2d');
  const leftLabel = window.innerWidth - 250;
  const leftValue = window.innerWidth - 100;
  let top = window.innerHeight - 115;
/*
  ctx.save();
  ctx.font = DRAW.LABEL_FONT;
  ctx.fillStyle = 'rgba(9, 247, 49, 0.5)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillText('isTouchPanning:', leftLabel, top);
  ctx.fillText(String(isTouchPanning), leftValue, top);
  top += 20;

  ctx.fillText('pinching:', leftLabel, top);
  ctx.fillText(String(pinching), leftValue, top);
  top += 20;

  ctx.fillText('active.size:', leftLabel, top);
  ctx.fillText(String(active.size), leftValue, top);
  top += 20;

  ctx.fillText('pendingTap:', leftLabel, top);
  ctx.fillText(String(!!pendingTapTimer), leftValue, top);

  ctx.restore();
*/
}