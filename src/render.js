import * as Util from './util.js';
import {DRAW, TICK} from './constants.js';
import {appState, timelineCache, screenElements, setPointerCursor, ctx, draw, getCanvasViewport} from './canvas.js';

const thumbCache = new Map(); // key: dataUrl, value: HTMLImageElement

/***************************** Utilities *****************************/

export function zoomSpec(itemType, prominence){
  const sizeAdj = 3;
  const persistence = 1.3;
  const fadeIn = 0.4;
  const fadeOut = 2;

  const eventMaster = [
    { threshold:5, growth:1.5, fadeNear:false, maxBright:1 },
    { threshold:6.5, growth:1.5, fadeNear:false, maxBright:1 },
    { threshold:8, growth:1.5, fadeNear:false, maxBright:1 },
    { threshold:9.5, growth:1.5, fadeNear:false, maxBright:1 },
    { threshold:11, growth:1.5, fadeNear:false, maxBright:1 }
  ];

  const periodMaster = [
    { threshold:6, growth:7, fadeNear:true, maxBright:0.6 },
    { threshold:7, growth:7, fadeNear:true, maxBright:0.6 },
    { threshold:8.5, growth:9, fadeNear:true, maxBright:0.6 },
    { threshold:10, growth:11, fadeNear:true, maxBright:0.6 },
    { threshold:11, growth:12, fadeNear:true, maxBright:0.6 }
  ];

  const factor = Math.log10(appState.msPerPx);
  const z = itemType==='event' ? eventMaster[prominence-1] : periodMaster[prominence-1];
  return {
    zoomMaster: z,
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

export function isMouseOver(left, right, top, bottom) {
  return (appState.mouseX >= left && appState.mouseX <= right && appState.mouseY >= top && appState.mouseY <= bottom);
}


/***************************** Colors *****************************/

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


/**************************************** Thumbnails *****************************************/

function roundedRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLabelThumb(i, left, top) {
  // The encoded thumbnail on i can sometimes not finish decoding in time, and img.src = thumbnail won't render.
  // Cached encoded thumbnails in a map, and when necessary wait for them to load then invoke draw() again.
  const key = i.thumbnail;
  if (!key) return;

  let img = thumbCache.get(key);
  if (!img) {
    img = new Image();
    img.onload = () => draw(false);   // redraw once when ready
    img.src = key;
    thumbCache.set(key, img);
    return; // not ready this frame
  }

  if (!img.complete) return; // still decoding

  // draw thumbnail in rounded rectangle (simulate 'border-radius:xpx' css style)
  ctx.save();
  roundedRectPath(left + 4, top + 3, DRAW.THUMB_LABEL_SIZE, DRAW.THUMB_LABEL_SIZE, 4);
  ctx.clip();
  ctx.drawImage(img, left + 4, top + 3, DRAW.THUMB_LABEL_SIZE, DRAW.THUMB_LABEL_SIZE);
  ctx.restore();
}


/***************************** Edit button and date handles *****************************/

function drawAddItemButton(vw) {
  const vwIdx = appState.views.indexOf(vw);
  ctx.save();
  ctx.font = DRAW.TITLE_FONT;
  const btnText = "Add item";
  const textWidth = ctx.measureText(btnText).width;
  const distance = 50;
  const width = 120;
  const height = 30;
  const vp = getCanvasViewport();
  const left = vp.left + (vp.width / 2) - (width / 2);
  const right = left + width;
  const top = vw.yPos + distance;
  const bottom = top + height;
  let highlight = false;

  screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'button', subType:'add-item', view:vwIdx});
  if (isMouseOver(left, right, top, bottom)) {
    appState.highlighted.idx = screenElements.length - 1;
    highlight = true;
  }

  // label box
  ctx.fillStyle = 'rgb(106,166,255)';
  ctx.lineWidth = 0;
  ctx.beginPath();
  ctx.roundRect(left, top, width, height, 6);
  if (highlight) { ctx.shadowColor = DRAW.HIGHLIGHT_SHADOW;  ctx.shadowBlur = DRAW.HIGHLIGHT_GLOW; }
  ctx.fill();
  ctx.stroke();

  // label text
  ctx.fillStyle = 'rgb(15, 18, 32)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(btnText, (left + (width - textWidth) / 2), top + 8);
  ctx.restore();
}

