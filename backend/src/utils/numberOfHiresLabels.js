/**
 * Đồng bộ với frontend/src/utils/numberOfHiresOptions.js — hiển thị JD/PDF đúng ngôn ngữ.
 */

const LABELS = {
  '01': { vi: '01', en: '01', jp: '01' },
  '02': { vi: '02', en: '02', jp: '02' },
  '03': { vi: '03', en: '03', jp: '03' },
  '04': { vi: '04', en: '04', jp: '04' },
  '05': { vi: '05', en: '05', jp: '05' },
  under10: { vi: 'Dưới 10 người', en: 'Fewer than 10 people', jp: '10名未満' },
  '10to20': { vi: 'Từ 10~20 người', en: '10–20 people', jp: '10～20名' },
  over20: { vi: 'Trên 20 người', en: 'More than 20 people', jp: '20名超' },
  unlimited: { vi: 'Không giới hạn', en: 'No upper limit', jp: '募集人数の上限なし' },
};

const OPTION_VALUES = new Set([
  '01', '02', '03', '04', '05',
  'under10', '10to20', 'over20', 'unlimited',
]);

const LEGACY_VI_TO_CANONICAL = {
  'Dưới 10 người': 'under10',
  'Từ 10~20 người': '10to20',
  'Trên 20 người': 'over20',
  'Không giới hạn': 'unlimited',
};

export function normalizeNumberOfHiresStored(raw) {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return '';
  if (LEGACY_VI_TO_CANONICAL[s]) return LEGACY_VI_TO_CANONICAL[s];
  if (OPTION_VALUES.has(s)) return s;
  if (/^[1-5]$/.test(s)) return `0${s}`;
  return s;
}

/**
 * @param {unknown} stored
 * @param {'vi'|'en'|'jp'} lang
 */
export function formatNumberOfHiresForLang(stored, lang) {
  const s = stored == null ? '' : String(stored).trim();
  if (!s) return '';
  const key = normalizeNumberOfHiresStored(s);
  const L = LABELS[key];
  if (L) {
    if (lang === 'en') return L.en;
    if (lang === 'jp') return L.jp;
    return L.vi;
  }
  return s;
}
