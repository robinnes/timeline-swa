let TemporalRef = null;

export async function initTimeAPI() {
  if (TemporalRef) return TemporalRef;

  try {
    TemporalRef =
      globalThis.Temporal ??
      (await import('https://esm.sh/@js-temporal/polyfill')).Temporal;

    return TemporalRef;
  } catch (err) {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<pre style="position:fixed;left:0;top:0;z-index:99999;background:#000;color:#0f0;padding:8px;max-width:100vw;white-space:pre-wrap">${String(err.message || err)}\n${String(err.stack || '')}</pre>`
    );
    throw err;
  }
}

export function parsePlainDateTime(iso) {
  if (!TemporalRef) throw new Error('Temporal API not initialized');
  return TemporalRef.PlainDateTime.from(iso);
}