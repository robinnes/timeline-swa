const active = new Map(); // pointerId -> {x,y}
let isTouchPanning = false;
let lastTouchX = 0;

// Pinch state
let pinching = false;
let pinchStartDist = 0;
let pinchStartMsPerPx = 0;
let pinchMidX = 0;
let pinchMidT = 0;

function distance(p1, p2){
  const dx = p1.x - p2.x, dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}
function midpoint(p1, p2){
  return { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
}

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
    pinchStartMsPerPx = msPerPx;

    const mid = midpoint(p1, p2);
    pinchMidX = mid.x;
    pinchMidT = pxToTime(pinchMidX);
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
      msPerPx = Math.max(MIN_MS_PER_PX, Math.min(MAX_MS_PER_PX, pinchStartMsPerPx * scale));
      offsetMs = pinchMidT - EPOCH - pinchMidX * msPerPx;
      updatePositions();
      draw();
    }
  } else if (isTouchPanning && active.size === 1) {
    const only = [...active.values()][0];
    const dx = only.x - lastTouchX;
    lastTouchX = only.x;
    offsetMs -= dx * msPerPx;
    lastDragSpeed = dx * msPerPx;  // for momentum
    updatePositions();
    draw();
  }
}, { passive:false });

function endPointer(e){
  if (active.has(e.pointerId)) active.delete(e.pointerId);
  if (active.size < 2) {
    pinching = false;
    pinchStartDist = 0;
  }
  if (active.size === 0) {
    isTouchPanning = false;
    // Convert last drag frame delta into per-second velocity estimate using last frame dt
    const now = performance.now();
    const dt = Math.max(16.7, now - (lastTick || now)) / 1000; // ~1 frame if unknown
    vOffsetMs = (lastDragSpeed || 0) / dt;
    lastDragSpeed = 0
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