function drawDateHandles(itemPos) {
  const y = itemPos.yPos;
  const item = itemPos.item;
  const color = 'rgba(200,200,200,1)';
  const lineWidth = 2;
  const majorHeight = 80;
  const majorRadius = 14;
  const minorHeight = 50;
  const minorRadius = 8;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  if (item.dateSpecification === 'point') {
    // single date handle
    let x = Util.timeToPx(item._dateTime);
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

    screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'handle', subType:'date', item:item});
    if (isMouseOver(left, right, top, bottom)) appState.highlighted.idx = screenElements.length - 1;

  } else {
    // dateFrom (half-circle on the left)
    const tFrom = item.itemType==='event' ? item._dateFrom : item._tFrom;
    let x = Util.timeToPx(tFrom);
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

    screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'handle', subType:'dateFrom', item:item});
    if (isMouseOver(left, right, top, bottom)) appState.highlighted.idx = screenElements.length - 1;

    // dateTo (half-circle on the right)
    const tTo = item.itemType==='event' ? item._dateTo : item._tTo;
    x = Util.timeToPx(tTo);
    left = x;
    right = x + majorRadius;

    ctx.beginPath();  // stem down
    ctx.moveTo(x, y);
    ctx.lineTo(x, top + majorRadius * 2);
    ctx.stroke();
    ctx.beginPath();  // half circle at bottom
    ctx.arc(x, y + majorHeight, majorRadius, Math.PI * 1.5, Math.PI * 0.5);
    ctx.stroke();

    screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'handle', subType:'dateTo', item:item});
    if (isMouseOver(left, right, top, bottom)) appState.highlighted.idx = screenElements.length - 1;

    if (item.itemType === 'period') {
      // fadeLeft
      x = Util.timeToPx(item._fLeft);
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

      screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'handle', subType:'fadeLeft', item:item});
      if (isMouseOver(left, right, top, bottom)) appState.highlighted.idx = screenElements.length - 1;

      // fadeRight
      x = Util.timeToPx(item._fRight);
      left = x - minorRadius;
      right = x;

      ctx.beginPath();  // stem down
      ctx.moveTo(x, y);
      ctx.lineTo(x, top + minorRadius * 2);
      ctx.stroke();
      ctx.beginPath();  // half circle at bottom
      ctx.arc(x, y + minorHeight, minorRadius, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();

      screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'handle', subType:'fadeRight', item:item});
      if (isMouseOver(left, right, top, bottom)) appState.highlighted.idx = screenElements.length - 1;
    }
  }
  
  ctx.restore();
}


/***************************** Timeline labels *****************************/

function labelForVw(vw) {
  // the timeline's title or if view is filtered by a tag, the tag's label
  const tl = timelineCache.get(vw.tlKey);
  if (!vw.tagFilter) {
    return({label:tl.title, labelWidth:tl._labelWidth});
  }
  const tags = tl.tags.filter(t => t.id === vw.tagFilter);
  return({label:tags[0]?.label, labelWidth:tags[0]?._labelWidth});
}

function positionTimelineLabel(vw) {
  const labelWidth = labelForVw(vw).labelWidth;
  const top = vw.yPos - DRAW.LABEL_LINE_HEIGHT - DRAW.EDGE_GAP;
  const bottom = vw.yPos;
  const left = getCanvasViewport().left;
  const right = Math.round(left + labelWidth + DRAW.EDGE_GAP*2);
  const height = DRAW.LABEL_LINE_HEIGHT + DRAW.EDGE_GAP;

  return {left:left, right:right, top:top, bottom:bottom,
    btnLeft:right, btnRight:right+height, btnTop:top, btnBottom:bottom};
};

