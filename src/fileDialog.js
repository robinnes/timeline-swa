import * as Util from './util.js';
import {loadTimeline, saveTimeline} from './timeline.js';
import {getTimelineList} from './database.js';
import {appState, getTimeline, openView} from './canvas.js';
import {updateSaveButton} from './panel.js';
import {openModal, closeModal} from './appmenu.js';
import {saveSessionState} from './session.js';
import {showModalDialog} from './confirmDialog.js';

const openTimelineModal = document.getElementById('open-timeline-modal');
const openTimelineTbody = document.getElementById('open-timeline-tbody');
const openTimelineTable = document.querySelector('.open-dialog__table');
const saveasTimelineModalTitle = document.getElementById('saveas-timeline-modal-title');
const openTimelineFilenameInput = document.getElementById('open-timeline-filename-input');
const openTimelineDialog = openTimelineModal ? openTimelineModal.querySelector('.modal__dialog') : null;
const openTimelineOpenBtn = document.getElementById('open-timeline-open-btn');
const openTimelineDeleteBtn = document.getElementById('open-timeline-delete-btn');
const fileModalScopeTabs = document.getElementById( 'filemodal-scope-tabs');
const fileModalTabButtons = Array.from(document.querySelectorAll('.filemodal__tabs .tab-btn'));

// Dialog functions as "Open" or "Save As"
const FILE_DIALOG_MODE_OPEN = 'open';
const FILE_DIALOG_MODE_SAVE_AS = 'save-as';
let fileDialogMode = FILE_DIALOG_MODE_OPEN;

const TIMELINE_FILE_EXT = '.json.gz';


/******************************* Header and Public/Private tabs *******************************/

// Attach click handlers to tab buttons
for (const btn of fileModalTabButtons) {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (btn.disabled || appState.globalBusy) return;
    const selectedScope = btn.dataset.target;
    setActiveFileScope(selectedScope);
    refreshTimelineList(selectedScope);
  });
}

