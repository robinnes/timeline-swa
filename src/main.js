import {appState, canvas, initializeCanvas, resize, tick, draw, followURLParams} from './canvas.js';
import {getConfiguration} from './database.js';
import {getAuthState, restoreSessionState} from './session.js';
import {initializeDragging} from './dragging.js';
import {editSelectedView, editSelectedItem} from './panelEdit.js';
import {registerEditPanelHandlers} from './panel.js';

async function initializeApp() {
  resize();

  getConfiguration().then(config => {
    if (config) appState.configuration = config;
    draw();
  });

  const userId = await getAuthState();
  appState.authentication.userId = userId;
  
  // if there is a user session underway then restore
  await restoreSessionState();

  followURLParams();

  requestAnimationFrame(tick);
  canvas.focus();
}

appState.mode = "app";

// allows embed mode to avoid loading panelEdit and its dependents
registerEditPanelHandlers({
  editSelectedView,
  editSelectedItem
});

// order counts here - dragging events must happen first
initializeDragging();
initializeCanvas();

initializeApp();