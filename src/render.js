const EDGE_GAP = 6;
const PADDING = 20;
const MS_PER_DAY = 86400000; // 1000*60*60*24
const MAX_LABEL_WIDTH = 150;
const LABEL_LINE_HEIGHT = 18;

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

const midY = () => Math.floor(window.innerHeight / 2);

function colorRGB(color) {
  if (color === "blue") { return { r:0, g:100, b:255 }} else
    if (color === "red") { return { r:255, g:0, b:100 } } else
      if (color === "green") { return { r:0, g:255, b:100 } } else
        if (color === "yellow") {return { r:255, g:255, b:100 } } else
          if (color === "purple") {return { r:100, g:0, b:255 } } else
            if (color === "white") {return { r:255, g:255, b:255 } } else
              if (color === "black") { return { r:0, g:0, b:0 } };
}

function colorTrunc(rgb) {
  return rgb.r + "," + rgb.g + "," + rgb.b; 
}

function colorMix(rgb1, rgb2) {
  const m = 
    { r:Math.round((rgb1.r + rgb2.r)/2),
      g:Math.round((rgb1.g + rgb2.g)/2),
      b:Math.round((rgb1.b + rgb2.b)/2)
    };
  return m;
}

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

function zoomSpec(sig){
  const sizeAdj = 3;
  const persistence = 1;
  const fadeIn = 0.4;
  const fadeOut = 1;
  const zoomMaster = [
    { threshold:7, growth:1.5, fadeNear:false, maxBright:1 },
    { threshold:8, growth:1.5, fadeNear:false, maxBright:1 },
    { threshold:9, growth:1.5, fadeNear:false, maxBright:1 },
    { threshold:7, growth:7, fadeNear:true, maxBright:0.6 },
    { threshold:8.5, growth:9, fadeNear:true, maxBright:0.6 },
    { threshold:10.4, growth:7, fadeNear:true, maxBright:0.6 }
  ];

  const factor = Math.log10(msPerPx);
  const z = zoomMaster[sig - 1];
  return {
    factor,
    size: (Math.max((z.threshold + persistence - factor), 0) * z.growth) + sizeAdj,
    fade: (factor > z.threshold) ?
      Math.max((z.threshold + fadeIn - factor) * (z.maxBright / fadeIn), 0) :
      ((factor < z.threshold - persistence) && z.fadeNear) ? Math.max((factor - z.threshold + persistence + fadeOut) * (z.maxBright / fadeOut), 0) : z.maxBright,
    displayLabel: ((factor - z.threshold + 1) < persistence),
    fadeNear: z.fadeNear
  };
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

function drawEvent(e, y, spec) {

  const size = spec.size, fade = spec.fade;

  const x = timeToPx(e.dateTime);
  const xLeft = Math.round(timeToPx(e.tFrom));
  const xRight = Math.round(timeToPx(e.tTo));
  const xFadeLeft = Math.round(timeToPx(e.fLeft));
  const xFadeRight = Math.round(timeToPx(e.fRight));
  const yTop = Math.round(y - size / 2);
  const yBot = Math.round(y + size / 2);

  const c = colorRGB(e.color ?? "white");
  const color = colorTrunc(c);
  const colorLeft = (e.colorLeft === undefined) ? color : colorTrunc(colorMix(c, colorRGB(e.colorLeft)));
  const colorRight = (e.colorRight === undefined) ? color : colorTrunc(colorMix(c, colorRGB(e.colorRight)));

  if (((xRight - xLeft) >= 6) || spec.fadeNear) {

    const curveLeft = (Math.abs(xFadeLeft - xLeft) > 1) && (colorLeft === color);
    const curveRight = (Math.abs(xRight - xFadeRight) > 1) && (colorRight === color);
      
    if (spec.fadeNear) {
      const alphaLeft = (colorLeft === color) ? 0 : fade;
      const alphaRight = (colorRight === color) ? 0 : fade;
      const gradLeft = (xRight > xLeft) ? (xFadeLeft - xLeft) / (xRight - xLeft) : 0;
      const gradRight = (xRight > xLeft) ? 1 - ((xRight - xFadeRight) / (xRight - xLeft)) : 1;

      const grad = ctx.createLinearGradient(xLeft, y, xRight, y);
      if (gradLeft > 0) grad.addColorStop(0, `rgba(${colorLeft},${alphaLeft})`);
        grad.addColorStop(gradLeft, `rgba(${color},${fade})`);
        grad.addColorStop(gradRight, `rgba(${color},${fade})`);
        if (gradRight < 1) grad.addColorStop(1, `rgba(${colorRight},${alphaRight})`);
        ctx.fillStyle = grad;
  } else ctx.fillStyle = `rgba(${color}, ${fade})`;
  
    //const alpha = 40, glow = 30;
    //ctx.shadowColor = `rgba(0,102,255,${Math.min(0.9, alpha)})`;
    //ctx.shadowBlur = glow;

    ctx.beginPath();
    ctx.moveTo(xFadeLeft, yTop);
    if (curveRight) {
      ctx.lineTo(xFadeRight, yTop);
      ctx.quadraticCurveTo(xRight, yTop, xRight, y);
      ctx.quadraticCurveTo(xRight, yBot, xFadeRight, yBot);
    } else {
      ctx.lineTo(xRight, yTop);
      ctx.lineTo(xRight, yBot);
    }
    if (curveLeft) {
      ctx.lineTo(xFadeLeft, yBot);
      ctx.quadraticCurveTo(xLeft, yBot, xLeft, y);
      ctx.quadraticCurveTo(xLeft, yTop, xFadeLeft, yTop);
    } else {
      ctx.lineTo(xLeft, yBot);
      ctx.lineTo(xLeft, yTop);
      ctx.lineTo(xFadeLeft, yTop);
    }
    ctx.closePath();
    ctx.fill();
  }

  // dot - display dot while the line appears too narrow to smooth transition
  if ((xFadeRight - xFadeLeft) < (yBot - yTop) && !spec.fadeNear) {
    ctx.fillStyle = `rgba(${color}, ${fade})`;
    ctx.beginPath();
    ctx.arc(x, y, (size/2), 0, Math.PI*2);
    ctx.fill();
  }
}

function drawLabelBubble(e, x, y) {
  
    // situate the label
    const boxW = Math.ceil(e.parsedWidth) + EDGE_GAP*2;
    const boxH = Math.ceil(e.parsedLabel.length * LABEL_LINE_HEIGHT) + EDGE_GAP;
    const bx = Math.round(x - boxW/2);
    //const by = Math.round(y - 24 - ((LABEL_LINE_HEIGHT + EDGE_GAP) * 3 * e.layer));
    const by = Math.round(y - 24 - e.yOffset);

    // stem
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y + 0.5);
    ctx.lineTo(x + 0.5, by + boxH + 0.5);
    ctx.stroke();

    // label box
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    // label text
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let i=0; i<e.parsedLabel.length; i++) 
      ctx.fillText(e.parsedLabel[i], x - (e.parsedWidth/2), by + EDGE_GAP + (LABEL_LINE_HEIGHT * i));
}

