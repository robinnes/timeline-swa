const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const ZOOM_FACTOR = 1.1;
const MIN_MS_PER_PX = 1000 * 60 * 5;        // 5 minutes per pixel (very zoomed in)
const MAX_MS_PER_PX = 1000 * 60 * 60 * 24 * 365 * 5; // ~5 years per pixel

// --- Timeline state
//const midY = () => Math.floor(window.innerHeight / 2);

// Reference epoch used for math (Jan 1, 2000 UTC)
const EPOCH = Date.UTC(2000,0,1);

// msPerPx controls zoom. offsetMs shifts timeline relative to EPOCH at x=0
let msPerPx = MS_PER_DAY * 30  // ~30 days per pixel (years visible at start)
let offsetMs = (Date.now() - EPOCH) - (window.innerWidth/1.2) * msPerPx; // center near "now"
const pxPerDay = x => (1 / (msPerPx / MS_PER_DAY));

// --- Helpers
const pxToTime = x => EPOCH + offsetMs + x * msPerPx;
const timeToPx = t => (t - EPOCH - offsetMs + (1000 * 60 * 60 * 12)) / msPerPx;

// Zoom & pan variables
let isPanning = false, lastX = 0, vOffsetMs = 0, lastDragSpeed = 0, lastTick = performance.now();

function tick(now) {
  requestAnimationFrame(tick);  // I'm assured that this doesn't cause stack growth
  
  const dt = (now - lastTick) / 1000;
  lastTick = now;

  if (isPanning) { lastDragSpeed = 0; return; }

  const drag = Math.exp(-4.0 * dt);
  vOffsetMs *= drag;
  offsetMs -= vOffsetMs * dt; // apply velocity

  if (Math.abs(vOffsetMs) < (1 * msPerPx)) vOffsetMs = 0;
  else draw();
};

function zoom(mouseX, factor) {
  const tAtMouse = pxToTime(mouseX);
  const newMsPerPx = msPerPx * factor;

  // clamp zoom between min and max thresholds
  msPerPx = Math.max(MIN_MS_PER_PX, Math.min(MAX_MS_PER_PX, newMsPerPx));

  // keep the date under the mouse fixed
  offsetMs = tAtMouse - EPOCH - mouseX * msPerPx;

  updatePositions();
  draw();
};

// --- HiDPI canvas resize
function resize(){
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.floor(window.innerWidth);
  const h = Math.floor(window.innerHeight);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0); // draw in CSS pixels
  updatePositions();
  draw();
}
window.addEventListener('resize', resize);

canvas.addEventListener('pointerdown', (e)=>{
  if (e.pointerType !== 'mouse') return;

  e.preventDefault();  // prevent focus, text selection, etc (necessary?)
  canvas.setPointerCapture(e.pointerId);

  isPanning = true;
  vOffsetMs = 0;
  lastX = e.clientX;
});

canvas.addEventListener('pointermove', (e)=>{
  if (e.pointerType !== 'mouse') return;
  if (!isPanning) return;
  const dx = e.clientX - lastX;
  lastX = e.clientX;
  offsetMs -= dx * msPerPx; // drag right -> move timeline left
  lastDragSpeed = dx * msPerPx;
  draw();
}, { passive:false });

window.addEventListener('pointerup', (e)=>{
  if (e.pointerType !== 'mouse') return;
  if(!isPanning) return;
  isPanning = false;
  // Convert last drag frame delta into per-second velocity estimate using last frame dt
  const now = performance.now();
  const dt = Math.max(16.7, now - (lastTick || now)) / 1000; // ~1 frame if unknown
  vOffsetMs = (lastDragSpeed || 0) / dt;
  lastDragSpeed = 0
});

// Wheel to zoom (Ctrl/Trackpad friendly) - gesturestart/gesturechange?
canvas.addEventListener('wheel', (e)=>{
  e.preventDefault();
  const direction = e.deltaY > 0 ? 1 : -1;
  const factor = Math.pow(ZOOM_FACTOR, direction);
  zoom(e.clientX, factor);
}, { passive:false });

/*
canvas.addEventListener('dblclick', (e)=>{
  const mouseX = e.clientX;
  const factor =  Math.pow(ZOOM_FACTOR, -1);
  zoom(mouseX, factor)
});
*/

canvas.addEventListener('keydown', function (e) {
  const mouseX = window.innerWidth / 2;
  if (e.key === 'ArrowUp') zoom(mouseX, Math.pow(ZOOM_FACTOR, -1));
  else if (e.key === 'ArrowDown') zoom(mouseX, Math.pow(ZOOM_FACTOR, 1));
  else if (e.key === 'ArrowRight') vOffsetMs -= 200 * msPerPx;
  else if (e.key === 'ArrowLeft') vOffsetMs += 200 * msPerPx;
});

// Polyfill roundRect if needed
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = {tl:r, tr:r, br:r, bl:r};
    else r = Object.assign({tl:0,tr:0,br:0,bl:0}, r);
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
    return this;
  };
}

initializeEvents();

// Kick things off
resize();
requestAnimationFrame(tick);
canvas.focus();