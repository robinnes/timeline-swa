const MAX_LABEL_WIDTH = 150;
const LABEL_LINE_HEIGHT = 18;
const EDGE_GAP = 6;
const PADDING = 20;
const HIGHLIGHT_SHADOW = 'rgba(0,102,255,40)';
const HIGHLIGHT_GLOW = 30;
const LABEL_BRIGHTNESS = 0.85;  // default for label text
const DOT_HOVER_PAD = 6;  // maximum padding around dots for hover detection

const midY = () => Math.floor(window.innerHeight / 2);

const colorRGB = new Map([
  ["black",  { r:0,   g:0,   b:0   }],
  ["white",  { r:255, g:255, b:255 }],
  ["blue",   { r:0,   g:100, b:255 }],
  ["red",    { r:255, g:0,   b:100 }],
  ["green",  { r:0,   g:255, b:100 }],
  ["yellow", { r:255, g:255, b:100 }],
  ["purple", { r:100, g:0,   b:255 }]
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

function drawEvent(e, y, spec) {

  const height = spec.size;
  const fade = spec.fade;
  const x = timeToPx(e.dateTime);
  const left = Math.round(timeToPx(e.tFrom));
  const right = Math.round(timeToPx(e.tTo));
  const width = right - left;
  const xFadeLeft = Math.round(timeToPx(e.fLeft));
  const xFadeRight = Math.round(timeToPx(e.fRight));
  const top = Math.round(y - height / 2);
  const bottom = Math.round(y + height / 2);

  const c = colorRGB.get(e.color ?? "white");
  const color = colorTrunc(c);
  const colorLeft = (e.colorLeft === undefined) ? color : colorTrunc(colorMix(c, colorRGB.get(e.colorLeft)));
  const colorRight = (e.colorRight === undefined) ? color : colorTrunc(colorMix(c, colorRGB.get(e.colorRight)));

  if (width >= 6 || spec.fadeNear) {

    const curveLeft = (Math.abs(xFadeLeft - left) > 1) && (colorLeft === color);
    const curveRight = (Math.abs(right - xFadeRight) > 1) && (colorRight === color);
      
    if (spec.fadeNear) {
      const alphaLeft = (colorLeft === color) ? 0 : fade;
      const alphaRight = (colorRight === color) ? 0 : fade;
      const gradLeft = (right > left) ? (xFadeLeft - left) / width : 0;
      const gradRight = (right > left) ? 1 - ((right - xFadeRight) / width) : 1;

      const grad = ctx.createLinearGradient(left, y, right, y);
      if (gradLeft > 0) grad.addColorStop(0, `rgba(${colorLeft},${alphaLeft})`);
        grad.addColorStop(gradLeft, `rgba(${color},${fade})`);
        grad.addColorStop(gradRight, `rgba(${color},${fade})`);
        if (gradRight < 1) grad.addColorStop(1, `rgba(${colorRight},${alphaRight})`);
        ctx.fillStyle = grad;
    } else ctx.fillStyle = `rgba(${color}, ${fade})`;

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
  if ((xFadeRight - xFadeLeft) < height && !spec.fadeNear) {
    ctx.fillStyle = `rgba(${color}, ${fade})`;
    ctx.beginPath();
    ctx.arc(x, y, (height/2), 0, Math.PI*2);
    ctx.fill();
  }

  // enable hover for dots
  if (!spec.fadeNear) { 
    // accommodate very small dots by expanding hit area
    const eLeft = Math.min(left, Math.round(x - DOT_HOVER_PAD));
    const eRight = Math.max(right, Math.round(x + DOT_HOVER_PAD));
    const eTop = Math.min(top, Math.round(y - DOT_HOVER_PAD));
    const eBottom = Math.max(bottom, Math.round(y + DOT_HOVER_PAD));
    
    // register as a screen element that can be interacted with
    screenElements.push({left:eLeft, right:eRight, top:eTop, bottom:eBottom, type:'event', event:e});
    
    // check for mouse over
    if (mouseX >= eLeft && mouseX <= eRight && mouseY >= eTop && mouseY <= eBottom) {
      highlightIdx = screenElements.length - 1;
      highlightedEvent = e;
    }
  }
}

function drawLabelHover(e, x, y) {
  // display label right where the event is drawn
  const lWidth = Math.ceil(e.parsedWidth) + EDGE_GAP*2;
  const lHeight = Math.ceil(e.parsedLabel.length * LABEL_LINE_HEIGHT) + EDGE_GAP;
  const lLeft = Math.round(x - lWidth/2);
  const lTop = Math.round(y - lHeight/2);

  drawLabelBubble(e, lLeft, lWidth, lTop, lHeight, true);
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
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  ctx.fillStyle = `rgba(255,255,255,${LABEL_BRIGHTNESS})`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (let i=0; i<e.parsedLabel.length; i++) 
    ctx.fillText(e.parsedLabel[i], left + EDGE_GAP, top + EDGE_GAP + (LABEL_LINE_HEIGHT * i));
  
  ctx.restore();
}

function drawLabelAbove(e, spec, x, y) {
  
  // situate the label
  const width = Math.ceil(e.parsedWidth) + EDGE_GAP*2;
  const height = Math.ceil(e.parsedLabel.length * LABEL_LINE_HEIGHT) + EDGE_GAP;
  const left = Math.round(x - width/2);
  const right = left + width;
  const top = Math.round(y - 24 - e.yOffset);
  const bottom = top + height;
  const eventTop = y - (spec.size/2);

  ctx.save();
  
  // stem: from top of the event line/dot to bottom of label box
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, eventTop);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.restore();
  
  // register as a screen element that can be interacted with
  screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'event', event:e});

  // check here if mouse is over this element; it may have moved under the mouse
  if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
    highlightIdx = screenElements.length - 1;
    highlightedEvent = e;
  }
  drawLabelBubble(e, left, width, top, height, (highlightedEvent === e));
}

