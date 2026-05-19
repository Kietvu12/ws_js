/**
 * HTML template cho CV Rirekisho (履歴書) và Shokumu (職務経歴書)
 * Dùng để generate PDF từ dữ liệu CV
 */

import {
  parseApiDateToYearMonth,
  splitWorkPeriodRange,
  formatShokumuPeriodRangeJa,
  formatShokumuPeriodCell,
  formatCvYearMonthJa,
  formatCvBirthDateJa,
  formatCvAnyDateJa,
  formatCvDocumentDateDisplay,
} from './cvJpDateDisplay.js';

/** Đồng bộ value số với RESIDENCE_STATUS_OPTIONS (AddCandidateForm). */
const JPRESIDENCE_LABELS = {
  1: '技術・人文知識・国際業務',
  2: '特定技能',
  3: '留学',
  4: '永住者',
  5: '日本人の配偶者等',
  6: '定住者',
  7: '不要',
  8: '高度専門職',
  9: '技能',
  10: '家族滞在',
  11: '短期滞在',
  12: '企業内転勤',
  13: '興行',
  14: '技能実習',
  15: '永住者の配偶者等',
};

/** 有/無 — chấp nhận 1/0, true/false, yes/no từ DB hoặc form. */
function yesNoJa(value) {
  if (value == null || value === '') return '';
  if (value === '有' || value === '無') return value;
  if (value === 1 || value === '1' || value === true) return '有';
  if (value === 0 || value === '0' || value === false) return '無';
  const s = String(value).trim().toLowerCase();
  if (s === 'yes' || s === 'y') return '有';
  if (s === 'no' || s === 'n') return '無';
  return String(value);
}

/** YYYY-MM-DD for template; empty if unparseable (avoids RangeError from toISOString). */
function toDateOnlyString(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/**
 * Chuẩn hóa dữ liệu CV từ backend model sang format template
 */
export function normalizeCvForTemplate(cv) {
  const raw = cv?.dataValues || cv || {};
  const genderVal = raw.gender;
  const gender = genderVal === 1 ? '男' : genderVal === 2 ? '女' : '';
  const hasSpouseVal = raw.hasSpouse ?? raw.spouse;
  const hasSpouse = (hasSpouseVal === '有' || hasSpouseVal === '無') ? hasSpouseVal : (hasSpouseVal === 1 || hasSpouseVal === '1' ? '有' : (hasSpouseVal === 0 || hasSpouseVal === '0' ? '無' : ''));
  const spouseDependent = raw.spouseDependent === 1 || raw.spouseDependent === '1' ? '有' : (raw.spouseDependent === 0 || raw.spouseDependent === '0' ? '無' : '');
  const currentSalary = raw.currentIncome != null ? `${raw.currentIncome}万円` : (raw.currentSalary || '');
  const desiredSalary = raw.desiredIncome != null ? `${raw.desiredIncome}万円` : (raw.desiredSalary || '');
  const desiredLocation = raw.desiredWorkLocation || raw.desiredLocation || '';
  const desiredStartDate = raw.nyushaTime || raw.desiredStartDate || '';
  const visaDate = raw.visaExpirationDate;
  const visaStr = visaDate ? toDateOnlyString(visaDate) : '';
  const birthStr = raw.birthDate ? toDateOnlyString(raw.birthDate) : '';
  const dependentsCount = raw.dependentsCount != null ? String(raw.dependentsCount) : '';

  return {
    nameKanji: raw.name || raw.nameKanji || '',
    nameKana: raw.furigana || raw.nameKana || '',
    gender,
    birthDate: birthStr,
    age: raw.ages || raw.age || '',
    phone: raw.phone || '',
    postalCode: raw.postalCode || '',
    passport: yesNoJa(raw.passport),
    skypeId: raw.skypeId != null ? String(raw.skypeId) : '',
    address: raw.addressCurrent || raw.address || '',
    email: raw.email || '',
    addressOrigin: raw.addressOrigin || '',
    addressFurigana: raw.addressFurigana || '',
    contactFurigana: raw.contactFurigana || '',
    // 現住所の最寄り駅: ưu tiên schema mới rirekisho.nearest_station (1 chuỗi),
    // fallback về các field cũ nếu có.
    nearestStationName: raw.nearest_station || raw.nearestStationName || (raw.nearestStationLine || ''),
    dependentsCount,
    hasSpouse,
    spouseDependent,
    jpResidenceStatus: JPRESIDENCE_LABELS[raw.jpResidenceStatus] || raw.jpResidenceStatus || '',
    stayPurpose: raw.stayPurpose || raw.stay_purpose || '',
    jpConversationLevel: raw.jpConversationLevel || raw.jp_conversation_level || '',
    enConversationLevel: raw.enConversationLevel || raw.en_conversation_level || '',
    otherConversationLevel: raw.otherConversationLevel || raw.other_conversation_level || '',
    visaExpirationDate: visaStr,
    currentSalary,
    desiredSalary,
    desiredPosition: raw.desiredPosition || '',
    desiredLocation,
    desiredStartDate,
    cvDocumentDate: raw.cvDocumentDate || '',
    careerSummary: raw.careerSummary || '',
    strengths: raw.strengths || '',
    notes: raw.notes || raw.remarks || '',
    hobbiesSpecialSkills: raw.hobbiesOrSpecialSkills || raw.hobbiesSpecialSkills || '',
    motivation: raw.motivation || '',
    jlptLevel: raw.jlptLevel != null ? String(raw.jlptLevel) : '',
    jlptAcquiredYear: raw.jlptAcquiredYear != null ? String(raw.jlptAcquiredYear) : '',
    jlptAcquiredMonth: raw.jlptAcquiredMonth != null ? String(raw.jlptAcquiredMonth) : '',
    toeicScore: raw.toeicScore != null ? String(raw.toeicScore) : '',
    toeicYear: raw.toeicYear != null ? String(raw.toeicYear) : '',
    toeicMonth: raw.toeicMonth != null ? String(raw.toeicMonth) : '',
    ieltsScore: raw.ieltsScore != null ? String(raw.ieltsScore) : '',
    ieltsYear: raw.ieltsYear != null ? String(raw.ieltsYear) : '',
    ieltsMonth: raw.ieltsMonth != null ? String(raw.ieltsMonth) : '',
    drivingLicenseYear: raw.drivingLicenseYear != null ? String(raw.drivingLicenseYear) : '',
    drivingLicenseMonth: raw.drivingLicenseMonth != null ? String(raw.drivingLicenseMonth) : '',
    experienceYears: raw.experienceYears != null ? String(raw.experienceYears) : '',
    specialization: raw.specialization != null ? String(raw.specialization) : '',
    qualification: raw.qualification != null ? String(raw.qualification) : '',
    hasDrivingLicense: raw.hasDrivingLicense != null ? String(raw.hasDrivingLicense) : '',
    technicalSkills: raw.technicalSkills || '',
    learnedTools: (() => {
      try { return Array.isArray(raw.learnedTools) ? raw.learnedTools : (raw.learnedTools ? (typeof raw.learnedTools === 'string' ? JSON.parse(raw.learnedTools) : []) : []); } catch { return []; }
    })(),
    experienceTools: (() => {
      try { return Array.isArray(raw.experienceTools) ? raw.experienceTools : (raw.experienceTools ? (typeof raw.experienceTools === 'string' ? JSON.parse(raw.experienceTools) : []) : []); } catch { return []; }
    })(),
    toolsSoftwareNotes: (() => {
      try {
        const v = raw.toolsSoftwareNotes;
        if (!v) return {};
        return typeof v === 'string' ? (v ? JSON.parse(v) : {}) : (v || {});
      } catch { return {}; }
    })(),
    educations: (() => {
      try { return Array.isArray(raw.educations) ? raw.educations : (raw.educations ? (typeof raw.educations === 'string' ? JSON.parse(raw.educations) : []) : []); } catch { return []; }
    })(),
    workExperiences: (() => {
      try { return Array.isArray(raw.workExperiences) ? raw.workExperiences : (raw.workExperiences ? (typeof raw.workExperiences === 'string' ? JSON.parse(raw.workExperiences) : []) : []); } catch { return []; }
    })(),
    certificates: (() => {
      try { return Array.isArray(raw.certificates) ? raw.certificates : (raw.certificates ? (typeof raw.certificates === 'string' ? JSON.parse(raw.certificates) : []) : []); } catch { return []; }
    })(),
    cvTableLayout: (() => {
      const v = raw.cvTableLayout;
      if (v == null) return {};
      if (typeof v === 'object' && !Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try {
          const t = v.trim();
          return t ? JSON.parse(t) : {};
        } catch {
          return {};
        }
      }
      return {};
    })(),
    /** Cùng nguồn với cvTableLayout.rirekishoOptionalContactBlockVisible — ẩn khối 連絡先 tùy chọn ở 履歴書. */
    rirekishoOptionalContactBlockVisible: (() => {
      const v = raw.cvTableLayout;
      if (v == null) return true;
      let o = {};
      if (typeof v === 'object' && !Array.isArray(v)) o = v;
      else if (typeof v === 'string') {
        try {
          const t = v.trim();
          o = t ? JSON.parse(t) : {};
        } catch {
          o = {};
        }
      }
      return o.rirekishoOptionalContactBlockVisible !== false;
    })(),
  };
}

function parseCvTableLayoutJson(v) {
  if (v == null) return {};
  if (typeof v === 'object' && !Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const t = v.trim();
      return t ? JSON.parse(t) : {};
    } catch {
      return {};
    }
  }
  return {};
}

