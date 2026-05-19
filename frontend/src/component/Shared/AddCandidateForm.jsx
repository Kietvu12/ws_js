import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import CvTemplateCommon from './CvTemplateCommon';
import CvTemplateIt from './CvTemplateIt';
import CvTemplateTechnical from './CvTemplateTechnical';
import { formatCvBirthDateJa, normalizeBirthDateToStorage } from '../../utils/cvJpDateDisplay.js';
import 'react-datepicker/dist/react-datepicker.css';
import apiService from '../../services/api';
import {
  SupplementFieldWrap,
  SupplementMarkedText,
  SupplementContextMenu,
} from './CandidateDetailSupplementMarks.jsx';
import { useSupplementMarking } from './useSupplementMarking.js';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { translations } from '../../translations/translations';
import { CV_ORIGINAL_ACCEPT, isSupportedCvOriginalFile } from '../../utils/cvOriginalFileTypes.js';
import {
  ArrowLeft,
  User,
  GraduationCap,
  Briefcase,
  FileText,
  Award,
  UserCircle,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Upload,
  Plus,
  Save,
  X,
  Trash2,
  ChevronDown,
  Download,
  ListTree,
} from 'lucide-react';
import JobCategoryPickerModal from './JobCategoryPickerModal.jsx';
import { downloadBlobAsFile } from '../../utils/safeFileDownload.js';
import {
  arrayBufferToImageDataUrl,
  blobToDataUrl,
  fetchUrlAsImageDataUrl,
  normalizeAvatarDataUrlForCvPreview,
} from '../../utils/avatarDataUrl.js';

const mapPassportToBool = (v) => (v === '有' ? 1 : v === '無' ? 0 : undefined);

/**
 * Form tạo/chỉnh sửa ứng viên – dùng chung cho Agent và Admin.
 * Props: isAdmin (bool), jobId (optional, flow tiến cử), candidateId (optional, Admin hoặc Agent edit), onSuccess, onCancel (callbacks khi dùng trong modal).
 */
