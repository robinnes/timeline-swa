const MAX_LABEL_WIDTH = 150;
const LABEL_FONT = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
const TITLE_FONT = '14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
const LABEL_LINE_HEIGHT = 18;
const LABEL_STEM_HEIGHT = 30;
const EDGE_GAP = 6;
const PADDING = 20;
const HIGHLIGHT_SHADOW = 'rgba(0,102,255,40)';
const HIGHLIGHT_GLOW = 30;
const LABEL_BRIGHTNESS = 0.85;  // default for label text
const DOT_HOVER_PAD = 6;  // maximum padding around dots for hover detection
const FADE_HIGHLIGHT_THRESHOLD = 0.4;  // lines where fade is below will not highlight
const MAX_SIGNIFICANCE = 6;  // largest possible value for event.significance
const DEFAULT_LINE_COLOR = "blue";

const colorRGB = new Map([
  ["black",  { r:0,   g:0,   b:0   }],
  ["white",  { r:255, g:255, b:255 }],
  ["blue",   { r:0,   g:100, b:255 }],
  ["purple", { r:100, g:0,   b:255 }],
  ["red",    { r:255, g:0,   b:100 }],
  ["orange", { r:255, g:100, b:100 }],
  ["yellow", { r:255, g:255, b:100 }],
  ["green",  { r:0,   g:255, b:100 }]
]);

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

function zoomSpec(sig){
  const sizeAdj = 3;
  const persistence = 1;
  const fadeIn = 0.4;
  const fadeOut = 2;
  const zoomMaster = [
    { threshold:7, growth:1.5, fadeNear:false, maxBright:1 },
    { threshold:8, growth:1.5, fadeNear:false, maxBright:1 },
    { threshold:9, growth:1.5, fadeNear:false, maxBright:1 },
    { threshold:7, growth:7, fadeNear:true, maxBright:0.6 },
    { threshold:8.5, growth:9, fadeNear:true, maxBright:0.6 },
    { threshold:11, growth:9, fadeNear:true, maxBright:0.6 }
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
    fadeNear: z.fadeNear,
    style: (z.fadeNear) ? 'line' : 'dot'
  };
}

function registerEvents(tl) {
  // add each visible line/dot/label to the screenElements array and identify which the mouse is over (if any)
  const rangeLeft = 0 - MAX_LABEL_WIDTH / 2;
  const rangeRight = window.innerWidth + MAX_LABEL_WIDTH / 2;
  const y = tl.yPos;

  // iterate through events, highest significance first to check the lowest ones for mouseover last
  for (let sig = MAX_SIGNIFICANCE; sig > 0; sig--) {
    const spec = zoomSpec(sig);
    const height = spec.size;
    
    // process each event (determined to be visible) of this significance
    tl.events.filter(e => e.significance === sig && e.yOffset !== null).forEach(e => {
      const x = timeToPx(e.dateTime);
      let left = Math.round(timeToPx(e.tFrom));
      let right = Math.round(timeToPx(e.tTo));
      let top = Math.round(y - height / 2);
      let bottom = Math.round(y + height / 2);

      if ((right < rangeLeft) || (left > rangeRight)) return;  // off-screen (horizontally)
      
      // accommodate very small dots by expanding hit area
      if (!spec.fadeNear) { 
        left = Math.min(left, Math.round(x - DOT_HOVER_PAD));
        right = Math.max(right, Math.round(x + DOT_HOVER_PAD));
        top = Math.min(top, Math.round(y - DOT_HOVER_PAD));
        bottom = Math.max(bottom, Math.round(y + DOT_HOVER_PAD));
      }

      // register line/dot as a screen element that can be interacted with
      screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'line', event:e});
    
      // check for mouseover
      if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
        highlightIdx = screenElements.length - 1;
        highlightedEvent = e;
      }

      // process the label, if applicable
      const p = getLabelPosition(e, y);
      if (p) {
        // register label as a screen element that can be interacted with
        screenElements.push({left:p.left, right:p.right, top:p.top, bottom:p.bottom, type:p.type, event:e});

        // check for mouseover
        if (mouseX >= p.left && mouseX <= p.right && mouseY >= p.top && mouseY <= p.bottom) {
          highlightIdx = screenElements.length - 1;
          highlightedEvent = e;
        }
      }

    });
  }
}

