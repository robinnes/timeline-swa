import {initializeTimeline, timelineString} from './timeline.js';

/******************* Utility functions *******************/

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showGlobalBusyCursor() {
  const style = document.createElement('style');
  style.id = 'global-busy-cursor';
  style.textContent = `* { cursor: wait !important; }`;
  document.head.appendChild(style);
}

function hideGlobalBusyCursor() {
  const style = document.getElementById('global-busy-cursor');
  if (style) style.remove();
}

function formatURL(file, url, container, sasKey) {
  const base = url.replace(/\/+$/, '');
  const encodedFile = (file || '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  const sas = sasKey ? (sasKey.startsWith('?') ? sasKey : `?${sasKey}`) : '';
  
  return `${base}/${container}/${encodedFile}${sas}`;
}

/******************* Blob storage functions *******************/

async function acquireSasToken() {
  try {
    const response = await fetch("/api/credentials");
    const {url, sasKey} = await response.json();
    return {url, sasKey};

  } catch (err) {
    throw new Error(`Failed to aquire SAS token: ${err.message}`);
  }
}

async function loadTimelineFromStorage(container, file) {
  try {
    // acquire SAS token
    const {url, sasKey} = await acquireSasToken();
    const blobUrl = formatURL(file, url, container, sasKey); 

    // fetch the blob
    const resp = await fetch(blobUrl);
    if (!resp.ok) throw new Error(`Failed to fetch blob: ${resp.status} ${resp.statusText}`);
    const text = await resp.text();

    // parse and return JSON
    return JSON.parse(text);

  } catch (e) {
    throw new Error(`Failed to load ${file} from storage: ${e.message}`);
  }
}

async function saveTimelineToStorage(container, file, text) {
  try {
    const {url, sasKey} = await acquireSasToken();
    const blobUrl = formatURL(file, url, container, sasKey);

    const resp = await fetch(blobUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: text
    });

    if (!resp.ok) throw new Error(`Failed to upload blob: ${resp.status} ${resp.statusText}`);
    return true;
  } catch (e) {
    throw new Error(`Failed to save ${file} to storage: ${e.message}`);
  }
}

export async function getTimeline(timelineID) {
  const container = timelineID.container
  const file = timelineID.file;
  showGlobalBusyCursor();
  try {
    // retrieve from Azure blob storage
    const tl = await loadTimelineFromStorage(container, file);
    initializeTimeline(tl);
    tl.timelineID = timelineID;
    hideGlobalBusyCursor();
    return tl;
  } catch (err) {
    // look for the timeline locally
    const obj = file.split(".")[0];
    //const tl = window[obj];  // look for variable matching the filename (minus ext)
    const tl = robandanh;
    /*
    const response = await fetch(`data/${file}`);  // only works when a local server is running
    const tl = await response.json();
    */
    initializeTimeline(tl);
    tl.timelineID = timelineID;
    await sleep(500);  // simulate database access
    hideGlobalBusyCursor();
    return tl;
  }
}

export async function saveTimeline(tl)
{
  showGlobalBusyCursor();
  try {
    const text = timelineString(tl);
    const {container, file} = tl.timelineID;
    await saveTimelineToStorage(container, file, text);
    tl.dirty = false;
  } catch (err) {
    //await sleep(1200);  // simulate database access
    console.error('Save failed:', err.message);
  }
  hideGlobalBusyCursor();
}




