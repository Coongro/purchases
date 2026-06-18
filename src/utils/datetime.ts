/**
 * Normaliza un timestamp de Postgres ("YYYY-MM-DD HH:MM:SS[.ffffff]") a ISO-UTC
 * ("YYYY-MM-DDTHH:MM:SS[.ffffff]Z"). Sin reinterpretar el instante (string puro), para que
 * el front lo parsee como ISO. Mismo helper que en billing.
 */
export function toIsoUtc(ts: string | null | undefined): string {
  if (!ts) return ts ?? '';
  if (ts.includes('T')) {
    return /[Zz]$/.test(ts) || /[+-]\d\d:?\d\d$/.test(ts) ? ts : `${ts}Z`;
  }
  return `${ts.replace(' ', 'T')}Z`;
}
