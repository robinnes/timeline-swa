import * as Util from './util.js';
import {appState, timelineCache, draw, zoomToView} from './canvas.js';
import {loadTimeline, timelineString, initializeTimeline} from './timeline.js';
import {positionViews} from './render.js';

/******************************* Authentication *******************************/

export async function getAuthState() {

  // simulate logged-in state if running locally
  if (await Util.isLocalEnv()) {
    appState.authentication.userId = "simulated";
    return appState.authentication.userId;
  }

  // retrieve identity block from the ./auth/me URL 
  const res = await fetch('/.auth/me', {cache:'no-store'});
  if (!res.ok) return false;

  const data = await res.json();
  const userId = data?.clientPrincipal?.userId;

  return userId;
}

/******************************* Session management *******************************/

export function saveSessionState(complete = false) {
  
  const userId = appState.authentication.userId;
  let state;

  if (!complete) {  
    // persist only basic session info (which timelines are loaded and views displayed)
    state = {
      userId: userId,
      openTimelines: Array.from(timelineCache.values(), tl => tl._file),
      openViews: appState.views
        .filter(v => v.file != null)
        .map(v => {
          return {
            tlKey: v.tlKey,
            file: v.file,
            scope: v.scope,
            tagFilter: v.tagFilter
          }
        })
    };
  } else {
    // persist timeline data and canvas state, too
    state = {
      userId: userId,
      cachedTimelines: Array.from(timelineCache.values(), tl => {
        return {
          file: tl._file,
          scope: tl._scope,
          mode: tl._mode,
          dirty: tl._dirty,
          timeline: timelineString(tl)
        }
      }),
      openViews: appState.views.map(v => {
        return {
          tlKey: v.tlKey, 
          file: v.file,
          scope: v.scope,
          tagFilter: v.tagFilter
        }
      }),
      msPerPx: appState.msPerPx,
      offsetMs: appState.offsetMs
    }
  }
  sessionStorage.setItem("timelineSession", JSON.stringify(state));
}

export async function restoreSessionState() {

  const raw = sessionStorage.getItem("timelineSession");
  if (!raw) return;
  const state = JSON.parse(raw);

  // ignore if different user; don't persist saved session
  if (appState.authentication.userId != state.userId) {
    clearSessionState();
    return;
  };

  // reload openTimelines from database
  if (state.openTimelines) {
    for (const file of state.openTimelines) {
      if (file) await loadTimeline(file);
    }
  }
    
  // restore cachedTimelines from session
  if (state.cachedTimelines) {
    for (const tl of state.cachedTimelines) {
      const timeline = JSON.parse(tl.timeline);
      timeline._file = tl.file;
      timeline._scope = tl.scope;
      timeline._mode = tl.mode;
      timeline._dirty = tl.dirty;
      initializeTimeline(timeline);
      timelineCache.set(timeline._key, timeline);
    }
  }
  
  // restore views (including tag-filtered timelines)
  state.openViews.forEach(v => {
    const view = {
      tlKey: v.tlKey,
      file: v.file,
      scope: v.scope,
      tagFilter: v.tagFilter
    }
    appState.views.push(view);
  });

  // restore canvas state
  if (state.msPerPx && state.offsetMs) {
    appState.msPerPx = state.msPerPx;
    appState.offsetMs = state.offsetMs;
    positionViews(false);
    draw(true);
    
  } else {
    positionViews(false);
    draw(true);
    if (appState.views.length > 0) zoomToView(appState.views[appState.views.length-1]);
  }

  // leave sessionStorage with light session profile
  saveSessionState();
}

export function clearSessionState() {
  sessionStorage.removeItem('timelineSession');
}