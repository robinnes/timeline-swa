import {CONTAINER} from './constants.js';
import {addNewTimeline, loadTimeline, reloadTimeline, saveTimeline} from './timeline.js';
import {listTimelinesInContainer} from './database.js';
import {appState, timelines, zoomToTimeline} from './canvas.js';
import {positionTimelines} from './render.js';
import {updateSaveButton} from './panel.js';

const appMenu = document.querySelector('.app-menu');
const appMenuButton = document.getElementById('app-menu-button');
const appMenuDropdown = document.getElementById('app-menu-dropdown');
const newTimelineItem = document.querySelector('.app-menu__item[data-action="new-timeline"]');
const openTimelineItem = document.querySelector('.app-menu__item[data-action="open-timeline"]');

const newTimelineModal = document.getElementById('new-timeline-modal');
const titleInput = document.getElementById('new-timeline-title-input');

const openTimelineModal = document.getElementById('open-timeline-modal');
const openTimelineTbody = document.getElementById('open-timeline-tbody');
const openTimelineOpenBtn = document.getElementById('open-timeline-open-btn');
const openTimelineModalTitle = document.getElementById('open-timeline-modal-title');
const openTimelineDialog = openTimelineModal
  ? openTimelineModal.querySelector('.modal__dialog')
  : null;
const openTimelineFilenameInput = document.getElementById('open-timeline-filename-input');

const OPEN_DIALOG_MODE_OPEN = 'open';
const OPEN_DIALOG_MODE_SAVE_AS = 'save-as';

let openDialogBlobs = [];
let openDialogSelectedName = null;
let openDialogSort = { key: 'name', direction: 'asc' };
let openDialogMode = OPEN_DIALOG_MODE_OPEN;


/******************************* appMenu (elipsis) button *******************************/

appMenuButton.addEventListener('click', () => {
  const isOpen = appMenu.classList.toggle('is-open');
  appMenuButton.setAttribute('aria-expanded', String(isOpen));
  appMenuDropdown.setAttribute('aria-hidden', String(!isOpen));
  if (!isOpen) {canvas.focus();}
});

document.addEventListener('click', (e) => {
  if (!appMenu.contains(e.target)) {
    appMenu.classList.remove('is-open');
    appMenuButton.setAttribute('aria-expanded', 'false');
    appMenuDropdown.setAttribute('aria-hidden', 'true');
    canvas.focus();
  }
});


/******************************* Modal helpers *******************************/

function openModal(el) {
  if (!el) return;
  el.removeAttribute('hidden');
  document.body.classList.add('modal-open');

  // Only focus the title for the "new timeline" dialog
  if (el === newTimelineModal && titleInput) {
    titleInput.value = '';
    titleInput.focus();
  }
}

function closeModal(el) {
  if (!el) return;
  el.setAttribute('hidden', '');
  document.body.classList.remove('modal-open');
  canvas.focus();
}

/******************************* Open / Save-as dialog config *******************************/

function configureOpenTimelineDialogForOpen() {
  openDialogMode = OPEN_DIALOG_MODE_OPEN;

  if (openTimelineDialog) {
    openTimelineDialog.classList.remove('modal__dialog--save-mode');
  }

  if (openTimelineModalTitle) {
    openTimelineModalTitle.textContent = 'Open timeline';
  }

  if (openTimelineOpenBtn) {
    openTimelineOpenBtn.textContent = 'Open';
    openTimelineOpenBtn.disabled = !openDialogSelectedName;
  }

  if (openTimelineFilenameInput) {
    openTimelineFilenameInput.value = '';
  }
}

function configureOpenTimelineDialogForSaveAs(defaultFilename = '') {
  openDialogMode = OPEN_DIALOG_MODE_SAVE_AS;

  if (openTimelineDialog) {
    openTimelineDialog.classList.add('modal__dialog--save-mode');
  }

  if (openTimelineModalTitle) {
    openTimelineModalTitle.textContent = 'Save timeline as…';
  }

  if (openTimelineOpenBtn) {
    openTimelineOpenBtn.textContent = 'Save';
    // Enabled when there is some filename text
    openTimelineOpenBtn.disabled = !defaultFilename;
  }

  if (openTimelineFilenameInput) {
    openTimelineFilenameInput.value = defaultFilename;
    openTimelineFilenameInput.focus();
  }
}

/******************************* New timeline *******************************/

if (newTimelineItem && newTimelineModal) {
  newTimelineItem.addEventListener('click', () => {
    openModal(newTimelineModal);
  });
}

