import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Calendar, Upload, X, ChevronDown, ListTree } from 'lucide-react';
import apiService from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import JobCategoryPickerModal from './JobCategoryPickerModal.jsx';
import { CV_ORIGINAL_ACCEPT, isSupportedCvOriginalFile } from '../../utils/cvOriginalFileTypes.js';

const jlptOptions = [
  { value: '', labelKey: 'addCandidateSelectJlpt', fallback: 'Chọn JLPT' },
  { value: '1', labelKey: 'addCandidateJlptN1', fallback: 'N1' },
  { value: '2', labelKey: 'addCandidateJlptN2', fallback: 'N2' },
  { value: '3', labelKey: 'addCandidateJlptN3', fallback: 'N3' },
  { value: '4', labelKey: 'addCandidateJlptN4', fallback: 'N4' },
  { value: '5', labelKey: 'addCandidateJlptN5', fallback: 'N5' },
];

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isValidPhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return true; // phone optional
  if (!/^\+?[0-9()\-\s.]{8,20}$/.test(raw)) return false;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function toDateInputValue(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getFileDisplayName(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const normalized = value.replace(/\\/g, '/').split('?')[0];
    const parts = normalized.split('/').filter(Boolean);
    return parts[parts.length - 1] || normalized;
  }
  if (typeof value === 'object') {
    return (
      value.name ||
      value.fileName ||
      value.downloadFileName ||
      value.originalName ||
      value.path ||
      ''
    );
  }
  return String(value);
}

