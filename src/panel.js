const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebar-close');
const panels = Array.from(document.querySelectorAll('.panel'));
const editEventLabel = document.getElementById('edit-event-label');
const editEventDetails = document.getElementById('edit-event-details');
const editTimelineTitle = document.getElementById('edit-timeline-title');
const editTimelineDetails = document.getElementById('edit-timeline-details');
const timelineEditBtn = document.getElementById('timeline-edit');
const timelineCancelBtn = document.getElementById('timeline-cancel');
const timelineSaveBtn = document.getElementById('timeline-save');

// Tab buttons for switching between edit panels (overkill for 2 tabs...)
const tabButtons = Array.from(document.querySelectorAll('.panel__tabs .tab-btn'));
// Significance radio inputs (event editing)
const significanceRadios = Array.from(document.querySelectorAll('input[name="event-significance"]'));

function setActiveEditTab(targetPanelId) {
  for (const btn of tabButtons) {
    const isTarget = btn.dataset.target === targetPanelId;
    btn.classList.toggle('is-active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  }
  // Update enabled/disabled state for tabs after changing active tab
  updateTabStates();
}

// Attach click handlers to tab buttons
for (const btn of tabButtons) {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const target = btn.dataset.target;
    if (!target) return;
    showPanel(target);
    setActiveEditTab(target);
    if (!sidebar.classList.contains('open')) openPanel();
  });
}

// Disable or enable tabs based on application state (e.g. selectedEvent)
function updateTabStates() {
  if (!tabButtons || !tabButtons.length) return;
  for (const btn of tabButtons) {
    // Disable 'Event' tab when there is no selectedEvent
    if (btn.dataset.target === 'panel-edit-event') {
      const shouldDisable = !selectedEvent;
      btn.disabled = shouldDisable;
      btn.classList.toggle('is-disabled', shouldDisable);
      btn.setAttribute('aria-disabled', shouldDisable ? 'true' : 'false');
    }
  }
}

function closePanel() {
  sidebar.classList.remove('open');
  sidebar.setAttribute('aria-hidden', 'true');
  //stage.classList.remove('shrink');
  selectedEvent = null;
  selectedTimeline = null;
  draw(false);
  canvas.focus();
}
sidebarClose.addEventListener('click', closePanel);

timelineEditBtn.addEventListener('click', (e) => {
  e.preventDefault();
  openTimelineForEdit();
});

timelineCancelBtn.addEventListener('click', (e) => {
  e.preventDefault();
  if (!selectedTimeline.dirty) openTimelineForView();
  // else, ask whether to discard changes and if so, reload
});

async function trySaveTimeline()
{
  try {
    const text = timelineString(editingTimeline);
    await saveTimeline('timelines', 'timelineRob.json', text);
    editingTimeline.dirty = false;
    updateSaveButton();
  } catch (err) {
    console.error('Save failed:', err.message);
  }
}

timelineSaveBtn.addEventListener('click', (e) => {
  e.preventDefault();
  trySaveTimeline();
});

editEventLabel.addEventListener('input', (e) => {
  const s = e.target.value;
  selectedEvent.label = s;
  editingTimeline.dirty = true;
  updateSaveButton?.();
  initializeEvent(selectedEvent);  // appearance of bubble label may change
  positionLabels();
  draw();
});

editEventDetails.addEventListener('input', (e) => {
  const v = e.target.value;
  selectedEvent.details = v;
  editingTimeline.dirty = true;
  updateSaveButton?.();
});

editTimelineTitle.addEventListener('input', (e) => {
  const s = e.target.value;
  editingTimeline.title = s;
  editingTimeline.dirty = true;
  updateSaveButton?.();
  draw();
});

editTimelineDetails.addEventListener('input', (e) => {
  const v = e.target.value;
  editingTimeline.details = v;
  editingTimeline.dirty = true;
  updateSaveButton?.();
});

function htmlToPlainText(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return d.innerText;
}

function updateSaveButton() {
  // Save should be disabled when there are no unsaved changes.
  // Enable the Save button when `editingTimeline.dirty === true`.
  const shouldDisable = !(editingTimeline && editingTimeline.dirty);
  timelineSaveBtn.disabled = shouldDisable;
}

