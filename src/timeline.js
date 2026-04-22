import * as Util from './util.js';
import * as Calendar from './calendar.js';
import {TIME, DRAW} from './constants.js';
import {appState, timelineCache, draw} from './canvas.js';
import {positionViews} from './render.js';
import {getTimeline, saveTimelineToStorage} from './database.js';
import {parseLabel} from './label.js';
import {tickSpec} from './ticks.js';

function serializeCompoundDate(d) {
  if (!d) return d;
  return {
    ...d,
    ts: typeof d.ts === 'number' ? Calendar.tsToIsoString(d.ts) : d.ts
  };
}

function deserializeCompoundDate(d) {
  if (!d) return d;
  return {
    ...d,
    ts: typeof d.ts === 'string' ? Calendar.isoStringToTs(d.ts) : d.ts
  };
}
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
    items: tl.items.map(item => {
      return {
        id: item.id,
        itemType: item.itemType,
        dateSpecification: item.dateSpecification,
        prominence: item.prominence,
        label: item.label,
        date: serializeCompoundDate(item.date),
        dateFrom: serializeCompoundDate(item.dateFrom),
        dateTo: serializeCompoundDate(item.dateTo),
        fadeLeft: serializeCompoundDate(item.fadeLeft),
        fadeRight: serializeCompoundDate(item.fadeRight),
        color: item.color,
        colorLeft: item.colorLeft,
        colorRight: item.colorRight,
        details: item.details,
        thumbnail: item.thumbnail,
        tagIds: item.tagIds,
        include: item.include
      }
    })
/*
    items: tl.items.map((
      {
        id, 
        itemType,
        dateSpecification,
        prominence,
        label,
        date,
        dateFrom,
        dateTo,
        fadeLeft,
        fadeRight,
        color,
        colorLeft,
        colorRight,
        details,
        thumbnail,
        tagIds,
        include
      }) => (
      {
        id,
        itemType,
        dateSpecification,
        prominence,
        label,
        date,
        dateFrom,
        dateTo,
        fadeLeft,
        fadeRight,
        color,
        colorLeft,
        colorRight,
        details,
        thumbnail,
        tagIds,
        include
      }))
*/
  };
  return JSON.stringify(txt, null, 2);
}

