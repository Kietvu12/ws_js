/**
 * Cơ sở tính % hoa hồng (campaign / job_value percent) phải là thu nhập NĂM rõ ràng.
 * Không fallback sang type month/week/day hoặc parse mơ hồ từ HTML — tránh dùng nhầm
 * "220000 - 500000" (lương tháng ¥) làm "năm" rồi bơm sai quy mô.
 */

export function isSalaryRangeYearType(sr) {
  if (!sr) return false;
  const t = (sr.type || '').toLowerCase().trim();
  const tjp = (sr.typeJp || sr.type_jp || '').trim();
  const tjpLower = tjp.toLowerCase();
  if (t === 'year' || t === 'năm' || t === 'yearly') return true;
  if (tjp === '年' || tjpLower === 'year') return true;
  return false;
}

/** Dòng salary_ranges đầu tiên có type = năm; không có thì null */
export function findYearSalaryRangeRow(salaryRanges) {
  if (!Array.isArray(salaryRanges) || salaryRanges.length === 0) return null;
  return salaryRanges.find(isSalaryRangeYearType) ?? null;
}

export function yearSalaryRangeStringForCommission(salaryRanges) {
  const row = findYearSalaryRangeRow(salaryRanges);
  if (!row) return '';
  return row.salaryRange ?? row.salary_range ?? '';
}
