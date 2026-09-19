import {appState, draw, timelineCache, followHyperlink} from './canvas.js';

const expandedNavigateTagIds = new Set();

/* -------------------------- Tag navigation panel -------------------------- */

export function renderTagNavigation(vw) {
  const tl = timelineCache.get(vw.tlKey);
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

  if (vw.tagFilter) navigateEl.appendChild(renderTimelineNode(tl));

  // Render roots
  const root = byParent.get(vw.tagFilter) ?? [];  // begin at the view's tag, if present
  for (const t of root) {
    navigateEl.appendChild(renderNavigateNode(t, byParent, 0));
  }
}

function renderNavigateNode(tag, byParent, depth) {
  const li = document.createElement("li");
  li.className = "tagnavigate__item";
  li.style.paddingLeft = `${depth===0 ? 0 : 16}px`;

  const row = document.createElement("div");
  row.className = "tagnavigate__row";

  const kids = byParent.get(tag.id) ?? [];
  const hasKids = kids.length > 0;
  const expanded = expandedNavigateTagIds.has(tag.id);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "tagnavigate__toggle";
  toggle.textContent = hasKids ? (expanded ? "−" : "+") : "";
  toggle.setAttribute("aria-expanded", String(expanded));


  if (hasKids) {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (expandedNavigateTagIds.has(tag.id)) {
          expandedNavigateTagIds.delete(tag.id);
      } else {
          expandedNavigateTagIds.add(tag.id);
      }

      renderTagNavigation(appState.selected.view);
    });
  }

  const a = document.createElement("a");
  a.href = "#";
  a.setAttribute("tag", tag.id);
  a.textContent = tag.label || "(untitled)";

  row.appendChild(toggle);
  row.appendChild(a);
  li.appendChild(row);

  if (hasKids && expanded) {
      const ul = document.createElement("ul");
      ul.className = "tagnavigate__tree";

      for (const c of kids)
          ul.appendChild(renderNavigateNode(c, byParent, depth + 1));

      li.appendChild(ul);
  }

  return li;
}

function renderTimelineNode(tl)
{
  // Display a link to the unfiltered timeline itself
  const li = document.createElement("li");
  li.className = "tagnavigate__item";
  li.style.paddingLeft = '4px';

  const row = document.createElement("div");
  row.className = "tagnavigate__row";

  const a = document.createElement("a");
  a.href = "#";
  a.setAttribute("tl", tl._file);
  a.textContent = tl.title || "(untitled)";

  row.appendChild(a);
  li.appendChild(row);

  return li;
}