function getLabelPosition(e, y) {
  // return coordinates of label for event e
  const x = timeToPx(e.dateTime);

  if (e.yOffset > 0) {
    // bubble above y
    const width = Math.ceil(e.parsedWidth) + EDGE_GAP*2;
    const height = Math.ceil(e.parsedLabel.length * LABEL_LINE_HEIGHT) + EDGE_GAP;
    const left = Math.round(x - width/2);
    const right = left + width;
    const top = Math.round(y - LABEL_STEM_HEIGHT - e.yOffset);
    const bottom = top + height;
    return {type:'bubble', x:x, y:y, left:left, right:right, top:top, bottom:bottom, width:width, height:height};

  } else if (e.yOffset === -1) {
    // label below y
    const spec = zoomSpec(e.significance);
    const thickness = spec.size;
    let xFrom = Math.round(timeToPx(e.tFrom));
    let xTo = Math.round(timeToPx(e.tTo));
    const w = window.innerWidth;
    const top = Math.round(y + thickness/2);
    const width = e.labelWidth;
    const height = LABEL_LINE_HEIGHT;

    let left = Math.round(x - (width/2));
    if (left < (xFrom + EDGE_GAP)) left = xFrom + EDGE_GAP;
    if ((left + width) > (xTo - EDGE_GAP)) left = xTo - width - EDGE_GAP;
  
    // keep on the screen as much as possible
    if (left < EDGE_GAP) {
      left = EDGE_GAP;
      if ((left + width + EDGE_GAP) > xTo) left = xTo - EDGE_GAP - width;
    }
    if ((left + width + EDGE_GAP) > w) {
      left = w - EDGE_GAP - width;
      if (left < xFrom + EDGE_GAP) left = xFrom + EDGE_GAP;
    }
  
    const right = left + width;
    const bottom = top + height;

    return {type:'label', x:x, y:y, left:left, right:right, top:top, bottom:bottom, width:width, height:height};
  }
  return null;
}

