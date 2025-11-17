import * as Util from './util.js';
import {TIME} from './constants.js';
import {drawTicks, tickSpec} from './ticks.js';
import {positionTimelines, positionLabels, drawEvents, isMouseOver} from './render.js';
import {getTimeline} from './database.js';
import {openEventForView, openEventForEdit, openTimelineForView, openTimelineForEdit, closeSidebar, updateSaveButton} from './panel.js';
import {initializeEvent} from './timeline.js';
import {startDragging, stopDragging, drag} from './dragging.js';
import {isTouchPanning} from './mobile.js';

export const canvas = document.getElementById('canvas');
export const ctx = canvas.getContext('2d');

export const appState = {
  msPerPx: TIME.MS_PER_DAY * 30,  // controls zoom; shifts timeline relative to EPOCH at x=0
  offsetMs: (Date.now() - TIME.EPOCH) - (window.innerWidth * 0.9) * TIME.MS_PER_DAY * 30,  // date at left of the window; center near "now",
  mouseX: 0, mouseY:0,  // to access mouse location outside of event handlers
  highlighted: {
    idx: -1,  // index in screenElements of currently highlighted item
    event: null,
    timeline: null
  },
  selected: {
    event: null,
    timeline: null
  },
  editingTimeline: null,
  drag: {  // dragging handles to change event dates
    isDragging: false,
    attribute: null,
    start: {date: null, dateFrom: null, dateTo: null, fadeLeft: null, fadeRight: null, dirty: null}
  },
  pan: {  // using mouse to pan to the left and right
    isPanning: false,
    ignoreClick: false
  },
  fixedPanMode: null,  // points to tickSpec to control keyboard navigation
  momentum: {  // brief moment of continued panning after mouse up to simulate a momentum effect
    lastX: 0,
    vOffsetMs: 0,
    lastDragSpeed: 0,
    lastTick: performance.now()
  },
  zoom: {  // automatic zoom/pan to a location
    isZooming: false,
    origOffset: null,
    origMsPerPx: null,
    newOffset: null,
    newMsPerPx: null
  }
}

export const timelines = [];
export const screenElements = [];  // Elements currently rendered on screen that can be interacted with  

export function tick(now) {
  requestAnimationFrame(tick);  // I'm assured that this doesn't cause stack growth

  const dt = (now - appState.momentum.lastTick) / 1000;
  appState.momentum.lastTick = now;

  if (appState.pan.isPanning || isTouchPanning) { appState.momentum.lastDragSpeed = 0; return; }

  if (appState.zoom.isZooming) {
    zoom(dt); 
    return;
  }
  
  // carry on momentum, if there is velocity
  if (appState.momentum.vOffsetMs === 0) return;

  const drag = Math.exp(-4.0 * dt);  // apply drag
  appState.momentum.vOffsetMs *= drag;
  appState.offsetMs -= appState.momentum.vOffsetMs * dt;

  if (Math.abs(appState.momentum.vOffsetMs) < (1 * appState.msPerPx)) appState.momentum.vOffsetMs = 0;
  else draw(false);
};

function zoom(dt) {
  // incrementally move window offset and zoom toward new values
  const dOffset = appState.zoom.newOffset - appState.offsetMs;
  const dMsPerPx = appState.zoom.newMsPerPx - appState.msPerPx;

  appState.offsetMs += dOffset * dt * TIME.ZOOM_SPEED;
  appState.msPerPx += dMsPerPx * dt * TIME.ZOOM_SPEED;
  appState.msPerPx = Math.max(appState.msPerPx, TIME.MIN_MS_PER_PX);

  // if timelines are repositioned, move those, too
  for (const tl of timelines) {
    if (tl.newYPos) {
      const dCeiling = tl.newCeiling - tl.ceiling;
      const dYPos = tl.newYPos - tl.yPos;
      tl.ceiling += dCeiling * dt * TIME.ZOOM_SPEED;
      tl.yPos += dYPos * dt * TIME.ZOOM_SPEED;
    }
  }

  // stop when movement is smaller than a pixel
  if (Math.abs(dOffset) < appState.msPerPx || appState.msPerPx === TIME.MIN_MS_PER_PX) {
    appState.zoom.isZooming = false;
    // reset zoom variables for the timelines
    for (const tl of timelines) {
      if (tl.newYPos) {
        tl.ceiling = tl.newCeiling; tl.yPos = tl.newYPos;
        tl.newCeiling = null; tl.newYPos = null;
      }
    }
  }
  draw(true);
}