const AddCandidateForm = ({
  isAdmin = false,
  jobId = null,
  candidateId: candidateIdProp = null,
  onSuccess = null,
  onCancel = null,
  isApplicantProfile = false,
  /** Khi tạo hồ sơ lần đầu từ trang profile: khóa 1 mẫu, ẩn bộ chọn 3 template trong preview */
  applicantLockedCvTemplate = null,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;
  const { candidateId: candidateIdFromParams } = useParams();
  const { language } = useLanguage();
  const notify = useNotification();
  const t = translations[language] || translations.vi;
  // Đồng bộ nhãn visa với ô "Tư cách lưu trú" ở AddJobPage (vi/en/ja),
  // nhưng vẫn giữ value số để tương thích dữ liệu hiện tại trong DB.
  const RESIDENCE_STATUS_OPTIONS = [
    {
      value: '3',
      vi: 'Visa du học',
      en: 'Student Visa',
      ja: '留学',
    },
    {
      value: '1',
      vi: 'Visa kỹ sư / tri thức nhân văn / nghiệp vụ quốc tế',
      en: 'Engineer / Specialist in Humanities / International Services',
      ja: '技術・人文知識・国際業務',
    },
    {
      value: '2',
      vi: 'Visa kỹ năng đặc định',
      en: 'Specified Skilled Worker',
      ja: '特定技能',
    },
    {
      value: '9',
      vi: 'Visa kỹ năng (lao động tay nghề)',
      en: 'Skilled Worker',
      ja: '技能',
    },
    {
      value: '8',
      vi: 'Visa lao động trình độ cao',
      en: 'Highly Skilled Professional',
      ja: '高度専門職',
    },
    {
      value: '12',
      vi: 'Visa chuyển công tác nội bộ',
      en: 'Intra-company Transferee',
      ja: '企業内転勤',
    },
    {
      value: '13',
      vi: 'Visa biểu diễn / giải trí',
      en: 'Entertainer',
      ja: '興行',
    },
    {
      value: '14',
      vi: 'Visa thực tập sinh kỹ năng',
      en: 'Technical Intern Training',
      ja: '技能実習',
    },
    {
      value: '10',
      vi: 'Visa gia đình (phụ thuộc)',
      en: 'Dependent Visa',
      ja: '家族滞在',
    },
    {
      value: '5',
      vi: 'Visa vợ/chồng người Nhật',
      en: 'Spouse or Child of Japanese National',
      ja: '日本人の配偶者等',
    },
    {
      value: '15',
      vi: 'Visa vợ/chồng của người vĩnh trú',
      en: 'Spouse or Child of Permanent Resident',
      ja: '永住者の配偶者等',
    },
    {
      value: '6',
      vi: 'Visa cư trú dài hạn',
      en: 'Long-term Resident',
      ja: '定住者',
    },
    {
      value: '4',
      vi: 'Visa vĩnh trú',
      en: 'Permanent Resident',
      ja: '永住者',
    },
    {
      value: '11',
      vi: 'Visa ngắn hạn',
      en: 'Temporary Visitor',
      ja: '短期滞在',
    },
    {
      value: '7',
      vi: 'Không yêu cầu',
      en: 'No requirement',
      ja: '不要',
    },
  ];
  const getResidenceStatusLabel = (opt) => {
    if (language === 'en') return opt.en;
    if (language === 'ja') return opt.ja;
    return opt.vi;
  };
  const formatJobCategoryLabel = (cat) => {
    if (!cat) return '';
    if (language === 'en') return cat.nameEn || cat.name || '';
    if (language === 'ja') return cat.nameJp || cat.nameEn || cat.name || '';
    return cat.name || '';
  };
  const [applicantLoadedCvId, setApplicantLoadedCvId] = useState(null);
  const candidateLandingPrefix = pathname.startsWith('/landing/candidate') ? '/landing/candidate' : '/candidate';
  const candidateId =
    candidateIdProp ?? candidateIdFromParams ?? (isApplicantProfile ? applicantLoadedCvId : null);
  const markReadyForParseAfterSave = new URLSearchParams(search).get('markReadyForParse') === '1';
  const [formData, setFormData] = useState({
    collaboratorId: '',
    // Personal Information
    nameKanji: '',
    nameKana: '',
    birthDate: '',
    age: '',
    gender: '',
    postalCode: '',
    address: '',
    phone: '',
    email: '',
    // Residence & Visa Information
    addressOrigin: '',
    nearestStationLine: '',
    nearestStationName: '',
    dependentsCount: '',
    hasSpouse: '',
    spouseDependent: '',
    passport: '',
    jpResidenceStatus: '',
    visaExpirationDate: '',
    // Nhật滞在目的 (mục đích ở Nhật) – map ra preview
    stayPurpose: '',
    // 外国語の会話レベル
    jpConversationLevel: '',
    enConversationLevel: '',
    otherConversationLevel: '',
    // Education
    educations: [],
    // Work Experience
    workExperiences: [],
    /** Số block 職務経歴 (ưu tiên shokumu.job_history.length, sau đó rirekisho.work_history). Dùng để form shokumu chỉ hiển thị đúng số mục. */
    workHistoryCount: undefined,
    // Skills & Certificates
    technicalSkills: '',
    certificates: [],
    learnedTools: [],
    experienceTools: [],
    toolsSoftwareNotes: {
      learned: {},
      experienced: {},
      experiencedOther: ''
    },
    jlptLevel: '',
    jlptAcquiredYear: '',
    jlptAcquiredMonth: '',
    toeicScore: '',
    toeicYear: '',
    toeicMonth: '',
    ieltsScore: '',
    ieltsYear: '',
    ieltsMonth: '',
    experienceYears: '',
    hasDrivingLicense: '',
    drivingLicenseYear: '',
    drivingLicenseMonth: '',
    // Self Introduction
    careerSummary: '',
    strengths: '',
    hobbiesSpecialSkills: '',
    motivation: '',
    remarks: '', // 備考 (chi chú)
    languageSkillRemarks: '', // 言語スキル補足説明 (bảng 外国語の会話レベル), tách riêng jlptLevel
    // Preferences
    currentSalary: '',
    desiredSalary: '',
    desiredPosition: '',
    /** FK job_categories — một mục chi tiết (leaf) */
    jobCategoryId: '',
    jobCategoryLabel: '',
    desiredLocation: '',
    desiredStartDate: '',
    // Ngày hiển thị trên CV (履歴書 / 職務経歴書) – có thể sửa, mặc định theo ngày hiện tại
    cvDocumentDate: '',
    /** Map `template::tab::tableId` -> { cols: number[], rows?: Record<string, number> } — đồng bộ PDF/preview */
    cvTableLayout: {},
    /** Đánh dấu bổ sung thông tin (admin) — đồng bộ với cv_storages.admin_supplement_marks */
    adminSupplementMarks: [],
  });
  const [cvFiles, setCvFiles] = useState([]);
  const cvFilesRef = useRef([]);
  cvFilesRef.current = cvFiles;
  const [cvPreviews, setCvPreviews] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null); // data URL hoặc URL từ server (khi edit)
  const [avatarDataUrl, setAvatarDataUrl] = useState(''); // giữ bản base64 để submit/PDF không bị mất ảnh
  const [cvPdfPreviewUrl, setCvPdfPreviewUrl] = useState(null); // object URL cho embed PDF đầu tiên
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState({ current: 0, total: 0 });
  const [parseError, setParseError] = useState(null);
  const [parseSuccess, setParseSuccess] = useState(null);
  const [errors, setErrors] = useState({});
  /** Loading khi tải dữ liệu ứng viên (mở form chỉnh sửa) */
  const [initialLoading, setInitialLoading] = useState(false);
  /** Loading khi lưu CV (backend tạo PDF template / snapshot) */
  const [saving, setSaving] = useState(false);
  /** Admin: đang gửi yêu cầu bổ sung tới CTV */
  const [supplementSending, setSupplementSending] = useState(false);
  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);
  const [hoveredUploadArea, setHoveredUploadArea] = useState(false);
  const [dragOverCvUpload, setDragOverCvUpload] = useState(false);
  const [dragOverAvatarUpload, setDragOverAvatarUpload] = useState(false);
  const [hoveredAddMoreButton, setHoveredAddMoreButton] = useState(false);
  const [hoveredRemoveCvButtonIndex, setHoveredRemoveCvButtonIndex] = useState(null);
  const [hoveredClearAllButton, setHoveredClearAllButton] = useState(false);
  const [hoveredAddEducationButton, setHoveredAddEducationButton] = useState(false);
  const [hoveredRemoveEducationButtonIndex, setHoveredRemoveEducationButtonIndex] = useState(null);
  const [hoveredAddWorkExperienceButton, setHoveredAddWorkExperienceButton] = useState(false);
  const [hoveredRemoveWorkExperienceButtonIndex, setHoveredRemoveWorkExperienceButtonIndex] = useState(null);
  const [hoveredAddCertificateButton, setHoveredAddCertificateButton] = useState(false);
  const [hoveredRemoveCertificateButtonIndex, setHoveredRemoveCertificateButtonIndex] = useState(null);
  const [hoveredAddLearnedToolButton, setHoveredAddLearnedToolButton] = useState(false);
  const [hoveredRemoveLearnedToolButtonIndex, setHoveredRemoveLearnedToolButtonIndex] = useState(null);
  const [hoveredAddExperienceToolButton, setHoveredAddExperienceToolButton] = useState(false);
  const [hoveredRemoveExperienceToolButtonIndex, setHoveredRemoveExperienceToolButtonIndex] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewPdfBlobRef = useRef(null);
  const lastPreviewPayloadRef = useRef(null);
  const [cvTemplate, setCvTemplate] = useState(() =>
    applicantLockedCvTemplate && ['common', 'cv_it', 'cv_technical'].includes(applicantLockedCvTemplate)
      ? applicantLockedCvTemplate
      : 'common'
  ); // 'common' | 'cv_it' | 'cv_technical'
  const [cvFormatTab, setCvFormatTab] = useState('rirekisho'); // 'rirekisho' | 'shokumu' (chỉ dùng khi cvTemplate === 'common')
  const [cvTechnicalTab, setCvTechnicalTab] = useState('rirekisho'); // 'rirekisho' | 'shokumu' (chỉ dùng khi cvTemplate === 'cv_technical')
  const [cvItTab, setCvItTab] = useState('rirekisho'); // 'rirekisho' | 'shokumu' (chỉ dùng khi cvTemplate === 'cv_it')
  /** Dưới breakpoint xl: chuyển giữa form nhập liệu và cột preview CV. */
  const [mobileCvTab, setMobileCvTab] = useState('form'); // 'form' | 'preview'
  const [focusedCvArrayField, setFocusedCvArrayField] = useState(null); // 'arrayName-index-subfield' khi đang focus để không bị React ghi đè nội dung
  const [focusedCvScalarField, setFocusedCvScalarField] = useState(null); // field name — ô scalar trong preview CV (bôi vàng khi không focus)
  // CTV autocomplete: tìm theo tên, gợi ý
  const [collaboratorSearchQuery, setCollaboratorSearchQuery] = useState('');
  const [collaboratorSuggestions, setCollaboratorSuggestions] = useState([]);
  const [collaboratorDropdownOpen, setCollaboratorDropdownOpen] = useState(false);
  const [collaboratorDisplayName, setCollaboratorDisplayName] = useState('');
  const collaboratorSearchDebounceRef = useRef(null);
  const collaboratorDropdownRef = useRef(null);
  /** Gọi API parse — gán mỗi render để luôn dùng mergeResumeData / notify mới nhất */
  const runCvAiParseRef = useRef(async () => {});
  const manualUpdateSectionRef = useRef(null);
  const cvMainFileInputRef = useRef(null);
  const cvShokumuFileInputRef = useRef(null);
  const [jobCategoryModalOpen, setJobCategoryModalOpen] = useState(false);
  /** Ref để tránh React Strict Mode gọi setState 2 lần → chèn 2 cặp hàng. Chỉ áp dụng insert khi ref khớp, rồi clear ref. */
  const cvInsertPendingRef = useRef(null);
  /** Đường dẫn file CV gốc đã lưu (khi sửa ứng viên) – hiển thị trong block Upload CV */
  const [existingCvOriginalPath, setExistingCvOriginalPath] = useState('');
  /** Danh sách file CV gốc hiện có (khi sửa) – từ API cv-file-list */
  const [existingOriginals, setExistingOriginals] = useState([]);
  const autoParseCv = true;
  /** Tránh hydrate lại cùng bộ file gốc khi re-render (key = candidateId + index list). */
  const hydratedExistingOriginalsKeyRef = useRef('');
  const MAX_CV_FILE_SIZE_BYTES = 40 * 1024 * 1024;
  const MAX_CV_FILE_SIZE_MB = 40;
  const setSupplementMarks = useCallback((updater) => {
    setFormData((prev) => {
      const prevMarks = prev.adminSupplementMarks || [];
      const next = typeof updater === 'function' ? updater(prevMarks) : updater;
      return { ...prev, adminSupplementMarks: Array.isArray(next) ? next : [] };
    });
  }, []);

  const supplementMarking = useSupplementMarking({
    enabled: isAdmin,
    marks: formData.adminSupplementMarks || [],
    setMarks: setSupplementMarks,
    persist: null,
  });

  useEffect(() => {
    if (!isApplicantProfile) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.getApplicantMyCVs();
        const first = res?.data?.cvs?.[0];
        if (!cancelled) setApplicantLoadedCvId(first?.id != null ? first.id : null);
      } catch {
        if (!cancelled) setApplicantLoadedCvId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isApplicantProfile]);

  useEffect(() => {
    if (
      !applicantLockedCvTemplate ||
      !['common', 'cv_it', 'cv_technical'].includes(applicantLockedCvTemplate)
    ) {
      return;
    }
    setCvTemplate(applicantLockedCvTemplate);
  }, [applicantLockedCvTemplate]);

  useEffect(() => {
    hydratedExistingOriginalsKeyRef.current = '';
    if (candidateId) {
      setCvFiles([]);
      setCvPreviews([]);
      loadCandidateData();
    } else {
      setExistingCvOriginalPath('');
      setExistingOriginals([]);
      setCvFiles([]);
      setCvPreviews([]);
    }
  }, [candidateId]);

  // Tìm kiếm CTV theo tên (debounce)
  useEffect(() => {
    if (!isAdmin) return;
    const q = (collaboratorSearchQuery || '').trim();
    if (collaboratorSearchDebounceRef.current) clearTimeout(collaboratorSearchDebounceRef.current);
    if (!q) {
      setCollaboratorSuggestions([]);
      return;
    }
    collaboratorSearchDebounceRef.current = setTimeout(() => {
      apiService.getCollaborators({ search: q, limit: 15 })
        .then((res) => {
          if (res?.success && res?.data?.collaborators) {
            setCollaboratorSuggestions(res.data.collaborators);
          } else {
            setCollaboratorSuggestions([]);
          }
        })
        .catch(() => setCollaboratorSuggestions([]));
    }, 300);
    return () => { if (collaboratorSearchDebounceRef.current) clearTimeout(collaboratorSearchDebounceRef.current); };
  }, [collaboratorSearchQuery, isAdmin]);

  // Đóng dropdown CTV khi click bên ngoài
  useEffect(() => {
    if (!collaboratorDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (collaboratorDropdownRef.current && !collaboratorDropdownRef.current.contains(e.target)) {
        setCollaboratorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [collaboratorDropdownOpen]);

  // Object URL cho PDF đầu tiên (embed trong template) - revoke khi unmount hoặc đổi file
  useEffect(() => {
    if (cvFiles.length > 0 && cvFiles[0]) {
      const url = URL.createObjectURL(cvFiles[0]);
      setCvPdfPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setCvPdfPreviewUrl(null);
    return () => {};
  }, [cvFiles.length, cvFiles[0]?.name, cvFiles[0]?.size]);

  const loadCandidateData = async () => {
    try {
      setInitialLoading(true);
      const response = isApplicantProfile
        ? await apiService.getApplicantMyCVById(candidateId)
        : isAdmin
          ? await apiService.getAdminCVById(candidateId)
          : await apiService.getCVStorageById(candidateId);
      if (response.success && response.data?.cv) {
        const cv = response.data.cv;
        setExistingCvOriginalPath(cv.cvOriginalPath || cv.originalFilePath || '');
        const hasStoredAvatar = Boolean(
          cv.avatarPhotoPath
          || cv.avatarPhoto
          || cv.avatarUrl
          || cv.avatar_path
          || cv.avatar_photo_path
        );
        if (hasStoredAvatar) {
          try {
            let avatarUrl = null;
            let avatarContent = null;
            let avatarContentType = '';
            if (isApplicantProfile) {
              avatarUrl = await apiService.getApplicantCVFileUrl(candidateId, 'avatarPhoto', 'view');
              avatarContent = await apiService.getApplicantCVFileContentWithType(candidateId, 'avatarPhoto');
            } else if (isAdmin) {
              avatarUrl = await apiService.getAdminCVFileUrl(candidateId, 'avatarPhoto', 'view');
              avatarContent = await apiService.getAdminCVFileContentWithType(candidateId, 'avatarPhoto');
            } else {
              avatarUrl = await apiService.getCtvCVFileUrl(candidateId, 'avatarPhoto', 'view');
              avatarContent = await apiService.getCtvCVFileContentWithType(candidateId, 'avatarPhoto');
            }
            if (avatarContent?.data?.byteLength) {
              avatarContentType = avatarContent.contentType || '';
              const dataUrl = await arrayBufferToImageDataUrl(avatarContent.data, avatarContentType);
              if (dataUrl) {
                setAvatarPreview(dataUrl);
                setAvatarDataUrl(dataUrl);
              }
            } else if (avatarUrl) {
              setAvatarPreview(avatarUrl);
            }
          } catch (e) {
            /* ảnh tùy chọn */
          }
        }
        try {
          if (isApplicantProfile) {
            setExistingOriginals([]);
          } else {
            const listData = isAdmin ? await apiService.getAdminCVFileList(candidateId) : await apiService.getCtvCVFileList(candidateId);
            setExistingOriginals(listData?.originals || []);
          }
        } catch (err) {
          setExistingOriginals([]);
        }

        // API trả về schema mới { rirekisho, shokumu_keirekisho }
        if (cv.rirekisho) {
          mergeResumeData(cv);
          setFormData(prev => ({
            ...prev,
            collaboratorId: cv.collaboratorId != null ? String(cv.collaboratorId) : prev.collaboratorId,
            jobCategoryId: cv.jobCategoryId != null ? String(cv.jobCategoryId) : '',
            jobCategoryLabel: formatJobCategoryLabel(cv.jobCategory),
          }));
          if (cv.collaboratorId && cv.collaborator) {
            setCollaboratorDisplayName(cv.collaborator.name || cv.collaborator.email || cv.collaborator.code || `ID ${cv.collaboratorId}`);
          } else {
            setCollaboratorDisplayName('');
          }
          setCollaboratorSearchQuery('');
          setCollaboratorSuggestions([]);
          setInitialLoading(false);
          return;
        }

        // Schema cũ (flat cv)
        let birthDate = cv.birthDate || '';
        if (birthDate && !birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const parsedDate = new Date(birthDate);
          if (!isNaN(parsedDate.getTime())) {
            birthDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
          } else {
            birthDate = '';
          }
        }
        const calculatedAge = birthDate ? calculateAge(new Date(birthDate)) : (cv.ages || cv.age || '');
        
        let visaExpirationDate = cv.visaExpirationDate || '';
        if (visaExpirationDate && !visaExpirationDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const parsedDate = new Date(visaExpirationDate);
          if (!isNaN(parsedDate.getTime())) {
            visaExpirationDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
          } else {
            visaExpirationDate = '';
          }
        }
        
        setFormData({
          collaboratorId: cv.collaboratorId != null ? String(cv.collaboratorId) : '',
          nameKanji: cv.name || cv.nameKanji || '',
          nameKana: cv.furigana || cv.nameKana || '',
          birthDate: birthDate,
          age: calculatedAge,
          gender: cv.gender === 1 ? '男' : cv.gender === 2 ? '女' : '',
          postalCode: cv.postalCode || '',
          address: cv.addressCurrent || cv.address || '',
          phone: cv.phone || '',
          email: cv.email || '',
          // Residence & Visa Information
          addressOrigin: cv.addressOrigin || '',
          nearestStationLine: cv.nearestStationLine || '',
          nearestStationName: cv.nearestStationName || '',
          dependentsCount: cv.dependentsCount != null ? String(cv.dependentsCount) : '',
          hasSpouse: cv.hasSpouse === 1 || cv.hasSpouse === '1' || cv.hasSpouse === '有' ? '有' : (cv.hasSpouse === 0 || cv.hasSpouse === '0' || cv.hasSpouse === '無' ? '無' : ''),
          spouseDependent: cv.spouseDependent === 1 || cv.spouseDependent === '1' || cv.spouseDependent === '有' ? '有' : (cv.spouseDependent === 0 || cv.spouseDependent === '0' || cv.spouseDependent === '無' ? '無' : ''),
          passport: cv.passport === 1 || cv.passport === '1' || cv.passport === true || String(cv.passport).toLowerCase() === 'yes' || String(cv.passport).toLowerCase() === '有' ? '有' : (cv.passport === 0 || cv.passport === '0' || cv.passport === false || String(cv.passport).toLowerCase() === 'no' || String(cv.passport).toLowerCase() === '無' ? '無' : (cv.passport === '有' || cv.passport === '無' ? String(cv.passport) : '')),
          jpResidenceStatus: cv.jpResidenceStatus ? cv.jpResidenceStatus.toString() : '',
          visaExpirationDate: visaExpirationDate,
          educations: normalizeEducationsForForm(cv.educations),
          workExperiences: normalizeWorkExperiencesForForm(cv.workExperiences),
          technicalSkills: cv.technicalSkills || '',
          certificates: cv.certificates ? (typeof cv.certificates === 'string' ? JSON.parse(cv.certificates) : cv.certificates) : [],
          learnedTools: cv.learnedTools ? (typeof cv.learnedTools === 'string' ? JSON.parse(cv.learnedTools) : cv.learnedTools) : [],
          experienceTools: cv.experienceTools ? (typeof cv.experienceTools === 'string' ? JSON.parse(cv.experienceTools) : cv.experienceTools) : [],
          toolsSoftwareNotes: cv.toolsSoftwareNotes
            ? (typeof cv.toolsSoftwareNotes === 'string' ? JSON.parse(cv.toolsSoftwareNotes) : cv.toolsSoftwareNotes)
            : { learned: {}, experienced: {}, experiencedOther: '' },
          jlptLevel: cv.jlptLevel ? cv.jlptLevel.toString() : '',
          toeicScore: cv.toeicScore != null ? cv.toeicScore.toString() : '',
          ieltsScore: cv.ieltsScore != null ? cv.ieltsScore.toString() : '',
          experienceYears: cv.experienceYears ? cv.experienceYears.toString() : '',
          hasDrivingLicense: cv.hasDrivingLicense != null ? cv.hasDrivingLicense.toString() : '',
          drivingLicenseYear: cv.drivingLicenseYear || '',
          drivingLicenseMonth: cv.drivingLicenseMonth || '',
          careerSummary: cv.careerSummary || '',
          strengths: cv.strengths || '',
          remarks: cv.notes || '',
          languageSkillRemarks: cv.languageSkillRemarks || '',
          hobbiesSpecialSkills: cv.hobbiesSpecialSkills || cv.hobbiesOrSpecialSkills || '',
          motivation: cv.motivation || '',
          currentSalary: cv.currentIncome ? `${cv.currentIncome}万円` : cv.currentSalary || '', // Map from currentIncome
          desiredSalary: cv.desiredIncome ? `${cv.desiredIncome}万円` : cv.desiredSalary || '', // Map from desiredIncome
          desiredPosition: cv.desiredPosition || '',
          jobCategoryId: cv.jobCategoryId != null ? String(cv.jobCategoryId) : '',
          jobCategoryLabel: formatJobCategoryLabel(cv.jobCategory),
          desiredLocation: cv.desiredWorkLocation || cv.desiredLocation || '', // Map from desiredWorkLocation
          desiredStartDate: cv.nyushaTime || cv.desiredStartDate || '', // Map from nyushaTime
          cvTableLayout: (() => {
            const v = cv.cvTableLayout;
            if (v == null) return {};
            if (typeof v === 'object') return v;
            try {
              return typeof v === 'string' && v.trim() ? JSON.parse(v) : {};
            } catch {
              return {};
            }
          })(),
          adminSupplementMarks: (() => {
            const m = cv.adminSupplementMarks;
            if (m == null) return [];
            if (Array.isArray(m)) return m;
            if (typeof m === 'string') {
              try {
                const p = JSON.parse(m);
                return Array.isArray(p) ? p : [];
              } catch {
                return [];
              }
            }
            return [];
          })(),
        });
        // Hiển thị tên CTV khi load (ô CTV tìm theo tên)
        if (cv.collaboratorId && cv.collaborator) {
          setCollaboratorDisplayName(cv.collaborator.name || cv.collaborator.email || cv.collaborator.code || `ID ${cv.collaboratorId}`);
        } else {
          setCollaboratorDisplayName('');
        }
        setCollaboratorSearchQuery('');
        setCollaboratorSuggestions([]);
        // Ảnh chân dung có thể được load lại từ file đã lưu để preview; không bắt buộc upload lại
      } else {
        setExistingCvOriginalPath('');
      }
    } catch (error) {
      console.error('Error loading candidate data:', error);
      notify.error('Lỗi khi tải thông tin ứng viên');
      setExistingCvOriginalPath('');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify.warning('Vui lòng chọn file ảnh (JPG, PNG, ...)');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? normalizeAvatarDataUrlForCvPreview(reader.result) || reader.result : '';
      setAvatarPreview(dataUrl);
      setAvatarDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };
  const handleAvatarDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAvatarUpload(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    handleAvatarChange({ target: { files: [file] } });
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarDataUrl('');
  };

  const onCvTableLayoutCommit = useCallback((layoutKey, layout) => {
    setFormData((prev) => ({
      ...prev,
      cvTableLayout: { ...(prev.cvTableLayout || {}), [layoutKey]: layout },
    }));
  }, []);

  const ensureAvatarBase64 = useCallback(async () => {
    if (avatarDataUrl && typeof avatarDataUrl === 'string' && avatarDataUrl.startsWith('data:image/')) {
      return normalizeAvatarDataUrlForCvPreview(avatarDataUrl) || avatarDataUrl;
    }
    if (avatarFile instanceof File) {
      try {
        const dataUrl = await blobToDataUrl(avatarFile);
        return normalizeAvatarDataUrlForCvPreview(dataUrl) || dataUrl;
      } catch (error) {
        console.warn('Unable to convert avatar file to base64:', error);
        return undefined;
      }
    }
    if (typeof avatarPreview !== 'string' || !avatarPreview) return undefined;
    if (avatarPreview.startsWith('data:')) {
      return normalizeAvatarDataUrlForCvPreview(avatarPreview) || avatarPreview;
    }
    if (avatarPreview.startsWith('http://') || avatarPreview.startsWith('https://')) {
      try {
        return await fetchUrlAsImageDataUrl(avatarPreview);
      } catch (error) {
        console.warn('Unable to fetch avatar preview URL for backend preview:', error);
      }
    }
    if (!candidateId) return undefined;
    try {
      const { data, contentType } = isAdmin
        ? await apiService.getAdminCVFileContentWithType(candidateId, 'avatarPhoto')
        : isApplicantProfile
          ? await apiService.getApplicantCVFileContentWithType(candidateId, 'avatarPhoto')
          : await apiService.getCtvCVFileContentWithType(candidateId, 'avatarPhoto');
      if (!data?.byteLength) return undefined;
      return await arrayBufferToImageDataUrl(data, contentType);
    } catch (error) {
      console.warn('Unable to fetch avatar content for preview:', error);
      return undefined;
    }
  }, [avatarDataUrl, avatarFile, avatarPreview, candidateId, isAdmin, isApplicantProfile]);

  const closePreviewModal = useCallback(() => {
    setShowPreviewModal(false);
    setPreviewPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewHtml('');
    previewPdfBlobRef.current = null;
    lastPreviewPayloadRef.current = null;
  }, []);

  /** Ưu tiên PDF (khớp tải về / PDF lưu); nếu server không tạo được PDF thì fallback HTML. */
  const runBackendCvPreview = useCallback(async (payload) => {
    lastPreviewPayloadRef.current = payload;
    setPreviewPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewHtml('');
    previewPdfBlobRef.current = null;

    const pdfRes = isAdmin
      ? await apiService.previewAdminCVTemplatePdf(payload)
      : isApplicantProfile
        ? await apiService.previewApplicantCVTemplatePdf(payload)
        : await apiService.previewCTVCVTemplatePdf(payload);

    if (pdfRes.ok && pdfRes.blob && pdfRes.blob.size > 0) {
      previewPdfBlobRef.current = pdfRes.blob;
      setPreviewPdfUrl(URL.createObjectURL(pdfRes.blob));
      return true;
    }

    const htmlRes = isAdmin
      ? await apiService.previewAdminCVTemplate(payload)
      : isApplicantProfile
        ? await apiService.previewApplicantCVTemplate(payload)
        : await apiService.previewCTVCVTemplate(payload);
    if (!htmlRes.ok) {
      notify.error(`Preview thất bại (status ${htmlRes.status})`);
      return false;
    }
    setPreviewHtml(htmlRes.html || '');
    notify.warning(
      pdfRes.message || 'Không tạo được PDF (cần Chrome/Chromium trên server). Đang hiển thị bản HTML.'
    );
    return true;
  }, [isAdmin, isApplicantProfile, notify]);

  /** Mở preview trong popup. tab: 'rirekisho' | 'shokumu' | 'all' – chỉ xem 1 phần hoặc cả 2. */
  const handleBackendPreviewWithOptions = async (template, tab = 'all') => {
    if (previewLoading) return;
    try {
      setPreviewLoading(true);
      setShowPreviewModal(true);
      const avatarBase64 = await ensureAvatarBase64();
      const payload = {
        ...formData,
        cvTemplate: template || 'common',
        tab: (tab === 'rirekisho' || tab === 'shokumu') ? tab : 'all',
        avatarBase64,
        avatarDataUrl: avatarBase64,
      };
      const ok = await runBackendCvPreview(payload);
      if (!ok) setShowPreviewModal(false);
    } catch (e) {
      console.error('Error previewing CV template:', e);
      notify.error('Có lỗi khi preview CV template.');
      setShowPreviewModal(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleBackendPreview = async () => {
    if (previewLoading) return;
    try {
      setPreviewLoading(true);
      setShowPreviewModal(true);
      const avatarBase64 = await ensureAvatarBase64();
      const payload = {
        ...formData,
        cvTemplate: cvTemplate || 'common',
        tab: 'all',
        avatarBase64,
        avatarDataUrl: avatarBase64,
      };
      const ok = await runBackendCvPreview(payload);
      if (!ok) setShowPreviewModal(false);
    } catch (e) {
      console.error('Error previewing CV template:', e);
      notify.error('Có lỗi khi preview CV template.');
      setShowPreviewModal(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadPreviewPdf = useCallback(async () => {
    let blob = previewPdfBlobRef.current;
    const payloadForName = lastPreviewPayloadRef.current;
    if (!blob || !blob.size) {
      if (!payloadForName) {
        notify.error('Chưa có dữ liệu preview để tải PDF.');
        return;
      }
      try {
        const res = isAdmin
          ? await apiService.previewAdminCVTemplatePdf(payloadForName)
          : isApplicantProfile
            ? await apiService.previewApplicantCVTemplatePdf(payloadForName)
            : await apiService.previewCTVCVTemplatePdf(payloadForName);
        if (!res.ok || !res.blob?.size) {
          notify.error(res.message || 'Không tạo được PDF.');
          return;
        }
        blob = res.blob;
      } catch {
        notify.error('Không tải được PDF.');
        return;
      }
    }
    const sanitizeFilenamePart = (input) => String(input ?? '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim() || 'cv';
    const candidateName = sanitizeFilenamePart(
      payloadForName?.cvData?.nameKanji
      || payloadForName?.cvData?.name
      || payloadForName?.nameKanji
      || payloadForName?.name
      || payloadForName?.code
      || ''
    );
    const template = payloadForName?.cvTemplate || 'common';
    const label = template === 'cv_it' ? 'IT系' : template === 'cv_technical' ? '理系' : '一般';
    const tab = payloadForName?.tab || 'all';
    const downloadName = tab === 'shokumu'
      ? `${candidateName}_職務経歴書＿${label}.pdf`
      : tab === 'rirekisho'
        ? `${candidateName} _履歴書_${label}.pdf`
        : `${candidateName} _履歴書+職務経歴書＿${label}.pdf`;
    downloadBlobAsFile(blob, downloadName);
    notify.success('Đã tải file PDF.');
  }, [isAdmin, isApplicantProfile, notify]);

  /** Ngày mặc định trên CV (YYYY年M月D日 hoặc + 現在) */
  const getDefaultCvDate = (withCurrent = true) => {
    const d = new Date();
    const s = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    return withCurrent ? `${s}現在` : s;
  };

  /** supp: { templateFieldKey, formFieldKey } — bôi vàng theo adminSupplementMarks (CTV + Admin preview). */
  const renderCvScalarMarked = (rawText, supp) => {
    const marks = formData.adminSupplementMarks || [];
    const onField = isAdmin ? supplementMarking.handleFieldContextMenu : null;
    const text = String(rawText ?? '').trim() || '　';
    const fk = supp.formFieldKey;
    const linked = [fk];
    if (fk && !String(fk).startsWith('label-') && !String(fk).startsWith('tpl-')) linked.push(`label-${fk}`);
    const inner = (
      <SupplementMarkedText
        text={text}
        fieldKey={supp.templateFieldKey}
        allMarks={marks}
        linkedFieldKeys={linked}
      />
    );
    if (onField) {
      return (
        <SupplementFieldWrap
          fieldKey={supp.formFieldKey}
          onContextMenu={(e) => onField(e, supp.formFieldKey)}
          className="select-text inline min-w-0"
        >
          {inner}
        </SupplementFieldWrap>
      );
    }
    return <span className="select-text inline min-w-0">{inner}</span>;
  };

  /** Ô text trong preview CV: cho phép sửa trực tiếp, đồng bộ vào formData khi blur. Không trả key trong props để tránh spread key vào JSX. */
  const cvEditable = (field, className = '', style = {}, supp = null) => {
    const raw = (formData[field] || '').trim() || '　';
    const marks = formData.adminSupplementMarks || [];
    const onField = isAdmin ? supplementMarking.handleFieldContextMenu : null;
    const useSupp = supp && (marks.length > 0 || onField);
    const isFocused = focusedCvScalarField === field;
    const reactChildren = !isFocused && useSupp;

    return {
      contentEditable: true,
      suppressContentEditableWarning: true,
      ref: (node) => {
        if (!node) return;
        if (reactChildren) {
          for (let c = node.firstChild; c; ) {
            const nx = c.nextSibling;
            if (c.nodeType === 3) node.removeChild(c);
            c = nx;
          }
          return;
        }
        const nextText = raw;
        if (document.activeElement === node) {
          if (!node.textContent.trim()) node.textContent = nextText;
          return;
        }
        if (node.textContent !== nextText) {
          node.textContent = nextText;
        }
      },
      tabIndex: 0,
      onFocus: (e) => {
        setFocusedCvScalarField(field);
        if (!useSupp) {
          const el = e.currentTarget;
          const t = (formData[field] || '').trim() || '　';
          requestAnimationFrame(() => {
            if (el && document.activeElement === el) el.textContent = t;
          });
        }
      },
      onBlur: (e) => {
        setFocusedCvScalarField(null);
        const v = (e.currentTarget.textContent || '').trim();
        setFormData((prev) => ({ ...prev, [field]: v || '' }));
      },
      className,
      style: {
        outline: 'none',
        minHeight: '1.2em',
        ...(field === 'careerSummary' ? { whiteSpace: 'pre-wrap' } : {}),
        ...style,
      },
      children: reactChildren ? renderCvScalarMarked(raw, supp) : undefined,
    };
  };

  /** 生年月日: hiển thị `YYYY 年 M 月 D 日`, lưu ISO YYYY-MM-DD khi blur. */
  const cvEditableBirthDate = (className = '', style = {}, supp = null) => {
    const rawStored = (formData.birthDate || '').trim();
    const displayJp = formatCvBirthDateJa(rawStored);
    const raw = rawStored || '　';
    const marks = formData.adminSupplementMarks || [];
    const onField = isAdmin ? supplementMarking.handleFieldContextMenu : null;
    const useSupp = supp && (marks.length > 0 || onField);
    const isFocused = focusedCvScalarField === 'birthDate';
    const reactChildren = !isFocused && useSupp;
    const showWhenBlurred = (displayJp || raw).trim() || '　';

    return {
      contentEditable: true,
      suppressContentEditableWarning: true,
      ref: (node) => {
        if (!node) return;
        if (reactChildren) {
          for (let c = node.firstChild; c; ) {
            const nx = c.nextSibling;
            if (c.nodeType === 3) node.removeChild(c);
            c = nx;
          }
          return;
        }
        const nextText = isFocused || document.activeElement === node ? raw : showWhenBlurred;
        if (document.activeElement === node) {
          if (!node.textContent.trim()) node.textContent = raw;
          return;
        }
        if (node.textContent !== nextText) {
          node.textContent = nextText;
        }
      },
      tabIndex: 0,
      onFocus: (e) => {
        setFocusedCvScalarField('birthDate');
        if (!useSupp) {
          const el = e.currentTarget;
          const t = rawStored || '　';
          requestAnimationFrame(() => {
            if (el && document.activeElement === el) el.textContent = t;
          });
        }
      },
      onBlur: (e) => {
        setFocusedCvScalarField(null);
        const v = (e.currentTarget.textContent || '').trim();
        setFormData((prev) => ({ ...prev, birthDate: normalizeBirthDateToStorage(v || '') }));
      },
      className,
      style: { outline: 'none', minHeight: '1.2em', ...style },
      children: reactChildren ? renderCvScalarMarked(showWhenBlurred, supp) : undefined,
    };
  };

  /** Ô text có giá trị mặc định khi trống (dùng cho ngày CV). displayTransform(value): chuẩn hóa khi hiển thị (vd bỏ "現在" ở cuối). */
  const cvEditableWithDefault = (field, defaultVal, className = '', style = {}, displayTransform = (v) => v, supp = null) => {
    const raw = (formData[field] || '').trim() || defaultVal;
    const display = typeof displayTransform === 'function' ? displayTransform(raw) : raw;
    const marks = formData.adminSupplementMarks || [];
    const onField = isAdmin ? supplementMarking.handleFieldContextMenu : null;
    const useSupp = supp && (marks.length > 0 || onField);
    const isFocused = focusedCvScalarField === field;
    const reactChildren = !isFocused && useSupp;

    return {
      contentEditable: true,
      suppressContentEditableWarning: true,
      ref: (node) => {
        if (!node) return;
        if (reactChildren) {
          for (let c = node.firstChild; c; ) {
            const nx = c.nextSibling;
            if (c.nodeType === 3) node.removeChild(c);
            c = nx;
          }
          return;
        }
        const nextText = display;
        if (document.activeElement === node) {
          if (!node.textContent.trim()) node.textContent = nextText;
          return;
        }
        if (node.textContent !== nextText) {
          node.textContent = nextText;
        }
      },
      tabIndex: 0,
      onFocus: (e) => {
        setFocusedCvScalarField(field);
        if (!useSupp) {
          const el = e.currentTarget;
          const t = typeof displayTransform === 'function' ? displayTransform((formData[field] || '').trim() || defaultVal) : (formData[field] || '').trim() || defaultVal;
          requestAnimationFrame(() => {
            if (el && document.activeElement === el) el.textContent = t;
          });
        }
      },
      onBlur: (e) => {
        setFocusedCvScalarField(null);
        const v = (e.currentTarget.textContent || '').trim();
        setFormData((prev) => ({ ...prev, [field]: v || '' }));
      },
      className,
      style: { outline: 'none', minHeight: '1.2em', ...style },
      children: reactChildren ? renderCvScalarMarked(display, supp) : undefined,
    };
  };
  /** Ô text cho mảng: đồng bộ [arrayName][index][subfield]. displayValue = giá trị hiển thị (nếu khác value).
   * Khi focus không truyền children để React không ghi đè → tránh lỗi ký tự sai thứ tự. Chỉ cập nhật state khi blur.
   *  certificates + subfield 'yearMonth': hiển thị dạng "YYYY年MM月", khi trống "　年　月" để user nhập trước 年 và 月. */
  const cvEditableArray = (arrayName, index, subfield, className = '', style = {}, displayValue = undefined, supp = null) => {
    const arr = formData[arrayName] || [];
    const item = arr[index] || {};
    const isYearMonth = arrayName === 'certificates' && subfield === 'yearMonth';
    const value = isYearMonth ? ((item.year || '') + (item.month || '')) : (item[subfield] ?? '');
    const show = displayValue !== undefined
      ? String(displayValue).trim() || '　'
      : isYearMonth
        ? ((item.year || '　　') + '年' + (item.month || '　　') + '月')
        : (String(value).trim() || '　');
    const cellKey = `${arrayName}-${index}-${subfield}`;
    const isFocused = focusedCvArrayField === cellKey;
    const marks = formData.adminSupplementMarks || [];
    const onField = isAdmin ? supplementMarking.handleFieldContextMenu : null;
    const useSupp = supp && (marks.length > 0 || onField);

    const renderArrayMarked = () => {
      const fk = supp.formFieldKey;
      const linked = [fk];
      if (fk && !String(fk).startsWith('label-') && !String(fk).startsWith('tpl-')) linked.push(`label-${fk}`);
      const inner = (
        <SupplementMarkedText
          text={String(show).trim() || '　'}
          fieldKey={supp.templateFieldKey}
          allMarks={marks}
          linkedFieldKeys={linked}
        />
      );
      if (onField) {
        return (
          <SupplementFieldWrap
            fieldKey={fk}
            onContextMenu={(e) => onField(e, fk)}
            className="select-text inline min-w-0"
          >
            {inner}
          </SupplementFieldWrap>
        );
      }
      return <span className="select-text inline min-w-0">{inner}</span>;
    };

    const applyValue = (v) => {
        setFormData(prev => {
          const next = [...(prev[arrayName] || [])];
          while (next.length <= index) next.push({});
        if (arrayName === 'certificates' && subfield === 'yearMonth') {
          let y = '', m = '';
          const str = String(v || '').trim();
          if (str.includes('年') || str.includes('月')) {
            const byNen = str.split('年');
            const yPart = (byNen[0] || '').replace(/\s/g, '');
            const rest = (byNen[1] || '').split('月')[0] || '';
            const mPart = rest.replace(/\s/g, '');
            y = (yPart.match(/\d+/g) || []).join('').slice(0, 4) || yPart.slice(0, 4);
            m = (mPart.match(/\d+/g) || []).join('').slice(0, 2) || mPart.slice(0, 2);
          }
          if (y === '' && m === '') {
            const s = str.replace(/\D/g, '');
            if (s.length >= 6) {
              y = s.slice(0, 4);
              m = s.slice(4, 6);
            } else if (s.length === 4) {
              y = '20' + s.slice(0, 2);
              m = s.slice(2, 4);
            } else if (s.length === 2) {
              m = s;
            } else {
              y = s;
            }
          }
          next[index] = { ...next[index], year: y, month: m };
        } else if (arrayName === 'educations' && (subfield === 'year' || subfield === 'endYear')) {
          const jm = v.match(/(\d{4})\s*年\s*(\d{1,2})\s*月?/);
          if (jm) {
            const y = jm[1];
            const mo = String(parseInt(jm[2], 10));
            if (subfield === 'year') next[index] = { ...next[index], year: y, month: mo };
            else next[index] = { ...next[index], endYear: y, endMonth: mo };
          } else if (v.includes('/')) {
            const [yRaw, mRaw] = v.split('/').map((s) => s.trim());
            const y = yRaw || '';
            const m = mRaw || '';
            if (subfield === 'year') {
              next[index] = { ...next[index], year: y, month: m };
            } else {
              next[index] = { ...next[index], endYear: y, endMonth: m };
            }
          } else {
            next[index] = { ...next[index], [subfield]: v || '' };
          }
        } else {
          next[index] = { ...next[index], [subfield]: v || '' };
          if (arrayName === 'educations' && subfield === 'content') {
            const parts = (v || '').trim().split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
            next[index].school_name = parts[0] ?? '';
            next[index].major = parts.slice(1).join(' / ') ?? '';
          }
        }
          return { ...prev, [arrayName]: next };
        });
    };

    const reactChildren = !isFocused && useSupp;

    return {
      contentEditable: true,
      suppressContentEditableWarning: true,
      ref: (node) => {
        if (!node) return;
        if (reactChildren) {
          for (let c = node.firstChild; c; ) {
            const nx = c.nextSibling;
            if (c.nodeType === 3) node.removeChild(c);
            c = nx;
          }
          return;
        }
        const nextText = show;
        if (document.activeElement === node) {
          if (!node.textContent.trim()) node.textContent = nextText;
          return;
        }
        if (node.textContent !== nextText) {
          node.textContent = nextText;
        }
      },
      tabIndex: 0,
      onFocus: (e) => {
        setFocusedCvArrayField(cellKey);
        if (!useSupp) {
          const el = e.currentTarget;
          const content = show || '　';
          requestAnimationFrame(() => {
            if (el && document.activeElement === el) el.textContent = content;
          });
        }
      },
      onBlur: (e) => {
        setFocusedCvArrayField(null);
        const v = (e.currentTarget.textContent || '').trim();
        applyValue(v);
      },
      className,
      style: { outline: 'none', minHeight: '1em', minWidth: '1.5em', display: 'inline-block', cursor: 'text', ...style },
      children: reactChildren ? renderArrayMarked() : undefined,
    };
  };

  // API Base URL for CV parsing
  const API_BASE_URL = 'https://ws-jobshare.com/api_ai';

  // Calculate age from birth date
  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
    if (isNaN(birth.getTime())) return '';
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age.toString();
  };

  /** Trả về chuỗi YYYY-MM-DD hợp lệ cho input date. */
  const safeDateForInput = (value) => {
    if (value == null || value === '') return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  };

  // Handle date change from input date
  const handleBirthDateChange = (value) => {
    if (value) {
      const date = new Date(`${value}T00:00:00`);
      const age = calculateAge(date);
      setFormData(prev => ({
        ...prev,
        birthDate: value,
        age: age
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        birthDate: '',
        age: ''
      }));
    }
    if (errors.birthDate) {
      setErrors(prev => ({
        ...prev,
        birthDate: ''
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      // Auto-calculate age when birthDate changes
      if (name === 'birthDate' && value) {
        const age = calculateAge(value);
        newData.age = age;
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

  /** Parse API date string (e.g. "2020-04", "2020/09", "2020年4月", "2026-03-05") to { year, month } for form. */
  const parseApiDateToYearMonth = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return { year: '', month: '' };
    const s = String(dateStr).trim();
    if (!s) return { year: '', month: '' };
    if (/^(Nay|現在|present|current)$/i.test(s) || s.includes('現在')) return { year: '', month: '' };
    const yearOnly = s.match(/^(\d{4})$/);
    if (yearOnly) return { year: yearOnly[1], month: '' };
    const iso = s.match(/^(\d{4})[-](\d{1,2})(?:[-/](\d{1,2}))?/);
    if (iso) return { year: iso[1], month: String(parseInt(iso[2], 10)) };
    const slash = s.match(/^(\d{4})\/(\d{1,2})(?:\/(\d{1,2}))?/);
    if (slash) return { year: slash[1], month: String(parseInt(slash[2], 10)) };
    const rev = s.match(/^(\d{1,2})\/(\d{4})$/);
    if (rev) return { year: rev[2], month: String(parseInt(rev[1], 10)) };
    const jp = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*(?:月)?/);
    if (jp) return { year: jp[1], month: String(parseInt(jp[2], 10)) };
    return { year: '', month: '' };
  };
  const extractYearMonth = parseApiDateToYearMonth;

  const isEndDateCurrent = (endDate) => {
    if (endDate == null || endDate === '') return false;
    const s = String(endDate).trim();
    const lower = s.toLowerCase();
    return s === '現在' || lower === 'đến nay' || lower === 'present' || lower === 'current' || s.includes('現在');
  };

  /** 職務経歴「期間」— luôn hiển thị dạng `2020 年 4 月～2024 年 5 月` (full-width ～). */
  const formatShokumuPeriodRangeJa = (startRaw, endRaw) => {
    const startYm = parseApiDateToYearMonth(String(startRaw || '').trim());
    const endStr = String(endRaw || '').trim();
    const endCurrent = isEndDateCurrent(endStr);
    const endYm = endCurrent ? null : parseApiDateToYearMonth(endStr);
    const part = (ym) => `${ym.year} 年 ${ym.month} 月`;
    const startOk = startYm.year !== '' && startYm.month !== '';
    const endOk = endYm && endYm.year !== '' && endYm.month !== '';
    if (startOk && endCurrent) return `${part(startYm)}～現在`;
    if (startOk && endOk) return `${part(startYm)}～${part(endYm)}`;
    if (startOk) return part(startYm);
    if (endOk) return part(endYm);
    return '';
  };

  /** Work period string may use ASCII ~ or Japanese～ / 〜 between start and end. */
  const splitWorkPeriodRange = (period) => {
    if (period == null || period === '') return ['', ''];
    const normalized = String(period).replace(/\u301c|\uff5e|\u223c/g, '~').trim();
    const parts = normalized.split(/\s*~\s*/).map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2) return [parts[0], parts[parts.length - 1]];
    return [parts[0] || '', ''];
  };

  const toSchoolNameMajor = (content) => {
    const s = (content || '').trim().replace(/\s*(入学|卒業)\s*$/, '').trim();
    const parts = s.split(/\s*\/\s*/).map(p => p.trim()).filter(Boolean);
    return { school_name: parts[0] || '', major: parts.slice(1).join(' / ') || '', content: s };
  };

  const parseJsonLike = (value) => {
    if (value == null || value === '') return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  };

  /** Chuẩn hóa educations lưu cũ (2 dòng 入学/卒業 mỗi trường) thành 1 dòng/trường có endYear, endMonth, school_name, major. */
  const normalizeEducationsFromLegacy = (list) => {
    if (!list || !Array.isArray(list)) return [];
    const result = [];
    let pending = null; // { schoolLabel, year, month }
    for (const edu of list) {
      const content = (edu.content || '').trim();
      const year = (edu.year ?? '').toString().trim();
      const month = (edu.month ?? '').toString().trim();
      const endYear = (edu.endYear ?? '').toString().trim();
      const endMonth = (edu.endMonth ?? '').toString().trim();
      if (endYear !== '' || endMonth !== '' || !content.endsWith(' 入学') && !content.endsWith(' 卒業')) {
        if (pending) {
          const p = toSchoolNameMajor(pending.schoolLabel);
          result.push({ ...p, year: pending.year, month: pending.month, endYear: '', endMonth: '' });
          pending = null;
        }
        const schoolLabel = content.replace(/\s*(入学|卒業)\s*$/, '').trim();
        const p = toSchoolNameMajor(schoolLabel || content);
        result.push({ ...p, year, month, endYear, endMonth });
        continue;
      }
      if (content.endsWith(' 入学')) {
        if (pending) {
          const p = toSchoolNameMajor(pending.schoolLabel);
          result.push({ ...p, year: pending.year, month: pending.month, endYear: '', endMonth: '' });
        }
        pending = { schoolLabel: content.replace(/\s*入学\s*$/, '').trim(), year, month };
      } else if (content.endsWith(' 卒業')) {
        const schoolLabel = content.replace(/\s*卒業\s*$/, '').trim();
        if (pending && pending.schoolLabel === schoolLabel) {
          const p = toSchoolNameMajor(schoolLabel);
          result.push({ ...p, year: pending.year, month: pending.month, endYear: year, endMonth: month });
          pending = null;
        } else {
          if (pending) {
            const p = toSchoolNameMajor(pending.schoolLabel);
            result.push({ ...p, year: pending.year, month: pending.month, endYear: '', endMonth: '' });
          }
          pending = null;
          const p = toSchoolNameMajor(schoolLabel);
          result.push({ ...p, year: '', month: '', endYear: year, endMonth: month });
        }
      } else {
        if (pending) {
          const p = toSchoolNameMajor(pending.schoolLabel);
          result.push({ ...p, year: pending.year, month: pending.month, endYear: '', endMonth: '' });
        }
        pending = null;
        const p = toSchoolNameMajor(content);
        result.push({ ...p, year, month, endYear: '', endMonth: '' });
      }
    }
    if (pending) {
      const p = toSchoolNameMajor(pending.schoolLabel);
      result.push({ ...p, year: pending.year, month: pending.month, endYear: '', endMonth: '' });
    }
    return result;
  };

  /** Chuẩn hóa education từ API (cũ/mới) sang shape form: year, month, endYear, endMonth, school_name, major. */
  const normalizeEducationsForForm = (raw) => {
    const parsed = parseJsonLike(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    const hasNewShape = list.some((edu) => edu && typeof edu === 'object' && (edu.start_date || edu.end_date || edu.school_name || edu.major));
    if (!hasNewShape) return normalizeEducationsFromLegacy(list);
    return list.map((edu) => {
      const { year, month } = parseApiDateToYearMonth(edu?.start_date || '');
      const { year: endYear, month: endMonth } = parseApiDateToYearMonth(edu?.end_date || '');
      const school_name = (edu?.school_name || '').toString().trim();
      const major = (edu?.major || '').toString().trim();
      const content = [school_name, major].filter(Boolean).join(' / ');
      return { school_name, major, year, month, endYear, endMonth, content };
    });
  };

  /** 1 item = 1 kinh nghiệm với start/end tách riêng (giống học vấn). */
  const normalizeWorkExperiencesFromLegacy = (list) => {
    if (!list || !Array.isArray(list)) return [];
    return list.map((we) => {
      const rawPeriod = (we.period || '').trim();
      const [startStr, endStr] = splitWorkPeriodRange(rawPeriod);
      const startYm = parseApiDateToYearMonth(we.start_date || we.period_start || startStr || '');
      const endRaw = String(we.end_date || we.period_end || endStr || '').trim();
      const endIsCurrent = isEndDateCurrent(endRaw);
      const endYm = endIsCurrent ? { year: '', month: '' } : parseApiDateToYearMonth(endRaw);
      const projects = Array.isArray(we.projects)
        ? we.projects.map(normalizeJobProjectItem).filter((p) => p.project_name || p.role || p.description || p.tools_tech || p.team_size || p.period)
        : [];
      return {
        company_name: we.company_name || '',
        employmentPlace: we.employmentPlace || we.employment_place || we.work_location || we.location || '',
        companyRole: we.companyRole || we.company_role || we.position_role || we.position_name || we.position || '',
        business_purpose: we.business_purpose || '',
        scale_role: we.scale_role || '',
        description: we.description || '',
        tools_tech: we.tools_tech || '',
        reason_for_leaving: we.reason_for_leaving || '',
        startYear: startYm.year,
        startMonth: startYm.month,
        endYear: endYm.year,
        endMonth: endYm.month,
        endCurrent: endIsCurrent,
        projects,
        // aliases for older render paths / existing API payloads
        year: startYm.year,
        month: startYm.month,
        start_date: [startYm.year, startYm.month].filter(Boolean).length ? `${startYm.year}/${startYm.month}` : '',
        end_date: endIsCurrent ? '現在' : ([endYm.year, endYm.month].filter(Boolean).length ? `${endYm.year}/${endYm.month}` : ''),
        period: formatShokumuPeriodRangeJa(
          startStr || `${startYm.year}/${startYm.month}`,
          endIsCurrent ? '現在' : (endStr || `${endYm.year}/${endYm.month}`)
        ),
      };
    });
  };

  const normalizeRirekishoWorkExperienceItem = (w) => {
    const startYm = parseApiDateToYearMonth(w?.start_date || w?.period || '');
    const endRaw = String(w?.end_date || '').trim();
    const endIsCurrent = isEndDateCurrent(endRaw);
    const endYm = endIsCurrent ? { year: '', month: '' } : parseApiDateToYearMonth(endRaw);
    const startDate = [startYm.year, startYm.month].filter(Boolean).length ? `${startYm.year}/${startYm.month}` : '';
    const endDate = endIsCurrent ? '現在' : ([endYm.year, endYm.month].filter(Boolean).length ? `${endYm.year}/${endYm.month}` : '');
    const projects = Array.isArray(w?.projects)
      ? w.projects
          .map(normalizeJobProjectItem)
          .filter((p) => p.project_name || p.role || p.description || p.tools_tech || p.team_size || p.period)
      : [];
    return {
      company_name: w?.company_name || '',
      employmentPlace: w?.employmentPlace || w?.employment_place || w?.work_location || w?.location || '',
      companyRole: w?.companyRole || w?.company_role || w?.position_role || w?.position_name || w?.position || '',
      business_purpose: w?.business_purpose || '',
      scale_role: w?.scale_role || w?.department_role || '',
      description: w?.description || w?.department_role || '',
      tools_tech: w?.tools_tech || '',
      reason_for_leaving: w?.reason_for_leaving || '',
      startYear: startYm.year,
      startMonth: startYm.month,
      endYear: endYm.year,
      endMonth: endYm.month,
      endCurrent: endIsCurrent,
      projects,
      year: startYm.year,
      month: startYm.month,
      start_date: startDate,
      end_date: endDate,
      period: startDate || endDate || '',
    };
  };

  const normalizeShokumuWorkExperienceItem = (job) => {
    const start = job?.period_start || job?.start_date || '';
    const end = job?.period_end || job?.end_date || '';
    const startYm = parseApiDateToYearMonth(start);
    const endRaw = String(end || '').trim();
    const endIsCurrent = isEndDateCurrent(endRaw);
    const endYm = endIsCurrent ? { year: '', month: '' } : parseApiDateToYearMonth(endRaw);
    const project = normalizeJobProjectItem(job);
    const projects = project.project_name || project.role || project.description || project.tools_tech || project.team_size || project.period
      ? [project]
      : [];
    return {
      company_name: job?.company_name || '',
      employmentPlace: job?.employmentPlace || job?.employment_place || job?.work_location || job?.location || '',
      companyRole: job?.companyRole || job?.company_role || job?.position_role || job?.position_name || job?.position || job?.role || '',
      business_purpose: job?.business_objective || job?.business_purpose || '',
      scale_role: job?.team_size_role || job?.scale_role || '',
      description: job?.responsibilities || job?.description || '',
      tools_tech: Array.isArray(job?.tools)
        ? job.tools.map((t) => (t == null ? '' : String(t))).filter(Boolean).join(', ')
        : (typeof job?.tools === 'string' ? job.tools : (job?.tools_tech || '')),
      reason_for_leaving: job?.reason_for_leaving || '',
      startYear: startYm.year,
      startMonth: startYm.month,
      endYear: endYm.year,
      endMonth: endYm.month,
      endCurrent: endIsCurrent,
      projects,
      year: startYm.year,
      month: startYm.month,
      start_date: [startYm.year, startYm.month].filter(Boolean).length ? `${startYm.year}/${startYm.month}` : '',
      end_date: endIsCurrent ? '現在' : ([endYm.year, endYm.month].filter(Boolean).length ? `${endYm.year}/${endYm.month}` : ''),
      period: formatShokumuPeriodRangeJa(start, endIsCurrent ? '現在' : end),
    };
  };

  /** Chuẩn hóa workExperiences từ API (cũ/mới) -> đúng shape form đang dùng (1 item = 1 kinh nghiệm). */
  const normalizeWorkExperiencesForForm = (raw) => {
    const parsed = parseJsonLike(raw);
    if (!parsed) return [];

    if (Array.isArray(parsed)) {
      return normalizeWorkExperiencesFromLegacy(parsed);
    }
    if (typeof parsed !== 'object') return [];

    const rirekisho = Array.isArray(parsed.rirekisho_work_history) ? parsed.rirekisho_work_history : [];
    if (rirekisho.length > 0) {
      return rirekisho.map(normalizeRirekishoWorkExperienceItem);
    }

    const shokumu = Array.isArray(parsed.shokumu_job_history) ? parsed.shokumu_job_history : [];
    if (shokumu.length > 0) {
      return shokumu.map(normalizeShokumuWorkExperienceItem);
    }

    return [];
  };

  /** Match company names: rirekisho vs shokumu labels may differ (e.g. legal name vs display name). */
  const stripKabushikiForMatch = (s) =>
    String(s || '')
      .replace(/\s/g, '')
      .replace(/^(株式会社|（株）|\(株\))/u, '');

  const companyNamesLikelySameRirekiShokumu = (a, b) => {
    const sa = stripKabushikiForMatch(a);
    const sb = stripKabushikiForMatch(b);
    if (!sa || !sb) return false;
    if (sa === sb) return true;
    if (sa.includes(sb) || sb.includes(sa)) return true;
    return false;
  };

  const normalizeJobProjectItem = (project) => {
    const startYear = String(project?.startYear ?? project?.project_start_year ?? '').trim();
    const startMonth = String(project?.startMonth ?? project?.project_start_month ?? '').trim();
    const endYear = String(project?.endYear ?? project?.project_end_year ?? '').trim();
    const endMonth = String(project?.endMonth ?? project?.project_end_month ?? '').trim();
    const period = String(project?.period || '').trim();
    return {
      project_name: String(project?.project_name || project?.name || project?.business_objective || project?.business_purpose || '').trim(),
      role: String(project?.role || project?.project_role || project?.position || '').trim(),
      description: String(project?.description || project?.responsibilities || '').trim(),
      tools_tech: Array.isArray(project?.tools)
        ? project.tools.map((t) => (t == null ? '' : String(t))).filter(Boolean).join(', ')
        : String(project?.tools_tech || project?.tools || '').trim(),
      team_size: String(project?.team_size || project?.team || project?.team_size_role || project?.scale_role || '').trim(),
      startYear,
      startMonth,
      endYear,
      endMonth,
      period: period || buildProjectPeriodText({ startYear, startMonth, endYear, endMonth }),
    };
  };

  const buildProjectPeriodText = (project) => {
    const start = [project?.startYear, project?.startMonth].filter(Boolean).join('/');
    const end = [project?.endYear, project?.endMonth].filter(Boolean).join('/');
    if (start && end) return `${start} ～ ${end}`;
    if (start) return start;
    if (end) return end;
    return String(project?.period || '').trim();
  };

  const yearMonthToComparable = (dateStr) => {
    const { year, month } = parseApiDateToYearMonth(dateStr || '');
    if (!year) return null;
    const m = parseInt(month || '1', 10) || 1;
    return parseInt(year, 10) * 12 + m;
  };

  /** True if shokumu job period overlaps rirekisho work_history item (year/month resolution). */
  const rirekishoJobPeriodOverlaps = (w, job) => {
    const rStart = yearMonthToComparable(w.start_date);
    const rEnd = isEndDateCurrent(w.end_date) ? null : yearMonthToComparable(w.end_date);
    const jStart = yearMonthToComparable(job.period_start);
    const jEnd = isEndDateCurrent(job.period_end) ? null : yearMonthToComparable(job.period_end);
    const rLo = rStart ?? 0;
    const rHi = rEnd ?? 1e9;
    const jLo = jStart ?? 0;
    const jHi = jEnd ?? 1e9;
    return !(jHi < rLo || jLo > rHi);
  };

  const toolsTextFromShokumuJob = (job) => {
    if (!job) return '';
    if (Array.isArray(job.tools)) {
      return job.tools.map((t) => (t == null ? '' : String(t))).filter(Boolean).join(', ');
    }
    if (typeof job.tools === 'string' && job.tools) return job.tools;
    return job.tools_tech || '';
  };

  /** Merge matching job_history rows into one rirekisho work_history item (same company + overlapping period). */
  const mergeShokumuDetailsOntoRirekishoItem = (w, skJobs) => {
    if (!skJobs?.length) {
      return {
        business_purpose: '',
        scale_role: w.department_role || '',
        description: '',
        tools_tech: '',
        reason_for_leaving: '',
      };
    }
    const matches = skJobs.filter(
      (job) => companyNamesLikelySameRirekiShokumu(w.company_name, job.company_name) && rirekishoJobPeriodOverlaps(w, job)
    );
    if (!matches.length) {
      return {
        business_purpose: '',
        scale_role: w.department_role || '',
        description: '',
        tools_tech: '',
        reason_for_leaving: '',
      };
    }
    const sorted = [...matches].sort((a, b) => {
      const as = yearMonthToComparable(a.period_start);
      const bs = yearMonthToComparable(b.period_start);
      return (as ?? 0) - (bs ?? 0);
    });
    const businessParts = [
      ...new Set(
        sorted
          .map((j) => (j.business_objective || j.business_purpose || '').trim())
          .filter(Boolean)
      ),
    ];
    const scaleParts = [
      ...new Set(
        sorted.map((j) => (j.team_size_role || j.scale_role || '').trim()).filter(Boolean)
      ),
    ];
    const descParts = sorted
      .map((j) => (j.responsibilities || j.description || '').trim())
      .filter(Boolean);
    const toolStrs = sorted.map((j) => toolsTextFromShokumuJob(j)).filter(Boolean);
    const reason = [...sorted].reverse().map((j) => j.reason_for_leaving).find(Boolean) || '';
    return {
      business_purpose: businessParts.join('\n'),
      scale_role: scaleParts.join('\n') || w.department_role || '',
      description: descParts.join('\n\n'),
      tools_tech: [...new Set(toolStrs.flatMap((t) => t.split(/[,、]/).map((x) => x.trim()).filter(Boolean)))].join(', '),
      reason_for_leaving: reason,
    };
  };

  /** Map API response { rirekisho, shokumu_keirekisho } (schema mới) -> formData. */
  const mergeResumeData = (parsedData) => {
    const tryParseJson = (v) => {
      if (v == null) return v;
      if (typeof v === 'string') {
        const t = v.trim();
        if (!t) return null;
        try {
          return JSON.parse(t);
        } catch {
          return null;
        }
      }
      return v;
    };
    const firstNonEmpty = (...values) => values.find((v) => v != null && String(v).trim() !== '') || '';
    const extractYearMonth = (value) => {
      const s = String(value || '').trim();
      if (!s) return { year: '', month: '' };
      let m = s.match(/^(\d{4})[\/\-.](\d{1,2})/);
      if (m) return { year: m[1], month: String(parseInt(m[2], 10)) };
      m = s.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月?/);
      if (m) return { year: m[1], month: String(parseInt(m[2], 10)) };
      m = s.match(/^(\d{1,2})[\/\-.](\d{4})/);
      if (m) return { year: m[2], month: String(parseInt(m[1], 10)) };
      if (/^Nay|現在|present|current$/i.test(s)) return { year: '', month: '' };
      if (/^\d{4}$/.test(s)) return { year: s, month: '' };
      return { year: '', month: '' };
    };
    const normalizeWorkHistoryRows = (items) => {
      if (!Array.isArray(items)) return [];
      return items.flatMap((item) => {
        const companyName = String(item?.company_name || item?.companyName || '').trim();
        const businessPurpose = String(item?.business_objective || item?.business_purpose || '').trim();
        const departmentRole = String(item?.team_size_role || item?.scale_role || item?.department_role || '').trim();
        const startYm = extractYearMonth(item?.start_date || item?.period_start || '');
        const endRaw = String(item?.end_date || item?.period_end || '').trim();
        const endIsCurrent = /^(nay|現在|present|current)$/i.test(endRaw) || endRaw.includes('現在');
        const endYm = endIsCurrent ? { year: '', month: '' } : extractYearMonth(endRaw);
        const base = {
          business_purpose: businessPurpose,
          scale_role: departmentRole,
          description: item?.responsibilities || item?.description || '',
          tools_tech: Array.isArray(item?.tools) ? item.tools.filter(Boolean).join(', ') : (item?.tools || item?.tools_tech || ''),
          reason_for_leaving: item?.reason_for_leaving || '',
          projects: Array.isArray(item?.projects) ? item.projects.map(normalizeJobProjectItem).filter((p) => p.project_name || p.role || p.description || p.tools_tech || p.team_size || p.period) : [],
        };
        const rows = [];
        const startDate = [startYm.year, startYm.month].filter(Boolean).length ? `${startYm.year}/${startYm.month}` : '';
        const endDate = endIsCurrent ? '現在' : ([endYm.year, endYm.month].filter(Boolean).length ? `${endYm.year}/${endYm.month}` : '');
        if (companyName || startYm.year || startYm.month) {
          rows.push({
            startYear: startYm.year,
            startMonth: startYm.month,
            endYear: endYm.year,
            endMonth: endYm.month,
            endCurrent: endIsCurrent,
            year: startYm.year,
            month: startYm.month,
            start_date: startDate,
            end_date: endDate,
            period: startDate || endDate || '',
            company_name: companyName,
            ...base,
          });
        }
        return rows;
      });
    };
    /** Bản 職務経歴 chi tiết: có period_* hoặc nội dung 事業/業務, khác 職歴 ngắn của 履歴書. */
    const isShokumuJobEntryShape = (j) => {
      if (!j || typeof j !== 'object') return false;
      if (String(j.responsibilities || j.description || '').trim() !== '') return true;
      if (String(j.business_objective || j.business_purpose || '').trim() !== '') return true;
      if (j.period_start != null || j.period_end != null) return true;
      if (j.team_size_role != null || j.scale_role != null) return true;
      return false;
    };
    const firstNonEmptyJobArray = (...candidates) => {
      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0) return c;
      }
      return null;
    };
    /** Một số API trả job_history là chuỗi JSON. */
    const asJobArray = (v) => {
      if (Array.isArray(v) && v.length > 0) return v;
      if (typeof v === 'string' && v.trim().startsWith('[')) {
        try {
          const a = JSON.parse(v);
          return Array.isArray(a) && a.length > 0 ? a : null;
        } catch {
          return null;
        }
      }
      return null;
    };
    /**
     * Tìm mảng 職務経歴 (chi tiết) trong object shokumu khi tên key lệch / lồng 1 tầng.
     * Không dùng root.job_history vì dễ trùng 2 mục 履歴書 職歴.
     */
    const findShokumuJobListDeep = (o, depth = 0) => {
      if (!o || typeof o !== 'object' || depth > 2) return null;
      for (const [k, v] of Object.entries(o)) {
        if (k === 'qualifications' || k === 'skills_and_knowledge' || k === 'licenses_qualifications') continue;
        const arr = asJobArray(v);
        if (arr && arr.some(isShokumuJobEntryShape)) return arr;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const inner = findShokumuJobListDeep(v, depth + 1);
          if (inner) return inner;
        }
      }
      return null;
    };
    /** 職務経歴書 job_history: gom từ shokumu_keirekisho (ưu) + vài cách trả lệch từ parser. */
    const resolveShokumuJobList = (rootObj, shokumuObj) => {
      const fromStandard = firstNonEmptyJobArray(
        asJobArray(shokumuObj?.job_history),
        asJobArray(shokumuObj?.jobHistory)
      );
      if (fromStandard) return fromStandard;
      const fromDeep = findShokumuJobListDeep(shokumuObj);
      if (fromDeep) return fromDeep;
      const jRoot = firstNonEmptyJobArray(
        asJobArray(rootObj?.job_history),
        asJobArray(rootObj?.shokumu_job_history),
        asJobArray(rootObj?.shokumuJobHistory)
      );
      if (jRoot?.length && jRoot.every((j) => isShokumuJobEntryShape(j))) {
        return jRoot;
      }
      const wh = shokumuObj?.work_history || shokumuObj?.working_history;
      if (Array.isArray(wh) && wh.length > 0 && wh.some(isShokumuJobEntryShape)) {
        return wh;
      }
      return null;
    };
    const normalizeShokumuJobItem = (job) => {
      if (!job || typeof job !== 'object') return job;
      return {
        ...job,
        period_start: job.period_start ?? job.start_date,
        period_end: job.period_end ?? job.end_date,
      };
    };
    const hasSchemaShape = (o) => {
      if (!o || typeof o !== 'object') return false;
      return (
        o.rirekisho != null ||
        o.shokumu_keirekisho != null ||
        o.shokumuKeirekisho != null ||
        o.shokumu != null ||
        o.shokumukeirekisho != null ||
        o.shokumi_keirekisho != null
      );
    };
    const root = (() => {
      if (!parsedData || typeof parsedData !== 'object') return {};
      if (hasSchemaShape(parsedData)) {
        return parsedData;
      }
      if (parsedData.data && typeof parsedData.data === 'object' && hasSchemaShape(parsedData.data)) {
        return parsedData.data;
      }
      if (parsedData.resume && typeof parsedData.resume === 'object' && hasSchemaShape(parsedData.resume)) {
        return parsedData.resume;
      }
      if (parsedData.result && typeof parsedData.result === 'object' && hasSchemaShape(parsedData.result)) {
        return parsedData.result;
      }
      if (parsedData.payload && typeof parsedData.payload === 'object' && hasSchemaShape(parsedData.payload)) {
        return parsedData.payload;
      }
      return parsedData;
    })();
    const rrRaw = root.rirekisho;
    const rr = (() => {
      const p = tryParseJson(rrRaw);
      return p && typeof p === 'object' && !Array.isArray(p) ? p : (rrRaw && typeof rrRaw === 'object' && !Array.isArray(rrRaw) ? rrRaw : {});
    })();
    const skRaw =
      root.shokumu_keirekisho ||
      root.shokumuKeirekisho ||
      root.shokumu ||
      root.shokumukeirekisho ||
      root.shokumi_keirekisho;
    const sk = (() => {
      const p = tryParseJson(skRaw);
      if (p && typeof p === 'object' && !Array.isArray(p)) return p;
      if (skRaw && typeof skRaw === 'object' && !Array.isArray(skRaw)) return skRaw;
      return {};
    })();
    const rrWorkList = rr.work_history || rr.working_history || rr.workExperiences || rr.work_experiences;
    const skJobListRaw = resolveShokumuJobList(root, sk);
    const skJobList = skJobListRaw?.length
      ? skJobListRaw.map(normalizeShokumuJobItem)
      : null;

    /** 職務要約 — chỉ từ shokumu, không dùng rirekisho.self_pr (自己PR) */
    const shokumuSummaryForYokyu = (() => {
      if (!sk || typeof sk !== 'object') return null;
      for (const k of ['summary', 'career_summary', 'job_summary']) {
        const v = sk[k];
        if (v != null && String(v).trim() !== '') return String(v).trim();
      }
      return null;
    })();

    let birthDateValue = rr.birth_date || '';
    if (birthDateValue && typeof birthDateValue === 'string' && !birthDateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parsedDate = new Date(birthDateValue);
      if (!isNaN(parsedDate.getTime())) {
        birthDateValue = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
      } else {
        birthDateValue = '';
      }
    }
    const calculatedAge = birthDateValue
      ? calculateAge(new Date(birthDateValue))
      : (rr.age != null ? String(rr.age) : '');

    const mapSpouseFlag = (val) => {
      if (val === true) return '有';
      if (val === false) return '無';
      return '';
    };

    // education_history: 1 item = 1 dòng form. Chuẩn hóa dữ liệu dạng năm/tháng để khớp ô nhập.
    const mappedEducations = rr.education_history?.length > 0
      ? rr.education_history.map(edu => {
          const startYm = extractYearMonth(edu.start_date || '');
          const endRaw = String(edu.end_date || '').trim();
          const endIsCurrent = /^(nay|現在|present|current)$/i.test(endRaw) || endRaw.includes('現在');
          const endYm = endIsCurrent ? { year: '', month: '' } : extractYearMonth(endRaw);
          return {
            school_name: (edu.school_name || '').trim(),
            major: (edu.major || '').trim(),
            year: startYm.year,
            month: startYm.month,
            endYear: endYm.year,
            endMonth: endYm.month,
            content: [edu.school_name, edu.major].filter(Boolean).join(' / ') || ''
          };
        })
      : null;

    // licenses_qualifications: [{ year, month, name }] -> certificates
    const mappedCertificates = rr.licenses_qualifications?.length > 0
      ? rr.licenses_qualifications.map(lic => ({
          year: lic.year != null ? String(lic.year) : '',
          month: lic.month != null ? String(lic.month) : '',
          name: lic.name || ''
        }))
      : null;

    // work_history (rirekisho): mỗi item là 1 công ty. Mỗi công ty có thể chứa nhiều project từ shokumu.job_history.
    const workFromRirekisho = rrWorkList?.length > 0
      ? normalizeWorkHistoryRows(rrWorkList.map((w) => {
          const merged = mergeShokumuDetailsOntoRirekishoItem(w, skJobList);
          return {
            ...w,
            business_objective: merged.business_purpose,
            team_size_role: merged.scale_role,
            responsibilities: merged.description,
            tools: merged.tools_tech,
            reason_for_leaving: merged.reason_for_leaving,
            projects: Array.isArray(w?.projects) ? w.projects : [],
          };
        }))
      : null;

    const attachProjectsToWorkHistory = (workList, projectList) => {
      const works = (Array.isArray(workList) ? workList : []).map((work) => ({ ...work, projects: [] }));
      const projects = Array.isArray(projectList) ? projectList : [];
      projects.forEach((job, jobIndex) => {
        const periodStart = parseApiDateToYearMonth(job.period_start || '');
        const periodEnd = parseApiDateToYearMonth(job.period_end || '');
        const mappedProject = {
          project_name: job.project_name || job.name || job.business_objective || job.business_purpose || '',
          role: job.role || job.project_role || job.position || '',
          team_size: job.team_size || job.teamSize || job.team_size_role || job.scale_role || '',
          description: job.responsibilities || job.description || '',
          tools_tech: toolsTextFromShokumuJob(job),
          startYear: periodStart.year,
          startMonth: periodStart.month,
          endYear: periodEnd.year,
          endMonth: periodEnd.month,
          period: buildProjectPeriodText({
            startYear: periodStart.year,
            startMonth: periodStart.month,
            endYear: periodEnd.year,
            endMonth: periodEnd.month,
            period: `${job.period_start || ''} ～ ${job.period_end || ''}`,
          }),
        };
        let targetIndex = works.findIndex((work) => companyNamesLikelySameRirekiShokumu(work.company_name, job.company_name) && rirekishoJobPeriodOverlaps(work, job));
        if (targetIndex < 0) {
          const counts = works.map((w) => (w.projects || []).length);
          const minCount = counts.length ? Math.min(...counts) : 0;
          targetIndex = counts.indexOf(minCount);
        }
        if (targetIndex < 0) targetIndex = jobIndex % Math.max(1, works.length);
        if (works[targetIndex]) works[targetIndex].projects = [...(works[targetIndex].projects || []), mappedProject];
      });
      return works;
    };

    // job_history (shokumu): danh sách project / việc đã làm, sẽ được gắn vào công ty tương ứng
    const workFromShokumu = workFromRirekisho?.length > 0
      ? attachProjectsToWorkHistory(workFromRirekisho, skJobList)
      : null;
    const workFromRirekishoWithProjects = workFromRirekisho?.length > 0
      ? attachProjectsToWorkHistory(workFromRirekisho, rrWorkList?.flatMap((w) => Array.isArray(w?.projects) ? w.projects : []) || [])
      : null;

    // qualifications (shokumu): [{ name, acquired_date }] -> merge into certificates if we use shokumu certs
    const certsFromShokumu = sk.qualifications?.length > 0
      ? sk.qualifications.map(q => {
          const { year, month } = parseApiDateToYearMonth(q.acquired_date || '');
          return { year, month, name: q.name || '' };
        })
      : null;
    
    setFormData(prev => ({
      ...prev,
      nameKanji: rr.full_name || prev.nameKanji,
      nameKana: rr.name_furigana || prev.nameKana,
      birthDate: birthDateValue || prev.birthDate,
      age: calculatedAge || prev.age,
      gender: rr.gender || prev.gender,
      postalCode: rr.postal_code || prev.postalCode,
      address: rr.address || prev.address,
      phone: rr.phone || prev.phone,
      email: rr.email || prev.email,
      addressOrigin: rr.emergency_contact_address || prev.addressOrigin,
      nearestStationName: rr.nearest_station || prev.nearestStationName,
      dependentsCount: rr.dependents_count != null ? String(rr.dependents_count) : prev.dependentsCount,
      hasSpouse: rr.has_spouse != null ? mapSpouseFlag(rr.has_spouse) : prev.hasSpouse,
      spouseDependent: rr.spouse_support_obligation != null ? mapSpouseFlag(rr.spouse_support_obligation) : prev.spouseDependent,
      jpResidenceStatus: rr.residence_status || prev.jpResidenceStatus,
      visaExpirationDate: rr.residence_expiry || prev.visaExpirationDate,
      stayPurpose: rr.stay_purpose || rr.stayPurpose || prev.stayPurpose,
      jpConversationLevel: rr.jp_conversation_level || rr.jpConversationLevel || prev.jpConversationLevel,
      enConversationLevel: rr.en_conversation_level || rr.enConversationLevel || prev.enConversationLevel,
      otherConversationLevel: rr.other_conversation_level || rr.otherConversationLevel || prev.otherConversationLevel,
      cvDocumentDate: rr.creation_date || sk.creation_date || prev.cvDocumentDate,

      educations: mappedEducations ?? prev.educations,
      certificates: mappedCertificates ?? (certsFromShokumu?.length ? certsFromShokumu : prev.certificates),
      // 職務経歴: ưu tiên gắn project từ shokumu.job_history vào từng block kinh nghiệm.
      // Nếu API đã trả sẵn projects ở work_history thì vẫn giữ như fallback cuối cùng.
      workExperiences:
        workFromShokumu ??
        workFromRirekishoWithProjects ??
        workFromRirekisho ??
        (Array.isArray(rrWorkList)
          ? rrWorkList.map((w) => ({ ...w, projects: Array.isArray(w?.projects) ? w.projects : [] }))
          : prev.workExperiences),
      workHistoryCount:
        workFromShokumu?.length > 0
          ? workFromShokumu.length
          : workFromRirekishoWithProjects?.length > 0
            ? workFromRirekishoWithProjects.length
            : rrWorkList?.length > 0
              ? rrWorkList.length
              : prev.workHistoryCount,

      technicalSkills: sk.skills_and_knowledge?.length > 0 ? sk.skills_and_knowledge.join(', ') : prev.technicalSkills,
      careerSummary: shokumuSummaryForYokyu != null ? shokumuSummaryForYokyu : prev.careerSummary,
      strengths: rr.self_pr || sk.self_pr || prev.strengths,
      hobbiesSpecialSkills: rr.hobbies_skills || prev.hobbiesSpecialSkills,
      motivation: rr.motivation || prev.motivation,

      currentSalary: rr.current_salary != null ? String(rr.current_salary) : prev.currentSalary,
      desiredSalary: rr.expected_salary != null ? String(rr.expected_salary) : prev.desiredSalary,
      desiredPosition: rr.desired_role || prev.desiredPosition,
      desiredLocation: rr.desired_location || prev.desiredLocation,
      desiredStartDate: rr.available_start_date || prev.desiredStartDate,
      cvTableLayout: (() => {
        const v = root.cvTableLayout;
        if (v == null) return prev.cvTableLayout;
        if (typeof v === 'object' && !Array.isArray(v)) return v;
        if (typeof v === 'string') {
          try {
            const t = v.trim();
            return t ? JSON.parse(v) : prev.cvTableLayout;
          } catch {
            return prev.cvTableLayout;
          }
        }
        return prev.cvTableLayout;
      })(),
    }));
  };

  /** Map formData -> API shape { rirekisho, shokumu_keirekisho } (để gửi API hoặc lưu). */
  const formDataToApi = () => {
    const fd = formData;
    const mapSpouseToBool = (v) => (v === '有' ? true : v === '無' ? false : undefined);

    // 1 dòng form = 1 item education_history: school_name, major, start_date (入学年月), end_date (卒業年月)
    const education_history = (() => {
      const list = fd.educations || [];
      return list.map(edu => {
        const year = (edu.year || '').toString().trim();
        const month = (edu.month || '').toString().trim();
        const endYear = (edu.endYear ?? '').toString().trim();
        const endMonth = (edu.endMonth ?? '').toString().trim();
        const startDate = [year, month].filter(Boolean).length ? `${year}/${month}` : undefined;
        const endDate = [endYear, endMonth].filter(Boolean).length ? `${endYear}/${endMonth}` : undefined;
        let school_name = (edu.school_name ?? '').toString().trim();
        let major = (edu.major ?? '').toString().trim();
        if (!school_name && !major && (edu.content || '').trim()) {
          const parts = (edu.content || '').trim().split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
          school_name = parts[0] || '';
          major = parts.slice(1).join(' / ') || '';
        }
        return { school_name: school_name || undefined, major: major || undefined, start_date: startDate, end_date: endDate };
      });
    })();

    const work_history = (fd.workExperiences || []).map((w) => ({
      company_name: w.company_name || '',
      employment_place: w.employmentPlace || undefined,
      company_role: w.companyRole || undefined,
      department_role: w.scale_role || w.description || undefined,
      start_date: [w.startYear, w.startMonth].filter(Boolean).length ? `${w.startYear}/${w.startMonth}` : '',
      end_date: w.endCurrent
        ? '現在'
        : ([w.endYear, w.endMonth].filter(Boolean).length ? `${w.endYear}/${w.endMonth}` : ''),
      projects: Array.isArray(w.projects)
        ? w.projects.map((p) => ({
            project_name: p.project_name || '',
            role: p.role || '',
            description: p.description || '',
            tools_tech: p.tools_tech || '',
            team_size: p.team_size || '',
            startYear: p.startYear || '',
            startMonth: p.startMonth || '',
            endYear: p.endYear || '',
            endMonth: p.endMonth || '',
            period: buildProjectPeriodText(p),
          })).filter((p) => p.project_name || p.role || p.description || p.tools_tech || p.team_size || p.period)
        : [],
    }));

    const licenses_qualifications = (fd.certificates || []).map(c => ({
      year: c.year ? parseInt(c.year, 10) : 0,
      month: c.month ? parseInt(c.month, 10) : 0,
      name: c.name || '',
    }));

    const rirekisho = {
      creation_date: fd.cvDocumentDate || undefined,
      name_furigana: fd.nameKana || undefined,
      full_name: fd.nameKanji || undefined,
      birth_date: fd.birthDate || undefined,
      age: fd.age ? parseInt(fd.age, 10) : 0,
      gender: fd.gender || undefined,
      postal_code: fd.postalCode || undefined,
      address: fd.address || undefined,
      address_furigana: undefined,
      phone: fd.phone || undefined,
      email: fd.email || undefined,
      emergency_contact_address: fd.addressOrigin || undefined,
      education_history: education_history.length ? education_history : undefined,
      work_history: work_history.length ? work_history : undefined,
      licenses_qualifications: licenses_qualifications.length ? licenses_qualifications : undefined,
      nearest_station: fd.nearestStationName || fd.nearestStationLine ? [fd.nearestStationLine, fd.nearestStationName].filter(Boolean).join(' ') : undefined,
      dependents_count: fd.dependentsCount !== '' ? parseInt(fd.dependentsCount, 10) : 0,
      has_spouse: mapSpouseToBool(fd.hasSpouse),
      spouse_support_obligation: mapSpouseToBool(fd.spouseDependent),
      residence_status: fd.jpResidenceStatus || undefined,
      stay_purpose: fd.stayPurpose || undefined,
      jp_conversation_level: fd.jpConversationLevel || undefined,
      en_conversation_level: fd.enConversationLevel || undefined,
      other_conversation_level: fd.otherConversationLevel || undefined,
      residence_expiry: fd.visaExpirationDate || undefined,
      self_pr: fd.strengths || undefined,
      hobbies_skills: fd.hobbiesSpecialSkills || undefined,
      motivation: fd.motivation || undefined,
      current_salary: fd.currentSalary ? parseInt(String(fd.currentSalary).replace(/\D/g, ''), 10) : 0,
      expected_salary: fd.desiredSalary ? parseInt(String(fd.desiredSalary).replace(/\D/g, ''), 10) : 0,
      desired_role: fd.desiredPosition || undefined,
      desired_location: fd.desiredLocation || undefined,
      available_start_date: fd.desiredStartDate || undefined,
    };

    const job_history = (fd.workExperiences || []).flatMap((w) => {
      const projects = Array.isArray(w.projects) && w.projects.length > 0 ? w.projects : [null];
      return projects.map((p) => ({
        period_start: p ? ([p.startYear, p.startMonth].filter(Boolean).length ? `${p.startYear}/${p.startMonth}` : '') : ([w.startYear, w.startMonth].filter(Boolean).length ? `${w.startYear}/${w.startMonth}` : ''),
        period_end: p ? ([p.endYear, p.endMonth].filter(Boolean).length ? `${p.endYear}/${p.endMonth}` : '') : (w.endCurrent ? '現在' : ([w.endYear, w.endMonth].filter(Boolean).length ? `${w.endYear}/${w.endMonth}` : '')),
        company_name: w.company_name || '',
        business_objective: p?.project_name || '',
        team_size_role: p?.team_size || '',
        responsibilities: p ? [p.role, p.description].filter(Boolean).join('\n').trim() : (w.description || ''),
        tools: (p?.tools_tech || w.tools_tech || '').split(/[,、]/).map(t => t.trim()).filter(Boolean),
        reason_for_leaving: w.reason_for_leaving || '',
        role: p?.role || '',
      })).filter((j) => j.company_name || j.business_objective || j.responsibilities || j.tools.length || j.period_start || j.period_end);
    });

    const qualifications = (fd.certificates || []).map(c => {
      const y = c.year || '';
      const m = c.month || '';
      const acquired_date = [y, m].filter(Boolean).length ? `${y}年${m}月` : undefined;
      return { name: c.name || '', acquired_date: acquired_date || '' };
    });

    const shokumu_keirekisho = {
      creation_date: fd.cvDocumentDate || undefined,
      full_name: fd.nameKanji || undefined,
      summary: fd.careerSummary || undefined,
      job_history: job_history.length ? job_history : undefined,
      skills_and_knowledge: (fd.technicalSkills || '').split(/[,、]/).map(s => s.trim()).filter(Boolean),
      qualifications: qualifications.length ? qualifications : undefined,
      self_pr: fd.strengths || undefined,
    };

    return { rirekisho, shokumu_keirekisho };
  };

  runCvAiParseRef.current = async (filesOverride) => {
    const sourceList =
      filesOverride != null && Array.isArray(filesOverride) && filesOverride.length > 0
        ? filesOverride
        : cvFilesRef.current;
    const parseableFiles = sourceList.filter(
      (f) => isSupportedCvOriginalFile(f) && f.size <= MAX_CV_FILE_SIZE_BYTES
    );
    if (parseableFiles.length === 0) {
      notify.warning(
        t.addCandidateAiParseNoFiles || 'Chưa có file CV hợp lệ trong danh sách để phân tích.'
      );
      return;
    }

    setParseError(null);
    setParseSuccess(null);
    setIsParsing(true);
    setParseProgress({ current: 0, total: parseableFiles.length });

    try {
      const formDataUpload = new FormData();
      parseableFiles.forEach((file) => {
        formDataUpload.append('files', file);
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000000);

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/v2/parser/cv`, {
          method: 'POST',
          body: formDataUpload,
          signal: controller.signal,
          headers: {},
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.warn(`Skipping parse for batch:`, fetchError.message);
        setParseSuccess(
          t.addCandidateAiParseNetworkFail ||
            `Không thể gọi phân tích AI. Vui lòng thử lại hoặc điền thủ công.`
        );
        setIsParsing(false);
        return;
      }

      setParseProgress({ current: parseableFiles.length, total: parseableFiles.length });

      if (!response.ok) {
        console.warn(`Skipping parse for batch: Server returned ${response.status}`);
        setParseSuccess(
          t.addCandidateAiParseHttpFail ||
            `Phân tích AI thất bại (HTTP ${response.status}). Vui lòng điền thủ công.`
        );
        setIsParsing(false);
        return;
      }

      let resumeData;
      try {
        resumeData = await response.json();
      } catch (jsonError) {
        console.warn(`Skipping parse for batch: Invalid response format`, jsonError);
        setParseSuccess(
          t.addCandidateAiParseBadResponse ||
            'Phản hồi phân tích không hợp lệ. Vui lòng điền thủ công.'
        );
        setIsParsing(false);
        return;
      }

      if (resumeData && Object.keys(resumeData).length > 0) {
        console.log(`Parsed ResumeData from batch:`, resumeData);
        mergeResumeData(resumeData);
        setParseSuccess(
          t.addCandidateAiParseOk ||
            `Đã trích xuất dữ liệu từ ${parseableFiles.length} file CV.`
        );
      } else {
        console.warn(`Skipping parse for batch: Empty response data`);
        setParseSuccess(
          t.addCandidateAiParseEmpty ||
            'Phân tích AI không trả về dữ liệu. Vui lòng điền thủ công.'
        );
      }
    } catch (err) {
      console.warn(`Skipping parse for batch:`, err.message);
      setParseSuccess(
        t.addCandidateAiParseError ||
          'Lỗi khi phân tích CV. Vui lòng điền thủ công.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (e?.target) e.target.value = '';
    if (files.length === 0) return;

    const parseableFiles = files.filter((f) => {
      const isSupported = isSupportedCvOriginalFile(f);
      const isValidSize = f.size <= MAX_CV_FILE_SIZE_BYTES;
      return isSupported && isValidSize;
    });

    if (parseableFiles.length === 0) {
      const invalidFiles = files.filter((f) => {
        const okType = isSupportedCvOriginalFile(f);
        const isValidSize = f.size <= MAX_CV_FILE_SIZE_BYTES;
        return !okType || !isValidSize;
      });

      let errorMsg = 'Vui lòng chọn file CV hợp lệ';
      if (invalidFiles.length > 0) {
        const tooLarge = invalidFiles.filter((f) => f.size > MAX_CV_FILE_SIZE_BYTES);
        if (tooLarge.length > 0) {
          errorMsg = `Một số file quá lớn (tối đa ${MAX_CV_FILE_SIZE_MB}MB): ${tooLarge.map((f) => f.name).join(', ')}`;
        } else {
          errorMsg =
            'Vui lòng chọn file PDF, Word, Excel, PowerPoint, \u1EA3nh (JPG/PNG/GIF/WEBP), TXT, RTF ho\u1EB7c ODT/ODS hợp lệ';
        }
      }
      setParseError(errorMsg);
      return;
    }

    setCvFiles((prev) => [...prev, ...parseableFiles]);
    setParseError(null);
    setParseSuccess(null);

    parseableFiles.forEach((file, fileIndex) => {
      try {
        const reader = new FileReader();

        reader.onloadend = () => {
          if (reader.result) {
            setCvPreviews((prev) => [...prev, { name: file.name, url: reader.result }]);
          } else {
            console.warn(`Failed to read file: ${file.name}`);
            setCvPreviews((prev) => [...prev, { name: file.name, url: null }]);
          }
        };

        reader.onerror = (error) => {
          console.error(`Error reading file ${file.name}:`, error);
          setParseError(`Không thể đọc file: ${file.name}. Vui lòng thử lại.`);
          setCvFiles((prev) =>
            prev.filter((_, i) => i !== prev.length - parseableFiles.length + fileIndex)
          );
        };

        reader.onabort = () => {
          console.warn(`File reading aborted: ${file.name}`);
          setCvFiles((prev) =>
            prev.filter((_, i) => i !== prev.length - parseableFiles.length + fileIndex)
          );
        };

        reader.readAsDataURL(file);
      } catch (error) {
        console.error(`Error setting up FileReader for ${file.name}:`, error);
        setParseError(`Lỗi khi xử lý file: ${file.name}. ${error.message}`);
        setCvFiles((prev) =>
          prev.filter((_, i) => i !== prev.length - parseableFiles.length + fileIndex)
        );
      }
    });

    const n = parseableFiles.length;
    if (autoParseCv) {
      setParseSuccess(
        (t.addCandidateStagedClickAi || 'Đã thêm {n} file. Bấm «Phân tích AI» để trích xuất dữ liệu.').replace(
          '{n}',
          String(n)
        )
      );
    } else {
      setParseSuccess(
        (t.addCandidateStagedUploadOnly || 'Đã thêm {n} file.').replace('{n}', String(n))
      );
    }
  };
  const handleCvDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCvUpload(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length === 0) return;
    await handleFileUpload({ target: { files } });
  };

  const handleSingleRoleUpload = async (role, e) => {
    const file = e?.target?.files?.[0];
    if (e?.target) e.target.value = '';
    if (!file) return;

    const isSupported = isSupportedCvOriginalFile(file);
    const isValidSize = file.size <= MAX_CV_FILE_SIZE_BYTES;
    if (!isSupported || !isValidSize) {
      setParseError(
        !isSupported
          ? 'Vui lòng chọn file PDF, Word, Excel, PowerPoint, ảnh (JPG/PNG/GIF/WEBP), TXT, RTF hoặc ODT/ODS hợp lệ'
          : `File quá lớn (tối đa ${MAX_CV_FILE_SIZE_MB}MB): ${file.name}`
      );
      return;
    }

    const targetIndex = role === 'cv' ? 0 : 1;
    setParseError(null);
    setParseSuccess(
      role === 'cv'
        ? 'Đã cập nhật file CV.'
        : 'Đã cập nhật file Shokumu.'
    );

    setCvFiles((prev) => {
      const next = [...prev];
      next[targetIndex] = file;
      return next.filter(Boolean);
    });

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result || null;
        setCvPreviews((prev) => {
          const next = [...prev];
          next[targetIndex] = { name: file.name, url };
          return next.filter(Boolean);
        });
      };
      reader.readAsDataURL(file);
    } catch {
      setCvPreviews((prev) => {
        const next = [...prev];
        next[targetIndex] = { name: file.name, url: null };
        return next.filter(Boolean);
      });
    }
  };

  /** Khi sửa (admin/CTV): đưa toàn bộ CV gốc từ server vào cùng danh sách upload — xóa/thêm file như bình thường; không gọi AI trừ khi user bật toggle và bấm Phân tích AI. */
  useEffect(() => {
    if (!candidateId || isApplicantProfile || !existingOriginals?.length) return;
    const sorted = [...existingOriginals]
      .filter((item) => item?.index != null)
      .sort((a, b) => a.index - b.index);
    if (!sorted.length) return;
    const key = `${candidateId}:${sorted.map((i) => i.index).join(',')}`;
    if (hydratedExistingOriginalsKeyRef.current === key) return;

    let cancelled = false;
    (async () => {
      setParseError(null);
      try {
        const files = await Promise.all(
          sorted.map(async (item) => {
            const fileBuffer = isAdmin
              ? await apiService.getAdminCVFileContent(candidateId, 'cvOriginalPath', { index: item.index })
              : await apiService.getCtvCVFileContent(candidateId, 'cvOriginalPath', { index: item.index });
            return new File([fileBuffer], item.name || `cv-original-${item.index}`);
          })
        );
        if (cancelled) return;
        hydratedExistingOriginalsKeyRef.current = key;
        setCvFiles(files);
        setCvPreviews(files.map((f) => ({ name: f.name, url: null })));
      } catch (error) {
        if (cancelled) return;
        hydratedExistingOriginalsKeyRef.current = '';
        setIsParsing(false);
        setParseError(error?.message || 'Không thể tải CV gốc.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidateId, isApplicantProfile, isAdmin, existingOriginals]);

  const handleRemoveCV = (index) => {
    if (index !== undefined) {
      // Remove specific file
      setCvFiles(prev => prev.filter((_, i) => i !== index));
      setCvPreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      // Remove all files
      setCvFiles([]);
      setCvPreviews([]);
      if (cvMainFileInputRef.current) cvMainFileInputRef.current.value = '';
      if (cvShokumuFileInputRef.current) cvShokumuFileInputRef.current.value = '';
    }
    setParseError(null);
    setParseSuccess(null);
    // Clear error
    if (errors.cvFiles) {
      setErrors(prev => ({
        ...prev,
        cvFiles: ''
      }));
    }
  };

  /** Xóa file theo ô CV / Shokumu (giữ thứ tự slot: [CV, Shokumu]). Xóa CV sẽ xóa cả Shokumu vì luồng form yêu cầu CV trước. */
  const handleClearUploadSlot = (role) => {
    if (role === 'shokumu') {
      setCvFiles((prev) => (prev.length > 1 ? [prev[0]] : prev));
      setCvPreviews((prev) => (prev.length > 1 ? [prev[0]] : prev));
      if (cvShokumuFileInputRef.current) cvShokumuFileInputRef.current.value = '';
    } else {
      setCvFiles([]);
      setCvPreviews([]);
      if (cvMainFileInputRef.current) cvMainFileInputRef.current.value = '';
      if (cvShokumuFileInputRef.current) cvShokumuFileInputRef.current.value = '';
    }
    setParseError(null);
    setParseSuccess(null);
    if (errors.cvFiles) {
      setErrors((prev) => ({ ...prev, cvFiles: '' }));
    }
  };

  const handleManualUpdateScroll = () => {
    setMobileCvTab('form');
    manualUpdateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Education handlers — 1 dòng = 1 item education_history (school_name, major, 入学年月=year/month, 卒業年月=endYear/endMonth)
  const handleAddEducation = () => {
    cvInsertPendingRef.current = { type: 'addEducation' };
    setFormData(prev => {
      const r = cvInsertPendingRef.current;
      if (!r || r.type !== 'addEducation') return prev;
      cvInsertPendingRef.current = null;
      return {
      ...prev,
        educations: [...(prev.educations || []), { school_name: '', major: '', year: '', month: '', endYear: '', endMonth: '', content: '' }]
      };
    });
  };

  /** Chèn 1 học vấn tại vị trí index (dùng cho nút 挿入 giữa 2 hàng). Ref tránh Strict Mode gọi 2 lần → chèn 2 mục. */
  const handleInsertEducationAt = (index) => {
    cvInsertPendingRef.current = { type: 'education', index };
    setFormData(prev => {
      const r = cvInsertPendingRef.current;
      if (!r || r.type !== 'education' || r.index !== index) return prev;
      cvInsertPendingRef.current = null;
      const next = [...(prev.educations || [])];
      next.splice(index, 0, { school_name: '', major: '', year: '', month: '', endYear: '', endMonth: '', content: '' });
      return { ...prev, educations: next };
    });
  };

  const updateEducation = (index, field, value) => {
    const updated = [...formData.educations];
    const item = updated[index] || {};
    updated[index] = { ...item, [field]: value };
    if (field === 'school_name' || field === 'major') {
      const sn = field === 'school_name' ? (value || '').trim() : (item.school_name ?? '').toString().trim();
      const mj = field === 'major' ? (value || '').trim() : (item.major ?? '').toString().trim();
      updated[index].content = [sn, mj].filter(Boolean).join(' / ') || '';
    } else if (field === 'content') {
      const parts = (value || '').trim().split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
      updated[index].school_name = parts[0] ?? '';
      updated[index].major = parts.slice(1).join(' / ') ?? '';
    }
    setFormData(prev => ({ ...prev, educations: updated }));
  };

  const removeEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      educations: prev.educations.filter((_, i) => i !== index)
    }));
  };

  // Employment handlers — 職歴: thêm tay chỉ 1 hàng đơn; API có thể trả về cặp 入社/退社 (2 item)

  /** Thêm 1 kinh nghiệm làm việc (1 item = start/end tách riêng). */
  const createEmptyProject = () => ({
    project_name: '',
    role: '',
    description: '',
    tools_tech: '',
    team_size: '',
    period: '',
  });

  const createEmptyWorkExperience = () => ({
    company_name: '',
    employmentPlace: '',
    companyRole: '',
    business_purpose: '',
    scale_role: '',
    description: '',
    tools_tech: '',
    reason_for_leaving: '',
    startYear: '',
    startMonth: '',
    endYear: '',
    endMonth: '',
    endCurrent: false,
    period: '',
    year: '',
    month: '',
    projects: [],
  });

  const handleAddWorkExperience = () => {
    setFormData(prev => ({
      ...prev,
      workExperiences: [
        ...(prev.workExperiences || []),
        createEmptyWorkExperience(),
      ],
      workHistoryCount: (prev.workHistoryCount != null ? prev.workHistoryCount : (prev.workExperiences?.length || 0)) + 1,
    }));
  };

  /** Chèn 1 kinh nghiệm tại vị trí index. */
  const handleInsertWorkExperienceAt = (index) => {
    setFormData(prev => {
      const list = [...(prev.workExperiences || [])];
      list.splice(index, 0, createEmptyWorkExperience());
      return { ...prev, workExperiences: list, workHistoryCount: (prev.workHistoryCount != null ? prev.workHistoryCount : list.length) };
    });
  };

  /** Chèn 1 block 2 dòng cho template Shokumu (giữ tương thích). */
  const handleAddShokumuTable = () => handleAddWorkExperience();

  /** Chèn 1 block 2 dòng cho template Shokumu (giữ tương thích). */
  const handleInsertWorkExperienceBlockAt = (blockIndex) => handleInsertWorkExperienceAt(blockIndex);

  const updateEmployment = (index, field, value) => {
    const updated = [...(formData.workExperiences || [])];
    if (!updated[index]) updated[index] = createEmptyWorkExperience();
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'startYear' || field === 'startMonth' || field === 'endYear' || field === 'endMonth' || field === 'endCurrent') {
      const startYear = updated[index].startYear || updated[index].year || '';
      const startMonth = updated[index].startMonth || updated[index].month || '';
      const endYear = updated[index].endYear || updated[index].end_year || '';
      const endMonth = updated[index].endMonth || updated[index].end_month || '';
      const start = [startYear, startMonth].filter(Boolean).join('/');
      const end = updated[index].endCurrent
        ? '現在'
        : [endYear, endMonth].filter(Boolean).join('/');
      updated[index].start_date = start;
      updated[index].end_date = updated[index].endCurrent ? '現在' : end;
      updated[index].period = formatShokumuPeriodRangeJa(start, end);
      updated[index].year = startYear;
      updated[index].month = startMonth;
    }
    setFormData(prev => ({ ...prev, workExperiences: updated }));
  };

  const updateProject = (workIndex, projectIndex, field, value) => {
    setFormData(prev => {
      const list = [...(prev.workExperiences || [])];
      const work = list[workIndex] ? { ...list[workIndex] } : createEmptyWorkExperience();
      const projects = Array.isArray(work.projects) ? [...work.projects] : [];
      if (!projects[projectIndex]) projects[projectIndex] = createEmptyProject();
      projects[projectIndex] = { ...projects[projectIndex], [field]: value };
      work.projects = projects;
      list[workIndex] = work;
      return { ...prev, workExperiences: list };
    });
  };

  const handleAddProjectToWorkExperience = (workIndex) => {
    setFormData(prev => {
      const list = [...(prev.workExperiences || [])];
      const work = list[workIndex] ? { ...list[workIndex] } : createEmptyWorkExperience();
      const projects = Array.isArray(work.projects) ? [...work.projects] : [];
      projects.push(createEmptyProject());
      work.projects = projects;
      list[workIndex] = work;
      return { ...prev, workExperiences: list };
    });
  };

  const handleRemoveProjectFromWorkExperience = (workIndex, projectIndex) => {
    setFormData(prev => {
      const list = [...(prev.workExperiences || [])];
      const work = list[workIndex];
      if (!work) return prev;
      const projects = Array.isArray(work.projects) ? work.projects.filter((_, i) => i !== projectIndex) : [];
      list[workIndex] = { ...work, projects };
      return { ...prev, workExperiences: list };
    });
  };

  /** Giữ hàm cũ để tránh lỗi từ template/props, nhưng hiện chỉ cập nhật 1 item. */
  const updateEmploymentPair = (blockIndex, field, value) => updateEmployment(blockIndex, field, value);

  /** Toggle checkbox 役割・担当業務 / 作業工程 trong bảng 職務経歴 (Shokumu). workIndex = index trong workExperiences, type = 'role' | 'process', key = 'PM' | '要件定義' | ... */
  const toggleShokumuCheckbox = (workIndex, type, key) => {
    const field = type === 'role' ? 'roleCheckboxes' : 'processCheckboxes';
    setFormData(prev => {
      const list = [...(prev.workExperiences || [])];
      const row = list[workIndex] || {};
      const arr = row[field] && Array.isArray(row[field]) ? [...row[field]] : [];
      const idx = arr.indexOf(key);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(key);
      list[workIndex] = { ...row, [field]: arr };
      return { ...prev, workExperiences: list };
    });
  };

  const removeEmployment = (index) => {
    setFormData(prev => ({
      ...prev,
      workExperiences: prev.workExperiences.filter((_, i) => i !== index)
    }));
  };

  const getWorkExperienceProjects = (workExperience) => Array.isArray(workExperience?.projects) ? workExperience.projects : [];

  /** Xóa một kinh nghiệm (cả cặp 入社 + 退社) — index = block index (thứ tự card). */
  const removeEmploymentPair = (blockIndex) => {
    setFormData(prev => {
      const list = prev.workExperiences || [];
      const i0 = blockIndex * 2;
      const i1 = blockIndex * 2 + 1;
      const nextList = list.filter((_, i) => i !== i0 && i !== i1);
      const nextBlockCount = Math.max(1, (prev.workHistoryCount != null ? prev.workHistoryCount : Math.ceil(list.length / 2)) - 1);
      return { ...prev, workExperiences: nextList, workHistoryCount: nextBlockCount };
    });
  };

  // Certificate handlers
  const handleAddCertificate = () => {
    cvInsertPendingRef.current = { type: 'addCertificate' };
    setFormData(prev => {
      const r = cvInsertPendingRef.current;
      if (!r || r.type !== 'addCertificate') return prev;
      cvInsertPendingRef.current = null;
      return {
      ...prev,
        certificates: [...(prev.certificates || []), { year: '', month: '', name: '' }]
      };
    });
  };

  /** Chèn 1免許・資格 tại vị trí index (dùng cho nút 挿入 giữa 2 hàng). Ref tránh Strict Mode chèn 2 mục. */
  const handleInsertCertificateAt = (index) => {
    cvInsertPendingRef.current = { type: 'certificate', index };
    setFormData(prev => {
      const r = cvInsertPendingRef.current;
      if (!r || r.type !== 'certificate' || r.index !== index) return prev;
      cvInsertPendingRef.current = null;
      const next = [...(prev.certificates || [])];
      next.splice(index, 0, { year: '', month: '', name: '' });
      return { ...prev, certificates: next };
    });
  };

  const updateCertificate = (index, field, value) => {
    const updated = [...(formData.certificates || [])];
    if (!updated[index]) return;
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, certificates: updated }));
  };

  const removeCertificate = (index) => {
    setFormData(prev => ({
      ...prev,
      certificates: (prev.certificates || []).filter((_, i) => i !== index)
    }));
  };

  // Tools handlers
  const handleAddLearnedTool = () => {
    setFormData(prev => ({
      ...prev,
      learnedTools: [...(prev.learnedTools || []), '']
    }));
  };

  const updateLearnedTool = (index, value) => {
    const updated = [...(formData.learnedTools || [])];
    if (index < 0 || index >= updated.length) return;
    updated[index] = value;
    setFormData(prev => ({ ...prev, learnedTools: updated }));
  };

  const removeLearnedTool = (index) => {
    setFormData(prev => ({
      ...prev,
      learnedTools: (prev.learnedTools || []).filter((_, i) => i !== index)
    }));
  };

  const handleInsertLearnedToolAt = (index) => {
    setFormData(prev => {
      const next = [...(prev.learnedTools || [])];
      next.splice(index + 1, 0, '');
      return { ...prev, learnedTools: next };
    });
  };

  const handleAddExperienceTool = () => {
    setFormData(prev => ({
      ...prev,
      experienceTools: [...(prev.experienceTools || []), '']
    }));
  };

  const updateExperienceTool = (index, value) => {
    const updated = [...(formData.experienceTools || [])];
    updated[index] = value;
    setFormData(prev => ({ ...prev, experienceTools: updated }));
  };

  // Toggle checkbox cho bảng 使用可能ツール・ソフトウェア等枠
  const isToolChecked = (type, name) => {
    const list = type === 'learned' ? (formData.learnedTools || []) : (formData.experienceTools || []);
    return list.includes(name);
  };

  const toggleToolCheckbox = (type, name) => {
    setFormData(prev => {
      const key = type === 'learned' ? 'learnedTools' : 'experienceTools';
      const list = prev[key] || [];
      const exists = list.includes(name);
      const nextList = exists ? list.filter(t => t !== name) : [...list, name];
      return { ...prev, [key]: nextList };
    });
  };

  const removeExperienceTool = (index) => {
    setFormData(prev => ({
      ...prev,
      experienceTools: (prev.experienceTools || []).filter((_, i) => i !== index)
    }));
  };

  const handleInsertExperienceToolAt = (index) => {
    setFormData(prev => {
      const next = [...(prev.experienceTools || [])];
      next.splice(index + 1, 0, '');
      return { ...prev, experienceTools: next };
    });
  };

  const TECHNICAL_TOOLS = ['AutoCAD', 'CATIA', 'I-DEAS', 'SolidWorks', 'PLC', 'C++', 'NX', 'Java'];

  const handleAddLearnedToolFromSelect = (e) => {
    const value = e.target.value;
    if (!value) return;
    if (value === '__OTHER__') {
      setFormData(prev => ({
        ...prev,
        learnedTools: [...(prev.learnedTools || []), '']
      }));
      e.target.value = '';
      return;
    }
    setFormData(prev => {
      const list = prev.learnedTools || [];
      if (list.includes(value)) return prev;
      return { ...prev, learnedTools: [...list, value] };
    });
    e.target.value = '';
  };

  const handleAddExperienceToolFromSelect = (e) => {
    const value = e.target.value;
    if (!value) return;
    setFormData(prev => {
      const list = prev.experienceTools || [];
      if (list.includes(value)) return prev;
      return { ...prev, experienceTools: [...list, value] };
    });
    e.target.value = '';
  };

  const handleAddCertificateOfType = (name) => {
    if (!name) return;
    setFormData(prev => ({
      ...prev,
      certificates: [
        ...(prev.certificates || []),
        { year: '', month: '', name }
      ]
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (isAdmin) {
      const collaboratorIdStr = formData.collaboratorId != null ? String(formData.collaboratorId).trim() : '';
      if (collaboratorIdStr) {
        const collaboratorIdInt = parseInt(collaboratorIdStr, 10);
        if (isNaN(collaboratorIdInt) || collaboratorIdInt <= 0) {
          newErrors.collaboratorId = 'ID CTV phải là số nguyên dương';
        }
      }
    }
    if (!formData.nameKanji || !formData.nameKanji.trim()) {
      newErrors.nameKanji = t.addCandidateNameRequired || 'Họ tên là bắt buộc';
    }
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = t.addCandidateEmailRequired || 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t.addCandidateEmailInvalid || 'Email không hợp lệ';
    }
    const phoneRaw = String(formData.phone || '').trim();
    if (phoneRaw) {
      const phoneRegex = /^\+?[0-9()\-\s.]{8,20}$/;
      const digits = phoneRaw.replace(/\D/g, '');
      if (!phoneRegex.test(phoneRaw) || digits.length < 8 || digits.length > 15) {
        newErrors.phone = t.addCandidatePhoneInvalid || 'Số điện thoại không hợp lệ';
      }
    }
    if (!candidateId && cvFiles.length === 0) {
      newErrors.cvFiles = t.addCandidateCvRequired || 'File CV gốc là bắt buộc';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** FormData gửi lên API lưu CV — dùng chung handleSubmit và «Gửi duyệt bổ sung» (CTV). */
  const buildCandidateSubmitFormData = async () => {
    const submitFormData = new FormData();
    if (candidateId && markReadyForParseAfterSave) {
      submitFormData.append('markReadyForParse', '1');
    }
    submitFormData.append('nameKanji', formData.nameKanji || '');
    submitFormData.append('nameKana', formData.nameKana || '');
    submitFormData.append('birthDate', formData.birthDate || '');
    submitFormData.append('age', formData.age || '');
    let genderValue = formData.gender || '';
    if (genderValue === '男') genderValue = '1';
    else if (genderValue === '女') genderValue = '2';
    submitFormData.append('gender', genderValue);
    submitFormData.append('postalCode', formData.postalCode || '');
    submitFormData.append('address', formData.address || '');
    submitFormData.append('phone', formData.phone || '');
    submitFormData.append('email', formData.email || '');
    submitFormData.append('addressOrigin', formData.addressOrigin || '');
    if (formData.nearestStationLine) submitFormData.append('nearestStationLine', formData.nearestStationLine);
    if (formData.nearestStationName) submitFormData.append('nearestStationName', formData.nearestStationName);
    if (formData.dependentsCount !== '') submitFormData.append('dependentsCount', formData.dependentsCount);
    if (formData.hasSpouse) submitFormData.append('hasSpouse', formData.hasSpouse === '有' ? '1' : '0');
    if (formData.spouseDependent) submitFormData.append('spouseDependent', formData.spouseDependent === '有' ? '1' : '0');
    const passportValue = mapPassportToBool(formData.passport);
    if (passportValue !== undefined) submitFormData.append('passport', String(passportValue));
    if (formData.jpResidenceStatus) submitFormData.append('jpResidenceStatus', formData.jpResidenceStatus);
    if (formData.stayPurpose) submitFormData.append('stayPurpose', formData.stayPurpose);
    if (formData.jpConversationLevel) submitFormData.append('jpConversationLevel', formData.jpConversationLevel);
    if (formData.enConversationLevel) submitFormData.append('enConversationLevel', formData.enConversationLevel);
    if (formData.otherConversationLevel) submitFormData.append('otherConversationLevel', formData.otherConversationLevel);
    submitFormData.append('visaExpirationDate', formData.visaExpirationDate || '');
    submitFormData.append('educations', JSON.stringify(formData.educations || []));
    submitFormData.append('workExperiences', JSON.stringify(formData.workExperiences || []));
    submitFormData.append('certificates', JSON.stringify(formData.certificates || []));
    if (formData.learnedTools && formData.learnedTools.length > 0) {
      submitFormData.append('learnedTools', JSON.stringify(formData.learnedTools));
    }
    if (formData.experienceTools && formData.experienceTools.length > 0) {
      submitFormData.append('experienceTools', JSON.stringify(formData.experienceTools));
    }
    if (formData.toolsSoftwareNotes) {
      submitFormData.append('toolsSoftwareNotes', JSON.stringify(formData.toolsSoftwareNotes));
    }
    submitFormData.append('technicalSkills', formData.technicalSkills || '');
    if (formData.jlptLevel) submitFormData.append('jlptLevel', formData.jlptLevel);
    if (formData.jlptAcquiredYear) submitFormData.append('jlptAcquiredYear', formData.jlptAcquiredYear);
    if (formData.toeicScore !== undefined && formData.toeicScore !== '') submitFormData.append('toeicScore', formData.toeicScore);
    if (formData.toeicYear) submitFormData.append('toeicYear', formData.toeicYear);
    if (formData.toeicMonth) submitFormData.append('toeicMonth', formData.toeicMonth);
    if (formData.toeicScore || formData.toeicYear || formData.toeicMonth) submitFormData.append('toeicCertName', 'TOEIC');
    if (formData.ieltsScore !== undefined && formData.ieltsScore !== '') submitFormData.append('ieltsScore', formData.ieltsScore);
    if (formData.ieltsYear) submitFormData.append('ieltsYear', formData.ieltsYear);
    if (formData.ieltsMonth) submitFormData.append('ieltsMonth', formData.ieltsMonth);
    if (formData.ieltsScore || formData.ieltsYear || formData.ieltsMonth) submitFormData.append('ieltsCertName', 'IELTS');
    if (formData.experienceYears) submitFormData.append('experienceYears', formData.experienceYears);
    if (formData.hasDrivingLicense !== '') submitFormData.append('hasDrivingLicense', formData.hasDrivingLicense);
    if (formData.drivingLicenseYear) submitFormData.append('drivingLicenseYear', formData.drivingLicenseYear);
    if (formData.drivingLicenseMonth) submitFormData.append('drivingLicenseMonth', formData.drivingLicenseMonth);
    if (formData.hasDrivingLicense === '1' || formData.drivingLicenseYear || formData.drivingLicenseMonth) submitFormData.append('drivingLicenseCertName', '自動車免許');
    submitFormData.append('careerSummary', formData.careerSummary || '');
    submitFormData.append('strengths', formData.strengths || '');
    submitFormData.append('notes', formData.remarks || '');
    submitFormData.append('languageSkillRemarks', formData.languageSkillRemarks || '');
    submitFormData.append('hobbiesSpecialSkills', formData.hobbiesSpecialSkills || '');
    submitFormData.append('motivation', formData.motivation || '');
    submitFormData.append('currentSalary', formData.currentSalary || '');
    submitFormData.append('desiredSalary', formData.desiredSalary || '');
    submitFormData.append('desiredPosition', formData.desiredPosition || '');
    submitFormData.append('jobCategoryId', formData.jobCategoryId || '');
    submitFormData.append('desiredLocation', formData.desiredLocation || '');
    submitFormData.append('desiredStartDate', formData.desiredStartDate || '');
    const collaboratorIdStr = formData.collaboratorId != null ? String(formData.collaboratorId).trim() : '';
    if (isAdmin && collaboratorIdStr) {
      submitFormData.append('collaboratorId', collaboratorIdStr);
    }
    submitFormData.append('cvTemplate', cvTemplate || 'common');
    submitFormData.append('cvTableLayout', JSON.stringify(formData.cvTableLayout || {}));
    if (isAdmin) {
      submitFormData.append('adminSupplementMarks', JSON.stringify(formData.adminSupplementMarks || []));
    }
    if (cvFiles.length > 0) {
      cvFiles.forEach((file) => {
        submitFormData.append('cvFile', file);
      });
    }
    let avatarSentAsMultipartFile = false;
    const resolvedAvatarDataUrl = await ensureAvatarBase64();
    if (avatarFile) {
      submitFormData.append('avatarPhoto', avatarFile);
      avatarSentAsMultipartFile = true;
    } else if (resolvedAvatarDataUrl && resolvedAvatarDataUrl.startsWith('data:image/')) {
      // Đảm bảo backend luôn có ảnh để render PDF/template snapshot,
      // kể cả khi avatar hiện tại đang là ảnh đã lưu từ lần trước.
      try {
        const res = await fetch(resolvedAvatarDataUrl);
        const blob = await res.blob();
        submitFormData.append('avatarPhoto', blob, 'avatar.jpg');
        avatarSentAsMultipartFile = true;
      } catch (_) {
        submitFormData.append('avatarBase64', resolvedAvatarDataUrl);
      }
    }
    // Không gửi avatarBase64 khi đã có avatarPhoto — tránh vượt giới hạn fieldSize của multer/busboy (~1MB mặc định).
    if (!avatarSentAsMultipartFile && resolvedAvatarDataUrl && resolvedAvatarDataUrl.startsWith('data:image/')) {
      submitFormData.append('avatarBase64', resolvedAvatarDataUrl);
    }
    return submitFormData;
  };

  const submitCandidate = async (options = {}) => {
    const submitFormData = await buildCandidateSubmitFormData();
    if (options.allowDuplicate) {
      submitFormData.append('allowDuplicate', '1');
    }

    if (isAdmin) {
      const response = candidateId
        ? await apiService.updateAdminCV(candidateId, submitFormData)
        : await apiService.createAdminCV(submitFormData);
      if (response.success) {
        notify.success(candidateId ? 'Ứng viên đã được cập nhật thành công!' : 'Ứng viên đã được lưu thành công!');
        return { response };
      }
      const errorMsg = response.message || (candidateId ? 'Có lỗi xảy ra khi cập nhật ứng viên' : 'Có lỗi xảy ra khi tạo ứng viên');
      throw new Error(errorMsg);
    }

    if (isApplicantProfile) {
      const response = await apiService.createCVStorage(submitFormData);
      if (response.success) {
        notify.success('Hồ sơ đã được lưu thành công!');
        const newId = response.data?.cv?.id;
        if (newId != null) {
          setApplicantLoadedCvId(newId);
        }
        if (onSuccess) onSuccess();
        else navigate(`${candidateLandingPrefix}/profile`);
        return { response };
      }
      throw new Error(response.message || 'Có lỗi xảy ra khi lưu hồ sơ');
    }

    const response = candidateId
      ? await apiService.updateCVStorage(candidateId, submitFormData)
      : await apiService.createCVStorage(submitFormData);
    const isDuplicate = response.success
      ? (response.data?.duplicateInfo?.isDuplicate ?? response.data?.isDuplicate)
      : false;
    if (!candidateId && jobId && response.success && response.data?.cv && !isDuplicate) {
      try {
        await apiService.createJobApplication({
          jobId: parseInt(jobId),
          cvId: response.data.cv.id,
          cvCode: response.data.cv.code || '',
          cvSource: 'original'
        });
      } catch (nominateError) {
        console.error('Error creating nomination:', nominateError);
        notify.warning('CV đã được tạo thành công nhưng có lỗi khi tiến cử. Vui lòng thử lại.');
      }
    }
    if (response.success) {
      return { response, isDuplicate };
    }
    throw new Error(response.message || (candidateId ? 'Có lỗi xảy ra khi cập nhật' : 'Có lỗi xảy ra khi lưu thông tin'));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    flushSync(() => {});
    setTimeout(async () => {
      try {
        const firstResult = await submitCandidate();
        if (firstResult?.response?.success) {
          const { response, isDuplicate } = firstResult;
          if (!candidateId && jobId && isDuplicate) {
            notify.warning('Hồ sơ đã được lưu nhưng bị đánh dấu trùng với hồ sơ có sẵn trong hệ thống.');
            if (onSuccess) onSuccess();
            else navigate('/agent/candidates');
            return;
          }
          if (!candidateId && !jobId) {
            if (isDuplicate) {
              notify.warning('Hồ sơ đã được lưu nhưng bị đánh dấu trùng với hồ sơ có sẵn trong hệ thống.');
            }
            if (onSuccess) onSuccess();
            else navigate('/agent/candidates');
            return;
          }
          if (candidateId) {
            notify.success('Ứng viên đã được cập nhật thành công!');
            if (onSuccess) onSuccess();
            else {
              const returnTo = location.state?.returnTo;
              if (location.state?.fromConfirm && returnTo) {
                navigate(returnTo, { state: location.state?.returnState || {} });
              } else {
                navigate(`/agent/candidates/${candidateId}`);
              }
            }
            return;
          }
          if (jobId) {
            notify.success('Tiến cử thành công!');
            if (onSuccess) onSuccess();
            else navigate(`/agent/jobs/${jobId}`);
            return;
          }
          notify.success('Ứng viên đã được lưu thành công!');
          if (onSuccess) onSuccess();
          else navigate('/agent/candidates');
          return;
        }
      } catch (error) {
        console.error('Error creating candidate:', error);
        const dupBlock = error?.data?.data?.duplicateInfo || error?.data?.duplicateInfo;
        const isDup409 = error.status === 409 && dupBlock?.blocked;
        const dupQuestion = 'Email hoặc số điện thoại trùng với hồ sơ hợp lệ khác. Vẫn tiếp tục tạo ?';
        if (isDup409) {
          const shouldContinue = window.confirm(dupQuestion);
          if (shouldContinue) {
            try {
              const secondResult = await submitCandidate({ allowDuplicate: true });
              if (secondResult?.response?.success) {
                const { isDuplicate } = secondResult;
                if (candidateId) {
                  notify.success('Ứng viên đã được cập nhật thành công!');
                  if (onSuccess) onSuccess();
                  else {
                    const returnTo = location.state?.returnTo;
                    if (location.state?.fromConfirm && returnTo) {
                      navigate(returnTo, { state: location.state?.returnState || {} });
                    } else {
                      navigate(`/agent/candidates/${candidateId}`);
                    }
                  }
                } else if (isDuplicate) {
                  notify.warning('Hồ sơ đã được lưu nhưng bị đánh dấu trùng với hồ sơ có sẵn trong hệ thống.');
                  if (onSuccess) onSuccess();
                  else navigate('/agent/candidates');
                } else if (jobId) {
                  notify.success('Tiến cử thành công!');
                  if (onSuccess) onSuccess();
                  else navigate(`/agent/jobs/${jobId}`);
                } else {
                  notify.success('Ứng viên đã được lưu thành công!');
                  if (onSuccess) onSuccess();
                  else navigate('/agent/candidates');
                }
              }
            } catch (retryError) {
              notify.error(retryError?.message || 'Có lỗi xảy ra khi lưu thông tin');
            }
            return;
          }
          notify.warning(dupQuestion);
          setErrors((prev) => ({ ...prev, email: undefined, phone: undefined }));
          return;
        }
        const errorMessage = error.message || (isAdmin ? 'Có lỗi xảy ra khi tạo ứng viên' : 'Có lỗi xảy ra khi lưu thông tin');
        notify.error(errorMessage);
      } finally {
        setSaving(false);
      }
    }, 0);
  };

  const handleCancel = () => {
    if (window.confirm('Bạn có chắc muốn hủy? Dữ liệu chưa lưu sẽ bị mất.')) {
      if (onCancel) {
        onCancel();
      } else if (isApplicantProfile) {
        navigate(candidateLandingPrefix);
      } else if (isAdmin) {
        navigate(candidateId ? `/admin/candidates/${candidateId}` : '/admin/candidates');
      } else {
        navigate(candidateId ? `/agent/candidates/${candidateId}` : (jobId ? `/agent/jobs/${jobId}` : '/agent/candidates'));
      }
    }
  };

  const getBackPath = () => {
    if (isApplicantProfile) return candidateLandingPrefix;
    if (isAdmin) return candidateId ? `/admin/candidates/${candidateId}` : '/admin/candidates';
    if (candidateId) return `/agent/candidates/${candidateId}`;
    return jobId ? `/agent/jobs/${jobId}` : '/agent/candidates';
  };

  const isBusy = initialLoading || saving || supplementSending;

  const allSuppMarks = formData.adminSupplementMarks || [];
  const supplementHeading = (fieldKey, text, wrapClassName = 'select-text inline min-w-0') => {
    if (!isAdmin) return text;
    return (
      <SupplementFieldWrap
        fieldKey={fieldKey}
        onContextMenu={(e) => supplementMarking.handleFieldContextMenu(e, fieldKey)}
        className={wrapClassName}
      >
        <SupplementMarkedText text={text} fieldKey={fieldKey} allMarks={allSuppMarks} />
      </SupplementFieldWrap>
    );
  };

  const supplementTemplateProps = {
    supplementMarking: {
      marks: formData.adminSupplementMarks || [],
      ...(isAdmin ? { onFieldContextMenu: supplementMarking.handleFieldContextMenu } : {}),
    },
  };

  const handleSendSupplementRequest = async () => {
    if (!isAdmin || !candidateId || isApplicantProfile) return;
    const marks = formData.adminSupplementMarks || [];
    if (!marks.length) {
      notify.error(t.addCandidateSupplementNeedMarks || 'Vui lòng đánh dấu ít nhất một đoạn cần bổ sung trước khi gửi.');
      return;
    }
    setSupplementSending(true);
    try {
      const res = await apiService.sendAdminCVSupplementRequest(candidateId, marks);
      if (res.success && res.data?.cv) {
        const m = res.data.cv.adminSupplementMarks;
        setFormData((prev) => ({
          ...prev,
          adminSupplementMarks: Array.isArray(m) ? m : [],
        }));
        notify.success(t.addCandidateSupplementSent || 'Đã gửi yêu cầu bổ sung thông tin.');
      } else {
        notify.error(res.message || t.addCandidateSupplementSendError || 'Không gửi được yêu cầu. Vui lòng thử lại.');
      }
    } catch (err) {
      notify.error(err?.message || t.addCandidateSupplementSendError || 'Không gửi được yêu cầu. Vui lòng thử lại.');
    } finally {
      setSupplementSending(false);
    }
  };

  const handleCtvSubmitSupplementReview = () => {
    if (isAdmin || !candidateId || isApplicantProfile) return;
    const marks = formData.adminSupplementMarks || [];
    if (!marks.length) {
      notify.error(t.addCandidateCtvSupplementNeedMarks || 'Chưa có yêu cầu bổ sung từ admin trên hồ sơ.');
      return;
    }
    setSaving(true);
    flushSync(() => {});
    setTimeout(async () => {
      try {
        const submitFormData = await buildCandidateSubmitFormData();
        const saveRes = await apiService.updateCVStorage(candidateId, submitFormData);
        if (!saveRes.success) {
          notify.error(saveRes.message || t.addCandidateCtvSupplementSaveError || 'Không lưu được hồ sơ. Vui lòng thử lại.');
          return;
        }
        const res = await apiService.submitCtvSupplementReview(candidateId);
        if (res.success) {
          notify.success(
            t.addCandidateCtvSupplementSavedAndSent ||
              'Đã cập nhật hồ sơ và gửi duyệt bổ sung tới admin.'
          );
        } else {
          notify.error(res.message || t.addCandidateCtvSupplementError || 'Đã lưu hồ sơ nhưng không gửi được duyệt. Vui lòng thử lại.');
        }
      } catch (err) {
        const dupBlock = err?.data?.data?.duplicateInfo || err?.data?.duplicateInfo;
        const isDup409 = err.status === 409 && dupBlock?.blocked;
        notify.error(err?.message || t.addCandidateCtvSupplementError || 'Có lỗi khi lưu hoặc gửi duyệt.');
        if (isDup409) {
          setErrors((prev) => ({
            ...prev,
            email: 'Email hoặc số điện thoại trùng với hồ sơ hợp lệ khác trong hệ thống.',
            phone: 'Email hoặc số điện thoại trùng với hồ sơ hợp lệ khác trong hệ thống.',
          }));
        }
      } finally {
        setSaving(false);
      }
    }, 0);
  };

  return (
    <div className="space-y-3 min-w-0 max-w-full">
      {/* Overlay loading khi đang lưu CV (giống AddJobPage phân tích JD) */}
      {saving && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}
          aria-busy="true"
          aria-live="polite"
        >
          <div
            className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"
            role="status"
            aria-label={t.addCandidateSaving ?? 'Đang lưu...'}
          />
          <p className="text-sm font-semibold" style={{ color: '#111827' }}>
            {t.addCandidateSavingCv || 'Đang lưu CV và tạo file PDF...'}
          </p>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            {t.addCandidateSavingHint || 'Vui lòng đợi trong giây lát'}
          </p>
        </div>
      )}

      {/* Thanh hành động: luôn render để không nhảy layout khi hết tải ứng viên */}
      <div className="sticky top-0 z-20 -mx-0.5 px-0.5 py-0.5 bg-gradient-to-b from-slate-100/95 to-slate-100/0 backdrop-blur-[2px] mb-1">
          <div
            className="rounded-xl border shadow-sm px-3 sm:px-4 py-2 flex flex-col gap-2 min-w-0"
            style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}
          >
            {/* Mobile: căn giữa dọc để tiêu đề cùng hàng nút; sm+: có phụ đề → căn đầu dòng */}
            <div className="flex flex-row items-center sm:items-start gap-2 w-full min-w-0">
              <div className="flex items-center sm:items-start gap-2 sm:gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  onMouseEnter={() => setHoveredBackButton(true)}
                  onMouseLeave={() => setHoveredBackButton(false)}
                  className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-colors border flex-shrink-0 sm:mt-0"
                  style={{
                    borderColor: '#d1d5db',
                    backgroundColor: hoveredBackButton ? '#f3f4f6' : '#ffffff',
                    color: '#374151',
                  }}
                  title={t.cancelButton || 'Hủy'}
                  aria-label={t.cancelButton || 'Hủy'}
                >
                  <ArrowLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">{t.cancelButton || 'Hủy'}</span>
                </button>
                <div
                  className="min-w-0 flex-1 border-l pl-2 sm:pl-3 overflow-hidden flex flex-col justify-center sm:block min-h-9 sm:min-h-0"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <h1
                    className="text-sm sm:text-base font-bold leading-none sm:leading-tight truncate whitespace-nowrap"
                    style={{ color: '#111827' }}
                  >
                    {initialLoading
                      ? (t.addCandidateLoadingCandidate || 'Đang tải thông tin ứng viên...')
                      : candidateId
                        ? (t.addCandidateTitleEdit || 'Chỉnh sửa ứng viên')
                        : (t.addCandidateTitleNew || 'Tạo ứng viên')}
                  </h1>
                  {!initialLoading && (
                    <p className="text-[10px] sm:text-xs mt-0.5 truncate hidden sm:block leading-snug" style={{ color: '#6b7280' }}>
                      {candidateId
                        ? (t.addCandidateSubtitleEdit || 'Cập nhật thông tin ứng viên')
                        : (t.addCandidateSubtitleNew || 'Thêm thông tin ứng viên mới vào hệ thống')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-row items-center gap-1 sm:gap-1.5 shrink-0 min-h-9 sm:min-h-0">
                {(!jobId || isAdmin) && (
                  <>
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
                      <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      {t.cancelButton || 'Hủy'}
                    </button>
                    <button
                      type="submit"
                      form="add-candidate-main-form"
                      onMouseEnter={() => setHoveredSaveButton(true)}
                      onMouseLeave={() => setHoveredSaveButton(false)}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-colors shrink-0 whitespace-nowrap"
                      style={{
                        backgroundColor: hoveredSaveButton ? '#1d4ed8' : '#2563eb',
                        color: 'white',
                        opacity: isBusy ? 0.8 : 1,
                      }}
                    >
                      <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      {saving
                        ? (candidateId ? (t.addCandidateUpdating || 'Đang cập nhật...') : (t.addCandidateSaving || 'Đang lưu...'))
                        : (candidateId ? (t.addCandidateUpdate || 'Cập nhật ứng viên') : (t.addCandidateSave || 'Lưu ứng viên'))}
                    </button>
                  </>
                )}

                {jobId && !isAdmin && (
                  <>
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
                      <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      {t.cancelButton || 'Hủy'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold transition-colors shrink-0 whitespace-nowrap max-w-[min(48vw,12rem)] sm:max-w-none"
                      style={{
                        backgroundColor: isBusy ? '#fde68a' : '#facc15',
                        color: '#1e3a8a',
                        opacity: isBusy ? 0.7 : 1,
                      }}
                    >
                      {saving ? (t.addCandidateSaving || 'Đang lưu...') : (t.addCandidateNominate || 'Tiến cử ứng viên')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {candidateId && !isApplicantProfile && (
              <div className="flex flex-col sm:flex-row flex-wrap gap-1.5 w-full justify-end min-w-0 pt-0.5 border-t xl:border-t-0 xl:pt-0" style={{ borderColor: '#e5e7eb' }}>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={supplementSending || !(formData.adminSupplementMarks?.length)}
                    onClick={handleSendSupplementRequest}
                    className="w-full sm:w-auto px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-colors disabled:opacity-50 text-center whitespace-normal leading-snug"
                    style={{ backgroundColor: '#1d4ed8', color: 'white' }}
                  >
                    {supplementSending ? '…' : (t.addCandidateSendSupplementRequest || 'Gửi yêu cầu bổ sung thông tin')}
                  </button>
                )}
                {!isAdmin && (
                  <button
                    type="button"
                    disabled={saving || !(formData.adminSupplementMarks?.length)}
                    onClick={handleCtvSubmitSupplementReview}
                    className="w-full sm:w-auto px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition-colors disabled:opacity-50 text-center whitespace-normal leading-snug"
                    style={{ backgroundColor: '#059669', color: 'white' }}
                    title={t.addCandidateCtvSupplementHint || 'Gửi thông báo tới admin phụ trách để duyệt sau khi đã bổ sung thông tin.'}
                  >
                    {saving ? '…' : (t.addCandidateCtvSubmitSupplementReview || 'Gửi duyệt bổ sung')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      {/* Upload CV - block riêng trên cùng (kể cả ứng viên: upload + parse giống CTV/admin) */}
      <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
          <FileText className="w-4 h-4" style={{ color: '#2563eb' }} />
          {supplementHeading('addCandidate-upload-cv', t.addCandidateUploadCv || 'Upload CV')}
          <span style={{ color: '#ef4444' }}>*</span>
        </h2>
      <div className="mb-3 text-xs" style={{ color: '#374151' }}>
        {t.addCandidateAutoParseCv ||
          'Sau khi chọn file, bạn có thể bấm Phân tích AI để trích xuất dữ liệu.'}
      </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              className="relative border-2 border-dashed rounded-lg p-5 text-center transition-colors"
              onMouseEnter={() => setHoveredUploadArea(true)}
              onMouseLeave={() => setHoveredUploadArea(false)}
              style={{
                borderColor: hoveredUploadArea ? '#2563eb' : '#d1d5db',
                backgroundColor: 'transparent'
              }}
            >
              <label htmlFor="cv-upload-main" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cvFiles[0] ? '#dbeafe' : '#f3f4f6' }}
                  >
                    {cvFiles[0] ? (
                      <FileText className="w-5 h-5" style={{ color: '#2563eb' }} />
                    ) : (
                      <Upload className="w-5 h-5" style={{ color: '#9ca3af' }} />
                    )}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: '#111827' }}>CV <span style={{ color: '#ef4444' }}>*</span></p>
                  {cvFiles[0] ? (
                    <>
                      <p className="text-[10px] font-medium max-w-full truncate px-6" style={{ color: '#2563eb' }}>
                        {cvFiles[0].name}
                      </p>
                      <p className="text-[10px]" style={{ color: '#6b7280' }}>
                        {(cvFiles[0].size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] font-medium" style={{ color: '#2563eb' }}>
                      {t.addCandidateSelectFile || 'Chọn file từ máy tính'}
                    </p>
                  )}
                </div>
                <input
                  ref={cvMainFileInputRef}
                  id="cv-upload-main"
                  type="file"
                  accept={CV_ORIGINAL_ACCEPT}
                  onChange={(e) => handleSingleRoleUpload('cv', e)}
                  className="hidden"
                />
              </label>
              {cvFiles[0] ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClearUploadSlot('cv');
                  }}
                  className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white/95 shadow-sm transition-colors hover:bg-red-50"
                  style={{ borderColor: '#e5e7eb', color: '#dc2626' }}
                  aria-label={t.addCandidateRemoveCvFile || 'Xóa file CV'}
                  title={t.addCandidateRemoveCvFile || 'Xóa file CV'}
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              ) : null}
            </div>

            <div
              className="relative border-2 border-dashed rounded-lg p-5 text-center transition-colors"
              onMouseEnter={() => setHoveredUploadArea(true)}
              onMouseLeave={() => setHoveredUploadArea(false)}
              style={{
                borderColor: hoveredUploadArea ? '#2563eb' : '#d1d5db',
                backgroundColor: 'transparent'
              }}
            >
              <label
                htmlFor="cv-upload-shokumu"
                className={`cursor-pointer ${cvFiles.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="flex flex-col items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cvFiles[1] ? '#dbeafe' : '#f3f4f6' }}
                  >
                    {cvFiles[1] ? (
                      <FileText className="w-5 h-5" style={{ color: '#2563eb' }} />
                    ) : (
                      <Upload className="w-5 h-5" style={{ color: '#9ca3af' }} />
                    )}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: '#111827' }}>Shokumu</p>
                  {cvFiles[1] ? (
                    <>
                      <p className="text-[10px] font-medium max-w-full truncate px-6" style={{ color: '#2563eb' }}>
                        {cvFiles[1].name}
                      </p>
                      <p className="text-[10px]" style={{ color: '#6b7280' }}>
                        {(cvFiles[1].size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] font-medium" style={{ color: '#2563eb' }}>
                      {cvFiles.length === 0
                        ? 'Vui lòng chọn CV trước'
                        : (t.addCandidateSelectFile || 'Chọn file từ máy tính')}
                    </p>
                  )}
                </div>
                <input
                  ref={cvShokumuFileInputRef}
                  id="cv-upload-shokumu"
                  type="file"
                  accept={CV_ORIGINAL_ACCEPT}
                  disabled={cvFiles.length === 0}
                  onChange={(e) => handleSingleRoleUpload('shokumu', e)}
                  className="hidden"
                />
              </label>
              {cvFiles[1] ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClearUploadSlot('shokumu');
                  }}
                  className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white/95 shadow-sm transition-colors hover:bg-red-50"
                  style={{ borderColor: '#e5e7eb', color: '#dc2626' }}
                  aria-label={t.addCandidateRemoveShokumuFile || 'Xóa file Shokumu'}
                  title={t.addCandidateRemoveShokumuFile || 'Xóa file Shokumu'}
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              ) : null}
            </div>
          </div>
          <div className="space-y-3 mt-3">
            {autoParseCv && cvFiles.length > 0 && !isParsing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleManualUpdateScroll}
                  className="w-full px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors border"
                  style={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#374151' }}
                >
                  {t.addCandidateManualUpdateButton || 'Cập nhật thủ công'}
                </button>
                <button
                  type="button"
                  onClick={() => void runCvAiParseRef.current()}
                  className="w-full px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ backgroundColor: '#2563eb', color: 'white' }}
                >
                  {t.addCandidateAiParseButtonNew || 'Phân tích bằng AI'}
                </button>
              </div>
            )}
            {isParsing && (
              <div className="rounded-lg p-3 border" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }}></div>
                  <p className="text-xs font-medium" style={{ color: '#1e40af' }}>
                    {t.addCandidateParsingCv || 'Đang phân tích CV bằng AI...'} ({parseProgress.current}/{parseProgress.total})
                  </p>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#bfdbfe' }}>
                  <div
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(parseProgress.current / parseProgress.total) * 100}%`, backgroundColor: '#2563eb' }}
                  ></div>
                </div>
              </div>
            )}
            {parseError && (
              <div className="rounded-lg p-3 border flex items-start gap-2" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
                <span className="mt-0.5 text-xs" style={{ color: '#dc2626' }}>⚠️</span>
                <pre className="flex-1 text-xs font-medium whitespace-pre-wrap" style={{ color: '#991b1b' }}>{parseError}</pre>
                <button type="button" onClick={() => setParseError(null)} className="text-xs" style={{ color: '#dc2626' }}>✕</button>
              </div>
            )}
            {parseSuccess && (
              <div className="rounded-lg p-3 border flex items-center gap-2" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <span className="text-xs" style={{ color: '#16a34a' }}>✓</span>
                <p className="flex-1 text-xs font-medium" style={{ color: '#166534' }}>{parseSuccess}</p>
              </div>
            )}
            {cvFiles.length > 1 && !isParsing && (
              <button
                type="button"
                onClick={() => handleRemoveCV()}
                onMouseEnter={() => setHoveredClearAllButton(true)}
                onMouseLeave={() => setHoveredClearAllButton(false)}
                className="w-full px-4 py-2 text-xs rounded-lg transition-colors"
                style={{ color: '#dc2626', backgroundColor: hoveredClearAllButton ? '#fef2f2' : 'transparent' }}
              >
                {t.addCandidateRemoveAllFiles || 'Xóa tất cả file'}
              </button>
            )}
          </div>
        {errors.cvFiles && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.cvFiles}</p>}
      </div>

      {/* Mobile: 2 tab (Nhập liệu / Xem CV). Từ xl: 2 cột như cũ. */}
      <div ref={manualUpdateSectionRef} className="min-w-0">
        <div
          className="xl:hidden grid grid-cols-2 divide-x divide-gray-200 gap-0 rounded-xl border overflow-hidden mb-3 min-w-0"
          style={{ borderColor: '#e5e7eb', backgroundColor: '#f3f4f6' }}
          role="tablist"
          aria-label={t.addCandidateMobileTabsAria || 'Nhập liệu và xem CV'}
        >
          <button
            type="button"
            role="tab"
            id="add-candidate-tab-form"
            aria-controls="add-candidate-panel-form"
            aria-selected={mobileCvTab === 'form'}
            onClick={() => setMobileCvTab('form')}
            className={`py-3 px-2 sm:px-3 text-center text-xs font-semibold transition-colors ${
              mobileCvTab === 'form'
                ? 'bg-white text-blue-700 border-b-2 border-blue-600 -mb-px'
                : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            {t.addCandidateMobileTabForm || 'Nhập liệu'}
          </button>
          <button
            type="button"
            role="tab"
            id="add-candidate-tab-preview"
            aria-controls="add-candidate-panel-preview"
            aria-selected={mobileCvTab === 'preview'}
            onClick={() => setMobileCvTab('preview')}
            className={`py-3 px-2 sm:px-3 text-center text-xs font-semibold transition-colors ${
              mobileCvTab === 'preview'
                ? 'bg-white text-blue-700 border-b-2 border-blue-600 -mb-px'
                : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            {t.addCandidateMobileTabPreview || 'Xem CV'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] 2xl:grid-cols-[2fr_3fr] items-stretch min-w-0">
        <div
          id="add-candidate-panel-form"
          role="tabpanel"
          aria-labelledby="add-candidate-tab-form"
          className={`min-h-0 min-w-0 ${mobileCvTab === 'preview' ? 'hidden xl:block' : ''}`}
        >
      <form
        id="add-candidate-main-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3"
        onContextMenuCapture={
          isAdmin
            ? (e) => {
                const el = e.target;
                if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
                if (el.tagName === 'INPUT') {
                  const typ = el.type || 'text';
                  if (typ === 'file' || typ === 'hidden' || typ === 'checkbox' || typ === 'radio' || typ === 'button' || typ === 'submit' || typ === 'reset') return;
                }
                const fk = el.getAttribute('data-supplement-field') || el.name;
                if (!fk) return;
                supplementMarking.handleFieldContextMenu(e, fk);
              }
            : undefined
        }
      >
        {/* Nút Lưu / Hủy / Tiến cử: trên thanh sticky phía trên (form id=add-candidate-main-form) */}
        {/* Block 1: Thông tin CTV (chỉ hiển thị cho Admin) */}
        {isAdmin && (
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <User className="w-4 h-4" style={{ color: '#2563eb' }} />
              {supplementHeading('addCandidate-block1-ctv', t.addCandidateBlock1CtvInfo || 'Thông tin CTV (nếu có)')}
            </h2>
            <div className="space-y-2">
              <p className="text-[10px]" style={{ color: '#6b7280' }}>
                {t.addCandidateCollaboratorEmptyHint || 'Để trống nếu ứng viên không thuộc CTV nào'}
              </p>
              <div ref={collaboratorDropdownRef} className="relative">
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  {supplementHeading('label-collaborator', t.addCandidateCollaboratorLabel || 'CTV phụ trách')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={formData.collaboratorId ? collaboratorDisplayName : collaboratorSearchQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCollaboratorSearchQuery(v);
                    if (formData.collaboratorId) {
                      setFormData(prev => ({ ...prev, collaboratorId: '' }));
                      setCollaboratorDisplayName('');
                    }
                    setCollaboratorDropdownOpen(true);
                  }}
                  placeholder={t.addCandidateCollaboratorPlaceholder || 'Nhập tên hoặc email CTV để tìm kiếm...'}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{
                    borderColor: errors.collaboratorId ? '#ef4444' : '#d1d5db',
                    outline: 'none'
                  }}
                  data-supplement-field={isAdmin ? 'collaboratorSearch' : undefined}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    setCollaboratorDropdownOpen(true);
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.collaboratorId ? '#ef4444' : '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {collaboratorDropdownOpen && (collaboratorSearchQuery.trim() || collaboratorSuggestions.length > 0) && (
                  <ul
                    className="absolute z-50 w-full mt-1 py-1 border rounded-lg shadow-lg bg-white max-h-48 overflow-auto text-xs"
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    {collaboratorSuggestions.length === 0 ? (
                      <li className="px-3 py-2 text-gray-500">{t.addCandidateCollaboratorSearchHint || 'Nhập tên hoặc email để tìm CTV...'}</li>
                    ) : (
                      collaboratorSuggestions.map((c) => (
                        <li
                          key={c.id}
                          role="button"
                          tabIndex={0}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex flex-col"
                          style={{ color: '#111827' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData(prev => ({ ...prev, collaboratorId: String(c.id) }));
                            setCollaboratorDisplayName(c.name || c.email || c.code || `ID ${c.id}`);
                            setCollaboratorSearchQuery('');
                            setCollaboratorSuggestions([]);
                            setCollaboratorDropdownOpen(false);
                          }}
                        >
                          <span className="font-medium">{c.name || (t.addCandidateNoName || '(Không tên)')}</span>
                          {(c.email || c.code) && <span className="text-gray-500">{[c.email, c.code].filter(Boolean).join(' · ')}</span>}
                        </li>
                      ))
                    )}
                  </ul>
                )}
                {errors.collaboratorId && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.collaboratorId}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Left Column */}
        <div className="space-y-3">
          {/* Block 2: Thông tin cơ bản ứng viên */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <User className="w-4 h-4" style={{ color: '#2563eb' }} />
              {supplementHeading('addCandidate-block2-basic', t.addCandidateBlock2BasicInfo || 'Thông tin cơ bản của ứng viên')}
            </h2>
            {/* Ảnh chân dung (証明写真) - nằm trong Block 2 */}
            <div className="mb-4 pb-3 border-b" style={{ borderColor: '#e5e7eb' }}>
              <h3 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: '#374151' }}>
                <UserCircle className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                {supplementHeading('addCandidate-portrait', t.addCandidatePortrait || 'Ảnh chân dung (証明写真)')}
              </h3>
              <p className="text-[10px] mb-3" style={{ color: '#6b7280' }}>{t.addCandidatePortraitHint || 'Ảnh sẽ hiển thị đúng vị trí trong template CV và được xuất kèm khi tải PDF.'}</p>
              {!avatarPreview ? (
                <label
                  className="block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-blue-400"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverAvatarUpload(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverAvatarUpload(false);
                  }}
                  onDrop={handleAvatarDrop}
                  style={{
                    borderColor: dragOverAvatarUpload ? '#60a5fa' : '#e5e7eb',
                    backgroundColor: dragOverAvatarUpload ? '#eff6ff' : 'transparent'
                  }}
                >
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: '#9ca3af' }} />
                  <span className="text-xs font-medium" style={{ color: '#374151' }}>{t.addCandidateSelectImage || 'Chọn ảnh (JPG, PNG)'}</span>
                </label>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="rounded border flex-shrink-0 overflow-hidden bg-gray-100" style={{ borderColor: '#e5e7eb', width: 96, height: 128 }}>
                    <img src={avatarPreview} alt="Chân dung" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium mb-2" style={{ color: '#111827' }}>{t.addCandidatePortraitSelected || 'Đã chọn ảnh chân dung'}</p>
                    <button type="button" onClick={handleRemoveAvatar} className="text-xs px-3 py-1.5 rounded border transition-colors" style={{ borderColor: '#e5e7eb', color: '#dc2626' }}>
                      {t.addCandidateRemoveImage || 'Xóa ảnh'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    <span className="inline-flex flex-wrap items-center gap-1">
                      {supplementHeading('label-nameKanji', t.addCandidateNameKanji || 'Họ tên (Kanji) - 氏名')}
                      <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    name="nameKanji"
                    value={formData.nameKanji}
                    onChange={handleInputChange}
                    placeholder={t.addCandidatePlaceholderNameKanji || 'VD: 山田 太郎'}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{
                      borderColor: errors.nameKanji ? '#ef4444' : '#d1d5db',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.nameKanji ? '#ef4444' : '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {errors.nameKanji && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.nameKanji}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {supplementHeading('label-nameKana', t.addCandidateNameKana || 'Họ tên (Kana) - ふりがな')}
                  </label>
                  <input
                    type="text"
                    name="nameKana"
                    value={formData.nameKana}
                    onChange={handleInputChange}
                    placeholder={t.addCandidatePlaceholderNameKana || 'VD: やまだ たろう'}
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
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {supplementHeading('label-birthDate', t.addCandidateBirthDate || 'Ngày sinh - 生年月日')}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 z-10 pointer-events-none" style={{ color: '#9ca3af' }} />
                    <input
                      type="date"
                      value={safeDateForInput(formData.birthDate)}
                      max={safeDateForInput(new Date())}
                      onChange={(e) => handleBirthDateChange(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs appearance-none"
                      style={{
                        borderColor: '#d1d5db',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {supplementHeading('label-age', t.addCandidateAge || 'Tuổi - 満歳')}
                  </label>
                  <input
                    type="text"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="30"
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg text-xs cursor-not-allowed"
                    style={{
                      borderColor: '#d1d5db',
                      backgroundColor: '#f9fafb',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {supplementHeading('label-gender', t.addCandidateGender || 'Giới tính - 性別')}
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
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
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">{t.addCandidateSelect || 'Chọn'}</option>
                    <option value="男">{t.addCandidateGenderMale || 'Nam (男)'}</option>
                    <option value="女">{t.addCandidateGenderFemale || 'Nữ (女)'}</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t pt-3 mt-3" style={{ borderColor: '#e5e7eb' }}>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                        {supplementHeading('label-postalCode', t.addCandidatePostalCode || 'Mã bưu điện - 〒')}
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        placeholder={t.addCandidatePlaceholderPostal || '123-4567'}
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
                        {supplementHeading('label-address', t.addCandidateAddress || 'Địa chỉ hiện tại - 現住所')}
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder={t.addCandidatePlaceholderAddress || '東京都渋谷区...'}
                          className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
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
                    </div>
                    {/* Ga gần nhất - 線・駅: đặt ngay dưới Địa chỉ hiện tại */}
                    <div className="min-w-0">
                      <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                        {supplementHeading('label-nearestStation', t.addCandidateNearestStation || 'Ga gần nhất - 線・駅')}
                      </label>
                      <div className="flex flex-wrap gap-2 min-w-0">
                        <input
                          type="text"
                          name="nearestStationLine"
                          value={formData.nearestStationLine}
                          onChange={handleInputChange}
                          placeholder={t.addCandidatePlaceholderLine || '線 (VD: 山手線)'}
                          className="min-w-0 flex-1 px-3 py-2 border rounded-lg text-xs"
                          style={{ borderColor: '#d1d5db', outline: 'none', minWidth: '120px' }}
                        />
                        <input
                          type="text"
                          name="nearestStationName"
                          value={formData.nearestStationName}
                          onChange={handleInputChange}
                          placeholder={t.addCandidatePlaceholderStation || '駅 (VD: 渋谷)'}
                          className="min-w-0 flex-1 px-3 py-2 border rounded-lg text-xs"
                          style={{ borderColor: '#d1d5db', outline: 'none', minWidth: '120px' }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                        {supplementHeading('label-phone', t.addCandidatePhone || 'Điện thoại - 電話')}
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder={t.addCandidatePlaceholderPhone || '090-1234-5678'}
                          className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
                          style={{
                            borderColor: errors.phone ? '#ef4444' : '#d1d5db',
                            outline: 'none'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#2563eb';
                            e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = errors.phone ? '#ef4444' : '#d1d5db';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      {errors.phone && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                        <span className="inline-flex flex-wrap items-center gap-1">
                          {supplementHeading('label-email', t.addCandidateEmail || 'Email')}
                          <span style={{ color: '#ef4444' }}>*</span>
                        </span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder={t.addCandidatePlaceholderEmail || 'email@example.com'}
                          className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
                          style={{
                            borderColor: errors.email ? '#ef4444' : '#d1d5db',
                            outline: 'none'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#2563eb';
                            e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = errors.email ? '#ef4444' : '#d1d5db';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      {errors.email && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.email}</p>}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Residence & Visa Information */}
              <div className="border-t pt-3 mt-3" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-xs font-bold mb-3" style={{ color: '#374151' }}>
                  {supplementHeading('addCandidate-residence-visa', t.addCandidateResidenceVisa || 'Thông tin cư trú & Visa (在留情報)')}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {supplementHeading('label-addressOrigin', t.addCandidateOriginLabel || 'Nguyên quán - 出身地')}
                    </label>
                    <input
                      type="text"
                      name="addressOrigin"
                      value={formData.addressOrigin}
                      onChange={handleInputChange}
                      placeholder={t.addCandidatePlaceholderOrigin || 'VD: ベトナム ホーチミン市'}
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
                  {/* Passport, Residence status & Visa expiry ngay dưới Nguyên quán - mỗi ô 1 hàng */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                        {supplementHeading('label-passport', t.addCandidatePassport || 'Passport - パスポート')}
                      </label>
                      <select
                        name="passport"
                        value={formData.passport}
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
                          e.target.style.borderColor = '#d1d5db';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">{t.addCandidateSelect || 'Chọn'}</option>
                        <option value="1">有</option>
                        <option value="0">無</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                        {supplementHeading('label-jpResidenceStatus', t.addCandidateResidenceStatus || 'Tư cách lưu trú - 在留資格')}
                      </label>
                      <select
                        name="jpResidenceStatus"
                        value={formData.jpResidenceStatus}
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
                          e.target.style.borderColor = '#d1d5db';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">{t.addCandidateSelect || 'Chọn'}</option>
                        {RESIDENCE_STATUS_OPTIONS.map((opt, index) => (
                          <option key={opt.value} value={opt.value}>
                            {`${index + 1}. ${getResidenceStatusLabel(opt)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                        {supplementHeading('label-visaExpiry', t.addCandidateVisaExpiry || 'Ngày hết hạn Visa - 在留期限')}
                      </label>
                      <input
                        type="date"
                        value={safeDateForInput(formData.visaExpirationDate)}
                        max={safeDateForInput(new Date('2100-12-31'))}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            visaExpirationDate: value || ''
                          }));
                        }}
                        className="w-full px-3 py-2 border rounded-lg text-xs appearance-none"
                        style={{
                          borderColor: '#d1d5db',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                  {/* 扶養家族数・配偶者 (Rirekisho) - tách hàng để tránh chồng chéo khi zoom */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 min-w-0">
                    <div className="min-w-0">
                      <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                        {supplementHeading('label-dependentsCount', t.addCandidateDependentsLabel || '扶養家族数(配偶者を除く) - 人')}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        name="dependentsCount"
                        value={formData.dependentsCount}
                        onChange={handleInputChange}
                        placeholder={t.addCandidatePlaceholderDependents || 'Số người (0, 1, 2...)'}
                        className="w-full min-w-0 px-3 py-2 border rounded-lg text-xs"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                        {supplementHeading('label-hasSpouse', t.addCandidateSpouse || '配偶者 - 有・無')}
                      </label>
                      <select
                        name="hasSpouse"
                        value={formData.hasSpouse}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg text-xs"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      >
                        <option value="">{t.addCandidateSelect || 'Chọn'}</option>
                        <option value="有">{t.addCandidateHasYes || '有 (Có)'}</option>
                        <option value="無">{t.addCandidateHasNo || '無 (Không)'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                        {supplementHeading('label-spouseDependent', t.addCandidateSpouseDependent || '配偶者の扶養義務 - 有・無')}
                      </label>
                      <select
                        name="spouseDependent"
                        value={formData.spouseDependent}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg text-xs"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      >
                        <option value="">{t.addCandidateSelect || 'Chọn'}</option>
                        <option value="有">{t.addCandidateHasYes || '有 (Có)'}</option>
                        <option value="無">{t.addCandidateHasNo || '無 (Không)'}</option>
                      </select>
                    </div>
                    </div>
                  </div>
                  {/* Removed field: Nơi cư trú hiện tại - 現在の居住地 */}
                  {/* Removed field: Quốc gia khác - その他の国 */}
                </div>
              </div>
            </div>
          </div>

          {/* Block 3: Thông tin học vấn và kinh nghiệm của ứng viên */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <GraduationCap className="w-4 h-4" style={{ color: '#2563eb' }} />
              <Briefcase className="w-4 h-4" style={{ color: '#2563eb' }} />
              {supplementHeading('addCandidate-block3-title', t.addCandidateBlock3Title || 'Thông tin học vấn và kinh nghiệm của ứng viên')}
            </h2>
            <div className="space-y-3">
              <h3 className="text-xs font-bold mb-2" style={{ color: '#374151' }}>{supplementHeading('addCandidate-education', t.addCandidateBlock3Education || 'Học vấn (学歴)')}</h3>
              {(formData.educations || []).map((edu, index) => (
                <div key={index} className="p-3 rounded-lg border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold" style={{ color: '#6b7280' }}>#{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      onMouseEnter={() => setHoveredRemoveEducationButtonIndex(index)}
                      onMouseLeave={() => setHoveredRemoveEducationButtonIndex(null)}
                      style={{
                        color: hoveredRemoveEducationButtonIndex === index ? '#b91c1c' : '#ef4444'
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="text"
                      value={edu.content ?? ''}
                      onChange={(e) => updateEducation(index, 'content', e.target.value)}
                      placeholder={t.addCandidatePlaceholderSchool || 'Tên trường, ngành học...'}
                      className="w-full px-2 py-1.5 border rounded text-xs"
                      style={{ borderColor: '#d1d5db' }}
                      data-supplement-field={isAdmin ? `education-${index}-content` : undefined}
                    />
                    <div className="grid grid-cols-6 gap-2 items-center">
                      <span className="text-[10px] text-gray-500">入学</span>
                      <input type="text" value={edu.year ?? ''} onChange={(e) => updateEducation(index, 'year', e.target.value)} placeholder="年" className="px-2 py-1.5 border rounded text-xs" style={{ borderColor: '#d1d5db' }} data-supplement-field={isAdmin ? `education-${index}-year` : undefined} />
                      <input type="text" value={edu.month ?? ''} onChange={(e) => updateEducation(index, 'month', e.target.value)} placeholder="月" className="px-2 py-1.5 border rounded text-xs" style={{ borderColor: '#d1d5db' }} data-supplement-field={isAdmin ? `education-${index}-month` : undefined} />
                      <span className="text-[10px] text-gray-500">卒業</span>
                      <input type="text" value={edu.endYear ?? ''} onChange={(e) => updateEducation(index, 'endYear', e.target.value)} placeholder="年" className="px-2 py-1.5 border rounded text-xs" style={{ borderColor: '#d1d5db' }} data-supplement-field={isAdmin ? `education-${index}-endYear` : undefined} />
                      <input type="text" value={edu.endMonth ?? ''} onChange={(e) => updateEducation(index, 'endMonth', e.target.value)} placeholder="月" className="px-2 py-1.5 border rounded text-xs" style={{ borderColor: '#d1d5db' }} data-supplement-field={isAdmin ? `education-${index}-endMonth` : undefined} />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddEducation}
                onMouseEnter={() => setHoveredAddEducationButton(true)}
                onMouseLeave={() => setHoveredAddEducationButton(false)}
                className="w-full px-4 py-2 border-2 border-dashed rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  borderColor: hoveredAddEducationButton ? '#2563eb' : '#d1d5db',
                  color: hoveredAddEducationButton ? '#2563eb' : '#4b5563'
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                {t.addCandidateAddEducation || 'Thêm học vấn'}
              </button>
            </div>

            {/* 19. Kinh nghiệm làm việc (職歴) — cùng Block 3 */}
            <div className="border-t pt-3 mt-3" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-xs font-bold mb-3" style={{ color: '#374151' }}>{supplementHeading('addCandidate-work-exp', t.addCandidateBlock3WorkExp || 'Kinh nghiệm làm việc (職歴)')}</h3>
              <div className="space-y-3">
              {(formData.workExperiences || []).map((we, index) => (
                <div key={index} className="p-3 rounded-lg border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold" style={{ color: '#6b7280' }}>#{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeEmployment(index)}
                      onMouseEnter={() => setHoveredRemoveWorkExperienceButtonIndex(index)}
                      onMouseLeave={() => setHoveredRemoveWorkExperienceButtonIndex(null)}
                      style={{
                        color: hoveredRemoveWorkExperienceButtonIndex === index ? '#b91c1c' : '#ef4444'
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] text-gray-500 mb-1">入社</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={we.startYear ?? ''}
                            onChange={(e) => updateEmployment(index, 'startYear', e.target.value)}
                            placeholder="年"
                            className="px-2 py-1.5 border rounded text-xs"
                            style={{ borderColor: '#d1d5db' }}
                            data-supplement-field={isAdmin ? `employment-${index}-startYear` : undefined}
                          />
                          <input
                            type="text"
                            value={we.startMonth ?? ''}
                            onChange={(e) => updateEmployment(index, 'startMonth', e.target.value)}
                            placeholder="月"
                            className="px-2 py-1.5 border rounded text-xs"
                            style={{ borderColor: '#d1d5db' }}
                            data-supplement-field={isAdmin ? `employment-${index}-startMonth` : undefined}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 mb-1">卒業</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={we.endYear ?? ''}
                            onChange={(e) => updateEmployment(index, 'endYear', e.target.value)}
                            placeholder="Năm"
                            className="px-2 py-1.5 border rounded text-xs"
                            style={{ borderColor: '#d1d5db' }}
                            data-supplement-field={isAdmin ? `employment-${index}-endYear` : undefined}
                          />
                          <input
                            type="text"
                            value={we.endMonth ?? ''}
                            onChange={(e) => updateEmployment(index, 'endMonth', e.target.value)}
                            placeholder="Tháng"
                            className="px-2 py-1.5 border rounded text-xs"
                            style={{ borderColor: '#d1d5db' }}
                            data-supplement-field={isAdmin ? `employment-${index}-endMonth` : undefined}
                          />
                        </div>
                        <label className="mt-2 flex items-center gap-2 text-[10px] text-gray-600">
                          <input
                            type="checkbox"
                            checked={Boolean(we.endCurrent)}
                            onChange={(e) => updateEmployment(index, 'endCurrent', e.target.checked)}
                          />
                          現在
                        </label>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={we.company_name || ''}
                      onChange={(e) => updateEmployment(index, 'company_name', e.target.value)}
                      placeholder={t.addCandidatePlaceholderCompany || 'Tên công ty'}
                      className="px-2 py-1.5 border rounded text-xs w-full"
                      style={{ borderColor: '#d1d5db' }}
                      data-supplement-field={isAdmin ? `employment-${index}-company` : undefined}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={we.employmentPlace || ''}
                        onChange={(e) => updateEmployment(index, 'employmentPlace', e.target.value)}
                        placeholder="Địa điểm làm việc (勤務地)"
                        className="px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                        data-supplement-field={isAdmin ? `employment-${index}-place` : undefined}
                      />
                      <input
                        type="text"
                        value={we.companyRole || ''}
                        onChange={(e) => updateEmployment(index, 'companyRole', e.target.value)}
                        placeholder="Vai trò trong doanh nghiệp (ポジション・役割)"
                        className="px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                        data-supplement-field={isAdmin ? `employment-${index}-companyRole` : undefined}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        type="text"
                        value={we.business_purpose || ''}
                        onChange={(e) => updateEmployment(index, 'business_purpose', e.target.value)}
                        placeholder={t.addCandidatePlaceholderBusiness || 'Lĩnh vực kinh doanh (事業目的)'}
                        className="px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                        data-supplement-field={isAdmin ? `employment-${index}-business` : undefined}
                      />
                      <input
                        type="text"
                        value={we.scale_role || ''}
                        onChange={(e) => updateEmployment(index, 'scale_role', e.target.value)}
                        placeholder="Quy mô (規模)"
                        className="px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                        data-supplement-field={isAdmin ? `employment-${index}-scale` : undefined}
                      />
                    </div>
                    <textarea
                      value={we.description || ''}
                      onChange={(e) => updateEmployment(index, 'description', e.target.value)}
                      placeholder={t.addCandidatePlaceholderJobDesc || 'Mô tả công việc (業務内容)'}
                      rows={2}
                      className="w-full px-2 py-1.5 border rounded text-xs"
                      style={{ borderColor: '#d1d5db' }}
                      data-supplement-field={isAdmin ? `employment-${index}-description` : undefined}
                    />
                    <input
                      type="text"
                      value={we.tools_tech || ''}
                      onChange={(e) => updateEmployment(index, 'tools_tech', e.target.value)}
                      placeholder={t.addCandidatePlaceholderTools || 'Công cụ, công nghệ (ツール)'}
                      className="w-full px-2 py-1.5 border rounded text-xs"
                      style={{ borderColor: '#d1d5db' }}
                      data-supplement-field={isAdmin ? `employment-${index}-tools` : undefined}
                    />
                    <textarea
                      value={we.reason_for_leaving || ''}
                      onChange={(e) => updateEmployment(index, 'reason_for_leaving', e.target.value)}
                      placeholder={t.addCandidatePlaceholderLeavingReason || 'Lý do nghỉ việc (退職理由)'}
                      rows={2}
                      className="w-full px-2 py-1.5 border rounded text-xs"
                      style={{ borderColor: '#d1d5db' }}
                      data-supplement-field={isAdmin ? `employment-${index}-reason` : undefined}
                    />

                    <div className="pt-2 mt-2 border-t" style={{ borderColor: '#e5e7eb' }}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#374151' }}>
                          Dự án / Project
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleAddProjectToWorkExperience(index)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border"
                          style={{ borderColor: '#bfdbfe', color: '#2563eb', backgroundColor: '#eff6ff' }}
                        >
                          <Plus className="w-3 h-3" />
                          Thêm dự án
                        </button>
                      </div>
                      <div className="space-y-2">
                        {getWorkExperienceProjects(we).length === 0 ? (
                          <p className="text-[10px] text-gray-500">Chưa có dự án nào cho block kinh nghiệm này.</p>
                        ) : getWorkExperienceProjects(we).map((project, projectIndex) => (
                          <div key={projectIndex} className="rounded-md border p-2 bg-white" style={{ borderColor: '#e5e7eb' }}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="text-[10px] font-bold" style={{ color: '#6b7280' }}>#{projectIndex + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveProjectFromWorkExperience(index, projectIndex)}
                                className="text-red-500 hover:text-red-700"
                                aria-label="Xóa dự án"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              <input
                                type="text"
                                value={project.project_name || ''}
                                onChange={(e) => updateProject(index, projectIndex, 'project_name', e.target.value)}
                                placeholder="Tên dự án"
                                className="w-full px-2 py-1.5 border rounded text-xs"
                                style={{ borderColor: '#d1d5db' }}
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={project.role || ''}
                                  onChange={(e) => updateProject(index, projectIndex, 'role', e.target.value)}
                                  placeholder="Vai trò trong dự án"
                                  className="w-full px-2 py-1.5 border rounded text-xs"
                                  style={{ borderColor: '#d1d5db' }}
                                />
                                <input
                                  type="text"
                                  value={project.team_size || ''}
                                  onChange={(e) => updateProject(index, projectIndex, 'team_size', e.target.value)}
                                  placeholder="Quy mô team"
                                  className="w-full px-2 py-1.5 border rounded text-xs"
                                  style={{ borderColor: '#d1d5db' }}
                                />
                              </div>
                              <textarea
                                value={project.description || ''}
                                onChange={(e) => updateProject(index, projectIndex, 'description', e.target.value)}
                                placeholder="Mô tả chi tiết dự án / trách nhiệm"
                                rows={2}
                                className="w-full px-2 py-1.5 border rounded text-xs"
                                style={{ borderColor: '#d1d5db' }}
                              />
                              <div className="grid grid-cols-4 gap-2">
                                <input
                                  type="text"
                                  value={project.startYear || ''}
                                  onChange={(e) => updateProject(index, projectIndex, 'startYear', e.target.value)}
                                  placeholder="年"
                                  className="w-full px-2 py-1.5 border rounded text-xs"
                                  style={{ borderColor: '#d1d5db' }}
                                />
                                <input
                                  type="text"
                                  value={project.startMonth || ''}
                                  onChange={(e) => updateProject(index, projectIndex, 'startMonth', e.target.value)}
                                  placeholder="月"
                                  className="w-full px-2 py-1.5 border rounded text-xs"
                                  style={{ borderColor: '#d1d5db' }}
                                />
                                <input
                                  type="text"
                                  value={project.endYear || ''}
                                  onChange={(e) => updateProject(index, projectIndex, 'endYear', e.target.value)}
                                  placeholder="Năm"
                                  className="w-full px-2 py-1.5 border rounded text-xs"
                                  style={{ borderColor: '#d1d5db' }}
                                />
                                <input
                                  type="text"
                                  value={project.endMonth || ''}
                                  onChange={(e) => updateProject(index, projectIndex, 'endMonth', e.target.value)}
                                  placeholder="Tháng"
                                  className="w-full px-2 py-1.5 border rounded text-xs"
                                  style={{ borderColor: '#d1d5db' }}
                                />
                              </div>
                              <div className="grid grid-cols-1">
                                <input
                                  type="text"
                                  value={project.tools_tech || ''}
                                  onChange={(e) => updateProject(index, projectIndex, 'tools_tech', e.target.value)}
                                  placeholder="Tools / Tech"
                                  className="w-full px-2 py-1.5 border rounded text-xs"
                                  style={{ borderColor: '#d1d5db' }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddWorkExperience}
                onMouseEnter={() => setHoveredAddWorkExperienceButton(true)}
                onMouseLeave={() => setHoveredAddWorkExperienceButton(false)}
                className="w-full px-4 py-2 border-2 border-dashed rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  borderColor: hoveredAddWorkExperienceButton ? '#2563eb' : '#d1d5db',
                  color: hoveredAddWorkExperienceButton ? '#2563eb' : '#4b5563'
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                {t.addCandidateAddWorkExp || 'Thêm kinh nghiệm'}
              </button>
            </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Kỹ năng & Chứng chỉ */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Award className="w-4 h-4" style={{ color: '#2563eb' }} />
              {supplementHeading('addCandidate-block4-skills', t.addCandidateBlock4SkillsCerts || 'Thông tin Kỹ năng & Chứng chỉ (資格)')}
            </h2>
            <div className="space-y-3">
              {/* 20. JLPT Level */}
              <div className="pb-3 border-b" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-xs font-bold mb-2" style={{ color: '#374151' }}>{supplementHeading('addCandidate-jlpt', t.addCandidateJlptLabel || 'JLPT Level - 日本語能力試験')}</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {supplementHeading('label-jlptLevel', t.addCandidateJlptLevelShort || 'Cấp độ (N1-N5)')}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs font-semibold pointer-events-none" style={{ color: '#4b5563' }}>N</span>
                      <input
                        type="number"
                        name="jlptLevel"
                        value={formData.jlptLevel ?? ''}
                        onChange={handleInputChange}
                        min="1"
                        max="5"
                        placeholder="1-5"
                        className="w-full pl-6 pr-3 py-2 border rounded-lg text-xs"
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
                    <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>{t.addCandidateJlptHint || 'Nhập số từ 1 (N1) đến 5 (N5)'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                      {supplementHeading('label-jlptAcquired', t.addCandidateAcquiredYearLabel || 'Năm đạt')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="jlptAcquiredYear"
                        value={formData.jlptAcquiredYear ?? ''}
                        onChange={handleInputChange}
                        placeholder={t.addCandidatePlaceholderYear || 'Năm (年)'}
                        className="w-16 px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                      />
                      <input
                        type="text"
                        name="jlptAcquiredMonth"
                        value={formData.jlptAcquiredMonth ?? ''}
                        onChange={handleInputChange}
                        placeholder={t.addCandidatePlaceholderMonth || 'Tháng (月)'}
                        className="w-16 px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* 21. Trình độ tiếng Anh - 英語 */}
              <div className="pb-3 border-b" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-xs font-bold mb-2" style={{ color: '#374151' }}>{supplementHeading('addCandidate-english', t.addCandidateEnglishLevel || 'Trình độ tiếng Anh - 英語')}</h3>
                <div className="space-y-4">
                  {/* TOEIC */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {supplementHeading('label-toeic', t.addCandidateToeicScore || 'TOEIC - Điểm')}
                    </label>
                    <input
                      type="number"
                      name="toeicScore"
                      value={formData.toeicScore ?? ''}
                      onChange={handleInputChange}
                      placeholder="VD: 800"
                      min="0"
                      className="w-full px-3 py-2 border rounded-lg text-xs"
                      style={{ borderColor: '#d1d5db', outline: 'none' }}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="toeicYear"
                        value={formData.toeicYear ?? ''}
                        onChange={handleInputChange}
                        placeholder={t.addCandidatePlaceholderYear || 'Năm (年)'}
                        className="w-16 px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                      />
                      <input
                        type="text"
                        name="toeicMonth"
                        value={formData.toeicMonth ?? ''}
                        onChange={handleInputChange}
                        placeholder={t.addCandidatePlaceholderMonth || 'Tháng (月)'}
                        className="w-16 px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                      />
                    </div>
                  </div>
                  {/* IELTS */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {supplementHeading('label-ielts', t.addCandidateIeltsScore || 'IELTS - Điểm')}
                    </label>
                    <input
                      type="number"
                      name="ieltsScore"
                      value={formData.ieltsScore ?? ''}
                      onChange={handleInputChange}
                      placeholder="VD: 6.5"
                      min="0"
                      step="0.5"
                      className="w-full px-3 py-2 border rounded-lg text-xs"
                      style={{ borderColor: '#d1d5db', outline: 'none' }}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="ieltsYear"
                        value={formData.ieltsYear ?? ''}
                        onChange={handleInputChange}
                        placeholder={t.addCandidatePlaceholderYear || 'Năm (年)'}
                        className="w-16 px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                      />
                      <input
                        type="text"
                        name="ieltsMonth"
                        value={formData.ieltsMonth ?? ''}
                        onChange={handleInputChange}
                        placeholder={t.addCandidatePlaceholderMonth || 'Tháng (月)'}
                        className="w-16 px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* 22. Bằng lái xe - 自動車免許 */}
              <div className="pb-3 border-b" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-xs font-bold mb-2" style={{ color: '#374151' }}>{supplementHeading('addCandidate-driving', t.addCandidateDrivingLicense || 'Bằng lái xe - 自動車免許')}</h3>
                <div className="space-y-2">
                  <select
                    name="hasDrivingLicense"
                    value={formData.hasDrivingLicense ?? ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{ borderColor: '#d1d5db', outline: 'none' }}
                  >
                    <option value="">{t.addCandidateSelect || 'Chọn'}</option>
                    <option value="1">{t.addCandidateYes || 'Có'}</option>
                    <option value="0">{t.addCandidateNo || 'Không'}</option>
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="drivingLicenseYear"
                      value={formData.drivingLicenseYear ?? ''}
                      onChange={handleInputChange}
                      placeholder={t.addCandidatePlaceholderYear || 'Năm (年)'}
                      className="w-16 px-2 py-1.5 border rounded text-xs"
                      style={{ borderColor: '#d1d5db' }}
                    />
                    <input
                      type="text"
                      name="drivingLicenseMonth"
                      value={formData.drivingLicenseMonth ?? ''}
                      onChange={handleInputChange}
                      placeholder={t.addCandidatePlaceholderMonth || 'Tháng (月)'}
                      className="w-16 px-2 py-1.5 border rounded text-xs"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {supplementHeading('label-experienceYears', t.addCandidateExpYears || 'Số năm kinh nghiệm - 経験年数')}
                  </label>
                  <input
                    type="number"
                    name="experienceYears"
                    value={formData.experienceYears}
                    onChange={handleInputChange}
                    placeholder={t.addCandidatePlaceholderExpYears || 'VD: 3'}
                    min="0"
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
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  {supplementHeading('label-technicalSkills', t.addCandidateTechnicalSkills || 'Kỹ năng kỹ thuật (活かせる経験・知識・技術)')}
                </label>
                <textarea
                  name="technicalSkills"
                  value={formData.technicalSkills}
                  onChange={handleInputChange}
                  placeholder={t.addCandidatePlaceholderTechSkills || 'VD: Project Management, React, Python...'}
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
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
              {/* 23. Chứng chỉ (免許・資格) khác */}
              <div className="pt-3 border-t" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-xs font-bold mb-2" style={{ color: '#374151' }}>{supplementHeading('addCandidate-certificates', t.addCandidateCertificatesLabel || 'Chứng chỉ (免許・資格) khác')}</h3>
                <div className="space-y-2">
                  {(formData.certificates || []).map((cert, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={cert.year ?? ''}
                        onChange={(e) => updateCertificate(index, 'year', e.target.value)}
                        placeholder={t.addCandidatePlaceholderYear || 'Năm (年)'}
                        className="w-16 px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                        data-supplement-field={isAdmin ? `certificate-${index}-year` : undefined}
                      />
                      <input
                        type="text"
                        value={cert.month ?? ''}
                        onChange={(e) => updateCertificate(index, 'month', e.target.value)}
                        placeholder={t.addCandidatePlaceholderMonth || 'Tháng (月)'}
                        className="w-16 px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                        data-supplement-field={isAdmin ? `certificate-${index}-month` : undefined}
                      />
                      <input
                        type="text"
                        value={cert.name ?? ''}
                        onChange={(e) => updateCertificate(index, 'name', e.target.value)}
                        placeholder={t.addCandidatePlaceholderCertName || 'Tên chứng chỉ'}
                        className="flex-1 px-2 py-1.5 border rounded text-xs"
                        style={{ borderColor: '#d1d5db' }}
                        data-supplement-field={isAdmin ? `certificate-${index}-name` : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => removeCertificate(index)}
                        onMouseEnter={() => setHoveredRemoveCertificateButtonIndex(index)}
                        onMouseLeave={() => setHoveredRemoveCertificateButtonIndex(null)}
                        style={{
                          color: hoveredRemoveCertificateButtonIndex === index ? '#b91c1c' : '#ef4444'
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddCertificate}
                    onMouseEnter={() => setHoveredAddCertificateButton(true)}
                    onMouseLeave={() => setHoveredAddCertificateButton(false)}
                    className="text-xs flex items-center gap-1"
                    style={{
                      color: hoveredAddCertificateButton ? '#1d4ed8' : '#2563eb'
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t.addCandidateAddCertificate || 'Thêm chứng chỉ'}
                  </button>
                </div>
              </div>
              {/* 24. Công cụ đã học - 学習したツール */}
              <div className="pt-3 border-t" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-xs font-bold mb-2" style={{ color: '#374151' }}>{supplementHeading('addCandidate-learned-tools', t.addCandidateLearnedToolsLabel || 'Công cụ đã học - 学習したツール')}</h3>
                <div className="space-y-3">
                  {/* Ô chọn công cụ: chọn 1 cái sẽ tạo 1 dòng */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold" style={{ color: '#111827' }}>
                      {supplementHeading('label-selectLearnedTool', t.addCandidateSelectToolLabel || 'Chọn công cụ', 'select-text inline min-w-0')}
                    </label>
                    <select
                      className="px-2 py-1.5 border rounded text-xs"
                      style={{ borderColor: '#d1d5db', outline: 'none' }}
                      defaultValue=""
                      onChange={handleAddLearnedToolFromSelect}
                    >
                      <option value="">{t.addCandidateSelect || 'Chọn'}</option>
                      {TECHNICAL_TOOLS.map(tool => (
                        <option key={tool} value={tool}>{tool}</option>
                      ))}
                      <option value="__OTHER__">{t.addCandidateOtherToolsLabel || 'Khác'}</option>
                    </select>
                  </div>
                  {/* Các dòng đã chọn */}
                  <div className="space-y-2">
                    {(formData.learnedTools || []).map((tool, index) => {
                      const isFixed = TECHNICAL_TOOLS.includes(tool);
                      const displayName = isFixed ? tool : (tool || (t.addCandidateOtherToolsLabel || 'Khác'));
                      return (
                        <div key={index} className="flex flex-wrap gap-2 items-center">
                          {isFixed ? (
                            <span className="text-xs font-semibold" style={{ color: '#111827' }}>{displayName}</span>
                          ) : (
                            <input
                              type="text"
                              value={tool}
                              onChange={(e) => updateLearnedTool(index, e.target.value)}
                              placeholder={t.addCandidatePlaceholderLearned || 'Tên công cụ khác'}
                              className="flex-1 min-w-[120px] px-2 py-1.5 border rounded text-xs"
                              style={{ borderColor: '#d1d5db' }}
                              data-supplement-field={isAdmin ? `learnedTool-${index}-name` : undefined}
                            />
                          )}
                          <div className="flex items-center gap-1 text-xs ml-auto">
                            <span>{t.addCandidateYearsStudiedLabel || 'Số năm học'}</span>
                            <input
                              type="number"
                              min="0"
                              value={(formData.toolsSoftwareNotes?.learned || {})[displayName] || ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                const key = displayName;
                                setFormData(prev => ({
                                  ...prev,
                                  toolsSoftwareNotes: {
                                    ...(prev.toolsSoftwareNotes || {}),
                                    learned: {
                                      ...(prev.toolsSoftwareNotes?.learned || {}),
                                      [key]: v
                                    },
                                    experienced: prev.toolsSoftwareNotes?.experienced || {},
                                    experiencedOther: prev.toolsSoftwareNotes?.experiencedOther ?? '',
                                  },
                                }));
                              }}
                              className="w-16 px-2 py-1.5 border rounded text-xs"
                              style={{ borderColor: '#d1d5db' }}
                              data-supplement-field={isAdmin ? `learnedTool-${index}-years` : undefined}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLearnedTool(index)}
                            onMouseEnter={() => setHoveredRemoveLearnedToolButtonIndex(index)}
                            onMouseLeave={() => setHoveredRemoveLearnedToolButtonIndex(null)}
                            style={{
                              color: hoveredRemoveLearnedToolButtonIndex === index ? '#b91c1c' : '#ef4444'
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, learnedTools: [...(prev.learnedTools || []), ''] }))}
                      className="text-xs flex items-center gap-1"
                      style={{ color: '#2563eb' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t.addCandidateAddLearnedTool || 'Thêm công cụ khác'}
                    </button>
                  </div>
                </div>
              </div>
              {/* 25. Công cụ có kinh nghiệm - 経験のあるツール */}
              <div className="pt-3 border-t" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-xs font-bold mb-2" style={{ color: '#374151' }}>{supplementHeading('addCandidate-exp-tools', t.addCandidateExpToolsLabel || 'Công cụ có kinh nghiệm - 経験のあるツール')}</h3>
                <div className="space-y-3">
                  {/* Ô chọn công cụ: chọn 1 cái sẽ tạo 1 dòng */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold" style={{ color: '#111827' }}>
                      {supplementHeading('label-selectExpTool', t.addCandidateSelectToolLabel || 'Chọn công cụ', 'select-text inline min-w-0')}
                    </label>
                    <select
                      className="px-2 py-1.5 border rounded text-xs"
                      style={{ borderColor: '#d1d5db', outline: 'none' }}
                      defaultValue=""
                      onChange={handleAddExperienceToolFromSelect}
                    >
                      <option value="">{t.addCandidateSelect || 'Chọn'}</option>
                      {TECHNICAL_TOOLS.map(tool => (
                        <option key={tool} value={tool}>{tool}</option>
                      ))}
                      <option value="__OTHER__">{t.addCandidateOtherToolsLabel || 'Khác'}</option>
                    </select>
                  </div>
                  {/* Các dòng đã chọn */}
                  <div className="space-y-2">
                    {(formData.experienceTools || []).map((tool, index) => {
                      const isFixed = TECHNICAL_TOOLS.includes(tool);
                      const displayName = isFixed ? tool : (tool || (t.addCandidateOtherToolsLabel || 'Khác'));
                      return (
                        <div key={index} className="flex flex-wrap gap-2 items-center">
                          {isFixed ? (
                            <span className="text-xs font-semibold" style={{ color: '#111827' }}>{displayName}</span>
                          ) : (
                            <input
                              type="text"
                              value={tool}
                              onChange={(e) => updateExperienceTool(index, e.target.value)}
                              placeholder={t.addCandidatePlaceholderExp || 'Tên công cụ khác'}
                              className="flex-1 min-w-[120px] px-2 py-1.5 border rounded text-xs"
                              style={{ borderColor: '#d1d5db' }}
                              data-supplement-field={isAdmin ? `experienceTool-${index}-name` : undefined}
                            />
                          )}
                          <div className="flex items-center gap-1 text-xs ml-auto">
                            <span>{t.addCandidateYearsExpLabel || 'Số năm kinh nghiệm'}</span>
                            <input
                              type="number"
                              min="0"
                              value={(formData.toolsSoftwareNotes?.experienced || {})[displayName] || ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                const key = displayName;
                                setFormData(prev => ({
                                  ...prev,
                                  toolsSoftwareNotes: {
                                    ...(prev.toolsSoftwareNotes || {}),
                                    learned: prev.toolsSoftwareNotes?.learned || {},
                                    experienced: {
                                      ...(prev.toolsSoftwareNotes?.experienced || {}),
                                      [key]: v
                                    },
                                    experiencedOther: prev.toolsSoftwareNotes?.experiencedOther ?? '',
                                  },
                                }));
                              }}
                              className="w-16 px-2 py-1.5 border rounded text-xs"
                              style={{ borderColor: '#d1d5db' }}
                              data-supplement-field={isAdmin ? `experienceTool-${index}-years` : undefined}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExperienceTool(index)}
                            onMouseEnter={() => setHoveredRemoveExperienceToolButtonIndex(index)}
                            onMouseLeave={() => setHoveredRemoveExperienceToolButtonIndex(null)}
                            style={{
                              color: hoveredRemoveExperienceToolButtonIndex === index ? '#b91c1c' : '#ef4444'
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, experienceTools: [...(prev.experienceTools || []), ''] }))}
                      className="text-xs flex items-center gap-1"
                      style={{ color: '#2563eb' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t.addCandidateAddExpTool || 'Thêm công cụ có kinh nghiệm khác'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Block 5: Giới thiệu bản thân (自己PR) */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <UserCircle className="w-4 h-4" style={{ color: '#2563eb' }} />
              {supplementHeading('addCandidate-block5-self', t.addCandidateBlock5SelfIntro || 'Giới thiệu bản thân (自己PR)')}
            </h2>
            <div className="space-y-3">
              {/* 26. Tóm tắt nghề nghiệp */}
              <div>
                <h3 className="text-xs font-bold mb-2" style={{ color: '#374151' }}>{supplementHeading('addCandidate-career-summary', t.addCandidateCareerSummary || 'Tóm tắt nghề nghiệp (職務要約)')}</h3>
                <textarea
                  name="careerSummary"
                  value={formData.careerSummary}
                  onChange={handleInputChange}
                  placeholder={t.addCandidatePlaceholderSummary || 'Tóm tắt kinh nghiệm làm việc...'}
                  rows="2"
                  className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
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
              {/* 27. Điểm mạnh */}
              <div>
                <h3 className="text-xs font-bold mb-2" style={{ color: '#374151' }}>{supplementHeading('addCandidate-strengths', t.addCandidateStrengths || 'Điểm mạnh (自己PR)')}</h3>
                <textarea
                  name="strengths"
                  value={formData.strengths}
                  onChange={handleInputChange}
                  placeholder={t.addCandidatePlaceholderStrengths || 'Điểm mạnh của bạn...'}
                  rows="2"
                  className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
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
              {/* 28. Sở thích / Kỹ năng đặc biệt */}
              <div>
                <h3 className="text-xs font-bold mb-2" style={{ color: '#374151' }}>{supplementHeading('addCandidate-hobbies', t.addCandidateHobbies || 'Sở thích / Kỹ năng đặc biệt (趣味・特技)')}</h3>
                <textarea
                  name="hobbiesSpecialSkills"
                  value={formData.hobbiesSpecialSkills}
                  onChange={handleInputChange}
                  placeholder={t.addCandidatePlaceholderHobbies || 'VD: 読書、プログラミング...'}
                  rows="2"
                  className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
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
              {/* 29. Động lực ứng tuyển */}
              <div>
                <h3 className="text-xs font-bold mb-2" style={{ color: '#374151' }}>{supplementHeading('addCandidate-motivation', t.addCandidateMotivationLabel || 'Động lực ứng tuyển (志望動機)')}</h3>
                <textarea
                  name="motivation"
                  value={formData.motivation}
                  onChange={handleInputChange}
                  placeholder={t.addCandidatePlaceholderMotivation || 'Lý do muốn ứng tuyển...'}
                  rows="2"
                  className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
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
            </div>
          </div>

          {/* Block 6: Mong muốn (希望) */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Briefcase className="w-4 h-4" style={{ color: '#2563eb' }} />
              {supplementHeading('addCandidate-block6-prefs', t.addCandidateBlock6Preferences || 'Mong muốn (希望)')}
            </h2>
            <div className="space-y-3">
              {/* 30. Lương hiện tại */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {supplementHeading('label-currentSalary', t.addCandidateCurrentSalaryLabel || 'Lương hiện tại (現在年収)')}
                  </label>
                  <input
                    type="text"
                    name="currentSalary"
                    value={formData.currentSalary}
                    onChange={handleInputChange}
                    placeholder={t.addCandidatePlaceholderCurrentSalary || 'VD: 500万円'}
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
                {/* 31. Lương mong muốn */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {supplementHeading('label-desiredSalary', t.addCandidateDesiredSalaryLabel || 'Lương mong muốn (希望年収)')}
                  </label>
                  <input
                    type="text"
                    name="desiredSalary"
                    value={formData.desiredSalary}
                    onChange={handleInputChange}
                    placeholder={t.addCandidatePlaceholderDesiredSalary || 'VD: 600万円'}
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
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  {supplementHeading(
                    'label-jobCategory',
                    t.addCandidateIndustry || 'Ngành nghề'
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setJobCategoryModalOpen(true)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg text-xs text-left transition-colors hover:bg-gray-50"
                  style={{ borderColor: '#d1d5db' }}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <ListTree className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                    <span className="truncate text-gray-800">
                      {formData.jobCategoryLabel ||
                        (t.addCandidateIndustryPlaceholder || 'Chọn ngành nghề')}
                    </span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              </div>
              {/* 32. Vị trí công việc mong muốn */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  {supplementHeading('label-desiredPosition', t.addCandidateDesiredPosition || 'Vị trí mong muốn (希望職種)')}
                </label>
                <input
                  type="text"
                  name="desiredPosition"
                  value={formData.desiredPosition}
                  onChange={handleInputChange}
                  placeholder={t.addCandidatePlaceholderPosition || 'VD: Software Engineer'}
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
              <div className="grid grid-cols-1 gap-3">
                {/* 33. Địa điểm làm việc mong muốn */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {supplementHeading('label-desiredLocation', t.addCandidateDesiredLocation || 'Địa điểm làm việc mong muốn (希望勤務地)')}
                  </label>
                  <input
                    type="text"
                    name="desiredLocation"
                    value={formData.desiredLocation}
                    onChange={handleInputChange}
                    placeholder={t.addCandidatePlaceholderLocation || 'VD: Tokyo'}
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
                {/* 34. Ngày vào công ty dự kiến */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {supplementHeading('label-desiredStartDate', t.addCandidateDesiredStartDate || 'Ngày dự kiến vào công ty (希望入社日)')}
                  </label>
                  <input
                    type="text"
                    name="desiredStartDate"
                    value={formData.desiredStartDate}
                    onChange={handleInputChange}
                    placeholder={t.addCandidatePlaceholderStartDate || 'VD: 2025年4月'}
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
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons removed — save button is now at the top of the form */}
      </form>
        </div>

        {/* Cột bên phải: preview CV theo template — không tiêu đề bar; chọn mẫu + nội dung */}
        <div
          id="add-candidate-panel-preview"
          role="tabpanel"
          aria-labelledby="add-candidate-tab-preview"
          className={`add-candidate-cv-preview-bleed flex flex-col min-h-[320px] xl:min-h-0 min-w-0 xl:max-w-none xl:w-auto xl:mx-0 ${mobileCvTab === 'form' ? 'hidden xl:flex' : ''}`}
        >
          <div
            className="rounded-none border-x-0 border-t border-b overflow-hidden flex flex-col flex-1 min-h-0 xl:rounded-lg xl:border xl:border-x xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)]"
            style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}
          >
              <div className="overflow-y-auto flex-1 min-h-0 min-w-0 bg-white">
                {/* Chọn template: Template chung | CV_It | CV kĩ thuật — ẩn khi ứng viên đã chọn 1 mẫu ở trang profile */}
                {!(
                  isApplicantProfile &&
                  applicantLockedCvTemplate &&
                  ['common', 'cv_it', 'cv_technical'].includes(applicantLockedCvTemplate)
                ) ? (
                  <nav className="mb-2 flex flex-wrap gap-x-0 border-b border-gray-200" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={cvTemplate === 'common'}
                      onClick={() => setCvTemplate('common')}
                      className={`relative px-3 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px rounded-none bg-transparent ${
                        cvTemplate === 'common'
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {t.addCandidateTemplateCommon || 'Template chung'}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={cvTemplate === 'cv_it'}
                      onClick={() => setCvTemplate('cv_it')}
                      className={`relative px-3 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px rounded-none bg-transparent ${
                        cvTemplate === 'cv_it'
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {t.addCandidateTemplateCvIt || 'CV IT'}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={cvTemplate === 'cv_technical'}
                      onClick={() => setCvTemplate('cv_technical')}
                      className={`relative px-3 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px rounded-none bg-transparent ${
                        cvTemplate === 'cv_technical'
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {t.addCandidateTemplateCvTech || 'CV kĩ thuật'}
                    </button>
                  </nav>
                ) : null}

                <div className="cv-form-a4-preview-shell">
                {/* Template chung */}
                {cvTemplate === 'common' && (
                  <CvTemplateCommon
                    formData={formData}
                    setFormData={setFormData}
                    cvFormatTab={cvFormatTab}
                    setCvFormatTab={setCvFormatTab}
                    cvEditable={cvEditable}
                    cvEditableArray={cvEditableArray}
                    cvEditableWithDefault={cvEditableWithDefault}
                    getDefaultCvDate={getDefaultCvDate}
                    handleAddEducation={handleAddEducation}
                    handleAddWorkExperience={handleAddWorkExperience}
                    handleAddCertificate={handleAddCertificate}
                    handleInsertEducationAt={handleInsertEducationAt}
                    handleInsertWorkExperienceAt={handleInsertWorkExperienceAt}
                    handleInsertCertificateAt={handleInsertCertificateAt}
                    handleBackendPreviewWithOptions={handleBackendPreviewWithOptions}
                    avatarPreview={avatarPreview}
                    onCvTableLayoutCommit={onCvTableLayoutCommit}
                    {...supplementTemplateProps}
                  />
                )}

                {/* CV IT Template */}
                        {cvTemplate === 'cv_it' && (
                  <CvTemplateIt
                    formData={formData}
                    setFormData={setFormData}
                    activeTab={cvItTab}
                    setActiveTab={setCvItTab}
                    cvEditable={cvEditable}
                    cvEditableBirthDate={cvEditableBirthDate}
                    cvEditableArray={cvEditableArray}
                    cvEditableWithDefault={cvEditableWithDefault}
                    getDefaultCvDate={getDefaultCvDate}
                    updateEmployment={updateEmployment}
                    updateEmploymentPair={updateEmploymentPair}
                    toggleShokumuCheckbox={toggleShokumuCheckbox}
                    handleAddWorkExperience={handleAddWorkExperience}
                    handleAddShokumuTable={handleAddShokumuTable}
                    handleInsertWorkExperienceAt={handleInsertWorkExperienceAt}
                    handleInsertWorkExperienceBlockAt={handleInsertWorkExperienceBlockAt}
                    handleBackendPreviewWithOptions={handleBackendPreviewWithOptions}
                    avatarPreview={avatarPreview}
                    onCvTableLayoutCommit={onCvTableLayoutCommit}
                    {...supplementTemplateProps}
                  />
                )}

                {/* CV Kỹ thuật Template */}
                {cvTemplate === 'cv_technical' && (
                  <CvTemplateTechnical
                    formData={formData}
                    setFormData={setFormData}
                    activeTab={cvTechnicalTab}
                    setActiveTab={setCvTechnicalTab}
                    cvEditable={cvEditable}
                    cvEditableBirthDate={cvEditableBirthDate}
                    cvEditableArray={cvEditableArray}
                    cvEditableWithDefault={cvEditableWithDefault}
                    getDefaultCvDate={getDefaultCvDate}
                    updateEmployment={updateEmployment}
                    updateEmploymentPair={updateEmploymentPair}
                    toggleShokumuCheckbox={toggleShokumuCheckbox}
                    handleAddWorkExperience={handleAddWorkExperience}
                    handleInsertWorkExperienceAt={handleInsertWorkExperienceAt}
                    handleInsertWorkExperienceBlockAt={handleInsertWorkExperienceBlockAt}
                    handleBackendPreviewWithOptions={handleBackendPreviewWithOptions}
                    avatarPreview={avatarPreview}
                    onCvTableLayoutCommit={onCvTableLayoutCommit}
                    {...supplementTemplateProps}
                  />
                )}
                </div>
              </div>
          </div>
        </div>
      </div>
      </div>

      {/* Chế độ tiến cử (jobId, agent): nút Hủy / Tiến cử nằm trên thanh sticky phía trên */}

      {/* Popup preview CV – cả 2 tab (履歴書 + 職務経歴書), không điều hướng */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={closePreviewModal}
        >
          <div
            className="relative rounded-xl shadow-2xl flex flex-col bg-white overflow-hidden"
            style={{ width: '95vw', maxWidth: '960px', maxHeight: '95vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
              <span className="text-sm font-semibold truncate" style={{ color: '#111827' }}>
                {previewPdfUrl ? 'Preview CV (PDF)' : previewHtml?.trim() ? 'Preview CV (HTML — PDF không khả dụng)' : 'Preview CV'}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadPreviewPdf}
                  disabled={previewLoading || (!previewPdfUrl && !previewHtml?.trim())}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-45 disabled:pointer-events-none"
                  style={{ color: '#2563eb', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}
                  title="Tải file PDF (giống preview khi dùng PDF)"
                >
                  <Download className="w-4 h-4" />
                  Tải PDF
                </button>
                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {previewLoading ? (
              <div className="flex items-center justify-center p-16">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" style={{ borderColor: '#2563eb' }} />
              </div>
            ) : (
              <iframe
                key={previewPdfUrl || 'html'}
                title="Preview CV"
                src={previewPdfUrl || undefined}
                srcDoc={previewPdfUrl ? undefined : previewHtml}
                className="w-full border-0 flex-1 min-h-0 bg-neutral-100"
                style={{ minHeight: '75vh', height: '75vh' }}
              />
            )}
          </div>
      </div>
      )}

      <JobCategoryPickerModal
        open={jobCategoryModalOpen}
        onClose={() => setJobCategoryModalOpen(false)}
        useAdminAPI={isAdmin}
        language={language}
        initialLeafId={formData.jobCategoryId || null}
        onConfirm={({ id, displayName }) => {
          setFormData((prev) => ({
            ...prev,
            jobCategoryId: id != null ? String(id) : '',
            jobCategoryLabel: displayName || '',
          }));
        }}
      />

      {isAdmin && (
        <SupplementContextMenu
          {...supplementMarking.getContextMenuProps({
            markSupplement: t.addCandidateMarkSupplement || 'Đánh dấu bổ sung thông tin',
            unmarkSupplement: t.addCandidateUnmarkSupplement || 'Bỏ đánh dấu',
          })}
        />
      )}
    </div>
  );
};

export default AddCandidateForm;

