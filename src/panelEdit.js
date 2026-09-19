import * as Calendar from './calendar.js';
import {DRAW} from './constants.js';
import {appState, draw, focusView, timelineCache} from './canvas.js';
import {positionLabels} from './render.js';
import {closeTimeline, loadTimeline, saveTimeline, publishTimeline, initializeItem, initializeTitle, exportTimeline, exportView, importTimeline} from './timeline.js';
import {openSaveAsTimelineDialog} from './fileDialog.js';
import {showModalDialog} from './confirmDialog.js';
import {clearImageBlobCache} from './image.js';
import {openImageThumbnailDialog, removeImageThumbnail} from './imageModal.js';
import {initTagsUI, renderTagsUI, initTagPickerUI, renderTagPickerUI} from './tagsEdit.js';
import {getAuthState, saveSessionState} from './session.js';
import {openSelectedView, openSidebar, closeSidebar, showPanel, setActiveEditTab, setSidebarView, setSidebarItem} from './panel.js';

const subpanelTabs = document.querySelectorAll('.subpanel__tabs');

const timelineEditBtn = document.getElementById('timeline-edit');
const timelineCancelBtn = document.getElementById('timeline-cancel');
const timelineSaveBtn = document.getElementById('timeline-save');
const timelinePublishBtn = document.getElementById('timeline-publish');
const viewTimelineFooter = document.getElementById('view-timeline-footer');
const importTimelineBtn = document.getElementById('timeline-import');
const exportTimelineBtn = document.getElementById('timeline-export');

const itemDeleteBtn = document.getElementById('item-delete');
const editItemLabel = document.getElementById('edit-item-label');
const editItemDetails = document.getElementById('edit-item-details');
const editTimelineTitle = document.getElementById('edit-timeline-title');
const editTimelineDetails = document.getElementById('edit-timeline-details');
const editTagDetails = document.getElementById('edit-tag-details');
const colorTargetRadios = Array.from(document.querySelectorAll('input[name="color-target"]'));
const colorButtons = Array.from(document.querySelectorAll('.color-btn'));
const itemTypeButtons = Array.from(document.querySelectorAll('input[name="item-type"]'));
const dateSpecificationButtons = Array.from(document.querySelectorAll('input[name="date-spec"]'));
const prominenceSlider = document.getElementById('item-prominence');

const selectItemThumbnailBtn = document.getElementById('select-item-thumbnail-btn');
const closeItemThumbnailBtn = document.getElementById('close-item-thumbnail-btn');
const selectTimelineThumbnailBtn = document.getElementById('select-timeline-thumbnail-btn');
const closeTimelineThumbnailBtn = document.getElementById('close-timeline-thumbnail-btn');
const selectTagThumbnailBtn = document.getElementById('select-tag-thumbnail-btn');
const closeTagThumbnailBtn = document.getElementById('close-tag-thumbnail-btn');


/* ------------------- Subpanel navigation (scoped per panel) -------------------- */

for (const tabsEl of subpanelTabs) {
  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.subtab-btn');
    if (!btn || !tabsEl.contains(btn)) return;

    e.preventDefault();
    if (btn.disabled) return;

    const targetId = btn.dataset.target;  
    if (!targetId) return;

    showSubpanel(targetId);
  });
}

function showSubpanel(targetId) {

  const targetEl = document.getElementById(targetId);  // the tab to show
  const panelEl = targetEl.closest('.panel');  // the edit item or timeline panel

  for (const b of panelEl.querySelectorAll('.subtab-btn')) {  // iterate subpanel buttons on the panel
    const isTarget = b.dataset.target === targetId;
    b.classList.toggle('is-active', isTarget);
    b.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  }

  for (const sp of panelEl.querySelectorAll('.subpanel')) {  // iterate subpanels on the panel
    const isActive = sp === targetEl;
    sp.toggleAttribute('hidden', !isActive);
    sp.toggleAttribute('inert', !isActive);
  }

  // import/export button config varies by subpanel
  if (!document.getElementById("panel-edit-timeline").hidden) {
    updateImportExportButtons();
  }
}


