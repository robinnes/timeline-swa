const controlLabel = document.getElementById('label');

controlLabel.addEventListener('input', (e) => {
  const s = e.target.value;
  selectedEvent.label = s;
  initializeEvent(selectedEvent);  // appearance of bubble label may change
  positionLabels();
  draw();
});

function openPanel() {
  sidebar.classList.add('open');
  sidebar.setAttribute('aria-hidden', 'false');
  //stage.classList.add('shrink');
  sidebar.focus();
}

function closePanel() {
  sidebar.classList.remove('open');
  sidebar.setAttribute('aria-hidden', 'true');
  //stage.classList.remove('shrink');
  canvas.focus();
}

function openEvent(e) {
  const $ = (id) => document.getElementById(id);

  // Label
  if (e.label != null) { $("label").textContent = e.label }

  // Date (choose single or range)
  const single = e.date?.trim();
  const from = e.dateFrom?.trim();
  const to = e.dateTo?.trim();
  const showSingle = !!single && !(from || to);

  $("date-single").hidden = !showSingle;
  $("date-range").hidden = showSingle;

  if (showSingle) {
    $("date-single").textContent = single;
  } else if (from || to) {
    $("date-range").textContent = `${from ?? "?"} — ${to ?? "?"}`;
  }

  // Details
  const detailsHTML = ''; // todo
  if (typeof detailsHTML === 'string') {
    $("details").innerHTML = detailsHTML; // ensure you sanitize upstream if content isn't trusted
  }

  // Significance (text only)
  if (e.significance >= 1 && e.significance <= 6) {
    const names = {1: 'Trace', 2: 'Minor', 3: 'Major', 4: 'Significant', 5: 'Critical', 6: 'Defining'};
    const text = `${e.significance}-${names[e.significance] || ''}`;
    $("sig-text").textContent = text;
    $("sig").setAttribute("aria-label", `Significance: ${text}`);
  }

  retrieveEvent();
}

function retrieveEvent() {

/*    (async function() {
        const { text } = await( await fetch(`/api/getTimeline`)).json();
        document.getElementById('details').innerHTML = text;
    }());*/

  (async function () {
    try {
      const response = await fetch("/api/credentials");
      const {url, sasKey} = await response.json();

      // For now use hard-coded container and file per request
      const container = 'timelines';
      const file = 'timelineRob.json';

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

  //document.getElementById('details').innerHTML = 'test'';
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
  console.log('Raw blob content:', text);
  
  // Parse JSON and return object. If parsing fails, throw to let caller decide how to display.
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Blob is not valid JSON: ${text.substring(0, 100)}...`);
  }
}