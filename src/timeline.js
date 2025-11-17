import * as Util from './util.js';
import {TIME, DRAW} from './constants.js';
import {zoomSpec} from './render.js';


const eventsIS = [
  { significance:6, label:'Pre-State: Zionist Movement & British Mandate', dateFrom:'1897-08-29', dateTo:'1948-05-14', fadeLeft:'1920-01-15', fadeRight:'1948-05-14', color:'blue' },
  { significance:6, label:'David Ben-Gurion (I)', dateFrom:'1948-05-14', dateTo:'1953-12-07', color:'green' },
  { significance:6, label:'Moshe Sharett', dateFrom:'1953-12-07', dateTo:'1955-11-03', color:'yellow' },
  { significance:6, label:'David Ben-Gurion (II)', dateFrom:'1955-11-03', dateTo:'1963-06-26', color:'green' },
  { significance:6, label:'Levi Eshkol', dateFrom:'1963-06-26', dateTo:'1969-03-17', fadeRight:'1969-02-26', color:'blue', colorRight:'yellow' },
  { significance:5, label:'Yigal Allon (acting PM)', dateFrom:'1969-02-26', dateTo:'1969-03-17', fadeLeft:'1969-03-01', fadeRight:'1969-03-12', color:'green' },
  { significance:6, label:'Golda Meir', dateFrom:'1969-03-17', dateTo:'1974-06-03', color:'yellow' },
  { significance:6, label:'Yitzhak Rabin (I)', dateFrom:'1974-06-03', dateTo:'1977-06-21', fadeRight:'1977-04-22', color:'green', colorRight:'yellow' },
  { significance:2, label:'Shimon Peres (acting PM)', date:'1977-04-22' },
  { significance:6, label:'Menachem Begin', dateFrom:'1977-06-21', dateTo:'1983-10-10', color:'yellow' },
  { significance:6, label:'Yitzhak Shamir (I)', dateFrom:'1983-10-10', dateTo:'1984-09-13', color:'blue' },
  { significance:6, label:'Shimon Peres', dateFrom:'1984-09-13', dateTo:'1986-10-20', color:'purple' },
  { significance:6, label:'Yitzhak Shamir (II)', dateFrom:'1986-10-20', dateTo:'1992-07-13', color:'blue' },
  { significance:6, label:'Yitzhak Rabin (II)', dateFrom:'1992-07-13', dateTo:'1995-11-04', color:'green' },
  { significance:2, label:'Shimon Peres PM', date:'1995-11-22' },
  { significance:6, label:'Shimon Peres', dateFrom:'1995-11-04', dateTo:'1996-06-18', fadeLeft:'1995-11-22', color:'purple' },
  { significance:6, label:'Benjamin Netanyahu (I)', dateFrom:'1996-06-18', dateTo:'1999-07-06', color:'blue' },
  { significance:6, label:'Ehud Barak', dateFrom:'1999-07-06', dateTo:'2001-03-07', color:'green' },
  { significance:6, label:'Ariel Sharon', dateFrom:'2001-03-07', dateTo:'2006-01-04', color:'yellow' },
  { significance:2, label:'Ehud Olmert PM', date:'2006-04-14' },
  { significance:6, label:'Ehud Olmert', dateFrom:'2006-01-04', dateTo:'2009-03-31', fadeLeft:'2006-04-14', fadeRight:'2009-03-31', colorLeft:'yellow', color:'purple' },
  { significance:6, label:'Benjamin Netanyahu (II)', dateFrom:'2009-03-31', dateTo:'2021-06-13', color:'blue' },
  { significance:6, label:'Naftali Bennett', dateFrom:'2021-06-13', dateTo:'2022-06-30', color:'yellow' },
  { significance:6, label:'Yair Lapid', dateFrom:'2022-07-01', dateTo:'2022-12-29', color:'green' },
  { significance:6, label:'Benjamin Netanyahu (III)', dateFrom:'2022-12-29', dateTo:'2025-09-26', color:'blue' },
  { significance:3, label:'First Zionist Congress (Basel)', dateFrom:'8/9/1897', dateTo:'8/31/1897', fadeLeft:'8/15/1897', fadeRight:'8/25/1897' },
  { significance:3, label:'Balfour Declaration', date:'1917-11-02' },
  { significance:3, label:'San Remo Conference assigns Mandate to Britain', date:'1920-04-25' },
  { significance:3, label:'League of Nations Mandate for Palestine approved', date:'1922-07-24' },
  { significance:3, label:'British Mandate enters into force', date:'1923-09-29' },
  { significance:5, label:'Arab Revolt in Palestine', dateFrom:'1936-04-19', dateTo:'1939-10-01', fadeLeft:'1936-08-19', fadeRight:'1939-06-01', color:'green' },
  { significance:3, label:'British White Paper limits Jewish immigration', date:'1939-05-17' },
  { significance:3, label:'King David Hotel bombing', date:'1946-07-22' },
  { significance:3, label:'UN Partition Plan (GA 181)', date:'1947-11-29' },
  { significance:3, label:'Israeli Declaration of Independence', date:'1948-05-14' },
  { significance:5, label:'1948 Arab-Israeli War', dateFrom:'1948-05-15', dateTo:'1949-07-20', fadeLeft:'1948-05-15', fadeRight:'1949-02-24', color:'red' },
  { significance:4, label:'Rhodes Armistice Agreements', dateFrom:'1949-02-24', dateTo:'1949-07-20' },
  { significance:3, label:'Israel admitted to United Nations', date:'1949-05-11' },
  { significance:2, label:'Luxembourg Reparations Agreement with West Germany', date:'1952-09-10' },
  { significance:3, label:'Law of Return enacted', date:'1950-07-05' },
  { significance:5, label:'Suez Crisis / Operation Kadesh', dateFrom:'1956-10-29', dateTo:'1957-03-07', fadeLeft:'1956-11-29', fadeRight:'1957-02-07', color:'yellow' },
  { significance:3, label:'Eichmann capture in Argentina', date:'1960-05-11' },
  { significance:5, label:'Eichmann trial', dateFrom:'1961-04-11', dateTo:'1962-06-01', fadeLeft:'1961-09-11', color:'yellow' },
  { significance:3, label:'Eichmann execution', date:'1962-06-01' },
  { significance:2, label:'Dimona nuclear reactor publicly acknowledged', date:'1960-12-21' },
  { significance:3, label:'Palestine Liberation Organization founded', date:'1964-05-28' },
  { significance:5, label:'Six-Day War', dateFrom:'1967-06-05', dateTo:'1967-06-10', fadeLeft:'1967-06-06', fadeRight:'1967-06-09', color:'red' },
  { significance:2, label:'Jerusalem reunification (IDF enters Old City)', date:'1967-06-07' },
  { significance:3, label:'Yom Kippur War', dateFrom:'1973-10-06', dateTo:'1973-10-25', fadeLeft:'1973-10-11', fadeRight:'1973-10-20' },
  { significance:3, label:'Camp David Accords', date:'1978-09-17' },
  { significance:3, label:'Egypt-Israel Peace Treaty', date:'1979-03-26' },
  { significance:3, label:'Jerusalem Law (Basic Law)', date:'1980-07-30' },
  { significance:3, label:'Operation Opera strikes Iraqi Osirak reactor', date:'1981-06-07' },
  { significance:5, label:'First Lebanon War (invasion phase)', dateFrom:'1982-06-06', dateTo:'1982-08-30', fadeLeft:'1982-06-21', fadeRight:'1982-08-15', color:'red' },
  { significance:3, label:'Sabra and Shatila massacre', dateFrom:'1982-09-16', dateTo:'1982-09-18' },
  { significance:5, label:'Operation Moses airlift of Ethiopian Jews', dateFrom:'1984-11-21', dateTo:'1985-01-05', fadeLeft:'1984-12-01', fadeRight:'1984-12-25', color:'yellow' },
  { significance:5, label:'First Intifada', dateFrom:'1987-12-09', dateTo:'1993-09-13', fadeLeft:'1988-01-09', fadeRight:'1993-08-13', color:'red' },
  { significance:4, label:'Gulf War Scud attacks on Israel', dateFrom:'1991-01-18', dateTo:'1991-02-25', fadeLeft:'1991-01-28', fadeRight:'1991-02-15', color:'yellow' },
  { significance:3, label:'Operation Solomon airlift of Ethiopian Jews', dateFrom:'1991-05-24', dateTo:'1991-05-25' },
  { significance:3, label:'Madrid Peace Conference', dateFrom:'1991-10-30', dateTo:'1991-11-01' },
  { significance:3, label:'Oslo I Accord (Declaration of Principles)', date:'1993-09-13' },
  { significance:3, label:'Israel-Jordan Peace Treaty (Wadi Araba)', date:'1994-10-26' },
  { significance:3, label:'Oslo II Accord', date:'1995-09-28' },
  { significance:3, label:'Assassination of PM Yitzhak Rabin', date:'1995-11-04' },
  { significance:3, label:'Hebron Protocol', date:'1997-01-15' },
  { significance:3, label:'Wye River Memorandum', date:'1998-10-23' },
  { significance:3, label:'IDF withdrawal from southern Lebanon', date:'2000-05-24' },
  { significance:3, label:'Camp David Summit (final-status talks)', dateFrom:'2000-07-11', dateTo:'2000-07-25', fadeLeft:'2000-07-15', fadeRight:'2000-07-21', color:'blue' },
  { significance:5, label:'Second Intifada', dateFrom:'2000-09-28', dateTo:'2005-02-08', fadeLeft:'2000-10-28', fadeRight:'2005-01-08', color:'red' },
  { significance:4, label:'Operation Defensive Shield (West Bank)', dateFrom:'2002-03-29', dateTo:'2002-05-10', fadeLeft:'2002-04-04', fadeRight:'2002-05-05', color:'red' },
  { significance:3, label:'West Bank barrier construction begins', date:'2002-06-16' },
  { significance:5, label:'Gaza Disengagement', dateFrom:'2005-08-15', dateTo:'2005-09-12', fadeLeft:'2005-08-20', fadeRight:'2005-09-07', color:'green' },
  { significance:5, label:'Second Lebanon War', dateFrom:'2006-07-12', dateTo:'2006-08-14', fadeLeft:'2006-07-17', fadeRight:'2006-08-09', color:'red' },
  { significance:3, label:'Hamas takeover of Gaza', dateFrom:'2007-06-14', dateTo:'2007-06-15' },
  { significance:5, label:'Operation Cast Lead (Gaza)', dateFrom:'2008-12-27', dateTo:'2009-01-18', fadeLeft:'2009-01-02', fadeRight:'2009-01-13', color:'red' },
  { significance:3, label:'Gaza flotilla raid', date:'2010-05-31' },
  { significance:5, label:'Operation Pillar of Defense (Gaza)', dateFrom:'2012-11-14', dateTo:'2012-11-21', fadeLeft:'2012-11-16', fadeRight:'2012-11-19', color:'red' },
  { significance:5, label:'Operation Protective Edge (Gaza)', dateFrom:'2014-07-08', dateTo:'2014-08-26', fadeLeft:'2014-07-13', fadeRight:'2014-08-21', color:'red' },
  { significance:3, label:'US Embassy moves to Jerusalem', date:'2018-05-14' },
  { significance:2, label:'Basic Law: Nation-State of the Jewish People', date:'2018-07-19' },
  { significance:5, label:'Operation Guardian of the Walls (Gaza)', dateFrom:'2021-05-10', dateTo:'2021-05-21', fadeLeft:'2021-05-12', fadeRight:'2021-05-19', color:'red' },
  { significance:5, label:'Abraham Accords normalization (UAE/Bahrain/Morocco)', dateFrom:'2020-09-15', dateTo:'2020-12-10', fadeLeft:'2020-09-30', fadeRight:'2020-11-25', color:'green' },
  { significance:3, label:'Israel-Lebanon maritime border agreement', date:'2022-10-27' },
  { significance:4, label:'Judicial overhaul protests in Israel', dateFrom:'2023-01-07', dateTo:'2023-12-31', fadeLeft:'2023-02-07', fadeRight:'2023-11-30', color:'yellow' },
  { significance:5, label:'Operation Shield and Arrow (Gaza vs PIJ)', dateFrom:'2023-05-09', dateTo:'2023-05-13', fadeLeft:'2023-05-10', fadeRight:'2023-05-12', color:'red' },
  { significance:3, label:'Oct 7th Hamas Attack', date:'2023-10-07' },
  { significance:5, label:'Israel-Hamas War', dateFrom:'2023-10-07', dateTo:'2025-09-26', fadeLeft:'2023-10-15', fadeRight:'2025-09-26', color:'red' },
  { significance:5, label:'Hostage-prisoner pause and exchanges', dateFrom:'2023-11-24', dateTo:'2023-11-30', color:'black' },
  { significance:3, label:'Iran direct attack with drones and missiles', date:'2024-04-14' },
  { significance:2, label:'Hezbollah pager attack', dateFrom:'2024-09-17', dateTo:'2024-09-18' }
];

