import {
  EXPERIENCE_YEARS_OPTIONS,
  JAPANESE_LEVEL_OPTIONS,
  DRIVER_LICENSE_OPTIONS,
} from './requirementPresetOptions.js';

/** Extra VI labels for commission tiers (not in JD requirement presets). */
const EXTRA_VI_PRESETS = [
  {
    vi: 'D\u1eef\u1edbi 3 n\u0103m kinh nghi\u1ec7m',
    en: 'Under 3 years of experience',
    jp: '3\u5e74\u672a\u6e80\u306e\u7d4c\u9a13',
  },
];

const PRESET_BY_VI = new Map();
for (const row of [
  ...EXPERIENCE_YEARS_OPTIONS,
  ...JAPANESE_LEVEL_OPTIONS,
  ...DRIVER_LICENSE_OPTIONS,
  ...EXTRA_VI_PRESETS,
]) {
  const k = String(row.vi || '').trim();
  if (k) PRESET_BY_VI.set(k, row);
}

/**
 * @param {string} lang - 'vi' | 'en' | 'ja' | 'jp'
 * @param {object} [valueRef]
 */
export function localizedJobValueLabel(lang, valueRef) {
  const l = lang === 'jp' ? 'ja' : lang;
  const ref = valueRef || {};
  const viRaw = ref.valuename ?? ref.valuename_vi ?? '';
  const vi = String(viRaw).trim();
  const en = ref.valuenameEn ?? ref.valuename_en ?? '';
  const jp = ref.valuenameJp ?? ref.valuename_jp ?? '';

  if (l === 'en') {
    if (en) return String(en);
    const row = PRESET_BY_VI.get(vi);
    if (row?.en) return row.en;
    return vi;
  }
  if (l === 'ja') {
    if (jp) return String(jp);
    const row = PRESET_BY_VI.get(vi);
    if (row?.jp) return row.jp;
    if (en) return String(en);
    return vi;
  }
  return vi || String(en || jp || '');
}
