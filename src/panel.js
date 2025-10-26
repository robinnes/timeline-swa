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

async function retrieveEvent() {
  try {
    const tl = await loadFromStorage('timelines', 'timelineRob.json');
    document.getElementById('details').textContent = JSON.stringify(tl, null, 2);
  } catch (err) {
    document.getElementById('details').textContent = err.message;
  }
}
