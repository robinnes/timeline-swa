import {CONTAINER} from './constants.js';
import {addNewTimeline, loadTimeline, reloadTimeline, saveTimeline} from './timeline.js';
import {getTimelineList} from './database.js';
import {appState, timelines, canvas, zoomToTimeline} from './canvas.js';
import {positionTimelines} from './render.js';
import {updateSaveButton} from './panel.js';

const appMenu = document.querySelector('.app-menu');
const appMenuButton = document.getElementById('app-menu-button');
const appMenuDropdown = document.getElementById('app-menu-dropdown');
const newTimelineItem = document.querySelector('.app-menu__item[data-action="new-timeline"]');
const openTimelineItem = document.querySelector('.app-menu__item[data-action="open-timeline"]');
const authMenuItem = document.querySelector('.app-menu__item[data-action="auth"]');

const newTimelineModal = document.getElementById('new-timeline-modal');
const newTimelineTitle = document.getElementById('new-timeline-title-input');
const newTimelineCreateBtn = document.getElementById('new-timeline-create-btn');

const openTimelineModal = document.getElementById('open-timeline-modal');
const openTimelineTbody = document.getElementById('open-timeline-tbody');
const openTimelineTable = document.querySelector('.open-dialog__table');
const openTimelineModalTitle = document.getElementById('open-timeline-modal-title');
const openTimelineFilenameInput = document.getElementById('open-timeline-filename-input');
const openTimelineDialog = openTimelineModal ? openTimelineModal.querySelector('.modal__dialog') : null;
const openTimelineOpenBtn = document.getElementById('open-timeline-open-btn');

const OPEN_DIALOG_MODE_OPEN = 'open';
const OPEN_DIALOG_MODE_SAVE_AS = 'save-as';
let openDialogMode = OPEN_DIALOG_MODE_OPEN;

/******************************* appMenu (elipsis) button *******************************/

// Elipsis button
appMenuButton.addEventListener('click', () => {
  const isOpen = appMenu.classList.toggle('is-open');
  appMenuButton.setAttribute('aria-expanded', String(isOpen));
  appMenuDropdown.setAttribute('aria-hidden', String(!isOpen));
  updateAuthMenuItem();

  if (!isOpen) {
    appMenuButton.blur(); // remove focus from button
    canvas.focus();
  }
});

export function closeAppMenu() {
  appMenu.classList.remove('is-open');
  appMenuButton.setAttribute('aria-expanded', 'false');
  appMenuDropdown.setAttribute('aria-hidden', 'true');
  appMenuButton.blur();
  canvas.focus();
}

// "New timeline..."
newTimelineItem.addEventListener('click', () => {
  newTimelineTitle.value = '';
  newTimelineCreateBtn.disabled = true;
  openModal(newTimelineModal);
  newTimelineTitle.focus();
});

// "Open timeline..."
openTimelineItem.addEventListener('click', () => {
  configureOpenTimelineDialogForOpen();
  openModal(openTimelineModal);
  refreshTimelineList();

  // Ensure key events go to the modal
  //openTimelineOpenBtn.focus();
});

/******************************* Authorization *******************************/

async function getAuthState() {
  const res = await fetch('/.auth/me', { cache: 'no-store' });
  if (!res.ok) return { isAuthenticated: false };

  const data = await res.json();

  // SWA returns identities array; presence usually indicates auth
  //const identities = data?.clientPrincipal?.identityProvider || [];
  //const isAuthenticated = identities.length > 0;
  const userId = data?.clientPrincipal?.userId;
  const isAuthenticated = !!userId;

  return { isAuthenticated, data };
}

export async function updateAuthMenuItem() {
  const { isAuthenticated } = await getAuthState();

  if (isAuthenticated) {
    authMenuItem.textContent = 'Sign out';
    authMenuItem.onclick = () => {
      signOut();
      
      //const returnTo = encodeURIComponent(window.location.origin + window.location.pathname);
      //window.location.href = `/.auth/logout?post_logout_redirect_uri=${returnTo}`;
    };
  } else {
    authMenuItem.textContent = 'Sign in';
    authMenuItem.onclick = () => {
      window.location.href = '/.auth/login/auth0';
    };
  }
}

