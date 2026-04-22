import * as Util from './util.js';
import * as Calendar from './calendar.js';
import {DRAW, TICK} from './constants.js';
import {appState, ctx, screenElements, getCanvasViewport} from './canvas.js';
import {isMouseOver} from './render.js';


/* ------------------- Time hierarchy logic -------------------- */

export const tickSpec = new Map([
  ['minute', { 
      mode: 'minute', 
      zoomOut: 'hour', 
      zoomIn: null, 
      start: Calendar.startOfMinute, 
      step: Calendar.addMinutes, 
      majorLabel: Calendar.formatMinuteLong, 
      cornerLabel: Calendar.formatMinuteWeekday, 
      majorEvery: 60, 
      msPerTick: 1000*60, 
      newItemProm: 1,
      label: [{minWidth:20, text:Calendar.formatMinute}],
      panelLabel: Calendar.formatMinuteFull
      }],
  ['hour', { 
      mode: 'hour', 
      zoomOut: 'day', 
      zoomIn: 'minute', 
      start: Calendar.startOfHour, 
      step: Calendar.addHours, 
      majorLabel: Calendar.formatWeekday, 
      cornerLabel: Calendar.formatWeekdayFull, 
      majorEvery: 24, 
      msPerTick: 1000*60*60, 
      newItemProm: 1,
      label: [{minWidth:30, text:Calendar.formatHour}],
      panelLabel: Calendar.formatMinuteFull 
      }],
  ['day', {
      mode: 'day',
      zoomOut: 'month',
      zoomIn: 'day', 
      start: Calendar.startOfDay,
      step: Calendar.addDays,
      majorLabel: Calendar.formatMonth,
      cornerLabel: Calendar.formatMonthYear,
      majorEvery: 30,
      msPerTick: 86400000,
      newItemProm: 1,
      label: [{minWidth:60, text:Calendar.formatWeekday}, {minWidth:20, text:Calendar.formatDay}],
      panelLabel: Calendar.formatDayFull
      }],
  ['month', {
      mode: 'month',
      zoomOut: 'year',
      zoomIn: 'day',
      start: Calendar.startOfMonth,
      step: Calendar.addMonths,
      majorLabel: Calendar.formatYear,
      cornerLabel: Calendar.formatYear,
      majorEvery: 12,
      msPerTick: 86400000*30,
      newItemProm: 2,
      label: [{minWidth:30, text:Calendar.formatMonth}],
      panelLabel: Calendar.formatMonthYear
    }],
  ['year', { 
      mode: 'year',
      zoomOut: 'decade',
      zoomIn: 'month',
      start: Calendar.startOfYear, 
      step: Calendar.addYears, 
      majorLabel: Calendar.formatYear, 
      cornerLabel: null, 
      majorEvery: 10, 
      msPerTick: 86400000*365, 
      newItemProm: 3,
      label: [{minWidth:40, text:Calendar.formatYear}],
      panelLabel: Calendar.formatYear
    }],
  ['decade', {
      mode: 'decade',
      zoomOut: 'century',
      zoomIn: 'year',
      start: Calendar.startOfDecade,
      step: Calendar.addDecades,
      majorLabel: Calendar.formatYear,
      cornerLabel: null,
      majorEvery: 100,
      msPerTick: 86400000*365*10,
      newItemProm: 3,
      label: [{minWidth:30, text:Calendar.formatYear}],
      panelLabel: Calendar.formatYearCirca
    }],
  ['century', {
      mode: 'century',
      zoomOut: 'millenium',
      zoomIn: 'decade',
      start: Calendar.startOfCentury,
      step: Calendar.addCenturies,
      majorLabel: Calendar.formatYear,
      cornerLabel: null,
      majorEvery: 1000,
      msPerTick: 86400000*365*100,
      newItemProm: 3,
      label: [{minWidth:30, text:Calendar.formatYear}],
      panelLabel: Calendar.formatYearCirca
    }],
  ['millenium', {
      mode: 'millenium',
      zoomOut: 'millenium',
      zoomIn: 'century',
      start: Calendar.startOfMillenium,
      step: Calendar.addMillenia,
      majorLabel: Calendar.formatYear,
      cornerLabel: null,
      majorEvery: 10000,
      msPerTick: 86400000*365*1000,
      newItemProm: 3,
      label: [{minWidth:30, text:Calendar.formatYear}],
      panelLabel: Calendar.formatYearCirca
    }]
]);