function registerTimelineLabel(vw) {
  const vwIdx = appState.views.indexOf(vw);
  const p = positionTimelineLabel(vw);

  // register label as a screen element and check mouseover
  screenElements.push({left:p.left, right:p.right, top:p.top, bottom:p.bottom, type:'view', view:vwIdx});
  if (isMouseOver(p.left, p.right, p.top, p.bottom)) {
    appState.highlighted.idx = screenElements.length - 1;
    appState.highlighted.view = vw;
  }
  screenElements.push({left:p.btnLeft, right:p.btnRight, top:p.btnTop, bottom:p.btnBottom, type:'button', subType:'close-timeline', view:vwIdx});
  if (isMouseOver(p.btnLeft, p.btnRight, p.btnTop, p.btnBottom)) {
    appState.highlighted.idx = screenElements.length - 1;
    appState.highlighted.view = vw;
  }
}

function drawTimelineLabel(vw, highlight) {
  const label = labelForVw(vw).label;
  const p = positionTimelineLabel(vw);
  const width = p.right - p.left;
  const height = p.bottom - p.top;
  const brightness = (highlight) ? DRAW.LABEL_BRIGHTNESS : 0.6;
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

  ctx.font = DRAW.TITLE_FONT;
  ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, p.left + DRAW.EDGE_GAP, vw.yPos - DRAW.LABEL_LINE_HEIGHT);

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


/***************************** Item bubbles and labels *****************************/

function drawLabelText(label, x, y, fade) {
  ctx.font = DRAW.LABEL_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let hoverLink = null;

  // iterate through text blocks, establish screenElements for simulated hyperlinks
  label.forEach(b => {
    if (b.link) {
      const left = x + b.left;
      const right = left + b.width;
      const top = y + (DRAW.LABEL_LINE_HEIGHT * b.row);
      const bottom = top + DRAW.LABEL_LINE_HEIGHT - DRAW.EDGE_GAP - 0.5;

      screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'link', subType:b.link});
      if (isMouseOver(left, right, top, bottom)) {
        appState.highlighted.linkIdx = screenElements.length - 1;
        hoverLink = b.link;
      }
    }
  });

  // iterate again and render each text block
  label.forEach(b => {
    const left = x + b.left;
    const top = y + (DRAW.LABEL_LINE_HEIGHT * b.row);
    
    ctx.fillStyle = (!b.link) ? `rgba(255,255,255, ${fade})` : 'rgba(106,166,255,1)';
    ctx.fillText(b.text, left, top);

    // underline any hyperlink blocks with matching link target
    if (hoverLink != null && b.link === hoverLink) {
      const right = left + b.width;
      const bottom = top + DRAW.LABEL_LINE_HEIGHT - DRAW.EDGE_GAP - 0.5;
      ctx.strokeStyle = 'rgba(106,166,255,1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      ctx.lineTo(right, bottom);
      ctx.stroke();
    }
  });
}

function drawLabelBubble(i, left, width, top, height, highlight) {
  // label box
  ctx.save();
  ctx.fillStyle = 'rgb(40,40,40)';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(left, top, width, height, 8);
  if (highlight) { ctx.shadowColor = DRAW.HIGHLIGHT_SHADOW; ctx.shadowBlur = DRAW.HIGHLIGHT_GLOW; }
  ctx.fill();
  ctx.stroke();

  drawLabelText(i._parsedLabel, left + DRAW.EDGE_GAP, top + DRAW.EDGE_GAP, DRAW.LABEL_BRIGHTNESS);
  if (i.thumbnail) drawLabelThumb(i, left, top);
  ctx.restore();
}

function drawLabelHover(i, x, y) {
  // display label right where the item is drawn
  const width = Math.ceil(i._parsedWidth) + DRAW.EDGE_GAP*2;
  const height = Math.ceil(i._parsedRows * DRAW.LABEL_LINE_HEIGHT) + DRAW.EDGE_GAP;
  const left = Math.round(x - width/2);
  const top = Math.round(y - height/2);

  drawLabelBubble(i, left, width, top, height, true);
}