function signOut() {
  // Return to the app after logout
  /*const signedOutLanding = encodeURIComponent(`${window.location.origin}/signedout.html`);
  window.location.href = `/.auth/logout?post_logout_redirect_uri=${signedOutLanding}`;*/
  /*window.location.href = `/.auth/logout?post_logout_redirect_uri=/signedout.html`;*/

  const AUTH0_DOMAIN = "dev-0y1p0vgy7bddbufi.us.auth0.com";
  const AUTH0_CLIENT_ID = "0bsh9anm9bRu5s2u9IxjGWN55o7HA8rG"; // from your signedout.html :contentReference[oaicite:3]{index=3}
  const returnTo = encodeURIComponent(`${window.location.origin}/.auth/logout/complete`)
  const auth0Logout = `https://${AUTH0_DOMAIN}/v2/logout?client_id=${encodeURIComponent(AUTH0_CLIENT_ID)}&returnTo=${returnTo}`;
  window.location.href = auth0Logout;
  
  /*
  const signedOutLanding = encodeURIComponent(`${window.location.origin}/.auth/logout/complete/`);
  window.location.href = `/.auth/logout?post_logout_redirect_uri=${signedOutLanding}`;
  */

//  window.location.href = `/.auth/logout/complete`;

}

/******************************* Modal helpers *******************************/

function openModal(el) {
  if (!el) return;
  
  closeAppMenu();
  el.removeAttribute('hidden');
  document.body.classList.add('modal-open');
}

export function closeModal(el) {
  if (!el) return;
  el.setAttribute('hidden', '');
  document.body.classList.remove('modal-open');
  canvas.focus();
}

/******************************* New timeline modal *******************************/

// Title input field keyboard handler
newTimelineTitle.addEventListener('input', () => {
  const hasText = newTimelineTitle.value.trim().length > 0;
  newTimelineCreateBtn.disabled = !hasText;
});

// Close / cancel / create inside New Timeline modal
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
    const title = newTimelineTitle.value.trim();
    addNewTimeline(title);
    if (el) closeModal(el);
  }
});

// Enter key handler
newTimelineModal.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault();

    // Only allow Create if text is entered
    if (!newTimelineCreateBtn.disabled) {
      newTimelineCreateBtn.click();
    }
  }
});

/******************************* File list table *******************************/

let openDialogBlobs = [];
let openDialogSelectedName = null;
let openDialogSort = { key: 'name', direction: 'asc' };

async function refreshTimelineList() {
  try {
    openDialogSelectedName = null;
    openTimelineOpenBtn.disabled = true;

    const blobs = await getTimelineList();

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
    appState.selected.timeline.timelineID = timelineID;
    saveTimeline(appState.selected.timeline).then(() => {
      updateSaveButton();
    });

    closeModal(openTimelineModal);
  }
}

/******************************* Open timeline modal *******************************/

function configureOpenTimelineDialogForOpen() {
  openDialogMode = OPEN_DIALOG_MODE_OPEN;

  openTimelineDialog.classList.remove('modal__dialog--save-mode');
  openTimelineModalTitle.textContent = 'Open timeline';
  openTimelineOpenBtn.textContent = OPEN_DIALOG_MODE_OPEN;

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
  refreshTimelineList();
  openTimelineFilenameInput.focus();
}

function configureOpenTimelineDialogForSaveAs(defaultFilename = '') {
  openDialogMode = OPEN_DIALOG_MODE_SAVE_AS;

  openTimelineDialog.classList.add('modal__dialog--save-mode');
  openTimelineModalTitle.textContent = 'Save timeline';
  openTimelineOpenBtn.textContent = 'Save';

  openTimelineOpenBtn.disabled = !defaultFilename;
  openTimelineFilenameInput.value = defaultFilename;
}

// Save as filename field keyboard handler
openTimelineFilenameInput.addEventListener('input', () => {
  if (openDialogMode === OPEN_DIALOG_MODE_SAVE_AS) {
    const hasText = openTimelineFilenameInput.value.trim().length > 0;
    openTimelineOpenBtn.disabled = !hasText;
  }
});


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