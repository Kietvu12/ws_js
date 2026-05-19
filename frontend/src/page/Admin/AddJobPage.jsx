import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import { BUSINESS_SECTOR_OPTIONS } from '../../utils/businessSectorOptions';
import { downloadBlobAsFile, openRemoteFileDownloadUrl } from '../../utils/safeFileDownload.js';
import JdTemplate from '../../component/Admin/AddJob/JdTemplate';
import { JOB_HIGHLIGHT_OPTIONS } from '../../utils/jobHighlightOptions';
import { JAPANESE_LEVEL_OPTIONS, EXPERIENCE_YEARS_OPTIONS, DRIVER_LICENSE_OPTIONS } from '../../utils/requirementPresetOptions';
import { JAPAN_REGIONS, JAPAN_PREFECTURES, fetchJapanCitiesByPrefecture, kanaToRomaji } from '../../utils/japanLocationData';
import {
  getRecruitmentLocationLabel,
  recruitmentLocationLangFromFormTab,
} from '../../utils/recruitmentLocationLabels.js';
import {
  NUMBER_OF_HIRES_OPTION_VALUES,
  normalizeNumberOfHiresStored,
  getNumberOfHiresDisplayLabel,
} from '../../utils/numberOfHiresOptions.js';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  FileText,
  Tag,
  Calendar,
  Upload,
  Plus,
  Save,
  X,
  DollarSign as Money,
  Award,
  Users,
  CheckSquare,
  Eye,
  Download,
  Languages,
  Pencil,
  Trash2,
} from 'lucide-react';

// Dữ liệu quốc gia và tỉnh/thành phố
const countryProvincesData = {
  'Vietnam': [
    'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'An Giang', 'Bà Rịa - Vũng Tàu',
    'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương',
    'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên',
    'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Tĩnh', 'Hải Dương',
    'Hậu Giang', 'Hòa Bình', 'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
    'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình',
    'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh',
    'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
    'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
  ],
  'Japan': [
    'Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kawasaki',
    'Saitama', 'Hiroshima', 'Sendai', 'Chiba', 'Kitakyushu', 'Sakai', 'Niigata', 'Hamamatsu',
    'Shizuoka', 'Sagamihara', 'Okayama', 'Kumamoto', 'Kagoshima', 'Utsunomiya', 'Hachioji',
    'Matsuyama', 'Kanazawa', 'Nagano', 'Toyama', 'Gifu', 'Fukushima', 'Mito', 'Akita', 'Aomori',
    'Morioka', 'Yamagata', 'Fukui', 'Tottori', 'Matsue', 'Kofu', 'Maebashi', 'Takamatsu',
    'Tokushima', 'Kochi', 'Miyazaki', 'Naha', 'Okinawa'
  ],
  'Other': [] // Cho phép nhập tùy chỉnh
};

const PARSE_JD_API_URL = 'https://ws-jobshare.com/api_ai/v2/parser/jd';
const JD_TRANSLATE_API_URL = 'https://ws-jobshare.com/api_ai/v2/parser/jd/translate';
const TAB_LANG_META = {
  vi: { suffix: '', code: 'vi' },
  en: { suffix: 'En', code: 'en' },
  jp: { suffix: 'Jp', code: 'ja' },
};
/** Tên field form-data khi gửi file. Nếu API trả 422, thử đổi thành 'cv_original'. */
const PARSE_JD_FILE_FIELD = 'file';

/** JD parse: description có thể là string, mảng, hoặc { vi, en, ja } với giá trị string hoặc mảng — mỗi ý một dòng. */
function jdDescriptionToText(desc, lang) {
  if (desc == null) return '';
  if (typeof desc === 'string') return desc;
  if (Array.isArray(desc)) {
    return desc.map((x) => String(x).trim()).filter(Boolean).join('\n');
  }
  if (typeof desc === 'object') {
    let v;
    if (lang === 'vi') v = desc.vi;
    else if (lang === 'en') v = desc.en;
    else v = desc.ja ?? desc.jp;
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).join('\n');
    if (v != null && v !== '') return String(v);
    return '';
  }
  return String(desc);
}

/** Preset dropdown «Ngày nghỉ»: khớp theo đúng field ngôn ngữ (holidays / holidaysEn / holidaysJp). */
function getHolidaysPresetSelectValue(languageTab, fd) {
  if (languageTab === 'vi') {
    const v = String(fd.holidays ?? '').trim().toLowerCase();
    if (v === 'nghỉ t7, cn' || v === 'nghỉ t7,cn') return 'weekend';
    if (v === 'nghỉ hoàn toàn 2 ngày mỗi tuần') return 'twoDays';
    if (v === 'nghỉ 1–2 ngày mỗi tuần (theo lịch ca)' || v === 'nghỉ 1-2 ngày mỗi tuần (theo lịch ca)') return 'oneToTwoShift';
    if (v === 'nghỉ theo ca') return 'shiftOff';
    if (v === 'làm việc luân phiên / xoay ca' || v === 'làm việc luân phiên/ xoay ca') return 'rotating';
    if (v === 'nghỉ theo lịch công ty') return 'companyCalendar';
    if (v === 'nghỉ theo lịch dự án') return 'projectSchedule';
    return '';
  }
  if (languageTab === 'en') {
    const e = String(fd.holidaysEn ?? '').trim().toLowerCase();
    if (e === 'sat/sun off' || e === 'sat & sun off') return 'weekend';
    if (e === 'two full days off per week' || e === 'two days off per week') return 'twoDays';
    if (e === '1–2 days off per week (shift-based)' || e === '1-2 days off per week (shift-based)') return 'oneToTwoShift';
    if (e === 'shift-based days off' || e === 'days off by shift') return 'shiftOff';
    if (e === 'rotating shifts' || e === 'rotation / shift work') return 'rotating';
    if (e === 'according to company calendar' || e === 'company calendar') return 'companyCalendar';
    if (e === 'according to project schedule' || e === 'project schedule') return 'projectSchedule';
    return '';
  }
  const j = String(fd.holidaysJp ?? '').trim();
  if (j === '土日休み') return 'weekend';
  if (j === '完全週休2日') return 'twoDays';
  if (j === 'シフトにより週休1〜2日') return 'oneToTwoShift';
  if (j === 'シフト休') return 'shiftOff';
  if (j === '交代制／シフト制') return 'rotating';
  if (j === '会社カレンダーによる休日') return 'companyCalendar';
  if (j === 'プロジェクトスケジュールによる休日') return 'projectSchedule';
  return '';
}

/**
 * JD parse: requirements_must / requirements_preferred dạng { vi: [], en: [], ja: [] } — mỗi phần tử một dòng requirement.
 * JdTemplate "Điều kiện ưu tiên" chỉ gom type `education` (không gồm `other`).
 */
function jdLocalizedRequirementRows(obj, reqType, status) {
  if (obj == null) return [];
  if (Array.isArray(obj)) {
    return obj
      .map((t) => {
        if (t == null) return null;
        if (typeof t === 'string' || typeof t === 'number') {
          return { content: String(t), contentEn: '', contentJp: '', type: reqType, status };
        }
        if (typeof t === 'object') {
          return {
            content: String(t.vi ?? t.en ?? '').trim(),
            contentEn: String(t.en ?? '').trim(),
            contentJp: String(t.ja ?? t.jp ?? '').trim(),
            type: reqType,
            status,
          };
        }
        return { content: String(t), contentEn: '', contentJp: '', type: reqType, status };
      })
      .filter((r) => r && (r.content || r.contentEn || r.contentJp));
  }
  if (typeof obj === 'object') {
    const vi = obj.vi;
    const en = obj.en;
    const ja = obj.ja ?? obj.jp;
    const viA = Array.isArray(vi);
    const enA = Array.isArray(en);
    const jaA = Array.isArray(ja);
    if (viA || enA || jaA) {
      const n = Math.max(viA ? vi.length : vi != null && vi !== '' ? 1 : 0, enA ? en.length : en != null && en !== '' ? 1 : 0, jaA ? ja.length : ja != null && ja !== '' ? 1 : 0);
      const rows = [];
      for (let i = 0; i < n; i++) {
        const cVi = viA ? vi[i] : i === 0 ? vi : '';
        const cEn = enA ? en[i] : i === 0 ? en : '';
        const cJa = jaA ? ja[i] : i === 0 ? ja : '';
        rows.push({
          content: cVi != null ? String(cVi).trim() : '',
          contentEn: cEn != null ? String(cEn).trim() : '',
          contentJp: cJa != null ? String(cJa).trim() : '',
          type: reqType,
          status,
        });
      }
      return rows.filter((r) => r.content || r.contentEn || r.contentJp);
    }
    return [
      {
        content: String(vi ?? en ?? '').trim(),
        contentEn: String(en ?? '').trim(),
        contentJp: String(ja ?? '').trim(),
        type: reqType,
        status,
      },
    ].filter((r) => r.content || r.contentEn || r.contentJp);
  }
  return [];
}

/**
 * JD parse: `location` có thể là string, mảng, hoặc { vi: [], en: [], ja: [] } — trả về từng dòng địa điểm.
 */
function jdLocationEntriesFromRaw(locRaw) {
  if (locRaw == null) return [];
  if (Array.isArray(locRaw)) return locRaw;
  if (typeof locRaw === 'string') return [{ vi: locRaw, en: '', ja: '' }];
  if (typeof locRaw === 'object') {
    const vi = locRaw.vi;
    const en = locRaw.en;
    const ja = locRaw.ja ?? locRaw.jp;
    const viA = Array.isArray(vi);
    const enA = Array.isArray(en);
    const jaA = Array.isArray(ja);
    if (viA || enA || jaA) {
      const n = Math.max(
        viA ? vi.length : vi != null && vi !== '' ? 1 : 0,
        enA ? en.length : en != null && en !== '' ? 1 : 0,
        jaA ? ja.length : ja != null && ja !== '' ? 1 : 0
      );
      const rows = [];
      for (let i = 0; i < n; i++) {
        const v = viA ? vi[i] : i === 0 ? vi : '';
        const e = enA ? en[i] : i === 0 ? en : '';
        const j = jaA ? ja[i] : i === 0 ? ja : '';
        rows.push({
          vi: v != null ? String(v).trim() : '',
          en: e != null ? String(e).trim() : '',
          ja: j != null ? String(j).trim() : '',
        });
      }
      return rows.filter((r) => r.vi || r.en || r.ja);
    }
    return [
      {
        vi: vi != null ? String(vi).trim() : '',
        en: en != null ? String(en).trim() : '',
        ja: ja != null ? String(ja).trim() : '',
      },
    ].filter((r) => r.vi || r.en || r.ja);
  }
  return [];
}

/** Format số tiền từ API JD (yearly_salary / monthly_salary). */
function formatJdSalaryAmount(val, currency) {
  if (val == null || val === '') return '';
  const cur = currency || 'JPY';
  const raw = String(val).replace(/,/g, '').trim();
  const n = Number(raw);
  if (Number.isFinite(n)) return `${n.toLocaleString('en-US')} ${cur}`.trim();
  return `${String(val).trim()} ${cur}`.trim();
}

/** `location` có thể là string hoặc object đa ngôn ngữ từ parse/API — chuẩn hóa trước khi .trim / gửi lưu. */
function normalizeWorkingLocationField(loc) {
  if (loc == null || loc === '') return '';
  if (typeof loc === 'string') return loc.trim();
  if (typeof loc === 'object') {
    const s = loc.vi ?? loc.en ?? loc.name ?? loc.ja ?? loc.jp;
    return s != null ? String(s).trim() : '';
  }
  return String(loc).trim();
}

function sanitizeWorkingLocationsForApi(locs) {
  return (locs || [])
    .map((wl) => {
      let location = normalizeWorkingLocationField(wl?.location);
      if (!location && wl?.locationJp != null && String(wl.locationJp).trim()) {
        location = String(wl.locationJp).trim();
      }
      const rawHires = wl?.numberOfHires;
      const numberOfHires =
        rawHires != null && String(rawHires).trim() !== ''
          ? normalizeNumberOfHiresStored(rawHires)
          : rawHires;
      return { ...wl, location, numberOfHires };
    })
    .filter((wl) => wl.location);
}

function getWorkingLocationsNumberOfHires(locs) {
  const raw =
    (locs || []).find((wl) => wl?.numberOfHires != null && String(wl.numberOfHires).trim() !== '')?.numberOfHires || '';
  return normalizeNumberOfHiresStored(raw);
}

const createAddJobJapanRegionEntry = (region, languageTab) => ({
  location: languageTab === 'jp' ? region.ja : region.en,
  locationJp: region.ja,
  country: 'Japan',
  jpId: `region|${region.id}`,
  locationLevel: 'region',
  searchTerm: region.ja,
});

const createAddJobJapanPrefectureEntry = (prefCode, languageTab) => {
  const pref = JAPAN_PREFECTURES[prefCode];
  if (!pref) return null;
  return {
    location: languageTab === 'jp' ? pref.ja : pref.en,
    locationJp: pref.ja,
    country: 'Japan',
    jpId: `pref|${prefCode}`,
    locationLevel: 'prefecture',
    searchTerm: pref.ja,
  };
};

const createAddJobJapanWardEntry = (prefCode, nameJa, nameKana, languageTab) => {
  const pref = JAPAN_PREFECTURES[prefCode];
  const prefJa = pref?.ja || '';
  const prefEn = pref?.en || '';
  const toRomaji = (kana, fallback) => (kana ? kanaToRomaji(kana) : fallback);
  const ja = nameJa.trim();
  const alpha = (languageTab === 'jp' ? ja : toRomaji(nameKana, nameJa)).trim();
  return {
    location: alpha,
    locationJp: ja,
    country: 'Japan',
    jpId: `${prefCode}|${nameJa}`,
    locationLevel: 'ward',
    searchTerm: nameJa,
    parentPrefectureJp: prefJa,
    parentPrefectureEn: prefEn,
  };
};

