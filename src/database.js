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

/*
async function acquireSasToken() {
  try {
    const response = await fetch("/api/credentials");
    const {url, sasKey} = await response.json();
    return {url, sasKey};

  } catch (err) {
    throw new Error(`Failed to aquire SAS token: ${err.message}`);
  }
}
*/

async function acquireBlobSas(scope, file, mode) {
  try {
    //const scopeFlag = scope === "public" ? "&public" : "";
    //const url = `/api/getBlobSas?name=${encodeURIComponent(file)}&mode=${mode}${scopeFlag}`;
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

export async function saveTimelineToStorage(file, text) {
  try {
    const {url, sasKey} = await acquireBlobSas("private", file, "write");
    //const blobUrl = formatURL(file, url, container, sasKey);

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
  const timelineID = {scope:scope, file:file};

  Util.showGlobalBusyCursor();
  try {
    // retrieve from Azure blob storage
    const tl = await loadTimelineFromStorage(scope, file);
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

/******************* Timeline list *******************/

/*
export async function listTimelinesInContainer(container) {
  try {
    const { url, sasKey } = await acquireSasToken();

    // Get base container URL with SAS
    const containerUrl = formatURL('', url, container, sasKey);
    const listUrl = containerUrl.includes('?')
      ? `${containerUrl}&restype=container&comp=list`
      : `${containerUrl}?restype=container&comp=list`;

    const resp = await fetch(listUrl);
    if (!resp.ok) {
      throw new Error(`Failed to list blobs: ${resp.status} ${resp.statusText}`);
    }

    const xmlText = await resp.text();

    // Parse XML response
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    const blobNodes = Array.from(doc.getElementsByTagName('Blob'));

    const blobs = blobNodes.map((blobNode) => {
      const name = blobNode.getElementsByTagName('Name')[0]?.textContent || '';

      const props = blobNode.getElementsByTagName('Properties')[0];
      const lastModified = props?.getElementsByTagName('Last-Modified')[0]?.textContent || null;
      const etag = props?.getElementsByTagName('Etag')[0]?.textContent || null;
      const contentLength = props?.getElementsByTagName('Content-Length')[0]?.textContent || null;
      const contentType = props?.getElementsByTagName('Content-Type')[0]?.textContent || null;

      return {
        name,
        url: formatURL(name, url, container, sasKey),
        lastModified,
        etag,
        contentLength: contentLength ? Number(contentLength) : null,
        contentType
      };
    });

    return blobs;
  } catch (e) {
    throw new Error(`Failed to list blobs in container '${container}': ${e.message}`);
  }
}
*/

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
