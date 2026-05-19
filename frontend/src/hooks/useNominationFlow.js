import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations/translations';
import { getJobApplicationStatus, getJobApplicationStatusLabelByLanguage, getJobApplicationStatusOptions } from '../utils/jobApplicationStatus';
import { isCvUnavailableForNomination, CV_STATUS_OVERDUE_6_MONTHS } from '../utils/cvStatus';

const pickByLanguage = (viText, enText, jpText, lang) => {
  const normalize = (value) => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      return value?.[lang] || value?.vi || value?.en || value?.ja || value?.value || value?.label || value?.name || value?.title || '';
    }
    return '';
  };
  const vi = normalize(viText);
  const en = normalize(enText);
  const ja = normalize(jpText);
  if (lang === 'en') return en || vi || ja || '';
  if (lang === 'ja') return ja || en || vi || '';
  return vi || en || ja || '';
};

export const useNominationFlow = ({ variant }) => {
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

  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [cvStorages, setCvStorages] = useState([]);
  const [loadingCVs, setLoadingCVs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCvId, setSelectedCvId] = useState(location.state?.selectedCvId || null);
  const [selectedCV, setSelectedCV] = useState(location.state?.selectedCV || null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingCV, setEditingCV] = useState(false);
  const [cvEditData, setCvEditData] = useState({});
  const [savingCV, setSavingCV] = useState(false);
  const [selectedCvFolderPath, setSelectedCvFolderPath] = useState('');
  const [cvFileList, setCvFileList] = useState({ originals: [], templates: [] });
  const [cvFoldersLoading, setCvFoldersLoading] = useState(false);
  const [previewOption, setPreviewOption] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [nominationHistory, setNominationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');
  const [recentCVs, setRecentCVs] = useState([]);
  const [loadingRecentCVs, setLoadingRecentCVs] = useState(false);
  const [recentPage, setRecentPage] = useState(1);
  const [recentTotalItems, setRecentTotalItems] = useState(0);
  const [recentTotalPages, setRecentTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [scoreByCvId, setScoreByCvId] = useState({});
  const [scoreLoading, setScoreLoading] = useState(false);
  const [expandedScoreReasonCvId, setExpandedScoreReasonCvId] = useState(null);
  const [scoreReasonByCvId, setScoreReasonByCvId] = useState({});
  const [scoreReasonLoadingId, setScoreReasonLoadingId] = useState(null);
  const autoSelectedRef = useRef(false);
  const skipApplicantCvSelectDoneRef = useRef(false);

  const normalizeResidenceStatusToDbValue = useCallback((value) => {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return '';
    const map = {
      engineer: '1', ssw: '2', student: '3', pr: '4', spouse: '5', ltr: '6', other: '7', hsp: '8',
      labor_skill: '9', dependent: '10', short: '11', ict: '12', entertainer: '13', titp: '14', prspouse: '15',
      '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10', '11': '11', '12': '12', '13': '13', '14': '14', '15': '15',
    };
    return map[raw] || raw;
  }, []);

  const loadAdminProfile = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await apiService.getAdminProfile();
      const profile = response?.data?.admin || response?.data?.user || response?.admin || null;
      setAdminProfile(profile);
    } catch {
      setAdminProfile(null);
    }
  }, [isAdmin]);

  const loadJobDetail = async () => {
    try {
      setLoadingJob(true);
      const response = isAdmin
        ? await apiService.getAdminJobById(jobId)
        : isApplicantCandidate
          ? await apiService.getApplicantJobById(jobId)
          : await apiService.getJobById(jobId);
      if (response.success && response.data?.job) setJob(response.data.job);
    } finally {
      setLoadingJob(false);
    }
  };

  const loadCVStorages = async () => {
    try {
      setLoadingCVs(true);
      if (isApplicantCandidate) {
        const response = await apiService.getApplicantMyCVs();
        const list = response?.data?.cvs || [];
        setCvStorages(list);
        setTotalItems(list.length);
        setTotalPages(1);
        return;
      }
      const params = { page: currentPage, limit: itemsPerPage };
      if (searchTerm) params.search = searchTerm;
      if (!isAdmin) params.isDuplicate = '0';
      if (isAdmin) {
        const adminId = adminProfile?.id || adminProfile?.adminId || adminProfile?.userId || adminProfile?.staffId;
        if (adminId != null && String(adminId).trim() !== '') {
          params.adminId = String(adminId);
        }
        params.onlyMyManaged = '1';
        params.sortBy = 'updatedAt';
        params.sortOrder = 'desc';
      }
      const response = isAdmin ? await apiService.getAdminCVs(params) : await apiService.getCVStorages(params);
      if (response.success && response.data) {
        setCvStorages(response.data.cvs || []);
        setTotalItems(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.totalPages || 0);
      }
    } finally {
      setLoadingCVs(false);
    }
  };

  const handleSelectCV = async (cvId) => {
    setLoadingJob(true);
    try {
      const cvResponse = isAdmin
        ? await apiService.getAdminCVById(cvId)
        : isApplicantCandidate
          ? await apiService.getApplicantMyCVById(cvId)
          : await apiService.getCVStorageById(cvId);
      if (!cvResponse.success || !cvResponse.data?.cv) return false;
      const cv = cvResponse.data.cv;
      if (!isAdmin && !isApplicantCandidate && isCvUnavailableForNomination(cv)) return false;
      setSelectedCvId(cvId);
      setSelectedCV(cv);
      setCvEditData({
        name: cv.name || cv.fullName || '',
        furigana: cv.furigana || '',
        email: cv.email || '',
        phone: cv.phone || '',
        birthDate: cv.birthDate || '',
        age: cv.ages || cv.age || '',
        gender: cv.gender?.toString() || '',
        addressCurrent: cv.addressCurrent || cv.address || '',
        currentIncome: cv.currentIncome || cv.currentSalary || '',
        desiredIncome: cv.desiredIncome || cv.desiredSalary || '',
        desiredWorkLocation: cv.desiredWorkLocation || cv.desiredLocation || '',
        nyushaTime: cv.nyushaTime || '',
        jpLevel: cv.jpLevel || cv.japaneseLevel || cv.n5Level || cv.languageLevelJp || cv.jlptLevel || '',
        jpResidenceStatus: normalizeResidenceStatusToDbValue(cv.jpResidenceStatus || cv.jp_residence_status || cv.residenceStatus || cv.residence_status || ''),
        jobCategoryId: cv.jobCategoryId || cv.job_category_id || cv.jobCategory?.id || '',
        jobCategoryName: cv.jobCategoryName || cv.jobCategory?.name || cv.job_category_name || cv.categoryName || '',
        experienceYears: cv.experienceYears || cv.yearsOfExperience || cv.experienceYear || '',
        strengths: cv.strengths || '',
        motivation: cv.motivation || '',
      });
      return true;
    } finally {
      setLoadingJob(false);
    }
  };

  useEffect(() => {
    loadJobDetail();
    loadAdminProfile();
  }, [jobId, loadAdminProfile]);
  useEffect(() => { if (isApplicantCandidate) setSelectedCvFolderPath(''); }, [jobId, isApplicantCandidate]);

  useEffect(() => {
    if (!location.state?.preselectCvId || autoSelectedRef.current) return;
    autoSelectedRef.current = true;
    handleSelectCV(Number(location.state.preselectCvId));
  }, [location.state?.preselectCvId]);

  useEffect(() => {
    if (!selectedCV) return;
    const originalFolderPath = selectedCV.cvOriginalPath || null;
    const templateFolderPath = selectedCV.curriculumVitae || null;
    const path = originalFolderPath || templateFolderPath || '';
    setSelectedCvFolderPath(path ? String(path).replace(/\/+$/, '') : '');
    const loadFiles = async () => {
      try {
        setCvFoldersLoading(true);
        const data = isApplicantCandidate
          ? await apiService.getApplicantCVFileList(selectedCvId)
          : isAdmin
            ? await apiService.getAdminCVFileList(selectedCvId)
            : await apiService.getCtvCVFileList(selectedCvId);
        setCvFileList(data || { originals: [], templates: [] });
      } catch {
        setCvFileList({ originals: [], templates: [] });
      } finally {
        setCvFoldersLoading(false);
      }
    };
    loadFiles();
  }, [selectedCV, selectedCvId, isAdmin, isApplicantCandidate]);

  useEffect(() => {
    if (selectedCV || !isApplicantCandidate) return;
    if (loadingCVs) return;
    if ((cvStorages || []).length === 0) return;
    if (skipApplicantCvSelectDoneRef.current) return;
    skipApplicantCvSelectDoneRef.current = true;
    handleSelectCV(cvStorages[0].id);
  }, [cvStorages, loadingCVs, isApplicantCandidate, selectedCV]);

  useEffect(() => {
    if (!selectedCV) return;
    if (isApplicantCandidate) return;
  }, [selectedCV, isApplicantCandidate]);

  const filteredCVStorages = useMemo(() => {
    if (isApplicantCandidate) return cvStorages;
    return (cvStorages || []).filter((cv) => !isCvUnavailableForNomination(cv));
  }, [cvStorages, isApplicantCandidate]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try { return new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch { return dateString; }
  };

  const formatGender = (gender) => {
    if (gender === '1' || gender === 1) return isAdmin ? t.genderMale : 'Nam';
    if (gender === '2' || gender === 2) return isAdmin ? t.genderFemale : 'Nữ';
    return '—';
  };

  const loadRecentCVs = async () => {
    try {
      setLoadingRecentCVs(true);
      const params = { page: recentPage, limit: itemsPerPage, sortBy: 'updatedAt', sortOrder: 'desc', isDuplicate: '0' };
      if (searchTerm) params.search = searchTerm;
      const response = await apiService.getRecentUpdatedCVs(params);
      if (response.success && response.data) {
        setRecentCVs(response.data.cvs || []);
        setRecentTotalItems(response.data.pagination?.total || 0);
        setRecentTotalPages(response.data.pagination?.totalPages || 0);
      }
    } finally { setLoadingRecentCVs(false); }
  };

  const loadNominationHistory = async () => {
    try {
      setLoadingHistory(true);
      const params = { limit: 100 };
      if (historySearchTerm) params.search = historySearchTerm;
      if (historyStatusFilter) params.status = historyStatusFilter;
      const response = await apiService.getJobApplications(params);
      if (response.success && response.data) {
        const grouped = {};
        (response.data.jobApplications || []).forEach((app) => {
          const rc = app.job?.recruitingCompany || app.job?.company;
          const companyName = pickByLanguage(rc?.companyName || rc?.name, rc?.companyNameEn || rc?.company_name_en, rc?.companyNameJp || rc?.company_name_jp, language) || 'N/A';
          if (!grouped[companyName]) grouped[companyName] = [];
          grouped[companyName].push(app);
        });
        setNominationHistory(Object.entries(grouped).map(([company, apps]) => ({ company, applications: apps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) })).sort((a, b) => b.applications.length - a.applications.length));
      }
    } finally { setLoadingHistory(false); }
  };

  const toggleScoreReason = async (cvIdNum) => {
    const key = String(cvIdNum);
    if (expandedScoreReasonCvId === key) return setExpandedScoreReasonCvId(null);
    setExpandedScoreReasonCvId(key);
    if (scoreReasonByCvId[key]) return;
    setScoreReasonLoadingId(key);
    try {
      const res = await apiService.getAiMatchingReasons({ jd_id: Number(jobId), candidate_id: Number(cvIdNum), lang: language });
      const reason = res?.matching_reasons?.reason ?? res?.data?.matching_reasons?.reason ?? '';
      setScoreReasonByCvId((prev) => ({ ...prev, [key]: String(reason || 'Không lấy được lý do.').trim() }));
    } catch (e) {
      setScoreReasonByCvId((prev) => ({ ...prev, [key]: e?.message || 'Không lấy được lý do.' }));
    } finally { setScoreReasonLoadingId(null); }
  };

  const loadScoreForCvs = useCallback(async (cvIds) => {
    const ids = (Array.isArray(cvIds) ? cvIds : []).map((id) => String(id)).filter(Boolean);
    if (!jobId || !ids.length) {
      setScoreByCvId({});
      setScoreReasonByCvId({});
      return;
    }
    setScoreLoading(true);
    try {
      const raw = await apiService.getAiMatchScoreForJobCv({ job_id: Number(jobId), top_k: ids.length, cv_ids: ids });
      const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : Array.isArray(raw?.data?.items) ? raw.data.items : [];
      const next = {};
      const reasons = {};
      rows.forEach((row) => {
        const id = row?.id ?? row?.cv_id ?? row?.cvId;
        if (id == null) return;
        next[String(id)] = row;
        const reasoning = row?.reasoning ?? row?.matching_reasons ?? null;
        const reason = typeof reasoning === 'object'
          ? reasoning?.vi || reasoning?.en || reasoning?.jp || ''
          : row?.reason || row?.matching_reason || '';
        if (reason) reasons[String(id)] = String(reason).trim();
      });
      setScoreByCvId(next);
      setScoreReasonByCvId((prev) => ({ ...prev, ...reasons }));
    } catch {
      setScoreByCvId({});
    } finally {
      setScoreLoading(false);
    }
  }, [jobId]);

  const refreshSelectedCV = useCallback(async () => {
    if (!selectedCvId) return null;
    const cvResponse = isAdmin
      ? await apiService.getAdminCVById(selectedCvId)
      : await apiService.getCVStorageById(selectedCvId);
    if (!cvResponse.success || !cvResponse.data?.cv) return null;
    const cv = cvResponse.data.cv;
    setSelectedCV(cv);
    setCvEditData({
      name: cv.name || cv.fullName || '',
      furigana: cv.furigana || '',
      email: cv.email || '',
      phone: cv.phone || '',
      birthDate: cv.birthDate || '',
      age: cv.ages || cv.age || '',
      gender: cv.gender?.toString() || '',
      addressCurrent: cv.addressCurrent || cv.address || '',
      currentIncome: cv.currentIncome || cv.currentSalary || '',
      desiredIncome: cv.desiredIncome || cv.desiredSalary || '',
      desiredWorkLocation: cv.desiredWorkLocation || cv.desiredLocation || '',
      nyushaTime: cv.nyushaTime || '',
      jpResidenceStatus: cv.jpResidenceStatus || cv.jp_residence_status || cv.residenceStatus || cv.residence_status || '',
      strengths: cv.strengths || '',
      motivation: cv.motivation || '',
    });
    return cv;
  }, [selectedCvId, isAdmin]);

  const handleSaveCVEdit = async () => {
    if (!selectedCvId || isApplicantCandidate) return;
    setSavingCV(true);
    try {
      const formData = new FormData();
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
      formData.append('experienceYears', cvEditData.experienceYears || '');
      formData.append('jpLevel', cvEditData.jpLevel || '');
      formData.append('jpResidenceStatus', normalizeResidenceStatusToDbValue(cvEditData.jpResidenceStatus || ''));
      formData.append('jobCategoryId', cvEditData.jobCategoryId || '');
      formData.append('jobCategoryName', cvEditData.jobCategoryName || '');
      formData.append('strengths', cvEditData.strengths || '');
      formData.append('motivation', cvEditData.motivation || '');
      const response = isAdmin ? await apiService.updateAdminCV(selectedCvId, formData) : await apiService.updateCVStorage(selectedCvId, formData);
      if (!response.success) return false;
      const refreshed = await refreshSelectedCV();
      if (refreshed) {
        const path = refreshed.cvOriginalPath || refreshed.curriculumVitae || '';
        if (path) setSelectedCvFolderPath(String(path).replace(/\/+$/, ''));
      }
      return true;
    } finally { setSavingCV(false); }
  };

  const handleSubmitNomination = async (overrides = {}) => {
    let currentCV = overrides.selectedCV || selectedCV;
    let currentCvPath = overrides.selectedCvFolderPath || selectedCvFolderPath;
    const shouldSaveCV = Boolean(overrides.forceSaveCVEdit);
    if (!currentCV || !jobId) return { success: false };
    setSubmitting(true);
    try {
      if (!isApplicantCandidate && shouldSaveCV && (editingCV || Object.keys(cvEditData || {}).length > 0)) {
        const saved = await handleSaveCVEdit();
        if (saved === false) {
          return { success: false, message: 'Không thể cập nhật hồ sơ trước khi tiến cử' };
        }
        const refreshed = await refreshSelectedCV();
        if (refreshed) {
          currentCV = refreshed;
          currentCvPath = refreshed.cvOriginalPath || refreshed.curriculumVitae || currentCvPath;
        }
      }
      const resolvedCurrentPath = currentCvPath || currentCV.cvOriginalPath || currentCV.curriculumVitae || '';
      if (resolvedCurrentPath) currentCvPath = String(resolvedCurrentPath).trim();
      if (isApplicantCandidate) {
        const payload = { jobId: Number(jobId), cvId: currentCV.id };
        const resolvedApplicantPath = currentCvPath || currentCV.cvOriginalPath || currentCV.curriculumVitae || '';
        if (resolvedApplicantPath) payload.cvPath = String(resolvedApplicantPath).trim();
        return await apiService.createApplicantJobApplication(payload);
      }
      if (isAdmin) {
        // Admin job applications do not need cvPath; sending a stale path can trigger backend validation errors.
        const payload = { jobId: parseInt(jobId), cvCode: currentCV.code || currentCV.id?.toString() || '' };
        return await apiService.createAdminJobApplication(payload);
      }
      const cvData = editingCV ? cvEditData : {
        name: currentCV.name || '', furigana: currentCV.furigana || '', email: currentCV.email || '', phone: currentCV.phone || '',
        birthDate: currentCV.birthDate || '', ages: currentCV.ages || currentCV.age || '', gender: currentCV.gender?.toString() || '',
        addressCurrent: currentCV.addressCurrent || currentCV.address || '', currentIncome: currentCV.currentIncome || '', desiredIncome: currentCV.desiredIncome || '',
        desiredWorkLocation: currentCV.desiredWorkLocation || '', nyushaTime: currentCV.nyushaTime || '',
        jpLevel: currentCV.jpLevel || currentCV.japaneseLevel || currentCV.n5Level || currentCV.languageLevelJp || currentCV.jlptLevel || '',
        jpResidenceStatus: normalizeResidenceStatusToDbValue(currentCV.jpResidenceStatus || currentCV.jp_residence_status || currentCV.residenceStatus || currentCV.residence_status || ''),
        jobCategoryId: currentCV.jobCategoryId || currentCV.job_category_id || currentCV.jobCategory?.id || '',
        jobCategoryName: currentCV.jobCategoryName || currentCV.jobCategory?.name || currentCV.job_category_name || currentCV.categoryName || '',
        experienceYears: currentCV.experienceYears || currentCV.yearsOfExperience || currentCV.experienceYear || '',
        strengths: currentCV.strengths || '', motivation: currentCV.motivation || '',
      };
      const payload = {
        jobId: String(jobId || ''), cvId: currentCV.id, cvCode: currentCV.code || '',
        ...(currentCvPath ? { cvPath: String(currentCvPath).trim() } : {}),
        name: cvData.name, furigana: cvData.furigana, email: cvData.email, phone: cvData.phone, addressCurrent: cvData.addressCurrent,
        birthDate: cvData.birthDate, ages: cvData.ages || cvData.age || '', gender: cvData.gender, currentIncome: cvData.currentIncome,
        desiredIncome: cvData.desiredIncome, desiredWorkLocation: cvData.desiredWorkLocation, nyushaTime: cvData.nyushaTime,
        experienceYears: cvData.experienceYears || '', jpResidenceStatus: cvData.jpResidenceStatus || '',
        jobCategoryId: cvData.jobCategoryId || '', jobCategoryName: cvData.jobCategoryName || '',
        selfPromotion: cvData.strengths, reasonApply: cvData.motivation, cvType: 1,
      };
      return await apiService.createJobApplication(payload);
    } finally { setSubmitting(false); }
  };

  return {
    isAdmin,
    isApplicantCandidate,
    jobId,
    language,
    t,
    backUrl,
    job,
    loadingJob,
    cvStorages,
    loadingCVs,
    searchTerm,
    setSearchTerm,
    selectedCvId,
    selectedCV,
    submitting,
    editingCV,
    setEditingCV,
    cvEditData,
    setCvEditData,
    savingCV,
    selectedCvFolderPath,
    setSelectedCvFolderPath,
    cvFileList,
    cvFoldersLoading,
    previewOption,
    setPreviewOption,
    previewUrl,
    setPreviewUrl,
    nominationHistory,
    loadingHistory,
    historySearchTerm,
    setHistorySearchTerm,
    historyStatusFilter,
    setHistoryStatusFilter,
    recentCVs,
    loadingRecentCVs,
    recentPage,
    setRecentPage,
    recentTotalItems,
    recentTotalPages,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalItems,
    totalPages,
    scoreByCvId,
    scoreLoading,
    expandedScoreReasonCvId,
    scoreReasonByCvId,
    scoreReasonLoadingId,
    handleSelectCV,
    handleSaveCVEdit,
    refreshSelectedCV,
    handleSubmitNomination,
    loadCVStorages,
    loadRecentCVs,
    loadNominationHistory,
    loadScoreForCvs,
    toggleScoreReason,
    filteredCVStorages,
    formatDate,
    formatGender,
    pickByLanguage: (vi, en, ja) => pickByLanguage(vi, en, ja, language),
    getStatusOptions: getJobApplicationStatusOptions,
    getStatusInfo: getJobApplicationStatus,
    getStatusLabelByLanguage: getJobApplicationStatusLabelByLanguage,
    isCvUnavailableForNomination,
    CV_STATUS_OVERDUE_6_MONTHS,
    navigate,
    location,
  };
};
