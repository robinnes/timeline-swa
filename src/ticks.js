
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

function startOfCentury(t) {
  const d = new Date(t);
  const century = Math.floor(d.getUTCFullYear() / 100) * 100;
  d.setUTCFullYear(century, 0, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}
function addCenturies(t, n){ const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear()+ n*100); return d.getTime(); }

function startOfDecade(t) {
  const d = new Date(t);
  const decade = Math.floor(d.getUTCFullYear() / 10) * 10;
  d.setUTCFullYear(decade, 0, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}
function addDecades(t, n){ const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear()+ n*10); return d.getTime(); }

function startOfYear(t){ const d = new Date(t); d.setUTCMonth(0,1); d.setUTCHours(0,0,0,0); return d.getTime(); }
function addYears(t, n){ const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear()+n); return d.getTime(); }
function nextYear(t){ const d = new Date(startOfYear(t)); d.setUTCFullYear(d.getUTCFullYear()+1); return d.getTime(); }

function startOfMonth(t){ const d = new Date(t); d.setUTCDate(1); d.setUTCHours(0,0,0,0); return d.getTime(); }
function addMonths(t, n){ const d = new Date(t); d.setUTCMonth(d.getUTCMonth()+n); return d.getTime(); }
function nextMonth(t){ const d = new Date(startOfMonth(t)); d.setUTCMonth(d.getUTCMonth()+1); return d.getTime(); }

function startOfDay(t){ const d = new Date(t); d.setUTCHours(0,0,0,0); return d.getTime(); }
function addDays(t, n){ return t + n * MS_PER_DAY; }

function formatYear(t){ return new Date(t).getUTCFullYear().toString(); }
function formatMonthYear(t){ return new Date(t).toLocaleString(undefined,{month:'short', year:'numeric', timeZone:'UTC'}); }
function formatMonth(t){ return new Date(t).toLocaleString(undefined,{month:'short', timeZone:'UTC'}); }
function formatDayMonth(t){ return new Date(t).toLocaleString(undefined,{month:'short', day:'numeric', timeZone:'UTC'}); }
function formatDay(t){ return new Date(t).toLocaleString(undefined,{day:'numeric', timeZone:'UTC'}); }

function tickSpec(){
  const px = pxPerDay();
  if (px < 0.007) {
    return { mode: 'century', start:startOfCentury, step:addCenturies, label:formatYear, majorLabel:formatYear, majorEvery:1000, msPerTick:86400000*365*100, minWidth:30 };
  } else if (px < 0.07) {
    return { mode: 'decade', start:startOfDecade, step:addDecades, label:formatYear, majorLabel:formatYear, majorEvery:100, msPerTick:86400000*365*10, minWidth:30 };
  } else if (px < 0.7) {
    return { mode:'year', start:startOfYear, step:addYears, label:formatYear, majorLabel:formatYear, majorEvery:10, msPerTick:86400000*365, minWidth:30 };
  } else if (px < 12) {
    return { mode:'month', start:startOfMonth, step:addMonths, label:formatMonth, majorLabel:formatYear, majorEvery:12, msPerTick:86400000*30, minWidth:30 };
  } else {
    return { mode:'day', start:startOfDay, step:addDays, label:formatDay, majorLabel:formatMonth, majorEvery:30, msPerTick:86400000, minWidth:18 };
  }
}