function drawLabelBelow(e, x, y, xFrom, xTo, spec) {
  const thickness = spec.size, zoomFade = spec.fade;
  const w = window.innerWidth;
  const by = Math.round(y + thickness/2 + EDGE_GAP);

  //let bx = Math.max(Math.round(x - (e.labelWidth/2)), xFrom + EDGE_GAP);
  let bx = Math.round(x - (e.labelWidth/2));
  if (bx < (xFrom + EDGE_GAP)) bx = xFrom + EDGE_GAP;
  if ((bx + e.labelWidth) > (xTo - EDGE_GAP)) bx = xTo - e.labelWidth - EDGE_GAP;
  
  // keep on the screen as much as possible
  if (bx < EDGE_GAP) {
    bx = EDGE_GAP;
    if ((bx + e.labelWidth + EDGE_GAP) > xTo) bx = xTo - EDGE_GAP - e.labelWidth;
  }
  if ((bx + e.labelWidth + EDGE_GAP) > w) {
    bx = w - EDGE_GAP - e.labelWidth;
    if (bx < xFrom + EDGE_GAP) bx = xFrom + EDGE_GAP;
  }
    
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'; 
  ctx.fillStyle = `rgba(255, 255, 255, ${zoomFade})`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(e.label, bx, by);
}

