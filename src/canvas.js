import * as Util from './util.js';
import {TIME} from './constants.js';
import {drawTicks, tickSpec} from './ticks.js';
import {positionViews, positionLabels, filterEventsForView, drawEvents, isMouseOver, zoomSpec} from './render.js';
import {sidebarIsOpen, closeSidebar, openSelectedView, openSelectedEvent} from './panel.js';
import {loadTimeline, closeTimeline, initializeEvent} from './timeline.js';
import {startDragging, stopDragging, drag} from './dragging.js';
import {isTouchPanning} from './mobile.js';
import {closeAppMenu, closeModal} from './appmenu.js';
import {showModalDialog} from './confirmDialog.js';

export const canvas = document.getElementById('canvas');
export const ctx = canvas.getContext('2d');

export const appState = {
  msPerPx: TIME.MS_PER_DAY * 30,  // controls zoom; shifts timeline relative to EPOCH at x=0
  offsetMs: (Date.now() - TIME.EPOCH) - (window.innerWidth * 0.9) * TIME.MS_PER_DAY * 30,  // date at left of the window; center near "now",
  mouseX: 0, mouseY:0,  // to access mouse location outside of event handlers
  highlighted: {
    idx: -1,  // index in screenElements of currently highlighted item
    eventPos: null,
    view: null,
    linkIdx: -1
  },
  selected: {
    event: null,
    timeline: null,
    view: null
  },
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
  },
  authentication: {
    userId: null
  },
  views:[]
}

export const timelines = [];
export const timelineCache = new Map();
export const screenElements = [];  // Elements currently rendered on screen that can be interacted with  

/* ------------------- Functions -------------------- */

export function getCanvasViewport() {
  // the effective area of the canvas will shrink when the side panel is opened
  const sidebarEl = document.getElementById('sidebar');
  const sidebarRight = sidebarEl
    ? Math.max(0, sidebarEl.getBoundingClientRect().right)
    : 0;

  return {
    left: sidebarRight,
    top: 0,
    width: window.innerWidth - sidebarRight,
    height: window.innerHeight,
    right: window.innerWidth,
    bottom: window.innerHeight
  };
}

export function getCanvasMidX() {
  const vp = getCanvasViewport();
  return vp.left + (vp.width / 2);
}

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
  const linkIdx = appState.highlighted.linkIdx;

  if (appState.drag.isDragging) canvas.style.cursor = 'ew-resize'
  else if (idx === -1) canvas.style.cursor = 'default'
  else if (linkIdx > -1) canvas.style.cursor = 'pointer'
  else if (screenElements[idx].type === 'button') canvas.style.cursor = 'pointer'
  else if (screenElements[idx].type === 'handle') canvas.style.cursor = 'ew-resize'
  else canvas.style.cursor = 'default';
}

export function draw(reposition){
  if (reposition) positionLabels();

  ctx.clearRect(0,0, window.innerWidth, window.innerHeight);
  screenElements.length = 0;  // reset list of screen elements
  appState.highlighted.idx = -1;
  appState.highlighted.linkIdx = -1;
  drawTicks();
  drawEvents();
  //Util.debugVars();
}

export async function initialLoad() {
  // open public timeline indicated param "tl" if present
  const params = new URLSearchParams(window.location.search);
  const tlParam = params.get("tl");
  if (!tlParam) return;

  const file = tlParam + ".json";
  openTimeline(file, false);
}

/* ------------------- Momentum handling -------------------- */

export function tick(now) {
  requestAnimationFrame(tick);

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
  for (const vw of appState.views) {
    if (vw.newYPos) {
      const dCeiling = vw.newCeiling - vw.ceiling;
      const dYPos = vw.newYPos - vw.yPos;
      vw.ceiling += dCeiling * dt * TIME.ZOOM_SPEED;
      vw.yPos += dYPos * dt * TIME.ZOOM_SPEED;
    }
  }

  // stop when movement is smaller than a pixel
  if (Math.abs(dOffset) < appState.msPerPx || appState.msPerPx === TIME.MIN_MS_PER_PX) {
    appState.zoom.isZooming = false;
    // reset zoom variables for the timelines
    for (const vw of appState.views) {
      if (vw.newYPos) {
        vw.ceiling = vw.newCeiling; vw.yPos = vw.newYPos;
        vw.newCeiling = null; vw.newYPos = null;
      }
    }
  }
  draw(true);
}


