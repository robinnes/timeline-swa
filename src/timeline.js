const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const sidebar = document.getElementById('sidebar');

const ZOOM_FACTOR = 1.1;
const PAN_FACTOR = 200;
const MIN_MS_PER_PX = 1000 * 60 * 5;        // 5 minutes per pixel (very zoomed in)
const MAX_MS_PER_PX = 1000 * 60 * 60 * 24 * 365 * 5; // ~5 years per pixel
const MS_PER_DAY = 86400000; // 1000*60*60*24
const EPOCH = Date.UTC(2000,0,1);
const MAX_CLICK_MOVE = 1;  // maximum mouse movement allowed for a mouse click

// --- Helper functions
const pxToTime = x => EPOCH + offsetMs + (x * msPerPx);
const timeToPx = t => (t - EPOCH - offsetMs + (1000 * 60 * 60 * 12)) / msPerPx;
const pxPerDay = x => (1 / (msPerPx / MS_PER_DAY));

// msPerPx controls zoom. offsetMs shifts timeline relative to EPOCH at x=0
let msPerPx = MS_PER_DAY * 1  // ~30 days per pixel (years visible at start)
let offsetMs = (Date.now() - EPOCH) - (window.innerWidth/0.5) * msPerPx; // center near "now"

const timelines = [];

// Retain mouse positions for non-event handler access
let mouseX = 0;
let mouseY = 0;

// Zoom & pan variables
let isPanning = false;
let ignoreClick = false;  // ignore click event if panning

// Momentum variables
let lastX = 0;
let vOffsetMs = 0
let lastDragSpeed = 0;
let lastTick = performance.now();

// Elements currently rendered on screen that can be interacted with  
const screenElements = [];
let highlightIdx = -1;  // index in screenElements array of the highlighed element
let highlightedEvent = null;  // event object if the highlighted element is an event (not a tick)
let selectedEvent = null;  // event selected (opened in the side panel)

// Keyboard navigation
let fixedPanMode = null;  // points to tickSpec to control navigation
const fixedPanZoomHist = [];  // a stack that provides "breadcrumb" for zooming out and back in
let zoomInProgress = null;  // automatic zoom/pan in progress

function tick(now) {
  requestAnimationFrame(tick);  // I'm assured that this doesn't cause stack growth

  const dt = (now - lastTick) / 1000;
  lastTick = now;

  if (isPanning || isTouchPanning) { lastDragSpeed = 0; return; }

  if (zoomInProgress) {
    // move pan and zoom towards target
    const dOffset = zoomInProgress.newOffset - offsetMs;
    const dMsPerPx = zoomInProgress.newMsPerPx - msPerPx;
    offsetMs += dOffset * dt * 10;
    msPerPx += dMsPerPx * dt * 10;
    msPerPx = Math.max(msPerPx, MIN_MS_PER_PX);
    // stop when movement is smaller than a pixel
    if (Math.abs(dOffset) < msPerPx || msPerPx === MIN_MS_PER_PX) zoomInProgress = null;
    draw(true);
    return;
  }
  
  // carry on momentum, if there is velocity
  if (vOffsetMs === 0) return;

  const drag = Math.exp(-4.0 * dt);  // apply drag
  vOffsetMs *= drag;
  offsetMs -= vOffsetMs * dt;

  if (Math.abs(vOffsetMs) < (1 * msPerPx)) vOffsetMs = 0;
  else draw(false);
};

function zoom(x, factor) {
  const tAtMouse = pxToTime(x);
  const newMsPerPx = msPerPx * factor;

  // clamp zoom between min and max thresholds
  msPerPx = Math.max(MIN_MS_PER_PX, Math.min(MAX_MS_PER_PX, newMsPerPx));

  // keep the date under the mouse fixed
  offsetMs = tAtMouse - EPOCH - x * msPerPx;

  draw(true);
};

function resize(){
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.floor(window.innerWidth);
  const h = Math.floor(window.innerHeight);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0); // draw in CSS pixels
  draw(true);
}
window.addEventListener('resize', resize);

