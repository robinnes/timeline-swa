import {addNewTimeline} from './timeline.js';
import { listTimelinesInContainer } from './database.js';  // until the database browse code is built-out

const appMenu = document.querySelector('.app-menu');
const appMenuButton = document.getElementById('app-menu-button');
const appMenuDropdown = document.getElementById('app-menu-dropdown');
const newTimelineItem = document.querySelector('.app-menu__item[data-action="new-timeline"]');
const openTimelineItem = document.querySelector('.app-menu__item[data-action="open-timeline"]');
const modal = document.getElementById('new-timeline-modal');
const titleInput = document.getElementById('new-timeline-title-input');

/******************************* appMenu (elipsis) button *******************************/

appMenuButton.addEventListener('click', () => {
  const isOpen = appMenu.classList.toggle('is-open');
  appMenuButton.setAttribute('aria-expanded', String(isOpen));
  appMenuDropdown.setAttribute('aria-hidden', String(!isOpen));
});

document.addEventListener('click', (e) => {
  if (!appMenu.contains(e.target)) {
    appMenu.classList.remove('is-open');
    appMenuButton.setAttribute('aria-expanded', 'false');
    appMenuDropdown.setAttribute('aria-hidden', 'true');
  }
});

/******************************* New timeline *******************************/

function openModal(el) {
  el.removeAttribute('hidden');
  document.body.classList.add('modal-open');
  if (titleInput) {
    titleInput.value = '';
    titleInput.focus();
  }
}

function closeModal(el) {
  el.setAttribute('hidden', '');
  document.body.classList.remove('modal-open');
}

if (newTimelineItem && modal) {
  newTimelineItem.addEventListener('click', () => {
    openModal(modal);
  });
}

if (openTimelineItem && modal) {
  openTimelineItem.addEventListener('click', () => {
    refreshTimelineList();
  });
}


// Close on backdrop or Cancel
modal.addEventListener('click', (e) => {
  const target = e.target;
  const modalId = target.getAttribute('data-modal-target');

  if (target.matches('[data-modal-close]')) {
    closeModal(modal);
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

/******************************* Open timeline *******************************/

async function refreshTimelineList() {
  try {
    const blobs = await listTimelinesInContainer('timelines');
    console.log('Timelines:', blobs);
    // TODO: populate your "Open timeline…" modal or menu from blobs[]
  } catch (err) {
    console.error(err);
  }
}
