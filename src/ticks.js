const PUSHING_THRESHOLD = 150; // px distance from corner label to start "pushing"
const MAX_TICK_LABEL_BRIGHT = 0.85; // max brightness for tick labels

// Helper functions
function timeZoneNow(){
  const now = new Date();
  return Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
}

function yearFloor(t, n) {
  // return beginning of n-year period
  const d = new Date(t);
  const m = Math.floor(d.getUTCFullYear() / n) * n;
  d.setUTCFullYear(m, 0, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfMillenium(t) { return yearFloor(t, 1000); }
function addMillenia(t, n){ const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear()+ n*1000); return d.getTime(); }

function startOfCentury(t) { return yearFloor(t, 100); }
function addCenturies(t, n){ const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear()+ n*100); return d.getTime(); }

function startOfDecade(t) { return yearFloor(t, 10); }
function addDecades(t, n){ const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear()+ n*10); return d.getTime(); }

function startOfYear(t){ const d = new Date(t); d.setUTCMonth(0,1); d.setUTCHours(0,0,0,0); return d.getTime(); }
function addYears(t, n){ const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear()+n); return d.getTime(); }
function nextYear(t){ const d = new Date(startOfYear(t)); d.setUTCFullYear(d.getUTCFullYear()+1); return d.getTime(); }

function startOfMonth(t){ const d = new Date(t); d.setUTCDate(1); d.setUTCHours(0,0,0,0); return d.getTime(); }
function addMonths(t, n){ const d = new Date(t); d.setUTCMonth(d.getUTCMonth()+n); return d.getTime(); }
function nextMonth(t){ const d = new Date(startOfMonth(t)); d.setUTCMonth(d.getUTCMonth()+1); return d.getTime(); }

function startOfWeek(t){ const d = new Date(t - new Date(t).getDay() * MS_PER_DAY); return d.getTime(); }
function addWeeks(t, n){ return t + n * MS_PER_DAY * 7; }

function startOfDay(t){ const d = new Date(t); d.setUTCHours(0,0,0,0); return d.getTime(); }
function addDays(t, n){ return t + n * MS_PER_DAY; }

function formatYear(t){ return new Date(t).getUTCFullYear().toString(); }
function formatMonthYear(t){ return new Date(t).toLocaleString(undefined,{month:'short', year:'numeric', timeZone:'UTC'}); }
function formatMonth(t){ return new Date(t).toLocaleString(undefined,{month:'short', timeZone:'UTC'}); }
function formatDayMonth(t){ return new Date(t).toLocaleString(undefined,{month:'short', day:'numeric', timeZone:'UTC'}); }
function formatDay(t){ return new Date(t).toLocaleString(undefined,{day:'numeric', timeZone:'UTC'}); }

const tickSpec = new Map([
  ['day',     { mode:'day', zoomOut:'week', zoomIn:'day', start:startOfDay, step:addDays, label:formatDay, majorLabel:formatMonth, majorEvery:30, msPerTick:86400000, minWidth:18 }],
  ['week',    { mode:'week', zoomOut:'month', zoomIn:'week', start:startOfWeek, step:addWeeks, label:formatDay, majorLabel:formatMonth, majorEvery:7, msPerTick:86400000*7, minWidth:18 }],
  ['month',   { mode:'month', zoomOut:'year', zoomIn:'week', start:startOfMonth, step:addMonths, label:formatMonth, majorLabel:formatYear, majorEvery:12, msPerTick:86400000*30, minWidth:30 }],
  ['year',    { mode:'year', zoomOut:'decade', zoomIn:'month', start:startOfYear, step:addYears, label:formatYear, majorLabel:formatYear, majorEvery:10, msPerTick:86400000*365, minWidth:30 }],
  ['decade',  { mode:'decade', zoomOut:'century', zoomIn:'year',start:startOfDecade, step:addDecades, label:formatYear, majorLabel:formatYear, majorEvery:100, msPerTick:86400000*365*10, minWidth:30 }],
  ['century', { mode:'century', zoomOut:'millenium', zoomIn:'decade', start:startOfCentury, step:addCenturies, label:formatYear, majorLabel:formatYear, majorEvery:1000, msPerTick:86400000*365*100, minWidth:30 }],
  ['millenium', { mode:'millenium', zoomOut:'millenium', zoomIn:'century', start:startOfMillenium, step:addMillenia, label:formatYear, majorLabel:formatYear, majorEvery:10000, msPerTick:86400000*365*1000, minWidth:30 }]
]);

function getTickSpec(){
  const f = Math.log10(msPerPx);
  if (f >= 10) return tickSpec.get('century')
  else if (f >= 9) return tickSpec.get('decade')
  else if (f >= 8) return tickSpec.get('year')
  else if (f >= 7) return tickSpec.get('month')
  else return tickSpec.get('day');
}

