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

async function acquireSasToken() {
  try {
    const response = await fetch("/api/credentials");
    const {url, sasKey} = await response.json();
    return {url, sasKey};

  } catch (err) {
    throw new Error(`Failed to aquire SAS token: ${err.message}`);
  }
}

async function loadTimelineFromStorage(container, file) {
  try {
    // acquire SAS token
    const {url, sasKey} = await acquireSasToken();
    const blobUrl = formatURL(file, url, container, sasKey); 

    // fetch the blob
    const resp = await fetch(blobUrl);
    if (!resp.ok) throw new Error(`Failed to fetch blob: ${resp.status} ${resp.statusText}`);
    const text = await resp.text();

    // parse and return JSON
    return JSON.parse(text);

  } catch (e) {
    throw new Error(`Failed to load ${file} from storage: ${e.message}`);
  }
}

export async function saveTimelineToStorage(container, file, text) {
  try {
    const {url, sasKey} = await acquireSasToken();
    const blobUrl = formatURL(file, url, container, sasKey);

    const resp = await fetch(blobUrl, {
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

export async function getTimeline(timelineID) {
  const container = timelineID.container
  const file = timelineID.file;
  Util.showGlobalBusyCursor();
  try {
    // retrieve from Azure blob storage
    const tl = await loadTimelineFromStorage(container, file);
    tl.timelineID = timelineID;
    Util.hideGlobalBusyCursor();
    return tl;
  } catch (err) {
    // look for the timeline locally
    //const obj = file.split(".")[0];
    //const tl = window[obj];  // look for variable matching the filename (minus ext)
    const response = await fetch(`data/${file}`);  // only works when a local server is running
    const tl = await response.json();
    tl.timelineID = timelineID;
    await sleep(500);  // simulate database access
    Util.hideGlobalBusyCursor();
    return tl;
  }
}