function mergeCvTableLayoutMaps(stored, options) {
  return { ...parseCvTableLayoutJson(stored), ...parseCvTableLayoutJson(options) };
}

function normalizePctArray(arr, n) {
  if (!Array.isArray(arr) || arr.length !== n) return null;
  const nums = arr.map((x) => (typeof x === 'number' && !Number.isNaN(x) ? Math.max(0.01, x) : null));
  if (nums.some((x) => x == null)) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;
  return nums.map((x) => (x / sum) * 100);
}

function layoutColsLM(map, key, defaults) {
  const entry = map[key];
  const got = normalizePctArray(entry?.cols, defaults.length);
  if (got) return got;
  return defaults;
}

function colgroupHtml(pcts) {
  if (!pcts?.length) return '';
  return `<colgroup>${pcts.map((p) => `<col style="width:${Number(p).toFixed(4)}%" />`).join('')}</colgroup>`;
}

/** Mở <table> với table-layout:fixed + colgroup theo layout đã lưu. tableClass: vd. avoid-break (cả bảng không tách trang) */
function openFixedTable(map, key, defaults, extraStyle = '', tableClass = '') {
  const cols = layoutColsLM(map, key, defaults);
  const base = 'table-layout:fixed;border-collapse:collapse;width:100%';
  const cls = tableClass ? ` class="${tableClass}"` : '';
  return `<table${cls} style="${base};${extraStyle}">${colgroupHtml(cols)}`;
}