export function getTickSpec() {
  // iterate tickSpec until current zoom level (msPerPx) would produce ticks at minimum MIN_WIDTH pixels
  let spec = null;
  for (const value of tickSpec.values()) {
    if (value.msPerTick >= appState.msPerPx * TICK.MIN_WIDTH) {
      spec = value;
      break;
    }
  }
  return spec;
}

export function startOfTick(t) {
  const spec = getTickSpec();
  return spec.start(t);
}

export function nextTick(t) {
  const spec = getTickSpec();
  return spec.step(t, 1);
}

/* ------------------- Draw elements -------------------- */

function drawTickLabel(text, left, width, fade, t, mode) {
  const right = left + width;
  const bottom = TICK.TICK_TOP + TICK.TICK_LABEL_HEIGHT;
  let highlight = false;

  // register the tick label for mouse hit detection
  // t,mode direct the click to zoom/pan to 'mode' (year/month/etc.) at location t
  screenElements.push({left:left, right:right, top:TICK.TICK_TOP, bottom:bottom, type:'tick', t:t, mode:mode });

  // check here if mouse is over this tick label; it may have moved under the mouse
  if (isMouseOver(left, right, TICK.TICK_TOP, bottom)) {
    appState.highlighted.idx = screenElements.length - 1;
    highlight = true;
  }

  ctx.save();
  if (highlight) {
    ctx.shadowColor = DRAW.HIGHLIGHT_SHADOW;  ctx.shadowBlur = DRAW.HIGHLIGHT_GLOW;
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.roundRect(left - DRAW.EDGE_GAP, TICK.TICK_TOP - DRAW.EDGE_GAP, width + DRAW.EDGE_GAP*2, TICK.TICK_LABEL_HEIGHT + DRAW.EDGE_GAP, 8);
    ctx.fill();
    fade = DRAW.LABEL_BRIGHTNESS; // label text always bright when highlighted
  }

  //ctx.font = TICK.TICK_FONT;
  ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, left, TICK.TICK_TOP);
  ctx.restore();
}

function drawTickLine(x, width, style) {
  const vp = getCanvasViewport();
  const h = vp.height;
  const adjX = Math.round(x) + 0.5;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(adjX, 0);
  ctx.lineTo(adjX, h);
  ctx.lineWidth = width;
  ctx.strokeStyle = style; // major ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.10)';
  ctx.stroke();
  ctx.restore();
}


/* ------------------- Master functions -------------------- */

