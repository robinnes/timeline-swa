import * as Util from './util.js';
import {TIME} from './constants.js';
import {appState, draw, followHyperlink, zoomToView, timelineCache, getCanvasViewport} from './canvas.js';
import {positionLabels} from './render.js';
import {closeTimeline, loadTimeline, saveTimeline, publishTimeline, initializeItem, initializeTitle} from './timeline.js';
import {openSaveAsTimelineDialog} from './fileDialog.js';
import {showModalDialog} from './confirmDialog.js';
import {getImageThumbnail, removeImageThumbnail} from './image.js';
import {initTagsUI, renderTagsUI, initTagPickerUI, renderTagPickerUI, renderTagNavigation} from './tags.js';
import {formatItemDate} from './ticks.js';

const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebar-close');

const tabButtons = Array.from(document.querySelectorAll('.panel__tabs .tab-btn'));
const panels = Array.from(document.querySelectorAll('.panel'));
const subpanelTabs = document.querySelectorAll('.subpanel__tabs');

const displayTextAreas = document.querySelectorAll('.display-textarea');

const timelineEditBtn = document.getElementById('timeline-edit');
const timelineCancelBtn = document.getElementById('timeline-cancel');
const timelineSaveBtn = document.getElementById('timeline-save');
const timelinePublishBtn = document.getElementById('timeline-publish');
const viewTimelineFooter = document.getElementById('view-timeline-footer');

const itemDeleteBtn = document.getElementById('item-delete');
const editItemLabel = document.getElementById('edit-item-label');
const editItemDetails = document.getElementById('edit-item-details');
const editTimelineTitle = document.getElementById('edit-timeline-title');
const editTimelineDetails = document.getElementById('edit-timeline-details');
const colorTargetRadios = Array.from(document.querySelectorAll('input[name="color-target"]'));
const colorButtons = Array.from(document.querySelectorAll('.color-btn'));
const selectThumbnailBtn = document.getElementById('select-thumbnail-btn');
const closeThumbnailBtn = document.getElementById('close-thumbnail-btn');

//const significanceButtons = Array.from(document.querySelectorAll('input[name="item-significance"]'));
const itemTypeButtons = Array.from(document.querySelectorAll('input[name="item-type"]'));
const dateSpecificationButtons = Array.from(document.querySelectorAll('input[name="date-spec"]'));
const prominenceSlider = document.getElementById('item-prominence');

/* ------------------- Sidebar -------------------- */

let sidebarAnimRaf = null;

export function sidebarIsOpen() {
  return (sidebar.classList.contains('open'));
}

function openSidebar() {
  if (sidebarIsOpen()) return;
  sidebar.classList.add('open');
  sidebar.setAttribute('aria-hidden', 'false');
  animateCanvasWithSidebar();
  sidebar.focus();
}

export function closeSidebar() {
  if (!sidebarIsOpen()) return;
  sidebar.classList.remove('open');
  sidebar.setAttribute('aria-hidden', 'true');
  appState.selected.item = null;
  appState.selected.timeline = null;
  animateCanvasWithSidebar();
  canvas.focus();
}
sidebarClose.addEventListener('click', closeSidebar);

function animateCanvasWithSidebar() {
  if (sidebarAnimRaf) cancelAnimationFrame(sidebarAnimRaf);

  // record date range visible when animation starts
  const startVp = getCanvasViewport();
  const anchorLeftTime = Util.pxToTime(startVp.left);
  const anchorRightTime = Util.pxToTime(startVp.right);
  const fixedVisibleSpan = anchorRightTime - anchorLeftTime;

  const start = performance.now();
  const duration = 300;

  appState.pan.ignoreClick = true;  // ignore clicks while animating

  function step(now) {
    const vp = getCanvasViewport();

    // zoom factor (msPerPx) needs to "squish" as the panel opens
    appState.offsetMs = anchorLeftTime - TIME.EPOCH;
    appState.msPerPx = fixedVisibleSpan / vp.width;

    draw(true);

    if (now - start < duration) {
      sidebarAnimRaf = requestAnimationFrame(step);
    } else {
      sidebarAnimRaf = null;
      appState.pan.ignoreClick = false;

      // final exact snap
      const finalVp = getCanvasViewport();
      appState.offsetMs = anchorLeftTime - TIME.EPOCH;
      appState.msPerPx = fixedVisibleSpan / finalVp.width;
      draw(true);
    }
  }

  sidebarAnimRaf = requestAnimationFrame(step);
}


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
    if (target === 'timeline') {
      panelId = ((appState.selected.timeline._mode === "edit") ? 'panel-edit-timeline' : 'panel-view-timeline');
    } else if (target === 'item') {
      panelId = ((appState.selected.timeline._mode === "edit") ? 'panel-edit-item' : 'panel-view-item');
      if (appState.selected.item) setSidebarItem(appState.selected.item);
    }
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
    // Disable 'item' tab when there is no selected item
    if (btn.dataset.target === 'item') {
      const shouldDisable = !appState.selected.item;
      btn.disabled = shouldDisable;
      btn.classList.toggle('is-disabled', shouldDisable);
      btn.setAttribute('aria-disabled', shouldDisable ? 'true' : 'false');
    }
  }
}


