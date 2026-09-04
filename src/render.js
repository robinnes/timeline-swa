import {DRAW, TICK, ZOOM} from './constants.js';
import * as Util from './util.js';
import {appState, timelineCache, screenElements, setPointerCursor, ctx, draw, getCanvasViewport} from './canvas.js';
import {filteredItemsForView} from './timeline.js';

const thumbCache = new Map(); // key: dataUrl, value: HTMLImageElement

/***************************** Utilities *****************************/

export function zoomSpec(i) {
  const factor = Math.log10(appState.msPerPx);
  const fadeNear = (i.itemType==='period');  // periods fade when zoomed in
  const maxBright = i.itemType==='event' ? 1 : 0.6;  // display events at max brightness
  const z = i.itemType==='event' ? ZOOM.EVENT_MASTER[i.prominence-1] : ZOOM.PERIOD_MASTER[i.prominence-1];
  const size = (Math.max((z.threshold + ZOOM.PERSISTENCE - factor), 0) * z.growth) + ZOOM.SIZE_ADJ;
  const fade = (factor > z.threshold) ?
      Math.max((z.threshold + ZOOM.FADE_IN - factor) * (maxBright / ZOOM.FADE_IN), 0) :
      ((factor < z.threshold - ZOOM.PERSISTENCE) && fadeNear) ? Math.max((factor - z.threshold + ZOOM.PERSISTENCE + ZOOM.FADE_OUT) * (maxBright / ZOOM.FADE_OUT), 0) : maxBright;

  return {
    size: size,
    fade: fade,
    displayLabel: (factor < z.threshold)
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


/**************************************** Static elements  *****************************************/

export function drawEnvAlert() {
  // if environment is other than production (or null) watermark the canvas
  const env = appState.configuration?.environment;
  if ((env ?? 'production') != 'production') {
    ctx.save();
    ctx.font = "bold 96px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.055)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.translate(canvas.width / (2 * window.devicePixelRatio),
                  canvas.height / (2 * window.devicePixelRatio));
    ctx.rotate(-Math.PI / 8);   // -22.5°

    ctx.fillText(env, 0, 0);
    ctx.restore();
  }
}

export function drawAboutFooter() {

  // © 2026 OpenTL.app · Beta · About
  let x = 8;
  let y = window.innerHeight - 18;
  const h = 20;

  ctx.save();
  ctx.font = "12px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const display = (label, link = false) => {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    const w = ctx.measureText(label).width;
    
    if (link) {
      screenElements.push({left:x, right:x+w, top:y, bottom:y+h, type:"button", subType:label});
      if (isMouseOver(x, x+w, y, y+h)) {
        appState.highlighted.idx = screenElements.length - 1;
        ctx.fillStyle = "rgba(106,166,255,0.85)"
      }
    }

    ctx.fillText(label, x, y);
    x += w;
  };

  display("© 2026 OpenTL.app");
  display(" · ");
  display("Beta");
  display(" · ");
  display("About", true);
  
  ctx.restore();
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
  const key = i.image.thumbnail;
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
  // imageSmoothing didn't appear to change anything...
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
  const distance = 30;
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
  const majorHeight = 60;
  const majorRadius = 14;
  const minorHeight = 30;
  const minorRadius = 8;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  if (item.dateSpecification === 'point') {
    // single date handle
    let x = Util.timeToPx(item._date);
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
    const tFrom = item.dateFrom._mid;
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
    const tTo = item.dateTo._mid;
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

    // fadeLeft
    x = Util.timeToPx(item.fadeLeft._mid);  // Util.timeToPx(item._fLeft);
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
    x = Util.timeToPx(item.fadeRight._mid); // Util.timeToPx(item._fRight);
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
  
  ctx.restore();
}


/***************************** View labels *****************************/

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
    btnLeft:right + 6, btnRight:right+height + 6, btnTop:top, btnBottom:bottom};
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
  const textBrightness = (highlight) ? DRAW.LABEL_BRIGHTNESS : 0.6;
  const lineBrightness = (highlight) ? 0.5 : 0.18;
  const btnSize = p.btnBottom - p.btnTop;
  const btnRadius = btnSize / 4;

  ctx.save();
  ctx.fillStyle = 'rgb(40,40,40)';
  ctx.strokeStyle = `rgba(255,255,255,${lineBrightness})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(p.left - 30, p.top, width + 36, height, 12);
  if (highlight) { ctx.shadowColor = DRAW.HIGHLIGHT_SHADOW; ctx.shadowBlur = DRAW.HIGHLIGHT_GLOW; }
  ctx.fill();
  ctx.stroke();

  ctx.font = DRAW.TITLE_FONT;
  ctx.fillStyle = `rgba(255, 255, 255, ${textBrightness})`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, p.left + DRAW.EDGE_GAP, vw.yPos - DRAW.LABEL_LINE_HEIGHT);

  // close button
  if (highlight) {
    ctx.fillStyle = 'rgb(40,40,40)';
    ctx.beginPath();
    ctx.roundRect(p.btnLeft, p.btnTop, btnSize, btnSize, btnRadius);
    ctx.fill();

    // "X" symbol centered inside
    const xMargin = 6;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    //ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.btnLeft + xMargin, p.btnTop + xMargin);
    ctx.lineTo(p.btnLeft + btnSize - xMargin, p.btnTop + btnSize - xMargin);
    ctx.moveTo(p.btnLeft + btnSize - xMargin, p.btnTop + xMargin);
    ctx.lineTo(p.btnLeft + xMargin, p.btnTop + btnSize - xMargin);
    ctx.stroke();
  }
  ctx.restore();
}


/***************************** Item bubbles and labels *****************************/

function drawLabelText(label, x, y, brightness) {
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
    
    ctx.fillStyle = (!b.link) ? `rgba(255,255,255, ${brightness})` : 'rgba(106,166,255,1)';
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

function drawLabelBubble(ip, left, width, top, height, highlight, renderContent) {
  const i = ip.item;
  const textBrightness = (highlight) ? DRAW.LABEL_BRIGHTNESS : 0.6;
  const lineBrightness = (highlight) ? 0.5 : 0.18;
  
  // label box
  ctx.save();
  ctx.fillStyle = 'rgb(40,40,40)';
  ctx.strokeStyle = `rgba(255,255,255,${lineBrightness})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(left, top, width, height, 8);
  if (highlight) { ctx.shadowColor = DRAW.HIGHLIGHT_SHADOW; ctx.shadowBlur = DRAW.HIGHLIGHT_GLOW; }
  ctx.fill();
  ctx.stroke();

  if (renderContent) {
    drawLabelText(i._parsedLabel, left + DRAW.EDGE_GAP, top + DRAW.EDGE_GAP, textBrightness);
    if (i.image?.thumbnail) drawLabelThumb(i, left, top);
  }
  ctx.restore();
}

