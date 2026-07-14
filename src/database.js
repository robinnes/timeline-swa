import * as Util from './util.js';

/******************* Utility functions *******************/

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  // fetch configuration settings from the server
  const res = await fetch('/api/getConfiguration');
  if (!res.ok) return {environment: 'unknown'};
  
  return await res.json();
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

  if (Util.isLocalEnv) return await tempSimulateLoadFile(scope, file);

  try {
    const filename = Util.addTimelineFileExt(file);

    // acquire SAS token
    const {url, sasKey} = await acquireBlobSas(scope, filename, "read");

    // fetch the blob
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch blob: ${resp.status} ${resp.statusText}`);
    const text = await resp.text();

    // parse and return JSON
    return JSON.parse(text);

  } catch (e) {
    console.error(`Failed to load ${filename} from storage: ${e.message}`);
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

/*
export async function getTimeline(scope, file) {
  Util.showGlobalBusyCursor();
  try {
    // retrieve from Azure blob storage
    const tl = await loadTimelineFromStorage(scope, file);
    Util.hideGlobalBusyCursor();
    return tl;
    
  } catch (err) {
    if (Util.isLocalEnv) return tempSimulateLoadFile(scope, file);
    console.error(err);
  }
  Util.hideGlobalBusyCursor();
}
*/

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
  Util.showGlobalBusyCursor();
  try {
    const url = "/api/listTimelines" + (scope === "public" ? "?public" : "");
    const response = await fetch(url);
    const {prefix, items} = await response.json();
    Util.hideGlobalBusyCursor();
    return items;

  } catch (err) {
    Util.hideGlobalBusyCursor();
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
/*
export async function getItemImageUrl(scope, imageFile) {
  try {
    if (!imageFile) return null;

    const {url} = await acquireBlobSas(scope, imageFile, "read");

    // For <img src>, return the temporary browser-readable SAS URL.
    // Do not persist this value in JSON.
    return url;

  } catch (e) {
    throw new Error(`Failed to get item image URL ${imageFile}: ${e.message}`);
  }
}
*/
/*
export async function deleteItemImageFromStorage(scope, imageFile) {
  if (!imageFile) return false;

  const { url } = await acquireBlobSas(scope, imageFile, "delete");

  const resp = await fetch(url, { method: 'DELETE' });

  if (resp.status === 404) return false;
  if (!resp.ok) {
    throw new Error(`Failed to delete image blob: ${resp.status} ${resp.statusText}`);
  }
  return true;
}
*/

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
  const response = await fetch(`data/${file}.json.gz`);  // only works when a local server is running
  const tl = await response.json();

  await sleep(350);  // simulate database access
  return tl;
}