/* ------------------- Open view/item -------------------- */

export function editSelectedView(display) {
  const vw = appState.selected.view;
  const tl = timelineCache.get(vw.tlKey);
  appState.selected.timeline = tl;
  const editMode = (tl._mode==="edit");

  const panel = editMode ? "panel-edit-timeline" : "panel-view-timeline";
  showPanel(panel);
  setActiveEditTab('timeline');

  if (editMode && vw.tagFilter) showSubpanel('subpanel-edit-timeline-tag');

  setSidebarEditView(vw);
  
  if (display) openSidebar();

  //if (editMode && !appState.isTouchScreen) editTimelineTitle.focus();
}

export function editSelectedItem(forceMainSubpanel) {
  const vw = appState.selected.view;
  const tl = timelineCache.get(vw.tlKey);
  const editMode = (tl._mode==="edit");

  setSidebarEditItem(appState.selected.item);
  setSidebarEditView(vw);

  const panel = editMode ? "panel-edit-item" : "panel-view-item";
  showPanel(panel);
  setActiveEditTab('item');

  if (forceMainSubpanel) showSubpanel('subpanel-edit-item-main');  // go to main subtab for new item

  openSidebar();
  if (editMode && forceMainSubpanel && !appState.isTouchScreen) editItemLabel.focus(); 
}

function setSidebarEditItem(item) {
  
  setSidebarItem(item);

  // update sidebar (all panels) to selected item
  const $ = (id) => document.getElementById(id);
  
  /*
  // view item panel
  //$("item-label").textContent = e.label ?? '';
  $("item-label").innerHTML = item.label;

  $("item-date").innerHTML = Calendar.formatItemDates(item);;

  // if details looks like HTML, show as HTML; otherwise plain-text
  const isHtml = /<[a-z][\s\S]*>/i.test(item.details);  // necessary?
  if (isHtml) $("item-details").innerHTML = item.details;
  else $("item-details").textContent = item.details ?? '';
  */

  // edit item panel
  editItemLabel.value = item.label ?? '';
  editItemDetails.value = item.details ?? '';
  $('item-date-display').value = Calendar.formatItemDates(item);

  updateItemTypeButtons();
  updateDateSpecificationButtons();
  updateProminenceSlider();
  updateDateSpecificationState();
  
  updateColorSelectorState();
  updateColorButtons();

  //updateImageThumbnail(item, "item");
  updateThumbnailEdit(item, "item");
  /*
  updateThumbnailView(item, "item");
  */
  renderTagPickerUI(appState.selected.timeline, item);

  updateSaveButton();  // disable if timeline is not 'dirty'
}

function setSidebarEditView(vw) {
  const $ = (id) => document.getElementById(id);
  const tl = timelineCache.get(vw.tlKey);
  const tag = (vw.tagFilter) ? tl.tags.find(t => t.id === vw.tagFilter) : null;

  setSidebarView(vw);

  /*
  // View Timeline panel
  const title = (tag ? tag.label : tl.title) ?? '';  // title/label
  $("timeline-title").textContent = title;

  const details = (tag ? tag.details : tl.details) ?? '';  // details
  const isHtml = /<[a-z][\s\S]*>/i.test(details);
  if (isHtml) $("timeline-details").innerHTML = details;
  else $("timeline-details").textContent = details;

  if (tag) updateThumbnailView(tag, "tag") 
    else updateThumbnailView(tl, "timeline");
*/
  // tag (that the view is filtered by)
  setSidebarTag(tag);

  // Edit Timeline
  editTimelineTitle.value = tl.title ?? '';       // title
  editTimelineDetails.value = tl.details ?? '';   // details

  // thumbnail
  updateThumbnailEdit(tl, "timeline");

  // tags
  //renderTagNavigation(vw);  // navigation
  renderTagsUI(tl);         // definition

  // display 'Edit' and 'Publish' buttons for private timelines
  viewTimelineFooter.toggleAttribute('hidden', tl._scope==='public');

  // enable/disable Publish button
  const canPublish = (appState.configuration?.canPublish ?? false);
  $("timeline-publish").disabled = !canPublish;

  updateSaveButton();
  updateImportExportButtons();
}

