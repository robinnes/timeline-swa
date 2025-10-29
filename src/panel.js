const editLabel = document.getElementById('edit-label');
const editDetails = document.getElementById('edit-details');
const sidebarClose = document.getElementById('sidebar-close');

editLabel.addEventListener('input', (e) => {
  const s = e.target.value;
  selectedEvent.label = s;
  initializeEvent(selectedEvent);  // appearance of bubble label may change
  positionLabels();
  draw();
});

editDetails.addEventListener('input', (e) => {
  const v = e.target.value;
  selectedEvent.details = v;
});

function htmlToPlainText(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return d.innerText;
}

function openPanel() {
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  sb.classList.add('open');
  sb.setAttribute('aria-hidden', 'false');
  //stage.classList.add('shrink');
  sb.focus();
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

function openEvent() {
  sidebar.classList.remove('is-edit'); // Show view mode

  const $ = (id) => document.getElementById(id);

  // Label
  $("label").textContent = selectedEvent.label ?? '';

  // Date (choose single or range)
  const single = selectedEvent.date?.trim();
  const from = selectedEvent.dateFrom?.trim();
  const to = selectedEvent.dateTo?.trim();
  const showSingle = !!single && !(from || to);
  const dateDisplay = showSingle ? single : `${from ?? "?"} — ${to ?? "?"}`;
  $("date").innerHTML = dateDisplay;

  const sampleHTML = `
    <p>Summer drive from Alaska down the Pacific Northwest with stops along the coast and visits with friends.</p>
    <h3>Notes</h3>
    <ul>
      <li>Highlights included views of volcanoes from Kenai and a long ferry segment.</li>
      <li>Planned around music and photo stops for the personal archive.</li>
    </ul>
    <p>Here is a <a href="#">reference link</a> for more context.</p>`;
  
  // if details looks like HTML, show as HTML; otherwise plain-text
  const isHtml = /<[a-z][\s\S]*>/i.test(selectedEvent.details);
  if (isHtml) $("details").innerHTML = selectedEvent.details;
  else $("details").innerText = selectedEvent.details ?? '';
}

function openEventForEdit() {
  sidebar.classList.add('is-edit'); //Show edit mode

  editLabel.value = selectedEvent.label ?? '';
  editDetails.value = selectedEvent.details ?? '';
}