function drawTicks(){
  const spec = tickSpec();
  const w = window.innerWidth, h = window.innerHeight;
  const t0 = pxToTime(0), t1 = pxToTime(w);
  
  // Calculate the width of a tick in pixels; used for fade logic
  const tickWidth = spec.msPerTick / msPerPx;

  // Find first tick at/left of viewport
  let t = spec.start(t0);
  /*
  if (t < t0) {
    // advance until we reach visible range
    let guard = 0;
    while (t < t0 && guard++ < 10000) t = spec.step(t, 1);
  } else {
    // step back to ensure we include the one just before
    t = spec.step(t, -1);
  }
*/
  // Corner label (display year or month+year in top-left if necessary)
  let cornerLabelX = EDGE_GAP, cornerLabelWidth = 0; 
  let pushing = false, pushingT = 0, pushingLabel = '', pushingX = 0, pushingWidth = 0;
  if ((spec.mode==='day') || ((spec.mode==='month') && (tickWidth * spec.majorEvery * 2.0)) >= w) {

    ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    const cornerLabelText = spec.mode==='day' ? formatMonthYear(t0) : formatYear(t0);
    
    // Determine whether a major tick is close to the corner label
    const firstMajorTick = spec.mode==='day' ? nextMonth(t0) : nextYear(t0);
    const firstMajorX = timeToPx(firstMajorTick);

    if (firstMajorX < 150) { 
      cornerLabelX -= (150 - firstMajorX); // push left if major tick is close
      pushing = true;
      pushingT = firstMajorTick;
      pushingLabel = spec.mode==='day' ? formatMonthYear(pushingT) : formatYear(pushingT);
      pushingWidth = ctx.measureText(pushingLabel).width; 
      pushingX = Math.max(firstMajorX, EDGE_GAP + (pushingWidth / 2));
    }
    
    // Draw corner label
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(cornerLabelText, cornerLabelX, EDGE_GAP);
    cornerLabelWidth = ctx.measureText(cornerLabelText).width;
    ctx.restore();
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

  // Draw ticks...
  ctx.save();
  ctx.lineWidth = 1;
  for (let i=0; i<10000; i++){
    if (t > t1 + 2 * MS_PER_DAY) break;

    // Tick line
    const x = Math.round(timeToPx(t)) + 0.5; // crisp lines
    
    // major = whether this is a "major" tick (1st of month, Jan 1, decade start, etc)
    const major = (function(){
      if (spec.mode==='day') return (new Date(t).getUTCDate())===1; // 1st of month as major
      if (spec.mode==='month') return new Date(t).getUTCMonth()===0; // January as major
      return (new Date(t).getUTCFullYear() % spec.majorEvery)===0;
    })();

    // draw the tick line
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.strokeStyle = major ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.10)';
    ctx.stroke();

    // display tick label if wide enough
    if (major || tickWidth >= spec.minWidth) {
      const label = (pushing && t===pushingT) ? pushingLabel : (major ? spec.majorLabel(t) : spec.label(t));

      // need this now for measureText
      ctx.font = (major ? '14px' : '14px') + ' system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
      
      // position label on the line, but if it's pushing the corner label, move it right
      const labelX = (pushing && t===pushingT) ? pushingX : x;
     
      // fade out label based on available space (tickWidth)
      let fadeFactor = major ? 0.85 : Math.min((tickWidth - spec.minWidth) / spec.minWidth, 0.85);
      
      if (cornerLabelWidth > 0) {
      // fade out labels that overlap the corner label
      const labelWidth = ctx.measureText(label).width;
      if (labelX - (labelWidth / 2) < cornerLabelX + cornerLabelWidth + PADDING)
        fadeFactor = Math.min(fadeFactor, Math.max(0, ((labelX - (ctx.measureText(label).width / 2) - (cornerLabelX + cornerLabelWidth)) / PADDING)));

      // fade out labels that overlap the "pushing" tick
      if (!(t===pushingT) && (Math.abs(labelX - pushingX) - (labelWidth / 2) - (pushingWidth / 2) < PADDING))
        fadeFactor = Math.min(fadeFactor, Math.max(0, (Math.abs(labelX - pushingX) - (labelWidth / 2) - (pushingWidth/2)) / PADDING));
      }

      // draw the label
      ctx.fillStyle = `rgba(255, 255, 255, ${fadeFactor})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, labelX, EDGE_GAP);
      //ctx.textBaseline = 'bottom';
      //ctx.fillText(label, x, h - EDGE_GAP);
    }
    t = spec.step(t, 1);
  }
  ctx.restore();
}