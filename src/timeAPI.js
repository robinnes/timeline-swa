let TemporalRef = null;

export async function initTimeAPI() {
  if (!TemporalRef) {
    TemporalRef = globalThis.Temporal ?? (await import('@js-temporal/polyfill')).Temporal;
  }
}

export function parsePlainDateTime(iso) {
  return TemporalRef.PlainDateTime.from(iso);
}