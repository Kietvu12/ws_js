/**
 * Khóa layout bảng — phải trùng với backend `cvTemplateHtml.js` (openFixedTable / L).
 * Format: `${template}::${tab}::${tableId}`
 */
export function cvLayoutKey(cvTemplate, tab, tableId) {
  return `${cvTemplate}::${tab}::${tableId}`;
}

/** common */
export const CV_LAYOUT_COMMON_RIREKISHO = {
  personalMain: 'personalMain',
  eduWorkCert: 'eduWorkCert',
  station: 'station',
  residence: 'residence',
  prHobby: 'prHobby',
  motivation: 'motivation',
  wish: 'wish',
};
export const CV_LAYOUT_COMMON_SHOKUMU = {
  workHistory: 'workHistory',
  cert: 'cert',
};

/** cv_it | cv_technical — rirekisho */
export const CV_LAYOUT_IT_RIREKISHO = {
  personalGrid: 'personalGrid',
  education: 'education',
  languages: 'languages',
  certificates: 'certificates',
  employment: 'employment',
  itFooter: 'itFooter',
};
/** cv_technical only */
export const CV_LAYOUT_TECHNICAL_RIREKISHO = {
  tools: 'tools',
};

/** shokumu IT / Technical */
export const CV_LAYOUT_SHOKUMU = {
  summary: 'summary',
  workGrid: (idx) => `workGrid:${idx}`,
  cert: 'cert',
};
