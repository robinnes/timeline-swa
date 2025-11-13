
function formatURL(file, url, container, sasKey) {
  const base = url.replace(/\/+$/, '');
  const encodedFile = (file || '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  const sas = sasKey ? (sasKey.startsWith('?') ? sasKey : `?${sasKey}`) : '';
  
  return `${base}/${container}/${encodedFile}${sas}`;
}

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

async function saveTimelineToStorage(container, file, text) {
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

async function getTimeline(timelineID) {
  const container = timelineID.container
  const file = timelineID.file;
  appState.waiting = true;
  setPointerCursor();
  try {
    // retrieve from storage
    const tl = await loadTimelineFromStorage(container, file);
    initializeTimeline(tl);
    tl.timelineID = timelineID;
    appState.waiting = false;
    setPointerCursor();
    return tl;
  } catch (err) {
    //console.log(err.message);
    const obj = file.split(".")[0];
    const tl = window[obj];  // look for variable matching the filename (minus ext)
    //console.log('defaulting to local object:', obj);
    initializeTimeline(tl);
    tl.timelineID = timelineID;
    appState.waiting = false;
    setPointerCursor();
    return tl;
  }
}

async function saveTimeline()
{
  appState.waiting = true;
  setPointerCursor();
  try {
    const text = timelineString(appState.editingTimeline);
    const {container, file} = appState.editingTimeline.timelineID;
    await saveTimelineToStorage(container, file, text);
    appState.editingTimeline.dirty = false;
  } catch (err) {
    console.error('Save failed:', err.message);
  }
  appState.waiting = false;
  setPointerCursor();
}
