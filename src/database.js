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

/******************* Blob storage functions *******************/

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
    const {url, sasKey} = await acquireBlobSas(scope, file, "write");
  
    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: text
    });

    if (!resp.ok) throw new Error(`Failed to upload blob: ${resp.status} ${resp.statusText}`);
    return true;
  } catch (e) {
    throw new Error(`Failed to save ${file} to storage: ${e.message}`);
  }
}

export async function getTimeline(scope, file) {
  //const file = timelineID.file;
  //const scope = timelineID.scope;
  const storage = {scope:scope, file:file};

  Util.showGlobalBusyCursor();
  try {
    // retrieve from Azure blob storage
    const tl = await loadTimelineFromStorage(scope, file);
    //tl._storage = storage;
    Util.hideGlobalBusyCursor();
    return tl;
    
  } catch (err) {
    if (Util.isLocalEnv) {
      // return local file if running locally
      const response = await fetch(`data/${file}`);  // only works when a local server is running
      const tl = await response.json();
      //tl._storage = storage;
      await sleep(500);  // simulate database access
      Util.hideGlobalBusyCursor();
      return tl;
    }

    console.error(err);
  }
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

/******************* Item images *******************/

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
