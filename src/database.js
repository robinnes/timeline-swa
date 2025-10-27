/*
async function loadFromStorage(container, file) {
  try {
    const response = await fetch("/api/credentials");
    const {url, sasKey} = await response.json(); // --why await?
    //const {url, sasKey} = response.json();

    // Load and return the blob (returns parsed JSON object)
    return await loadTimeline(file, url, container, sasKey);
  } catch (err) {
    // Re-throw any errors for the caller to handle
    throw new Error(`Failed to load from storage: ${err.message}`);
  }
}

async function loadTimeline(file, url, container, sasKey) {
  if (!url) throw new Error('Missing storage URL');

  const blobUrl = formatURL(file, url, container, sasKey);  
  //console.log('Fetching from:', blobUrl.replace(sas, '?[redacted]'));
  const resp = await fetch(blobUrl);
  if (!resp.ok) throw new Error(`Failed to fetch blob: ${resp.status} ${resp.statusText}`);

  const text = await resp.text();
  console.log('Fetch successful');
  
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Blob is not valid JSON: ${text.substring(0, 100)}...`);
  }
}
*/

async function acquireSasToken() {
  try {
    const response = await fetch("/api/credentials");
    const {url, sasKey} = await response.json();
    return {url, sasKey};

  } catch (err) {
    throw new Error(`Failed to aquire SAS token: ${err.message}`);
  }
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

async function loadTimeline(container, file) {
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

// --- saveTimeline: save text content to a blob using SAS token
async function saveTimeline(container, file, text) {
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
