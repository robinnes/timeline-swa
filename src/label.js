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

function assignRows(words, totalWidth) {
  // attempt to minimize label width by splitting longer values up
  const rows = [{width:totalWidth, lastIdx:words.length - 1}];
  let widest = 0;

  while (rows[widest].width > DRAW.MAX_LABEL_WIDTH    // keep moving the last word on the widest row down until the widest row is less than the maximum
    && rows[widest].width > words[rows[widest].lastIdx].width) {  // failsafe when a single row exceeds the maximum
    const idx = rows[widest].lastIdx;  // index of the word at the end of the widest row
    const w = words[idx].width;        // it's width

    if (widest === rows.length-1)  // widest row is at the end; add a row
      rows.push({width:w, lastIdx:idx});
    else
      rows[widest+1].width += w;

    rows[widest].lastIdx -= 1;
    rows[widest].width -= w;
    words[idx].row += 1;

    // determine widest row
    widest = rows.reduce(
      (maxIdx, row, i, arr) => row.width > arr[maxIdx].width ? i : maxIdx, 0
    );
  }

  // Continue shifting last word at the widest row down (without adding rows) until it no longer helps
  while (widest < rows.length-1) {
    const idx = rows[widest].lastIdx;  // index of the word at the end of the widest row
    const w = words[idx].width;        // it's width

    if (rows[widest+1].width + w > rows[widest].width) break;  // moving that word down would result in a wider row; we're done

    rows[widest+1].width += w;  // move the word down
    rows[widest].lastIdx -= 1;
    rows[widest].width -= w;
    words[idx].row += 1;

    // determine widest row
    widest = rows.reduce(
      (maxIdx, row, i, arr) => row.width > arr[maxIdx].width ? i : maxIdx, 0
    );
  }
}

function combineWords(words) {
  // concatenate adjacent words if they're assigned the same row, but not hyperlinks and non-hyperlinks
  // (also do some space manipulation that should be done upstream)
  const combined = [];
  let row = 0;
  let link = words[0].link;
  let block = "";
  let blockLeft = 0;
  let blockWidth = 0;
  let rowWidth = 0;
  let maxWidth = 0;

  for (let i=0; i < words.length; i++) {
    const spacer = (words[i].link && !words[i+1]?.link) ? "" : " ";
    const word = words[i].word + spacer;
    if (words[i].row === row && words[i].link === link) {
      block += word;
      blockWidth += words[i].width;
    } else {
      combined.push({text:block, row:row, left:blockLeft, link:link, width:blockWidth});
      block = word;
      rowWidth += blockWidth;
      if (words[i].row != row) {
        if (rowWidth > maxWidth) maxWidth = rowWidth;
        blockWidth = words[i].width;
        rowWidth = 0; 
        blockLeft = 0;
      } else {
        blockLeft += blockWidth;
        blockWidth = words[i].width;
      }
      row = words[i].row;
      link = words[i].link;
    }
  }
  rowWidth += blockWidth;
  if (rowWidth > maxWidth) maxWidth = rowWidth;
  combined.push({text:block, row:row, left:blockLeft, link:link, width:blockWidth});
  return({combined, maxWidth});
}

export function parseLabel(text) {
  // given a text label that can contain hyperlinks, return single and multi-line parsed versions for canvas display
  const {words, totalWidth} = processLinks(text);
  const s = combineWords(words);

  assignRows(words, totalWidth);
  const m = combineWords(words);

  return({singleRow:s.combined, singleWidth:totalWidth,
          multiRow:m.combined, multiWidth:m.maxWidth});
}