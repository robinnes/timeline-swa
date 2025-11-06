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

const tabButtons = Array.from(document.querySelectorAll('.panel__tabs .tab-btn'));
const significanceButtons = Array.from(document.querySelectorAll('input[name="event-significance"]'));
const colorTargetRadios = Array.from(document.querySelectorAll('input[name="color-target"]'));
const colorButtons = Array.from(document.querySelectorAll('.color-btn'));


/* ------------------- Helper functions -------------------- */

function htmlToPlainText(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return d.innerText;
}

function formatTextDate(txtDate) {
  const d = new Date(txtDate);
  return d.toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric"});
}

function formatEventDates(e) {
  const spec = zoomSpec(e.significance);

  if (spec.style === 'dot') return formatTextDate(selectedEvent.date);

  const from = formatTextDate(selectedEvent.dateFrom);
  const to = formatTextDate(selectedEvent.dateTo);
  return `${from ?? "?"} - ${to ?? "?"}`;
}


/* ------------------- Side panel -------------------- */

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
  selectedTimeline = null;
  draw(false);
  canvas.focus();
}
sidebarClose.addEventListener('click', closePanel);

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    if (isDragging) {
      // cancel pan mode and revert to original value (this code should be in timeline.js...)
      isDragging = false;
      selectedEvent[draggingAttribute] = dragStartValue;
      editingTimeline.dirty = dragStartDirtyState;
      updateSaveButton();
      initializeEvent(selectedEvent);
      document.getElementById('event-date-display').value = formatEventDates(selectedEvent);
      positionLabels();
      draw();
    } else {
      if (sidebar.classList.contains('open')) closePanel();
    }
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


/* ------------------- Timeline/Event tab selector -------------------- */

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
    draw();
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


/* ------------------- Edit/save buttons -------------------- */

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

function updateSaveButton() {
  // Save should be disabled when there are no unsaved changes.
  // Enable the Save button when `editingTimeline.dirty === true`.
  const shouldDisable = !(editingTimeline && editingTimeline.dirty);
  timelineSaveBtn.disabled = shouldDisable;
}


/* ------------------- Edit event panel -------------------- */

function openEventForEdit() {
  editEventLabel.value = selectedEvent.label ?? '';
  editEventDetails.value = selectedEvent.details ?? '';
  document.getElementById('event-date-display').value = formatEventDates(selectedEvent);
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
  updateColorSelectorState();
  updateColorButtons();
  editEventLabel.focus();
  draw();
}

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


/* ------------------- Edit timeline panel -------------------- */

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


/* ------------------- View panels -------------------- */

function openEventForView() {
  const $ = (id) => document.getElementById(id);
  //sidebar.classList.remove('is-edit'); // Show view mode
  
  // Label
  $("event-label").textContent = selectedEvent.label ?? '';

  // Date
  $("event-date").innerHTML = formatEventDates(selectedEvent);;

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


/* ------------------- Significance buttons -------------------- */

function updateColorSelectorState() {
  if (!selectedEvent) return;
  const isPoint = selectedEvent.significance <= 3;
  const leftRightSelectors = document.querySelectorAll('input[name="color-target"][value="left"], input[name="color-target"][value="right"]');
  
  leftRightSelectors.forEach(radio => {
    const label = radio.closest('.color-sel-btn');
    radio.disabled = isPoint;
    if (label) {
      label.classList.toggle('is-disabled', isPoint);
      label.setAttribute('aria-disabled', isPoint);
    }
    // If a disabled option is selected, switch to 'main'
    if (isPoint && radio.checked) {
      const mainRadio = document.querySelector('input[name="color-target"][value="main"]');
      if (mainRadio) {
        mainRadio.checked = true;
        updateColorButtons();
      }
    }
  });
}

// Significance change handler: update selectedEvent.significance and mark dirty
for (const r of significanceButtons) {
  r.addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10);
    if (!selectedEvent) return;
    selectedEvent.significance = v;
    initializeEvent(selectedEvent);
    // mark timeline dirty when event changed
    if (editingTimeline) editingTimeline.dirty = true;
    updateSaveButton?.();
    updateColorSelectorState();
    draw(true);  // may need to reposition labels
  });
}


/* ------------------- Color buttons -------------------- */

function getSelectedColorTarget() {
  const selected = document.querySelector('input[name="color-target"]:checked');
  return selected ? selected.value : 'main';
}

function updateColorButtons() {
  if (!selectedEvent) return;
  const target = getSelectedColorTarget();

  // hide/show the 'black' swatch for left/right targets
  const blackBtn = document.querySelector('.color-btn[data-color="black"]');
  if (blackBtn) {
    blackBtn.style.display = (target === 'main') ? 'none' : '';
  }

  for (const btn of colorButtons) {
    let isActive = false;
    switch (target) {
      case 'left':
        isActive = btn.dataset.color === selectedEvent.colorLeft;
        break;
      case 'right':
        isActive = btn.dataset.color === selectedEvent.colorRight;
        break;
      default: // 'main'
        isActive = btn.dataset.color === selectedEvent.color;
    }
    btn.classList.toggle('is-active', isActive);
  }
}

// Color target radio change handler
for (const radio of colorTargetRadios) {
  radio.addEventListener('change', () => {
    updateColorButtons();
  });
}

// Color button click handler
for (const btn of colorButtons) {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!selectedEvent) return;
    const newColor = btn.dataset.color;
    const target = getSelectedColorTarget();
    
    switch (target) {
      case 'left':
        selectedEvent.colorLeft = newColor;
        break;
      case 'right':
        selectedEvent.colorRight = newColor;
        break;
      default: // 'main'
        selectedEvent.color = newColor;
    }
    
    selectedEvent.timeline.dirty = true;
    updateColorButtons();
    draw();
  });
}
