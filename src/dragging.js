import * as Util from './util.js';
import {appState, screenElements, draw, setPointerCursor} from './canvas.js';
import {initializeEvent} from './timeline.js';
import {updateSaveButton, markDirty} from './panel.js';
import {positionLabels, formatEventDates} from './render.js';

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
    appState.selected.timeline._dirty = d.dirty;
    updateSaveButton();
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
  const t = Util.pxToTime(e.clientX) - 12 * 60 * 60 * 1000; // add 12 hours to center on date
  const d = new Date(t).toISOString().split('T')[0];
  
  if (attr === 'dateFrom' && se.fadeLeft === se.dateFrom) se.fadeLeft = d; // move the 'fade' dates with from/to
  if (attr === 'dateTo' && se.fadeRight === se.dateTo) se.fadeRight = d;
  se[attr] = d; // initializeEvent will handle limits
  initializeEvent(se);
  document.getElementById('event-date-display').value = formatEventDates(se);
  markDirty(appState.selected.timeline);
  positionLabels();
  draw();
}