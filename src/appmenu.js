import {addNewTimeline} from './timeline.js';
import {appState, canvas} from './canvas.js';
import {openOpenTimelineDialog} from './fileDialog.js';

const appMenu = document.querySelector('.app-menu');
const appMenuButton = document.getElementById('app-menu-button');
const appMenuDropdown = document.getElementById('app-menu-dropdown');
const newTimelineItem = document.querySelector('.app-menu__item[data-action="new-timeline"]');
const openTimelineItem = document.querySelector('.app-menu__item[data-action="open-timeline"]');
const authMenuItem = document.querySelector('.app-menu__item[data-action="auth"]');

const newTimelineModal = document.getElementById('new-timeline-modal');
const newTimelineTitle = document.getElementById('new-timeline-title-input');
const newTimelineCreateBtn = document.getElementById('new-timeline-create-btn');

/******************************* appMenu (and elipsis button) *******************************/

// Elipsis button
appMenuButton.addEventListener('click', () => {
  if (appMenu.classList.contains('is-open')) closeAppMenu();
  else openAppMenu();
});

function openAppMenu() {
  updateAppMenu();
  appMenu.classList.add('is-open');
  appMenuButton.setAttribute('aria-expanded', 'true');
  appMenuDropdown.setAttribute('aria-hidden', 'false');
}

export function closeAppMenu() {
  appMenu.classList.remove('is-open');
  appMenuButton.setAttribute('aria-expanded', 'false');
  appMenuDropdown.setAttribute('aria-hidden', 'true');
  canvas.focus();
}

export async function updateAppMenu() {
  const isAuthenticated = await getAuthState();
//appState.authentication.userId = "hello";

  // Display "New timeline" only if authenticated
  if (isAuthenticated) {
    newTimelineItem.removeAttribute('hidden');
  } else {
    newTimelineItem.setAttribute('hidden', '');
  }

  // Update Sign In/Out item
  if (isAuthenticated) {
    authMenuItem.textContent = 'Sign out';
    authMenuItem.onclick = () => {
      window.location.href = `/.auth/logout`;
    };
  } else {
    authMenuItem.textContent = 'Sign in';
    authMenuItem.onclick = () => {
      window.location.href = '/.auth/login/auth0';
    };
  }
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
  openOpenTimelineDialog();
});

/******************************* Authentication *******************************/

async function getAuthState() {
  const res = await fetch('/.auth/me', { cache: 'no-store' });
  if (!res.ok) return false;

  const data = await res.json();
  appState.authentication.userId = data?.clientPrincipal?.userId;
  const isAuthenticated = !!appState.authentication.userId;

  return isAuthenticated;
}

/******************************* Modal helpers *******************************/

export function openModal(el) {
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