/* ------------------- Edit/save/delete/publish buttons -------------------- */

timelineEditBtn.addEventListener('click', (e) => {
  e.preventDefault();
  appState.selected.timeline._mode = 'edit';
  openSelectedView(false);
  draw();
});

timelineCancelBtn.addEventListener('click', (e) => {
  e.preventDefault();
  cancelTimelineEdit();
});

async function cancelTimelineEdit() {
  const tl = appState.selected.timeline;

  if (!tl._file) {
    const ok = await showModalDialog({message:'Abandon changes to timeline?'});
    if (!ok) return;

    // close timeline
    const tlKey = tl._key;
    closeTimeline(tlKey);

    // purge related view (there can be only one for an unsaved timeline)
    const view = appState.views.find(vw => vw.tlKey === tlKey);
    const viewIdx = appState.views.indexOf(view);
    appState.views.splice(viewIdx, 1);
    
    if (appState.views.length === 0)
      closeSidebar();
    else {
      const vwBelow = appState.views[Math.max(viewIdx-1, 0)];
      appState.selected.view = vwBelow;
      appState.selected.item = null;
      openSelectedView(false);
      zoomToView(vwBelow);  // closing the sidebar would conflict with the zoom animation
    }

  } else if (tl._dirty) {
    const ok = await showModalDialog({message:'Abandon changes to timeline and revert to saved version?'});
    if (!ok) return;

    // reload timeline from storage
    loadTimeline(tl._file).then((newTL) => {
      // update UI to new timeline object
      appState.selected.timeline = newTL;
      openSelectedView(false);
      draw(true);
    });
  } else {
    tl._mode = 'view';
    openSelectedView(false);
    draw();
  }
}

timelineSaveBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const tl = appState.selected.timeline;
  if (!tl._file) {
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
  const shouldDisable = (appState.selected.timeline._mode === 'view' || !appState.selected.timeline._dirty);
  timelineSaveBtn.disabled = shouldDisable;
}

export function markDirty(tl) {
  tl._dirty = true;
  updateSaveButton?.();
}

itemDeleteBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const tl = appState.selected.timeline;
  const items = tl.items;
  const idx = items.indexOf(appState.selected.item);
  items.splice(idx, 1);
  appState.selected.item = null;
  markDirty(tl);
  draw(true);
  openSelectedView(false);
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


/* ------------------- Edit item panel -------------------- */

editItemLabel.addEventListener('input', (e) => {
  const s = e.target.value;
  const item = appState.selected.item;
  item.label = s;
  markDirty(appState.selected.timeline);
  initializeItem(item);  // appearance of bubble label may change
  positionLabels();
  draw();
});