function setSidebarTag(tag) {
  const tagBtn = document.getElementById('subtab-btn-tag');

  // if no tag but tag button is active, return to Main subpanel
  if (!tag && tagBtn.classList.contains('is-active')) showSubpanel('subpanel-edit-timeline-main')

  // show/hide tag subpanel
  tagBtn.disabled = !tag;
  tagBtn.hidden = !tag;

  // tag details
  const details = tag?.details ?? '';
  editTagDetails.value = details;

  // tag label (put on the subpanel button)
  const tabLabel = tag?.label ?? 'tag';
  tagBtn.textContent = tabLabel;

  updateThumbnailEdit(tag, "tag");
}

export function forceEditItemMain() {
  // open the Edit Item Main subpanel
  showPanel('panel-edit-item');
  setActiveEditTab('item');
  showSubpanel('subpanel-edit-item-main');
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
  // check/ensure session is still active
  if (!await checkSession()) return;

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
      focusView(vwBelow, true);  // closing the sidebar would conflict with the zoom animation
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
  if (appState.globalBusy) return;
  e.preventDefault();
  trySaveTimeline();
});

async function trySaveTimeline() {
  // check/ensure session is still active
  if (!await checkSession()) return;

  const tl = appState.selected.timeline;
  if (!tl._file) {
    // new timeline... open dialog
    openSaveAsTimelineDialog('');
  } else {
    saveTimeline(tl).then(() => {
      updateSaveButton();
    });
  }
}

async function checkSession() {
  const userId = await getAuthState();
  if (userId) return(true);
  
  const ok = await showModalDialog({message: 'Session timeout.  Click OK to sign in.'});
  if (ok) {
    saveSessionState(true);
    window.location.href = '/.auth/login/auth0';
  };
}

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
  deleteSelectedItem();
});

function deleteSelectedItem() {
  const item = appState.selected.item;
  const tl = appState.selected.timeline;
  const items = tl.items;
  const idx = items.indexOf(item);

  // handle thumbnail
  if (item.image) {
    clearImageBlobCache(item, tl);
    // deleteItemImage(item);  // can't delete here; user might cancel changes
  }

  items.splice(idx, 1);
  appState.selected.item = null;
  markDirty(tl);
  draw(true);
  openSelectedView(false);
}

timelinePublishBtn.addEventListener('click', (e) => {
  if (appState.globalBusy) return;
  e.preventDefault();
  tryPublishTimeline();
});

async function tryPublishTimeline() {
  // check/ensure session is still active
  if (!await checkSession()) return;

  const tl = appState.selected.timeline;
  
  const ok = await showModalDialog({message:'Make timeline available to the public?'});
  if (!ok) return;

  publishTimeline(tl);
}


/* ------------------- Title/Label and Detail controls -------------------- */

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

editTagDetails.addEventListener('input', (e) => {
  const tl = appState.selected.timeline;
  const vw = appState.selected.view;
  const tag = (vw.tagFilter) ? tl.tags.find(t => t.id === vw.tagFilter) : null;
  if (!tag) return;

  const txt = e.target.value;
  tag.details = txt;
  
  markDirty(tl);
});


/* ------------------- Item type / date specification / prominence -------------------- */