/* ------------------- Mouse and keyboard events -------------------- */

canvas.addEventListener('click', function (e) {
  
  if (appState.pan.ignoreClick) return;
  
  if (document.querySelector('.app-menu').classList.contains('is-open'))
    closeAppMenu();

  if (appState.highlighted.linkIdx > -1) {
    // hyperlink clicked
    const link = screenElements[appState.highlighted.linkIdx].subType;  // format:"attr=value"
    const vw = screenElements[appState.highlighted.idx]?.view;  // have to retrieve view from label beneath
    if (!vw) return;
    // construct an HTML object
    const [attr, value] = link.split("=", 2);
    const a = document.createElement("a");
    a.setAttribute(attr, value);
    followHyperlink(vw, a, false);
    return;
  }

  if (appState.highlighted.idx === -1) {
    // clicked in open space; if side panel is open then close it
    if (sidebarIsOpen()) closeSidebar();
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
      appState.selected.event = elem.eventPos.event; // appState.highlighted.eventPos.event;
      appState.selected.timeline = appState.selected.event._timeline;
      appState.selected.view = elem.view;
      openSelectedEvent(true);
      draw(false);
  } else if (elem.type === 'view') {
    const vw = appState.views[elem.view];
    const tl = timelineCache.get(vw.tlKey)
    appState.selected.view = vw;
    appState.selected.timeline = tl;
    openSelectedView(true);

  } else if (elem.type === 'button') {
    if (elem.subType === 'close-timeline') closeView(elem.view); 
    else if (elem.subType === 'add-event') addNewEvent(elem.view);
  }
});

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
    let foundIdx = -1, foundLinkIdx = -1;  
    for (let i = screenElements.length-1; i > 0; i--) {  
      const se = screenElements[i];
      if (isMouseOver(se.left, se.right, se.top, se.bottom)) {
        if (!se.type === "link") foundIdx = i;
        else foundLinkIdx = i;
      };
    }
    // if so then draw, which will reset screenElements and highlight the one under mouseX/mouseY
    if (foundIdx !== appState.highlighted.idx || foundLinkIdx !== appState.highlighted.linkIdx) {
      draw(false);
    }
    return;
  }

}, { passive:false });

canvas.addEventListener('pointerup', (e)=>{
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
  appState.zoom.isZooming = false;  // stop any zooming in progress
  const direction = e.deltaY > 0 ? 1 : -1;
  const factor = Math.pow(TIME.ZOOM_FACTOR, direction);
  mouseZoom(e.clientX, factor);
}, { passive:false });

canvas.addEventListener('keydown', function (e) {

  appState.zoom.isZooming = false; // stop any zooming in progress
  const midX = getCanvasMidX();
  const midT = Util.pxToTime(midX);

  if (appState.fixedPanMode)  // navigate by whole units of time (month, year, etc.)
  {
    if (e.key === 'ArrowUp') {
      appState.fixedPanMode = tickSpec.get(appState.fixedPanMode.zoomIn);  // zoom in one level
      zoomToTick(appState.fixedPanMode.start(midT));
    } else if (e.key === 'ArrowDown') {
      appState.fixedPanMode = tickSpec.get(appState.fixedPanMode.zoomOut);  // zoom out one level
      const w = appState.fixedPanMode.step(midT, 1) - appState.fixedPanMode.start(midT);
      zoomToTick(midT - w/2, midT + w/2);
    } else if (e.key === 'ArrowRight') {
      zoomToTick(appState.fixedPanMode.step(appState.fixedPanMode.start(midT),1));
    } else if (e.key === 'ArrowLeft') {
      zoomToTick(appState.fixedPanMode.step(appState.fixedPanMode.start(midT),-1));
    }
    
  } else {  // zoom/pan by increments
    if (e.key === 'ArrowUp') mouseZoom(midX, Math.pow(TIME.ZOOM_FACTOR, -1))
    else if (e.key === 'ArrowDown') mouseZoom(midX, Math.pow(TIME.ZOOM_FACTOR, 1))
    else if (e.key === 'ArrowRight') appState.momentum.vOffsetMs -= TIME.PAN_FACTOR * appState.msPerPx
    else if (e.key === 'ArrowLeft') appState.momentum.vOffsetMs += TIME.PAN_FACTOR * appState.msPerPx;
  }
});

