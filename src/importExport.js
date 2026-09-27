import * as Util from './util.js';
import {DRAW} from './constants.js';
import {loadItemImageFromStorage} from './database.js';
import {serializeCompoundDate, initializeTimeline, initializeView} from './timeline.js';
import {appState, timelineCache, draw} from './canvas.js';
import {positionViews} from './render.js';


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
