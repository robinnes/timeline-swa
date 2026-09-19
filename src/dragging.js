import * as Util from './util.js';
import * as Calendar from './calendar.js';
import {TOUCH} from './constants.js';
//import {appState, screenElements, draw, setPointerCursor} from './canvas.js';
import {appState, canvas, screenElements, draw, setPointerCursor} from './canvas.js';
import {initializeItem} from './timeline.js';
import {markDirty, forceEditItemMain} from './panelEdit.js';
import {positionLabels} from './render.js';
import {getTickSpec, startOfTick, nextTick, tickSpec} from './ticks.js';

/* ------------------- Dragging -------------------- */

export function startDragging() {
  // start dragging a handle
  const i = appState.selected.item;
  appState.drag = {
    isDragging: true,
    attribute: screenElements[appState.highlighted.idx].subType,
    start: {
      date: i.date,
      dateFrom: i.dateFrom,
      dateTo: i.dateTo,
      fadeLeft: i.fadeLeft,
      fadeRight: i.fadeRight,
      dirty: appState.selected.timeline._dirty
    }
  };
};

export function stopDragging(revert = false) {
  if (!revert) {
    appState.drag.isDragging = false;
    setPointerCursor();  // as opposed to calling draw()
  } else {
    // cancel pan mode and revert to original value (this code should be in timeline.js...)
    const i = appState.selected.item;
    const d = appState.drag;
    appState.drag.isDragging = false;
    i.date = d.start.date;
    i.dateFrom = d.start.dateFrom;
    i.dateTo = d.start.dateTo;
    i.fadeLeft = d.start.fadeLeft;
    i.fadeRight = d.start.fadeRight;
    markDirty(appState.selected.timeline);
    initializeItem(i);
    document.getElementById('item-date-display').value = Calendar.formatItemDates(i);
    positionLabels();
    draw();
  }
}

export function drag(e) {

  const si = appState.selected.item;
  const attr = appState.drag.attribute;
  const prec = getTickSpec().mode;  // assume precision of the canvas
  const t = Util.pxToTime(e.clientX);  // timestamp in center of the window
  const inclusive = tickSpec.get(prec).inclusive;  // whether lines s/b inclusive of right-hand dates
  const pointerT = startOfTick(t);  // left of tick currently under the pointer
  const pointerMid = Math.round((pointerT + nextTick(pointerT)) / 2);  // middle of tick currently under the pointer

  if (pointerMid === si[attr]._mid) return; // only continue if the handle will move

  const d = {ts:(!inclusive && (attr === 'dateTo' || attr === 'fadeRight')) ? nextTick(pointerT) : pointerT, prec:prec};

  if (attr === 'dateFrom') {
    if (pointerMid > si.dateTo._mid) si.dateTo = {ts:inclusive ? pointerT : nextTick(pointerT), prec:prec};
    if (si.fadeLeft._mid <= si.dateFrom._mid) si.fadeLeft = {...d};
    if (si.fadeRight._mid < pointerMid) si.fadeRight = {ts:inclusive ? pointerT : nextTick(pointerT), prec:prec};
  } 

  if (attr === 'dateTo') {
    if (pointerMid < si.dateFrom._mid) si.dateFrom = {ts:pointerT, prec:prec};
    if (si.fadeRight._mid >= si.dateTo._mid) si.fadeRight = {...d};
    if (si.fadeLeft._mid > pointerMid) si.fadeLeft = {ts:pointerT, prec:prec};
  } 

  if (attr === 'fadeLeft' && (pointerMid < si.dateFrom._mid || pointerMid > si.fadeRight._mid)) return;
  if (attr === 'fadeRight' && (pointerMid > si.dateTo._mid || pointerMid < si.fadeLeft._mid)) return;
  
  si[attr] = d;
  initializeItem(si);

  document.getElementById('item-date-display').value = Calendar.formatItemDates(si);
  forceEditItemMain();
  markDirty(appState.selected.timeline);
  positionLabels();
  draw();
}

/* ------------------- Mouse and keyboard events -------------------- */

export function initializeDragging() {
  canvas.addEventListener('pointerdown', dragPointerDown);
  canvas.addEventListener('pointermove', dragPointerMove, {passive:false});
  canvas.addEventListener('pointerup', dragPointerUp);
  document.addEventListener('keydown', dragKeyDown);
}

function dragPointerDown(e) {
  if (e.pointerType !== 'mouse' || TOUCH.SIMULATE_MODE) return;

  const idx = appState.highlighted.idx;

  // This handler is interested only in item handles.
  if (idx === -1 || screenElements[idx].type !== 'handle') return;

  // Don't let the normal canvas pointerdown handler start panning.
  e.preventDefault();
  e.stopImmediatePropagation();

  canvas.setPointerCapture(e.pointerId);
  canvas.focus();

  startDragging();
}

function dragPointerMove(e) {
  if (e.pointerType !== 'mouse' || TOUCH.SIMULATE_MODE) return;
  if (!appState.drag.isDragging) return;

  // Don't let the normal canvas pointermove handler process this movement.
  e.preventDefault();
  e.stopImmediatePropagation();

  drag(e);
}

function dragPointerUp(e) {
  if (e.pointerType !== 'mouse' || TOUCH.SIMULATE_MODE) return;
  if (!appState.drag.isDragging) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  stopDragging(false);
}

function dragKeyDown(e) {
  if (e.key !== 'Escape') return;
  if (!appState.drag.isDragging) return;

  // Let an open modal retain ownership of Escape.
  const confirmDialog = document.getElementById('confirm-dialog');
  if (confirmDialog?.open) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  stopDragging(true);
}