export default function QuickCreateCandidateDrawer({
  open,
  onClose,
  onCreated,
  jobId = null,
  candidateId = null,
  initialCandidate = null,
  initialCvFile = null,
  mode = 'create',
  onUpdated,
}) {
  const maxCvBytes = 40 * 1024 * 1024;
  const cvFileInputRef = useRef(null);
  const shokumuFileInputRef = useRef(null);
  const notify = useNotification();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const isEditMode = mode === 'edit' || !!candidateId;
  const [saving, setSaving] = useState(false);
  const [jobCategoryModalOpen, setJobCategoryModalOpen] = useState(false);
  const [form, setForm] = useState({
    nameKanji: '',
    birthDate: '',
    email: '',
    phone: '',
    jlptLevel: '',
    experienceYears: '',
    jobCategoryId: '',
    jobCategoryLabel: '',
    currentSalary: '',
    desiredSalary: '',
    desiredPosition: '',
    desiredLocation: '',
    desiredStartDate: '',
    jpResidenceStatus: '',
  });
  const [cvFile, setCvFile] = useState(null);
  const [existingCvFileName, setExistingCvFileName] = useState('');
  const [shokumuFile, setShokumuFile] = useState(null);
  const [createdCv, setCreatedCv] = useState(null);
  const [showPostCreatePrompt, setShowPostCreatePrompt] = useState(false);
  const [postCreateFields, setPostCreateFields] = useState({
    technicalSkills: '',
    currentSalary: '',
    desiredSalary: '',
    desiredPosition: '',
    desiredStartDate: '',
  });
  const [postCreateSaving, setPostCreateSaving] = useState(false);
  const [editSupplementFields, setEditSupplementFields] = useState({
    technicalSkills: '',
    currentSalary: '',
    desiredSalary: '',
    desiredPosition: '',
    desiredStartDate: '',
  });
  const [errors, setErrors] = useState({});
  const [showValidationPopup, setShowValidationPopup] = useState(false);

  const drawerTitle = isEditMode
    ? (t.addCandidateTitleEdit || t.quickCreateDrawerTitleNominate || t.quickCreateDrawerTitle || 'Bổ sung thông tin hồ sơ')
    : (jobId
      ? (t.quickCreateDrawerTitleNominate || t.addCandidateNominate || t.addCandidateTitleEdit || 'Tạo hồ sơ nhanh để tiến cử')
      : (t.quickCreateDrawerTitle || t.addCandidateTitleNew || 'Tạo hồ sơ nhanh'));

  const residenceStatusOptions = useMemo(() => ([
    { value: '3', vi: 'Visa du học', en: 'Student Visa', ja: '留学' },
    { value: '1', vi: 'Visa kỹ sư / tri thức nhân văn / nghiệp vụ quốc tế', en: 'Engineer / Specialist in Humanities / International Services', ja: '技術・人文知識・国際業務' },
    { value: '2', vi: 'Visa kỹ năng đặc định', en: 'Specified Skilled Worker', ja: '特定技能' },
    { value: '9', vi: 'Visa kỹ năng (lao động tay nghề)', en: 'Skilled Worker', ja: '技能' },
    { value: '8', vi: 'Visa lao động trình độ cao', en: 'Highly Skilled Professional', ja: '高度専門職' },
    { value: '12', vi: 'Visa chuyển công tác nội bộ', en: 'Intra-company Transferee', ja: '企業内転勤' },
    { value: '13', vi: 'Visa biểu diễn / giải trí', en: 'Entertainer', ja: '興行' },
    { value: '14', vi: 'Visa thực tập sinh kỹ năng', en: 'Technical Intern Training', ja: '技能実習' },
    { value: '10', vi: 'Visa gia đình (phụ thuộc)', en: 'Dependent Visa', ja: '家族滞在' },
    { value: '5', vi: 'Visa vợ/chồng người Nhật', en: 'Spouse or Child of Japanese National', ja: '日本人の配偶者等' },
    { value: '15', vi: 'Visa vợ/chồng của người vĩnh trú', en: 'Spouse or Child of Permanent Resident', ja: '永住者の配偶者等' },
    { value: '6', vi: 'Visa cư trú dài hạn', en: 'Long-term Resident', ja: '定住者' },
    { value: '4', vi: 'Visa vĩnh trú', en: 'Permanent Resident', ja: '永住者' },
    { value: '11', vi: 'Visa ngắn hạn', en: 'Temporary Visitor', ja: '短期滞在' },
    { value: '7', vi: 'Không yêu cầu', en: 'No requirement', ja: '不要' },
  ]), []);

  const getResidenceStatusLabel = (opt) => {
    if (language === 'en') return opt.en;
    if (language === 'ja') return opt.ja;
    return opt.vi;
  };

  const countryOptions = useMemo(() => ([
    { value: '日本', label: t.addCandidateJapan || 'Nhật Bản' },
    { value: 'ベトナム', label: t.addCandidateVietnam || 'Việt Nam' },
    { value: 'その他', label: t.addCandidateOtherCountryLabel || 'Quốc gia khác' },
  ]), [t]);

  const jlptOptionLabels = useMemo(() => ({
    '': t.addCandidateSelectJlpt || 'JLPTを選択',
    '1': t.addCandidateJlptN1 || 'N1',
    '2': t.addCandidateJlptN2 || 'N2',
    '3': t.addCandidateJlptN3 || 'N3',
    '4': t.addCandidateJlptN4 || 'N4',
    '5': t.addCandidateJlptN5 || 'N5',
  }), [t]);

  const defaultResidenceStatusLabel = t.addCandidateNoRequirement || 'Không yêu cầu';
  const currentLocationLabel = t.addCandidateCurrentLocationCountry || t.addCandidateLocationCountry || 'Địa điểm hiện tại';

  useEffect(() => {
    if (!open || !isEditMode || !initialCandidate) return;
    setForm((prev) => ({
      ...prev,
      nameKanji: initialCandidate.nameKanji || prev.nameKanji,
      birthDate: initialCandidate.birthDate || prev.birthDate,
      email: initialCandidate.email || prev.email,
      phone: initialCandidate.phone || prev.phone,
      jlptLevel: initialCandidate.jlptLevel || prev.jlptLevel,
      experienceYears: initialCandidate.experienceYears || prev.experienceYears,
      jobCategoryId: initialCandidate.jobCategoryId || prev.jobCategoryId,
      jobCategoryLabel: initialCandidate.jobCategoryLabel || prev.jobCategoryLabel,
      currentSalary: initialCandidate.currentSalary || prev.currentSalary,
      desiredSalary: initialCandidate.desiredSalary || prev.desiredSalary,
      desiredPosition: initialCandidate.desiredPosition || prev.desiredPosition,
      desiredLocation: initialCandidate.desiredLocation || prev.desiredLocation,
      desiredStartDate: initialCandidate.desiredStartDate || prev.desiredStartDate,
      jpResidenceStatus: initialCandidate.jpResidenceStatus || prev.jpResidenceStatus,
    }));
  }, [open, isEditMode, initialCandidate]);

  useEffect(() => {
    if (!open) return;
    if (initialCvFile && typeof initialCvFile === 'object' && initialCvFile instanceof File) {
      setCvFile(initialCvFile);
      setExistingCvFileName('');
      return;
    }
    if (initialCvFile && typeof initialCvFile === 'object') {
      setCvFile(null);
      setExistingCvFileName(getFileDisplayName(initialCvFile));
      return;
    }
    if (typeof initialCvFile === 'string') {
      setCvFile(null);
      setExistingCvFileName(getFileDisplayName(initialCvFile));
      return;
    }
    setCvFile(null);
    setExistingCvFileName('');
  }, [open, initialCvFile]);

  useEffect(() => {
    if (!open) return;
    if (!isEditMode) return;
    setEditSupplementFields({
      technicalSkills: initialCandidate?.technicalSkills || '',
      currentSalary: initialCandidate?.currentSalary || '',
      desiredSalary: initialCandidate?.desiredSalary || '',
      desiredPosition: initialCandidate?.desiredPosition || '',
      desiredStartDate: initialCandidate?.desiredStartDate || '',
    });
  }, [open, isEditMode, initialCandidate]);

  if (!open) return null;

  const resetState = () => {
    setForm({
      nameKanji: '',
      birthDate: '',
      email: '',
      phone: '',
      jlptLevel: '',
      experienceYears: '',
      jobCategoryId: '',
      jobCategoryLabel: '',
      currentSalary: '',
      desiredSalary: '',
      desiredPosition: '',
      desiredLocation: '',
      desiredStartDate: '',
      jpResidenceStatus: '',
    });
    setCvFile(null);
    setShokumuFile(null);
    setErrors({});
    setShowValidationPopup(false);
    setSaving(false);
    setCreatedCv(null);
    setShowPostCreatePrompt(false);
    setPostCreateSaving(false);
    setPostCreateFields({
      technicalSkills: '',
      currentSalary: '',
      desiredSalary: '',
      desiredPosition: '',
      desiredLocation: '',
      desiredStartDate: '',
    });
    setEditSupplementFields({
      technicalSkills: '',
      currentSalary: '',
      desiredSalary: '',
      desiredPosition: '',
      desiredStartDate: '',
    });
  };

  const handleClose = () => {
    resetState();
    onClose?.();
  };

  const validate = () => {
    const next = {};
    if (!String(form.nameKanji || '').trim()) next.nameKanji = t.requiredFields || 'Vui lòng nhập họ tên';
    if (!String(form.email || '').trim()) next.email = t.requiredFields || 'Vui lòng nhập email';
    else if (!isValidEmail(form.email)) next.email = t.invalidEmail || 'Email không hợp lệ';
    // Only name, email, and CV are required in quick create.
    if (!isEditMode) {
      // Removed from quick-create step: currentSalary, desiredSalary, desiredPosition, desiredStartDate.
    }
    if (!cvFile && !existingCvFileName) next.cvFile = t.addCandidateUploadCvFile || 'Vui lòng tải file CV';
    else if (cvFile) {
      if (!isSupportedCvOriginalFile(cvFile)) {
        next.cvFile =
          t.invalidOriginalFile || 'Vui lòng chọn file PDF, Word, Excel, PowerPoint, ảnh (JPG/PNG/...), TXT, RTF hoặc ODT/ODS';
      } else if (cvFile.size > maxCvBytes) {
        next.cvFile = t.fileTooLarge || 'File CV tối đa 40MB';
      }
    }

    if (form.phone && !isValidPhone(form.phone)) next.phone = t.invalidPhone || 'Số điện thoại không hợp lệ';

    if (shokumuFile) {
      if (!isSupportedCvOriginalFile(shokumuFile)) {
        next.shokumuFile =
          t.invalidOriginalFile || 'Vui lòng chọn file PDF, Word, Excel, PowerPoint, ảnh (JPG/PNG/...), TXT, RTF hoặc ODT/ODS';
      } else if (shokumuFile.size > maxCvBytes) {
        next.shokumuFile = t.fileTooLargeShokumu || 'File Shokumu tối đa 40MB';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const getValidationMissingLabels = () => {
    const labels = [];
    if (errors.nameKanji) labels.push(t.addCandidateNameKanji || 'Họ tên');
    if (errors.birthDate) labels.push(t.addCandidateBirthDate || 'Ngày tháng năm sinh');
    if (errors.email) labels.push(t.addCandidateEmail || 'Email');
    if (errors.phone) labels.push(t.addCandidatePhone || 'Số điện thoại');
    if (errors.jobCategoryId) labels.push(t.jobCategoryLabel || 'Ngành nghề');
    if (errors.desiredLocation) labels.push(currentLocationLabel || 'Địa điểm hiện tại');
    if (errors.jpResidenceStatus) labels.push(t.jpResidenceStatus || 'Tư cách lưu trú');
    if (errors.jlptLevel) labels.push(t.addCandidateSelectJlpt || 'JLPT');
    if (errors.experienceYears) labels.push(t.experienceYears || 'Số năm kinh nghiệm');
    if (errors.cvFile) labels.push(t.cvFile || 'File CV');
    if (errors.shokumuFile) labels.push(t.addCandidateShokumuLabel || 'Shokumu');
    return labels;
  };

  const createPayload = () => {
    const fd = new FormData();
    fd.append('quickCreate', '1');
    fd.append('skipPdfGeneration', '1');
    fd.append('nameKanji', form.nameKanji || '');
    fd.append('birthDate', form.birthDate || '');
    fd.append('email', form.email || '');
    fd.append('phone', form.phone || '');
    fd.append('jlptLevel', form.jlptLevel || '');
    fd.append('experienceYears', form.experienceYears || '');
    fd.append('jobCategoryId', form.jobCategoryId || '');
    fd.append('currentSalary', form.currentSalary || '');
    fd.append('desiredSalary', form.desiredSalary || '');
    fd.append('desiredPosition', form.desiredPosition || '');
    fd.append('address', form.desiredLocation || '');
    fd.append('desiredStartDate', form.desiredStartDate || '');
    fd.append('jpResidenceStatus', form.jpResidenceStatus || '');
    if (cvFile) fd.append('cvFile', cvFile);
    if (shokumuFile) fd.append('cvFile', shokumuFile);
    return fd;
  };

  const handleCvFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setCvFile(f);
    setErrors((prev) => ({ ...prev, cvFile: undefined }));
    e.target.value = '';
  };

  const handleShokumuFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setShokumuFile(f);
    setErrors((prev) => ({ ...prev, shokumuFile: undefined }));
    e.target.value = '';
  };

  const handleLocationChange = (value) => {
    setForm((prev) => {
      const next = { ...prev, desiredLocation: value };
      if (value === '日本') {
        if (!next.jpResidenceStatus || next.jpResidenceStatus === '7') next.jpResidenceStatus = '';
      } else if (value === 'ベトナム' || value === 'その他') {
        next.jpResidenceStatus = '7';
      }
      return next;
    });
  };

  const removeCvFile = () => {
    setCvFile(null);
    setExistingCvFileName('');
    if (cvFileInputRef.current) cvFileInputRef.current.value = '';
  };

  const removeShokumuFile = () => {
    setShokumuFile(null);
    if (shokumuFileInputRef.current) shokumuFileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (saving) return;
    const ok = validate();
    if (!ok) {
      setShowValidationPopup(true);
      return;
    }
    setSaving(true);
    try {
      const payload = createPayload();
      if (isEditMode) {
        payload.set('technicalSkills', editSupplementFields.technicalSkills || '');
        payload.set('currentSalary', editSupplementFields.currentSalary || '');
        payload.set('desiredSalary', editSupplementFields.desiredSalary || '');
        payload.set('desiredPosition', editSupplementFields.desiredPosition || '');
        payload.set('desiredStartDate', editSupplementFields.desiredStartDate || '');
      }
      const res = isEditMode && candidateId
        ? await apiService.updateCVStorage(candidateId, payload)
        : await apiService.createCVStorage(payload);
      if (!res?.success || !res?.data?.cv) {
        notify.error(res?.message || t.quickCreateCreateFailed || 'Không tạo được hồ sơ');
        return;
      }
      const savedCv = res?.data?.cv || res?.data?.candidate || res?.data || null;
      const createdStatus = Number(savedCv?.status);
      const isDuplicateBlocked = res?.status === 409 || res.data?.duplicateInfo?.blocked;
      const isFailedCreate = createdStatus === 5 || isDuplicateBlocked;

      if (isFailedCreate) {
        setCreatedCv(null);
        setShowPostCreatePrompt(false);
      } else {
        setCreatedCv(savedCv);
        setShowPostCreatePrompt(true);
      }

      if (isEditMode) {
        notify.success(t.saved || 'Đã cập nhật thông tin');
        onUpdated?.(savedCv, res.data?.duplicateInfo || null);
        handleClose();
        return;
      }

      if (isDuplicateBlocked) {
        notify.error(res.message || t.quickCreateDuplicateBlocked || 'Hồ sơ khởi tạo thất bại vì thông tin đã trùng với hồ sơ hợp lệ khác.');
      } else if (res.data?.duplicateInfo?.isDuplicate || createdStatus === 5) {
        notify.error(res.message || t.quickCreateCreateFailed || 'Hồ sơ khởi tạo thất bại');
      } else {
        notify.success(t.quickCreateValidProfile || 'Hồ sơ hợp lệ');
      }
      onCreated?.(savedCv, res.data?.duplicateInfo || null);
    } catch (error) {
      const dup = error?.data?.data?.duplicateInfo;
      const blocked = error?.status === 409 && dup?.blocked;
      if (blocked) {
        const ownDup = dup?.ownership === 'same_collaborator' || dup?.reason === 'own_valid_cv_exists';
        if (ownDup) {
          notify.error(
            error?.message ||
            t.quickCreateOwnDuplicateWarning ||
            'Bạn đã có hồ sơ hợp lệ với cùng email hoặc số điện thoại. Vui lòng mở hồ sơ hiện có để chỉnh sửa thay vì tạo mới.'
          );
        } else {
          notify.warning(t.quickCreateSystemDuplicateWarning || 'Hồ sơ bạn tạo đã trùng với hồ sơ khác trong hệ thống. Hãy kiểm tra hoặc liên lạc với admin để được trợ giúp');
        }
      } else {
        notify.error(error?.message || t.quickCreateCreateFailed || 'Không tạo được hồ sơ');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFinishNow = async () => {
    const targetId = isEditMode ? candidateId : createdCv?.id;
    if (!targetId || postCreateSaving) return;

    setPostCreateSaving(true);
    try {
      const updateFd = new FormData();
      updateFd.append('skipPdfGeneration', '1');
      updateFd.append('technicalSkills', isEditMode ? editSupplementFields.technicalSkills || '' : postCreateFields.technicalSkills || '');
      updateFd.append('currentSalary', isEditMode ? editSupplementFields.currentSalary || '' : postCreateFields.currentSalary || '');
      updateFd.append('desiredSalary', isEditMode ? editSupplementFields.desiredSalary || '' : postCreateFields.desiredSalary || '');
      updateFd.append('desiredPosition', isEditMode ? editSupplementFields.desiredPosition || '' : postCreateFields.desiredPosition || '');
      updateFd.append('desired_work_location', postCreateFields.desiredLocation || '');
      updateFd.append('desiredStartDate', isEditMode ? editSupplementFields.desiredStartDate || '' : postCreateFields.desiredStartDate || '');

      const res = await apiService.updateCVStorage(targetId, updateFd);
      if (!res?.success) {
        throw new Error(res?.message || 'Không thể cập nhật thông tin bổ sung');
      }

      notify.success(t.saved || 'Đã cập nhật thông tin bổ sung');
      if (!isEditMode) {
        setCreatedCv(res?.data?.cv || createdCv);
        setShowPostCreatePrompt(false);
      }
      handleClose();
    } catch (error) {
      notify.error(error?.message || 'Không thể cập nhật thông tin bổ sung');
    } finally {
      setPostCreateSaving(false);
    }
  };

  const handleLater = () => {
    handleClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={handleClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col max-h-[100dvh]">
        <div className="flex items-start justify-between px-4 py-3 sm:px-5 sm:py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{drawerTitle}</h2>
            <p className="text-xs text-gray-500 mt-1">
              {t.quickCreateDrawerSubtitle || t.addCandidateQuickCreateSubtitle || 'Nhập nhanh hồ sơ ứng viên rồi hoàn thiện sau.'}
            </p>
          </div>
          <button type="button" onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 pb-28 sm:px-5 sm:pb-24 space-y-4 min-h-0">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">
              {t.addCandidateNameKanji || 'Họ tên'}<span className="text-red-500"> *</span>
            </label>
            <input
              required
              value={form.nameKanji}
              onChange={(e) => setForm((prev) => ({ ...prev, nameKanji: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            {errors.nameKanji ? <p className="mt-1 text-xs text-red-600">{errors.nameKanji}</p> : null}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">
              {t.addCandidateBirthDate || 'Ngày tháng năm sinh'}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={toDateInputValue(form.birthDate)}
                max={toDateInputValue(new Date())}
                onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                className="w-full rounded-lg border pl-10 pr-3 py-2 text-sm appearance-none"
              />
            </div>
            {errors.birthDate ? <p className="mt-1 text-xs text-red-600">{errors.birthDate}</p> : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">
                Email<span className="text-red-500"> *</span>
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">
                {t.addCandidatePhone || 'Số điện thoại'} <span className="font-normal text-gray-500">({t.optional || 'tuỳ chọn'})</span>
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              {errors.phone ? <p className="mt-1 text-xs text-red-600">{errors.phone}</p> : null}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">
              {t.addCandidateIndustry || 'Ngành nghề'}
            </label>
            <button
              type="button"
              onClick={() => setJobCategoryModalOpen(true)}
              className="w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm text-left hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 min-w-0">
                <ListTree className="w-4 h-4 shrink-0 text-blue-600" />
                <span className="truncate text-gray-800">
                  {form.jobCategoryLabel ||
                    (t.addCandidateIndustryPlaceholder || 'Chọn ngành nghề')}
                </span>
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">
                {currentLocationLabel}
              </label>
              <select
                value={form.desiredLocation}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">{t.addCandidateSelect || 'Chọn'}</option>
                {countryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">
                {t.addCandidateResidenceStatus || 'Tư cách lưu trú'}
              </label>
              <select
                value={form.jpResidenceStatus}
                onChange={(e) => setForm((prev) => ({ ...prev, jpResidenceStatus: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                disabled={form.desiredLocation === 'ベトナム' || form.desiredLocation === 'その他'}
              >
                {form.desiredLocation === '日本' ? (
                  <>
                    <option value="">{t.addCandidateSelect || 'Chọn'}</option>
                    {residenceStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{getResidenceStatusLabel(opt)}</option>
                    ))}
                  </>
                ) : (
                  <option value={defaultResidenceStatusLabel}>{defaultResidenceStatusLabel}</option>
                )}
              </select>
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">JLPT</label>
              <select
                value={form.jlptLevel}
                onChange={(e) => setForm((prev) => ({ ...prev, jlptLevel: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {jlptOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{jlptOptionLabels[opt.value] || opt.fallback}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">{t.addCandidateExpYears || 'Số năm kinh nghiệm'}</label>
              <input
                type="number"
                min="0"
                value={form.experienceYears}
                onChange={(e) => setForm((prev) => ({ ...prev, experienceYears: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700">
              {t.addCandidateFileProfile || 'File hồ sơ'}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700">
                  {t.addCandidateCvLabel || 'CV'}<span className="text-red-500"> *</span>
                </label>
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                  <Upload className="w-4 h-4" />
                  <span className="text-center">{cvFile ? (t.addCandidateChangeCvFile || 'Đổi file CV') : (t.addCandidateUploadCvFile || 'Tải lên file CV')}</span>
                  <input
                    ref={cvFileInputRef}
                    type="file"
                    accept={CV_ORIGINAL_ACCEPT}
                    className="hidden"
                    onChange={handleCvFileChange}
                  />
                </label>
                {cvFile ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100">
                    <span className="flex-1 truncate" title={cvFile.name}>{cvFile.name}</span>
                    <span className="text-gray-400 shrink-0">{(cvFile.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      onClick={removeCvFile}
                      className="p-1 rounded-md hover:bg-red-50 text-red-600 shrink-0 border border-transparent hover:border-red-100"
                      aria-label={t.addCandidateRemoveCvFile || 'Xóa file CV'}
                    >
                      <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : existingCvFileName ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-700 bg-blue-50 rounded-lg px-2 py-1.5 border border-blue-100">
                    <span className="flex-1 truncate" title={existingCvFileName}>{existingCvFileName}</span>
                    <span className="text-blue-600 shrink-0">Đã có</span>
                  </div>
                ) : null}
                {errors.cvFile ? <p className="mt-1 text-xs text-red-600">{errors.cvFile}</p> : null}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700">{t.addCandidateShokumuLabel || 'Shokumu'}</label>
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                  <Upload className="w-4 h-4" />
                  <span className="text-center">{shokumuFile ? (t.addCandidateChangeShokumuFile || 'Đổi file Shokumu') : (t.addCandidateUploadShokumuFile || 'Tải lên file Shokumu (tuỳ chọn)')}</span>
                  <input
                    ref={shokumuFileInputRef}
                    type="file"
                    accept={CV_ORIGINAL_ACCEPT}
                    className="hidden"
                    onChange={handleShokumuFileChange}
                  />
                </label>
                {shokumuFile ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100">
                    <span className="flex-1 truncate" title={shokumuFile.name}>{shokumuFile.name}</span>
                    <span className="text-gray-400 shrink-0">{(shokumuFile.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      onClick={removeShokumuFile}
                      className="p-1 rounded-md hover:bg-red-50 text-red-600 shrink-0 border border-transparent hover:border-red-100"
                      aria-label={t.addCandidateRemoveShokumuFile || 'Xóa file Shokumu'}
                    >
                      <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : null}
                {errors.shokumuFile ? <p className="mt-1 text-xs text-red-600">{errors.shokumuFile}</p> : null}
              </div>
            </div>
          </div>

          {isEditMode ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Kỹ năng và mong muốn</h3>
                <p className="mt-1 text-xs text-gray-500">Chỉ hiển thị khi cập nhật hồ sơ.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700">Kỹ năng kỹ thuật</label>
                <textarea
                  value={editSupplementFields.technicalSkills}
                  onChange={(e) => setEditSupplementFields((prev) => ({ ...prev, technicalSkills: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">Lương hiện tại</label>
                  <input
                    value={editSupplementFields.currentSalary}
                    onChange={(e) => setEditSupplementFields((prev) => ({ ...prev, currentSalary: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">Lương mong muốn</label>
                  <input
                    value={editSupplementFields.desiredSalary}
                    onChange={(e) => setEditSupplementFields((prev) => ({ ...prev, desiredSalary: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">Vị trí mong muốn</label>
                  <input
                    value={editSupplementFields.desiredPosition}
                    onChange={(e) => setEditSupplementFields((prev) => ({ ...prev, desiredPosition: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">Ngày bắt đầu mong muốn</label>
                  <input
                    type="date"
                    value={editSupplementFields.desiredStartDate}
                    onChange={(e) => setEditSupplementFields((prev) => ({ ...prev, desiredStartDate: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </form>

        <div
          className="border-t px-4 py-3 sm:px-5 sm:py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 shrink-0 bg-white sticky bottom-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg border text-sm font-medium text-gray-700">
            {t.cancel || 'Hủy'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? (t.saving || 'Đang tạo...') : (t.addCandidateSave || 'Tạo hồ sơ')}
          </button>
        </div>
      </div>

      {showValidationPopup ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Thiếu thông tin</h3>
                <p className="mt-1 text-sm text-gray-600">Vui lòng bổ sung các mục sau trước khi lưu:</p>
              </div>
              <button type="button" onClick={() => setShowValidationPopup(false)} className="rounded-md p-1 hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700 list-disc pl-5">
              {getValidationMissingLabels().map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setShowValidationPopup(false)} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white">
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPostCreatePrompt && createdCv ? (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-4xl p-4 sm:p-6 relative max-h-[90dvh] overflow-y-auto">
            <button type="button" onClick={handleClose} className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-500" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">
              {t.quickCreateIncompleteTitle || 'Hồ sơ của bạn có vẻ chưa hoàn thiện'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {t.quickCreateIncompleteDescription || 'Bạn muốn bổ sung thêm thông tin để AI có thể đưa ra các gợi ý tốt nhất cho bạn nhé.'}
            </p>

            <div className={`mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 ${postCreateSaving ? 'pointer-events-none opacity-70' : ''}`}>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <h4 className="text-sm font-semibold text-gray-900">Thông tin để AI gợi ý tốt hơn</h4>
                <p className="mt-1 text-xs text-gray-500">
                  Vui lòng bổ sung các thông tin bên dưới để hệ thống hiểu rõ hơn nhu cầu của bạn.
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Kỹ năng kỹ thuật <span className="text-gray-500">(活かせる経験・知識・技術)</span></label>
                    <textarea
                      value={postCreateFields.technicalSkills ?? ''}
                      onChange={(e) => setPostCreateFields((prev) => ({ ...prev, technicalSkills: e.target.value ?? '' }))}
                      rows={4}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="Ví dụ: Java, React, quản lý dự án, CAD..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-700">Lương hiện tại <span className="text-gray-500">(現在年収)</span></label>
                      <input
                        value={postCreateFields.currentSalary ?? ''}
                        onChange={(e) => setPostCreateFields((prev) => ({ ...prev, currentSalary: e.target.value ?? '' }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="Ví dụ: 300万円"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-700">Lương mong muốn <span className="text-gray-500">(希望年収)</span></label>
                      <input
                        value={postCreateFields.desiredSalary ?? ''}
                        onChange={(e) => setPostCreateFields((prev) => ({ ...prev, desiredSalary: e.target.value ?? '' }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="Ví dụ: 400万円"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-700">Vị trí mong muốn <span className="text-gray-500">(希望職種)</span></label>
                      <input
                        value={postCreateFields.desiredPosition ?? ''}
                        onChange={(e) => setPostCreateFields((prev) => ({ ...prev, desiredPosition: e.target.value ?? '' }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="Ví dụ: Frontend Engineer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-700">Địa điểm <span className="text-gray-500">(希望勤務地)</span></label>
                      <input
                        value={postCreateFields.desiredLocation ?? ''}
                        onChange={(e) => setPostCreateFields((prev) => ({ ...prev, desiredLocation: e.target.value ?? '' }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="Ví dụ: Tokyo"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold mb-1 text-gray-700">Ngày bắt đầu <span className="text-gray-500">(希望入社日)</span></label>
                      <input
                        type="date"
                        value={postCreateFields.desiredStartDate ?? ''}
                        onChange={(e) => setPostCreateFields((prev) => ({ ...prev, desiredStartDate: e.target.value ?? '' }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5 flex flex-col justify-center">
                <h4 className="text-sm font-semibold text-blue-900">Nhắc nhở</h4>
                <p className="mt-3 text-sm leading-6 text-blue-900/90">
                  Hãy bổ sung các thông tin sau để AI có thể đưa ra các gợi ý tốt nhất cho bạn nhé.
                </p>
                <div className="mt-4 rounded-xl bg-white/70 border border-blue-100 p-3 text-xs leading-5 text-blue-900/80">
                  Càng có nhiều dữ liệu, AI càng dễ gợi ý việc làm phù hợp, mức lương hợp lý và hướng tối ưu hồ sơ của bạn.
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={handleLater} className="px-4 py-2 rounded-lg border text-sm font-medium text-gray-700">
                {t.later || 'Để sau'}
              </button>
              <button
                type="button"
                onClick={handleFinishNow}
                disabled={postCreateSaving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {postCreateSaving ? (t.saving || 'Đang lưu...') : (t.quickCreateFinishNow || 'Hoàn thiện ngay')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <JobCategoryPickerModal
        open={jobCategoryModalOpen}
        onClose={() => setJobCategoryModalOpen(false)}
        useAdminAPI={false}
        language={language}
        initialLeafId={form.jobCategoryId || null}
        onConfirm={({ id, displayName }) => {
          setForm((prev) => ({
            ...prev,
            jobCategoryId: id != null ? String(id) : '',
            jobCategoryLabel: displayName || '',
          }));
        }}
      />
    </>
  );
}
