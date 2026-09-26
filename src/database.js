import * as Util from './util.js';
import {appState} from './canvas.js';

/******************* Utility functions *******************/

function formatURL(file, url, container, sasKey) {
  const base = url.replace(/\/+$/, '');
  const encodedFile = (file || '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  const sas = sasKey ? (sasKey.startsWith('?') ? sasKey : `?${sasKey}`) : '';
  
  return `${base}/${container}/${encodedFile}${sas}`;
}

async function gzipText(text) {
  const stream = new Blob([text], {
    type: 'application/json; charset=utf-8'
  }).stream();

  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  return await new Response(compressedStream).blob();
}


/******************* Instance configuration *******************/

export async function getConfiguration() {
  try {
    // fetch configuration settings from the server
    const res = await fetch('/api/getConfiguration');
    return await res.json();

  } catch (err) {
    return {environment: 'unknown'};
    //return {environment: 'unknown', canPublish: true, canUseThumbnails: true};
  }
}


/******************* Shared Access Signature (SAS) *******************/

async function acquireBlobSas(scope, filename, mode) {
  try {
    const url = `/api/getBlobSas?scope=${scope}&name=${encodeURIComponent(filename)}&mode=${mode}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {'Accept': 'application/json'}
    });

    const {sasUrl, sasKey, blobName} = await response.json();

    return {url:sasUrl, sasKey};

  } catch (err) {
    throw new Error(`Failed to aquire SAS token: ${err.message}`);
  }
}

/******************* Timeline management *******************/

export async function loadTimelineFromStorage(scope, file) {
  //Util.showGlobalBusyCursor();

  const isLocal = await Util.isLocalEnv();
  if (isLocal) return await tempSimulateLoadFile(scope, file);

  try {
    const filename = Util.addTimelineFileExt(file);

    // acquire SAS token
    const {url, sasKey} = await acquireBlobSas(scope, filename, "read");

    // fetch the blob
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch blob: ${resp.status} ${resp.statusText}`);
    const text = await resp.text();

    //Util.hideGlobalBusyCursor();
  
    // parse and return JSON
    return JSON.parse(text);

  } catch (e) {
    //Util.hideGlobalBusyCursor();
    console.error(`Failed to load ${file} from storage: ${e.message}`);
  }
}

export async function saveTimelineToStorage(scope, file, text) {
  try {
    const filename = Util.addTimelineFileExt(file);
    const gzBlob = await gzipText(text);  // compress it
    
    const {url, sasKey} = await acquireBlobSas(scope, filename, "write");

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Encoding': 'gzip'
      },
      body: gzBlob
    });

    /*
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: text
    });
    */

    if (!response.ok) throw new Error(`Failed to upload blob: ${response.status} ${response.statusText}`);
    return true;
  } catch (e) {
    throw new Error(`Failed to save ${filename} to storage: ${e.message}`);
  }
}

export async function publishTimelineToPublic(file) {
  const filename = Util.addTimelineFileExt(file);
  const resp = await fetch('/api/publishTimeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timelineFile: filename })
  });

  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

/******************* Timeline list *******************/

export async function getTimelineList(scope) {
  try {
    const url = "/api/listTimelines" + (scope === "public" ? "?public" : "");
    const response = await fetch(url);
    const {prefix, items} = await response.json();
    return items;

  } catch (err) {
    throw new Error(`Failed to aquire list of timelines: ${err.message}`);
  }
}

/******************* Item images (thumbnails) *******************/

function imageFileName(timelineFile, id) {
  return `${timelineFile}/${encodeURIComponent(id)}_thumb.webp`;
}

export async function saveImageToStorage(scope, timelineFile, id, blob) {
  try {
    const filename = imageFileName(timelineFile, id);
    const {url} = await acquireBlobSas(scope, filename, "write");

    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'image/webp'
      },
      body: blob
    });

    if (!resp.ok) throw new Error(`Failed to upload image blob: ${resp.status} ${resp.statusText}`);

    // Store this relative name in item.image.file, not the SAS URL.
    return filename;

  } catch (e) {
    throw new Error(`Failed to save item image for ${timelineFile}/${id}: ${e.message}`);
  }
}

export async function loadItemImageFromStorage(scope, imageFile) {
  try {
    if (!imageFile) return null;

    const {url} = await acquireBlobSas(scope, imageFile, "read");

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch image blob: ${resp.status} ${resp.statusText}`);

    return await resp.blob();

  } catch (e) {
    throw new Error(`Failed to load item image ${imageFile}: ${e.message}`);
  }
}

export async function deleteOrphanedImages(scope, file) {
  const filename = Util.addTimelineFileExt(file);
  const resp = await fetch('/api/deleteOrphanedImages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: scope, timelineFile: filename })
  });

  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}


/******************************* temp *******************************/

async function tempSimulateLoadFile(scope, file) {
  // return local file if running locally
  const response = (appState.mode==="embed") ? 
    await fetch(`../data/${file}.json.gz`) :    // only works when a local server is running  debug
    await fetch(`data/${file}.json.gz`);

  const tl = await response.json();

  await Util.sleep(350);  // simulate database access
  return tl;
}