function drawLabelHover(ip, x, y) {
  const i = ip.item;

  // display label right where the item is drawn
  const width = Math.ceil(i._parsedWidth) + DRAW.EDGE_GAP*2;
  const height = Math.ceil(i._parsedRows * DRAW.LABEL_LINE_HEIGHT) + DRAW.EDGE_GAP;
  const left = Math.round(x - width/2);
  const top = Math.round(y - height/2);

  drawLabelBubble(ip, left, width, top, height, true, true);
}

function getLabelPosition(ip, y) {
  // return coordinates of label for itemPos ip
  const i = ip.item;
  const x = Util.timeToPx(i._date);
  const vp = getCanvasViewport();

  if (ip.yOffset > 0) {
    // bubble above y
    
    let bubbleZoomFactor = 1;
    if ("newYOffset" in ip) {
      if (ip.newYOffset === 0 || ip.origYOffset === 0) {
        bubbleZoomFactor =  (ip.yOffset / Math.abs(ip.newYOffset - ip.origYOffset));
        if (bubbleZoomFactor > 1) bubbleZoomFactor = 1; //console.log({bubbleZoomFactor});
      }
    }

    const width = Math.ceil((i._parsedWidth + (DRAW.EDGE_GAP*2)) * bubbleZoomFactor);
    const height = Math.ceil((i._parsedRows * DRAW.LABEL_LINE_HEIGHT + DRAW.EDGE_GAP) * bubbleZoomFactor);
    const left = Math.round(x - width/2);
    const right = left + width;
    const top = Math.round(y - DRAW.LABEL_STEM_HEIGHT - ip.yOffset);
    const bottom = top + height;
    return {type:'bubble', x:x, y:y, left:left, right:right, top:top, bottom:bottom, width:width, height:height, renderContent:(bubbleZoomFactor===1)};

  } else if (ip.yOffset === -1) {
    // label below y
    const spec = zoomSpec(i);
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
  const spec = zoomSpec(i);
  const lineTop = y - (spec.size/2);
  const brightness = highlight ? 0.8 : 0.4;

  // stem: from top of the item line/dot to bottom of label box
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${brightness})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x, lineTop);
  ctx.lineTo(p.x, p.bottom);
  ctx.stroke();
  ctx.restore();

  drawLabelBubble(ip, p.left, p.width, p.top, p.height, highlight, p.renderContent);
}