function setActiveFileScope(scope) {
  for (const btn of fileModalTabButtons) {
    const isTarget = btn.dataset.target === scope;
    btn.classList.toggle('is-active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  }
}

function getActiveFileScope() {
  // return "public" or "private", whichever is selected
  const activeButton = fileModalTabButtons.find(btn => btn.classList.contains('is-active'));
  return activeButton?.dataset.target;
}

function updateFileScopeButtons() {
  // only enable 'Private' button if user is logged in
  const authenticated = appState.authentication.userId != null;

  // if "Private" button is selected and user is not authenticated, select "Public"
  const currentScope = getActiveFileScope();
  if (currentScope === "private" && !authenticated) setActiveFileScope("public");

  // enable/disable the "Private button"
  const privateButton = fileModalTabButtons.find(btn => btn.dataset.target === 'private');
  privateButton.disabled = !authenticated;
  privateButton.classList.toggle('is-disabled', !authenticated);
  privateButton.setAttribute('aria-disabled', !authenticated ? 'true' : 'false');
}


/******************************* File list table *******************************/

let openDialogBlobs = [];
let openDialogSelectedName = null;
let openDialogSort = { key: 'name', direction: 'asc' };

async function refreshTimelineList(scope) {
  Util.showGlobalBusyCursor();

  openDialogSelectedName = null;
  openTimelineOpenBtn.disabled = true;
  updateDeleteButtonState();

  try {
    // return simulated list if running locally
    if (await Util.isLocalEnv()) {    
      const fakeBlobs = await tempSimulateList(scope);
      openDialogBlobs = fakeBlobs || [];
    } else {
      const blobs = await getTimelineList(scope);
      openDialogBlobs = blobs || [];
    }

    renderOpenTimelineTable();

  } catch (err) {
    console.error(err);
    openDialogBlobs = [];

  } finally {
    Util.hideGlobalBusyCursor();
  }
}

function renderOpenTimelineTable() {
  if (!openTimelineTbody) return;

    openTimelineTbody.innerHTML = '';

  // No timelines
  if (!openDialogBlobs || openDialogBlobs.length === 0) {
    const tr = document.createElement('tr');
    tr.classList.add('open-dialog__row', 'open-dialog__row--empty');

    const td = document.createElement('td');
    td.colSpan = 2;
    td.textContent = 'No timelines found.';
    tr.appendChild(td);

    openTimelineTbody.appendChild(tr);
    openTimelineOpenBtn.disabled = true;
    openDialogSelectedName = null;
    updateDeleteButtonState();
    return;
  }

  const { key, direction } = openDialogSort;

  const sorted = [...openDialogBlobs].sort((a, b) => {
    if (key === 'name') {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      if (aName < bName) return direction === 'asc' ? -1 : 1;
      if (aName > bName) return direction === 'asc' ? 1 : -1;
      return 0;
    } else if (key === 'lastModified') {
      const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      if (aTime < bTime) return direction === 'asc' ? -1 : 1;
      if (aTime > bTime) return direction === 'asc' ? 1 : -1;
      return 0;
    }
    return 0;
  });

  sorted.forEach((blob) => {
    const tr = document.createElement('tr');
    tr.classList.add('open-dialog__row');

    const displayName = Util.removeTimelineFileExt(blob.name);
    tr.dataset.blobName = displayName;

    const nameTd = document.createElement('td');
    nameTd.textContent = displayName;

    const lastModifiedTd = document.createElement('td');
    lastModifiedTd.textContent = blob.lastModified
      ? new Date(blob.lastModified).toLocaleString()
      : '';

    tr.appendChild(nameTd);
    tr.appendChild(lastModifiedTd);

    tr.addEventListener('click', () => {
      if (appState.globalBusy) return;
      openDialogSelectedName = tr.dataset.blobName;
      if (fileDialogMode === FILE_DIALOG_MODE_SAVE_AS) {
        openTimelineFilenameInput.value = openDialogSelectedName;
        openTimelineOpenBtn.disabled = false;
      }

      // Highlight selected row
      openTimelineTbody.querySelectorAll('.open-dialog__row').forEach((row) => {
        row.classList.toggle('is-selected', row === tr);
      });

      openTimelineOpenBtn.disabled = !openDialogSelectedName;
      updateDeleteButtonState();
    });

    // double-click to open immediately
    tr.addEventListener('dblclick', () => {
      if (appState.globalBusy) return;
      openDialogSelectedName = tr.dataset.blobName;
      openTimelineOpenBtn.disabled = !openDialogSelectedName;
      updateDeleteButtonState();
      handleOpenTimelineConfirm();
    });

    openTimelineTbody.appendChild(tr);
  });

  // Update header sort indicators
  document
    .querySelectorAll('.open-dialog__th--sortable')
    .forEach((th) => {
      th.classList.remove('open-dialog__th--sorted-asc', 'open-dialog__th--sorted-desc');
      const sortKey = th.getAttribute('data-open-sort-key');
      if (sortKey === key) {
        th.classList.add(
          direction === 'asc'
            ? 'open-dialog__th--sorted-asc'
            : 'open-dialog__th--sorted-desc'
        );
      }
    });
}

// Keyboard scrolling via arrow buttons
openTimelineTable.addEventListener('keydown', (ev) => {
  if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
  ev.preventDefault();

  // All non-empty rows
  const rows = Array.from(
    openTimelineTbody.querySelectorAll('.open-dialog__row:not(.open-dialog__row--empty)')
  );
  if (!rows.length) return;

  // Find current selection
  let index = rows.findIndex((row) => row.classList.contains('is-selected'));

  // If nothing is selected yet, start at first/last depending on arrow
  if (index === -1) {
    index = ev.key === 'ArrowDown' ? 0 : rows.length - 1;
  } else {
    index += ev.key === 'ArrowDown' ? 1 : -1;
    // Clamp to bounds
    if (index < 0) index = 0;
    if (index >= rows.length) index = rows.length - 1;
  }
  const nextRow = rows[index];

  // Apply selection styling
  rows.forEach((row) => {
    row.classList.toggle('is-selected', row === nextRow);
  });

  // Update selected name + button state
  openDialogSelectedName = nextRow.dataset.blobName || null;
  openTimelineOpenBtn.disabled = !openDialogSelectedName;
  updateDeleteButtonState();

  // Keep selected row visible in the scroll container
  nextRow.scrollIntoView({ block: 'nearest' });
});

// Sorting header clicks
document.querySelectorAll('.open-dialog__th--sortable')
  .forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-open-sort-key');
      if (!key) return;

      if (openDialogSort.key === key) {
        // Toggle direction
        openDialogSort.direction = openDialogSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        openDialogSort.key = key;
        openDialogSort.direction = 'asc';
      }
      renderOpenTimelineTable();
    });
  });

async function handleOpenTimelineConfirm() {
  if (fileDialogMode === FILE_DIALOG_MODE_OPEN) {
    if (!openDialogSelectedName) return;

    //await openTimeline(openDialogSelectedName, true);
    const tl = await getTimeline(openDialogSelectedName, true);
    if (tl) openView(tl, null);
    
    closeModal(openTimelineModal);

  } else if (fileDialogMode === FILE_DIALOG_MODE_SAVE_AS) {
    if (!openTimelineFilenameInput) return;

    let filename = openTimelineFilenameInput.value.trim();
    if (!filename) return;

    // To do: don't allow to overwrite existing timeline
    saveTimeline(appState.selected.timeline).then(() => {
      appState.selected.timeline._file = filename;
      saveSessionState();
      updateSaveButton();
    });

    closeModal(openTimelineModal);
  }
}


/******************************* Delete timeline *******************************/

let deletePermissionRequest = 0;

async function updateDeleteButtonState() {
  if (appState.globalBusy || fileDialogMode !== FILE_DIALOG_MODE_OPEN) return;

  const requestId = ++deletePermissionRequest;
  
  if (!openDialogSelectedName || appState.authentication.userId == null) {
    openTimelineDeleteBtn.disabled = true;
    return
  }

  const scope = getActiveFileScope();

  try {
    const response = await fetch(
      `/api/deleteTimeline?scope=${encodeURIComponent(scope)}&name=${encodeURIComponent(openDialogSelectedName)}`
    );
    if (!response.ok) return;

    const result = await response.json();
    if (requestId !== deletePermissionRequest) return;
    openTimelineDeleteBtn.disabled = !result.canDelete;
  } catch (err) {
    console.error('Unable to check delete permission:', err);
  }
}

