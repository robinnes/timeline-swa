
async function loadFromStorage(container, file) {
  try {
    const response = await fetch("/api/credentials");
    const {url, sasKey} = await response.json();

    // Load and return the blob (returns parsed JSON object)
    return await loadTimeline(file, url, container, sasKey);
  } catch (err) {
    // Re-throw any errors for the caller to handle
    throw new Error(`Failed to load from storage: ${err.message}`);
  }
}

async function loadTimeline(file, url, container, sasKey) {
  if (!url) throw new Error('Missing storage URL');

/*  const base = url.replace(/\/+$/, '');
  const encodedFile = (file || '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  const sas = sasKey ? (sasKey.startsWith('?') ? sasKey : `?${sasKey}`) : '';*/
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

function formatURL(file, url, container, sasKey) {
  const base = url.replace(/\/+$/, '');
  const encodedFile = (file || '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  const sas = sasKey ? (sasKey.startsWith('?') ? sasKey : `?${sasKey}`) : '';

  return `${base}/${container}/${encodedFile}${sas}`;
}