import * as Util from './util.js';
import * as Calendar from './calendar.js';
import {TIME, DRAW} from './constants.js';
import {appState, timelineCache, itemImageBlobCache, draw} from './canvas.js';
import {positionViews} from './render.js';
import {loadTimelineFromStorage, saveTimelineToStorage, saveImageToStorage, publishTimelineToPublic, deleteOrphanedImages, loadItemImageFromStorage} from './database.js';
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

function serializeImageForSave(image) {
  // saveTimeline will save to blob storage before the pending images are stripped away
  // ensure that _pendingData is not written blob storage
  if (!image) return image;

  const { _pendingData, ...persistedImage } = image;
  return persistedImage;
}

export function timelineString(tl) {
  // Additional properties have been added to the original timeline object;
  // reduce back to original form for export
  const txt = {
    id: tl.id,
    title: tl.title,
    details: tl.details,
    image: serializeImageForSave(tl.image),
    tags: tl.tags.map(({
      id, 
      label, 
      parentId, 
      order, 
      image,
      details}) => ({
      id,
      label,
      parentId,
      order,
      image: serializeImageForSave(image),
      details
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
        image: serializeImageForSave(item.image),
        tagIds: item.tagIds,
        include: item.include
      }
    })
  };
  return JSON.stringify(
    txt,
    (key, value) => value === null ? undefined : value,
    2
  );
}


/******************************* Initialization *******************************/

export function initializeItem(i) {

  // Initialize tags selection
  if (!Array.isArray(i.tagIds)) i.tagIds = [];

  // Check 'include' flag if not present or no tags are selected (force visibility)
  if (i.include===undefined || i.tagIds.length===0) i.include = true;
  
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
      delete i.dateFrom;
      delete i.dateTo;
      delete i.fadeLeft;
      delete i.fadeRight;
      delete i.colorLeft;
      delete i.colorRight;
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
      delete i.date;
    }

    i.dateFrom._mid = Math.round((i.dateFrom.ts + tickSpec.get(i.dateFrom.prec).step(i.dateFrom.ts, 1)) / 2);
    i.fadeLeft._mid = Math.round((i.fadeLeft.ts + tickSpec.get(i.fadeLeft.prec).step(i.fadeLeft.ts, 1)) / 2);
    i.fadeRight._mid = Math.round((i.fadeRight.ts + tickSpec.get(i.fadeRight.prec).step(i.fadeRight.ts, tickSpec.get(i.fadeRight.prec).inclusive ? 1 : -1)) / 2); 
    i.dateTo._mid = Math.round((i.dateTo.ts + tickSpec.get(i.dateTo.prec).step(i.dateTo.ts, tickSpec.get(i.dateTo.prec).inclusive ? 1 : -1)) / 2);

    i._tFrom = i.dateFrom.ts;
    i._fLeft = i.fadeLeft._mid;
    i._fRight = i.fadeRight._mid;
    i._tTo = tickSpec.get(i.dateTo.prec).inclusive ? tickSpec.get(i.dateTo.prec).step(i.dateTo.ts, 1) : i.dateTo.ts;

    i._date = Math.round((i._fLeft + i._fRight) / 2);
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

  const validTagIds = new Set(tl.tags.map(tag => tag.id));  // for use below

  //if (tl.tags) tl.tags.forEach(initializeTag);
  for (const tag of tl.tags) {
    tag._timeline = tl;
    initializeTag(tag);
  }
  
  for (const item of tl.items) {
    item._timeline = tl;

    // convert string dates loaded from storage to timestamps
    item.date = deserializeCompoundDate(item.date);
    item.dateFrom = deserializeCompoundDate(item.dateFrom);
    item.dateTo = deserializeCompoundDate(item.dateTo);
    item.fadeLeft = deserializeCompoundDate(item.fadeLeft);
    item.fadeRight = deserializeCompoundDate(item.fadeRight);

    initializeItem(item);

    // Remove tag references that do not correspond to a timeline tag
    item.tagIds = item.tagIds.filter(tagId => validTagIds.has(tagId));

    // If no valid tags remain, force the item into the base timeline
    if (item.tagIds.length === 0) item.include = true;
  }

}

