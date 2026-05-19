import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, Folder, CheckSquare, Square, ChevronRight, User, BriefcaseBusiness, ClipboardList, BadgeCheck, GraduationCap, MapPin, Mail, Phone, Calendar, Edit, Save, X, AlertTriangle, ListTree, ChevronDown } from 'lucide-react';
import { useNominationFlow } from '../../hooks/useNominationFlow';
import JobCategoryPickerModal from '../../component/Shared/JobCategoryPickerModal.jsx';

const RESIDENCE_STATUS_OPTIONS = [
  { value: 'engineer', vi: 'Visa kỹ sư / tri thức nhân văn / nghiệp vụ quốc tế', en: 'Engineer/Specialist in Humanities/International Services', ja: '技術・人文知識・国際業務' },
  { value: 'ssw', vi: 'Visa kỹ năng đặc định', en: 'Specified Skilled Worker', ja: '特定技能' },
  { value: 'student', vi: 'Visa du học', en: 'Student', ja: '留学' },
  { value: 'pr', vi: 'Vĩnh trú', en: 'Permanent resident', ja: '永住者' },
  { value: 'spouse', vi: 'Vợ/chồng người Nhật', en: 'Spouse of Japanese national', ja: '日本人の配偶者等' },
  { value: 'ltr', vi: 'Visa định trú', en: 'Long-term Resident', ja: '定住者' },
  { value: 'other', vi: 'Khác', en: 'Other', ja: 'その他' },
  { value: 'hsp', vi: 'Visa chuyên gia trình độ cao', en: 'Highly Skilled Professional', ja: '高度専門職' },
  { value: 'labor_skill', vi: 'Visa lao động kỹ năng', en: 'Technical Intern Training', ja: '技能実習' },
  { value: 'titp', vi: 'Thực tập sinh kỹ năng', en: 'Technical Intern Training', ja: '技能実習' },
  { value: 'dependent', vi: 'Visa phụ thuộc gia đình', en: 'Dependent', ja: '家族滞在' },
  { value: 'short', vi: 'Visa ngắn hạn', en: 'Short-term stay', ja: '短期滞在' },
  { value: 'ict', vi: 'Chuyển công tác nội bộ', en: 'Intra-company Transferee', ja: '企業内転勤' },
  { value: 'entertainer', vi: 'Biểu diễn / giải trí', en: 'Entertainer / Entertainment', ja: '興行' },
  { value: 'prspouse', vi: 'Vợ/chồng thường trú nhân', en: 'Spouse of Permanent Resident', ja: '永住者の配偶者等' },
];

