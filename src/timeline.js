import * as Util from './util.js';
import {TIME, DRAW} from './constants.js';
import {appState, timelines, timelineCache, draw, zoomToView} from './canvas.js';
import {zoomSpec, positionViews} from './render.js';
import {getTimeline, saveTimelineToStorage} from './database.js';
import {parseLabel} from './label.js';


function timelineString(tl) {
  // Additional properties have been added to the original timeline object;
  // reduce back to original form for export
  const txt = {
    id: tl.id,
    title: tl.title,
    details: tl.details,
    tags: tl.tags.map(({id, label, parentId, order}) => ({
                        id, label, parentId, order
    })),
    events: tl.events.map(({id, significance, label, date, dateFrom, dateTo, fadeLeft, fadeRight, color, colorLeft, colorRight, details, thumbnail, tagIds}) => ({
                            id, significance, label, date, dateFrom, dateTo, fadeLeft, fadeRight, color, colorLeft, colorRight, details, thumbnail, tagIds: tagIds ?? []
    }))
  };
  return JSON.stringify(txt, null, 2);
}

export function initializeEvent(e) {
  const h = 60*60*1000;
  const spec = zoomSpec(e.significance);
  const style = spec.style;
  
  // Assign unique ID if not present
  if (e.id === undefined) e.id = Util.uuid();

  // Initialize tags selection
  if (!Array.isArray(e.tagIds)) e.tagIds = [];

  // Establish properties for positioning labels
  const parsed = parseLabel(e.label, e.thumbnail);
  e._labelSingle = parsed.singleRow;
  e._labelWidth = parsed.singleWidth;
  e._parsedLabel = parsed.multiRow;
  e._parsedWidth = parsed.multiWidth;
  e._parsedRows = parsed.multiRow[parsed.multiRow.length-1].row + 1;
  if (e.thumbnail && e._parsedRows < DRAW.THUMB_LABEL_ROWS) e._parsedRows = DRAW.THUMB_LABEL_ROWS;
  //e._yOffset = null;

  if (style === 'line') {
    if (!e.dateFrom) e.dateFrom = e.date;
    if (!e.dateTo) e.dateTo = e.date;
    if (!e.fadeLeft) e.fadeLeft = e.dateFrom;
    if (!e.fadeRight) e.fadeRight = e.dateTo;
  
    //if (e.color === 'white') e.color = DRAW.DEFAULT_LINE_COLOR;

    //sanity checks
    if (e.dateTo < e.dateFrom) e.dateTo = e.dateFrom;
    if (e.fadeLeft > e.fadeRight) e.fadeRight = e.fadeLeft;
    if (e.fadeLeft > e.dateTo) e.fadeLeft = e.dateTo;
    if (e.fadeLeft < e.dateFrom) e.fadeLeft = e.dateFrom;
    if (e.fadeRight < e.dateFrom) e.fadeRight = e.dateFrom;
    if (e.fadeRight > e.dateTo) e.fadeRight = e.dateTo;

    e._tFrom = Date.parse(e.dateFrom) + (12 * h);
    e._tTo = Date.parse(e.dateTo) + (12 * h);
    e._fLeft = Date.parse(e.fadeLeft) + (12 * h);
    e._fRight = Date.parse(e.fadeRight) + (12 * h);
    e._dateTime = (e._fRight + e._fLeft) / 2;
    
  } else {
    if (!e.date) e.date = e.dateFrom; // nothing fance like finding middle of line vars...
    const d = Date.parse(e.date)  // OK to assume that every dot event has a date
    e.color = "white";
    
    //convert to a small span in the middle of that day; extend all 'spanning' events to noon on either side
    e._dateTime = d + (12 * h);
    e._tFrom = e._dateTime - (4 * h);
    e._tTo = e._dateTime + (4 * h);
    e._fLeft = e._tFrom + (3 * h);
    e._fRight = e._tTo - (3 * h);
  }
  //e._x = Util.timeToPx(e._dateTime);  // used only to position labels in relation to each other
};