export function initializeView(vw) {
  const itemPos = filteredItemsForView(vw);
  var tFrom, tTo;
  
  // determine tFrom/tTo for the view from filtered items
  itemPos.forEach(ip => {
    if (!tFrom || ip.item._tFrom < tFrom) tFrom = ip.item._tFrom;
    if (!tTo || ip.item._tTo > tTo) tTo = ip.item._tTo;
  });
  vw.tFrom = tFrom;
  vw.tTo = tTo;
  vw.itemPos = itemPos;
}

export function filteredItemsForView(vw) {
  // return filtered array of items according vw.tagFilters
  const tl = timelineCache.get(vw.tlKey);
  const tagFilter = vw.tagFilter;
  const items = tl.items;
  let itemPos = [];
  
  items.forEach(i => {
    // check item's tag assignments (allow all if !tagFilter)
    if ((!tagFilter && i.include) || i.tagIds.includes(tagFilter)) {
      itemPos.push({
        item:   i,
        yPos: vw.yPos,      // for convenience
        yOffset: null       // the item label's distance from the view's y value (vw.yPos)
      })
    }
  });
  return itemPos;
}


/******************************* Timeline management *******************************/

export async function loadTimeline(file) {
  // if file does not include a slash ("/") then it's private, otherwise public
  const scope = file.includes('/') ? 'public' : 'private';  
  
  Util.showGlobalBusyCursor();
  const tl = await loadTimelineFromStorage(scope, file);  // retrieve from storage
  Util.hideGlobalBusyCursor();

  if (!tl) return;

  if (tl.id === undefined) tl.id = Util.uuid();  // assign unique ID if not present
  tl._file = (file.endsWith('.json')) ? `${file}.gz` : file;
  tl._scope = scope;
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

export async function saveTimeline(tl) {
  Util.showGlobalBusyCursor();
  try {
    await savePendingImages(tl);

    const text = timelineString(tl);
    await saveTimelineToStorage("private", tl._file, text);

    await deleteOrphanedImages("private", tl._file);

    clearPendingImageData(tl);

    tl._dirty = false;

  } catch (err) {
    console.error('Save failed:', err.message);
  } finally {
    Util.hideGlobalBusyCursor();
  }
}

export async function publishTimeline(tl) {
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


/******************************* Images *******************************/

async function savePendingImages(tl) {

  const subjects = [
    tl,
    ...tl.tags,
    ...tl.items
  ];

  for (const subject of subjects) {

    if (!subject.image?._pendingData) continue;

    const imageId =
      subject === tl
        ? 'timeline'
        : subject.id;

    // Convert the persisted data URL back into a Blob
    const response = await fetch(subject.image._pendingData);
    const blob = await response.blob();

    await saveImageToStorage(
      tl._scope,
      tl._file,
      imageId,
      blob
    );

    // Ensure the permanent image reference is present
    subject.image.file = `${imageId}_thumb.webp`;
  }
}

function clearPendingImageData(tl) {

  const subjects = [
    tl,
    ...tl.tags,
    ...tl.items
  ];

  for (const subject of subjects) {
    if (subject.image) {
      delete subject.image._pendingData;
    }
  }
}


/******************************* Export timeline *******************************/

export async function exportTimeline(tl) {

  if (!tl) return;

  Util.showGlobalBusyCursor();

  try {
    const text = await timelineExportString(tl);

    const blob = new Blob(
      [text],
      { type: 'application/json;charset=utf-8' }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = exportTimelineFilename(tl);

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 0);  // don't revoke object URL synchronously; this is safer

  } catch (err) {
    console.error('Export failed:', err);

  } finally {
    Util.hideGlobalBusyCursor();
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(blob);
  });
}

async function serializeImageForExport(subject, tl) {

  if (!subject?.image) return undefined;

  let fullSizeData;

  if (subject.image._pendingData) {
    // Newly selected/replaced image that hasn't been saved yet
    fullSizeData = subject.image._pendingData;

  } else if (subject.image.file) {
    // Existing saved image
    const imageFile = `${tl._file}/${subject.image.file}`;

    const blob = await loadItemImageFromStorage(
      tl._scope,
      imageFile
    );

    if (blob) {
      fullSizeData = await blobToDataUrl(blob);
    }
  }

  return fullSizeData
    ? { thumbnail: fullSizeData }
    : undefined;
}

async function timelineExportString(tl) {

  const tags = await Promise.all(
    tl.tags.map(async tag => ({
      id: tag.id,
      label: tag.label,
      parentId: tag.parentId,
      order: tag.order,
      image: await serializeImageForExport(tag, tl),
      details: tag.details
    }))
  );

  const items = await Promise.all(
    tl.items.map(async item => ({
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
      image: await serializeImageForExport(item, tl),
      tagIds: item.tagIds,
      include: item.include
    }))
  );

  const txt = {
    openTL: {
      format: "timeline",
      version: 1
    },
    id: tl.id,
    title: tl.title,
    details: tl.details,
    image: await serializeImageForExport(tl, tl),
    tags,
    items
  };

  return JSON.stringify(
    txt,
    (key, value) => value === null ? undefined : value,
    2
  );
}

function exportTimelineFilename(tl) {

  let name = tl._file;

  if (name) {
    // Public files may contain a username/path
    name = name.split('/').pop();

    // Remove the storage extensions
    name = name
      .replace(/\.json\.gz$/i, '')
      .replace(/\.json$/i, '')
      .replace(/\.gz$/i, '');
  } else {
    name = tl.title || 'timeline';
  }

  // Remove characters that are troublesome in filenames
  name = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();

  if (!name) name = 'timeline';

  return `${name}.json`;
}


/******************************* Export view *******************************/

export async function exportView(vw) {

  if (!vw) return;

  const tl = timelineCache.get(vw.tlKey);
  if (!tl) return;

  Util.showGlobalBusyCursor();

  try {
    const text = await viewExportString(vw, tl);

    const blob = new Blob(
      [text],
      { type: 'application/json;charset=utf-8' }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = exportViewFilename(vw, tl);

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 0);

  } catch (err) {
    console.error('View export failed:', err);

  } finally {
    Util.hideGlobalBusyCursor();
  }
}

async function viewExportString(vw, tl) {

  const tag = vw.tagFilter
    ? tl.tags.find(t => t.id === vw.tagFilter)
    : null;

  const sourceItems = tl.items.filter(item => {
    if (vw.tagFilter) {
      return item.tagIds.includes(vw.tagFilter);
    }
    return item.include;
  });

  const items = await Promise.all(
    sourceItems.map(async item => ({
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
      image: await serializeImageForExport(item, tl),

      // A view export becomes an independent timeline.
      // Do not preserve the source timeline's tag relationships.
      tags: [],
      include: true
    }))
  );

  const subject = tag ?? tl;

  const txt = {
    openTL: {
      format: "timeline",
      version: 1
    },

    // No timeline ID. Importing this as a new timeline should
    // cause OpenTL to assign its own identity.
    title: subject.label ?? tl.title,
    details: subject.details ?? tl.details,
    image: await serializeImageForExport(subject, tl),

    // Views deliberately do not carry tag definitions.
    tags: [],

    items
  };

  return JSON.stringify(
    txt,
    (key, value) => value === null ? undefined : value,
    2
  );
}

function exportViewFilename(vw, tl) {

  const tag = vw.tagFilter
    ? tl.tags.find(t => t.id === vw.tagFilter)
    : null;

  let name = tag?.label ?? tl.title ?? 'timeline';

  name = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim();

  if (!name) name = 'timeline';

  return `${name}.json`;
}


/******************************* Import timeline *******************************/

export async function importTimeline(tl) {

  if (!tl) return false;

  try {
    const file = await selectTimelineImportFile();
    if (!file) return false;  // user cancelled

    Util.showGlobalBusyCursor();

    const text = await file.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("The selected file is not valid JSON.");
    }

    validateTimelineImport(data);

    /*
     * Treat a completely empty timeline as the destination for the
     * imported timeline. Otherwise merge the imported material into
     * the existing timeline.
     */
    const isEmpty =
      tl.items.length === 0 &&
      tl.tags.length === 0;

    await mergeImportedTimeline(tl, data, isEmpty);

    /*
     * Reinitialize the timeline because imported dates are strings,
     * labels need measuring, and _timeline references need establishing.
     */
    initializeTimeline(tl);

    /*
     * Existing views reference the same timeline object/key, so rebuild
     * their item positions after adding the imported material.
     */
    for (const vw of appState.views) {
      if (vw.tlKey === tl._key) {
        initializeView(vw);
      }
    }

    tl._dirty = true;

    positionViews(false);
    draw(true);

    return true;

  } catch (err) {
    console.error("Import failed:", err);
    alert(`Import failed: ${err.message}`);
    return false;

  } finally {
    Util.hideGlobalBusyCursor();
  }
}