function drawEventLine(e, highlight) {

  const spec = zoomSpec(e.significance);
  const height = spec.size;
  const fade = spec.fade;
  const x = timeToPx(e.dateTime);
  const y = e.yPos;
  const left = Math.round(timeToPx(e.tFrom));
  const right = Math.round(timeToPx(e.tTo));
  const width = right - left;
  const xFadeLeft = Math.round(timeToPx(e.fLeft));
  const xFadeRight = Math.round(timeToPx(e.fRight));
  const top = Math.round(y - height / 2);
  const bottom = Math.round(y + height / 2);

  const c = e.color ?? "white";
  const cl = e.colorLeft ?? "black";
  const cr = e.colorRight ?? "black";
  const color = colorTrunc(colorRGB.get(c));
  // if edge color is black, use (middle) color and apply fade effect below
  const colorLeft = (cl === "black") ? color : colorTrunc(colorMix(colorRGB.get(cl), colorRGB.get(c)));
  const colorRight = (cr === "black") ? color : colorTrunc(colorMix(colorRGB.get(cr), colorRGB.get(c)));
  
  ctx.save();
  if (width >= 6 || spec.style === 'line') {
    const curveLeft = (Math.abs(xFadeLeft - left) > 1) && (cl === "black");
    const curveRight = (Math.abs(right - xFadeRight) > 1) && (cr === "black");
     
    if (spec.style === 'line') {
      const alphaLeft = (curveLeft) ? 0 : fade; //(colorLeft === color) ? 0 : fade;
      const alphaRight = (curveRight) ? 0 : fade; //(colorRight === color) ? 0 : fade;
      const gradLeft = (right > left) ? (xFadeLeft - left) / width : 0;
      const gradRight = (right > left) ? 1 - ((right - xFadeRight) / width) : 1;

      const grad = ctx.createLinearGradient(left, y, right, y);
      if (gradLeft > 0) grad.addColorStop(0, `rgba(${colorLeft},${alphaLeft})`);
        grad.addColorStop(gradLeft, `rgba(${color},${fade})`);
        grad.addColorStop(gradRight, `rgba(${color},${fade})`);
        if (gradRight < 1) grad.addColorStop(1, `rgba(${colorRight},${alphaRight})`);
        ctx.fillStyle = grad;
    } else ctx.fillStyle = `rgba(${color}, ${fade})`;

    if (highlight) { ctx.shadowColor = `rgba(${color},40)`;  ctx.shadowBlur = HIGHLIGHT_GLOW; }

    ctx.beginPath();
    ctx.moveTo(xFadeLeft, top);
    if (curveRight) {
      ctx.lineTo(xFadeRight, top);
      ctx.quadraticCurveTo(right, top, right, y);
      ctx.quadraticCurveTo(right, bottom, xFadeRight, bottom);
    } else {
      ctx.lineTo(right, top);
      ctx.lineTo(right, bottom);
    }
    if (curveLeft) {
      ctx.lineTo(xFadeLeft, bottom);
      ctx.quadraticCurveTo(left, bottom, left, y);
      ctx.quadraticCurveTo(left, top, xFadeLeft, top);
    } else {
      ctx.lineTo(left, bottom);
      ctx.lineTo(left, top);
      ctx.lineTo(xFadeLeft, top);
    }
    ctx.closePath();
    ctx.fill();
  }

  // dot - display dot while the line appears too narrow to smooth transition
  if ((xFadeRight - xFadeLeft) < height && spec.style === 'dot') {
    ctx.fillStyle = `rgba(${color}, ${fade})`;
    ctx.beginPath();
    ctx.arc(x, y, (height/2), 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLabelHover(e, x, y) {
  // display label right where the event is drawn
  const width = Math.ceil(e.parsedWidth) + EDGE_GAP*2;
  const height = Math.ceil(e.parsedLabel.length * LABEL_LINE_HEIGHT) + EDGE_GAP;
  const left = Math.round(x - width/2);
  const top = Math.round(y - height/2);

  drawLabelBubble(e, left, width, top, height, true);
}

function drawLabelBubble(e, left, width, top, height, highlight) {

  ctx.save();

  // label box
  ctx.fillStyle = 'rgb(40,40,40)';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(left, top, width, height, 8);
  if (highlight) ctx.shadowColor = HIGHLIGHT_SHADOW;  ctx.shadowBlur = HIGHLIGHT_GLOW;
  ctx.fill();
  ctx.stroke();

  // label text
  ctx.font = LABEL_FONT;
  ctx.fillStyle = `rgba(255,255,255,${LABEL_BRIGHTNESS})`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (let i=0; i<e.parsedLabel.length; i++) 
    ctx.fillText(e.parsedLabel[i], left + EDGE_GAP, top + EDGE_GAP + (LABEL_LINE_HEIGHT * i));
  
  ctx.restore();
}

function drawLabelAbove(e, highlight) {
  const y = e.yPos;
  const p = getLabelPosition(e, y);
  const spec = zoomSpec(e.significance);
  const lineTop = y - (spec.size/2);

  // stem: from top of the event line/dot to bottom of label box
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x, lineTop);
  ctx.lineTo(p.x, p.bottom);
  ctx.stroke();
  ctx.restore();

  drawLabelBubble(e, p.left, p.width, p.top, p.height, highlight);
}

function drawLabelBelow(e, highlight) {
  const y = e.yPos;
  const p = getLabelPosition(e, y);
  const spec = zoomSpec(e.significance);
  let zoomFade = spec.fade;

  // check for mouse over only if not fading out
  //if (zoomFade > FADE_HIGHLIGHT_THRESHOLD) {
    if (highlight) zoomFade = LABEL_BRIGHTNESS; // label text always bright when highlighted

    ctx.save();
    ctx.font = LABEL_FONT
    ctx.fillStyle = `rgba(255, 255, 255, ${zoomFade})`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(e.label, p.left, p.top + EDGE_GAP);  // separate label a bit from the line while keeping hover area continiguous
    ctx.restore();
  //}
}

function positionTimelineLabel(tl) {
  const top = tl.yPos - LABEL_LINE_HEIGHT - EDGE_GAP;
  const bottom = tl.yPos;
  const left = 0;
  const right = Math.round(tl.labelWidth + EDGE_GAP*2);
  const height = LABEL_LINE_HEIGHT + EDGE_GAP;

  return {left:left, right:right, top:top, bottom:bottom,
    btnLeft:right, btnRight:right+height, btnTop:top, btnBottom:bottom};
};

function registerTimelineLabel(tl) {
  const p = positionTimelineLabel(tl);
  
  // register label as a screen element and check mouseover
  screenElements.push({left:p.left, right:p.right, top:p.top, bottom:p.bottom, type:'timeline', timeline:tl});
  if (mouseX >= p.left && mouseX <= p.right && mouseY >= p.top && mouseY <= p.bottom) {
    highlightIdx = screenElements.length - 1;
    highlightedTimeline = tl;
  }
  screenElements.push({left:p.btnLeft, right:p.btnRight, top:p.btnTop, bottom:p.btnBottom, type:'button', timeline:tl});
  if (mouseX >= p.btnLeft && mouseX <= p.btnRight && mouseY >= p.btnTop && mouseY <= p.btnBottom) {
    highlightIdx = screenElements.length - 1;
    highlightedTimeline = tl;
  }
}

function drawTimelineLabel(tl, highlight) {
  const p = positionTimelineLabel(tl);
  const width = p.right - p.left;
  const height = p.bottom - p.top;
  const brightness = (highlight) ? LABEL_BRIGHTNESS : 0.6;
  const btnSize = p.btnBottom - p.btnTop;
  const btnRadius = btnSize / 4;

  ctx.save();
  ctx.fillStyle = window.getComputedStyle(document.body).backgroundColor;
  let grad = ctx.createLinearGradient(0, p.top, 0, p.bottom);
  grad.addColorStop(0.0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.5, 'rgba(0,0,0,1)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(p.left, p.top, width, height);

  ctx.font = TITLE_FONT;
  ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(tl.title, EDGE_GAP, tl.yPos - LABEL_LINE_HEIGHT);

  // close button
  if (highlight) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.roundRect(p.btnLeft, p.btnTop, btnSize, btnSize, btnRadius);
    ctx.fill();

    // "X" symbol centered inside
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.btnLeft + 4, p.btnTop + 4);
    ctx.lineTo(p.btnLeft + btnSize - 4, p.btnTop + btnSize - 4);
    ctx.moveTo(p.btnLeft + btnSize - 4, p.btnTop + 4);
    ctx.lineTo(p.btnLeft + 4, p.btnTop + btnSize - 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDateHandles() {
  const y = editingTimeline.yPos;
  const color = 'rgba(200,200,200,1)';
  const lineWidth = 2;
  const majorHeight = 80;
  const majorRadius = 14;
  const minorHeight = 50;
  const minorRadius = 8;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  if (selectedEvent.significance <= 3) {
    // singer date handle
    let x = timeToPx(selectedEvent.dateTime);
    let left = x - majorRadius
    let right = x + majorRadius
    let top = y + majorHeight - majorRadius
    let bottom = y + majorHeight + majorRadius;

    ctx.beginPath();  // stem down
    ctx.moveTo(x, y);
    ctx.lineTo(x, top);
    ctx.stroke();
    ctx.beginPath();  // circle at bottom
    ctx.arc(x, y + majorHeight, majorRadius, 0, Math.PI * 2);
    ctx.stroke();

    screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'handle', subType:'date', event:selectedEvent});
    if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) highlightIdx = screenElements.length - 1;

  } else {
    // dateFrom (half-circle on the left)
    let x = timeToPx(selectedEvent.tFrom);
    let left = x - majorRadius
    let right = x;
    let top = y + majorHeight - majorRadius
    let bottom = y + majorHeight + majorRadius;

    ctx.beginPath();  // stem down
    ctx.moveTo(x, y);
    ctx.lineTo(x, top + majorRadius * 2);
    ctx.stroke();
    ctx.beginPath();  // half circle at bottom
    ctx.arc(x, y + majorHeight, majorRadius, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();

    screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'handle', subType:'dateFrom', event:selectedEvent});
    if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) highlightIdx = screenElements.length - 1;

    // dateTo (half-circle on the right)
    x = timeToPx(selectedEvent.tTo);
    left = x;
    right = x + majorRadius;

    ctx.beginPath();  // stem down
    ctx.moveTo(x, y);
    ctx.lineTo(x, top + majorRadius * 2);
    ctx.stroke();
    ctx.beginPath();  // half circle at bottom
    ctx.arc(x, y + majorHeight, majorRadius, Math.PI * 1.5, Math.PI * 0.5);
    ctx.stroke();

    screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'handle', subType:'dateTo', event:selectedEvent});
    if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) highlightIdx = screenElements.length - 1;

    // fadeLeft
    x = timeToPx(selectedEvent.fLeft);
    left = x;
    right = x + minorRadius;
    top = y + minorHeight - minorRadius
    bottom = y + minorHeight + minorRadius;

    ctx.beginPath();  // stem down
    ctx.moveTo(x, y);
    ctx.lineTo(x, top + minorRadius * 2);
    ctx.stroke();
    ctx.beginPath();  // half circle at bottom
    ctx.arc(x, y + minorHeight, minorRadius, Math.PI * 1.5, Math.PI * 0.5);
    ctx.stroke();

    screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'handle', subType:'fadeLeft', event:selectedEvent});
    if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) highlightIdx = screenElements.length - 1;

    // fadeRight
    x = timeToPx(selectedEvent.fRight);
    left = x - minorRadius;
    right = x;

    ctx.beginPath();  // stem down
    ctx.moveTo(x, y);
    ctx.lineTo(x, top + minorRadius * 2);
    ctx.stroke();
    ctx.beginPath();  // half circle at bottom
    ctx.arc(x, y + minorHeight, minorRadius, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();

    screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'handle', subType:'fadeRight', event:selectedEvent});
    if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) highlightIdx = screenElements.length - 1;
  }
  
  ctx.restore();
}

