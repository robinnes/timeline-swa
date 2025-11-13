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
const eventDeleteBtn = document.getElementById('event-delete');

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
  const d = new Date(txtDate); // adjusts for TZ, so must also be undone with timeZone:"UTC"
  return d.toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric", timeZone:"UTC"});
}

function formatEventDates(e) {
  const spec = zoomSpec(e.significance);

  if (spec.style === 'dot') return formatTextDate(e.date);

  const from = formatTextDate(e.dateFrom);
  const to = formatTextDate(e.dateTo);
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
  appState.selected.event = null;
  appState.selected.timeline = null;
  draw(false);
  canvas.focus();
}
sidebarClose.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    if (appState.drag.isDragging) {
      stopDragging(true);
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
    if (target === 'timeline') panelId = (appState.editingTimeline ? 'panel-edit-timeline' : 'panel-view-timeline');
    else if (target === 'event') panelId = (appState.editingTimeline ? 'panel-edit-event' : 'panel-view-event');
    if (panelId) showPanel(panelId);    
    setActiveEditTab(target);
    if (!sidebar.classList.contains('open')) openSidebar();
    draw();
  });
}

function isPanelOpen(id) {
  return document.getElementById(id).classList.contains('is-active');
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
  // Disable or enable tabs based on application state
  if (!tabButtons || !tabButtons.length) return;
  for (const btn of tabButtons) {
    // Disable 'Event' tab when there is no selected event
    if (btn.dataset.target === 'event') {
      const shouldDisable = !appState.selected.event;
      btn.disabled = shouldDisable;
      btn.classList.toggle('is-disabled', shouldDisable);
      btn.setAttribute('aria-disabled', shouldDisable ? 'true' : 'false');
    }
  }
}


/* ------------------- Edit/save/delete buttons -------------------- */

timelineEditBtn.addEventListener('click', (e) => {
  e.preventDefault();
  appState.editingTimeline = appState.selected.timeline;
  openTimelineForEdit(appState.editingTimeline);
  draw();
});

timelineCancelBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const tl = appState.selected.timeline;
  if (tl.dirty) {
    reloadTimeline(tl).then(() => {
      appState.editingTimeline = null;
      openTimelineForView(tl);
      draw();
    });
  } else {
    appState.editingTimeline = null;
    openTimelineForView(tl); // cancel without reloading
    draw();
  }
});

timelineSaveBtn.addEventListener('click', (e) => {
  e.preventDefault();
  saveTimeline();
  updateSaveButton();
});

function updateSaveButton() {
  // Enable the Save button when editingTimeline is dirty
  const shouldDisable = !(appState.editingTimeline && appState.editingTimeline.dirty);
  timelineSaveBtn.disabled = shouldDisable;
}

eventDeleteBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const events = appState.editingTimeline.events;
  const idx = events.indexOf(appState.selected.event);
  events.splice(idx, 1);
  appState.selected.event = null;
  appState.editingTimeline.dirty = true;
  draw(true);
  openTimelineForEdit(appState.editingTimeline);
});


/* ------------------- Edit event panel -------------------- */

function openEventForEdit(e) {
  setSidebarEvent(e);

  showPanel('panel-edit-event');
  setActiveEditTab('event');
  if (!sidebar.classList.contains('open')) openSidebar();
  editEventLabel.focus();
  draw();
}

editEventLabel.addEventListener('input', (e) => {
  const s = e.target.value;
  const event = appState.selected.event;
  event.label = s;
  appState.editingTimeline.dirty = true;
  updateSaveButton?.();
  initializeEvent(event);  // appearance of bubble label may change
  positionLabels();
  draw();
});

editEventDetails.addEventListener('input', (e) => {
  const v = e.target.value;
  const event = appState.selected.event;
  event.details = v;
  appState.editingTimeline.dirty = true;
  updateSaveButton?.();
});


/* ------------------- Edit timeline panel -------------------- */

function openTimelineForEdit(tl) {
  setSidebarTimeline(tl);

  showPanel('panel-edit-timeline');
  setActiveEditTab('timeline');
  updateSaveButton();
  if (!sidebar.classList.contains('open')) openSidebar();
  editTimelineTitle.focus();
}

