import * as Util from './util.js';
import {appState, draw, followLink} from './canvas.js';
import {formatEventDates, positionLabels} from './render.js';
import {reloadTimeline, saveTimeline, publishTimeline, initializeEvent, initializeTitle, closeTimeline} from './timeline.js';
import {openSaveAsTimelineDialog} from './fileDialog.js';
import {showModalDialog} from './confirmDialog.js';
import {getImageThumbnail, removeImageThumbnail} from './image.js';
import {initTagsUI, renderTagsUI, initTagPickerUI, renderTagPickerUI} from './tags.js';


const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebar-close');

const tabButtons = Array.from(document.querySelectorAll('.panel__tabs .tab-btn'));
const panels = Array.from(document.querySelectorAll('.panel'));
const subpanelTabs = document.querySelectorAll('.subpanel__tabs');

const displayTextAreas = document.querySelectorAll('.display-textarea');
//const panelViewTimeline = document.getElementById('panel-view-timeline');
//const panelViewEvent = document.getElementById('panel-view-event');

const timelineEditBtn = document.getElementById('timeline-edit');
const timelineCancelBtn = document.getElementById('timeline-cancel');
const timelineSaveBtn = document.getElementById('timeline-save');
const timelinePublishBtn = document.getElementById('timeline-publish');
const viewTimelineFooter = document.getElementById('view-timeline-footer');

const eventDeleteBtn = document.getElementById('event-delete');
const editEventLabel = document.getElementById('edit-event-label');
const editEventDetails = document.getElementById('edit-event-details');
const editTimelineTitle = document.getElementById('edit-timeline-title');
const editTimelineDetails = document.getElementById('edit-timeline-details');
const significanceButtons = Array.from(document.querySelectorAll('input[name="event-significance"]'));
const colorTargetRadios = Array.from(document.querySelectorAll('input[name="color-target"]'));
const colorButtons = Array.from(document.querySelectorAll('.color-btn'));
const selectThumbnailBtn = document.getElementById('select-thumbnail-btn');
const closeThumbnailBtn = document.getElementById('close-thumbnail-btn');

/* ------------------- Sidebar -------------------- */

function openSidebar() {
  sidebar.classList.add('open');
  sidebar.setAttribute('aria-hidden', 'false');
  //stage.classList.add('shrink');
  sidebar.focus();
}

export function closeSidebar() {
  sidebar.classList.remove('open');
  sidebar.setAttribute('aria-hidden', 'true');
  //stage.classList.remove('shrink');
  appState.selected.event = null;
  appState.selected.timeline = null;
  draw(false);
  canvas.focus();
}
sidebarClose.addEventListener('click', closeSidebar);


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
    if (target === 'timeline') panelId = ((appState.selected.timeline.mode === "edit") ? 'panel-edit-timeline' : 'panel-view-timeline');
    else if (target === 'event') panelId = ((appState.selected.timeline.mode === "edit") ? 'panel-edit-event' : 'panel-view-event');
    if (panelId) showPanel(panelId);    
    setActiveEditTab(target);
    if (!sidebar.classList.contains('open')) openSidebar();
    draw();
  });
}

export function isPanelOpen(id) {
  return document.getElementById(id).classList.contains('is-active');
}

function showPanel(id) {
  for (const p of panels) {
    const isActive = p.id === id;
    p.toggleAttribute('hidden', !isActive);
    p.toggleAttribute('inert', !isActive);
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


/* ------------------- Edit/save/delete/publish buttons -------------------- */

timelineEditBtn.addEventListener('click', (e) => {
  e.preventDefault();
  appState.selected.timeline.mode = 'edit';
  openTimelineForEdit(appState.selected.timeline);
  draw();
});

timelineCancelBtn.addEventListener('click', (e) => {
  e.preventDefault();
  cancelTimelineEdit();
});

async function cancelTimelineEdit() {
  const tl = appState.selected.timeline;

  if (!tl.timelineID.file) {
    const ok = await showModalDialog({message:'Abandon changes to timeline?'});
    if (!ok) return;

    closeTimeline(tl);
    closeSidebar();
  } else if (tl.dirty) {
    const ok = await showModalDialog({message:'Abandon changes to timeline and revert to saved version?'});
    if (!ok) return;

    reloadTimeline(tl).then(() => {
      tl.mode = 'view';
      setSidebarTimeline(appState.selected.timeline);
      openTimelineForView(appState.selected.timeline);
      draw(true);
    });
  } else {
    tl.mode = 'view';
    openTimelineForView(tl); // cancel without reloading
    draw();
  }
}

timelineSaveBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const tl = appState.selected.timeline;
  if (!tl.timelineID.file) {
    // new timeline... open dialog
    openSaveAsTimelineDialog('');
  } else {
    saveTimeline(tl).then(() => {
      updateSaveButton();
    });
  }
});

