import * as Util from './util.js';
import {appState} from './canvas.js';
import {markDirty} from './panel.js';
import {initializeTag} from './timeline.js';

let treeEl = null;
let selectedTagId = null;

let pickerEl = null;
let pickerHintEl = null;


/* -------------------------- Utilities -------------------------- */

function ensureTags(tl) {
  if (!tl.tags) tl.tags = []; // attach to appState.selected.timeline
}

function iconBtn(text, action, title, danger = false) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tagmgr__iconbtn' + (danger ? ' tagmgr__iconbtn--danger' : '');
  b.dataset.tagAction = action;
  b.title = title;
  b.setAttribute('aria-label', title);
  b.textContent = text;
  return b;
}

function currentTimeline() {
  return appState.selected.timeline;
}


/* -------------------------- Define tags (Timeline Edit panel) -------------------------- */

export function initTagsUI() {
  treeEl = document.getElementById('tag-tree');
  if (!treeEl) return;

  // Click blank space in the Tags subpanel to clear selection
  const tagsSubpanel = document.getElementById('subpanel-edit-timeline-tags');
  tagsSubpanel?.addEventListener('click', (e) => {
    // If the click was inside any tag row or its action buttons, do nothing
    const clickedRow = e.target.closest('li[data-tag-id], .tagmgr__row, button[data-tag-action]');
    if (clickedRow) return;

    // Otherwise, blank area: clear selection
    selectedTagId = null;
    applySelectionUI();
  });

  // Selection
  treeEl.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-tag-id]');
    if (!li) return;
    selectTag(li.dataset.tagId);
  });

  // Inline rename on double-click
  treeEl.addEventListener('dblclick', (e) => {
    const li = e.target.closest('li[data-tag-id]');
    if (!li) return;
    beginRename(li.dataset.tagId);
  });

  // Toolbar buttons
  document.getElementById('tag-add')?.addEventListener('click', (e) => {
    e.preventDefault();
    addTag({ asChild: false });
  });

  treeEl.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('button[data-tag-action]');
    if (actionBtn) {
        e.preventDefault();
        e.stopPropagation();

        const li = actionBtn.closest('li[data-tag-id]');
        if (!li) return;
        const tagId = li.dataset.tagId;
        selectTag(tagId);

        const action = actionBtn.dataset.tagAction;
        if (action === 'child') addChild(tagId);
        if (action === 'up') moveTag(tagId, -1);
        if (action === 'down') moveTag(tagId, +1);
        if (action === 'indent') indentTag(tagId);
        if (action === 'outdent') outdentTag(tagId);
        if (action === 'delete') deleteTag(tagId);
        return;
    }

    // Otherwise treat as row selection
    const li = e.target.closest('li[data-tag-id]');
    if (!li) return;
    selectTag(li.dataset.tagId);
  });
}

