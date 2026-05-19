import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Download,
  GraduationCap,
  Briefcase,
  Award,
  UserCircle,
  DollarSign,
  Folder,
  ChevronRight,
  Archive,
  RotateCcw,
  CheckCircle2,
  Pencil,
  Trash2,
  Sparkles,
  ExternalLink,
  Loader2,
  Building2,
  Calendar,
} from 'lucide-react';
import QuickCreateCandidateDrawer from './QuickCreateCandidateDrawer.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';
import { downloadBlobAsFile, openRemoteFileDownloadUrl } from '../../utils/safeFileDownload.js';
import { randomUUID } from '../../utils/randomUUID.js';
import { getCvDisplayStatusLabel, getCvDisplayStatusStyle, isCvPromotedInactive } from '../../utils/cvStatus';
import { formatDuplicateWithCvRef } from '../../utils/cvDuplicateDisplay.js';
import { yearSalaryRangeStringForCommission } from '../../utils/salaryRangeForCommission';
import {
  normalizeJobCommissionType,
  resolveCampaignPercentFromJob,
  pickPrimaryCommissionJobValue,
} from '../../utils/jobCommissionUi';
import CvFilePreview from '../Admin/CvFilePreview';
import {
  rangeOffsetsRelativeTo,
  SupplementMarkedText,
  SupplementContextMenu,
  SupplementFieldWrap,
} from './CandidateDetailSupplementMarks.jsx';

const RESIDENCE_STATUS_OPTIONS = [
  { value: 'engineer', vi: 'Visa kỹ sư / tri thức nhân văn / nghiệp vụ quốc tế', en: 'Engineer/Specialist in Humanities/International Services', jp: '技術・人文知識・国際業務' },
  { value: 'ssw', vi: 'Visa kỹ năng đặc định', en: 'Specified Skilled Worker', jp: '特定技能' },
  { value: 'student', vi: 'Visa du học', en: 'Student', jp: '留学' },
  { value: 'pr', vi: 'Vĩnh trú', en: 'Permanent resident', jp: '永住者' },
  { value: 'spouse', vi: 'Vợ/chồng người Nhật', en: 'Spouse of Japanese national', jp: '日本人の配偶者等' },
  { value: 'ltr', vi: 'Visa định trú', en: 'Long-term Resident', jp: '定住者' },
  { value: 'other', vi: 'Khác', en: 'Other', jp: 'その他' },
  { value: 'hsp', vi: 'Visa chuyên gia trình độ cao', en: 'Highly Skilled Professional', jp: '高度専門職' },
  { value: 'labor_skill', vi: 'Visa lao động kỹ năng', en: 'Technical Intern Training', jp: '技能実習' },
  { value: 'titp', vi: 'Thực tập sinh kỹ năng', en: 'Technical Intern Training', jp: '技能実習' },
  { value: 'dependent', vi: 'Visa phụ thuộc gia đình', en: 'Dependent', jp: '家族滞在' },
  { value: 'short', vi: 'Visa ngắn hạn', en: 'Short-term stay', jp: '短期滞在' },
  { value: 'ict', vi: 'Chuyển công tác nội bộ', en: 'Intra-company Transferee', jp: '企業内転勤' },
  { value: 'entertainer', vi: 'Biểu diễn / giải trí', en: 'Entertainer / Entertainment', jp: '興行' },
  { value: 'prspouse', vi: 'Vợ/chồng thường trú nhân', en: 'Spouse of Permanent Resident', jp: '永住者の配偶者等' },
];