function selectTimelineImportFile() {

  return new Promise(resolve => {

    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".json,application/json";
    input.hidden = true;

    document.body.appendChild(input);

    function finish(file) {
      input.remove();
      resolve(file);
    }

    input.addEventListener("change", () => {
      finish(input.files?.[0] ?? null);
    }, { once: true });

    input.addEventListener("cancel", () => {
      finish(null);
    }, { once: true });

    input.click();
  });
}

function validateImportedTags(data) {

  const tags = data.tags ?? [];

  // IDs, when supplied, must always be unique.
  const ids = new Set();

  for (const tag of tags) {
    if (!tag.id) continue;

    if (ids.has(tag.id)) {
      throw new Error(`Duplicate tag ID: "${tag.id}".`);
    }

    ids.add(tag.id);
  }

  // Labels only have to be unique if the import actually uses
  // labels to identify tags.
  const usesTagLabels =
    tags.some(tag => tag.parent) ||
    (data.items ?? []).some(item => Array.isArray(item.tags));

  if (usesTagLabels) {
    const labels = new Set();

    for (const tag of tags) {
      if (labels.has(tag.label)) {
        throw new Error(
          `Duplicate tag label "${tag.label}" is ambiguous because this file uses tag labels for relationships.`
        );
      }

      labels.add(tag.label);
    }
  }
}