export function drawTicks() {
  const spec = getTickSpec();
  const majorSpec = tickSpec.get(spec.zoomOut);
  const vp = getCanvasViewport();
  const t0 = Util.pxToTime(vp.left);
  const t1 = Util.pxToTime(vp.right);
  const tickWidth = spec.msPerTick / appState.msPerPx;
  let t = spec.start(t0);
  let majorT = majorSpec.start(t0);
  ctx.font = TICK.TICK_FONT;  // need it here for calculating width

  // Corner label (display year or month+year in top-left if necessary)
  let cornerLabelX = vp.left + DRAW.EDGE_GAP;
  let cornerLabelWidth = 0; 
  let pushing = false;
  let pushingT = 0;
  let pushingLabel = '';
  let pushingX = 0;
  let pushingWidth = 0;
  
  if (spec.cornerLabel) {
    const cornerLabelText = spec.cornerLabel(majorT);
    
    // Determine whether a major tick is close to the corner label
    const firstMajorTick = majorSpec.step(majorT, 1);
    const firstMajorX = Util.timeToPx(firstMajorTick);
    cornerLabelWidth = ctx.measureText(cornerLabelText).width;
    const push_threshold = (cornerLabelWidth * 2) + TICK.PADDING;

    if (firstMajorX < push_threshold) { 
      cornerLabelX -= (push_threshold - firstMajorX); // push left if major tick is close
      pushing = true;
      pushingT = firstMajorTick;
      pushingLabel = spec.cornerLabel(pushingT);
      pushingWidth = ctx.measureText(pushingLabel).width; 
      pushingX = Math.max(firstMajorX, DRAW.EDGE_GAP + (pushingWidth / 2));
    }
    const cornerLabelT = majorT;
    const cornerLabelMode = spec.zoomOut;

    // Draw corner label
    drawTickLabel(cornerLabelText, cornerLabelX, cornerLabelWidth, TICK.MAX_TICK_LABEL_BRIGHT, cornerLabelT, cornerLabelMode);
  }

  // Tick lines and labels across the top
  ctx.lineWidth = 1;
  for (let i=0; i<10000; i++){
    if (t > t1 + 2 * tickWidth) break;

    const x = Util.timeToPx(t);
    
    // major = whether this is a "major" tick (1st of month, Jan 1, decade start, etc)
    const major = (t===majorT);
    const tag = (major) ? spec.zoomOut : spec.mode;  // drives what happens when label is clicked

    // draw the tick line
    drawTickLine(x, 1, major ? TICK.MAJOR_LINE_COLOR : TICK.MINOR_LINE_COLOR);

    // determine format of tick label
    let label = null;
    let minWidth = spec.label[spec.label.length-1].minWidth;  // smallest minWidth for the spec
    if (pushing && t===pushingT) {
      label = pushingLabel;
    } else if (major) {
      label = spec.majorLabel(t);
    } else {
      // iterate spec.label array
      for (let i=0; i<spec.label.length; i++) {
        if (tickWidth >= spec.label[i].minWidth) {
          label = spec.label[i].text(t);
          break;
        }
      }
    }

    if (label) {
      const labelWidth = ctx.measureText(label).width;
        
      // position label on the line, but if it's pushing the corner label, move it right
      const labelX = (pushing && t===pushingT) ? pushingX : x;
      const left = labelX - (labelWidth / 2);

      // fade out label based on available space (tickWidth)
      let fadeFactor = major ? 0.85 : Math.min((tickWidth - minWidth) / minWidth, 0.85);
      
      if (cornerLabelWidth > 0) {
        // fade out labels that overlap the corner label
        if (left < cornerLabelX + cornerLabelWidth + TICK.PADDING)
          fadeFactor = Math.min(fadeFactor, Math.max(0, ((left - (cornerLabelX + cornerLabelWidth)) / TICK.PADDING)));

        // fade out labels that overlap the "pushing" tick
        if (!(t===pushingT) && (Math.abs(labelX - pushingX) - (labelWidth / 2) - (pushingWidth / 2) < TICK.PADDING))
          fadeFactor = Math.min(fadeFactor, Math.max(0, (Math.abs(labelX - pushingX) - (labelWidth / 2) - (pushingWidth/2)) / TICK.PADDING));
      }
      // draw the label
      if (fadeFactor > 0) drawTickLabel(label, left, labelWidth, fadeFactor, t, tag);
      
    }
    t = spec.step(t, 1);
    const nextMajorT = majorSpec.step(majorT, 1);
    if (nextMajorT <= t) majorT = nextMajorT;
  }

  // Current date/time blue line
  const nowX = Util.timeToPx(Calendar.timeZoneNow());
  if (nowX >= 0 && nowX <= vp.right) {
    drawTickLine(nowX, 2, TICK.NOW_LINE_COLOR);
  }
//debugVars();
}

// *********************************************************************************
export function debugVars() {
  const ctx = canvas.getContext('2d');
  const leftLabel = window.innerWidth - 300;
  const leftValue = window.innerWidth - 200;
  let top = window.innerHeight - 95;

  ctx.save();
  ctx.font = DRAW.LABEL_FONT;
  ctx.fillStyle = 'rgba(9, 247, 49, 0.5)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  const spec = getTickSpec();
  const tickWidth = spec.msPerTick / appState.msPerPx;
  const t = Util.pxToTime(0);
  
  ctx.fillText("tickSpec:", leftLabel, top);
  ctx.fillText(spec.mode, leftValue, top);
  top += 20;
  ctx.fillText("log10(msPerPx):", leftLabel, top);
  ctx.fillText(Math.round(Math.log10(appState.msPerPx)*1000)/1000, leftValue, top);
  top += 20;
  ctx.fillText("tickWidth:", leftLabel, top);
  ctx.fillText(Math.round(tickWidth*1000)/1000, leftValue, top);
  /*
  top += 20;
  ctx.fillText("t:", leftLabel, top);
  ctx.fillText(Math.round(t*1000)/1000, leftValue, top);
  */

  ctx.restore();
};