export function initializeTitle(tl) {
  const ctx = canvas.getContext('2d');
  ctx.font = TIME.TITLE_FONT;
  tl._labelWidth = ctx.measureText(tl.title).width;
}

function initializeTimeline(tl) {
  var minDate;
  var maxDate;

  // Assign/establish unique ID
  if (tl.id === undefined) tl.id = Util.uuid();

  initializeTitle(tl);
  tl._dirty = false;
  
  //tl.events.forEach(initializeEvent);
  for (const event of tl.events) {
    event.timeline = tl;
    initializeEvent(event);

    // establish min/max dates present in the timeline
    const spec = zoomSpec(event.significance);
    const dateFrom = (spec.style === 'dot') ? event.date : event.dateFrom;
    const dateTo = (spec.style === 'dot') ? event.date : event.dateTo;
    if (!minDate || dateFrom < minDate) minDate = dateFrom;
    if (!maxDate || dateTo > maxDate) maxDate = dateTo;
  }
  tl._dateFrom = minDate;
  tl._dateTo = maxDate;
}

export async function loadTimeline(file) {

  // if file does not include a slash ("/") then it's private, otherwise public
  const scope = file.includes('/') ? 'public' : 'private';

  // load requested timeline into timeline cache
  const tl = await getTimeline(scope, file);
  initializeTimeline(tl);
  const tlKey = JSON.stringify({
    id: tl.id,
    scope: scope
  });
  tl._key = tlKey;
  tl._file = file,
  tl._scope = scope,
  tl._mode = 'view';
  timelineCache.set(tlKey, tl);

  return tl;
}

export function addNewTimeline(title) {
  // append new timeline to the array
  
  const newTL = {
    id:Util.uuid(),
    title:title, 
    details:null, 
    tags:[],
    events:[],
    _labelWidth:null,
    _mode:'edit',
    _dirty:true,
    _storage:{scope:"private", file:null}
  };

  initializeTitle(newTL);
  timelines.push(newTL);

  positionTimelines(false);
  draw(true);
}

export async function saveTimeline(tl)
{
  Util.showGlobalBusyCursor();
  try {
    const text = timelineString(tl);
    await saveTimelineToStorage("private", tl._storage.file, text);
    tl._dirty = false;
  } catch (err) {
    //await sleep(1200);  // simulate database access
    console.error('Save failed:', err.message);
  }
  Util.hideGlobalBusyCursor();
}

export async function publishTimeline(tl)
{
  Util.showGlobalBusyCursor();
  try {
    const text = timelineString(tl);
    await saveTimelineToStorage("public", tl._storage.file, text);
    tl._dirty = false;
  } catch (err) {
    //await sleep(1200);  // simulate database access
    console.error('Publish failed:', err.message);
  }
  Util.hideGlobalBusyCursor();
}

/*
export async function closeTimeline(viewIdx) {

  // Determine whether this is the only view for this timeline
  const timelineID = appState.views[viewIdx].timelineID;
  const otherVw = appState.views.find(vw =>
    appState.views.indexOf(vw) != viewIdx &&
    vw.timelineID === timelineID);
    
  if (!otherVw) {
    // This is the only one - if dirty then prompt
    const tl = timelineCache.get(timelineID);
    if (tl._dirty) {
      const ok = await showModalDialog({message:'Close timeline without saving?'});
      if (!ok) return;
    }
    // Delete timeline from memory
    timelineCache.delete(timelineID);
  }

  // Remove view from the array
  appState.views.splice(viewIdx, 1);
  if (appState.views.length === 0)
    draw(false) 
  else {
    const vwBelow = appState.views[Math.max(viewIdx-1, 0)]; // refocus on timeline below the deleted one
    zoomToTimeline(vwBelow);
  }
}
*/

export function closeTimeline(tlKey) {
  timelineCache.delete(tlKey);
}