function drawEvents(){
  //const w = window.innerWidth;  //, h = window.innerHeight;
  const rangeLeft = 0 - MAX_LABEL_WIDTH / 2;
  const rangeRight = window.innerwidth + MAX_LABEL_WIDTH / 2;
  
  events.forEach(event => {
    if (event.yOffset === null) return; // don't display

    const x = timeToPx(event.dateTime);
    const xFrom = timeToPx(event.tFrom), xTo = timeToPx(event.tTo);
    const y = midY();

    if ((xTo < rangeLeft) || (xFrom > rangeRight)) return;  // off-screen
   
    const spec = zoomSpec(event.significance);

    // draw dot or line
    drawEvent(event, y, spec);

    // draw bubble label above
    if (event.yOffset > 0) drawLabelBubble(event, x, y)
      else if (event.yOffset < 0) drawLabelBelow(event, x, y, xFrom, xTo, spec);

  });
}

function parseLabel(label) {
  // attempt to minimize label width by splitting longer values up
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  const labelWidth = ctx.measureText(label).width;
  const words = label.split(" "); // what about hyphens?
  let line = "", labels = [], maxWidth = 0;

  // parse label by words, start a new line when width exceeds MAX_LABEL_WIDTH
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > MAX_LABEL_WIDTH && n > 0) {
      line = line.trimEnd();
      if (ctx.measureText(line).width > maxWidth) maxWidth = ctx.measureText(line).width;
      labels.push(line);
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  line = line.trimEnd();
  labels.push(line);
  if (ctx.measureText(line).width > maxWidth) maxWidth = ctx.measureText(line).width;

  // if there are 2 rows, try to balance the widths
  if (labels.length === 2) {
    const words = labels[0].split(" ");
    let try0 = labels[0], try1 = labels[1];
    for (w = words.length-1; w > 0; w--) {
      const word = words[w];
      try0 = try0.slice(0, (word.length+1) * -1);
      try1 = word + " " + try1;
      if (ctx.measureText(try1).width > ctx.measureText(try0).width) break;
      labels[0] = try0; labels[1] = try1;
      maxWidth = ctx.measureText(try0).width;
    }
  }

  return {labels, width:maxWidth, labelWidth};
}

function initializeEvents() {
  events.forEach(e => {
    
    // Establish properties for positioning labels
    const parsed = parseLabel(e.label);
    e.labelWidth = parsed.labelWidth;
    e.parsedLabel = parsed.labels;
    e.parsedWidth = parsed.width;
    e.layer = null;
    e.yOffset = null;

    // When only date supplied, convert to a small span in the middle of that day; extend all 'spanning' events to noon on either side
    const d = Date.parse(e.date), h = 60*60*1000;
    e.tFrom = (e.dateFrom === undefined) ? d + (8 * h) : Date.parse(e.dateFrom) + (12 * h);
    e.tTo = (e.dateTo === undefined) ? d + (16 * h) : Date.parse(e.dateTo) + (12 * h);
    e.fLeft = (e.fadeLeft === undefined) ? ((e.dateFrom === undefined) ? d + (11 * h) : e.tFrom) : Date.parse(e.fadeLeft) + (12 * h);
    e.fRight = (e.fadeRight === undefined) ? ((e.dateTo === undefined) ? d + (13 * h) : e.tTo) : Date.parse(e.fadeRight) + (12 * h);
    e.dateTime = (e.date === undefined) ? (e.fRight + e.fLeft) / 2 : d + (12 * h);
    e.x = timeToPx(e.dateTime);  // used only to position labels in relation to each other
  });
}

