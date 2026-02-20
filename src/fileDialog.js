import * as Util from './util.js';
import {loadTimeline, saveTimeline} from './timeline.js';
import {getTimelineList} from './database.js';
import {appState, timelines, zoomToView, openTimeline} from './canvas.js';
import {positionViews} from './render.js';
import {updateSaveButton} from './panel.js';
import {openModal, closeModal} from './appmenu.js';

const openTimelineModal = document.getElementById('open-timeline-modal');
const openTimelineTbody = document.getElementById('open-timeline-tbody');
const openTimelineTable = document.querySelector('.open-dialog__table');
const saveasTimelineModalTitle = document.getElementById('saveas-timeline-modal-title');
const openTimelineFilenameInput = document.getElementById('open-timeline-filename-input');
const openTimelineDialog = openTimelineModal ? openTimelineModal.querySelector('.modal__dialog') : null;
const openTimelineOpenBtn = document.getElementById('open-timeline-open-btn');
const fileModalScopeTabs = document.getElementById( 'filemodal-scope-tabs');
const fileModalTabButtons = Array.from(document.querySelectorAll('.filemodal__tabs .tab-btn'));

// Dialog functions as "Open" or "Save As"
const FILE_DIALOG_MODE_OPEN = 'open';
const FILE_DIALOG_MODE_SAVE_AS = 'save-as';
let fileDialogMode = FILE_DIALOG_MODE_OPEN;


/******************************* Header and Public/Private tabs *******************************/

// Attach click handlers to tab buttons
for (const btn of fileModalTabButtons) {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (btn.disabled) return;
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
  try {
    openDialogSelectedName = null;
    openTimelineOpenBtn.disabled = true;

    const blobs = await getTimelineList(scope);
    openDialogBlobs = blobs || [];
    renderOpenTimelineTable();

  } catch (err) {
    if (await Util.isLocalEnv()) {
      // return simulated list if running locally
      const fakeBlobs = tempSimulateList(scope);
      openDialogBlobs = fakeBlobs || [];
      renderOpenTimelineTable();
      return;
    }

    console.error(err);
    openDialogBlobs = [];
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
    tr.dataset.blobName = blob.name;

    const displayName = blob.name.endsWith('.json')
      ? blob.name.slice(0, -5)
      : blob.name;

    const nameTd = document.createElement('td');
    nameTd.textContent = displayName;

    const lastModifiedTd = document.createElement('td');
    lastModifiedTd.textContent = blob.lastModified
      ? new Date(blob.lastModified).toLocaleString()
      : '';

    tr.appendChild(nameTd);
    tr.appendChild(lastModifiedTd);

    tr.addEventListener('click', () => {
      openDialogSelectedName = blob.name;

      // Highlight selected row
      openTimelineTbody.querySelectorAll('.open-dialog__row').forEach((row) => {
        row.classList.toggle('is-selected', row === tr);
      });

      openTimelineOpenBtn.disabled = !openDialogSelectedName;
    });

    // double-click to open immediately
    tr.addEventListener('dblclick', () => {
      openDialogSelectedName = blob.name;
      openTimelineOpenBtn.disabled = !openDialogSelectedName;
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

    await openTimeline(openDialogSelectedName, true);

    closeModal(openTimelineModal);

  } else if (fileDialogMode === FILE_DIALOG_MODE_SAVE_AS) {
    if (!openTimelineFilenameInput) return;

    let filename = openTimelineFilenameInput.value.trim();
    if (!filename) return;

    // Ensure .json extension
    if (!filename.toLowerCase().endsWith('.json')) {
      filename = `${filename}.json`;
    }

    const timelineID = { scope:"private", file: filename };
    appState.selected.timeline._timelineID = timelineID;
    saveTimeline(appState.selected.timeline).then(() => {
      updateSaveButton();
    });

    closeModal(openTimelineModal);
  }
}


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

  openTimelineOpenBtn.disabled = !openDialogSelectedName;
  openTimelineFilenameInput.value = '';
}

// Click handling inside Open Timeline modal
openTimelineModal.addEventListener('click', (e) => {
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

function tempSimulateList(scope) {
  if (scope === "public") {
    return([
      {lastModified:"Mon, 17 Nov 2025 03:04:39 GMT", name:"wrob/modernisrael.json"}
    ]);
  } else {
    return([ 
      {lastModified:"Mon, 17 Nov 2025 19:20:27 GMT", name:"career.json"},
      {lastModified:"Mon, 17 Nov 2025 03:04:39 GMT", name:"modernisrael.json"},
      {lastModified:"Mon, 17 Nov 2025 01:47:33 GMT", name:"movetotx.json"},
      {lastModified:"Mon, 17 Nov 2025 05:33:13 GMT", name:"robandanh.json"},
      {lastModified:"Mon, 17 Nov 2025 08:45:38 GMT", name:"robinnes.json"},
      {lastModified:"Mon, 17 Nov 2025 08:45:38 GMT", name:"RobTest.json"},
      {lastModified:"Mon, 17 Nov 2025 07:07:05 GMT", name:"sherryinnes.json"}
    ]);
  }
}