function validateTimelineImport(data) {

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The file does not contain an OpenTL timeline.");
  }

  /*
   * If an OpenTL format marker is present, it must be one we understand.
   *
   * The marker is not mandatory here so that AI-generated timeline files
   * can remain relatively easy to produce.
   */
  if (data.openTL) {
    if (data.openTL.format !== "timeline") {
      throw new Error(
        `Unsupported OpenTL format: ${data.openTL.format ?? "unknown"}.`
      );
    }

    if (data.openTL.version !== 1) {
      throw new Error(
        `Unsupported OpenTL timeline version: ${data.openTL.version ?? "unknown"}.`
      );
    }
  }

  if (!Array.isArray(data.items)) {
    throw new Error('The timeline must contain an "items" array.');
  }

  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    throw new Error('"tags" must be an array.');
  }

  /*
   * Labels are portable tag identifiers, so they must be unique
   * within the imported file.
   *
  
  const labels = new Set();

  for (const tag of data.tags ?? []) {

    if (!tag || typeof tag !== "object") {
      throw new Error("Invalid tag definition.");
    }

    const label = tag.label?.trim();

    if (!label) {
      throw new Error("Every imported tag must have a label.");
    }

    if (labels.has(label)) {
      throw new Error(
        `Duplicate tag label "${label}". Imported tag labels must be unique.`
      );
    }

    labels.add(label);
  } */

  validateImportedTags(data);

  for (const item of data.items) {

    if (!item || typeof item !== "object") {
      throw new Error("Invalid item definition.");
    }

    if (!item.label) {
      throw new Error("Every imported item must have a label.");
    }
  }
}