function drawTick(text, left, width, fade, t, mode) {
  const top = EDGE_GAP;
  const bottom = top + LABEL_LINE_HEIGHT;
  const right = left + width;
  let highlight = false;

  // register the tick label for mouse hit detection
  // t,mode direct the click to zoom/pan to 'mode' (year/month/etc.) at location t
  screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'tick', t:t, mode:mode });

  // check here if mouse is over this tick label; it may have moved under the mouse
  if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
    highlightIdx = screenElements.length - 1;
    highlight = true;
  }

  ctx.save();
  if (highlight) {
    ctx.shadowColor = HIGHLIGHT_SHADOW;  ctx.shadowBlur = HIGHLIGHT_GLOW;
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.roundRect(left - EDGE_GAP, top - EDGE_GAP, width + EDGE_GAP*2, LABEL_LINE_HEIGHT + EDGE_GAP, 8);
    ctx.fill();
    fade = LABEL_BRIGHTNESS; // label text always bright when highlighted
  }
  ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, left, top);
  ctx.restore();
}

function drawTicks() {
  const spec = getTickSpec();
  const w = window.innerWidth, h = window.innerHeight;
  const t0 = pxToTime(0), t1 = pxToTime(w);
  const tickWidth = spec.msPerTick / msPerPx;
  ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';  // need this for measureText
  let t = spec.start(t0);

  // Corner label (display year or month+year in top-left if necessary)
  let cornerLabelX = EDGE_GAP;
  let cornerLabelWidth = 0; 
  let pushing = false;
  let pushingT = 0;
  let pushingLabel = '';
  let pushingX = 0;
  let pushingWidth = 0;
  if ((spec.mode==='day') || ((spec.mode==='month') && (tickWidth * spec.majorEvery * 2.0)) >= w) {

    const cornerLabelText = spec.mode==='day' ? formatMonthYear(t0) : formatYear(t0);
    
    // Determine whether a major tick is close to the corner label
    const firstMajorTick = spec.mode==='day' ? nextMonth(t0) : nextYear(t0);
    const firstMajorX = timeToPx(firstMajorTick);

    if (firstMajorX < PUSHING_THRESHOLD) { 
      cornerLabelX -= (PUSHING_THRESHOLD - firstMajorX); // push left if major tick is close
      pushing = true;
      pushingT = firstMajorTick;
      pushingLabel = spec.mode==='day' ? formatMonthYear(pushingT) : formatYear(pushingT);
      pushingWidth = ctx.measureText(pushingLabel).width; 
      pushingX = Math.max(firstMajorX, EDGE_GAP + (pushingWidth / 2));
    }
    cornerLabelWidth = ctx.measureText(cornerLabelText).width;
    const cornerLabelT = spec.mode==='day' ? startOfMonth(t) : startOfYear(t);
    const cornerLabelMode = spec.mode==='day' ? 'month' : 'year';
    // Draw corner label
    drawTick(cornerLabelText, cornerLabelX, cornerLabelWidth, MAX_TICK_LABEL_BRIGHT, cornerLabelT, cornerLabelMode);
  }

  // Current date/time blue line
  const nowX = timeToPx(timeZoneNow());
  if (nowX >= 0 && nowX <= w) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 123, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.round(nowX) + 0.5, 0);
    ctx.lineTo(Math.round(nowX) + 0.5, h);
    ctx.stroke();
    ctx.restore();
  }

  // Tick lines and labels across the top
  ctx.lineWidth = 1;
  for (let i=0; i<10000; i++){
    if (t > t1 + 2 * MS_PER_DAY) break;

    const x = Math.round(timeToPx(t)) + 0.5; // crisp lines
    
    // major = whether this is a "major" tick (1st of month, Jan 1, decade start, etc)
    const major = (function(){
      if (spec.mode==='day') return new Date(t).getUTCDate() === 1; // 1st of month as major
      if (spec.mode==='month') return new Date(t).getUTCMonth() === 0; // January as major
      return new Date(t).getUTCFullYear() % spec.majorEvery === 0;
    })();
    const tag = (major) ? spec.zoomOut : spec.mode;  // drives what happens when label is clicked

    // draw the tick line
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.strokeStyle = major ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.10)';
    ctx.stroke();

    // display tick label if wide enough
    if (major || tickWidth >= spec.minWidth) {
      const label = (pushing && t===pushingT) ? pushingLabel : (major ? spec.majorLabel(t) : spec.label(t));
      const labelWidth = ctx.measureText(label).width;
        
      // position label on the line, but if it's pushing the corner label, move it right
      const labelX = (pushing && t===pushingT) ? pushingX : x;
      const left = labelX - (labelWidth / 2);

      // fade out label based on available space (tickWidth)
      let fadeFactor = major ? 0.85 : Math.min((tickWidth - spec.minWidth) / spec.minWidth, 0.85);
      
      if (cornerLabelWidth > 0) {
        // fade out labels that overlap the corner label
        if (left < cornerLabelX + cornerLabelWidth + PADDING)
          fadeFactor = Math.min(fadeFactor, Math.max(0, ((left - (cornerLabelX + cornerLabelWidth)) / PADDING)));

        // fade out labels that overlap the "pushing" tick
        if (!(t===pushingT) && (Math.abs(labelX - pushingX) - (labelWidth / 2) - (pushingWidth / 2) < PADDING))
          fadeFactor = Math.min(fadeFactor, Math.max(0, (Math.abs(labelX - pushingX) - (labelWidth / 2) - (pushingWidth/2)) / PADDING));
      }
      // draw the label
      if (fadeFactor > 0) drawTick(label, left, labelWidth, fadeFactor, t, tag);
    }
    t = spec.step(t, 1);
  }
}