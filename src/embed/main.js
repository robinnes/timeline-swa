import {appState, canvas, initializeCanvas, resize, tick, draw, followURLParams} from '../canvas.js';
import {getConfiguration} from '../database.js';

async function initializeEmbed() {
  resize();

  getConfiguration().then(config => {
    if (config) appState.configuration = config;
    draw();
  });

  followURLParams();

  requestAnimationFrame(tick);
  canvas.focus();
}

appState.mode = "embed";
initializeCanvas();

initializeEmbed();