async function mergeImportedTimeline(tl, data, isEmpty) {

  const importedTags = data.tags ?? [];
  const importedItems = data.items ?? [];

  /*
   * Preserve existing IDs where possible, but never permit an imported
   * entity to collide with something already in the destination.
   */
  const usedTagIds = new Set(
    tl.tags
      .map(tag => tag.id)
      .filter(Boolean)
  );

  const usedItemIds = new Set(
    tl.items
      .map(item => item.id)
      .filter(Boolean)
  );

  /*
   * These maps translate portable relationships into OpenTL's internal
   * ID-based representation.
   *
   * label -> new/internal ID handles the portable V1 format.
   * old ID -> new/internal ID also allows files produced by the current
   * exporter, which still contains parentId/tagIds relationships.
   */
  const tagIdByLabel = new Map();
  const importedTagIdMap = new Map();

  let importTag = null;

  if (!isEmpty) {

    importTag = {
      id: uniqueImportedId(null, usedTagIds),
      label: importedTagLabel(),
      parentId: null,
      order: nextRootTagOrder(tl),
      image: null,
      details: null
    };

    usedTagIds.add(importTag.id);
    tl.tags.push(importTag);
  }


  /*
   * First pass: create every imported tag and assign its ID.
   * Parent relationships are resolved in a second pass so tag ordering
   * in the JSON file doesn't matter.
   */
  const newTags = [];

  for (let index = 0; index < importedTags.length; index++) {

    const source = importedTags[index];

    const id = uniqueImportedId(
      source.id,
      usedTagIds
    );

    usedTagIds.add(id);

    const tag = {
      id,
      label: source.label.trim(),
      parentId: null,
      order: source.order ?? index,
      details: source.details ?? null
    };

    if (!tagIdByLabel.has(tag.label)) {
      tagIdByLabel.set(tag.label, id);
    } else {
      // A null value means this label is ambiguous.
      tagIdByLabel.set(tag.label, null);
    }

    if (source.id) {
      importedTagIdMap.set(source.id, id);
    }

    tag.image = await deserializeImportedImage(
      source.image,
      id
    );

    newTags.push({
      source,
      tag
    });
  }


  /*
   * Second pass: resolve parent relationships.
   *
   * Preferred portable representation:
   *
   *   parent: "Politics"
   *
   * Current OpenTL exports still use:
   *
   *   parentId: "..."
   *
   * Supporting both here makes the importer forward-compatible with
   * the portable format we've defined and backward-compatible with
   * files currently exported by OpenTL.
   */
  for (const { source, tag } of newTags) {

    if (source.parent) {

      const parentId = tagIdByLabel.get(source.parent);

      if (!parentId) {
        throw new Error(
          `Tag "${tag.label}" refers to unknown parent "${source.parent}".`
        );
      }

      tag.parentId = parentId;

    } else if (source.parentId) {

        const parentId = importedTagIdMap.get(source.parentId);

        if (!parentId) {
          throw new Error(
            `Tag "${tag.label}" refers to unknown parent ID "${source.parentId}".`
          );
        }

        tag.parentId = parentId;

    } else if (source.parent) {

      if (!tagIdByLabel.has(source.parent)) {
        throw new Error(
          `Tag "${tag.label}" refers to unknown parent "${source.parent}".`
        );
      }

      const parentId = tagIdByLabel.get(source.parent);

      if (!parentId) {
        throw new Error(
          `Tag "${tag.label}" refers to ambiguous parent label "${source.parent}".`
        );
      }

      tag.parentId = parentId;

    } else {

      tag.parentId = importTag?.id ?? null;
    }
  }

  for (const { tag } of newTags) {
    tl.tags.push(tag);
  }


  /*
   * If the destination is empty, the imported timeline metadata becomes
   * its metadata. We deliberately retain tl.id: the blank timeline is the
   * destination object and may already have views/cache entries referring
   * to its identity.
   */
  if (isEmpty) {

    if (data.title !== undefined) {
      tl.title = data.title;
    }

    if (data.details !== undefined) {
      tl.details = data.details;
    }

    if (data.image?.thumbnail) {
      tl.image = await deserializeImportedImage(
        data.image,
        "timeline"
      );
    } else {
      tl.image = null;
    }
  }


  for (const source of importedItems) {

    const id = uniqueImportedId(
      source.id,
      usedItemIds
    );

    usedItemIds.add(id);

    const tagIds = resolveImportedItemTags(
      source,
      tagIdByLabel,
      importedTagIdMap
    );

    /*
     * Every item merged into an existing timeline is also explicitly
     * associated with the generated Imported... tag.
     */
    if (importTag && !tagIds.includes(importTag.id)) {
      tagIds.push(importTag.id);
    }

    const item = {
      id,

      itemType:
        source.itemType ?? "event",

      dateSpecification:
        source.dateSpecification ??
        (source.dateFrom || source.dateTo ? "range" : "point"),

      prominence:
        source.prominence ?? 3,

      label:
        source.label,

      date:
        source.date,

      dateFrom:
        source.dateFrom,

      dateTo:
        source.dateTo,

      fadeLeft:
        source.fadeLeft,

      fadeRight:
        source.fadeRight,

      color:
        source.color,

      colorLeft:
        source.colorLeft,

      colorRight:
        source.colorRight,

      details:
        source.details ?? null,

      tagIds,

      /*
       * An imported standalone/view timeline should appear normally.
       *
       * When merging into an existing timeline, keep the imported material
       * out of the base view initially; its Imported... tag provides an
       * immediate view of the entire imported set.
       */
      include:
        isEmpty
          ? (source.include ?? true)
          : false
    };

    item.image = await deserializeImportedImage(
      source.image,
      id
    );

    tl.items.push(item);
  }
}