function getLabelPosition(ip, y) {
  // return coordinates of label for itemPos ip
  const i = ip.item;
  const x = Util.timeToPx(i._dateTime);
  const vp = getCanvasViewport();

  if (ip.yOffset > 0) {
    // bubble above y
    const width = Math.ceil(i._parsedWidth) + DRAW.EDGE_GAP*2;
    const height = Math.ceil(i._parsedRows * DRAW.LABEL_LINE_HEIGHT) + DRAW.EDGE_GAP;
    const left = Math.round(x - width/2);
    const right = left + width;
    const top = Math.round(y - DRAW.LABEL_STEM_HEIGHT - ip.yOffset);
    const bottom = top + height;
    return {type:'bubble', x:x, y:y, left:left, right:right, top:top, bottom:bottom, width:width, height:height};

  } else if (ip.yOffset === -1) {
    // label below y
    const spec = zoomSpec(i.itemType, i.prominence);
    const thickness = spec.size;
    let xFrom = Math.round(Util.timeToPx(i._tFrom));
    let xTo = Math.round(Util.timeToPx(i._tTo));
    const w = window.innerWidth;
    const top = Math.round(y + thickness/2);
    const width = i._labelWidth;
    const height = DRAW.LABEL_LINE_HEIGHT;

    let left = Math.round(x - (width/2));
    if (left < (xFrom + DRAW.EDGE_GAP)) left = xFrom + DRAW.EDGE_GAP;
    if ((left + width) > (xTo - DRAW.EDGE_GAP)) left = xTo - width - DRAW.EDGE_GAP;
  
    // keep on the screen as much as possible
    if (left < vp.left + DRAW.EDGE_GAP) {
      left = vp.left + DRAW.EDGE_GAP;
      if ((left + width + DRAW.EDGE_GAP) > xTo) left = xTo - DRAW.EDGE_GAP - width;
    }
    if ((left + width + DRAW.EDGE_GAP) > w) {
      left = w - DRAW.EDGE_GAP - width;
      if (left < xFrom + DRAW.EDGE_GAP) left = xFrom + DRAW.EDGE_GAP;
    }
  
    const right = left + width;
    const bottom = top + height;

    return {type:'label', x:x, y:y, left:left, right:right, top:top, bottom:bottom, width:width, height:height};
  }
  return null;
}

function drawLabelAbove(ip, highlight) {
  const i = ip.item;
  const y = ip.yPos;
  const p = getLabelPosition(ip, y);
  const spec = zoomSpec(i.itemType, i.prominence);
  const lineTop = y - (spec.size/2);

  // stem: from top of the item line/dot to bottom of label box
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x, lineTop);
  ctx.lineTo(p.x, p.bottom);
  ctx.stroke();
  ctx.restore();

  drawLabelBubble(i, p.left, p.width, p.top, p.height, highlight);
}

function drawLabelBelow(ip, highlight) {
  const i = ip.item;
  const y = ip.yPos;
  const p = getLabelPosition(ip, y);
  const spec = zoomSpec(i.itemType, i.prominence);
  let zoomFade = spec.fade;

  if (highlight) zoomFade = DRAW.LABEL_BRIGHTNESS; // label text always bright when highlighted

  ctx.save();
  drawLabelText(i._labelSingle, p.left + DRAW.EDGE_GAP, p.top + DRAW.EDGE_GAP, zoomFade);
  ctx.restore();
}


/***************************** Item lines *****************************/

