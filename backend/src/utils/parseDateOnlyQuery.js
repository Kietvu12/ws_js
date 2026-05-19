/**
 * Chuẩn hoá query DATEONLY (YYYY-MM-DD) cho Sequelize.
 * Loại bỏ undefined/null, chuỗi "undefined"/"null", mảng (lấy phần tử đầu), format sai.
 * @returns {string|null}
 */
export function parseDateOnlyQuery(value) {
  if (value == null) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const s = String(raw).trim();
  if (!s || s === 'undefined' || s === 'null') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const t = Date.UTC(y, m - 1, d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return s;
}
