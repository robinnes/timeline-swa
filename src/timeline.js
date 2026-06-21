import * as Util from './util.js';
import * as Calendar from './calendar.js';
import {TIME, DRAW} from './constants.js';
import {appState, timelineCache, itemImageBlobCache, draw} from './canvas.js';
import {positionViews} from './render.js';
import {getTimeline, saveTimelineToStorage, publishTimelineToPublic} from './database.js';
import {parseLabel} from './label.js';
import {tickSpec} from './ticks.js';
import {clearCachedImagesForTimeline} from './image.js';

/******************************* Serialization *******************************/

function serializeCompoundDate(d) {
  if (!d) return d;
  return {
    ts: typeof d.ts === 'number' ? Calendar.tsToIsoString(d.ts) : d.ts,
    prec: d.prec
  };
}

function deserializeCompoundDate(d) {
  if (!d) return d;
  return {
    ...d,
    ts: typeof d.ts === 'string' ? Calendar.isoStringToTs(d.ts) : d.ts
  };
}

export function timelineString(tl) {
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
      if (item.date) {
        return {
          id: item.id,
          itemType: item.itemType,
          dateSpecification: item.dateSpecification,
          prominence: item.prominence,
          label: item.label,
          date: serializeCompoundDate(item.date),
          color: item.color,
          details: item.details,
          image: item.image,
          tagIds: item.tagIds,
          include: item.include
        } 
      } else {
        return {
          id: item.id,
          itemType: item.itemType,
          dateSpecification: item.dateSpecification,
          prominence: item.prominence,
          label: item.label,
          dateFrom: serializeCompoundDate(item.dateFrom),
          dateTo: serializeCompoundDate(item.dateTo),
          fadeLeft: serializeCompoundDate(item.fadeLeft),
          fadeRight: serializeCompoundDate(item.fadeRight),
          color: item.color,
          colorLeft: item.colorLeft,
          colorRight: item.colorRight,
          details: item.details,
          image: item.image,
          tagIds: item.tagIds,
          include: item.include
        }
      }
    })
  };
  return JSON.stringify(txt, null, 2);
}

/******************************* Initialization *******************************/

export function initializeItem(i) {

  // Initialize tags selection
  if (!Array.isArray(i.tagIds)) i.tagIds = [];

  // Check 'include' flag if not present or no tags are selected (force visibility)
  if (i.include===undefined || i.tagIds.length===0) i.include = true;
  
  if (i.thumbnail) i.image = {thumbnail: i.thumbnail};  // backward compatibility

  // Establish properties for positioning labels
  const thumbnail = !!i?.image?.thumbnail;  // whether i has an image.thumbnail
  const parsed = parseLabel(i.label, thumbnail);
  i._labelSingle = parsed.singleRow;
  i._labelWidth = parsed.singleWidth;
  i._parsedLabel = parsed.multiRow;
  i._parsedWidth = parsed.multiWidth;
  i._parsedRows = parsed.multiRow[parsed.multiRow.length-1].row + 1;
  if (thumbnail && i._parsedRows < DRAW.THUMB_LABEL_ROWS) i._parsedRows = DRAW.THUMB_LABEL_ROWS;

  // Resolve single date vs date range
  if (i.dateSpecification === 'point') {
    if (!i.date) {  // switched from line to dot
      i.date = {...i.dateFrom};  
      i.dateFrom = null;
      i.dateTo = null;
      i.fadeLeft = null;
      i.fadeRight = null;
    }

    // derived attributes for rendering
    const msPerTick = tickSpec.get(i.date.prec).msPerTick;
    i._date = i.date.ts + Math.round(msPerTick * 0.5);
    
    i._tFrom = i.date.ts;
    i._tTo = tickSpec.get(i.date.prec).step(i.date.ts, 1)
    i._fLeft = i._tFrom + Math.round(msPerTick * 0.35);
    i._fRight = i._tTo - Math.round(msPerTick * 0.35);
    i.date._mid = Math.round((i._tFrom + i._tTo) / 2);
    i._date = i.date._mid;

  } else {
    if (i.date) { // switched from dot to line
      i.dateFrom = {...i.date};
      i.fadeLeft = {...i.date};
      i.dateTo = tickSpec.get(i.date.prec).inclusive ? {...i.date} : {ts:tickSpec.get(i.dateFrom.prec).step(i.dateFrom.ts, 1), prec:i.dateFrom.prec};
      i.fadeRight = {...i.dateTo};
      i.date = null;
    }

    i.dateFrom._mid = Math.round((i.dateFrom.ts + tickSpec.get(i.dateFrom.prec).step(i.dateFrom.ts, 1)) / 2);
    i.fadeLeft._mid = Math.round((i.fadeLeft.ts + tickSpec.get(i.fadeLeft.prec).step(i.fadeLeft.ts, 1)) / 2);
    i.fadeRight._mid = Math.round((i.fadeRight.ts + tickSpec.get(i.fadeRight.prec).step(i.fadeRight.ts, tickSpec.get(i.fadeRight.prec).inclusive ? 1 : -1)) / 2); 
    i.dateTo._mid = Math.round((i.dateTo.ts + tickSpec.get(i.dateTo.prec).step(i.dateTo.ts, tickSpec.get(i.dateTo.prec).inclusive ? 1 : -1)) / 2);

    i._tFrom = i.dateFrom.ts;
    i._fLeft = i.fadeLeft._mid;
    i._fRight = i.fadeRight._mid;
    i._tTo = tickSpec.get(i.dateTo.prec).inclusive ? tickSpec.get(i.dateTo.prec).step(i.dateTo.ts, 1) : i.dateTo.ts;

    i._date = Math.round((i._tFrom + i._tTo) / 2);
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

export function initializeTimeline(tl) {

  const tlKey = JSON.stringify({  // id/scope necessary to distinguish private/public copies of same tl
    id: tl.id,
    scope: tl._scope
  });
  tl._key = tlKey;

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

}

/******************************* Timeline management *******************************/

export async function loadTimeline(file) {

  // if file does not include a slash ("/") then it's private, otherwise public
  const scope = file.includes('/') ? 'public' : 'private';  
  const tl = await getTimeline(scope, file);  // retrieve from storage

  if (tl.id === undefined) tl.id = Util.uuid();  // assign unique ID if not present
  tl._file = file,
  tl._scope = scope,
  tl._mode = 'view';

  initializeTimeline(tl);

  timelineCache.set(tl._key, tl);

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
    await publishTimelineToPublic(tl._file);
  } catch (err) {
    console.error('Publish failed:', err.message);
  }
  Util.hideGlobalBusyCursor();
}

export function closeTimeline(tlKey) {
  const tl = timelineCache.get(tlKey);
  if (!tl) return;

  clearCachedImagesForTimeline(tl);

  timelineCache.delete(tlKey);
}

