import * as Util from './util.js';
import * as Calendar from './calendar.js';
import {TIME, DRAW} from './constants.js';
import {appState, draw, followHyperlink, timelineCache, getCanvasViewport} from './canvas.js';
import {getImageObjectUrlfromStorage, getImageObjectUrlfromCache} from './image.js';
import { renderTagNavigation } from './tags.js';

const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebar-close');
const tabButtons = Array.from(document.querySelectorAll('.panel__tabs .tab-btn'));
const panels = Array.from(document.querySelectorAll('.panel'));
const displayTextAreas = document.querySelectorAll('.display-textarea');

/* ------------------- Sidebar -------------------- */

let sidebarAnimRaf = null;

export function sidebarIsOpen() {
  return (sidebar.classList.contains('open'));
}

export function openSidebar() {
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
      if (appState.selected.item) setSidebarItemReadOnly(appState.selected.item);
    }
    if (panelId) showPanel(panelId);

    setActiveEditTab(target);
    if (!sidebar.classList.contains('open')) openSidebar();
    draw();
  });
}

export function showPanel(id) {
  for (const p of panels) {
    const isActive = p.id === id;
    p.toggleAttribute('hidden', !isActive);
    p.toggleAttribute('inert', !isActive);
  }
}

export function setActiveEditTab(targetPanelId) {
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


/* ------------------- Reconcile limited (embed) or full (all) functions -------------------- */

// Dynamic open function definitions allow us to redirect to panelEdits for the full app
let openSelectedViewAll = null;
let openSelectedItemAll = null;

export function registerEditPanelHandlers(handlers) {
    openSelectedViewAll = handlers.openSelectedViewAll;
    openSelectedItemAll = handlers.openSelectedItemAll;
}

export function openSelectedView(display) {

  if (openSelectedViewAll) {
    openSelectedViewAll(display);
    return;
  }

  const vw = appState.selected.view;
  const tl = timelineCache.get(vw.tlKey);
  appState.selected.timeline = tl;

  setSidebarViewReadOnly(vw);

  showPanel('panel-view-timeline');
  setActiveEditTab('timeline');

  if (display) openSidebar();
}

export function openSelectedItem(forceMainSubpanel) {

  if (openSelectedItemAll) {
    openSelectedItemAll(forceMainSubpanel);
    return;
  }

  const vw = appState.selected.view;

  setSidebarItemReadOnly(appState.selected.item);
  setSidebarViewReadOnly(vw);

  showPanel('panel-view-item');
  setActiveEditTab('item');

  openSidebar();
}


/* ------------------- Open view/item: read-only fields -------------------- */

export function setSidebarItemReadOnly(item) {
  // update read-only fields to item
  const $ = (id) => document.getElementById(id);
  
  // view item panel
  //$("item-label").textContent = item.label ?? '';
  $("item-label").innerHTML = item.label;

  $("item-date").innerHTML = Calendar.formatItemDates(item);;

  // if details looks like HTML, show as HTML; otherwise plain-text
  const isHtml = /<[a-z][\s\S]*>/i.test(item.details);  // necessary?
  if (isHtml) $("item-details").innerHTML = item.details;
  else $("item-details").textContent = item.details ?? '';

  updateThumbnailView(item, "item");
}

export function setSidebarViewReadOnly(vw) {
  // update read-only fields to vw
  const $ = (id) => document.getElementById(id);
  const tl = timelineCache.get(vw.tlKey);
  const tag = (vw.tagFilter) ? tl.tags.find(t => t.id === vw.tagFilter) : null;

  // View Timeline panel
  const title = (tag ? tag.label : tl.title) ?? '';  // title/label
  $("timeline-title").textContent = title;

  const details = (tag ? tag.details : tl.details) ?? '';  // details
  const isHtml = /<[a-z][\s\S]*>/i.test(details);
  if (isHtml) $("timeline-details").innerHTML = details;
  else $("timeline-details").textContent = details;

  if (tag) updateThumbnailView(tag, "tag") 
    else updateThumbnailView(tl, "timeline");

  // tags
  renderTagNavigation(vw);
}


/* ------------------- Title/Label and Detail controls -------------------- */

// hyperlink clicks within label and details
for (const txt of displayTextAreas) {
  txt.addEventListener('click', (e) => {
    const a = e.target.closest("a");
    if (!a) return;

    const file = a.getAttribute("tl");
    const tagID = a.getAttribute("tag");
    if (file || tagID) followHyperlink(file, tagID, appState.selected.view, true);
  });
}


/* ------------------- Image/thumbnail -------------------- */

export function updateThumbnailView(subject, prefix) {

  const pendingData = subject?.image?._pendingData;
  const thumb = subject?.image?.thumbnail ?? null;
  const filename = subject?.image?.file ?? null;
  const elemName = (prefix==='tag' ? 'timeline' : prefix) + '-thumb-view-img';
  const viewImg  = document.getElementById(elemName);

  if (pendingData) {
    viewImg.src = pendingData;
    viewImg.removeAttribute('width');
    viewImg.removeAttribute('height');
    viewImg.hidden = false;

  } else if (filename) {

    viewImg.hidden = false;
    viewImg.width = DRAW.THUMB_SIZE;
    viewImg.height = DRAW.THUMB_SIZE;
    viewImg.removeAttribute("src");

    let objectUrl = getImageObjectUrlfromCache(subject);

    if (objectUrl) {
      viewImg.src = objectUrl;
      return;
    }

    if (thumb) viewImg.src = thumb;

    getImageObjectUrlfromStorage(subject)
      .then(src => {
        if (src) viewImg.src = src;
      })
      .catch(err => {
        if (!Util.isLocalEnv)
          console.error(err);
      });

  } else if (thumb) {
    viewImg.src = thumb;
    viewImg.removeAttribute('width');
    viewImg.removeAttribute('height');
    viewImg.hidden = false;

  } else {
    viewImg.hidden = true;
    viewImg.removeAttribute("src");
  }
}