export function updateSaveButton() {
  // Enable the Save button when selected timeline is dirty
  if (!appState.selected.timeline) return;
  const shouldDisable = (appState.selected.timeline.mode === 'view' || !appState.selected.timeline.dirty);
  timelineSaveBtn.disabled = shouldDisable;
}

eventDeleteBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const tl = appState.selected.timeline;
  const events = tl.events;
  const idx = events.indexOf(appState.selected.event);
  events.splice(idx, 1);
  appState.selected.event = null;
  tl.dirty = true;
  draw(true);
  openTimelineForEdit(tl);
});

timelinePublishBtn.addEventListener('click', (e) => {
  e.preventDefault();
  tryPublishTimeline();
});

async function tryPublishTimeline() {
  const tl = appState.selected.timeline;
  
  const ok = await showModalDialog({message:'Make timeline available to the public?'});
  if (!ok) return;

  publishTimeline(tl);
}


/* ------------------- Subpanel navigation (scoped per panel) -------------------- */

for (const tabsEl of subpanelTabs) {
  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.subtab-btn');
    if (!btn || !tabsEl.contains(btn)) return;

    e.preventDefault();
    if (btn.disabled) return;

    const targetId = btn.dataset.target;
    if (!targetId) return;

    const panelEl = tabsEl.closest('.panel');
    if (!panelEl) return;

    // activate only the subtabs in this tab strip
    for (const b of tabsEl.querySelectorAll('.subtab-btn')) {
      const isTarget = b.dataset.target === targetId;
      b.classList.toggle('is-active', isTarget);
      b.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    }

    // show only the subpanels in this panel
    const targetEl = panelEl.querySelector('#' + CSS.escape(targetId));
    if (!targetEl) return;

    for (const sp of panelEl.querySelectorAll('.subpanel')) {
      const isActive = sp === targetEl;
      sp.toggleAttribute('hidden', !isActive);
      sp.toggleAttribute('inert', !isActive);
    }
  });
}


/* ------------------- Edit event panel -------------------- */

export function openEventForEdit(e) {
  setSidebarEvent(e);
  setSidebarTimeline(e.timeline);

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
  appState.selected.timeline.dirty = true;
  updateSaveButton?.();
  initializeEvent(event);  // appearance of bubble label may change
  positionLabels();
  draw();
});

editEventDetails.addEventListener('input', (e) => {
  const v = e.target.value;
  const event = appState.selected.event;
  event.details = v;
  appState.selected.timeline.dirty = true;
  updateSaveButton?.();
});

selectThumbnailBtn.addEventListener('click', (e) => {
  e.preventDefault();
  getImageThumbnail();
});

closeThumbnailBtn.addEventListener('click', (e) => {
  e.preventDefault();
  removeImageThumbnail();
});

/* ------------------- Edit timeline panel -------------------- */

export function openTimelineForEdit(tl) {
  setSidebarTimeline(tl);

  showPanel('panel-edit-timeline');
  setActiveEditTab('timeline');
  updateSaveButton();
  if (!sidebar.classList.contains('open')) openSidebar();
  editTimelineTitle.focus();
}

editTimelineTitle.addEventListener('input', (e) => {
  const s = e.target.value;
  const tl = appState.selected.timeline;
  tl.title = s;
  tl.dirty = true;
  initializeTitle(tl);  // update titleWidth for drawing
  updateSaveButton?.();
  draw();
});

editTimelineDetails.addEventListener('input', (e) => {
  const v = e.target.value;
  const tl = appState.selected.timeline;
  tl.details = v;
  tl.dirty = true;
  updateSaveButton?.();
});


/* ------------------- View panels -------------------- */

