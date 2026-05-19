import React from 'react';
import { JOB_HIGHLIGHT_OPTIONS } from '../../../utils/jobHighlightOptions';
import { BUSINESS_SECTOR_OPTIONS } from '../../../utils/businessSectorOptions';
import { getNumberOfHiresDisplayLabel } from '../../../utils/numberOfHiresOptions';
import logoImage from '../../../assets/logo.png';

/** Liên hệ Workstation JobShare - giá trị cố định */
const HEADER_CONTACT = {
  website: 'ws-jobshare.com',
  hotline: '(+84)972899728',
  mail: 'jobshare@work-station.vn',
};
const JD_BORDER_COLOR = '#cbd5e1';

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
    highlightsPlaceholder: 'Nhập điểm nổi bật (mỗi dòng một ý)',
    jobDescription: 'Mô tả công việc',
    jobDescriptionPlaceholder: 'Điền mô tả công việc cụ thể',

    requiredConditions: 'Điều kiện ứng tuyển bắt buộc',
    requiredConditionsPlaceholder: 'Điền điều kiện must của công việc này',
    preferredConditions: 'Điều kiện ưu tiên',
    preferredConditionsPlaceholder: 'Điền điều kiện ưu tiên (nếu có)',
    annualIncome: 'Thu nhập năm',
    monthlySalary: 'Lương tháng',
    incomeDetails: 'Chi tiết về thu nhập',
    incomeDetailsPlaceholder: 'Điền chi tiết',
    bonus: 'Thưởng',
    salaryReview: 'Tăng lương',
    transferAbility: 'Khả năng chuyển vùng',
    workLocation: 'Địa điểm làm việc',
    workLocationDetails: 'Chi tiết về địa điểm làm việc',
    workingTime: 'Thời gian làm việc',
    overtimeHoursPerMonth: 'Tổng số giờ làm thêm/tháng',
    overtimeDetails: 'Chi tiết về làm thêm',
    benefits: 'Chế độ phúc lợi',
    benefitsPlaceholder: 'VD: Bảo hiểm xã hội, phụ cấp đi lại, ...',
    /** Danh sách bảng benefits (content / en / jp) */
    jobBenefitsListSubtitle: 'Phúc lợi bổ sung (mỗi dòng một mục)',
    jobBenefitsListPlaceholder: 'Mỗi dòng: một mục phúc lợi (theo tab ngôn ngữ bên cạnh)',
    holidays: 'Ngày nghỉ',
    holidayDetails: 'Chi tiết về ngày nghỉ',
    holidayDetailsPlaceholder: 'Điền chi tiết',
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
    recruitmentType1: 'Nhân viên chính thức',
    recruitmentType2: 'Nhân viên hợp đồng có thời hạn',
    recruitmentType3: 'Nhân viên phái cử',
    recruitmentType4: 'Nhân viên bán thời gian',
    recruitmentType5: 'Hợp đồng uỷ thác',
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
    highlightsPlaceholder: 'Enter highlights (one per line)',
    jobDescription: 'Job description',
    jobDescriptionPlaceholder: 'Enter job description',

    requiredConditions: 'Required conditions',
    requiredConditionsPlaceholder: 'Required conditions for this job',
    preferredConditions: 'Preferred conditions',
    preferredConditionsPlaceholder: 'Preferred conditions (if any)',
    annualIncome: 'Annual income',
    monthlySalary: 'Monthly salary',
    incomeDetails: 'Income details',
    incomeDetailsPlaceholder: 'Enter details',
    bonus: 'Bonus',
    salaryReview: 'Salary review',
    transferAbility: 'Transfer ability',
    workLocation: 'Work location',
    workLocationDetails: 'Work location details',
    workingTime: 'Working hours',
    overtimeHoursPerMonth: 'Overtime hours/month',
    overtimeDetails: 'Overtime details',
    benefits: 'Benefits',
    benefitsPlaceholder: 'E.g. Social insurance, transportation allowance, ...',
    jobBenefitsListSubtitle: 'Additional benefits (one item per line)',
    jobBenefitsListPlaceholder: 'One benefit per line (matches the language tab next to the preview)',
    holidays: 'Holidays',
    holidayDetails: 'Holiday details',
    holidayDetailsPlaceholder: 'Enter details',
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
    recruitmentType1: 'Regular employee',
    recruitmentType2: 'Fixed-term contract employee',
    recruitmentType3: 'Seconded employee',
    recruitmentType4: 'Part-time employee',
    recruitmentType5: 'Outsourcing contract',
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
    highlightsPlaceholder: 'アピールポイントを入力（1行1項目）',
    jobDescription: '仕事内容',
    jobDescriptionPlaceholder: '仕事内容を入力',

    requiredConditions: '必須条件',
    requiredConditionsPlaceholder: '必須条件を入力',
    preferredConditions: '歓迎条件',
    preferredConditionsPlaceholder: '歓迎条件（あれば）',
    annualIncome: '年収',
    monthlySalary: '月給',
    incomeDetails: '収入の詳細',
    incomeDetailsPlaceholder: '詳細を入力',
    bonus: '賞与',
    salaryReview: '昇給',
    transferAbility: '転勤可否',
    workLocation: '勤務地',
    workLocationDetails: '勤務地の詳細',
    workingTime: '勤務時間',
    overtimeHoursPerMonth: '残業時間/月',
    overtimeDetails: '残業の詳細',
    benefits: '福利厚生',
    benefitsPlaceholder: '例：社会保険、通勤手当など',
    jobBenefitsListSubtitle: 'その他の福利（1行1項目）',
    jobBenefitsListPlaceholder: '1行に1つ（隣のプレビュー言語タブに合わせる）',
    holidays: '休日',
    holidayDetails: '休日の詳細',
    holidayDetailsPlaceholder: '詳細を入力',
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
    recruitmentType1: '正社員',
    recruitmentType2: '有期契約社員',
    recruitmentType3: '出向社員',
    recruitmentType4: 'パートタイム',
    recruitmentType5: '業務委託',
  },
};