export function renderTagsUI(tl) {
  if (!treeEl) return;
  ensureTags(tl);

  // If selected tag was deleted, clear selection
  if (selectedTagId && !tl.tags.some(t => t.id === selectedTagId)) {
    selectedTagId = null;
  }

  // Build child lists
  const byParent = new Map();
  for (const t of tl.tags) {
    const key = t.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(t);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  treeEl.innerHTML = '';
  const root = byParent.get(null) ?? [];
  for (const t of root) {
    treeEl.appendChild(renderNode(t, byParent, 0));
  }

  // Re-apply selection styling
  if (selectedTagId) applySelectionUI();
}

function renderNode(tag, byParent, depth) {
  const li = document.createElement('li');
  li.dataset.tagId = tag.id;
  li.role = 'treeitem';
  li.style.paddingLeft = `${depth===0 ? 0 : 16}px`; //`${depth * 16}px`;

  const row = document.createElement('div');
  row.className = 'tagmgr__row' + (tag.id === selectedTagId ? ' is-selected' : '');

  const label = document.createElement('div');
  label.className = 'tagmgr__label';
  label.textContent = tag.label || '(untitled)';

  row.appendChild(label);
  li.appendChild(row);

  const kids = byParent.get(tag.id) ?? [];
  if (kids.length) {
    const ul = document.createElement('ul');
    ul.role = 'group';
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    ul.style.margin = '0';
    for (const c of kids) ul.appendChild(renderNode(c, byParent, depth + 1));
    li.appendChild(ul);
  }

  const actions = document.createElement('div');
  actions.className = 'tagmgr__actions';

  actions.appendChild(iconBtn('+', 'child', 'Add child'));
  actions.appendChild(iconBtn('↑', 'up', 'Move up'));
  actions.appendChild(iconBtn('↓', 'down', 'Move down'));
  actions.appendChild(iconBtn('←', 'outdent', 'Outdent'));
  actions.appendChild(iconBtn('→', 'indent', 'Indent'));
  actions.appendChild(iconBtn('🗑', 'delete', 'Delete', true));

  row.appendChild(actions);

  return li;
}

function selectTag(id) {
  selectedTagId = id;
  applySelectionUI();
}

function applySelectionUI() {
  for (const row of treeEl.querySelectorAll('.tagmgr__row')) {
    row.classList.remove('is-selected');
  }
  const li = treeEl.querySelector(`li[data-tag-id="${CSS.escape(selectedTagId)}"]`);
  li?.querySelector('.tagmgr__row')?.classList.add('is-selected');
}

function nextOrderAmongSiblings(tl, parentId) {
  const sibs = tl.tags.filter(t => (t.parentId ?? null) === (parentId ?? null));
  const max = sibs.reduce((m, t) => Math.max(m, t.order ?? 0), 0);
  return max + 10;
}

function addTag({ asChild }) {
  const tl = currentTimeline();
  if (!tl) return;
  ensureTags(tl);

  const parentId = asChild ? selectedTagId : (selectedTagId ? (tl.tags.find(t => t.id === selectedTagId)?.parentId ?? null) : null);
  const t = {
    id: Util.uuid(),
    label: 'New tag',
    parentId: parentId ?? null,
    order: nextOrderAmongSiblings(tl, parentId ?? null)
  };

  tl.tags.push(t);
  markDirty(tl);
  renderTagsUI(tl);
  selectTag(t.id);
  beginRename(t.id);
}

function addChild(parentId) {
  selectedTagId = parentId;
  addTag({ asChild: true });
}

function beginRename(tagId) {
  const tl = currentTimeline();
  if (!tl) return;

  const li = treeEl.querySelector(`li[data-tag-id="${CSS.escape(tagId)}"]`);
  if (!li) return;

  const tag = tl.tags.find(t => t.id === tagId);
  if (!tag) return;

  const labelDiv = li.querySelector('.tagmgr__label');
  if (!labelDiv) return;

  const input = document.createElement('input');
  input.className = 'tagmgr__input';
  input.type = 'text';
  input.value = tag.label ?? '';
  labelDiv.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    tag.label = input.value.trim() || 'Untitled';
    initializeTag(tag);  // update labelWidth for display on the canvas
    markDirty(tl);
    renderTagsUI(tl);
    selectTag(tagId);
  };

  input.addEventListener('blur', commit, { once: true });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      renderTagsUI(tl);
      selectTag(tagId);
    }
  });
}

function deleteSelectedTag() {
  const tl = currentTimeline();
  if (!tl || !selectedTagId) return;

  // prevent deleting a parent with children (simple rule to start)
  const hasChildren = tl.tags.some(t => t.parentId === selectedTagId);
  if (hasChildren) {
    alert('This tag has children. Delete or move its children first.');
    return;
  }

  const idx = tl.tags.findIndex(t => t.id === selectedTagId);
  if (idx < 0) return;

  tl.tags.splice(idx, 1);
  markDirty(tl);
  selectedTagId = null;
  renderTagsUI(tl);
}

function deleteTag(tagId) {
  selectedTagId = tagId;
  deleteSelectedTag();
}

function indentSelected() {
  const tl = currentTimeline();
  if (!tl || !selectedTagId) return;

  const tag = tl.tags.find(t => t.id === selectedTagId);
  if (!tag) return;

  // indent = make previous sibling the new parent
  const sibs = tl.tags
    .filter(t => (t.parentId ?? null) === (tag.parentId ?? null))
    .sort((a,b) => (a.order ?? 0) - (b.order ?? 0));

  const i = sibs.findIndex(t => t.id === tag.id);
  if (i <= 0) return; // no previous sibling to become parent

  const newParent = sibs[i - 1];
  tag.parentId = newParent.id;
  tag.order = nextOrderAmongSiblings(tl, newParent.id);

  markDirty(tl);
  renderTagsUI(tl);
  selectTag(tag.id);
}

function indentTag(tagId) {
  selectedTagId = tagId;
  indentSelected();
}

function outdentSelected() {
  const tl = currentTimeline();
  if (!tl || !selectedTagId) return;

  const tag = tl.tags.find(t => t.id === selectedTagId);
  if (!tag) return;

  if (!tag.parentId) return; // already root

  const parent = tl.tags.find(t => t.id === tag.parentId);
  tag.parentId = parent?.parentId ?? null;
  tag.order = nextOrderAmongSiblings(tl, tag.parentId);

  markDirty(tl);
  renderTagsUI(tl);
  selectTag(tag.id);
}

