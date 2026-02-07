import {DRAW} from './constants.js';
import {ctx} from './canvas.js';


function processLinks(text) {
  // Convert text, which may contain HTML hyperlink tags, into an array of words for further processing
  const regex = /<a\s+href="#"\s+tl="([^"]*)">(.*?)<\/a>/;  // reg exp for a hyperlink tag
  ctx.font = DRAW.LABEL_FONT;
  let remain = text;
  let totalWidth = 0;
  const words = [];
  
  while (remain) {
    const r = regex.exec(remain);
    if (!r) {
        // no hyperlink; process all words
        remain.split(" ").forEach(word => {
          const w = ctx.measureText(word + " ").width;
          totalWidth += w;
          words.push({word:word, link:null, width:w, row:0})
        });
        remain = null;
    } else {
        if (r.index > 0) {
          // process all words before the hyperlink
          const st = remain.slice(0, r.index - 1);
          st.split(" ").forEach(word => {
            const w = ctx.measureText(word + " ").width;
            totalWidth += w;
            words.push({word:word, link:null, width:w, row:0})
          });
        }
        
        // process all words within the hyperlink
        const link = r[1];
        const linkLabel = r[2].split(" ");
        for (let i=0; i < linkLabel.length; i++) {
          const spacer = (i === linkLabel.length - 1) ? "" : " ";
          const word = linkLabel[i];
          const w = ctx.measureText(word + spacer).width;
          totalWidth += w;
          words.push({word:word, link:link, width:w, row:0})
        }
        
        remain = remain.slice(r.index + r[0].length);
    }
  }
  return {words, totalWidth};
}

function assignRows(words, totalWidth, thumb) {
  // Attempt to minimize label width by splitting longer values up
  if (words.length === 0) return;

  const thumbW = thumb ? DRAW.THUMB_LABEL_SIZE+4 : 0;  // if thumbnail is present, reserve space on the first <x> rows for it
  const rows = [{width:totalWidth + thumbW, lastIdx:words.length-1}];
  let widest = 0;

  // Iterate words
  while (rows[widest].width > DRAW.MAX_LABEL_WIDTH    // keep moving the last word on the widest row down until the widest row is less than the maximum
    && rows[widest].width > words[rows[widest].lastIdx].width) {  // failsafe when a single row exceeds the maximum
    const idx = rows[widest].lastIdx;  // index of the word at the end of the widest row
    const w = words[idx].width;        // it's width

    if (widest === rows.length-1) {  // widest row is at the end; add a row
      const tw = rows.length < DRAW.THUMB_LABEL_ROWS ? thumbW : 0;  // account for new row that needs to accommodate the thumbnail
      rows.push({width:w + tw, lastIdx:idx});
    } else {
      rows[widest+1].width += w;
    }

    rows[widest].lastIdx -= 1;
    rows[widest].width -= w;
    words[idx].row += 1;

    // determine widest row
    widest = rows.reduce(
      (maxIdx, row, i, arr) => row.width > arr[maxIdx].width ? i : maxIdx, 0
    );
  }

  // If there's a thumbnail, ensure there are at least enough rows
  if (thumb) while (rows.length < DRAW.THUMB_LABEL_ROWS) rows.push({width:thumbW, lastIdx:null})

  // Continue shifting last word at the widest row down (without adding rows) until it no longer helps
  while (widest < rows.length-1) {
    const idx = rows[widest].lastIdx;  // index of the word at the end of the widest row
    const w = words[idx].width;        // it's width

    if (rows[widest+1].width + w >= rows[widest].width - w) break;  // moving that word down would result in a wider row; we're done

    rows[widest+1].lastIdx = idx;  // move the word down
    rows[widest+1].width += w;
    rows[widest].lastIdx -= 1;
    rows[widest].width -= w;
    words[idx].row += 1;

    // determine widest row
    widest = rows.reduce(
      (maxIdx, row, i, arr) => row.width > arr[maxIdx].width ? i : maxIdx, 0
    );
  }
}

function combineWords(words, thumb) {
  // concatenate adjacent words if they're assigned the same row, but not hyperlinks and non-hyperlinks
  // (also do some space manipulation that should be done upstream)
  const thumbW = thumb ? DRAW.THUMB_LABEL_SIZE+4 : 0;
  const combined = [];
  let row = 0;
  let link = words[0]?.link;
  let block = "";
  let blockWidth = 0;
  let blockLeft = thumbW;
  let rowWidth = blockLeft;
  let maxWidth = 0;
  
  for (let i=0; i < words.length; i++) {
    const spacer = (words[i].link && !words[i+1]?.link) ? "" : " ";
    const word = words[i].word + spacer;
    if (words[i].row === row && words[i].link === link) {
      block += word;
      blockWidth += words[i].width;
    } else {
      combined.push({text:block, row:row, left:blockLeft, link:link, width:blockWidth});
      rowWidth += blockWidth;
      if (words[i].row != row) {
        if (rowWidth > maxWidth) maxWidth = rowWidth;
        blockWidth = words[i].width;
        blockLeft = (row + 1) < DRAW.THUMB_LABEL_ROWS ? thumbW : 0;  // account for new row that needs to accommodate the thumbnail
        rowWidth =  blockLeft;
      } else {
        blockLeft += blockWidth;
        blockWidth = words[i].width;
      }
      block = word;
      row = words[i].row;
      link = words[i].link;
    }
  }
  rowWidth += blockWidth;
  if (rowWidth > maxWidth) maxWidth = rowWidth;
  combined.push({text:block, row:row, left:blockLeft, link:link, width:blockWidth});
  return({combined, maxWidth});
}

export function parseLabel(text, thumbnail) {
  // Given a text label that can contain hyperlinks, return single and multi-line parsed versions for canvas display
  const thumb = !!thumbnail;  // the presence of a thumbnail affects the size and distribution of text

  const {words, totalWidth} = processLinks(text);
  const s = combineWords(words, false);

  assignRows(words, totalWidth, thumb);
  const m = combineWords(words, thumb);
  
  return({singleRow:s.combined, singleWidth:totalWidth,
          multiRow:m.combined, multiWidth:m.maxWidth});
}