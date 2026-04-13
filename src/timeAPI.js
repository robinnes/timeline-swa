let TemporalRef = null;

export async function initTimeAPI() {
  if (!TemporalRef) {
    TemporalRef = globalThis.Temporal ?? (await import('@js-temporal/polyfill')).Temporal;
  }
}

export function parsePlainDateTime(iso) {
  if (!TemporalRef) {
    throw new Error('Temporal API not initialized');
  }
  return TemporalRef.PlainDateTime.from(iso);
}