function updatePositions(){
  events.forEach(e => { e.x = timeToPx(e.dateTime); e.layer = null; e.yOffset = null; });  // reset assignments

  // find a place for each event, if possible - most important first
  for (let sig = 6; sig > 0; sig--) {
    let spec = zoomSpec(sig);
    
    // process each event of this significance
    events.forEach(e => {
      if (e.significance !== sig) return; // not this significance

      if (!spec.displayLabel) { e.layer = 0; e.yOffset = 0; return; }   // also need to check for spec.fade === 0 ???

      // can we place label below? (will display wide enough)
      const lineWidth = (timeToPx(e.tTo) - timeToPx(e.tFrom));
      if (e.labelWidth + EDGE_GAP*2 < lineWidth) { e.layer = -1; e.yOffset = -1; return; }

      const x = e.x;
      const left = x - e.parsedWidth/2 - EDGE_GAP
      const right = x + e.parsedWidth/2 + EDGE_GAP;
      const height = Math.ceil(e.parsedLabel.length * LABEL_LINE_HEIGHT) + EDGE_GAP;
      let bot = 0;
      let top = bot - height;
      let open = false;

      scanUpwardLoop:
      while (top > -200 && !(open)) {
        // Check each already place event (c) for overlap...
        for (let c = 0; c < events.length; c++){
//if (e.label === "Yitzhak Rabin (I)" && events[c].label === "Golda Meir") {
//  console.log({e:e.label, c:events[c].label});}
          if (events[c] === e) continue; // self
          if (!events[c].yOffset || events[c].yOffset === -1) continue; // not placed yet
          
          const cX = events[c].x;
          const cLeft = events[c].x - events[c].parsedWidth/2 - EDGE_GAP;
          const cRight = events[c].x + events[c].parsedWidth/2 + EDGE_GAP;
          const cTop = 0 - events[c].yOffset;
          const cBot = cTop + Math.ceil(events[c].parsedLabel.length * LABEL_LINE_HEIGHT) + EDGE_GAP;

          // if c's bubble is over e's stem (x) then can't display
          if (cLeft < x && cRight > x) { e.yOffset = 0; e.layer = 0; break scanUpwardLoop; }

          // if c's bubble overlaps e's then move up and try again
          if (cLeft < right && cRight > left && cTop < bot && cBot > top) { bot = cTop - EDGE_GAP; top = bot - height; continue scanUpwardLoop;}

          // if e's bubble would overlap c's stem then move up and try again
          if (cBot < top && cX > left && cX < right) { bot = cTop - EDGE_GAP; top = bot - height; continue scanUpwardLoop;}
          
        }
        open = true;
      }
      // place this event
      if (open) e.yOffset = 0 - top;
    });
  }
}

function draw(){
  ctx.clearRect(0,0, window.innerWidth, window.innerHeight);
  drawTicks();
  drawEvents();

/*  
  const sig = 4;
  const spec = zoomSpec(sig);
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  ctx.fillStyle = 'rgba(9, 247, 49, 0.5)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText("mxPerPx:", window.innerWidth - 111, window.innerHeight - 95);
  ctx.fillText(Math.round(msPerPx), window.innerWidth - 30, window.innerHeight - 95);
  ctx.fillText("factor:", window.innerWidth - 111, window.innerHeight - 75);
  ctx.fillText(Math.round((spec.factor)*1000)/1000, window.innerWidth - 30, window.innerHeight - 75);
  ctx.fillText(`fade(${sig}):`, window.innerWidth - 111, window.innerHeight - 55);
  ctx.fillText(Math.round((spec.fade)*1000)/1000, window.innerWidth - 30, window.innerHeight - 55);
  ctx.fillText(`size(${sig}):`, window.innerWidth - 111, window.innerHeight - 35);
  ctx.fillText(Math.round((spec.size)*1000)/1000, window.innerWidth - 30, window.innerHeight - 35);
*/
}
