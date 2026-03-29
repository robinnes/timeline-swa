import * as Util from './util.js';
import {appState, screenElements, draw, setPointerCursor} from './canvas.js';
import {initializeItem} from './timeline.js';
import {markDirty, formatItemDates} from './panel.js';
import {positionLabels} from './render.js';
import {getTickSpec, startOfTick} from './ticks.js';

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
    document.getElementById('item-date-display').value = formatItemDates(i);
    positionLabels();
    draw();
  }
}

export function drag(i) {
  // dragging a handle to change item dateTime
  const si = appState.selected.item;
  const attr = appState.drag.attribute;
  const t = Util.pxToTime(i.clientX);  // timestamp in center of the window
  const roundT = startOfTick(t);
  const prec = getTickSpec().mode;  // assume precision of the canvas
  if (roundT === si[attr].ts) return;  // snap to tick

  const d = {ts:roundT, prec:prec};
  if (attr === 'dateFrom' && si._fLeft === si._tFrom) si.fadeLeft = d; // move the 'fade' dates with from/to
  if (attr === 'dateTo' && si._fRight === si._tTo) si.fadeRight = d;
  si[attr] = d; // initializeItem will handle limits
  
  initializeItem(si);
  document.getElementById('item-date-display').value = formatItemDates(si);
  markDirty(appState.selected.timeline);
  positionLabels();
  draw();
}