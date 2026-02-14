import * as Util from './util.js';
import {TIME, DRAW} from './constants.js';
import {appState, timelines, draw, zoomToTimeline} from './canvas.js';
import {zoomSpec, positionTimelines} from './render.js';
import {getTimeline, saveTimelineToStorage} from './database.js';
import {parseLabel} from './label.js';


function timelineString(tl) {
  // Additional properties have been added to the original timeline object;
  // reduce back to original form for export
  const txt = {
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
  
  // Assign/establish unique ID
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
  e._yOffset = null;

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
    e._dateTime = (e.fRight + e.fLeft) / 2;
    
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
  e._x = Util.timeToPx(e._dateTime);  // used only to position labels in relation to each other
};

export function initializeTitle(tl) {
  const ctx = canvas.getContext('2d');
  ctx.font = TIME.TITLE_FONT;
  tl._labelWidth = ctx.measureText(tl.title).width;
}

function initializeTimeline(tl) {
  var minDate;
  var maxDate;

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

export async function loadTimeline(file, idx=0) {

  // if file does not include a slash ("/") then it's private, otherwise public
  const scope = file.includes('/') ? 'public' : 'private';

  // load timelineID into timelines array
  const tl = await getTimeline(scope, file);
  const timelineID = {scope:scope, file:file};
  tl._timelineID = timelineID;
  initializeTimeline(tl);
  tl._mode = 'view';
  timelines.splice(idx, 0, tl);
  return tl;
}

export async function reloadTimeline(tl) {
  // reload from storage
  const idx = timelines.indexOf(tl);
  const timelineID = tl._timelineID;
  const yPos = tl._yPos, ceiling = tl._ceiling;
  timelines[idx] = null;
  const reloaded = await getTimeline(timelineID.scope, timelineID.file);
  initializeTimeline(reloaded);
  reloaded._yPos = yPos; reloaded._ceiling = ceiling;
  timelines[idx] = reloaded;
  if (appState.selected.timeline === tl) appState.selected.timeline = reloaded;
}

export function addNewTimeline(title) {
  // append new timeline to the array
  
  const newTL = {
    title:title, 
    details:null, 
    events:[],
    _labelWidth:null,
    _mode:'edit',
    _dirty:true,
    timelineID:{scope:"private", file:null}
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
    await saveTimelineToStorage("private", tl._timelineID.file, text);
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
    await saveTimelineToStorage("public", tl._timelineID.file, text);
    tl._dirty = false;
  } catch (err) {
    //await sleep(1200);  // simulate database access
    console.error('Publish failed:', err.message);
  }
  Util.hideGlobalBusyCursor();
}

export function closeTimeline(tl) {
  const idx = timelines.indexOf(tl);
  timelines.splice(idx, 1);
  if (timelines.length === 0)
    draw(false) 
  else {
    const tlBelow = timelines[Math.max(idx-1, 0)]; // refocus on timeline below the deleted one
    zoomToTimeline(tlBelow);
  }
}
