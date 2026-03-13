import * as Util from './util.js';
import {TIME, DRAW, TOUCH} from './constants.js';
import {appState, draw, getCanvasViewport, throwCanvas, identifyHoverElement, screenElements, recordMomentumTick} from './canvas.js';
import {startDragging, drag, stopDragging} from './dragging.js';

const canvas = document.getElementById('canvas');
const active = new Map(); // pointerId -> touch state
let debugText = "";

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
  setMousePosition(x, y);
  draw(false); // update highlight under the tap point first
  canvas.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y
  }));
}

function qualifiesAsTap(p) {
  const dt = performance.now() - p.downTime;
  const move = Math.hypot(p.x - p.startX, p.y - p.startY);
  return dt <= TOUCH.TAP_MAX_MS && move <= TOUCH.TAP_MAX_MOVE && !appState.touch.pinchEverOccurred;
}

/* ------------------- Pinch zoom -------------------- */

function beginPinch() {
  const t = appState.touch;
  const pts = [...active.values()];
  if (pts.length < 2) return;

  const [p1, p2] = pts;
  t.pinching = true;
  t.pinchEverOccurred = true;
  t.isTouchPanning = false;

  t.pinchStartDist = distance(p1, p2);
  t.pinchStartMsPerPx = appState.msPerPx;

  const mid = midpoint(p1, p2);
  t.pinchMidX = mid.x;
  t.pinchMidT = Util.pxToTime(t.pinchMidX);
}

function updatePinch() {
  const t = appState.touch;
  const pts = [...active.values()];
  if (pts.length < 2 || !t.pinching) return;

  const [p1, p2] = pts;
  const dist = distance(p1, p2);
  if (t.pinchStartDist <= 0 || dist <= 0) return;

  const scale = t.pinchStartDist / dist; // fingers apart => dist bigger => zoom in
  const vp = getCanvasViewport();

  appState.msPerPx = clampMsPerPx(t.pinchStartMsPerPx * scale);
  appState.offsetMs = t.pinchMidT - TIME.EPOCH - ((t.pinchMidX - vp.left) * appState.msPerPx);

  draw(true);
}


/* ------------------- Pan -------------------- */

function beginPan(pointer) {
  appState.touch.isTouchPanning = true;
  appState.pan.isPanning = false; // mouse-only flag
  appState.momentum.vOffsetMs = 0;
  appState.momentum.lastDragSpeed = 0;
  appState.momentum.lastX = pointer.x;
}

function updatePan(pointer) {
  const dx = pointer.x - pointer.prevX;
  recordMomentumTick(dx);
  if (dx === 0) return;

  appState.offsetMs -= dx * appState.msPerPx;
  appState.momentum.lastDragSpeed = dx * appState.msPerPx;
  draw(false);
}


/* ------------------- Touch handlers -------------------- */

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' && !TOUCH.SIMULATE_MODE) return;  // leave to canvas.js (unless simulating touch)
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
    appState.touch.pinchEverOccurred = false;
    identifyHoverElement();
    if (screenElements[appState.highlighted.idx]?.type === 'handle') {
      startDragging();
    } else {
      beginPan(p);
    }
  } else if (active.size === 2) {
    beginPinch();
  }
}, { passive: false });

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'touch' && !TOUCH.SIMULATE_MODE) return;  // leave to canvas.js (unless simulating touch)
  if (!active.has(e.pointerId)) return;
  const t = appState.touch;
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

  if (active.size === 1 && !t.pinching) {

    if (appState.drag.isDragging) {
      drag(e);
      return;
    }

    const moveFromStart = Math.hypot(p.x - p.startX, p.y - p.startY);
    if (moveFromStart > TOUCH.TAP_MAX_MOVE) {
      t.isTouchPanning = true;
    }

    if (t.isTouchPanning) {
      updatePan(p);
    }
  }
}, { passive: false });

function endPointer(e) {
  if (e.pointerType !== 'touch' && !TOUCH.SIMULATE_MODE) return;  // leave to canvas.js (unless simulating touch)
  if (!active.has(e.pointerId)) return;
  const t = appState.touch;
  e.preventDefault();

  const p = active.get(e.pointerId);
  const wasTap = qualifiesAsTap(p);

  active.delete(e.pointerId);

  if (t.pinching && active.size < 2) {
    t.pinching = false;
    t.pinchStartDist = 0;
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

    if (appState.drag.isDragging) {
      stopDragging(false);
      return;
    }

    if (t.isTouchPanning && !wasTap) {
      throwCanvas();
    }
    t.isTouchPanning = false;
  }

  if (wasTap) {
    const x = p.x;
    const y = p.y;
    queueSyntheticClick(x, y);
  }
}

canvas.addEventListener('pointerup', endPointer, { passive: false });
canvas.addEventListener('pointercancel', endPointer, { passive: false });
canvas.addEventListener('pointerleave', (e) => {
  if (active.has(e.pointerId)) endPointer(e);
}, { passive: false });


/* ------------------- Debug -------------------- */

export function debugAppendText(text) {
  debugText += text;
}

export function debugDisplay() {
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.font = DRAW.LABEL_FONT;
  ctx.fillStyle = 'rgba(9, 247, 49, 0.5)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const left = 40;
  ctx.fillText(debugText, left, window.innerHeight - 40);

  ctx.restore();
}