function resolveImportedItemTags(item, tagIdByLabel, importedTagIdMap) {
  const result = [];

  /*
   * ID-based relationships are authoritative when present.
   *
   * This permits duplicate tag labels because each tag is identified
   * unambiguously by its source ID.
   */
  if (Array.isArray(item.tagIds)) {

    for (const sourceId of item.tagIds) {

      const id = importedTagIdMap.get(sourceId);

      if (!id) {
        throw new Error(
          `Item "${item.label}" refers to unknown tag ID "${sourceId}".`
        );
      }

      if (!result.includes(id)) {
        result.push(id);
      }
    }

    return result;
  }

  /*
   * Portable/AI-generated representation:
   *
   *   "tags": ["Politics", "Paris"]
   *
   * Labels can be used only when they identify exactly one imported tag.
   */
  if (Array.isArray(item.tags)) {

    for (const label of item.tags) {

      if (!tagIdByLabel.has(label)) {
        throw new Error(
          `Item "${item.label}" refers to unknown tag "${label}".`
        );
      }

      const id = tagIdByLabel.get(label);

      if (!id) {
        throw new Error(
          `Item "${item.label}" refers to ambiguous tag label "${label}".`
        );
      }

      if (!result.includes(id)) {
        result.push(id);
      }
    }
  }

  return result;
}

function uniqueImportedId(requestedId, usedIds) {

  if (requestedId && !usedIds.has(requestedId)) {
    return requestedId;
  }

  let id;

  do {
    id = Util.uuid();
  } while (usedIds.has(id));

  return id;
}

function importedTagLabel() {

  const now = new Date();

  const stamp = now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit"
  });

  return `Imported ${stamp}`;
}

function nextRootTagOrder(tl) {

  const rootTags = tl.tags.filter(
    tag => !tag.parentId
  );

  if (rootTags.length === 0) return 0;

  return Math.max(
    ...rootTags.map(tag => tag.order ?? 0)
  ) + 1;
}

/*
 * Portable images contain the full-sized image as image.thumbnail.
 *
 * Internally OpenTL needs:
 *
 *   thumbnail     small image used on the canvas
 *   file          eventual blob filename
 *   _pendingData  full-sized image waiting to be committed
 *
 * Nothing is written to Blob Storage here.
 */
async function deserializeImportedImage(image, imageId) {

  const fullSizeData = image?.thumbnail;

  if (!fullSizeData) {
    return undefined;
  }

  if (
    typeof fullSizeData !== "string" ||
    !/^data:image\/(?:webp|png|jpeg);base64,/i.test(fullSizeData)
  ) {
    throw new Error("An imported image contains invalid image data.");
  }

  const thumbnail = await resizeImportedImage(
    fullSizeData,
    DRAW.THUMB_LABEL_SIZE,
    DRAW.THUMB_LABEL_SIZE
  );

  return {
    thumbnail,
    file: `${imageId}_thumb.webp`,
    _pendingData: fullSizeData
  };
}

function resizeImportedImage(dataUrl, width, height) {

  return new Promise((resolve, reject) => {

    const img = new Image();

    img.onload = () => {

      try {
        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        resolve(
          canvas.toDataURL("image/webp", 0.9)
        );

      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(
        new Error("An imported image could not be decoded.")
      );
    };

    img.src = dataUrl;
  });
}