function drawEvents() {
  highlightedEvent = null;
  highlightedTimeline = null;

  // populate screenElements
  for (const tl of timelines) {
    registerEvents(tl);
    registerTimelineLabel(tl);
  }

  // iterate through screenElements (events and their labels)
  screenElements.filter(se => se.type==='line' || se.type==='bubble' || se.type==='label').forEach(se => {
    const e = se.event;
    const highlight = (e===highlightedEvent || e===selectedEvent);
    if (se.type === 'line') drawEventLine(e, highlight || e.timeline===highlightedTimeline);
    if (se.type === 'bubble') drawLabelAbove(e, highlight);
    if (se.type === 'label') drawLabelBelow(e, highlight);
  });

  for (const tl of timelines) drawTimelineLabel(tl, tl===highlightedTimeline);

  // draw date handles if applicable
  if (editingTimeline && selectedEvent && document.getElementById('panel-edit-event').classList.contains('is-active'))
    drawDateHandles();

  // if highlighted or selected event has been identified but no label is displayed, draw it hovering
  const f = (e) => { if (e) {if (e.yOffset===0) drawLabelHover(e, timeToPx(e.dateTime), e.yPos)}};
  f(highlightedEvent);
  if (selectedEvent != highlightedEvent) f(selectedEvent);

  // change pointer
  setPointerCursor();
}

