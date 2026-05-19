/**
 * API có thể trả jobCommissionType (camel) hoặc job_commission_type (snake).
 * Nếu chỉ đọc một kiểu, job percent bị coi nhầm là fixed → % campaign không áp vào effectivePercent (list 30% / detail 40%).
 */
export function normalizeJobCommissionType(job) {
  const raw = job?.jobCommissionType ?? job?.job_commission_type ?? 'fixed';
  const s = String(raw).toLowerCase();
  if (s === 'percent' || s === 'percentage') return 'percent';
  return 'fixed';
}

/**
 * Lấy % campaign từ job: duyệt mọi dòng job_campaigns (không chỉ [0] — thứ tự JOIN có thể
 * khiến phần tử đầu không có object campaign/percent dù job vẫn thuộc campaign).
 */
export function resolveCampaignPercentFromJob(job) {
  const rows = job?.jobCampaigns ?? job?.job_campaigns ?? [];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  for (const jc of rows) {
    if (!jc) continue;
    const c = jc.campaign ?? jc.Campaign;
    const raw = c != null ? c.percent : null;
    if (raw == null || raw === '') continue;
    const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : parseFloat(String(raw));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

const tidOf = (jv) => Number(jv?.typeId ?? jv?.id_typename ?? jv?.type?.id ?? 0);
const vidOf = (jv) => Number(jv?.valueId ?? jv?.valueRef?.id ?? 0);
const tnameOf = (jv) => String(jv?.type?.typename || '').toLowerCase();

/**
 * Dòng job_values dùng để suy % phí / campaign — không dùng phần tử [0] vì filter có cả JLPT (type 1)
 * thường đứng trước dòng phí (type 2) → nhầm value 30 (JLPT) thay vì % campaign 40.
 */
export function pickPrimaryCommissionJobValue(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const v34 = rows.find((jv) => vidOf(jv) === 34);
  if (v34) return v34;
  const feeRow = rows.find(
    (jv) =>
      tidOf(jv) === 2 ||
      tnameOf(jv) === 'phí' ||
      tnameOf(jv) === 'commission' ||
      vidOf(jv) === 6 ||
      vidOf(jv) === 7
  );
  if (feeRow) return feeRow;
  const jlptTier = rows.find((jv) => tidOf(jv) === 3 || tidOf(jv) === 4);
  if (jlptTier) return jlptTier;
  return rows[0];
}
