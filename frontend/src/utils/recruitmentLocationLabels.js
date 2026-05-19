/**
 * Trường jobs.interview_location — hiển thị là «Địa điểm tuyển dụng» (4 giá trị 1–4).
 */

const LABELS = {
  vi: {
    1: 'Từ Việt Nam',
    2: 'Tại Nhật Bản',
    3: 'Tại Nhật Bản và nước ngoài',
    4: 'Từ nước ngoài',
  },
  en: {
    1: 'From Vietnam',
    2: 'From Japan',
    3: 'In Japan and overseas',
    4: 'From overseas',
  },
  ja: {
    1: 'ベトナムから',
    2: '日本から',
    3: '日本と海外',
    4: '海外から',
  },
};

/** @param {'vi'|'en'|'ja'|'jp'} lang */
export function getRecruitmentLocationLabel(loc, lang) {
  const n = loc === null || loc === undefined || loc === '' ? NaN : parseInt(String(loc), 10);
  if (!Number.isFinite(n) || n < 1 || n > 4) return '';
  const langNorm = lang === 'jp' ? 'ja' : lang;
  const L = langNorm === 'en' ? LABELS.en : langNorm === 'ja' ? LABELS.ja : LABELS.vi;
  return L[n] || '';
}

/** AddJobPage: languageTab là 'vi' | 'en' | 'jp' */
export function recruitmentLocationLangFromFormTab(languageTab) {
  if (languageTab === 'en') return 'en';
  if (languageTab === 'jp' || languageTab === 'ja') return 'ja';
  return 'vi';
}