document.addEventListener('keydown', (ev) => {
  // Escape key handling
  if (ev.key !== 'Escape') return;

  // Ignore if modal dialog is displayed; it handles Escape itself
  if (document.getElementById('confirm-dialog').open) return;

  if (appState.drag.isDragging) {
    stopDragging(true);
    return;
  }
  if (document.querySelector('.app-menu').classList.contains('is-open')) {
    closeAppMenu();
    return;
  }
  const openModalEl = document.querySelector('.modal:not([hidden])');
  if (openModalEl) {
    closeModal(openModalEl);
    return;
  }
  if (sidebar.classList.contains('open')) {
    closeSidebar();
    return;
  }
  //ev.stopPropagation();
  //ev.preventDefault();
});


/* ------------------- General navigation -------------------- */

function mouseZoom(x, factor) {
  const tAtMouse = Util.pxToTime(x);
  const newMsPerPx = appState.msPerPx * factor;
  const vp = getCanvasViewport();

  // clamp zoom between min and max thresholds
  appState.msPerPx = Math.max(TIME.MIN_MS_PER_PX, Math.min(TIME.MAX_MS_PER_PX, newMsPerPx));

  // keep the date under the mouse fixed
  appState.offsetMs = tAtMouse - TIME.EPOCH - ((x - vp.left) * appState.msPerPx);

  draw(true);
};

function zoomToTick(t, t2) {
  const vp = getCanvasViewport();
  const tNext = (t2 === undefined) ? appState.fixedPanMode.step(t, 1) : t2;
  const width = tNext - t;
  const newOffsetMs = (t - (width / 10)) - TIME.EPOCH;
  const newMsPerPx = width / (vp.width / 1.2);

  appState.zoom = {
    isZooming: true,
    origOffset: appState.offsetMs,
    newOffset: newOffsetMs,
    origMsPerPx: appState.msPerPx,
    newMsPerPx: newMsPerPx
  };
}


/* ------------------- View/Timeline management -------------------- */

function getViewForFile(file) {
  // (for now) if file does not include a slash ("/") then it's private, otherwise public
  //const scope = file.includes('/') ? 'public' : 'private';
  const found = appState.views.find(vw => vw.file === file /*&& vw.scope === scope*/);
  return(found);
}

function positionForView(vw) {
  if (!vw.tFrom || !vw.tTo) {
    return { offsetMs: appState.offsetMs, msPerPx: appState.msPerPx };
  }

  const vp = getCanvasViewport();
  const width = vw.tTo - vw.tFrom;

  return {
    offsetMs: (vw.tFrom - (width / 10)) - TIME.EPOCH,
    msPerPx: width / (vp.width / 1.2)
  };
}

function centerOnView(view) {
  const p = positionForView(view);
  appState.offsetMs = p.offsetMs;
  appState.msPerPx = p.msPerPx;
  draw(true);
}

export function zoomToView(view) {
  const p = positionForView(view);
  appState.zoom = {isZooming:true, origOffset:appState.offsetMs, newOffset:p.offsetMs, origMsPerPx:appState.msPerPx, newMsPerPx:p.msPerPx};
  positionViews(true);
}

async function linkToFile(file) {
  // check if timeline is already there
  let existingVw = getViewForFile(file);
  if (existingVw) {
    zoomToView(existingVw);
    return existingVw;
  }
  const newView = openTimeline(file, true, 0);
  return newView;
}

function linkToTag(origVw, tagID) {
  // don't open another view if one with this tag is already open; just zoom to it
  const existingVw = appState.views.find((vw) => vw.tagFilter===tagID);
  if (existingVw) {
    zoomToView(existingVw);
    return existingVw;
  }

  const origIdx = appState.views.indexOf(origVw);
  const newVw = structuredClone(origVw);  // copy originating view
  newVw.tagFilter = tagID;
  filterEventsForView(newVw);  // establish min/max dates

  appState.views.splice(origIdx+1, 0, newVw);  // insert above originating view
  positionViews(false);
  zoomToView(newVw);

  return newVw;
}

