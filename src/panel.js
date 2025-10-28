const controlLabel = document.getElementById('label');
const sidebarClose = document.getElementById('sidebar-close');

controlLabel.addEventListener('input', (e) => {
  const s = e.target.textContent;
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
  selectedEvent = null;
  draw(false);
  canvas.focus();
}

sidebarClose.addEventListener('click', closePanel);

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    if (sidebar.classList.contains('open')) closePanel();
  }
});

function openEvent(e) {
  const $ = (id) => document.getElementById(id);

  // Label
  if (e.label != null) { $("label").textContent = e.label }

  // Date (choose single or range)
  const single = e.date?.trim();
  const from = e.dateFrom?.trim();
  const to = e.dateTo?.trim();
  const showSingle = !!single && !(from || to);

  /*$("date-single").hidden = !showSingle;
  $("date-range").hidden = showSingle;

  if (showSingle) {
    $("date-single").textContent = single;
  } else if (from || to) {
    $("date-range").textContent = `${from ?? "?"} — ${to ?? "?"}`;
  }*/
  const dateDisplay = showSingle ? single : `${from ?? "?"} — ${to ?? "?"}`;
  $("date").innerHTML = dateDisplay;

  // Details
  const detailsHTML = `
          <p>Summer drive from Alaska down the Pacific Northwest with stops along the coast and visits with friends.</p>
          <h3>Notes</h3>
          <ul>
            <li>Highlights included views of volcanoes from Kenai and a long ferry segment.</li>
            <li>Planned around music and photo stops for the personal archive.</li>
          </ul>
          <p>Here is a <a href="#">reference link</a> for more context.</p>`; 

  if (typeof detailsHTML === 'string') {
    $("details").innerHTML = detailsHTML; // ensure you sanitize upstream if content isn't trusted
  }

  // Significance (text only)
  /*if (e.significance >= 1 && e.significance <= 6) {
    const names = {1: 'Trace', 2: 'Minor', 3: 'Major', 4: 'Significant', 5: 'Critical', 6: 'Defining'};
    const text = `${e.significance}-${names[e.significance] || ''}`;
    $("sig-text").textContent = text;
    $("sig").setAttribute("aria-label", `Significance: ${text}`);
  }*/
}

