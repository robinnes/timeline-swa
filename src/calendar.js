import {TIME} from './constants.js';
import {tickSpec} from './ticks.js';


export function startOfMillenium(t) { return yearFloor(t, 1000); }
export function addMillenia(t, n){ const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear()+ n*1000); return d.getTime(); }

export function startOfCentury(t) { return yearFloor(t, 100); }
export function addCenturies(t, n){ const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear()+ n*100); return d.getTime(); }

export function startOfDecade(t) { return yearFloor(t, 10); }
export function addDecades(t, n){ const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear()+ n*10); return d.getTime(); }

export function startOfYear(t){ const d = new Date(t); d.setUTCMonth(0,1); d.setUTCHours(0,0,0,0); return d.getTime(); }
export function addYears(t, n){ const d = new Date(t); d.setUTCFullYear(d.getUTCFullYear()+n); return d.getTime(); }

export function startOfMonth(t){ const d = new Date(t); d.setUTCDate(1); d.setUTCHours(0,0,0,0); return d.getTime(); }
export function addMonths(t, n){ const d = new Date(t); d.setUTCMonth(d.getUTCMonth()+n); return d.getTime(); }

export function startOfDay(t){ const d = new Date(t); d.setUTCHours(0,0,0,0); return d.getTime(); }
export function addDays(t, n){ return t + n * TIME.MS_PER_DAY; }

export function startOfHour(t){ const d = new Date(t); d.setUTCMinutes(0,0,0); return d.getTime(); }
export function addHours(t, n){return t + n * 1000 * 60 * 60; }

export function startOfMinute(t){ const d = new Date(t); d.setUTCSeconds(0,0); return d.getTime(); }
export function addMinutes(t, n){return t + n * 1000 * 60; }


export function formatYear(t) { 
  const d = new Date(t).getUTCFullYear();
  return d >= 0 ? d.toString() : `${(d*-1).toString()} BC`;
}

export function formatYearCirca(t){ return `c ${formatYear(t)}`; }

export function formatMonthYear(t){ return new Date(t).toLocaleString(undefined,{month:'short', year:'numeric', timeZone:'UTC'}); }
export function formatMonth(t){ return new Date(t).toLocaleString(undefined,{month:'short', timeZone:'UTC'}); }

export function formatDay(t){ return new Date(t).toLocaleString(undefined,{day:'numeric', timeZone:'UTC'}); }
export function formatDayFull(t){ return new Date(t).toLocaleString(undefined,{year:'numeric', month:'short', day:'numeric', timeZone:'UTC'}); }
export function formatWeekday(t){ return new Date(t).toLocaleString('en-GB',{weekday:'short', day:'numeric', timeZone:'UTC'}); }
export function formatWeekdayFull(t){ return new Date(t).toLocaleString(undefined,{weekday:'short', year:'numeric', month:'short', day:'numeric', timeZone:'UTC'}); }

export function formatHour(t){ return new Date(t).toLocaleString(undefined,{hour:'numeric', timeZone:'UTC'}); }

export function formatMinute(t){ const m = "0" + new Date(t).toLocaleString(undefined, {minute:'2-digit', timeZone:'UTC'}); return m.slice(-2); }
export function formatMinuteLong(t){ return new Date(t).toLocaleString(undefined, {hour:'numeric', minute:'2-digit', timeZone:'UTC'}); }
export function formatMinuteWeekday(t){ return new Date(t).toLocaleString(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone:'UTC'}); }
export function formatMinuteFull(t){ return new Date(t).toLocaleString(undefined, {year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'numeric', timeZone:'UTC'}); }

export function timeZoneNow(){
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

export function yearFloor(t, n) {
  // return beginning of n-year period
  const d = new Date(t);
  const m = Math.floor(d.getUTCFullYear() / n) * n;
  d.setUTCFullYear(m, 0, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatItemDate(compoundDate) {
  // compoundDate = {ts, prec}
  const d = new Date(compoundDate.ts);
  const spec = tickSpec.get(compoundDate.prec);  // tickSpec for that precision
  return spec.panelLabel(d);  // return result from the appropriate function
}

export function tsToIsoString(ts) {
  return new Date(ts).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function isoStringToTs(st) {
  return new Date(st).getTime();
}