// Close / cancel / create inside New Timeline modal
if (newTimelineModal) {
  newTimelineModal.addEventListener('click', (e) => {
    const target = e.target;
    const modalId = target.getAttribute('data-modal-target');

    if (target.matches('[data-modal-close]')) {
      closeModal(newTimelineModal);
    }

    if (target.matches('[data-modal-action="cancel"]')) {
      const el = document.getElementById(modalId);
      if (el) closeModal(el);
    }

    if (target.matches('[data-modal-action="create"]')) {
      const el = document.getElementById(modalId);
      const title = titleInput.value.trim();
      addNewTimeline(title);
      if (el) closeModal(el);
    }
  });
}

/******************************* Open timeline helpers *******************************/

function renderOpenTimelineTable() {
  if (!openTimelineTbody) return;

  openTimelineTbody.innerHTML = '';

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

    // Optional: double-click to open immediately
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

async function refreshTimelineList() {
  try {
    openDialogSelectedName = null;
    if (openTimelineOpenBtn) {
      openTimelineOpenBtn.disabled = true;
    }

    const blobs = await listTimelinesInContainer(CONTAINER);

    openDialogBlobs = blobs || [];
    renderOpenTimelineTable();
  } catch (err) {
    //console.error(err);
    //openDialogBlobs = [];
    const fakeBlobs = tempSimulateList();
    openDialogBlobs = fakeBlobs || [];
    renderOpenTimelineTable();
  }
}

if (openTimelineFilenameInput && openTimelineOpenBtn) {
  openTimelineFilenameInput.addEventListener('input', () => {
    if (openDialogMode === OPEN_DIALOG_MODE_SAVE_AS) {
      const hasText = openTimelineFilenameInput.value.trim().length > 0;
      openTimelineOpenBtn.disabled = !hasText;
    }
  });
}

async function handleOpenTimelineConfirm() {
  if (openDialogMode === OPEN_DIALOG_MODE_OPEN) {
    if (!openDialogSelectedName) return;
    const timelineID = {container: CONTAINER, file: openDialogSelectedName};

    // check if timeline is already there
    const existingTL = timelines.find(t =>
      JSON.stringify(t.timelineID) === JSON.stringify(timelineID));

    if (existingTL) {
      // reload timeline that's already displayed
      await reloadTimeline(existingTL);
      positionTimelines(true);
      zoomToTimeline(existingTL);
    } else {
      // load and zoom to timelineID
      const tl = await loadTimeline(timelineID, timelines.length); // insert it above the clicked one
      positionTimelines(false);
      zoomToTimeline(tl);
    }

    closeModal(openTimelineModal);
  } else if (openDialogMode === OPEN_DIALOG_MODE_SAVE_AS) {
    if (!openTimelineFilenameInput) return;

    let filename = openTimelineFilenameInput.value.trim();
    if (!filename) {
      // No name → do nothing (or you could show a validation message)
      return;
    }

    // Ensure .json extension
    if (!filename.toLowerCase().endsWith('.json')) {
      filename = `${filename}.json`;
    }

    const blobName = filename;
    const timelineID = { container: CONTAINER, file: blobName };
    appState.editingTimeline.timelineID = timelineID;
    saveTimeline(appState.editingTimeline).then(() => {
      updateSaveButton();
    });

    closeModal(openTimelineModal);
  }
}

/******************************* Open timeline *******************************/

if (openTimelineItem && openTimelineModal) {
  openTimelineItem.addEventListener('click', () => {
    configureOpenTimelineDialogForOpen();
    openModal(openTimelineModal);
    refreshTimelineList();
  });
}

// Click handling inside Open Timeline modal
if (openTimelineModal) {
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

  if (openTimelineOpenBtn) {
    openTimelineOpenBtn.addEventListener('click', () => {
      handleOpenTimelineConfirm();
    });
  }

  // Sorting header clicks
  document
    .querySelectorAll('.open-dialog__th--sortable')
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
}

/******************************* Public API *******************************/

/**
 * Open the Open/Save dialog in "Save as" mode.
 * @param {string} [defaultFilename] Optional default file name (without or with .json).
 */
export function openSaveAsTimelineDialog(defaultFilename = '') {
  configureOpenTimelineDialogForSaveAs(defaultFilename);
  openModal(openTimelineModal);
  refreshTimelineList();
}

/******************************* temp *******************************/

function tempSimulateList() {
  const x = 
    [{lastModified:"Mon, 17 Nov 2025 19:20:27 GMT", name:"career.json"},
     {lastModified:"Mon, 17 Nov 2025 03:04:39 GMT", name:"modernisrael.json"},
     {lastModified:"Mon, 17 Nov 2025 01:47:33 GMT", name:"movetotx.json"},
     {lastModified:"Mon, 17 Nov 2025 05:33:13 GMT", name:"robandanh.json"},
     {lastModified:"Mon, 17 Nov 2025 08:45:38 GMT", name:"robinnes.json"},
     {lastModified:"Mon, 17 Nov 2025 07:07:05 GMT", name:"sherryinnes.json"}
    ];
  return(x);
}