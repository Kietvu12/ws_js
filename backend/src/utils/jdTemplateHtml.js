/**
 * HTML template cho JD (Job Description) - dùng để generate PDF từ dữ liệu Job.
 * Đồng bộ giao diện với frontend/src/component/Admin/AddJob/JdTemplate.jsx
 * Logo PDF/JD: ưu tiên frontend/public/logo_rmv.png (Workstation), sau đó src/assets/logo.png như JdTemplate.jsx.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatNumberOfHiresForLang } from './numberOfHiresLabels.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Thứ tự thử từ mỗi “gốc repo” khi đi lên cây thư mục / cwd */
const JD_LOGO_SEARCH_ORDER = [
  ['frontend', 'public', 'logo_rmv.png'],
  ['frontend', 'src', 'assets', 'logo.png'],
  ['frontend', 'public', 'assets', 'logo.png'],
  ['frontend', 'public', 'logo.png'],
];

/** Dùng khi tạo PDF: copy file logo rồi nhúng `logoFileUrl` (file:// tuyệt đối) hoặc `logoFileName` tương đối — tránh một số Chromium/Linux không resolve ảnh `src` tương đối khi `goto(file://)`, và tránh ảnh base64 không in được trên headless. */
export function findJdTemplateLogoAbsolutePath() {
  const envLogo = process.env.JD_TEMPLATE_LOGO_PATH?.trim();
  if (envLogo && fs.existsSync(envLogo)) return envLogo;

  /** Ưu tiên file trong monorepo (logo_rmv.png, …) trước bản copy trong backend/assets (deploy chỉ backend). */
  let dir = __dirname;
  for (let i = 0; i < 14; i++) {
    for (const segs of JD_LOGO_SEARCH_ORDER) {
      const candidate = path.join(dir, ...segs);
      if (fs.existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const cwdRoots = [process.cwd(), path.resolve(process.cwd(), '..'), path.resolve(process.cwd(), '..', '..')];
  for (const root of cwdRoots) {
    for (const segs of JD_LOGO_SEARCH_ORDER) {
      const candidate = path.join(root, ...segs);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  /** Fallback khi không có thư mục frontend trong bundle server */
  const bundledLogo = path.join(__dirname, '../../assets/jd-logo.png');
  if (fs.existsSync(bundledLogo)) return bundledLogo;

  return null;
}

/** Chỉ cache khi đọc file thành công — lần sau path vẫn thử lại nếu lần đầu chưa có file */
let jdTemplateLogoPositiveCache = '';
function getJdTemplateLogoDataUrl() {
  if (jdTemplateLogoPositiveCache) return jdTemplateLogoPositiveCache;
  try {
    const logoPath = findJdTemplateLogoAbsolutePath();
    if (!logoPath) return '';
    jdTemplateLogoPositiveCache = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    return jdTemplateLogoPositiveCache;
  } catch {
    return '';
  }
}

function esc(s) {
  if (s == null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function orDash(s) {
  return s != null && String(s).trim() ? esc(String(s).trim()) : '—';
}

function nl2br(s) {
  if (!s) return '';
  return esc(String(s)).replace(/\n/g, '<br/>');
}

const HIGHLIGHT_LABELS_VI = {
  new_graduate_ok: 'Ứng viên sắp tốt nghiệp OK',
  no_experience_ok: 'Chưa có kinh nghiệm OK',
  career_break_ok: 'Kinh nghiệm ngắt quãng OK',
  interview_guaranteed: 'Có điều kiện đảm bảo phỏng vấn',
  one_round_interview: 'Chỉ 1 vòng phỏng vấn',
  urgent_hiring: 'Tuyển gấp',
  online_interview: 'Phỏng vấn online (Web)',
  no_aptitude_test: 'Không có bài test năng lực',
  weekend_off: 'Nghỉ thứ 7 và Chủ nhật',
  shift_work: 'Làm việc theo ca',
  remote_possible: 'Có thể làm remote',
  full_remote: 'Full-remote',
  flex_time: 'Giờ làm việc linh hoạt',
  overtime_negotiable: 'Cho phép thương lượng làm thêm / nghỉ phép',
  no_overtime: 'Không làm thêm giờ',
  overtime_under_10h: 'Làm thêm không quá 10 giờ mỗi tháng',
  overtime_under_20h: 'Làm thêm không quá 20 giờ mỗi tháng',
  housing_support: 'Có nhà ở công ty / trợ cấp tiền thuê nhà',
  maternity_childcare_leave: 'Có thực tế nghỉ thai sản / nghỉ chăm con',
  foreigners_hired: 'Có thành tích tuyển dụng người nước ngoài',
  use_english: 'Có thể sử dụng tiếng Anh trong công việc',
  use_chinese: 'Có thể sử dụng tiếng Trung trong công việc',
  use_other_language: 'Có thể sử dụng ngoại ngữ khác trong công việc',
};

const HIGHLIGHT_LABELS_EN = {
  new_graduate_ok: 'New graduates welcome',
  no_experience_ok: 'No experience required',
  career_break_ok: 'Career breaks accepted',
  interview_guaranteed: 'Interview guaranteed',
  one_round_interview: 'One-round interview',
  urgent_hiring: 'Urgent hiring',
  online_interview: 'Online interview (Web)',
  no_aptitude_test: 'No aptitude test',
  weekend_off: 'Weekends off',
  shift_work: 'Shift work',
  remote_possible: 'Remote possible',
  full_remote: 'Full remote',
  flex_time: 'Flexible hours',
  overtime_negotiable: 'Overtime / leave negotiable',
  no_overtime: 'No overtime',
  overtime_under_10h: 'Overtime under 10h/month',
  overtime_under_20h: 'Overtime under 20h/month',
  housing_support: 'Housing support / rent allowance',
  maternity_childcare_leave: 'Maternity / childcare leave',
  foreigners_hired: 'Track record hiring foreigners',
  use_english: 'English used at work',
  use_chinese: 'Chinese used at work',
  use_other_language: 'Other languages used at work',
};

const HIGHLIGHT_LABELS_JP = {
  new_graduate_ok: '卒業予定者OK',
  no_experience_ok: '未経験OK',
  career_break_ok: 'ブランクOK',
  interview_guaranteed: '面接確約あり',
  one_round_interview: '面接1回',
  urgent_hiring: '急募',
  online_interview: 'オンライン面接',
  no_aptitude_test: '適性試験なし',
  weekend_off: '土日休み',
  shift_work: 'シフト制',
  remote_possible: 'リモート可',
  full_remote: 'フルリモート',
  flex_time: 'フレックスタイム',
  overtime_negotiable: '残業・休暇相談可',
  no_overtime: '残業なし',
  overtime_under_10h: '残業月10時間以内',
  overtime_under_20h: '残業月20時間以内',
  housing_support: '社宅・住宅手当',
  maternity_childcare_leave: '産休・育休実績',
  foreigners_hired: '外国人採用実績',
  use_english: '英語使用',
  use_chinese: '中国語使用',
  use_other_language: 'その他外国語使用',
};

const HIGHLIGHT_LABELS = { vi: HIGHLIGHT_LABELS_VI, en: HIGHLIGHT_LABELS_EN, jp: HIGHLIGHT_LABELS_JP };

const RECRUITMENT_MAP = {
  vi: { 1: 'Nhân viên chính thức', 2: 'Nhân viên hợp đồng có thời hạn', 3: 'Nhân viên phái cử', 4: 'Nhân viên bán thời gian', 5: 'Hợp đồng uỷ thác' },
  en: { 1: 'Regular employee', 2: 'Fixed-term contract employee', 3: 'Seconded employee', 4: 'Part-time employee', 5: 'Outsourcing contract' },
  jp: { 1: '正社員', 2: '有期契約社員', 3: '出向社員', 4: 'パートタイム', 5: '業務委託' },
};

const BUSINESS_SECTOR_OPTIONS = [
  { key: 'telecom_internet', vi: 'Viễn thông – Internet', en: 'Telecommunications & Internet', ja: '通信・インターネット' },
  { key: 'it', vi: 'Công nghệ thông tin (IT)', en: 'Information Technology (IT)', ja: 'IT（情報技術）' },
  { key: 'hr_services', vi: 'Nhân sự – Dịch vụ giới thiệu nhân sự nhân lực', en: 'Human Resources & Staffing Services', ja: '人事・人材紹介サービス' },
  { key: 'advertising_media', vi: 'Quảng cáo – Truyền thông – Phát thanh truyền hình', en: 'Advertising, Media & Broadcasting', ja: '広告・メディア・放送' },
  { key: 'retail_wholesale', vi: 'Bán lẻ – Bán buôn', en: 'Retail & Wholesale', ja: '小売・卸売' },
  { key: 'real_estate', vi: 'Bất động sản', en: 'Real Estate', ja: '不動産' },
  { key: 'finance_banking', vi: 'Tài chính – Ngân hàng', en: 'Finance & Banking', ja: '金融・銀行' },
  { key: 'insurance', vi: 'Bảo hiểm', en: 'Insurance', ja: '保険' },
  { key: 'restaurant_food', vi: 'Nhà hàng – Ăn uống', en: 'Restaurant & Food Services', ja: '飲食・レストラン' },
  { key: 'life_services', vi: 'Dịch vụ đời sống (giặt là, vệ sinh, sửa chữa, chăm sóc…)', en: 'Lifestyle Services (laundry, cleaning, repair, care, etc.)', ja: '生活サービス（クリーニング・清掃・修理・ケアなど）' },
  { key: 'education_training', vi: 'Giáo dục – Đào tạo', en: 'Education & Training', ja: '教育・研修' },
  { key: 'manufacturing', vi: 'Sản xuất – Chế tạo', en: 'Manufacturing', ja: '製造' },
  { key: 'management_consulting', vi: 'Quản lý – Tư vấn', en: 'Management & Consulting', ja: 'マネジメント・コンサルティング' },
  { key: 'medical_care', vi: 'Y tế – Chăm sóc sức khỏe', en: 'Medical & Healthcare', ja: '医療・ヘルスケア' },
  { key: 'pharma_biotech', vi: 'Dược phẩm – Công nghệ sinh học', en: 'Pharmaceuticals & Biotechnology', ja: '製薬・バイオテクノロジー' },
  { key: 'logistics_transport', vi: 'Vận tải – Giao thông – Logistics', en: 'Transportation & Logistics', ja: '運輸・交通・ロジスティクス' },
  { key: 'hotel_accommodation', vi: 'Khách sạn – Lưu trú', en: 'Hotels & Accommodation', ja: 'ホテル・宿泊' },
  { key: 'legal', vi: 'Pháp luật – Pháp lý', en: 'Legal', ja: '法律・リーガル' },
  { key: 'energy_resources', vi: 'Khai khoáng – Điện – Gas – Nước – Năng lượng', en: 'Mining, Utilities & Energy', ja: '資源・電力・ガス・水道・エネルギー' },
  { key: 'nonprofit', vi: 'Tổ chức công ích / Phi lợi nhuận', en: 'Public Interest / Non-profit', ja: '公益・非営利団体' },
  { key: 'government_admin', vi: 'Cơ quan nhà nước – Hành chính', en: 'Government & Public Administration', ja: '官公庁・行政' },
  { key: 'construction_maintenance', vi: 'Xây dựng – Sửa chữa – Bảo trì', en: 'Construction, Repair & Maintenance', ja: '建設・修繕・メンテナンス' },
  { key: 'art_entertainment', vi: 'Nghệ thuật – Giải trí – Nghỉ dưỡng', en: 'Arts, Entertainment & Leisure', ja: 'アート・エンタメ・レジャー' },
  { key: 'agriculture_fishery', vi: 'Nông nghiệp – Lâm nghiệp – Thủy sản', en: 'Agriculture, Forestry & Fisheries', ja: '農林水産' },
  { key: 'aerospace_defense', vi: 'Hàng không vũ trụ – Quốc phòng', en: 'Aerospace & Defence', ja: '航空宇宙・防衛' },
];

const HEADER_CONTACT = {
  website: 'ws-jobshare.com',
  hotline: '(+84)972899728',
  mail: 'jobshare@work-station.vn',
};

/** Labels đồng bộ với frontend JdTemplate.jsx */
const LABELS = {
  vi: {
    headerSlogan: 'Workstation JobShare',
    headerWebsite: 'Trang web',
    headerHotline: 'Đường dây nóng',
    headerMail: 'Email',
    sectionRecruitment: 'THÔNG TIN TUYỂN DỤNG',
    companyName: 'Tên công ty',
    jobTitle: 'Tiêu đề việc làm',
    jobCode: 'Mã tin tuyển dụng',
    recruitmentForm: 'Hình thức tuyển dụng',
    residenceStatus: 'Tư cách lưu trú',
    field: 'Lĩnh vực',
    jobType: 'Loại công việc',
    expYears: 'Số năm kinh nghiệm',
    numberOfHires: 'Số lượng tuyển dụng',
    highlights: 'Điểm nổi bật',
    jobDescription: 'Mô tả công việc',
    recruitmentReason: 'Lý do tuyển dụng',
    requiredConditions: 'Điều kiện ứng tuyển bắt buộc',
    preferredConditions: 'Điều kiện ưu tiên',
    annualIncome: 'Thu nhập năm',
    monthlySalary: 'Lương tháng',
    incomeDetails: 'Chi tiết về thu nhập',
    bonus: 'Thưởng',
    salaryReview: 'Tăng lương',
    transferAbility: 'Khả năng chuyển vùng',
    workLocation: 'Địa điểm làm việc',
    workLocationDetails: 'Chi tiết về địa điểm làm việc',
    workingTime: 'Thời gian làm việc',
    overtimeHoursPerMonth: 'Tổng số giờ làm thêm/tháng',
    overtimeDetails: 'Chi tiết về làm thêm',
    benefits: 'Chế độ phúc lợi',
    holidays: 'Ngày nghỉ',
    holidayDetails: 'Chi tiết về ngày nghỉ',
    probation: 'Thử việc',
    probationDetails: 'Chi tiết về thử việc',
    recruitmentProcess: 'Quy trình tuyển dụng',
    sectionCompany: 'THÔNG TIN VỀ CÔNG TY',
    stockExchangeInfo: 'Homepage',
    services: 'Các dịch vụ cung cấp',
    businessSectors: 'Phân loại lĩnh vực kinh doanh',
    revenue: 'Doanh thu',
    investmentCapital: 'Vốn đầu tư',
    numberOfEmployees: 'Số nhân viên',
    established: 'Thành lập',
    headquarters: 'Trụ sở tại',
    companyIntroduction: 'Giới thiệu chung về công ty',
  },
  en: {
    headerSlogan: 'Workstation JobShare',
    headerWebsite: 'Website',
    headerHotline: 'Hotline',
    headerMail: 'Mail',
    sectionRecruitment: 'RECRUITMENT INFORMATION',
    companyName: 'Company name',
    jobTitle: 'Job title',
    jobCode: 'Job code',
    recruitmentForm: 'Recruitment type',
    residenceStatus: 'Residence status',
    field: 'Field',
    jobType: 'Job type',
    expYears: 'Years of experience',
    numberOfHires: 'Number of hires',
    highlights: 'Highlights',
    jobDescription: 'Job description',
    recruitmentReason: 'Reason for recruitment',
    requiredConditions: 'Required conditions',
    preferredConditions: 'Preferred conditions',
    annualIncome: 'Annual income',
    monthlySalary: 'Monthly salary',
    incomeDetails: 'Income details',
    bonus: 'Bonus',
    salaryReview: 'Salary review',
    transferAbility: 'Transfer ability',
    workLocation: 'Work location',
    workLocationDetails: 'Work location details',
    workingTime: 'Working hours',
    overtimeHoursPerMonth: 'Overtime hours/month',
    overtimeDetails: 'Overtime details',
    benefits: 'Benefits',
    holidays: 'Holidays',
    holidayDetails: 'Holiday details',
    probation: 'Probation',
    probationDetails: 'Probation details',
    recruitmentProcess: 'Recruitment process',
    sectionCompany: 'COMPANY INFORMATION',
    stockExchangeInfo: 'Homepage',
    services: 'Services',
    businessSectors: 'Business sectors',
    revenue: 'Revenue',
    investmentCapital: 'Investment capital',
    numberOfEmployees: 'Number of employees',
    established: 'Established',
    headquarters: 'Headquarters',
    companyIntroduction: 'Company introduction',
  },
  jp: {
    headerSlogan: 'Workstation JobShare',
    headerWebsite: 'ウェブサイト',
    headerHotline: 'ホットライン',
    headerMail: 'メール',
    sectionRecruitment: '募集情報',
    companyName: '会社名',
    jobTitle: '求人タイトル',
    jobCode: '求人コード',
    recruitmentForm: '雇用形態',
    residenceStatus: '在留資格',
    field: '分野',
    jobType: '職種',
    expYears: '経験年数',
    numberOfHires: '採用人数',
    highlights: 'アピールポイント',
    jobDescription: '仕事内容',
    recruitmentReason: '募集理由',
    requiredConditions: '必須条件',
    preferredConditions: '歓迎条件',
    annualIncome: '年収',
    monthlySalary: '月給',
    incomeDetails: '収入の詳細',
    bonus: '賞与',
    salaryReview: '昇給',
    transferAbility: '転勤可否',
    workLocation: '勤務地',
    workLocationDetails: '勤務地の詳細',
    workingTime: '勤務時間',
    overtimeHoursPerMonth: '残業時間/月',
    overtimeDetails: '残業の詳細',
    benefits: '福利厚生',
    holidays: '休日',
    holidayDetails: '休日の詳細',
    probation: '試用期間',
    probationDetails: '試用期間の詳細',
    recruitmentProcess: '選考プロセス',
    sectionCompany: '会社情報',
    stockExchangeInfo: 'ホームページ',
    services: '提供サービス',
    businessSectors: '事業分野',
    revenue: '売上',
    investmentCapital: '投資資本',
    numberOfEmployees: '従業員数',
    established: '設立',
    headquarters: '本社',
    companyIntroduction: '会社紹介',
  },
};

/** Mỗi ngôn ngữ chỉ dùng đúng cột tương ứng — không fallback sang tiếng Việt khi xuất JD EN/JP. */
function pickByLang(obj, lang, keyVi, keyEn = null, keyJp = null) {
  const en = keyEn || (keyVi ? `${keyVi}En` : null);
  const jp = keyJp || (keyVi ? `${keyVi}Jp` : null);
  if (!obj) return '';
  const raw = obj.dataValues || obj;
  if (lang === 'vi') {
    const v = raw[keyVi];
    return v != null && String(v).trim() !== '' ? String(v).trim() : '';
  }
  if (lang === 'en' && en) {
    const v = raw[en];
    return v != null && String(v).trim() !== '' ? String(v).trim() : '';
  }
  if (lang === 'jp' && jp) {
    const v = raw[jp];
    return v != null && String(v).trim() !== '' ? String(v).trim() : '';
  }
  return '';
}

function pickDetailLines(arr, lang) {
  const key = lang === 'vi' ? 'content' : lang === 'en' ? 'contentEn' : 'contentJp';
  return (arr || [])
    .map((row) => {
      const r = row?.dataValues || row;
      const v = r[key];
      if (v == null || String(v).trim() === '') return '';
      return String(v).trim();
    })
    .filter(Boolean);
}

function parseResidenceStatuses(rawValue) {
  if (Array.isArray(rawValue)) return rawValue.map((v) => String(v).trim()).filter(Boolean);
  if (rawValue == null) return [];
  const text = String(rawValue).trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      /* ignore */
    }
  }
  if (text.includes(',') && !text.includes('{')) {
    return text.split(',').map((v) => String(v).trim()).filter(Boolean);
  }
  if (text === 'true' || text === 'false') return [];
  return [text];
}

export function normalizeJobForTemplate(job, lang = 'vi') {
  const raw = job?.dataValues || job || {};
  const rc = raw.recruitingCompany?.dataValues || raw.recruitingCompany || {};
  const cat = raw.category?.dataValues || raw.category || {};
  const services = (rc.services || [])
    .map((s) => {
      const sv = s?.dataValues || s;
      return pickByLang(sv, lang, 'serviceName', 'serviceNameEn', 'serviceNameJp');
    })
    .filter(Boolean);
  const sectors = (rc.businessSectors || [])
    .map((bs) => {
      const b = bs?.dataValues || bs;
      return pickByLang(b, lang, 'sectorName', 'sectorNameEn', 'sectorNameJp');
    })
    .filter(Boolean);
  const recruitmentMap = RECRUITMENT_MAP[lang] || RECRUITMENT_MAP.vi;

  const salaryYear = (raw.salaryRanges || []).find(sr => (sr.type || '').toLowerCase().includes('year') || (sr.type || '').toLowerCase().includes('năm'));
  const salaryMonth = (raw.salaryRanges || []).find(sr => (sr.type || '').toLowerCase().includes('month') || (sr.type || '').toLowerCase().includes('tháng'));

  const contentKey = lang === 'vi' ? 'content' : lang === 'en' ? 'contentEn' : 'contentJp';
  const allRequiredTypes = ['technique', 'experience', 'language', 'certification'];
  const requiredReqs = (raw.requirements || [])
    .filter((r) => allRequiredTypes.includes(r.type))
    .map((r) => {
      const rw = r?.dataValues || r;
      const v = rw[contentKey];
      return v != null && String(v).trim() !== '' ? String(v).trim() : '';
    })
    .filter(Boolean);
  const eduReqs = (raw.requirements || [])
    .filter((r) => r.type === 'education')
    .map((r) => {
      const rw = r?.dataValues || r;
      const v = rw[contentKey];
      return v != null && String(v).trim() !== '' ? String(v).trim() : '';
    })
    .filter(Boolean);

  const expReq = (raw.requirements || []).find(
    (r) => r.type === 'experience' && String(r.status || '').toLowerCase() === 'required'
  );
  const expYearsVal = expReq
    ? (() => {
        const rw = expReq?.dataValues || expReq;
        const v = rw[contentKey];
        return v != null && String(v).trim() !== '' ? String(v).trim() : '';
      })()
    : '';

  const wlList = (raw.workingLocations || [])
    .map((wl) => {
      const w = wl?.dataValues || wl;
      const loc = pickByLang(w, lang, 'location', 'locationEn', 'locationJp');
      const country = pickByLang(w, lang, 'country', 'countryEn', 'countryJp');
      if (!loc && !country) return '';
      return loc + (country ? ' (' + country + ')' : '');
    })
    .filter(Boolean);

  const highlightLabels = HIGHLIGHT_LABELS[lang] || HIGHLIGHT_LABELS_VI;
  const parseHighlights = (v) => {
    if (Array.isArray(v)) {
      return v.map((item) => {
        if (item == null) return '';
        if (typeof item === 'object') {
          const rawKey = item.key || item.value || item.id || item.vi || item.en || item.jp;
          const key = String(rawKey || '').trim();
          if (!key) return '';
          return highlightLabels[key] || item.vi || item.en || item.jp || key;
        }
        const key = String(item).trim();
        return highlightLabels[key] || key;
      }).filter(Boolean);
    }
    if (v && typeof v === 'object') {
      const rawKey = v.key || v.value || v.id || v.vi || v.en || v.jp;
      const key = String(rawKey || '').trim();
      if (!key) return [];
      return [highlightLabels[key] || v.vi || v.en || v.jp || key];
    }
    if (v && typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.map((key) => {
              if (key == null) return '';
              if (typeof key === 'object') {
                const rawKey = key.key || key.value || key.id || key.vi || key.en || key.jp;
                const kk = String(rawKey || '').trim();
                return highlightLabels[kk] || key.vi || key.en || key.jp || kk;
              }
              const k = String(key).trim();
              return highlightLabels[k] || k;
            }).filter(Boolean);
          }
        } catch { /* fallback */ }
      }
      return trimmed.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map((key) => highlightLabels[key] || key);
    }
    return [];
  };

  const salaryDetailsList = pickDetailLines(raw.salaryRangeDetails, lang);
  const wlDetailsList = pickDetailLines(raw.workingLocationDetails, lang);
  const overtimeDetailsList = pickDetailLines(raw.overtimeAllowanceDetails, lang);

  const workingHourDetailsList = pickDetailLines(raw.workingHourDetails, lang);
  const whField = lang === 'vi' ? 'workingHours' : lang === 'en' ? 'workingHoursEn' : 'workingHoursJp';
  const workingHoursList = (raw.workingHours || [])
    .map((wh) => {
      const w = wh?.dataValues || wh;
      const v = w[whField];
      return v != null && String(v).trim() !== '' ? String(v).trim() : '';
    })
    .filter(Boolean);
  const workingTimeDisplay =
    workingHourDetailsList.length > 0 ? workingHourDetailsList.join('\n') : workingHoursList.join('\n');

  const residenceStatusMap = {
    engineer: { vi: 'Visa kỹ sư / tri thức nhân văn / nghiệp vụ quốc tế', en: 'Engineer / Specialist in Humanities / International Services', jp: '技術・人文知識・国際業務' },
    ssw: { vi: 'Visa kỹ năng đặc định', en: 'Specified Skilled Worker', jp: '特定技能' },
    student: { vi: 'Visa du học', en: 'Student Visa', jp: '留学' },
    pr: { vi: 'Visa vĩnh trú', en: 'Permanent Resident', jp: '永住者' },
    spouse: { vi: 'Visa vợ/chồng người Nhật', en: 'Spouse or Child of Japanese National', jp: '日本人の配偶者等' },
    ltr: { vi: 'Visa cư trú dài hạn', en: 'Long-term Resident', jp: '定住者' },
    other: { vi: 'Khác', en: 'Other', jp: 'その他' },
    hsp: { vi: 'Visa lao động trình độ cao', en: 'Highly Skilled Professional', jp: '高度専門職' },
    labor_skill: { vi: 'Visa thực tập sinh kỹ năng', en: 'Technical Intern Training', jp: '技能実習' },
    titp: { vi: 'Visa thực tập sinh kỹ năng', en: 'Technical Intern Training', jp: '技能実習' },
    dependent: { vi: 'Visa gia đình (phụ thuộc)', en: 'Dependent Visa', jp: '家族滞在' },
    short: { vi: 'Visa ngắn hạn', en: 'Temporary Visitor', jp: '短期滞在' },
    ict: { vi: 'Visa chuyển công tác nội bộ', en: 'Intra-company Transferee', jp: '企業内転勤' },
    entertainer: { vi: 'Visa biểu diễn / giải trí', en: 'Entertainer', jp: '興行' },
    prspouse: { vi: 'Visa vợ/chồng của người vĩnh trú', en: 'Spouse or Child of Permanent Resident', jp: '永住者の配偶者等' },
    no_requirement: { vi: 'Không yêu cầu', en: 'No requirement', jp: '不要' },
  };

  const socialInsuranceText = pickByLang(raw, lang, 'socialInsurance', 'socialInsuranceEn', 'socialInsuranceJp');
  const transportationText = pickByLang(raw, lang, 'transportation', 'transportationEn', 'transportationJp');
  const benefitTableLines = (raw.benefits || [])
    .map((b) => {
      const row = b?.dataValues || b;
      return pickByLang(row, lang, 'content', 'contentEn', 'contentJp');
    })
    .map((s) => String(s ?? '').trim())
    .filter(Boolean);
  const benefitsCombined = [
    ...[socialInsuranceText, transportationText].map((s) => String(s ?? '').trim()).filter(Boolean),
    ...benefitTableLines
  ].join('\n');

  const rcHeadquarters = pickByLang(rc, lang, 'headquarters', 'headquartersEn', 'headquartersJp');
  const rcIntroduction = pickByLang(rc, lang, 'companyIntroduction', 'companyIntroductionEn', 'companyIntroductionJp');

  return {
    companyName: pickByLang(rc, lang, 'companyName', 'companyNameEn', 'companyNameJp'),
    title: pickByLang(raw, lang, 'title', 'titleEn', 'titleJp'),
    jobCode: raw.jobCode || '',
    recruitmentType: raw.recruitmentType ? (recruitmentMap[raw.recruitmentType] || raw.recruitmentType) : '',
    residenceStatus: (() => {
      const candidates = [
        raw.residenceStatuses,
        raw.residence_statuses,
        raw.residenceStatus,
        raw.residence_status,
        raw.residenceStatusEn,
        raw.residence_status_en,
        raw.residenceStatusJp,
        raw.residence_status_jp,
      ].map(parseResidenceStatuses).flat().filter(Boolean);
      const uniqueKeys = Array.from(new Set(candidates));
      const labels = uniqueKeys.map((k, index) => {
        const key = String(k).trim();
        const lower = key.toLowerCase();
        const matchedKey = Object.keys(residenceStatusMap).find((rk) => {
          const vi = String(residenceStatusMap[rk].vi || '').toLowerCase();
          const en = String(residenceStatusMap[rk].en || '').toLowerCase();
          const jp = String(residenceStatusMap[rk].jp || '').toLowerCase();
          return rk === key || vi === lower || en === lower || jp === key || jp === lower;
        });
        const label = matchedKey ? (residenceStatusMap[matchedKey]?.[lang] || residenceStatusMap[matchedKey]?.vi || key) : (lower === 'no_requirement' || lower === 'no requirement' ? (lang === 'jp' ? '不要' : lang === 'en' ? 'No requirement' : 'Không yêu cầu') : key);
        return `${index + 1}. ${label}`;
      }).filter(Boolean);
      return labels.join('\n');
    })(),
    fieldLabel: (() => {
      const key = (raw.businessSectorKey || '').trim();
      if (!key) return '';
      const opt = BUSINESS_SECTOR_OPTIONS.find((o) => (o.key || o.vi) === key);
      if (!opt) return key;
      if (lang === 'en') return opt.en || '';
      if (lang === 'jp') return opt.ja || '';
      return opt.vi || '';
    })(),
    categoryName: pickByLang(cat, lang, 'name', 'nameEn', 'nameJp'),
    expYears: expYearsVal,
    numberOfHires: formatNumberOfHiresForLang(raw.workingLocations?.[0]?.numberOfHires, lang) || '',
    highlights: parseHighlights(raw.highlights),
    description: pickByLang(raw, lang, 'description', 'descriptionEn', 'descriptionJp'),
    requiredConditions: requiredReqs.join('\n') || '',
    preferredConditions: eduReqs.join('\n') || '',
    salaryYear: salaryYear ? pickByLang(salaryYear, lang, 'salaryRange', 'salaryRangeEn', 'salaryRangeJp') : '',
    salaryMonth: salaryMonth ? pickByLang(salaryMonth, lang, 'salaryRange', 'salaryRangeEn', 'salaryRangeJp') : '',
    salaryDetails: salaryDetailsList.join('\n'),
    bonus: pickByLang(raw, lang, 'bonus', 'bonusEn', 'bonusJp'),
    salaryReview: pickByLang(raw, lang, 'salaryReview', 'salaryReviewEn', 'salaryReviewJp'),
    workingLocations: wlList.join(', '),
    workingLocationDetails: wlDetailsList.join('\n'),
    workingHours: workingTimeDisplay,
    overtime: pickByLang(raw, lang, 'overtime', 'overtimeEn', 'overtimeJp'),
    overtimeDetails:
      overtimeDetailsList.join('\n') ||
      (raw.overtimeAllowances || [])
        .map((oa) => {
          const o = oa?.dataValues || oa;
          return pickByLang(o, lang, 'overtimeAllowanceRange', 'overtimeAllowanceRangeEn', 'overtimeAllowanceRangeJp');
        })
        .filter(Boolean)
        .join(', '),
    benefits: benefitsCombined,
    holidays: pickByLang(raw, lang, 'holidays', 'holidaysEn', 'holidaysJp'),
    holidayDetails: pickByLang(raw, lang, 'holidayDetails', 'holidayDetailsEn', 'holidayDetailsJp'),
    probationPeriod: pickByLang(raw, lang, 'probationPeriod', 'probationPeriodEn', 'probationPeriodJp'),
    probationDetail: pickByLang(raw, lang, 'probationDetail', 'probationDetailEn', 'probationDetailJp'),
    recruitmentProcess: pickByLang(raw, lang, 'recruitmentProcess', 'recruitmentProcessEn', 'recruitmentProcessJp'),
    transferAbility: pickByLang(raw, lang, 'transferAbility', 'transferAbilityEn', 'transferAbilityJp'),
    rcCompanyName: pickByLang(rc, lang, 'companyName', 'companyNameEn', 'companyNameJp'),
    rcStockExchange: pickByLang(rc, lang, 'stockExchangeInfo', 'stockExchangeInfoEn', 'stockExchangeInfoJp'),
    rcServices: services.join(', '),
    rcBusinessSectors: sectors.join(', '),
    rcRevenue: pickByLang(rc, lang, 'revenue', 'revenueEn', 'revenueJp'),
    rcInvestmentCapital: pickByLang(rc, lang, 'investmentCapital', 'investmentCapitalEn', 'investmentCapitalJp'),
    rcNumberOfEmployees: pickByLang(rc, lang, 'numberOfEmployees', 'numberOfEmployeesEn', 'numberOfEmployeesJp'),
    rcEstablished: pickByLang(rc, lang, 'establishedDate', 'establishedDateEn', 'establishedDateJp'),
    rcHeadquarters,
    rcIntroduction,
  };
}

/* ── Inline styles matching JdTemplate.jsx ── */
const JD_BORDER_COLOR = '#cbd5e1';
const JD_BORDER = `1.25px solid ${JD_BORDER_COLOR}`;
const LBL = 'padding:6px 8px;font-size:11px;font-weight:500;color:white;background:#dc2626;width:140px;box-sizing:border-box;word-wrap:break-word;vertical-align:middle';
const CELL = 'padding:6px 8px;font-size:11px;color:#111827;background:white;box-sizing:border-box;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;vertical-align:middle';
const BORDER = `border-bottom:${JD_BORDER}`;

function rowHtml(label, value) {
  return `<div style="display:flex;${BORDER}">
  <div style="${LBL}">${esc(label)}</div>
  <div style="flex:1;${CELL};border-left:${JD_BORDER}">${orDash(value)}</div>
</div>`;
}

function rowDoubleHtml(label1, value1, label2, value2) {
  return `<div style="display:flex;${BORDER}">
  <div style="${LBL}">${esc(label1)}</div>
  <div style="flex:1;min-width:60px;${CELL};border-left:${JD_BORDER}">${orDash(value1)}</div>
  <div style="${LBL};border-left:${JD_BORDER}">${esc(label2)}</div>
  <div style="flex:1;min-width:80px;${CELL};border-left:${JD_BORDER}">${orDash(value2)}</div>
</div>`;
}

function sectionFullHtml(label, content) {
  return `<div style="${BORDER}">
  <div style="width:100%;padding:6px 8px;font-size:11px;font-weight:500;color:white;background:#dc2626">${esc(label)}</div>
  <div style="padding:8px;font-size:11px;color:#111827;background:white;border-top:${JD_BORDER};min-height:24px;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word">${orDash(content)}</div>
</div>`;
}

/**
 * Tạo HTML đầy đủ cho JD template PDF — giao diện khớp frontend JdTemplate.jsx
 * @param {Object} [options]
 * @param {string} [options.logoFileUrl] — `file:///.../logo.png` (ưu tiên cao nhất khi Puppeteer copy logo ra temp).
 * @param {string} [options.logoFileName] — tên file cạnh `index.html` (tương đối), nếu không dùng `logoFileUrl`.
 */
export function generateJdTemplateHtml(job, lang = 'vi', options = {}) {
  const L = LABELS[lang] || LABELS.vi;
  const d = normalizeJobForTemplate(job, lang);

  const highlightsHtml = d.highlights.length
    ? d.highlights.map(h => `${esc(h)}`).join(' / ')
    : '—';

  const logoFileUrl =
    options.logoFileUrl != null && String(options.logoFileUrl).trim() !== ''
      ? String(options.logoFileUrl).trim()
      : '';
  const relLogo =
    !logoFileUrl && options.logoFileName != null && String(options.logoFileName).trim() !== ''
      ? String(options.logoFileName).trim()
      : '';
  const logoDataUrl = logoFileUrl || relLogo ? '' : getJdTemplateLogoDataUrl();
  const logoHtml = logoFileUrl
    ? `<img src="${esc(logoFileUrl)}" alt="Logo" style="height:40px;width:auto;object-fit:contain" />`
    : relLogo
      ? `<img src="${esc(relLogo)}" alt="Logo" style="height:40px;width:auto;object-fit:contain" />`
      : logoDataUrl
        ? `<img src="${logoDataUrl}" alt="Logo" style="height:40px;width:auto;object-fit:contain" />`
        : '';

  const headerHtml = `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;background:#ffffff;border-bottom:${JD_BORDER};flex-wrap:wrap">
  <div style="flex-shrink:0">${logoHtml}</div>
  <div style="flex:1;min-width:0;text-align:right;font-size:10px;color:#374151;line-height:1.4">
    <div style="font-weight:600;margin-bottom:4px">${esc(L.headerSlogan)}</div>
    <div>${esc(L.headerWebsite)}: ${esc(HEADER_CONTACT.website)}</div>
    <div>${esc(L.headerHotline)}: ${esc(HEADER_CONTACT.hotline)}</div>
    <div>${esc(L.headerMail)}: ${esc(HEADER_CONTACT.mail)}</div>
  </div>
</div>`;

  /* ── Company info section: 2-column grid matching frontend ── */
  const companyGridRow = (lbl, val) =>
    `<div style="display:flex;${BORDER};border-right:${JD_BORDER}">
      <div style="${LBL}">${esc(lbl)}</div>
      <div style="flex:1;${CELL};border-left:${JD_BORDER}">${orDash(val)}</div>
    </div>`;

  const companyGrid = `
  <div style="display:grid;grid-template-columns:1fr 1fr">
    ${companyGridRow(L.companyName, d.rcCompanyName)}
    ${companyGridRow(L.stockExchangeInfo, d.rcStockExchange)}
    ${companyGridRow(L.services, d.rcServices)}
    ${companyGridRow(L.businessSectors, d.rcBusinessSectors)}
    ${companyGridRow(L.revenue, d.rcRevenue)}
    ${companyGridRow(L.investmentCapital, d.rcInvestmentCapital)}
    ${companyGridRow(L.numberOfEmployees, d.rcNumberOfEmployees)}
    ${companyGridRow(L.established, d.rcEstablished)}
  </div>
  ${rowHtml(L.headquarters, d.rcHeadquarters)}
  ${sectionFullHtml(L.companyIntroduction, d.rcIntroduction)}`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans JP','Segoe UI','Hiragino Sans','Yu Gothic','Meiryo',system-ui,sans-serif;font-size:11px;color:#111827;margin:0;padding:12px;line-height:1.4}
.jd-wrap{max-width:100%;overflow:hidden;border:${JD_BORDER};border-radius:4px}
</style></head><body>
<div class="jd-wrap">
  ${headerHtml}
  <div style="padding:8px 12px;font-weight:bold;font-size:13px;color:#111827;border-bottom:${JD_BORDER}">${esc(L.sectionRecruitment)}</div>
  ${rowHtml(L.companyName, d.companyName)}
  ${rowHtml(L.jobTitle, d.title)}
  ${rowHtml(L.jobCode, d.jobCode)}
  <div style="display:flex;${BORDER}">
    <div style="${LBL}">${esc(L.recruitmentForm)}</div>
    <div style="flex:1;min-width:60px;${CELL};border-left:${JD_BORDER}">${orDash(d.recruitmentType)}</div>
    <div style="${LBL};border-left:${JD_BORDER}">${esc(L.residenceStatus)}</div>
    <div style="flex:1;min-width:80px;${CELL};border-left:${JD_BORDER};white-space:pre-line">${d.residenceStatus ? nl2br(d.residenceStatus) : '—'}</div>
  </div>
  ${rowHtml(L.field, d.fieldLabel)}
  ${rowHtml(L.jobType, d.categoryName)}
  ${rowHtml(L.expYears, d.expYears)}
  ${rowHtml(L.numberOfHires, d.numberOfHires)}
  ${rowHtml(L.highlights, highlightsHtml)}
  ${sectionFullHtml(L.jobDescription, d.description)}
  ${sectionFullHtml(L.requiredConditions, d.requiredConditions)}
  ${sectionFullHtml(L.preferredConditions, d.preferredConditions)}
  ${rowDoubleHtml(L.annualIncome, d.salaryYear, L.monthlySalary, d.salaryMonth)}
  ${sectionFullHtml(L.incomeDetails, d.salaryDetails)}
  ${sectionFullHtml(L.bonus, d.bonus)}
  ${sectionFullHtml(L.salaryReview, d.salaryReview)}
  ${rowDoubleHtml(L.transferAbility, d.transferAbility, L.workLocation, d.workingLocations)}
  ${sectionFullHtml(L.workLocationDetails, d.workingLocationDetails)}
  ${sectionFullHtml(L.workingTime, d.workingHours)}
  ${rowHtml(L.overtimeHoursPerMonth, d.overtime)}
  ${sectionFullHtml(L.overtimeDetails, d.overtimeDetails)}
  ${sectionFullHtml(L.benefits, d.benefits)}
  ${rowHtml(L.holidays, d.holidays)}
  ${sectionFullHtml(L.holidayDetails, d.holidayDetails)}
  ${rowHtml(L.probation, d.probationPeriod)}
  ${sectionFullHtml(L.probationDetails, d.probationDetail)}
  ${sectionFullHtml(L.recruitmentProcess, d.recruitmentProcess)}
  <div style="margin-top:8px">
    <div style="width:100%;padding:8px 12px;font-weight:bold;font-size:13px;color:white;background:#4b5563">${esc(L.sectionCompany)}</div>
    ${companyGrid}
  </div>
</div>
</body></html>`;
}