function esc(s) {
  if (s == null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function orBlank(s) {
  return s != null && String(s).trim() ? esc(String(s).trim()) : '　';
}

/** 期間 hiển thị PDF — cùng logic form (～, khoảng trắng 年 月). */
function orPeriodCell(raw) {
  const t = formatShokumuPeriodCell(String(raw || '')) || String(raw || '').trim();
  return t ? esc(t) : '　';
}

function formatWorkPeriodRangeFromEmp(emp = {}) {
  const startRaw = emp.start_date || [emp.startYear, emp.startMonth].filter(Boolean).join('/');
  const endRaw = emp.endCurrent ? '現在' : (emp.end_date || [emp.endYear, emp.endMonth].filter(Boolean).join('/'));
  return formatShokumuPeriodRangeJa(startRaw, endRaw) || emp.period || '';
}

function skillsSection(d) {
  const parts = [];
  if (d.technicalSkills && d.technicalSkills.trim()) parts.push(esc(d.technicalSkills.trim()));
  const learned = (d.learnedTools || []).filter(Boolean);
  if (learned.length) parts.push(`【学習】${learned.map(esc).join('、')}`);
  const exp = (d.experienceTools || []).filter(Boolean);
  if (exp.length) parts.push(`【経験】${exp.map(esc).join('、')}`);
  return parts.join('\n') || '　';
}

// Noto Serif JP: font web hỗ trợ tiếng Nhật + Latin (trên server Linux không cần cài font). Fallback sang font Mincho trên Windows/macOS.
const FONT_MINCHO = "'Noto Serif JP','MS Mincho','MS PMincho','Yu Mincho','Hiragino Mincho ProN',serif";
const CV_BORDER_COLOR = '#111827';
const HTML_HEAD = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 10mm; }
html { box-sizing: border-box; }
*, *::before, *::after { box-sizing: inherit; }
html,body{font-family:${FONT_MINCHO};font-size:11px;color:#1f2937;margin:0;padding:0;line-height:1.4}
body, table, td, th {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body {
  background: #ffffff;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}
table{
  border-collapse:collapse;
  border-spacing: 0;
  width:100%;
  max-width:100%;
}
/* Đồng nhất màu viền nét liền, tránh lệch tông giữa các viewer PDF */
table td, table th {
  border-color: ${CV_BORDER_COLOR};
}
/* Ô bị tách khi sang trang PDF/in: lặp lại viền đóng từng mảnh (tránh hở viền giữa trang) */
td, th {
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}
/* Mỗi .cv-sheet = một tờ A4 riêng (trang 1, trang 2…); tab "all" = 2 khối xếp chồng */
.cv-sheet {
  /* Tránh tràn ngang: A4 (210mm) trừ 2 lề PDF 10mm = 190mm */
  width: 190mm;
  max-width: 100%;
  padding: 12mm;
  box-sizing: border-box;
  min-height: 297mm;
  background-color: #ffffff;
  box-shadow: none;
}
.avoid-break{page-break-inside:avoid;break-inside:avoid}
/* Mọi bảng trong tờ CV (.cv-sheet): mọi template/tab — tránh tách ngang hàng; ô vẫn đóng viền khi bắt buộc tách trong ô */
@media print {
  html, body {
    width: 190mm !important;
    max-width: 190mm !important;
    overflow: visible !important;
  }
  .cv-sheet .avoid-break tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  td, th {
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  body {
    background: #fff !important;
    padding: 0 !important;
    display: block !important;
    gap: 0 !important;
  }
  .cv-sheet {
    width: 100% !important;
    max-width: 100% !important;
    min-height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    page-break-after: always !important;
    break-after: page !important;
  }
  .cv-sheet:last-of-type {
    page-break-after: auto !important;
    break-after: auto !important;
  }
}
</style></head><body>`;

const HTML_SHEET_OPEN = '<div class="cv-sheet">';
const HTML_SHEET_CLOSE = '</div>';
const HTML_FOOT = '</body></html>';

/**
 * Tạo HTML đầy đủ (Rirekisho + Shokumu) hoặc chỉ 1 tab cho PDF
 * @param {Object} cv - CV model hoặc plain object
 * @param {Object} options - { avatarDataUrl, cvTemplate, tab: 'rirekisho'|'shokumu'|'all' } tab: chỉ xuất tab đó; 'all' = cả 2 tab
 */
export function generateCvTemplateHtml(cv, options = {}) {
  const d = typeof cv === 'object' && (cv.dataValues || cv) ? normalizeCvForTemplate(cv) : cv;

  const cvTemplate = options.cvTemplate || 'common'; // common | cv_it | cv_technical (đồng bộ form; sau có thể tách layout theo template)
  const tab = options.tab || 'all'; // 'rirekisho' | 'shokumu' | 'all'
  const avatarDataUrl = options.avatarDataUrl || '';
  const avatarPlaceholderDataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const layoutPrefix = cvTemplate === 'cv_technical' ? 'cv_technical' : cvTemplate === 'cv_it' ? 'cv_it' : 'common';
  const layoutMap = mergeCvTableLayoutMaps(d.cvTableLayout, options.cvTableLayout);
  const L = (tabPart, tableId) => `${layoutPrefix}::${tabPart}::${tableId}`;
  const now = new Date();
  const nowStr = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日現在`;
  const documentDateDisplay = d.cvDocumentDate
    ? esc(formatCvDocumentDateDisplay(String(d.cvDocumentDate)))
    : nowStr;

  const birthFormatted = d.birthDate ? (() => {
    const jp = formatCvBirthDateJa(d.birthDate);
    const body = jp || esc(String(d.birthDate).trim());
    return `${body}生（満 ${d.age || '－'} 歳）`;
  })() : '　　年　　月　　日生（満　　歳）';
  const visaFormatted = d.visaExpirationDate
    ? `西暦${formatCvAnyDateJa(d.visaExpirationDate)}`
    : '西暦　　年　　月　　日';

  // Số dòng theo dữ liệu (tối thiểu 1), khớp form Rirekisho
  const eduCount = Math.max(1, (d.educations || []).length);
  const workCount = Math.max(1, (d.workExperiences || []).length);
  const certCount = Math.max(1, (d.certificates || []).length);

  // 学歴 (template chung): mỗi education -> 2 dòng (入学 / 卒業) giống form preview
  const eduRows = Array.from({ length: eduCount }, (_, i) => {
    const edu = (d.educations || [])[i];
    if (!edu) {
      return `<tr><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">　</td><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">　</td><td style="border:1px solid #1f2937;padding:4px;padding-left:8px">　</td></tr>`;
    }
    const base = edu.content || [edu.school_name, edu.major].filter(Boolean).join(' / ') || '';
    const startLabel = base ? `${base} 入学` : '';
    const endLabel = base ? `${base} 卒業` : '';
    const startRow = `<tr><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">${orBlank(edu.year)}</td><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">${orBlank(edu.month)}</td><td style="border:1px solid #1f2937;padding:4px;padding-left:8px">${esc(startLabel)}</td></tr>`;
    const endRow = `<tr><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">${orBlank(edu.endYear)}</td><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">${orBlank(edu.endMonth)}</td><td style="border:1px solid #1f2937;padding:4px;padding-left:8px">${esc(endLabel)}</td></tr>`;
    return startRow + endRow;
  }).join('');

  const workRows = Array.from({ length: workCount }, (_, i) => {
    const emp = (d.workExperiences || [])[i];
    if (!emp) {
      return `<tr><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">　</td><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">　</td><td style="border:1px solid #1f2937;padding:4px;padding-left:8px">　</td></tr>`;
    }
    const startYm = formatCvYearMonthJa(emp.startYear || parseApiDateToYearMonth(splitWorkPeriodRange(formatWorkPeriodRangeFromEmp(emp) || emp.period || '')[0]).year, emp.startMonth || parseApiDateToYearMonth(splitWorkPeriodRange(formatWorkPeriodRangeFromEmp(emp) || emp.period || '')[0]).month) || '';
    const endYm = emp.endCurrent ? '現在に至る' : (formatCvYearMonthJa(emp.endYear, emp.endMonth) || '　');
    const company = (emp.company_name || '').replace(/\s*(退社|入社)\s*$/g, '').trim() || '　';
    return `<tr><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">${esc(startYm || '　')}</td><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">${esc(endYm || '　')}</td><td style="border:1px solid #1f2937;padding:4px;padding-left:8px">${esc(company)}</td></tr>`;
  }).join('');

  const certRows = Array.from({ length: certCount }, (_, i) => {
    const cert = (d.certificates || [])[i];
    return `<tr><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">${orBlank(cert?.year)}</td><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">${orBlank(cert?.month)}</td><td style="border:1px solid #1f2937;padding:4px;padding-left:8px">${orBlank(cert?.name)}</td></tr>`;
  }).join('');

  const workExpsRaw = (d.workExperiences && d.workExperiences.length) ? d.workExperiences : [{ period: '', company_name: '', business_purpose: '', scale_role: '', description: '', tools_tech: '' }];
  // Gộp cặp 入社/退社 thành 1 item (cho Shokumu IT/Technical khi form gửi expanded)
  const workExps = (() => {
    const list = workExpsRaw;
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const w = list[i] || {};
      const cn = (w.company_name || '').trim();
      if (cn.endsWith(' 入社')) {
        const next = list[i + 1] || {};
        const nextCn = (next.company_name || '').trim();
        const companyName = cn.replace(/\s*入社\s*$/, '').trim();
        if (nextCn.endsWith(' 退社') && nextCn.replace(/\s*退社\s*$/, '').trim() === companyName) {
          out.push({
            period: w.period || next.period || '',
            company_name: companyName,
            position_name: w.position_name || next.position_name || w.positionName || next.positionName || w.role || next.role || w.jobTitle || next.jobTitle || '',
            location: w.location || next.location || w.workLocation || next.workLocation || w.work_location || next.work_location || '',
            business_purpose: w.business_purpose || next.business_purpose || '',
            scale_role: w.scale_role || next.scale_role || '',
            description: w.description || next.description || '',
            tools_tech: w.tools_tech || next.tools_tech || '',
            roleCheckboxes: Array.isArray(w.roleCheckboxes) ? w.roleCheckboxes : [],
            processCheckboxes: Array.isArray(w.processCheckboxes) ? w.processCheckboxes : [],
          });
          i++;
          continue;
        }
      }
      if (cn.endsWith(' 退社')) {
        out.push({
          ...w,
          company_name: cn.replace(/\s*退社\s*$/, '').trim(),
          position_name: w.position_name || w.positionName || w.role || w.jobTitle || '',
          location: w.location || w.workLocation || w.work_location || '',
          roleCheckboxes: w.roleCheckboxes || [],
          processCheckboxes: w.processCheckboxes || [],
        });
        continue;
      }
      out.push({
        ...w,
        company_name: cn || w.company_name,
        position_name: w.position_name || w.positionName || w.role || w.jobTitle || '',
        location: w.location || w.workLocation || w.work_location || '',
        roleCheckboxes: w.roleCheckboxes || [],
        processCheckboxes: w.processCheckboxes || [],
      });
    }
    return out.length ? out : [{ period: '', company_name: '', business_purpose: '', scale_role: '', description: '', tools_tech: '' }];
  })();
  const workCountShokumu = Math.max(1, workExps.length);
  const workExpsPadded = Array.from({ length: workCountShokumu }, (_, i) => workExps[i] || { period: '', company_name: '', business_purpose: '', scale_role: '', description: '', tools_tech: '' });
  const shokumuBlocks = `${openFixedTable(layoutMap, L('shokumu', 'workHistory'), [65, 35], 'border:1px solid #1f2937;overflow:hidden;font-size:11px;color:#1f2937')}
<tbody>${workExpsPadded.map((emp, i) => {
    const isLast = i === workExpsPadded.length - 1;
    const bb = '1px solid #1f2937';
    const bbLast = isLast ? 'none' : '1px solid #1f2937';
    return `
    <tr>
      <td style="border:1px solid #1f2937;border-bottom:${bbLast};padding:6px 8px;font-size:12px;background:#f3f4f6;vertical-align:top">${esc(formatWorkPeriodRangeFromEmp(emp) || orPeriodCell(emp.period) || '20xx 年 xx 月～20xx 年 xx 月')}</td>
      <td style="border:1px solid #1f2937;border-bottom:${bbLast};padding:6px 8px;font-size:12px;background:#f3f4f6;vertical-align:top">${orBlank(emp.company_name)}</td>
    </tr>
    <tr>
      <td style="border:1px solid #1f2937;padding:4px 8px;font-size:10px;color:#374151;background:#d1d5db">【事業目的】</td>
      <td style="border:1px solid #1f2937;padding:4px 8px;font-size:10px;color:#374151;background:#d1d5db;text-align:right">規模 / 役割</td>
    </tr>
    <tr>
      <td style="border:1px solid #1f2937;border-bottom:${bb};border-right:1px dotted #1f2937;padding:8px;vertical-align:top;min-width:0">
        <div style="font-size:12px;white-space:pre-wrap;min-height:2em;margin-bottom:8px">${orBlank(emp.business_purpose)}</div>
        <div style="font-size:10px;color:#4b5563;margin-bottom:2px">【業務内容】</div>
        <div style="font-size:12px;white-space:pre-wrap;min-height:2em;margin-bottom:8px">${orBlank(emp.description)}</div>
        <div style="font-size:10px;color:#4b5563;margin-bottom:2px">【ツール】</div>
        <div style="font-size:12px;white-space:pre-wrap;min-height:1.5em">${orBlank(emp.tools_tech)}</div>
      </td>
      <td style="border:1px solid #1f2937;border-bottom:${bb};padding:8px;vertical-align:top">
        <div style="font-size:12px;white-space:pre-wrap;width:100%;min-height:4em">${orBlank(emp.scale_role)}</div>
      </td>
    </tr>`;
  }).join('')}</tbody></table>`;

  const certShokumuCount = (d.certificates || []).length;
  const certShokumuRows = Array.from({ length: certShokumuCount }, (_, i) => {
    const cert = (d.certificates || [])[i];
    const ymd = formatCvYearMonthJa(cert?.year, cert?.month);
    const dateStr = ymd ? `${esc(ymd)}取得` : 'xxxx 年 xx 月取得';
    return `<tr><td style="border:1px solid #1f2937;padding:6px;width:60%;vertical-align:top">${orBlank(cert?.name)}</td><td style="border:1px solid #1f2937;padding:6px;vertical-align:top;white-space:nowrap">${dateStr}</td></tr>`;
  }).join('');

  const skillsHtml = skillsSection(d);
  const showSkills = skillsHtml !== '　';
  const useItLayout = cvTemplate === 'cv_it' || cvTemplate === 'cv_technical';

  // Helper data cho layout IT/Technical (Rirekisho IT) – số dòng 職歴 theo workExperiences, mặc định 1 dòng
  const itWorkCount = Math.max(1, (d.workExperiences || []).length);
  const itWorkRows = Array.from({ length: itWorkCount }, (_, i) => {
    const w = (d.workExperiences || [])[i] || {};
    const startRaw = w.start_date || [w.startYear, w.startMonth].filter(Boolean).join('/');
    const endRaw = w.endCurrent ? '現在' : (w.end_date || [w.endYear, w.endMonth].filter(Boolean).join('/'));
    const period = formatShokumuPeriodRangeJa(startRaw, endRaw) || formatShokumuPeriodCell(w.period || '') || w.period || '';
    const companyName = (w.company_name || '').replace(/\s*入社\s*$|\s*退社\s*$/g, '').trim() || '';
    const employmentPlace = w.employmentPlace || w.employment_place || w.work_location || w.location || '';
    const companyRole = w.companyRole || w.company_role || w.position_role || w.position_name || w.position || '';
    return { period, company_name: companyName, description: companyRole, employmentPlace };
  });
  const toolsNotes = d.toolsSoftwareNotes || {};
  const toolsNotesLearned = toolsNotes.learned || {};
  const toolsNotesExp = toolsNotes.experienced || {};
  const learnedList = (d.learnedTools || []).filter(t => t != null);
  const expList = (d.experienceTools || []).filter(t => t != null);
  const toolsRowCount = Math.max(1, learnedList.length, expList.length);
  const toolsTableHtml = cvTemplate === 'cv_technical' ? `
  <!-- 使用可能ツール・ソフトウェア等枠 (CV Technical): dữ liệu từ 24 & 25, không checkbox, mỗi ô = [tên | ghi chú] -->
  ${openFixedTable(layoutMap, L('rirekisho', 'tools'), [12, 22, 22, 22, 22], 'font-size:10px;border:1px solid #1f2937;margin-top:8px')}
    <tr>
      <td rowspan="${toolsRowCount + 1}" style="border:1px solid #1f2937;padding:6px;text-align:center;vertical-align:middle;background:#e2efd9;width:5rem">使用可能ツール・ソフトウェア等枠</td>
      <td colspan="2" style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">学習したツール・ソフトウェア</td>
      <td colspan="2" style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">業務で利用したツール・ソフトウェア</td>
    </tr>
    ${Array.from({ length: toolsRowCount }).map((_, ri) => {
      const learnedName = learnedList[ri] ?? '';
      const expName = expList[ri] ?? '';
      const learnedDisplay = learnedName ? esc(learnedName) : '　';
      const expDisplay = expName ? esc(expName) : '　';
      const learnedKey = learnedName || `__learned_${ri}`;
      const expKey = expName || `__experienced_${ri}`;
      const noteLearned = toolsNotesLearned[learnedKey] ?? '';
      const noteExp = toolsNotesExp[expKey] ?? '';
      return `<tr>
        <td style="border:1px solid #1f2937;padding:4px;text-align:left;border-right:2px dotted #1f2937">${learnedDisplay}</td>
        <td style="border:1px solid #1f2937;padding:4px;text-align:center;min-width:2.5rem;border-left:2px dotted #1f2937">${orBlank(noteLearned)}</td>
        <td style="border:1px solid #1f2937;padding:4px;text-align:left;border-right:2px dotted #1f2937">${expDisplay}</td>
        <td style="border:1px solid #1f2937;padding:4px;text-align:center;min-width:2.5rem;border-left:2px dotted #1f2937">${orBlank(noteExp)}</td>
      </tr>`;
    }).join('')}
  </table>
` : '';
  const jlptDisplay = d.jlptLevel ? (String(d.jlptLevel).startsWith('N') ? String(d.jlptLevel) : 'N' + d.jlptLevel) : '';
  const fixedCertYm = (kind) => {
    if (kind === 'jlpt') return formatCvYearMonthJa(d.jlptAcquiredYear, d.jlptAcquiredMonth) || '';
    if (kind === 'toeic') return formatCvYearMonthJa(d.toeicYear, d.toeicMonth) || '';
    if (kind === 'ielts') return formatCvYearMonthJa(d.ieltsYear, d.ieltsMonth) || '';
    if (kind === 'driving') return formatCvYearMonthJa(d.drivingLicenseYear, d.drivingLicenseMonth) || '';
    return '';
  };
  const hasFixedCertData = (kind) => {
    if (kind === 'jlpt') return Boolean(jlptDisplay || fixedCertYm('jlpt'));
    if (kind === 'toeic') return Boolean(String(d.toeicScore || '').trim() || fixedCertYm('toeic'));
    if (kind === 'ielts') return Boolean(String(d.ieltsScore || '').trim() || fixedCertYm('ielts'));
    if (kind === 'driving') return Boolean(String(d.hasDrivingLicense || '').trim() || fixedCertYm('driving'));
    return false;
  };
  const certItVisibleRowCount = ['jlpt', 'toeic', 'ielts', 'driving'].filter(hasFixedCertData).length;
  const certItTitleRowSpan = certItVisibleRowCount + 1;
  const certItColPercents = [12, 8, 8, 8, 8, 8, 48];
  const labelColWidth = '14%'; // left section label column width (IT tables)
  /** 日本滞在目的 — đồng bộ 在留資格 từ form (không còn checkbox cố định). */
  const stayPurposeDisplay = d.jpResidenceStatus || d.stayPurpose || '';

  const convLabel = (val, value, display) => {
    const text = display || value;
    if (!val) return '□ ' + text;
    return val === value ? '■ ' + text : '□ ' + text;
  };

  const showRirekishoOptionalContactBlock = d.rirekishoOptionalContactBlockVisible !== false;
  const rirekishoOptContactTrs = showRirekishoOptionalContactBlock
    ? `
    <tr>
      <td style="width:75%;border:1px solid #1f2937;padding:6px;vertical-align:top">
        <div style="width:100%;border-bottom:1px dotted #9ca3af;box-sizing:border-box;margin-bottom:4px">
        <table style="border-collapse:collapse;width:100%;table-layout:fixed"><colgroup><col style="width:4.25rem" /><col /></colgroup><tr>
          <td style="color:#6b7280;font-size:10px;padding:0 8px 3px 0;border:none;vertical-align:bottom;white-space:nowrap">ふりがな</td>
          <td style="border:none;vertical-align:bottom;padding:0">
            <div style="padding:0 2px 2px 2px;min-height:1.2em;line-height:1.2;font-size:10px;box-sizing:border-box">${orBlank(d.contactFurigana)}</div>
          </td>
        </tr></table>
        </div>
      </td>
      <td rowspan="2" style="border:1px solid #1f2937;padding:6px;vertical-align:top">
        <div style="color:#6b7280;font-size:10px;margin-bottom:2px">電話</div>
        <div style="min-height:3rem">${orBlank(d.phone)}</div>
      </td>
    </tr>
    <tr>
      <td style="width:75%;border:1px solid #1f2937;padding:6px;vertical-align:top">
        <div style="color:#6b7280;font-size:10px">連絡先</div>
        <div style="font-size:9px;color:#6b7280;margin-top:2px">（現住所以外に連絡を希望する場合のみ記入）</div>
        <div style="border-bottom:1px dotted #9ca3af;margin-top:4px;min-height:1.5em">${d.addressOrigin ? '〒 ' + esc(d.addressOrigin) : '　'}</div>
      </td>
    </tr>`
    : '';

  /* Layout Rirekisho bám đúng form AddCandidateForm (common): 75% + 25%, cùng thứ tự bảng */
  const rirekishoPart = `
<!-- RIREKISHO (layout = form template common) -->
<div style="max-width:100%;font-size:11px;color:#1f2937;overflow:visible;font-family:${FONT_MINCHO}">
  <div style="display:flex;width:100%">
    <div style="width:75%;padding:4px 12px 12px 12px">
      <div style="font-weight:bold;font-size:18px;line-height:1.1">履歴書</div>
      <div style="font-size:10px;text-align:center;margin-top:4px">${documentDateDisplay}</div>
    </div>
    <div style="width:25%"></div>
  </div>
  ${openFixedTable(layoutMap, L('rirekisho', 'personalMain'), [75, 25], 'font-size:10px')}
    <tr>
      <td style="width:75%;border:1px solid #1f2937;padding:0;vertical-align:top;min-height:7.5rem">
        <table style="width:100%;border-collapse:collapse;table-layout:fixed">
          <tr>
            <td style="padding:6px 6px 2px 6px;vertical-align:top;border:none">
              <div style="width:100%;border-bottom:1px dotted #9ca3af;box-sizing:border-box">
              <table style="border-collapse:collapse;width:100%;table-layout:fixed"><colgroup><col style="width:4.25rem" /><col /></colgroup><tr>
                <td style="color:#6b7280;font-size:10px;padding:0 8px 3px 0;border:none;vertical-align:bottom;white-space:nowrap">ふりがな</td>
                <td style="border:none;vertical-align:bottom;padding:0">
                  <div style="padding:0 2px 2px 2px;min-height:1.2em;line-height:1.2;font-size:10px;box-sizing:border-box">${orBlank(d.nameKana)}</div>
                </td>
              </tr></table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 6px 6px 6px;vertical-align:top;border:none">
              <table style="border-collapse:collapse;width:100%;table-layout:fixed"><colgroup><col style="width:4.25rem" /><col /></colgroup><tr>
                <td style="color:#6b7280;font-size:10px;padding:0 8px 0 0;border:none;vertical-align:baseline;white-space:nowrap">氏名</td>
                <td style="font-weight:500;font-size:15px;line-height:1.25;white-space:pre-wrap;padding:0 2px 0 0;border:none;vertical-align:baseline">${orBlank(d.nameKanji)}</td>
              </tr></table>
            </td>
          </tr>
        </table>
      </td>
      <td style="width:25%;border:none;background:transparent;padding:6px 8px 6px 8px;vertical-align:middle;text-align:center">
        <div style="width:3cm;height:4cm;margin:0 auto;overflow:hidden;display:block">
        <img id="cv-avatar-photo" src="${avatarDataUrl || avatarPlaceholderDataUrl}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;image-rendering:auto" />
        </div>
      </td>
    </tr>
    <tr>
      <td style="width:75%;border:1px solid #1f2937;padding:6px;vertical-align:middle">
        <span style="color:#6b7280;font-size:10px">生年月日</span> ${birthFormatted}
      </td>
      <td style="border:1px solid #1f2937;padding:6px;vertical-align:top">
        <div style="color:#6b7280;font-size:10px;margin-bottom:2px">※性別</div>
        <div style="min-height:1.6em;text-align:center">${orBlank(d.gender)}</div>
      </td>
    </tr>
    <tr>
      <td style="width:75%;border:1px solid #1f2937;padding:6px;vertical-align:top">
        <div style="width:100%;border-bottom:1px dotted #9ca3af;box-sizing:border-box;margin-bottom:4px">
        <table style="border-collapse:collapse;width:100%;table-layout:fixed"><colgroup><col style="width:4.25rem" /><col /></colgroup><tr>
          <td style="color:#6b7280;font-size:10px;padding:0 8px 3px 0;border:none;vertical-align:bottom;white-space:nowrap">ふりがな</td>
          <td style="border:none;vertical-align:bottom;padding:0">
            <div style="padding:0 2px 2px 2px;min-height:1.2em;line-height:1.2;font-size:10px;box-sizing:border-box">${orBlank(d.addressFurigana)}</div>
          </td>
        </tr></table>
        </div>
        <table style="border-collapse:collapse;width:100%;table-layout:fixed;margin-top:4px"><colgroup><col style="width:4.25rem" /><col style="width:auto" /></colgroup>
          <tr>
            <td style="color:#6b7280;font-size:10px;padding:0 8px 0 0;border:none;vertical-align:top;white-space:nowrap">現住所</td>
            <td style="border:none;vertical-align:top;padding:0;text-align:left">
              <div style="line-height:1.4">〒 ${orBlank(d.postalCode)}</div>
              <div style="margin-top:6px;white-space:pre-wrap;word-break:break-all;line-height:1.4">${orBlank(d.address)}</div>
            </td>
          </tr>
        </table>
      </td>
      <td style="border:1px solid #1f2937;padding:6px;vertical-align:top">
        <div style="color:#6b7280;font-size:10px;margin-bottom:2px">電話</div>
        <div style="min-height:2em">${orBlank(d.phone)}</div>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="border:1px solid #1f2937;padding:6px">
        <span style="color:#6b7280;font-size:10px">E-mail</span> ${orBlank(d.email)}
      </td>
    </tr>
    ${rirekishoOptContactTrs}
  </table>
  ${openFixedTable(layoutMap, L('rirekisho', 'eduWorkCert'), [8, 8, 84], 'border:1px solid #1f2937;font-size:10px;margin-top:16px')}
    <thead><tr><th style="width:8%;border:1px solid #1f2937;padding:6px;text-align:center;font-weight:normal">年</th><th style="width:8%;border:1px solid #1f2937;padding:6px;text-align:center;font-weight:normal">月</th><th style="border:1px solid #1f2937;padding:6px;text-align:left;font-weight:normal">学歴</th></tr></thead>
    <tbody>${eduRows}</tbody>
    <thead><tr><th style="width:8%;border:1px solid #1f2937;padding:6px;text-align:center;font-weight:normal">年</th><th style="width:8%;border:1px solid #1f2937;padding:6px;text-align:center;font-weight:normal">月</th><th style="border:1px solid #1f2937;padding:6px;text-align:left;font-weight:normal">職歴</th></tr></thead>
    <tbody>${workRows}<tr><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">　</td><td style="border:1px solid #1f2937;padding:4px;text-align:center;width:8%">　</td><td style="border:1px solid #1f2937;padding:4px;text-align:right">以上</td></tr></tbody>
    <thead><tr><th style="width:8%;border:1px solid #1f2937;padding:6px;text-align:center;font-weight:normal">年</th><th style="width:8%;border:1px solid #1f2937;padding:6px;text-align:center;font-weight:normal">月</th><th style="border:1px solid #1f2937;padding:6px;text-align:left;font-weight:normal">免許・資格</th></tr></thead>
    <tbody>${certRows}</tbody>
  </table>
  ${openFixedTable(layoutMap, L('rirekisho', 'station'), [28, 24, 24, 24], 'border:1px solid #1f2937;font-size:10px;margin-top:16px')}
    <tr>
      <td style="width:28%;border:1px solid #1f2937;padding:6px">
        <div>現住所の最寄り駅</div>
        <div style="margin-top:4px;min-height:1.2em">${orBlank(d.nearestStationName)}</div>
      </td>
      <td style="width:24%;border:1px solid #1f2937;padding:6px"><div>扶養家族数(配偶者を除く)</div><div style="margin-top:4px">${orBlank(d.dependentsCount)} 人</div></td>
      <td style="width:24%;border:1px solid #1f2937;padding:6px"><div>配偶者</div><div style="margin-top:4px">${orBlank(d.hasSpouse)}</div></td>
      <td style="width:24%;border:1px solid #1f2937;padding:6px"><div>配偶者の扶養義務</div><div style="margin-top:4px">${orBlank(d.spouseDependent)}</div></td>
    </tr>
  </table>
  ${openFixedTable(layoutMap, L('rirekisho', 'residence'), [50, 50], 'border:1px solid #1f2937;font-size:10px;margin-top:16px')}
    <tr>
      <td style="width:50%;border:1px solid #1f2937;padding:6px"><div>在留資格</div><div style="margin-top:4px;min-height:2em">${orBlank(d.jpResidenceStatus)}</div></td>
      <td style="width:50%;border:1px solid #1f2937;padding:6px"><div>在留期限</div><div style="margin-top:4px;min-height:2em">${visaFormatted}</div></td>
    </tr>
  </table>
  ${openFixedTable(layoutMap, L('rirekisho', 'prHobby'), [50, 50], 'border:1px solid #1f2937;font-size:10px;margin-top:16px')}
    <tr>
      <td style="width:50%;border:1px solid #1f2937;padding:6px"><div>自己PR</div><div style="margin-top:4px;min-height:4rem;white-space:pre-wrap">${orBlank(d.strengths)}</div></td>
      <td style="width:50%;border:1px solid #1f2937;padding:6px"><div>趣味・特技</div><div style="margin-top:4px;min-height:4rem;white-space:pre-wrap">${orBlank(d.hobbiesSpecialSkills)}</div></td>
    </tr>
  </table>
  ${openFixedTable(layoutMap, L('rirekisho', 'motivation'), [100], 'border:1px solid #1f2937;font-size:10px;margin-top:16px')}
    <tr>
      <td style="border:1px solid #1f2937;padding:6px"><div>志望動機</div><div style="margin-top:4px;min-height:5rem;white-space:pre-wrap">${orBlank(d.motivation)}</div></td>
    </tr>
  </table>
  ${openFixedTable(layoutMap, L('rirekisho', 'wish'), [100], 'border:1px solid #1f2937;font-size:10px;margin-top:16px', 'avoid-break')}
    <tr>
      <td style="border:1px solid #1f2937;padding:6px">
        <div style="font-weight:500;margin-bottom:4px">本人希望記入欄</div>
        <ul style="margin:4px 0 0 0;padding-left:16px;list-style:none">
          <li style="margin-bottom:2px">- 現在年収: ${orBlank(d.currentSalary)}</li>
          <li style="margin-bottom:2px">- 希望年収: ${orBlank(d.desiredSalary)}</li>
          <li style="margin-bottom:2px">- 希望職種: ${orBlank(d.desiredPosition)}</li>
          <li style="margin-bottom:2px">- 希望勤務地: ${orBlank(d.desiredLocation)}</li>
          <li style="margin-bottom:2px">- 希望入社日: ${orBlank(d.desiredStartDate)}</li>
        </ul>
      </td>
    </tr>
  </table>
</div>`;

  const shokumuPart = `
<!-- SHOKUMU 職務経歴書 – bố cục và màu giống form AddCandidateForm (common, tab 職務経歴書) -->
<div style="font-size:11px;color:#1f2937;font-family:${FONT_MINCHO}">
  <h2 style="text-align:center;font-weight:bold;margin-bottom:16px;font-size:18px">職務経歴書</h2>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-size:11px;margin-bottom:24px;width:100%;box-sizing:border-box">
    <span>現在、${documentDateDisplay}</span>
    <div style="margin-left:auto;min-width:10em;max-width:28rem;border-bottom:1px dotted #9ca3af;box-sizing:border-box">
    <table style="border-collapse:collapse;width:100%;table-layout:fixed"><colgroup><col style="width:auto" /><col style="min-width:10em;max-width:28rem" /></colgroup><tr>
      <td style="color:#6b7280;font-size:10px;padding:0 8px 3px 0;border:none;vertical-align:bottom;white-space:nowrap">ふりがな</td>
      <td style="border:none;vertical-align:bottom;padding:0">
        <div style="padding:0 2px 2px 2px;min-height:1.2em;line-height:1.2;font-size:10px;text-align:right;word-break:break-all;box-sizing:border-box">${orBlank(d.nameKana)}</div>
      </td>
    </tr></table>
    </div>
    <table style="border-collapse:collapse;margin-left:auto;max-width:100%"><tr>
      <td style="color:#6b7280;font-size:10px;padding:0 8px 0 0;border:none;vertical-align:baseline;white-space:nowrap">氏名</td>
      <td style="border:none;vertical-align:baseline;text-align:right;font-size:13px;min-width:8em;max-width:28rem;padding:0 2px;line-height:1.2;font-weight:500;word-break:break-all">${orBlank(d.nameKanji)}</td>
    </tr></table>
  </div>
  <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px">
    <span style="display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;font-size:10px;font-weight:bold;color:#000">■</span>
    <span style="font-size:12px;font-weight:bold">職務要約</span>
  </div>
  <div style="border:1px solid #1f2937;min-height:48px;padding:8px;font-size:12px;background:#fafafa;white-space:pre-wrap;margin-bottom:16px">${orBlank(d.careerSummary)}</div>
  <div style="display:flex;align-items:center;gap:4px;margin-top:40px;margin-bottom:8px">
    <span style="display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;font-size:10px;font-weight:bold;color:#000">■</span>
    <span style="font-size:12px;font-weight:bold">職務経歴</span>
  </div>
  ${shokumuBlocks}

</div>`;

  const circleNum = (n) => ({ 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤', 6: '⑥', 7: '⑦', 8: '⑧', 9: '⑨', 10: '⑩' }[n] || `(${n})`);
  const shokumuBlockCount = Math.max(1, workExps.length);
  const shokumuRowSpan = shokumuBlockCount * 9 + (shokumuBlockCount > 1 ? shokumuBlockCount - 1 : 0);
  const borderDot = '1px dotted #9ca3af';
  const shokumuBox = (arr, key) => (Array.isArray(arr) && arr.includes(key) ? '■' : '□') + ' ・' + esc(key);

  const shokumuPartIt = `
<!-- SHOKUMU IT (職務経歴書 – aligned with frontend CvTemplateIt.jsx) -->
<div style="font-size:11px;color:#1f2937;padding:10px;font-family:${FONT_MINCHO}">
  <div style="border:1px solid #1f2937;padding:8px;text-align:center;font-weight:bold;background:#e2efd9;font-size:14px">職務経歴書</div>
  <div style="display:flex;justify-content:flex-end;gap:24px;font-size:10px;margin:8px 0">
    <span>現在、${d.cvDocumentDate ? esc(formatCvDocumentDateDisplay(String(d.cvDocumentDate))) : nowStr}</span>
    <span>氏名: ${orBlank(d.nameKanji)} (${orBlank(d.nameKana)})</span>
  </div>

  <div style="margin-bottom:8px;font-size:10px"><strong>■ 職務要約</strong></div>
  ${openFixedTable(layoutMap, L('shokumu', 'summary'), [12, 88], 'border:1px solid #1f2937;border-radius:4px;font-size:10px;margin-bottom:16px')}
    <tbody><tr>
      <td style="border:1px solid #1f2937;padding:8px;text-align:center;background:#e2efd9;vertical-align:middle;width:12%">職務要約</td>
      <td style="border:1px solid #1f2937;padding:8px;background:#fafafa;white-space:pre-wrap;vertical-align:top;min-height:80px">${orBlank(d.careerSummary)}</td>
    </tr></tbody>
  </table>

  <div style="border:1px solid #1f2937;margin-bottom:12px">
    <div style="padding:6px;text-align:center;font-weight:bold;background:#e2efd9;border-bottom:1px solid #1f2937">職務経歴</div>
    ${openFixedTable(layoutMap, L('shokumu', 'workGrid:0'), [16, 35, 24, 25], 'font-size:10px;width:100%')}
      <thead>
        <tr>
          <th style="border:1px solid #1f2937;padding:6px;text-align:center;background:#e2efd9;width:18%">勤務地</th>
          <th style="border:1px solid #1f2937;padding:6px;text-align:center;background:#e2efd9;min-width:35%">業務内容 (具体的、詳細に記入)</th>
          <th style="border:1px solid #1f2937;padding:6px;text-align:center;background:#e2efd9;width:22%">役割・担当業務</th>
          <th style="border:1px solid #1f2937;padding:6px;text-align:center;background:#e2efd9;width:20%">作業工程</th>
        </tr>
      </thead>
      <tbody>
${(() => {
    const workList = workExpsPadded;
    const cellStyle = 'border:1px solid #1f2937;padding:6px;vertical-align:top;background:white';
    const cellDotStyle = 'border:1px dotted #9ca3af;padding:6px;vertical-align:top;background:white';
    const renderProjectRow = (w, project, projectIndex, rowSpan) => {
      const roleSet = Array.isArray(w.roleCheckboxes) ? w.roleCheckboxes : [];
      const processSet = Array.isArray(w.processCheckboxes) ? w.processCheckboxes : [];
      const chk = (type, key) => (type === 'role' ? roleSet.includes(key) : processSet.includes(key));
      const p = project || {};
      const projectPeriod = formatShokumuPeriodRangeJa(
        [p.startYear, p.startMonth].filter(Boolean).join('/'),
        p.endCurrent ? '現在' : [p.endYear, p.endMonth].filter(Boolean).join('/'),
      ) || p.period || formatWorkPeriodRangeFromEmp(w) || '20xx 年 xx 月～20xx 年 xx 月';
      const projectSummary = [
        p.team_size ? `【チーム人数】${p.team_size}` : '',
        p.role ? `【役割】${p.role}` : '',
        projectPeriod ? `【期間】${projectPeriod}` : '',
        p.description ? `【担当業務】${p.description}` : '',
        p.tools_tech ? `【開発言語・ツール】${p.tools_tech}` : '',
      ].filter(Boolean).join('\n');
      const projectName = p.project_name || w.business_purpose || '';
      return `
        <tr>
          ${projectIndex === 0 ? `<td rowspan="${rowSpan}" style="${cellStyle};width:18%;white-space:pre-wrap">${orBlank(w.company_name)}</td>` : ''}
          <td style="${cellDotStyle};min-width:35%;white-space:pre-wrap">
            <div style="font-size:10px;white-space:pre-wrap"><strong>【プロジェクト名】</strong>${orBlank(projectName)}</div>
            <div style="margin-top:4px;white-space:pre-wrap">${orBlank(projectSummary || w.description)}</div>
          </td>
          <td style="${cellDotStyle};width:22%;white-space:pre-wrap">${['PM','PL','サブリーダー','プログラマー','BrSE','その他'].map((key) => `・${chk('role', key) ? '■' : '□'} ${key}`).join('<br/>')}</td>
          <td style="${cellDotStyle};width:20%;white-space:pre-wrap">${['要件定義','基本設計','詳細設計','実装・単体','結合テスト','総合テスト','保守・運用'].map((key) => `・${chk('process', key) ? '■' : '□'} ${key}`).join('<br/>')}</td>
        </tr>`;
    };
    return workList.length > 0 ? workList.flatMap((w) => {
      const projects = Array.isArray(w.projects) && w.projects.length > 0 ? w.projects : [null];
      const rowSpan = projects.length;
      return projects.map((project, projectIndex) => renderProjectRow(w, project, projectIndex, rowSpan));
    }) : [
        `<tr>
          <td style="${cellStyle};width:18%">　</td>
          <td style="${cellDotStyle};min-width:35%">　</td>
          <td style="${cellDotStyle};width:22%">　</td>
          <td style="${cellDotStyle};width:20%">　</td>
        </tr>`
    ];
  })().join('')}
      </tbody>
    </table>
  </div>

  ${showSkills ? `<div style="font-weight:bold;margin-bottom:6px;font-size:12px;background:#e2efd9;border:1px solid #1f2937;padding:6px 8px">■ 活かせる経験、知識、技術</div><div style="border:1px solid #1f2937;border-top:0;min-height:60px;padding:8px;font-size:10px;background:#fafafa;white-space:pre-wrap;margin-bottom:16px">${skillsHtml}</div>` : ''}
  <div style="font-weight:bold;margin-bottom:6px;font-size:12px;background:#e2efd9;border:1px solid #1f2937;padding:6px 8px">■ 資格</div>
  <div style="border:1px solid #1f2937;border-top:0;padding:6px 8px;font-size:10px;margin-bottom:16px;background:#fff;white-space:pre-wrap">${(d.certificates || []).length > 0 ? (d.certificates || []).map((cert) => {
    const ymd = formatCvYearMonthJa(cert?.year, cert?.month);
    const dateStr = ymd ? `(${ymd})` : '';
    return `・${orBlank(cert?.name)}${dateStr}`;
  }).join('<br>') : '　'}</div>
</div>`;

  const shokumuPartTechnical = `
<!-- SHOKUMU TECHNICAL (職務経歴書 – mirror frontend CvTemplateTechnical.jsx tab 2) -->
<div style="font-size:11px;color:#1f2937;padding:10px;font-family:${FONT_MINCHO}">
  <div style="border:1px solid #1f2937;padding:8px;text-align:center;font-weight:bold;background:#e2efd9;font-size:14px">職務経歴書</div>
  <div style="display:flex;justify-content:flex-end;gap:24px;font-size:10px;margin:8px 0">
    <span>現在、${d.cvDocumentDate ? esc(formatCvDocumentDateDisplay(String(d.cvDocumentDate))) : nowStr}</span>
    <span>氏名: ${orBlank(d.nameKanji)} (${orBlank(d.nameKana)})</span>
  </div>

  <div style="margin-bottom:8px;font-size:10px"><strong>■ 職務要約</strong></div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px">
    <tbody>
      <tr>
        <td style="border:1px solid #1f2937;padding:8px;background:#fff;white-space:pre-wrap;min-height:4rem">${orBlank(d.careerSummary)}</td>
      </tr>
    </tbody>
  </table>

  <div style="border:1px solid #1f2937;padding:2px 0 0 0;margin-bottom:8px">
    <div style="border:1px solid #1f2937;border-left:none;border-right:none;padding:6px 8px;text-align:center;font-weight:bold;background:#e2efd9">職務経歴</div>
    ${(() => {
      const list = d.workExperiences || [];
      const blockCount = Math.max(1, d.workHistoryCount ?? list.length);
      const labels = ['【職歴１】', '【職歴２】', '【職歴３】'];
      const defaultPeriods = ['2016 年 6 月～2018 年 6 月 (例)', '2018 年 6 月～2022 年 6 月 (例)', '2022 年 6 月～現在 (例)'];
      const formatWorkPeriodDisplay = (row = {}) => {
        const startLabel = row.start_date || [row.startYear, row.startMonth].filter(Boolean).join('/');
        const endLabel = row.endCurrent ? '現在' : (row.end_date || [row.endYear, row.endMonth].filter(Boolean).join('/'));
        return formatShokumuPeriodRangeJa(startLabel, endLabel) || formatShokumuPeriodCell(`${startLabel}～${endLabel}`) || (startLabel && endLabel ? `${startLabel}～${endLabel}` : '') || '';
      };
      return Array.from({ length: blockCount }, (_, blockIndex) => {
        const emp = list[blockIndex] || {};
        const label = labels[blockIndex] || `【職歴${blockIndex + 1}】`;
        const pd = defaultPeriods[blockIndex] || '';
        const companyFallback = emp.company_name || emp.companyName || emp.company || emp.companyKanji || emp.companyJa || '';
        const positionFallback = emp.companyRole || emp.company_role || emp.position_role || emp.position_name || emp.positionName || emp.position || emp.role || emp.jobTitle || '';
        const locationFallback = emp.location || emp.workLocation || emp.work_location || '';
        const periodFallback = formatWorkPeriodDisplay(emp) || pd;
        return `
          <div style="padding:0;margin:0 0 8px 0">
            <table style="width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed">
              <colgroup>
                <col style="width:11%" />
                <col style="width:40%" />
                <col style="width:37%" />
                <col style="width:12%" />
              </colgroup>
              <tbody>
                <tr>
                  <td style="border:1px solid #1f2937;padding:4px 6px;text-align:center;background:#e5e7eb">${esc(label)}</td>
                  <td style="border:1px solid #1f2937;padding:4px 6px;text-align:center;background:#e5e7eb">${orBlank(companyFallback)}</td>
                  <td style="border:1px solid #1f2937;padding:4px 6px;text-align:center;background:#e5e7eb">${orBlank(positionFallback)}</td>
                  <td style="border:1px solid #1f2937;padding:4px 6px;text-align:center;background:#e5e7eb">${orBlank(locationFallback)}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #1f2937;padding:4px 6px;text-align:center;background:#fff">期間</td>
                  <td colspan="2" style="border:1px solid #1f2937;padding:4px 6px;text-align:center;background:#fff">業務内容</td>
                  <td style="border:1px solid #1f2937;padding:4px 6px;text-align:center;background:#fff">使用ツール</td>
                </tr>
                <tr>
                  <td style="border:1px solid #1f2937;padding:6px;text-align:center;vertical-align:middle;background:#fff;white-space:pre-wrap">${orBlank(periodFallback)}</td>
                  <td colspan="2" style="border:1px solid #1f2937;padding:6px;vertical-align:top;background:#fff;white-space:pre-wrap">${orBlank(emp.description)}</td>
                  <td style="border:1px solid #1f2937;padding:6px;vertical-align:top;background:#fff;white-space:pre-wrap">${orBlank(emp.tools_tech)}</td>
                </tr>
              </tbody>
            </table>
          </div>`;
      }).join('');
    })()}
  </div>

  <table style="width:100%;border-collapse:collapse;margin-top:8px;margin-bottom:16px;font-size:10px">
    <tbody>
      <tr>
        <td style="border:1px solid #1f2937;padding:6px;background:#e2efd9;font-weight:bold;">活かせるスキル・経験・知識</td>
      </tr>
      <tr>
        <td style="border:1px solid #1f2937;padding:8px;white-space:pre-wrap;min-height:80px;background:#fff">${orBlank(d.technicalSkills)}</td>
      </tr>
    </tbody>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px">
    <tbody>
      <tr>
        <td style="border:1px solid #1f2937;padding:6px;background:#e2efd9;font-weight:bold;">資格・免許</td>
      </tr>
      ${(d.certificates || []).length > 0 ? (d.certificates || []).map((cert) => {
        const year = String(cert?.year || '').trim();
        const month = String(cert?.month || '').trim();
        const name = String(cert?.name || '').trim();
        const acquired = [year, month].filter(Boolean).length ? `（${year}年${month}月）` : '';
        return `<tr><td style="border:1px solid #1f2937;padding:6px;white-space:pre-wrap;background:#fff">・${esc(name)}${esc(acquired)}</td></tr>`;
      }).join('') : `<tr><td style="border:1px solid #1f2937;padding:6px;white-space:pre-wrap;background:#fff">　</td></tr>`}
    </tbody>
  </table>
</div>`;

  // Template IT / Technical: layout bám sát preview IT/Technical trong AddCandidateForm
  const rirekishoPartIt = `
<!-- RIREKISHO (IT/Technical layout) — không viền ngoài; chỉ viền theo từng bảng như template chung -->
<div style="max-width:100%;font-size:11px;color:#1f2937;overflow:visible;font-family:${FONT_MINCHO}">
  ${openFixedTable(layoutMap, L('rirekisho', 'personalGrid'), [7, 18, 7, 11, 6, 9, 42], 'font-size:10px;border:1px solid #1f2937;width:100%')}
    <tr>
      <td colspan="7" style="border:1px solid #1f2937;padding:6px;text-align:center;font-weight:bold;background:#e2efd9;font-size:14px">履歴書</td>
    </tr>
    <tr>
      <td style="border:1px solid #1f2937;padding:4px;width:9%;background:#e2efd9;text-align:center">フリガナ</td>
      <td style="border:1px solid #1f2937;padding:4px;width:26%">${orBlank(d.nameKana)}</td>
      <td style="border:1px solid #1f2937;padding:4px;width:9%;background:#e2efd9;text-align:center">生年月日</td>
      <td style="border:1px solid #1f2937;padding:4px;width:18%">${d.birthDate ? esc(formatCvBirthDateJa(d.birthDate) || d.birthDate) : '　'}</td>
      <td style="border:1px solid #1f2937;padding:4px;width:8%;background:#e2efd9;text-align:center">年齢</td>
      <td style="border:1px solid #1f2937;padding:4px;width:10%">${orBlank(d.age)}</td>
      <td rowspan="5" style="border:1px solid #1f2937;padding:4px;width:20%;text-align:center;vertical-align:middle">
        <div style="width:3cm;height:4cm;margin:0 auto;overflow:hidden;display:block;border:1px solid #d1d5db">
        <img id="cv-avatar-photo" src="${avatarDataUrl || avatarPlaceholderDataUrl}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;image-rendering:auto" />
        </div>
      </td>
    </tr>
    <tr>
      <td style="border:1px solid #1f2937;padding:4px;background:#e2efd9;text-align:center">氏名</td>
      <td style="border:1px solid #1f2937;padding:4px">${orBlank(d.nameKanji)}</td>
      <td style="border:1px solid #1f2937;padding:4px;background:#e2efd9;text-align:center">性別</td>
      <td style="border:1px solid #1f2937;padding:4px">${orBlank(d.gender)}</td>
      <td style="border:1px solid #1f2937;padding:4px;background:#e2efd9;text-align:center">パスポート</td>
      <td style="border:1px solid #1f2937;padding:4px">${orBlank(d.passport)}</td>
    </tr>
    <tr>
      <td style="border:1px solid #1f2937;padding:4px;background:#e2efd9;text-align:center">Email</td>
      <td style="border:1px solid #1f2937;padding:4px">${orBlank(d.email)}</td>
      <td style="border:1px solid #1f2937;padding:4px;background:#e2efd9;text-align:center">電話</td>
      <td style="border:1px solid #1f2937;padding:4px">${orBlank(d.phone)}</td>
      <td style="border:1px solid #1f2937;padding:4px;background:#e2efd9;text-align:center">Skype ID</td>
      <td style="border:1px solid #1f2937;padding:4px">${orBlank(d.skypeId)}</td>
    </tr>
    <tr>
      <td style="border:1px solid #1f2937;padding:4px;background:#e2efd9;text-align:center">現住所</td>
      <td style="border:1px solid #1f2937;padding:4px">${(d.postalCode ? '〒' + esc(d.postalCode) + ' ' : '') + orBlank(d.address)}</td>
      <td style="border:1px solid #1f2937;padding:4px;background:#e2efd9;text-align:center">出身地</td>
      <td style="border:1px solid #1f2937;padding:4px">${orBlank(d.addressOrigin)}</td>
      <td style="border:1px solid #1f2937;padding:4px;background:#e2efd9;text-align:center">配偶者</td>
      <td style="border:1px solid #1f2937;padding:4px">${orBlank(d.hasSpouse)}</td>
    </tr>
    <tr>
      <td style="border:1px solid #1f2937;padding:4px;background:#e2efd9;text-align:center">日本滞在目的</td>
      <td colspan="3" style="border:1px solid #1f2937;padding:4px">
        ${orBlank(stayPurposeDisplay)}
      </td>
      <td style="border:1px solid #1f2937;padding:4px;background:#e2efd9;text-align:center">ビザの期限</td>
      <td style="border:1px solid #1f2937;padding:4px">${visaFormatted}</td>
    </tr>
  </table>

  <!-- 学歴 bảng theo layout IT (1 dòng/trường, 入学・卒業 trên cùng dòng) -->
  ${openFixedTable(layoutMap, L('rirekisho', 'education'), [12, 20, 18, 18, 18, 14], 'font-size:10px;border:1px solid #1f2937;margin-top:8px;width:100%')}
    <tr>
      <td rowspan="${1 + Math.max(1, (d.educations || []).length)}" style="border:1px solid #1f2937;padding:6px;text-align:center;width:${labelColWidth};background:#e2efd9">学歴</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">学校名 (英語名)</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">学部・専攻</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">入学年月</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">卒業年月</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">年数</td>
    </tr>
    ${Array.from({ length: Math.max(1, (d.educations || []).length) }).map((_, i) => {
      const edu = (d.educations || [])[i] || {};
      const startYm = formatCvYearMonthJa(edu.year, edu.month) || '';
      const endYm = formatCvYearMonthJa(edu.endYear, edu.endMonth) || '';
      const schoolName = edu.school_name != null ? String(edu.school_name).trim() : '';
      const major = edu.major != null ? String(edu.major).trim() : '';
      const schoolDisplay = schoolName || (edu.content ? String(edu.content).split(/\s*\/\s*/)[0]?.trim() : '') || '　';
      const majorDisplay = major || (edu.content ? String(edu.content).split(/\s*\/\s*/).slice(1).join(' / ').trim() : '') || '　';
      return `<tr>
        <td style="border:1px solid #1f2937;padding:4px">${orBlank(schoolDisplay)}</td>
        <td style="border:1px solid #1f2937;padding:4px">${orBlank(majorDisplay)}</td>
        <td style="border:1px solid #1f2937;padding:4px;text-align:center">${startYm || '　'}</td>
        <td style="border:1px solid #1f2937;padding:4px;text-align:center">${endYm || '　'}</td>
        <td style="border:1px solid #1f2937;padding:4px;text-align:center">　</td>
      </tr>`;
    }).join('')}
  </table>

  <!-- 外国語の会話レベル -->
  ${openFixedTable(layoutMap, L('rirekisho', 'languages'), [12, 14, 14, 14, 24, 22], 'font-size:10px;border:1px solid #1f2937;margin-top:8px;width:100%')}
    <tr>
      <td rowspan="4" style="border:1px solid #1f2937;padding:6px;text-align:center;width:${labelColWidth};background:#e2efd9">外国語の会話レベル</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">日本語</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">英語</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">その他 ( )</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9;width:22%">言語スキル補足説明</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9;width:22%">備考</td>
    </tr>
    <tr>
      <td style="border-top:1px solid #1f2937;border-left:1px solid #1f2937;border-right:1px solid #1f2937;padding:4px">${convLabel(d.jpConversationLevel, 'native', 'ネイティブ')}</td>
      <td style="border-top:1px solid #1f2937;border-left:1px solid #1f2937;border-right:1px solid #1f2937;padding:4px">${convLabel(d.enConversationLevel, 'native', 'ネイティブ')}</td>
      <td style="border-top:1px solid #1f2937;border-left:1px solid #1f2937;border-right:1px solid #1f2937;padding:4px">${convLabel(d.otherConversationLevel, 'native', 'ネイティブ')}</td>
      <td rowspan="3" style="border:1px solid #1f2937;padding:4px;vertical-align:top">${d.jlptLevel ? (String(d.jlptLevel).startsWith('N') ? orBlank(d.jlptLevel) : orBlank('N' + d.jlptLevel)) : '　'}</td>
      <td rowspan="3" style="border:1px solid #1f2937;padding:4px;vertical-align:top">${orBlank(d.notes)}</td>
    </tr>
    <tr>
      <td style="border-left:1px solid #1f2937;border-right:1px solid #1f2937;padding:4px">${convLabel(d.jpConversationLevel, 'business', 'ビジネス')}</td>
      <td style="border-left:1px solid #1f2937;border-right:1px solid #1f2937;padding:4px">${convLabel(d.enConversationLevel, 'business', 'ビジネス')}</td>
      <td style="border-left:1px solid #1f2937;border-right:1px solid #1f2937;padding:4px">${convLabel(d.otherConversationLevel, 'business', 'ビジネス')}</td>
    </tr>
    <tr>
      <td style="border-left:1px solid #1f2937;border-right:1px solid #1f2937;border-bottom:1px solid #1f2937;padding:4px">${convLabel(d.jpConversationLevel, 'daily', '日常会話')}</td>
      <td style="border-left:1px solid #1f2937;border-right:1px solid #1f2937;border-bottom:1px solid #1f2937;padding:4px">${convLabel(d.enConversationLevel, 'daily', '日常会話')}</td>
      <td style="border-left:1px solid #1f2937;border-right:1px solid #1f2937;border-bottom:1px solid #1f2937;padding:4px">${convLabel(d.otherConversationLevel, 'daily', '日常会話')}</td>
    </tr>
  </table>

  ${certItVisibleRowCount > 0 ? `
  <!-- 保有資格・免許等 -->
  ${openFixedTable(layoutMap, L('rirekisho', 'certificates'), certItColPercents, 'font-size:10px;border:1px solid #1f2937;margin-top:8px;width:100%')}
    <tr>
      <td rowspan="${certItTitleRowSpan}" style="border:1px solid #1f2937;padding:6px;text-align:center;width:${labelColWidth};background:#e2efd9">保有資格・免許等</td>
      <td style="border:1px solid #1f2937;padding:4px;width:12%;background:#e2efd9"></td>
      <td colspan="4" style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">名称</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">取得年月</td>
    </tr>
    ${hasFixedCertData('jlpt') ? `<tr>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center">日本語検定</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;width:6%">${jlptDisplay === 'N1' ? '■ N1' : '□ N1'}</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;width:6%">${jlptDisplay === 'N2' ? '■ N2' : '□ N2'}</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;width:6%">${jlptDisplay === 'N3' ? '■ N3' : '□ N3'}</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;width:6%">${jlptDisplay === 'N4' ? '■ N4' : '□ N4'}</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center">${orBlank(fixedCertYm('jlpt'))}</td>
    </tr>` : ''}
    ${hasFixedCertData('toeic') ? `<tr>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center">英語</td>
      <td colspan="4" style="border:1px solid #1f2937;padding:4px;text-align:center">
        TOEIC ${d.toeicScore ? esc(d.toeicScore + '点') : '（　　　点）'}
      </td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center">${orBlank(fixedCertYm('toeic'))}</td>
    </tr>` : ''}
    ${hasFixedCertData('ielts') ? `<tr>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center">英語</td>
      <td colspan="4" style="border:1px solid #1f2937;padding:4px;text-align:center">
        IELTS ${d.ieltsScore ? esc(d.ieltsScore + '点') : '（　　　点）'}
      </td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center">${orBlank(fixedCertYm('ielts'))}</td>
    </tr>` : ''}
    ${hasFixedCertData('driving') ? `<tr>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center">自動車免許</td>
      <td colspan="2" style="border:1px solid #1f2937;padding:4px;text-align:center">
        ${d.hasDrivingLicense === '1' || d.hasDrivingLicense === 'true' || d.hasDrivingLicense === '有る' ? '■ 有る' : '□ 有る'}
      </td>
      <td colspan="2" style="border:1px solid #1f2937;padding:4px;text-align:center">
        ${d.hasDrivingLicense === '0' || d.hasDrivingLicense === 'false' || d.hasDrivingLicense === '無し' ? '■ 無し' : '□ 無し'}
      </td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center">${orBlank(fixedCertYm('driving'))}</td>
    </tr>` : ''}
  </table>
` : ''}${toolsTableHtml}

  <!-- 期間 / 勤務地 / 企業名 / ポジション・役割 -->
  ${openFixedTable(layoutMap, L('rirekisho', 'employment'), [22, 20, 38, 20], 'font-size:10px;border:1px solid #1f2937;margin-top:8px;width:100%')}
    <tr>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9;width:10rem;max-width:10rem">期間</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9;min-width:9rem">勤務地</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9;min-width:14rem">企業名</td>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9;width:8rem;max-width:8rem">ポジション・役割</td>
    </tr>
    ${itWorkRows.map(row => `
    <tr>
      <td style="border:1px solid #1f2937;padding:6px;text-align:center;vertical-align:middle;white-space:pre-wrap">${orBlank(row.period)}</td>
      <td style="border:1px solid #1f2937;padding:6px;text-align:center;vertical-align:middle;white-space:pre-wrap">${orBlank(row.employmentPlace)}</td>
      <td style="border:1px solid #1f2937;padding:6px;vertical-align:middle;white-space:pre-wrap">${orBlank(row.company_name)}</td>
      <td style="border:1px solid #1f2937;padding:6px;vertical-align:middle;white-space:pre-wrap">${orBlank(row.description)}</td>
    </tr>
    `).join('')}
  </table>

  ${openFixedTable(layoutMap, L('rirekisho', 'itFooter'), [100], 'font-size:10px;border:1px solid #1f2937;margin-top:8px;width:100%')}
    <tr>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">自己PR (大学での成績順位、頑張ったこと、趣味等)</td>
    </tr>
    <tr>
      <td style="border:1px solid #1f2937;padding:6px;min-height:80px;white-space:pre-wrap">${orBlank(d.strengths || d.careerSummary || d.hobbiesSpecialSkills)}</td>
    </tr>
    <tr>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9">応募動機</td>
    </tr>
    <tr>
      <td style="border:1px solid #1f2937;padding:6px;min-height:80px;white-space:pre-wrap">${orBlank(d.motivation)}</td>
    </tr>
    <tr>
      <td style="border:1px solid #1f2937;padding:4px;text-align:center;background:#e2efd9;line-height:1.2">備考</td>
    </tr>
    <tr>
      <td style="border:1px solid #1f2937;padding:5px 8px;white-space:normal;font-size:10px;line-height:1.15">
        <div style="margin:0;line-height:1.15">・現年収: ${orBlank(d.currentSalary)}</div>
        <div style="margin:0;line-height:1.15">・希望年収: ${orBlank(d.desiredSalary)}</div>
        <div style="margin:0;line-height:1.15">・希望職種: ${orBlank(d.desiredPosition)}</div>
        <div style="margin:0;line-height:1.15">・希望勤務地: ${orBlank(d.desiredLocation)}</div>
        <div style="margin:0;line-height:1.15">・在留資格の種類: 技術・人文知識・国際業務</div>
        <div style="margin:0;line-height:1.15">・在留期間: ${d.visaExpirationDate ? esc(formatCvAnyDateJa(d.visaExpirationDate) || d.visaExpirationDate) : '年月日'}</div>
        <div style="margin:0;line-height:1.15">・在留カードに記載の就労制限:「在留資格に基づく就労活動のみ可」</div>
      </td>
    </tr>
  </table>
</div>`;

  const chosenRirekisho = useItLayout ? rirekishoPartIt : rirekishoPart;
  const chosenShokumu = cvTemplate === 'cv_it' ? shokumuPartIt
    : cvTemplate === 'cv_technical' ? shokumuPartTechnical
    : shokumuPart;

  if (tab === 'rirekisho') {
    return HTML_HEAD + HTML_SHEET_OPEN + chosenRirekisho + HTML_SHEET_CLOSE + HTML_FOOT;
  }
  if (tab === 'shokumu') {
    return HTML_HEAD + HTML_SHEET_OPEN + chosenShokumu + HTML_SHEET_CLOSE + HTML_FOOT;
  }
  return (
    HTML_HEAD
    + HTML_SHEET_OPEN
    + chosenRirekisho
    + HTML_SHEET_CLOSE
    + HTML_SHEET_OPEN
    + chosenShokumu
    + HTML_SHEET_CLOSE
    + HTML_FOOT
  );
}