function drawLabelBelow(e, spec, x, y, xFrom, xTo) {
  const thickness = spec.size;
  const w = window.innerWidth;
  const top = Math.round(y + thickness/2 + EDGE_GAP);
  let zoomFade = spec.fade;

  let left = Math.round(x - (e.labelWidth/2));
  if (left < (xFrom + EDGE_GAP)) left = xFrom + EDGE_GAP;
  if ((left + e.labelWidth) > (xTo - EDGE_GAP)) left = xTo - e.labelWidth - EDGE_GAP;
  
  // keep on the screen as much as possible
  if (left < EDGE_GAP) {
    left = EDGE_GAP;
    if ((left + e.labelWidth + EDGE_GAP) > xTo) left = xTo - EDGE_GAP - e.labelWidth;
  }
  if ((left + e.labelWidth + EDGE_GAP) > w) {
    left = w - EDGE_GAP - e.labelWidth;
    if (left < xFrom + EDGE_GAP) left = xFrom + EDGE_GAP;
  }
  
  const right = left + e.labelWidth;
  const bottom = top + LABEL_LINE_HEIGHT;

  // register as a screen element that can be interacted with
  screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'event', event:e});

  // check here if mouse is over this element; it may have moved under the mouse
  if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
    highlightIdx = screenElements.length - 1;
    highlightedEvent = e;
  }
  
  ctx.save();
  if (highlightedEvent === e) {
    ctx.shadowColor = HIGHLIGHT_SHADOW;  ctx.shadowBlur = HIGHLIGHT_GLOW;
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.roundRect(left - EDGE_GAP, top - EDGE_GAP, e.labelWidth + EDGE_GAP*2, LABEL_LINE_HEIGHT + EDGE_GAP, 8);
    ctx.fill();
    zoomFade = LABEL_BRIGHTNESS; // label text always bright when highlighted
  }
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'; 
  ctx.fillStyle = `rgba(255, 255, 255, ${zoomFade})`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(e.label, left, top);

  ctx.restore();
}

function drawEvents(){
  const rangeLeft = 0 - MAX_LABEL_WIDTH / 2;
  const rangeRight = window.innerWidth + MAX_LABEL_WIDTH / 2;
  const y = midY();
  
  highlightedEvent = null;

  // draw each event that should be displayed
  events.filter(e => e.yOffset !== null).forEach(event => {
    const x = timeToPx(event.dateTime);
    const xFrom = timeToPx(event.tFrom)
    const xTo = timeToPx(event.tTo);

    if ((xTo < rangeLeft) || (xFrom > rangeRight)) return;  // off-screen
   
    const spec = zoomSpec(event.significance);
    if (spec.fade === 0) return; // too small to display

    // draw dot or line
    drawEvent(event, y, spec);

    // draw bubble label above
    if (event.yOffset > 0) drawLabelAbove(event, spec, x, y)
    else if (event.yOffset < 0) drawLabelBelow(event, spec, x, y, xFrom, xTo);
  });

  // if highlightedEvent has been identified but no label is displayed, draw it hovering
  if (highlightedEvent) {
    if (highlightedEvent.yOffset === 0) drawLabelHover(highlightedEvent, timeToPx(highlightedEvent.dateTime), y);
  }
}

function updatePositions(){
  events.forEach(e => { e.x = timeToPx(e.dateTime); e.yOffset = null; });  // reset assignments

  // find a place for each event, if possible - most important first
  for (let sig = 6; sig > 0; sig--) {
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
        for (let c = 0; c < events.length; c++){
          if (events[c] === e) continue; // self
          if (!events[c].yOffset || events[c].yOffset === -1) continue; // not placed yet
          
          const cX = events[c].x;
          const cLeft = events[c].x - events[c].parsedWidth/2 - EDGE_GAP;
          const cRight = events[c].x + events[c].parsedWidth/2 + EDGE_GAP;
          const cTop = 0 - events[c].yOffset;
          const cBot = cTop + Math.ceil(events[c].parsedLabel.length * LABEL_LINE_HEIGHT) + EDGE_GAP;

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