function mouseZoom(x, factor) {
  const tAtMouse = Util.pxToTime(x);
  const newMsPerPx = appState.msPerPx * factor;

  // clamp zoom between min and max thresholds
  appState.msPerPx = Math.max(TIME.MIN_MS_PER_PX, Math.min(TIME.MAX_MS_PER_PX, newMsPerPx));

  // keep the date under the mouse fixed
  appState.offsetMs = tAtMouse - TIME.EPOCH - x * appState.msPerPx;

  draw(true);
};

export function resize(){
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

export function setPointerCursor() {
  // change pointer is appropriate
  const idx = appState.highlighted.idx;
  if (appState.drag.isDragging) canvas.style.cursor = 'ew-resize'
  else if (idx === -1) canvas.style.cursor = 'default'
  else if (screenElements[idx].type === 'button') canvas.style.cursor = 'pointer'
  else if (screenElements[idx].type === 'handle') canvas.style.cursor = 'ew-resize'
  else canvas.style.cursor = 'default';
}

canvas.addEventListener('pointerdown', (e)=>{
  if (e.pointerType !== 'mouse') return;
  e.preventDefault();  // prevent focus, text selection, etc (necessary?)
  canvas.setPointerCapture(e.pointerId);

  appState.zoom.isZooming = false;  // stop any zooming in progress
    
  if (appState.highlighted.idx !== -1 && screenElements[appState.highlighted.idx].type === 'handle') {
      startDragging();
      return;

  } else {
    // start panning
    appState.pan.isPanning = true;
    appState.momentum.vOffsetMs = 0;
    appState.momentum.lastX = e.clientX;
    appState.pan.ignoreClick = false;
    return;
  }
});

canvas.addEventListener('pointermove', (e)=>{
  if (e.pointerType !== 'mouse') return;
  
  appState.mouseX = e.clientX;
  appState.mouseY = e.clientY;
  if (Math.abs(e.clientX - appState.momentum.lastX) >= TIME.MAX_CLICK_MOVE) appState.pan.ignoreClick = true;

  if (appState.pan.isPanning) {
    appState.fixedPanMode = null;

    // drag and momentum
    const dx = e.clientX - appState.momentum.lastX;
    appState.momentum.lastX = e.clientX;
    appState.offsetMs -= dx * appState.msPerPx; // drag right -> move timeline left
    appState.momentum.lastDragSpeed = dx * appState.msPerPx;
    draw(false);
    return;

  } else if (appState.drag.isDragging) {
    drag(e);
    return;

  } else {
    // check if mouse is over any interactive elements
    let found = -1;  
    for (let i=screenElements.length-1; i>0; i--) {  
      const se = screenElements[i];
      if (isMouseOver(se.left, se.right, se.top, se.bottom)) {
        found = i;  break; };
    }
    // if so, draw, which will reset screenElements and highlight the one under mouseX/mouseY
    if (found !== appState.highlighted.idx) {
      draw(false);
    }
    return;
  }

}, { passive:false });

window.addEventListener('pointerup', (e)=>{
  if (e.pointerType !== 'mouse') return;

  if (appState.pan.isPanning) {
    appState.pan.isPanning = false;
    // Convert last drag frame delta into per-second velocity estimate using last frame dt
    const now = performance.now();
    const dt = Math.max(16.7, now - (appState.momentum.lastTick || now)) / 1000; // ~1 frame if unknown
    appState.momentum.vOffsetMs = (appState.momentum.lastDragSpeed || 0) / dt;
    appState.momentum.lastDragSpeed = 0;
    return;
  }

  if (appState.drag.isDragging) {
    stopDragging(false);
    return;
  }
});

canvas.addEventListener('wheel', (e)=>{
  // gesturestart/gesturechange for touchscreens?
  e.preventDefault();
  appState.fixedPanMode = null;
  //appState.zoom.isZooming = false;  // stop any zooming in progress
  const direction = e.deltaY > 0 ? 1 : -1;
  const factor = Math.pow(TIME.ZOOM_FACTOR, direction);
  mouseZoom(e.clientX, factor);
}, { passive:false });

canvas.addEventListener('keydown', function (e) {
  
  appState.zoom.isZooming = false; // stop any zooming in progress
  const midX = window.innerWidth / 2;
  const midT = Util.pxToTime(midX);

  if (appState.fixedPanMode)  // navigate by whole units of time (month, year, etc.)
  {
    if (e.key === 'ArrowUp') {
      appState.fixedPanMode = tickSpec.get(appState.fixedPanMode.zoomIn);  // zoom in one level
      zoomToTick(appState.fixedPanMode.start(midT));
    }
    else if (e.key === 'ArrowDown') {
      appState.fixedPanMode = tickSpec.get(appState.fixedPanMode.zoomOut);  // zoom out one level
      const w = appState.fixedPanMode.step(midT, 1) - appState.fixedPanMode.start(midT);
      zoomToTick(midT - w/2, midT + w/2);
    }
    else if (e.key === 'ArrowRight') {
      zoomToTick(appState.fixedPanMode.step(appState.fixedPanMode.start(midT),1));
    }
    else if (e.key === 'ArrowLeft') {
      zoomToTick(appState.fixedPanMode.step(appState.fixedPanMode.start(midT),-1));
    }
    
  } else {  // zoom/pan by increments
    if (e.key === 'ArrowUp') mouseZoom(midX, Math.pow(TIME.ZOOM_FACTOR, -1))
    else if (e.key === 'ArrowDown') mouseZoom(midX, Math.pow(TIME.ZOOM_FACTOR, 1))
    else if (e.key === 'ArrowRight') appState.momentum.vOffsetMs -= TIME.PAN_FACTOR * appState.msPerPx
    else if (e.key === 'ArrowLeft') appState.momentum.vOffsetMs += TIME.PAN_FACTOR * appState.msPerPx;
  }
});

canvas.addEventListener('click', function (e) {
  
  if (appState.pan.ignoreClick) return;
  
  if (appState.highlighted.idx === -1) {
    // clicked in open space; if side panel is open then close it
    if (sidebar.classList.contains('open')) closeSidebar();
    return;
  }

  const elem = screenElements[appState.highlighted.idx];
  if (elem.type === 'tick') {
    // enter 'fixed pan mode' where each arrow key press moves a year/month/etc.
    const m = (elem.mode === 'day') ? 'week' : elem.mode;  // hack: not going to drill to day
    appState.fixedPanMode = tickSpec.get(m);
    zoomToTick(elem.t);

    // if clicked on the highlighted bubble/line/label then open it in the side panel
  } else if (elem.type === 'line' || elem.type === 'bubble' || elem.type === 'label') {
    // for now, open event indicated in details (*.json), but not in editing mode
    if (/.\.json/.test(appState.highlighted.event.details) && !(appState.editingTimeline === appState.highlighted.event.timeline)) {
      followLink({container:"timelines", file:appState.highlighted.event.details});
    }
    else {
      appState.selected.event = appState.highlighted.event;
      appState.selected.timeline = appState.selected.event.timeline;
      if (appState.editingTimeline === appState.selected.timeline) openEventForEdit(appState.selected.event) 
      else openEventForView(appState.selected.event);
    }
  } else if (elem.type === 'timeline') {
    appState.selected.timeline = elem.timeline;
    if (appState.editingTimeline === appState.selected.timeline) openTimelineForEdit(appState.editingTimeline)
    else openTimelineForView(appState.selected.timeline);

  } else if (elem.type === 'button') {
    if (elem.subType === 'close-timeline') closeTimeline(elem.timeline)
    else if (elem.subType === 'add-event') addNewEvent();
  }
});

function zoomToTick(t, t2) {
  // determine where to zoom/pan
  const w = window.innerWidth;
  const tNext = (t2 === undefined) ? appState.fixedPanMode.step(t, 1): t2;
  const width = tNext - t;
  const newOffsetMs = (t - (width / 10)) - TIME.EPOCH;  // just to the left of clicked label
  const newMsPerPx = width / (w / 1.2);  // fit ~80% of next interval in window

  // set in motion; picked up in tick()
  appState.zoom = {isZooming:true, origOffset:appState.offsetMs, newOffset:newOffsetMs, origMsPerPx:appState.msPerPx, newMsPerPx:newMsPerPx};
}

function positionForTimeline(tl)
{
  // return offsetMs and msPerPx to fit timeline tl
  if (!tl.dateFrom || !tl.dateTo)
    return {offsetMs:appState.offsetMs, msPerPx:appState.msPerPx};

  const w = window.innerWidth;
  const tFrom = Date.parse(tl.dateFrom);
  const tTo = Date.parse(tl.dateTo);
  const width = tTo - tFrom;

  return {offsetMs:(tFrom - (width / 10)) - TIME.EPOCH, msPerPx:width / (w / 1.2)};
}

function centerOnTimeline(tl) {
  const p = positionForTimeline(tl);
  appState.offsetMs = p.offsetMs;
  appState.msPerPx = p.msPerPx;
}

function zoomToTimeline(tl) {
  const p = positionForTimeline(tl);
  appState.zoom = {isZooming:true, origOffset:appState.offsetMs, newOffset:p.offsetMs, origMsPerPx:appState.msPerPx, newMsPerPx:p.msPerPx};
  positionTimelines(true);
}

async function loadTimeline(timelineID, idx=0) {
  // load timelineID into timelines array
  const tl = await getTimeline(timelineID);
  timelines.splice(idx, 0, tl);
  return tl;
}

export async function reloadTimeline(tl) {
  // reload from storage
  const idx = timelines.indexOf(tl);
  const timelineID = tl.timelineID;
  const yPos = tl.yPos, ceiling = tl.ceiling;
  timelines[idx] = null;
  const reloaded = await getTimeline(timelineID);
  reloaded.yPos = yPos; reloaded.ceiling = ceiling;
  timelines[idx] = reloaded;
  if (appState.selected.timeline === tl) appState.selected.timeline = reloaded;
  draw(true);
}

function closeTimeline(tl) {
  const idx = timelines.indexOf(tl);
  if (tl === appState.editingTimeline) appState.editingTimeline = null;
  timelines.splice(idx, 1);
  if (timelines.length > 0) {
    const tlBelow = timelines[Math.max(idx-1, 0)]; // refocus on timeline below the deleted one
    zoomToTimeline(tlBelow);
  }
}

async function followLink(timelineID) {
  // check if timeline is already there
  const existingTL = timelines.find(t =>
    JSON.stringify(t.timelineID) === JSON.stringify(timelineID));

  if (existingTL) {
    zoomToTimeline(existingTL);
  } else {
    // load and zoom to timelineID; begin positioned at clicked timeline
    const tl = appState.highlighted.event.timeline;
    const idx = timelines.indexOf(tl);
    const yPos = tl.yPos
    const ceiling = tl.ceiling;
    const newTL = await loadTimeline(timelineID, idx+1); // insert it above the clicked one
    newTL.yPos = yPos;
    newTL.ceiling = ceiling;
    zoomToTimeline(newTL);
  }
}

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

function addNewEvent() {
  // Todo: set significance according to zoom level
  const t = Util.pxToTime(window.innerWidth / 2);
  const d = new Date(t).toISOString().split('T')[0];
  var event = {significance:2, label:'New event', date:d, timeline:appState.editingTimeline};
  initializeEvent(event);
  appState.selected.event = event;
  appState.editingTimeline.events.push(event);
  appState.editingTimeline.dirty = true;
  updateSaveButton();
  draw(true);
  openEventForEdit(event);
}

export function draw(reposition){
  if (reposition) positionLabels();

  ctx.clearRect(0,0, window.innerWidth, window.innerHeight);
  screenElements.length = 0;  // reset list of screen elements
  appState.highlighted.idx = -1;
  drawTicks();
  drawEvents();
}

export async function initialLoad(defaultTL) {
  // open timeline indicated param "tl" or default established in main()
  const params = new URLSearchParams(window.location.search);
  const file = (params.get("tl") || defaultTL) + ".json";
  const tl = await loadTimeline({container:"timelines", file:file});
  positionTimelines(false);
  centerOnTimeline(tl);
  draw(true);
}