var robandanh = {
  title:'Marriage to Anh',
  events:[
    //{ significance:6, label:'Rob and Anh', dateFrom:'2011-09-20', dateTo:'2025-09-25', fadeLeft:'2017-09-21', fadeRight:'2017-09-22', colorLeft:'green', color:'green', colorRight:'green' },
    { significance:5, label:'Dating', dateFrom:'2011-09-20', dateTo:'2012-10-27', fadeLeft:'2011-09-21', fadeRight:'2012-10-26', color:'green', colorRight:'yellow' },
    { significance:2, label:'First phone call', date:'2011-09-20' },
    { significance:3, label:'First date: Spaghetti Factory', date:'2011-09-21' },
    { significance:1, label:'Second date: Ixtapa and movie (Moneyball)', date:'2011-09-25' },
    { significance:1, label:'Anh comes to Rob\'s and makes dinner', date:'2011-09-28' },
    { significance:1, label:'Spend Saturday together', date:'2011-10-01' },
    { significance:1, label:'Spend another Saturday together', date:'2011-10-08' },
    { significance:4, label:'Rob flies to Chicago for work', dateFrom:'2011-11-14', dateTo:'2011-11-17', fadeLeft:'2011-11-15', fadeRight:'2011-11-16', color:'blue' },
    { significance:1, label:'Rob returns late from Chicago; Anh was there', date:'2011-11-17' },
    { significance:1, label:'Rob returns from airport to find Anh in his bed', date:'2011-11-27' },
    { significance:1, label:'Anh sells her Honda to Rob; Rob met Tin', date:'2011-12-05' },
    { significance:1, label:'First Christmas photo at Molbak\'s', date:'2011-12-17' },
    { significance:1, label:'Snowflake Lane in Bellevue together', date:'2011-12-23' },
    { significance:2, label:'Power outage incident', date:'2011-12-25' },
    { significance:1, label:'Rob tells his mom about Anh', date:'2011-12-29' },
    { significance:1, label:'Anh meets Lisa and family and paints Rob\'s bathroom', date:'2012-01-01' },
    { significance:1, label:'Anh shows Rob her old Bothell address', date:'2012-01-06' },
    { significance:1, label:'Anh meets Rob\'s friends at Tasha & Dona\'s house', date:'2012-01-14' },
    { significance:1, label:'Anh takes care of a sick Rob', date:'2012-01-18' },
    { significance:1, label:'Lunch at Noble Court in Bellevue and run into friends', date:'2012-01-21' },
    { significance:1, label:'Rob begins working in Portland for 2 weeks', date:'2012-01-23' },
    { significance:1, label:'Anh meets Leta at House of Hong', date:'2012-02-04' },
    { significance:1, label:'Anh joins Rob & Mom at the Macaroni Grill', date:'2012-02-11' },
    { significance:1, label:'Anh fills Rob\'s car with balloons for Valentine\'s Day', date:'2012-02-14' },
    { significance:1, label:'Anh\'s birthday: iPad and The Keg', date:'2012-02-22' },
    { significance:1, label:'Game night at Rob\'s friend Mike\'s house', date:'2012-02-25' },
    { significance:1, label:'Share Anh\'s fresh spring rolls with Lisa & family', date:'2012-03-11' },
    { significance:1, label:'Anh meets Dean', date:'2012-03-13' },
    { significance:1, label:'Anh meets Ryan & Heather at Apple Store', date:'2012-03-16' },
    { significance:1, label:'Rob plans to retire at 50 with $500-600k', date:'2012-03-18' },
    { significance:1, label:'Anh & Rob celebrate Justin\'s 50th', date:'2012-04-06' },
    { significance:1, label:'Anh attends Alderwood Church', date:'2012-04-08' },
    { significance:1, label:'Saturday together; Fremont Troll', date:'2012-04-14' },
    { significance:1, label:'Anh cuts Rob\'s hair', date:'2012-04-15' },
    { significance:1, label:'Anh interviews at Overlake', date:'2012-04-18' },
    { significance:2, label:'Tulip Festival', date:'2012-04-21' },
    { significance:1, label:'Wedding of Davi and Bob, and tour of Monroe', date:'2012-05-05' },
    { significance:1, label:'Fire in unit below Rob\'s', date:'2012-05-12' },
    { significance:4, label:'Rob in London', dateFrom:'2012-05-18', dateTo:'2012-05-27', fadeLeft:'2012-05-19', fadeRight:'2012-05-26', color:'red' },
    { significance:2, label:'Rob tells David about Anh', date:'2012-05-19' },
    { significance:1, label:'Anh goes to Folk Life with Rob\'s mom', date:'2012-05-26' },
    { significance:1, label:'Rob meets Tin\'s family at Carter\'s 6th birthday', date:'2012-06-08' },
    { significance:1, label:'Anh & Rob celebrate Jake\'s 6th birthday', date:'2012-06-10' },
    { significance:1, label:'Rob notes that Anh keeps biting his butt', date:'2012-06-12' },
    { significance:1, label:'Rob begins working in San Mateo', date:'2012-06-17' },
    { significance:1, label:'Rob sees Anh\'s storage unit', date:'2012-06-30' },
    { significance:1, label:'Anh & Rob celebrate Brooke\'s birthday', date:'2012-07-15' },
    { significance:2, label:'Rob and Anh go to Victoria on the Clipper', date:'2012-07-20' },
    { significance:1, label:'Rob back in Portland for work', date:'2012-07-22' },
    { significance:1, label:'Rob takes train back from Portland', date:'2012-07-24' },
    { significance:1, label:'Rob and Anh share an evening in Seattle', date:'2012-08-03' },
    { significance:1, label:'Anh rear-ended while Rob is in CA', date:'2012-08-16' },
    { significance:1, label:'Rob celebrates his birthday with Anh and Lisa\'s family', date:'2012-08-18' },
    { significance:1, label:'Anh gives Rob\'s mom a birthday gift', date:'2012-09-03' },
    { significance:1, label:'Anh made Vietnamese food for Rob\'s family', date:'2012-09-06' },
    { significance:2, label:'Rob\'s mom makes Anh uncomfortable with questions', date:'2012-09-07' },
    { significance:1, label:'Rob & Anh picked blackberries with Lisa and family', date:'2012-09-16' },
    { significance:1, label:'Rob & Anh get portrait taken at the mall', date:'2012-09-22' },
    { significance:1, label:'Rob & Anh buy iPhone 5s together', date:'2012-10-05' },
    { significance:1, label:'Anh takes Rob\'s mom to outlet mall', date:'2012-10-06' },
    { significance:1, label:'Rob tells his mom he\'ll marry Anh soon', date:'2012-10-11' },
    { significance:5, label:'Engaged', dateFrom:'2012-10-27', dateTo:'2012-12-12', fadeLeft:'2012-10-28', fadeRight:'2012-12-11', colorLeft:'green', color:'yellow', colorRight:'blue' },
    { significance:3, label:'Rob proposes to Anh and she says Yes', date:'2012-10-27' },
    { significance:1, label:'Rob tells family the good news', date:'2012-10-28' },
    { significance:1, label:'Got loan preapproval from Tin\'s bank', date:'2012-11-02' },
    { significance:1, label:'Rob discusses wedding with Pastor Fred', date:'2012-11-06' },
    { significance:1, label:'Rob contacts Frank Blau for photography', date:'2012-11-07' },
    { significance:1, label:'Arranged wedding cake', date:'2012-11-09' },
    { significance:1, label:'Made offer on the Bothell townhouse', date:'2012-11-10' },
    { significance:1, label:'Met with manager of Arnie\'s', date:'2012-11-15' },
    { significance:1, label:'Rob starts working at BD&A', date:'2012-11-16' },
    { significance:1, label:'Anh introduces Rob to the Wendells', date:'2012-11-18' },
    { significance:1, label:'Rob goes to Alaska for Thanksgiving', date:'2012-11-21' },
    { significance:2, label:'Get marriage license in Bothell', date:'2012-11-27' },
    { significance:1, label:'Rob gives Anh\'s car a jump at Overlake in Issaquah', date:'2012-11-29' },
    { significance:1, label:'Bank won\'t lend on Bothell townhouse', date:'2012-11-30' },
    { significance:1, label:'Rob exhanges texts with Aaron', date:'2012-12-02' },
    { significance:1, label:'Dean flies in from London', date:'2012-12-08' },
    { significance:4, label:'Entertaining wedding guests', dateFrom:'2012-12-09', dateTo:'2012-12-16', fadeLeft:'2012-12-10', fadeRight:'2012-12-15', color:'red' },
    { significance:1, label:'Parents arrive', date:'2012-12-09' },
    { significance:1, label:'Big dinner at Buca de Beppo', date:'2012-12-10' },
    { significance:2, label:'The Boys appear, surprising Rob', date:'2012-12-11' },
    //{ significance:5, label:'Married life', dateFrom:'2012-12-12', dateTo:'2025-09-25', fadeLeft:'2012-12-13', fadeRight:'2025-09-25', colorLeft:'yellow', color:'blue' },
    { significance:3, label:'Rob and Anh get married', date:'2012-12-12' },
    { significance:1, label:'Visiting and midnight showing of "The Hobbit"', date:'2012-12-13' },
    { significance:1, label:'Rescinded offer on the Bothell townhouse', date:'2012-12-14' },
    { significance:1, label:'Anh\'s parents fly home', date:'2012-12-16' },
    { significance:2, label:'Anh moves into the Shoreline condo', date:'2013-01-01' },
    { significance:1, label:'Open joint account at BECU', date:'2013-01-12' },
    { significance:1, label:'Make offer of $225k on Kirkland condo', date:'2013-01-19' },
    { significance:1, label:'Offer of $238k accepted on Kirkland condo', date:'2013-01-23' },
    { significance:1, label:'Pack up the Shoreline condo', date:'2013-02-02' },
    { significance:4, label:'Living in Lynnwood hotel', dateFrom:'2013-02-10', dateTo:'2013-03-16', fadeLeft:'2013-02-11', fadeRight:'2013-03-15', color:'red' },
    { significance:1, label:'Meet Frank at concert in Ballard', date:'2013-02-22' },
    { significance:1, label:'Celebrate Tin\'s 40th at Tables in Mill Creek', date:'2013-03-09' },
    { significance:1, label:'Sign closing docs on the Kirkland condo', date:'2013-03-13' },
    { significance:2, label:'Move out of hotel into the Kirkland condo', date:'2013-03-16' },
    { significance:4, label:'Fly to Florida', dateFrom:'2013-05-31', dateTo:'2013-06-05', fadeLeft:'2013-06-01', fadeRight:'2013-06-04', color:'yellow' },
    { significance:2, label:'First anniversary', date:'2013-12-12' },
    { significance:2, label:'Tony\'s 75th birthday', date:'2013-06-02' },
    { significance:4, label:'Honeymoon', dateFrom:'2014-05-02', dateTo:'2014-05-12', fadeLeft:'2014-05-03', fadeRight:'2014-05-11', color:'green' },
    { significance:3, label:'Arrive in Rome', date:'2014-05-02' }
    //{ significance:3, label:'10th Anniversary', date:'2022-12-12' }
  ]
}