function outdentTag(tagId) {
  selectedTagId = tagId;
  outdentSelected();
}

function moveSelected(delta) {
  const tl = currentTimeline();
  if (!tl || !selectedTagId) return;

  const tag = tl.tags.find(t => t.id === selectedTagId);
  if (!tag) return;

  const sibs = tl.tags
    .filter(t => (t.parentId ?? null) === (tag.parentId ?? null))
    .sort((a,b) => (a.order ?? 0) - (b.order ?? 0));

  const i = sibs.findIndex(t => t.id === tag.id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= sibs.length) return;

  // swap orders with neighbor
  const other = sibs[j];
  const tmp = tag.order ?? 0;
  tag.order = other.order ?? 0;
  other.order = tmp;

  markDirty(tl);
  renderTagsUI(tl);
  selectTag(tag.id);
}

function moveTag(tagId, delta) {
  selectedTagId = tagId;
  moveSelected(delta);
}


/* -------------------------- Select tags (Event Edit Tags subpanel) -------------------------- */

export function initTagPickerUI() {
  pickerEl = document.getElementById('event-tag-tree');
  pickerHintEl = document.getElementById('tagpick-hint');
  if (!pickerEl) return;

  // Toggle tag on checkbox change
  pickerEl.addEventListener('change', (e) => {
    const cb = e.target.closest('input[type="checkbox"][data-tag-id]');
    if (!cb) return;

    const tagId = cb.dataset.tagId;
    const event = appState.selected.event;
    const tl = appState.selected.timeline;
    if (!event || !tl) return;

    if (!event.tagIds) event.tagIds = [];

    if (cb.checked) {
      if (!event.tagIds.includes(tagId)) event.tagIds.push(tagId);
    } else {
      const idx = event.tagIds.indexOf(tagId);
      if (idx >= 0) event.tagIds.splice(idx, 1);
    }

    markDirty(tl);
  });
}

export function renderTagPickerUI(tl, event) {
  if (!pickerEl) return;

  // no timeline or no tags -> show hint
  const tags = tl?.tags ?? [];
  const hasTags = tags.length > 0;

  if (pickerHintEl) pickerHintEl.hidden = hasTags;
  pickerEl.innerHTML = '';

  if (!hasTags || !event) return;

  if (!event.tagIds) event.tagIds = [];

  // Build parent -> children map
  const byParent = new Map();
  for (const t of tags) {
    const key = t.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(t);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  // Render roots
  const root = byParent.get(null) ?? [];
  for (const t of root) {
    pickerEl.appendChild(renderPickerNode(t, byParent, 0, event));
  }
}

function renderPickerNode(tag, byParent, depth, event) {
  const li = document.createElement('li');
  li.style.paddingLeft = `${depth * 16}px`;

  const row = document.createElement('label');
  row.className = 'tagpick__row';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.dataset.tagId = tag.id;
  cb.checked = !!event.tagIds?.includes(tag.id);

  const text = document.createElement('div');
  text.className = 'tagpick__label';
  text.textContent = tag.label || '(untitled)';

  row.appendChild(cb);
  row.appendChild(text);
  li.appendChild(row);

  const kids = byParent.get(tag.id) ?? [];
  if (kids.length) {
    const ul = document.createElement('ul');
    ul.className = 'tagpick__tree';
    for (const c of kids) ul.appendChild(renderPickerNode(c, byParent, depth + 1, event));
    li.appendChild(ul);
  }

  return li;
}


/* -------------------------- Tag navigation panel -------------------------- */

export function renderTagNavigation(tl) {
  const tags = tl.tags ?? [];
  const navigateEl = document.getElementById('timeline-navigate-tags');
  navigateEl.innerHTML = '';

  // Build parent -> children map
  const byParent = new Map();
  for (const t of tags) {
    const key = t.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(t);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  // Render roots
  const root = byParent.get(null) ?? [];
  for (const t of root) {
    navigateEl.appendChild(renderNavigateNode(t, byParent, 0));
  }
}

function renderNavigateNode(tag, byParent, depth) {
  const li = document.createElement("li");
  li.style.paddingLeft = `${depth * 16}px`;

  const a = document.createElement("a");
  a.href = "#";
  a.setAttribute("tag", tag.id);
  a.innerHTML = tag.label;
  li.appendChild(a);

  const kids = byParent.get(tag.id) ?? [];
  if (kids.length) {
    const ul = document.createElement("ul");
    ul.className = "tagnavigate__tree";
    for (const c of kids) ul.appendChild(renderNavigateNode(c, byParent, depth + 1));
    li.appendChild(ul);
  }
  return li;
}