const NominationConfirmPage = ({ variant = 'agent' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const flow = useNominationFlow({ variant });
  const [selectedFolderPath, setSelectedFolderPath] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [jobCategoryModalOpen, setJobCategoryModalOpen] = useState(false);

  useEffect(() => {
    if (location.state?.selectedCvId) {
      flow.handleSelectCV(location.state.selectedCvId);
    }
  }, [location.state?.selectedCvId]);

  useEffect(() => {
    const first = flow.selectedCV?.cvOriginalPath || flow.selectedCV?.curriculumVitae || '';
    if (!selectedFolderPath && first) setSelectedFolderPath(first);
  }, [flow.selectedCV, selectedFolderPath]);

  const getFieldValue = (...values) => values.find((value) => value != null && String(value).trim() !== '') || '';
  const getResidenceStatusLabel = (value, lang = flow.language || 'vi') => {
    const rawValue = typeof value === 'object' && value ? (value.value || value.vi || value.en || value.ja) : value;
    const opt = RESIDENCE_STATUS_OPTIONS.find((item) => item.value === rawValue);
    if (!opt) return rawValue || '';
    if (lang === 'en') return opt.en;
    if (lang === 'ja') return opt.ja;
    return opt.vi;
  };
  const normalizeResidenceStatusValue = (value) => {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return '';
    const map = {
      engineer: 'engineer', ssw: 'ssw', student: 'student', pr: 'pr', spouse: 'spouse', ltr: 'ltr', other: 'other', hsp: 'hsp', labor_skill: 'labor_skill', titp: 'titp', dependent: 'dependent', short: 'short', ict: 'ict', entertainer: 'entertainer', prspouse: 'prspouse',
      '1': 'engineer', '2': 'ssw', '3': 'student', '4': 'pr', '5': 'spouse', '6': 'ltr', '7': 'other', '8': 'hsp', '9': 'labor_skill', '10': 'dependent', '11': 'short', '12': 'ict', '13': 'entertainer', '14': 'titp', '15': 'prspouse',
    };
    return map[raw] || raw;
  };
  const normalizeStatusList = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          return trimmed.split(',');
        }
      }
      return trimmed.split(',');
    }
    if (typeof value === 'object' && value) {
      if (Array.isArray(value.value)) return value.value;
      return [value.value || value.vi || value.en || value.ja || value.label || value.name || value.title || ''];
    }
    return value ? [value] : [];
  };
  const jobResidenceRequiredValues = useMemo(() => normalizeStatusList(flow.job?.residenceStatuses || flow.job?.residence_statuses || flow.job?.residenceStatus || flow.job?.residence_status).map(normalizeResidenceStatusValue).filter(Boolean), [flow.job?.residenceStatuses, flow.job?.residence_statuses, flow.job?.residenceStatus, flow.job?.residence_status]);
  const currentResidenceStatusValue = normalizeResidenceStatusValue(getFieldValue(flow.cvEditData.jpResidenceStatus, flow.selectedCV?.jpResidenceStatus, flow.selectedCV?.jp_residence_status, flow.selectedCV?.residenceStatus, flow.selectedCV?.residence_status, flow.selectedCV?.visaStatus));
  const missingResidenceStatus = !currentResidenceStatusValue;
  const residenceStatusMismatch = jobResidenceRequiredValues.length > 0 && currentResidenceStatusValue && !jobResidenceRequiredValues.includes(currentResidenceStatusValue);
  const confirmEditValue = (key, value) => {
    if (key === 'jpResidenceStatus') {
      const normalized = value && /^\\d+$/.test(String(value))
        ? String(value)
        : flow.normalizeResidenceStatusToDbValue?.(value) || value;
      flow.setCvEditData((prev) => ({ ...prev, [key]: normalized }));
      return;
    }
    flow.setCvEditData((prev) => ({ ...prev, [key]: value }));
  };

  const requiredFields = useMemo(() => {
    const candidateName = getFieldValue(flow.cvEditData.name, flow.selectedCV?.name, flow.selectedCV?.fullName);
    const jobCategory = getFieldValue(flow.cvEditData.jobCategoryName, flow.selectedCV?.jobCategoryName, flow.selectedCV?.jobCategory?.name, flow.selectedCV?.job_category_name, flow.selectedCV?.categoryName);
    const desiredPosition = getFieldValue(flow.cvEditData.desiredWorkLocation, flow.selectedCV?.desiredWorkLocation, flow.selectedCV?.desiredLocation, flow.selectedCV?.desiredPosition);
    const currentSalary = getFieldValue(flow.cvEditData.currentIncome, flow.selectedCV?.currentIncome, flow.selectedCV?.currentSalary);
    const desiredSalary = getFieldValue(flow.cvEditData.desiredIncome, flow.selectedCV?.desiredIncome, flow.selectedCV?.desiredSalary);
    const japaneseLevel = getFieldValue(flow.cvEditData.jpLevel, flow.selectedCV?.jpLevel, flow.selectedCV?.japaneseLevel, flow.selectedCV?.n5Level, flow.selectedCV?.languageLevelJp, flow.selectedCV?.jlptLevel);
    const experienceYears = getFieldValue(flow.cvEditData.experienceYears, flow.selectedCV?.experienceYears, flow.selectedCV?.yearsOfExperience, flow.selectedCV?.experienceYear, flow.selectedCV?.workExperienceYears);
    const residenceStatus = getFieldValue(flow.cvEditData.jpResidenceStatus, flow.selectedCV?.jpResidenceStatus, flow.selectedCV?.jp_residence_status, flow.selectedCV?.residenceStatus, flow.selectedCV?.statusResidence, flow.selectedCV?.residence_status, flow.selectedCV?.visaStatus);

    return {
      candidateName,
      jobCategory,
      desiredPosition,
      currentSalary,
      desiredSalary,
      japaneseLevel,
      experienceYears,
      residenceStatus,
    };
  }, [flow.cvEditData, flow.selectedCV]);

  const missingRequiredFields = useMemo(() => {
    const missing = [];
    if (!requiredFields.candidateName) missing.push('candidateName');
    if (!requiredFields.jobCategory) missing.push('jobCategory');
    if (!requiredFields.desiredPosition) missing.push('desiredPosition');
    if (!requiredFields.currentSalary) missing.push('currentSalary');
    if (!requiredFields.desiredSalary) missing.push('desiredSalary');
    if (!requiredFields.japaneseLevel) missing.push('japaneseLevel');
    if (!requiredFields.experienceYears) missing.push('experienceYears');
    const jobResidenceRequirements = normalizeStatusList(flow.job?.residenceStatuses || flow.job?.residence_statuses || flow.job?.residenceStatus || flow.job?.residence_status);
    if (jobResidenceRequirements.length > 0 && missingResidenceStatus) missing.push('residenceStatus');
    return missing;
  }, [requiredFields, flow.job?.residenceStatuses, flow.job?.residence_statuses, flow.job?.residenceStatus, flow.job?.residence_status]);

  const buildConfirmMessage = () => {
    const candidateName = requiredFields.candidateName || 'ứng viên';
    const jobTitle = flow.job ? flow.pickByLanguage(flow.job.title, flow.job.titleEn || flow.job.title_en, flow.job.titleJp || flow.job.title_jp) : 'job';
    const cvLabel = selectedFolderPath ? selectedFolderPath.split(/[\\/]/).pop() : 'CV';
    return `Xác nhận tiến cử ứng viên ${candidateName} vào job ${jobTitle} với CV ${cvLabel} ?`;
  };

  const isCvEditDirty = useMemo(() => {
    const compare = (a, b) => String(a ?? '').trim() !== String(b ?? '').trim();
    return [
      compare(flow.cvEditData.name, flow.selectedCV?.name || flow.selectedCV?.fullName),
      compare(flow.cvEditData.furigana, flow.selectedCV?.furigana),
      compare(flow.cvEditData.email, flow.selectedCV?.email),
      compare(flow.cvEditData.phone, flow.selectedCV?.phone),
      compare(flow.cvEditData.birthDate, flow.selectedCV?.birthDate),
      compare(flow.cvEditData.age, flow.selectedCV?.ages || flow.selectedCV?.age),
      compare(flow.cvEditData.gender, flow.selectedCV?.gender),
      compare(flow.cvEditData.addressCurrent, flow.selectedCV?.addressCurrent || flow.selectedCV?.address),
      compare(flow.cvEditData.currentIncome, flow.selectedCV?.currentIncome || flow.selectedCV?.currentSalary),
      compare(flow.cvEditData.desiredIncome, flow.selectedCV?.desiredIncome || flow.selectedCV?.desiredSalary),
      compare(flow.cvEditData.desiredWorkLocation, flow.selectedCV?.desiredWorkLocation || flow.selectedCV?.desiredLocation || flow.selectedCV?.desiredPosition),
      compare(flow.cvEditData.nyushaTime, flow.selectedCV?.nyushaTime),
      compare(flow.cvEditData.jpLevel, flow.selectedCV?.jpLevel || flow.selectedCV?.japaneseLevel || flow.selectedCV?.n5Level || flow.selectedCV?.languageLevelJp || flow.selectedCV?.jlptLevel),
      compare(flow.cvEditData.jpResidenceStatus, flow.selectedCV?.jpResidenceStatus || flow.selectedCV?.jp_residence_status || flow.selectedCV?.residenceStatus || flow.selectedCV?.residence_status || flow.selectedCV?.visaStatus),
      compare(flow.cvEditData.jobCategoryId, flow.selectedCV?.jobCategoryId || flow.selectedCV?.job_category_id || flow.selectedCV?.jobCategory?.id),
      compare(flow.cvEditData.jobCategoryName, flow.selectedCV?.jobCategoryName || flow.selectedCV?.jobCategory?.name || flow.selectedCV?.job_category_name || flow.selectedCV?.categoryName),
      compare(flow.cvEditData.strengths, flow.selectedCV?.strengths),
      compare(flow.cvEditData.motivation, flow.selectedCV?.motivation),
    ].some(Boolean);
  }, [flow.cvEditData, flow.selectedCV]);

  const submit = async () => {
    if (missingRequiredFields.length) return;
    setConfirmingSubmit(true);
    try {
      let currentCV = flow.selectedCV;
      if (!flow.isApplicantCandidate && (flow.editingCV || isCvEditDirty)) {
        const saved = await flow.handleSaveCVEdit();
        if (saved === false) {
          alert('Không thể cập nhật hồ sơ trước khi tiến cử');
          return;
        }
        const refreshed = await flow.refreshSelectedCV?.();
        if (refreshed) currentCV = refreshed;
      }
      const currentPath = currentCV?.cvOriginalPath || currentCV?.curriculumVitae || flow.selectedCvFolderPath || '';
      const res = await flow.handleSubmitNomination({
        selectedCV: currentCV,
        selectedCvFolderPath: currentPath,
      });
      if (res?.success) {
        setShowConfirmModal(false);
        alert('Thành công');
        navigate(flow.backUrl);
      } else {
        alert(res?.message || 'Không thể gửi');
      }
    } finally {
      setConfirmingSubmit(false);
    }
  };

  const handleQuickEdit = () => {
    if (!flow.selectedCV?.id) return;
    const editPath = flow.isAdmin
      ? `/admin/candidates/${flow.selectedCV.id}/edit`
      : `/agent/candidates/${flow.selectedCV.id}/edit`;
    navigate(editPath, {
      state: {
        returnTo: location.pathname,
        returnState: location.state || {},
        fromConfirm: true,
        jobId: flow.jobId,
      },
    });
  };

  const cvFolderOptions = useMemo(() => {
    const options = [];
    if (flow.selectedCV?.cvOriginalPath) {
      options.push({
        id: 'original',
        label: 'CV_original',
        path: flow.selectedCV.cvOriginalPath,
        kind: 'original',
      });
    }
    if (flow.selectedCV?.curriculumVitae) {
      const templates = (flow.cvFileList.templates || [])
        .map((item) => item?.template)
        .filter((value, index, arr) => value && arr.indexOf(value) === index);
      templates.forEach((template) => {
        options.push({
          id: `template-${template}`,
          label: `CV_Template / ${template}`,
          path: `${flow.selectedCV.curriculumVitae}/${template}`,
          kind: 'template',
          template,
        });
      });
    }
    return options;
  }, [flow.selectedCV, flow.cvFileList]);

  if (!flow.selectedCV) return <div className="p-6 text-sm text-gray-500">Đang tải...</div>;

  const asText = (value) => {
    if (value == null || value === '') return '—';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(asText).filter((x) => x && x !== '—').join('\n') || '—';
    if (typeof value === 'object') {
      return value.content || value.contentVi || value.contentEn || value.contentJp || value.label || value.name || value.title || JSON.stringify(value);
    }
    return '—';
  };
  const salaryFieldToText = (value) => {
    const seen = new WeakSet();
    const walk = (input, depth = 0) => {
      if (input == null || input === '') return [];
      if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
        const str = String(input).trim();
        return str && str !== '—' ? [str] : [];
      }
      if (Array.isArray(input)) {
        return input.flatMap((item) => walk(item, depth + 1));
      }
      if (typeof input === 'object') {
        if (seen.has(input) || depth > 4) return [];
        seen.add(input);
        const keywordRegex = /salary|income|wage|compensation|remuneration|pay|allowance|annual|monthly|month|year|thu.?nhập|lương/i;
        const orderedKeys = [
          'salaryDetail', 'salaryContent', 'salaryContentVi', 'salaryContentEn', 'salaryContentJp',
          'estimatedSalary', 'salary', 'salaryRange', 'salaryInfo', 'salaryData',
          'annualSalary', 'monthlySalary', 'salaryYear', 'salaryMonth', 'salaryAnnual', 'salaryMonthly',
          'annualIncome', 'monthlyIncome', 'incomeYear', 'incomeMonth', 'yearlyIncome', 'monthlyWage',
          'min', 'max', 'from', 'to', 'value', 'amount', 'content', 'label', 'title', 'name',
        ];
        const collected = [];
        for (const key of orderedKeys) {
          if (input[key] != null && input[key] !== '') collected.push(...walk(input[key], depth + 1));
        }
        if (collected.length) return collected;
        const entries = Object.entries(input)
          .filter(([key, v]) => keywordRegex.test(key) && v != null && v !== '')
          .flatMap(([, v]) => walk(v, depth + 1));
        if (entries.length) return entries;
        return Object.entries(input)
          .flatMap(([, v]) => walk(v, depth + 1));
      }
      return [];
    };
    const result = walk(value)
      .map((x) => String(x).trim())
      .filter((x, idx, arr) => x && arr.indexOf(x) === idx);
    return result.length ? result.join('\n') : '—';
  };
  const experienceText = asText(flow.selectedCV?.workHistory || flow.selectedCV?.experience || flow.selectedCV?.careerHistory);
  const certificatesText = asText(flow.selectedCV?.certificates || flow.selectedCV?.certificate || flow.selectedCV?.licenses);
  const skillsText = asText(flow.selectedCV?.skills || flow.selectedCV?.skill || flow.selectedCV?.strengths);
  const jobDescription = asText(flow.job?.description || flow.job?.jobDescription || flow.job?.content);
  const jobRequirements = asText(flow.job?.requirements || flow.job?.mustHave || flow.job?.requiredSkills || flow.job?.mandatoryRequirements);
  const jobSalaryDetail = salaryFieldToText(flow.job?.salaryDetail || flow.job?.salaryContent || flow.job?.salaryContentVi || flow.job?.salaryContentEn || flow.job?.salaryContentJp);
  const jobSalary = salaryFieldToText(flow.job?.estimatedSalary || flow.job?.salary || flow.job?.salaryRange || flow.job?.salaryInfo || flow.job?.salaryData);
  const job = flow.job;
  const rawResidenceStatuses = flow.job?.residenceStatuses || flow.job?.residence_statuses || flow.job?.residenceStatus || flow.job?.residence_status;
  const residenceStatusTags = (() => {
    const normalizeValues = (input) => {
      if (Array.isArray(input)) return input;
      if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            return trimmed.split(',');
          }
        }
        return trimmed.split(',');
      }
      return input ? [input] : [];
    };
    return normalizeValues(rawResidenceStatuses)
      .map((item) => (typeof item === 'object' && item ? (item.value || item.vi || item.en || item.ja) : item))
      .map((item) => String(item).replace(/["'\[\]]/g, '').trim())
      .filter(Boolean)
      .map((raw) => {
        const value = normalizeResidenceStatusValue(raw);
        const opt = RESIDENCE_STATUS_OPTIONS.find((o) => o.value === value);
        return { value, label: opt ? getResidenceStatusLabel(opt, flow.language || 'vi') : raw };
      });
  })();

  const confirmFieldClass = (hasValue) => `rounded-xl border p-3 text-[10px] ${hasValue ? 'border-gray-200 bg-white' : 'border-red-300 bg-red-50'}`;
  const confirmFieldLabelClass = (hasValue) => `font-semibold mb-1 ${hasValue ? 'text-gray-500' : 'text-red-700'}`;
  const renderModalEditableField = ({ id, label, value, missing = false, warning = false, warningText = '', type = 'text', options = [], onOpenPicker = null }) => {
    const showValue = value ?? '';
    const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
    return (
      <div key={id} className={confirmFieldClass(!missing)}>
        <p className={confirmFieldLabelClass(!missing)}>{label}</p>
        {type === 'select' ? (
          <select
            className={inputClass}
            value={showValue}
            onChange={(e) => confirmEditValue(id, e.target.value)}
          >
            <option value="">—</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : onOpenPicker ? (
          <button type="button" onClick={onOpenPicker} className="w-full flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-[10px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
            <span className="flex items-center gap-2 min-w-0">
              <ListTree className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              <span className="truncate text-gray-800">{showValue || 'Chọn ngành nghề'}</span>
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          </button>
        ) : (
          <input
            className={inputClass}
            type={type}
            value={showValue}
            onChange={(e) => confirmEditValue(id, e.target.value)}
          />
        )}
        {missing && <p className="mt-1 text-red-600 font-semibold">Thiếu dữ liệu, vui lòng bổ sung.</p>}
        {!missing && warning && <p className="mt-1 text-amber-600 font-semibold">{warningText}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 border bg-white border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Folder className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-gray-900">Danh sách CV</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cvFolderOptions.map((opt) => {
            const checked = selectedFolderPath === opt.path;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedFolderPath(opt.path)}
                className="text-left rounded-xl border p-3 transition-all"
                style={{
                  backgroundColor: checked ? '#eff6ff' : 'white',
                  borderColor: checked ? '#60a5fa' : '#e5e7eb',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef3c7' }}>
                    <Folder className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-gray-900 truncate">{opt.label}</p>
                      <div className="flex-shrink-0 text-blue-600">{checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}</div>
                    </div>
                    <p className="text-[10px] text-gray-500 truncate mt-1">{opt.path}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl p-5 border bg-white border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-base font-bold text-gray-900">Thông tin ứng viên</h2>
            </div>
            {!flow.isApplicantCandidate && !flow.editingCV ? (
              <button onClick={handleQuickEdit} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-blue-600 text-white flex items-center gap-1.5">
                <Edit className="w-3.5 h-3.5" />Sửa nhanh
              </button>
            ) : null}
          </div>

          <div className="space-y-4 text-[10px]">
            <div>
              <p className="font-semibold text-gray-500 mb-1">Họ tên</p>
              <p className="text-gray-900">{flow.cvEditData.name || flow.selectedCV.name || '—'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="font-semibold text-gray-500 mb-1">Email</p>
                <p className="flex items-center gap-1 text-gray-900"><Mail className="w-3.5 h-3.5 text-gray-400" />{flow.cvEditData.email || flow.selectedCV.email || '—'}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-500 mb-1">Số điện thoại</p>
                <p className="flex items-center gap-1 text-gray-900"><Phone className="w-3.5 h-3.5 text-gray-400" />{flow.cvEditData.phone || flow.selectedCV.phone || '—'}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-500 mb-1">Ngày sinh</p>
                <p className="flex items-center gap-1 text-gray-900"><Calendar className="w-3.5 h-3.5 text-gray-400" />{flow.formatDate(flow.cvEditData.birthDate || flow.selectedCV.birthDate)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-500 mb-1">Địa chỉ</p>
                <p className="flex items-center gap-1 text-gray-900"><MapPin className="w-3.5 h-3.5 text-gray-400" />{flow.cvEditData.addressCurrent || flow.selectedCV.addressCurrent || flow.selectedCV.address || '—'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-blue-700 flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" />Thông tin mong muốn của ứng viên</p>
                {!flow.isApplicantCandidate && !flow.editingCV && (
                  <button onClick={() => flow.setEditingCV(true)} className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-white text-blue-700 border border-blue-200">Sửa</button>
                )}
              </div>

              {flow.editingCV ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-hidden">
                  <div>
                    <p className="font-semibold text-gray-500 mb-1">Lương mong muốn</p>
                    <input
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[10px] bg-white"
                      value={flow.cvEditData.desiredIncome || ''}
                      onChange={(e) => flow.setCvEditData((prev) => ({ ...prev, desiredIncome: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500 mb-1">Địa điểm mong muốn</p>
                    <input
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[10px] bg-white"
                      value={flow.cvEditData.desiredWorkLocation || ''}
                      onChange={(e) => flow.setCvEditData((prev) => ({ ...prev, desiredWorkLocation: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500 mb-1">Thời gian nhập công ty</p>
                    <input
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[10px] bg-white"
                      value={flow.cvEditData.nyushaTime || ''}
                      onChange={(e) => flow.setCvEditData((prev) => ({ ...prev, nyushaTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500 mb-1">Giới tính</p>
                    <select
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[10px] bg-white"
                      value={flow.cvEditData.gender || ''}
                      onChange={(e) => flow.setCvEditData((prev) => ({ ...prev, gender: e.target.value }))}
                    >
                      <option value="">—</option>
                      <option value="1">Nam</option>
                      <option value="2">Nữ</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="font-semibold text-gray-500 mb-1">Lương mong muốn</p>
                    <p className="text-gray-900">{flow.cvEditData.desiredIncome || flow.selectedCV.desiredIncome || '—'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500 mb-1">Địa điểm mong muốn</p>
                    <p className="text-gray-900">{flow.cvEditData.desiredWorkLocation || flow.selectedCV.desiredWorkLocation || '—'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500 mb-1">Thời gian nhập công ty</p>
                    <p className="text-gray-900">{flow.cvEditData.nyushaTime || flow.selectedCV.nyushaTime || '—'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500 mb-1">Giới tính</p>
                    <p className="text-gray-900">{flow.formatGender(flow.cvEditData.gender || flow.selectedCV.gender)}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <p className="font-semibold text-gray-500 mb-1 flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5" />Chứng chỉ</p>
              <p className="text-gray-900 whitespace-pre-wrap">{certificatesText}</p>
            </div>

            <div>
              <p className="font-semibold text-gray-500 mb-1 flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />Kĩ năng</p>
              <p className="text-gray-900 whitespace-pre-wrap">{skillsText}</p>
            </div>

            <div>
              <p className="font-semibold text-gray-500 mb-1 flex items-center gap-1"><BriefcaseBusiness className="w-3.5 h-3.5" />Lịch sử công việc</p>
              <p className="text-gray-900 whitespace-pre-wrap">{experienceText}</p>
            </div>

            {!flow.isApplicantCandidate && flow.editingCV && (
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => flow.setEditingCV(false)} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-gray-100 text-gray-700 flex items-center gap-1"><X className="w-3.5 h-3.5" />Hủy</button>
                <button onClick={flow.handleSaveCVEdit} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-green-500 text-white flex items-center gap-1"><Save className="w-3.5 h-3.5" />Lưu</button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl p-5 border bg-white border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="w-6 h-6 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">Thông tin công việc</h2>
          </div>

          {residenceStatusTags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {residenceStatusTags.map((tag) => (
                <span key={tag.value} className="px-2 py-1 rounded-full text-[10px] font-semibold border" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-4 text-[10px]">
            <div>
              <p className="font-semibold text-gray-500 mb-1">Tiêu đề</p>
              <p className="text-gray-900 font-medium">{flow.job ? flow.pickByLanguage(flow.job.title, flow.job.titleEn || flow.job.title_en, flow.job.titleJp || flow.job.title_jp) : '—'}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-1">Mô tả</p>
              <p className="text-gray-900 whitespace-pre-wrap">{jobDescription}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-1">Yêu cầu bắt buộc</p>
              <p className="text-gray-900 whitespace-pre-wrap">{jobRequirements}</p>
            </div>
            {job?.workLocation && (
              <div>
                <p className="font-semibold text-gray-500 mb-1">Địa điểm làm việc</p>
                <p className="text-gray-900 whitespace-pre-wrap">{job.workLocation}</p>
              </div>
            )}
            {(jobSalaryDetail !== '—' || jobSalary !== '—') && (
              <div>
                <p className="font-semibold text-gray-500 mb-1">Chi tiết mức lương</p>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {jobSalaryDetail !== '—' ? jobSalaryDetail : jobSalary}
                </p>
              </div>
            )}
            {jobSalary !== '—' && jobSalaryDetail === '—' && (
              <div>
                <p className="font-semibold text-gray-500 mb-1">Mức lương</p>
                <p className="text-gray-900 whitespace-pre-wrap">{jobSalary}</p>
              </div>
            )}
            {(job?.recruitingCompany?.companyName || job?.recruitingCompany?.companyNameEn || job?.recruitingCompany?.companyNameJp || job?.recruitingCompany?.company_name_en || job?.recruitingCompany?.company_name_jp) && (
              <div>
                <p className="font-semibold text-gray-500 mb-1">Công ty tuyển dụng</p>
                <p className="text-gray-900">
                  {flow.pickByLanguage(
                    job.recruitingCompany?.companyName || job.recruitingCompany?.name,
                    job.recruitingCompany?.companyNameEn || job.recruitingCompany?.company_name_en,
                    job.recruitingCompany?.companyNameJp || job.recruitingCompany?.company_name_jp
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-4 border flex items-center justify-end gap-3 bg-white border-gray-200">
        <button onClick={() => navigate(-1)} className="px-4 py-1.5 border rounded-lg text-xs font-medium text-gray-700">Quay lại</button>
        <button onClick={() => setShowConfirmModal(true)} disabled={flow.submitting || flow.editingCV} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-yellow-400 text-blue-800 flex items-center gap-1.5 disabled:opacity-50">
          Xác nhận <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
              aria-label="Đóng popup"
              disabled={confirmingSubmit || flow.submitting}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 pr-16 shrink-0">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Xác nhận tiến cử</p>
                <p className="text-xs text-gray-500">Kiểm tra và bổ sung đủ thông tin trước khi tiến cử</p>
              </div>
            </div>

            <div className="px-5 py-5 space-y-4 text-sm text-gray-800 overflow-y-auto flex-1">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shrink-0">
                <p className="text-xs font-semibold text-gray-500 mb-2">Tóm tắt xác nhận</p>
                <p className="text-sm text-gray-900 leading-6">{buildConfirmMessage()}</p>
                {jobResidenceRequiredValues.length > 0 && (
                  <p className="mt-2 text-xs text-gray-600">
                    Yêu cầu visa: {jobResidenceRequiredValues.map((v) => getResidenceStatusLabel(RESIDENCE_STATUS_OPTIONS.find((opt) => opt.value === v) || { value: v, vi: v, en: v, ja: v }, flow.language || 'vi')).join(', ')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                {renderModalEditableField({
                  id: 'name',
                  label: 'Họ tên ứng viên',
                  value: flow.cvEditData.name || flow.selectedCV?.name || flow.selectedCV?.fullName || '',
                  missing: !requiredFields.candidateName,
                })}
                {renderModalEditableField({
                  id: 'jobCategoryName',
                  label: 'Ngành nghề',
                  value: flow.cvEditData.jobCategoryName || flow.selectedCV?.jobCategoryName || flow.selectedCV?.jobCategory?.name || flow.selectedCV?.job_category_name || flow.selectedCV?.categoryName || '',
                  missing: !requiredFields.jobCategory,
                  onOpenPicker: () => setJobCategoryModalOpen(true),
                })}
                {renderModalEditableField({
                  id: 'desiredWorkLocation',
                  label: 'Vị trí mong muốn',
                  value: flow.cvEditData.desiredWorkLocation || flow.selectedCV?.desiredWorkLocation || flow.selectedCV?.desiredLocation || flow.selectedCV?.desiredPosition || '',
                  missing: !requiredFields.desiredPosition,
                })}
                {renderModalEditableField({
                  id: 'currentIncome',
                  label: 'Lương hiện tại',
                  value: flow.cvEditData.currentIncome || flow.selectedCV?.currentIncome || flow.selectedCV?.currentSalary || '',
                  missing: !requiredFields.currentSalary,
                })}
                {renderModalEditableField({
                  id: 'desiredIncome',
                  label: 'Lương mong muốn',
                  value: flow.cvEditData.desiredIncome || flow.selectedCV?.desiredIncome || flow.selectedCV?.desiredSalary || '',
                  missing: !requiredFields.desiredSalary,
                })}
                {renderModalEditableField({
                  id: 'jpLevel',
                  label: 'Trình độ tiếng Nhật',
                  value: getFieldValue(flow.cvEditData.jpLevel, flow.selectedCV?.jpLevel, flow.selectedCV?.japaneseLevel, flow.selectedCV?.n5Level, flow.selectedCV?.languageLevelJp, flow.selectedCV?.jlptLevel),
                  missing: !requiredFields.japaneseLevel,
                  type: 'select',
                  options: [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `N${n}` })),
                })}
                {renderModalEditableField({
                  id: 'experienceYears',
                  label: 'Số năm kinh nghiệm',
                  value: getFieldValue(flow.cvEditData.experienceYears, flow.selectedCV?.experienceYears, flow.selectedCV?.yearsOfExperience, flow.selectedCV?.experienceYear, flow.selectedCV?.workExperienceYears),
                  missing: !requiredFields.experienceYears,
                })}
                {renderModalEditableField({
                  id: 'jpResidenceStatus',
                  label: 'Tư cách lưu trú',
                  value: currentResidenceStatusValue,
                  missing: missingResidenceStatus,
                  warning: residenceStatusMismatch,
                  warningText: `Visa hiện tại không khớp với yêu cầu công việc (${jobResidenceRequiredValues.map((v) => getResidenceStatusLabel(RESIDENCE_STATUS_OPTIONS.find((opt) => opt.value === v) || { value: v, vi: v, en: v, ja: v }, flow.language || 'vi')).join(', ')})`,
                  type: 'select',
                  options: RESIDENCE_STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: getResidenceStatusLabel(opt, flow.language || 'vi') })),
                })}
              </div>

            </div>

            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={submit}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white disabled:opacity-50"
                disabled={confirmingSubmit || flow.submitting || missingRequiredFields.length > 0}
              >
                {confirmingSubmit || flow.submitting ? 'Đang tạo đơn...' : 'Xác nhận tiến cử'}
              </button>
            </div>
          </div>
        </div>
      )}

      <JobCategoryPickerModal
        open={jobCategoryModalOpen}
        onClose={() => setJobCategoryModalOpen(false)}
        useAdminAPI={flow.isAdmin}
        language={flow.language}
        initialLeafId={flow.cvEditData.jobCategoryId || null}
        onConfirm={({ id, displayName }) => {
          flow.setCvEditData((prev) => ({
            ...prev,
            jobCategoryId: id != null ? String(id) : '',
            jobCategoryName: displayName || '',
          }));
        }}
      />
    </div>
  );
};

export default NominationConfirmPage;