canvas.addEventListener('pointerdown', (e)=>{
  if (e.pointerType !== 'mouse') return;

  e.preventDefault();  // prevent focus, text selection, etc (necessary?)
  canvas.setPointerCapture(e.pointerId);

  zoomInProgress = null;  // stop any zooming in progress

  //ignoreClick = false;
  isPanning = true;
  vOffsetMs = 0;
  lastX = e.clientX;
  ignoreClick = false;
});

canvas.addEventListener('pointermove', (e)=>{
  if (e.pointerType !== 'mouse') return;
  
  mouseX = e.clientX; mouseY = e.clientY;
  if (Math.abs(e.clientX - lastX) >= MAX_CLICK_MOVE) ignoreClick = true;

  if (isPanning) {
    fixedPanMode = null;

    // drag and momentum
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    offsetMs -= dx * msPerPx; // drag right -> move timeline left
    lastDragSpeed = dx * msPerPx;
    draw(false);
  } else {
    // check if mouse is over any interactive elements
    let found = -1;
    //for (let i=0; i<screenElements.length; i++) {
    for (let i=screenElements.length-1; i>0; i--) {  
      const se = screenElements[i];
      if (mouseX >= se.left && mouseX <= se.right && mouseY >= se.top && mouseY <= se.bottom) {
        found = i;  break; };
    }
    // if so, draw, which will reset screenElements and highlight the one under mouseX/mouseY
    if (found !== highlightIdx) draw(false);
  }

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

canvas.addEventListener('wheel', (e)=>{
  // gesturestart/gesturechange for touchscreens?
  e.preventDefault();
  zoomInProgress = null;  // stop any zooming in progress
  const direction = e.deltaY > 0 ? 1 : -1;
  const factor = Math.pow(ZOOM_FACTOR, direction);
  zoom(e.clientX, factor);
}, { passive:false });

/*
canvas.addEventListener('dblclick', (e)=>{
  const x = e.clientX;
  const factor =  Math.pow(ZOOM_FACTOR, -1);
  zoom(x, factor)
});
*/

canvas.addEventListener('keydown', function (e) {
  
  zoomInProgress = null; // stop any zooming in progress
  const midX = window.innerWidth / 2;
  const midT = pxToTime(midX);

  if (fixedPanMode)  // navigate by whole units of time (month, year, etc.)
  {
    if (e.key === 'ArrowUp') {
      // allow user to zoom out and immediately back in to the same spot
      let t = midT;
      if (fixedPanZoomHist.length > 0) {
        t = fixedPanZoomHist[fixedPanZoomHist.length-1];
        fixedPanZoomHist.length--;
      }
      fixedPanMode = tickSpec.get(fixedPanMode.zoomIn);  // zoom in one level
      zoomToTick(fixedPanMode.start(t));
    }
    else if (e.key === 'ArrowDown') {
      fixedPanZoomHist.push(midT);
      fixedPanMode = tickSpec.get(fixedPanMode.zoomOut);  // zoom out one level
      zoomToTick(fixedPanMode.start(midT));
    }
    else if (e.key === 'ArrowRight') {
      fixedPanZoomHist.length = 0;
      zoomToTick(fixedPanMode.step(fixedPanMode.start(midT),1));
    }
    else if (e.key === 'ArrowLeft') {
      fixedPanZoomHist.length = 0;
      zoomToTick(fixedPanMode.step(fixedPanMode.start(midT),-1));
    }
    
  } else {  // zoom/pan by increments
    if (e.key === 'ArrowUp') zoom(midX, Math.pow(ZOOM_FACTOR, -1))
    else if (e.key === 'ArrowDown') zoom(midX, Math.pow(ZOOM_FACTOR, 1))
    else if (e.key === 'ArrowRight') vOffsetMs -= PAN_FACTOR * msPerPx
    else if (e.key === 'ArrowLeft') vOffsetMs += PAN_FACTOR * msPerPx;
  }
});

function zoomToTick(t) {
  // determine where to zoom/pan
  const w = window.innerWidth;
  const tNext = fixedPanMode.step(t, 1);
  const width = tNext - t;
  const newOffsetMs = (t - (width / 10)) - EPOCH;  // just to the left of clicked label
  const newMsPerPx = width / (w / 1.2);  // fit ~80% of next interval in window

  // set in motion; picked up in tick()
  zoomInProgress = {origOffset: offsetMs, newOffset:newOffsetMs, origMsPerPx:msPerPx, newMsPerPx:newMsPerPx };
}

function centerOnTimeline(t) {
  // adjust offsetMs and msPerPx to fit timeline t
  const w = window.innerWidth;
  const tFrom = Date.parse(t.dateFrom);
  const tTo = Date.parse(t.dateTo);
  const width = tTo - tFrom;

  offsetMs = (tFrom - (width / 10)) - EPOCH;
  msPerPx = width / (w / 1.2);
}

canvas.addEventListener('click', function (e) {
  
  if (ignoreClick) return;
  //console.log("clickX:", clickX);

  if (highlightIdx >= 0) {
    const elem = screenElements[highlightIdx];

    if (elem.type === 'tick') {
      // enter 'fixed pan mode' where each arrow key press moves a year/month/etc.
      fixedPanZoomHist.length = 0;
      const m = (elem.mode === 'day') ? 'week' : elem.mode;  // hack: not going to drill to day
      fixedPanMode = tickSpec.get(m);
      zoomToTick(elem.t);

      // if clicked on the highlighted bubble/line/label then open it in the side panel
    } else if (elem.type === 'line' || elem.type === 'bubble' || elem.type === 'label') {
      selectedEvent = highlightedEvent;
      openEvent(selectedEvent);

      /*
      setSidebarData({
        label: 'Road Trip: Alaska to Seattle',
        date: { from: 'July 1, 1995', to: 'August 8, 1995' },
        significance: 3,
        detailsHTML: `
          <p>Summer drive from Alaska down the Pacific Northwest with stops along the coast and visits with friends.</p>
          <h3>Notes</h3>
          <ul>
            <li>Highlights included views of volcanoes from Kenai and a long ferry segment.</li>
            <li>Planned around music and photo stops for the personal archive.</li>
          </ul>
        `
      });
      */

      if (!sidebar.classList.contains('open')) openPanel();
    }
  } else {
    // clicked in open space; if side panel is open then close it
    if (sidebar.classList.contains('open')) {
      selectedEvent = null;
      closePanel();
      draw(false);
    }
  }
});

if (!CanvasRenderingContext2D.prototype.roundRect) {
  // Polyfill roundRect if needed
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

function draw(repositionLabels){
  if (repositionLabels) positionLabels();

  ctx.clearRect(0,0, window.innerWidth, window.innerHeight);
  screenElements.length = 0;  // reset list of screen elements
  highlightIdx = -1;
  drawTicks();
  drawEvents();
/*
  const factor = Math.log10(msPerPx);
  const spec = getTickSpec();
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  ctx.fillStyle = 'rgba(9, 247, 49, 0.5)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  if (highlightedEvent) {
    const t = highlightedEvent.label;
    ctx.fillText(t, window.innerWidth - 30, window.innerHeight - 95);
  }

  ctx.fillText("mode:", window.innerWidth - 111, window.innerHeight - 75);
  ctx.fillText(spec.mode, window.innerWidth - 30, window.innerHeight - 75);
  ctx.fillText(`fade(${sig}):`, window.innerWidth - 111, window.innerHeight - 55);
  ctx.fillText(Math.round((spec.fade)*1000)/1000, window.innerWidth - 30, window.innerHeight - 55);
  ctx.fillText(`size(${sig}):`, window.innerWidth - 111, window.innerHeight - 35);
  ctx.fillText(Math.round((spec.size)*1000)/1000, window.innerWidth - 30, window.innerHeight - 35);
*/
}

// Kick things off
initializeEvents();
centerOnTimeline(timeline);
resize();
requestAnimationFrame(tick);
canvas.focus();