function drawItemLine(ip, highlight) {

  const i = ip.item;
  const spec = zoomSpec(i.itemType, i.prominence);
  const height = spec.size;
  const fade = spec.fade;
  const x = Util.timeToPx(i._dateTime);
  const y = ip.yPos;
  const left = Math.round(Util.timeToPx(i._tFrom));
  const right = Math.round(Util.timeToPx(i._tTo));
  const width = right - left;
  const xFadeLeft = Math.round(Util.timeToPx(i._fLeft));
  const xFadeRight = Math.round(Util.timeToPx(i._fRight));
  const top = Math.round(y - height / 2);
  const bottom = Math.round(y + height / 2);

  const c = i.color ?? "white";
  const cl = i.colorLeft ?? "black";
  const cr = i.colorRight ?? "black";
  const color = colorTrunc(colorRGB.get(c));
  
  // if edge color is black, use (middle) color and apply fade effect below
  const colorLeft = (cl === "black") ? color : colorTrunc(colorMix(colorRGB.get(cl), colorRGB.get(c)));
  const colorRight = (cr === "black") ? color : colorTrunc(colorMix(colorRGB.get(cr), colorRGB.get(c)));

  ctx.save();
  if (width >= 6 || i.itemType === 'period') {   // spec.style === 'line') {
    const curveLeft = (Math.abs(xFadeLeft - left) > 1) && (cl === "black");
    const curveRight = (Math.abs(right - xFadeRight) > 1) && (cr === "black");
     
    if (i.itemType === 'period') {   // (spec.style === 'line') {
      const alphaLeft = (curveLeft) ? 0 : fade; //(colorLeft === color) ? 0 : fade;
      const alphaRight = (curveRight) ? 0 : fade; //(colorRight === color) ? 0 : fade;
      let gradLeft = (right > left) ? (xFadeLeft - left) / width : 0;
      let gradRight = (right > left) ? 1 - ((right - xFadeRight) / width) : 1;

      // check validity of gradiant parameters
      if (!gradLeft || gradLeft < 0) gradLeft = 0;
      if (!gradRight || gradRight > 1) gradRight = 1;
      if (gradLeft > gradRight) gradLeft = gradRight;

      const grad = ctx.createLinearGradient(left, y, right, y);
      if (gradLeft > 0) grad.addColorStop(0, `rgba(${colorLeft},${alphaLeft})`);
        grad.addColorStop(gradLeft, `rgba(${color},${fade})`);
        grad.addColorStop(gradRight, `rgba(${color},${fade})`);
        if (gradRight < 1) grad.addColorStop(1, `rgba(${colorRight},${alphaRight})`);
        ctx.fillStyle = grad;
    } else ctx.fillStyle = `rgba(${color}, ${fade})`;

    if (highlight) { ctx.shadowColor = `rgba(${color},40)`;  ctx.shadowBlur = DRAW.HIGHLIGHT_GLOW; }

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


/***************************** Master functions *****************************/

function registerItems(vw) {

  // add each visible line/dot/label to the screenElements array and identify which the mouse is over (if any)
  const vp = getCanvasViewport();
  const rangeLeft = vp.left - DRAW.MAX_LABEL_WIDTH / 2;
  const rangeRight = vp.right + DRAW.MAX_LABEL_WIDTH / 2;
  const y = vw.yPos;

  // iterate through items, highest prominence first to check the lowest ones for mouseover last
  for (let prom = DRAW.MAX_SIGNIFICANCE; prom > 0; prom--) {
    
    // process each item (determined to be visible) of this prominence
    vw.itemPos.filter(ip => ip.item.prominence === prom && ip.yOffset !== null).forEach(ip => {
      const i = ip.item;
      const spec = zoomSpec(i.itemType, i.prominence);
      const height = spec.size;
      const x = Util.timeToPx(i._dateTime);
      let left = Math.round(Util.timeToPx(i._tFrom));
      let right = Math.round(Util.timeToPx(i._tTo));
      let top = Math.round(y - height / 2);
      let bottom = Math.round(y + height / 2);

      if ((right < rangeLeft) || (left > rangeRight)) return;  // off-screen (horizontally)
      
      // accommodate very small dots by expanding hit area
      if (!spec.fadeNear) { 
        left = Math.min(left, Math.round(x - DRAW.DOT_HOVER_PAD));
        right = Math.max(right, Math.round(x + DRAW.DOT_HOVER_PAD));
        top = Math.min(top, Math.round(y - DRAW.DOT_HOVER_PAD));
        bottom = Math.max(bottom, Math.round(y + DRAW.DOT_HOVER_PAD));
      }

      // register line/dot as a screen element that can be interacted with
      screenElements.push({left:left, right:right, top:top, bottom:bottom, type:'line', itemPos:ip, view:vw});
    
      // check for mouseover
      if (isMouseOver(left, right, top, bottom)) {
        appState.highlighted.idx = screenElements.length - 1;
        appState.highlighted.itemPos = ip;
      }

      // process the label, if applicable
      const p = getLabelPosition(ip, y);
      if (p) {
        // register label as a screen element that can be interacted with
        screenElements.push({left:p.left, right:p.right, top:p.top, bottom:p.bottom, type:p.type, itemPos:ip, view:vw});

        // check for mouseover
        if (isMouseOver(p.left, p.right, p.top, p.bottom)) {
          appState.highlighted.idx = screenElements.length - 1;
          appState.highlighted.itemPos = ip;
        }
      }

    });
  }
}

export function drawItems() {
  appState.highlighted.itemPos = null;
  appState.highlighted.view = null;

  // populate screenElements
  for (const vw of appState.views) {
    registerItems(vw);
    registerTimelineLabel(vw);
  }

  // iterate through screenElements (items and their labels)
  screenElements.filter(se => se.type==='line' || se.type==='bubble' || se.type==='label').forEach(se => {
    const ip = se.itemPos;
    const i = ip.item;
    const highlight = (ip===appState.highlighted.itemPos || (i===appState.selected.item));
    if (se.type === 'line') drawItemLine(ip, highlight || se.view===appState.highlighted.view);
    if (se.type === 'bubble') drawLabelAbove(ip, highlight);
    if (se.type === 'label') drawLabelBelow(ip, highlight);
  });

  // iterate views...
  for (const vw of appState.views) {
    const tl = timelineCache.get(vw.tlKey);
    const highlight = (vw===appState.highlighted.view);
    drawTimelineLabel(vw, highlight);  // view/timeline label
    if (tl._mode==="edit") {
      if (appState.selected.item?._timeline===tl) {
        const sel = vw.itemPos.find((ip) => ip.item===appState.selected.item);
        if (sel) drawDateHandles(sel);  // date handles for selected item in edit mode
      } else {
        drawAddItemButton(vw)  // Add item button if edit mode (and no selection)
      }
    } else {
      // if selected item displays to small for a label then show hover
      const sel = vw.itemPos.find((ip) => ip.item===appState.selected.item);
      if (sel?.yOffset===0)
        drawLabelHover(sel.item, Util.timeToPx(sel.item._dateTime), sel.yPos);
    }
  }

  // draw hover bubble over dot too small for above label
  const h = appState.highlighted.itemPos;
  if (h?.yOffset===0) drawLabelHover(h.item, Util.timeToPx(h.item._dateTime), h.yPos);

  // change pointer
  setPointerCursor();
}


/***************************** Positioning timelines and items *****************************/

export function filterItemsForView(vw){
  // reset vw.itemPos array according to vw.tagFilters
  var tFrom, tTo;
  const tl = timelineCache.get(vw.tlKey);
  const tagFilter = vw.tagFilter;
  const items = tl.items;

  vw.itemPos = [];
  items.forEach(i => {
    // check item's tag assignments (allow all if !tagFilter)
    if ((!tagFilter && i.include) || i.tagIds.includes(tagFilter)) {
      vw.itemPos.push({
        item:   i,
        yPos: vw.yPos,      // for convenience
        yOffset: null       // the item label's distance from the view's y value (vw.yPos)
      })
      if (!tFrom || i._tFrom < tFrom) tFrom = i._tFrom;
      if (!tTo || i._tTo > tTo) tTo = i._tTo;
    }
  });
  vw.tFrom = tFrom;
  vw.tTo = tTo;
}

function positionLabelsForVw(vw){
  // reset vw.itemPos array (this is where to filter the view by tags)
  filterItemsForView(vw);

  // find a place for each item, if possible - most important first
  for (let prom = DRAW.MAX_SIGNIFICANCE; prom > 0; prom--) {
    //let spec = zoomSpec(prom);
    
    // process each item of this prominence
    vw.itemPos.filter(ip => ip.item.prominence === prom).forEach(ip => {
      const i = ip.item;
      const spec = zoomSpec(i.itemType, i.prominence);
      if (spec.fade === 0) return; // too small to display
      if (!spec.displayLabel) { ip.yOffset = 0; return; }   // don't position if...

      // can we place label below? (will display wide enough)
      const lineWidth = (Util.timeToPx(i._tTo) - Util.timeToPx(i._tFrom));
      if (i._labelWidth + DRAW.EDGE_GAP*2 < lineWidth) { ip.yOffset = -1; return; }

      const x = Util.timeToPx(i._dateTime);
      const left = x - i._parsedWidth/2 - DRAW.EDGE_GAP
      const right = x + i._parsedWidth/2 + DRAW.EDGE_GAP;
      const height = Math.ceil(i._parsedRows * DRAW.LABEL_LINE_HEIGHT) + DRAW.EDGE_GAP;
      let bot = 0;
      let top = bot - height;
      let open = false;

      scanUpwardLoop:
      while (top > -200 && !open) {
        // Check each already place item (c) for overlap...
        for (const itemPos of vw.itemPos) {
          const item = itemPos.item;
          if (item === i) continue; // self
          if (!itemPos.yOffset || itemPos.yOffset === -1) continue; // not placed yet
          
          const cX = Util.timeToPx(itemPos.item._dateTime);
          const cLeft = cX - item._parsedWidth/2 - DRAW.EDGE_GAP;
          const cRight = cX + item._parsedWidth/2 + DRAW.EDGE_GAP;
          const cTop = 0 - itemPos.yOffset;
          const cBot = cTop + Math.ceil(item._parsedRows * DRAW.LABEL_LINE_HEIGHT) + DRAW.EDGE_GAP;

          // if c's bubble is over e's stem (x) then can't display
          if (cLeft < x && cRight > x) { ip.yOffset = 0; break scanUpwardLoop; }

          // if c's bubble overlaps e's then move up and try again
          if (cLeft < right && cRight > left && cTop < bot && cBot > top) { bot = cTop - DRAW.EDGE_GAP; top = bot - height; continue scanUpwardLoop;}

          // if e's bubble would overlap c's stem then move up and try again
          if (cBot < top && cX > left && cX < right) { bot = cTop - DRAW.EDGE_GAP; top = bot - height; continue scanUpwardLoop;}
          
        }
        open = true;
      }
      // place this item
      if (open) ip.yOffset = 0 - top;
    });
  }
}

export function positionLabels() {
  // iterate through views
  appState.views.forEach(positionLabelsForVw);
}

export function positionViews(zoom) {
  const wh = window.innerHeight;
  const c = appState.views.length;
  const height = wh - TICK.TICK_TOP - TICK.TICK_LABEL_HEIGHT;
  const h = (c===1) ? wh/2 : ((height)/(c+1)) + ((height)/((c+1)*c*2));
  let p = h;

  // iterate through timelines in reverse
  for (let i=c-1; i>=0; i--) {
    const vw = appState.views[i];
    if (zoom) {
      vw.origCeiling = vw.ceiling;
      vw.newCeiling = h;
      vw.origYPos = vw.yPos;
      vw.newYPos = Math.floor(p);
    } else {
      vw.ceiling = h;  // to do: use ceiling to limit above labels
      vw.yPos = Math.floor(p);
    }
    p += h;
  }
}
