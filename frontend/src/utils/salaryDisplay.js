/**
 * Chuỗi dạng min–max (hai khối số/tiền tệ nối bằng gạch) → hiển thị thêm " JLPT" ở cuối.
 * Dạng text tự do (ví dụ "Theo thỏa thuận") → giữ nguyên.
 * Cùng tinh thần parseSalaryRange trong AgentJobsPageSession2 (một khoảng số có dấu nối).
 */

const LOOKS_LIKE_MIN_MAX =
  /[\d.,\s万円千万]+\s*[-–—~〜～]\s*[\d.,\s万円千万]+/u;

/**
 * @param {string} [value]
 * @returns {string}
 */
export function formatSalaryValueWithJlptIfRange(value) {
  const s = String(value ?? '').trim();
  if (!s) return s;
  if (/\bJLPT\s*$/i.test(s)) return s;
  if (!LOOKS_LIKE_MIN_MAX.test(s)) return s;
  return `${s} JPY`;
}
