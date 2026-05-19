/**
 * Parse cvTableLayout từ FormData (chuỗi JSON) hoặc body JSON.
 * @returns {Record<string, { cols?: number[], rows?: Record<string, number> }>|null}
 */
export function parseCvTableLayoutFromRequest(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  return null;
}
