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
    document.getElementById('item-date-display').value = formatItemDates(e);
    positionLabels();
    draw();
  }
}

export function drag(i) {
  // dragging a handle to change item dateTime
  const si = appState.selected.item;
  const attr = appState.drag.attribute;
  const prec = getTickSpec().mode;  // assume precision of the canvas
  const t = Util.pxToTime(i.clientX);  // timestamp in center of the window
  let roundT = startOfTick(t);
//console.log(new Date(roundT).toLocaleString(undefined, {year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone:'UTC'}));

  if (roundT === si[attr].ts) return;  // snap to tick

//if (attr==='dateFrom' && roundT >= si._tTo) {
//  console.log("here");
//}
  // check from/to date limits
  if (attr==='dateFrom' && roundT >= si._tTo) roundT = si._tFrom;
  if (attr==='dateTo' && roundT < si._tFrom) roundT = si._tFrom;
  
  const d = {ts:roundT, prec:prec};

  // move the 'fade' dates with from/to
  if (attr==='dateFrom' && si._fLeft===si._dateFrom) si.fadeLeft = {...d};
  if (attr==='dateTo'   && si._fRight===si._dateTo)  si.fadeRight = {...d};
 
  si[attr] = d; // initializeItem will handle limits
/*
const s = new Date(roundT).toLocaleString(undefined, {year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone:'UTC'});
console.log(attr + " = " + s);
*/
  initializeItem(si);
  document.getElementById('item-date-display').value = formatItemDates(si);
  markDirty(appState.selected.timeline);
  positionLabels();
  draw();
}