function openPanel() {
  sidebar.classList.add('open');
  sidebar.setAttribute('aria-hidden', 'false');
  //stage.classList.add('shrink');
  sidebar.focus();
}

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    if (sidebar.classList.contains('open')) closePanel();
  }
});

function showPanel(id) {
  for (const p of panels) {
    const isActive = p.id === id;
    p.toggleAttribute('hidden', !isActive);
    p.toggleAttribute('inert', !isActive);
    p.classList.toggle('is-active', isActive);
  }
}

function openEventForView() {
  const $ = (id) => document.getElementById(id);
  //sidebar.classList.remove('is-edit'); // Show view mode
  
  // Label
  $("event-label").textContent = selectedEvent.label ?? '';

  // Date (choose single or range)
  const single = selectedEvent.date?.trim();
  const from = selectedEvent.dateFrom?.trim();
  const to = selectedEvent.dateTo?.trim();
  const showSingle = !!single && !(from || to);
  const dateDisplay = showSingle ? single : `${from ?? "?"} — ${to ?? "?"}`;
  $("event-date").innerHTML = dateDisplay;

  const sampleHTML = `
    <p>Summer drive from Alaska down the Pacific Northwest with stops along the coast and visits with friends.</p>
    <h3>Notes</h3>
    <ul>
      <li>Highlights included views of volcanoes from Kenai and a long ferry segment.</li>
      <li>Planned around music and photo stops for the personal archive.</li>
    </ul>
    <p>Here is a <a href="#">reference link</a> for more context.</p>`;
  
  // if details looks like HTML, show as HTML; otherwise plain-text
  const isHtml = /<[a-z][\s\S]*>/i.test(selectedEvent.details);  // necessary?
  if (isHtml) $("details").innerHTML = selectedEvent.details;
  else $("details").innerText = selectedEvent.details ?? '';

  showPanel('panel-view-event');
  if (!sidebar.classList.contains('open')) openPanel();
}

function openEventForEdit() {
  editEventLabel.value = selectedEvent.label ?? '';
  editEventDetails.value = selectedEvent.details ?? '';
  // set significance radio based on selectedEvent.significance (if present)
  const sig = selectedEvent.significance ?? null;
  if (sig != null) {
    const el = document.querySelector(`input[name="event-significance"][value="${sig}"]`);
    if (el) el.checked = true;
  } else {
    // default to normal point (value 2)
    const el = document.querySelector('input[name="event-significance"][value="2"]');
    if (el) el.checked = true;
  }
  showPanel('panel-edit-event');
    setActiveEditTab('panel-edit-event');
  if (!sidebar.classList.contains('open')) openPanel();
  editEventLabel.focus();
}

function openTimelineForView() {
  const $ = (id) => document.getElementById(id);
  editingTimeline = null;

  // Label
  $("timeline-title").textContent = selectedTimeline.title ?? '';

  // Details
  const isHtml = /<[a-z][\s\S]*>/i.test(selectedTimeline.details);
  if (isHtml) $("timeline-details").innerHTML = selectedTimeline.details;
  else $("timeline-details").innerText = selectedTimeline.details ?? '';

  showPanel('panel-view-timeline');
  if (!sidebar.classList.contains('open')) openPanel();
}

function openTimelineForEdit() {
  editingTimeline = selectedTimeline;
  editTimelineTitle.value = editingTimeline.title ?? '';
  editTimelineDetails.value = editingTimeline.details ?? '';
  updateSaveButton?.();

  showPanel('panel-edit-timeline');
    setActiveEditTab('panel-edit-timeline');
  if (!sidebar.classList.contains('open')) openPanel();
  editTimelineTitle.focus();
}

// Significance change handler: update selectedEvent.significance and mark dirty
for (const r of significanceRadios) {
  r.addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10);
    if (!selectedEvent) return;
    selectedEvent.significance = v;
    // mark timeline dirty when event changed
    if (editingTimeline) editingTimeline.dirty = true;
    updateSaveButton?.();
    draw();
  });
}