function parseLabel(label) {
  // attempt to minimize label width by splitting longer values up
  const ctx = canvas.getContext('2d');
  ctx.font = DRAW.LABEL_FONT;
  const labelWidth = ctx.measureText(label).width;
  const words = label.split(" "); // what about hyphens?
  let line = "", labels = [], maxWidth = 0;

  // parse label by words, start a new line when width exceeds MAX_LABEL_WIDTH
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > DRAW.MAX_LABEL_WIDTH && n > 0) {
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
    for (let w = words.length-1; w > 0; w--) {
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

export function initializeEvent(e) {
  const h = 60*60*1000;
  const spec = zoomSpec(e.significance);
  const style = spec.style;
  
  // Establish properties for positioning labels
  const parsed = parseLabel(e.label);
  e.labelWidth = parsed.labelWidth;
  e.parsedLabel = parsed.labels;
  e.parsedWidth = parsed.width;
  e.yOffset = null;

  if (style === 'line') {
    if (!e.dateFrom) e.dateFrom = e.date;
    if (!e.dateTo) e.dateTo = e.date;
    if (!e.fadeLeft) e.fadeLeft = e.dateFrom;
    if (!e.fadeRight) e.fadeRight = e.dateTo;
  
    if (e.color === 'white') e.color = DRAW.DEFAULT_LINE_COLOR;

    //sanity checks
    if (e.dateTo < e.dateFrom) e.dateTo = e.dateFrom;
    if (e.fadeLeft > e.fadeRight) e.fadeRight = e.fadeLeft;
    if (e.fadeLeft > e.dateTo) e.fadeLeft = e.dateTo;
    if (e.fadeLeft < e.dateFrom) e.fadeLeft = e.dateFrom;
    if (e.fadeRight < e.dateFrom) e.fadeRight = e.dateFrom;
    if (e.fadeRight > e.dateTo) e.fadeRight = e.dateTo;

    e.tFrom = Date.parse(e.dateFrom) + (12 * h);
    e.tTo = Date.parse(e.dateTo) + (12 * h);
    e.fLeft = Date.parse(e.fadeLeft) + (12 * h);
    e.fRight = Date.parse(e.fadeRight) + (12 * h);
    e.dateTime = (e.fRight + e.fLeft) / 2;
    
  } else {
    if (!e.date) e.date = e.dateFrom; // nothing fance like finding middle of line vars...
    const d = Date.parse(e.date)  // OK to assume that every dot event has a date
    e.color = "white";
    
    //convert to a small span in the middle of that day; extend all 'spanning' events to noon on either side
    e.dateTime = d + (12 * h);
    e.tFrom = e.dateTime - (4 * h);
    e.tTo = e.dateTime + (4 * h);
    e.fLeft = e.tFrom + (3 * h);
    e.fRight = e.tTo - (3 * h);
  }
  e.x = Util.timeToPx(e.dateTime);  // used only to position labels in relation to each other
};

export function initializeTimeline(tl) {
  var minDate;
  var maxDate;
  const ctx = canvas.getContext('2d');
  
  ctx.font = TIME.TITLE_FONT;
  tl.labelWidth = ctx.measureText(tl.title).width;
  tl.dirty = false;
  
  //tl.events.forEach(initializeEvent);
  for (const event of tl.events) {
    event.timeline = tl;
    initializeEvent(event);

    // establish min/max dates present in the timeline
    const spec = zoomSpec(event.significance);
    const dateFrom = (spec.style === 'dot') ? event.date : event.dateFrom;
    const dateTo = (spec.style === 'dot') ? event.date : event.dateTo;
    if (!minDate || dateFrom < minDate) minDate = dateFrom;
    if (!maxDate || dateTo > maxDate) maxDate = dateTo;
  }
  tl.dateFrom = minDate;
  tl.dateTo = maxDate;
}

export function timelineString(tl) {
  // Additional properties have been added to the original timeline object;
  // reduce back to original form for export
  const txt = {
    title: tl.title,
    details: tl.details,
    dateFrom: tl.dateFrom,
    dateTo: tl.dateTo,
    events: tl.events.map(({significance, label, date, dateFrom, dateTo, fadeLeft, fadeRight, color, colorLeft, colorRight, details}) => ({
                            significance, label, date, dateFrom, dateTo, fadeLeft, fadeRight, color, colorLeft, colorRight, details
    }))
  };
  return JSON.stringify(txt, null, 2);
}