import {TIME} from './constants.js';
import {appState} from './canvas.js';

// --- Helper functions

export const pxToTime = x => TIME.EPOCH + appState.offsetMs + (x * appState.msPerPx);

export const timeToPx = t => (t - TIME.EPOCH - appState.offsetMs + (1000 * 60 * 60 * 12)) / appState.msPerPx;

export const pxPerDay = x => (1 / (msPerPx / TIME.MS_PER_DAY));