editTimelineTitle.addEventListener('input', (e) => {
  const s = e.target.value;
  appState.editingTimeline.title = s;
  appState.editingTimeline.dirty = true;
  updateSaveButton?.();
  draw();
});

editTimelineDetails.addEventListener('input', (e) => {
  const v = e.target.value;
  appState.editingTimeline.details = v;
  appState.editingTimeline.dirty = true;
  updateSaveButton?.();
});


/* ------------------- View panels -------------------- */

function openEventForView(e) {
  setSidebarEvent(e);
  setSidebarTimeline(e.timeline);

  showPanel('panel-view-event');
  setActiveEditTab('event');
  if (!sidebar.classList.contains('open')) openSidebar();
}

function openTimelineForView(tl) {
  setSidebarTimeline(tl);

  showPanel('panel-view-timeline');
  setActiveEditTab('timeline');
  if (!sidebar.classList.contains('open')) openSidebar();
}


/* ------------------- Populate fields for selection -------------------- */

function setSidebarEvent(e) {
  // update sidebar (all panels) to selected event
  const $ = (id) => document.getElementById(id);
  
  // view event panel
  $("event-label").textContent = e.label ?? '';
  $("event-date").innerHTML = formatEventDates(e);;
  // if details looks like HTML, show as HTML; otherwise plain-text
  const isHtml = /<[a-z][\s\S]*>/i.test(e.details);  // necessary?
  if (isHtml) $("details").innerHTML = e.details;
  else $("details").innerText = e.details ?? ''

  // edit event panel
  editEventLabel.value = e.label ?? '';
  editEventDetails.value = e.details ?? '';
  $('event-date-display').value = formatEventDates(e);

  updateSignificanceButton();
  updateColorSelectorState();
  updateColorButtons();
}

function setSidebarTimeline(tl) {
  // update sidebar (all panels) to timeline
  const $ = (id) => document.getElementById(id);

  // view timeline panel
  $("timeline-title").textContent = tl.title ?? '';
  const isHtml = /<[a-z][\s\S]*>/i.test(tl.details);  // necessary?
  if (isHtml) $("timeline-details").innerHTML = tl.details;
  else $("timeline-details").innerText = tl.details ?? '';

  // edit timeline panel
  editTimelineTitle.value = tl.title ?? '';
  editTimelineDetails.value = tl.details ?? '';
  updateSaveButton?.();
}


/* ------------------- Significance buttons -------------------- */

// Significance change handler: update selected.event.significance and mark dirty
for (const r of significanceButtons) {
  r.addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10);
    const event = appState.selected.event;
    if (!event) return;
    event.significance = v;
    initializeEvent(event);
    // mark timeline dirty when event changed
    if (appState.editingTimeline) appState.editingTimeline.dirty = true;
    updateSaveButton?.();
    updateColorSelectorState();
    updateColorButtons(); // significance switch can change color
    draw(true);  // may need to reposition labels
  });
}

function updateSignificanceButton() {
  // set significance radio based on selected.event.significance (if present)
  const sig = appState.selected.event.significance ?? null;
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
  const e = appState.selected.event;
  if (!e) return;
  const isPoint = e.significance <= 3;
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
    const event = appState.selected.event;
    if (!event) return;
    const newColor = btn.dataset.color;
    const target = getSelectedColorTarget();
    
    switch (target) {
      case 'left':
        event.colorLeft = newColor;
        break;
      case 'right':
        event.colorRight = newColor;
        break;
      default: // 'main'
        event.color = newColor;
    }
    
    event.timeline.dirty = true;
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
  const e = appState.selected.event;
  if (!e) return;
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
        isActive = btn.dataset.color === e.colorLeft;
        break;
      case 'right':
        isActive = btn.dataset.color === e.colorRight;
        break;
      default: // 'main'
        isActive = btn.dataset.color === e.color;
    }
    btn.classList.toggle('is-active', isActive);
  }
}