function positionLabelsForTL(tl){
  const events = tl.events;
  events.forEach(e => { e.x = timeToPx(e.dateTime); e.yPos = tl.yPos; e.yOffset = null; });  // reset assignments

  // find a place for each event, if possible - most important first
  for (let sig = MAX_SIGNIFICANCE; sig > 0; sig--) {
    let spec = zoomSpec(sig);
    
    // process each event of this significance
    events.filter(e => e.significance === sig).forEach(e => {
      if (spec.fade === 0) return; // too small to display
      if (!spec.displayLabel) { e.yOffset = 0; return; }   // don't position if...

      // can we place label below? (will display wide enough)
      const lineWidth = (timeToPx(e.tTo) - timeToPx(e.tFrom));
      if (e.labelWidth + EDGE_GAP*2 < lineWidth) { e.yOffset = -1; return; }

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
        for (const event of events) {
          if (event === e) continue; // self
          if (!event.yOffset || event.yOffset === -1) continue; // not placed yet
          
          const cX = event.x;
          const cLeft = event.x - event.parsedWidth/2 - EDGE_GAP;
          const cRight = event.x + event.parsedWidth/2 + EDGE_GAP;
          const cTop = 0 - event.yOffset;
          const cBot = cTop + Math.ceil(event.parsedLabel.length * LABEL_LINE_HEIGHT) + EDGE_GAP;

          // if c's bubble is over e's stem (x) then can't display
          if (cLeft < x && cRight > x) { e.yOffset = 0; break scanUpwardLoop; }

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

function positionLabels() {
  // iterate through timelines
  timelines.forEach(positionLabelsForTL);
}

function positionTimelines(zoom) {
  const wh = window.innerHeight;
  const c = timelines.length;
  const h = (c===1) ? wh/2 : ((wh-TICK_BOTTOM)/(c+1)) + ((wh-TICK_BOTTOM)/((c+1)*c*2));
  let p = h;

  // iterate through timelines in reverse
  for (let i=c-1; i>=0; i--) {
    const tl = timelines[i];
    if (zoom) {
      tl.origCeiling = tl.ceiling;
      tl.newCeiling = h;
      tl.origYPos = tl.yPos;
      tl.newYPos = Math.floor(p);
    } else {
      tl.ceiling = h;  // to do: use ceiling to limit above labels
      tl.yPos = Math.floor(p);
    }
    p += h;
  }
}