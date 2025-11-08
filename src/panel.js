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

// Initialize tab state to reflect the currently visible panel
(() => {
  updateTabStates();
  const activePanel = document.querySelector('.panel.is-active');
  if (activePanel) {
    if (activePanel.id === 'panel-view-timeline' || activePanel.id === 'panel-edit-timeline') setActiveEditTab('timeline');
    else setActiveEditTab('event');
  }
})();

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


/* ------------------- Sidebar -------------------- */

function openSidebar() {
  sidebar.classList.add('open');
  sidebar.setAttribute('aria-hidden', 'false');
  //stage.classList.add('shrink');
  sidebar.focus();
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebar.setAttribute('aria-hidden', 'true');
  //stage.classList.remove('shrink');
  selectedEvent = null;
  selectedTimeline = null;
  draw(false);
  canvas.focus();
}
sidebarClose.addEventListener('click', closeSidebar);

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
      if (sidebar.classList.contains('open')) closeSidebar();
    }
  }
});


/* ------------------- Panel navigation -------------------- */

// Attach click handlers to tab buttons
for (const btn of tabButtons) {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    const target = btn.dataset.target;
    if (!target) return;
    // map logical tab to the appropriate panel depending on whether we're editing a timeline
    let panelId = null;
    if (target === 'timeline') panelId = (editingTimeline ? 'panel-edit-timeline' : 'panel-view-timeline');
    else if (target === 'event') panelId = (editingTimeline ? 'panel-edit-event' : 'panel-view-event');
    if (panelId) showPanel(panelId);
    setActiveEditTab(target);
    if (!sidebar.classList.contains('open')) openSidebar();
    draw();
  });
}

function showPanel(id) {
  for (const p of panels) {
    const isActive = p.id === id;
    p.toggleAttribute('hidden', !isActive);
    p.toggleAttribute('inert', !isActive);
    p.classList.toggle('is-active', isActive);
  }
}

function setActiveEditTab(targetPanelId) {
  for (const btn of tabButtons) {
    const isTarget = btn.dataset.target === targetPanelId;
    btn.classList.toggle('is-active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  }
  // Update enabled/disabled state for tabs after changing active tab
  updateTabStates();
}

function updateTabStates() {
  // Disable or enable tabs based on application state (e.g. selectedEvent)
  if (!tabButtons || !tabButtons.length) return;
  for (const btn of tabButtons) {
    // Disable 'Event' tab when there is no selectedEvent
    if (btn.dataset.target === 'event') {
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

timelineSaveBtn.addEventListener('click', (e) => {
  e.preventDefault();
  trySaveTimeline();
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

function updateSaveButton() {
  // Save should be disabled when there are no unsaved changes.
  // Enable the Save button when `editingTimeline.dirty === true`.
  const shouldDisable = !(editingTimeline && editingTimeline.dirty);
  timelineSaveBtn.disabled = shouldDisable;
}


/* ------------------- Edit event panel -------------------- */

function openEventForEdit() {
  setSidebarEvent();

  showPanel('panel-edit-event');
  setActiveEditTab('event');
  if (!sidebar.classList.contains('open')) openSidebar();
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
  setSidebarTimeline();

  showPanel('panel-edit-timeline');
  setActiveEditTab('timeline');
  if (!sidebar.classList.contains('open')) openSidebar();
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
  setSidebarEvent();
  setSidebarTimeline();

  showPanel('panel-view-event');
  setActiveEditTab('event');
  if (!sidebar.classList.contains('open')) openSidebar();
editEventLabel.focus();
}

function openTimelineForView() {
  editingTimeline = null;
  setSidebarTimeline();

  showPanel('panel-view-timeline');
  setActiveEditTab('timeline');
  if (!sidebar.classList.contains('open')) openSidebar();
}


/* ------------------- Populate fields for selection -------------------- */

function setSidebarEvent() {
  // update sidebar (all panels) to selectedEvent
  const $ = (id) => document.getElementById(id);
  
  // view event panel
  $("event-label").textContent = selectedEvent.label ?? '';
  $("event-date").innerHTML = formatEventDates(selectedEvent);;
  // if details looks like HTML, show as HTML; otherwise plain-text
  const isHtml = /<[a-z][\s\S]*>/i.test(selectedEvent.details);  // necessary?
  if (isHtml) $("details").innerHTML = selectedEvent.details;
  else $("details").innerText = selectedEvent.details ?? ''

  // edit event panel
  editEventLabel.value = selectedEvent.label ?? '';
  editEventDetails.value = selectedEvent.details ?? '';
  $('event-date-display').value = formatEventDates(selectedEvent);

  updateSignificanceButton();
  updateColorSelectorState();
  updateColorButtons();
}

function setSidebarTimeline() {
  // update sidebar (all panels) to selectedTimeline
  const $ = (id) => document.getElementById(id);

  // view timeline panel
  $("timeline-title").textContent = selectedTimeline.title ?? '';
  const isHtml = /<[a-z][\s\S]*>/i.test(selectedTimeline.details);  // necessary?
  if (isHtml) $("timeline-details").innerHTML = selectedTimeline.details;
  else $("timeline-details").innerText = selectedTimeline.details ?? '';

  // edit timeline panel
  editTimelineTitle.value = selectedTimeline.title ?? '';
  editTimelineDetails.value = selectedTimeline.details ?? '';
  updateSaveButton?.();
}


/* ------------------- Significance buttons -------------------- */

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
    updateColorButtons(); // significance switch can change color
    draw(true);  // may need to reposition labels
  });
}

function updateSignificanceButton() {
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
}

function updateColorSelectorState() {
  // color options depend on significance: no left/right for Point events, etc.
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
      if (mainRadio) mainRadio.checked = true;   
    }
  });
}


/* ------------------- Color buttons -------------------- */

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

function getSelectedColorTarget() {
  // identify whether Color, Left or Right is currently selected
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