for (const r of itemTypeButtons) {
  r.addEventListener('change', (e) => {
    const item = appState.selected.item;
    const tl = appState.selected.timeline;
    if (!item) return;

    item.itemType = e.target.value;

    if (item.itemType === 'period') {
      item.dateSpecification = 'range';
      item.color = DRAW.DEFAULT_LINE_COLOR;
    } else {
      item.color = 'white';
      item.colorLeft = 'black';
      item.colorRight = 'black';
    }

    initializeItem(item);
    if (tl?._mode === 'edit') markDirty(tl);

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


/* ------------------- Image/thumbnail -------------------- */

selectItemThumbnailBtn.addEventListener('click', e => {
  e.preventDefault();
  editThumbnail("item");
});

closeItemThumbnailBtn.addEventListener('click', e => {
  e.preventDefault();
  deleteThumbnail("item");
});

selectTimelineThumbnailBtn.addEventListener('click', e => {
  e.preventDefault();
  editThumbnail("timeline");
});

closeTimelineThumbnailBtn.addEventListener('click', e => {
  e.preventDefault();
  deleteThumbnail("timeline");
});

selectTagThumbnailBtn.addEventListener('click', e => {
  e.preventDefault();
  editThumbnail("tag");
});

closeTagThumbnailBtn.addEventListener('click', e => {
  e.preventDefault();
  deleteThumbnail("tag");
});

function editThumbnail(target) {

  const tl = appState.selected.timeline;

  if (!tl._file) {
    showModalDialog({
      message: "Timeline must be saved first.",
      showCancelBtn: false
    });
    return;
  }

  openImageThumbnailDialog(target);
}

function deleteThumbnail(target) {
  removeImageThumbnail(target);
}

export function updateThumbnailEdit(subject, prefix) {

  const thumb = subject?.image?.thumbnail ?? null;

  const editImg  = document.getElementById(`${prefix}-thumb-edit-img`);
  const selectBtn = document.getElementById(`select-${prefix}-thumbnail-btn`);
  const closeBtn = document.getElementById(`close-${prefix}-thumbnail-btn`);

  // enable/disable thumbnail button
  const canUseThumbnails = (appState.configuration?.canUseThumbnails ?? false);
  selectBtn.disabled = !canUseThumbnails;
  closeBtn.disabled = !canUseThumbnails;

  if (editImg) {
    if (thumb) {
      editImg.src = thumb;
      editImg.hidden = false;
      if (closeBtn) closeBtn.hidden = false;
    } else {
      editImg.removeAttribute("src");
      editImg.hidden = true;
      if (closeBtn) closeBtn.hidden = true;
    }
  }

}

initTagsUI();
initTagPickerUI();


/* ------------------- Import/Export buttons -------------------- */

function getEditTimelineSubpanel() {
  // identify the active Edit Timeline subpanel
  const $ = (id) => document.getElementById(id);
  return(
    !$("subpanel-edit-timeline-main").hidden ? "main" :
    !$("subpanel-edit-timeline-tags").hidden ? "tags" : 
    !$("subpanel-edit-timeline-tag").hidden ? "tag" : "none"
  );
}

function updateImportExportButtons() {
  const subpanel = getEditTimelineSubpanel();

  // adjust visibility/hover to currently selected Edit Timeline tab
  const exportTitle = (subpanel === "tag") ? "Export view" : "Export timeline";
  exportTimelineBtn.title = exportTitle;
  exportTimelineBtn.setAttribute("aria-label", exportTitle);
  exportTimelineBtn.hidden = (subpanel === "tags" || subpanel === "none");
  importTimelineBtn.hidden = (subpanel != "main");
}

exportTimelineBtn.addEventListener('click', (e) => {
  if (appState.globalBusy) return;

  const subpanel = getEditTimelineSubpanel();
  if (subpanel === "tag") {
    exportView(appState.selected.view);
  } else {
    exportTimeline(appState.selected.timeline);
  }
});

importTimelineBtn.addEventListener('click', async (e) => {
  if (appState.globalBusy) return;

  e.preventDefault();

  const imported = await importTimeline(
    appState.selected.timeline
  );

  if (imported) {
    openSelectedView(false);
  }
});