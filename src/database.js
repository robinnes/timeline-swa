/*
function loadFromStorage(container, file) {

  (async function () {
    try {
      const response = await fetch("/api/credentials");
      const {url, sasKey} = await response.json();

      // Load the blob (returns parsed JSON object) and display it as text
      try {
        const obj = await loadTimeline(file, url, container, sasKey);
        document.getElementById('details').textContent = JSON.stringify(obj, null, 2);
      } catch (err) {
        document.getElementById('details').textContent = `Error loading timeline: ${err.message}`;
      }
    } catch (err) {
      document.getElementById('details').textContent = `Error retrieving credentials: ${err.message}`;
    }
  }());
  return obj;
}
*/

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

/**
 * Load a JSON file from Azure Blob Storage using a SAS URL and display its
 * pretty-printed content in the #details element.
 *
 * Parameters:
 *  - file: blob name (may include path segments)
 *  - url: storage account base URL (e.g. https://account.blob.core.windows.net)
 *  - container: container name
 *  - sasKey: SAS query string (may include leading '?')
 */
async function loadTimeline(file, url, container, sasKey) {
  if (!url) throw new Error('Missing storage URL');

  const base = url.replace(/\/+$/, '');
  const encodedFile = (file || '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  const sas = sasKey ? (sasKey.startsWith('?') ? sasKey : `?${sasKey}`) : '';
  const blobUrl = `${base}/${container}/${encodedFile}${sas}`;
  
  // Log URL for debugging (redact SAS token)
  console.log('Fetching from:', blobUrl.replace(sas, '?[redacted]'));

  const resp = await fetch(blobUrl);
  if (!resp.ok) throw new Error(`Failed to fetch blob: ${resp.status} ${resp.statusText}`);

  const text = await resp.text();
  // Log raw response for debugging
  //console.log('Raw blob content:', text);
  console.log('Fetch successful');
  
  // Parse JSON and return object. If parsing fails, throw to let caller decide how to display.
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Blob is not valid JSON: ${text.substring(0, 100)}...`);
  }
}

