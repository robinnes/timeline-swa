import * as Util from './util.js';
import {appState, timelineCache} from './canvas.js';
import {loadTimeline} from './timeline.js';


/******************************* Authentication *******************************/

export async function getAuthState() {

  // simulate logged-in state if running locally
  if (await Util.isLocalEnv()) {
    appState.authentication.userId = "simulated";
    return true;
  }

  // retrieve identity block from the ./auth/me URL 
  const res = await fetch('/.auth/me', {cache:'no-store'});
  if (!res.ok) return false;

  const data = await res.json();
  appState.authentication.userId = data?.clientPrincipal?.userId;
  const isAuthenticated = !!appState.authentication.userId;

  return isAuthenticated;
}

/******************************* Session management *******************************/

export function saveSessionState() {

  const state = {
    userId: appState.authentication.userId,
    cachedTimelines: Array.from(timelineCache.values(), tl => tl._file),
    openViews: appState.views.map(v => {
      return {
        tlKey: v.tlKey, 
        file: v.file,
        scope: v.scope,
        tagFilter: v.tagFilter
      }
    }),
  };
console.log({userId: state.userId, timelines: state.cachedTimelines.length, views: state.openViews.length});

  sessionStorage.setItem("timelineSession", JSON.stringify(state));


/*
  const dirty = [];

  for (const tl of timelineCache.values()) {
    if (tl._dirty) {
      dirty.push({
        file: tl._file,
        data: timelineString(tl)
      });
    }
  }

  sessionStorage.setItem("dirtyTimelines", JSON.stringify(dirty));
  */
}


export async function restoreSessionState() {

  const raw = sessionStorage.getItem("timelineSession");
  if (!raw) return;
  const state = JSON.parse(raw);

  await getAuthState();
console.log({userId: appState.authentication.userId, savedUserId: state.userId, timelines: state.cachedTimelines.length, views: state.openViews.length});

  if (appState.authentication.userId != state.userId) return;

  for (const file of state.cachedTimelines) {
    await loadTimeline(file);
  }

  state.openViews.forEach(v => {
    const view = {
      tlKey: v.tlKey,
      file: v.file,
      scope: v.scope,
      tagFilter: v.tagFilter
    }
    appState.views.push(view);
  });

  // restore selection, zoom, etc...
}