async function deleteSelectedTimeline() {
  if (!openDialogSelectedName || openTimelineDeleteBtn.disabled) return;

  const scope = getActiveFileScope();
  const displayName = openDialogSelectedName;
  const ok = await showModalDialog({
    message: `Delete “${displayName}” and all of its images?`
  });
  if (!ok) return;

  Util.showGlobalBusyCursor();
  openTimelineDeleteBtn.disabled = true;

  try {
    const response = await fetch(
      `/api/deleteTimeline?scope=${encodeURIComponent(scope)}&name=${encodeURIComponent(displayName)}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.error || `Delete failed (${response.status}).`);
    }

    await refreshTimelineList(scope);
  } catch (err) {
    console.error('Delete failed:', err);
    await showModalDialog({ message: err.message || 'Unable to delete timeline.' });
  } finally {
    Util.hideGlobalBusyCursor();
  }
}

openTimelineDeleteBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  deleteSelectedTimeline();
});


/******************************* Open timeline modal *******************************/

export function openOpenTimelineDialog() {
  configureOpenTimelineDialogForOpen();  

  openModal(openTimelineModal);
  const scope = getActiveFileScope();
  refreshTimelineList(scope);
  
  // Ensure key events go to the modal
  //openTimelineOpenBtn.focus();
}

function configureOpenTimelineDialogForOpen() {
  fileDialogMode = FILE_DIALOG_MODE_OPEN;

  fileModalScopeTabs.removeAttribute('hidden');
  saveasTimelineModalTitle.setAttribute('hidden', '');
  updateFileScopeButtons();  // don't allow "Private" if user is not authenticated

  openTimelineDialog.classList.remove('modal__dialog--save-mode');
  openTimelineOpenBtn.textContent = "Open";
  openTimelineDeleteBtn.removeAttribute('hidden');

  openTimelineOpenBtn.disabled = !openDialogSelectedName;
  updateDeleteButtonState();
  openTimelineFilenameInput.value = '';
}

// Click handling inside Open Timeline modal
openTimelineModal.addEventListener('click', (e) => {
  if (appState.globalBusy) return;

  const target = e.target;
  const modalId = target.getAttribute('data-modal-target');

  if (target.matches('[data-modal-close]')) {
    closeModal(openTimelineModal);
  }

  if (target.matches('[data-modal-action="cancel"]')) {  
    const el = document.getElementById(modalId);
    if (el) closeModal(el);
  }
});

// Open button clicked
openTimelineOpenBtn.addEventListener('click', () => {
  if (appState.globalBusy) return;
  handleOpenTimelineConfirm();
});

// Enter key handler
openTimelineModal.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    if (!openTimelineOpenBtn.disabled)
        openTimelineOpenBtn.click();
  }
});


/******************************* Save As timeline modal *******************************/

// Called from side panel button
export function openSaveAsTimelineDialog(defaultFilename = '') {
  configureOpenTimelineDialogForSaveAs(defaultFilename);
  openModal(openTimelineModal);
  refreshTimelineList("private");
  openTimelineFilenameInput.focus();
}

function configureOpenTimelineDialogForSaveAs(defaultFilename = '') {
  fileDialogMode = FILE_DIALOG_MODE_SAVE_AS;

  openTimelineDialog.classList.add('modal__dialog--save-mode');
  fileModalScopeTabs.setAttribute('hidden', '');
  saveasTimelineModalTitle.removeAttribute('hidden');
  
  openTimelineOpenBtn.textContent = 'Save';
  openTimelineDeleteBtn.setAttribute('hidden', '');
  openTimelineDeleteBtn.disabled = true;

  openTimelineOpenBtn.disabled = !defaultFilename;
  openTimelineFilenameInput.value = defaultFilename;
}

// Save as filename field keyboard handler
openTimelineFilenameInput.addEventListener('input', () => {
  if (fileDialogMode === FILE_DIALOG_MODE_SAVE_AS) {
    const hasText = openTimelineFilenameInput.value.trim().length > 0;
    openTimelineOpenBtn.disabled = !hasText;
  }
});


/******************************* temp *******************************/

async function tempSimulateList(scope) {
  await Util.sleep(1000);
  if (scope === "public") {
    return([
      {lastModified:"Mon, 17 Nov 2025 03:04:39 GMT", name:"wrob/Rob Innes.json.gz"}
    ]);
  } else {
    return([ 
      {lastModified:"Mon, 17 Nov 2025 03:04:39 GMT", name:"Modern Israel.json.gz"},
      {lastModified:"Mon, 17 Nov 2025 08:45:38 GMT", name:"Rob Innes.json.gz"},
      {lastModified:"Mon, 17 Nov 2025 08:45:38 GMT", name:"robtest.json.gz"},
      {lastModified:"Mon, 17 Nov 2025 07:07:05 GMT", name:"Sherry Innes.json.gz"}
    ]);
  }
}