export function initializeItem(i) {

  /*
  // backward compatibility
   if (!i.itemType) {
    let p = i.prominence;
    i.itemType = p <= 3 ? 'event' : 'period';
    i.dateSpecification = i.itemType==='event' ? 'point' : 'range';
    i.prominence = i.itemType==='event' ? p + 1 : (p - 3) + 1;
  }

  // Assign unique ID if not present
  if (i.id === undefined) i.id = Util.uuid();
  */

  // Initialize tags selection
  if (!Array.isArray(i.tagIds)) i.tagIds = [];

  // Check 'include' flag if not present or no tags are selected (force visibility)
  if (i.include===undefined || i.tagIds.length===0) i.include = true;
  
  // Establish properties for positioning labels
  const parsed = parseLabel(i.label, i.thumbnail);
  i._labelSingle = parsed.singleRow;
  i._labelWidth = parsed.singleWidth;
  i._parsedLabel = parsed.multiRow;
  i._parsedWidth = parsed.multiWidth;
  i._parsedRows = parsed.multiRow[parsed.multiRow.length-1].row + 1;
  if (i.thumbnail && i._parsedRows < DRAW.THUMB_LABEL_ROWS) i._parsedRows = DRAW.THUMB_LABEL_ROWS;


  // Resolve single date vs date range
  if (i.dateSpecification === 'point') {
    if (!i.date) i.date = {...i.dateFrom};  // switched from line to dot
    i.dateFrom = null;
    i.dateTo = null;
    i.fadeLeft = null;
    i.fadeRight = null;
  } else {
    // switched from dot to line
    if (!i.dateFrom ) i.dateFrom = {...i.date};
    if (!i.dateTo) i.dateTo = {...i.date};
    if (!i.fadeLeft) i.fadeLeft = {...i.dateFrom};
    if (!i.fadeRight) i.fadeRight = {...i.dateTo};
    i.date = null;
  }

  /*
  // Convert ISO representations of dates to timestamps if necessary
  if (typeof i.date?.ts == 'string') i.date.ts = Calendar.ISOStringToTs(i.date.ts);
  if (typeof i.dateFrom?.ts == 'string') i.dateFrom.ts = Calendar.ISOStringToTs(i.dateFrom.ts);
  if (typeof i.dateTo?.ts == 'string') i.dateTo.ts = Calendar.ISOStringToTs(i.dateTo.ts);
  if (typeof i.fadeLeft?.ts == 'string') i.fadeLeft.ts = Calendar.ISOStringToTs(i.fadeLeft.ts);
  if (typeof i.fadeRight?.ts == 'string') i.fadeRight.ts = Calendar.ISOStringToTs(i.fadeRight.ts);
  */

  // Assign properties for rendering based on the dates
  if (i.dateSpecification === 'point') {
//i.date.ts = Calendar.ISOStringToTs(i.date.ts);  ////1735689600000
//console.log(new Date(i.date.ts).toISOString().replace(/\.\d{3}Z$/, 'Z'));
    //convert to a small span in the middle of that day; extend all 'spanning' items to noon on either side
    const msPerTick = tickSpec.get(i.date.prec).msPerTick;
    i._dateTime = i.date.ts + Math.round(msPerTick * 0.5);
    i._tFrom = i._dateTime - Math.round(msPerTick * 0.5);
    i._tTo = i._dateTime + Math.round(msPerTick * 0.5);
    i._fLeft = i._tFrom + Math.round(msPerTick * 0.35);
    i._fRight = i._tTo - Math.round(msPerTick * 0.35);

  } else {

    // sanity checks
    if (i.dateTo.ts < i.dateFrom.ts)    i.dateTo = {...i.dateFrom};
    if (i.fadeLeft.ts > i.fadeRight.ts) i.fadeRight = {...i.fadeLeft};
    if (i.fadeLeft.ts > i.dateTo.ts)    i.fadeLeft = {...i.dateTo};
    if (i.fadeLeft.ts < i.dateFrom.ts)  i.fadeLeft = {...i.dateFrom};
    if (i.fadeRight.ts < i.dateFrom.ts) i.fadeRight = {...i.dateFrom};
    if (i.fadeRight.ts > i.dateTo.ts)   i.fadeRight = {...i.dateTo};   

    // assign derived attributes for rendering
    i._dateFrom = i.dateFrom.ts + Math.round(tickSpec.get(i.dateFrom.prec).msPerTick * 0.5);
    i._tFrom = i.dateFrom.ts;
    i._fLeft = i.fadeLeft.ts + (tickSpec.get(i.fadeLeft.prec).msPerTick * 0.5);
    i._dateTo = i.dateTo.ts + Math.round( tickSpec.get(i.dateTo.prec).msPerTick * 0.5);
    i._tTo = tickSpec.get(i.dateTo.prec).step(i.dateTo.ts, 1);  // can't just add msPerTick
    i._fRight = i.fadeRight.ts + (tickSpec.get(i.fadeRight.prec).msPerTick * 0.5);

    i._dateTime = (i._tFrom + i._tTo) / 2;
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
  
  for (const item of tl.items) {
    // convert string dates loaded from storage to timestamps
    item.date = deserializeCompoundDate(item.date);
    item.dateFrom = deserializeCompoundDate(item.dateFrom);
    item.dateTo = deserializeCompoundDate(item.dateTo);
    item.fadeLeft = deserializeCompoundDate(item.fadeLeft);
    item.fadeRight = deserializeCompoundDate(item.fadeRight);

    item._timeline = tl;
    initializeItem(item);
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
    items:      [],
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
    itemPos:  []
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
