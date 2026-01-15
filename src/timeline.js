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
    dateFrom: tl.dateFrom,
    dateTo: tl.dateTo,
    events: tl.events.map(({significance, label, date, dateFrom, dateTo, fadeLeft, fadeRight, color, colorLeft, colorRight, details}) => ({
                            significance, label, date, dateFrom, dateTo, fadeLeft, fadeRight, color, colorLeft, colorRight, details
    }))
  };
  return JSON.stringify(txt, null, 2);
}

export function initializeEvent(e) {
  const h = 60*60*1000;
  const spec = zoomSpec(e.significance);
  const style = spec.style;
  
  // Establish properties for positioning labels
  const parsed = parseLabel(e.label);
  e.labelSingle = parsed.singleRow;
  e.labelWidth = parsed.singleWidth;
  e.parsedLabel = parsed.multiRow;
  e.parsedWidth = parsed.multiWidth;
  e.parsedRows = parsed.multiRow[parsed.multiRow.length-1].row + 1;
  e.yOffset = null;

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

    e.tFrom = Date.parse(e.dateFrom) + (12 * h);
    e.tTo = Date.parse(e.dateTo) + (12 * h);
    e.fLeft = Date.parse(e.fadeLeft) + (12 * h);
    e.fRight = Date.parse(e.fadeRight) + (12 * h);
    e.dateTime = (e.fRight + e.fLeft) / 2;
    
  } else {
    if (!e.date) e.date = e.dateFrom; // nothing fance like finding middle of line vars...
    const d = Date.parse(e.date)  // OK to assume that every dot event has a date
    e.color = "white";
    
    //convert to a small span in the middle of that day; extend all 'spanning' events to noon on either side
    e.dateTime = d + (12 * h);
    e.tFrom = e.dateTime - (4 * h);
    e.tTo = e.dateTime + (4 * h);
    e.fLeft = e.tFrom + (3 * h);
    e.fRight = e.tTo - (3 * h);
  }
  e.x = Util.timeToPx(e.dateTime);  // used only to position labels in relation to each other
};

export function initializeTitle(tl) {
  const ctx = canvas.getContext('2d');
  ctx.font = TIME.TITLE_FONT;
  tl.labelWidth = ctx.measureText(tl.title).width;
}

function initializeTimeline(tl) {
  var minDate;
  var maxDate;

  initializeTitle(tl);
  tl.dirty = false;
  
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
  tl.dateFrom = minDate;
  tl.dateTo = maxDate;
}

export async function loadTimeline(file, idx=0) {

  // if file does not include a slash ("/") then it's private, otherwise public
  const scope = file.includes('/') ? 'public' : 'private';

  // load timelineID into timelines array
  const tl = await getTimeline(scope, file);
  const timelineID = {scope:scope, file:file};
  tl.timelineID = timelineID;
  initializeTimeline(tl);
  tl.mode = 'view';
  timelines.splice(idx, 0, tl);
  return tl;
}

export async function reloadTimeline(tl) {
  // reload from storage
  const idx = timelines.indexOf(tl);
  const timelineID = tl.timelineID;
  const yPos = tl.yPos, ceiling = tl.ceiling;
  timelines[idx] = null;
  const reloaded = await getTimeline(timelineID.scope, timelineID.file);
  initializeTimeline(reloaded);
  reloaded.yPos = yPos; reloaded.ceiling = ceiling;
  timelines[idx] = reloaded;
  if (appState.selected.timeline === tl) appState.selected.timeline = reloaded;
}

export function addNewTimeline(title) {
  // append new timeline to the array
  
  const newTL = {
    title:title, 
    details:null, 
    events:[],
    labelWidth:null,
    mode:'edit',
    dirty:true
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
    await saveTimelineToStorage(tl.timelineID.file, text);
    tl.dirty = false;
  } catch (err) {
    //await sleep(1200);  // simulate database access
    console.error('Save failed:', err.message);
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
