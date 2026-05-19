/**
 * Hiển thị hồ sơ tham chiếu khi duplicate_with_cv_id (admin list/detail).
 */

export function getDuplicateWithCvId(candidate) {
  const v = candidate?.duplicateWithCvId ?? candidate?.duplicate_with_cv_id;
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @param {object} candidate — một dòng CV từ API (có thể có duplicateWithCv)
 * @returns {{ dupId: number, profileLabel: string, tooltip: string } | null}
 */
export function formatDuplicateWithCvRef(candidate) {
  const dupId = getDuplicateWithCvId(candidate);
  if (!dupId) return null;
  const ref = candidate?.duplicateWithCv;
  const profileLabel = (ref?.name || ref?.code || '').trim() || `#${dupId}`;
  const tooltip = `${profileLabel} (#${dupId})`;
  return { dupId, profileLabel, tooltip };
}