export async function followHyperlink(origVw, a, forceDisplay) {
  var view = null;
  if (a.hasAttribute("tl")) {
    const file = a.getAttribute("tl") + ".json";
    view = await linkToFile(file);
  } else if (a.hasAttribute("tag")) {
    const tag = a.getAttribute("tag");
    view = linkToTag(origVw, tag);
  }
  if (view) {
    const tl = timelineCache.get(view.tlKey);
    appState.selected.view = view;
    appState.selected.event = null;
  
    const display = sidebarIsOpen() || forceDisplay;
    openSelectedView(display);
  }
}

export async function openTimeline(file, zoom, sourceView) {
  let existingVw = getViewForFile(file);
  if (existingVw) {
    // timeline is already present
    const tlKey = existingVw.tlKey;
    const existingTL = timelineCache.get(tlKey);
    // check before reloading timeline that's being edited
    if (existingTL._dirty) {
      const ok = await showModalDialog({message:'Abandon changes to timeline and revert to saved version?'});
      if (!ok) return;  // consider returning a false here and not closing fileDialog
    }
    // delete present timeline and all views pointing to it, then reload
    timelineCache.delete(tlKey);
    while (existingVw) {
      const idx = appState.views.indexOf(existingVw);
      appState.views.splice(idx, 1);
      existingVw = getViewForFile(file);
    }
  }
  const tl = await loadTimeline(file);  // retrieve timeline from storage
  const view = {
    tlKey: tl._key,
    file: tl._file,
    scope: tl._scope,
    tFrom: null,
    tTo: null,
    tagFilter: null,
    eventPos: []
  }
  filterEventsForView(view);  // establish min/max dates for view (tFrom/tTo)

  if (!sourceView) appState.views.push(view);
  else appState.views.splice(sourceView, 0, view);  // insert above currently selected view
  positionViews(false);

  if (!zoom) {
    centerOnView(view);
  } else {
    zoomToView(view);
  }
  return view;
}


/* ------------------- Canvas button handling -------------------- */

async function closeView(viewIdx) {
  // determine whether there are other views on the same timeline
  const view = appState.views[viewIdx];
  const tlKey = view.tlKey;
  const otherVw = appState.views.find(vw => appState.views.indexOf(vw) != viewIdx && vw.tlKey === tlKey);
  if (!otherVw) {
    // it's the only one; check if it has unsaved changes
    const tl = timelineCache.get(tlKey);
    if (tl._dirty) {
      const ok = await showModalDialog({message:'Close timeline without saving changes?'});
      if (!ok) return;
    }
    // delete it from cache
    closeTimeline(tlKey);
  }
  // Remove view from the array
  appState.views.splice(viewIdx, 1);
  if (appState.views.length === 0) {
    closeSidebar();
    draw(false);
  } else {
    const vwBelow = appState.views[Math.max(viewIdx-1, 0)]; // refocus on timeline below the deleted one
    if (appState.selected.view === view) {  // if selected view is the one closed...
      appState.selected.view = vwBelow;
      openSelectedView(false);
    }
    zoomToView(vwBelow);
  }
}

function addNewEvent(viewIdx) {
  const vw = appState.views[viewIdx];
  const tl = timelineCache.get(vw.tlKey);
  const t = Util.pxToTime(getCanvasMidX());
  const d = new Date(t).toISOString().split('T')[0];
  let sig = 3;
  // smallest sig that will fully render
  for (let s = 3; s > 0; s--) {
    if (zoomSpec(s).fade < 1) break;
    sig = s;
  }

  var event = {
    id: Util.uuid(),
    significance: sig, 
    label: "New event", 
    date: d, 
    color: "white",
    details: null,
    tagIds: vw.tagFilter ? [vw.tagFilter] : [],  // if clicked view is filtered, inherit the tag filter
    include: (!vw.tagFilter),  // if clicked view is filtered, don't include event in base timeline
    _timeline: tl
  };

  initializeEvent(event);
  appState.selected.event = event;
  appState.selected.view = vw;
  appState.selected.timeline = tl;
  tl.events.push(event);
  tl._dirty = true;
  draw(true);
  openSelectedEvent(true);
}

/*
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
*/