editItemDetails.addEventListener('input', (e) => {
  const v = e.target.value;
  const item = appState.selected.item;
  item.details = v;
  markDirty(appState.selected.timeline);
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

editTimelineTitle.addEventListener('input', (e) => {
  const s = e.target.value;
  const tl = appState.selected.timeline;
  tl.title = s;
  initializeTitle(tl);  // update titleWidth for drawing
  markDirty(tl);
  draw();
});

editTimelineDetails.addEventListener('input', (e) => {
  const v = e.target.value;
  const tl = appState.selected.timeline;
  tl.details = v;
  markDirty(tl);
});


/* ------------------- Hyperlinks -------------------- */

// hyperlink clicks within label and details
for (const txt of displayTextAreas) {
  txt.addEventListener('click', (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    //e.preventDefault();  -- no, we need normal hyperlinks to work
    if (followHyperlink(appState.selected.view, a, true)) {
      setSidebarView(appState.selected.view);
    };
  });
}

/* ------------------- Open view/item -------------------- */

export function formatItemDates(item) {
  if (item.dateSpecification==='point') return formatItemDate(item.date);

  const from = formatItemDate(item.dateFrom); 
  const to = formatItemDate(item.dateTo);
  return `${from ?? "?"} - ${to ?? "?"}`;
}

export function openSelectedView(display) {
  const vw = appState.selected.view;
  const tl = timelineCache.get(vw.tlKey);
  appState.selected.timeline = tl;
  const editMode = (tl._mode==="edit");

  setSidebarView(vw);

  const panel = editMode ? "panel-edit-timeline" : "panel-view-timeline";
  showPanel(panel);
  setActiveEditTab('timeline');

  if (display) openSidebar();

  if (editMode && !appState.isTouchScreen) editTimelineTitle.focus();
}

export function openSelectedItem(display) {
  const vw = appState.selected.view;
  const tl = timelineCache.get(vw.tlKey);
  const editMode = (tl._mode==="edit");

  setSidebarItem(appState.selected.item);
  setSidebarView(vw);

  const panel = editMode ? "panel-edit-item" : "panel-view-item";
  showPanel(panel);
  setActiveEditTab('item');

  if (display) openSidebar();

  if (editMode && !appState.isTouchScreen) editItemLabel.focus(); 
}

export function setSidebarItem(item) {
  // update sidebar (all panels) to selected item
  const $ = (id) => document.getElementById(id);
  
  // view item panel
  //$("item-label").textContent = e.label ?? '';
  $("item-label").innerHTML = item.label;

  $("item-date").innerHTML = formatItemDates(item);;

  // if details looks like HTML, show as HTML; otherwise plain-text
  const isHtml = /<[a-z][\s\S]*>/i.test(item.details);  // necessary?
  if (isHtml) $("item-details").innerHTML = item.details;
  else $("item-details").innerText = item.details ?? '';

  // edit item panel
  editItemLabel.value = item.label ?? '';
  editItemDetails.value = item.details ?? '';
  $('item-date-display').value = formatItemDates(item);

  //updateSignificanceButton();
  updateItemTypeButtons();
  updateDateSpecificationButtons();
  updateProminenceSlider();
  updateDateSpecificationState();
  
  updateColorSelectorState();
  updateColorButtons();

  // item thumbnail (on view and edit panels)
  const thumb = item.thumbnail;
  const imgs = [
    $('item-thumb-edit-img'),
    $('item-thumb-view-img')
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

  renderTagPickerUI(appState.selected.timeline, item);

  updateSaveButton();  // disable if timeline is not 'dirty'
}

function setSidebarView(vw) {
  // update sidebar (all panels) to vw
  const $ = (id) => document.getElementById(id);
  const tl = timelineCache.get(vw.tlKey);

  if (!vw.tagFilter) {
    // title
    $("timeline-title").textContent = tl.title ?? '';
  
    // details
    const isHtml = /<[a-z][\s\S]*>/i.test(tl.details);  // necessary?
    if (isHtml) $("timeline-details").innerHTML = tl.details;
    else $("timeline-details").innerText = tl.details ?? '';

  } else {
    // if view is filtered to a tag, display only tag label for title (no details)
    const tags = tl.tags.filter(t => t.id === vw.tagFilter);
    $("timeline-title").textContent = tags[0]?.label;
    $("timeline-details").innerText = "";
  }

  // tag navigation
  renderTagNavigation(vw);

  // no 'Edit' button for public timelines
  if (tl._scope === "public") 
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

/*
// Significance change handler: update selected.item.significance and mark dirty
for (const r of significanceButtons) {
  r.addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10);
    const item = appState.selected.item;
    const tl = appState.selected.timeline;
    if (!item) return;
    item.prominence = v;
    initializeItem(item);
    if (tl._mode === 'edit') markDirty(tl);  // mark timeline dirty when item changed
    updateColorSelectorState();
    updateColorButtons(); // significance switch can change color
    draw(true);  // may need to reposition labels
  });
}

function updateSignificanceButton() {
  // set significance radio based on selected.item.significance (if present)
  const sig = appState.selected.item.prominence ?? null;
  if (sig != null) {
    const el = document.querySelector(`input[name="item-significance"][value="${sig}"]`);
    if (el) el.checked = true;
  } else {
    // default to normal point (value 2)
    const el = document.querySelector('input[name="item-significance"][value="2"]');
    if (el) el.checked = true;
  }
}

function updateColorSelectorState() {
  // color options depend on prominence: no left/right for Point items, etc.
  const e = appState.selected.item;
  if (!e) return;
  const isPoint = e.prominence <= 3;
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
*/


/* ------------------- Item type / date specification / prominence -------------------- */

for (const r of itemTypeButtons) {
  r.addEventListener('change', (e) => {
    const item = appState.selected.item;
    const tl = appState.selected.timeline;
    if (!item) return;

    item.itemType = e.target.value;

    if (item.itemType === 'period') {
      item.dateSpecification = 'range';
    }

    initializeItem(item);
    if (tl?._mode === 'edit') markDirty(tl);

    /*updateItemTypeButtons();
    updateDateSpecificationButtons();
    updateProminenceSlider();
    updateDateSpecificationState();
    updateColorSelectorState();
    updateColorButtons();*/
    setSidebarItem(item);
    draw(true);
  });
}

for (const r of dateSpecificationButtons) {
  r.addEventListener('change', (e) => {
    const item = appState.selected.item;
    const tl = appState.selected.timeline;
    if (!item) return;
    if (item.itemType === 'period') return;

    item.dateSpecification = e.target.value;

    initializeItem(item);
    if (tl?._mode === 'edit') markDirty(tl);

    /*updateDateSpecificationButtons();
    updateDateSpecificationState();
    updateColorSelectorState();
    updateColorButtons();*/
    setSidebarItem(item);
    draw(true);
  });
}

prominenceSlider?.addEventListener('input', (e) => {
  const item = appState.selected.item;
  const tl = appState.selected.timeline;
  if (!item) return;

  item.prominence = parseInt(e.target.value, 10);

  initializeItem(item);
  if (tl?._mode === 'edit') markDirty(tl);

  updateProminenceSlider();
  draw(true);
});

function updateItemTypeButtons() {
  const item = appState.selected.item;
  if (!item) return;

  const value = item.itemType ?? 'event';
  const el = document.querySelector(`input[name="item-type"][value="${value}"]`);
  if (el) el.checked = true;
}

function updateDateSpecificationButtons() {
  const item = appState.selected.item;
  if (!item) return;

  const value = item.dateSpecification ?? 'point';
  const el = document.querySelector(`input[name="date-spec"][value="${value}"]`);
  if (el) el.checked = true;
}

function updateProminenceSlider() {
  const item = appState.selected.item;
  if (!item || !prominenceSlider) return;
  prominenceSlider.value = String(item.prominence ?? 3);
}

function updateDateSpecificationState() {
  const item = appState.selected.item;
  if (!item) return;

  const disableDateSpec = item.itemType === 'period';

  dateSpecificationButtons.forEach(radio => {
    const label = radio.closest('.toggle-btn');
    radio.disabled = disableDateSpec;

    if (label) {
      label.classList.toggle('is-disabled', disableDateSpec);
      label.setAttribute('aria-disabled', disableDateSpec ? 'true' : 'false');
    }

    if (disableDateSpec && radio.value === 'range') {
      radio.checked = true;
    }
  });
}

function updateColorSelectorState() {
  const item = appState.selected.item;
  if (!item) return;

  const disableTargets = item.itemType === 'event';
  const targetRadios = document.querySelectorAll('input[name="color-target"]');

  targetRadios.forEach(radio => {
    const label = radio.closest('.color-sel-btn');
    radio.disabled = disableTargets;

    if (label) {
      label.classList.toggle('is-disabled', disableTargets);
      label.setAttribute('aria-disabled', disableTargets ? 'true' : 'false');
    }
  });

  if (disableTargets) {
    const mainRadio = document.querySelector('input[name="color-target"][value="main"]');
    if (mainRadio) mainRadio.checked = true;
  }
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
    const item = appState.selected.item;
    if (!item) return;
    const newColor = btn.dataset.color;
    const target = getSelectedColorTarget();
    
    switch (target) {
      case 'left':
        item.colorLeft = newColor;
        break;
      case 'right':
        item.colorRight = newColor;
        break;
      default: // 'main'
        item.color = newColor;
    }
    markDirty(item._timeline);
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
  const e = appState.selected.item;
  if (!e) return;
  //const target = getSelectedColorTarget();
  const target = (e.itemType === 'event') ? 'main' : getSelectedColorTarget();

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