/** Mã job duy nhất khi tạo mới (backend vẫn bắt buộc jobCode). */
function generateNewJobCode() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `WS-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    }
  } catch (_) {
    /* ignore */
  }
  return `WS-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const AdminAddJobPage = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;

  const pickByLanguage = (item, fieldBase = 'name') => {
    if (!item) return '';
    const vi = item[fieldBase] || '';
    const en = item[`${fieldBase}En`] || item[`${fieldBase}_en`] || '';
    const ja = item[`${fieldBase}Jp`] || item[`${fieldBase}_jp`] || '';

    if (language === 'en') return en || vi;
    if (language === 'ja') return ja || vi;
    return vi;
  };

  const sanitizeFilenamePart = (input) => String(input ?? '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || 'download';

  const getJdTitleForLang = (lang) => {
    if (lang === 'en') return formData.titleEn || '';
    if (lang === 'jp') return formData.titleJp || '';
    return formData.title || '';
  };

  const buildJdPdfFilename = (lang) => {
    const code = sanitizeFilenamePart(formData.jobCode);
    const title = sanitizeFilenamePart(getJdTitleForLang(lang));
    return `${code}_${title}.pdf`;
  };
  const [formData, setFormData] = useState({
    // Basic Information (required)
    jobCode: '',
    title: '',
    titleEn: '',
    titleJp: '',
    slug: '', // Auto-generate from title
    description: '',
    descriptionEn: '',
    descriptionJp: '',

    // Job category (Loại công việc) - chọn bằng popup
    categoryId: '',
    // Lĩnh vực (business sector key) - danh sách giống block Lĩnh vực kinh doanh
    businessSectorKey: '',
    companyId: '',
    // Location
    interviewLocation: '',
    numberOfHires: '',
    numberOfHiresEn: '',
    numberOfHiresJp: '',
    // Salary & Benefits
    bonus: '',
    bonusEn: '',
    bonusJp: '',
    salaryReview: '',
    salaryReviewEn: '',
    salaryReviewJp: '',
    socialInsurance: '',
    socialInsuranceEn: '',
    socialInsuranceJp: '',
    transportation: '',
    transportationEn: '',
    transportationJp: '',
    breakTime: '',
    breakTimeEn: '',
    breakTimeJp: '',
    overtime: '',
    overtimeEn: '',
    overtimeJp: '',
    holidays: '',
    holidaysEn: '',
    holidaysJp: '',
    holidayDetails: '',
    holidayDetailsEn: '',
    holidayDetailsJp: '',
    deadline: '',
    // Recruitment Type
    recruitmentType: '',
    residenceStatuses: [],
    residenceStatus: '',
    residenceStatusEn: '',
    residenceStatusJp: '',
    contractPeriod: '',
    contractPeriodEn: '',
    contractPeriodJp: '',
    probationPeriod: '',
    probationPeriodEn: '',
    probationPeriodJp: '',
    probationDetail: '',
    probationDetailEn: '',
    probationDetailJp: '',
    recruitmentProcess: '',
    recruitmentProcessEn: '',
    recruitmentProcessJp: '',
    transferAbility: '',
    transferAbilityEn: '',
    transferAbilityJp: '',
    highlights: '',
    // Commission
    jobCommissionType: 'fixed', // 'fixed' or 'percent'
    // Status
    status: 1, // 0: Draft, 1: Published, 2: Closed, 3: Expired
    isPinned: false,
    isHot: false,
  });
  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Related data arrays
  const [workingLocations, setWorkingLocations] = useState([]);
  const [workingLocationDetails, setWorkingLocationDetails] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [salaryRanges, setSalaryRanges] = useState([
    { salaryRange: '', salaryRangeEn: '', salaryRangeJp: '', type: 'yearly' },   // Thu nhập năm
    { salaryRange: '', salaryRangeEn: '', salaryRangeJp: '', type: 'monthly' },   // Lương tháng
  ]);
  const [salaryRangeDetails, setSalaryRangeDetails] = useState([]);
  const [overtimeAllowances, setOvertimeAllowances] = useState([]);
  const [overtimeAllowanceDetails, setOvertimeAllowanceDetails] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [smokingPolicies, setSmokingPolicies] = useState([]);
  const [smokingPolicyDetails, setSmokingPolicyDetails] = useState([]);
  const [workingHours, setWorkingHours] = useState([]);
  const [workingHourDetails, setWorkingHourDetails] = useState([]);
  /** Các dòng phúc lợi bổ sung (bảng `benefits`: content / content_en / content_jp) */
  const [jobBenefitRows, setJobBenefitRows] = useState([]);
  const [jdFileJp, setJdFileJp] = useState(null);
  /** Khi sửa job: tên file JD gốc đã lưu trên server (input file không load lại được từ DB) */
  const [existingJdOriginalFilename, setExistingJdOriginalFilename] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState([]);
  const [types, setTypes] = useState([]);
  const [valuesByType, setValuesByType] = useState({});
  const [jobValues, setJobValues] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [showAddValueModal, setShowAddValueModal] = useState(false);
  const [showEditTypeModal, setShowEditTypeModal] = useState(false);
  const [showEditValueModal, setShowEditValueModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [editingValue, setEditingValue] = useState(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeNameEn, setNewTypeNameEn] = useState('');
  const [newTypeNameJp, setNewTypeNameJp] = useState('');
  const [newValueNames, setNewValueNames] = useState(''); // Textarea: mỗi dòng là một Value
  const [newValueNamesEn, setNewValueNamesEn] = useState('');
  const [newValueNamesJp, setNewValueNamesJp] = useState('');
  const [newValueNameEn, setNewValueNameEn] = useState('');
  const [newValueNameJp, setNewValueNameJp] = useState('');
  const [selectedTypeForValue, setSelectedTypeForValue] = useState('');
  const [useComparisonOperator, setUseComparisonOperator] = useState(false);
  const [comparisonOperator, setComparisonOperator] = useState('');
  const [comparisonValue, setComparisonValue] = useState('');
  const [comparisonValueEnd, setComparisonValueEnd] = useState('');
  const [highlightKeys, setHighlightKeys] = useState([]);
  const [showJobTypeModal, setShowJobTypeModal] = useState(false);
  const [isResidenceStatusOpen, setIsResidenceStatusOpen] = useState(false);
  const residenceStatusDropdownRef = useRef(null);
  /** Parent category selected in job type modal (left panel) — right panel shows its children */
  const [selectedJobTypeParentId, setSelectedJobTypeParentId] = useState(null);
  // Recruiting Company state
  const [recruitingCompany, setRecruitingCompany] = useState({
    companyName: '',
    companyNameEn: '',
    companyNameJp: '',
    revenue: '',
    revenueEn: '',
    revenueJp: '',
    numberOfEmployees: '',
    numberOfEmployeesEn: '',
    numberOfEmployeesJp: '',
    headquarters: '',
    headquartersEn: '',
    headquartersJp: '',
    companyIntroduction: '',
    companyIntroductionEn: '',
    companyIntroductionJp: '',
    stockExchangeInfo: '',
    stockExchangeInfoEn: '',
    stockExchangeInfoJp: '',
    investmentCapital: '',
    investmentCapitalEn: '',
    investmentCapitalJp: '',
    establishedDate: '',
    establishedDateEn: '',
    establishedDateJp: '',
    services: [],
    businessSectors: []
  });
  const recruitingCompanyRef = useRef(recruitingCompany);
  useEffect(() => {
    recruitingCompanyRef.current = recruitingCompany;
  }, [recruitingCompany]);

  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);
  const [parseJdLoading, setParseJdLoading] = useState(false);
  const [parseJdError, setParseJdError] = useState('');
  const [dragOverJdUpload, setDragOverJdUpload] = useState(false);
  /** Tạo mới: bật parse khi upload JD; sửa job: mặc định tắt (tránh gọi parse không chủ ý). */
  const [parseJdEnabled, setParseJdEnabled] = useState(() => !jobId);
  const parseJdAbortRef = useRef(null);
  const originalJobRef = useRef(null);
  const prevParseJdEnabledRef = useRef(parseJdEnabled);

  // JD PDF (A4) preview + download (không lưu DB)
  const [jdPdfPreviewUrl, setJdPdfPreviewUrl] = useState(null);
  const [jdPdfLoading, setJdPdfLoading] = useState(false);
  const jdPdfBlobRef = useRef(null);
  const [showJdPreviewModal, setShowJdPreviewModal] = useState(false);
  const [jdPreviewLoading, setJdPreviewLoading] = useState(false);
  const [translatingInputs, setTranslatingInputs] = useState(false);
  /** Sau khi dịch: remount JD template để contentEditable bám đúng formData (tránh DOM cũ). */
  const [jdTemplateSyncKey, setJdTemplateSyncKey] = useState(0);

  useEffect(() => {
    return () => {
      if (jdPdfPreviewUrl) URL.revokeObjectURL(jdPdfPreviewUrl);
    };
  }, [jdPdfPreviewUrl]);
  /** Tab ngôn ngữ form: 'vi' | 'en' | 'jp' — mỗi tab là form nhập riêng cho ngôn ngữ đó; ô chung hiển thị ở cả 3 tab. */
  const [languageTab, setLanguageTab] = useState('vi');
  /** Chọn nhanh điều kiện bắt buộc (mục 11) */
  const [presetJapanese, setPresetJapanese] = useState('');
  const [presetExperience, setPresetExperience] = useState('');
  const [presetDriver, setPresetDriver] = useState('');
  /** Japan 3-level location: region → prefecture → city */
  const [selectedJapanRegion, setSelectedJapanRegion] = useState(null);
  const [selectedJapanPrefecture, setSelectedJapanPrefecture] = useState(null);
  const [japanLocationData, setJapanLocationData] = useState({ flat: [], tree: [] });
  const [japanCitiesLoading, setJapanCitiesLoading] = useState(false);
  /** Popup chọn địa điểm (Việt Nam / Nhật Bản) */
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [bulkJapanAdding, setBulkJapanAdding] = useState(false);
  // Lĩnh vực kinh doanh: select dropdown để thêm nhiều mục
  const [recruitingBusinessSectorKey, setRecruitingBusinessSectorKey] = useState('');

  const getFieldKeyForTab = useCallback((baseField, tabId) => {
    const suffix = TAB_LANG_META[tabId]?.suffix ?? '';
    return `${baseField}${suffix}`;
  }, []);

  const translateJdViaApi = useCallback(async (payload) => {
    const response = await fetch(JD_TRANSLATE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
    }
    return data;
  }, []);

  const buildJdTranslationPayload = useCallback(() => {
    const sourceTab = languageTab === 'jp' ? 'jp' : languageTab === 'en' ? 'en' : 'vi';
    const suffixFor = (tab) => (tab === 'en' ? 'En' : tab === 'jp' ? 'Jp' : '');
    const sourceField = (baseField, tab = sourceTab) => `${baseField}${suffixFor(tab)}`;
    const getFormValue = (baseField, tab = sourceTab) => formDataRef.current[sourceField(baseField, tab)] ?? '';
    const getRowValue = (row, baseField, tab = sourceTab) => row?.[sourceField(baseField, tab)] ?? row?.[baseField] ?? '';
    const firstNonEmpty = (...values) => values.find((v) => v != null && String(v).trim() !== '') ?? null;

    const salaryYearly = firstNonEmpty(
      salaryRanges.find((sr) => sr.type === 'yearly')?.salaryRange,
      salaryRanges.find((sr) => sr.type === 'yearly')?.salaryRangeEn,
      salaryRanges.find((sr) => sr.type === 'yearly')?.salaryRangeJp,
    );

    const companyField = (baseField) => firstNonEmpty(
      recruitingCompanyRef.current?.[baseField],
      recruitingCompanyRef.current?.[`${baseField}En`],
      recruitingCompanyRef.current?.[`${baseField}Jp`],
    );

    const sourceRequirementsMust = requirements
      .filter((req) => req.status === 'required')
      .map((req) => getRowValue(req, 'content'))
      .filter((v) => String(v).trim());
    const sourceRequirementsPreferred = requirements
      .filter((req) => req.status === 'preferred')
      .map((req) => getRowValue(req, 'content'))
      .filter((v) => String(v).trim());

    return {
      job_code: firstNonEmpty(formDataRef.current.jobCode),
      job_title: firstNonEmpty(getFormValue('title')),
      content_language: sourceTab === 'jp' ? 'ja' : sourceTab,
      headcount: firstNonEmpty(getFormValue('numberOfHires')),
      experience_job: null,
      experience_industry: null,
      features: Array.isArray(highlightKeys) ? highlightKeys : [],
      description: firstNonEmpty(getFormValue('description')),
      requirements_must: sourceRequirementsMust,
      requirements_preferred: sourceRequirementsPreferred,
      salary: {
        currency: 3,
        monthly: null,
        yearly: salaryYearly,
        salary_details: firstNonEmpty(
          salaryRangeDetails.map((row) => getRowValue(row, 'content')).find((v) => String(v).trim()),
          salaryRangeDetails.map((row) => getRowValue(row, 'contentEn')).find((v) => String(v).trim()),
          salaryRangeDetails.map((row) => getRowValue(row, 'contentJp')).find((v) => String(v).trim()),
        ),
        bonus_details: firstNonEmpty(getFormValue('bonus')),
        raise_details: firstNonEmpty(getFormValue('salaryReview')),
      },
      location: firstNonEmpty(
        workingLocations.map((wl) => normalizeWorkingLocationField(wl.location || wl.locationEn || wl.locationJp || '')).filter(Boolean).join(', '),
      ),
      working_hours: workingHours.map((row) => getRowValue(row, 'workingHours')).filter((v) => String(v).trim()),
      overtime_details: firstNonEmpty(
        overtimeAllowanceDetails.map((row) => getRowValue(row, 'content')).find((v) => String(v).trim()),
        overtimeAllowanceDetails.map((row) => getRowValue(row, 'contentEn')).find((v) => String(v).trim()),
        overtimeAllowanceDetails.map((row) => getRowValue(row, 'contentJp')).find((v) => String(v).trim()),
      ),
      benefits: jobBenefitRows.map((row) => getRowValue(row, 'content')).filter((v) => String(v).trim()),
      holidays: firstNonEmpty(getFormValue('holidays')),
      probation: firstNonEmpty(getFormValue('probationPeriod'), getFormValue('probationDetail')),
      recruitment_process: firstNonEmpty(getFormValue('recruitmentProcess')),
      company: {
        name: companyField('companyName'),
        listing_status: null,
        industry_class: null,
        revenue: companyField('revenue'),
        capital: companyField('investmentCapital'),
        employee_count: companyField('numberOfEmployees'),
        established_year: companyField('establishedDate'),
        headquarter: companyField('headquarters'),
        overview: companyField('companyIntroduction'),
      },
    };
  }, [highlightKeys, jobBenefitRows, languageTab, requirements, workingHours, workingLocations, salaryRanges, salaryRangeDetails, overtimeAllowanceDetails]);

  const applyTranslatedJd = useCallback((translated) => {
    const pick = (obj, keys) => {
      if (!obj || typeof obj !== 'object') return '';
      for (const key of keys) {
        const val = obj[key];
        if (val != null && String(val).trim() !== '') return val;
      }
      return '';
    };

    const src = {
      vi: translated?.vi || {},
      en: translated?.en || {},
      jp: translated?.jp || translated?.ja || {},
    };
    if (!Object.keys(src.vi).length && !Object.keys(src.en).length && !Object.keys(src.jp).length) {
      throw new Error('Phản hồi dịch không hợp lệ');
    }

    const text = (obj, keys) => String(pick(obj, keys) || '').trim();
    const list = (obj, key) => (Array.isArray(obj?.[key]) ? obj[key] : []);
    const mapTriple = (viVal, enVal, jpVal) => ({
      content: String(viVal ?? '').trim(),
      contentEn: String(enVal ?? '').trim(),
      contentJp: String(jpVal ?? '').trim(),
    });

    const applyForTab = (tab, obj) => {
      const prevForm = formDataRef.current || {};
      const prefix = tab === 'en' ? 'En' : tab === 'jp' ? 'Jp' : '';
      setFormData((prev) => ({
        ...prev,
        jobCode: text(obj, ['job_code']) || prev.jobCode || '',
        [`title${prefix}`]: text(obj, ['job_title']) || '',
        [`description${prefix}`]: text(obj, ['description']) || '',
        [`bonus${prefix}`]: text(obj?.salary, ['bonus_details']) || '',
        [`salaryReview${prefix}`]: text(obj?.salary, ['raise_details']) || '',
        [`holidays${prefix}`]: text(obj, ['holidays']) || '',
        [`recruitmentProcess${prefix}`]: text(obj, ['recruitment_process']) || '',
        [`numberOfHires${prefix}`]: String(text(obj, ['headcount']) || ''),
        businessSectorKey: prev.businessSectorKey,
        categoryId: prev.categoryId,
        recruitmentType: prev.recruitmentType,
        residenceStatus: prevForm.residenceStatus,
        residenceStatuses: prevForm.residenceStatuses,
      }));
    };

    applyForTab('vi', src.vi || {});
    applyForTab('en', src.en || {});
    applyForTab('jp', src.jp || src.ja || {});

    const mergeRows = (key, type, status) => {
      const viList = list(src.vi, key);
      const enList = list(src.en, key);
      const jpList = list(src.jp, key);
      const max = Math.max(viList.length, enList.length, jpList.length);
      const rows = [];
      for (let i = 0; i < max; i += 1) {
        const vi = viList[i] != null ? String(viList[i]).trim() : '';
        const en = enList[i] != null ? String(enList[i]).trim() : '';
        const jp = jpList[i] != null ? String(jpList[i]).trim() : '';
        if (!vi && !en && !jp) continue;
        rows.push({ content: vi, contentEn: en, contentJp: jp, type, status });
      }
      return rows;
    };

    const reqRows = [...mergeRows('requirements_must', 'technique', 'required'), ...mergeRows('requirements_preferred', 'education', 'preferred')];
    if (reqRows.length) setRequirements(reqRows);

    const benefitsList = mergeRows('benefits', 'benefit', 'preferred');
    if (benefitsList.length) setJobBenefitRows(benefitsList.map((row, index) => ({ id: index, content: row.content, contentEn: row.contentEn, contentJp: row.contentJp })));

    setRecruitingCompany((prev) => ({
      ...prev,
      companyName: text(src.vi.company, ['name']) || prev.companyName || '',
      companyNameEn: text(src.en.company, ['name']) || prev.companyNameEn || '',
      companyNameJp: text(src.jp.company, ['name']) || prev.companyNameJp || '',
      companyIntroduction: text(src.vi.company, ['overview']) || prev.companyIntroduction || '',
      companyIntroductionEn: text(src.en.company, ['overview']) || prev.companyIntroductionEn || '',
      companyIntroductionJp: text(src.jp.company, ['overview']) || prev.companyIntroductionJp || '',
      headquarters: text(src.vi.company, ['headquarter']) || prev.headquarters || '',
      headquartersEn: text(src.en.company, ['headquarter']) || prev.headquartersEn || '',
      headquartersJp: text(src.jp.company, ['headquarter']) || prev.headquartersJp || '',
      numberOfEmployees: text(src.vi.company, ['employee_count']) || prev.numberOfEmployees || '',
      numberOfEmployeesEn: text(src.en.company, ['employee_count']) || prev.numberOfEmployeesEn || '',
      numberOfEmployeesJp: text(src.jp.company, ['employee_count']) || prev.numberOfEmployeesJp || '',
      establishedDate: text(src.vi.company, ['established_year']) || prev.establishedDate || '',
      establishedDateEn: text(src.en.company, ['established_year']) || prev.establishedDateEn || '',
      establishedDateJp: text(src.jp.company, ['established_year']) || prev.establishedDateJp || '',
      investmentCapital: text(src.vi.company, ['capital']) || prev.investmentCapital || '',
      investmentCapitalEn: text(src.en.company, ['capital']) || prev.investmentCapitalEn || '',
      investmentCapitalJp: text(src.jp.company, ['capital']) || prev.investmentCapitalJp || '',
      revenue: text(src.vi.company, ['revenue']) || prev.revenue || '',
      revenueEn: text(src.en.company, ['revenue']) || prev.revenueEn || '',
      revenueJp: text(src.jp.company, ['revenue']) || prev.revenueJp || '',
    }));

    setLanguageTab('vi');

    const featureKeys = Array.isArray(src.vi.features) ? src.vi.features : Array.isArray(src.en.features) ? src.en.features : Array.isArray(src.jp.features) ? src.jp.features : [];
    setHighlightKeys(featureKeys);
    setFormData((prev) => ({ ...prev, highlights: featureKeys.length ? JSON.stringify(featureKeys) : '' }));
    setJdTemplateSyncKey((k) => k + 1);
  }, []);

  const handleTranslateCurrentTabInputs = useCallback(async () => {
    try {
      setTranslatingInputs(true);
      const payload = buildJdTranslationPayload();
      const translated = await translateJdViaApi(payload);
      applyTranslatedJd(translated);
    } catch (error) {
      console.error('Translate JD inputs error:', error);
      alert(error?.message || 'Không dịch được dữ liệu.');
    } finally {
      setTranslatingInputs(false);
    }
  }, [applyTranslatedJd, buildJdTranslationPayload, translateJdViaApi]);

  const upsertJapanWorkingLocation = (entry, checked) => {
    if (!entry?.jpId) return;
    setWorkingLocations((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const exists = list.some((wl) => wl.country === 'Japan' && (wl.jpId || `${wl.location}_${wl.country}`) === entry.jpId);
      if (checked) {
        return exists ? list : [...list, entry];
      }
      return list.filter((wl) => !(wl.country === 'Japan' && (wl.jpId || `${wl.location}_${wl.country}`) === entry.jpId));
    });
  };

  const upsertManyJapanWorkingLocations = (entries, checked) => {
    const valid = (entries || []).filter((entry) => entry?.jpId);
    if (!valid.length) return;
    setWorkingLocations((prev) => {
      let next = Array.isArray(prev) ? [...prev] : [];
      valid.forEach((entry) => {
        const exists = next.some((wl) => wl.country === 'Japan' && (wl.jpId || `${wl.location}_${wl.country}`) === entry.jpId);
        if (checked && !exists) next.push(entry);
        if (!checked && exists) {
          next = next.filter((wl) => !(wl.country === 'Japan' && (wl.jpId || `${wl.location}_${wl.country}`) === entry.jpId));
        }
      });
      return next;
    });
  };

  const getCategoryDisplayName = (cat) => {
    if (!cat) return '';
    const vi = (cat.name || '').trim();
    const en = (cat.nameEn || cat.name_en || '').trim();
    const ja = (cat.nameJp || cat.name_jp || '').trim();
    if (language === 'en') return en || vi;
    if (language === 'ja') return ja || vi;
    return vi;
  };

  /** Find a category node in tree by id (searches root and nested children) */
  const findCategoryInTree = (tree, targetId) => {
    if (!tree || !targetId) return null;
    for (const node of tree) {
      if (String(node.id) === String(targetId)) return node;
      if (node.children?.length) {
        const found = findCategoryInTree(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const getHighlightLabel = (key) => {
    const opt = JOB_HIGHLIGHT_OPTIONS.find((o) => o.key === key);
    if (!opt) return key;
    if (language === 'en') return opt.en;
    if (language === 'ja') return opt.jp;
    return opt.vi;
  };

  const syncHighlightsToForm = (keysUpdater) => {
    setHighlightKeys((prev) => {
      const next = typeof keysUpdater === 'function' ? keysUpdater(prev) : keysUpdater;
      setFormData((prevForm) => ({
        ...prevForm,
        highlights: next.length ? JSON.stringify(next) : '',
      }));
      return next;
    });
  };

  useEffect(() => {
    loadCategories();
    loadCompanies();
    loadCampaigns();
    loadTypes();
    if (jobId) {
      loadJobData();
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setExistingJdOriginalFilename(null);
    }
  }, [jobId]);

  useEffect(() => {
    if (campaigns.length === 0) return;
    setSelectedCampaignIds(prev => {
      const validIds = prev.filter(id => campaigns.some(c => String(c.id) === String(id)));
      return validIds.length === prev.length ? prev : validIds;
    });
  }, [campaigns]);

  /** Tạo mới: tự điền mã công việc để người dùng không phải nhập. */
  useEffect(() => {
    if (jobId) return;
    setFormData((prev) => {
      if (prev.jobCode && String(prev.jobCode).trim()) return prev;
      return { ...prev, jobCode: generateNewJobCode() };
    });
  }, [jobId]);

  useEffect(() => {
    if (selectedCountry !== 'Japan') {
      setSelectedJapanRegion(null);
      setSelectedJapanPrefecture(null);
      setJapanLocationData({ flat: [], tree: [] });
    }
  }, [selectedCountry]);

  useEffect(() => {
    const handleClickOutsideResidenceStatus = (event) => {
      if (
        residenceStatusDropdownRef.current &&
        !residenceStatusDropdownRef.current.contains(event.target)
      ) {
        setIsResidenceStatusOpen(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsResidenceStatusOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideResidenceStatus);
    document.addEventListener('touchstart', handleClickOutsideResidenceStatus);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutsideResidenceStatus);
      document.removeEventListener('touchstart', handleClickOutsideResidenceStatus);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  useEffect(() => {
    if (!selectedJapanPrefecture) {
      setJapanLocationData({ flat: [], tree: [] });
      return;
    }
    let cancelled = false;
    setJapanCitiesLoading(true);
    fetchJapanCitiesByPrefecture(selectedJapanPrefecture)
      .then((result) => {
        if (!cancelled) setJapanLocationData(result);
      })
      .catch(() => { if (!cancelled) setJapanLocationData({ flat: [], tree: [] }); })
      .finally(() => { if (!cancelled) setJapanCitiesLoading(false); });
    return () => { cancelled = true; };
  }, [selectedJapanPrefecture]);

  const loadJobData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAdminJobEditData(jobId);
      if (response.success && response.data?.job) {
        const job = response.data.job;
        const origPath = job.jdOriginalFile || job.jd_original_file;
        const origFilename = job.jdOriginalFilename || job.jd_original_filename;
        const parseResidenceStatuses = (raw) => {
          if (Array.isArray(raw)) return raw.filter(Boolean).map((v) => String(v).trim()).filter(Boolean);
          if (raw == null) return [];
          if (typeof raw === 'string') {
            const text = raw.trim();
            if (!text) return [];
            try {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed)) return parsed.filter(Boolean).map((v) => String(v).trim()).filter(Boolean);
            } catch (_) {
              // keep fallback below
            }
            return text.startsWith('[') && text.endsWith(']')
              ? text.slice(1, -1).split(',').map((v) => String(v).replace(/^[\s"']+|[\s"']+$/g, '').trim()).filter(Boolean)
              : text.split(',').map((v) => String(v).trim()).filter(Boolean);
          }
          return [];
        };
        const residenceStatusesFromJob = parseResidenceStatuses(
          job.residenceStatuses ?? job.residence_statuses ?? job.residenceStatus ?? job.residence_status ?? ''
        );
        if (origPath && String(origPath).trim()) {
          setExistingJdOriginalFilename(
            origFilename && String(origFilename).trim()
              ? String(origFilename).trim()
              : String(origPath).split(/[/\\]/).pop() || 'jd_original'
          );
        } else {
          setExistingJdOriginalFilename(null);
        }
        setJdFileJp(null);
        originalJobRef.current = job;
        setFormData({
          jobCode: job.jobCode || '',
          title: job.title || '',
          titleEn: job.titleEn || job.title_en || '',
          titleJp: job.titleJp || job.title_jp || '',
          slug: job.slug || generateSlug(job.title || ''),
          description: job.description || '',
          descriptionEn: job.descriptionEn || job.description_en || '',
          descriptionJp: job.descriptionJp || job.description_jp || '',
          // Loại công việc (categoryId) vẫn lấy từ jobCategoryId
          categoryId: job.jobCategoryId || job.categoryId || '',
          // Lĩnh vực: ưu tiên lấy từ trường riêng trên job; fallback từ recruitingCompany.businessSectors cho job cũ
          businessSectorKey: (() => {
            if (job.businessSectorKey) return job.businessSectorKey;
            try {
              const sectors = job.recruitingCompany?.businessSectors || [];
              if (!Array.isArray(sectors) || sectors.length === 0) return '';
              const first = sectors[0];
              const nameVi = (first.sectorName || '').trim();
              const found = BUSINESS_SECTOR_OPTIONS.find(opt => opt.vi === nameVi);
              return found?.key || found?.vi || '';
            } catch {
              return '';
            }
          })(),
          companyId: job.companyId || '',
          interviewLocation: job.interviewLocation || '',
          numberOfHires: normalizeNumberOfHiresStored(
            job.numberOfHires ?? job.number_of_hires ?? job.number_of_hires_en ?? job.number_of_hires_jp ?? getWorkingLocationsNumberOfHires(job.workingLocations) ?? ''
          ),
          numberOfHiresEn: normalizeNumberOfHiresStored(job.numberOfHiresEn ?? job.number_of_hires_en ?? getWorkingLocationsNumberOfHires(job.workingLocations) ?? ''),
          numberOfHiresJp: normalizeNumberOfHiresStored(job.numberOfHiresJp ?? job.number_of_hires_jp ?? getWorkingLocationsNumberOfHires(job.workingLocations) ?? ''),
          bonus: job.bonus || '',
          bonusEn: job.bonusEn || job.bonus_en || '',
          bonusJp: job.bonusJp || job.bonus_jp || '',
          salaryReview: job.salaryReview || '',
          salaryReviewEn: job.salaryReviewEn || job.salary_review_en || '',
          salaryReviewJp: job.salaryReviewJp || job.salary_review_jp || '',
          socialInsurance: job.socialInsurance || '',
          socialInsuranceEn: job.socialInsuranceEn || job.social_insurance_en || '',
          socialInsuranceJp: job.socialInsuranceJp || job.social_insurance_jp || '',
          transportation: job.transportation || '',
          transportationEn: job.transportationEn || job.transportation_en || '',
          transportationJp: job.transportationJp || job.transportation_jp || '',
          breakTime: job.breakTime || '',
          breakTimeEn: job.breakTimeEn || job.break_time_en || '',
          breakTimeJp: job.breakTimeJp || job.break_time_jp || '',
          overtime: job.overtime || '',
          overtimeEn: job.overtimeEn || job.overtime_en || '',
          overtimeJp: job.overtimeJp || job.overtime_jp || '',
          holidays: job.holidays || '',
          holidaysEn: job.holidaysEn || job.holidays_en || '',
          holidaysJp: job.holidaysJp || job.holidays_jp || '',
          holidayDetails: job.holidayDetails || job.holiday_details || '',
          holidayDetailsEn: job.holidayDetailsEn || job.holiday_details_en || '',
          holidayDetailsJp: job.holidayDetailsJp || job.holiday_details_jp || '',
          deadline: job.deadline || '',
          recruitmentType: job.recruitmentType || '',
          residenceStatuses: residenceStatusesFromJob,
          residenceStatus: residenceStatusesFromJob.length ? JSON.stringify(residenceStatusesFromJob) : (job.residenceStatus || job.residence_status || ''),
          residenceStatusEn: job.residenceStatusEn || job.residence_status_en || '',
          residenceStatusJp: job.residenceStatusJp || job.residence_status_jp || '',
          contractPeriod: job.contractPeriod || '',
          contractPeriodEn: job.contractPeriodEn || job.contract_period_en || '',
          contractPeriodJp: job.contractPeriodJp || job.contract_period_jp || '',
          probationPeriod: job.probationPeriod || job.probation_period || '',
          probationPeriodEn: job.probationPeriodEn || job.probation_period_en || '',
          probationPeriodJp: job.probationPeriodJp || job.probation_period_jp || '',
          probationDetail: job.probationDetail || job.probation_detail || '',
          probationDetailEn: job.probationDetailEn || job.probation_detail_en || '',
          probationDetailJp: job.probationDetailJp || job.probation_detail_jp || '',
          recruitmentProcess: job.recruitmentProcess || '',
          recruitmentProcessEn: job.recruitmentProcessEn || job.recruitment_process_en || '',
          recruitmentProcessJp: job.recruitmentProcessJp || job.recruitment_process_jp || '',
          transferAbility: job.transferAbility || job.transfer_ability || '',
          transferAbilityEn: job.transferAbilityEn || job.transfer_ability_en || '',
          transferAbilityJp: job.transferAbilityJp || job.transfer_ability_jp || '',
          highlights: job.highlights || '',
          jobCommissionType: job.jobCommissionType || 'fixed',
          status: job.status !== undefined ? job.status : 1,
          isPinned: job.isPinned || false,
          isHot: job.isHot || false,
        });
        // Map điểm nổi bật sang danh sách key (nếu có)
        try {
          let keys = [];
          if (job.highlights) {
            if (Array.isArray(job.highlights)) {
              keys = job.highlights;
            } else if (typeof job.highlights === 'string') {
              if (job.highlights.trim().startsWith('[')) {
                const parsed = JSON.parse(job.highlights);
                if (Array.isArray(parsed)) keys = parsed;
              } else {
                const text = job.highlights;
                keys = JOB_HIGHLIGHT_OPTIONS.filter((opt) =>
                  text.includes(opt.vi) || text.includes(opt.en) || text.includes(opt.jp)
                ).map((opt) => opt.key);
              }
            }
          }
          setHighlightKeys(keys);
          // Đồng bộ lại formData.highlights sang dạng JSON keys để preview đa ngôn ngữ
          if (keys.length) {
            setFormData((prevForm) => ({
              ...prevForm,
              highlights: JSON.stringify(keys),
            }));
          }
        } catch {
          setHighlightKeys([]);
        }
        
        // Load related data
        if (job.workingLocations) {
          setWorkingLocations(job.workingLocations.map((wl) => ({
            location: normalizeWorkingLocationField(wl.location) || '',
            locationJp: wl.locationJp || '',
            country: wl.country || '',
            numberOfHires: normalizeNumberOfHiresStored(wl.numberOfHires ?? ''),
            jpId: wl.jpId,
          })));
        }
        if (job.workingLocationDetails) {
          setWorkingLocationDetails(job.workingLocationDetails.map(wld => ({
            content: wld.content || '',
            contentEn: wld.contentEn || wld.content_en || '',
            contentJp: wld.contentJp || wld.content_jp || ''
          })));
        }
        if (job.salaryRanges) {
          setSalaryRanges(job.salaryRanges.map(sr => ({
            salaryRange: sr.salaryRange || '',
            salaryRangeEn: sr.salaryRangeEn || sr.salary_range_en || '',
            salaryRangeJp: sr.salaryRangeJp || sr.salary_range_jp || '',
            type: sr.type || ''
          })));
        }
        if (job.salaryRangeDetails) {
          setSalaryRangeDetails(job.salaryRangeDetails.map(srd => ({
            content: srd.content || '',
            contentEn: srd.contentEn || srd.content_en || '',
            contentJp: srd.contentJp || srd.content_jp || ''
          })));
        }
        if (job.overtimeAllowances) {
          setOvertimeAllowances(
            job.overtimeAllowances.map((oa) => ({
              overtimeAllowanceRange: oa.overtimeAllowanceRange || '',
              overtimeAllowanceRangeEn: oa.overtimeAllowanceRangeEn || oa.overtime_allowance_range_en || '',
              overtimeAllowanceRangeJp: oa.overtimeAllowanceRangeJp || oa.overtime_allowance_range_jp || '',
            }))
          );
        }
        if (job.overtimeAllowanceDetails) {
          setOvertimeAllowanceDetails(job.overtimeAllowanceDetails.map(oad => ({
            content: oad.content || '',
            contentEn: oad.contentEn || oad.content_en || '',
            contentJp: oad.contentJp || oad.content_jp || ''
          })));
        }
        if (job.requirements) {
          const reqs = job.requirements.map(req => ({
            content: req.content || '',
            contentEn: req.contentEn || req.content_en || '',
            contentJp: req.contentJp || req.content_jp || '',
            type: req.type || '',
            status: req.status || ''
          }));
          setRequirements(reqs);
          const jpOpt = JAPANESE_LEVEL_OPTIONS.find((o) => reqs.some((r) => r.type === 'language' && (r.content === o.vi || r.contentEn === o.en || r.contentJp === o.jp)));
          if (jpOpt) setPresetJapanese(jpOpt.value);
          const expOpt = EXPERIENCE_YEARS_OPTIONS.find((o) => reqs.some((r) => r.type === 'experience' && (r.content === o.vi || r.contentEn === o.en || r.contentJp === o.jp)));
          if (expOpt) setPresetExperience(expOpt.value);
          const drOpt = DRIVER_LICENSE_OPTIONS.find((o) => reqs.some((r) => r.type === 'certification' && (r.content === o.vi || r.contentEn === o.en || r.contentJp === o.jp)));
          if (drOpt) setPresetDriver(drOpt.value);
        }
        if (job.smokingPolicies) {
          setSmokingPolicies(job.smokingPolicies.map(sp => ({
            allow: sp.allow || false
          })));
        }
        if (job.smokingPolicyDetails) {
          setSmokingPolicyDetails(job.smokingPolicyDetails.map(spd => ({
            content: spd.content || '',
            contentEn: spd.contentEn || spd.content_en || '',
            contentJp: spd.contentJp || spd.content_jp || ''
          })));
        }
        if (job.workingHours) {
          setWorkingHours(
            job.workingHours.map((wh) => ({
              workingHours: wh.workingHours || '',
              workingHoursEn: wh.workingHoursEn || wh.working_hours_en || '',
              workingHoursJp: wh.workingHoursJp || wh.working_hours_jp || '',
            }))
          );
        }
        if (job.workingHourDetails) {
          setWorkingHourDetails(job.workingHourDetails.map(whd => ({
            content: whd.content || '',
            contentEn: whd.contentEn || whd.content_en || '',
            contentJp: whd.contentJp || whd.content_jp || ''
          })));
        }
        if (Array.isArray(job.benefits)) {
          setJobBenefitRows(
            job.benefits.map((b, index) => ({
              id: b.id ?? index,
              content: b.content || String(b) || '',
              contentEn: b.contentEn || b.content_en || '',
              contentJp: b.contentJp || b.content_jp || '',
            }))
          );
        } else {
          setJobBenefitRows([]);
        }
        
        // Load job values
        if (job.jobValues && job.jobValues.length > 0) {
          setJobValues(job.jobValues.map(jv => ({
            typeId: jv.typeId || jv.id_typename,
            valueId: jv.valueId || jv.id_value,
            value: jv.value || '',
            isRequired: jv.isRequired || jv.is_required || false,
            viewOnCollaborator: jv.viewOnCollaborator || jv.view_on_collaborator || ''
          })));
          // Load values for each type
          job.jobValues.forEach(jv => {
            const typeId = jv.typeId || jv.id_typename;
            if (typeId) {
              loadValuesForType(typeId);
            }
          });
        }
        
        // Load campaigns
        if (job.jobCampaigns && job.jobCampaigns.length > 0) {
          setSelectedCampaignIds(job.jobCampaigns.map(jc => jc.campaignId || jc.campaign?.id).filter(Boolean));
        }
        
        // Load recruiting company
        if (job.recruitingCompany) {
          const rc = job.recruitingCompany;
          setRecruitingCompany({
            companyName: rc.companyName || '',
            companyNameEn: rc.companyNameEn || rc.company_name_en || '',
            companyNameJp: rc.companyNameJp || rc.company_name_jp || '',
            revenue: rc.revenue || '',
            revenueEn: rc.revenueEn || rc.revenue_en || '',
            revenueJp: rc.revenueJp || rc.revenue_jp || '',
            numberOfEmployees: rc.numberOfEmployees || '',
            numberOfEmployeesEn: rc.numberOfEmployeesEn || rc.number_of_employees_en || '',
            numberOfEmployeesJp: rc.numberOfEmployeesJp || rc.number_of_employees_jp || '',
            headquarters: rc.headquarters || '',
            headquartersEn: rc.headquartersEn || rc.headquarters_en || '',
            headquartersJp: rc.headquartersJp || rc.headquarters_jp || '',
            companyIntroduction: rc.companyIntroduction || '',
            companyIntroductionEn: rc.companyIntroductionEn || rc.company_introduction_en || '',
            companyIntroductionJp: rc.companyIntroductionJp || rc.company_introduction_jp || '',
            stockExchangeInfo: rc.stockExchangeInfo || '',
            stockExchangeInfoEn: rc.stockExchangeInfoEn || rc.stock_exchange_info_en || '',
            stockExchangeInfoJp: rc.stockExchangeInfoJp || rc.stock_exchange_info_jp || '',
            investmentCapital: rc.investmentCapital || '',
            investmentCapitalEn: rc.investmentCapitalEn || rc.investment_capital_en || '',
            investmentCapitalJp: rc.investmentCapitalJp || rc.investment_capital_jp || '',
            establishedDate: rc.establishedDate || '',
            establishedDateEn: rc.establishedDateEn || rc.established_date_en || '',
            establishedDateJp: rc.establishedDateJp || rc.established_date_jp || '',
            services: (rc.services || []).map(s => ({
              serviceName: s.serviceName || s.service_name || '',
              serviceNameEn: s.serviceNameEn || s.service_name_en || '',
              serviceNameJp: s.serviceNameJp || s.service_name_jp || '',
              order: s.order || 0
            })),
            businessSectors: (rc.businessSectors || []).map((bs) => ({
              sectorName: bs.sectorName || '',
              sectorNameEn: bs.sectorNameEn || bs.sector_name_en || '',
              sectorNameJp: bs.sectorNameJp || bs.sector_name_jp || '',
              order: bs.order || 0,
            }))
          });
        }
      }
    } catch (error) {
      console.error('Error loading job data:', error);
      setExistingJdOriginalFilename(null);
      setJdFileJp(null);
      alert('Lỗi khi tải thông tin công việc');
    } finally {
      setLoading(false);
    }
  };

  const loadTypes = async () => {
    try {
      const response = await apiService.getAllTypes(true); // includeValues = true
      if (response.success && response.data) {
        setTypes(response.data.types || []);
        // Pre-load values for each type
        const valuesMap = {};
        const types = response.data.types || [];
        
        // Load values for all types to ensure we have all values
        for (const type of types) {
          if (type.values && type.values.length > 0) {
            valuesMap[type.id] = type.values;
          } else {
            // If no values in response, load them separately
            try {
              const valuesResponse = await apiService.getValuesByType(type.id);
              if (valuesResponse.success && valuesResponse.data) {
                valuesMap[type.id] = valuesResponse.data.values || [];
              }
            } catch (err) {
              console.error(`Error loading values for type ${type.id}:`, err);
            }
          }
        }
        setValuesByType(valuesMap);
      }
    } catch (error) {
      console.error('Error loading types:', error);
    }
  };

  const loadValuesForType = async (typeId, forceReload = false) => {
    // Nếu đã load và không force reload thì skip
    if (!forceReload && valuesByType[typeId]) {
      return; // Already loaded
    }
    try {
      const response = await apiService.getValuesByType(typeId);
      if (response.success && response.data) {
        setValuesByType(prev => ({
          ...prev,
          [typeId]: response.data.values || []
        }));
      }
    } catch (error) {
      console.error('Error loading values for type:', error);
    }
  };

  const handleComparisonOperatorChange = (operator) => {
    setComparisonOperator(operator);
    // Clear comparisonValueEnd if not 'between'
    if (operator !== 'between') {
      setComparisonValueEnd('');
    }
  };

  const [cvField, setCvField] = useState('');

  const handleCreateType = async () => {
    if (!newTypeName || !newTypeName.trim()) {
      alert(t.pleaseEnterTypeName);
      return;
    }
    try {
      const typeData = {
        typename: newTypeName.trim(),
        cvField: cvField || null,
        typenameEn: newTypeNameEn?.trim() || null,
        typenameJp: newTypeNameJp?.trim() || null
      };
      const response = await apiService.createType(typeData);
      if (response.success) {
        alert(t.typeCreateSuccess);
        setNewTypeName('');
        setNewTypeNameEn('');
        setNewTypeNameJp('');
        setCvField('');
        setShowAddTypeModal(false);
        await loadTypes();
      } else {
        alert(response.message || 'Có lỗi xảy ra khi tạo Type');
      }
    } catch (error) {
      console.error('Error creating type:', error);
      alert(error.message || 'Có lỗi xảy ra khi tạo Type');
    }
  };

  const handleEditType = async () => {
    if (!editingType || !newTypeName || !newTypeName.trim()) {
      alert(t.pleaseEnterTypeName);
      return;
    }
    try {
      const typeData = {
        typename: newTypeName.trim(),
        cvField: cvField || null,
        typenameEn: newTypeNameEn?.trim() || null,
        typenameJp: newTypeNameJp?.trim() || null
      };
      const response = await apiService.updateType(editingType.id, typeData);
      if (response.success) {
        alert(t.typeUpdateSuccess);
        setNewTypeName('');
        setNewTypeNameEn('');
        setNewTypeNameJp('');
        setCvField('');
        setEditingType(null);
        setShowEditTypeModal(false);
        await loadTypes();
      } else {
        alert(response.message || 'Có lỗi xảy ra khi cập nhật Type');
      }
    } catch (error) {
      console.error('Error updating type:', error);
      alert(error.message || 'Có lỗi xảy ra khi cập nhật Type');
    }
  };

  const handleDeleteType = async (typeId) => {
    if (!window.confirm(t.confirmDeleteType)) {
      return;
    }
    try {
      const response = await apiService.deleteType(typeId);
      if (response.success) {
        alert(t.typeDeleteSuccess);
        const tid = parseInt(typeId, 10);
        setJobValues((prev) => prev.filter((jv) => Number(jv.typeId) !== tid));
        setValuesByType((prev) => {
          const next = { ...prev };
          delete next[tid];
          delete next[String(tid)];
          return next;
        });
        await loadTypes();
      } else {
        alert(response.message || 'Có lỗi xảy ra khi xóa Type');
      }
    } catch (error) {
      console.error('Error deleting type:', error);
      alert(error.message || 'Có lỗi xảy ra khi xóa Type');
    }
  };

  const openEditTypeFromCommissionRow = (typeId) => {
    if (!typeId) return;
    const type = types.find((tp) => Number(tp.id) === Number(typeId));
    if (!type) {
      alert('Không tìm thấy Type.');
      return;
    }
    setEditingType(type);
    setNewTypeName(type.typename || '');
    setNewTypeNameEn(type.typenameEn || type.typename_en || '');
    setNewTypeNameJp(type.typenameJp || type.typename_jp || '');
    setCvField(type.cvField || type.cv_field || '');
    setShowEditTypeModal(true);
  };

  const openEditValueFromCommissionRow = (jv) => {
    if (!jv.typeId || !jv.valueId) {
      alert('Vui lòng chọn Type và Value trước khi sửa.');
      return;
    }
    const val = (valuesByType[jv.typeId] || []).find((v) => Number(v.id) === Number(jv.valueId));
    if (!val) {
      alert('Không tìm thấy Value. Chọn lại Type để tải danh sách.');
      return;
    }
    setEditingValue({ ...val, id: val.id, typeId: jv.typeId });
    setSelectedTypeForValue(String(jv.typeId));
    setNewValueNames(val.valuename || '');
    setNewValueNameEn(val.valuenameEn || val.valuename_en || '');
    setNewValueNameJp(val.valuenameJp || val.valuename_jp || '');
    setUseComparisonOperator(!!val.comparisonOperator);
    setComparisonOperator(val.comparisonOperator || '');
    setComparisonValue(val.comparisonValue != null && val.comparisonValue !== '' ? String(val.comparisonValue) : '');
    setComparisonValueEnd(val.comparisonValueEnd != null && val.comparisonValueEnd !== '' ? String(val.comparisonValueEnd) : '');
    setShowEditValueModal(true);
  };

  const handleEditValue = async () => {
    if (!editingValue || !newValueNames || !newValueNames.trim()) {
      alert(t.pleaseEnterValueName);
      return;
    }
    
    // Validate comparison operator if enabled
    if (useComparisonOperator) {
      if (!comparisonOperator) {
        alert('Vui lòng chọn toán tử so sánh');
        return;
      }
      if (!comparisonValue || !comparisonValue.trim()) {
        alert('Vui lòng nhập giá trị so sánh');
        return;
      }
      if (comparisonOperator === 'between' && (!comparisonValueEnd || !comparisonValueEnd.trim())) {
        alert('Vui lòng nhập giá trị kết thúc cho "between"');
        return;
      }
    }
    
    try {
      const valueData = {
        valuename: newValueNames.trim(),
        comparisonOperator: useComparisonOperator ? comparisonOperator : null,
        comparisonValue: useComparisonOperator ? comparisonValue.trim() : null,
        comparisonValueEnd: (useComparisonOperator && comparisonOperator === 'between') ? comparisonValueEnd.trim() : null,
        valuenameEn: newValueNameEn?.trim() || null,
        valuenameJp: newValueNameJp?.trim() || null
      };
      
      const response = await apiService.updateValue(editingValue.id, valueData);
      if (response.success) {
        alert(t.valueUpdateSuccess);
        await loadValuesForType(editingValue.typeId, true);
        setNewValueNames('');
        setNewValueNameEn('');
        setNewValueNameJp('');
        setEditingValue(null);
        setUseComparisonOperator(false);
        setComparisonOperator('');
        setComparisonValue('');
        setComparisonValueEnd('');
        setShowEditValueModal(false);
      } else {
        alert(response.message || 'Có lỗi xảy ra khi cập nhật Value');
      }
    } catch (error) {
      console.error('Error updating value:', error);
      alert(error.message || 'Có lỗi xảy ra khi cập nhật Value');
    }
  };

  const handleDeleteValue = async (valueId, typeId) => {
    if (!window.confirm(t.confirmDeleteValue)) {
      return;
    }
    try {
      const response = await apiService.deleteValue(valueId);
      if (response.success) {
        alert(t.valueDeleteSuccess);
        const vid = parseInt(valueId, 10);
        const tid = parseInt(typeId, 10);
        setJobValues((prev) => prev.filter((jv) => Number(jv.valueId) !== vid));
        setValuesByType((prev) => {
          const current = prev[tid] ?? prev[typeId] ?? [];
          return {
            ...prev,
            [tid]: current.filter((v) => Number(v.id) !== vid),
          };
        });
        await loadValuesForType(tid, true);
      } else {
        alert(response.message || 'Có lỗi xảy ra khi xóa Value');
      }
    } catch (error) {
      console.error('Error deleting value:', error);
      alert(error.message || 'Có lỗi xảy ra khi xóa Value');
    }
  };

  const handleCreateValue = async () => {
    if (!newValueNames || !newValueNames.trim()) {
      alert(t.pleaseEnterValueName);
      return;
    }
    if (!selectedTypeForValue) {
      alert(t.pleaseSelectType);
      return;
    }
    
    if (useComparisonOperator) {
      if (!comparisonOperator) {
        alert(t.selectOperator || 'Vui lòng chọn toán tử so sánh');
        return;
      }
      if (!comparisonValue || !comparisonValue.trim()) {
        alert(t.comparisonValueLabel + ' ' + (t.pleaseEnterValueName || ''));
        return;
      }
      if (comparisonOperator === 'between' && (!comparisonValueEnd || !comparisonValueEnd.trim())) {
        alert(t.comparisonValueEndLabel + ' ' + (t.pleaseEnterValueName || ''));
        return;
      }
      if (newValueNames.split('\n').filter(v => v.trim().length > 0).length > 1) {
        alert(t.valueNameSingleHint);
        return;
      }
    }
    
    try {
      const typeId = parseInt(selectedTypeForValue);
      const linesEn = (newValueNamesEn || '').split('\n').map(v => v.trim());
      const linesJp = (newValueNamesJp || '').split('\n').map(v => v.trim());
      
      if (useComparisonOperator) {
        const valuename = newValueNames.trim();
        try {
          const valueData = {
            typeId,
            valuename,
            comparisonOperator,
            comparisonValue: comparisonValue.trim(),
            comparisonValueEnd: comparisonOperator === 'between' ? comparisonValueEnd.trim() : null,
            valuenameEn: (newValueNamesEn || '').trim() || null,
            valuenameJp: (newValueNamesJp || '').trim() || null
          };
          const response = await apiService.createValue(valueData);
          if (response.success) {
            alert(t.valueCreateSuccess);
            await loadValuesForType(typeId, true);
            setNewValueNames('');
            setNewValueNamesEn('');
            setNewValueNamesJp('');
            setSelectedTypeForValue('');
            setUseComparisonOperator(false);
            setComparisonOperator('');
            setComparisonValue('');
            setComparisonValueEnd('');
            setShowAddValueModal(false);
          } else {
            alert(response.message || 'Có lỗi xảy ra khi tạo Value');
          }
        } catch (error) {
          console.error('Error creating value:', error);
          alert(error.message || 'Có lỗi xảy ra khi tạo Value');
        }
      } else {
        const valueNames = newValueNames
          .split('\n')
          .map(v => v.trim())
          .filter(v => v.length > 0);
        
        if (valueNames.length === 0) {
          alert(t.enterAtLeastOneValue);
          return;
        }

        const createdValues = [];
        const errors = [];
        
        for (let i = 0; i < valueNames.length; i++) {
          const valuename = valueNames[i];
          const valuenameEn = linesEn[i] || null;
          const valuenameJp = linesJp[i] || null;
          try {
            const response = await apiService.createValue({ 
              typeId,
              valuename,
              valuenameEn: valuenameEn || null,
              valuenameJp: valuenameJp || null
            });
            if (response.success) {
              createdValues.push(response.data.value);
            } else {
              errors.push(`${valuename}: ${response.message || 'Lỗi không xác định'}`);
            }
          } catch (error) {
            errors.push(`${valuename}: ${error.message || 'Lỗi không xác định'}`);
          }
        }

        if (createdValues.length > 0) {
          alert((t.createdValuesCount || 'Đã tạo thành công {count}/{total} Value!').replace('{count}', createdValues.length).replace('{total}', valueNames.length));
          // Reload values for the selected type
          await loadValuesForType(typeId, true);
          // Update valuesByType state immediately
          setValuesByType(prev => ({
            ...prev,
            [typeId]: [...(prev[typeId] || []), ...createdValues]
          }));
        }
        
        if (errors.length > 0) {
          alert(`Có lỗi khi tạo một số Value:\n${errors.join('\n')}`);
        }

        if (createdValues.length > 0) {
          setNewValueNames('');
          setNewValueNamesEn('');
          setNewValueNamesJp('');
          setSelectedTypeForValue('');
          setShowAddValueModal(false);
        }
      }
    } catch (error) {
      console.error('Error creating values:', error);
      alert(error.message || 'Có lỗi xảy ra khi tạo Value');
    }
  };

  const loadCategories = async () => {
    try {
      // Ưu tiên API tree để có đủ cha + con (panel Chi tiết hiển thị đúng)
      const treeResponse = await apiService.getJobCategoryTree({ status: 1 });
      if (treeResponse?.success && treeResponse?.data?.tree?.length > 0) {
        const tree = treeResponse.data.tree;
        const flattenCategories = (cats) => {
          const result = [];
          const seenIds = new Set();
          const visit = (list) => {
            (list || []).forEach(cat => {
              if (cat && !seenIds.has(cat.id)) {
                seenIds.add(cat.id);
                result.push(cat);
              }
              if (cat?.children?.length) visit(cat.children);
            });
          };
          visit(cats);
          return result;
        };
        setCategoryTree(tree);
        setCategories(flattenCategories(tree));
        return;
      }
    } catch (treeError) {
      console.log('Tree API not available, falling back to flat list:', treeError?.message);
    }
    // Fallback: danh sách phẳng + build lại cây (giống AgentJobsPageSession1)
    try {
      const response = await apiService.getJobCategories({ status: 1, limit: 500 });
      if (response.success && response.data?.categories?.length > 0) {
        const allCategories = (response.data.categories || []).map(cat => ({
          ...cat,
          id: String(cat.id),
          parentId: cat.parentId ? String(cat.parentId) : null
        }));
        const buildTree = (list) => {
          const map = {};
          list.forEach(cat => { map[cat.id] = { ...cat, children: [] }; });
          const roots = [];
          list.forEach(cat => {
            const node = map[cat.id];
            if (cat.parentId && map[cat.parentId]) {
              map[cat.parentId].children.push(node);
            } else {
              roots.push(node);
            }
          });
          roots.forEach(r => r.children.sort((a, b) => (a.order || 0) - (b.order || 0)));
          return roots;
        };
        const tree = buildTree(allCategories);
        setCategoryTree(tree);
        setCategories(allCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadCompanies = async () => {
    try {
      const response = await apiService.getCompanies({ limit: 100 });
      if (response.success && response.data) {
        setCompanies(response.data.companies || []);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await apiService.getAdminCampaigns({ limit: 1000, status: 1 });
      if (response.success && response.data) {
        setCampaigns(response.data.campaigns || []);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  // Generate slug from title
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
      };
      
      // Auto-generate slug from title
      if (name === 'title' && value) {
        newData.slug = generateSlug(value);
      }
      return newData;
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const parseJdFileAndApplyForm = async (file) => {
    if (!file || (file.size !== undefined && file.size <= 0)) return;
    parseJdAbortRef.current?.abort();
    const ac = new AbortController();
    parseJdAbortRef.current = ac;
    setParseJdLoading(true);
    setParseJdError('');
    try {
      const formDataUpload = new FormData();
      formDataUpload.append(PARSE_JD_FILE_FIELD, file);
      const res = await fetch(PARSE_JD_API_URL, {
        method: 'POST',
        body: formDataUpload,
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail;
        const msg = data?.message || data?.error;
        const detailStr = Array.isArray(detail)
          ? detail.map((d) => d.msg || d.loc?.join?.('.') || JSON.stringify(d)).join('; ')
          : typeof detail === 'string'
            ? detail
            : detail != null ? JSON.stringify(detail) : '';
        const fullMsg = [msg, detailStr].filter(Boolean).join(' — ') || `HTTP ${res.status}`;
        throw new Error(fullMsg);
      }
      const j = data?.data ?? data;
      const rawContentLanguage = String(j.content_language || '').toLowerCase();
      const contentLanguage = rawContentLanguage === 'ja'
        ? 'jp'
        : ['vi', 'en', 'jp'].includes(rawContentLanguage)
          ? rawContentLanguage
          : 'vi';
      const isViTab = contentLanguage === 'vi';
      const isEnTab = contentLanguage === 'en';
      const isJpTab = contentLanguage === 'jp';
      setLanguageTab(contentLanguage);
      const titleValue = String(j.job_title ?? '').trim();
      const businessSectorKey = (() => {
        const raw = j.industry;
        const idx = Number(raw);
        if (Number.isInteger(idx) && idx > 0 && idx <= BUSINESS_SECTOR_OPTIONS.length) {
          return BUSINESS_SECTOR_OPTIONS[idx - 1]?.key || '';
        }
        return raw != null && raw !== '' ? String(raw) : '';
      })();
      const categoryId = j.job_category != null && j.job_category !== '' ? String(j.job_category) : '';
      const visaVi = j.visa_status?.vi ?? j.visa_status ?? '';
      const visaEn = j.visa_status?.en ?? '';
      const visaJp = j.visa_status?.ja ?? j.visa_status?.jp ?? '';
      const employmentType = j.employment_type != null && j.employment_type !== '' ? String(j.employment_type) : '';
      const headcount = j.headcount;
      let numberOfHires = '';
      if (headcount != null && headcount !== '') {
        const n = Number(headcount);
        if (n >= 1 && n <= 5) {
          numberOfHires = n <= 9 ? `0${n}` : String(n);
        } else {
          numberOfHires = String(headcount);
        }
      }
      const descRaw = j.description ?? '';
      const descVi = isViTab ? String(descRaw) : '';
      const descEn = isEnTab ? String(descRaw) : '';
      const descJp = isJpTab ? String(descRaw) : '';
      const instrRaw = j.hiring_reason ?? '';
      const instrVi = isViTab ? String(instrRaw) : '';
      const instrEn = isEnTab ? String(instrRaw) : '';
      const instrJp = isJpTab ? String(instrRaw) : '';
      const localizedTextRow = (value) => {
        const text = value == null ? '' : String(value).trim();
        if (!text) return null;
        if (isViTab) return { content: text, contentEn: '', contentJp: '' };
        if (isEnTab) return { content: '', contentEn: text, contentJp: '' };
        return { content: '', contentEn: '', contentJp: text };
      };
      const localizedRows = (value, reqType, status) => {
        if (value == null) return [];
        if (Array.isArray(value)) {
          return value
            .map((item) => {
              if (item == null) return null;
              if (typeof item === 'object') {
                return {
                  content: String(item.vi ?? '').trim(),
                  contentEn: String(item.en ?? '').trim(),
                  contentJp: String(item.ja ?? item.jp ?? '').trim(),
                  type: reqType,
                  status,
                };
              }
              const text = String(item).trim();
              if (!text) return null;
              if (isViTab) return { content: text, contentEn: '', contentJp: '', type: reqType, status };
              if (isEnTab) return { content: '', contentEn: text, contentJp: '', type: reqType, status };
              return { content: '', contentEn: '', contentJp: text, type: reqType, status };
            })
            .filter(Boolean);
        }
        if (typeof value === 'object') {
          return jdLocalizedRequirementRows(value, reqType, status);
        }
        const row = localizedTextRow(value);
        return row ? [{ ...row, type: reqType, status }] : [];
      };
      const mustRows = localizedRows(j.requirements_must, 'technique', 'required');
      const prefRows = localizedRows(j.requirements_preferred, 'education', 'preferred');
      const salary = j.salary ?? {};
      const bonusDetailsRaw = salary.bonus_details;
      const bonusText = typeof bonusDetailsRaw === 'object' && bonusDetailsRaw !== null && !Array.isArray(bonusDetailsRaw)
        ? [bonusDetailsRaw.vi, bonusDetailsRaw.en, bonusDetailsRaw.ja].filter(Boolean).join('\n')
        : [bonusDetailsRaw].flat().filter(Boolean).join('\n');
      const raiseDetailsRaw = salary.raise_details;
      const raiseText = typeof raiseDetailsRaw === 'object' && raiseDetailsRaw !== null && !Array.isArray(raiseDetailsRaw)
        ? [raiseDetailsRaw.vi, raiseDetailsRaw.en, raiseDetailsRaw.ja].filter(Boolean).join('\n')
        : [raiseDetailsRaw].flat().filter(Boolean).join('\n');
      const currency = salary.currency || 'JPY';
      const yearlySal = salary.yearly_salary ?? salary.yearly ?? salary.yearlySalary;
      const monthlySal = salary.monthly_salary ?? salary.monthly ?? salary.monthlySalary;
      const salaryMin = salary.min_salary ?? salary.min;
      const salaryMax = salary.max_salary ?? salary.max;
      const yStr = formatJdSalaryAmount(yearlySal, currency);
      const mStr = formatJdSalaryAmount(monthlySal, currency);
      let salaryRangesNext = null;
      const salaryDetailsNext = [];
      if (yStr || mStr) {
        salaryRangesNext = [
          { salaryRange: yStr || '', salaryRangeEn: yStr || '', salaryRangeJp: yStr || '', type: 'yearly' },
          { salaryRange: mStr || '', salaryRangeEn: mStr || '', salaryRangeJp: mStr || '', type: 'monthly' },
        ];
      } else if (salaryMin != null || salaryMax != null) {
        const rangeLabel = [salaryMin, salaryMax].filter((v) => v != null && v !== '').join(' - ');
        if (rangeLabel) {
          const isYear = (salary.period ?? 'monthly') === 'yearly';
          salaryRangesNext = isYear
            ? [
                { salaryRange: rangeLabel, salaryRangeEn: rangeLabel, salaryRangeJp: rangeLabel, type: 'yearly' },
                { salaryRange: '', salaryRangeEn: '', salaryRangeJp: '', type: 'monthly' },
              ]
            : [
                { salaryRange: '', salaryRangeEn: '', salaryRangeJp: '', type: 'yearly' },
                { salaryRange: rangeLabel, salaryRangeEn: rangeLabel, salaryRangeJp: rangeLabel, type: 'monthly' },
              ];
        }
      }
      const sd = salary.salary_details;
      if (sd != null && (typeof sd === 'object' || Array.isArray(sd))) {
        const detailVi = jdDescriptionToText(sd, 'vi');
        const detailEn = jdDescriptionToText(sd, 'en');
        const detailJp = jdDescriptionToText(sd, 'jp');
        if (detailVi || detailEn || detailJp) {
          salaryDetailsNext.push({ content: detailVi, contentEn: detailEn, contentJp: detailJp });
        }
      }

      const locEntries = jdLocationEntriesFromRaw(j.location);
      const preservedNumberOfHires = getWorkingLocationsNumberOfHires(workingLocations);
      const chosenNumberOfHires =
        normalizeNumberOfHiresStored(formDataRef.current.numberOfHires || '') ||
        normalizeNumberOfHiresStored(numberOfHires || '') ||
        preservedNumberOfHires ||
        '';
      const workingLocationsNext =
        locEntries.length > 0
          ? locEntries.map((row) => ({
              location:
                normalizeWorkingLocationField(row.vi) ||
                normalizeWorkingLocationField(row.en) ||
                normalizeWorkingLocationField(row.ja) ||
                '',
              country: 'Japan',
              numberOfHires: chosenNumberOfHires,
            }))
          : chosenNumberOfHires
            ? [{ location: '', country: 'Japan', numberOfHires: chosenNumberOfHires }]
            : [];
      const requirementsNext = [...mustRows, ...prefRows];
      if (j.experience_job || j.experience_industry) {
        requirementsNext.unshift({
          content: [j.experience_job, j.experience_industry].filter(Boolean).join(' '),
          contentEn: '',
          contentJp: '',
          type: 'experience',
          status: 'required',
        });
      }
      const featuresVi = Array.isArray(j.features?.vi) ? j.features.vi : j.features ? [j.features] : [];
      const featuresEn = Array.isArray(j.features?.en) ? j.features.en : [];
      const featuresJp = Array.isArray(j.features?.ja) ? j.features.ja : [];
      const highlightKeysNext = [];
      for (const opt of JOB_HIGHLIGHT_OPTIONS) {
        const matchVi = featuresVi.some((f) => String(f).includes(opt.vi));
        const matchEn = featuresEn.some((f) => String(f).includes(opt.en));
        const matchJp = featuresJp.some((f) => String(f).includes(opt.jp));
        if (matchVi || matchEn || matchJp) highlightKeysNext.push(opt.key);
      }
      const company = j.company ?? {};
      const benefitsList = Array.isArray(j.benefits) ? j.benefits : [];
      const normalizedBenefits = benefitsList.map((b, index) => {
        const text = typeof b === 'string' ? String(b).trim() : String(b?.content ?? b?.content_vi ?? b?.contentVi ?? '').trim();
        const item = {
          id: b?.id ?? index,
          content: '',
          contentEn: '',
          contentJp: '',
        };
        if (isEnTab) item.contentEn = text;
        else if (isJpTab) item.contentJp = text;
        else item.content = text;
        return item;
      });
      const holidaysObj = j.holidays;
      const holidaysVi = isViTab ? String(holidaysObj ?? '') : '';
      const holidaysEn = isEnTab ? String(holidaysObj ?? '') : '';
      const holidaysJp = isJpTab ? String(holidaysObj ?? '') : '';
      const holidayDetailsRaw = j.holiday_details ?? j.holidays_details;
      const holidayDetailsVi = isViTab ? String(holidayDetailsRaw ?? '').trim() : '';
      const holidayDetailsEn = isEnTab ? String(holidayDetailsRaw ?? '').trim() : '';
      const holidayDetailsJp = isJpTab ? String(holidayDetailsRaw ?? '').trim() : '';
      const probationObj = j.probation;
      const probationVi = isViTab ? String(probationObj ?? '') : '';
      const probationEn = isEnTab ? String(probationObj ?? '') : '';
      const probationJp = isJpTab ? String(probationObj ?? '') : '';
      const recruitmentProcessRaw = j.recruitment_process;
      const recruitmentProcessVi = isViTab ? String(recruitmentProcessRaw ?? '') : '';
      const recruitmentProcessEn = isEnTab ? String(recruitmentProcessRaw ?? '') : '';
      const recruitmentProcessJp = isJpTab ? String(recruitmentProcessRaw ?? '') : '';
      setFormData((prev) => ({
        ...prev,
        jobCode: (j.job_code ?? prev.jobCode) || '',
        title: isViTab ? titleValue : prev.title,
        titleEn: isEnTab ? titleValue : prev.titleEn,
        titleJp: isJpTab ? titleValue : prev.titleJp,
        slug: isViTab && titleValue ? generateSlug(titleValue) : prev.slug,
        description: isViTab ? descVi || prev.description : prev.description,
        descriptionEn: isEnTab ? descEn || titleValue || prev.descriptionEn : prev.descriptionEn,
        descriptionJp: isJpTab ? descJp || prev.descriptionJp : prev.descriptionJp,
        businessSectorKey: businessSectorKey || prev.businessSectorKey,
        categoryId: categoryId || prev.categoryId,
        recruitmentType: employmentType || prev.recruitmentType,
        numberOfHires: isViTab ? chosenNumberOfHires || prev.numberOfHires : prev.numberOfHires,
        numberOfHiresEn: isEnTab ? chosenNumberOfHires || prev.numberOfHiresEn : prev.numberOfHiresEn,
        numberOfHiresJp: isJpTab ? chosenNumberOfHires || prev.numberOfHiresJp : prev.numberOfHiresJp,
        residenceStatus: isViTab ? visaVi || prev.residenceStatus : prev.residenceStatus,
        residenceStatusEn: isEnTab ? visaEn || prev.residenceStatusEn : prev.residenceStatusEn,
        residenceStatusJp: isJpTab ? visaJp || prev.residenceStatusJp : prev.residenceStatusJp,
        bonus: isViTab ? bonusText || prev.bonus : prev.bonus,
        salaryReview: isViTab ? raiseText || prev.salaryReview : prev.salaryReview,
        holidays: isViTab ? holidaysVi || prev.holidays : prev.holidays,
        holidaysEn: isEnTab ? holidaysEn || prev.holidaysEn : prev.holidaysEn,
        holidaysJp: isJpTab ? holidaysJp || prev.holidaysJp : prev.holidaysJp,
        holidayDetails: isViTab ? holidayDetailsVi || prev.holidayDetails : prev.holidayDetails,
        holidayDetailsEn: isEnTab ? holidayDetailsEn || prev.holidayDetailsEn : prev.holidayDetailsEn,
        holidayDetailsJp: isJpTab ? holidayDetailsJp || prev.holidayDetailsJp : prev.holidayDetailsJp,
        probationPeriod: isViTab ? (probationVi ? probationVi : prev.probationPeriod) : prev.probationPeriod,
        probationDetail: isViTab ? probationVi || prev.probationDetail : prev.probationDetail,
        probationDetailEn: isEnTab ? probationEn || prev.probationDetailEn : prev.probationDetailEn,
        probationDetailJp: isJpTab ? probationJp || prev.probationDetailJp : prev.probationDetailJp,
        recruitmentProcess: isViTab ? recruitmentProcessVi || prev.recruitmentProcess : prev.recruitmentProcess,
        recruitmentProcessEn: isEnTab ? recruitmentProcessEn || prev.recruitmentProcessEn : prev.recruitmentProcessEn,
        recruitmentProcessJp: isJpTab ? recruitmentProcessJp || prev.recruitmentProcessJp : prev.recruitmentProcessJp,
      }));
      setHighlightKeys(highlightKeysNext.length ? highlightKeysNext : highlightKeys);
      if (highlightKeysNext.length) {
        setFormData((p) => ({ ...p, highlights: JSON.stringify(highlightKeysNext) }));
      }
      if (normalizedBenefits.length) {
        setJobBenefitRows(normalizedBenefits);
      }
      if (workingLocationsNext.length) {
        setWorkingLocations(workingLocationsNext);
        const locDetails = locEntries.map((row) => ({
          content: row.vi != null ? String(row.vi).trim() : '',
          contentEn: row.en != null ? String(row.en).trim() : '',
          contentJp: row.ja != null ? String(row.ja).trim() : '',
        }));
        setWorkingLocationDetails(locDetails.length ? locDetails : workingLocationsNext.map(() => ({ content: '', contentEn: '', contentJp: '' })));
      }
      if (salaryRangesNext && salaryRangesNext.length) {
        setSalaryRanges(salaryRangesNext);
      }
      if (salaryDetailsNext.length) {
        setSalaryRangeDetails(salaryDetailsNext);
      }
      if (requirementsNext.length) setRequirements(requirementsNext);
      const whRaw = j.working_hours;
      if (whRaw) {
        const whList = Array.isArray(whRaw) ? whRaw : [whRaw];
        setWorkingHours(
          whList.map((w) => {
            if (w == null) return { workingHours: '' };
            if (typeof w === 'string' || typeof w === 'number') return { workingHours: String(w).trim() };
            if (typeof w === 'object') {
              const line = String(w.vi ?? w.en ?? w.text ?? '').trim();
              return { workingHours: line };
            }
            return { workingHours: String(w).trim() };
          })
        );
        setWorkingHourDetails(
          whList.map((w) => {
            if (w == null) return { content: '', contentEn: '', contentJp: '' };
            if (typeof w === 'string' || typeof w === 'number') {
              const s = String(w).trim();
              return { content: s, contentEn: s, contentJp: s };
            }
            if (typeof w === 'object') {
              return {
                content: String(w.vi ?? '').trim(),
                contentEn: String(w.en ?? '').trim(),
                contentJp: String(w.ja ?? w.jp ?? '').trim(),
              };
            }
            const s = String(w).trim();
            return { content: s, contentEn: s, contentJp: s };
          })
        );
      }
      const otRaw = j.overtime_details;
      if (otRaw) {
        const otList = Array.isArray(otRaw) ? otRaw : [otRaw];
        setOvertimeAllowances(otList.map((o) => ({
          overtimeAllowanceRange: typeof o === 'string' ? o : (o?.vi ?? o?.en ?? o?.text ?? ''),
        })));
        setOvertimeAllowanceDetails(otList.map((o) => {
          if (typeof o === 'object' && o != null) {
            return { content: String(o.vi ?? o.en ?? ''), contentEn: String(o.en ?? ''), contentJp: String(o.ja ?? o.jp ?? '') };
          }
          return { content: String(o ?? ''), contentEn: '', contentJp: '' };
        }));
      }
      const overviewObj = company.overview ?? company.introduction;
      const headquarterObj = company.headquarter ?? company.headquarters;
      const companyNameRaw = String(company.name ?? '').trim();
      const companyNameEnRaw = String(company.nameEn ?? company.name_en ?? '').trim();
      const companyNameJpRaw = String(company.nameJp ?? company.name_jp ?? '').trim();
      const companyIntroRaw = String(overviewObj ?? '').trim();
      const headquarterRaw = String(headquarterObj ?? '').trim();
      setRecruitingCompany((prev) => ({
        ...prev,
        companyName: isViTab ? (companyNameRaw || prev.companyName || '') : prev.companyName,
        companyNameEn: isEnTab ? (companyNameRaw || companyNameEnRaw || prev.companyNameEn || '') : prev.companyNameEn,
        companyNameJp: isJpTab ? (companyNameRaw || companyNameJpRaw || prev.companyNameJp || '') : prev.companyNameJp,
        companyIntroduction: isViTab ? (companyIntroRaw || prev.companyIntroduction || '') : prev.companyIntroduction,
        companyIntroductionEn: isEnTab ? (companyIntroRaw || prev.companyIntroductionEn || '') : prev.companyIntroductionEn,
        companyIntroductionJp: isJpTab ? (companyIntroRaw || prev.companyIntroductionJp || '') : prev.companyIntroductionJp,
        headquarters: isViTab ? (headquarterRaw || prev.headquarters || '') : prev.headquarters,
        headquartersEn: isEnTab ? (headquarterRaw || prev.headquartersEn || '') : prev.headquartersEn,
        headquartersJp: isJpTab ? (headquarterRaw || prev.headquartersJp || '') : prev.headquartersJp,
        numberOfEmployees: isViTab ? (company.employee_count != null ? String(company.employee_count) : (prev.numberOfEmployees ?? '')) : prev.numberOfEmployees,
        numberOfEmployeesEn: isEnTab ? (company.employee_count != null ? String(company.employee_count) : (prev.numberOfEmployeesEn ?? '')) : prev.numberOfEmployeesEn,
        numberOfEmployeesJp: isJpTab ? (company.employee_count != null ? String(company.employee_count) : (prev.numberOfEmployeesJp ?? '')) : prev.numberOfEmployeesJp,
        establishedDate: isViTab ? (company.established_year != null ? String(company.established_year) : (prev.establishedDate ?? '')) : prev.establishedDate,
        establishedDateEn: isEnTab ? (company.established_year != null ? String(company.established_year) : (prev.establishedDateEn ?? '')) : prev.establishedDateEn,
        establishedDateJp: isJpTab ? (company.established_year != null ? String(company.established_year) : (prev.establishedDateJp ?? '')) : prev.establishedDateJp,
        investmentCapital: isViTab ? (company.capital != null ? String(company.capital) : (prev.investmentCapital ?? '')) : prev.investmentCapital,
        investmentCapitalEn: isEnTab ? (company.capital != null ? String(company.capital) : (prev.investmentCapitalEn ?? '')) : prev.investmentCapitalEn,
        investmentCapitalJp: isJpTab ? (company.capital != null ? String(company.capital) : (prev.investmentCapitalJp ?? '')) : prev.investmentCapitalJp,
        revenue: isViTab ? (company.revenue != null ? String(company.revenue) : (prev.revenue ?? '')) : prev.revenue,
        revenueEn: isEnTab ? (company.revenue != null ? String(company.revenue) : (prev.revenueEn ?? '')) : prev.revenueEn,
        revenueJp: isJpTab ? (company.revenue != null ? String(company.revenue) : (prev.revenueJp ?? '')) : prev.revenueJp,
      }));
    } catch (err) {
      const aborted =
        err?.name === 'AbortError' ||
        ac.signal.aborted ||
        (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError');
      if (!aborted) {
        setParseJdError(err?.message || 'Parse JD thất bại');
      } else {
        setParseJdError('');
      }
    } finally {
      if (parseJdAbortRef.current === ac) {
        parseJdAbortRef.current = null;
        setParseJdLoading(false);
      }
    }
  };

  useEffect(() => {
    const wasEnabled = prevParseJdEnabledRef.current;
    prevParseJdEnabledRef.current = parseJdEnabled;
    if (parseJdEnabled && jdFileJp && !wasEnabled) {
      void parseJdFileAndApplyForm(jdFileJp);
    }
    // Chỉ parse khi vừa bật toggle (tránh gọi trùng khi upload lúc đã bật Parse).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseJdEnabled, jdFileJp]);

  /** File JD gốc (lưu DB jd_original_file khi Lưu/Cập nhật). Nếu Parse JD bật → gọi API parse khi chọn file trong ô Import JD. */
  const handleJdFileJpChange = async (e) => {
    const input = e.target;
    const file = input?.files?.[0];
    if (!file || (file.size !== undefined && file.size <= 0)) {
      if (input) input.value = '';
      return;
    }
    setJdFileJp(file);
    if (parseJdEnabled) {
      await parseJdFileAndApplyForm(file);
    }
    if (input) input.value = '';
  };
  const handleJdFileJpDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverJdUpload(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file || (file.size !== undefined && file.size <= 0)) return;
    setJdFileJp(file);
    if (parseJdEnabled) {
      await parseJdFileAndApplyForm(file);
    }
  };

  const handleCompanyChange = (e) => {
    const companyId = e.target.value;

    setFormData((prev) => ({
      ...prev,
      companyId: companyId || ''
    }));
  };


  const validateForm = () => {
    const newErrors = {};

    if (jobId && (!formData.jobCode || !String(formData.jobCode).trim())) {
      newErrors.jobCode = t.jobCodeRequired || 'Mã việc làm là bắt buộc';
    }

    if (!formData.title || !String(formData.title).trim()) {
      newErrors.title = t.jobTitleRequired || 'Tiêu đề công việc là bắt buộc';
    }

    if (!formData.slug || !String(formData.slug).trim()) {
      newErrors.slug = t.slugRequired || 'Slug là bắt buộc';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = t.jobCategoryRequired || 'Danh mục là bắt buộc';
    }

    // Job Values: nếu typeId = 2 thì phải chọn valueId
    const invalidJobValues = jobValues.filter(jv => jv.typeId === 2 && !jv.valueId);
    if (invalidJobValues.length > 0) {
      newErrors.jobValues = 'Vui lòng chọn Value cho các Type có ID = 2';
    }
    for (const jv of jobValues) {
      if (jv.value && !(Number(jv.typeId) === 7 && Number(jv.valueId) === 34)) {
        const valueNum = parseFloat(jv.value);
        if (isNaN(valueNum) || valueNum < 0) {
          newErrors.jobValues = 'Giá trị trong Job Values phải là số dương';
          break;
        }
        if (formData.jobCommissionType === 'percent' && valueNum > 100) {
          newErrors.jobValues = 'Phần trăm không được vượt quá 100%';
          break;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPreviewJdPayload = () => {
    const previewJobCode =
      String(formData.jobCode || '').trim() || (!jobId ? generateNewJobCode() : '');
    const recruitingCompanySnapshot = recruitingCompanyRef.current;
    return {
      lang: languageTab,
      jobCode: previewJobCode,
      jobCategoryId: parseInt(formData.categoryId),
      businessSectorKey: formData.businessSectorKey || null,
      title: formData.title,
      titleEn: formData.titleEn || null,
      titleJp: formData.titleJp || null,
      slug: formData.slug || generateSlug(formData.title),
      description: formData.description || null,
      descriptionEn: formData.descriptionEn || null,
      descriptionJp: formData.descriptionJp || null,
      instruction: null,
      instructionEn: null,
      instructionJp: null,
      bonus: formData.bonus || null,
      bonusEn: formData.bonusEn || null,
      bonusJp: formData.bonusJp || null,
      salaryReview: formData.salaryReview || null,
      salaryReviewEn: formData.salaryReviewEn || null,
      salaryReviewJp: formData.salaryReviewJp || null,
      holidays: formData.holidays || null,
      holidaysEn: formData.holidaysEn || null,
      holidaysJp: formData.holidaysJp || null,
      holidayDetails: formData.holidayDetails || null,
      holidayDetailsEn: formData.holidayDetailsEn || null,
      holidayDetailsJp: formData.holidayDetailsJp || null,
      socialInsurance: formData.socialInsurance || null,
      socialInsuranceEn: formData.socialInsuranceEn || null,
      socialInsuranceJp: formData.socialInsuranceJp || null,
      transportation: formData.transportation || null,
      transportationEn: formData.transportationEn || null,
      transportationJp: formData.transportationJp || null,
      breakTime: formData.breakTime || null,
      breakTimeEn: formData.breakTimeEn || null,
      breakTimeJp: formData.breakTimeJp || null,
      overtime: formData.overtime || null,
      overtimeEn: formData.overtimeEn || null,
      overtimeJp: formData.overtimeJp || null,
      recruitmentType: formData.recruitmentType ? parseInt(formData.recruitmentType) : null,
      residenceStatuses: Array.isArray(formData.residenceStatuses) ? formData.residenceStatuses : [],
      residenceStatus: Array.isArray(formData.residenceStatuses) && formData.residenceStatuses.length
        ? JSON.stringify(formData.residenceStatuses)
        : (formData.residenceStatus || null),
      numberOfHires: formData.numberOfHires || null,
      numberOfHiresEn: formData.numberOfHiresEn || null,
      numberOfHiresJp: formData.numberOfHiresJp || null,
      contractPeriod: formData.contractPeriod || null,
      contractPeriodEn: formData.contractPeriodEn || null,
      contractPeriodJp: formData.contractPeriodJp || null,
      probationPeriod: formData.probationPeriod || null,
      probationPeriodEn: formData.probationPeriodEn || null,
      probationPeriodJp: formData.probationPeriodJp || null,
      probationDetail: formData.probationDetail || null,
      probationDetailEn: formData.probationDetailEn || null,
      probationDetailJp: formData.probationDetailJp || null,
      recruitmentProcess: formData.recruitmentProcess || null,
      recruitmentProcessEn: formData.recruitmentProcessEn || null,
      recruitmentProcessJp: formData.recruitmentProcessJp || null,
      transferAbility: formData.transferAbility || null,
      transferAbilityEn: formData.transferAbilityEn || null,
      transferAbilityJp: formData.transferAbilityJp || null,
      highlights: formData.highlights || null,

      workingLocations: sanitizeWorkingLocationsForApi(workingLocations),
      workingLocationDetails: workingLocationDetails
        .filter((wld) => (wld.content && wld.content.trim()) || (wld.contentEn && wld.contentEn.trim()) || (wld.contentJp && wld.contentJp.trim()))
        .map((wld) => ({ content: wld.content || null, contentEn: wld.contentEn || null, contentJp: wld.contentJp || null })),

      salaryRanges: salaryRanges
        .filter((sr) =>
          (sr.salaryRange && String(sr.salaryRange).trim()) ||
          (sr.salaryRangeEn && String(sr.salaryRangeEn).trim()) ||
          (sr.salaryRangeJp && String(sr.salaryRangeJp).trim())
        )
        .map((sr) => ({
          salaryRange: sr.salaryRange || null,
          salaryRangeEn: sr.salaryRangeEn || null,
          salaryRangeJp: sr.salaryRangeJp || null,
          type: sr.type || null,
        })),
      salaryRangeDetails: salaryRangeDetails
        .filter((srd) => (srd.content && srd.content.trim()) || (srd.contentEn && srd.contentEn.trim()) || (srd.contentJp && srd.contentJp.trim()))
        .map((srd) => ({ content: srd.content || null, contentEn: srd.contentEn || null, contentJp: srd.contentJp || null })),

      overtimeAllowances: overtimeAllowances
        .filter(
          (oa) =>
            (oa.overtimeAllowanceRange && oa.overtimeAllowanceRange.trim()) ||
            (oa.overtimeAllowanceRangeEn && String(oa.overtimeAllowanceRangeEn).trim()) ||
            (oa.overtimeAllowanceRangeJp && String(oa.overtimeAllowanceRangeJp).trim())
        )
        .map((oa) => ({
          overtimeAllowanceRange: oa.overtimeAllowanceRange || null,
          overtimeAllowanceRangeEn: oa.overtimeAllowanceRangeEn || null,
          overtimeAllowanceRangeJp: oa.overtimeAllowanceRangeJp || null,
        })),
      overtimeAllowanceDetails: overtimeAllowanceDetails
        .filter((oad) => (oad.content && oad.content.trim()) || (oad.contentEn && oad.contentEn.trim()) || (oad.contentJp && oad.contentJp.trim()))
        .map((oad) => ({ content: oad.content || null, contentEn: oad.contentEn || null, contentJp: oad.contentJp || null })),

      benefits: jobBenefitRows
        .filter(
          (b) =>
            (b.content && b.content.trim()) ||
            (b.contentEn && b.contentEn.trim()) ||
            (b.contentJp && b.contentJp.trim())
        )
        .map((b) => ({
          content: b.content || null,
          contentEn: b.contentEn || null,
          contentJp: b.contentJp || null
        })),

      requirements: requirements
        .filter((req) => (req.content && req.content.trim()) || (req.contentEn && req.contentEn.trim()) || (req.contentJp && req.contentJp.trim()))
        .map((req) => ({ content: req.content || null, contentEn: req.contentEn || null, contentJp: req.contentJp || null, type: req.type || null, status: req.status || null })),

      workingHours: workingHours
        .filter(
          (wh) =>
            (wh.workingHours && String(wh.workingHours).trim()) ||
            (wh.workingHoursEn && String(wh.workingHoursEn).trim()) ||
            (wh.workingHoursJp && String(wh.workingHoursJp).trim())
        )
        .map((wh) => ({
          workingHours: wh.workingHours || null,
          workingHoursEn: wh.workingHoursEn || null,
          workingHoursJp: wh.workingHoursJp || null,
        })),
      workingHourDetails: workingHourDetails
        .filter((whd) => (whd.content && whd.content.trim()) || (whd.contentEn && whd.contentEn.trim()) || (whd.contentJp && whd.contentJp.trim()))
        .map((whd) => ({ content: whd.content || null, contentEn: whd.contentEn || null, contentJp: whd.contentJp || null })),

      jobValues: jobValues.map((jv) => ({
        typeId: jv.typeId != null && String(jv.typeId).trim() ? parseInt(jv.typeId, 10) : null,
        valueId: jv.valueId != null && String(jv.valueId).trim() ? parseInt(jv.valueId, 10) : null,
        value: jv.value || null,
        isRequired: jv.isRequired || false,
        viewOnCollaborator: jv.viewOnCollaborator || null
      })),

      recruitingCompany: [
        recruitingCompany.companyName,
        recruitingCompany.companyNameEn,
        recruitingCompany.companyNameJp,
        recruitingCompany.companyIntroduction,
        recruitingCompany.companyIntroductionEn,
        recruitingCompany.companyIntroductionJp,
        recruitingCompany.headquarters,
        recruitingCompany.headquartersEn,
        recruitingCompany.headquartersJp,
      ].some((v) => String(v || '').trim())
        ? {
          companyName: recruitingCompany.companyName || null,
          companyNameEn: recruitingCompany.companyNameEn || null,
          companyNameJp: recruitingCompany.companyNameJp || null,
          revenue: recruitingCompany.revenue || null,
          revenueEn: recruitingCompany.revenueEn || null,
          revenueJp: recruitingCompany.revenueJp || null,
          numberOfEmployees: recruitingCompany.numberOfEmployees || null,
          numberOfEmployeesEn: recruitingCompany.numberOfEmployeesEn || null,
          numberOfEmployeesJp: recruitingCompany.numberOfEmployeesJp || null,
          headquarters: recruitingCompany.headquarters || null,
          headquartersEn: recruitingCompany.headquartersEn || null,
          headquartersJp: recruitingCompany.headquartersJp || null,
          companyIntroduction: recruitingCompany.companyIntroduction || null,
          companyIntroductionEn: recruitingCompany.companyIntroductionEn || null,
          companyIntroductionJp: recruitingCompany.companyIntroductionJp || null,
          stockExchangeInfo: recruitingCompany.stockExchangeInfo || null,
          stockExchangeInfoEn: recruitingCompany.stockExchangeInfoEn || null,
          stockExchangeInfoJp: recruitingCompany.stockExchangeInfoJp || null,
          investmentCapital: recruitingCompany.investmentCapital || null,
          investmentCapitalEn: recruitingCompany.investmentCapitalEn || null,
          investmentCapitalJp: recruitingCompany.investmentCapitalJp || null,
          establishedDate: recruitingCompany.establishedDate || null,
          establishedDateEn: recruitingCompany.establishedDateEn || null,
          establishedDateJp: recruitingCompany.establishedDateJp || null,
          services: (recruitingCompany.services || [])
            .filter((s) => s.serviceName && s.serviceName.trim())
            .map((s) => ({
              serviceName: s.serviceName.trim(),
              serviceNameEn: s.serviceNameEn ? s.serviceNameEn.trim() : null,
              serviceNameJp: s.serviceNameJp ? s.serviceNameJp.trim() : null,
              order: s.order || 0
            })),
          businessSectors: (recruitingCompany.businessSectors || [])
            .filter((bs) => bs.sectorName && bs.sectorName.trim())
            .map((bs) => ({
              sectorName: bs.sectorName.trim(),
              sectorNameEn: bs.sectorNameEn ? bs.sectorNameEn.trim() : null,
              sectorNameJp: bs.sectorNameJp ? bs.sectorNameJp.trim() : null,
              order: bs.order || 0,
            }))
        }
        : null
    };
  };

  const runJdPdfPreview = useCallback(async () => {
    setJdPdfPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    jdPdfBlobRef.current = null;

    const payload = buildPreviewJdPayload();
    const pdfRes = await apiService.previewAdminJobJdPdf(payload);
    if (!pdfRes.ok || !pdfRes.blob) {
      alert(pdfRes.message || 'Không tạo được JD PDF.');
      return false;
    }

    jdPdfBlobRef.current = pdfRes.blob;
    setJdPdfPreviewUrl(URL.createObjectURL(pdfRes.blob));
    return true;
  }, [buildPreviewJdPayload]);

  const handlePreviewJdPdf = useCallback(async () => {
    try {
      setJdPdfLoading(true);
      setJdPreviewLoading(true);
      setShowJdPreviewModal(true);

      const ok = await runJdPdfPreview();
      if (!ok) setShowJdPreviewModal(false);
      return ok;
    } catch (e) {
      console.error('Preview JD PDF error:', e);
      alert(e?.message || 'Không tạo được JD PDF.');
      setShowJdPreviewModal(false);
      return false;
    } finally {
      setJdPdfLoading(false);
      setJdPreviewLoading(false);
    }
  }, [runJdPdfPreview]);

  const closeJdPreviewModal = useCallback(() => {
    setShowJdPreviewModal(false);
  }, []);

  const handleDownloadJdPdf = useCallback(async () => {
    let blob = jdPdfBlobRef.current;
    if (!blob || !blob.size) {
      try {
        setJdPdfLoading(true);
        const ok = await runJdPdfPreview();
        blob = jdPdfBlobRef.current;
        if (!ok || !blob) return;
      } catch (e) {
        console.error('Download JD PDF error:', e);
        alert(e?.message || 'Không tạo được JD PDF.');
        return;
      } finally {
        setJdPdfLoading(false);
      }
    }

    downloadBlobAsFile(blob, buildJdPdfFilename(languageTab));
  }, [runJdPdfPreview, languageTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const jobCodeForSave =
      String(formData.jobCode || '').trim() || (!jobId ? generateNewJobCode() : '');
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Prepare JSON body data
      const recruitingCompanySnapshot = recruitingCompanyRef.current;
      const requestData = {
        // Required fields
        jobCode: jobCodeForSave,
        jobCategoryId: parseInt(formData.categoryId),
        businessSectorKey: formData.businessSectorKey || null,
        title: formData.title,
        titleEn: formData.titleEn || null,
        titleJp: formData.titleJp || null,
        slug: formData.slug || generateSlug(formData.title),
        // Optional basic fields
        description: formData.description || null,
        descriptionEn: formData.descriptionEn || null,
        descriptionJp: formData.descriptionJp || null,
        instruction: null,
        instructionEn: null,
        instructionJp: null,
        interviewLocation: formData.interviewLocation ? parseInt(formData.interviewLocation) : null,
        bonus: formData.bonus || null,
        bonusEn: formData.bonusEn || null,
        bonusJp: formData.bonusJp || null,
        salaryReview: formData.salaryReview || null,
        salaryReviewEn: formData.salaryReviewEn || null,
        salaryReviewJp: formData.salaryReviewJp || null,
        holidays: formData.holidays || null,
        holidaysEn: formData.holidaysEn || null,
        holidaysJp: formData.holidaysJp || null,
        holidayDetails: formData.holidayDetails || null,
        holidayDetailsEn: formData.holidayDetailsEn || null,
        holidayDetailsJp: formData.holidayDetailsJp || null,
        socialInsurance: formData.socialInsurance || null,
        socialInsuranceEn: formData.socialInsuranceEn || null,
        socialInsuranceJp: formData.socialInsuranceJp || null,
        transportation: formData.transportation || null,
        transportationEn: formData.transportationEn || null,
        transportationJp: formData.transportationJp || null,
        breakTime: formData.breakTime || null,
        breakTimeEn: formData.breakTimeEn || null,
        breakTimeJp: formData.breakTimeJp || null,
        overtime: formData.overtime || null,
        overtimeEn: formData.overtimeEn || null,
        overtimeJp: formData.overtimeJp || null,
        recruitmentType: formData.recruitmentType ? parseInt(formData.recruitmentType) : null,
        residenceStatuses: Array.isArray(formData.residenceStatuses) ? JSON.stringify(formData.residenceStatuses) : null,
        residenceStatus: formData.residenceStatus || null,
        residenceStatusEn: formData.residenceStatusEn || null,
        residenceStatusJp: formData.residenceStatusJp || null,
        numberOfHires: formData.numberOfHires || null,
        numberOfHiresEn: formData.numberOfHiresEn || null,
        numberOfHiresJp: formData.numberOfHiresJp || null,
        contractPeriod: formData.contractPeriod || null,
        contractPeriodEn: formData.contractPeriodEn || null,
        contractPeriodJp: formData.contractPeriodJp || null,
        probationPeriod: formData.probationPeriod || null,
        probationPeriodEn: formData.probationPeriodEn || null,
        probationPeriodJp: formData.probationPeriodJp || null,
        probationDetail: formData.probationDetail || null,
        probationDetailEn: formData.probationDetailEn || null,
        probationDetailJp: formData.probationDetailJp || null,
        companyId: formData.companyId ? parseInt(formData.companyId) : null,
        recruitmentProcess: formData.recruitmentProcess || null,
        recruitmentProcessEn: formData.recruitmentProcessEn || null,
        recruitmentProcessJp: formData.recruitmentProcessJp || null,
        transferAbility: formData.transferAbility || null,
        transferAbilityEn: formData.transferAbilityEn || null,
        transferAbilityJp: formData.transferAbilityJp || null,
        highlights: formData.highlights || null,
        deadline: formData.deadline || null,
        status: parseInt(formData.status),
        isPinned: formData.isPinned || false,
        isHot: formData.isHot || false,
        jobCommissionType: formData.jobCommissionType || 'fixed',
        // Related data arrays
        workingLocations: sanitizeWorkingLocationsForApi(workingLocations),
        workingLocationDetails: workingLocationDetails
          .filter(wld =>
            (wld.content && wld.content.trim()) ||
            (wld.contentEn && wld.contentEn.trim()) ||
            (wld.contentJp && wld.contentJp.trim())
          )
          .map(wld => ({
            content: wld.content || null,
            contentEn: wld.contentEn || null,
            contentJp: wld.contentJp || null
          })),
        salaryRanges: salaryRanges
          .filter(sr =>
            (sr.salaryRange && sr.salaryRange.trim()) ||
            (sr.salaryRangeEn && sr.salaryRangeEn.trim()) ||
            (sr.salaryRangeJp && sr.salaryRangeJp.trim())
          )
          .map(sr => ({
            salaryRange: sr.salaryRange || null,
            salaryRangeEn: sr.salaryRangeEn || null,
            salaryRangeJp: sr.salaryRangeJp || null,
            type: sr.type || null
          })),
        salaryRangeDetails: salaryRangeDetails
          .filter(srd =>
            (srd.content && srd.content.trim()) ||
            (srd.contentEn && srd.contentEn.trim()) ||
            (srd.contentJp && srd.contentJp.trim())
          )
          .map(srd => ({
            content: srd.content || null,
            contentEn: srd.contentEn || null,
            contentJp: srd.contentJp || null
          })),
        overtimeAllowances: overtimeAllowances
          .filter(
            (oa) =>
              (oa.overtimeAllowanceRange && oa.overtimeAllowanceRange.trim()) ||
              (oa.overtimeAllowanceRangeEn && String(oa.overtimeAllowanceRangeEn).trim()) ||
              (oa.overtimeAllowanceRangeJp && String(oa.overtimeAllowanceRangeJp).trim())
          )
          .map((oa) => ({
            overtimeAllowanceRange: oa.overtimeAllowanceRange || null,
            overtimeAllowanceRangeEn: oa.overtimeAllowanceRangeEn || null,
            overtimeAllowanceRangeJp: oa.overtimeAllowanceRangeJp || null,
          })),
        overtimeAllowanceDetails: overtimeAllowanceDetails
          .filter(oad =>
            (oad.content && oad.content.trim()) ||
            (oad.contentEn && oad.contentEn.trim()) ||
            (oad.contentJp && oad.contentJp.trim())
          )
          .map(oad => ({
            content: oad.content || null,
            contentEn: oad.contentEn || null,
            contentJp: oad.contentJp || null
          })),
        requirements: requirements
          .filter(req =>
            (req.content && req.content.trim()) ||
            (req.contentEn && req.contentEn.trim()) ||
            (req.contentJp && req.contentJp.trim())
          )
          .map(req => ({
            content: req.content || null,
            contentEn: req.contentEn || null,
            contentJp: req.contentJp || null,
            type: req.type || null,
            status: req.status || null
          })),
        smokingPolicies: smokingPolicies,
        smokingPolicyDetails: smokingPolicyDetails
          .filter(spd =>
            (spd.content && spd.content.trim()) ||
            (spd.contentEn && spd.contentEn.trim()) ||
            (spd.contentJp && spd.contentJp.trim())
          )
          .map(spd => ({
            content: spd.content || null,
            contentEn: spd.contentEn || null,
            contentJp: spd.contentJp || null
          })),
        workingHours: workingHours
          .filter(
            (wh) =>
              (wh.workingHours && String(wh.workingHours).trim()) ||
              (wh.workingHoursEn && String(wh.workingHoursEn).trim()) ||
              (wh.workingHoursJp && String(wh.workingHoursJp).trim())
          )
          .map((wh) => ({
            workingHours: wh.workingHours || null,
            workingHoursEn: wh.workingHoursEn || null,
            workingHoursJp: wh.workingHoursJp || null,
          })),
        workingHourDetails: workingHourDetails
          .filter(whd =>
            (whd.content && whd.content.trim()) ||
            (whd.contentEn && whd.contentEn.trim()) ||
            (whd.contentJp && whd.contentJp.trim())
          )
          .map(whd => ({
            content: whd.content || null,
            contentEn: whd.contentEn || null,
            contentJp: whd.contentJp || null
          })),
        benefits: jobBenefitRows
          .filter(
            (b) =>
              (b.content && b.content.trim()) ||
              (b.contentEn && b.contentEn.trim()) ||
              (b.contentJp && b.contentJp.trim())
          )
          .map((b) => ({
            content: b.content || null,
            contentEn: b.contentEn || null,
            contentJp: b.contentJp || null
          })),
        jobValues: jobValues.map(jv => ({
          typeId: parseInt(jv.typeId),
          valueId: parseInt(jv.valueId),
          value: jv.value || null,
          isRequired: jv.isRequired || false,
          viewOnCollaborator: jv.viewOnCollaborator || null
        })),
        jobPickupIds: [], // TODO: Add job pickup selection if needed
        campaignIds: selectedCampaignIds
          .filter(id => campaigns.some(c => String(c.id) === String(id)))
          .map(id => parseInt(id)),
        // Recruiting Company data
        recruitingCompany: [
          recruitingCompanySnapshot.companyName,
          recruitingCompanySnapshot.companyNameEn,
          recruitingCompanySnapshot.companyNameJp,
          recruitingCompanySnapshot.companyIntroduction,
          recruitingCompanySnapshot.companyIntroductionEn,
          recruitingCompanySnapshot.companyIntroductionJp,
          recruitingCompanySnapshot.headquarters,
          recruitingCompanySnapshot.headquartersEn,
          recruitingCompanySnapshot.headquartersJp,
        ].some((v) => String(v || '').trim()) ? {
          companyName: recruitingCompanySnapshot.companyName || null,
          companyNameEn: recruitingCompanySnapshot.companyNameEn || null,
          companyNameJp: recruitingCompanySnapshot.companyNameJp || null,
          revenue: recruitingCompanySnapshot.revenue || null,
          revenueEn: recruitingCompanySnapshot.revenueEn || null,
          revenueJp: recruitingCompanySnapshot.revenueJp || null,
          numberOfEmployees: recruitingCompanySnapshot.numberOfEmployees || null,
          numberOfEmployeesEn: recruitingCompanySnapshot.numberOfEmployeesEn || null,
          numberOfEmployeesJp: recruitingCompanySnapshot.numberOfEmployeesJp || null,
          headquarters: recruitingCompanySnapshot.headquarters || null,
          headquartersEn: recruitingCompanySnapshot.headquartersEn || null,
          headquartersJp: recruitingCompanySnapshot.headquartersJp || null,
          companyIntroduction: recruitingCompanySnapshot.companyIntroduction || null,
          companyIntroductionEn: recruitingCompanySnapshot.companyIntroductionEn || null,
          companyIntroductionJp: recruitingCompanySnapshot.companyIntroductionJp || null,
          stockExchangeInfo: recruitingCompanySnapshot.stockExchangeInfo || null,
          stockExchangeInfoEn: recruitingCompanySnapshot.stockExchangeInfoEn || null,
          stockExchangeInfoJp: recruitingCompanySnapshot.stockExchangeInfoJp || null,
          investmentCapital: recruitingCompanySnapshot.investmentCapital || null,
          investmentCapitalEn: recruitingCompanySnapshot.investmentCapitalEn || null,
          investmentCapitalJp: recruitingCompanySnapshot.investmentCapitalJp || null,
          establishedDate: recruitingCompanySnapshot.establishedDate || null,
          establishedDateEn: recruitingCompanySnapshot.establishedDateEn || null,
          establishedDateJp: recruitingCompanySnapshot.establishedDateJp || null,
          services: recruitingCompanySnapshot.services
            .filter(s => s.serviceName && s.serviceName.trim())
            .map(s => ({
              serviceName: s.serviceName.trim(),
              serviceNameEn: s.serviceNameEn ? s.serviceNameEn.trim() : null,
              serviceNameJp: s.serviceNameJp ? s.serviceNameJp.trim() : null,
              order: s.order || 0
            })),
          businessSectors: recruitingCompanySnapshot.businessSectors.filter(bs => bs.sectorName && bs.sectorName.trim()).map(bs => ({
            sectorName: bs.sectorName.trim(),
            sectorNameEn: bs.sectorNameEn ? bs.sectorNameEn.trim() : null,
            sectorNameJp: bs.sectorNameJp ? bs.sectorNameJp.trim() : null,
            order: bs.order || 0
          }))
        } : null
      };

      const hasJdOriginalUpload = !!(jdFileJp && jdFileJp.size > 0);
      const originalJob = originalJobRef.current || {};
      const mergedRequestData = jobId
        ? {
            ...originalJob,
            ...requestData,
            recruitingCompany: requestData.recruitingCompany ?? originalJob.recruitingCompany ?? null,
            workingLocations: requestData.workingLocations ?? originalJob.workingLocations ?? [],
            workingLocationDetails: requestData.workingLocationDetails ?? originalJob.workingLocationDetails ?? [],
            salaryRanges: requestData.salaryRanges ?? originalJob.salaryRanges ?? [],
            salaryRangeDetails: requestData.salaryRangeDetails ?? originalJob.salaryRangeDetails ?? [],
            overtimeAllowances: requestData.overtimeAllowances ?? originalJob.overtimeAllowances ?? [],
            overtimeAllowanceDetails: requestData.overtimeAllowanceDetails ?? originalJob.overtimeAllowanceDetails ?? [],
            requirements: requestData.requirements ?? originalJob.requirements ?? [],
            smokingPolicies: requestData.smokingPolicies ?? originalJob.smokingPolicies ?? [],
            smokingPolicyDetails: requestData.smokingPolicyDetails ?? originalJob.smokingPolicyDetails ?? [],
            workingHours: requestData.workingHours ?? originalJob.workingHours ?? [],
            workingHourDetails: requestData.workingHourDetails ?? originalJob.workingHourDetails ?? [],
            benefits: requestData.benefits ?? originalJob.benefits ?? [],
          }
        : requestData;

      const payloadForApi = hasJdOriginalUpload
        ? (() => {
            const fd = new FormData();
            fd.append('data', JSON.stringify(mergedRequestData));
            fd.append('jdOriginalFile', jdFileJp, jdFileJp.name);
            return fd;
          })()
        : mergedRequestData;

      if (jobId && originalJobRef.current && !payloadForApi.recruitingCompany && originalJobRef.current.recruitingCompany) {
        payloadForApi.recruitingCompany = originalJobRef.current.recruitingCompany;
      }

      const response = jobId
        ? await apiService.updateAdminJob(jobId, payloadForApi)
        : await apiService.createAdminJob(payloadForApi);
      if (response.success) {
        const savedJobId = jobId || response.data?.job?.id;
        // Gọi API sync vector ngầm (không chờ, không block UI)
        if (savedJobId) {
          fetch(`https://ws-jobshare.com/api_ai/v2/vector/jd/${savedJobId}`, { method: 'POST' })
            .then(() => console.log(`[VectorSync] Job ${savedJobId} synced successfully`))
            .catch((err) => console.warn(`[VectorSync] Job ${savedJobId} sync failed:`, err));
        }
        if (hasJdOriginalUpload) setJdFileJp(null);
        alert(jobId ? 'Job đã được cập nhật thành công!' : 'Job đã được lưu thành công!');
        navigate(jobId ? `/admin/jobs/${jobId}` : '/admin/jobs');
      } else {
        alert(response.message || (jobId ? 'Có lỗi xảy ra khi cập nhật job' : 'Có lỗi xảy ra khi tạo job'));
      }
    } catch (error) {
      console.error(`Error ${jobId ? 'updating' : 'creating'} job:`, error);
      alert(error.message || (jobId ? 'Có lỗi xảy ra khi cập nhật job' : 'Có lỗi xảy ra khi tạo job'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm(t.jobCancelConfirm || 'Bạn có chắc muốn hủy? Dữ liệu chưa lưu sẽ bị mất.')) {
      navigate(jobId ? `/admin/jobs/${jobId}` : '/admin/jobs');
    }
  };

  return (
    <div className="relative space-y-4 min-w-0 max-w-full">
      {/* Overlay parse JD: portal ra body để fixed không bị kẹt trong main overflow (tránh hở đáy). */}
      {parseJdLoading &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}
            aria-busy="true"
            aria-live="polite"
          >
            <div
              className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"
              role="status"
              aria-label={t.parseJdLoading ?? 'Đang xử lý...'}
            />
            <p className="text-sm font-semibold" style={{ color: '#111827' }}>
              {t.parseJdAnalyzingLabel ?? 'Đang phân tích JD...'}
            </p>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              {t.parseJdAnalyzingHint ?? 'Vui lòng đợi trong giây lát'}
            </p>
            <button
              type="button"
              className="mt-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 shadow-sm"
              style={{ color: '#374151' }}
              onClick={() => parseJdAbortRef.current?.abort()}
            >
              {t.parseJdCancel ?? 'Hủy'}
            </button>
          </div>,
          document.body
        )}
      {/* Thanh hành động — sticky, bố cục giống AddCandidateForm */}
      <div className="sticky top-0 z-20 -mx-0.5 px-0.5 py-1 bg-gradient-to-b from-slate-100/95 to-slate-100/0 backdrop-blur-[2px] mb-1">
        <div
          className="rounded-xl border shadow-sm px-3 sm:px-4 py-2.5 flex flex-col gap-2 min-w-0"
          style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}
        >
        <div className="flex flex-row items-start gap-2 w-full min-w-0">
          <div className="flex items-start xl:items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate(jobId ? `/admin/jobs/${jobId}` : '/admin/jobs')}
              onMouseEnter={() => setHoveredBackButton(true)}
              onMouseLeave={() => setHoveredBackButton(false)}
              className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-colors border flex-shrink-0 mt-0.5 xl:mt-0"
              style={{
                borderColor: '#d1d5db',
                backgroundColor: hoveredBackButton ? '#f3f4f6' : '#ffffff',
                color: '#374151',
              }}
              title={t.back || 'Quay lại'}
              aria-label={t.back || 'Quay lại'}
            >
              <ArrowLeft className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">{t.back || 'Quay lại'}</span>
            </button>
            <div className="min-w-0 flex-1 border-l pl-2 sm:pl-3" style={{ borderColor: '#e5e7eb' }}>
              <h1 className="text-sm sm:text-lg font-bold leading-snug truncate" style={{ color: '#111827' }}>
                {jobId
                  ? t.adminEditJobTitle || 'Chỉnh sửa công việc'
                  : t.adminAddJobTitle || 'Tạo công việc'}
              </h1>
              <p className="text-[10px] sm:text-xs mt-0.5 truncate hidden sm:block" style={{ color: '#6b7280' }}>
                {jobId
                  ? t.adminEditJobSubtitle || 'Cập nhật thông tin công việc'
                  : t.adminAddJobSubtitle || 'Thêm thông tin công việc mới vào hệ thống'}
              </p>
            </div>
          </div>
          <div className="flex flex-row items-center gap-1 sm:gap-1.5 shrink-0 mt-0.5 xl:mt-0">
            <button
              type="button"
              onClick={handleCancel}
              onMouseEnter={() => setHoveredCancelButton(true)}
              onMouseLeave={() => setHoveredCancelButton(false)}
              className="inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-colors border shrink-0"
              style={{
                backgroundColor: hoveredCancelButton ? '#e5e7eb' : '#f9fafb',
                borderColor: '#d1d5db',
                color: '#374151',
              }}
            >
              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              {t.cancel || 'Hủy'}
            </button>
            <button
              type="submit"
              form="admin-add-job-form"
              onMouseEnter={() => setHoveredSaveButton(true)}
              onMouseLeave={() => setHoveredSaveButton(false)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-colors shrink-0 whitespace-nowrap disabled:opacity-50"
              style={{
                backgroundColor: hoveredSaveButton ? '#1d4ed8' : '#2563eb',
                color: 'white',
              }}
            >
              <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              {loading
                ? (jobId ? 'Đang cập nhật...' : 'Đang lưu...')
                : (jobId
                  ? t.adminEditJobSaveButton || 'Cập nhật công việc'
                  : t.adminAddJobSaveButton || 'Lưu công việc')}
            </button>
          </div>
        </div>
        <div
          className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100"
          role="tablist"
          aria-label={languageTab === 'jp' ? 'フォーム言語' : 'Form language'}
        >
          <div className="flex min-w-0 flex-1 basis-[min(100%,14rem)] gap-1 rounded-lg border bg-gray-50 p-0.5" style={{ borderColor: '#e5e7eb' }}>
            {[
              { id: 'vi', label: 'Tiếng Việt' },
              { id: 'en', label: 'English' },
              { id: 'jp', label: '日本語' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={languageTab === tab.id}
                onClick={() => setLanguageTab(tab.id)}
                className={`min-w-0 flex-1 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors sm:text-xs ${
                  languageTab === tab.id
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleTranslateCurrentTabInputs}
            disabled={translatingInputs}
            className="shrink-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed sm:px-3 sm:text-xs"
            style={{ borderColor: '#93c5fd', color: '#2563eb', backgroundColor: '#eff6ff' }}
            title={languageTab === 'jp' ? '現在のタブから他の2言語へ入力欄を翻訳' : languageTab === 'en' ? 'Translate input fields from current tab to the other two tabs' : 'Dịch các ô nhập từ tab hiện tại sang 2 tab còn lại'}
          >
            <Languages className="w-3.5 h-3.5 shrink-0" />
            <span>{translatingInputs ? (languageTab === 'jp' ? '翻訳中...' : languageTab === 'en' ? 'Translating...' : 'Đang dịch...') : (languageTab === 'jp' ? '翻訳' : languageTab === 'en' ? 'Translate' : 'Dịch')}</span>
          </button>
        </div>
        </div>
      </div>

      {/* Modal chọn Loại công việc — 2 panel: trái = Loại công việc (cha), phải = Chi tiết (con) */}
      {showJobTypeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
          onClick={() => setShowJobTypeModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#e5e7eb' }}>
              <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>
                {t.agentJobsSelectJobType || 'Chọn Loại công việc'}
              </h3>
              <button
                type="button"
                onClick={() => setShowJobTypeModal(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4" style={{ color: '#6b7280' }} />
              </button>
            </div>
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Panel trái: Loại công việc (chỉ cha) */}
              <div className="w-1/2 flex flex-col border-r overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                <div className="px-3 py-2 border-b text-xs font-semibold" style={{ borderColor: '#e5e7eb', color: '#111827' }}>
                  {t.agentJobsSelectJobType || 'Chọn Loại công việc'}
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {categoryTree && categoryTree.length > 0 ? (
                    <div className="space-y-0.5">
                      {(categoryTree.filter(cat => !cat.parentId) || []).map((cat) => {
                        const isSelected = String(selectedJobTypeParentId) === String(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedJobTypeParentId(cat.id)}
                            className="w-full text-left px-2 py-1.5 rounded text-xs"
                            style={{
                              backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                              color: isSelected ? '#1d4ed8' : '#111827'
                            }}
                          >
                            {getCategoryDisplayName(cat)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">{t.loading || 'Đang tải...'}</div>
                  )}
                </div>
              </div>
              {/* Panel phải: Chi tiết (con của cha đã chọn) */}
              <div className="w-1/2 flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b text-xs font-semibold" style={{ borderColor: '#e5e7eb', color: '#111827' }}>
                  {t.agentJobsDetails || 'Chi tiết'}
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {!selectedJobTypeParentId ? (
                    <p className="text-xs text-gray-500">{t.agentJobsSelectJobTypeFirst || 'Vui lòng chọn Loại công việc trước'}</p>
                  ) : (() => {
                    const parentNode = findCategoryInTree(categoryTree || [], selectedJobTypeParentId);
                    const children = parentNode?.children || [];
                    const renderChild = (node, level = 0) => {
                      const isSelected = String(formData.categoryId) === String(node.id);
                      return (
                        <div key={node.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, categoryId: String(node.id) }));
                              setErrors(prev => ({ ...prev, categoryId: '' }));
                              setShowJobTypeModal(false);
                            }}
                            className="w-full text-left px-2 py-1.5 rounded text-xs flex items-center"
                            style={{
                              paddingLeft: 8 + level * 16,
                              backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                              color: isSelected ? '#1d4ed8' : '#111827'
                            }}
                          >
                            {level > 0 && <span className="text-gray-400 mr-1">└─</span>}
                            {getCategoryDisplayName(node)}
                          </button>
                          {node.children?.length > 0 && node.children.map(child => renderChild(child, level + 1))}
                        </div>
                      );
                    };
                    return children.length > 0 ? (
                      <div className="space-y-0.5">{children.map(c => renderChild(c, 0))}</div>
                    ) : (
                      <p className="text-xs text-gray-500">{t.noData || 'Không có chi tiết'}</p>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Giao diện 2 cột: cột trái form nhập, cột phải preview JD (có thể sửa trực tiếp trên JD) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 items-stretch min-w-0">
        <div className="min-h-0 min-w-0">
      <form id="admin-add-job-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
        {/* Block Import JD - full width, trên cùng */}
        <div className="w-full">
          <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 pb-2.5 mb-2 border-b border-gray-100">
              <h2 className="text-sm font-bold m-0 flex items-center gap-2 min-w-0" style={{ color: '#111827' }}>
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">{t.jobImportJdSectionTitle || 'Import JD'}</span>
              </h2>
              <label
                className="flex items-center gap-2 cursor-pointer select-none shrink-0"
                title={parseJdEnabled ? (t.parseJdToggleOff ?? 'Tắt tính năng Parse JD') : (t.parseJdToggleOn ?? 'Bật tính năng Parse JD')}
              >
                <span className="text-xs font-medium leading-none text-gray-600 whitespace-nowrap">
                  {t.parseJdFeatureLabel ?? 'Parse JD'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={parseJdEnabled}
                  onClick={() => setParseJdEnabled((v) => !v)}
                  className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  style={{
                    backgroundColor: parseJdEnabled ? '#2563eb' : '#d1d5db'
                  }}
                >
                  <span
                    className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform"
                    style={{
                      transform: parseJdEnabled ? 'translateX(18px)' : 'translateX(2px)',
                    }}
                  />
                </button>
              </label>
            </div>
            {parseJdError ? (
              <p className="text-[11px] mb-2 leading-snug" style={{ color: '#dc2626' }}>{parseJdError}</p>
            ) : null}
            <div>
              <label className="block text-[11px] font-semibold text-gray-900 mb-1">
                {t.jobImportJdLabelJp || 'JD File (Tiếng Nhật)'}
              </label>
              <div
                className="border border-dashed border-gray-300 rounded-md py-2 px-2 text-center hover:border-blue-600 transition-colors"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverJdUpload(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverJdUpload(false);
                }}
                onDrop={handleJdFileJpDrop}
                style={{
                  borderColor: dragOverJdUpload ? '#2563eb' : undefined,
                  backgroundColor: dragOverJdUpload ? '#eff6ff' : undefined
                }}
              >
                <label htmlFor="jd-upload-jp" className="cursor-pointer block">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                      <Upload className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <p className="text-[11px] font-medium text-gray-800 leading-tight">
                      {t.jobImportJdDragDropText || 'Kéo thả file JD (JP) vào đây'}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      {t.jobImportJdOrText || 'hoặc'}{' '}
                      <span className="text-blue-600 font-medium">
                        {t.jobImportJdChooseFileText || 'Chọn file từ máy tính'}
                      </span>
                    </p>
                    <p className="text-[9px] text-gray-400 leading-tight">
                      {t.jobImportJdSupportedTypes || 'Hỗ trợ PDF, DOC, DOCX'}
                    </p>
                  </div>
                  <input
                    id="jd-upload-jp"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleJdFileJpChange}
                    className="hidden"
                  />
                </label>
              </div>
              {(jdFileJp || (jobId && existingJdOriginalFilename)) && (
                <div className="mt-1.5 text-[11px] text-gray-600 flex items-center justify-between gap-2 bg-gray-50 px-2 py-1 rounded">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                    {jdFileJp ? (
                      <span className="truncate" title={jdFileJp.name}>
                        {(t.jobImportJdSelectedFileLabel || 'File đã chọn: {name}')
                          .replace('{name}', jdFileJp.name)}
                      </span>
                    ) : (
                      <>
                        <span className="truncate" title={existingJdOriginalFilename}>
                          {(t.jobImportJdExistingFileLabel || 'File JD gốc đang lưu: {name}')
                            .replace('{name}', existingJdOriginalFilename)}
                        </span>
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800 shrink-0 text-xs font-medium"
                          onClick={async () => {
                            try {
                              const url = await apiService.getAdminJobFileUrl(
                                jobId,
                                'jdOriginalFile',
                                'download'
                              );
                              if (url) openRemoteFileDownloadUrl(url);
                              else alert('Không lấy được link tải file.');
                            } catch (e) {
                              alert(e?.message || 'Lỗi khi tải file');
                            }
                          }}
                        >
                          {t.jobImportJdDownloadExisting || 'Tải xuống'}
                        </button>
                      </>
                    )}
                  </div>
                  {jdFileJp && (
                    <button
                      type="button"
                      onClick={() => setJdFileJp(null)}
                      className="text-red-500 hover:text-red-700 shrink-0"
                      title={t.jobImportJdClearSelected || 'Bỏ file vừa chọn'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab ngôn ngữ đã chuyển lên thanh sticky phía trên — luôn bấm được khi cuộn */}

        {/* Left Column */}
        <div className="space-y-3">
          {/* Block 1: Thông tin cơ bản — theo spec: Tiêu đề, Mã + Trạng thái, Lĩnh vực, Loại công việc, Hình thức, Số lượng tuyển dụng, Điểm nổi bật */}
          <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 pb-2.5 border-b border-gray-100" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Briefcase className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.jobBasicInfoSectionTitle || 'Thông tin cơ bản'}
            </h2>
            <div className="space-y-3">
              {/* 1. Tiêu đề việc làm */}
              {languageTab === 'vi' && (
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {t.jobTitleLabel || 'Tiêu đề việc làm'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="VD: Software Engineer - React/Node.js Developer"
                    required
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{
                      borderColor: errors.title ? '#ef4444' : '#d1d5db',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.title ? '#ef4444' : '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {errors.title && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.title}</p>}
                </div>
              )}
              {languageTab === 'en' && (
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {(t.jobTitleLabel || 'Tiêu đề việc làm') + ' (EN)'}
                  </label>
                  <input
                    type="text"
                    name="titleEn"
                    value={formData.titleEn}
                    onChange={handleInputChange}
                    placeholder="Job title in English"
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{ borderColor: '#d1d5db', outline: 'none' }}
                    onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              )}
              {languageTab === 'jp' && (
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {(t.jobTitleLabel || 'Tiêu đề việc làm') + ' (JP)'}
                  </label>
                  <input
                    type="text"
                    name="titleJp"
                    value={formData.titleJp}
                    onChange={handleInputChange}
                    placeholder="求人票のタイトル（日本語）"
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{ borderColor: '#d1d5db', outline: 'none' }}
                    onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              )}

              {/* 2. Mã công việc + 3. Trạng thái (cùng hàng) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {(t.jobCode || 'Mã công việc')}
                    {jobId ? <span style={{ color: '#ef4444' }}> *</span> : (
                      <span className="text-[10px] font-normal text-gray-500 ml-1">({t.jobCodeAutoHint ?? 'tự tạo khi thêm mới'})</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="jobCode"
                    value={formData.jobCode}
                    onChange={handleInputChange}
                    placeholder={jobId ? 'VD: JOB-001' : (t.jobCodeAutoPlaceholder ?? 'Mã được tạo tự động')}
                    required={!!jobId}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{
                      borderColor: errors.jobCode ? '#ef4444' : '#d1d5db',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.jobCode ? '#ef4444' : '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {errors.jobCode && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.jobCode}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {(t.status || 'Trạng thái')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{
                      borderColor: '#d1d5db',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="0">{t.jobStatusDraft || 'Draft'}</option>
                    <option value="1">{t.jobStatusPublished || 'Published'}</option>
                    <option value="2">{t.jobStatusClosed || 'Closed'}</option>
                    <option value="3">{t.jobStatusExpired || 'Expired'}</option>
                  </select>
                </div>
              </div>

              {/* 4. Lĩnh vực (Chọn 1 option) - danh sách giống block Lĩnh vực kinh doanh */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  Lĩnh vực <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  name="businessSectorKey"
                  value={formData.businessSectorKey}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{
                    borderColor: '#d1d5db',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.categoryId ? '#ef4444' : '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">
                    {t.jobCategorySelectPlaceholder || t.pleaseSelect || 'Chọn lĩnh vực'}
                  </option>
                  {BUSINESS_SECTOR_OPTIONS.map((option) => {
                    const label =
                      language === 'en'
                        ? option.en || option.vi
                        : language === 'ja'
                        ? option.ja || option.vi
                        : option.vi;
                    const value = option.key || option.vi;
                    return (
                      <option key={`sector-${value}`} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 5. Loại công việc – chọn bằng popup, hỗ trợ chọn loại cha/con */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  {t.jobTypeLabel || 'Loại công việc'} <span style={{ color: '#ef4444' }}>*</span>
                  <span className="text-gray-500 font-normal ml-1">({t.pleaseSelect || 'Chọn 1 option'})</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setSelectedJobTypeParentId(null); setShowJobTypeModal(true); }}
                  className="w-full px-3 py-2 border rounded-lg text-xs flex items-center justify-between"
                  style={{
                    borderColor: errors.categoryId ? '#ef4444' : '#d1d5db',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <span className="truncate text-left" style={{ color: formData.categoryId ? '#111827' : '#9ca3af' }}>
                    {(() => {
                      const selected = categories.find(c => String(c.id) === String(formData.categoryId));
                      if (selected) return pickByLanguage(selected, 'name');
                      return t.jobCategorySelectPlaceholder || t.pleaseSelect || 'Chọn loại công việc';
                    })()}
                  </span>
                  <span className="ml-2 text-gray-400 text-xs">
                    ▼
                  </span>
                </button>
                {errors.categoryId && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.categoryId}</p>}
              </div>

              {/* 6. Hình thức tuyển dụng + Tư cách lưu trú */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {t.jobRecruitmentTypeLabel || 'Hình thức tuyển dụng'} <span className="text-gray-500 font-normal">({t.jobRecruitmentTypePlaceholder || 'Chọn option nhân viên chính thức/hợp đồng...'})</span>
                  </label>
                  <select
                    name="recruitmentType"
                    value={formData.recruitmentType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">{t.jobRecruitmentTypePlaceholder || 'Chọn'}</option>
                    <option value="1">{t.jobRecruitmentTypeOption1 || 'Nhân viên chính thức'}</option>
                    <option value="2">{t.jobRecruitmentTypeOption2 || 'Nhân viên hợp đồng có thời hạn'}</option>
                    <option value="3">{t.jobRecruitmentTypeOption3 || 'Nhân viên phái cử'}</option>
                    <option value="4">{t.jobRecruitmentTypeOption4 || 'Nhân viên bán thời gian'}</option>
                    <option value="5">{t.jobRecruitmentTypeOption5 || 'Hợp đồng uỷ thác'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {languageTab === 'jp' ? '在留資格' : languageTab === 'en' ? 'Residence status' : 'Tư cách lưu trú'}
                  </label>
                  <input type="hidden" name="numberOfHires" value={formData.numberOfHires || ''} />
                  <input type="hidden" name="numberOfHiresEn" value={formData.numberOfHiresEn || ''} />
                  <input type="hidden" name="numberOfHiresJp" value={formData.numberOfHiresJp || ''} />
                  <div className="relative" ref={residenceStatusDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsResidenceStatusOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <span className="truncate" style={{ color: '#111827' }}>
                        {Array.isArray(formData.residenceStatuses) && formData.residenceStatuses.length > 0
                          ? formData.residenceStatuses.length === 1
                            ? ((() => {
                                const map = {
                                  engineer: languageTab === 'jp' ? '技術・人文知識・国際業務' : languageTab === 'en' ? 'Engineer / Specialist in Humanities / International Services' : 'Visa kỹ sư / tri thức nhân văn / nghiệp vụ quốc tế',
                                  ssw: languageTab === 'jp' ? '特定技能' : languageTab === 'en' ? 'Specified Skilled Worker' : 'Visa kỹ năng đặc định',
                                  student: languageTab === 'jp' ? '留学' : languageTab === 'en' ? 'Student Visa' : 'Visa du học',
                                  pr: languageTab === 'jp' ? '永住者' : languageTab === 'en' ? 'Permanent Resident' : 'Visa vĩnh trú',
                                  spouse: languageTab === 'jp' ? '日本人の配偶者等' : languageTab === 'en' ? 'Spouse or Child of Japanese National' : 'Visa vợ/chồng người Nhật',
                                  ltr: languageTab === 'jp' ? '定住者' : languageTab === 'en' ? 'Long-term Resident' : 'Visa cư trú dài hạn',
                                  other: languageTab === 'jp' ? 'その他' : languageTab === 'en' ? 'Other' : 'Khác',
                                  hsp: languageTab === 'jp' ? '高度専門職' : languageTab === 'en' ? 'Highly Skilled Professional' : 'Visa lao động trình độ cao',
                                  labor_skill: languageTab === 'jp' ? '技能実習' : languageTab === 'en' ? 'Technical Intern Training' : 'Visa thực tập sinh kỹ năng',
                                  titp: languageTab === 'jp' ? '技能実習' : languageTab === 'en' ? 'Technical Intern Training' : 'Visa thực tập sinh kỹ năng',
                                  dependent: languageTab === 'jp' ? '家族滞在' : languageTab === 'en' ? 'Dependent Visa' : 'Visa gia đình (phụ thuộc)',
                                  short: languageTab === 'jp' ? '短期滞在' : languageTab === 'en' ? 'Short-term Stay' : 'Visa ngắn hạn',
                                  ict: languageTab === 'jp' ? '企業内転勤' : languageTab === 'en' ? 'Intra-company Transferee' : 'Visa chuyển công tác nội bộ',
                                  entertainer: languageTab === 'jp' ? '興行' : languageTab === 'en' ? 'Entertainer / Entertainment' : 'Visa biểu diễn / giải trí',
                                  prspouse: languageTab === 'jp' ? '永住者の配偶者等' : languageTab === 'en' ? 'Spouse or Child of Permanent Resident' : 'Visa vợ/chồng của người vĩnh trú',
                                  no_requirement: languageTab === 'jp' ? '不要' : languageTab === 'en' ? 'No requirement' : 'Không yêu cầu',
                                };
                                return map[formData.residenceStatuses[0]] || formData.residenceStatuses[0];
                              })())
                            : `${formData.residenceStatuses.length} mục đã chọn`
                          : (t.selectLabel || 'Chọn')}
                      </span>
                      <span className="ml-2 text-gray-400">▾</span>
                    </button>
                    {isResidenceStatusOpen && (
                      <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-lg">
                        <div className="max-h-64 overflow-y-auto py-1 text-xs">
                          {[
                            { value: 'student', vi: 'Visa du học', en: 'Student Visa', jp: '留学' },
                            { value: 'engineer', vi: 'Visa kỹ sư / tri thức nhân văn / nghiệp vụ quốc tế', en: 'Engineer / Specialist in Humanities / International Services', jp: '技術・人文知識・国際業務' },
                            { value: 'ssw', vi: 'Visa kỹ năng đặc định', en: 'Specified Skilled Worker', jp: '特定技能' },
                            { value: 'labor_skill', vi: 'Visa kỹ năng (lao động tay nghề)', en: 'Skilled Worker', jp: '技能' },
                            { value: 'hsp', vi: 'Visa lao động trình độ cao', en: 'Highly Skilled Professional', jp: '高度専門職' },
                            { value: 'ict', vi: 'Visa chuyển công tác nội bộ', en: 'Intra-company Transferee', jp: '企業内転勤' },
                            { value: 'entertainer', vi: 'Visa biểu diễn / giải trí', en: 'Entertainer', jp: '興行' },
                            { value: 'titp', vi: 'Visa thực tập sinh kỹ năng', en: 'Technical Intern Training', jp: '技能実習' },
                            { value: 'dependent', vi: 'Visa gia đình (phụ thuộc)', en: 'Dependent Visa', jp: '家族滞在' },
                            { value: 'spouse', vi: 'Visa vợ/chồng người Nhật', en: 'Spouse or Child of Japanese National', jp: '日本人の配偶者等' },
                            { value: 'prspouse', vi: 'Visa vợ/chồng của người vĩnh trú', en: 'Spouse or Child of Permanent Resident', jp: '永住者の配偶者等' },
                            { value: 'ltr', vi: 'Visa cư trú dài hạn', en: 'Long-term Resident', jp: '定住者' },
                            { value: 'pr', vi: 'Visa vĩnh trú', en: 'Permanent Resident', jp: '永住者' },
                            { value: 'short', vi: 'Visa ngắn hạn', en: 'Temporary Visitor', jp: '短期滞在' },
                            { value: 'no_requirement', vi: 'Không yêu cầu', en: 'No requirement', jp: '不要' }
                          ].map((opt, index) => {
                            const selected = Array.isArray(formData.residenceStatuses) && formData.residenceStatuses.includes(opt.value);
                            const label = languageTab === 'jp' ? opt.jp : languageTab === 'en' ? opt.en : opt.vi;
                            const displayIndex = index + 1;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => {
                                    const current = Array.isArray(prev.residenceStatuses) ? prev.residenceStatuses : [];
                                    const next = current.includes(opt.value)
                                      ? current.filter((v) => v !== opt.value)
                                      : [...current, opt.value];
                                    return {
                                      ...prev,
                                      residenceStatuses: next,
                                      residenceStatus: JSON.stringify(next),
                                      residenceStatusEn: JSON.stringify(next),
                                      residenceStatusJp: JSON.stringify(next),
                                    };
                                  });
                                  setIsResidenceStatusOpen(false);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  readOnly
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                />
                                <span>{`${displayIndex}. ${label}`}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {Array.isArray(formData.residenceStatuses) && formData.residenceStatuses.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      {formData.residenceStatuses.map((value) => {
                        const labelMap = {
                          engineer: languageTab === 'jp' ? '技術・人文知識・国際業務' : languageTab === 'en' ? 'Engineer/Specialist in Humanities/International Services' : 'Visa kỹ sư / tri thức nhân văn / nghiệp vụ quốc tế',
                          ssw: languageTab === 'jp' ? '特定技能' : languageTab === 'en' ? 'Specified Skilled Worker' : 'Visa kỹ năng đặc định',
                          student: languageTab === 'jp' ? '留学' : languageTab === 'en' ? 'Student' : 'Visa du học',
                          pr: languageTab === 'jp' ? '永住者' : languageTab === 'en' ? 'Permanent resident' : 'Vĩnh trú',
                          spouse: languageTab === 'jp' ? '日本人の配偶者等' : languageTab === 'en' ? 'Spouse of Japanese national' : 'Vợ/chồng người Nhật',
                          ltr: languageTab === 'jp' ? '定住者' : languageTab === 'en' ? 'Long-term Resident' : 'Visa định trú',
                          other: languageTab === 'jp' ? 'その他' : languageTab === 'en' ? 'Other' : 'Khác',
                          hsp: languageTab === 'jp' ? '高度専門職' : languageTab === 'en' ? 'Highly Skilled Professional' : 'Visa chuyên gia trình độ cao',
                          labor_skill: languageTab === 'jp' ? '技能実習' : languageTab === 'en' ? 'Technical Intern Training' : 'Visa lao động kỹ năng',
                          titp: languageTab === 'jp' ? '技能実習' : languageTab === 'en' ? 'Technical Intern Training' : 'Thực tập sinh kỹ năng',
                          dependent: languageTab === 'jp' ? '家族滞在' : languageTab === 'en' ? 'Dependent' : 'Visa phụ thuộc gia đình',
                          short: languageTab === 'jp' ? '短期滞在' : languageTab === 'en' ? 'Short-term stay' : 'Visa ngắn hạn',
                          ict: languageTab === 'jp' ? '企業内転勤' : languageTab === 'en' ? 'Intra-company Transferee' : 'Chuyển công tác nội bộ',
                          entertainer: languageTab === 'jp' ? '興行' : languageTab === 'en' ? 'Entertainer / Entertainment' : 'Biểu diễn / giải trí',
                          prspouse: languageTab === 'jp' ? '永住者の配偶者等' : languageTab === 'en' ? 'Spouse of Permanent Resident' : 'Vợ/chồng thường trú nhân',
                          no_requirement: languageTab === 'jp' ? '不要' : languageTab === 'en' ? 'No requirement' : 'Không yêu cầu',
                        };
                        return (
                          <span key={value} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                            <span>{labelMap[value] || value}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => {
                                  const current = Array.isArray(prev.residenceStatuses) ? prev.residenceStatuses : [];
                                  const next = current.filter((v) => v !== value);
                                  return {
                                    ...prev,
                                    residenceStatuses: next,
                                    residenceStatus: JSON.stringify(next),
                                    residenceStatusEn: JSON.stringify(next),
                                    residenceStatusJp: JSON.stringify(next),
                                  };
                                });
                                setIsResidenceStatusOpen(false);
                              }}
                              className="font-bold text-blue-500"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 7. Số lượng tuyển dụng — dropdown, lưu vào workingLocations[0].numberOfHires */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  {t.numberOfRecruitsLabel || 'Số lượng tuyển dụng'}
                </label>
                <select
                  value={formData.numberOfHires || getWorkingLocationsNumberOfHires(workingLocations)}
                  onChange={(e) => {
                    const v = normalizeNumberOfHiresStored(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      numberOfHires: v,
                      numberOfHiresEn: v,
                      numberOfHiresJp: v,
                    }));
                    setWorkingLocations((prev) => {
                      const next = Array.isArray(prev) && prev.length > 0 ? prev.map((wl) => ({ ...wl, numberOfHires: v })) : [{ location: '', country: '', numberOfHires: v }];
                      return next;
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">{t.addJobSelect || 'Chọn'}</option>
                  {(() => {
                    const cur = getWorkingLocationsNumberOfHires(workingLocations);
                    const extra =
                      cur && !NUMBER_OF_HIRES_OPTION_VALUES.includes(cur)
                        ? [{ value: cur, label: cur }]
                        : [];
                    const standard = NUMBER_OF_HIRES_OPTION_VALUES.map((v) => ({
                      value: v,
                      label: getNumberOfHiresDisplayLabel(v, languageTab),
                    }));
                    return [...standard, ...extra].map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              {/* 8. Điểm nổi bật (Chọn option như file JD template) */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  {t.jobHighlightsLabel || 'Điểm nổi bật của công việc'} <span className="text-gray-500 font-normal">({t.jobHighlightsHint || 'Chọn option...'})</span>
                </label>
                <div className="flex flex-wrap gap-1">
                  {JOB_HIGHLIGHT_OPTIONS.map((opt) => {
                    const label = getHighlightLabel(opt.key);
                    const selected = highlightKeys.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() =>
                          syncHighlightsToForm((prev) =>
                            prev.includes(opt.key)
                              ? prev.filter((k) => k !== opt.key)
                              : [...prev, opt.key]
                          )
                        }
                        className="px-2 py-1 rounded-full text-[11px] border transition-colors"
                        style={{
                          backgroundColor: selected ? '#2563eb' : '#f3f4f6',
                          color: selected ? '#ffffff' : '#374151',
                          borderColor: selected ? '#2563eb' : '#e5e7eb',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slug (kỹ thuật, ẩn gọn) */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  {t.slugLabel || 'Slug'} <span style={{ color: '#ef4444' }}>*</span>
                  <span className="text-[10px] ml-2" style={{ color: '#6b7280' }}>
                    {t.slugAutoFromTitleHint || '(Tự động tạo từ tiêu đề)'}
                  </span>
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="VD: software-engineer-react-nodejs-developer"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{
                    borderColor: errors.slug ? '#ef4444' : '#d1d5db',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.slug ? '#ef4444' : '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.slug && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.slug}</p>}
              </div>
            </div>
          </div>

          {/* Chi tiết tuyển dụng — gộp chung mục 9–28 */}
          <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 pb-2.5 border-b border-gray-100" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Users className="w-4 h-4 text-blue-600" />
              Chi tiết tuyển dụng
            </h2>
            <div className="space-y-4">
          {/* 9. Mô tả công việc */}
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              {t.jobDescriptionLabel || 'Mô tả công việc'} <span className="text-gray-500 font-normal">(Điền text)</span>
            </label>
            {languageTab === 'vi' && (
              <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Mô tả chi tiết về công việc..." rows="4" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />
            )}
            {languageTab === 'en' && (
              <textarea name="descriptionEn" value={formData.descriptionEn} onChange={handleInputChange} placeholder="Job description in English" rows="4" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />
            )}
            {languageTab === 'jp' && (
              <textarea name="descriptionJp" value={formData.descriptionJp} onChange={handleInputChange} placeholder="求人票の仕事内容（日本語）" rows="4" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />
            )}
          </div>
          {/* 11. Điều kiện bắt buộc + 12. Điều kiện ưu tiên — cùng state requirements */}
          {/* 11. Điều kiện bắt buộc + 12. Điều kiện ưu tiên — cùng state requirements */}
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-2">
              {t.jobRequiredConditionsLabel || 'Điều kiện ứng tuyển bắt buộc'}
            </label>
            {/* Chọn nhanh điều kiện (bố cục dọc, đồng bộ nhãn với form JD) — chọn option là tự thêm vào danh sách */}
            <div className="mb-3 p-3 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
              <span className="text-[10px] font-medium text-gray-700 block mb-2">Điều kiện có sẵn (chọn để thêm):</span>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-700">Trình độ tiếng Nhật</label>
                  <select
                    value={presetJapanese}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPresetJapanese(val);
                      const isFromPreset = (r) => r.type === 'language' && JAPANESE_LEVEL_OPTIONS.some((o) => r.content === o.vi || r.contentEn === o.en || r.contentJp === o.jp);
                      if (val) {
                        const opt = JAPANESE_LEVEL_OPTIONS.find((o) => o.value === val);
                        if (opt) setRequirements((prev) => [...prev.filter((r) => !isFromPreset(r)), { content: opt.vi, contentEn: opt.en, contentJp: opt.jp, type: 'language', status: 'required' }]);
                      } else setRequirements((prev) => prev.filter((r) => !isFromPreset(r)));
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">— Chọn —</option>
                    {JAPANESE_LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{languageTab === 'vi' ? opt.vi : languageTab === 'en' ? opt.en : opt.jp}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-700">Số năm kinh nghiệm theo vị trí</label>
                  <select
                    value={presetExperience}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPresetExperience(val);
                      const isFromPreset = (r) => r.type === 'experience' && EXPERIENCE_YEARS_OPTIONS.some((o) => r.content === o.vi || r.contentEn === o.en || r.contentJp === o.jp);
                      if (val) {
                        const opt = EXPERIENCE_YEARS_OPTIONS.find((o) => o.value === val);
                        if (opt) setRequirements((prev) => [...prev.filter((r) => !isFromPreset(r)), { content: opt.vi, contentEn: opt.en, contentJp: opt.jp, type: 'experience', status: 'required' }]);
                      } else setRequirements((prev) => prev.filter((r) => !isFromPreset(r)));
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">— Chọn —</option>
                    {EXPERIENCE_YEARS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{languageTab === 'vi' ? opt.vi : languageTab === 'en' ? opt.en : opt.jp}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-700">Bằng lái xe</label>
                  <select
                    value={presetDriver}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPresetDriver(val);
                      const isFromPreset = (r) => r.type === 'certification' && DRIVER_LICENSE_OPTIONS.some((o) => r.content === o.vi || r.contentEn === o.en || r.contentJp === o.jp);
                      if (val) {
                        const opt = DRIVER_LICENSE_OPTIONS.find((o) => o.value === val);
                        if (opt) setRequirements((prev) => [...prev.filter((r) => !isFromPreset(r)), { content: opt.vi, contentEn: opt.en, contentJp: opt.jp, type: 'certification', status: 'required' }]);
                      } else setRequirements((prev) => prev.filter((r) => !isFromPreset(r)));
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">— Chọn —</option>
                    {DRIVER_LICENSE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{languageTab === 'vi' ? opt.vi : languageTab === 'en' ? opt.en : opt.jp}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-500">Loại: technique, experience, language, certification</span>
              <button
                type="button"
                onClick={() => setRequirements([
                  ...requirements,
                  { content: '', contentEn: '', contentJp: '', type: 'technique', status: 'required' }
                ])}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {t.jobRequirementAdd || 'Thêm yêu cầu'}
              </button>
            </div>
            <div className="space-y-2 mb-3">
              {requirements.filter(r => r.type === 'technique' || r.type === 'experience' || r.type === 'language' || r.type === 'certification' || !r.type).map((req) => {
                const index = requirements.indexOf(req);
                return (
                  <div key={index} className="p-2 border border-gray-200 rounded-lg space-y-2">
                    <div className="space-y-1">
                      {languageTab === 'vi' && <textarea placeholder={t.jobRequirementContentPlaceholder || 'Nội dung yêu cầu...'} value={req.content} onChange={(e) => { const newReqs = [...requirements]; newReqs[index].content = e.target.value; setRequirements(newReqs); }} rows="2" className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />}
                      {languageTab === 'en' && <textarea placeholder="Requirement in English" value={req.contentEn || ''} onChange={(e) => { const newReqs = [...requirements]; newReqs[index].contentEn = e.target.value; setRequirements(newReqs); }} rows="2" className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />}
                      {languageTab === 'jp' && <textarea placeholder="応募条件（日本語）" value={req.contentJp || ''} onChange={(e) => { const newReqs = [...requirements]; newReqs[index].contentJp = e.target.value; setRequirements(newReqs); }} rows="2" className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />}
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <select value={req.type || ''} onChange={(e) => { const newReqs = [...requirements]; newReqs[index].type = e.target.value; setRequirements(newReqs); }} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600">
                        <option value="">{t.jobRequirementTypePlaceholder || 'Chọn loại'}</option>
                        <option value="technique">{t.jobRequirementTypeTechnique || 'Kỹ thuật'}</option>
                        <option value="experience">{t.jobRequirementTypeExperience || 'Kinh nghiệm'}</option>
                        <option value="language">{t.jobRequirementTypeLanguage || 'Ngôn ngữ'}</option>
                        <option value="certification">{t.jobRequirementTypeCertification || 'Chứng chỉ'}</option>
                      </select>
                      <select value={req.status || ''} onChange={(e) => { const newReqs = [...requirements]; newReqs[index].status = e.target.value; setRequirements(newReqs); }} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600">
                        <option value="">{t.jobRequirementStatusPlaceholder || 'Trạng thái'}</option>
                        <option value="required">{t.jobRequirementStatusRequired || 'Bắt buộc'}</option>
                        <option value="optional">{t.jobRequirementStatusOptional || 'Tùy chọn'}</option>
                      </select>
                      <button type="button" onClick={() => setRequirements(requirements.filter((_, i) => i !== index))} className="p-1.5 text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <label className="block text-xs font-semibold text-gray-900 mb-2 mt-3">
              {t.jobPreferredConditionsLabel || 'Điều kiện ưu tiên'}
            </label>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500">Loại: education / skill / other</span>
              <button type="button" onClick={() => setRequirements([...requirements, { content: '', contentEn: '', contentJp: '', type: 'education', status: 'preferred' }])} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-3 h-3" /> {t.jobRequirementAdd || 'Thêm điều kiện ưu tiên'}
              </button>
            </div>
            {requirements.filter(r => r.type === 'education' || r.type === 'skill' || r.type === 'other').map((req) => {
              const index = requirements.indexOf(req);
              return (
                <div key={`pref-${index}`} className="mb-2 p-2 border border-gray-200 rounded-lg space-y-2">
                  <div className="space-y-1">
                    {languageTab === 'vi' && <textarea placeholder={t.jobRequirementContentPlaceholder || 'Nội dung...'} value={req.content} onChange={(e) => { const newReqs = [...requirements]; newReqs[index].content = e.target.value; setRequirements(newReqs); }} rows="2" className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />}
                    {languageTab === 'en' && <textarea placeholder="Preferred in English" value={req.contentEn || ''} onChange={(e) => { const newReqs = [...requirements]; newReqs[index].contentEn = e.target.value; setRequirements(newReqs); }} rows="2" className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />}
                    {languageTab === 'jp' && <textarea placeholder="歓迎条件（日本語）" value={req.contentJp || ''} onChange={(e) => { const newReqs = [...requirements]; newReqs[index].contentJp = e.target.value; setRequirements(newReqs); }} rows="2" className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />}
                  </div>
                  <div className="flex gap-2 items-center">
                    <select value={req.type || ''} onChange={(e) => { const newReqs = [...requirements]; newReqs[index].type = e.target.value; setRequirements(newReqs); }} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600">
                      <option value="education">{t.jobRequirementTypeEducation || 'Học vấn'}</option>
                      <option value="skill">{t.jobRequirementTypeSkill || 'Kỹ năng'}</option>
                      <option value="other">{t.jobRequirementTypeOther || 'Khác'}</option>
                    </select>
                    <button type="button" onClick={() => setRequirements(requirements.filter((_, i) => i !== index))} className="p-1.5 text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Salary & Commission (13–17) */}
          <div className="rounded-lg p-3 border border-gray-200 bg-gray-50/50">
            <h3 className="text-xs font-bold mb-3 flex items-center gap-2 pb-2 border-b border-gray-200">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              {t.jobSectionSalaryCommission || 'Lương'}
            </h3>
            <div className="space-y-3">
              {/* Salary Ranges */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-900">
                    {t.jobSalaryLabel || 'Mức lương'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setSalaryRanges([...salaryRanges, { salaryRange: '', salaryRangeEn: '', salaryRangeJp: '', type: '' }])}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {t.jobSalaryAdd || 'Thêm mức lương'}
                  </button>
                </div>
                {salaryRanges.map((sr, index) => (
                  <div key={index} className="mb-2 p-2 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder={t.jobSalaryPlaceholder || 'Mức lương (VD: 500-700万円)'}
                        value={languageTab === 'vi' ? (sr.salaryRange || '') : languageTab === 'en' ? (sr.salaryRangeEn || '') : (sr.salaryRangeJp || '')}
                        onChange={(e) => {
                          const newRanges = [...salaryRanges];
                          if (languageTab === 'vi') newRanges[index].salaryRange = e.target.value;
                          else if (languageTab === 'en') newRanges[index].salaryRangeEn = e.target.value;
                          else newRanges[index].salaryRangeJp = e.target.value;
                          setSalaryRanges(newRanges);
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <div className="flex gap-1">
                        <select
                          value={sr.type || ''}
                          onChange={(e) => {
                            const newRanges = [...salaryRanges];
                            newRanges[index].type = e.target.value;
                            setSalaryRanges(newRanges);
                          }}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="">{t.jobSalaryTypePlaceholder || 'Chọn loại'}</option>
                          <option value="yearly">{t.salaryTypeYearly || 'Thu nhập năm'}</option>
                          <option value="monthly">{t.salaryTypeMonthly || 'Lương tháng'}</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setSalaryRanges(salaryRanges.filter((_, i) => i !== index))}
                          className="p-1.5 text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Salary Range Details */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-900">
                    {t.jobSalaryDetailLabel || 'Chi tiết mức lương'}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setSalaryRangeDetails([
                        ...salaryRangeDetails,
                        { content: '', contentEn: '', contentJp: '' }
                      ])
                    }
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {t.jobSalaryDetailAdd || 'Thêm chi tiết'}
                  </button>
                </div>
                {salaryRangeDetails.map((srd, index) => (
                  <div key={index} className="mb-3 space-y-1">
                    <div className="flex gap-2">
                      {languageTab === 'vi' && (
                        <textarea
                          placeholder={t.jobSalaryDetailPlaceholder || 'Chi tiết mức lương...'}
                          value={srd.content}
                          onChange={(e) => {
                            const newDetails = [...salaryRangeDetails];
                            newDetails[index].content = e.target.value;
                            setSalaryRangeDetails(newDetails);
                          }}
                          rows="2"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        />
                      )}
                      {languageTab === 'en' && (
                        <textarea
                          placeholder="Salary details in English"
                          value={srd.contentEn || ''}
                          onChange={(e) => {
                            const newDetails = [...salaryRangeDetails];
                            newDetails[index].contentEn = e.target.value;
                            setSalaryRangeDetails(newDetails);
                          }}
                          rows="2"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        />
                      )}
                      {languageTab === 'jp' && (
                        <textarea
                          placeholder="給与詳細（日本語）"
                          value={srd.contentJp || ''}
                          onChange={(e) => {
                            const newDetails = [...salaryRangeDetails];
                            newDetails[index].contentJp = e.target.value;
                            setSalaryRangeDetails(newDetails);
                          }}
                          rows="2"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setSalaryRangeDetails(
                            salaryRangeDetails.filter((_, i) => i !== index)
                          )
                        }
                        className="p-1.5 text-red-500 hover:text-red-700 self-start"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    {t.jobBonusLabel || 'Thưởng'}
                  </label>
                  {languageTab === 'vi' && (
                    <input
                      type="text"
                      name="bonus"
                      value={formData.bonus}
                      onChange={handleInputChange}
                      placeholder="VD: 2 lần/năm, tối đa 198万円"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  )}
                  {languageTab === 'en' && (
                    <input
                      type="text"
                      name="bonusEn"
                      value={formData.bonusEn}
                      onChange={handleInputChange}
                      placeholder="Bonus details in English"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  )}
                  {languageTab === 'jp' && (
                    <input
                      type="text"
                      name="bonusJp"
                      value={formData.bonusJp}
                      onChange={handleInputChange}
                      placeholder="賞与の詳細（日本語）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    {t.jobSalaryReviewLabel || 'Đánh giá lương'}
                  </label>
                  {languageTab === 'vi' && (
                    <input
                      type="text"
                      name="salaryReview"
                      value={formData.salaryReview}
                      onChange={handleInputChange}
                      placeholder="VD: Hàng năm"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  )}
                  {languageTab === 'en' && (
                    <input
                      type="text"
                      name="salaryReviewEn"
                      value={formData.salaryReviewEn}
                      onChange={handleInputChange}
                      placeholder="Salary review details in English"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  )}
                  {languageTab === 'jp' && (
                    <input
                      type="text"
                      name="salaryReviewJp"
                      value={formData.salaryReviewJp}
                      onChange={handleInputChange}
                      placeholder="昇給に関する詳細（日本語）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  )}
                </div>
              </div>

              {/* Commission Type */}

            </div>
          </div>

          {/* Location (19–20) */}
          <div className="rounded-lg p-3 border border-gray-200 bg-gray-50/50">
            <h3 className="text-xs font-bold mb-3 flex items-center gap-2 pb-2 border-b border-gray-200">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              {t.jobSectionLocation || t.workLocation || 'Địa điểm làm việc'}
            </h3>
             <div className="space-y-3">
              {/* Quick Select: Country and Provinces */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  {t.quickSelectWorkLocation || 'Chọn nhanh địa điểm làm việc'}
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t.selectCountryLabel || 'Chọn quốc gia'}
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        setShowLocationModal(false);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">{t.selectCountryPlaceholder || '-- Chọn quốc gia --'}</option>
                      <option value="Vietnam">{language === 'ja' ? 'ベトナム' : language === 'en' ? 'Vietnam' : 'Việt Nam'}</option>
                      <option value="Japan">{language === 'ja' ? '日本' : language === 'en' ? 'Japan' : 'Nhật Bản'}</option>
                      <option value="Other">{t.countryOtherOption || 'Khác (Nhập tùy chỉnh)'}</option>
                    </select>
                  </div>

                  {(selectedCountry === 'Vietnam' || selectedCountry === 'Japan') && (
                    <button
                      type="button"
                      onClick={() => setShowLocationModal(true)}
                      className="w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedCountry === 'Vietnam'
                        ? (t.selectProvincesLabel || 'Chọn tỉnh/thành phố')
                        : (languageTab === 'jp' ? '地域・都道府県・市区町村を選択' : languageTab === 'en' ? 'Select region, prefecture, city/ward' : 'Chọn vùng, tỉnh/thành, quận/huyện')}
                    </button>
                  )}
                  
                  {selectedCountry === 'Other' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {t.customLocationLabel || 'Nhập địa điểm tùy chỉnh'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setWorkingLocations([...workingLocations, { location: '', country: '' }])}
                        className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t.customLocationAddButton || 'Thêm địa điểm tùy chỉnh'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Popup chọn địa điểm (Việt Nam / Nhật Bản) */}
              {showLocationModal && (selectedCountry === 'Vietnam' || selectedCountry === 'Japan') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowLocationModal(false)}>
                  <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-3 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {selectedCountry === 'Vietnam'
                          ? (t.selectProvincesLabel || 'Chọn tỉnh/thành phố (có thể chọn nhiều)')
                          : (languageTab === 'jp' ? '地域・都道府県・市区町村を選択' : languageTab === 'en' ? 'Select region, prefecture, city/ward' : 'Chọn vùng, tỉnh/thành, quận/huyện')}
                      </h3>
                      <button type="button" onClick={() => setShowLocationModal(false)} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1">
                      {selectedCountry === 'Vietnam' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-600">{t.selectProvincesLabel || 'Chọn tỉnh/thành phố (có thể chọn nhiều)'}</span>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => { const existing = new Set(workingLocations.map((wl) => `${wl.location}_${wl.country}`)); const toAdd = countryProvincesData.Vietnam.filter((p) => !existing.has(`${p}_Vietnam`)).map((province) => ({ location: province, country: 'Vietnam' })); setWorkingLocations((prev) => [...prev, ...toAdd]); }} className="text-[10px] text-blue-600 hover:text-blue-700 font-medium">{t.selectAll || 'Chọn tất cả'}</button>
                              <button type="button" onClick={() => setWorkingLocations((prev) => prev.filter((wl) => wl.country !== 'Vietnam'))} className="text-[10px] text-gray-600 hover:text-gray-700 font-medium">{t.clearAll || 'Bỏ chọn tất cả'}</button>
                            </div>
                          </div>
                          <div className="max-h-[60vh] overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                            <div className="grid grid-cols-2 gap-2">
                              {countryProvincesData.Vietnam.map((province) => {
                                const isSelected = workingLocations.some((wl) => wl.country === 'Vietnam' && wl.location === province);
                                return (
                                  <label key={province} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          if (!workingLocations.some((wl) => wl.location === province && wl.country === 'Vietnam'))
                                            setWorkingLocations((prev) => [...prev, { location: province, country: 'Vietnam' }]);
                                        } else {
                                          setWorkingLocations((prev) => prev.filter((wl) => !(wl.location === province && wl.country === 'Vietnam')));
                                        }
                                      }}
                                      className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                                    />
                                    <span className="text-xs text-gray-700">{province}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedCountry === 'Japan' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-medium text-gray-700">{languageTab === 'jp' ? '地域を選択' : languageTab === 'en' ? 'Select region' : 'Chọn vùng'}</label>
                                <button
                                  type="button"
                                  disabled={bulkJapanAdding}
                                  onClick={() =>
                                    upsertManyJapanWorkingLocations(
                                      JAPAN_REGIONS.map((reg) => createAddJobJapanRegionEntry(reg, languageTab)),
                                      true
                                    )
                                  }
                                  className="text-[10px] text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
                                >
                                  {languageTab === 'jp' ? 'すべて' : languageTab === 'en' ? 'Select all' : 'Chọn tất cả'}
                                </button>
                              </div>
                              <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg p-1.5 bg-white">
                                {JAPAN_REGIONS.map((reg) => {
                                  const regionEntry = createAddJobJapanRegionEntry(reg, languageTab);
                                  const checked = workingLocations.some((wl) => wl.country === 'Japan' && (wl.jpId || `${wl.location}_${wl.country}`) === regionEntry.jpId);
                                  return (
                                    <label key={reg.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-gray-50">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          setSelectedJapanRegion(reg.id);
                                          setSelectedJapanPrefecture(null);
                                          upsertJapanWorkingLocation(regionEntry, e.target.checked);
                                        }}
                                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                                      />
                                      <span
                                        onClick={() => {
                                          setSelectedJapanRegion(reg.id);
                                          setSelectedJapanPrefecture(null);
                                          upsertJapanWorkingLocation(regionEntry, !checked);
                                        }}
                                        className={`flex-1 ${selectedJapanRegion === reg.id ? 'text-blue-800 font-medium' : ''}`}
                                      >
                                        {languageTab === 'jp' ? reg.ja : reg.en}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-medium text-gray-700">{languageTab === 'jp' ? '都道府県を選択' : languageTab === 'en' ? 'Select prefecture' : 'Chọn tỉnh/thành'}</label>
                                <button
                                  type="button"
                                  disabled={!selectedJapanRegion || bulkJapanAdding}
                                  onClick={() => {
                                    const codes = JAPAN_REGIONS.find((r) => r.id === selectedJapanRegion)?.prefectureCodes || [];
                                    upsertManyJapanWorkingLocations(
                                      codes.map((code) => createAddJobJapanPrefectureEntry(code, languageTab)).filter(Boolean),
                                      true
                                    );
                                  }}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
                                >
                                  {languageTab === 'jp' ? 'すべて' : languageTab === 'en' ? 'Select all' : 'Chọn tất cả'}
                                </button>
                              </div>
                              <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg p-1.5 bg-white">
                                {selectedJapanRegion && JAPAN_REGIONS.find((r) => r.id === selectedJapanRegion)?.prefectureCodes.map((code) => {
                                  const pref = JAPAN_PREFECTURES[code];
                                  if (!pref) return null;
                                  const label = languageTab === 'jp' ? pref.ja : pref.en;
                                  const prefEntry = createAddJobJapanPrefectureEntry(code, languageTab);
                                  const checked = !!prefEntry && workingLocations.some((wl) => wl.country === 'Japan' && (wl.jpId || `${wl.location}_${wl.country}`) === prefEntry.jpId);
                                  return (
                                    <label key={code} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-gray-50">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          setSelectedJapanPrefecture(code);
                                          if (prefEntry) upsertJapanWorkingLocation(prefEntry, e.target.checked);
                                        }}
                                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                                      />
                                      <span
                                        onClick={() => {
                                          setSelectedJapanPrefecture(code);
                                          if (prefEntry) upsertJapanWorkingLocation(prefEntry, !checked);
                                        }}
                                        className={`flex-1 ${selectedJapanPrefecture === code ? 'text-blue-800 font-medium' : ''}`}
                                      >
                                        {label}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-medium text-gray-700">{languageTab === 'jp' ? '市区郡を選択' : languageTab === 'en' ? 'Select city/ward' : 'Chọn quận/huyện'}</label>
                                <button
                                  type="button"
                                  disabled={!selectedJapanPrefecture || japanCitiesLoading || bulkJapanAdding}
                                  onClick={() => {
                                    const prefCode = selectedJapanPrefecture;
                                    const entries = (japanLocationData.tree || []).flatMap((city) => {
                                      if (city.standalone) return [createAddJobJapanWardEntry(prefCode, city.name, city.nameKana, languageTab)];
                                      return (city.wards || []).map((w) => createAddJobJapanWardEntry(prefCode, w.fullName, w.fullNameKana, languageTab));
                                    });
                                    upsertManyJapanWorkingLocations(entries, true);
                                  }}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
                                >
                                  {languageTab === 'jp' ? 'すべて' : languageTab === 'en' ? 'Select all' : 'Chọn tất cả'}
                                </button>
                              </div>
                              <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg p-1.5 bg-white">
                                {japanCitiesLoading ? <div className="text-xs text-gray-500 p-2">Loading...</div> : (() => {
                                  const { tree } = japanLocationData;
                                  const selectedJapanIds = new Set(
                                    workingLocations
                                      .filter((wl) => wl.country === 'Japan')
                                      .map((wl) => wl.jpId || `${wl.location}_${wl.country}`)
                                  );
                                  const toRomaji = (kana, fallback) => (kana ? kanaToRomaji(kana) : fallback);

                                  const makeLocObj = (nameJa, nameKana) => createAddJobJapanWardEntry(selectedJapanPrefecture, nameJa, nameKana, languageTab);

                                  const allLocs = tree.flatMap((c) => {
                                    if (c.standalone) return [makeLocObj(c.name, c.nameKana)];
                                    return (c.wards || []).map((w) => makeLocObj(w.fullName, w.fullNameKana));
                                  });

                                  const allSelected = allLocs.length > 0 && allLocs.every((loc) => selectedJapanIds.has(loc.id));
                                  const toggleAll = (checked) => {
                                    const existingJapanIds = new Set(
                                      workingLocations
                                        .filter((wl) => wl.country === 'Japan')
                                        .map((wl) => wl.jpId || `${wl.location}_${wl.country}`)
                                    );
                                    if (checked) {
                                      const toAdd = allLocs
                                        .filter((loc) => !existingJapanIds.has(loc.jpId));
                                      setWorkingLocations((prev) => [...prev, ...toAdd]);
                                    } else {
                                      const removeIds = new Set(allLocs.map((l) => l.jpId));
                                      setWorkingLocations((prev) =>
                                        prev.filter((wl) => wl.country !== 'Japan' || !removeIds.has(wl.jpId || `${wl.location}_${wl.country}`))
                                      );
                                    }
                                  };
                                  const toggleCity = (city, checked) => {
                                    const cityLocs = city.standalone
                                      ? [makeLocObj(city.name, city.nameKana)]
                                      : (city.wards || []).map((w) => makeLocObj(w.fullName, w.fullNameKana));
                                    if (checked) {
                                      const existingJapanIds = new Set(
                                        workingLocations
                                          .filter((wl) => wl.country === 'Japan')
                                          .map((wl) => wl.jpId || `${wl.location}_${wl.country}`)
                                      );
                                      const toAdd = cityLocs
                                        .filter((loc) => !existingJapanIds.has(loc.jpId));
                                      setWorkingLocations((prev) => [...prev, ...toAdd]);
                                    } else {
                                      const removeIds = new Set(cityLocs.map((l) => l.jpId));
                                      setWorkingLocations((prev) =>
                                        prev.filter((wl) => wl.country !== 'Japan' || !removeIds.has(wl.jpId || `${wl.location}_${wl.country}`))
                                      );
                                    }
                                  };
                                  const toggleWard = (fullName, fullNameKana, checked) => {
                                    const loc = makeLocObj(fullName, fullNameKana);
                                    if (checked) {
                                      if (!workingLocations.some((wl) => wl.country === 'Japan' && (wl.jpId || `${wl.location}_${wl.country}`) === loc.jpId))
                                        setWorkingLocations((prev) => [...prev, loc]);
                                    } else {
                                      setWorkingLocations((prev) =>
                                        prev.filter((wl) => !(wl.country === 'Japan' && (wl.jpId || `${wl.location}_${wl.country}`) === loc.jpId))
                                      );
                                    }
                                  };
                                  const isCitySelected = (city) => {
                                    const locs = city.standalone
                                      ? [makeLocObj(city.name, city.nameKana)]
                                      : (city.wards || []).map((w) => makeLocObj(w.fullName, w.fullNameKana));
                                    return locs.length > 0 && locs.every((l) => selectedJapanIds.has(l.jpId));
                                  };
                                  return (
                                    <>
                                      {selectedJapanPrefecture && allLocs.length > 0 && (
                                        <label className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                          <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-600" />
                                          <span className="text-xs font-medium">{languageTab === 'jp' ? 'すべて' : languageTab === 'en' ? 'All' : 'Tất cả'}</span>
                                        </label>
                                      )}
                                      {tree.map((city) => (
                                        <div key={city.name}>
                                          <label className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                            <input type="checkbox" checked={isCitySelected(city)} onChange={(e) => toggleCity(city, e.target.checked)} className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-600" />
                                            <span className="text-xs font-medium text-gray-800">
                                              {languageTab === 'jp' ? city.name : toRomaji(city.nameKana, city.name)}
                                            </span>
                                          </label>
                                          {city.wards && city.wards.length > 0 && (
                                            <div className="ml-4 pl-1 border-l border-gray-200">
                                              {city.wards.map((w) => {
                                                const loc = makeLocObj(w.fullName, w.fullNameKana);
                                                const isWardSelected = selectedJapanIds.has(loc.jpId);
                                                return (
                                                  <label key={w.fullName} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                                    <input type="checkbox" checked={!!isWardSelected} onChange={(e) => toggleWard(w.fullName, w.fullNameKana, e.target.checked)} className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-600" />
                                                    <span className="text-xs text-gray-700">
                                                      {languageTab === 'jp' ? w.fullName : toRomaji(w.fullNameKana, w.fullName)}
                                                    </span>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-gray-200">
                      <button type="button" onClick={() => setShowLocationModal(false)} className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300">
                        {languageTab === 'jp' ? '閉じる' : languageTab === 'en' ? 'Close' : 'Đóng'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Working Locations List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-900">
                    {(t.selectedLocationsLabel || 'Danh sách địa điểm đã chọn ({count})')
                      .replace('{count}', workingLocations.length)}
                  </label>
                </div>
                {workingLocations.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {workingLocations.map((wl, index) => {
                      const isEmpty = !wl.location || !wl.country;
                      return (
                        <div key={index} className={`flex items-center gap-2 p-2 border rounded-lg ${isEmpty ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
                          {isEmpty ? (
                            // Show input fields for empty locations (custom locations)
                            <div className="flex gap-1 flex-1">
                        <input
                                type="text"
                          placeholder={t.locationPlaceholder || 'Địa điểm'}
                                value={wl.location || ''}
                                onChange={(e) => {
                                  const newLocs = [...workingLocations];
                                  newLocs[index].location = e.target.value;
                                  setWorkingLocations(newLocs);
                                }}
                                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                              />
                        <input
                                type="text"
                          placeholder={t.countryPlaceholder || 'Quốc gia'}
                                value={wl.country || ''}
                                onChange={(e) => {
                                  const newLocs = [...workingLocations];
                                  newLocs[index].country = e.target.value;
                                  setWorkingLocations(newLocs);
                                }}
                                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                              />
                            </div>
                          ) : (
                            // Show read-only display for completed locations
                            <div className="flex-1">
                              <div className="text-xs font-medium text-gray-900">
                                {wl.country === 'Japan' && languageTab === 'jp' ? (wl.locationJp || wl.location) : wl.location}
                              </div>
                              <div className="text-[10px] text-gray-500">{wl.country}</div>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setWorkingLocations(workingLocations.filter((_, i) => i !== index))}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            title="Xóa"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-500 text-center py-4 border border-dashed border-gray-300 rounded-lg">
                    {t.noLocationsSelectedMessage ||
                      'Chưa có địa điểm nào. Chọn quốc gia và tỉnh/thành phố ở trên hoặc thêm địa điểm tùy chỉnh.'}
                  </p>
                )}
              </div>
              
              {/* Working Location Details */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-900">
                    {t.jobLocationDetailsLabel || 'Chi tiết địa điểm làm việc'}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setWorkingLocationDetails([
                        ...workingLocationDetails,
                        { content: '', contentEn: '', contentJp: '' }
                      ])
                    }
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {t.jobLocationDetailsAdd || 'Thêm chi tiết'}
                  </button>
                </div>
                {workingLocationDetails.map((wld, index) => (
                  <div key={index} className="mb-3 space-y-1">
                    <div className="flex gap-2">
                      {languageTab === 'vi' && (
                        <textarea
                          placeholder={t.jobLocationDetailsPlaceholder || 'Chi tiết địa điểm làm việc...'}
                          value={wld.content}
                          onChange={(e) => {
                            const newDetails = [...workingLocationDetails];
                            newDetails[index].content = e.target.value;
                            setWorkingLocationDetails(newDetails);
                          }}
                          rows="2"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        />
                      )}
                      {languageTab === 'en' && (
                        <textarea
                          placeholder="Work location details in English"
                          value={wld.contentEn || ''}
                          onChange={(e) => {
                            const newDetails = [...workingLocationDetails];
                            newDetails[index].contentEn = e.target.value;
                            setWorkingLocationDetails(newDetails);
                          }}
                          rows="2"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        />
                      )}
                      {languageTab === 'jp' && (
                        <textarea
                          placeholder="勤務地の詳細（日本語）"
                          value={wld.contentJp || ''}
                          onChange={(e) => {
                            const newDetails = [...workingLocationDetails];
                            newDetails[index].contentJp = e.target.value;
                            setWorkingLocationDetails(newDetails);
                          }}
                          rows="2"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setWorkingLocationDetails(
                            workingLocationDetails.filter((_, i) => i !== index)
                          )
                        }
                        className="p-1.5 text-red-500 hover:text-red-700 self-start"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  {t.interviewLocationLabel || 'Địa điểm tuyển dụng'}
                </label>
                <select
                  name="interviewLocation"
                  value={formData.interviewLocation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">{t.selectLabel || 'Chọn'}</option>
                  {[1, 2, 3, 4].map((v) => (
                    <option key={v} value={String(v)}>
                      {getRecruitmentLocationLabel(v, recruitmentLocationLangFromFormTab(languageTab))}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 18. Khả năng chuyển vùng */}
          <div className="rounded-lg p-3 border border-gray-200 bg-gray-50/50">
            <label className="block text-xs font-bold mb-2">
              {t.transferAbilityLabel || 'Khả năng chuyển vùng'}
            </label>
            <select
              value={(() => {
                const v = String(formData.transferAbility ?? '').trim().toLowerCase();
                const e = String(formData.transferAbilityEn ?? '').trim().toLowerCase();
                const j = String(formData.transferAbilityJp ?? '').trim();
                if (v === 'có thể' || v === 'có' || e === 'yes' || j === '可') return 'yes';
                if (v === 'không thể' || v === 'không' || e === 'no' || j === '不可') return 'no';
                return '';
              })()}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'yes') {
                  setFormData(prev => ({ ...prev, transferAbility: 'Có thể', transferAbilityEn: 'Yes', transferAbilityJp: '可' }));
                } else if (val === 'no') {
                  setFormData(prev => ({ ...prev, transferAbility: 'Không thể', transferAbilityEn: 'No', transferAbilityJp: '不可' }));
                } else {
                  setFormData(prev => ({ ...prev, transferAbility: '', transferAbilityEn: '', transferAbilityJp: '' }));
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">{t.transferAbilityPlaceholder || 'Chọn'}</option>
              <option value="yes">{t.transferAbilityYes || 'Có thể'}</option>
              <option value="no">{t.transferAbilityNo || 'Không thể'}</option>
            </select>
          </div>

          {/* Benefits (24) */}
          <div className="rounded-lg p-3 border border-gray-200 bg-gray-50/50">
            <h3 className="text-xs font-bold mb-3 flex items-center gap-2 pb-2 border-b border-gray-200">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              {t.jobSectionBenefits || 'Phúc lợi'}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Social Insurance */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    {t.jobBenefitsSocialInsuranceLabel || 'Bảo hiểm xã hội'}
                  </label>
                  {languageTab === 'vi' && (
                    <textarea
                      name="socialInsurance"
                      value={formData.socialInsurance}
                      onChange={handleInputChange}
                      placeholder="VD: Có"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y min-h-[60px]"
                    />
                  )}
                  {languageTab === 'en' && (
                    <textarea
                      name="socialInsuranceEn"
                      value={formData.socialInsuranceEn}
                      onChange={handleInputChange}
                      placeholder="Social insurance details in English"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y min-h-[60px]"
                    />
                  )}
                  {languageTab === 'jp' && (
                    <textarea
                      name="socialInsuranceJp"
                      value={formData.socialInsuranceJp}
                      onChange={handleInputChange}
                      placeholder="社会保険に関する詳細（日本語）"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y min-h-[60px]"
                    />
                  )}
                </div>
                {/* Transportation */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    {t.jobBenefitsTransportationLabel || 'Phụ cấp đi lại'}
                  </label>
                  {languageTab === 'vi' && (
                    <textarea
                      name="transportation"
                      value={formData.transportation}
                      onChange={handleInputChange}
                      placeholder="VD: Có, tối đa 15,000円/tháng"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y min-h-[60px]"
                    />
                  )}
                  {languageTab === 'en' && (
                    <textarea
                      name="transportationEn"
                      value={formData.transportationEn}
                      onChange={handleInputChange}
                      placeholder="Transportation allowance details in English"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y min-h-[60px]"
                    />
                  )}
                  {languageTab === 'jp' && (
                    <textarea
                      name="transportationJp"
                      value={formData.transportationJp}
                      onChange={handleInputChange}
                      placeholder="交通費補助の詳細（日本語）"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y min-h-[60px]"
                    />
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-900">
                    {t.jobBenefitsTableLabel || 'Phúc lợi (danh sách)'}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setJobBenefitRows((prev) => [
                        ...prev,
                        { content: '', contentEn: '', contentJp: '' },
                      ])
                    }
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {t.jobBenefitsTableAdd || 'Thêm dòng phúc lợi'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mb-2">
                  {t.jobBenefitsTableHint ||
                    'Mỗi dòng tương ứng một bản ghi trong bảng phúc lợi (đa ngôn ngữ).'}
                </p>
                {jobBenefitRows.map((row, index) => (
                  <div key={index} className="mb-2 flex gap-2 items-start">
                    <div className="flex-1">
                      {languageTab === 'vi' && (
                        <textarea
                          placeholder={t.jobBenefitsTablePlaceholderVi || 'Nội dung phúc lợi (VI)...'}
                          value={row.content || ''}
                          onChange={(e) => {
                            const next = [...jobBenefitRows];
                            next[index] = { ...next[index], content: e.target.value };
                            setJobBenefitRows(next);
                          }}
                          rows={2}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y min-h-[48px]"
                        />
                      )}
                      {languageTab === 'en' && (
                        <textarea
                          placeholder={t.jobBenefitsTablePlaceholderEn || 'Benefit line (English)...'}
                          value={row.contentEn || ''}
                          onChange={(e) => {
                            const next = [...jobBenefitRows];
                            next[index] = { ...next[index], contentEn: e.target.value };
                            setJobBenefitRows(next);
                          }}
                          rows={2}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y min-h-[48px]"
                        />
                      )}
                      {languageTab === 'jp' && (
                        <textarea
                          placeholder={t.jobBenefitsTablePlaceholderJp || '福利（日本語）...'}
                          value={row.contentJp || ''}
                          onChange={(e) => {
                            const next = [...jobBenefitRows];
                            next[index] = { ...next[index], contentJp: e.target.value };
                            setJobBenefitRows(next);
                          }}
                          rows={2}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y min-h-[48px]"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setJobBenefitRows(jobBenefitRows.filter((_, i) => i !== index))}
                      className="p-1.5 text-red-500 hover:text-red-700 shrink-0"
                      aria-label="Xóa dòng phúc lợi"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Working Time (21–23, 25–26) */}
          <div className="rounded-lg p-3 border border-gray-200 bg-gray-50/50">
            <h3 className="text-xs font-bold mb-3 flex items-center gap-2 pb-2 border-b border-gray-200">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              {t.jobSectionWorkingTime || 'Thời gian làm việc'}
            </h3>
            <div className="space-y-3">
              {/* Working Hours */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-900">
                    {t.jobWorkingHoursLabel || 'Giờ làm việc'}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setWorkingHours([
                        ...workingHours,
                        { workingHours: '', workingHoursEn: '', workingHoursJp: '' },
                      ])
                    }
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {t.jobWorkingHoursAdd || 'Thêm giờ làm việc'}
                  </button>
                </div>
                {workingHours.map((wh, index) => (
                  <div key={index} className="mb-2 flex gap-2">
                    <input
                      type="text"
                      placeholder={t.jobWorkingHoursPlaceholder || 'Giờ làm việc (VD: 9:00 - 18:00)'}
                      value={
                        languageTab === 'vi'
                          ? wh.workingHours || ''
                          : languageTab === 'en'
                            ? wh.workingHoursEn || ''
                            : wh.workingHoursJp || ''
                      }
                      onChange={(e) => {
                        const newHours = [...workingHours];
                        if (languageTab === 'vi') newHours[index].workingHours = e.target.value;
                        else if (languageTab === 'en') newHours[index].workingHoursEn = e.target.value;
                        else newHours[index].workingHoursJp = e.target.value;
                        setWorkingHours(newHours);
                      }}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setWorkingHours(workingHours.filter((_, i) => i !== index))}
                      className="p-1.5 text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Working Hour Details */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-900">
                    {t.jobWorkingHourDetailsLabel || 'Chi tiết giờ làm việc'}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setWorkingHourDetails([
                        ...workingHourDetails,
                        { content: '', contentEn: '', contentJp: '' }
                      ])
                    }
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {t.jobWorkingHourDetailsAdd || 'Thêm chi tiết'}
                  </button>
                </div>
                {workingHourDetails.map((whd, index) => (
                  <div key={index} className="mb-3 space-y-1">
                    <div className="flex gap-2">
                      {languageTab === 'vi' && (
                        <textarea
                          placeholder={t.jobWorkingHourDetailsPlaceholder || 'Chi tiết giờ làm việc...'}
                          value={whd.content}
                          onChange={(e) => {
                            const newDetails = [...workingHourDetails];
                            newDetails[index].content = e.target.value;
                            setWorkingHourDetails(newDetails);
                          }}
                          rows="2"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        />
                      )}
                      {languageTab === 'en' && (
                        <textarea
                          placeholder="Working hour details in English"
                          value={whd.contentEn || ''}
                          onChange={(e) => {
                            const newDetails = [...workingHourDetails];
                            newDetails[index].contentEn = e.target.value;
                            setWorkingHourDetails(newDetails);
                          }}
                          rows="2"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        />
                      )}
                      {languageTab === 'jp' && (
                        <textarea
                          placeholder="勤務時間の詳細（日本語）"
                          value={whd.contentJp || ''}
                          onChange={(e) => {
                            const newDetails = [...workingHourDetails];
                            newDetails[index].contentJp = e.target.value;
                            setWorkingHourDetails(newDetails);
                          }}
                          rows="2"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setWorkingHourDetails(
                            workingHourDetails.filter((_, i) => i !== index)
                          )
                        }
                        className="p-1.5 text-red-500 hover:text-red-700 self-start"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Break time */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    {t.jobBreakTimeLabel || 'Thời gian nghỉ'}
                  </label>
                  {languageTab === 'vi' && (
                    <input
                      type="text"
                      name="breakTime"
                      value={formData.breakTime}
                      onChange={handleInputChange}
                      placeholder="VD: 60 phút"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  )}
                  {languageTab === 'en' && (
                    <input
                      type="text"
                      name="breakTimeEn"
                      value={formData.breakTimeEn}
                      onChange={handleInputChange}
                      placeholder="Break time details in English"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  )}
                  {languageTab === 'jp' && (
                    <input
                      type="text"
                      name="breakTimeJp"
                      value={formData.breakTimeJp}
                      onChange={handleInputChange}
                      placeholder="休憩時間の詳細（日本語）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  )}
                </div>
                {/* Overtime summary */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    {t.jobOvertimeLabel || 'Làm thêm giờ'}
                  </label>
                  <select
                    value={(() => {
                      const v = String(formData.overtime ?? '').trim().toLowerCase();
                      const e = String(formData.overtimeEn ?? '').trim().toLowerCase();
                      const j = String(formData.overtimeJp ?? '').trim();
                      if (
                        v === 'không làm thêm giờ' ||
                        e === 'no overtime' ||
                        e === 'none' ||
                        j === '残業なし'
                      ) return 'none';
                      if (
                        v === 'dưới 10 tiếng/ tháng' ||
                        v === 'dưới 10 tiếng/tháng' ||
                        e === 'under 10 hours/month' ||
                        e === 'below 10 hours/month' ||
                        j === '月10時間未満'
                      ) return 'under10';
                      if (
                        v === 'dưới 20 tiếng/ tháng' ||
                        v === 'dưới 20 tiếng/tháng' ||
                        e === 'under 20 hours/month' ||
                        e === 'below 20 hours/month' ||
                        j === '月20時間未満'
                      ) return 'under20';
                      return '';
                    })()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'none') {
                        setFormData((prev) => ({
                          ...prev,
                          overtime: 'Không làm thêm giờ',
                          overtimeEn: 'No overtime',
                          overtimeJp: '残業なし',
                        }));
                        return;
                      }
                      if (val === 'under10') {
                        setFormData((prev) => ({
                          ...prev,
                          overtime: 'Dưới 10 tiếng/ tháng',
                          overtimeEn: 'Under 10 hours/month',
                          overtimeJp: '月10時間未満',
                        }));
                        return;
                      }
                      if (val === 'under20') {
                        setFormData((prev) => ({
                          ...prev,
                          overtime: 'Dưới 20 tiếng/ tháng',
                          overtimeEn: 'Under 20 hours/month',
                          overtimeJp: '月20時間未満',
                        }));
                        return;
                      }
                      setFormData((prev) => ({ ...prev, overtime: '', overtimeEn: '', overtimeJp: '' }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">{t.selectLabel || 'Chọn'}</option>
                    <option value="none">
                      {language === 'ja' ? '残業なし' : language === 'en' ? 'No overtime' : 'Không làm thêm giờ'}
                    </option>
                    <option value="under10">
                      {language === 'ja' ? '月10時間未満' : language === 'en' ? 'Under 10 hours/month' : 'Dưới 10 tiếng/ tháng'}
                    </option>
                    <option value="under20">
                      {language === 'ja' ? '月20時間未満' : language === 'en' ? 'Under 20 hours/month' : 'Dưới 20 tiếng/ tháng'}
                    </option>
                  </select>
                </div>
              </div>
              
              {/* Chi tiết về làm thêm (gộp Phụ cấp + Chi tiết phụ cấp) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-900">
                    {t.jobOvertimeAllowanceDetailLabel || 'Chi tiết về làm thêm'}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setOvertimeAllowanceDetails([
                        ...overtimeAllowanceDetails,
                        { content: '', contentEn: '', contentJp: '' }
                      ])
                    }
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {t.jobOvertimeAllowanceDetailAdd || 'Thêm chi tiết'}
                  </button>
                </div>
                {overtimeAllowanceDetails.map((oad, index) => (
                  <div key={index} className="mb-3 space-y-1">
                    <div className="flex gap-2">
                      {languageTab === 'vi' && (
                        <textarea
                          placeholder={t.jobOvertimeAllowanceDetailPlaceholder || 'Chi tiết về làm thêm...'}
                          value={oad.content}
                          onChange={(e) => {
                            const newDetails = [...overtimeAllowanceDetails];
                            newDetails[index].content = e.target.value;
                            setOvertimeAllowanceDetails(newDetails);
                          }}
                          rows="2"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        />
                      )}
                      {languageTab === 'en' && (
                        <textarea
                          placeholder="Overtime allowance details in English"
                          value={oad.contentEn || ''}
                          onChange={(e) => {
                            const newDetails = [...overtimeAllowanceDetails];
                            newDetails[index].contentEn = e.target.value;
                            setOvertimeAllowanceDetails(newDetails);
                          }}
                          rows="2"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        />
                      )}
                      {languageTab === 'jp' && (
                        <textarea
                          placeholder="残業手当の詳細（日本語）"
                          value={oad.contentJp || ''}
                          onChange={(e) => {
                            const newDetails = [...overtimeAllowanceDetails];
                            newDetails[index].contentJp = e.target.value;
                            setOvertimeAllowanceDetails(newDetails);
                          }}
                          rows="2"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setOvertimeAllowanceDetails(
                            overtimeAllowanceDetails.filter((_, i) => i !== index)
                          )
                        }
                        className="p-1.5 text-red-500 hover:text-red-700 self-start"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Holidays */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    {t.jobHolidaysLabel || 'Ngày nghỉ'}
                  </label>
                  <select
                    value={getHolidaysPresetSelectValue(languageTab, formData)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'weekend') {
                        setFormData((prev) => ({ ...prev, holidays: 'Nghỉ T7, CN', holidaysEn: 'Sat/Sun off', holidaysJp: '土日休み' }));
                        return;
                      }
                      if (val === 'twoDays') {
                        setFormData((prev) => ({ ...prev, holidays: 'Nghỉ hoàn toàn 2 ngày mỗi tuần', holidaysEn: 'Two full days off per week', holidaysJp: '完全週休2日' }));
                        return;
                      }
                      if (val === 'oneToTwoShift') {
                        setFormData((prev) => ({ ...prev, holidays: 'Nghỉ 1–2 ngày mỗi tuần (theo lịch ca)', holidaysEn: '1–2 days off per week (shift-based)', holidaysJp: 'シフトにより週休1〜2日' }));
                        return;
                      }
                      if (val === 'shiftOff') {
                        setFormData((prev) => ({ ...prev, holidays: 'Nghỉ theo ca', holidaysEn: 'Shift-based days off', holidaysJp: 'シフト休' }));
                        return;
                      }
                      if (val === 'rotating') {
                        setFormData((prev) => ({ ...prev, holidays: 'Làm việc luân phiên / xoay ca', holidaysEn: 'Rotating shifts / shift work', holidaysJp: '交代制／シフト制' }));
                        return;
                      }
                      if (val === 'companyCalendar') {
                        setFormData((prev) => ({ ...prev, holidays: 'Nghỉ theo lịch công ty', holidaysEn: 'According to company calendar', holidaysJp: '会社カレンダーによる休日' }));
                        return;
                      }
                      if (val === 'projectSchedule') {
                        setFormData((prev) => ({ ...prev, holidays: 'Nghỉ theo lịch dự án', holidaysEn: 'According to project schedule', holidaysJp: 'プロジェクトスケジュールによる休日' }));
                        return;
                      }
                      setFormData((prev) => ({ ...prev, holidays: '', holidaysEn: '', holidaysJp: '' }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">{t.selectLabel || 'Chọn'}</option>
                    <option value="weekend">{language === 'ja' ? '土日休み' : language === 'en' ? 'Sat/Sun off' : 'Nghỉ T7, CN'}</option>
                    <option value="twoDays">{language === 'ja' ? '完全週休2日' : language === 'en' ? 'Two full days off per week' : 'Nghỉ hoàn toàn 2 ngày mỗi tuần'}</option>
                    <option value="oneToTwoShift">{language === 'ja' ? 'シフトにより週休1〜2日' : language === 'en' ? '1–2 days off per week (shift-based)' : 'Nghỉ 1–2 ngày mỗi tuần (theo lịch ca)'}</option>
                    <option value="shiftOff">{language === 'ja' ? 'シフト休' : language === 'en' ? 'Shift-based days off' : 'Nghỉ theo ca'}</option>
                    <option value="rotating">{language === 'ja' ? '交代制／シフト制' : language === 'en' ? 'Rotating shifts / shift work' : 'Làm việc luân phiên / xoay ca'}</option>
                    <option value="companyCalendar">{language === 'ja' ? '会社カレンダーによる休日' : language === 'en' ? 'According to company calendar' : 'Nghỉ theo lịch công ty'}</option>
                    <option value="projectSchedule">{language === 'ja' ? 'プロジェクトスケジュールによる休日' : language === 'en' ? 'According to project schedule' : 'Nghỉ theo lịch dự án'}</option>
                  </select>
                  {/* Chi tiết về ngày nghỉ */}
                  <label className="block text-[11px] font-semibold mt-2" style={{ color: '#111827' }}>
                    {t.jobHolidaysDetailLabel || 'Chi tiết về ngày nghỉ'}
                  </label>
                  {languageTab === 'vi' && (
                    <textarea
                      name="holidayDetails"
                      value={formData.holidayDetails || ''}
                      onChange={handleInputChange}
                      placeholder={t.jobHolidaysDetailPlaceholder || 'Chi tiết về ngày nghỉ (ví dụ: Nghỉ lễ theo lịch Nhật/Việt, số ngày phép năm, v.v.)'}
                      rows="2"
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                    />
                  )}
                  {languageTab === 'en' && (
                    <textarea
                      name="holidayDetailsEn"
                      value={formData.holidayDetailsEn || ''}
                      onChange={handleInputChange}
                      placeholder="Holiday details in English (e.g. national holidays, annual leave, etc.)"
                      rows="2"
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                    />
                  )}
                  {languageTab === 'jp' && (
                    <textarea
                      name="holidayDetailsJp"
                      value={formData.holidayDetailsJp || ''}
                      onChange={handleInputChange}
                      placeholder="休日の詳細（例：日本の祝日、有給休暇日数など）"
                      rows="2"
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* 27. Thời hạn hợp đồng */}
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              {t.jobContractPeriodLabel || 'Thời hạn hợp đồng'}
            </label>
            {languageTab === 'vi' && (
              <input
                type="text"
                name="contractPeriod"
                value={formData.contractPeriod}
                onChange={handleInputChange}
                placeholder={t.jobContractPeriodPlaceholder || 'VD: Không thời hạn, 1 năm, 2 năm'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            )}
            {languageTab === 'en' && (
              <input
                type="text"
                name="contractPeriodEn"
                value={formData.contractPeriodEn}
                onChange={handleInputChange}
                placeholder="Contract period in English"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            )}
            {languageTab === 'jp' && (
              <input
                type="text"
                name="contractPeriodJp"
                value={formData.contractPeriodJp}
                onChange={handleInputChange}
                placeholder="契約期間（日本語）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            )}
          </div>
          {/* 28. Thử việc */}
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              {(t.jobProbationLabel) || 'Thử việc'}
            </label>
            {languageTab === 'vi' && (
              <input
                type="text"
                name="probationPeriod"
                value={formData.probationPeriod}
                onChange={handleInputChange}
                placeholder={t.jobProbationPlaceholder || 'VD: 2 tháng, 3 tháng, không thử việc'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            )}
            {languageTab === 'en' && (
              <input
                type="text"
                name="probationPeriodEn"
                value={formData.probationPeriodEn}
                onChange={handleInputChange}
                placeholder="Probation period in English"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            )}
            {languageTab === 'jp' && (
              <input
                type="text"
                name="probationPeriodJp"
                value={formData.probationPeriodJp}
                onChange={handleInputChange}
                placeholder="試用期間（日本語）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            )}
          </div>
          {/* 29. Chi tiết về thử việc */}
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              {(t.jobProbationDetailLabel) || 'Chi tiết về thử việc'}
            </label>
            {languageTab === 'vi' && (
              <textarea
                name="probationDetail"
                value={formData.probationDetail}
                onChange={handleInputChange}
                placeholder={t.jobProbationDetailPlaceholder || 'VD: Lương trong thời gian thử việc, BHXH trong thời gian thử việc...'}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
              />
            )}
            {languageTab === 'en' && (
              <textarea
                name="probationDetailEn"
                value={formData.probationDetailEn}
                onChange={handleInputChange}
                placeholder="Probation details in English"
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
              />
            )}
            {languageTab === 'jp' && (
              <textarea
                name="probationDetailJp"
                value={formData.probationDetailJp}
                onChange={handleInputChange}
                placeholder="試用期間の詳細（日本語）"
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
              />
            )}
          </div>
          {/* 30. Quy trình tuyển dụng */}
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              {t.jobRecruitmentProcessLabel || 'Quy trình tuyển dụng'} <span className="text-gray-500 font-normal">(điền text)</span>
            </label>
            {languageTab === 'vi' && (
              <textarea name="recruitmentProcess" value={formData.recruitmentProcess} onChange={handleInputChange} placeholder={t.jobRecruitmentProcessPlaceholder || 'VD: Phỏng vấn 1 vòng, Test kỹ năng...'} rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />
            )}
            {languageTab === 'en' && (
              <textarea name="recruitmentProcessEn" value={formData.recruitmentProcessEn} onChange={handleInputChange} placeholder="Recruitment process in English" rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />
            )}
            {languageTab === 'jp' && (
              <textarea name="recruitmentProcessJp" value={formData.recruitmentProcessJp} onChange={handleInputChange} placeholder="選考フロー（日本語）" rows="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />
            )}
          </div>
          {/* Hạn nộp hồ sơ */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
              {t.applicationDeadline || 'Hạn nộp hồ sơ'}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
            </div>
          </div>

          {/* Block 3: Thông tin công ty tuyển dụng */}
          <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 pb-2.5 border-b border-gray-100" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Building2 className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.jobRecruitingCompanySectionTitle || 'Thông tin công ty tuyển dụng'}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {languageTab === 'vi'
                      ? (t.jobRecruitingCompanyNameLabel || 'Tên công ty tuyển dụng')
                      : languageTab === 'en'
                        ? `${t.jobRecruitingCompanyNameLabel || 'Tên công ty tuyển dụng'} (EN)`
                        : `${t.jobRecruitingCompanyNameLabel || 'Tên công ty tuyển dụng'} (JP)`}
                  </label>
                  <input
                    type="text"
                    value={languageTab === 'vi' ? recruitingCompany.companyName : languageTab === 'en' ? recruitingCompany.companyNameEn : recruitingCompany.companyNameJp}
                    onChange={(e) => setRecruitingCompany({
                      ...recruitingCompany,
                      ...(languageTab === 'vi'
                        ? { companyName: e.target.value }
                        : languageTab === 'en'
                          ? { companyNameEn: e.target.value }
                          : { companyNameJp: e.target.value })
                    })}
                    placeholder={languageTab === 'vi' ? 'VD: Công ty ABC' : languageTab === 'en' ? 'Company name in English' : '会社名（日本語）'}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{
                      borderColor: '#d1d5db',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {t.jobSourceCompanyLabel || 'Công ty nguồn'}
                  </label>
                  <select
                    name="companyId"
                    value={formData.companyId}
                    onChange={handleCompanyChange}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{
                      borderColor: '#d1d5db',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">
                      {t.jobSourceCompanySelectPlaceholder || t.jobCompanySelectPlaceholder || 'Chọn công ty (tùy chọn)'}
                    </option>
                    {companies.map((company, compIdx) => (
                      <option key={`company-${company.id}-${compIdx}`} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {languageTab === 'vi'
                      ? (t.jobRecruitingCompanyRevenueLabel || 'Doanh thu')
                      : languageTab === 'en'
                        ? `${t.jobRecruitingCompanyRevenueLabel || 'Doanh thu'} (EN)`
                        : `${t.jobRecruitingCompanyRevenueLabel || 'Doanh thu'} (JP)`}
                  </label>
                  <input
                    type="text"
                    value={languageTab === 'vi' ? recruitingCompany.revenue : languageTab === 'en' ? recruitingCompany.revenueEn : recruitingCompany.revenueJp}
                    onChange={(e) => setRecruitingCompany({
                      ...recruitingCompany,
                      ...(languageTab === 'vi'
                        ? { revenue: e.target.value }
                        : languageTab === 'en'
                          ? { revenueEn: e.target.value }
                          : { revenueJp: e.target.value })
                    })}
                    placeholder={languageTab === 'vi' ? 'VD: 100 tỷ Y' : languageTab === 'en' ? 'Revenue in English' : '売上高（日本語）'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {languageTab === 'vi'
                      ? (t.jobRecruitingCompanyEmployeesLabel || 'Số nhân viên')
                      : languageTab === 'en'
                        ? `${t.jobRecruitingCompanyEmployeesLabel || 'Số nhân viên'} (EN)`
                        : `${t.jobRecruitingCompanyEmployeesLabel || 'Số nhân viên'} (JP)`}
                  </label>
                  <input
                    type="text"
                    value={languageTab === 'vi' ? recruitingCompany.numberOfEmployees : languageTab === 'en' ? recruitingCompany.numberOfEmployeesEn : recruitingCompany.numberOfEmployeesJp}
                    onChange={(e) => setRecruitingCompany({
                      ...recruitingCompany,
                      ...(languageTab === 'vi'
                        ? { numberOfEmployees: e.target.value }
                        : languageTab === 'en'
                          ? { numberOfEmployeesEn: e.target.value }
                          : { numberOfEmployeesJp: e.target.value })
                    })}
                    placeholder={languageTab === 'vi' ? 'VD: 500-1000' : languageTab === 'en' ? 'Number of employees in English' : '従業員数（日本語）'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {languageTab === 'vi' && (
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {t.jobRecruitingCompanyHeadquartersLabel || 'Trụ sở tại'}
                    </label>
                    <input
                      type="text"
                      value={recruitingCompany.headquarters}
                      onChange={(e) => setRecruitingCompany({ ...recruitingCompany, headquarters: e.target.value })}
                      placeholder="VD: Tokyo, Japan"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}
                {languageTab === 'en' && (
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {(t.jobRecruitingCompanyHeadquartersLabel || 'Trụ sở tại') + ' (EN)'}
                    </label>
                    <input
                      type="text"
                      value={recruitingCompany.headquartersEn}
                      onChange={(e) => setRecruitingCompany({ ...recruitingCompany, headquartersEn: e.target.value })}
                      placeholder="Headquarters in English"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}
                {languageTab === 'jp' && (
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {(t.jobRecruitingCompanyHeadquartersLabel || 'Trụ sở tại') + ' (JP)'}
                    </label>
                    <input
                      type="text"
                      value={recruitingCompany.headquartersJp}
                      onChange={(e) => setRecruitingCompany({ ...recruitingCompany, headquartersJp: e.target.value })}
                      placeholder="本社所在地（日本語）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {languageTab === 'vi'
                      ? (t.jobRecruitingCompanyEstablishedDateLabel || 'Thành lập')
                      : languageTab === 'en'
                        ? `${t.jobRecruitingCompanyEstablishedDateLabel || 'Thành lập'} (EN)`
                        : `${t.jobRecruitingCompanyEstablishedDateLabel || 'Thành lập'} (JP)`}
                  </label>
                  <input
                    type="text"
                    value={languageTab === 'vi' ? recruitingCompany.establishedDate : languageTab === 'en' ? recruitingCompany.establishedDateEn : recruitingCompany.establishedDateJp}
                    onChange={(e) => setRecruitingCompany({
                      ...recruitingCompany,
                      ...(languageTab === 'vi'
                        ? { establishedDate: e.target.value }
                        : languageTab === 'en'
                          ? { establishedDateEn: e.target.value }
                          : { establishedDateJp: e.target.value })
                    })}
                    placeholder={languageTab === 'vi' ? 'VD: 2010' : languageTab === 'en' ? 'Established date in English' : '設立年（日本語）'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {languageTab === 'vi'
                      ? (t.jobRecruitingCompanyStockLabel || 'Thông tin sàn chứng khoán')
                      : languageTab === 'en'
                        ? `${t.jobRecruitingCompanyStockLabel || 'Thông tin sàn chứng khoán'} (EN)`
                        : `${t.jobRecruitingCompanyStockLabel || 'Thông tin sàn chứng khoán'} (JP)`}
                  </label>
                  <input
                    type="text"
                    value={languageTab === 'vi' ? recruitingCompany.stockExchangeInfo : languageTab === 'en' ? recruitingCompany.stockExchangeInfoEn : recruitingCompany.stockExchangeInfoJp}
                    onChange={(e) => setRecruitingCompany({
                      ...recruitingCompany,
                      ...(languageTab === 'vi'
                        ? { stockExchangeInfo: e.target.value }
                        : languageTab === 'en'
                          ? { stockExchangeInfoEn: e.target.value }
                          : { stockExchangeInfoJp: e.target.value })
                    })}
                    placeholder={
                      languageTab === 'jp'
                        ? '例: https://example.com'
                        : languageTab === 'en'
                          ? 'e.g. https://example.com'
                          : 'VD: https://example.com'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {languageTab === 'vi'
                      ? (t.jobRecruitingCompanyCapitalLabel || 'Vốn đầu tư')
                      : languageTab === 'en'
                        ? `${t.jobRecruitingCompanyCapitalLabel || 'Vốn đầu tư'} (EN)`
                        : `${t.jobRecruitingCompanyCapitalLabel || 'Vốn đầu tư'} (JP)`}
                  </label>
                  <input
                    type="text"
                    value={languageTab === 'vi' ? recruitingCompany.investmentCapital : languageTab === 'en' ? recruitingCompany.investmentCapitalEn : recruitingCompany.investmentCapitalJp}
                    onChange={(e) => setRecruitingCompany({
                      ...recruitingCompany,
                      ...(languageTab === 'vi'
                        ? { investmentCapital: e.target.value }
                        : languageTab === 'en'
                          ? { investmentCapitalEn: e.target.value }
                          : { investmentCapitalJp: e.target.value })
                    })}
                    placeholder={languageTab === 'vi' ? 'VD: 50 tỷ Y' : languageTab === 'en' ? 'Capital in English' : '資本金（日本語）'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              {languageTab === 'vi' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-2">
                    {t.jobRecruitingCompanyIntroLabel || 'Giới thiệu chung về công ty'}
                  </label>
                  <textarea
                    value={recruitingCompany.companyIntroduction}
                    onChange={(e) => setRecruitingCompany({ ...recruitingCompany, companyIntroduction: e.target.value })}
                    placeholder="Giới thiệu về công ty..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  />
                </div>
              )}
              {languageTab === 'en' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-2">
                    {(t.jobRecruitingCompanyIntroLabel || 'Giới thiệu chung về công ty') + ' (EN)'}
                  </label>
                  <textarea
                    value={recruitingCompany.companyIntroductionEn}
                    onChange={(e) => setRecruitingCompany({ ...recruitingCompany, companyIntroductionEn: e.target.value })}
                    placeholder="Company introduction in English"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  />
                </div>
              )}
              {languageTab === 'jp' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-2">
                    {(t.jobRecruitingCompanyIntroLabel || 'Giới thiệu chung về công ty') + ' (JP)'}
                  </label>
                  <textarea
                    value={recruitingCompany.companyIntroductionJp}
                    onChange={(e) => setRecruitingCompany({ ...recruitingCompany, companyIntroductionJp: e.target.value })}
                    placeholder="会社概要（日本語）"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  />
                </div>
              )}
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-900">
                    {t.jobRecruitingCompanyServicesLabel || 'Dịch vụ cung cấp'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setRecruitingCompany({
                      ...recruitingCompany,
                      services: [
                        ...recruitingCompany.services,
                        {
                          serviceName: '',
                          serviceNameEn: '',
                          serviceNameJp: '',
                          order: recruitingCompany.services.length
                        }
                      ]
                    })}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {t.jobRecruitingCompanyServicesAdd || 'Thêm dịch vụ'}
                  </button>
                </div>
                {recruitingCompany.services.map((service, index) => (
                  <div key={index} className="mb-3 space-y-1">
                    <div className="flex gap-2">
                      {languageTab === 'vi' && (
                        <input
                          type="text"
                          placeholder={t.jobRecruitingCompanyServiceNamePlaceholder || 'Tên dịch vụ'}
                          value={service.serviceName}
                          onChange={(e) => {
                            const newServices = [...recruitingCompany.services];
                            newServices[index].serviceName = e.target.value;
                            setRecruitingCompany({ ...recruitingCompany, services: newServices });
                          }}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      )}
                      {languageTab === 'en' && (
                        <input
                          type="text"
                          placeholder="Service name in English"
                          value={service.serviceNameEn || ''}
                          onChange={(e) => {
                            const newServices = [...recruitingCompany.services];
                            newServices[index].serviceNameEn = e.target.value;
                            setRecruitingCompany({ ...recruitingCompany, services: newServices });
                          }}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      )}
                      {languageTab === 'jp' && (
                        <input
                          type="text"
                          placeholder="サービス名（日本語）"
                          value={service.serviceNameJp || ''}
                          onChange={(e) => {
                            const newServices = [...recruitingCompany.services];
                            newServices[index].serviceNameJp = e.target.value;
                            setRecruitingCompany({ ...recruitingCompany, services: newServices });
                          }}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setRecruitingCompany({
                          ...recruitingCompany,
                          services: recruitingCompany.services.filter((_, i) => i !== index)
                        })}
                        className="p-1.5 text-red-500 hover:text-red-700 flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  {t.jobRecruitingCompanyBusinessSectorsLabel || 'Lĩnh vực kinh doanh (có thể chọn nhiều)'}
                </label>
                {/* Ô dropdown giống Lĩnh vực ở Thông tin cơ bản, nhưng cho phép thêm nhiều mục */}
                <div className="flex gap-2 mb-2">
                  <select
                    name="recruitingBusinessSectorKey"
                    value={recruitingBusinessSectorKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRecruitingBusinessSectorKey(val);
                      if (!val) return;
                      const opt = BUSINESS_SECTOR_OPTIONS.find(o => (o.key || o.vi) === val);
                      if (!opt) return;
                      const sectorName = opt.vi;
                      const sectorKey = opt.key || opt.vi;
                      const exists = (recruitingCompany.businessSectors || []).some(
                        (bs) => (bs.sectorKey || bs.sectorName || '').trim() === sectorKey || (bs.sectorName || '').trim() === sectorName
                      );
                      if (exists) return;
                      setRecruitingCompany(prev => ({
                        ...prev,
                        businessSectors: [
                          ...(prev.businessSectors || []),
                          {
                            sectorKey,
                            sectorName,
                            sectorNameEn: opt.en || '',
                            sectorNameJp: opt.ja || '',
                            order: (prev.businessSectors || []).length
                          }
                        ]
                      }));
                      // Reset dropdown sau khi thêm
                      setRecruitingBusinessSectorKey('');
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg text-xs"
                    style={{
                      borderColor: '#d1d5db',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">
                      {t.jobCategorySelectPlaceholder || t.pleaseSelect || 'Chọn lĩnh vực'}
                    </option>
                    {BUSINESS_SECTOR_OPTIONS.map((option) => {
                      const label =
                        language === 'en'
                          ? option.en || option.vi
                          : language === 'ja'
                          ? option.ja || option.vi
                          : option.vi;
                      const value = option.key || option.vi;
                      return (
                        <option key={`recruit-sector-${value}`} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {/* Danh sách các lĩnh vực đã chọn cho doanh nghiệp, có thể xóa từng mục */}
                <div className="flex flex-wrap gap-1">
                  {(recruitingCompany.businessSectors || []).map((bs, idx) => (
                    <span
                      key={`selected-sector-${idx}`}
                      className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] border border-blue-200"
                    >
                      {String(
                        languageTab === 'vi'
                          ? bs.sectorName || ''
                          : languageTab === 'en'
                            ? bs.sectorNameEn || ''
                            : bs.sectorNameJp || ''
                      ).trim()}
                      <button
                        type="button"
                        onClick={() =>
                          setRecruitingCompany(prev => ({
                            ...prev,
                            businessSectors: (prev.businessSectors || []).filter((_, i) => i !== idx)
                          }))
                        }
                        className="ml-1 text-blue-500 hover:text-blue-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Campaigns */}
          <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 pb-2.5 border-b border-gray-100" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Tag className="w-4 h-4 text-blue-600" />
              {t.jobCampaignSectionTitle || 'Chiến dịch'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  {t.jobCampaignSelectLabel || 'Chọn chiến dịch'}
                </label>
                <select
                  multiple
                  value={selectedCampaignIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedCampaignIds(selected);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[100px]"
                  size="5"
                >
                  {campaigns.map((campaign, campIdx) => {
                    const name = pickByLanguage(campaign, 'name');
                    const statusLabel =
                      campaign.status === 1
                        ? (t.campaignStatusActive || '(Đang hoạt động)')
                        : campaign.status === 0
                        ? (t.campaignStatusInactive || '(Chưa bắt đầu)')
                        : (t.campaignStatusEnded || '(Đã kết thúc)');
                    return (
                      <option key={`campaign-${campaign.id}-${campIdx}`} value={campaign.id}>
                        {name} {statusLabel}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  {t.jobCampaignMultiSelectHint || 'Giữ Ctrl (Windows) hoặc Cmd (Mac) để chọn nhiều chiến dịch'}
                </p>
                {selectedCampaignIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedCampaignIds.map((campaignId, tagIdx) => {
                      const campaign = campaigns.find(c => c.id === parseInt(campaignId));
                      if (!campaign) return null;
                      const name = pickByLanguage(campaign, 'name');
                      return (
                        <span
                          key={`campaign-tag-${campaignId}-${tagIdx}`}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                        >
                          {name}
                          <button
                            type="button"
                            onClick={() => setSelectedCampaignIds(selectedCampaignIds.filter(id => id !== campaignId))}
                            className="hover:text-blue-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chi tiết hoa hồng (Job Values) */}
          <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm" style={{ borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 pb-2.5 border-b border-gray-100" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Money className="w-4 h-4 text-blue-600" />
              {t.jobCommissionDetailSectionTitle || 'Cài đặt phí'}
            </h2>
            <div className="space-y-3">
              {/* Commission Type */}
              <div className="mb-4 pb-3 border-b border-gray-200">
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  Loại hoa hồng <span className="text-red-500">*</span>
                </label>
                <select
                  name="jobCommissionType"
                  value={formData.jobCommissionType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="fixed">Số tiền cố định</option>
                  <option value="percent">Phần trăm</option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  {formData.jobCommissionType === 'fixed'
                    ? 'Giá trị trong Job Values sẽ được hiểu là số tiền cố định (Y). Ví dụ: 50000000 = 50 triệu Y'
                    : 'Giá trị trong Job Values sẽ được hiểu là phần trăm (%). Ví dụ: 30 = 30%'}
                </p>
              </div>
              {jobValues.map((jv, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Job Value #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => setJobValues(jobValues.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="text-xs font-semibold text-gray-900">{t.typesLabel || 'Type'}</label>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {jv.typeId ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditTypeFromCommissionRow(jv.typeId)}
                                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-gray-700 hover:bg-gray-50"
                                title={t.editTypeModalTitle || 'Sửa Type'}
                                aria-label={t.editTypeModalTitle || 'Sửa Type'}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteType(jv.typeId)}
                                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-red-600 hover:bg-red-50"
                                title={t.confirmDeleteType || 'Xóa Type'}
                                aria-label={t.confirmDeleteType || 'Xóa Type'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setShowAddTypeModal(true)}
                            className="inline-flex shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-blue-600 hover:bg-blue-50"
                            title={t.addTypeModalTitle || 'Thêm Type'}
                            aria-label={t.addTypeModalTitle || 'Thêm Type'}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <select
                        value={jv.typeId ?? ''}
                        onChange={async (e) => {
                          const selectedTypeId = e.target.value ? parseInt(e.target.value, 10) : null;
                          if (selectedTypeId) {
                            const response = await apiService.getValuesByType(selectedTypeId);
                            if (response.success && response.data) {
                              const valuesForType = response.data.values || [];
                              setValuesByType(prev => ({ ...prev, [selectedTypeId]: valuesForType }));
                              if (selectedTypeId === 2) {
                                const newJobValues = [...jobValues];
                                newJobValues[index] = { ...newJobValues[index], typeId: selectedTypeId, valueId: '', value: newJobValues[index].value ?? '', isRequired: newJobValues[index].isRequired ?? false };
                                setJobValues(newJobValues);
                              } else if (valuesForType.length > 0) {
                                const newJobValues = jobValues.filter((_, i) => i !== index);
                                const newJobValueCards = valuesForType.map(value => ({
                                  typeId: selectedTypeId,
                                  valueId: value.id,
                                  value: '',
                                  isRequired: false
                                }));
                                newJobValues.splice(index, 0, ...newJobValueCards);
                                setJobValues(newJobValues);
                              } else {
                                const newJobValues = [...jobValues];
                                newJobValues[index] = { ...newJobValues[index], typeId: selectedTypeId, valueId: '', value: newJobValues[index].value ?? '', isRequired: newJobValues[index].isRequired ?? false };
                                setJobValues(newJobValues);
                              }
                            }
                          } else {
                            const newJobValues = [...jobValues];
                            newJobValues[index] = { ...newJobValues[index], typeId: '', valueId: '', value: newJobValues[index].value ?? '', isRequired: newJobValues[index].isRequired ?? false };
                            setJobValues(newJobValues);
                          }
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">{t.selectType || t.typesLabel || 'Chọn Type'}</option>
                        {(types || []).map((type, typeIdx) => (
                          <option key={`type-${type.id}-${typeIdx}`} value={type.id}>
                            {pickByLanguage(type, 'typename')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="text-xs font-semibold text-gray-900">{t.valuesLabel || 'Value'}</label>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {jv.typeId && jv.valueId ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditValueFromCommissionRow(jv)}
                                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-gray-700 hover:bg-gray-50"
                                title={t.editValueModalTitle || 'Sửa Value'}
                                aria-label={t.editValueModalTitle || 'Sửa Value'}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteValue(jv.valueId, jv.typeId)}
                                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-red-600 hover:bg-red-50"
                                title={t.confirmDeleteValue || 'Xóa Value'}
                                aria-label={t.confirmDeleteValue || 'Xóa Value'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTypeForValue(jv.typeId ? String(jv.typeId) : '');
                              setShowAddValueModal(true);
                            }}
                            className="inline-flex shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-blue-600 hover:bg-blue-50"
                            title={t.addValueModalTitle || 'Thêm Value'}
                            aria-label={t.addValueModalTitle || 'Thêm Value'}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <select
                        value={jv.valueId ?? ''}
                        onChange={(e) => {
                          const newJobValues = [...jobValues];
                          newJobValues[index] = { ...newJobValues[index], valueId: e.target.value ? parseInt(e.target.value, 10) : '', value: newJobValues[index].value ?? '', isRequired: newJobValues[index].isRequired ?? false };
                          setJobValues(newJobValues);
                        }}
                        disabled={!jv.typeId}
                        required={jv.typeId === 2}
                        className={`w-full px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed ${jv.typeId === 2 && !jv.valueId ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <option value="">Chọn Value{jv.typeId === 2 ? ' *' : ''}</option>
                        {(valuesByType[jv.typeId] || []).map((value, valIdx) => (
                          <option key={`val-${jv.typeId}-${value.id}-${valIdx}`} value={value.id}>
                            {pickByLanguage(value, 'valuename')}
                            {value.comparisonOperator && (
                              ` (${value.comparisonOperator} ${value.comparisonValue || ''}${value.comparisonOperator === 'between' ? ` - ${value.comparisonValueEnd || ''}` : ''})`
                            )}
                          </option>
                        ))}
                      </select>
                      {jv.typeId === 2 && !jv.valueId && (
                        <p className="text-[10px] text-red-500 mt-1">Vui lòng chọn Value (bắt buộc cho Type này)</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Giá trị cụ thể (value)
                      {!(Number(jv.typeId) === 7 && Number(jv.valueId) === 34) && formData.jobCommissionType === 'fixed' && <span className="text-gray-500 text-[10px] ml-1">(Y)</span>}
                      {!(Number(jv.typeId) === 7 && Number(jv.valueId) === 34) && formData.jobCommissionType === 'percent' && <span className="text-gray-500 text-[10px] ml-1">(%)</span>}
                    </label>
                    {Number(jv.typeId) === 7 && Number(jv.valueId) === 34 ? (
                      <div>
                        <input
                          type="text"
                          value={jv.value || ''}
                          onChange={(e) => {
                            const newJobValues = [...jobValues];
                            newJobValues[index] = { ...newJobValues[index], value: e.target.value, typeId: newJobValues[index].typeId, valueId: newJobValues[index].valueId, isRequired: newJobValues[index].isRequired ?? false };
                            setJobValues(newJobValues);
                          }}
                          placeholder="VD: 01 tháng lương nhân viên"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Giá trị text hiển thị cho Admin</p>
                      </div>
                    ) : (
                      <div>
                        <div className="relative">
                          <input
                            type="number"
                            step={formData.jobCommissionType === 'percent' ? '0.01' : '1'}
                            min="0"
                            max={formData.jobCommissionType === 'percent' ? '100' : undefined}
                            value={jv.value || ''}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              if (formData.jobCommissionType === 'percent' && inputValue && parseFloat(inputValue) > 100) {
                                alert('Phần trăm không được vượt quá 100%');
                                return;
                              }
                              const newJobValues = [...jobValues];
                              newJobValues[index] = { ...newJobValues[index], value: inputValue, typeId: newJobValues[index].typeId, valueId: newJobValues[index].valueId, isRequired: newJobValues[index].isRequired ?? false };
                              setJobValues(newJobValues);
                            }}
                            placeholder={formData.jobCommissionType === 'fixed' ? 'VD: 50000000 (Y)' : 'VD: 30 (%)'}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                          {formData.jobCommissionType === 'percent' && jv.value && (
                            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[10px] text-gray-500">%</span>
                          )}
                          {formData.jobCommissionType === 'fixed' && jv.value && (
                            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[10px] text-gray-500">Y</span>
                          )}
                        </div>
                        {formData.jobCommissionType === 'percent' && jv.value && parseFloat(jv.value) > 100 && (
                          <p className="text-[10px] text-red-500 mt-1">Phần trăm không được vượt quá 100%</p>
                        )}
                        {jv.value && formData.jobCommissionType === 'fixed' && (
                          <p className="text-[10px] text-gray-500 mt-1">{parseFloat(jv.value).toLocaleString('vi-VN')} Y</p>
                        )}
                        {jv.value && formData.jobCommissionType === 'percent' && (
                          <p className="text-[10px] text-gray-500 mt-1">{parseFloat(jv.value)}%</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={jv.isRequired || false}
                      onChange={(e) => {
                        const newJobValues = [...jobValues];
                        newJobValues[index] = { ...newJobValues[index], isRequired: e.target.checked, typeId: newJobValues[index].typeId, valueId: newJobValues[index].valueId, value: newJobValues[index].value ?? '' };
                        setJobValues(newJobValues);
                      }}
                      className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                    />
                    <label className="text-xs font-semibold text-gray-900">Bắt buộc</label>
                  </div>
                  {Number(jv.typeId) === 7 && Number(jv.valueId) === 34 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Giá trị hiển thị cho CTV <span className="text-gray-500 text-[10px] ml-1">(Y)</span>
                      </label>
                      <input
                        type="text"
                        value={jv.viewOnCollaborator || ''}
                        onChange={(e) => {
                          const newJobValues = [...jobValues];
                          newJobValues[index] = { ...newJobValues[index], viewOnCollaborator: e.target.value };
                          setJobValues(newJobValues);
                        }}
                        placeholder="VD: 300000 hoặc 300000 - 400000"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Số tiền sẽ được nhân với % level CTV. Hỗ trợ dạng min - max.</p>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setJobValues([...jobValues, { typeId: '', valueId: '', value: '', isRequired: false }])}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Job Value
              </button>
              {errors.jobValues && <p className="text-[10px] text-red-500 mt-2">{errors.jobValues}</p>}
            </div>
          </div>

          {/* Status & Options */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-3 pb-2.5 border-b border-gray-100">
              {t.jobOptionsSectionTitle || 'Tùy chọn'}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isPinned"
                  checked={formData.isPinned}
                  onChange={handleInputChange}
                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                />
                <label className="text-xs font-semibold text-gray-900">
                  Ghim lên đầu
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isHot"
                  checked={formData.isHot}
                  onChange={handleInputChange}
                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                />
                <label className="text-xs font-semibold text-gray-900">
                  Việc làm hot
                </label>
              </div>
            </div>
          </div>
        </div>
      </form>
        </div>

        {/* Cột phải: Preview JD — không bar tiêu đề; đồng bộ AddCandidateForm */}
        <div className="flex flex-col min-h-[320px] xl:min-h-0 min-w-0">
          <div
            className="rounded-lg border overflow-hidden flex flex-col flex-1 min-h-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)]"
            style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}
          >
              <div className="flex-1 overflow-y-auto min-h-0 min-w-0 bg-white">
                {/* JD theo ngôn ngữ: Vi / EN / JP — đồng bộ với tab form */}
                <JdTemplate
                  key={jdTemplateSyncKey}
                  lang={languageTab}
                  formData={formData}
                  setFormData={setFormData}
                  recruitingCompany={recruitingCompany}
                  setRecruitingCompany={setRecruitingCompany}
                  categories={categories}
                  jobValues={jobValues}
                  workingLocations={workingLocations}
                  setWorkingLocations={setWorkingLocations}
                  salaryRanges={salaryRanges}
                  setSalaryRanges={setSalaryRanges}
                  salaryRangeDetails={salaryRangeDetails}
                  setSalaryRangeDetails={setSalaryRangeDetails}
                  workingLocationDetails={workingLocationDetails}
                  setWorkingLocationDetails={setWorkingLocationDetails}
                  overtimeAllowances={overtimeAllowances}
                  overtimeAllowanceDetails={overtimeAllowanceDetails}
                  setOvertimeAllowanceDetails={setOvertimeAllowanceDetails}
                  requirements={requirements}
                  setRequirements={setRequirements}
                  workingHours={workingHours}
                  workingHourDetails={workingHourDetails}
                  setWorkingHourDetails={setWorkingHourDetails}
                  jobBenefitRows={jobBenefitRows}
                  setJobBenefitRows={setJobBenefitRows}
                />
              </div>

            <div className="flex items-center gap-2 px-3 py-2 border-t flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
              <button
                type="button"
                onClick={handlePreviewJdPdf}
                disabled={jdPdfLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: jdPdfLoading ? '#93c5fd' : '#2563eb',
                  color: 'white',
                  opacity: jdPdfLoading ? 0.6 : 1,
                  cursor: jdPdfLoading ? 'not-allowed' : 'pointer'
                }}
              >
                <Eye className="w-3.5 h-3.5" />
                {jdPdfLoading ? 'Đang tạo...' : 'Xem PDF'}
              </button>
              <button
                type="button"
                onClick={handleDownloadJdPdf}
                disabled={jdPdfLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#111827',
                  border: '1px solid #e5e7eb'
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Tải JD
              </button>
              <div className="flex-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Type */}
      {showAddTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddTypeModal(false)}>
          <div className="bg-white rounded-lg p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">{t.addTypeModalTitle}</h3>
              <button
                onClick={() => {
                  setShowAddTypeModal(false);
                  setNewTypeName('');
                  setNewTypeNameEn('');
                  setNewTypeNameJp('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  {t.typeNameLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder={t.typeNamePlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">{t.typeNameEnLabel}</label>
                <input
                  type="text"
                  value={newTypeNameEn}
                  onChange={(e) => setNewTypeNameEn(e.target.value)}
                  placeholder={t.typeNamePlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">{t.typeNameJpLabel}</label>
                <input
                  type="text"
                  value={newTypeNameJp}
                  onChange={(e) => setNewTypeNameJp(e.target.value)}
                  placeholder={t.typeNamePlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTypeModal(false);
                    setNewTypeName('');
                    setNewTypeNameEn('');
                    setNewTypeNameJp('');
                    setCvField('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleCreateType}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t.createType}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Type */}
      {showEditTypeModal && editingType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowEditTypeModal(false)}>
          <div className="bg-white rounded-lg p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">{t.editTypeModalTitle}</h3>
              <button
                onClick={() => {
                  setShowEditTypeModal(false);
                  setEditingType(null);
                  setNewTypeName('');
                  setNewTypeNameEn('');
                  setNewTypeNameJp('');
                  setCvField('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  {t.typeNameLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder={t.typeNamePlaceholderEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">{t.typeNameEnLabel}</label>
                <input
                  type="text"
                  value={newTypeNameEn}
                  onChange={(e) => setNewTypeNameEn(e.target.value)}
                  placeholder={t.typeNamePlaceholderEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">{t.typeNameJpLabel}</label>
                <input
                  type="text"
                  value={newTypeNameJp}
                  onChange={(e) => setNewTypeNameJp(e.target.value)}
                  placeholder={t.typeNamePlaceholderEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">{t.cvFieldLabel}</label>
                <select
                  value={cvField}
                  onChange={(e) => setCvField(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">{t.cvFieldNoCompare}</option>
                  <option value="jlptLevel">jlptLevel (JLPT Level)</option>
                  <option value="experienceYears">experienceYears (Số năm kinh nghiệm)</option>
                  <option value="specialization">specialization (Chuyên ngành)</option>
                  <option value="qualification">qualification (Bằng cấp)</option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1">{t.cvFieldHint}</p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTypeModal(false);
                    setEditingType(null);
                    setNewTypeName('');
                    setNewTypeNameEn('');
                    setNewTypeNameJp('');
                    setCvField('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleEditType}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t.updateType}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Value */}
      {showAddValueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddValueModal(false)}>
          <div className="bg-white rounded-lg p-4 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">{t.addValueModalTitle}</h3>
              <button
                onClick={() => {
                  setShowAddValueModal(false);
                  setNewValueNames('');
                  setNewValueNamesEn('');
                  setNewValueNamesJp('');
                  setSelectedTypeForValue('');
                  setUseComparisonOperator(false);
                  setComparisonOperator('');
                  setComparisonValue('');
                  setComparisonValueEnd('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  {t.typeLabel} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTypeForValue}
                  onChange={(e) => setSelectedTypeForValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">{t.selectType}</option>
                  {types.map((type, typeIdx) => (
                    <option key={`type-modal-${type.id}-${typeIdx}`} value={type.id}>
                      {pickByLanguage(type, 'typename')}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Comparison Operator Toggle */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={useComparisonOperator}
                  onChange={(e) => {
                    setUseComparisonOperator(e.target.checked);
                    if (!e.target.checked) {
                      setComparisonOperator('');
                      setComparisonValue('');
                      setComparisonValueEnd('');
                    }
                  }}
                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                />
                <label className="text-xs font-semibold text-gray-900">{t.useComparisonOperator}</label>
              </div>
              
              {useComparisonOperator && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {t.comparisonOperatorLabel} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={comparisonOperator}
                      onChange={(e) => handleComparisonOperatorChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">{t.selectOperator}</option>
                      <option value=">=">Lớn hơn hoặc bằng (&gt;=)</option>
                      <option value="<=">Nhỏ hơn hoặc bằng (&lt;=)</option>
                      <option value=">">Lớn hơn (&gt;)</option>
                      <option value="<">Nhỏ hơn (&lt;)</option>
                      <option value="=">Bằng (=)</option>
                      <option value="between">Trong khoảng (between)</option>
                    </select>
                    <p className="text-[10px] text-gray-500 mt-1">
                      <strong>{t.comparisonNote}</strong>
                      <br />
                      <strong>{t.comparisonExample}</strong>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                        {t.comparisonValueLabel} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={comparisonValue}
                        onChange={(e) => setComparisonValue(e.target.value)}
                        placeholder="VD: 3 (cho N3 hoặc 3 năm)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    {comparisonOperator === 'between' && (
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                          {t.comparisonValueEndLabel} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={comparisonValueEnd}
                          onChange={(e) => setComparisonValueEnd(e.target.value)}
                          placeholder="VD: 5 (cho N5 hoặc 5 năm)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  {t.valueNameLabel} <span className="text-red-500">*</span>
                  {!useComparisonOperator && (
                    <span className="text-gray-500 text-[10px] ml-2">{t.valueNameMultiHint}</span>
                  )}
                  {useComparisonOperator && (
                    <span className="text-gray-500 text-[10px] ml-2">{t.valueNameSingleHint}</span>
                  )}
                </label>
                {useComparisonOperator ? (
                  <input
                    type="text"
                    value={newValueNames}
                    onChange={(e) => setNewValueNames(e.target.value)}
                    placeholder="VD: Từ N3 trở lên, Trên 3 năm kinh nghiệm..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    autoFocus
                  />
                ) : (
                  <textarea
                    value={newValueNames}
                    onChange={(e) => setNewValueNames(e.target.value)}
                    placeholder="VD:&#10;Junior&#10;Senior&#10;Expert"
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                    autoFocus
                  />
                )}
                {!useComparisonOperator && (
                  <>
                    <div className="mt-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{t.valueNameEnLabel}</label>
                      <textarea
                        value={newValueNamesEn}
                        onChange={(e) => setNewValueNamesEn(e.target.value)}
                        placeholder="English, one per line"
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                      />
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{t.valueNameJpLabel}</label>
                      <textarea
                        value={newValueNamesJp}
                        onChange={(e) => setNewValueNamesJp(e.target.value)}
                        placeholder="日本語、1行に1つ"
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                      />
                    </div>
                  </>
                )}
                {useComparisonOperator && (
                  <>
                    <div className="mt-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{t.valueNameEnLabel}</label>
                      <input
                        type="text"
                        value={newValueNamesEn}
                        onChange={(e) => setNewValueNamesEn(e.target.value)}
                        placeholder="English"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{t.valueNameJpLabel}</label>
                      <input
                        type="text"
                        value={newValueNamesJp}
                        onChange={(e) => setNewValueNamesJp(e.target.value)}
                        placeholder="日本語"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </>
                )}
                {!useComparisonOperator && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Nhập nhiều Value, mỗi Value trên một dòng. Hệ thống sẽ tạo tất cả các Value cùng lúc.
                  </p>
                )}
                {useComparisonOperator && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Ví dụ: "Từ N3 trở lên", "Trên 3 năm kinh nghiệm", "Từ 2 đến 5 năm"
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddValueModal(false);
                    setNewValueNames('');
                    setNewValueNamesEn('');
                    setNewValueNamesJp('');
                    setSelectedTypeForValue('');
                    setUseComparisonOperator(false);
                    setComparisonOperator('');
                    setComparisonValue('');
                    setComparisonValueEnd('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleCreateValue}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  {useComparisonOperator ? t.createValue : t.createValues}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Value */}
      {showEditValueModal && editingValue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowEditValueModal(false)}>
          <div className="bg-white rounded-lg p-4 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">{t.editValueModalTitle}</h3>
              <button
                onClick={() => {
                  setShowEditValueModal(false);
                  setEditingValue(null);
                  setNewValueNames('');
                  setNewValueNameEn('');
                  setNewValueNameJp('');
                  setSelectedTypeForValue('');
                  setUseComparisonOperator(false);
                  setComparisonOperator('');
                  setComparisonValue('');
                  setComparisonValueEnd('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  {t.typeLabel} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTypeForValue}
                  onChange={(e) => setSelectedTypeForValue(e.target.value)}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-100"
                >
                  <option value="">{t.selectType}</option>
                  {types.map((type, typeIdx) => (
                    <option key={`type-edit-${type.id}-${typeIdx}`} value={type.id}>
                      {pickByLanguage(type, 'typename')}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">{t.cannotChangeTypeWhenEdit}</p>
              </div>
              
              {/* Comparison Operator Toggle */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={useComparisonOperator}
                  onChange={(e) => {
                    setUseComparisonOperator(e.target.checked);
                    if (!e.target.checked) {
                      setComparisonOperator('');
                      setComparisonValue('');
                      setComparisonValueEnd('');
                    }
                  }}
                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                />
                <label className="text-xs font-semibold text-gray-900">{t.useComparisonOperator}</label>
              </div>
              
              {useComparisonOperator && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {t.comparisonOperatorLabel} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={comparisonOperator}
                      onChange={(e) => handleComparisonOperatorChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">{t.selectOperator}</option>
                      <option value=">=">Lớn hơn hoặc bằng (&gt;=)</option>
                      <option value="<=">Nhỏ hơn hoặc bằng (&lt;=)</option>
                      <option value=">">Lớn hơn (&gt;)</option>
                      <option value="<">Nhỏ hơn (&lt;)</option>
                      <option value="=">Bằng (=)</option>
                      <option value="between">Trong khoảng (between)</option>
                    </select>
                    <p className="text-[10px] text-gray-500 mt-1">
                      <strong>{t.comparisonNote}</strong>
                      <br />
                      <strong>{t.comparisonExample}</strong>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                        {t.comparisonValueLabel} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={comparisonValue}
                        onChange={(e) => setComparisonValue(e.target.value)}
                        placeholder="VD: 3 (cho N3 hoặc 3 năm)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    {comparisonOperator === 'between' && (
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                          {t.comparisonValueEndLabel} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={comparisonValueEnd}
                          onChange={(e) => setComparisonValueEnd(e.target.value)}
                          placeholder="VD: 5 (cho N5 hoặc 5 năm)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  {t.valueNameLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newValueNames}
                  onChange={(e) => setNewValueNames(e.target.value)}
                  placeholder="VD: Từ N3 trở lên, Trên 3 năm kinh nghiệm..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  autoFocus
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Ví dụ: "Từ N3 trở lên", "Trên 3 năm kinh nghiệm", "Từ 2 đến 5 năm"
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">{t.valueNameEnLabel}</label>
                <input
                  type="text"
                  value={newValueNameEn}
                  onChange={(e) => setNewValueNameEn(e.target.value)}
                  placeholder="English"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">{t.valueNameJpLabel}</label>
                <input
                  type="text"
                  value={newValueNameJp}
                  onChange={(e) => setNewValueNameJp(e.target.value)}
                  placeholder="日本語"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditValueModal(false);
                    setEditingValue(null);
                    setNewValueNames('');
                    setNewValueNameEn('');
                    setNewValueNameJp('');
                    setSelectedTypeForValue('');
                    setUseComparisonOperator(false);
                    setComparisonOperator('');
                    setComparisonValue('');
                    setComparisonValueEnd('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleEditValue}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t.updateValue}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup preview JD PDF – fullscreen modal giống AddCandidateForm */}
      {showJdPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={closeJdPreviewModal}
        >
          <div
            className="relative rounded-xl shadow-2xl flex flex-col bg-white overflow-hidden"
            style={{ width: '95vw', maxWidth: '960px', maxHeight: '95vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
              <span className="text-sm font-semibold truncate" style={{ color: '#111827' }}>
                {jdPdfPreviewUrl ? 'Preview JD (PDF)' : 'Preview JD'}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadJdPdf}
                  disabled={jdPreviewLoading || !jdPdfPreviewUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-45 disabled:pointer-events-none"
                  style={{ color: '#2563eb', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}
                  title="Tải file JD PDF"
                >
                  <Download className="w-4 h-4" />
                  Tải PDF
                </button>
                <button
                  type="button"
                  onClick={closeJdPreviewModal}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {jdPreviewLoading ? (
              <div className="flex items-center justify-center p-16">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" style={{ borderColor: '#2563eb' }} />
              </div>
            ) : (
              <iframe
                key={jdPdfPreviewUrl || 'empty'}
                title="Preview JD PDF"
                src={jdPdfPreviewUrl || undefined}
                className="w-full border-0 flex-1 min-h-0 bg-neutral-100"
                style={{ minHeight: '75vh', height: '75vh' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAddJobPage;

