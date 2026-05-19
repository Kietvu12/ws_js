/**
 * Có tiêu chí tìm job thực sự (khác mặc định rỗng) — dùng khi khôi phục session / tránh gọi list sai.
 */
export function hasActiveAgentJobSearchCriteria(f) {
  if (!f || typeof f !== 'object') return false;
  if (String(f.keyword ?? '').trim()) return true;
  if (Array.isArray(f.locations) && f.locations.length > 0) return true;
  if (Array.isArray(f.fieldIds) && f.fieldIds.length > 0) return true;
  if (Array.isArray(f.jobTypeIds) && f.jobTypeIds.length > 0) return true;
  if (Array.isArray(f.sectorNames) && f.sectorNames.length > 0) return true;
  if (f.recruitmentLocation !== '' && f.recruitmentLocation != null) return true;
  if (f.employmentType != null && f.employmentType !== '') return true;
  if (f.age != null && f.age !== '') return true;
  if (f.salaryMin !== '' && f.salaryMin != null) return true;
  if (f.salaryMax !== '' && f.salaryMax != null) return true;
  if (Array.isArray(f.highlights) && f.highlights.length > 0) return true;
  const b = f.booleans || {};
  if (b.noExperienceOk || b.underOneYearOk || b.graduatingSoonOk || b.remoteOk) return true;
  return false;
}

/**
 * Admin JobsListPage: công ty nguồn / campaign / trạng thái — không nằm trong `filters` của form tìm kiếm.
 */
export function hasAdminJobsToolbarListContext(ctx) {
  if (!ctx || !ctx.useAdminAPI) return false;
  const c = ctx.adminCompanyId;
  if (c != null && String(c).trim() !== '') return true;
  if (ctx.adminHasCampaign) return true;
  const st = ctx.adminJobStatus;
  if (st != null && String(st).trim() !== '') return true;
  return false;
}
