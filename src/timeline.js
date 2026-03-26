import * as Util from './util.js';
import {TIME, DRAW} from './constants.js';
import {appState, timelineCache, draw} from './canvas.js';
import {zoomSpec, positionViews} from './render.js';
import {getTimeline, saveTimelineToStorage} from './database.js';
import {parseLabel} from './label.js';
import {tickSpec} from './ticks.js';


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
    items: tl.events.map(({id, significance, label, date, dateFrom, dateTo, fadeLeft, fadeRight, color, colorLeft, colorRight, details, thumbnail, tagIds, include}) => ({
                            id, prominence: significance, label, date, dateFrom, dateTo, fadeLeft, fadeRight, color, colorLeft, colorRight, details, thumbnail, tagIds, include
    }))
  };
  return JSON.stringify(txt, null, 2);
}

export function initializeEvent(e) {
  const spec = zoomSpec(e.significance);
  const style = spec.style;
  
  // Assign unique ID if not present
  if (e.id === undefined) e.id = Util.uuid();

  // Initialize tags selection
  if (!Array.isArray(e.tagIds)) e.tagIds = [];

  // Check 'include' flag if not present or no tags are selected (force visibility)
  if (e.include===undefined || e.tagIds.length===0) e.include = true;
  
  // Establish properties for positioning labels
  const parsed = parseLabel(e.label, e.thumbnail);
  e._labelSingle = parsed.singleRow;
  e._labelWidth = parsed.singleWidth;
  e._parsedLabel = parsed.multiRow;
  e._parsedWidth = parsed.multiWidth;
  e._parsedRows = parsed.multiRow[parsed.multiRow.length-1].row + 1;
  if (e.thumbnail && e._parsedRows < DRAW.THUMB_LABEL_ROWS) e._parsedRows = DRAW.THUMB_LABEL_ROWS;

  if (style === 'line') {
    // if switched from dot to line
    if (!e.dateFrom) e.dateFrom = {...e.date};
    if (!e.dateTo) e.dateTo = {...e.date};
    if (!e.fadeLeft) e.fadeLeft = {...e.dateFrom};
    if (!e.fadeRight) e.fadeRight = {...e.dateTo};

    // adjust timestamp to center of tick (assume prec="day" for now)
    //const msPerTick = tickSpec.get(e.date.prec).msPerTick;
    e._tFrom = e.dateFrom.ts + (tickSpec.get(e.dateFrom.prec).msPerTick * 0.5);
    e._tTo = e.dateTo.ts + (tickSpec.get(e.dateTo.prec).msPerTick * 0.5);
    e._fLeft = e.fadeLeft.ts + (tickSpec.get(e.fadeLeft.prec).msPerTick * 0.5);
    e._fRight = e.fadeRight.ts + (tickSpec.get(e.fadeRight.prec).msPerTick * 0.5);

    // sanity checks
    if (e._tTo < e._tFrom)    { e.dateTo = {...e.dateFrom};    e._tTo = e._tFrom; }
    if (e._fLeft > e._fRight) { e.fadeRight = {...e.fadeLeft}; e._fRight = e._fLeft; }
    if (e._fLeft > e._tTo)    { e.fadeLeft = {...e.dateTo};    e._fLeft = e._tTo; }
    if (e._fLeft < e._tFrom)  { e.fadeLeft = {...e.dateFrom};  e._fLeft = e._tFrom; }
    if (e._fRight < e._tFrom) { e.fadeRight = {...e.dateFrom}; e._fRight = e._tFrom; }
    if (e._fRight > e._tTo)   { e.fadeRight = {...e.dateTo};   e._fRight = e._tTo; }

    e._dateTime = (e._fRight + e._fLeft) / 2;
  
  } else {
    // if switched from line to dot
    if (!e.date) e.date = {...e.dateFrom}; // nothing fancy like finding middle of line vars...

    //convert to a small span in the middle of that day; extend all 'spanning' events to noon on either side
    const msPerTick = tickSpec.get(e.date.prec).msPerTick;
    e._dateTime = e.date.ts + Math.round(msPerTick * 0.5);  // (12 * h);
    e._tFrom = e._dateTime - Math.round(msPerTick * 0.4);  // (4 * h);
    e._tTo = e._dateTime + Math.round(msPerTick * 0.4);  // (4 * h);
    e._fLeft = e._tFrom + Math.round(msPerTick * 0.3);  // (3 * h);
    e._fRight = e._tTo - Math.round(msPerTick * 0.3);  // (3 * h);
  }
};

export function initializeTitle(tl) {
  // establish labelWidth
  const ctx = canvas.getContext('2d');
  ctx.font = TIME.TITLE_FONT;
  tl._labelWidth = ctx.measureText(tl.title).width;
}

export function initializeTag(tag) {
  // establish labelWidth
  const ctx = canvas.getContext('2d');
  ctx.font = TIME.TITLE_FONT;
  tag._labelWidth = ctx.measureText(tag.label).width;
}

export async function loadTimeline(file) {

  // if file does not include a slash ("/") then it's private, otherwise public
  const scope = file.includes('/') ? 'public' : 'private';  
  const tl = await getTimeline(scope, file);  // retrieve from storage

  if (tl.id === undefined) tl.id = Util.uuid();  // assign unique ID if not present
  const tlKey = JSON.stringify({  // id/scope necessary to distinguish private/public copies of same tl
    id: tl.id,
    scope: scope
  });
  tl._key = tlKey;
  tl._file = file,
  tl._scope = scope,
  tl._mode = 'view';
  initializeTitle(tl);

  if (tl.tags) tl.tags.forEach(initializeTag);
  
  for (const event of tl.events) {
    event._timeline = tl;
    initializeEvent(event);
  }

  timelineCache.set(tlKey, tl);

  return tl;
}

export function addNewTimeline(title) {
  // create blank timeline...
  const id = Util.uuid();
  const scope = "private";
  const tlKey = JSON.stringify({
    id:id, 
    scope:scope
  });
  const tl = {
    id:          id,
    title:       title, 
    details:     null, 
    events:      [],
    tags:        [],
    _key:        tlKey,
    _file:       null,
    _scope:      scope,
    _labelWidth: null,
    _mode:       'edit',
    _dirty:      true
  };
  initializeTitle(tl);
  timelineCache.set(tlKey, tl);

  // create view for timeline...
  const vw = {
    tlKey:     tl._key,
    file:      tl._file,
    scope:     tl._scope,
    tFrom:     null,
    tTo:       null,
    tagFilter: null,
    eventPos:  []
  }
  appState.views.push(vw);

  positionViews(false);
  draw(true);
}

export async function saveTimeline(tl)
{
  Util.showGlobalBusyCursor();
  try {
    const text = timelineString(tl);
    await saveTimelineToStorage("private", tl._file, text);
    tl._dirty = false;
  } catch (err) {
    console.error('Save failed:', err.message);
  }
  Util.hideGlobalBusyCursor();
}

export async function publishTimeline(tl)
{
  Util.showGlobalBusyCursor();
  try {
    const text = timelineString(tl);
    await saveTimelineToStorage("public", tl._file, text);
  } catch (err) {
    //await sleep(1200);  // simulate database access
    console.error('Publish failed:', err.message);
  }
  Util.hideGlobalBusyCursor();
}

export function closeTimeline(tlKey) {
  timelineCache.delete(tlKey);
}