const normalizeResidenceStatusValues = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
      } catch {
        /* ignore */
      }
    }
    return trimmed.split(',').map((v) => String(v).replace(/["'\[\]]/g, '').trim()).filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
};

const normalizeResidenceStatusValue = (value) => {
  const raw = String(value ?? '').trim().toLowerCase();
  const map = {
    engineer: 'engineer', ssw: 'ssw', student: 'student', pr: 'pr', spouse: 'spouse', ltr: 'ltr', other: 'other', hsp: 'hsp', labor_skill: 'labor_skill', titp: 'titp', dependent: 'dependent', short: 'short', ict: 'ict', entertainer: 'entertainer', prspouse: 'prspouse',
    '1': 'engineer', '2': 'ssw', '3': 'student', '4': 'pr', '5': 'spouse', '6': 'ltr', '7': 'other', '8': 'hsp', '9': 'labor_skill', '10': 'dependent', '11': 'short', '12': 'ict', '13': 'entertainer', '14': 'titp', '15': 'prspouse',
  };
  return map[raw] || raw;
};

const hasValue = (value) => {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '';
  return String(value).trim() !== '';
};

const getResidenceStatusLabel = (value, lang) => {
  const opt = RESIDENCE_STATUS_OPTIONS.find((item) => item.value === value);
  if (!opt) return value;
  if (lang === 'en') return opt.en || opt.vi;
  if (lang === 'ja') return opt.jp || opt.vi;
  return opt.vi;
};

const LABELS_VI = {
  detailTab: 'Chi tiết hồ sơ',
  historyTab: 'Lịch sử chỉnh sửa',
  backToList: 'Quay lại danh sách',
  candidateNotFound: 'Không tìm thấy thông tin ứng viên',
  personalInfo: 'Thông tin cá nhân',
  cvCode: 'Mã CV',
  nameKanji: 'Họ tên (Kanji)',
  nameKana: 'Họ tên (Kana)',
  birthDate: 'Ngày sinh',
  age: 'Tuổi',
  gender: 'Giới tính',
  email: 'Email',
  phone: 'Số điện thoại',
  postalCode: 'Mã bưu điện',
  address: 'Địa chỉ',
  collaborator: 'CTV',
  receiveDate: 'Ngày nhận',
  education: 'Học vấn',
  noEducation: 'Chưa có thông tin học vấn',
  year: 'Năm',
  month: 'Tháng',
  content: 'Nội dung',
  workExp: 'Kinh nghiệm',
  noWorkExp: 'Chưa có thông tin kinh nghiệm làm việc',
  period: 'Thời gian',
  companyName: 'Tên công ty',
  businessField: 'Lĩnh vực kinh doanh',
  scaleRole: 'Quy mô / Vai trò',
  jobDesc: 'Mô tả công việc',
  toolsTech: 'Công cụ, công nghệ',
  skillsCerts: 'Kỹ năng & Chứng chỉ',
  technicalSkills: 'Kỹ năng kỹ thuật',
  certificates: 'Chứng chỉ',
  noCertificates: 'Chưa có chứng chỉ',
  certName: 'Tên',
  introduction: 'Giới thiệu',
  careerSummary: 'Tóm tắt nghề nghiệp',
  strengths: 'Điểm mạnh',
  motivation: 'Động lực ứng tuyển',
  desires: 'Mong muốn',
  currentSalary: 'Lương hiện tại',
  desiredSalary: 'Lương mong muốn',
  desiredPosition: 'Vị trí mong muốn',
  desiredLocation: 'Địa điểm mong muốn',
  desiredStartDate: 'Ngày bắt đầu mong muốn',
  cvFile: 'File CV',
  otherDocs: 'Tài liệu khác',
  download: 'Tải xuống',
  loadingFiles: 'Đang tải danh sách file...',
  /** Khi DB có đường dẫn CV nhưng API cv-file-list trả originals/templates rỗng (vd. S3 ListBucket denied) */
  fileListUnavailable: 'Không liệt kê được file từ lưu trữ. Kiểm tra quyền IAM (s3:ListBucket trên prefix cvs/) và AWS_REGION trùng bucket.',
  duplicate: 'Trùng lặp',
  duplicateWithCvIdDetail: 'Hồ sơ này trùng với:',
  candidateProfileOwnership: 'Hồ sơ thuộc về',
  edit: 'Chỉnh sửa hồ sơ',
  delete: 'Xóa hồ sơ',
  statusDraft: 'Nháp',
  statusActive: 'Hoạt động',
  statusArchived: 'Lưu trữ',
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
  confirmDelete: 'Bạn có chắc muốn xóa ứng viên này? Hành động này không thể hoàn tác.',
  deleteSuccess: 'Xóa ứng viên thành công!',
  deleteError: 'Có lỗi xảy ra khi xóa ứng viên',
  cvNoFile: 'Không có file CV để tải xuống',
  cvLinkError: 'Không lấy được link tải file',
  cvDownloadError: 'Không thể tải file CV. Vui lòng thử lại sau.',
  zipError: 'Không thể tải file ZIP. Vui lòng thử lại.',
  zipSnapshotError: 'Không thể tải file ZIP snapshot. Vui lòng thử lại.',
  rollbackConfirm: 'Rollback về snapshot này sẽ tạo snapshot mới và đặt làm bản hiện tại. Tiếp tục?',
  rollbackFail: 'Rollback thất bại. Vui lòng thử lại.',
  historyLoading: 'Đang tải lịch sử snapshot...',
  noSnapshot: 'Chưa có snapshot hoặc không đọc được lịch sử.',
  matchingTitle: 'Gợi ý việc làm phù hợp (AI)',
  matchingLoading: 'Đang tải gợi ý AI...',
  matchingError: 'Không tải được gợi ý AI.',
  matchingComputing: 'Đang tính toán. Vui lòng chờ.',
  matchingEmpty: 'Chưa có gợi ý phù hợp.',
  matchingNeedsCompletion: 'Hãy hoàn thiện hồ sơ của bạn để có thể xem được những công việc phù hợp với ứng viên này nhé.',
  matchingVectorProcessing: 'Hồ sơ đang được AI xử lý nền. Khi hoàn tất, hệ thống sẽ thông báo cho bạn.',
  matchingUpdateWithAi: 'Cập nhật thông tin với AI',
  matchingUpdateManual: 'Cập nhật thông tin thủ công',
  matchingScore: 'Điểm match',
  matchingReason: 'Lý do',
  matchingViewReason: 'Xem lý do',
  matchingHideReason: 'Ẩn lý do',
  matchingOpenJob: 'Mở job',
  matchingFilteredNote: 'Chỉ hiển thị các job bạn được xem trên hệ thống (CTV).',
  matchingLoadReasonError: 'Không lấy được lý do.',
  markSupplement: 'Đánh dấu bổ sung thông tin',
  unmarkSupplement: 'Bỏ đánh dấu',
  sendSupplementRequest: 'Gửi thông tin',
  supplementSent: 'Đã gửi yêu cầu tới CTV.',
  supplementSendError: 'Không gửi được yêu cầu.',
  supplementNeedMarks: 'Chưa có đoạn nào được đánh dấu.',
  supplementNoCollaborator: 'Hồ sơ chưa có CTV — không gửi được.',
  filesTab: 'File CV',
};

/**
 * Shared candidate detail page for Admin, Collaborator (CTV), or Applicant (embedded on profile).
 * @param { 'admin' | 'collaborator' | 'applicant' } variant - Which API and routes to use
 * @param {string|null} embeddedCandidateId - Khi nhúng (ứng viên): id CV, bỏ qua useParams
 * @param {string} embeddedPrefix - Base path landing candidate, ví dụ /landing/candidate
 * @param {function} onEditProfile - Ứng viên: gọi khi bấm sửa thay vì điều hướng agent/admin
 */
const CandidateDetailPage = ({
  variant = 'admin',
  embeddedCandidateId = null,
  embeddedPrefix = '/candidate',
  onEditProfile = null,
}) => {
  const params = useParams();
  const candidateId =
    embeddedCandidateId != null && embeddedCandidateId !== ''
      ? String(embeddedCandidateId)
      : params.candidateId;
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const lbl = (key) => t[key] ?? LABELS_VI[key] ?? key;

  const isApplicant = variant === 'applicant';
  const isAdmin = variant === 'admin';
  const backPath = isAdmin ? '/admin/candidates' : '/agent/candidates';
  const editPath = isApplicant
    ? `${embeddedPrefix}/profile`
    : isAdmin
      ? `/admin/candidates/${candidateId}/edit`
      : `/agent/candidates/${candidateId}/edit`;

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('detail');
  const [deleting, setDeleting] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [hoveredBackToListButton, setHoveredBackToListButton] = useState(false);
  const [cvFileList, setCvFileList] = useState({ originals: [], templates: [] });
  /** Riêng danh sách file — tránh hiển thị "đang tải" vĩnh viễn khi API trả rỗng do lỗi S3/list */
  const [cvFileListLoading, setCvFileListLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState({
    CV_original: false,
    CV_Template: false,
    'CV_Template/Common': false,
    'CV_Template/IT': false,
    'CV_Template/Technical': false,
  });
  const [snapshots, setSnapshots] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [openSnapshots, setOpenSnapshots] = useState({});
  const [openSnapshotFolders, setOpenSnapshotFolders] = useState({});
  const [rollbackingDateTime, setRollbackingDateTime] = useState(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [quickEditInitialCvFile, setQuickEditInitialCvFile] = useState(null);
  const [showMissingInfoPopup, setShowMissingInfoPopup] = useState(false);

  const getMissingInfoLabel = (fieldKey, fallback) => {
    const map = {
      jobCategory: t.jobCategoryLabel || t.jobCategory || 'Ngành nghề',
      desiredPosition: t.desiredPosition || 'Vị trí mong muốn',
      currentSalary: t.currentSalary || 'Lương hiện tại',
      desiredSalary: t.desiredSalary || 'Lương mong muốn',
      jpLevel: t.japaneseLevel || 'Trình độ tiếng Nhật',
      experienceYears: t.experienceYears || 'Số năm kinh nghiệm',
      residenceStatus: t.jpResidenceStatus || 'Tư cách lưu trú',
      cvFile: t.cvFile || 'File CV',
      name: t.name || 'Họ tên',
    };
    return map[fieldKey] || fallback;
  };

  const missingAiMatchingFields = candidate
    ? [
        { key: 'name', label: getMissingInfoLabel('name', 'Họ tên'), missing: !hasValue(candidate.name || candidate.fullName) },
        { key: 'jobCategory', label: getMissingInfoLabel('jobCategory', 'Ngành nghề'), missing: !hasValue(candidate.jobCategoryId || candidate.job_category_id || candidate.jobCategory?.id || candidate.jobCategoryName || candidate.job_category_name || candidate.categoryName) },
        { key: 'desiredPosition', label: getMissingInfoLabel('desiredPosition', 'Vị trí mong muốn'), missing: !hasValue(candidate.desiredWorkLocation || candidate.desiredLocation || candidate.desiredPosition) },
        { key: 'currentSalary', label: getMissingInfoLabel('currentSalary', 'Lương hiện tại'), missing: !hasValue(candidate.currentSalary || candidate.currentIncome) },
        { key: 'desiredSalary', label: getMissingInfoLabel('desiredSalary', 'Lương mong muốn'), missing: !hasValue(candidate.desiredSalary || candidate.desiredIncome) },
        { key: 'jpLevel', label: getMissingInfoLabel('jpLevel', 'Trình độ tiếng Nhật'), missing: !hasValue(candidate.jpLevel || candidate.japaneseLevel || candidate.n5Level || candidate.languageLevelJp || candidate.jlptLevel) },
        { key: 'experienceYears', label: getMissingInfoLabel('experienceYears', 'Số năm kinh nghiệm'), missing: !hasValue(candidate.experienceYears || candidate.yearsOfExperience || candidate.experienceYear || candidate.workExperienceYears) },
        { key: 'residenceStatus', label: getMissingInfoLabel('residenceStatus', 'Tư cách lưu trú'), missing: !hasValue(candidate.jpResidenceStatus || candidate.jp_residence_status || candidate.residenceStatus || candidate.residence_status || candidate.visaStatus) },
        { key: 'cvFile', label: getMissingInfoLabel('cvFile', 'File CV'), missing: !hasValue(candidate.cvFile || candidate.cvOriginalPath || candidate.curriculumVitae) },
      ].filter((item) => item.missing)
    : [];

  const candidateNeedsAiMatchingWarning = missingAiMatchingFields.length > 0;

  const [aiMatches, setAiMatches] = useState([]);
  const [aiMatchLoading, setAiMatchLoading] = useState(false);
  const [aiMatchError, setAiMatchError] = useState(null);
  const [aiJobTitles, setAiJobTitles] = useState({});
  const [aiJobDetails, setAiJobDetails] = useState({});
  const [expandedAiJobId, setExpandedAiJobId] = useState(null);
  const [aiReasonByJobId, setAiReasonByJobId] = useState({});
  const [ctvProfile, setCtvProfile] = useState(null);

  const [supplementMarks, setSupplementMarks] = useState([]);
  const [supplementCtx, setSupplementCtx] = useState(null);
  const [supplementSending, setSupplementSending] = useState(false);
  const completionState = candidate?.completionState || candidate?.completion_state || 'ready_for_parse';
  const vectorSyncStatus = candidate?.vectorSyncStatus || candidate?.vector_sync_status || 'pending';
  const canRunAiMatching = candidate && candidate.isParse && completionState === 'ready_for_parse' && vectorSyncStatus === 'vector_done';
  const isVectorProcessing = candidate && candidate.isParse && completionState === 'ready_for_parse' && ['vector_pending', 'vector_processing'].includes(vectorSyncStatus);
  const shouldShowAiCompletionActions = !isAdmin && !isApplicant && candidate && (!candidate.isParse || ['new', 'pending_manual_completion'].includes(completionState));

  const loadCandidateDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = isApplicant
        ? await apiService.getApplicantMyCVById(candidateId)
        : isAdmin
          ? await apiService.getAdminCVById(candidateId)
          : await apiService.getCVStorageById(candidateId);
      if (response.success && response.data?.cv) {
        setCandidate(response.data.cv);
      } else {
        setError(response.message || lbl('candidateNotFound'));
      }
    } catch (err) {
      console.error('Error loading candidate detail:', err);
      setError(err.message || (t.errorLoadingCandidate || 'Lỗi khi tải thông tin ứng viên'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidateDetail();
  }, [candidateId]);

  useEffect(() => {
    if (isAdmin || isApplicant) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await apiService.getCTVProfile();
        if (!cancelled && response?.success && response?.data) {
          setCtvProfile(response.data.collaborator || response.data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading CTV profile:', error);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, isApplicant]);

  useEffect(() => {
    if (!candidate) return;
    const m = candidate.adminSupplementMarks;
    setSupplementMarks(Array.isArray(m) ? m : []);
  }, [candidate?.id, candidate?.adminSupplementMarks]);

  useEffect(() => {
    if (!candidateId) return;
    if (!canRunAiMatching) {
      setAiMatches([]);
      setAiJobTitles({});
      setAiJobDetails({});
      setExpandedAiJobId(null);
      setAiReasonByJobId({});
      setAiMatchLoading(false);
      if (candidate && (!candidate.isParse || ['new', 'pending_manual_completion'].includes(completionState))) {
        setAiMatchError(lbl('matchingNeedsCompletion'));
      } else if (isVectorProcessing) {
        setAiMatchError(lbl('matchingVectorProcessing'));
      } else {
        setAiMatchError(null);
      }
      return;
    }
    let cancelled = false;
    const run = async () => {
      setAiMatchLoading(true);
      setAiMatchError(null);
      setAiMatches([]);
      setAiJobTitles({});
      setAiJobDetails({});
      setExpandedAiJobId(null);
      setAiReasonByJobId({});
      try {
        let allowedJobIds = null;
        let allowedJobsById = {};
        if (!isAdmin && !isApplicant) {
          allowedJobIds = new Set();
          let cursor = null;
          const limit = 50;
          for (let guard = 0; guard < 30; guard += 1) {
            const params = { limit, sortBy: 'createdAt', sortOrder: 'DESC' };
            if (cursor) params.cursor = cursor;
            const res = await apiService.getCTVJobs(params);
            const jobs = res?.data?.jobs || [];
            jobs.forEach((j) => {
              if (j?.id != null) {
                const idNum = Number(j.id);
                allowedJobIds.add(idNum);
                allowedJobsById[idNum] = j;
              }
            });
            const pg = res?.data?.pagination;
            if (!pg?.hasMore || !pg?.nextCursor) break;
            cursor = pg.nextCursor;
            if (allowedJobIds.size >= 500) break;
          }
        }
        const raw = await apiService.getAiMatchJobsForCv(candidateId);
        const payload = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.items)
            ? raw.items
            : Array.isArray(raw?.data?.items)
              ? raw.data.items
              : Array.isArray(raw?.data)
                ? raw.data
                : [];
        let filtered = payload.map(normalizeAiMatchRow).filter(Boolean);
        if (allowedJobIds) {
          filtered = filtered.filter((row) => allowedJobIds.has(Number(row.id)));
        }
        filtered = [...filtered].sort((a, b) => (Number(b.similarity_score) || 0) - (Number(a.similarity_score) || 0));
        if (!cancelled) {
          setAiMatches(filtered);
          if (!isAdmin && !isApplicant) {
            const seededDetails = {};
            filtered.forEach((row) => {
              const idNum = Number(row.id);
              if (allowedJobsById[idNum]) seededDetails[idNum] = allowedJobsById[idNum];
            });
            setAiJobDetails(seededDetails);
          }
        }
      } catch (e) {
        console.error('AI match jobs:', e);
        if (!cancelled) {
          // 404 = vector chưa được tính toán, hiển thị thông báo chờ
          const is404 = e?.status === 404 || e?.response?.status === 404 || String(e?.message || '').includes('404');
          setAiMatchError(is404 ? lbl('matchingComputing') : (e?.message || lbl('matchingError')));
        }
      } finally {
        if (!cancelled) setAiMatchLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [candidateId, isAdmin, isApplicant, canRunAiMatching, isVectorProcessing, candidate?.isParse, completionState, vectorSyncStatus]);

  const handleUpdateWithAi = () => {
    navigate(`${editPath}?autoParseOnEdit=1&markReadyForParse=1`);
  };

  const handleUpdateManual = () => {
    navigate(editPath);
  };

  const openQuickEditDrawer = () => {
    if (!candidate?.id) return;
    setQuickEditInitialCvFile(candidate?.cvOriginalPath || candidate?.curriculumVitae || null);
    setQuickEditOpen(true);
    setShowMissingInfoPopup(false);
  };

  const closeQuickEditDrawer = () => {
    setQuickEditOpen(false);
  };

  const toggleMissingInfoPopup = () => {
    if (!candidateNeedsAiMatchingWarning) return;
    setShowMissingInfoPopup((prev) => !prev);
  };

  const handleQuickEdit = handleUpdateManual;

  useEffect(() => {
    if (!aiMatches.length) return;
    let cancelled = false;
    const ids = aiMatches.slice(0, 30).map((m) => Number(m.id)).filter((n) => !Number.isNaN(n));
    const loadTitles = async () => {
      const fn = isAdmin
        ? apiService.getAdminJobById
        : isApplicant
          ? apiService.getApplicantJobById
          : apiService.getJobById;
      const entries = await Promise.all(
        ids.map(async (id) => {
          const seededJob = aiJobDetails[id];
          if (seededJob) {
            const seededTitle = seededJob?.title || seededJob?.titleJp || seededJob?.titleEn || `#${id}`;
            return [id, { title: seededTitle, job: seededJob }];
          }
          try {
            const r = await fn(id);
            const job = r?.data?.job;
            const title = job?.title || job?.titleJp || job?.titleEn || `#${id}`;
            return [id, { title, job }];
          } catch {
            return [id, { title: `#${id}`, job: null }];
          }
        })
      );
      if (!cancelled) {
        setAiJobTitles(Object.fromEntries(entries.map(([id, data]) => [id, data.title])));
        setAiJobDetails((prev) => {
          const next = { ...prev };
          entries.forEach(([id, data]) => {
            if (data.job) next[id] = data.job;
          });
          return next;
        });
      }
    };
    loadTitles();
    return () => { cancelled = true; };
  }, [aiMatches, isAdmin, isApplicant]);

  const parseCoreSkillsRaw = (raw) => {
    if (raw == null || raw === '') return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const p = JSON.parse(raw);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const stripHtml = (html) => {
    if (!html) return '';
    if (!String(html).includes('<')) return String(html).trim();
    try {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
    } catch {
      return String(html).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
  };

  const pickByLanguage = (viText, enText, jpText) => {
    if (language === 'en') return enText || viText || jpText || '';
    if (language === 'ja') return jpText || enText || viText || '';
    return viText || enText || jpText || '';
  };

  const getQuickJobInfo = (job, meta) => {
    const requirements = Array.isArray(job?.requirements) ? job.requirements : [];
    const applicationConditions = requirements
      .filter((req) => req?.type === 'application' || req?.type === 'technique' || req?.type === 'education')
      .map((req) => stripHtml(pickByLanguage(req.content, req.contentEn || req.content_en, req.contentJp || req.content_jp)))
      .filter(Boolean);

    const description = stripHtml(
      pickByLanguage(
        job?.description,
        job?.descriptionEn || job?.description_en,
        job?.descriptionJp || job?.description_jp
      )
    );

    const salary = (() => {
      if (Array.isArray(job?.salaryRanges) && job.salaryRanges.length > 0) {
        return job.salaryRanges
          .map((sr) => pickByLanguage(sr.salaryRange, sr.salaryRangeEn || sr.salary_range_en, sr.salaryRangeJp || sr.salary_range_jp))
          .filter(Boolean)
          .join(', ');
      }
      return stripHtml(job?.estimatedSalary || job?.estimated_salary || meta?.estimated_salary || '');
    })();

    const location = (() => {
      if (Array.isArray(job?.workingLocationDetails) && job.workingLocationDetails.length > 0) {
        return job.workingLocationDetails
          .map((detail) => stripHtml(pickByLanguage(detail.content, detail.contentEn || detail.content_en, detail.contentJp || detail.content_jp)))
          .filter(Boolean)
          .join(', ');
      }
      return stripHtml(job?.workLocation || job?.work_location || meta?.work_location || '');
    })();

    return { applicationConditions, description, salary, location };
  };

  const getMatchCardTags = (job) => {
    const tags = [];
    if (job?.isHot) tags.push({ label: 'JobShare Selection', color: 'green' });
    const isInCampaign = Array.isArray(job?.jobCampaigns) && job.jobCampaigns.length > 0;
    if (isInCampaign) tags.push({ label: 'Campaign', color: 'blue' });
    const residenceStatuses = normalizeResidenceStatusValues(
      job?.residenceStatus ||
      job?.residence_status ||
      job?.residenceStatuses ||
      job?.residence_statuses
    );
    residenceStatuses.forEach((value) => {
      tags.push({ label: getResidenceStatusLabel(value, language), color: 'orange' });
    });
    return tags;
  };

  const getTagInlineStyle = (color) => {
    const colorMap = {
      green: { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' },
      orange: { backgroundColor: '#fed7aa', color: '#9a3412', borderColor: '#fdba74' },
      blue: { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' },
    };
    return colorMap[color] || colorMap.green;
  };

  const getSimpleCommissionText = (job, meta) => {
    const normalize = (v) => {
      if (v == null) return '';
      return String(v).trim();
    };
    const parseNumber = (v) => {
      if (v == null || v === '') return null;
      const n = Number(String(v).replace(/,/g, '').replace(/\s+/g, ''));
      return Number.isFinite(n) ? n : null;
    };
    const formatAmount = (n) => {
      const num = parseNumber(n);
      if (num == null || num <= 0) return '';
      return `${num.toLocaleString('vi-VN')} JPY`;
    };
    const formatRange = (min, max) => {
      const minNum = parseNumber(min);
      const maxNum = parseNumber(max);
      if (minNum == null || maxNum == null || minNum <= 0 || maxNum <= 0) return '';
      return `${minNum.toLocaleString('vi-VN')} - ${maxNum.toLocaleString('vi-VN')} JPY`;
    };
    const formatPercent = (pct) => {
      const n = parseNumber(pct);
      if (n == null || n <= 0) return '';
      return `${n}${String(pct).trim().endsWith('%') ? '' : '%'}`;
    };
    const formatPercentIncome = (pct) => {
      const p = formatPercent(pct);
      return p ? `${p} thu nhập năm` : '';
    };
    const isTextual = (v) => {
      if (v == null) return false;
      const s = String(v).trim();
      if (!s) return false;
      return !/^[-+]?\d[\d,]*(\.\d+)?$/.test(s);
    };

    if (!job) return normalize(meta?.commission);

    const values = Array.isArray(job.jobValues) && job.jobValues.length > 0
      ? job.jobValues
      : Array.isArray(job.profits) && job.profits.length > 0
        ? job.profits
        : [];

    const commissionType = normalize(normalizeJobCommissionType(job)).toLowerCase();
    const campaignPercent = Number(resolveCampaignPercentFromJob(job) ?? 0);
    const salaryRangeData = (() => {
      const salaryRanges = Array.isArray(job?.salaryRanges) ? job.salaryRanges : [];
      const rawRange = yearSalaryRangeStringForCommission(salaryRanges);
      if (!rawRange) return null;
      const match = rawRange.match(/([\d.,]+)\s*-\s*([\d.,]+)/);
      if (!match) return null;
      const min = parseNumber(match[1]);
      const max = parseNumber(match[2]);
      if (min == null || max == null || min <= 0 || max <= 0) return null;
      return { min, max };
    })();

    const firstRow = values[0] || null;
    const firstValueId = Number(firstRow?.valueId ?? firstRow?.valueRef?.id ?? 0);
    const firstValueRaw = firstRow?.value ?? firstRow?.amount ?? firstRow?.valueRef?.value;
    const firstViewText = normalize(firstRow?.viewOnCollaborator || firstRow?.view_on_collaborator);

    if (job?.computedCampaignCommission?.min != null && job?.computedCampaignCommission?.max != null) {
      const rangeText = formatRange(job.computedCampaignCommission.min, job.computedCampaignCommission.max);
      if (rangeText) return rangeText;
    }

    if (campaignPercent > 0 && salaryRangeData && commissionType !== 'percent' && commissionType !== 'percentage') {
      const min = salaryRangeData.min * (campaignPercent / 100);
      const max = salaryRangeData.max * (campaignPercent / 100);
      return `${Math.round(min).toLocaleString('vi-VN')} - ${Math.round(max).toLocaleString('vi-VN')} JPY`;
    }

    if ((commissionType === 'percent' || commissionType === 'percentage')) {
      const text = normalize(firstValueRaw || firstViewText);
      if (text) {
        if (isTextual(text)) return text;
        return formatPercentIncome(text) || `${formatPercent(text) || text} thu nhập năm`;
      }
      if (campaignPercent > 0) return `${campaignPercent}% thu nhập năm`;
    }

    if (firstValueId === 34) {
      if (firstViewText) return firstViewText;
      const direct = normalize(firstValueRaw);
      if (direct) return isTextual(direct) ? direct : formatAmount(direct);
    }

    if (firstValueId === 6 || firstValueId === 7) {
      const text = normalize(firstViewText || firstValueRaw);
      if (text) return isTextual(text) ? text : formatAmount(text);
    }

    if (commissionType === 'fixed' && firstValueRaw != null && firstValueRaw !== '') {
      const text = normalize(firstValueRaw);
      if (text) return isTextual(text) ? text : formatAmount(text);
    }

    for (const item of values) {
      const viewText = normalize(item?.viewOnCollaborator || item?.view_on_collaborator);
      if (viewText) return viewText;
      const raw = item?.value ?? item?.amount ?? item?.valueRef?.value;
      if (raw == null || raw === '') continue;
      const text = normalize(raw);
      if (isTextual(text)) return text;
      const asRange = normalize(item?.amountRange || item?.amount_range || item?.range || item?.salaryRange);
      if (asRange) return asRange;
      const amountText = formatAmount(text);
      if (amountText) return amountText;
    }

    const fallbackRaw =
      job?.commission ??
      job?.commissionText ??
      job?.estimatedCommission ??
      job?.estimated_commission ??
      meta?.commission;
    const fallback = normalize(fallbackRaw);
    if (fallback) return fallback;

    return '';
  };

  const normalizeAiMatchRow = (row) => {
    if (!row || typeof row !== 'object') return null;
    const idRaw = row.id ?? row.jobId ?? row.job_id ?? row.job?.id;
    const id = idRaw != null ? Number(idRaw) : null;
    const scoreRaw = row.score ?? row.similarity_score ?? row.similarityScore ?? row.match_score ?? row.matchScore ?? 0;
    const reasoning = row.reasoning || row.reason || row.matching_reasons?.reason || row.matching_reason || null;
    const meta = row.metadata || row.meta || row.data?.metadata || {};
    return {
      ...row,
      id: Number.isNaN(id) ? row.id : id,
      score: Number(scoreRaw) || 0,
      similarity_score: Number(scoreRaw) || 0,
      reasoning,
      metadata: meta,
    };
  };

  const getAiReasonText = (matchRow) => {
    const reasoning = matchRow?.reasoning || matchRow?.reason || matchRow?.matching_reasons?.reason;
    if (reasoning && typeof reasoning === 'object') {
      return pickByLanguage(reasoning.vi, reasoning.en, reasoning.jp);
    }
    if (typeof reasoning === 'string') return reasoning.trim();
    return '';
  };

  const getAiReasoningText = (matchRow) => {
    const text = getAiReasonText(matchRow);
    if (text) return text;
    const metaReason = matchRow?.metadata?.reasoning || matchRow?.metadata?.reason || matchRow?.data?.reasoning;
    if (metaReason && typeof metaReason === 'object') {
      return pickByLanguage(metaReason.vi, metaReason.en, metaReason.jp) || '';
    }
    if (typeof metaReason === 'string') return metaReason.trim();
    return '';
  };

  const getJobDetailHref = (jid) => {
    const id = Number(jid);
    if (!Number.isFinite(id) || id <= 0) return null;
    if (isAdmin) return `/admin/jobs/${id}`;
    if (isApplicant) return `${embeddedPrefix}/jobs/${id}`;
    return `/agent/jobs/${id}`;
  };

  const toggleAiReason = (jobIdNum, matchRow) => {
    const key = String(jobIdNum);
    if (expandedAiJobId === key) {
      setExpandedAiJobId(null);
      return;
    }
    setExpandedAiJobId(key);
    const cachedReason = aiReasonByJobId[key];
    if (cachedReason) return;
    const directReason = getAiReasonText(matchRow);
    setAiReasonByJobId((prev) => ({
      ...prev,
      [key]: directReason || lbl('matchingLoadReasonError'),
    }));
  };


  useEffect(() => {
    if (!isAdmin) return;
    const loadAdminProfile = async () => {
      try {
        const res = await apiService.getAdminProfile();
        if (res.success && res.data?.admin) setAdminProfile(res.data.admin);
      } catch (e) {
        console.error('Error loading admin profile:', e);
      }
    };
    loadAdminProfile();
  }, [isAdmin]);

  useEffect(() => {
    if (!candidate || !candidateId) return;
    let cancelled = false;
    setCvFileListLoading(true);
    const done = () => {
      if (!cancelled) setCvFileListLoading(false);
    };
    if (isApplicant) {
      apiService
        .getApplicantCVFileList(candidateId)
        .then((data) => {
          if (!cancelled) setCvFileList(data || { originals: [], templates: [] });
        })
        .catch(() => {
          if (!cancelled) setCvFileList({ originals: [], templates: [] });
        })
        .finally(done);
      return () => {
        cancelled = true;
      };
    }
    const fetchList = isAdmin ? apiService.getAdminCVFileList : apiService.getCtvCVFileList;
    fetchList(candidateId)
      .then((data) => {
        if (!cancelled) setCvFileList(data || { originals: [], templates: [] });
      })
      .catch(() => {
        if (!cancelled) setCvFileList({ originals: [], templates: [] });
      })
      .finally(done);
    return () => { cancelled = true; };
  }, [candidate, candidateId, isAdmin, isApplicant]);

  useEffect(() => {
    if (isApplicant) return;
    if (activeTab !== 'history' || !candidateId) return;
    let cancelled = false;
    setHistoryLoading(true);
    const fetchSnapshots = isAdmin ? apiService.getAdminCVSnapshots : apiService.getCtvCVSnapshots;
    fetchSnapshots(candidateId, { limit: 50 })
      .then((list) => {
        if (!cancelled) setSnapshots(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setSnapshots([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, candidateId, isAdmin, isApplicant]);

  const handleDelete = async () => {
    if (!isAdmin) return;
    if (!window.confirm(lbl('confirmDelete'))) return;
    try {
      setDeleting(true);
      const response = await apiService.deleteAdminCV(candidateId);
      if (response.success) {
        alert(lbl('deleteSuccess'));
        navigate(backPath);
      } else {
        alert(response.message || lbl('deleteError'));
      }
    } catch (err) {
      console.error('Error deleting candidate:', err);
      alert(err.message || lbl('deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const formatGender = (g) => {
    if (g === 1 || g === '男') return lbl('male');
    if (g === 2 || g === '女') return lbl('female');
    if (g === 3) return lbl('other');
    return '—';
  };

  const formatStatus = (s) => {
    if (s === 0) return lbl('statusDraft');
    if (s === 1) return lbl('statusActive');
    if (s === 2) return lbl('statusArchived');
    return '—';
  };

  const getStatusColor = (status) => {
    if (status === 1) return { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
    if (status === 0) return { backgroundColor: '#f3f4f6', color: '#1f2937', borderColor: '#d1d5db' };
    return { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' };
  };

  const getFileUrl = (fileType, params) =>
    isAdmin
      ? apiService.getAdminCVFileUrl(candidateId, fileType, 'download', params)
      : apiService.getCtvCVFileUrl(candidateId, fileType, 'download', params);

  const downloadCV = async (cvPath, fileType = 'curriculumVitae') => {
    if (!cvPath) {
      alert(lbl('cvNoFile'));
      return;
    }
    const params = fileType === 'cvOriginalPath' ? { index: 0 } : fileType === 'cvCareerHistoryPath' ? { document: 'shokumu', template: 'Common' } : { document: 'rirekisho', template: 'Common' };
    try {
      const urlToOpen = await getFileUrl(fileType, params);
      if (!urlToOpen) throw new Error(lbl('cvLinkError'));
      openRemoteFileDownloadUrl(urlToOpen);
    } catch (err) {
      console.error('Error downloading CV:', err);
      alert(lbl('cvDownloadError'));
    }
  };

  const toggleFolder = (id) => setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleSnapshot = (dateTime) => setOpenSnapshots((prev) => ({ ...prev, [dateTime]: !prev[dateTime] }));
  const toggleSnapshotFolder = (dateTime, folderId) => {
    const key = `${dateTime}::${folderId}`;
    setOpenSnapshotFolders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const downloadZip = async (scope, template = 'all') => {
    try {
      const fn = isApplicant
        ? apiService.downloadApplicantCVZip
        : isAdmin
          ? apiService.downloadAdminCVZip
          : apiService.downloadCtvCVZip;
      const { blob, filename } = await fn(candidateId, scope, template);
      downloadBlobAsFile(blob, filename || 'cv.zip');
    } catch (e) {
      console.error('Download zip failed:', e);
      alert(lbl('zipError'));
    }
  };

  const downloadZipSnapshot = async (dateTime, scope, template = 'all') => {
    try {
      const fn = isAdmin ? apiService.downloadAdminCVZip : apiService.downloadCtvCVZip;
      const { blob, filename } = await fn(candidateId, scope, template, dateTime);
      downloadBlobAsFile(blob, filename || 'cv.zip');
    } catch (e) {
      console.error('Download zip snapshot failed:', e);
      alert(lbl('zipSnapshotError'));
    }
  };

  const formatSnapshotLabel = (dateTime) => {
    if (!dateTime) return '—';
    const s = String(dateTime);
    const parts = s.split('_');
    if (parts.length !== 2) return s;
    return `${parts[0]} ${parts[1].replace(/-/g, ':')}`;
  };

  const handleRollbackSnapshot = async (dateTime) => {
    if (!candidateId) return;
    if (!window.confirm(lbl('rollbackConfirm'))) return;
    setRollbackingDateTime(dateTime);
    try {
      const rollback = isAdmin ? apiService.rollbackAdminCV : apiService.rollbackCtvCV;
      const getSnapshots = isAdmin ? apiService.getAdminCVSnapshots : apiService.getCtvCVSnapshots;
      const getFileList = isAdmin ? apiService.getAdminCVFileList : apiService.getCtvCVFileList;
      await rollback(candidateId, dateTime);
      await loadCandidateDetail();
      const list = await getSnapshots(candidateId, { limit: 50 });
      setSnapshots(Array.isArray(list) ? list : []);
      const data = await getFileList(candidateId);
      setCvFileList(data || { originals: [], templates: [] });
      setCvFileListLoading(false);
    } catch (err) {
      alert(err?.message || lbl('rollbackFail'));
    } finally {
      setRollbackingDateTime(null);
    }
  };

  const getTemplatesByFolder = () => {
    const byTemplate = { Common: [], IT: [], Technical: [] };
    (cvFileList.templates || []).forEach((tpl) => {
      if (tpl?.template && byTemplate[tpl.template]) byTemplate[tpl.template].push(tpl);
    });
    return byTemplate;
  };

  const persistSupplementMarks = async (next) => {
    if (!isAdmin || !candidateId) return;
    try {
      const res = await apiService.patchAdminCVSupplementMarks(candidateId, next);
      if (res.success && res.data?.cv) setCandidate(res.data.cv);
    } catch (e) {
      console.error('persistSupplementMarks', e);
    }
  };

  const handleSupplementFieldContextMenu = (e, fieldKey) => {
    if (!isAdmin || activeTab !== 'detail') return;
    const fieldEl = e.currentTarget;
    const markEl = e.target.closest?.('[data-supp-mark-id]');
    if (markEl) {
      e.preventDefault();
      e.stopPropagation();
      setSupplementCtx({
        kind: 'unmark',
        markId: markEl.getAttribute('data-supp-mark-id'),
        x: e.clientX,
        y: e.clientY,
      });
      return;
    }
    const sel = window.getSelection();
    const tx = sel?.toString?.()?.trim();
    if (!tx) return;
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;
    if (!range) return;
    // Cho phép selection nằm trong field hoặc trùng phần tử (tiêu đề chỉ chứa text + mark)
    const anchor = range.commonAncestorContainer;
    const inside =
      fieldEl.contains(anchor) ||
      fieldEl === anchor ||
      (anchor.nodeType === Node.TEXT_NODE && fieldEl.contains(anchor.parentNode));
    if (!inside) return;
    e.preventDefault();
    e.stopPropagation();
    const off = rangeOffsetsRelativeTo(fieldEl, range);
    if (!off || off.end <= off.start) return;
    setSupplementCtx({
      kind: 'mark',
      fieldKey,
      start: off.start,
      end: off.end,
      selectedText: tx.slice(0, 2000),
      x: e.clientX,
      y: e.clientY,
    });
  };

  const confirmAddSupplementMark = () => {
    if (!supplementCtx || supplementCtx.kind !== 'mark') return;
    const id = randomUUID();
    const ctx = supplementCtx;
    setSupplementMarks((prev) => {
      const next = [
        ...prev,
        {
          id,
          fieldKey: ctx.fieldKey,
          start: ctx.start,
          end: ctx.end,
          selectedText: ctx.selectedText,
        },
      ];
      queueMicrotask(() => persistSupplementMarks(next));
      return next;
    });
    setSupplementCtx(null);
  };

  const confirmRemoveSupplementMark = (markId) => {
    setSupplementMarks((prev) => {
      const next = prev.filter((m) => String(m.id) !== String(markId));
      queueMicrotask(() => persistSupplementMarks(next));
      return next;
    });
    setSupplementCtx(null);
  };

  const handleSendSupplementRequest = async () => {
    if (!supplementMarks.length) {
      alert(lbl('supplementNeedMarks'));
      return;
    }
    setSupplementSending(true);
    try {
      const res = await apiService.sendAdminCVSupplementRequest(candidateId, supplementMarks);
      if (res.success && res.data?.cv) {
        setCandidate(res.data.cv);
        const m = res.data.cv.adminSupplementMarks;
        setSupplementMarks(Array.isArray(m) ? m : []);
        alert(lbl('supplementSent'));
      } else {
        alert(res.message || lbl('supplementSendError'));
      }
    } catch (err) {
      alert(err?.message || lbl('supplementSendError'));
    } finally {
      setSupplementSending(false);
    }
  };

  const isSuperAdmin = isAdmin && adminProfile?.role === 1;
  const isBackOfficeAdmin = isAdmin && !isSuperAdmin;
  const candidateAssignedAdminId = candidate?.admin?.id ?? candidate?.adminId ?? candidate?.admin_id ?? null;
  const currentAdminId = adminProfile?.id ?? adminProfile?.adminId ?? adminProfile?.admin_id ?? null;
  const canBackOfficeEdit =
    isAdmin &&
    !isSuperAdmin &&
    currentAdminId != null &&
    candidateAssignedAdminId != null &&
    String(candidateAssignedAdminId) === String(currentAdminId);
  const showDelete = isAdmin && isSuperAdmin;
  const showEdit = isApplicant || (isAdmin ? isSuperAdmin || canBackOfficeEdit : true);
  const ctvRankPercent = ctvProfile?.rankLevel?.percent ? parseFloat(ctvProfile.rankLevel.percent) : 0;
  const ctvRankMultiplier = !isAdmin && !isApplicant && ctvRankPercent > 0 ? ctvRankPercent / 100 : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2563eb' }} />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="rounded-lg border p-8 text-center" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <p className="text-sm" style={{ color: '#dc2626' }}>{error || lbl('candidateNotFound')}</p>
        <button
          onClick={() => navigate(isApplicant ? embeddedPrefix : backPath)}
          onMouseEnter={() => setHoveredBackToListButton(true)}
          onMouseLeave={() => setHoveredBackToListButton(false)}
          className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold"
          style={{
            backgroundColor: hoveredBackToListButton ? '#1d4ed8' : '#2563eb',
            color: 'white',
          }}
        >
          {t.backToCandidatesShort || lbl('backToList')}
        </button>
      </div>
    );
  }

  const toArray = (v) => {
    if (v == null || v === '') return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try {
        const p = JSON.parse(v);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  const formatPeriod = (start, end) => {
    const from = start || '';
    const to = end || '';
    if (from && to) return `${from} - ${to}`;
    return from || to || '—';
  };

  const normalizeEducations = (raw) => {
    const list = toArray(raw);
    return list
      .map((edu) => {
        const content = edu?.content || [edu?.school_name, edu?.major].filter(Boolean).join(' - ') || '—';
        const period = formatPeriod(
          edu?.start_date || (edu?.year && edu?.month ? `${edu.year}/${edu.month}` : edu?.year || ''),
          edu?.end_date || (edu?.endYear && edu?.endMonth ? `${edu.endYear}/${edu.endMonth}` : edu?.endYear || '')
        );
        return { content, period };
      })
      .filter((edu) => edu.content !== '—' || edu.period !== '—');
  };

  const normalizeWorkExperiences = (raw) => {
    let list = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed;
        } else if (parsed && typeof parsed === 'object') {
          list = parsed.rirekisho_work_history || parsed.shokumu_job_history || [];
        }
      } catch {
        list = [];
      }
    } else if (raw && typeof raw === 'object') {
      list = raw.rirekisho_work_history || raw.shokumu_job_history || [];
    }

    return (Array.isArray(list) ? list : [])
      .map((work) => ({
        company_name: work?.company_name || work?.companyName || '—',
        period: work?.period || formatPeriod(work?.start_date, work?.end_date),
        description: work?.description || work?.department_role || work?.business_purpose || work?.scale_role || '—',
        projects: Array.isArray(work?.projects)
          ? work.projects
              .map((project) => ({
                project_name: project?.project_name || project?.name || '—',
                role: project?.role || project?.project_role || '—',
                description: project?.description || project?.responsibilities || '—',
                tools_tech: Array.isArray(project?.tools)
                  ? project.tools.filter(Boolean).join(', ')
                  : (project?.tools_tech || project?.tools || '—'),
                team_size: project?.team_size || project?.team || '—',
                period: project?.period || formatPeriod(
                  project?.start_date || (project?.startYear && project?.startMonth ? `${project.startYear}/${project.startMonth}` : ''),
                  project?.end_date || (project?.endYear && project?.endMonth ? `${project.endYear}/${project.endMonth}` : '')
                ),
              }))
          : [],
      }))
      .filter((work) => work.company_name !== '—' || work.period !== '—' || work.description !== '—' || (work.projects || []).length > 0);
  };

  const educations = normalizeEducations(candidate.educations);
  const workExperiences = normalizeWorkExperiences(candidate.workExperiences);
  const certificates = toArray(candidate.certificates);

  const desireCurrentSal = candidate.currentSalary || (candidate.currentIncome != null ? `${candidate.currentIncome}万円` : '—');
  const desireDesiredSal = candidate.desiredSalary || (candidate.desiredIncome != null ? `${candidate.desiredIncome}万円` : '—');
  const locLabel = t.desiredWorkLocation || t.desiredLocation || lbl('desiredLocation');
  const desireLoc = candidate.desiredWorkLocation || candidate.desiredLocation || '—';
  const desireStart = candidate.nyushaTime || candidate.desiredStartDate || '—';

  const cvStorageStyle = getCvDisplayStatusStyle(candidate);
  const cvStorageLabel = getCvDisplayStatusLabel(candidate, language);
  const showPromotedInactiveBadge = isCvPromotedInactive(candidate);
  const quickEditInitialCandidate = candidate ? {
    nameKanji: candidate.name || candidate.fullName || '',
    birthDate: candidate.birthDate || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    jlptLevel: candidate.jpLevel || candidate.japaneseLevel || candidate.n5Level || candidate.languageLevelJp || candidate.jlptLevel || '',
    experienceYears: candidate.experienceYears || candidate.yearsOfExperience || candidate.experienceYear || candidate.workExperienceYears || '',
    jobCategoryId: candidate.jobCategoryId || candidate.job_category_id || candidate.jobCategory?.id || '',
    jobCategoryLabel: candidate.jobCategoryName || candidate.jobCategory?.name || candidate.job_category_name || candidate.categoryName || '',
    currentSalary: candidate.currentSalary || candidate.currentIncome || '',
    desiredSalary: candidate.desiredSalary || candidate.desiredIncome || '',
    desiredPosition: candidate.desiredPosition || candidate.desiredWorkLocation || candidate.desiredLocation || '',
    desiredLocation: candidate.desiredLocation || candidate.desiredWorkLocation || '',
    desiredStartDate: candidate.desiredStartDate || candidate.nyushaTime || '',
    jpResidenceStatus: candidate.jpResidenceStatus || candidate.jp_residence_status || candidate.residenceStatus || candidate.residence_status || candidate.visaStatus || '',
    workExperiences: Array.isArray(candidate.workExperiences)
      ? candidate.workExperiences
      : [],
  } : null;
  const adminDuplicateRef = isAdmin ? formatDuplicateWithCvRef(candidate) : null;

  const headingEducation = t.education || lbl('education');
  const headingWork = t.workExperience || lbl('workExp');
  const headingIntro = t.introduction || lbl('introduction');
  const headingDesires = t.desires || lbl('desires');

  const hasMatchingRequiredInfo = candidateNeedsAiMatchingWarning ? !candidateNeedsAiMatchingWarning : false;

  const cardStyle = { backgroundColor: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' };

  return (
    <>
      <QuickCreateCandidateDrawer
        open={quickEditOpen}
        onClose={closeQuickEditDrawer}
        jobId={null}
        candidateId={candidate?.id || null}
        initialCandidate={quickEditInitialCandidate}
        initialCvFile={quickEditInitialCvFile}
        mode="edit"
        onUpdated={() => {
          closeQuickEditDrawer();
          loadCandidateDetail();
        }}
      />
      <div
        className={`w-full min-w-0 max-w-full overflow-x-hidden ${isApplicant ? 'min-h-0' : 'min-h-screen pb-20 sm:pb-16 lg:pb-0'} px-2 sm:px-3 lg:px-0`}
      >
      {/* Row 1 — 3 card: mobile xếp dọc; md+ 3 cột */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:gap-4 md:grid-cols-3">
        <div className="relative rounded-xl p-4 text-center sm:p-5 md:p-6" style={cardStyle}>
          {(showEdit || showDelete) && (
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {showEdit && (
                <button
                  type="button"
                  onClick={() => (isApplicant && typeof onEditProfile === 'function' ? onEditProfile() : navigate(editPath))}
                  className="w-8 h-8 flex items-center justify-center rounded-full border text-gray-500 hover:text-blue-600 hover:border-blue-200 bg-white/90 shadow-sm transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {showDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-8 h-8 flex items-center justify-center rounded-full border text-gray-500 hover:text-red-600 hover:border-red-200 bg-white/90 shadow-sm transition-colors disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <div
            className="group relative mx-auto mb-3 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full text-xl font-bold sm:h-20 sm:w-20 sm:text-2xl"
            style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}
            onClick={toggleMissingInfoPopup}
            role="button"
            tabIndex={0}
            aria-label={t.candidateMissingInfoTooltip || 'Hồ sơ thiếu thông tin để AI matching job'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMissingInfoPopup();
              }
            }}
          >
            {(candidate.name || candidate.fullName || 'U').charAt(0).toUpperCase()}
            {candidateNeedsAiMatchingWarning && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMissingInfoPopup();
                  }}
                  className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 shadow-[0_0_0_2px_white] animate-pulse outline-none transition-transform hover:scale-110 focus:scale-110"
                  aria-label={t.candidateMissingInfoTooltip || 'Hồ sơ thiếu thông tin để AI matching job'}
                />
                {showMissingInfoPopup && (
                  <div
                    role="dialog"
                    aria-modal="false"
                    className="absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 rounded-lg border border-red-200 bg-white p-3 text-left text-xs text-slate-700 shadow-xl"
                  >
                    <div className="mb-1 font-semibold text-red-600">
                      {t.candidateMissingInfoTooltip || 'Hồ sơ thiếu thông tin để AI matching job'}
                    </div>
                    <ul className="list-disc space-y-1 pl-4">
                      {missingAiMatchingFields.map((field) => (
                        <li key={field.key}>{field.label}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={openQuickEditDrawer}
                      className="mt-3 inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      {t.supplementInfoNow || 'Bổ sung ngay'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <p className="break-words px-1 text-sm font-bold sm:text-base" style={{ color: '#111827' }}>{candidate.name || candidate.fullName || '—'}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 px-1">
            <span
              className="inline-flex max-w-full rounded-lg px-2 py-1 text-[10px] font-semibold sm:text-xs"
              style={{
                backgroundColor: cvStorageStyle.bg,
                color: cvStorageStyle.color,
                border: `1px solid ${cvStorageStyle.border}`,
              }}
            >
              {cvStorageLabel}
            </span>
            {showPromotedInactiveBadge && (
              <span
                className="inline-flex max-w-full rounded-lg px-2 py-1 text-[10px] font-semibold sm:text-xs"
                style={{
                  backgroundColor: '#fffbeb',
                  color: '#b45309',
                  border: '1px solid #fcd34d',
                }}
              >
                {t.cvPromotedInactiveShort || lbl('cvPromotedInactiveShort')}
              </span>
            )}
          </div>
          {!isApplicant && (
            <div
              className="mx-auto mt-2 w-full max-w-md rounded-lg border px-2 py-1.5 text-left text-[10px] leading-snug sm:text-xs"
              style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb', color: '#374151' }}
            >
              <div className="mb-1 flex items-center gap-1 font-semibold" style={{ color: '#111827' }}>
                <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: '#6b7280' }} />
                {t.candidateProfileOwnership || lbl('candidateProfileOwnership')}
              </div>
              <div className="space-y-0.5">
                <div>
                  <span className="font-medium" style={{ color: '#6b7280' }}>
                    {t.colCtvName || lbl('collaborator')}:{' '}
                  </span>
                  {candidate.collaborator ? (
                    isAdmin ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/collaborators/${candidate.collaborator.id}`)}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {candidate.collaborator.name ||
                          candidate.collaborator.code ||
                          candidate.collaborator.id}
                      </button>
                    ) : (
                      <span style={{ color: '#111827' }}>
                        {candidate.collaborator.name ||
                          candidate.collaborator.code ||
                          candidate.collaborator.id}
                      </span>
                    )
                  ) : (
                    <span style={{ color: '#9ca3af' }}>—</span>
                  )}
                </div>
                <div>
                  <span className="font-medium" style={{ color: '#6b7280' }}>
                    {t.colAdminName}:{' '}
                  </span>
                  <span style={{ color: '#111827' }}>{candidate.admin?.name || '—'}</span>
                </div>
                {isAdmin && canBackOfficeEdit && candidateAssignedAdminId != null && (
                  <div>
                    <span className="font-medium" style={{ color: '#6b7280' }}>
                      Admin phụ trách:{' '}
                    </span>
                    <span style={{ color: '#111827' }}>{candidate.admin?.name || '—'}</span>
                  </div>
                )}
                {candidate.applicant && (
                  <div>
                    <span className="font-medium" style={{ color: '#6b7280' }}>
                      {t.colApplicant}:{' '}
                    </span>
                    <span style={{ color: '#111827' }}>
                      {candidate.applicant.name || candidate.applicant.email || '—'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          {adminDuplicateRef && (
            <div
              className="mx-auto mt-2 max-w-md rounded-lg border px-2 py-1.5 text-left text-[10px] leading-snug sm:text-xs"
              style={{ borderColor: '#fcd34d', backgroundColor: '#fffbeb', color: '#92400e' }}
            >
              <div className="mb-0.5 font-medium">
                {t.candidateDuplicateWithCvDetail || lbl('duplicateWithCvIdDetail')}
              </div>
              <button
                type="button"
                onClick={() => navigate(`/admin/candidates/${adminDuplicateRef.dupId}`)}
                className="block w-full text-left font-semibold underline"
                style={{ color: '#1d4ed8' }}
                title={adminDuplicateRef.tooltip}
              >
                {adminDuplicateRef.profileLabel}
              </button>
            </div>
          )}
          <a href={`tel:${candidate.phone || ''}`} className="mt-1 block break-all px-1 text-xs sm:text-sm" style={{ color: '#2563eb' }}>{candidate.phone || '—'}</a>
          <p className="mt-0.5 break-all px-1 text-xs sm:text-sm" style={{ color: '#6b7280' }}>{candidate.email || '—'}</p>
        </div>
        <div className="rounded-xl p-4 sm:p-5" style={cardStyle}>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-bold sm:text-sm" style={{ color: '#111827' }}>
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#2563eb' }} />
            {t.personalInformation || lbl('personalInfo')}
          </h2>
          <div className="space-y-2 text-xs sm:text-sm">
            <div><span className="font-medium" style={{ color: '#6b7280' }}>{t.birthDate || lbl('birthDate')}: </span><span style={{ color: '#111827' }}>{formatDate(candidate.birthDate)}</span></div>
            <div className="break-words"><span className="font-medium" style={{ color: '#6b7280' }}>{t.address || lbl('address')}: </span><span style={{ color: '#111827' }}>{candidate.addressCurrent || candidate.address || '—'}</span></div>
            <div><span className="font-medium" style={{ color: '#6b7280' }}>{t.receiveDate || lbl('receiveDate')}: </span><span style={{ color: '#111827' }}>{formatDate(candidate.receiveDate || candidate.createdAt)}</span></div>
          </div>
        </div>
        <div className="rounded-xl p-4 sm:p-5" style={cardStyle}>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-bold sm:text-sm" style={{ color: '#111827' }}>
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#2563eb' }} />
            {t.skillsAndCertificates || lbl('skillsCerts')} &amp; {t.desires || lbl('desires')}
          </h2>
          <div className="space-y-2 text-xs sm:text-sm">
            <div><span className="font-medium" style={{ color: '#6b7280' }}>{t.technicalSkills || lbl('technicalSkills')}: </span><span className="line-clamp-2" style={{ color: '#111827' }}>{candidate.technicalSkills || '—'}</span></div>
            <div><span className="font-medium" style={{ color: '#6b7280' }}>{t.certificates || lbl('certificates')}: </span><span style={{ color: '#111827' }}>{certificates.length ? certificates.map((c) => c.name || '—').join(', ') : '—'}</span></div>
            <div><span className="font-medium" style={{ color: '#6b7280' }}>{t.desiredSalary || lbl('desiredSalary')}: </span><span style={{ color: '#111827' }}>{candidate.desiredSalary || (candidate.desiredIncome != null ? `${candidate.desiredIncome}万円` : '—')}</span></div>
            <div><span className="font-medium" style={{ color: '#6b7280' }}>{t.desiredPosition || lbl('desiredPosition')}: </span><span style={{ color: '#111827' }}>{candidate.desiredPosition || '—'}</span></div>
          </div>
        </div>
      </div>

      {/* Row 2 — Trái: Tabs + nội dung (Chi tiết / AI / Lịch sử). Phải: Files + Notes */}
      <div className={`grid min-w-0 grid-cols-1 gap-4 sm:gap-6 ${isApplicant ? '' : 'lg:grid-cols-[1fr,340px]'}`}>
        {/* Trái: Card có tabs (Chi tiết hồ sơ | Gợi ý AI | Lịch sử chỉnh sửa) + nội dung bên dưới */}
        <div className="min-w-0 overflow-hidden rounded-xl" style={cardStyle}>
          <div className="flex min-w-0 overflow-x-auto overscroll-x-contain border-b" style={{ borderColor: '#e5e7eb' }}>
            <button
              type="button"
              onClick={() => setActiveTab('detail')}
              className="flex-shrink-0 whitespace-nowrap px-2 py-2.5 text-[11px] font-semibold transition-colors sm:flex-1 sm:px-3 sm:py-3 sm:text-xs"
              style={{ color: activeTab === 'detail' ? '#2563eb' : '#6b7280', borderBottom: activeTab === 'detail' ? '2px solid #2563eb' : '2px solid transparent' }}
            >
              {t.candidateDetail || lbl('detailTab')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('matching')}
              className="flex-shrink-0 whitespace-nowrap px-2 py-2.5 text-[11px] font-semibold transition-colors sm:flex-1 sm:px-3 sm:py-3 sm:text-xs"
              style={{ color: activeTab === 'matching' ? '#2563eb' : '#6b7280', borderBottom: activeTab === 'matching' ? '2px solid #2563eb' : '2px solid transparent' }}
            >
              {lbl('matchingTitle')}
            </button>
            {isApplicant && (
              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className="flex-shrink-0 whitespace-nowrap px-2 py-2.5 text-[11px] font-semibold transition-colors sm:flex-1 sm:px-3 sm:py-3 sm:text-xs"
                style={{
                  color: activeTab === 'files' ? '#2563eb' : '#6b7280',
                  borderBottom: activeTab === 'files' ? '2px solid #2563eb' : '2px solid transparent',
                }}
              >
                {lbl('filesTab')}
              </button>
            )}
            {!isApplicant && (
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="flex-shrink-0 whitespace-nowrap px-2 py-2.5 text-[11px] font-semibold transition-colors sm:flex-1 sm:px-3 sm:py-3 sm:text-xs"
                style={{ color: activeTab === 'history' ? '#2563eb' : '#6b7280', borderBottom: activeTab === 'history' ? '2px solid #2563eb' : '2px solid transparent' }}
              >
                {lbl('historyTab')} ({snapshots.length})
              </button>
            )}
          </div>
          {activeTab === 'detail' && (
            <div className="max-h-none space-y-4 overflow-y-visible p-3 sm:space-y-5 sm:p-5 lg:max-h-[60vh] lg:overflow-y-auto">
              {isAdmin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={supplementSending || supplementMarks.length === 0}
                    onClick={handleSendSupplementRequest}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ backgroundColor: '#2563eb', color: 'white' }}
                  >
                    {supplementSending ? '…' : lbl('sendSupplementRequest')}
                  </button>
                </div>
              )}
              <section>
                <h3 className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: '#374151' }}>
                  <GraduationCap className="w-3.5 h-3.5 shrink-0" style={{ color: '#2563eb' }} aria-hidden />
                  <SupplementFieldWrap
                    fieldKey="heading-education"
                    onContextMenu={(e) => handleSupplementFieldContextMenu(e, 'heading-education')}
                    className="select-text inline min-w-0"
                  >
                    <SupplementMarkedText text={headingEducation} fieldKey="heading-education" allMarks={supplementMarks} />
                  </SupplementFieldWrap>
                </h3>
                {educations.length === 0 ? <p className="text-sm" style={{ color: '#6b7280' }}>{t.noEducationInfo || lbl('noEducation')}</p> : (
                  <ul className="space-y-1.5 text-sm">
                    {educations.map((edu, i) => {
                      const line = `${edu.period} — ${edu.content || '—'}`;
                      const fk = `education-${i}`;
                      return (
                        <li key={i} className="pl-3 border-l-2" style={{ borderColor: '#e5e7eb', color: '#111827' }}>
                          <SupplementFieldWrap
                            fieldKey={fk}
                            onContextMenu={(e) => handleSupplementFieldContextMenu(e, fk)}
                            className="select-text"
                          >
                            <SupplementMarkedText text={line} fieldKey={fk} allMarks={supplementMarks} />
                          </SupplementFieldWrap>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: '#374151' }}>
                  <Briefcase className="w-3.5 h-3.5 shrink-0" style={{ color: '#2563eb' }} aria-hidden />
                  <SupplementFieldWrap
                    fieldKey="heading-work"
                    onContextMenu={(e) => handleSupplementFieldContextMenu(e, 'heading-work')}
                    className="select-text inline min-w-0"
                  >
                    <SupplementMarkedText text={headingWork} fieldKey="heading-work" allMarks={supplementMarks} />
                  </SupplementFieldWrap>
                </h3>
                {workExperiences.length === 0 ? <p className="text-sm" style={{ color: '#6b7280' }}>{t.noWorkExperienceInfo || lbl('noWorkExp')}</p> : (
                  <ul className="space-y-2 text-sm">
                    {workExperiences.map((work, i) => {
                      const block = `${work.company_name || '—'} · ${work.period || '—'}\n${work.description || '—'}`;
                      const fk = `work-${i}`;
                      return (
                        <li key={i} className="rounded-lg border p-3" style={{ borderColor: '#e5e7eb' }}>
                          <SupplementFieldWrap
                            fieldKey={fk}
                            onContextMenu={(e) => handleSupplementFieldContextMenu(e, fk)}
                            className="select-text whitespace-pre-wrap break-words text-sm"
                          >
                            <SupplementMarkedText text={block} fieldKey={fk} allMarks={supplementMarks} />
                          </SupplementFieldWrap>
                          {Array.isArray(work.projects) && work.projects.length > 0 && (
                            <div className="mt-2 space-y-2 rounded-md border bg-white p-2" style={{ borderColor: '#e5e7eb' }}>
                              <div className="text-[10px] font-semibold uppercase" style={{ color: '#6b7280' }}>
                                {t.projects || 'Dự án'}
                              </div>
                              <div className="space-y-2">
                                {work.projects.map((project, pIndex) => {
                                  const projectBlock = [
                                    project.project_name,
                                    project.role,
                                    project.period,
                                    project.team_size,
                                    project.tools_tech,
                                    project.description,
                                  ].filter(Boolean).join(' · ');
                                  return (
                                    <div key={`${fk}-project-${pIndex}`} className="rounded border p-2 text-xs" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                                      <div className="font-semibold text-gray-800">
                                        {project.project_name || '—'}
                                      </div>
                                      <div className="mt-1 whitespace-pre-wrap break-words text-gray-600">
                                        {projectBlock || '—'}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: '#374151' }}>
                  <UserCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#2563eb' }} aria-hidden />
                  <SupplementFieldWrap
                    fieldKey="heading-introduction"
                    onContextMenu={(e) => handleSupplementFieldContextMenu(e, 'heading-introduction')}
                    className="select-text inline min-w-0"
                  >
                    <SupplementMarkedText text={headingIntro} fieldKey="heading-introduction" allMarks={supplementMarks} />
                  </SupplementFieldWrap>
                </h3>
                <SupplementFieldWrap fieldKey="careerSummary" onContextMenu={(e) => handleSupplementFieldContextMenu(e, 'careerSummary')} className="select-text whitespace-pre-wrap break-words text-sm" style={{ color: '#111827' }}>
                  <SupplementMarkedText text={candidate.careerSummary || '—'} fieldKey="careerSummary" allMarks={supplementMarks} />
                </SupplementFieldWrap>
                <SupplementFieldWrap fieldKey="strengths" onContextMenu={(e) => handleSupplementFieldContextMenu(e, 'strengths')} className="mt-2 select-text whitespace-pre-wrap break-words text-sm" style={{ color: '#111827' }}>
                  <SupplementMarkedText text={candidate.strengths || '—'} fieldKey="strengths" allMarks={supplementMarks} />
                </SupplementFieldWrap>
                <SupplementFieldWrap fieldKey="motivation" onContextMenu={(e) => handleSupplementFieldContextMenu(e, 'motivation')} className="mt-2 select-text whitespace-pre-wrap break-words text-sm" style={{ color: '#111827' }}>
                  <SupplementMarkedText text={candidate.motivation || '—'} fieldKey="motivation" allMarks={supplementMarks} />
                </SupplementFieldWrap>
              </section>
              <section>
                <h3 className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: '#374151' }}>
                  <DollarSign className="w-3.5 h-3.5 shrink-0" style={{ color: '#2563eb' }} aria-hidden />
                  <SupplementFieldWrap
                    fieldKey="heading-desires"
                    onContextMenu={(e) => handleSupplementFieldContextMenu(e, 'heading-desires')}
                    className="select-text inline min-w-0"
                  >
                    <SupplementMarkedText text={headingDesires} fieldKey="heading-desires" allMarks={supplementMarks} />
                  </SupplementFieldWrap>
                </h3>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                  <SupplementFieldWrap fieldKey="desire-currentSalary" onContextMenu={(e) => handleSupplementFieldContextMenu(e, 'desire-currentSalary')} className="select-text" style={{ color: '#111827' }}>
                    <SupplementMarkedText
                      text={`${t.currentSalary || lbl('currentSalary')}: ${desireCurrentSal}`}
                      fieldKey="desire-currentSalary"
                      allMarks={supplementMarks}
                    />
                  </SupplementFieldWrap>
                  <SupplementFieldWrap fieldKey="desire-desiredSalary" onContextMenu={(e) => handleSupplementFieldContextMenu(e, 'desire-desiredSalary')} className="select-text" style={{ color: '#111827' }}>
                    <SupplementMarkedText
                      text={`${t.desiredSalary || lbl('desiredSalary')}: ${desireDesiredSal}`}
                      fieldKey="desire-desiredSalary"
                      allMarks={supplementMarks}
                    />
                  </SupplementFieldWrap>
                  <SupplementFieldWrap fieldKey="desire-position" onContextMenu={(e) => handleSupplementFieldContextMenu(e, 'desire-position')} className="select-text" style={{ color: '#111827' }}>
                    <SupplementMarkedText
                      text={`${t.desiredPosition || lbl('desiredPosition')}: ${candidate.desiredPosition || '—'}`}
                      fieldKey="desire-position"
                      allMarks={supplementMarks}
                    />
                  </SupplementFieldWrap>
                  <SupplementFieldWrap fieldKey="desire-location" onContextMenu={(e) => handleSupplementFieldContextMenu(e, 'desire-location')} className="select-text" style={{ color: '#111827' }}>
                    <SupplementMarkedText
                      text={`${locLabel}: ${desireLoc}`}
                      fieldKey="desire-location"
                      allMarks={supplementMarks}
                    />
                  </SupplementFieldWrap>
                  <SupplementFieldWrap fieldKey="desire-start" onContextMenu={(e) => handleSupplementFieldContextMenu(e, 'desire-start')} className="select-text sm:col-span-2" style={{ color: '#111827' }}>
                    <SupplementMarkedText
                      text={`${t.desiredStartDate || lbl('desiredStartDate')}: ${desireStart}`}
                      fieldKey="desire-start"
                      allMarks={supplementMarks}
                    />
                  </SupplementFieldWrap>
                </div>
              </section>
            </div>
          )}
          {activeTab === 'history' && (
            <div className="max-h-none space-y-2 overflow-y-visible p-3 sm:p-4 lg:max-h-[60vh] lg:overflow-y-auto">
              {historyLoading && <p className="text-xs py-2" style={{ color: '#6b7280' }}>{lbl('historyLoading')}</p>}
              {!historyLoading && snapshots.length === 0 && <p className="text-xs py-2" style={{ color: '#6b7280' }}>{lbl('noSnapshot')}</p>}
              {snapshots.map((snap) => {
                const dt = snap.dateTime;
                const isOpen = !!openSnapshots[dt];
                const originals = snap.originals || [];
                const templates = snap.templates || {};
                const tplOrder = ['Common', 'IT', 'Technical'];
                return (
                  <div key={dt} className="rounded-lg border overflow-hidden" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                    <div className="flex flex-col gap-2 px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-3">
                      <button type="button" onClick={() => toggleSnapshot(dt)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <ChevronRight className="h-4 w-4 shrink-0 transition-transform" style={{ color: '#6b7280', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                        <span className="truncate text-xs font-medium" style={{ color: '#374151' }}>{formatSnapshotLabel(dt)}</span>
                        <span className="shrink-0 text-[10px]" style={{ color: '#9ca3af' }}>({originals.length})</span>
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleRollbackSnapshot(dt); }} disabled={!!rollbackingDateTime} className="flex shrink-0 items-center justify-center gap-1 self-start rounded px-2 py-1 text-[10px] font-semibold sm:self-auto" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
                        {rollbackingDateTime === dt ? <span className="animate-spin inline-block w-3 h-3 border border-amber-600 border-t-transparent rounded-full" /> : <RotateCcw className="w-3 h-3" />}
                        Rollback
                      </button>
                    </div>
                    {isOpen && (
                      <div className="px-3 pb-3 pt-0 space-y-2">
                        {originals.map((f, idx) => (
                          <div key={`orig-${idx}`} className="flex items-center gap-2 text-xs py-1">
                            <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: '#6b7280' }} />
                            <span className="truncate" style={{ color: '#374151' }}>{f.name}</span>
                            {f.downloadUrl && <button type="button" onClick={() => openRemoteFileDownloadUrl(f.downloadUrl)} className="shrink-0"><Download className="w-3.5 h-3.5" style={{ color: '#2563eb' }} /></button>}
                          </div>
                        ))}
                        {tplOrder.map((tpl) => {
                          const folderKey = `CV_Template/${tpl}`;
                          const isTplOpen = !!openSnapshotFolders[`${dt}::${folderKey}`];
                          const has = templates?.[tpl]?.rirekisho || templates?.[tpl]?.shokumu;
                          if (!has) return null;
                          return (
                            <div key={folderKey}>
                              <button type="button" onClick={() => toggleSnapshotFolder(dt, folderKey)} className="flex items-center gap-2 w-full text-left py-1 text-xs font-medium" style={{ color: '#374151' }}>
                                <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: isTplOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                                {tpl}
                              </button>
                              {isTplOpen && (
                                <div className="pl-4 space-y-1">
                                  {['rirekisho', 'shokumu'].map((doc) => templates?.[tpl]?.[doc]?.downloadUrl && (
                                    <button key={doc} type="button" onClick={() => openRemoteFileDownloadUrl(templates[tpl][doc].downloadUrl)} className="flex items-center gap-2 text-xs py-0.5" style={{ color: '#2563eb' }}>
                                      <FileText className="w-3 h-3" /> {templates[tpl][doc].fileName || `${doc}.pdf`}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {activeTab === 'matching' && (
            <div className="max-h-none overflow-y-visible p-3 sm:p-5 lg:max-h-[60vh] lg:overflow-y-auto">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#111827' }}>
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#2563eb' }} />
                {lbl('matchingTitle')}
              </h2>
              {!isAdmin && !isApplicant && (
                <p className="text-xs mb-3" style={{ color: '#6b7280' }}>{lbl('matchingFilteredNote')}</p>
              )}
              {aiMatchLoading && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#6b7280' }}>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  {lbl('matchingLoading')}
                </div>
              )}
              {aiMatchError && !aiMatchLoading && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm" style={{ color: aiMatchError === lbl('matchingComputing') ? '#d97706' : '#dc2626' }}>
                    {aiMatchError === lbl('matchingComputing') && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                    <p>{aiMatchError}</p>
                  </div>
                  {shouldShowAiCompletionActions && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleUpdateWithAi}
                        className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
                        style={{ backgroundColor: '#2563eb' }}
                      >
                        {lbl('matchingUpdateWithAi')}
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdateManual}
                        className="rounded-lg border px-4 py-2 text-xs font-semibold"
                        style={{ borderColor: '#d1d5db', color: '#374151', backgroundColor: 'white' }}
                      >
                        {lbl('matchingUpdateManual')}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!aiMatchLoading && !aiMatchError && aiMatches.length === 0 && (
                <p className="text-sm" style={{ color: '#6b7280' }}>{lbl('matchingEmpty')}</p>
              )}
              {!aiMatchLoading && !aiMatchError && aiMatches.length > 0 && (
                <div className="space-y-3">
                  {aiMatches.map((row) => {
                    const jid = Number(row.id);
                    const key = String(jid);
                    const meta = row.metadata || {};
                    const detailJob = aiJobDetails[jid];
                    const tags = getMatchCardTags(detailJob);
                    const skills = parseCoreSkillsRaw(meta.core_skills_raw || meta.coreSkillsRaw || meta.skills_raw);
                    const title = aiJobTitles[jid] || meta.title || meta.job_title || `#${jid}`;
                    const expanded = expandedAiJobId === key;
                    const rawScore = Number(row.similarity_score ?? row.score ?? 0);
                    const scorePercent = Math.max(0, Math.min(100, rawScore <= 1 ? rawScore * 100 : rawScore));
                    const categoryText = meta.category_name || meta.category || meta.job_category || meta.jobCategoryName || '';
                    const companyText = meta.company_name || meta.recruiting_company || meta.company || meta.recruitingCompanyName || '';
                    const locationText = meta.work_location || meta.working_location || meta.location || meta.workingLocation || '';
                    const reasoning = row.reasoning || {};
                    const aiReasonText = pickByLanguage(reasoning.vi, reasoning.en, reasoning.jp) || getAiReasoningText(row) || row.reason || row.matching_reason || '—';
                    const info = getQuickJobInfo(detailJob, meta);
                    const commissionText = getSimpleCommissionText(detailJob, meta);
                    const hasCommission = String(commissionText || '').trim().length > 0;
                    const commissionLabel = !isAdmin && !isApplicant
                      ? 'Phí nhận được'
                      : 'Phí giới thiệu dự kiến của bạn';
                    const commissionDisplayText = (() => {
                      const normalized = String(commissionText || '').trim();
                      if (!normalized) return commissionText;
                      if (!isAdmin && !isApplicant) {
                        const percentMatch = normalized.match(/([\d.,]+)\s*%/);
                        if (percentMatch) {
                          const pct = parseFloat(String(percentMatch[1]).replace(/,/g, '')) || 0;
                          if (pct > 0) {
                            const received = pct * ctvRankMultiplier;
                            const formatted = Number.isInteger(received)
                              ? received.toLocaleString('vi-VN')
                              : received.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
                            return `${formatted}% thu nhập năm`;
                          }
                        }
                      }
                      return normalized;
                    })();
                    const updatedAt = detailJob?.updatedAt ? formatDate(detailJob.updatedAt) : '';
                    const publishedAt = detailJob?.publishedAt ? formatDate(detailJob.publishedAt) : '';
                    return (
                      <div key={key} className="flex min-h-0 flex-col rounded-lg border p-3 transition-all duration-200 lg:min-h-[300px]" style={{ backgroundColor: 'white', borderColor: '#e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
                          <div className="flex-1 flex flex-col min-w-0 space-y-2">
                            <div className="space-y-1.5 pb-2 border-b flex-shrink-0" style={{ borderColor: '#f3f4f6' }}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[11px] font-medium" style={{ color: '#6b7280' }}>
                                  ID: <span style={{ color: '#374151' }}>{jid}</span>
                                </div>
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                                  style={scorePercent < 60
                                    ? { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
                                    : scorePercent <= 80
                                      ? { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fdba74' }
                                      : { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' }}
                                >
                                  {Math.round(scorePercent)}%
                                </span>
                              </div>
                              {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {tags.map((tag, index) => (
                                    <span key={`${key}-tag-${index}`} className="px-2 py-0.5 rounded-full text-[10px] font-medium border" style={getTagInlineStyle(tag.color)}>
                                      {tag.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <h3 className="text-sm font-bold leading-tight line-clamp-2 pr-1" style={{ color: '#2563eb' }}>{title}</h3>
                              {categoryText && (
                                <div className="text-[11px] line-clamp-1" style={{ color: '#374151' }}>
                                  <span className="font-semibold" style={{ color: '#4b5563' }}>Phân loại:</span>
                                  <span className="ml-1">{categoryText || '—'}</span>
                                </div>
                              )}
                              {companyText && (
                                <div className="flex items-start gap-1">
                                  <Building2 className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#6b7280' }} />
                                  <div className="text-[11px] line-clamp-1" style={{ color: '#374151' }}>
                                    <span className="font-semibold" style={{ color: '#4b5563' }}>Công ty:</span>
                                    <span className="ml-1">{companyText}</span>
                                  </div>
                                </div>
                              )}
                              {(locationText || info.location) && (
                                <div className="flex items-start gap-1">
                                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#6b7280' }} />
                                  <div className="text-[11px] line-clamp-1" style={{ color: '#374151' }}>
                                    <span className="font-semibold" style={{ color: '#4b5563' }}>Địa điểm:</span>
                                    <span className="ml-1">{locationText || info.location}</span>
                                  </div>
                                </div>
                              )}
                              {aiReasonText && aiReasonText !== '—' && (
                                <div className="rounded-md border px-2 py-1 text-[11px] leading-snug" style={{ borderColor: '#e5e7eb', backgroundColor: '#f8fafc', color: '#374151' }}>
                                  <span className="font-semibold" style={{ color: '#4b5563' }}>Lý do:</span>
                                  <span className="ml-1 whitespace-pre-wrap">{aiReasonText}</span>
                                </div>
                              )}
                            </div>

                            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                              {info.description ? (
                                <div className="flex max-h-[200px] min-h-[72px] flex-col overflow-hidden rounded-md border sm:h-[120px] sm:max-h-none" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                                  <div className="flex-shrink-0 border-b px-2 py-1 text-[10px] font-semibold" style={{ borderColor: '#e5e7eb', color: '#374151' }}>Nội dung công việc</div>
                                  <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5 text-[11px] leading-snug whitespace-pre-line break-words" style={{ color: '#374151' }}>{info.description}</div>
                                </div>
                              ) : (
                                <div className="min-h-[72px] flex-shrink-0 rounded-md sm:h-[120px]" style={{ backgroundColor: '#ffffff', border: '1px dashed #e5e7eb' }} />
                              )}
                              {info.applicationConditions.length > 0 ? (
                                <div className="flex max-h-[200px] min-h-[72px] flex-col overflow-hidden rounded-md border sm:h-[120px] sm:max-h-none" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                                  <div className="flex-shrink-0 border-b px-2 py-1 text-[10px] font-semibold" style={{ borderColor: '#e5e7eb', color: '#374151' }}>Điều kiện ứng tuyển</div>
                                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-1.5 text-[11px]" style={{ color: '#374151' }}>
                                    {info.applicationConditions.map((condition, index) => (
                                      <div key={`${key}-cond-${index}`} className="flex items-start gap-1">
                                        <span className="flex-shrink-0 font-bold" style={{ color: '#3b82f6' }}>•</span>
                                        <span className="whitespace-pre-line leading-snug line-clamp-2">{condition}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="min-h-[72px] flex-shrink-0 rounded-md sm:h-[120px]" style={{ backgroundColor: '#ffffff', border: '1px dashed #e5e7eb' }} />
                              )}
                            </div>
                          </div>

                          <div className="flex w-full flex-shrink-0 flex-col gap-2 lg:w-72 xl:w-80">
                            {hasCommission ? (
                              <div className="flex-shrink-0 flex flex-col gap-1.5">
                                <div className="flex rounded-md overflow-hidden shadow-sm border" style={{ borderColor: '#7c3aed' }}>
                                  <div
                                    className="min-w-0 px-2 py-2 text-[10px] font-medium flex items-center justify-center text-center leading-snug whitespace-normal"
                                    style={{ backgroundColor: '#4b4f5a', color: '#ffffff' }}
                                  >
                                    <span className="line-clamp-3">{commissionLabel}</span>
                                  </div>
                                  <div className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 text-[10px] sm:text-[12px] font-bold flex items-center justify-center text-center leading-snug"
                                    style={{ backgroundColor: '#DF2020', color: '#ffffff' }}
                                  >
                                    <span className="break-words">{commissionDisplayText}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-[52px] rounded-md flex-shrink-0" style={{ backgroundColor: '#ffffff', border: '1px dashed #e5e7eb' }} />
                            )}
                            <div className="border rounded-md p-2 flex-1 min-h-0 overflow-y-auto" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
                              <div className="text-[10px] font-bold pb-1 border-b mb-1.5" style={{ color: '#374151', borderColor: '#e5e7eb' }}>Thông tin nhanh</div>
                              <div className="space-y-1.5">
                                {!!info.salary && (
                                  <div className="pb-1.5 border-b" style={{ borderColor: '#e5e7eb' }}>
                                    <div className="text-[9px] font-semibold uppercase text-gray-500">Thu nhập/năm</div>
                                    <div className="text-[11px] font-medium break-words line-clamp-2" style={{ color: '#111827' }}>{info.salary}</div>
                                  </div>
                                )}
                                {!!(locationText || info.location) && (
                                  <div className="pb-1.5 border-b" style={{ borderColor: '#e5e7eb' }}>
                                    <div className="text-[9px] font-semibold uppercase text-gray-500">Nơi làm việc</div>
                                    <div className="text-[11px] font-medium break-words line-clamp-2" style={{ color: '#111827' }}>{locationText || info.location}</div>
                                  </div>
                                )}
                                {meta.desired_position && (
                                  <div className="pb-1.5 border-b" style={{ borderColor: '#e5e7eb' }}>
                                    <div className="text-[9px] font-semibold uppercase text-gray-500">Vị trí</div>
                                    <div className="text-[11px] font-medium break-words line-clamp-2" style={{ color: '#111827' }}>{meta.desired_position}</div>
                                  </div>
                                )}
                                {skills.length > 0 && (
                                  <div className="pb-1.5">
                                    <div className="text-[9px] font-semibold uppercase text-gray-500">Kỹ năng</div>
                                    <div className="text-[11px] font-medium break-words line-clamp-3" style={{ color: '#111827' }}>{skills.join(', ')}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-shrink-0 flex-col items-stretch justify-between gap-2 border-t pt-2 sm:flex-row sm:items-center" style={{ borderColor: '#e5e7eb' }}>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px]" style={{ color: '#6b7280' }}>
                            {updatedAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                Cập nhật: {updatedAt}
                              </span>
                            )}
                            {publishedAt && (
                              <>
                                {updatedAt && <span className="text-gray-300">|</span>}
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 flex-shrink-0" />
                                  Xuất bản: {publishedAt}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex flex-wrap items-stretch justify-end gap-1.5 sm:items-center">
                            {isApplicant ? (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`${embeddedPrefix}/jobs/${jid}/apply`, {
                                    state: { skipApplicantCvSelect: true },
                                  })
                                }
                                className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium"
                                style={{ backgroundColor: '#facc15', color: '#111827' }}
                              >
                                Ứng tuyển
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigate(
                                  isAdmin ? `/admin/jobs/${jid}/nominate` : `/agent/jobs/${jid}/nominate`,
                                  {
                                    state: {
                                      preselectCvId: Number(candidateId),
                                      fromCandidateDetail: true,
                                    },
                                  }
                                )}
                                className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium"
                                style={{ backgroundColor: '#facc15', color: '#111827' }}
                              >
                                Tiến cử ứng viên
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const href = getJobDetailHref(jid);
                                if (!href) return;
                                navigate(href);
                              }}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium border"
                              style={{ borderColor: '#93c5fd', color: '#2563eb' }}
                            >
                              <ExternalLink className="w-3 h-3" />
                              {lbl('matchingOpenJob')}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAiReason(jid, row)}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium"
                              style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                            >
                              {expanded ? lbl('matchingHideReason') : lbl('matchingViewReason')}
                            </button>
                          </div>
                        </div>
                        {expanded && (
                          <div className="mt-2 border-t pt-2 text-xs whitespace-pre-wrap break-words" style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                            <span className="font-semibold">{lbl('matchingReason')}: </span>
                            {aiReasonByJobId[key] || '—'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {activeTab === 'files' && isApplicant && (
            <div className="max-h-none space-y-2 overflow-y-visible p-3 sm:p-4 lg:max-h-[60vh] lg:overflow-y-auto">
              <div className="mb-1 flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: '#e5e7eb' }}>
                <h2 className="flex items-center gap-2 text-sm font-bold" style={{ color: '#111827' }}>
                  <FileText className="h-4 w-4 shrink-0" style={{ color: '#2563eb' }} />
                  {t.cvFile || lbl('cvFile')}
                </h2>
                <button
                  type="button"
                  onClick={() => downloadZip('template', 'all')}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold sm:self-start"
                  style={{ borderColor: '#2563eb', color: '#2563eb', backgroundColor: 'white' }}
                >
                  DOWNLOAD
                </button>
              </div>
              {cvFileList.originals.length > 0 && (
                <div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleFolder('CV_original')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleFolder('CV_original');
                      }
                    }}
                    className="w-full flex items-center justify-between py-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 transition-transform" style={{ transform: openFolders.CV_original ? 'rotate(90deg)' : 'rotate(0deg)', color: '#6b7280' }} />
                      <Folder className="w-4 h-4" style={{ color: '#f59e0b' }} />
                      <span className="text-xs font-semibold" style={{ color: '#374151' }}>CV_original</span>
                      <span className="text-[10px]" style={{ color: '#9ca3af' }}>({cvFileList.originals.length})</span>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); downloadZip('original', 'all'); }} className="text-xs font-semibold" style={{ color: '#2563eb' }}>ZIP</button>
                  </div>
                  {openFolders.CV_original && (
                    <div className="pl-6 pt-1 space-y-1">
                      {cvFileList.originals.map((item) => (
                        <div key={`ap-orig-${item.index}`} className="flex min-w-0 items-center gap-2 py-1.5 text-xs">
                          <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: '#6b7280' }} />
                          <span className="min-w-0 flex-1 break-all sm:truncate" style={{ color: '#111827' }}>{item.name}</span>
                          {item.viewUrl && (
                            <button type="button" onClick={() => openRemoteFileDownloadUrl(item.viewUrl)} className="text-[10px] font-semibold" style={{ color: '#2563eb' }}>
                              Xem
                            </button>
                          )}
                          {item.downloadUrl && (
                            <button type="button" onClick={() => openRemoteFileDownloadUrl(item.downloadUrl)}>
                              <Download className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {cvFileList.templates.length > 0 && (() => {
                const byTemplate = getTemplatesByFolder();
                const order = ['Common', 'IT', 'Technical'];
                return (
                  <div className="space-y-1">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleFolder('CV_Template')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleFolder('CV_Template');
                        }
                      }}
                      className="w-full flex items-center justify-between py-2 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 transition-transform" style={{ transform: openFolders.CV_Template ? 'rotate(90deg)' : 'rotate(0deg)', color: '#6b7280' }} />
                        <Folder className="w-4 h-4" style={{ color: '#f59e0b' }} />
                        <span className="text-xs font-semibold" style={{ color: '#374151' }}>CV_Template</span>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); downloadZip('template', 'all'); }} className="text-xs font-semibold" style={{ color: '#2563eb' }}>ZIP all</button>
                    </div>
                    {openFolders.CV_Template && (
                      <div className="pl-6 space-y-1">
                        {order.filter((k) => (byTemplate[k] || []).length > 0).map((templateName) => {
                          const folderId = `CV_Template/${templateName}`;
                          return (
                            <div key={`ap-${folderId}`}>
                              <button type="button" onClick={() => toggleFolder(folderId)} className="w-full flex items-center justify-between py-1 text-left">
                                <span className="text-xs font-medium" style={{ color: '#6b7280' }}>{templateName}</span>
                                <span className="text-[10px]" style={{ color: '#9ca3af' }}>({byTemplate[templateName].length})</span>
                              </button>
                              {openFolders[folderId] && (
                                <div className="pl-3 pt-0.5 space-y-1">
                                  {byTemplate[templateName].map((item, idx) => (
                                    <div key={`ap-tpl-${idx}`} className="flex items-center gap-2 py-1 text-xs flex-wrap">
                                      <FileText className="w-3 h-3 shrink-0" style={{ color: '#6b7280' }} />
                                      <span className="truncate flex-1 min-w-0" style={{ color: '#111827' }}>{item.downloadFileName || `${item.document}.pdf`}</span>
                                      {item.viewUrl && (
                                        <button type="button" onClick={() => openRemoteFileDownloadUrl(item.viewUrl)} className="text-[10px] font-semibold shrink-0" style={{ color: '#2563eb' }}>
                                          Xem
                                        </button>
                                      )}
                                      {item.downloadUrl && (
                                        <button type="button" onClick={() => openRemoteFileDownloadUrl(item.downloadUrl)} className="shrink-0">
                                          <Download className="w-3 h-3" style={{ color: '#2563eb' }} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
              {cvFileList.originals.length === 0 && cvFileList.templates.length === 0 && (
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  {cvFileListLoading
                    ? (t.loading || lbl('loadingFiles'))
                    : (candidate?.cvOriginalPath || candidate?.curriculumVitae)
                      ? lbl('fileListUnavailable')
                      : (t.noData || 'Chưa có file CV.')}
                </p>
              )}
            </div>
          )}
        </div>

        {!isApplicant && (
        <>
        {/* Phải: 2 card xếp dọc — Files | Notes */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl" style={cardStyle}>
            <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4" style={{ borderColor: '#e5e7eb' }}>
              <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold" style={{ color: '#111827' }}>
                <FileText className="h-4 w-4 shrink-0" style={{ color: '#2563eb' }} />
                {t.cvFile || lbl('cvFile')}
              </h2>
              <button type="button" onClick={() => downloadZip('template', 'all')} className="rounded-lg border px-3 py-1.5 text-xs font-semibold sm:self-start" style={{ borderColor: '#2563eb', color: '#2563eb', backgroundColor: 'white' }}>DOWNLOAD</button>
            </div>
            <div className="p-4 space-y-2 max-h-[320px] overflow-y-auto">
              {cvFileList.originals.length > 0 && (
                <div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleFolder('CV_original')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleFolder('CV_original');
                      }
                    }}
                    className="w-full flex items-center justify-between py-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 transition-transform" style={{ transform: openFolders.CV_original ? 'rotate(90deg)' : 'rotate(0deg)', color: '#6b7280' }} />
                      <Folder className="w-4 h-4" style={{ color: '#f59e0b' }} />
                      <span className="text-xs font-semibold" style={{ color: '#374151' }}>CV_original</span>
                      <span className="text-[10px]" style={{ color: '#9ca3af' }}>({cvFileList.originals.length})</span>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); downloadZip('original', 'all'); }} className="text-xs font-semibold" style={{ color: '#2563eb' }}>ZIP</button>
                  </div>
                  {openFolders.CV_original && (
                    <div className="pl-6 pt-1 space-y-1">
                      {cvFileList.originals.map((item) => (
                        <div key={`orig-${item.index}`} className="flex min-w-0 items-center gap-2 py-1.5 text-xs">
                          <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: '#6b7280' }} />
                          <span className="min-w-0 flex-1 break-all sm:truncate" style={{ color: '#111827' }}>{item.name}</span>
                          {item.downloadUrl && <button type="button" onClick={() => openRemoteFileDownloadUrl(item.downloadUrl)}><Download className="w-3.5 h-3.5" style={{ color: '#2563eb' }} /></button>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {cvFileList.templates.length > 0 && (() => {
                const byTemplate = getTemplatesByFolder();
                const order = ['Common', 'IT', 'Technical'];
                return (
                  <div className="space-y-1">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleFolder('CV_Template')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleFolder('CV_Template');
                        }
                      }}
                      className="w-full flex items-center justify-between py-2 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 transition-transform" style={{ transform: openFolders.CV_Template ? 'rotate(90deg)' : 'rotate(0deg)', color: '#6b7280' }} />
                        <Folder className="w-4 h-4" style={{ color: '#f59e0b' }} />
                        <span className="text-xs font-semibold" style={{ color: '#374151' }}>CV_Template</span>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); downloadZip('template', 'all'); }} className="text-xs font-semibold" style={{ color: '#2563eb' }}>ZIP all</button>
                    </div>
                    {openFolders.CV_Template && (
                      <div className="pl-6 space-y-1">
                        {order.filter((k) => (byTemplate[k] || []).length > 0).map((templateName) => {
                          const folderId = `CV_Template/${templateName}`;
                          return (
                            <div key={folderId}>
                              <button type="button" onClick={() => toggleFolder(folderId)} className="w-full flex items-center justify-between py-1 text-left">
                                <span className="text-xs font-medium" style={{ color: '#6b7280' }}>{templateName}</span>
                                <span className="text-[10px]" style={{ color: '#9ca3af' }}>({byTemplate[templateName].length})</span>
                              </button>
                              {openFolders[folderId] && (
                                <div className="pl-3 pt-0.5 space-y-1">
                                  {byTemplate[templateName].map((item, idx) => (
                                    <div key={`tpl-${idx}`} className="flex min-w-0 items-center gap-2 py-1 text-xs">
                                      <FileText className="h-3 w-3 shrink-0" style={{ color: '#6b7280' }} />
                                      <span className="min-w-0 flex-1 break-all sm:truncate" style={{ color: '#111827' }}>{item.downloadFileName || `${item.document}.pdf`}</span>
                                      {item.downloadUrl && <button type="button" onClick={() => openRemoteFileDownloadUrl(item.downloadUrl)}><Download className="w-3 h-3" style={{ color: '#2563eb' }} /></button>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
              {cvFileList.originals.length === 0 && cvFileList.templates.length === 0 && (candidate.cvOriginalPath || candidate.curriculumVitae) && (
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  {cvFileListLoading ? (t.loading || lbl('loadingFiles')) : lbl('fileListUnavailable')}
                </p>
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl" style={cardStyle}>
            <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4" style={{ borderColor: '#e5e7eb' }}>
              <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold" style={{ color: '#111827' }}>
                <FileText className="h-4 w-4 shrink-0" style={{ color: '#2563eb' }} />
                {t.otherDocuments || lbl('otherDocs')} / Ghi chú
              </h2>
              {candidate.otherDocuments && (
                <button type="button" onClick={() => downloadCV(candidate.otherDocuments, 'otherDocuments')} className="rounded-lg border px-3 py-1.5 text-xs font-semibold sm:self-start" style={{ borderColor: '#2563eb', color: '#2563eb', backgroundColor: 'white' }}>
                  {t.download || lbl('download')}
                </button>
              )}
            </div>
            <div className="p-4">
              {candidate.otherDocuments ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 shrink-0" style={{ color: '#6b7280' }} />
                  <span style={{ color: '#111827' }}>{candidate.otherDocuments}</span>
                </div>
              ) : (
                <p className="text-xs" style={{ color: '#9ca3af' }}>Chưa có tài liệu khác hoặc ghi chú.</p>
              )}
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      <SupplementContextMenu
        open={!!supplementCtx}
        x={supplementCtx?.x ?? 0}
        y={supplementCtx?.y ?? 0}
        onClose={() => setSupplementCtx(null)}
        items={
          supplementCtx?.kind === 'mark'
            ? [{ key: 'add', label: lbl('markSupplement'), onSelect: confirmAddSupplementMark }]
            : supplementCtx?.kind === 'unmark'
              ? [{ key: 'un', label: lbl('unmarkSupplement'), onSelect: () => confirmRemoveSupplementMark(supplementCtx.markId) }]
              : []
        }
      />
    </div>
    </>
  );
};

export default CandidateDetailPage;