export default function JdTemplate({
  lang = 'vi',
  formData,
  setFormData,
  recruitingCompany,
  setRecruitingCompany,
  categories,
  jobValues,
  workingLocations,
  setWorkingLocations,
  salaryRanges,
  setSalaryRanges,
  salaryRangeDetails,
  setSalaryRangeDetails,
  workingLocationDetails,
  setWorkingLocationDetails,
  overtimeAllowances,
  overtimeAllowanceDetails,
  setOvertimeAllowanceDetails,
  requirements,
  setRequirements,
  workingHours,
  workingHourDetails,
  setWorkingHourDetails,
  jobBenefitRows = [],
  setJobBenefitRows = () => {},
}) {
  const suffix = lang === 'vi' ? '' : lang === 'en' ? 'En' : 'Jp';
  const contentKey = lang === 'vi' ? 'content' : lang === 'en' ? 'contentEn' : 'contentJp';
  const L = LABELS[lang] || LABELS.vi;

  const buildEditableProps = (editKey, value, onBlur, className = '', style = {}) => ({
    key: `${lang}:${editKey}`,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onBlur,
    ref: (node) => {
      if (!node) return;
      const nextText = String(value ?? '');
      if (node.textContent !== nextText) {
        node.textContent = nextText;
      }
    },
    className: className || 'outline-none block',
    style: { outline: 'none', minHeight: '1.2em', ...style },
  });

  const countryLabelByLang = (countryRaw) => {
    const c = String(countryRaw ?? '').trim();
    if (!c) return '';
    const norm = c.toLowerCase();
    if (norm === 'japan' || c === '日本' || c === 'Nhật Bản') return lang === 'jp' ? '日本' : lang === 'en' ? 'Japan' : 'Nhật Bản';
    if (norm === 'vietnam' || c === 'ベトナム' || c === 'Việt Nam') return lang === 'jp' ? 'ベトナム' : lang === 'en' ? 'Vietnam' : 'Việt Nam';
    return c;
  };

  const locationLabelByLang = (wl) => {
    if (!wl) return '';
    if (lang === 'vi') return String(wl.location ?? '').trim();
    if (lang === 'en') return String(wl.locationEn ?? wl.location_en ?? '').trim();
    return String(wl.locationJp ?? wl.location_jp ?? '').trim();
  };

  const getFormKey = (field) => {
    // holidays: tách holidays / holidaysEn / holidaysJp theo lang (giống mô tả job)
    const noSuffix = ['jobCode', 'slug', 'status', 'categoryId', 'companyId', 'interviewLocation', 'deadline', 'recruitmentType', 'jobCommissionType', 'isPinned', 'isHot', 'highlights'];
    if (noSuffix.includes(field)) return field;
    return field + suffix;
  };

  const getBusinessSectorLabelFromKey = () => {
    const key = formData.businessSectorKey;
    if (!key) return '';
    const opt = BUSINESS_SECTOR_OPTIONS.find((o) => (o.key || o.vi) === key);
    if (!opt) return '';
    if (lang === 'en') return opt.en || '';
    if (lang === 'jp') return opt.ja || '';
    return opt.vi || '';
  };

  const jdEditable = (field, className = '', style = {}, placeholder = '') => {
    const key = getFormKey(field);
    const displayValue = String(formData[key] ?? '').trim() || placeholder;
    return buildEditableProps(
      `form:${key}`,
      displayValue,
      (e) => {
        const v = (e.currentTarget.textContent || '').trim();
        setFormData((prev) => ({ ...prev, [key]: v || '' }));
      },
      className || 'outline-none min-h-[1.2em] block',
      { minHeight: '1.2em', ...style }
    );
  };

  const getRecruitingKey = (field) => {
    if (
      ['companyName', 'revenue', 'numberOfEmployees', 'headquarters', 'companyIntroduction', 'stockExchangeInfo', 'investmentCapital', 'establishedDate'].includes(field)
      && (lang === 'en' || lang === 'jp')
    ) {
      return field + (lang === 'en' ? 'En' : 'Jp');
    }
    return field;
  };

  const jdRecruitingEditable = (field, className = '', style = {}, placeholder = '') => {
    const key = getRecruitingKey(field);
    const displayValue = String(recruitingCompany[key] ?? '').trim() || placeholder;
    return buildEditableProps(
      `recruiting:${key}`,
      displayValue,
      (e) => {
        const v = (e.currentTarget.textContent || '').trim();
        setRecruitingCompany((prev) => ({ ...prev, [key]: v || '' }));
      },
      className || 'outline-none min-h-[1.2em] block',
      { minHeight: '1.2em', ...style }
    );
  };

  /** Dùng cho các ô contentEditable không qua jdEditable/jdRecruitingEditable. */
  const customEditable = (customKey, children, onBlur, className = '', style = {}) => {
    return buildEditableProps(
      `custom:${customKey}`,
      children,
      (e) => {
        onBlur(e);
      },
      className || 'outline-none block',
      { minHeight: '1.2em', ...style }
    );
  };

  const recruitmentTypeMap = {
    1: L.recruitmentType1,
    2: L.recruitmentType2,
    3: L.recruitmentType3,
    4: L.recruitmentType4,
    5: L.recruitmentType5,
  };

  const recruitmentTypeLabel = formData.recruitmentType ? (recruitmentTypeMap[formData.recruitmentType] || formData.recruitmentType) : null;
  const residenceStatusMap = {
    engineer: { vi: 'Visa kỹ sư / tri thức nhân văn / nghiệp vụ quốc tế', en: 'Engineer / Specialist in Humanities / International Services', jp: '技術・人文知識・国際業務' },
    ssw: { vi: 'Visa kỹ năng đặc định', en: 'Specified Skilled Worker', jp: '特定技能' },
    student: { vi: 'Visa du học', en: 'Student', jp: '留学' },
    pr: { vi: 'Vĩnh trú', en: 'Permanent resident', jp: '永住者' },
    spouse: { vi: 'Vợ/chồng người Nhật', en: 'Spouse of Japanese national', jp: '日本人の配偶者等' },
    ltr: { vi: 'Visa định trú', en: 'Long-term Resident', jp: '定住者' },
    other: { vi: 'Khác', en: 'Other', jp: 'その他' },
    hsp: { vi: 'Visa chuyên gia trình độ cao', en: 'Highly Skilled Professional', jp: '高度専門職' },
    labor_skill: { vi: 'Visa lao động kỹ năng', en: 'Technical Intern Training', jp: '技能実習' },
    titp: { vi: 'Thực tập sinh kỹ năng', en: 'Technical Intern Training', jp: '技能実習' },
    dependent: { vi: 'Visa phụ thuộc gia đình', en: 'Dependent', jp: '家族滞在' },
    short: { vi: 'Visa ngắn hạn', en: 'Short-term stay', jp: '短期滞在' },
    ict: { vi: 'Chuyển công tác nội bộ', en: 'Intra-company Transferee', jp: '企業内転勤' },
    entertainer: { vi: 'Biểu diễn / giải trí', en: 'Entertainer / Entertainment', jp: '興行' },
    prspouse: { vi: 'Vợ/chồng thường trú nhân', en: 'Spouse of Permanent Resident', jp: '永住者の配偶者等' },
    no_requirement: { vi: 'Không yêu cầu', en: 'No requirement', jp: '不要' },
  };
  const getResidenceStatusLabels = () => {
    const raw = formData.residenceStatuses ?? formData.residenceStatus ?? '';
    let keys = [];
    if (Array.isArray(raw)) keys = raw;
    else if (typeof raw === 'string' && raw.trim().startsWith('[')) {
      try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) keys = parsed; } catch { keys = []; }
    } else if (typeof raw === 'string' && raw.trim()) {
      keys = raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return keys.map((k) => residenceStatusMap[k]?.[lang] || k).filter(Boolean);
  };
  const categoryName = (() => {
    const c = formData.categoryId ? categories.find((cat) => cat.id === parseInt(formData.categoryId)) : null;
    if (!c) return null;
    if (lang === 'en') return (c.nameEn || '').trim() || null;
    if (lang === 'jp') return (c.nameJp || '').trim() || null;
    return (c.name || '').trim() || null;
  })();
  const fieldLabel = getBusinessSectorLabelFromKey();
  const getLocalizedValue = (item, key) => String(item?.[key] ?? '').trim();
  const salaryRangeKey = lang === 'vi' ? 'salaryRange' : lang === 'en' ? 'salaryRangeEn' : 'salaryRangeJp';

  // Số năm kinh nghiệm: lấy từ block 11 (requirements preset), không lấy từ jobValues
  const expReq = requirements.find((r) => r.type === 'experience' && String(r.status || '').toLowerCase() === 'required');
  const expYearsVal = expReq ? getLocalizedValue(expReq, contentKey) : '';
  const numberOfHiresRaw = (
    formData[getFormKey('numberOfHires')] ??
    workingLocations?.[0]?.numberOfHires ??
    ''
  ).toString().trim();
  const numberOfHiresVal = numberOfHiresRaw ? getNumberOfHiresDisplayLabel(numberOfHiresRaw, lang) : null;

  const requirementContent = (type) => {
    const list = requirements.filter((r) => r.type === type);
    const text = list.map((r) => getLocalizedValue(r, contentKey)).filter(Boolean).join('\n');
    return text || (type === 'technique' ? L.requiredConditionsPlaceholder : L.preferredConditionsPlaceholder);
  };

  /** Nội dung ô "Điều kiện bắt buộc" = gộp technique + experience + language + certification (chỉ phần có nội dung thật, không hiện placeholder) */
  const requiredConditionsCombined = (() => {
    const types = ['technique', 'experience', 'language', 'certification'];
    const parts = types
      .map((type) => ({ type, text: requirementContent(type) }))
      .filter(({ type, text }) => {
        const ph = type === 'technique' ? L.requiredConditionsPlaceholder : L.preferredConditionsPlaceholder;
        return text && text !== ph;
      })
      .map(({ text }) => text);
    return parts.length ? parts.join('\n') : L.requiredConditionsPlaceholder;
  })();

  const preferredConditionsCombined = (() => {
    const types = ['education', 'skill', 'other'];
    const parts = types
      .map((type) => ({ type, text: requirementContent(type) }))
      .filter(({ text }) => text && text !== L.preferredConditionsPlaceholder)
      .map(({ text }) => text);
    return parts.length ? parts.join('\n') : L.preferredConditionsPlaceholder;
  })();

  const highlightsDisplay = (() => {
    if (!formData.highlights) return L.highlightsPlaceholder;
    let keys = [];
    if (typeof formData.highlights === 'string' && formData.highlights.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(formData.highlights);
        if (Array.isArray(parsed)) keys = parsed;
      } catch {
        keys = [];
      }
    }
    if (keys.length > 0) {
      const labels = keys.map((key) => {
        const opt = JOB_HIGHLIGHT_OPTIONS.find((o) => o.key === key);
        if (!opt) return key;
        if (lang === 'en') return opt.en;
        if (lang === 'jp') return opt.jp;
        return opt.vi;
      });
      const parts = labels.map((s) => String(s ?? '').trim()).filter(Boolean);
      return parts.length > 0 ? parts.join(' / ') : L.highlightsPlaceholder;
    }
    // Fallback: treat as plain text (cũ), sẽ không đa ngôn ngữ nhưng vẫn hiển thị
    const parts = String(formData.highlights)
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : L.highlightsPlaceholder;
  })();

  const updateRequirementsByType = (type, text) => {
    const lines = text ? text.split(/\n/).map((s) => s.trim()).filter(Boolean) : [];
    setRequirements((prev) => [
      ...prev.filter((r) => r.type !== type),
      ...lines.map((content, index) => {
        const existingItems = prev.filter((r) => r.type === type);
        const base = existingItems[index] || {};
        return { ...base, [contentKey]: content, type, status: base.status || '' };
      }),
    ]);
  };

  const salaryRangeDetailsText = salaryRangeDetails.map((srd) => getLocalizedValue(srd, contentKey)).filter(Boolean).join('\n');
  const workingLocationDetailsText = workingLocationDetails.map((wld) => getLocalizedValue(wld, contentKey)).filter(Boolean).join('\n');
  /** Chế độ phúc lợi: gộp Bảo hiểm xã hội + Phụ cấp đi lại (đồng bộ từ form) */
  const benefitsDisplayText = [formData[getFormKey('socialInsurance')], formData[getFormKey('transportation')]]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .join('\n') || '';
  /** Các dòng bảng `benefits` (mỗi dòng theo content / contentEn / contentJp) */
  const jobBenefitRowsText = (jobBenefitRows || [])
    .map((b) => getLocalizedValue(b, contentKey))
    .filter(Boolean)
    .join('\n');
  const overtimeDetailsText =
    overtimeAllowanceDetails.map((oad) => getLocalizedValue(oad, contentKey)).filter(Boolean).join('\n') ||
    (overtimeAllowances || [])
      .map((oa) => {
        const v =
          lang === 'vi'
            ? oa.overtimeAllowanceRange
            : lang === 'en'
              ? oa.overtimeAllowanceRangeEn ?? oa.overtime_allowance_range_en
              : oa.overtimeAllowanceRangeJp ?? oa.overtime_allowance_range_jp;
        return String(v ?? '').trim();
      })
      .filter(Boolean)
      .join(', ');
  const workingHourLineKey = lang === 'vi' ? 'workingHours' : lang === 'en' ? 'workingHoursEn' : 'workingHoursJp';
  const workingHoursText = (workingHourDetails && workingHourDetails.length > 0)
    ? workingHourDetails.map((whd) => getLocalizedValue(whd, contentKey)).filter(Boolean).join('\n')
    : (workingHours || []).map((wh) => String(wh[workingHourLineKey] ?? '').trim()).filter(Boolean).join('\n');

  const updateDetailArray = (setter, contentKey, lines) => {
    setter((prev) => {
      const newItems = lines.map((content, index) => {
        const existing = prev[index] || {};
        return { ...existing, [contentKey]: content };
      });
      if (newItems.length >= prev.length) return newItems;
      return newItems.concat(prev.slice(newItems.length)).map((item, i) => (i < newItems.length ? newItems[i] : { ...prev[i], [contentKey]: '' }));
    });
  };

  const salaryYear = salaryRanges.find((sr) => (sr.type || '').toLowerCase().includes('year') || (sr.type || '').toLowerCase().includes('năm'));
  const salaryMonth = salaryRanges.find((sr) => (sr.type || '').toLowerCase().includes('month') || (sr.type || '').toLowerCase().includes('tháng'));

  const serviceNameKey = lang === 'vi' ? 'serviceName' : lang === 'en' ? 'serviceNameEn' : 'serviceNameJp';
  const servicesDisplay = (recruitingCompany.services || [])
    .map((s) => String(s[serviceNameKey] ?? '').trim())
    .filter(Boolean)
    .join(', ');
  const businessSectorsDisplay = (recruitingCompany.businessSectors || [])
    .map((bs) => {
      if (lang === 'en') return String(bs.sectorNameEn ?? '').trim();
      if (lang === 'jp') return String(bs.sectorNameJp ?? '').trim();
      return String(bs.sectorName ?? '').trim();
    })
    .filter(Boolean)
    .join('\n');

  const rows = [
    [L.companyName, recruitingCompany.companyName, 'companyName'],
    [L.jobTitle, formData[getFormKey('title')], 'title'],
    [L.jobCode, formData.jobCode, 'jobCode'],
    // Lĩnh vực: chỉ từ Lĩnh vực đã chọn (businessSectorKey), không lấy theo Loại công việc
    [L.field, fieldLabel || '', 'fieldDisplay'],
    // Loại công việc: từ Loại công việc (category), đã theo ngôn ngữ JD
    [L.jobType, categoryName, 'jobTypeDisplay'],
    [L.expYears, expYearsVal || null, 'expYearsDisplay'],
    [L.numberOfHires, numberOfHiresVal, 'numberOfHiresDisplay'],
  ];

  return (
    <div className="rounded border bg-white shadow-sm w-full" style={{ borderColor: JD_BORDER_COLOR, fontSize: '11px' }}>
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 px-3 py-2.5 border-b"
        style={{ borderColor: JD_BORDER_COLOR, backgroundColor: '#ffffff' }}
      >
        {/* Logo: màn nhỏ đủ lớn (xếp dọc); màn sm+ vẫn rõ, không bị ép nhỏ bởi cột chữ */}
        <div className="flex justify-center sm:justify-start flex-shrink-0">
          <img
            src={logoImage}
            alt="Logo"
            className="w-auto object-contain select-none
              h-10 max-w-[min(160px,84vw)]
              sm:h-8 sm:max-w-[130px]
              md:h-10 md:max-w-[150px]"
          />
        </div>
        <div
          className="w-full sm:flex-1 sm:min-w-0 text-center sm:text-right leading-snug break-words
            max-sm:text-[9px] text-[10px] md:text-[11px] lg:text-xs"
          style={{ color: '#374151' }}
        >
          <p className="font-semibold mb-1 opacity-95" style={{ lineHeight: 1.35 }}>
            {L.headerSlogan}
          </p>
          <div className="space-y-0.5 opacity-90" style={{ lineHeight: 1.4 }}>
            <div>
              {L.headerWebsite}: {HEADER_CONTACT.website}
            </div>
            <div>
              {L.headerHotline}: {HEADER_CONTACT.hotline}
            </div>
            <div>
              {L.headerMail}: {HEADER_CONTACT.mail}
            </div>
          </div>
        </div>
      </div>
      <div className="px-3 py-2 font-bold text-sm border-b" style={{ color: '#111827', borderColor: JD_BORDER_COLOR }}>
        {L.sectionRecruitment}
      </div>
      <div className="divide-y" style={{ borderColor: JD_BORDER_COLOR }}>
        {rows.map(([lbl, val, key], i) => (
          <React.Fragment key={i}>
            <div className="flex" style={{ minHeight: '32px' }}>
              <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
                {lbl}
              </div>
              <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: JD_BORDER_COLOR, backgroundColor: 'white' }}>
                {lbl === L.companyName ? (
                  <span {...jdRecruitingEditable('companyName')} />
                ) : lbl === L.jobTitle ? (
                  <span key="job-title" {...jdEditable('title')} />
                ) : lbl === L.jobCode ? (
                  <span key="job-code" {...jdEditable('jobCode')} />
                ) : (
                  <span
                    {...customEditable(
                      'basic:' + key,
                      (formData[key] ?? val) || '',
                      (e) => {
                        const v = (e.currentTarget.textContent || '').trim();
                        setFormData((prev) => ({ ...prev, [key]: v }));
                      }
                    )}
                  />
                )}
              </div>
            </div>

            {/* Hình thức tuyển dụng + Tư cách lưu trú (ngay dưới Mã tin tuyển dụng) */}
            {lbl === L.jobCode && (
              <div className="flex" style={{ minHeight: '32px' }}>
                <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
                  {L.recruitmentForm}
                </div>
                <div className="flex-1 min-w-[60px] px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: JD_BORDER_COLOR, backgroundColor: 'white' }}>
                  <span
                    {...customEditable(
                      'basic:recruitmentFormDisplay',
                      recruitmentTypeLabel || '',
                      (e) => {
                        const v = (e.currentTarget.textContent || '').trim();
                        setFormData((prev) => ({ ...prev, recruitmentFormDisplay: v }));
                      }
                    )}
                  />
                </div>
                <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626', borderLeft: `1.25px solid ${JD_BORDER_COLOR}` }}>
                  {L.residenceStatus}
                </div>
                <div className="flex-1 min-w-[60px] px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: JD_BORDER_COLOR, backgroundColor: 'white' }}>
                  {(() => {
                    const labels = getResidenceStatusLabels();
                    return labels.length ? (
                      <span className="whitespace-pre-line">{labels.join('\n')}</span>
                    ) : (
                      <span />
                    );
                  })()}
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
        {/* Điểm nổi bật: 1 hàng ngang, có thể chỉnh sửa trực tiếp */}
        <div className="flex" style={{ minHeight: '32px' }}>
          <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.highlights}
          </div>
          <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: JD_BORDER_COLOR, backgroundColor: 'white', whiteSpace: 'normal' }}>
            <span
              {...customEditable(
                'highlights',
                highlightsDisplay,
                (e) => {
                  const v = (e.currentTarget.textContent || '').trim();
                  setFormData((prev) => ({ ...prev, highlights: v }));
                }
              )}
            />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.jobDescription}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: `1.25px solid ${JD_BORDER_COLOR}` }}>
            <span {...jdEditable('description', 'block whitespace-pre-wrap', { minHeight: '60px' }, L.jobDescriptionPlaceholder)} />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.requiredConditions}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: `1.25px solid ${JD_BORDER_COLOR}` }}>
            <span
              {...customEditable(
                'req-required',
                requiredConditionsCombined,
                (e) => {
                  const v = (e.currentTarget.textContent || '').trim();
                  const lines = v ? v.split(/\n/).map((s) => s.trim()).filter(Boolean) : [];
                  setRequirements((prev) => {
                    const typeOrder = ['technique', 'experience', 'language', 'certification'];
                    const grouped = new Map(typeOrder.map((type) => [type, prev.filter((r) => r.type === type)]));
                    const rebuilt = [];
                    lines.forEach((content, index) => {
                      const type = typeOrder[index] || 'technique';
                      const existingItems = grouped.get(type) || [];
                      const base = existingItems.shift() || {};
                      rebuilt.push({ ...base, [contentKey]: content, type, status: 'required' });
                    });
                    return [
                      ...prev.filter((r) => !typeOrder.includes(r.type)),
                      ...rebuilt,
                    ];
                  });
                },
                'outline-none block whitespace-pre-wrap',
                { minHeight: '60px' }
              )}
            />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.preferredConditions}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: `1.25px solid ${JD_BORDER_COLOR}` }}>
            <span
              {...customEditable(
                'req-education',
                preferredConditionsCombined,
                (e) => {
                  const v = (e.currentTarget.textContent || '').trim();
                  const lines = v ? v.split(/\n/).map((s) => s.trim()).filter(Boolean) : [];
                  setRequirements((prev) => {
                    const typeOrder = ['education', 'skill', 'other'];
                    const grouped = new Map(typeOrder.map((type) => [type, prev.filter((r) => r.type === type)]));
                    const rebuilt = [];
                    lines.forEach((content, index) => {
                      const type = typeOrder[index] || 'other';
                      const existingItems = grouped.get(type) || [];
                      const base = existingItems.shift() || {};
                      rebuilt.push({ ...base, [contentKey]: content, type, status: 'preferred' });
                    });
                    return [
                      ...prev.filter((r) => !typeOrder.includes(r.type)),
                      ...rebuilt,
                    ];
                  });
                },
                'outline-none block whitespace-pre-wrap',
                { minHeight: '60px' }
              )}
            />
          </div>
        </div>
        <div className="flex" style={{ minHeight: '32px' }}>
          <div className="flex-shrink-0 w-28 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.annualIncome}
          </div>
          <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: JD_BORDER_COLOR, backgroundColor: 'white' }}>
            <span
              {...customEditable(
                'salary-year',
                salaryYear?.[salaryRangeKey] || '',
                (e) => {
                  const v = (e.currentTarget.textContent || '').trim();
                  setSalaryRanges((prev) => {
                    const next = Array.isArray(prev) ? [...prev] : [];
                    if (!next[0]) next[0] = { type: salaryYear?.type || 'year', salaryRange: '', salaryRangeEn: '', salaryRangeJp: '' };
                    next[0] = { ...(next[0] || {}), [salaryRangeKey]: v };
                    return next;
                  });
                }
              )}
            />
          </div>
          <div className="flex-shrink-0 w-24 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626', borderLeft: `1.25px solid ${JD_BORDER_COLOR}` }}>
            {L.monthlySalary}
          </div>
          <div className="flex-1 min-w-[80px] px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: JD_BORDER_COLOR, backgroundColor: 'white' }}>
            <span
              {...customEditable(
                'salary-month',
                salaryMonth?.[salaryRangeKey] || '',
                (e) => {
                  const v = (e.currentTarget.textContent || '').trim();
                  setSalaryRanges((prev) => {
                    const next = Array.isArray(prev) ? [...prev] : [];
                    if (!next[1]) next[1] = { type: salaryMonth?.type || 'month', salaryRange: '', salaryRangeEn: '', salaryRangeJp: '' };
                    next[1] = { ...(next[1] || {}), [salaryRangeKey]: v };
                    return next;
                  });
                }
              )}
            />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.incomeDetails}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: `1.25px solid ${JD_BORDER_COLOR}` }}>
            <span
              {...customEditable(
                'salary-range-details',
                salaryRangeDetailsText || L.incomeDetailsPlaceholder,
                (e) => {
                  const v = (e.currentTarget.textContent || '').trim();
                  const lines = v ? v.split(/\n/).map((s) => s.trim()).filter(Boolean) : [];
                  updateDetailArray(setSalaryRangeDetails, contentKey, lines);
                },
                'outline-none block whitespace-pre-wrap',
                { minHeight: '60px' }
              )}
            />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.bonus}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: `1.25px solid ${JD_BORDER_COLOR}` }}>
            <span {...jdEditable('bonus', 'block whitespace-pre-wrap', { minHeight: '60px' }, L.incomeDetailsPlaceholder)} />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.salaryReview}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: `1.25px solid ${JD_BORDER_COLOR}` }}>
            <span {...jdEditable('salaryReview', 'block whitespace-pre-wrap', { minHeight: '60px' }, L.incomeDetailsPlaceholder)} />
          </div>
        </div>
        <div className="flex" style={{ minHeight: '32px' }}>
          <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.transferAbility}
          </div>
          <div className="flex-1 min-w-[60px] px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}>
            <span
              {...jdEditable('transferAbility', 'outline-none block', { minHeight: '1.2em' }, '')}
            />
          </div>
          <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626', borderLeft: '1px solid #e5e7eb' }}>
            {L.workLocation}
          </div>
          <div className="flex-1 min-w-[80px] px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}>
            <span
              {...customEditable(
                'work-locations',
                (workingLocations || [])
                  .map((wl) => {
                    const loc = locationLabelByLang(wl);
                    if (!loc) return '';
                    const c = countryLabelByLang(wl.country);
                    return loc + (c ? ' (' + c + ')' : '');
                  })
                  .filter(Boolean)
                  .join(', ') || '',
                (e) => {
                  const v = (e.currentTarget.textContent || '').trim();
                  setWorkingLocations(v ? v.split(',').map((part) => ({ location: part.trim(), country: '' })) : []);
                }
              )}
            />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.workLocationDetails}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
            <span
              {...customEditable(
                'work-location-details',
                workingLocationDetailsText || L.incomeDetailsPlaceholder,
                (e) => {
                  const v = (e.currentTarget.textContent || '').trim();
                  const lines = v ? v.split(/\n/).map((s) => s.trim()).filter(Boolean) : [];
                  updateDetailArray(setWorkingLocationDetails, contentKey, lines);
                },
                'outline-none block whitespace-pre-wrap',
                { minHeight: '60px' }
              )}
            />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.workingTime}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
            <span
              {...customEditable(
                'working-hour-details',
                workingHoursText || L.incomeDetailsPlaceholder,
                (e) => {
                  const v = (e.currentTarget.textContent || '').trim();
                  const lines = v ? v.split(/\n/).map((s) => s.trim()).filter(Boolean) : [];
                  updateDetailArray(setWorkingHourDetails, contentKey, lines);
                },
                'outline-none block whitespace-pre-wrap',
                { minHeight: '60px' }
              )}
            />
          </div>
        </div>
        <div className="flex" style={{ minHeight: '32px' }}>
          <div className="flex-shrink-0 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626', minWidth: '140px' }}>
            {L.overtimeHoursPerMonth}
          </div>
          <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}>
            <span {...jdEditable('overtime', '', {}, '')} />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.overtimeDetails}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
            <span
              {...customEditable(
                'overtime-details',
                overtimeDetailsText || L.incomeDetailsPlaceholder,
                (e) => {
                  const v = (e.currentTarget.textContent || '').trim();
                  const lines = v ? v.split(/\n/).map((s) => s.trim()).filter(Boolean) : [];
                  updateDetailArray(setOvertimeAllowanceDetails, contentKey, lines);
                },
                'outline-none block whitespace-pre-wrap',
                { minHeight: '60px' }
              )}
            />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.benefits}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
            <span
              {...customEditable(
                'benefits-combined',
                benefitsDisplayText || L.benefitsPlaceholder,
                (e) => {
                  const v = (e.currentTarget.textContent || '').trim();
                  const lines = v.split(/\n/).map((s) => s.trim());
                  const first = lines[0] || '';
                  const rest = lines.slice(1).join('\n').trim();
                  setFormData((prev) => ({
                    ...prev,
                    [getFormKey('socialInsurance')]: first,
                    [getFormKey('transportation')]: rest,
                  }));
                },
                'outline-none block whitespace-pre-wrap',
                { minHeight: '60px' }
              )}
            />
            <div className="mt-2 pt-2" style={{ borderTop: '1px dashed #e5e7eb' }}>
              <div className="text-[10px] font-medium mb-1" style={{ color: '#6b7280' }}>
                {L.jobBenefitsListSubtitle}
              </div>
              <span
                {...customEditable(
                  'benefits-table-rows',
                  jobBenefitRowsText || L.jobBenefitsListPlaceholder,
                  (e) => {
                    const v = (e.currentTarget.textContent || '').trim();
                    const lines = v ? v.split(/\n/).map((s) => s.trim()).filter(Boolean) : [];
                    setJobBenefitRows((prev) => {
                      const base = Array.isArray(prev) ? prev : [];
                      return lines.map((text, index) => {
                        const existing = base[index] || { content: '', contentEn: '', contentJp: '' };
                        return { ...existing, [contentKey]: text };
                      });
                    });
                  },
                  'outline-none block whitespace-pre-wrap',
                  { minHeight: '40px' }
                )}
              />
            </div>
          </div>
        </div>
        <div className="flex" style={{ minHeight: '32px' }}>
          <div className="flex-shrink-0 w-28 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.holidays}
          </div>
          <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}>
            <span {...jdEditable('holidays', '', {}, '')} />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.holidayDetails}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
            <span
              {...jdEditable('holidayDetails', 'block whitespace-pre-wrap', { minHeight: '60px' }, L.holidayDetailsPlaceholder)}
            />
          </div>
        </div>
        <div className="flex" style={{ minHeight: '32px' }}>
          <div className="flex-shrink-0 w-28 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.probation}
          </div>
          <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}>
            <span {...jdEditable('probationPeriod', '', {}, '')} />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.probationDetails}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
            <span
              {...jdEditable('probationDetail', 'block whitespace-pre-wrap', { minHeight: '60px' }, L.holidayDetailsPlaceholder)}
            />
          </div>
        </div>
        <div>
          <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
            {L.recruitmentProcess}
          </div>
          <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
            <span {...jdEditable('recruitmentProcess', 'block whitespace-pre-wrap', { minHeight: '60px' }, L.incomeDetailsPlaceholder)} />
          </div>
        </div>
        <div className="mt-3">
          <div className="w-full px-3 py-2 text-sm font-bold text-white" style={{ backgroundColor: '#4b5563' }}>
            {L.sectionCompany}
          </div>
          <div className="grid grid-cols-2 border-t" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex border-b border-r" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>{L.companyName}</div>
              <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}><span {...jdRecruitingEditable('companyName')} /></div>
            </div>
            <div className="flex border-b" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>{L.stockExchangeInfo}</div>
              <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}><span {...jdRecruitingEditable('stockExchangeInfo')} /></div>
            </div>
            <div className="flex border-b border-r" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>{L.services}</div>
              <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}>
                <span
                  {...customEditable(
                    'recruit-services',
                    (lang === 'vi' ? recruitingCompany.servicesText : '') || servicesDisplay || '',
                    (e) => {
                      const v = (e.currentTarget.textContent || '').trim();
                      setRecruitingCompany((prev) => ({ ...prev, servicesText: v }));
                    }
                  )}
                />
              </div>
            </div>
            <div className="flex border-b" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>{L.businessSectors}</div>
              <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}>
                <span
                  {...customEditable(
                    'recruit-businessSectors',
                    (lang === 'vi' ? recruitingCompany.businessSectorsText : '') || businessSectorsDisplay || '',
                    (e) => {
                      const v = (e.currentTarget.textContent || '').trim();
                      setRecruitingCompany((prev) => ({ ...prev, businessSectorsText: v }));
                    },
                    'outline-none block whitespace-pre-wrap',
                    { whiteSpace: 'pre-wrap' }
                  )}
                />
              </div>
            </div>
            <div className="flex border-b border-r" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>{L.revenue}</div>
              <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}><span {...jdRecruitingEditable('revenue')} /></div>
            </div>
            <div className="flex border-b" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>{L.investmentCapital}</div>
              <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}><span {...jdRecruitingEditable('investmentCapital')} /></div>
            </div>
            <div className="flex border-b border-r" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>{L.numberOfEmployees}</div>
              <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}><span {...jdRecruitingEditable('numberOfEmployees')} /></div>
            </div>
            <div className="flex border-b" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>{L.established}</div>
              <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}><span {...jdRecruitingEditable('establishedDate')} /></div>
            </div>
          </div>
          <div className="flex border-b" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex-shrink-0 w-36 px-3 py-2 flex items-center text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>{L.headquarters}</div>
            <div className="flex-1 px-3 py-2 flex items-center text-xs border-l" style={{ color: '#111827', borderColor: '#e5e7eb', backgroundColor: 'white' }}><span {...jdRecruitingEditable('headquarters')} /></div>
          </div>
          <div>
            <div className="w-full px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: '#dc2626' }}>{L.companyIntroduction}</div>
            <div className="px-3 py-2 min-h-[60px] text-xs whitespace-pre-wrap" style={{ color: '#111827', backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
              <span {...jdRecruitingEditable('companyIntroduction', 'block whitespace-pre-wrap', { minHeight: '60px' }, L.incomeDetailsPlaceholder)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
