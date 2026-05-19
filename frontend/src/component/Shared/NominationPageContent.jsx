import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  Search,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Edit,
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Save,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  History,
  Clock,
  RefreshCw,
  Folder,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';
import { getJobApplicationStatus, getJobApplicationStatusLabelByLanguage } from '../../utils/jobApplicationStatus';
import { isCvUnavailableForNomination, CV_STATUS_OVERDUE_6_MONTHS, CV_STATUS_NEW, isCvPromotedInactive } from '../../utils/cvStatus';
import AddCandidateForm from '../../component/Shared/AddCandidateForm';
import QuickCreateCandidateDrawer from './QuickCreateCandidateDrawer';
import CvFilePreview from '../../component/Admin/CvFilePreview';

const pickByLanguage = (viText, enText, jpText, lang) => {
  if (lang === 'en') return enText || viText || '';
  if (lang === 'ja') return jpText || enText || viText || '';
  return viText || enText || jpText || '';
};

/**
 * Shared nomination page for Agent (CTV), Admin, and landing candidate (ứng viên).
 * @param {'agent'|'admin'|'applicant'} variant
 */
const NominationPageContent = ({ variant = 'agent' }) => {
  const isAdmin = variant === 'admin';
  const isApplicantCandidate = variant === 'applicant';
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const applicantPrefix = location.pathname.startsWith('/landing/candidate') ? '/landing/candidate' : '/candidate';
  const backUrl = isAdmin
    ? `/admin/jobs/${jobId}`
    : isApplicantCandidate
      ? `${applicantPrefix}/jobs/${jobId}`
      : `/agent/jobs/${jobId}`;

  const [activeTab, setActiveTab] = useState('existing'); // 'existing', 'new', 'history', 'recent'
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [step, setStep] = useState('select'); // 'select' or 'confirm'
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cvStorages, setCvStorages] = useState([]);
  const [loadingCVs, setLoadingCVs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCvId, setSelectedCvId] = useState(null);
  const [selectedCV, setSelectedCV] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingCV, setEditingCV] = useState(false);
  const [cvEditData, setCvEditData] = useState({});
  const [savingCV, setSavingCV] = useState(false);
  const [cvSource, setCvSource] = useState('original'); // fallback
  const [selectedTemplate, setSelectedTemplate] = useState('Common');
  const [cvSnapshots, setCvSnapshots] = useState([]);
  const [cvFoldersLoading, setCvFoldersLoading] = useState(false);
  const [selectedCvFolderPath, setSelectedCvFolderPath] = useState(''); // path of primary selected folder for cv_path
  const [selectedCvFolderPaths, setSelectedCvFolderPaths] = useState([]); // checked folders in UI
  const [cvFileList, setCvFileList] = useState({ originals: [], templates: [] });
  const [openFolders, setOpenFolders] = useState({});
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  // New states for history and recent CVs (agent only)
  const [nominationHistory, setNominationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');
  const [recentCVs, setRecentCVs] = useState([]);
  const [loadingRecentCVs, setLoadingRecentCVs] = useState(false);
  const [recentPage, setRecentPage] = useState(1);
  const [recentTotalItems, setRecentTotalItems] = useState(0);
  const [recentTotalPages, setRecentTotalPages] = useState(0);
  const [previewOption, setPreviewOption] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const autoSelectedRef = useRef(false);
  const skipApplicantCvSelectDoneRef = useRef(false);
  const [scoreByCvId, setScoreByCvId] = useState({});
  const [scoreLoading, setScoreLoading] = useState(false);
  const [expandedScoreReasonCvId, setExpandedScoreReasonCvId] = useState(null);
  const [scoreReasonByCvId, setScoreReasonByCvId] = useState({});
  const [scoreReasonLoadingId, setScoreReasonLoadingId] = useState(null);

  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredBackButtonConfirm, setHoveredBackButtonConfirm] = useState(false);
  const [hoveredEditButton, setHoveredEditButton] = useState(false);
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);
  const [hoveredBackToListButton, setHoveredBackToListButton] = useState(false);
  const [hoveredSubmitButton, setHoveredSubmitButton] = useState(false);
  const [hoveredCVItem, setHoveredCVItem] = useState(null);
  const [hoveredPaginationButton, setHoveredPaginationButton] = useState(null);
  const [hoveredRecentPaginationButton, setHoveredRecentPaginationButton] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);
  const [focusedSelect, setFocusedSelect] = useState(null);

  useEffect(() => {
    loadJobDetail();
  }, [jobId]);

  useEffect(() => {
    skipApplicantCvSelectDoneRef.current = false;
  }, [jobId]);

  useEffect(() => {
    if (isApplicantCandidate) setActiveTab('existing');
  }, [isApplicantCandidate]);

  useEffect(() => {
    if (isApplicantCandidate) return;
    const preselectCvId = Number(location?.state?.preselectCvId);
    if (!preselectCvId || Number.isNaN(preselectCvId) || autoSelectedRef.current) return;
    autoSelectedRef.current = true;
    setActiveTab('existing');
    setStep('select');
    handleSelectCV(preselectCvId);
  }, [location?.state?.preselectCvId, isAdmin, isApplicantCandidate]);

  useEffect(() => {
    if (activeTab === 'existing' && step === 'select') {
      loadCVStorages();
    } else if (!isAdmin && activeTab === 'history') {
      loadNominationHistory();
    } else if (!isAdmin && activeTab === 'recent') {
      loadRecentCVs();
    }
  }, [jobId, activeTab, step, currentPage, itemsPerPage, searchTerm, historySearchTerm, historyStatusFilter, recentPage, isAdmin]);

  useEffect(() => {
    if (isApplicantCandidate) return;
    if (step !== 'select') return;
    if (!(activeTab === 'existing' || activeTab === 'recent')) return;
    if (!jobId) return;
    const source = activeTab === 'existing' ? cvStorages : recentCVs;
    const ids = (source || [])
      .map((cv) => cv?.id)
      .filter((id) => id != null)
      .map((id) => String(id));
    if (ids.length === 0) {
      setScoreByCvId({});
      return;
    }
    let cancelled = false;
    const run = async () => {
      setScoreLoading(true);
      try {
        const rows = await apiService.scoreCvsForJobBatch(jobId, ids);
        if (cancelled) return;
        const next = {};
        (Array.isArray(rows) ? rows : []).forEach((row) => {
          const key = String(row?.id ?? '');
          if (!key) return;
          next[key] = row;
        });
        setScoreByCvId(next);
      } catch (e) {
        if (!cancelled) setScoreByCvId({});
      } finally {
        if (!cancelled) setScoreLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [jobId, step, activeTab, cvStorages, recentCVs, isApplicantCandidate]);

  const toggleScoreReason = async (cvIdNum) => {
    const key = String(cvIdNum);
    if (expandedScoreReasonCvId === key) {
      setExpandedScoreReasonCvId(null);
      return;
    }
    setExpandedScoreReasonCvId(key);
    if (scoreReasonByCvId[key]) return;
    setScoreReasonLoadingId(key);
    try {
      const res = await apiService.getAiMatchingReasons({
        jd_id: Number(jobId),
        candidate_id: Number(cvIdNum),
        lang: language,
      });
      const reason =
        res?.matching_reasons?.reason ??
        res?.data?.matching_reasons?.reason ??
        '';
      const text = reason != null && String(reason).trim() ? String(reason).trim() : 'Không lấy được lý do.';
      setScoreReasonByCvId((prev) => ({ ...prev, [key]: text }));
    } catch (e) {
      setScoreReasonByCvId((prev) => ({ ...prev, [key]: e?.message || 'Không lấy được lý do.' }));
    } finally {
      setScoreReasonLoadingId(null);
    }
  };

  useEffect(() => {
    if (step !== 'confirm' || !selectedCV) {
      setCvSnapshots([]);
      setSelectedCvFolderPath('');
      setCvFoldersLoading(false);
      setCvFileList({ originals: [], templates: [] });
      setOpenFolders({});
      return;
    }

    const originalFolderPath = selectedCV.cvOriginalPath || null;
    const templateFolderPath = selectedCV.curriculumVitae || null;
    const list = [];
    if (originalFolderPath || templateFolderPath) {
      list.push({
        dateTime: null,
        originalFolderPath,
        templateFolderPath,
      });
    }
    setCvSnapshots(list);
    if (list.length > 0) {
      const first = list[0];
      const path = first.originalFolderPath || first.templateFolderPath || '';
      setSelectedCvFolderPath(path ? String(path).replace(/\/+$/, '') : '');
    } else {
      setSelectedCvFolderPath('');
    }

    if (!isAdmin && !isApplicantCandidate) {
      setCvFoldersLoading(true);
      let cancelledCtv = false;
      (async () => {
        try {
          const data = await apiService.getCtvCVFileList(selectedCvId);
          if (!cancelledCtv) setCvFileList(data || { originals: [], templates: [] });
        } catch {
          if (!cancelledCtv) setCvFileList({ originals: [], templates: [] });
        } finally {
          if (!cancelledCtv) setCvFoldersLoading(false);
        }
      })();
      return () => { cancelledCtv = true; };
    }

    if (isApplicantCandidate) {
      setCvFoldersLoading(true);
      let cancelled = false;
      (async () => {
        try {
          const data = await apiService.getApplicantCVFileList(selectedCvId);
          if (!cancelled) setCvFileList(data || { originals: [], templates: [] });
        } catch {
          if (!cancelled) setCvFileList({ originals: [], templates: [] });
        } finally {
          if (!cancelled) setCvFoldersLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }

    setCvFoldersLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const data = await apiService.getAdminCVFileList(selectedCvId);
        if (!cancelled) setCvFileList(data || { originals: [], templates: [] });
      } catch {
        if (!cancelled) setCvFileList({ originals: [], templates: [] });
      } finally {
        if (!cancelled) setCvFoldersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [step, selectedCV, selectedCvId, isAdmin, isApplicantCandidate]);

  const loadJobDetail = async () => {
    try {
      setLoading(true);
      let response;
      if (isAdmin) {
        response = await apiService.getAdminJobById(jobId);
      } else if (isApplicantCandidate) {
        response = await apiService.getApplicantJobById(jobId);
      } else {
        response = await apiService.getJobById(jobId);
      }
      if (response.success && response.data?.job) {
        setJob(response.data.job);
      }
    } catch (error) {
      console.error('Error loading job detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCVStorages = async () => {
    try {
      setLoadingCVs(true);
      if (isApplicantCandidate) {
        const response = await apiService.getApplicantMyCVs();
        const list = response?.data?.cvs || [];
        const validList = list.filter((c) => Number(c?.status) === CV_STATUS_NEW && !isCvPromotedInactive(c) && !c?.isDuplicate && !c?.is_duplicate);
        const term = (searchTerm || '').trim().toLowerCase();
        const filtered = term
          ? validList.filter((c) =>
              [c.name, c.code, c.email, String(c.phone || '')].some((x) =>
                String(x || '').toLowerCase().includes(term)
              )
            )
          : validList;
        setCvStorages(filtered);
        setTotalItems(filtered.length);
        setTotalPages(1);
        return;
      }
      const params = { page: currentPage, limit: itemsPerPage };
      if (searchTerm) params.search = searchTerm;
      if (!isAdmin) params.isDuplicate = '0';
      const response = isAdmin
        ? await apiService.getAdminCVs(params)
        : await apiService.getCVStorages(params);
      if (response.success && response.data) {
        const list = (response.data.cvs || []).filter((c) => Number(c?.status) === CV_STATUS_NEW && !isCvPromotedInactive(c) && !c?.isDuplicate && !c?.is_duplicate);
        setCvStorages(list);
        setTotalItems(list.length);
        setTotalPages(response.data.pagination?.totalPages || 0);
      }
    } catch (error) {
      console.error('Error loading CV storages:', error);
    } finally {
      setLoadingCVs(false);
    }
  };

  const toggleFolderOpen = (folderId) => {
    setOpenFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const toggleSelectedCvFolder = (path) => {
    const normalized = String(path || '').replace(/\/+$/, '');
    if (!normalized) return;
    setSelectedCvFolderPaths((prev) => {
      if (prev.includes(normalized)) return prev.filter((item) => item !== normalized);
      return [...prev, normalized];
    });
    setSelectedCvFolderPath(normalized);
  };

  const handleSelectCV = async (cvId) => {
    try {
      setLoading(true);
      const cvResponse = isAdmin
        ? await apiService.getAdminCVById(cvId)
        : isApplicantCandidate
          ? await apiService.getApplicantMyCVById(cvId)
          : await apiService.getCVStorageById(cvId);
      if (!cvResponse.success || !cvResponse.data?.cv) {
        alert(isAdmin ? t.adminNominationCvNotFound : 'Không tìm thấy thông tin ứng viên');
        return;
      }
      const cv = cvResponse.data.cv;
      if (!isAdmin && !isApplicantCandidate && isCvUnavailableForNomination(cv)) {
        const st = Number(cv.status);
        alert(
          st === CV_STATUS_OVERDUE_6_MONTHS
            ? (t.overdueCvNominationWarning || t.duplicateCVWarning)
            : t.duplicateCVWarning
        );
        return;
      }
      let genderValue = '';
      if (cv.gender) {
        const parsedGender = parseInt(cv.gender);
        if (!isNaN(parsedGender) && (parsedGender === 1 || parsedGender === 2)) {
          genderValue = parsedGender.toString();
        }
      }
      setSelectedCvId(cvId);
      setSelectedCV(cv);
      setCvEditData({
        name: cv.name || cv.fullName || '',
        furigana: cv.furigana || '',
        email: cv.email || '',
        phone: cv.phone || '',
        birthDate: cv.birthDate || '',
        age: cv.ages || cv.age || '',
        gender: genderValue,
        addressCurrent: cv.addressCurrent || cv.address || '',
        currentIncome: cv.currentIncome || cv.currentSalary || '',
        desiredIncome: cv.desiredIncome || cv.desiredSalary || '',
        desiredWorkLocation: cv.desiredWorkLocation || cv.desiredLocation || '',
        nyushaTime: cv.nyushaTime || '',
        strengths: cv.strengths || '',
        motivation: cv.motivation || '',
      });
      setStep('confirm');
    } catch (error) {
      console.error('Error loading CV:', error);
      alert(isAdmin ? t.adminNominationErrorLoadCv : 'Có lỗi xảy ra khi tải thông tin ứng viên');
    } finally {
      setLoading(false);
    }
  };

  /** Ứng viên chỉ có 1 hồ sơ → bỏ qua bước chọn, vào thẳng xác nhận */
  useEffect(() => {
    if (!isApplicantCandidate) return;
    if (step !== 'select' || loadingCVs) return;
    if ((cvStorages || []).length === 0) return;
    if (skipApplicantCvSelectDoneRef.current) return;
    skipApplicantCvSelectDoneRef.current = true;
    handleSelectCV(cvStorages[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isApplicantCandidate,
    step,
    loadingCVs,
    cvStorages,
  ]);

  const handleSaveCVEdit = async () => {
    if (!selectedCvId) return;
    if (isApplicantCandidate) return;

    try {
      setSavingCV(true);
      const formData = new FormData();
      
      // Map edited data to form fields
      formData.append('nameKanji', cvEditData.name || '');
      formData.append('nameKana', cvEditData.furigana || '');
      formData.append('email', cvEditData.email || '');
      formData.append('phone', cvEditData.phone || '');
      formData.append('birthDate', cvEditData.birthDate || '');
      formData.append('age', cvEditData.age || '');
      formData.append('gender', cvEditData.gender || '');
      formData.append('address', cvEditData.addressCurrent || '');
      formData.append('currentSalary', cvEditData.currentIncome || '');
      formData.append('desiredSalary', cvEditData.desiredIncome || '');
      formData.append('desiredLocation', cvEditData.desiredWorkLocation || '');
      formData.append('nyushaTime', cvEditData.nyushaTime || '');
      formData.append('strengths', cvEditData.strengths || '');
      formData.append('motivation', cvEditData.motivation || '');

      const response = isAdmin
        ? await apiService.updateAdminCV(selectedCvId, formData)
        : await apiService.updateCVStorage(selectedCvId, formData);
      if (response.success) {
        const cvResponse = isAdmin
          ? await apiService.getAdminCVById(selectedCvId)
          : await apiService.getCVStorageById(selectedCvId);
        if (cvResponse.success && cvResponse.data?.cv) {
          const c = cvResponse.data.cv;
          setSelectedCV(c);
          setCvEditData({
            name: c.name || c.fullName || '',
            furigana: c.furigana || '',
            email: c.email || '',
            phone: c.phone || '',
            birthDate: c.birthDate || '',
            age: c.ages || c.age || '',
            gender: c.gender?.toString() || '',
            addressCurrent: c.addressCurrent || c.address || '',
            currentIncome: c.currentIncome || c.currentSalary || '',
            desiredIncome: c.desiredIncome || c.desiredSalary || '',
            desiredWorkLocation: c.desiredWorkLocation || c.desiredLocation || '',
            nyushaTime: c.nyushaTime || '',
            strengths: c.strengths || '',
            motivation: c.motivation || '',
          });
        }
        setEditingCV(false);
        alert(isAdmin ? t.adminNominationCvUpdateSuccess : 'Đã cập nhật thông tin ứng viên thành công!');
      } else {
        alert(response.message || (isAdmin ? t.adminNominationCvUpdateError : 'Có lỗi xảy ra khi cập nhật thông tin'));
      }
    } catch (error) {
      console.error('Error saving CV edit:', error);
      alert(error.message || (isAdmin ? t.adminNominationCvUpdateError : 'Có lỗi xảy ra khi cập nhật thông tin'));
    } finally {
      setSavingCV(false);
    }
  };

  const handleSubmitNomination = async () => {
    if (!selectedCV) {
      alert(isAdmin ? t.adminNominationPleaseSelectCandidate : 'Vui lòng chọn ứng viên');
      return;
    }
    if (!jobId) {
      alert(isAdmin ? t.adminNominationJobIdRequired : 'ID việc làm là bắt buộc');
      return;
    }
    try {
      setSubmitting(true);
      if (isApplicantCandidate) {
        const payload = {
          jobId: Number(jobId),
          cvId: selectedCV.id,
        };
        if (selectedCvFolderPath && String(selectedCvFolderPath).trim()) {
          payload.cvPath = String(selectedCvFolderPath).trim();
        }
        const response = await apiService.createApplicantJobApplication(payload);
        if (response.success) {
          alert(t.nominationSuccess || 'Ứng tuyển thành công!');
          navigate(backUrl);
        } else {
          alert(response.message || 'Không gửi được đơn ứng tuyển.');
        }
        return;
      }
      if (isAdmin) {
        const requestData = {
          jobId: parseInt(jobId),
          cvCode: selectedCV.code || selectedCV.id?.toString() || '',
        };
        if (selectedCvFolderPath && selectedCvFolderPath.trim()) {
          requestData.cvPath = selectedCvFolderPath.trim();
        }
        const response = await apiService.createAdminJobApplication(requestData);
        if (response.success) {
          alert(t.nominationSuccess);
          navigate(backUrl);
        } else {
          alert(response.message || t.adminNominationErrorSubmit);
        }
      } else {
        const cvData = editingCV ? cvEditData : {
          name: selectedCV.name || '',
          furigana: selectedCV.furigana || '',
          email: selectedCV.email || '',
          phone: selectedCV.phone || '',
          birthDate: selectedCV.birthDate || '',
          ages: selectedCV.ages || selectedCV.age || '',
          gender: selectedCV.gender?.toString() || '',
          addressCurrent: selectedCV.addressCurrent || selectedCV.address || '',
          currentIncome: selectedCV.currentIncome || '',
          desiredIncome: selectedCV.desiredIncome || '',
          desiredWorkLocation: selectedCV.desiredWorkLocation || '',
          nyushaTime: selectedCV.nyushaTime || '',
          strengths: selectedCV.strengths || '',
          motivation: selectedCV.motivation || '',
        };
        const requestData = {
          jobId: String(jobId || ''),
          cvId: selectedCV.id,
          cvCode: selectedCV.code || '',
          ...(selectedCvFolderPath ? { cvPath: selectedCvFolderPath } : { cvSource, template: cvSource === 'template' ? selectedTemplate : undefined }),
          name: cvData.name,
          furigana: cvData.furigana,
          email: cvData.email,
          phone: cvData.phone,
          addressCurrent: cvData.addressCurrent,
          birthDate: cvData.birthDate,
          ages: cvData.ages || cvData.age || '',
          gender: cvData.gender,
          currentIncome: cvData.currentIncome,
          desiredIncome: cvData.desiredIncome,
          desiredWorkLocation: cvData.desiredWorkLocation,
          nyushaTime: cvData.nyushaTime,
          selfPromotion: cvData.strengths,
          reasonApply: cvData.motivation,
          cvType: 1,
        };
        const response = await apiService.createJobApplication(requestData);
        if (response.success) {
          alert(t.nominationSuccess || 'Tiến cử thành công!');
          navigate(backUrl);
        }
      }
    } catch (error) {
      console.error('Error submitting nomination:', error);
      alert(error.message || (isAdmin ? t.adminNominationErrorSubmit : 'Có lỗi xảy ra khi tiến cử'));
    } finally {
      setSubmitting(false);
    }
  };

  // Only show nomination-eligible CVs on the list
  const filteredCVStorages = (cvStorages || []).filter((cv) => Number(cv?.status) === CV_STATUS_NEW && !isCvPromotedInactive(cv) && !cv?.isDuplicate && !cv?.is_duplicate);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return dateString;
    }
  };

  const formatGender = (gender) => {
    if (gender === '1' || gender === 1) return isAdmin ? t.genderMale : 'Nam';
    if (gender === '2' || gender === 2) return isAdmin ? t.genderFemale : 'Nữ';
    return '—';
  };

  const loadNominationHistory = async () => {
    try {
      setLoadingHistory(true);
      const params = {
        limit: 100 // Get more records to group properly
      };
      if (historySearchTerm) {
        params.search = historySearchTerm;
      }
      if (historyStatusFilter) {
        params.status = historyStatusFilter;
      }
      // Get history for all candidates
      const response = await apiService.getJobApplications(params);
      if (response.success && response.data) {
        // Group by company (recruitingCompany takes priority, then company)
        const grouped = {};
        (response.data.jobApplications || []).forEach(app => {
          const rc = app.job?.recruitingCompany || app.job?.company;
          const companyName = pickByLanguage(
            rc?.companyName || rc?.name,
            rc?.companyNameEn || rc?.company_name_en,
            rc?.companyNameJp || rc?.company_name_jp,
            language
          ) || 'N/A';
          if (!grouped[companyName]) {
            grouped[companyName] = [];
          }
          grouped[companyName].push(app);
        });
        // Sort companies by number of applications (descending)
        const sortedGroups = Object.entries(grouped)
          .map(([company, apps]) => ({
            company,
            applications: apps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          }))
          .sort((a, b) => b.applications.length - a.applications.length);
        setNominationHistory(sortedGroups);
      }
    } catch (error) {
      console.error('Error loading nomination history:', error);
      setNominationHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadRecentCVs = async () => {
    try {
      setLoadingRecentCVs(true);
      const params = {
        page: recentPage,
        limit: itemsPerPage,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        isDuplicate: '0'
      };
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await apiService.getRecentUpdatedCVs(params);
      if (response.success && response.data) {
        const list = (response.data.cvs || []).filter((c) => !isCvUnavailableForNomination(c));
        setRecentCVs(list);
        setRecentTotalItems(list.length);
        setRecentTotalPages(response.data.pagination?.totalPages || 0);
      }
    } catch (error) {
      console.error('Error loading recent CVs:', error);
      setRecentCVs([]);
    } finally {
      setLoadingRecentCVs(false);
    }
  };

  if (loading && step === 'select') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#2563eb' }}></div>
          <p style={{ color: '#4b5563' }}>{isAdmin ? t.adminNominationLoadingInfo : (t.loading || 'Đang tải thông tin...')}</p>
        </div>
      </div>
    );
  }

  // Confirmation Step
  if (step === 'confirm' && selectedCV) {
    const folderOptions = [];
    for (const snap of cvSnapshots) {
      if (snap.originalFolderPath) {
        folderOptions.push({
          id: 'CV_original',
          path: snap.originalFolderPath.replace(/\/+$/, ''),
          label: 'CV_original',
          kind: 'original',
        });
      }
      if (snap.templateFolderPath) {
        const base = snap.templateFolderPath.replace(/\/+$/, '');
        let templateNames = [];
        if (cvFoldersLoading) {
          templateNames = [];
        } else {
          const seen = new Set(
            (cvFileList.templates || [])
              .map((x) => x?.template)
              .filter((t) => t && ['Common', 'IT', 'Technical'].includes(t))
          );
          if (seen.size > 0) {
            templateNames = ['Common', 'IT', 'Technical'].filter((name) => seen.has(name));
          }
        }
        for (const tpl of templateNames) {
          folderOptions.push({
            id: `CV_Template/${tpl}`,
            path: `${base}/${tpl}`,
            label: `CV_Template / ${tpl}`,
            kind: 'template',
            template: tpl,
          });
        }
      }
    }
    const templatesByName = { Common: [], IT: [], Technical: [] };
    if ((cvFileList.templates || []).length) {
      (cvFileList.templates || []).forEach((tpl) => {
        if (tpl?.template && templatesByName[tpl.template]) {
          templatesByName[tpl.template].push(tpl);
        }
      });
    }

    const handlePreviewFolder = async (opt, event) => {
      if (event) event.stopPropagation();
      try {
        let url = null;
        const fetchCvUrl = isApplicantCandidate ? apiService.getApplicantCVFileUrl : apiService.getCtvCVFileUrl;
        if (opt.kind === 'original') {
          url = await fetchCvUrl(selectedCvId, 'cvOriginalPath', 'view', { index: 0 });
        } else if (opt.kind === 'template') {
          url = await fetchCvUrl(selectedCvId, 'curriculumVitae', 'view', {
            template: opt.template,
            document: 'rirekisho',
          });
        }
        if (url) {
          setPreviewOption(opt);
          setPreviewUrl(url);
        } else {
          alert('Không tìm thấy file CV để xem.');
        }
      } catch (err) {
        console.error('Error opening CV preview:', err);
        alert('Không mở được file CV. Vui lòng thử lại.');
      }
    };

    return (
      <div className="space-y-4">

        {/* ── PHẦN 1: CHỌN CV (hàng ngang) ── */}
        {isAdmin ? (
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-2 mb-3">
              <Folder className="w-4 h-4" style={{ color: '#f59e0b' }} />
              <span className="text-[11px] font-semibold" style={{ color: '#374151' }}>Chọn folder CV dùng để tiến cử</span>
            </div>
            {cvFoldersLoading && (
              <p className="text-[10px]" style={{ color: '#6b7280' }}>Đang tải danh sách folder...</p>
            )}
            {!cvFoldersLoading && folderOptions.length === 0 && (
              <p className="text-[10px]" style={{ color: '#6b7280' }}>Không tìm thấy folder CV trong hồ sơ này. Sẽ dùng CV hiện tại.</p>
            )}
            {!cvFoldersLoading && folderOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {folderOptions.map((opt) => {
                  const isSelected = selectedCvFolderPath === opt.path;
                  const isOpen = !!openFolders[opt.id];
                  const files = opt.kind === 'original' ? (cvFileList.originals || []) : (templatesByName[opt.template] || []);
                  return (
                    <div key={opt.id} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => { toggleFolderOpen(opt.id); setSelectedCvFolderPath(opt.path); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-medium transition-all"
                        style={{
                          backgroundColor: isSelected ? '#dbeafe' : '#f9fafb',
                          borderColor: isSelected ? '#93c5fd' : '#e5e7eb',
                          color: isSelected ? '#1d4ed8' : '#374151',
                        }}
                      >
                        <Folder className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                        {opt.label}
                        {isSelected && <CheckCircle className="w-3 h-3" style={{ color: '#2563eb' }} />}
                      </button>
                      {isOpen && files.length > 0 && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {files.map((file, idx) => {
                            const filePath = file.name || (file.label ? (file.label.toLowerCase().endsWith('.pdf') ? file.label : `${file.label}.pdf`) : 'cv.pdf');
                            const title = file.name || file.label || 'CV';
                            return (
                              <CvFilePreview
                                key={`${opt.id}-${idx}`}
                                viewUrl={file.viewUrl}
                                filePath={filePath}
                                title={title}
                                onDownload={file.downloadUrl ? () => window.open(file.downloadUrl, '_blank') : undefined}
                                cvStorageId={selectedCvId}
                                fileType={opt.kind === 'original' ? 'cvOriginalPath' : 'curriculumVitae'}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : isApplicantCandidate ? (
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-2 mb-3">
              <Folder className="w-4 h-4" style={{ color: '#f59e0b' }} />
              <span className="text-[11px] font-semibold" style={{ color: '#374151' }}>
                {pickByLanguage('Chọn file / folder CV gửi kèm đơn', 'Choose CV file or folder to attach', '添付するCVを選ぶ', language)}
              </span>
            </div>
            {cvFoldersLoading && (
              <p className="text-[10px]" style={{ color: '#6b7280' }}>
                {pickByLanguage('Đang tải danh sách file CV…', 'Loading CV files…', 'CVファイル一覧を読み込み中…', language)}
              </p>
            )}
            {!cvFoldersLoading && folderOptions.length === 0 && (
              <p className="text-[10px]" style={{ color: '#6b7280' }}>
                {pickByLanguage('Không tìm thấy folder CV trong hồ sơ. Đơn sẽ dùng đường dẫn mặc định.', 'No CV folder found. The application will use the default path.', 'CVフォルダが見つかりません。既定のパスが使われます。', language)}
              </p>
            )}
            {!cvFoldersLoading && folderOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {folderOptions.map((opt) => {
                  const isSelected = selectedCvFolderPath === opt.path;
                  return (
                    <button
                      key={opt.path}
                      type="button"
                      onClick={() => setSelectedCvFolderPath(opt.path)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-medium transition-all"
                      style={{
                        backgroundColor: isSelected ? '#dbeafe' : '#f9fafb',
                        borderColor: isSelected ? '#93c5fd' : '#e5e7eb',
                        color: isSelected ? '#1d4ed8' : '#374151',
                      }}
                    >
                      <Folder className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                      {opt.label}
                      {isSelected && <CheckCircle className="w-3 h-3" style={{ color: '#2563eb' }} />}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handlePreviewFolder(opt, e)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePreviewFolder(opt, e); }}
                        className="underline cursor-pointer ml-1"
                        style={{ color: isSelected ? '#1d4ed8' : '#2563eb' }}
                      >
                        {pickByLanguage('Xem', 'Preview', 'プレビュー', language)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {previewUrl && previewOption && (
              <div className="mt-3">
                <CvFilePreview
                  viewUrl={previewUrl}
                  filePath="cv.pdf"
                  title={previewOption.label}
                  onDownload={previewUrl ? () => window.open(previewUrl, '_blank') : undefined}
                  cvStorageId={selectedCvId}
                  fileType={previewOption.kind === 'original' ? 'cvOriginalPath' : 'curriculumVitae'}
                  getFileContent={apiService.getApplicantCVFileContent}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-2 mb-3">
              <Folder className="w-4 h-4" style={{ color: '#f59e0b' }} />
              <span className="text-[11px] font-semibold" style={{ color: '#374151' }}>Chọn folder CV dùng để tiến cử</span>
            </div>
            {cvFoldersLoading && (
              <p className="text-[10px]" style={{ color: '#6b7280' }}>Đang tải danh sách folder...</p>
            )}
            {!cvFoldersLoading && folderOptions.length === 0 && (
              <p className="text-[10px]" style={{ color: '#6b7280' }}>Không tìm thấy folder CV trong hồ sơ này. Sẽ dùng CV hiện tại.</p>
            )}
            {!cvFoldersLoading && folderOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {folderOptions.map((opt) => {
                  const isSelected = selectedCvFolderPath === opt.path;
                  return (
                    <button
                      key={opt.path}
                      type="button"
                      onClick={() => setSelectedCvFolderPath(opt.path)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-medium transition-all"
                      style={{
                        backgroundColor: isSelected ? '#dbeafe' : '#f9fafb',
                        borderColor: isSelected ? '#93c5fd' : '#e5e7eb',
                        color: isSelected ? '#1d4ed8' : '#374151',
                      }}
                    >
                      <Folder className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                      {opt.label}
                      {isSelected && <CheckCircle className="w-3 h-3" style={{ color: '#2563eb' }} />}
                      <span
                        onClick={(e) => handlePreviewFolder(opt, e)}
                        className="underline cursor-pointer ml-1"
                        style={{ color: isSelected ? '#1d4ed8' : '#2563eb' }}
                      >
                        Xem
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {previewUrl && previewOption && (
              <div className="mt-3">
                <CvFilePreview
                  viewUrl={previewUrl}
                  filePath="cv.pdf"
                  title={previewOption.label}
                  onDownload={previewUrl ? () => window.open(previewUrl, '_blank') : undefined}
                  cvStorageId={selectedCvId}
                  fileType={previewOption.kind === 'original' ? 'cvOriginalPath' : 'curriculumVitae'}
                  getFileContent={apiService.getCtvCVFileContent}
                />
              </div>
            )}
          </div>
        )}

        {/* ── PHẦN 2: THÔNG TIN ỨNG VIÊN & THÔNG TIN CÔNG VIỆC (2 cột) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Candidate Information */}
          <div className="rounded-xl p-5 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6" style={{ color: '#2563eb' }} />
              <h2 className="text-base font-bold" style={{ color: '#111827' }}>Thông tin ứng viên</h2>
            </div>
            {!isApplicantCandidate && (!editingCV ? (
              <button
                onClick={() => setEditingCV(true)}
                onMouseEnter={() => setHoveredEditButton(true)}
                onMouseLeave={() => setHoveredEditButton(false)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: hoveredEditButton ? '#1d4ed8' : '#2563eb',
                  color: 'white'
                }}
              >
                <Edit className="w-3.5 h-3.5" />
                Sửa nhanh
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingCV(false);
                    // Reset to original data
                    setCvEditData({
                      name: selectedCV.name || '',
                      furigana: selectedCV.furigana || '',
                      email: selectedCV.email || '',
                      phone: selectedCV.phone || '',
                      birthDate: selectedCV.birthDate || '',
                      age: selectedCV.ages || selectedCV.age || '',
                      gender: selectedCV.gender?.toString() || '',
                      addressCurrent: selectedCV.addressCurrent || selectedCV.address || '',
                      currentIncome: selectedCV.currentIncome || '',
                      desiredIncome: selectedCV.desiredIncome || '',
                      desiredWorkLocation: selectedCV.desiredWorkLocation || '',
                      nyushaTime: selectedCV.nyushaTime || '',
                      strengths: selectedCV.strengths || '',
                      motivation: selectedCV.motivation || '',
                    });
                  }}
                  onMouseEnter={() => setHoveredCancelButton(true)}
                  onMouseLeave={() => setHoveredCancelButton(false)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1.5"
                  style={{
                    backgroundColor: hoveredCancelButton ? '#e5e7eb' : '#f3f4f6',
                    color: '#374151'
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                  Hủy
                </button>
                <button
                  onClick={handleSaveCVEdit}
                  disabled={savingCV}
                  onMouseEnter={() => !savingCV && setHoveredSaveButton(true)}
                  onMouseLeave={() => setHoveredSaveButton(false)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  style={{
                    backgroundColor: hoveredSaveButton ? '#16a34a' : '#22c55e',
                    color: 'white'
                  }}
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingCV ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            ))}
          </div>

          {!isApplicantCandidate && editingCV ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Họ tên (Kanji) *</label>
                <input
                  type="text"
                  value={cvEditData.name}
                  onChange={(e) => setCvEditData({ ...cvEditData, name: e.target.value })}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'name' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'name' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Họ tên (Kana)</label>
                <input
                  type="text"
                  value={cvEditData.furigana}
                  onChange={(e) => setCvEditData({ ...cvEditData, furigana: e.target.value })}
                  onFocus={() => setFocusedInput('furigana')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'furigana' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'furigana' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Email</label>
                <input
                  type="email"
                  value={cvEditData.email}
                  onChange={(e) => setCvEditData({ ...cvEditData, email: e.target.value })}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'email' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'email' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Số điện thoại</label>
                <input
                  type="tel"
                  value={cvEditData.phone}
                  onChange={(e) => setCvEditData({ ...cvEditData, phone: e.target.value })}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'phone' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'phone' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Ngày sinh</label>
                <input
                  type="date"
                  value={cvEditData.birthDate}
                  onChange={(e) => setCvEditData({ ...cvEditData, birthDate: e.target.value })}
                  onFocus={() => setFocusedInput('birthDate')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'birthDate' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'birthDate' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Tuổi</label>
                <input
                  type="number"
                  value={cvEditData.age}
                  onChange={(e) => setCvEditData({ ...cvEditData, age: e.target.value })}
                  onFocus={() => setFocusedInput('age')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'age' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'age' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Giới tính *</label>
                <select
                  value={cvEditData.gender}
                  onChange={(e) => setCvEditData({ ...cvEditData, gender: e.target.value })}
                  onFocus={() => setFocusedSelect('gender')}
                  onBlur={() => setFocusedSelect(null)}
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedSelect === 'gender' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedSelect === 'gender' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                >
                  <option value="">Chọn</option>
                  <option value="1">Nam</option>
                  <option value="2">Nữ</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Địa chỉ</label>
                <input
                  type="text"
                  value={cvEditData.addressCurrent}
                  onChange={(e) => setCvEditData({ ...cvEditData, addressCurrent: e.target.value })}
                  onFocus={() => setFocusedInput('addressCurrent')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'addressCurrent' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'addressCurrent' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Lương hiện tại</label>
                <input
                  type="text"
                  value={cvEditData.currentIncome}
                  onChange={(e) => setCvEditData({ ...cvEditData, currentIncome: e.target.value })}
                  onFocus={() => setFocusedInput('currentIncome')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'currentIncome' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'currentIncome' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Lương mong muốn</label>
                <input
                  type="text"
                  value={cvEditData.desiredIncome}
                  onChange={(e) => setCvEditData({ ...cvEditData, desiredIncome: e.target.value })}
                  onFocus={() => setFocusedInput('desiredIncome')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'desiredIncome' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'desiredIncome' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Địa điểm mong muốn</label>
                <input
                  type="text"
                  value={cvEditData.desiredWorkLocation}
                  onChange={(e) => setCvEditData({ ...cvEditData, desiredWorkLocation: e.target.value })}
                  onFocus={() => setFocusedInput('desiredWorkLocation')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'desiredWorkLocation' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'desiredWorkLocation' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Thời gian nhập công ty</label>
                <input
                  type="text"
                  value={cvEditData.nyushaTime}
                  onChange={(e) => setCvEditData({ ...cvEditData, nyushaTime: e.target.value })}
                  onFocus={() => setFocusedInput('nyushaTime')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'nyushaTime' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'nyushaTime' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Điểm mạnh</label>
                <textarea
                  value={cvEditData.strengths}
                  onChange={(e) => setCvEditData({ ...cvEditData, strengths: e.target.value })}
                  onFocus={() => setFocusedInput('strengths')}
                  onBlur={() => setFocusedInput(null)}
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'strengths' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'strengths' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#111827' }}>Động lực</label>
                <textarea
                  value={cvEditData.motivation}
                  onChange={(e) => setCvEditData({ ...cvEditData, motivation: e.target.value })}
                  onFocus={() => setFocusedInput('motivation')}
                  onBlur={() => setFocusedInput(null)}
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'motivation' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'motivation' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Mã CV</label>
                <p className="text-[10px] font-medium" style={{ color: '#111827' }}>{selectedCV.code || '—'}</p>
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Họ tên (Kanji)</label>
                <p className="text-[10px]" style={{ color: '#111827' }}>{cvEditData.name || selectedCV.name || '—'}</p>
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Họ tên (Kana)</label>
                <p className="text-[10px]" style={{ color: '#111827' }}>{cvEditData.furigana || selectedCV.furigana || '—'}</p>
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Email</label>
                <p className="text-[10px] flex items-center gap-1" style={{ color: '#111827' }}>
                  <Mail className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                  {cvEditData.email || selectedCV.email || '—'}
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Số điện thoại</label>
                <p className="text-[10px] flex items-center gap-1" style={{ color: '#111827' }}>
                  <Phone className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                  {cvEditData.phone || selectedCV.phone || '—'}
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Ngày sinh</label>
                <p className="text-[10px] flex items-center gap-1" style={{ color: '#111827' }}>
                  <Calendar className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                  {formatDate(cvEditData.birthDate || selectedCV.birthDate)}
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Tuổi</label>
                <p className="text-[10px]" style={{ color: '#111827' }}>{cvEditData.age || selectedCV.ages || selectedCV.age || '—'}</p>
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Giới tính</label>
                <p className="text-[10px]" style={{ color: '#111827' }}>{formatGender(cvEditData.gender || selectedCV.gender)}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Địa chỉ</label>
                <p className="text-[10px]" style={{ color: '#111827' }}>{cvEditData.addressCurrent || selectedCV.addressCurrent || selectedCV.address || '—'}</p>
              </div>
              {cvEditData.currentIncome || selectedCV.currentIncome ? (
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Lương hiện tại</label>
                  <p className="text-[10px]" style={{ color: '#111827' }}>{cvEditData.currentIncome || selectedCV.currentIncome}</p>
                </div>
              ) : null}
              {cvEditData.desiredIncome || selectedCV.desiredIncome ? (
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Lương mong muốn</label>
                  <p className="text-[10px]" style={{ color: '#111827' }}>{cvEditData.desiredIncome || selectedCV.desiredIncome}</p>
                </div>
              ) : null}
              {cvEditData.desiredWorkLocation || selectedCV.desiredWorkLocation ? (
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Địa điểm mong muốn</label>
                  <p className="text-[10px]" style={{ color: '#111827' }}>{cvEditData.desiredWorkLocation || selectedCV.desiredWorkLocation}</p>
                </div>
              ) : null}
              {cvEditData.nyushaTime || selectedCV.nyushaTime ? (
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Thời gian nhập công ty</label>
                  <p className="text-[10px]" style={{ color: '#111827' }}>{cvEditData.nyushaTime || selectedCV.nyushaTime}</p>
                </div>
              ) : null}
              {cvEditData.strengths || selectedCV.strengths ? (
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Điểm mạnh</label>
                  <p className="text-[10px] whitespace-pre-wrap" style={{ color: '#111827' }}>{cvEditData.strengths || selectedCV.strengths}</p>
                </div>
              ) : null}
              {cvEditData.motivation || selectedCV.motivation ? (
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#6b7280' }}>Động lực</label>
                  <p className="text-[10px] whitespace-pre-wrap" style={{ color: '#111827' }}>{cvEditData.motivation || selectedCV.motivation}</p>
                </div>
              ) : null}
            </div>
          )}
          </div>

          {/* Job Information */}
          <div className="rounded-xl p-5 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5" style={{ color: '#2563eb' }} />
              <h2 className="text-sm font-bold" style={{ color: '#111827' }}>Thông tin công việc</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 text-[10px]">
              {job ? (
                <>
                  <div>
                    <label className="block font-semibold mb-0.5" style={{ color: '#6b7280' }}>Tiêu đề</label>
                    <p className="font-medium line-clamp-2" style={{ color: '#111827' }}>{pickByLanguage(job.title, job.titleEn || job.title_en, job.titleJp || job.title_jp, language)}</p>
                  </div>
                  {job.company && (
                    <div>
                      <label className="block font-semibold mb-0.5" style={{ color: '#6b7280' }}>Công ty</label>
                      <p className="truncate" style={{ color: '#111827' }}>{pickByLanguage(job.company.name, job.company.nameEn || job.company.name_en, job.company.nameJp || job.company.name_jp, language)}</p>
                    </div>
                  )}
                  {(job.recruitingCompany?.companyName || job.recruitingCompany?.companyNameEn || job.recruitingCompany?.companyNameJp) && (
                    <div>
                      <label className="block font-semibold mb-0.5" style={{ color: '#6b7280' }}>Công ty tuyển dụng</label>
                      <p className="truncate" style={{ color: '#111827' }}>{pickByLanguage(job.recruitingCompany?.companyName, job.recruitingCompany?.companyNameEn || job.recruitingCompany?.company_name_en, job.recruitingCompany?.companyNameJp || job.recruitingCompany?.company_name_jp, language)}</p>
                    </div>
                  )}
                  {job.workLocation && (
                    <div>
                      <label className="block font-semibold mb-0.5" style={{ color: '#6b7280' }}>Địa điểm</label>
                      <p className="flex items-center gap-1 truncate" style={{ color: '#111827' }}>
                        <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#9ca3af' }} />
                        {job.workLocation}
                      </p>
                    </div>
                  )}
                  {job.estimatedSalary && (
                    <div>
                      <label className="block font-semibold mb-0.5" style={{ color: '#6b7280' }}>Lương ước tính</label>
                      <p className="flex items-center gap-1" style={{ color: '#111827' }}>
                        <DollarSign className="w-3 h-3 flex-shrink-0" style={{ color: '#9ca3af' }} />
                        {job.estimatedSalary}
                      </p>
                    </div>
                  )}
                  {job.category && (
                    <div>
                      <label className="block font-semibold mb-0.5" style={{ color: '#6b7280' }}>Danh mục</label>
                      <p className="truncate" style={{ color: '#111827' }}>{pickByLanguage(job.category.name, job.category.nameEn || job.category.name_en, job.category.nameJp || job.category.name_jp, language)}</p>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: '#6b7280' }}>—</p>
              )}
            </div>
          </div>

        </div>{/* end 2-col grid */}

        {/* Action Buttons */}
        <div className="rounded-2xl p-4 border flex items-center justify-end gap-3" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <button
            onClick={() => { setStep('select'); setSelectedCvId(null); setSelectedCV(null); setEditingCV(false); }}
            onMouseEnter={() => setHoveredBackToListButton(true)}
            onMouseLeave={() => setHoveredBackToListButton(false)}
            className="px-4 py-1.5 border rounded-lg text-xs font-medium transition-colors"
            style={{ borderColor: '#d1d5db', color: '#374151', backgroundColor: hoveredBackToListButton ? '#f3f4f6' : 'transparent' }}
          >
            {isAdmin ? t.adminNominationBack : t.back}
          </button>
          <button
            onClick={handleSubmitNomination}
            disabled={submitting || editingCV}
            onMouseEnter={() => !submitting && !editingCV && setHoveredSubmitButton(true)}
            onMouseLeave={() => setHoveredSubmitButton(false)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            style={{
              backgroundColor: (submitting || editingCV) ? '#fde047' : (hoveredSubmitButton ? '#eab308' : '#facc15'),
              color: '#1e40af',
              opacity: (submitting || editingCV) ? 0.5 : 1,
              cursor: (submitting || editingCV) ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? t.submitting : (isAdmin ? t.adminNominationConfirmButton : t.confirmSubmit)}
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Selection Step
  return (
    <div className="space-y-4">
      {/* Job Summary Section - thu nhỏ cỡ chữ */}
      {job && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#dbeafe' }}>
              <Briefcase className="w-6 h-6" style={{ color: '#2563eb' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold mb-1.5" style={{ color: '#111827' }}>{isAdmin ? job.title : pickByLanguage(job.title, job.titleEn || job.title_en, job.titleJp || job.title_jp, language)}</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9px]">
                {(job.company || job.recruitingCompany) && (
                  <div className="flex items-center gap-1.5" style={{ color: '#4b5563' }}>
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{isAdmin ? (job.company?.name || job.recruitingCompany?.companyName) : pickByLanguage((job.recruitingCompany || job.company)?.companyName || (job.company?.name), (job.recruitingCompany || job.company)?.companyNameEn || (job.recruitingCompany || job.company)?.company_name_en, (job.recruitingCompany || job.company)?.companyNameJp || (job.recruitingCompany || job.company)?.company_name_jp, language)}</span>
                  </div>
                )}
                {job.workLocation && (
                  <div className="flex items-center gap-1.5" style={{ color: '#4b5563' }}>
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{job.workLocation}</span>
                  </div>
                )}
                {job.estimatedSalary && (
                  <div className="flex items-center gap-1.5" style={{ color: '#4b5563' }}>
                    <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{job.estimatedSalary}</span>
                  </div>
                )}
                {job.category && (
                  <div className="flex items-center gap-1.5" style={{ color: '#4b5563' }}>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f3f4f6' }}>{isAdmin ? job.category.name : pickByLanguage(job.category.name, job.category.nameEn || job.category.name_en, job.category.nameJp || job.category.name_jp, language)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-xl border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <div className="flex border-b overflow-x-auto" style={{ borderColor: '#e5e7eb' }}>
          <button
            onClick={() => setActiveTab('existing')}
            onMouseEnter={() => activeTab !== 'existing' && setHoveredPaginationButton('existing-tab')}
            onMouseLeave={() => setHoveredPaginationButton(null)}
            className="px-4 py-3 text-[10px] font-medium transition-colors whitespace-nowrap border-b-2"
            style={{
              backgroundColor: activeTab === 'existing' ? '#eff6ff' : hoveredPaginationButton === 'existing-tab' ? '#f9fafb' : 'transparent',
              color: activeTab === 'existing' ? '#1d4ed8' : hoveredPaginationButton === 'existing-tab' ? '#111827' : '#4b5563',
              borderColor: activeTab === 'existing' ? '#1d4ed8' : 'transparent'
            }}
          >
            {isApplicantCandidate
              ? pickByLanguage('Chọn hồ sơ ứng tuyển', 'Choose a profile to apply', '応募するプロフィールを選ぶ', language)
              : t.selectExistingCV || 'Chọn ứng viên có sẵn'}
          </button>
          {/* Ẩn tab CV cập nhật gần nhất và Lịch sử tiến cử */}
          <button
            onClick={() => setActiveTab('recent')}
            onMouseEnter={() => activeTab !== 'recent' && setHoveredPaginationButton('recent-tab')}
            onMouseLeave={() => setHoveredPaginationButton(null)}
            className="px-4 py-3 text-[10px] font-medium transition-colors whitespace-nowrap border-b-2 hidden"
            style={{
              backgroundColor: activeTab === 'recent' ? '#eff6ff' : hoveredPaginationButton === 'recent-tab' ? '#f9fafb' : 'transparent',
              color: activeTab === 'recent' ? '#1d4ed8' : hoveredPaginationButton === 'recent-tab' ? '#111827' : '#4b5563',
              borderColor: activeTab === 'recent' ? '#1d4ed8' : 'transparent'
            }}
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              CV được cập nhật gần nhất
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            onMouseEnter={() => activeTab !== 'history' && setHoveredPaginationButton('history-tab')}
            onMouseLeave={() => setHoveredPaginationButton(null)}
            className="px-4 py-3 text-[10px] font-medium transition-colors whitespace-nowrap border-b-2 hidden"
            style={{
              backgroundColor: activeTab === 'history' ? '#eff6ff' : hoveredPaginationButton === 'history-tab' ? '#f9fafb' : 'transparent',
              color: activeTab === 'history' ? '#1d4ed8' : hoveredPaginationButton === 'history-tab' ? '#111827' : '#4b5563',
              borderColor: activeTab === 'history' ? '#1d4ed8' : 'transparent'
            }}
          >
            <div className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              {t.nominationHistoryTab}
            </div>
          </button>
          {!isApplicantCandidate && (
            <button
              onClick={() => {
                setActiveTab('new');
                if (!isAdmin) setQuickCreateOpen(true);
              }}
              onMouseEnter={() => activeTab !== 'new' && setHoveredPaginationButton('new-tab')}
              onMouseLeave={() => setHoveredPaginationButton(null)}
              className="px-4 py-3 text-[10px] font-medium transition-colors whitespace-nowrap border-b-2"
              style={{
                backgroundColor: activeTab === 'new' ? '#eff6ff' : hoveredPaginationButton === 'new-tab' ? '#f9fafb' : 'transparent',
                color: activeTab === 'new' ? '#1d4ed8' : hoveredPaginationButton === 'new-tab' ? '#111827' : '#4b5563',
                borderColor: activeTab === 'new' ? '#1d4ed8' : 'transparent'
              }}
            >
              {t.createNewCV || 'Tạo hồ sơ mới'}
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {!isApplicantCandidate && !isAdmin && (
            <QuickCreateCandidateDrawer
              open={quickCreateOpen}
              onClose={() => {
                setQuickCreateOpen(false);
                setActiveTab('existing');
              }}
              jobId={jobId}
              onCreated={() => {
                setQuickCreateOpen(false);
                setActiveTab('existing');
                loadCVStorages();
              }}
            />
          )}
          {activeTab === 'existing' ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder={t.searchCV || 'Tìm kiếm ứng viên...'}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  onFocus={() => setFocusedInput('search')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none text-[10px]"
                  style={{
                    borderColor: focusedInput === 'search' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'search' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>

              {/* CV List */}
              {loadingCVs ? (
                <div className="text-center py-8" style={{ color: '#6b7280' }}>
                  {t.loading || 'Đang tải...'}
                </div>
              ) : filteredCVStorages.length === 0 ? (
                <div className="text-center py-8" style={{ color: '#6b7280' }}>
                  {t.noCVFound || 'Không tìm thấy ứng viên nào'}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[420px] overflow-y-auto">
                    {filteredCVStorages.map((cv) => {
                      const canSelect = true;
                      const isHovered = hoveredCVItem === cv.id;
                      const isSelected = selectedCvId === cv.id;
                      const scoreRow = scoreByCvId[String(cv.id)];
                      const rawScore = Number(scoreRow?.score ?? scoreRow?.similarity_score ?? scoreRow?.match_score ?? 0);
                      const scorePercent = Math.max(0, Math.min(100, rawScore <= 1 ? rawScore * 100 : rawScore));
                      const scoreText = scoreRow ? `${Math.round(scorePercent)}%` : '—';
                      const scoreStyle = scorePercent < 60
                        ? { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
                        : scorePercent <= 80
                          ? { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fdba74' }
                          : { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
                      const reasoningText = scoreRow?.reasoning?.vi || scoreRow?.reasoning?.en || scoreRow?.reasoning?.jp || scoreRow?.reasoning || scoreRow?.reason || scoreReasonByCvId[String(cv.id)] || '';
                      const expandedReason = expandedScoreReasonCvId === String(cv.id);
                      return (
                        <div
                          key={cv.id}
                          onClick={() => canSelect && handleSelectCV(cv.id)}
                          onMouseEnter={() => canSelect && setHoveredCVItem(cv.id)}
                          onMouseLeave={() => setHoveredCVItem(null)}
                          className="rounded-xl border p-4 transition-all flex flex-col min-h-0"
                          style={{
                            borderColor: !canSelect ? '#e5e7eb' : isSelected ? '#2563eb' : isHovered ? '#93c5fd' : '#e5e7eb',
                            backgroundColor: !canSelect ? '#f9fafb' : isSelected ? '#eff6ff' : 'white',
                            boxShadow: isHovered && canSelect ? '0 4px 6px -1px rgba(0,0,0,0.08)' : 'none',
                            opacity: !canSelect ? 0.6 : 1,
                            cursor: !canSelect ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0" style={{ backgroundColor: '#2563eb' }}>
                              {cv.name ? cv.name.charAt(0) : '?'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {scoreRow && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold border whitespace-nowrap" style={scoreStyle}>
                                  {scoreText}
                                </span>
                              )}
                              {isSelected && canSelect && (
                                <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#2563eb' }} />
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex-1 min-w-0">
                            <p className="font-semibold text-[11px] truncate" style={{ color: '#111827' }}>{cv.name || 'N/A'}</p>
                            <p className="text-[10px] truncate mt-0.5" style={{ color: '#4b5563' }}>{cv.email || 'N/A'}</p>
                            <p className="text-[9px] mt-1" style={{ color: '#6b7280' }}>{cv.code}</p>
                            {cv.status !== undefined && (
                              <p className="text-[9px] mt-0.5" style={{ color: '#9ca3af' }}>
                                {cv.status === 0 ? 'Draft' : cv.status === 1 ? 'Active' : cv.status === 2 ? 'Archived' : '—'}
                              </p>
                            )}
                            <div className="mt-1.5 space-y-1">
                              {reasoningText && (
                                <div className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] text-blue-800 whitespace-pre-wrap">
                                  {reasoningText}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleScoreReason(cv.id); }}
                                className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap"
                                style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                              >
                                {expandedReason ? 'Ẩn lý do' : 'Xem thêm lý do'}
                              </button>
                            </div>
                            {expandedReason && !reasoningText && (
                              <div className="mt-1.5 text-[9px] whitespace-pre-wrap" style={{ color: '#374151' }}>
                                {scoreReasonLoadingId === String(cv.id) && !scoreReasonByCvId[String(cv.id)]
                                  ? 'Đang tải lý do...'
                                  : (scoreReasonByCvId[String(cv.id)] || 'Không lấy được lý do.')}
                              </div>
                            )}
                          </div>
                          {false && (
                            <div className="mt-2 flex items-center gap-1.5 text-[9px]" style={{ color: '#dc2626' }}>
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>
                                {Number(cv.status) === CV_STATUS_OVERDUE_6_MONTHS
                                  ? (t.overdueCvNominationWarning || t.duplicateCVWarning)
                                  : t.duplicateCVWarning}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isApplicantCandidate && selectedCvId && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t" style={{ borderColor: '#e5e7eb' }}>
                      <button
                        type="button"
                        onClick={() => handleSelectCV(selectedCvId)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold transition-colors"
                        style={{ backgroundColor: '#facc15', color: '#1e3a8a' }}
                      >
                        {pickByLanguage('Tiếp tục với hồ sơ này', 'Continue with this profile', 'このプロフィールで続ける', language)}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: '#e5e7eb' }}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          onMouseEnter={() => currentPage !== 1 && setHoveredPaginationButton('first')}
                          onMouseLeave={() => setHoveredPaginationButton(null)}
                          className="px-2 py-1 border rounded text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: hoveredPaginationButton === 'first' ? '#f9fafb' : 'white',
                            borderColor: '#d1d5db',
                            color: '#374151'
                          }}
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          onMouseEnter={() => currentPage !== 1 && setHoveredPaginationButton('prev')}
                          onMouseLeave={() => setHoveredPaginationButton(null)}
                          className="px-2 py-1 border rounded text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: hoveredPaginationButton === 'prev' ? '#f9fafb' : 'white',
                            borderColor: '#d1d5db',
                            color: '#374151'
                          }}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        {[...Array(Math.min(7, totalPages))].map((_, i) => {
                          // Calculate page numbers to show
                          let pageNum;
                          if (totalPages <= 7) {
                            pageNum = i + 1;
                          } else if (currentPage <= 4) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 3) {
                            pageNum = totalPages - 6 + i;
                          } else {
                            pageNum = currentPage - 3 + i;
                          }
                          
                          if (pageNum < 1 || pageNum > totalPages) return null;
                          
                          const isActive = currentPage === pageNum;
                          const isHovered = hoveredPaginationButton === `page-${pageNum}`;
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              onMouseEnter={() => !isActive && setHoveredPaginationButton(`page-${pageNum}`)}
                              onMouseLeave={() => setHoveredPaginationButton(null)}
                              className="px-3 py-1 rounded text-[10px] font-bold transition-colors"
                              style={{
                                backgroundColor: isActive ? '#2563eb' : isHovered ? '#f9fafb' : 'white',
                                color: isActive ? 'white' : '#374151',
                                border: isActive ? 'none' : '1px solid #d1d5db',
                                borderColor: isActive ? 'transparent' : '#d1d5db'
                              }}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          onMouseEnter={() => currentPage !== totalPages && setHoveredPaginationButton('next')}
                          onMouseLeave={() => setHoveredPaginationButton(null)}
                          className="px-2 py-1 border rounded text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: hoveredPaginationButton === 'next' ? '#f9fafb' : 'white',
                            borderColor: '#d1d5db',
                            color: '#374151'
                          }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          onMouseEnter={() => currentPage !== totalPages && setHoveredPaginationButton('last')}
                          onMouseLeave={() => setHoveredPaginationButton(null)}
                          className="px-2 py-1 border rounded text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: hoveredPaginationButton === 'last' ? '#f9fafb' : 'white',
                            borderColor: '#d1d5db',
                            color: '#374151'
                          }}
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px]" style={{ color: '#4b5563' }}>
                          {t.page || 'Trang'} {currentPage} / {totalPages} ({totalItems} {t.results || 'kết quả'})
                        </span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          onFocus={() => setFocusedSelect('itemsPerPage')}
                          onBlur={() => setFocusedSelect(null)}
                          className="px-2 py-1 border rounded text-[10px]"
                          style={{
                            borderColor: focusedSelect === 'itemsPerPage' ? '#2563eb' : '#d1d5db',
                            boxShadow: focusedSelect === 'itemsPerPage' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                          }}
                        >
                          <option value="10">10 / {t.page || 'trang'}</option>
                          <option value="20">20 / {t.page || 'trang'}</option>
                          <option value="50">50 / {t.page || 'trang'}</option>
                          <option value="100">100 / {t.page || 'trang'}</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : activeTab === 'recent' ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="Tìm kiếm CV được cập nhật gần nhất..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setRecentPage(1);
                  }}
                  onFocus={() => setFocusedInput('recent-search')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-[10px] focus:outline-none"
                  style={{
                    borderColor: focusedInput === 'recent-search' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedInput === 'recent-search' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                />
              </div>

              {/* Recent CVs List */}
              {loadingRecentCVs ? (
                <div className="text-center py-8 text-[10px]" style={{ color: '#6b7280' }}>
                  Đang tải...
                </div>
              ) : recentCVs.length === 0 ? (
                <div className="text-center py-8 text-[10px]" style={{ color: '#6b7280' }}>
                  Không có CV nào được cập nhật gần đây
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {recentCVs.map((cv) => {
                      const canSelect = true;
                      const isHovered = hoveredCVItem === `recent-${cv.id}`;
                      const scoreRow = scoreByCvId[String(cv.id)];
                      const rawScore = Number(scoreRow?.similarity_score ?? 0);
                      const scorePercent = Math.max(0, Math.min(100, rawScore <= 1 ? rawScore * 100 : rawScore));
                      const scoreText = Number.isFinite(scorePercent) ? `${Math.round(scorePercent)}%` : '—';
                      const scoreStyle = scorePercent < 60
                        ? { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
                        : scorePercent <= 80
                          ? { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fdba74' }
                          : { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
                      const expandedReason = expandedScoreReasonCvId === String(cv.id);
                      
                      return (
                        <div
                          key={cv.id}
                          onClick={() => canSelect && handleSelectCV(cv.id)}
                          onMouseEnter={() => canSelect && setHoveredCVItem(`recent-${cv.id}`)}
                          onMouseLeave={() => setHoveredCVItem(null)}
                          className="p-3 border rounded-lg transition-all"
                          style={{
                            borderColor: !canSelect 
                              ? '#e5e7eb' 
                              : selectedCvId === cv.id
                              ? '#2563eb'
                              : isHovered
                              ? '#9ca3af'
                              : '#e5e7eb',
                            backgroundColor: !canSelect 
                              ? '#f9fafb' 
                              : selectedCvId === cv.id
                              ? '#eff6ff'
                              : 'white',
                            opacity: !canSelect ? 0.6 : 1,
                            cursor: !canSelect ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0" style={{ backgroundColor: '#2563eb' }}>
                                {cv.name ? cv.name.charAt(0) : '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[10px] truncate" style={{ color: '#111827' }}>{cv.name || 'N/A'}</p>
                                <p className="text-[10px] truncate" style={{ color: '#4b5563' }}>{cv.email || 'N/A'}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[10px]" style={{ color: '#6b7280' }}>{cv.code}</p>
                                  {cv.updatedAt && (
                                    <>
                                      <span className="text-[10px]" style={{ color: '#9ca3af' }}>•</span>
                                      <span className="text-[10px]" style={{ color: '#6b7280' }}>
                                        Cập nhật: {formatDate(cv.updatedAt)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {scoreRow && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold border whitespace-nowrap" style={scoreStyle}>
                                  {scoreText}
                                </span>
                              )}
                              {selectedCvId === cv.id && canSelect && (
                                <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#2563eb' }} />
                              )}
                              {!canSelect && (
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#f97316' }} />
                              )}
                            </div>
                          </div>
                          <div className="mt-1.5">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleScoreReason(cv.id); }}
                              className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap"
                              style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                            >
                              {expandedReason ? 'Ẩn lý do' : 'Xem lý do'}
                            </button>
                          </div>
                          {expandedReason && (
                            <div className="mt-1.5 text-[9px] whitespace-pre-wrap" style={{ color: '#374151' }}>
                              {scoreReasonLoadingId === String(cv.id) && !scoreReasonByCvId[String(cv.id)]
                                ? 'Đang tải lý do...'
                                : (scoreReasonByCvId[String(cv.id)] || 'Không lấy được lý do.')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {recentTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: '#e5e7eb' }}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setRecentPage(1)}
                          disabled={recentPage === 1}
                          onMouseEnter={() => recentPage !== 1 && setHoveredRecentPaginationButton('first')}
                          onMouseLeave={() => setHoveredRecentPaginationButton(null)}
                          className="px-2 py-1 border rounded text-[10px] font-bold disabled:opacity-50"
                          style={{
                            backgroundColor: hoveredRecentPaginationButton === 'first' ? '#f9fafb' : 'white',
                            borderColor: '#d1d5db',
                            color: '#374151'
                          }}
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRecentPage(recentPage - 1)}
                          disabled={recentPage === 1}
                          onMouseEnter={() => recentPage !== 1 && setHoveredRecentPaginationButton('prev')}
                          onMouseLeave={() => setHoveredRecentPaginationButton(null)}
                          className="px-2 py-1 border rounded text-[10px] font-bold disabled:opacity-50"
                          style={{
                            backgroundColor: hoveredRecentPaginationButton === 'prev' ? '#f9fafb' : 'white',
                            borderColor: '#d1d5db',
                            color: '#374151'
                          }}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] px-2" style={{ color: '#4b5563' }}>
                          Trang {recentPage} / {recentTotalPages}
                        </span>
                        <button
                          onClick={() => setRecentPage(recentPage + 1)}
                          disabled={recentPage === recentTotalPages}
                          onMouseEnter={() => recentPage !== recentTotalPages && setHoveredRecentPaginationButton('next')}
                          onMouseLeave={() => setHoveredRecentPaginationButton(null)}
                          className="px-2 py-1 border rounded text-[10px] font-bold disabled:opacity-50"
                          style={{
                            backgroundColor: hoveredRecentPaginationButton === 'next' ? '#f9fafb' : 'white',
                            borderColor: '#d1d5db',
                            color: '#374151'
                          }}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRecentPage(recentTotalPages)}
                          disabled={recentPage === recentTotalPages}
                          onMouseEnter={() => recentPage !== recentTotalPages && setHoveredRecentPaginationButton('last')}
                          onMouseLeave={() => setHoveredRecentPaginationButton(null)}
                          className="px-2 py-1 border rounded text-[10px] font-bold disabled:opacity-50"
                          style={{
                            backgroundColor: hoveredRecentPaginationButton === 'last' ? '#f9fafb' : 'white',
                            borderColor: '#d1d5db',
                            color: '#374151'
                          }}
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px]" style={{ color: '#4b5563' }}>
                        {recentTotalItems} kết quả
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : activeTab === 'history' ? (
            <div className="space-y-4">
              {/* Search và Filter trạng thái */}
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên ứng viên, công ty..."
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    onFocus={() => setFocusedInput('history-search')}
                    onBlur={() => setFocusedInput(null)}
                    className="w-full pl-9 pr-4 py-2 border rounded-lg text-[10px] focus:outline-none"
                    style={{
                      borderColor: focusedInput === 'history-search' ? '#2563eb' : '#d1d5db',
                      boxShadow: focusedInput === 'history-search' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                    }}
                  />
                </div>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  onFocus={() => setFocusedSelect('history-status')}
                  onBlur={() => setFocusedSelect(null)}
                  className="px-3 py-2 border rounded-lg text-[10px] focus:outline-none min-w-[200px]"
                  style={{
                    borderColor: focusedSelect === 'history-status' ? '#2563eb' : '#d1d5db',
                    boxShadow: focusedSelect === 'history-status' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                >
                  <option value="">Tất cả trạng thái</option>
                  {getJobApplicationStatusOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* History List */}
              {loadingHistory ? (
                <div className="text-center py-8 text-[10px]" style={{ color: '#6b7280' }}>
                  {t.loadingData}
                </div>
              ) : nominationHistory.length === 0 ? (
                <div className="text-center py-8 text-[10px]" style={{ color: '#6b7280' }}>
                  {t.noNominationHistory}
                </div>
              ) : (
                <div className="space-y-2">
                  {nominationHistory.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg"
                      style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}
                    >
                      <p className="font-semibold text-[10px] mb-2" style={{ color: '#111827' }}>
                        Cty {index + 1}: {item.company}
                      </p>
                      <div className="space-y-1.5 pl-2 border-l-2" style={{ borderColor: '#e5e7eb' }}>
                        {item.applications.map((app) => {
                          const statusInfo = app.status ? getJobApplicationStatus(app.status) : null;
                          const getStatusStyle = () => {
                            if (!statusInfo) return { backgroundColor: '#f3f4f6', color: '#1f2937' };
                            if (statusInfo.category === 'success') return { backgroundColor: '#dcfce7', color: '#166534' };
                            if (statusInfo.category === 'rejected' || statusInfo.category === 'cancelled') return { backgroundColor: '#fee2e2', color: '#991b1b' };
                            if (statusInfo.category === 'interview' || statusInfo.category === 'waiting') return { backgroundColor: '#dbeafe', color: '#1e40af' };
                            return { backgroundColor: '#fef9c3', color: '#854d0e' };
                          };
                          const jobTitle = app.job ? pickByLanguage(app.job.title, app.job.titleEn || app.job.title_en, app.job.titleJp || app.job.title_jp, language) : '';
                          return (
                            <div key={app.id} className="text-[10px]" style={{ color: '#4b5563' }}>
                              <span className="font-medium">{app.cv?.name || app.name || 'N/A'}</span>
                              {jobTitle && (
                                <span style={{ color: '#6b7280' }}> - {jobTitle}</span>
                              )}
                              {app.status != null && statusInfo && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px]" style={getStatusStyle()}>
                                  {getJobApplicationStatusLabelByLanguage(app.status, language)}
                                </span>
                              )}
                              <span className="ml-2" style={{ color: '#9ca3af' }}>
                                ({formatDate(app.createdAt)})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : !isApplicantCandidate && isAdmin ? (
            <AddCandidateForm 
              isAdmin={isAdmin}
              jobId={jobId}
              onSuccess={() => navigate(backUrl)}
              onCancel={() => navigate(backUrl)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default NominationPageContent;
