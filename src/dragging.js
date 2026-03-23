import * as Util from './util.js';
import {appState, screenElements, draw, setPointerCursor} from './canvas.js';
import {initializeEvent} from './timeline.js';
import {markDirty} from './panel.js';
import {positionLabels, formatEventDates} from './render.js';
import {startOfTick} from './ticks.js';

export function startDragging() {
  // start dragging a handle
  const e = appState.selected.event;
  appState.drag = {
    isDragging: true,
    attribute: screenElements[appState.highlighted.idx].subType,
    start: {
      date: e.date,
      dateFrom: e.dateFrom,
      dateTo: e.dateTo,
      fadeLeft: e.fadeLeft,
      fadeRight: e.fadeRight,
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
    const e = appState.selected.event;
    const d = appState.drag;
    appState.drag.isDragging = false;
    e.date = d.start.date;
    e.dateFrom = d.start.dateFrom;
    e.dateTo = d.start.dateTo;
    e.fadeLeft = d.start.fadeLeft;
    e.fadeRight = d.start.fadeRight;
    markDirty(appState.selected.timeline);
    initializeEvent(e);
    document.getElementById('event-date-display').value = formatEventDates(e);
    positionLabels();
    draw();
  }
}

export function drag(e) {
  // dragging a handle to change event dateTime
  const se = appState.selected.event;
  const attr = appState.drag.attribute;
  const t = Util.pxToTime(e.clientX);  // timestamp in center of the window
  const roundT = startOfTick(t);
  if (roundT === se[attr].ts) return;  // snap to tick
  const d = {ts:roundT, prec:'day'};  // assume precision="day" for now

  if (attr === 'dateFrom' && se._fLeft === se._tFrom) se.fadeLeft = d; // move the 'fade' dates with from/to
  if (attr === 'dateTo' && se._fRight === se._tTo) se.fadeRight = d;
  se[attr] = d; // initializeEvent will handle limits
  initializeEvent(se);
  document.getElementById('event-date-display').value = formatEventDates(se);
  markDirty(appState.selected.timeline);
  positionLabels();
  draw();
}