import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';
import { getJobApplicationStatus, getJobApplicationStatusOptionsByLanguage, getJobApplicationStatusLabelByLanguage, isRejectionOrCancelledStatus } from '../../utils/jobApplicationStatus';
import { CV_STATUS_DUPLICATE } from '../../utils/cvStatus';
import {
  Search,
  ExternalLink,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Briefcase,
  User,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Plus,
  Send,
} from 'lucide-react';

const JOB_TITLE_MAX = 48;
const truncate = (str, max) => (str && str.length > max ? str.slice(0, max) + '…' : str || '—');
const STATUSES_REQUIRE_REJECTION = [4, 6, 10, 13, 16];
const STATUS_INTERVIEW_SCHEDULE = 8;

const pickByLanguageFields = (viText, enText, jpText, lang) => {
  if (lang === 'en') return enText || viText || '—';
  if (lang === 'ja') return jpText || enText || viText || '—';
  return viText || enText || jpText || '—';
};

const NOMINATIONS_LIST_STORAGE_PREFIX = 'wsj_nominations_list_v1';

const readNominationsListSession = (storageKey) => {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Shared nominations list for Admin, Agent (CTV), or Applicant (embedded on profile).
 * Agent ẩn cột Admin phụ trách và nút Memo. Applicant: API riêng, ẩn ô tìm kiếm (chưa lọc server).
 * @param {'admin'|'agent'|'applicant'} variant
 * @param {string} [embeddedPrefix] - Base path khi variant applicant, ví dụ /landing/candidate
 */
const NominationsPageContent = ({ variant = 'admin', embeddedPrefix = '/candidate' }) => {
  const isAdmin = variant === 'admin';
  const isApplicant = variant === 'applicant';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const pickByLanguage = (item, fieldBase = 'title') => {
    if (!item) return '';
    const vi = item[fieldBase] || '';
    const en = item[`${fieldBase}En`] || '';
    const ja = item[`${fieldBase}Jp`] || '';
    if (language === 'en') return en || vi;
    if (language === 'ja') return ja || vi;
    return vi;
  };
  const basePath = isAdmin ? '/admin' : isApplicant ? embeddedPrefix : '/agent';

  const nominationsListStorageKey = useMemo(() => {
    if (variant === 'applicant') {
      const safe = String(embeddedPrefix || '').replace(/[^a-zA-Z0-9/_-]/g, '_');
      return `${NOMINATIONS_LIST_STORAGE_PREFIX}_applicant_${safe || 'default'}`;
    }
    return `${NOMINATIONS_LIST_STORAGE_PREFIX}_${variant}`;
  }, [variant, embeddedPrefix]);

  const nominationsListSnap = useMemo(
    () => readNominationsListSession(nominationsListStorageKey),
    [nominationsListStorageKey]
  );
  const persistNominationsTimerRef = useRef(null);
  const pageRootRef = useRef(null);

  /** Admin: filter synced to URL (?cvStorageStatus=3) so Back/refresh keeps state */
  const filterCvDuplicateNominations =
    isAdmin && searchParams.get('cvStorageStatus') === String(CV_STATUS_DUPLICATE);
  const adminNominationsListQs = isAdmin ? (location.search || '') : '';

  const [adminProfile, setAdminProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState(() =>
    typeof nominationsListSnap?.searchQuery === 'string' ? nominationsListSnap.searchQuery : ''
  );
  const [statusFilter, setStatusFilter] = useState(() =>
    nominationsListSnap?.statusFilter != null && nominationsListSnap?.statusFilter !== ''
      ? String(nominationsListSnap.statusFilter)
      : ''
  );
  const [dateFrom, setDateFrom] = useState(() =>
    typeof nominationsListSnap?.dateFrom === 'string' ? nominationsListSnap.dateFrom : ''
  );
  const [dateTo, setDateTo] = useState(() =>
    typeof nominationsListSnap?.dateTo === 'string' ? nominationsListSnap.dateTo : ''
  );
  const [sortBy, setSortBy] = useState(() =>
    typeof nominationsListSnap?.sortBy === 'string' && nominationsListSnap.sortBy
      ? nominationsListSnap.sortBy
      : 'applied_at'
  );
  const [sortOrder, setSortOrder] = useState(() =>
    nominationsListSnap?.sortOrder === 'ASC' || nominationsListSnap?.sortOrder === 'DESC'
      ? nominationsListSnap.sortOrder
      : 'DESC'
  );
  const [currentPage, setCurrentPage] = useState(() => {
    const p = Number(nominationsListSnap?.currentPage);
    return p > 0 ? p : 1;
  });
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const n = Number(nominationsListSnap?.itemsPerPage);
    return n > 0 ? n : 20;
  });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [nominations, setNominations] = useState([]);
  /** Agent: raw từ getJobApplications */
  const [rawJobApplications, setRawJobApplications] = useState([]);
  const [agentLoadError, setAgentLoadError] = useState(null);
  const [unreadByJobApplication, setUnreadByJobApplication] = useState({});
  const [loading, setLoading] = useState(true);
  const [matchingByNominationId, setMatchingByNominationId] = useState({});
  const [loadingMatching, setLoadingMatching] = useState(false);
  const [bulkDeletingDuplicateNominations, setBulkDeletingDuplicateNominations] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });

  /** Chế độ xem: 'myAssigned' = chỉ đơn được phân công cho mình (BackOffice mặc định); 'all' = toàn bộ (chỉ sửa được đơn của mình) */
  const [viewMode, setViewMode] = useState(() =>
    nominationsListSnap?.viewMode === 'all' || nominationsListSnap?.viewMode === 'myAssigned'
      ? nominationsListSnap.viewMode
      : 'myAssigned'
  );
  
  // Filter dropdowns (pill style như CollaboratorsPage)
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  // Hover states
  const [hoveredResetButton, setHoveredResetButton] = useState(false);
  const [hoveredAddNominationButton, setHoveredAddNominationButton] = useState(false);
  const [hoveredPaginationNavButton, setHoveredPaginationNavButton] = useState(null);
  const [hoveredPaginationButtonIndex, setHoveredPaginationButtonIndex] = useState(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredIdLinkIndex, setHoveredIdLinkIndex] = useState(null);
  const [hoveredCandidateLinkIndex, setHoveredCandidateLinkIndex] = useState(null);
  const [hoveredJobLinkIndex, setHoveredJobLinkIndex] = useState(null);
  const [hoveredCollaboratorLinkIndex, setHoveredCollaboratorLinkIndex] = useState(null);
  const [hoveredViewButtonIndex, setHoveredViewButtonIndex] = useState(null);
  const [hoveredEditButtonIndex, setHoveredEditButtonIndex] = useState(null);
  const [hoveredDeleteButtonIndex, setHoveredDeleteButtonIndex] = useState(null);

  const [hoveredMemoButtonIndex, setHoveredMemoButtonIndex] = useState(null);

  // Phân công admin phụ trách
  const [admins, setAdmins] = useState([]);
  const [assigningMap, setAssigningMap] = useState({});

  // Trạng thái thay đổi inline
  const [statusChangeModal, setStatusChangeModal] = useState(false);
  const [statusChangeNomination, setStatusChangeNomination] = useState(null);
  const [statusChangeNewStatus, setStatusChangeNewStatus] = useState(null);
  const [statusChangeRejectNote, setStatusChangeRejectNote] = useState('');
  const [statusChangePaymentAmount, setStatusChangePaymentAmount] = useState('');
  const [statusChangeInterviewDate, setStatusChangeInterviewDate] = useState('');
  const [statusChangeInterviewTime, setStatusChangeInterviewTime] = useState('');
  const [statusChangeUpdating, setStatusChangeUpdating] = useState(false);

  const STATUS_PAID = 15;

  const resetStatusChangeModal = () => {
    setStatusChangeModal(false);
    setStatusChangeNomination(null);
    setStatusChangeNewStatus(null);
    setStatusChangeRejectNote('');
    setStatusChangePaymentAmount('');
    setStatusChangeInterviewDate('');
    setStatusChangeInterviewTime('');
  };

  // Memo panel state
  const [memoPanelOpen, setMemoPanelOpen] = useState(false);
  const [memoPanelNomination, setMemoPanelNomination] = useState(null);
  const [memos, setMemos] = useState([]);
  const [loadingMemos, setLoadingMemos] = useState(false);
  const [memoError, setMemoError] = useState(null);
  const [memoNote, setMemoNote] = useState('');
  const [memoJobSearch, setMemoJobSearch] = useState('');
  const [memoJobResults, setMemoJobResults] = useState([]);
  const [memoJobsLoading, setMemoJobsLoading] = useState(false);
  const [selectedMemoJobs, setSelectedMemoJobs] = useState([]);
  const [showMemoJobDropdown, setShowMemoJobDropdown] = useState(false);
  const [hoveredMemoJobIndex, setHoveredMemoJobIndex] = useState(null);
  const [savingMemo, setSavingMemo] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState(null);
  const [deletingMemoId, setDeletingMemoId] = useState(null);

  useEffect(() => {
    if (isAdmin) loadAdminProfile();
  }, [isAdmin]);

  useEffect(() => {
    loadNominations();
  }, [currentPage, itemsPerPage, statusFilter, filterCvDuplicateNominations, dateFrom, dateTo, sortBy, sortOrder, viewMode, adminProfile?.id, searchQuery, isApplicant]);

  useEffect(() => {
    if (persistNominationsTimerRef.current) clearTimeout(persistNominationsTimerRef.current);
    persistNominationsTimerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(
          nominationsListStorageKey,
          JSON.stringify({
            searchQuery,
            statusFilter,
            dateFrom,
            dateTo,
            sortBy,
            sortOrder,
            viewMode,
            itemsPerPage,
            currentPage,
          })
        );
      } catch {
        // ignore
      }
    }, 250);
    return () => {
      if (persistNominationsTimerRef.current) clearTimeout(persistNominationsTimerRef.current);
    };
  }, [
    nominationsListStorageKey,
    searchQuery,
    statusFilter,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    viewMode,
    itemsPerPage,
    currentPage,
  ]);

  const loadAdminProfile = async () => {
    try {
      const response = await apiService.getAdminProfile();
      if (response.success && response.data) {
        const admin = response.data.admin || response.data;
        setAdminProfile(admin);
        // Super Admin mặc định xem toàn bộ; BackOffice mặc định chỉ đơn được phân công
        if (admin?.role === 1) {
          setViewMode('all');
        }
        // Nếu là Super Admin thì load danh sách AdminBackOffice để phân công
        const role = admin?.role;
        if (role === 1) {
          const adminsRes = await apiService.getAdmins({ role: 2, status: 1 });
          if (adminsRes.success && adminsRes.data) {
            setAdmins(adminsRes.data.admins || []);
          }
        }
      }
    } catch (error) {
      console.error('Error loading admin profile:', error);
    }
  };

  const loadNominations = async () => {
    const getNearestScrollableParent = (startNode) => {
      let el = startNode;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY || '';
        if ((overflowY.includes('auto') || overflowY.includes('scroll')) && el.scrollHeight > el.clientHeight) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
    const scrollContainer = isMobileViewport ? getNearestScrollableParent(pageRootRef.current) : null;
    const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : null;
    const restoreScrollPosition = () => {
      if (!scrollContainer || typeof savedScrollTop !== 'number') return;
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = savedScrollTop;
      });
    };

    if (isAdmin) {
      if (viewMode === 'myAssigned' && !adminProfile?.id) {
        setLoading(false);
        restoreScrollPosition();
        return;
      }
      try {
        setLoading(true);
        const params = {
          page: currentPage,
          limit: itemsPerPage,
          sortBy: sortBy === 'candidate_name' ? 'applied_at' : (sortBy || 'applied_at'),
          sortOrder: sortOrder || 'DESC'
        };
        if (searchQuery) params.search = searchQuery;
        if (statusFilter) params.status = statusFilter;
        if (filterCvDuplicateNominations) params.cvStorageStatus = CV_STATUS_DUPLICATE;
        if (dateFrom) params.appliedAt = dateFrom;
        if (viewMode === 'myAssigned' && adminProfile?.id) params.adminResponsibleId = adminProfile.id;

        const [response, unreadMap] = await Promise.all([
          apiService.getAdminJobApplications(params),
          apiService.getAdminUnreadByJobApplication().catch(() => ({}))
        ]);
        if (response.success && response.data) {
          let list = response.data.jobApplications || response.data.applications || [];
          if (sortBy === 'candidate_name' && list.length > 0) {
            const nameA = (a) => (a.cv?.name || a.name || '').toLowerCase();
            list = [...list].sort((a, b) => {
              const cmp = nameA(a).localeCompare(nameA(b));
              return sortOrder === 'ASC' ? cmp : -cmp;
            });
          }
          setNominations(list);
          setPagination(response.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 });
          setUnreadByJobApplication(unreadMap || {});
        }
      } catch (error) {
        console.error('Error loading nominations:', error);
        setNominations([]);
      } finally {
        setLoading(false);
        restoreScrollPosition();
      }
      return;
    }

    if (isApplicant) {
      try {
        setLoading(true);
        setAgentLoadError(null);
        const params = {
          page: currentPage,
          limit: itemsPerPage,
          sortBy: sortBy === 'candidate_name' ? 'appliedAt' : sortBy || 'appliedAt',
          sortOrder: sortOrder || 'DESC',
        };
        if (statusFilter) params.status = statusFilter;
        if (dateFrom) params.appliedFrom = dateFrom;
        if (dateTo) params.appliedTo = dateTo;

        const response = await apiService.getApplicantJobApplications(params);
        if (response.success && response.data) {
          setRawJobApplications(response.data.jobApplications || []);
          setPagination(response.data.pagination || { total: 0, page: currentPage, limit: itemsPerPage, totalPages: 1 });
          setUnreadByJobApplication({});
        } else {
          setAgentLoadError(response.message || t.errorLoadNominations);
          setRawJobApplications([]);
        }
      } catch (err) {
        console.error('Error loading nominations:', err);
        setAgentLoadError(err.message || t.errorLoadNominationsGeneric);
        setRawJobApplications([]);
      } finally {
        setLoading(false);
        restoreScrollPosition();
      }
      return;
    }

    // Agent: getJobApplications
    try {
      setLoading(true);
      setAgentLoadError(null);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'applied_at',
        sortOrder: 'DESC'
      };
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.appliedFrom = dateFrom;
      if (dateTo) params.appliedTo = dateTo;
      if (searchQuery) params.search = searchQuery;

      const [response, unreadMap] = await Promise.all([
        apiService.getJobApplications(params),
        apiService.getCTVUnreadByJobApplication().catch(() => ({}))
      ]);
      if (response.success && response.data) {
        const jobApplications = response.data.jobApplications || [];
        console.log('[CTV nominations] jobApplications response', jobApplications.map((item) => ({
          id: item?.id,
          jobId: item?.jobId,
          jobTitle: item?.job?.title,
          recruitingCompany: item?.job?.recruitingCompany,
          recruitingCompanyName: item?.job?.recruitingCompanyName,
          recruitingCompanyNameEn: item?.job?.recruitingCompanyNameEn,
          recruitingCompanyNameJp: item?.job?.recruitingCompanyNameJp,
          company: item?.job?.company,
        })));
        setRawJobApplications(jobApplications);
        setPagination(response.data.pagination || { total: 0, page: currentPage, limit: itemsPerPage, totalPages: 1 });
        setUnreadByJobApplication(unreadMap || {});
      } else {
        setAgentLoadError(response.message || t.errorLoadNominations);
        setRawJobApplications([]);
      }
    } catch (err) {
      console.error('Error loading nominations:', err);
      setAgentLoadError(err.message || t.errorLoadNominationsGeneric);
      setRawJobApplications([]);
    } finally {
      setLoading(false);
      restoreScrollPosition();
    }
  };

  /** Bucket UI (màu/icon) — bám theo category trong utils/jobApplicationStatus.js (đồng bộ backend constants) */
  const mapAgentStatus = (status) => {
    const statusInfo = getJobApplicationStatus(status);
    let key = 'pending';
    if (statusInfo.category === 'success') key = 'accepted';
    else if (statusInfo.category === 'rejected' || statusInfo.category === 'cancelled') key = 'rejected';
    else if (statusInfo.category === 'interview') key = 'interviewed';
    else if (statusInfo.category === 'waiting') key = 'waiting';
    else if (statusInfo.category === 'processing') key = 'processing';
    return { key, label: statusInfo.label, color: statusInfo.color };
  };

  const agentMappedNominations = useMemo(() => {
    if (isAdmin) return [];
    const getRecruitingCompanyName = (app) => {
      const job = app?.job;
      const company = app?.recruitingCompany || app?.company;
      const vi =
        app?.recruitingCompanyName ||
        app?.companyName ||
        job?.recruitingCompanyName ||
        job?.companyName ||
        company?.companyName ||
        company?.name ||
        app?.recruitingCompany?.companyName ||
        app?.recruitingCompany?.name ||
        job?.recruitingCompany?.companyName ||
        job?.recruitingCompany?.name ||
        app?.recruitingCompany?.company_name ||
        job?.recruitingCompany?.company_name ||
        '';
      const en =
        app?.recruitingCompanyNameEn ||
        app?.companyNameEn ||
        job?.recruitingCompanyNameEn ||
        job?.companyNameEn ||
        company?.companyNameEn ||
        app?.recruitingCompany?.companyNameEn ||
        job?.recruitingCompany?.companyNameEn ||
        app?.recruitingCompany?.company_name_en ||
        job?.recruitingCompany?.company_name_en ||
        '';
      const jp =
        app?.recruitingCompanyNameJp ||
        app?.companyNameJp ||
        job?.recruitingCompanyNameJp ||
        job?.companyNameJp ||
        company?.companyNameJp ||
        app?.recruitingCompany?.companyNameJp ||
        job?.recruitingCompany?.companyNameJp ||
        app?.recruitingCompany?.company_name_jp ||
        job?.recruitingCompany?.company_name_jp ||
        '';
      return pickByLanguageFields(vi, en, jp, language) || vi || en || jp || '—';
    };
    const mapped = rawJobApplications.map((app) => {
      const statusInfo = mapAgentStatus(app.status);
      const job = app.job;
      const jobTitle =
        app?.jobTitle ||
        pickByLanguage(job, 'title') ||
        pickByLanguageFields(job?.title, job?.titleEn || job?.title_en, job?.titleJp || job?.title_jp, language) ||
        '—';
      const companyName = getRecruitingCompanyName(app);
      return {
        id: app.id,
        candidateName: app.name || app.cv?.name || '—',
        candidateId: app.cv?.code || app.cvCode || '—',
        jobTitle: jobTitle || '—',
        jobId: app.jobId,
        companyName,
        status: statusInfo.key,
        statusLabel: getJobApplicationStatusLabelByLanguage(app.status, language),
        statusColor: statusInfo.color,
        appliedDate: app.appliedAt || app.applied_at || app.createdAt || app.created_at,
        cvId: app.cv?.id || app.cvId,
        jobSlug: job?.slug,
      };
    });
    return [...mapped].sort((a, b) => {
      if (sortBy === 'candidate_name') {
        const nameA = (a.candidateName || '').toLowerCase();
        const nameB = (b.candidateName || '').toLowerCase();
        return sortOrder === 'ASC' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (sortBy === 'applied_at' || !sortBy) {
        const dateA = new Date(a.appliedDate || 0).getTime();
        const dateB = new Date(b.appliedDate || 0).getTime();
        return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });
  }, [isAdmin, rawJobApplications, sortBy, sortOrder, language]);

  const displayList = isAdmin ? nominations : agentMappedNominations;

  useEffect(() => {
    if (isApplicant) {
      setMatchingByNominationId({});
      return undefined;
    }
    let cancelled = false;
    const run = async () => {
      const rows = (displayList || []).filter((n) => n?.jobId && n?.cvId);
      if (rows.length === 0) {
        setMatchingByNominationId({});
        return;
      }
      setLoadingMatching(true);
      try {
        const byJob = rows.reduce((acc, row) => {
          const jobKey = String(row.jobId);
          if (!acc[jobKey]) acc[jobKey] = [];
          acc[jobKey].push(String(row.cvId));
          return acc;
        }, {});

        const entries = await Promise.all(
          Object.entries(byJob).map(async ([jobKey, cvIds]) => {
            const dedupCvIds = [...new Set(cvIds)];
            const scored = await apiService.getAiMatchScoreForJobCv({
              job_id: jobKey,
              top_k: dedupCvIds.length,
              cv_ids: dedupCvIds,
            });
            const items = Array.isArray(scored?.items) ? scored.items : Array.isArray(scored) ? scored : [];
            return [jobKey, items];
          })
        );

        if (cancelled) return;

        const scoreByPair = {};
        entries.forEach(([jobKey, rowsScored]) => {
          rowsScored.forEach((row) => {
            const cvKey = String(row?.id ?? '');
            if (!cvKey) return;
            scoreByPair[`${jobKey}::${cvKey}`] = row;
          });
        });

        const next = {};
        rows.forEach((row) => {
          const pairKey = `${String(row.jobId)}::${String(row.cvId)}`;
          if (scoreByPair[pairKey]) next[String(row.id)] = scoreByPair[pairKey];
        });
        setMatchingByNominationId(next);
      } catch (e) {
        if (!cancelled) setMatchingByNominationId({});
      } finally {
        if (!cancelled) setLoadingMatching(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [displayList, isApplicant]);

  const isSuperAdmin = adminProfile?.role === 1;
  const isBackOffice = isAdmin && adminProfile && !isSuperAdmin;

  const isMyAssignedNomination = (nomination) => {
    if (!isBackOffice) return true;
    return nomination.adminResponsibleId != null && nomination.adminResponsibleId === adminProfile?.id;
  };

  const getStaleWarning = (item) => {
    if (!item || !item.updatedAt) return false;
    if (isRejectionOrCancelledStatus(item.status)) return false;
    const updated = new Date(item.updatedAt).getTime();
    const diffDays = (Date.now() - updated) / (1000 * 60 * 60 * 24);
    return diffDays > 5;
  };

  const openMemoPanel = (nomination) => {
    setMemoPanelNomination(nomination);
    setMemoPanelOpen(true);
    setMemoNote('');
    setMemoJobSearch('');
    setSelectedMemoJobs([]);
    setMemoJobResults([]);
    setEditingMemoId(null);
    loadMemos(nomination.id);
  };

  const closeMemoPanel = () => {
    setMemoPanelOpen(false);
    setMemoPanelNomination(null);
    setMemos([]);
    setMemoError(null);
  };

  const loadMemos = async (jobApplicationId) => {
    if (!jobApplicationId) return;
    try {
      setLoadingMemos(true);
      setMemoError(null);
      const res = await apiService.getAdminJobApplicationMemos(jobApplicationId);
      if (res.success && res.data?.memos) {
        setMemos(res.data.memos);
      } else {
        setMemos([]);
      }
    } catch (e) {
      console.error('Error loading memos:', e);
      setMemoError(e.message || 'Không tải được danh sách memo');
      setMemos([]);
    } finally {
      setLoadingMemos(false);
    }
  };

  const handleSearchMemoJobs = async (query) => {
    const q = (query !== undefined ? query : memoJobSearch) || '';
    if (!q.trim()) {
      setMemoJobResults([]);
      return;
    }
    try {
      setMemoJobsLoading(true);
      setShowMemoJobDropdown(true);
      const res = await apiService.getAdminJobs({
        search: q.trim(),
        limit: 10,
        status: 1
      });
      if (res.success && res.data?.jobs) {
        setMemoJobResults(res.data.jobs);
      } else {
        setMemoJobResults([]);
      }
    } catch (e) {
      console.error('Error searching jobs for memo:', e);
      setMemoJobResults([]);
    } finally {
      setMemoJobsLoading(false);
    }
  };

  const startEditMemo = (memo) => {
    setEditingMemoId(memo.id);
    setMemoNote(memo.note || '');
    if (memo.job) {
      setSelectedMemoJobs([memo.job]);
      setMemoJobSearch(memo.job.title || memo.job.jobCode || '');
    } else {
      setSelectedMemoJobs([]);
      setMemoJobSearch('');
    }
  };

  const resetMemoForm = () => {
    setEditingMemoId(null);
    setMemoNote('');
    setMemoJobSearch('');
    setSelectedMemoJobs([]);
    setMemoJobResults([]);
    setShowMemoJobDropdown(false);
  };

  const handleSaveMemo = async () => {
    if (!memoPanelNomination?.id) return;
    const content = (memoNote || '').trim();
    if (!content) {
      alert('Vui lòng nhập nội dung memo');
      return;
    }
    if (!isSuperAdmin) {
      alert('Chỉ Super Admin mới được tạo/sửa memo');
      return;
    }
    try {
      setSavingMemo(true);
      const jobsToAttach = selectedMemoJobs && selectedMemoJobs.length > 0
        ? selectedMemoJobs.filter((j, idx, arr) => j && arr.findIndex(x => x.id === j.id) === idx)
        : [];

      const requests = [];

      if (editingMemoId) {
        // Cập nhật memo hiện tại với job đầu tiên (hoặc null nếu không chọn job)
        const mainJob = jobsToAttach[0] || null;
        const payloadUpdate = {
          note: content,
          jobId: mainJob ? mainJob.id : null
        };
        requests.push(apiService.updateAdminJobApplicationMemo(memoPanelNomination.id, editingMemoId, payloadUpdate));

        // Nếu chọn thêm job khác ngoài job chính → tạo memo mới cho từng job đó
        if (jobsToAttach.length > 1) {
          for (let i = 1; i < jobsToAttach.length; i += 1) {
            const jobItem = jobsToAttach[i];
            requests.push(
              apiService.createAdminJobApplicationMemo(memoPanelNomination.id, {
                note: content,
                jobId: jobItem.id
              })
            );
          }
        }
      } else {
        if (jobsToAttach.length > 0) {
          // Tạo 1 memo cho mỗi job được chọn
          jobsToAttach.forEach(jobItem => {
            requests.push(
              apiService.createAdminJobApplicationMemo(memoPanelNomination.id, {
                note: content,
                jobId: jobItem.id
              })
            );
          });
        } else {
          // Tạo memo không gắn job
          requests.push(
            apiService.createAdminJobApplicationMemo(memoPanelNomination.id, {
              note: content
            })
          );
        }
      }

      const responses = await Promise.all(requests);
      const anyFailed = responses.some(r => !r || !r.success);

      if (!anyFailed) {
        await loadMemos(memoPanelNomination.id);
        resetMemoForm();
        // Sau khi SuperAdmin cập nhật memo, reload danh sách nomination để cột memo (nếu dùng) đồng bộ
        loadNominations();
      } else {
        alert('Không thể lưu một số memo, vui lòng kiểm tra lại.');
      }
    } catch (e) {
      console.error('Error saving memo:', e);
      alert(e.message || 'Không thể lưu memo');
    } finally {
      setSavingMemo(false);
    }
  };

  const handleDeleteMemo = async (memo) => {
    if (!memoPanelNomination?.id) return;
    if (!memo?.id || String(memo.id) === '0') return; // memo "ảo" (fallback) không xóa được

    const ok = window.confirm(
      t.confirmDeleteMemo || 'Bạn có chắc muốn xóa memo này không?'
    );
    if (!ok) return;

    try {
      setDeletingMemoId(memo.id);
      const response = await apiService.deleteAdminJobApplicationMemo(memoPanelNomination.id, memo.id);
      if (response.success) {
        // Nếu đang edit memo bị xóa -> reset form edit
        if (String(editingMemoId) === String(memo.id)) resetMemoForm();
        await loadMemos(memoPanelNomination.id);
        loadNominations(); // cập nhật lại indicator "Memo" ở bảng
        alert(t.deleteMemoSuccess || 'Xóa memo thành công');
      } else {
        alert(response.message || t.errorDeleteMemo || 'Có lỗi xảy ra khi xóa memo');
      }
    } catch (error) {
      console.error('Error deleting memo:', error);
      alert(error.message || t.errorDeleteMemo || 'Có lỗi xảy ra khi xóa memo');
    } finally {
      setDeletingMemoId(null);
    }
  };

  const handleAssignAdmin = async (application, adminId) => {
    if (!adminId) return;
    const appId = application.id;
    setAssigningMap(prev => ({ ...prev, [appId]: true }));
    try {
      const payload = { adminResponsibleId: parseInt(adminId, 10) };
      const res = await apiService.updateAdminJobApplication(appId, payload);
      if (!res.success) {
        alert(res.message || t.errorAssignAdmin);
      } else {
        loadNominations();
      }
    } catch (error) {
      console.error('Error assigning admin to job application:', error);
      alert(error.message || t.errorAssignAdmin);
    } finally {
      setAssigningMap(prev => ({ ...prev, [appId]: false }));
    }
  };

  // Map status số → label (theo ngôn ngữ) + bucket màu (tách processing / waiting khỏi pending chung)
  const getStatusLabel = (status) => {
    const statusInfo = getJobApplicationStatus(status);
    let value = 'pending';
    if (statusInfo.category === 'success') value = 'accepted';
    else if (statusInfo.category === 'rejected' || statusInfo.category === 'cancelled') value = 'rejected';
    else if (statusInfo.category === 'interview') value = 'interviewed';
    else if (statusInfo.category === 'waiting') value = 'waiting';
    else if (statusInfo.category === 'processing') value = 'processing';
    const label = getJobApplicationStatusLabelByLanguage(status, language);
    return { label, value, color: statusInfo.color };
  };

  // Sample data - nominations/applications (fallback)
  const sampleNominations = [
    {
      id: 'APP001',
      candidateName: 'Nguyen Van A',
      candidateId: '00044572',
      jobTitle: 'Software Engineer',
      jobId: 'JOB001',
      companyName: 'Tech Company A',
      collaboratorName: 'CTV001',
      status: 'pending',
      statusLabel: 'Đang chờ',
      appliedDate: '2025-01-15',
      interviewDate: '2025-01-20',
      referralFee: 500000,
      salary: '800万円',
    },
    {
      id: 'APP002',
      candidateName: 'Tran Thi B',
      candidateId: '00044064',
      jobTitle: 'Project Manager',
      jobId: 'JOB002',
      companyName: 'Business Corp',
      collaboratorName: 'CTV002',
      status: 'interviewed',
      statusLabel: 'Đã phỏng vấn',
      appliedDate: '2025-01-10',
      interviewDate: '2025-01-18',
      referralFee: 800000,
      salary: '1000万円',
    },
    {
      id: 'APP003',
      candidateName: 'Le Van C',
      candidateId: '00043293',
      jobTitle: 'Frontend Developer',
      jobId: 'JOB003',
      companyName: 'Web Solutions',
      collaboratorName: 'CTV003',
      status: 'accepted',
      statusLabel: 'Đã nhận việc',
      appliedDate: '2025-01-05',
      interviewDate: '2025-01-12',
      referralFee: 600000,
      salary: '750万円',
    },
    {
      id: 'APP004',
      candidateName: 'Pham Thi D',
      candidateId: '00043103',
      jobTitle: 'Backend Developer',
      jobId: 'JOB004',
      companyName: 'Tech Startup',
      collaboratorName: 'CTV001',
      status: 'rejected',
      statusLabel: 'Đã từ chối',
      appliedDate: '2025-01-08',
      interviewDate: '2025-01-15',
      referralFee: 0,
      salary: '—',
    },
    {
      id: 'APP005',
      candidateName: 'Hoang Van E',
      candidateId: '00042979',
      jobTitle: 'DevOps Engineer',
      jobId: 'JOB005',
      companyName: 'Cloud Services',
      collaboratorName: 'CTV004',
      status: 'pending',
      statusLabel: 'Đang chờ',
      appliedDate: '2025-01-20',
      interviewDate: '—',
      referralFee: 700000,
      salary: '900万円',
    },
    {
      id: 'APP006',
      candidateName: 'Vu Thi F',
      candidateId: '00042966',
      jobTitle: 'UI/UX Designer',
      jobId: 'JOB006',
      companyName: 'Design Studio',
      collaboratorName: 'CTV002',
      status: 'interviewed',
      statusLabel: 'Đã phỏng vấn',
      appliedDate: '2025-01-12',
      interviewDate: '2025-01-19',
      referralFee: 550000,
      salary: '700万円',
    },
    {
      id: 'APP007',
      candidateName: 'Dao Van G',
      candidateId: '00042950',
      jobTitle: 'Data Analyst',
      jobId: 'JOB007',
      companyName: 'Data Corp',
      collaboratorName: 'CTV005',
      status: 'accepted',
      statusLabel: 'Đã nhận việc',
      appliedDate: '2025-01-03',
      interviewDate: '2025-01-10',
      referralFee: 650000,
      salary: '850万円',
    },
    {
      id: 'APP008',
      candidateName: 'Bui Thi H',
      candidateId: '00042949',
      jobTitle: 'QA Engineer',
      jobId: 'JOB008',
      companyName: 'Quality Assurance Inc',
      collaboratorName: 'CTV003',
      status: 'pending',
      statusLabel: 'Đang chờ',
      appliedDate: '2025-01-18',
      interviewDate: '—',
      referralFee: 500000,
      salary: '650万円',
    },
  ];

  const totalItems = pagination.total || 0;
  const totalPages = pagination.totalPages || 0;

  const getStatusColorStyle = (status) => {
    switch (status) {
      case 'processing':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'waiting':
        return { backgroundColor: '#ccfbf1', color: '#115e59' };
      case 'pending':
        return { backgroundColor: '#fef9c3', color: '#854d0e' };
      case 'interviewed':
        return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'accepted':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'rejected':
        return { backgroundColor: '#fee2e2', color: '#991b1b' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#1f2937' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
      case 'waiting':
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'interviewed':
        return <AlertCircle className="w-3 h-3" />;
      case 'accepted':
        return <CheckCircle className="w-3 h-3" />;
      case 'rejected':
        return <XCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(displayList.map((_, index) => index)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleReset = () => {
    setSearchQuery('');
    setStatusFilter('');
    if (isAdmin) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('cvStorageStatus');
        return next;
      }, { replace: true });
    }
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
    try {
      sessionStorage.removeItem(nominationsListStorageKey);
    } catch {
      // ignore
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadNominations();
  };

  const statusFilterOptions = getJobApplicationStatusOptionsByLanguage(language);

  const handleDelete = async (id) => {
    if (window.confirm(t.confirmDeleteNomination.replace('{id}', id))) {
      try {
        const response = await apiService.deleteAdminJobApplication(id);
        if (response.success) {
          alert(t.deleteNominationSuccess);
          loadNominations();
        } else {
          alert(response.message || t.errorDeleteNomination);
        }
      } catch (error) {
        console.error('Error deleting nomination:', error);
        alert(error.message || t.errorDeleteNomination);
      }
    }
  };

  const handleBulkDeleteDuplicateNominations = async () => {
    if (!isAdmin || !filterCvDuplicateNominations) return;
    if (!window.confirm(t.bulkDeleteDuplicateNominationsConfirm)) return;
    try {
      setBulkDeletingDuplicateNominations(true);
      const response = await apiService.bulkDeleteAdminDuplicateCvNominations();
      if (response.success) {
        alert(response.message || t.deleteNominationSuccess);
        loadNominations();
      } else {
        alert(response.message || t.errorDeleteNomination);
      }
    } catch (error) {
      console.error('Error bulk deleting duplicate-CV nominations:', error);
      alert(error.message || t.errorDeleteNomination);
    } finally {
      setBulkDeletingDuplicateNominations(false);
    }
  };

  const handleStatusSelectChange = (nomination, newStatusNum) => {
    if (newStatusNum === nomination.status) return;
    if (
      newStatusNum === STATUS_PAID ||
      newStatusNum === STATUS_INTERVIEW_SCHEDULE ||
      STATUSES_REQUIRE_REJECTION.includes(newStatusNum)
    ) {
      setStatusChangeNomination(nomination);
      setStatusChangeNewStatus(newStatusNum);
      setStatusChangeRejectNote(nomination.rejectNote || '');
      setStatusChangePaymentAmount('');
      setStatusChangeInterviewDate('');
      setStatusChangeInterviewTime('');
      setStatusChangeModal(true);
    } else {
      doUpdateStatus(nomination.id, newStatusNum, null, null);
    }
  };

  const doUpdateStatus = async (id, statusNum, rejectNote, paymentAmount) => {
    try {
      setStatusChangeUpdating(true);
      const response = await apiService.updateJobApplicationStatus(id, statusNum, rejectNote, paymentAmount);
      if (response.success) {
        resetStatusChangeModal();
        loadNominations();
      } else {
        alert(response.message || 'Cập nhật trạng thái thất bại');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error?.data?.message || error?.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
    } finally {
      setStatusChangeUpdating(false);
    }
  };

  const handleStatusChangeModalConfirm = () => {
    if (!statusChangeNomination) return;
    if (statusChangeNewStatus === STATUS_INTERVIEW_SCHEDULE) {
      if (!statusChangeInterviewDate || !statusChangeInterviewTime) {
        alert(t.chatErrorInterviewRequired || 'Vui lòng nhập ngày giờ phỏng vấn');
        return;
      }
      doUpdateInterviewStatus(statusChangeNomination.id, statusChangeInterviewDate, statusChangeInterviewTime);
      return;
    }
    if (statusChangeNewStatus === STATUS_PAID) {
      const amount = parseFloat(statusChangePaymentAmount);
      if (Number.isNaN(amount) || amount < 0) {
        alert(t.chatErrorPaymentAmountRequired || 'Vui lòng nhập số tiền thanh toán hợp lệ');
        return;
      }
      doUpdateStatus(statusChangeNomination.id, STATUS_PAID, null, amount);
    } else {
      if (STATUSES_REQUIRE_REJECTION.includes(statusChangeNewStatus) && !statusChangeRejectNote.trim()) {
        alert(t.chatReasonRequired || 'Vui lòng nhập lý do từ chối.');
        return;
      }
      doUpdateStatus(
        statusChangeNomination.id,
        statusChangeNewStatus,
        statusChangeRejectNote.trim() || null,
        null
      );
    }
  };

  const doUpdateInterviewStatus = async (id, dateValue, timeValue) => {
    try {
      setStatusChangeUpdating(true);
      const dateTime = new Date(`${dateValue}T${timeValue}`);
      const selectedNomination = nominations.find((n) => n.id === id);
      const calendarData = {
        jobApplicationId: parseInt(id, 10),
        eventType: 1,
        startAt: dateTime.toISOString(),
        title: 'Phỏng vấn ứng viên',
        description: `Lịch phỏng vấn cho đơn ứng tuyển #${id}`,
        ...(selectedNomination?.collaboratorId && { collaboratorId: parseInt(selectedNomination.collaboratorId, 10) })
      };
      const calendarResponse = await apiService.createAdminCalendar(calendarData);
      if (!calendarResponse?.success) {
        alert(calendarResponse?.message || t.chatErrorCreateSchedule);
        return;
      }
      const updateResponse = await apiService.updateAdminJobApplication(id, {
        interviewDate: dateTime.toISOString(),
        status: STATUS_INTERVIEW_SCHEDULE
      });
      if (!updateResponse.success) {
        alert(updateResponse.message || t.chatErrorUpdateApplication);
        return;
      }
      await apiService.createAdminMessage({
        jobApplicationId: parseInt(id, 10),
        content: `Đã đặt lịch phỏng vấn: ${dateValue} ${timeValue}`,
        type: 'system'
      });
      resetStatusChangeModal();
      loadNominations();
      alert(t.chatSuccessInterviewScheduled || t.updateSuccess);
    } catch (error) {
      console.error('Error updating interview schedule status:', error);
      alert(error?.data?.message || error?.message || t.chatErrorStatusChangeFailed || 'Có lỗi xảy ra khi cập nhật trạng thái');
    } finally {
      setStatusChangeUpdating(false);
    }
  };

  const isInterviewStatus = (status) => {
    const info = getStatusLabel(status);
    return info.value === 'interviewed' || (status >= 7 && status <= 9);
  };

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'candidate_name' ? 'ASC' : 'DESC');
    }
    setCurrentPage(1);
  };

  const SortableTh = ({ label, sortKey }) => (
    <th
      className="cursor-pointer select-none border-b px-px py-px text-left text-[8px] font-bold transition-colors hover:bg-gray-100 xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
      style={{ color: '#111827', borderColor: '#e5e7eb' }}
      onClick={() => toggleSort(sortKey)}
    >
      <div className="flex items-center gap-0 xl:gap-0.5">
        {label}
        {sortBy === sortKey && (
          sortOrder === 'ASC' ? <ChevronUp className="w-3 h-3" style={{ color: '#2563eb' }} /> : <ChevronDown className="w-3 h-3" style={{ color: '#2563eb' }} />
        )}
      </div>
    </th>
  );

  /** Dùng chung cho bảng desktop và thẻ mobile */
  const getNominationRowMeta = (nomination) => {
    const isAdminRow = isAdmin;
    const statusInfo = isAdminRow ? getStatusLabel(nomination.status) : { value: nomination.status, label: nomination.statusLabel };
    const appliedDate = isAdminRow
      ? (nomination.appliedAt ? new Date(nomination.appliedAt).toLocaleDateString('vi-VN') : '-')
      : (nomination.appliedDate ? new Date(nomination.appliedDate).toLocaleDateString('vi-VN') : '-');
    const interviewDateStr = isAdminRow && nomination.interviewDate
      ? new Date(nomination.interviewDate).toLocaleDateString('vi-VN')
      : null;
    const showInterviewDate = interviewDateStr && isAdminRow && isInterviewStatus(nomination.status);
    const statusStyle = getStatusColorStyle(statusInfo.value);
    const isStale = isAdminRow && getStaleWarning(nomination);
    const assigning = isAdminRow && !!assigningMap[nomination.id];
    const isOwner = isAdminRow && (isSuperAdmin || (adminProfile && nomination.adminResponsibleId === adminProfile.id));
    const isNotMyAssigned = isBackOffice && viewMode === 'all' && !isMyAssignedNomination(nomination);
    const candidateName = isAdminRow ? (nomination.cv?.name || nomination.name || '?') : (nomination.candidateName || '—');
    const jobTitle = isAdminRow
      ? (pickByLanguage({
          title: nomination.jobTitle || nomination.job?.title || '',
          titleEn: nomination.jobTitleEn || nomination.job?.titleEn || nomination.job?.title_en || '',
          titleJp: nomination.jobTitleJp || nomination.job?.titleJp || nomination.job?.title_jp || '',
        }, 'title') || nomination.job?.jobCode || '-')
      : (nomination.jobTitle || '—');
    const companyName = (() => {
      const vi = nomination.recruitingCompanyName || nomination.companyName || nomination.job?.recruitingCompanyName || nomination.job?.companyName || nomination.job?.recruitingCompany?.companyName || nomination.job?.recruitingCompany?.name || nomination.job?.recruitingCompany?.company_name || nomination.job?.company?.name || '';
      const en = nomination.recruitingCompanyNameEn || nomination.companyNameEn || nomination.job?.recruitingCompanyNameEn || nomination.job?.companyNameEn || nomination.job?.recruitingCompany?.companyNameEn || nomination.job?.recruitingCompany?.company_name_en || nomination.job?.company?.nameEn || '';
      const jp = nomination.recruitingCompanyNameJp || nomination.companyNameJp || nomination.job?.recruitingCompanyNameJp || nomination.job?.companyNameJp || nomination.job?.recruitingCompany?.companyNameJp || nomination.job?.recruitingCompany?.company_name_jp || nomination.job?.company?.nameJp || '';
      return pickByLanguageFields(vi, en, jp, language) || vi || en || jp || '—';
    })();
    const cvId = nomination.cvId;
    const matchingRow = matchingByNominationId[String(nomination.id)];
    const rawScore = Number(matchingRow?.score ?? matchingRow?.similarity_score ?? 0);
    const scorePercent = Math.max(0, Math.min(100, rawScore <= 1 ? rawScore * 100 : rawScore));
    const scoreStyle = scorePercent < 60
      ? { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }
      : scorePercent <= 80
        ? { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fdba74' }
        : { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' };
    const matchingReason = matchingRow?.reasoning?.[language] || matchingRow?.reasoning?.vi || matchingRow?.reasoning?.en || matchingRow?.reasoning?.jp || '';
    return {
      isAdminRow,
      statusInfo,
      appliedDate,
      interviewDateStr,
      showInterviewDate,
      statusStyle,
      isStale,
      assigning,
      isOwner,
      isNotMyAssigned,
      candidateName,
      jobTitle,
      companyName,
      cvId,
      matchingRow,
      scorePercent,
      scoreStyle,
      matchingReason,
    };
  };

  return (
    <div
      ref={pageRootRef}
      className={`flex min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden max-lg:h-auto lg:h-full ${!isApplicant ? 'pb-20 sm:pb-16 lg:pb-0' : ''}`}
    >
      {/* Filter Section – full width bằng bảng bên dưới */}
      <div className="mb-1.5 w-full min-w-0 flex-shrink-0 px-0 py-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search box (rounded-full, không border) — applicant: chưa lọc server */}
          {!isApplicant && (
          <div className="flex min-w-0 flex-1 items-center rounded-full bg-white px-3 py-1.5 text-[9px] sm:min-w-[200px] sm:text-xs lg:text-[9px] xl:text-xs">
            <Search className="mr-2 h-3 w-3 flex-shrink-0 sm:h-3 sm:w-3" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder={t.searchPlaceholderNominations}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-transparent text-[9px] outline-none placeholder:text-[9px] sm:text-xs sm:placeholder:text-xs lg:text-[9px] lg:placeholder:text-[9px] xl:text-xs xl:placeholder:text-xs"
              style={{ border: 'none' }}
            />
          </div>
          )}
          {isAdmin && (
            <button
              onClick={() => navigate(`${basePath}/nominations/create${adminNominationsListQs}`)}
              onMouseEnter={() => setHoveredAddNominationButton(true)}
              onMouseLeave={() => setHoveredAddNominationButton(false)}
              className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[8px] sm:hidden"
              style={{
                backgroundColor: hoveredAddNominationButton ? '#b91c1c' : '#dc2626',
                color: 'white'
              }}
              aria-label={t.addNominationButton}
              title={t.addNominationButton}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={handleReset}
            onMouseEnter={() => setHoveredResetButton(true)}
            onMouseLeave={() => setHoveredResetButton(false)}
            className="inline-flex h-8 flex-shrink-0 items-center justify-center rounded-full px-3 text-[8px] font-semibold sm:hidden"
            style={{
              backgroundColor: hoveredResetButton ? '#e5e7eb' : '#f3f4f6',
              color: '#374151'
            }}
          >
            {t.reset}
          </button>

          {/* Pills + nút bên phải */}
          <div className="flex w-full items-center justify-start gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:flex-wrap sm:justify-end sm:gap-2.5 sm:overflow-visible sm:pb-0">
            {/* Pill: Ngày tiến cử */}
            <div className="relative order-1">
              <button
                type="button"
                onClick={() => {
                  setIsDateFilterOpen(!isDateFilterOpen);
                  setIsStatusFilterOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[8px] font-semibold sm:text-[10px]"
                style={{ color: '#374151' }}
              >
                {t.colNominationDate}
                <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </button>
              {isDateFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-white p-3 z-20 text-[9px] sm:text-[10px]" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="font-semibold text-[9px] text-gray-700 sm:text-[10px]">{t.dateFromLabel}</span>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 border rounded"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-semibold text-[9px] text-gray-700 sm:text-[10px]">{t.dateToLabel}</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 border rounded"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setDateFrom('');
                        setDateTo('');
                        setCurrentPage(1);
                      }}
                      className="self-end mt-1 px-2 py-0.5 text-[9px] font-semibold sm:text-[10px] rounded-full"
                      style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}
                    >
                      Xóa lọc
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Pill: Trạng thái */}
            <div className="relative order-2">
              <button
                type="button"
                onClick={() => {
                  setIsStatusFilterOpen(!isStatusFilterOpen);
                  setIsDateFilterOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[8px] font-semibold sm:text-[10px]"
                style={{ color: '#374151' }}
              >
                {t.statusLabel}
                <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </button>
              {isStatusFilterOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-3 z-20 text-[9px] sm:text-[10px] max-h-60 overflow-y-auto" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="nom-status-filter"
                        value=""
                        checked={statusFilter === ''}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-3.5 h-3.5"
                      />
                      <span>{t.allStatuses}</span>
                    </label>
                    {statusFilterOptions.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="nom-status-filter"
                          value={opt.value}
                          checked={statusFilter === String(opt.value)}
                          onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-3.5 h-3.5"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (next.get('cvStorageStatus') === String(CV_STATUS_DUPLICATE)) {
                      next.delete('cvStorageStatus');
                    } else {
                      next.set('cvStorageStatus', String(CV_STATUS_DUPLICATE));
                    }
                    return next;
                  }, { replace: true });
                  setCurrentPage(1);
                }}
                className="order-3 flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1.5 text-[8px] font-semibold transition-colors sm:order-none sm:gap-1.5 sm:px-3 sm:text-[10px]"
                style={{
                  backgroundColor: filterCvDuplicateNominations ? '#fff7ed' : '#ffffff',
                  color: filterCvDuplicateNominations ? '#c2410c' : '#374151',
                  borderColor: filterCvDuplicateNominations ? '#fdba74' : '#e5e7eb',
                }}
                title={t.filterCvStatusMismatchTitle}
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="sm:hidden">Lọc hồ sơ</span>
                <span className="hidden sm:inline">{t.filterCvStatusMismatch}</span>
              </button>
            )}

            {isAdmin && filterCvDuplicateNominations && (
              <button
                type="button"
                onClick={handleBulkDeleteDuplicateNominations}
                disabled={bulkDeletingDuplicateNominations}
                className="order-5 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-semibold transition-colors disabled:opacity-50 sm:order-none sm:text-[10px]"
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  borderColor: '#fecaca',
                }}
                title={t.bulkDeleteDuplicateNominationsTitle}
              >
                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                {bulkDeletingDuplicateNominations
                  ? t.bulkDeleteDuplicateNominationsRunning
                  : t.bulkDeleteDuplicateNominations}
              </button>
            )}

            <button
              onClick={handleReset}
              onMouseEnter={() => setHoveredResetButton(true)}
              onMouseLeave={() => setHoveredResetButton(false)}
              className="hidden rounded-full bg-white px-3 py-1.5 text-[9px] font-semibold transition-colors sm:inline-flex sm:text-[10px]"
              style={{
                backgroundColor: hoveredResetButton ? '#e5e7eb' : '#f3f4f6',
                color: '#374151'
              }}
            >
              {t.reset}
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setViewMode(viewMode === 'myAssigned' ? 'all' : 'myAssigned');
                    setCurrentPage(1);
                  }}
                  className="order-4 shrink-0 whitespace-nowrap rounded-full border px-2 py-1.5 text-[8px] font-semibold transition-colors sm:order-none sm:px-3 sm:text-[10px]"
                  style={{
                    backgroundColor: viewMode === 'all' ? '#eff6ff' : 'white',
                    color: viewMode === 'all' ? '#1d4ed8' : '#374151',
                    borderColor: '#93c5fd'
                  }}
                  title={viewMode === 'myAssigned' ? (t.viewModeTitleAll || 'Xem tất cả hồ sơ') : (t.viewModeTitleMy || 'Xem hồ sơ đã được phân công')}
                >
                  <span className="sm:hidden">
                    {viewMode === 'myAssigned' ? 'Xem tất cả' : 'Chỉ xem đơn'}
                  </span>
                  <span className="hidden sm:inline">
                    {viewMode === 'myAssigned' ? (t.viewAllNominations || 'Xem tất cả hồ sơ') : (t.viewMyAssignedOnly || 'Xem hồ sơ đã được phân công')}
                  </span>
                </button>
                <button
                  onClick={() => navigate(`${basePath}/nominations/create${adminNominationsListQs}`)}
                  onMouseEnter={() => setHoveredAddNominationButton(true)}
                  onMouseLeave={() => setHoveredAddNominationButton(false)}
                  className="hidden rounded-full px-3 py-1.5 text-[9px] font-semibold sm:inline-flex sm:px-4 sm:text-[10px]"
                  style={{
                    backgroundColor: hoveredAddNominationButton ? '#b91c1c' : '#dc2626',
                    color: 'white'
                  }}
                >
                  {t.addNominationButton}
                </button>
              </>
            )}
          </div>
        </div>
        {isAdmin && adminProfile && (
          <p className="mt-1 px-1 text-[9px]" style={{ color: '#6b7280' }}>
            {viewMode === 'myAssigned' ? t.viewingMyAssigned : t.viewingAll}
          </p>
        )}
        {!isAdmin && agentLoadError && (
          <p className="mt-1 px-1 text-[9px]" style={{ color: '#dc2626' }}>{agentLoadError}</p>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="mb-3 flex min-w-0 flex-shrink-0 flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('first')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="px-1.5 py-1 border rounded text-xs font-semibold transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'first' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: currentPage === 1 ? 0.5 : 1,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronsLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('prev')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="px-1.5 py-1 border rounded text-xs font-semibold transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'prev' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: currentPage === 1 ? 0.5 : 1,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          {[...Array(Math.min(7, totalPages))].map((_, i) => {
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
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                onMouseEnter={() => currentPage !== pageNum && setHoveredPaginationButtonIndex(pageNum)}
                onMouseLeave={() => setHoveredPaginationButtonIndex(null)}
                className="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: currentPage === pageNum
                    ? '#2563eb'
                    : (hoveredPaginationButtonIndex === pageNum ? '#f9fafb' : 'white'),
                  border: currentPage === pageNum ? 'none' : '1px solid #d1d5db',
                  color: currentPage === pageNum ? 'white' : '#374151'
                }}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            onMouseEnter={() => currentPage < totalPages && setHoveredPaginationNavButton('next')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="px-1.5 py-1 border rounded text-xs font-semibold transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'next' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: currentPage === totalPages ? 0.5 : 1,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            onMouseEnter={() => currentPage < totalPages && setHoveredPaginationNavButton('last')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="px-1.5 py-1 border rounded text-xs font-semibold transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'last' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: currentPage === totalPages ? 0.5 : 1,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronsRight className="w-3 h-3" />
          </button>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 border rounded text-xs font-semibold"
            style={{
              borderColor: '#d1d5db',
              color: '#374151',
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
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span className="text-xs font-semibold" style={{ color: '#374151' }}>{totalItems} items</span>
        </div>
      </div>

      {/* Mobile: cao theo nội dung, cuộn trên <main> | Desktop: flex-1 + cuộn trong vùng bảng */}
      <div className="relative min-w-0 max-lg:flex-none max-lg:overflow-visible lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <div className="space-y-3 px-0.5 pb-4 lg:hidden">
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white py-10 text-center text-sm" style={{ color: '#6b7280' }}>
              {t.loadingData}
            </div>
          ) : displayList.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-10 text-center text-sm" style={{ color: '#6b7280' }}>
              {t.noData}
            </div>
          ) : (
            displayList.map((nomination, index) => {
              const m = getNominationRowMeta(nomination);
              return (
                <div
                  key={nomination.id}
                  className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                  style={{
                    opacity: m.isNotMyAssigned ? 0.45 : 1,
                    pointerEvents: m.isNotMyAssigned ? 'none' : 'auto',
                  }}
                >
                  <div className="flex gap-2">
                    <div className="flex-shrink-0 pt-0.5">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={() => handleSelectRow(index)}
                        className="h-4 w-4 rounded"
                        style={{ accentColor: '#2563eb', borderColor: '#d1d5db' }}
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`${basePath}/nominations/${nomination.id}${adminNominationsListQs}`)}
                              className="inline-flex items-center gap-1 text-sm font-semibold"
                              style={{ color: '#2563eb' }}
                            >
                              #{nomination.id}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </button>
                            {m.isStale && (
                              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#eab308' }} title={t.nominationStaleWarning} />
                            )}
                          </div>
                          <p className="mt-0.5 break-words text-sm font-semibold" style={{ color: '#111827' }}>
                            {m.cvId ? (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(isApplicant ? `${basePath}/profile` : `${basePath}/candidates/${m.cvId}`)
                                }
                                className="text-left"
                                style={{ color: '#111827' }}
                              >
                                {m.candidateName}
                              </button>
                            ) : (
                              m.candidateName
                            )}
                          </p>
                          {m.isAdminRow && (nomination.collaborator?.code || nomination.collaborator?.name) && (
                            <p className="mt-0.5 text-xs" style={{ color: '#9ca3af' }}>
                              CTV: {nomination.collaborator?.name || nomination.collaborator?.code}
                            </p>
                          )}
                          {(unreadByJobApplication[nomination.id] || 0) > 0 && (
                            <span
                              className="mt-1 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold"
                              style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                            >
                              {unreadByJobApplication[nomination.id]} tin nhắn
                            </span>
                          )}
                        </div>
                        {m.matchingRow ? (
                          <span
                            className="inline-flex flex-shrink-0 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
                            style={m.scoreStyle}
                            title={m.matchingReason || undefined}
                          >
                            {Math.round(m.scorePercent)}%
                          </span>
                        ) : (
                          <span className="flex-shrink-0 text-xs" style={{ color: '#9ca3af' }}>
                            {loadingMatching ? '...' : '—'}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        {nomination.jobId ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                m.isAdminRow
                                  ? `${basePath}/jobs/${nomination.jobId}`
                                  : `${basePath}/jobs/${nomination.jobId}${nomination.jobSlug ? `?slug=${nomination.jobSlug}` : ''}`
                              )
                            }
                            className="w-full text-left"
                            style={{ color: '#111827' }}
                          >
                            <span className="line-clamp-2 text-sm font-medium">{truncate(m.jobTitle, JOB_TITLE_MAX)}</span>
                            <span className="mt-0.5 block break-words text-xs" style={{ color: '#6b7280' }}>
                              {m.companyName}
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs" style={{ color: '#374151' }}>—</span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="space-y-1.5 border-t border-gray-100 pt-2 text-xs">
                          {nomination.adminResponsibleId ? (
                            <div className="flex min-w-0 items-center gap-1.5">
                              <User className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#60a5fa' }} />
                              <span className="min-w-0 break-words font-medium" style={{ color: '#1e3a8a' }}>
                                {nomination.adminResponsible?.name || nomination.adminResponsible?.email || '-'}
                              </span>
                            </div>
                          ) : (
                            <span className="font-medium" style={{ color: '#dc2626' }}>{t.notAssignedAdmin}</span>
                          )}
                          {isSuperAdmin && (
                            <select
                              value={nomination.adminResponsible?.id || ''}
                              onChange={(e) => handleAssignAdmin(nomination, e.target.value)}
                              disabled={m.assigning}
                              className="w-full max-w-full rounded border px-2 py-1.5 text-xs"
                              style={{ borderColor: '#d1d5db' }}
                            >
                              <option value="">{t.notAssignedAdminOption}</option>
                              {admins.map((admin) => (
                                <option key={admin.id} value={admin.id}>
                                  {admin.name}
                                </option>
                              ))}
                            </select>
                          )}
                          {m.assigning && <span style={{ color: '#6b7280' }}>{t.saving}</span>}
                        </div>
                      )}
                      <div className="border-t border-gray-100 pt-2">
                        {m.isAdminRow ? (
                          <select
                            value={nomination.status}
                            onChange={(e) => handleStatusSelectChange(nomination, parseInt(e.target.value, 10))}
                            disabled={!isSuperAdmin && !m.isOwner}
                            className="w-full max-w-full cursor-pointer rounded-lg border px-2 py-2 text-xs font-semibold"
                            style={{
                              backgroundColor: m.statusStyle.backgroundColor,
                              color: m.statusStyle.color,
                              borderColor: '#d1d5db',
                              outline: 'none',
                            }}
                          >
                            {getJobApplicationStatusOptionsByLanguage(language).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                            style={m.statusStyle}
                          >
                            {getStatusIcon(nomination.status)}
                            {nomination.statusLabel}
                          </span>
                        )}
                        {m.showInterviewDate && (
                          <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>PV: {m.interviewDateStr}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: '#374151' }}>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" style={{ color: '#9ca3af' }} />
                          {m.appliedDate}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1 border-t border-gray-100 pt-2">
                        {isAdmin && (isSuperAdmin || m.isOwner) && (
                          <button
                            type="button"
                            onClick={() => openMemoPanel(nomination)}
                            className="relative rounded border px-2 py-1 text-xs font-semibold"
                            style={{
                              borderColor: '#fecaca',
                              backgroundColor: '#fff1f2',
                              color: '#b91c1c',
                            }}
                          >
                            {nomination.memo && (
                              <span
                                className="absolute -top-1 -right-1 inline-flex h-3 w-3 rounded-full border-2"
                                style={{ backgroundColor: '#b91c1c', borderColor: '#fff1f2' }}
                              />
                            )}
                            Memo
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`${basePath}/nominations/${nomination.id}${adminNominationsListQs}`)}
                          className="rounded border border-gray-200 bg-white p-2"
                          style={{ color: '#2563eb' }}
                          title={t.viewDetail}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {isAdmin && (isSuperAdmin || m.isOwner) && (
                          <>
                            <button
                              type="button"
                              onClick={() => navigate(`${basePath}/nominations/${nomination.id}/edit${adminNominationsListQs}`)}
                              className="rounded border border-gray-200 bg-white p-2"
                              style={{ color: '#4b5563' }}
                              title={t.edit}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(nomination.id)}
                              className="rounded border border-red-100 bg-red-50 p-2"
                              style={{ color: '#dc2626' }}
                              title={t.delete}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden h-full min-w-0 overflow-x-auto lg:block">
          <table className="w-full table-auto border-separate [border-spacing:0_2px] xl:[border-spacing:0_4px]">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'white' }}>
              <tr>
                <th className="w-7 border-b px-px py-px text-center text-[8px] font-bold xl:w-8 xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.size === displayList.length && displayList.length > 0}
                    onChange={handleSelectAll}
                    className="w-3 h-3 rounded"
                    style={{
                      accentColor: '#2563eb',
                      borderColor: '#d1d5db'
                    }}
                  />
                </th>
                <th className="min-w-[48px] border-b px-px py-px text-left text-[8px] font-bold xl:min-w-[52px] xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colId}</th>
                <SortableTh label={t.colCandidate} sortKey="candidate_name" />
                <th className="min-w-[100px] border-b px-px py-px text-left text-[8px] font-bold xl:min-w-[122px] xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colJob}</th>
                {isAdmin && (
                  <th className="min-w-[88px] border-b px-px py-px text-left text-[8px] font-bold xl:min-w-[106px] xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colAdminResponsible}</th>
                )}
                <th className="min-w-[80px] border-b px-px py-px text-left text-[8px] font-bold xl:min-w-[96px] xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colStatus}</th>
                <SortableTh label={t.colNominationDate} sortKey="applied_at" />
                <th className="min-w-[48px] border-b px-px py-px text-center text-[8px] font-bold xl:min-w-[52px] xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                  Matching
                </th>
                <th className="min-w-[80px] border-b px-px py-px text-center text-[8px] font-bold xl:min-w-[96px] xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr style={{ backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <td colSpan={isAdmin ? 9 : 8} className="rounded-lg px-2 py-5 text-center text-[8px] xl:px-3 xl:py-7 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#6b7280' }}>
                    {t.loadingData}
                  </td>
                </tr>
              ) : displayList.length === 0 ? (
                <tr style={{ backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <td colSpan={isAdmin ? 9 : 8} className="rounded-lg px-2 py-5 text-center text-[8px] xl:px-3 xl:py-7 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#6b7280' }}>
                    {t.noData}
                  </td>
                </tr>
              ) : (
                displayList.map((nomination, index) => {
                  const m = getNominationRowMeta(nomination);

                  return (
                    <tr
                      key={nomination.id}
                      className="transition-colors rounded-lg"
                      style={{
                        backgroundColor: m.isNotMyAssigned ? '#f9fafb' : (hoveredRowIndex === index ? '#f9fafb' : '#ffffff'),
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        opacity: m.isNotMyAssigned ? 0.45 : 1,
                        pointerEvents: m.isNotMyAssigned ? 'none' : 'auto',
                      }}
                      onMouseEnter={() => setHoveredRowIndex(index)}
                      onMouseLeave={() => setHoveredRowIndex(null)}
                    >
                      <td className="px-px py-px text-center xl:px-0.5 xl:py-0.5" style={{ borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(index)}
                          onChange={() => handleSelectRow(index)}
                          className="w-3 h-3 rounded"
                          style={{
                            accentColor: '#2563eb',
                            borderColor: '#d1d5db'
                          }}
                        />
                      </td>
                      <td className="px-px py-px xl:px-0.5 xl:py-0.5">
                        <div className="flex items-center gap-0.5 xl:gap-1">
                          <button
                            onClick={() => navigate(`${basePath}/nominations/${nomination.id}${adminNominationsListQs}`)}
                            onMouseEnter={() => setHoveredIdLinkIndex(index)}
                            onMouseLeave={() => setHoveredIdLinkIndex(null)}
                            className="flex items-center gap-0.5 text-[8px] font-medium xl:gap-1 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                            style={{
                              color: hoveredIdLinkIndex === index ? '#1e40af' : '#2563eb'
                            }}
                          >
                            {nomination.id}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                          {m.isStale && (
                            <AlertCircle
                              className="w-3 h-3"
                              style={{ color: '#eab308' }}
                              title={t.nominationStaleWarning}
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-px py-px xl:px-0.5 xl:py-0.5">
                        <div className="flex items-center gap-0.5 xl:gap-1">
                          <div>
                            {m.cvId ? (
                              <button
                                onClick={() =>
                                  navigate(isApplicant ? `${basePath}/profile` : `${basePath}/candidates/${m.cvId}`)
                                }
                                onMouseEnter={() => setHoveredCandidateLinkIndex(index)}
                                onMouseLeave={() => setHoveredCandidateLinkIndex(null)}
                                className="block text-[8px] font-semibold lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                                style={{
                                  color: hoveredCandidateLinkIndex === index ? '#2563eb' : '#111827'
                                }}
                              >
                                {m.candidateName}
                              </button>
                            ) : (
                              <span className="text-[8px] font-semibold lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827' }}>
                                {m.candidateName}
                              </span>
                            )}
                            {m.isAdminRow && (nomination.collaborator?.code || nomination.collaborator?.name) && (
                              <p className="mt-0.5 text-[8px] lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#9ca3af' }}>
                                CTV: {nomination.collaborator?.name || nomination.collaborator?.code}
                              </p>
                            )}
                            {(unreadByJobApplication[nomination.id] || 0) > 0 && (
                              <span
                                className="mt-1 inline-flex items-center rounded px-px py-px text-[8px] font-semibold xl:px-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                                style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                                title={t.unreadMessageTitle}
                              >
                                {unreadByJobApplication[nomination.id]} tin nhắn
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[148px] px-px py-px xl:max-w-[164px] xl:px-0.5 xl:py-0.5">
                        {nomination.jobId ? (
                          <button
                            onClick={() => navigate(m.isAdminRow ? `${basePath}/jobs/${nomination.jobId}` : `${basePath}/jobs/${nomination.jobId}${nomination.jobSlug ? `?slug=${nomination.jobSlug}` : ''}`)}
                            onMouseEnter={() => setHoveredJobLinkIndex(index)}
                            onMouseLeave={() => setHoveredJobLinkIndex(null)}
                            className="text-left block"
                            style={{
                              color: hoveredJobLinkIndex === index ? '#2563eb' : '#111827'
                            }}
                          >
                            <span className="line-clamp-2 text-[8px] font-medium lg:text-[9px] xl:text-[10px] 2xl:text-[11px]">
                              {truncate(m.jobTitle, JOB_TITLE_MAX)}
                            </span>
                            <span className="mt-0.5 block text-[8px] lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#6b7280' }}>
                              {m.companyName}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[8px] lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#374151' }}>—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-px py-px xl:px-0.5 xl:py-0.5">
                          <div className="flex flex-col gap-0.5 xl:gap-1">
                            {nomination.adminResponsibleId ? (
                              <div className="flex items-center gap-0.5 xl:gap-1">
                                <User className="h-3 w-3 flex-shrink-0" style={{ color: '#60a5fa' }} />
                                <span className="text-[8px] font-medium lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#1e3a8a' }}>
                                  {nomination.adminResponsible?.name || nomination.adminResponsible?.email || '-'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[8px] font-medium lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#dc2626' }}>{t.notAssignedAdmin}</span>
                            )}
                            {isSuperAdmin && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <select
                                  value={nomination.adminResponsible?.id || ''}
                                  onChange={(e) => handleAssignAdmin(nomination, e.target.value)}
                                  disabled={m.assigning}
                                  className="rounded border px-px py-px text-[8px] lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                                  style={{ borderColor: '#d1d5db', minWidth: '108px' }}
                                >
                                  <option value="">{t.notAssignedAdminOption}</option>
                                  {admins.map(admin => (
                                    <option key={admin.id} value={admin.id}>
                                      {admin.name}
                                    </option>
                                  ))}
                                </select>
                                {m.assigning && (
                                  <span className="text-[8px] lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#6b7280' }}>
                                    {t.saving}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-px py-px xl:px-0.5 xl:py-0.5">
                        <div>
                          {m.isAdminRow ? (
                            <select
                              value={nomination.status}
                              onChange={(e) => handleStatusSelectChange(nomination, parseInt(e.target.value, 10))}
                              disabled={!isSuperAdmin && !m.isOwner}
                              className="w-full max-w-[148px] cursor-pointer rounded border px-px py-px text-[8px] font-semibold xl:max-w-[160px] xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                              style={{
                                backgroundColor: m.statusStyle.backgroundColor,
                                color: m.statusStyle.color,
                                borderColor: '#d1d5db',
                                outline: 'none'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {getJobApplicationStatusOptionsByLanguage(language).map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-full px-px py-px text-[8px] font-semibold xl:gap-1 xl:px-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={m.statusStyle}>
                              {getStatusIcon(nomination.status)}
                              {nomination.statusLabel}
                            </span>
                          )}
                          {m.showInterviewDate && (
                            <p className="mt-1 text-[8px] lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#6b7280' }}>PV: {m.interviewDateStr}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-px py-px text-[8px] xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#374151' }}>
                        <div className="flex items-center gap-0.5 xl:gap-1">
                          <Calendar className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#9ca3af' }} />
                          {m.appliedDate}
                        </div>
                      </td>
                      <td className="px-px py-px text-center xl:px-0.5 xl:py-0.5">
                        {m.matchingRow ? (
                          <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full border px-px py-px text-[8px] font-semibold xl:px-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={m.scoreStyle}>
                            {Math.round(m.scorePercent)}%
                          </span>
                        ) : (
                          <span className="text-[8px] lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#9ca3af' }}>
                            {loadingMatching ? '...' : '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-px py-px xl:px-0.5 xl:py-0.5" style={{ borderTopRightRadius: 8, borderBottomRightRadius: 8 }}>
                        <div className="flex items-center justify-center gap-0.5 xl:gap-1">
                          {isAdmin && (isSuperAdmin || m.isOwner) && (
                            <button
                              onClick={() => openMemoPanel(nomination)}
                              onMouseEnter={() => setHoveredMemoButtonIndex(index)}
                              onMouseLeave={() => setHoveredMemoButtonIndex(null)}
                              className="relative rounded border px-px py-px text-[8px] font-semibold transition-colors xl:px-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                              style={{
                                borderColor: '#fecaca',
                                backgroundColor: hoveredMemoButtonIndex === index ? '#fee2e2' : '#fff1f2',
                                color: '#b91c1c'
                              }}
                              title={t.viewMemoTitle}
                            >
                              {nomination.memo && (
                                <span
                                  className="absolute -top-1 -right-1 inline-flex h-3 w-3 rounded-full border-2"
                                  style={{ backgroundColor: '#b91c1c', borderColor: '#fff1f2' }}
                                />
                              )}
                              Memo
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`${basePath}/nominations/${nomination.id}${adminNominationsListQs}`)}
                            onMouseEnter={() => setHoveredViewButtonIndex(index)}
                            onMouseLeave={() => setHoveredViewButtonIndex(null)}
                            className="p-1 rounded transition-colors"
                            style={{
                              color: hoveredViewButtonIndex === index ? '#1e40af' : '#2563eb',
                              backgroundColor: hoveredViewButtonIndex === index ? '#eff6ff' : 'transparent'
                            }}
                            title={t.viewDetail}
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          {isAdmin && (isSuperAdmin || m.isOwner) && (
                            <>
                              <button
                                onClick={() => navigate(`${basePath}/nominations/${nomination.id}/edit${adminNominationsListQs}`)}
                                onMouseEnter={() => setHoveredEditButtonIndex(index)}
                                onMouseLeave={() => setHoveredEditButtonIndex(null)}
                                className="p-1 rounded transition-colors"
                                style={{
                                  color: hoveredEditButtonIndex === index ? '#1f2937' : '#4b5563',
                                  backgroundColor: hoveredEditButtonIndex === index ? '#f3f4f6' : 'transparent'
                                }}
                                title={t.edit}
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(nomination.id)}
                                onMouseEnter={() => setHoveredDeleteButtonIndex(index)}
                                onMouseLeave={() => setHoveredDeleteButtonIndex(null)}
                                className="p-1 rounded transition-colors"
                                style={{
                                  color: hoveredDeleteButtonIndex === index ? '#991b1b' : '#dc2626',
                                  backgroundColor: hoveredDeleteButtonIndex === index ? '#fef2f2' : 'transparent'
                                }}
                                title={t.delete}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal đổi trạng thái (giống NominationChat) */}
      {isAdmin && statusChangeModal && statusChangeNomination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl shadow-lg w-full max-w-md mx-4 p-5" style={{ backgroundColor: 'white' }}>
            <h3 className="text-base font-bold mb-3" style={{ color: '#111827' }}>{t.changeStatusModalTitle}</h3>
            <div className="space-y-4">
              {STATUSES_REQUIRE_REJECTION.includes(statusChangeNewStatus) && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>
                    {t.reasonNoteOptional || 'Lý do từ chối'} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={statusChangeRejectNote}
                    onChange={(e) => setStatusChangeRejectNote(e.target.value)}
                    placeholder={t.placeholderReasonStatus || t.placeholderRejectReason}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{ borderColor: '#d1d5db', outline: 'none' }}
                  />
                </div>
              )}
              {statusChangeNewStatus === STATUS_INTERVIEW_SCHEDULE && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{t.chatDate || 'Ngày'}</label>
                    <input
                      type="date"
                      value={statusChangeInterviewDate}
                      onChange={(e) => setStatusChangeInterviewDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs"
                      style={{ borderColor: '#d1d5db', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{t.chatTime || 'Giờ'}</label>
                    <input
                      type="time"
                      value={statusChangeInterviewTime}
                      onChange={(e) => setStatusChangeInterviewTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs"
                      style={{ borderColor: '#d1d5db', outline: 'none' }}
                    />
                  </div>
                </>
              )}
              {statusChangeNewStatus === STATUS_PAID && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>
                  {t.chatPaymentAmount || t.paymentAmountLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={statusChangePaymentAmount}
                  onChange={(e) => setStatusChangePaymentAmount(e.target.value)}
                  placeholder={t.placeholderPaymentAmount}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                  style={{ borderColor: '#d1d5db', outline: 'none' }}
                />
                <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                  {t.chatPaymentRequestCreatedPaid || ''}
                </p>
              </div>
              )}
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                type="button"
                onClick={resetStatusChangeModal}
                disabled={statusChangeUpdating}
                className="px-4 py-2 rounded-lg border text-xs font-medium"
                style={{ borderColor: '#d1d5db', color: '#374151' }}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleStatusChangeModalConfirm}
                disabled={
                  statusChangeUpdating ||
                  (STATUSES_REQUIRE_REJECTION.includes(statusChangeNewStatus) && !statusChangeRejectNote.trim()) ||
                  (statusChangeNewStatus === STATUS_INTERVIEW_SCHEDULE && (!statusChangeInterviewDate || !statusChangeInterviewTime)) ||
                  (statusChangeNewStatus === STATUS_PAID && (Number.isNaN(parseFloat(statusChangePaymentAmount)) || parseFloat(statusChangePaymentAmount) < 0))
                }
                className="px-4 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#2563eb' }}
              >
                {statusChangeUpdating ? t.updating : t.updateButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Memo Drawer (chỉ Admin) */}
      {isAdmin && memoPanelOpen && memoPanelNomination && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={closeMemoPanel}
          />
          {/* Panel */}
          <div className="relative w-full max-w-md h-full bg-rose-50 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-3 p-4 pb-2 flex-shrink-0">
              <div>
                <h2 className="text-xs font-bold" style={{ color: '#b91c1c' }}>
                  {t.memoForNomination}{memoPanelNomination.id}
                </h2>
                <p className="text-[10px] mt-1" style={{ color: '#7f1d1d' }}>
                  {t.candidateLabelShort} {memoPanelNomination.cv?.name || memoPanelNomination.name || '-'}
                </p>
                <p className="text-[10px]" style={{ color: '#7f1d1d' }}>
                  {t.colJob}: {pickByLanguage(memoPanelNomination.job, 'title') || memoPanelNomination.job?.jobCode || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMemoPanel}
                className="text-[10px] px-2 py-1 rounded border"
                style={{ borderColor: '#fecaca', color: '#7f1d1d' }}
              >
                {t.closeButton}
              </button>
            </div>

            {/* Form create / edit memo */}
            {isSuperAdmin && (
              <div className="px-4 pb-3 border-b" style={{ borderColor: '#fecaca' }}>
                <div className="mb-2">
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#7f1d1d' }}>
                    {editingMemoId ? t.editMemo : t.addMemo}
                  </label>
                  <textarea
                    value={memoNote}
                    onChange={(e) => setMemoNote(e.target.value)}
                    rows={3}
                    placeholder={t.placeholderMemo}
                    className="w-full px-3 py-2 rounded text-[10px]"
                    style={{ borderColor: '#fecaca', outline: 'none', backgroundColor: 'white' }}
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: '#7f1d1d' }}>
                    {t.suggestJobLabel}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#fca5a5' }} />
                    <input
                      type="text"
                      placeholder={t.placeholderMemoJobSearch}
                      value={memoJobSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMemoJobSearch(value);
                        const trimmed = value.trim();
                        if (trimmed.length >= 2) {
                          handleSearchMemoJobs(trimmed);
                        } else {
                          setMemoJobResults([]);
                        }
                      }}
                      onFocus={() => setShowMemoJobDropdown(true)}
                      onBlur={() => {
                        // Delay để click vào item trong dropdown vẫn hoạt động
                        setTimeout(() => setShowMemoJobDropdown(false), 150);
                      }}
                      className="w-full pl-10 pr-3 py-2 rounded text-[10px]"
                      style={{ borderColor: '#fecaca', outline: 'none', backgroundColor: 'white' }}
                    />
                    {selectedMemoJobs && selectedMemoJobs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedMemoJobs.map(jobItem => (
                          <div
                            key={jobItem.id}
                            className="px-2 py-1 rounded-full border flex items-center gap-1"
                            style={{ borderColor: '#fecaca', backgroundColor: '#fff1f2' }}
                          >
                            <span className="text-[10px]" style={{ color: '#7f1d1d' }}>
                              {pickByLanguage(jobItem, 'title') || jobItem.jobCode || `Job #${jobItem.id}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedMemoJobs(prev => prev.filter(j => j.id !== jobItem.id))}
                              className="text-[10px]"
                              style={{ color: '#b91c1c' }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {showMemoJobDropdown && (memoJobsLoading || memoJobResults.length > 0) && (
                      <div className="absolute z-50 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ backgroundColor: 'white', borderColor: '#fecaca' }}>
                        {memoJobsLoading ? (
                          <div className="p-3 text-[10px]" style={{ color: '#6b7280' }}>Đang tìm job...</div>
                        ) : (
                          memoJobResults.map((jobItem, index) => (
                            <button
                              key={jobItem.id}
                              type="button"
                              onClick={() => {
                                setSelectedMemoJobs(prev => {
                                  if (prev.find(j => j.id === jobItem.id)) return prev;
                                  return [...prev, jobItem];
                                });
                              }}
                              onMouseEnter={() => setHoveredMemoJobIndex(index)}
                              onMouseLeave={() => setHoveredMemoJobIndex(null)}
                              className="w-full px-3 py-2 text-left text-[10px]"
                              style={{
                                backgroundColor: hoveredMemoJobIndex === index ? '#fef2f2' : 'transparent',
                                color: '#111827'
                              }}
                            >
                              <div className="font-medium">{pickByLanguage(jobItem, 'title') || jobItem.jobCode}</div>
                              <div className="text-[9px]" style={{ color: '#6b7280' }}>
                                Mã: {jobItem.jobCode || jobItem.id}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  {editingMemoId && (
                    <button
                      type="button"
                      onClick={resetMemoForm}
                      className="text-[10px]"
                      style={{ color: '#7f1d1d' }}
                    >
                      Hủy chỉnh sửa
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveMemo}
                    disabled={savingMemo}
                    className="ml-auto px-4 py-2 rounded text-[10px] font-semibold"
                    style={{
                      backgroundColor: '#b91c1c',
                      color: 'white',
                      opacity: savingMemo ? 0.7 : 1
                    }}
                  >
                    {savingMemo ? 'Đang lưu...' : (editingMemoId ? 'Cập nhật memo' : 'Lưu memo')}
                  </button>
                </div>
              </div>
            )}

            {/* Memo list */}
            <div className="mb-3 px-4 max-h-[50vh] overflow-y-auto flex-1">
              {loadingMemos ? (
                <p className="text-[10px]" style={{ color: '#6b7280' }}>Đang tải memo...</p>
              ) : memoError ? (
                <p className="text-[10px]" style={{ color: '#b91c1c' }}>{memoError}</p>
              ) : memos.length === 0 ? (
                <p className="text-[10px]" style={{ color: '#6b7280' }}>Chưa có memo nào cho đơn này.</p>
              ) : (
                memos.map((m) => (
                  <div
                    key={m.id}
                    className="p-2 mb-2 rounded border text-[10px]"
                    style={{
                      backgroundColor: editingMemoId === m.id ? '#fee2e2' : 'white',
                      borderColor: '#fecaca',
                      color: '#374151'
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">
                        {m.creator?.name || 'Super Admin'}
                      </span>
                      <span className="text-[10px]" style={{ color: '#9ca3af' }}>
                        {m.created_at ? new Date(m.created_at).toLocaleString('vi-VN') : ''}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap mb-1">{m.note}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        {m.job && (
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/jobs/${m.job.id}`)}
                            className="text-[10px] inline-flex items-center gap-1"
                            style={{ color: '#2563eb' }}
                          >
                            <Briefcase className="w-2.5 h-2.5" />
                            {pickByLanguage(m.job, 'title') || m.job.jobCode || `Job #${m.job.id}`}
                          </button>
                        )}
                      </div>
                      {isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditMemo(m)}
                            className="text-[10px]"
                            style={{ color: '#b91c1c' }}
                          >
                            Sửa
                          </button>
                          {m?.id && String(m.id) !== '0' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMemo(m)}
                              disabled={String(deletingMemoId) === String(m.id)}
                              className="text-[10px]"
                              style={{
                                color: '#dc2626',
                                opacity: String(deletingMemoId) === String(m.id) ? 0.6 : 1
                              }}
                            >
                              {String(deletingMemoId) === String(m.id) ? (t.deleting || 'Đang xóa...') : (t.delete || 'Xóa')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default NominationsPageContent;

