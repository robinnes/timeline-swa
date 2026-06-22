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

/******************* Shared Access Signature (SAS) *******************/

async function acquireBlobSas(scope, file, mode) {
  try {
    const url = `/api/getBlobSas?scope=${scope}&name=${encodeURIComponent(file)}&mode=${mode}`;
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

async function loadTimelineFromStorage(scope, file) {
  try {
    // acquire SAS token
    const {url, sasKey} = await acquireBlobSas(scope, file, "read");
    //const blobUrl = formatURL(file, url, container, sasKey); 

    // fetch the blob
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch blob: ${resp.status} ${resp.statusText}`);
    const text = await resp.text();

    // parse and return JSON
    return JSON.parse(text);

  } catch (e) {
    throw new Error(`Failed to load ${file} from storage: ${e.message}`);
  }
}

export async function saveTimelineToStorage(scope, file, text) {
  try {
    const gzBlob = await gzipText(text);  // compress it
    
    const {url, sasKey} = await acquireBlobSas(scope, file, "write");

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
    throw new Error(`Failed to save ${file} to storage: ${e.message}`);
  }
}

export async function getTimeline(scope, file) {
  Util.showGlobalBusyCursor();
  try {
    // retrieve from Azure blob storage
    const tl = await loadTimelineFromStorage(scope, file);
    Util.hideGlobalBusyCursor();
    return tl;
    
  } catch (err) {
    if (Util.isLocalEnv) {
      // return local file if running locally
      const response = await fetch(`data/${file}`);  // only works when a local server is running
      const tl = await response.json();

      await sleep(500);  // simulate database access
      Util.hideGlobalBusyCursor();
      return tl;
    }

    console.error(err);
  }
}

export async function publishTimelineToPublic(file) {
  const resp = await fetch('/api/publishTimeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timelineFile: file })
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

function itemImageFile(timelineFile, itemId) {
  return `${Util.timelineStem(timelineFile)}/${encodeURIComponent(itemId)}_thumb.webp`;
}

export async function saveItemImageToStorage(scope, timelineFile, itemId, blob) {
  try {
    const file = itemImageFile(timelineFile, itemId);
    const {url} = await acquireBlobSas(scope, file, "write");

    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'image/webp'
      },
      body: blob
    });

    if (!resp.ok) throw new Error(`Failed to upload image blob: ${resp.status} ${resp.statusText}`);

    // Store this relative name in item.image.url, not the SAS URL.
    return file;

  } catch (e) {
    throw new Error(`Failed to save item image for ${timelineFile}/${itemId}: ${e.message}`);
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
async function deleteOrphanedImages(scope, file) {
  // to do: call API function that iterates item images in storage that no longer
  // have corresponding items in the timeline.
}