export function openEventForView(e) {
  setSidebarEvent(e);
  setSidebarTimeline(e.timeline);

  showPanel('panel-view-event');
  setActiveEditTab('event');
  if (!sidebar.classList.contains('open')) openSidebar();
}

export function openTimelineForView(tl) {
  setSidebarTimeline(tl);

  showPanel('panel-view-timeline');
  setActiveEditTab('timeline');
  if (!sidebar.classList.contains('open')) openSidebar();
}

for (const txt of displayTextAreas) {
  txt.addEventListener('click', (e) => {
    console.log('click');
    const a = e.target.closest("a");
    if (!a) return;
    if (a.hasAttribute("tl")) {
      e.preventDefault();
      const file = a.getAttribute('tl') + '.json';
      followLink(file);
    }
  });
}
/*
panelViewTimeline.addEventListener('click', (e) => {
  const a = e.target.closest("a");
  if (!a) return;
  if (a.hasAttribute("tl")) {
    e.preventDefault();
    const file = a.getAttribute('tl') + '.json';
    followLink(file);
  }
});

panelViewEvent.addEventListener('click', (e) => {
  const a = e.target.closest("a");
  if (!a) return;
  if (a.hasAttribute("tl")) {
    e.preventDefault();
    const file = a.getAttribute('tl') + '.json';
    followLink(file);
  }
});
*/

/* ------------------- Populate fields for selection -------------------- */

export function setSidebarEvent(e) {
  // update sidebar (all panels) to selected event
  const $ = (id) => document.getElementById(id);
  
  // view event panel
  //$("event-label").textContent = e.label ?? '';
  $("event-label").innerHTML = e.label;

  $("event-date").innerHTML = formatEventDates(e);;

  // if details looks like HTML, show as HTML; otherwise plain-text
  const isHtml = /<[a-z][\s\S]*>/i.test(e.details);  // necessary?
  if (isHtml) $("event-details").innerHTML = e.details;
  else $("event-details").innerText = e.details ?? '';

  // edit event panel
  editEventLabel.value = e.label ?? '';
  editEventDetails.value = e.details ?? '';
  $('event-date-display').value = formatEventDates(e);

  updateSignificanceButton();
  updateColorSelectorState();
  updateColorButtons();

  // event thumbnail (on view and edit panels)
  const thumb = e.thumbnail;
  const imgs = [
    $('event-thumb-edit-img'),
    $('event-thumb-view-img')
  ];
  for (const img of imgs) {
    if (thumb) {
      img.src = thumb;
      img.hidden = false;
      closeThumbnailBtn.removeAttribute("hidden");
    } else {
      img.removeAttribute('src');
      img.hidden = true;
      closeThumbnailBtn.setAttribute("hidden", "");
    }
  }

  renderTagPickerUI(appState.selected.timeline, e);

  updateSaveButton();  // disable if timeline is not 'dirty'
}

function setSidebarTimeline(tl) {
  // update sidebar (all panels) to timeline
  const $ = (id) => document.getElementById(id);

  // view timeline panel
  $("timeline-title").textContent = tl.title ?? '';
  const isHtml = /<[a-z][\s\S]*>/i.test(tl.details);  // necessary?
  if (isHtml) $("timeline-details").innerHTML = tl.details;
  else $("timeline-details").innerText = tl.details ?? '';

  // no 'Edit' button for public timelines
  if (tl.timelineID.scope === "public") 
    viewTimelineFooter.setAttribute("hidden", "");
  else 
    viewTimelineFooter.removeAttribute("hidden");

  // edit timeline panel
  editTimelineTitle.value = tl.title ?? '';
  editTimelineDetails.value = tl.details ?? '';
  renderTagsUI(tl);
  updateSaveButton?.();
}


/* ------------------- Significance buttons -------------------- */

// Significance change handler: update selected.event.significance and mark dirty
for (const r of significanceButtons) {
  r.addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10);
    const event = appState.selected.event;
    const tl = appState.selected.timeline;
    if (!event) return;
    event.significance = v;
    initializeEvent(event);
    // mark timeline dirty when event changed
    if (tl.mode === 'edit') tl.dirty = true;
    updateSaveButton();
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
    updateSaveButton();
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


initTagsUI();
initTagPickerUI();