function drawLabelBelow(ip, highlight) {
  const i = ip.item;
  const y = ip.yPos;
  const p = getLabelPosition(ip, y);
  const spec = zoomSpec(i);
  let zoomFade = spec.fade;

  if (highlight) zoomFade = DRAW.LABEL_BRIGHTNESS; // label text always bright when highlighted

  ctx.save();
  drawLabelText(i._labelSingle, p.left + DRAW.EDGE_GAP, p.top + DRAW.EDGE_GAP, zoomFade);
  ctx.restore();
}


/***************************** Item lines *****************************/

function drawItemLine(ip, highlight) {
  const i = ip.item;
  let xLeft = Util.timeToPx(i._tFrom);
  let xRight = Util.timeToPx(i._tTo);
  let xFadeLeft = Util.timeToPx(i._fLeft);
  let xFadeRight = Util.timeToPx(i._fRight);
  const y = ip.yPos;
  const spec = zoomSpec(i);
  const height = Math.round(spec.size);
  const fade = spec.fade;
  const top = y - height / 2;  // looks better not rounded
  const bottom = y + height / 2;
  const c = i.color ?? "white";
  const cl = i.colorLeft ?? "black";
  const cr = i.colorRight ?? "black";
  const color = colorTrunc(colorRGB.get(c));
  
  // if edge color is black, use (middle) color and apply fade effect below
  const colorLeft = (cl === "black") ? color : colorTrunc(colorMix(colorRGB.get(cl), colorRGB.get(c)));
  const colorRight = (cr === "black") ? color : colorTrunc(colorMix(colorRGB.get(cr), colorRGB.get(c)));

  // curveLeft/Right = whether line ends are to be rendered as curves
  const curveLeft = (Math.abs(xFadeLeft - xLeft) >= 1) && (cl === "black");
  const curveRight = (Math.abs(xRight - xFadeRight) >= 1) && (cr === "black");
    
  // alphaLeft/Right = alpha (fade level) of the ends of the line
  const alphaLeft = curveLeft ? 0 : fade;
  const alphaRight = curveRight ? 0 : fade;

  // extLeft/Right = distance beyond left and right to extend the gradient (so curves render better)
  const extLeft = curveLeft ? height : 0;  // using line height arbitrarily
  const extRight = curveRight ? height : 0;

  // pin x locations for smooth transitions
  xLeft = Math.round(xLeft);
  xRight = Math.round(xRight);
  xFadeLeft = Math.round(xFadeLeft);
  xFadeRight = Math.round(xFadeRight);

  ctx.save();
  if (highlight) { ctx.shadowColor = `rgba(${color},40)`;  ctx.shadowBlur = DRAW.HIGHLIGHT_GLOW; }

  // middle section
  ctx.fillStyle = `rgba(${color}, ${fade})`;
  ctx.beginPath();
  ctx.moveTo(xFadeLeft, top);
  ctx.lineTo(xFadeRight, top);
  ctx.lineTo(xFadeRight, bottom);
  ctx.lineTo(xFadeLeft, bottom);
  ctx.closePath();
  ctx.fill();

  // right section
  const gradRight = ctx.createLinearGradient(xFadeRight, y, xRight + extRight, y);
  gradRight.addColorStop(0, `rgba(${color},${fade})`);
  gradRight.addColorStop(1, `rgba(${colorRight},${alphaRight})`);
  ctx.fillStyle = gradRight;
  ctx.beginPath();
  ctx.moveTo(xFadeRight, top);
  if (curveRight) {
    ctx.quadraticCurveTo(xRight, top, xRight, y);
    ctx.quadraticCurveTo(xRight, bottom, xFadeRight, bottom);
  } else {
    ctx.lineTo(xRight, top);
    ctx.lineTo(xRight, bottom);
    ctx.lineTo(xFadeRight, bottom);
  }
  ctx.closePath();
  ctx.fill();


  // left section
  const gradLeft = ctx.createLinearGradient(xFadeLeft, y, xLeft - extLeft, y);
  gradLeft.addColorStop(0, `rgba(${color},${fade})`);
  gradLeft.addColorStop(1, `rgba(${colorLeft},${alphaLeft})`);
  ctx.fillStyle = gradLeft;
  ctx.beginPath();
  ctx.moveTo(xFadeLeft, top);
  if (curveLeft) {
    ctx.quadraticCurveTo(xLeft, top, xLeft, y);
    ctx.quadraticCurveTo(xLeft, bottom, xFadeLeft, bottom);
  } else {
    ctx.lineTo(xLeft, top);
    ctx.lineTo(xLeft, bottom);
    ctx.lineTo(xFadeLeft, bottom);
  }
  ctx.closePath();
  ctx.fill();

  // dot - display dot while the line appears too narrow to smooth transition
  if ((xFadeRight - xFadeLeft) < height && i.itemType==='event') {
    const x = Util.timeToPx(i._date);
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

  // process 'period' items then 'event' items
  for (const iType of ['period', 'event']) {

    // iterate through items, highest prominence first to check the lowest ones for mouseover last
    for (let prom = DRAW.MAX_SIGNIFICANCE; prom > 0; prom--) {
      
      // process each item (determined to be visible) of this prominence
      vw.itemPos.filter(ip => ip.item.itemType===iType && ip.item.prominence===prom && ip.yOffset !== null).forEach(ip => {
        const i = ip.item;
        const spec = zoomSpec(i);
        const height = spec.size;
        const x = Util.timeToPx(i._date);
        let left = Math.round(Util.timeToPx(i._tFrom));
        let right = Math.round(Util.timeToPx(i._tTo));
        let top = Math.round(y - height / 2);
        let bottom = Math.round(y + height / 2);

        if ((right < rangeLeft) || (left > rangeRight)) return;  // off-screen (horizontally)
        
        // accommodate very small dots by expanding hit area
        if (i.itemType==='event') {
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
  // sorting by bottom ensures stems don't overlap bubbles
  screenElements
    .filter(se => se.type==='line' || se.type==='bubble' || se.type==='label')
    .sort((a, b) => a.bottom - b.bottom)
    .forEach(se => {
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
        drawLabelHover(sel.item, Util.timeToPx(sel.item._date), sel.yPos);
    }
  }

  // draw hover bubble over dot too small for above label
  const h = appState.highlighted.itemPos;
  if (h?.yOffset===0) drawLabelHover(h, Util.timeToPx(h.item._date), h.yPos);

  // change pointer
  setPointerCursor();
}


/***************************** Positioning timelines and items *****************************/

function positionLabelsForVw(vw){
  const ceiling = (vw.ceiling * -1) + 52;
  const newItemPosArray = filteredItemsForView(vw);

  // find a place for each item, if possible - most important first
  for (let prom = DRAW.MAX_SIGNIFICANCE; prom > 0; prom--) {
    
    // process each item of this prominence
    newItemPosArray.filter(ip => ip.item.prominence === prom).forEach(ip => {
      const i = ip.item;
      const spec = zoomSpec(i);

      if (spec.fade===0 && !(i===appState.selected.item)) return; // too small to display (except selected item)
      if (!spec.displayLabel) { ip.yOffset = 0; return; }   // don't position if...

      // can we place label below? (will display wide enough)
      if (i.itemType==='period') {
        const lineWidth = (Util.timeToPx(i._tTo) - Util.timeToPx(i._tFrom));
        if (i._labelWidth + DRAW.EDGE_GAP*2 < lineWidth) { ip.yOffset = -1; return; }
      }

      const x = Util.timeToPx(i._date);
      const left = x - i._parsedWidth/2 - DRAW.EDGE_GAP
      const right = x + i._parsedWidth/2 + DRAW.EDGE_GAP;
      const height = Math.ceil(i._parsedRows * DRAW.LABEL_LINE_HEIGHT) + DRAW.EDGE_GAP;
      let bot = 0;
      let top = bot - height;
      let open = false;

      scanUpwardLoop:
      while (top > ceiling && !open) {
        // Check each already placed item (item) for overlap...
        for (const itemPos of newItemPosArray) {
          const item = itemPos.item;
          if (item === i) continue; // self
          if (!itemPos.yOffset || itemPos.yOffset === -1) continue; // not placed yet

          // if item's bubble overlaps i's then move up and try again
          if (itemPos._left < right && itemPos._right > left && itemPos._top < bot && itemPos._bot > top) { bot = itemPos._top - DRAW.EDGE_GAP; top = bot - height; continue scanUpwardLoop;}

          if (!DRAW.ALLOW_BUBBLE_OVERLAP) {
            // if item's bubble is over i's stem (x) then can't display
            if (itemPos._left < x && itemPos._right > x) { ip.yOffset = 0; break scanUpwardLoop; }  // allow overlap

            // if i's bubble would overlap item's stem then move up and try again
            if (itemPos._bot < top && item._x > left && item._x < right) { bot = itemPos._top - DRAW.EDGE_GAP; top = bot - height; continue scanUpwardLoop;}  // allow overlap
          }
        }
        open = true;
      }
      // place this item - record all position vars instead of calculating each time
      if (open) {
        ip.yOffset = 0 - top;
        ip._x = x;
        ip._left = left;
        ip._right = right;
        ip._top = top;
        ip._bot = bot;
      } else {
        ip.yOffset = 0;
      }
    });
  }

  // reconcile newItemPosArray with existing vw.itemPos
  for (const newIP of newItemPosArray) {
    if (newIP.yOffset === -1) continue;
    const origIP = vw.itemPos.find((ip) => ip.item === newIP.item);
    if (origIP) {
      if (newIP.yOffset != origIP.yOffset) {
//console.log({origYOffset:origIP.yOffset, newYOffset:newIP.yOffset});
        newIP.origYOffset = origIP.origYOffset ?? origIP.yOffset;
        newIP.newYOffset = newIP.yOffset;
        newIP.yOffset = origIP.yOffset;
        appState.zoom.isZooming = true;
      }
    }
  };
  vw.itemPos = newItemPosArray;
}

export function positionLabels() {
  // iterate through views
  appState.views.forEach(positionLabelsForVw);
}

export function positionViews(zoom) {
  const view = appState.selected.view;
  const wh = window.innerHeight;
  let p = TICK.TICK_TOP + TICK.TICK_LABEL_HEIGHT;
  let c = appState.views.length;
  let reserve = 0;
  let remain = wh - p;
  let h = 0;

  const calcRemaining = (height, count) => {
    return (height/(count+1)) + (height/((count+1)*count*2));
  };

  if (c === 1) {
    h = Math.round(remain * 0.6);
  } else {
    h = calcRemaining(remain, c);

    if (view) {
      const ceiling = Math.min(DRAW.MIN_VIEW_CEILING, remain * 0.6);
      if (h < ceiling) {
        reserve = ceiling;
        remain -= reserve
        h = calcRemaining(remain, c - 1);
      }
    }      
  }

  // iterate through timelines in reverse
  for (let i=appState.views.length-1; i>=0; i--) {
    const vw = appState.views[i];
    const ceiling = (vw === view) ? Math.max(reserve, h) : h;
    p += ceiling;
    
    if (zoom) {
      vw.origCeiling = vw.ceiling;
      vw.newCeiling = ceiling;
      vw.origYPos = vw.yPos;
      vw.newYPos = Math.floor(p);
    } else {
      vw.ceiling = ceiling;
      vw.yPos = Math.floor(p);
    }
    
  }
}
