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
    const tl = sherryinnes;
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




var sherryinnes = {
  title:'Sherry Innes',
  events:
  [
  { significance:3, label:'Born in Orlando, FL', date:'1942-09-17' },
  { significance:6, label:'Orlando, FL', dateFrom:'1942-09-17', dateTo:'1943-03-15', fadeLeft:'1942-09-17', fadeRight:'1943-01-15', color:'yellow', colorRight:'green' },
  { significance:6, label:'Denver, CO', dateFrom:'1943-03-16', dateTo:'1945-06-15', fadeLeft:'1943-05-15', fadeRight:'1945-03-15', colorLeft:'yellow', color:'green', colorRight:'blue' },
  { significance:3, label:'Sister Sandy born', date:'1944-10-05' },
  { significance:6, label:'Seymore Texas (farm)', dateFrom:'1945-06-16', dateTo:'1957-12-31', fadeLeft:'1945-09-30', fadeRight:'1957-12-01', colorLeft:'green', color:'blue', colorRight:'yellow' },
  { significance:6, label:'Iowa Park', dateFrom:'1958-01-01', dateTo:'1960-06-15', fadeLeft:'1958-01-31', fadeRight:'1960-01-01', colorLeft:'blue', color:'yellow', colorRight:'red' },
  { significance:6, label:'Alamosa', dateFrom:'1960-06-15', dateTo:'1962-06-15', fadeLeft:'1960-11-15', fadeRight:'1962-02-15', colorLeft:'yellow', color:'red', colorRight:'purple' },
  { significance:3, label:'Graduated High School', dateFrom:'1961-05-01', dateTo:'1961-05-30', fadeLeft:'1961-05-10', fadeRight:'1961-05-20' },
  { significance:6, label:'Colorado Springs', dateFrom:'1962-06-16', dateTo:'1964-05-15', fadeLeft:'1962-09-15', fadeRight:'1964-05-01', colorLeft:'red', color:'purple', colorRight:'blue' },
  { significance:5, label:'Dating Bob Innes', dateFrom:'1962-06-15', dateTo:'1964-07-23', fadeLeft:'1962-06-30', fadeRight:'1964-07-23', color:'yellow' },
  { significance:6, label:'Huntington Beach', dateFrom:'1964-05-16', dateTo:'1964-07-15', fadeLeft:'1964-05-30', fadeRight:'1964-07-01', colorLeft:'purple', color:'blue', colorRight:'green' },
  { significance:4, label:'Move to Alaska', dateFrom:'1964-07-01', dateTo:'1964-07-23', fadeLeft:'1964-07-08', fadeRight:'1964-07-15', color:'green' },
  { significance:6, label:'Anchorage', dateFrom:'1964-07-16', dateTo:'1966-06-15', fadeLeft:'1964-07-30', fadeRight:'1966-03-01', colorLeft:'blue', color:'green', colorRight:'yellow' },
  { significance:3, label:'Married Bob', date:'1964-07-23' },
  { significance:6, label:'Valdez', dateFrom:'1966-06-15', dateTo:'1967-06-15', fadeLeft:'1966-09-01', fadeRight:'1967-03-01', colorLeft:'green', color:'yellow', colorRight:'red' },
  { significance:6, label:'Kenai - Beaver Loop', dateFrom:'1967-06-16', dateTo:'1974-06-16', fadeLeft:'1967-12-15', fadeRight:'1974-01-15', colorLeft:'yellow', color:'red', colorRight:'purple' },
  { significance:3, label:'Birth of son Rob', date:'1969-08-06' },
  { significance:3, label:'Birth of daughter Lisa', date:'1971-02-03' },
  { significance:3, label:'Birth of son Scott', date:'1973-04-14' },
  { significance:6, label:'Strawberry Road', dateFrom:'1974-06-17', dateTo:'2025-09-29', fadeLeft:'1974-08-30', fadeRight:'2025-09-29', colorLeft:'red', color:'purple' },
  { significance:3, label:'Husband Bob dies', date:'1980-05-27' },
  { significance:5, label:'Marriage to Bo', dateFrom:'1983-04-04', dateTo:'1987-12-31', fadeLeft:'1983-04-04', fadeRight:'1985-09-30', color:'red' },
  { significance:2, label:'Wedding', date:'1983-04-04' },
  { significance:4, label:'McKinley Park', dateFrom:'1983-06-10', dateTo:'1983-08-20', fadeLeft:'1983-06-20', fadeRight:'1983-08-10', color:'green' },
  { significance:5, label:'Marriage to Richard', dateFrom:'1989-10-15', dateTo:'1991-02-15', fadeLeft:'1990-01-15', fadeRight:'1990-11-15', color:'red' },
  { significance:2, label:'20 year high school reunion', dateFrom:'1981-05-01', dateTo:'1981-05-30', fadeLeft:'1981-05-10', fadeRight:'1981-05-20' },
  { significance:5, label:'Trip to Machu Picchu', dateFrom:'2001-08-27', dateTo:'2001-09-07', color:'yellow' },
  { significance:2, label:'Sister Sandy died at 30', dateFrom:'1975-01-01', dateTo:'1975-01-31', fadeLeft:'1975-01-10', fadeRight:'1975-01-20' },
  { significance:5, label:'Barstow, CA', dateFrom:'1965-01-15', dateTo:'1965-05-15', fadeLeft:'1965-01-31', fadeRight:'1965-05-01', color:'yellow' },
  { significance:4, label:'Inca Trail trek', dateFrom:'2001-09-03', dateTo:'2001-09-06', color:'blue' },
  { significance:1, label:'Fly to Cuzco', date:'2001-08-30' },
  { significance:2, label:'Explore Machu Picchu ruins', date:'2001-09-06' },
  { significance:2, label:'Passed through SeaTac airport', date:'1983-03-25' },
  { significance:2, label:'Visited Rob at SeaTac', date:'1993-03-29' },
  { significance:5, label:'Trip to see relatives', dateFrom:'1993-07-08', dateTo:'1993-07-24', color:'green' },
  { significance:4, label:'Staying in Seattle with Rob', dateFrom:'1993-07-08', dateTo:'1993-07-10', color:'yellow' },
  { significance:4, label:'Back at Rob\'s in Seattle', dateFrom:'1993-07-20', dateTo:'1993-07-24', color:'yellow' },
  { significance:5, label:'Visit Rob in Seattle', dateFrom:'1993-10-27', dateTo:'1993-10-28', color:'green' },
  { significance:2, label:'Christmas at home with the whole family', date:'1993-12-25' },
  { significance:5, label:'Visit Rob in Seattle', dateFrom:'1994-08-26', dateTo:'1994-09-06', color:'green' },
  { significance:4, label:'Trip to Victoria, BC', dateFrom:'1994-09-01', dateTo:'1994-09-03', color:'red' },
  { significance:1, label:'Hurricane Ridge', date:'1994-09-01' },
  { significance:1, label:'Butchart Gardens', date:'1994-09-02' },
  { significance:1, label:'Rainier Park', date:'1994-09-05' },
  { significance:2, label:'Christmas at home with the whole family', date:'1994-12-25' },
  { significance:5, label:'Scott\'s graduation', dateFrom:'1995-05-17', dateTo:'1995-06-02', color:'green' },
  { significance:4, label:'Fly to Seattle', date:'1995-05-17' },
  { significance:2, label:'Fly home', date:'1995-06-02' },
  { significance:4, label:'Trip to New Haven, CT', dateFrom:'1995-05-18', dateTo:'1995-05-28', color:'yellow' },
  { significance:2, label:'Commencement ceremony', date:'1995-05-22' },
  { significance:3, label:'First grandchild (Brooke)', date:'2004-07-15' },
  { significance:3, label:'Lisa\'s wedding', date:'2002-08-03' }
]};
