/**
 * Nhãn tiếng Nhật cho 在留資格 / 日本滞在目的 trên template CV (IT, Technical).
 * value đồng bộ với RESIDENCE_STATUS_OPTIONS trong AddCandidateForm.
 */
export const JP_RESIDENCE_STATUS_JA = {
  '1': '技術・人文知識・国際業務',
  '2': '特定技能',
  '3': '留学',
  '4': '永住者',
  '5': '日本人の配偶者等',
  '6': '定住者',
  '7': '不要',
  '8': '高度専門職',
  '9': '技能',
  '10': '家族滞在',
  '11': '短期滞在',
  '12': '企業内転勤',
  '13': '興行',
  '14': '技能実習',
  '15': '永住者の配偶者等',
};

/** @param {string|number|null|undefined} value */
export function formatJpResidenceStatusForCvTemplate(value) {
  if (value == null || value === '') return '';
  const key = String(value).trim();
  return JP_RESIDENCE_STATUS_JA[key] || key;
}
