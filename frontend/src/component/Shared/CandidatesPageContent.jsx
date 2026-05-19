import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import {
  getCvDisplayStatusStyle,
  getCvDisplayStatusLabel,
  getCVStatusOptions,
  getCVStatusFilterDotStyle,
  isCvUnavailableForNomination,
  isCvPromotedInactive,
} from '../../utils/cvStatus';
import { formatDuplicateWithCvRef } from '../../utils/cvDuplicateDisplay.js';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import {
  Search,
  Info,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  Mail,
  Phone,
  Edit,
  Trash2,
  AlertTriangle,
  Table,
  Plus,
} from 'lucide-react';
import BulkImportCandidatesModal from './BulkImportCandidatesModal';
import QuickCreateCandidateDrawer from './QuickCreateCandidateDrawer';

const CANDIDATES_LIST_STORAGE_PREFIX = 'wsj_candidates_list_v1';

const readCandidatesListSession = (variant) => {
  try {
    const raw = sessionStorage.getItem(`${CANDIDATES_LIST_STORAGE_PREFIX}_${variant}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Shared candidates list for Admin and Agent.
 * @param {'admin'|'agent'} variant - Controls API, routes, columns, and Edit/Delete visibility.
 */
const CandidatesPageContent = ({ variant = 'admin' }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const isAdmin = variant === 'admin';
  const basePath = isAdmin ? '/admin/candidates' : '/agent/candidates';
  const listSessionKey = useMemo(() => `${CANDIDATES_LIST_STORAGE_PREFIX}_${variant}`, [variant]);
  const candidatesListSnap = useMemo(() => readCandidatesListSession(variant), [variant]);
  const persistCandidatesTimerRef = useRef(null);

  const [adminProfile] = useState(null);
  const [viewMode] = useState('all');
  const [searchQuery, setSearchQuery] = useState(() =>
    typeof candidatesListSnap?.searchQuery === 'string' ? candidatesListSnap.searchQuery : ''
  );
  const [selectedStatuses, setSelectedStatuses] = useState(() =>
    Array.isArray(candidatesListSnap?.selectedStatuses) ? candidatesListSnap.selectedStatuses : []
  );
  const [adminCandidateTab, setAdminCandidateTab] = useState(() => {
    const snapTab = candidatesListSnap?.adminCandidateTab;
    return snapTab === 'failed' ? 'failed' : 'success';
  });
  const adminTabStatuses = adminCandidateTab === 'failed' ? [5] : [1, 3, 4];
  const [currentPage, setCurrentPage] = useState(() => {
    const p = Number(candidatesListSnap?.currentPage);
    return p > 0 ? p : 1;
  });
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const n = Number(candidatesListSnap?.itemsPerPage);
    return n > 0 ? n : 20;
  });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [sortColumn, setSortColumn] = useState(() => {
    const c = candidatesListSnap?.sortColumn;
    return c === 'name' || c === 'applicationsCount' || c === 'createdAt' ? c : 'createdAt';
  });
  const [sortDirection, setSortDirection] = useState(() =>
    candidatesListSnap?.sortDirection === 'asc' || candidatesListSnap?.sortDirection === 'desc'
      ? candidatesListSnap.sortDirection
      : 'desc'
  );
  const [hoveredTableHeader, setHoveredTableHeader] = useState(null);
  const [hoveredResetButton, setHoveredResetButton] = useState(false);
  const [hoveredInfoButton, setHoveredInfoButton] = useState(false);
  const [hoveredAddCandidateButton, setHoveredAddCandidateButton] = useState(false);
  const [hoveredPaginationNavButton, setHoveredPaginationNavButton] = useState(null);
  const [hoveredPaginationButtonIndex, setHoveredPaginationButtonIndex] = useState(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredCollaboratorLinkIndex, setHoveredCollaboratorLinkIndex] = useState(null);
  const [hoveredApplicationsLinkIndex, setHoveredApplicationsLinkIndex] = useState(null);
  const [hoveredViewButtonIndex, setHoveredViewButtonIndex] = useState(null);
  const [hoveredEditButtonIndex, setHoveredEditButtonIndex] = useState(null);
  const [hoveredDeleteButtonIndex, setHoveredDeleteButtonIndex] = useState(null);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [hoveredBulkImportButton, setHoveredBulkImportButton] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState('');
  const [bulkStatusApplying, setBulkStatusApplying] = useState(false);
  /** Đổi trạng thái hồ sơ inline trong bảng (admin) */
  const [cvStatusUpdatingId, setCvStatusUpdatingId] = useState(null);

  useEffect(() => {
    loadCandidates();
  }, [
    currentPage,
    itemsPerPage,
    selectedStatuses,
    sortColumn,
    sortDirection,
    searchQuery,
    viewMode,
    adminCandidateTab,
  ]);

  useEffect(() => {
    if (persistCandidatesTimerRef.current) clearTimeout(persistCandidatesTimerRef.current);
    persistCandidatesTimerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(
          listSessionKey,
          JSON.stringify({
            searchQuery,
            selectedStatuses,
            viewMode,
            adminCandidateTab,
            sortColumn,
            sortDirection,
            itemsPerPage,
            currentPage,
          })
        );
      } catch {
        // ignore
      }
    }, 250);
    return () => {
      if (persistCandidatesTimerRef.current) clearTimeout(persistCandidatesTimerRef.current);
    };
  }, [
    listSessionKey,
    searchQuery,
    selectedStatuses,
    viewMode,
    adminCandidateTab,
    sortColumn,
    sortDirection,
    itemsPerPage,
    currentPage,
  ]);

  useEffect(() => {
    setSelectedRows(new Set());
    setBulkNewStatus('');
  }, [currentPage, itemsPerPage]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const activeSortColumn = sortColumn || 'createdAt';
      const activeSortDirection = sortDirection || 'desc';
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const hasSearch = normalizedSearch.length > 0;
      if (isAdmin) {
        const params = {
          page: currentPage,
          limit: itemsPerPage,
        };
        if (hasSearch) {
          params.search = searchQuery.trim();
        }
        if (adminCandidateTab === 'failed') {
          params.status = '5';
        } else {
          const statusFilters = selectedStatuses.length > 0 ? [...selectedStatuses] : [...adminTabStatuses];
          if (!hasSearch) {
            params.status = statusFilters.join(',');
          }
        }
        params.sortBy = activeSortColumn === 'name' ? 'name' : activeSortColumn === 'applicationsCount' ? 'applicationsCount' : 'createdAt';
        params.sortOrder = String(activeSortDirection).toUpperCase();
        const response = await apiService.getAdminCVs(params);
        if (response.success && response.data) {
          let list = response.data.cvs || [];
          const sortListAdmin = (arr) => {
            if (!arr.length) return arr;
            return [...arr].sort((a, b) => {
              let aVal, bVal;
              switch (activeSortColumn) {
                case 'name':
                  aVal = (a.name || a.fullName || '').toLowerCase();
                  bVal = (b.name || b.fullName || '').toLowerCase();
                  break;
                case 'applicationsCount':
                  aVal = a.applicationsCount ?? 0;
                  bVal = b.applicationsCount ?? 0;
                  break;
                case 'createdAt':
                  aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  break;
                default:
                  return 0;
              }
              if (activeSortDirection === 'asc') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
              return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            });
          };
          if (!hasSearch && list.length > 0) list = sortListAdmin(list);
          setCandidates(list);
          setPagination(response.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 });
        }
      } else {
        const params = {};
        if (hasSearch) {
          params.page = currentPage;
          params.limit = itemsPerPage;
          params.search = searchQuery.trim();
        } else {
          params.page = currentPage;
          params.limit = itemsPerPage;
        }
        if (selectedStatuses.length > 0) {
          params.status = selectedStatuses.join(',');
        }
        params.sortBy = activeSortColumn;
        params.sortOrder = activeSortDirection;
        const response = await apiService.getCVStorages(params);
        if (response.success && response.data) {
          let list = response.data.cvs || [];
          if (!hasSearch && list.length > 0) {
            list = [...list].sort((a, b) => {
              let aVal, bVal;
              switch (activeSortColumn) {
                case 'name':
                  aVal = (a.name || a.nameKanji || '').toLowerCase();
                  bVal = (b.name || b.nameKanji || '').toLowerCase();
                  break;
                case 'applicationsCount':
                  aVal = a.applicationsCount ?? 0;
                  bVal = b.applicationsCount ?? 0;
                  break;
                case 'createdAt': {
                  const aDate = a.createdAt || a.created_at || null;
                  const bDate = b.createdAt || b.created_at || null;
                  aVal = aDate ? new Date(aDate).getTime() : 0;
                  bVal = bDate ? new Date(bDate).getTime() : 0;
                  break;
                }
                default:
                  return 0;
              }
              if (activeSortDirection === 'asc') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
              return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            });
          }
          setCandidates(list);
          setPagination(response.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 });
        }
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'createdAt' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return <ChevronUp className="w-3 h-3 opacity-30" style={{ color: '#9ca3af' }} />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3 h-3" style={{ color: '#2563eb' }} />
      : <ChevronDown className="w-3 h-3" style={{ color: '#2563eb' }} />;
  };

  const totalItems = pagination.total || 0;
  const totalPages = pagination.totalPages || 0;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(candidates.map((_, index) => index)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) newSelected.delete(index);
    else newSelected.add(index);
    setSelectedRows(newSelected);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedStatuses([]);
    setSortColumn('createdAt');
    setSortDirection('desc');
    setCurrentPage(1);
    setSelectedRows(new Set());
    setBulkNewStatus('');
    if (isAdmin) setAdminCandidateTab('success');
    try {
      sessionStorage.removeItem(listSessionKey);
    } catch {
      // ignore
    }
    loadCandidates();
  };

  const handleBulkApplyStatus = async () => {
    if (!isAdmin || adminProfile?.role !== 1) return;
    const st = parseInt(String(bulkNewStatus), 10);
    if (Number.isNaN(st) || ![1, 3, 4, 5].includes(st)) {
      return;
    }
    const ids = [...selectedRows].map((i) => candidates[i]?.id).filter(Boolean);
    if (!ids.length) return;
    const confirmMsg = (t.candidatesPageBulkStatusConfirm || '').replace('{count}', String(ids.length));
    if (!window.confirm(confirmMsg)) return;
    setBulkStatusApplying(true);
    try {
      let failed = 0;
      for (const id of ids) {
        try {
          const res = await apiService.updateAdminCV(id, { status: st });
          if (!res?.success) failed += 1;
        } catch {
          failed += 1;
        }
      }
      if (failed > 0) {
        alert(failed === ids.length ? (t.updateFailed || 'Cập nhật thất bại') : `${failed}/${ids.length} ${t.updateFailed || 'lỗi'}`);
      }
      setSelectedRows(new Set());
      setBulkNewStatus('');
      await loadCandidates();
    } finally {
      setBulkStatusApplying(false);
    }
  };

  /** Chuẩn hóa status CV cho <select> (1 | 3 | 4 | 5), legacy 2 → 1 */
  const normalizeCvStatusValue = (status) => {
    const n = Number(status);
    if (n === 3) return 3;
    if (n === 4) return 4;
    if (n === 5) return 5;
    return 1;
  };

  const handleCvStatusInlineChange = async (candidate, newStatus) => {
    const st = normalizeCvStatusValue(newStatus);
    const cur = normalizeCvStatusValue(candidate.status);
    if (st === cur || !isAdmin) return;
    setCvStatusUpdatingId(candidate.id);
    try {
      const res = await apiService.updateAdminCV(candidate.id, { status: st });
      if (res?.success) {
        const updatedCv = res?.data?.cv ? { ...res.data.cv } : null;
        setCandidates((prev) => {
          const nextList = prev.map((c) => {
            if (c.id !== candidate.id) return c;
            const next = { ...c, status: st };
            return updatedCv ? { ...next, ...updatedCv, status: st } : next;
          });
          return nextList;
        });
        await loadCandidates();
        if (st === 5) {
          setAdminCandidateTab('failed');
          setSelectedStatuses([]);
          setCurrentPage(1);
        } else if (st === 1 && adminCandidateTab === 'failed') {
          setAdminCandidateTab('success');
          setSelectedStatuses([]);
          setCurrentPage(1);
        }
      } else {
        alert(res?.message || t.updateFailed);
      }
    } catch (e) {
      console.error(e);
      alert(t.updateFailed);
    } finally {
      setCvStatusUpdatingId(null);
    }
  };

  const handleDelete = async (candidateId, e) => {
    e.stopPropagation();
    const confirmMsg = isAdmin ? t.confirmDeleteCandidateAdmin : t.confirmDeleteCandidate;
    const errorMsg = isAdmin ? t.errorDeleteCandidateAdmin : t.errorDeleteCandidate;
    if (!window.confirm(confirmMsg)) return;
    try {
      const response = isAdmin
        ? await apiService.deleteAdminCV(candidateId)
        : await apiService.deleteCVStorage(candidateId);
      if (response.success) {
        loadCandidates();
      } else {
        alert(response.message || errorMsg);
      }
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert(errorMsg);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const locale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';
      return new Date(dateString).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return '—';
    }
  };

  const isSuperAdmin = adminProfile?.role === 1;
  const isBackOffice = isAdmin && adminProfile && !isSuperAdmin;
  const showEditDelete = isAdmin ? isSuperAdmin || isBackOffice : true;

  const isMyManagedCandidate = (candidate) => {
    if (!isBackOffice) return true;
    const myId = adminProfile?.id;
    const cvAdminId = candidate?.adminId ?? candidate?.admin_id ?? candidate?.admin?.id;
    return myId != null && cvAdminId != null && Number(cvAdminId) === Number(myId);
  };
  const canOperateOnCandidate = (candidate) => {
    if (!isBackOffice) return true;
    return isMyManagedCandidate(candidate);
  };
  /** Giống NominationsPageContent: super admin hoặc admin phụ trách hồ sơ */
  const canEditCvStatusInline = (c) => {
    if (!isAdmin) return false;
    if (isSuperAdmin) return true;
    const myId = adminProfile?.id;
    const responsibleId = c?.admin?.id ?? c?.adminId;
    if (myId != null && responsibleId != null && Number(responsibleId) === Number(myId)) return true;
    return false;
  };

  const openCandidateDetail = (candidate) => {
    if (isCvPromotedInactive(candidate)) {
      alert(t.cvProfileUnavailableNotice);
      return;
    }
    if (!isAdmin && isCvUnavailableForNomination(candidate)) return;
    navigate(`${basePath}/${candidate.id}`);
  };
  /** Cùng trường `cv_storages.status` với cột badge (1 hợp lệ xanh, 3 trùng đỏ, 4 quá hạn, 5 khởi tạo thất bại) — Admin & CTV */
  const statusOptions = getCVStatusOptions(language);
  const colCount = isAdmin ? 10 : 6;

  const displayName = (c) => c.name || c.fullName || c.nameKanji || 'N/A';

  const getCandidateMissingFields = (candidate) => {
    const hasValue = (value) => {
      if (Array.isArray(value)) return value.length > 0;
      return String(value ?? '').trim().length > 0;
    };

    return [
      { key: 'nameKanji', label: 'Họ tên', missing: !hasValue(candidate?.name || candidate?.fullName || candidate?.nameKanji) },
      { key: 'birthDate', label: 'Ngày sinh', missing: !hasValue(candidate?.birthDate) },
      { key: 'email', label: 'Email', missing: !hasValue(candidate?.email) },
      { key: 'jlptLevel', label: 'JLPT', missing: !hasValue(candidate?.jlptLevel || candidate?.jpLevel || candidate?.japaneseLevel) },
      { key: 'experienceYears', label: 'Số năm kinh nghiệm', missing: !hasValue(candidate?.experienceYears || candidate?.yearsOfExperience || candidate?.experienceYear || candidate?.workExperienceYears) },
      { key: 'jobCategoryId', label: 'Ngành nghề', missing: !hasValue(candidate?.jobCategoryId || candidate?.job_category_id || candidate?.jobCategory?.id || candidate?.jobCategoryName || candidate?.job_category_name || candidate?.categoryName) },
      { key: 'jpResidenceStatus', label: 'Tư cách lưu trú', missing: !hasValue(candidate?.jpResidenceStatus || candidate?.jp_residence_status || candidate?.residenceStatus || candidate?.residence_status || candidate?.visaStatus) },
      { key: 'cvFile', label: 'File CV', missing: !hasValue(candidate?.cvFile || candidate?.cvOriginalPath || candidate?.curriculumVitae || candidate?.originalFilePath) },
    ].filter((item) => item.missing);
  };

  const getMissingFieldTooltip = (candidate) => {
    const missingFields = getCandidateMissingFields(candidate);
    if (!missingFields.length) return '';
    return t.candidateMissingInfoTooltip || 'Hồ sơ thiếu thông tin để AI matching job';
  };

  const renderMissingFieldBadges = (candidate, { className = '', iconClassName = 'h-3 w-3' } = {}) => {
    const missingFields = getCandidateMissingFields(candidate);
    if (!missingFields.length) return null;

    const tooltip = getMissingFieldTooltip(candidate);

    return (
      <div className={`group relative flex items-center ${className}`}>
        <span
          className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600"
          aria-label={tooltip}
          tabIndex={0}
          style={{ width: 18, height: 18 }}
        >
          <AlertTriangle className={iconClassName} style={{ color: '#dc2626' }} />
        </span>

        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max max-w-[260px] -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-[11px] leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {tooltip}
        </span>
      </div>
    );
  };

  const displayApplicantOwner = (c) => {
    const a = c?.applicant;
    if (!a) return '—';
    const n = (a.name || '').trim();
    const em = (a.email || '').trim();
    if (n && em) return { primary: n, secondary: em };
    if (n) return { primary: n, secondary: null };
    if (em) return { primary: em, secondary: null };
    return '—';
  };

  /** Dùng chung cho bảng desktop và card mobile */
  const getCandidateRowUi = (candidate) => {
    const isPromotedInactive = isCvPromotedInactive(candidate);
    const s = getCvDisplayStatusStyle(candidate);
    const ctvName = candidate.collaborator?.name || candidate.collaborator?.fullName || candidate.collaborator?.code || '—';
    const applicantOwner = displayApplicantOwner(candidate);
    const isAgentGreyedOut = !isAdmin && isCvUnavailableForNomination(candidate);
    const isNotMyManaged = isBackOffice && viewMode === 'all' && !isMyManagedCandidate(candidate);
    const isGreyedOut = isAgentGreyedOut || isNotMyManaged;
    const isRowVisuallyDimmed = isGreyedOut || (isAdmin && isPromotedInactive);
    return { s, ctvName, applicantOwner, isGreyedOut, isNotMyManaged, isPromotedInactive, isRowVisuallyDimmed };
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {isAdmin && (
        <BulkImportCandidatesModal
          isOpen={bulkImportModalOpen}
          onClose={() => setBulkImportModalOpen(false)}
          onSuccess={loadCandidates}
        />
      )}
      <QuickCreateCandidateDrawer
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onCreated={() => loadCandidates()}
      />
      <div className="w-full px-0 py-1.5 mb-1.5 flex-shrink-0 lg:py-1 lg:mb-1 xl:py-1.5 xl:mb-1.5">
        {isAdmin ? null : null}
        <div className="flex w-full flex-wrap items-center justify-between gap-2 lg:gap-1.5 xl:gap-2.5">
          <div className="flex min-w-0 flex-1 items-center rounded-full bg-white px-2.5 py-2 text-[9px] sm:min-w-[220px] sm:text-xs lg:px-2 lg:py-1.5 lg:text-[9px] xl:px-3 xl:py-2 xl:text-xs">
            <Search className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 xl:mr-2 xl:h-3.5 xl:w-3.5" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder={isAdmin ? t.searchPlaceholderAdmin : t.placeholderCandidateName}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-transparent text-[9px] outline-none placeholder:text-[9px] sm:text-xs sm:placeholder:text-xs lg:text-[9px] lg:placeholder:text-[9px] xl:text-xs xl:placeholder:text-xs"
              style={{ border: 'none' }}
            />
          </div>
          <button
            onClick={() => {
              setQuickCreateOpen(true);
            }}
            onMouseEnter={() => setHoveredAddCandidateButton(true)}
            onMouseLeave={() => setHoveredAddCandidateButton(false)}
            className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[9px] sm:hidden"
            style={{
              backgroundColor: hoveredAddCandidateButton ? '#dc2626' : '#ef4444',
              color: 'white'
            }}
            aria-label={t.addCandidateShort}
            title={t.addCandidateShort}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleReset}
            onMouseEnter={() => setHoveredResetButton(true)}
            onMouseLeave={() => setHoveredResetButton(false)}
            className="inline-flex h-8 flex-shrink-0 items-center justify-center rounded-full px-3 text-[8px] font-semibold sm:hidden"
            style={{ backgroundColor: hoveredResetButton ? '#e5e7eb' : '#f3f4f6', color: '#374151' }}
          >
            {t.reset}
          </button>
          <div className="flex w-full items-center justify-start gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:flex-wrap sm:justify-end sm:gap-1.5 sm:overflow-visible sm:pb-0 lg:gap-1.5 xl:gap-2.5">
            <button
              onClick={handleReset}
              onMouseEnter={() => setHoveredResetButton(true)}
              onMouseLeave={() => setHoveredResetButton(false)}
              className="hidden rounded-full px-2.5 py-1.5 text-[9px] font-semibold transition-colors sm:inline-flex sm:text-[10px] lg:px-2 lg:py-1 lg:text-[9px] xl:px-3 xl:py-1.5 xl:text-[10px]"
              style={{ backgroundColor: hoveredResetButton ? '#e5e7eb' : '#f3f4f6', color: '#374151' }}
            >
              {t.reset}
            </button>
            {isAdmin && (
              <div className="flex shrink-0 items-center gap-1 rounded-full border border-blue-100 bg-blue-50 p-1 text-[8px] font-semibold sm:text-[10px] lg:text-[9px] xl:text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setAdminCandidateTab('success');
                    setSelectedStatuses([]);
                    setCurrentPage(1);
                  }}
                  className="whitespace-nowrap rounded-full px-2 py-1.5 transition-colors sm:px-2.5 lg:px-2 xl:px-3"
                  style={{
                    backgroundColor: adminCandidateTab === 'success' ? '#2563eb' : 'transparent',
                    color: adminCandidateTab === 'success' ? 'white' : '#1d4ed8',
                  }}
                >
                  Hồ sơ khởi tạo thành công
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminCandidateTab('failed');
                    setSelectedStatuses([]);
                    setCurrentPage(1);
                  }}
                  className="whitespace-nowrap rounded-full px-2 py-1.5 transition-colors sm:px-2.5 lg:px-2 xl:px-3"
                  style={{
                    backgroundColor: adminCandidateTab === 'failed' ? '#ea580c' : 'transparent',
                    color: adminCandidateTab === 'failed' ? 'white' : '#c2410c',
                  }}
                >
                  Hồ sơ khởi tạo thất bại
                </button>
              </div>
            )}
            <button
              onMouseEnter={() => setHoveredInfoButton(true)}
              onMouseLeave={() => setHoveredInfoButton(false)}
              className="p-1.5 rounded-full transition-colors"
              style={{ color: hoveredInfoButton ? '#1f2937' : '#4b5563' }}
            >
              <Info className="h-3 w-3" />
            </button>
            {!isAdmin || adminCandidateTab !== 'failed' ? (
              <>
                <div className="relative">
                  <button
                    type="button"
                    title={t.candidatesPageStatusFilterLabel}
                    onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                    className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-white px-2.5 py-1.5 text-[8px] font-semibold sm:text-[10px] lg:gap-1 lg:px-2 lg:py-1 lg:text-[9px] xl:gap-1.5 xl:px-3 xl:py-1.5 xl:text-[10px]"
                    style={{
                      color: selectedStatuses.length > 0 ? '#1d4ed8' : '#374151',
                      backgroundColor: selectedStatuses.length > 0 ? '#eff6ff' : 'white',
                      border: selectedStatuses.length > 0 ? '1px solid #bfdbfe' : '1px solid transparent',
                    }}
                  >
                    <span className="sm:hidden">{t.status || 'Trạng thái'}</span>
                    <span className="hidden sm:inline">{t.cvStatus || t.status}</span>
                    {selectedStatuses.length > 0 && (
                      <span
                        className="ml-0.5 inline-flex items-center justify-center rounded-full text-[8px] font-bold leading-none"
                        style={{ backgroundColor: '#2563eb', color: 'white', width: 16, height: 16 }}
                      >
                        {selectedStatuses.length}
                      </span>
                    )}
                    <ChevronDown className="h-2.5 w-2.5 xl:h-3 xl:w-3" />
                  </button>
                  {isStatusFilterOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-2.5 z-20 text-[9px] sm:text-[10px] lg:p-2 lg:text-[9px] xl:p-3 xl:text-[10px]" style={{ borderColor: '#e5e7eb' }}>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedStatuses.length === 0}
                            onChange={() => { setSelectedStatuses([]); setCurrentPage(1); }}
                            className="w-3.5 h-3.5 rounded"
                            style={{ accentColor: '#2563eb' }}
                          />
                          <span>{t.allStatus}</span>
                        </label>
                        {statusOptions.map((opt) => (
                          <label key={opt.value} className="flex cursor-pointer items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={selectedStatuses.includes(opt.value)}
                              onChange={() => {
                                setSelectedStatuses((prev) => {
                                  const exists = prev.includes(opt.value);
                                  const next = exists ? prev.filter((v) => v !== opt.value) : [...prev, opt.value];
                                  return next;
                                });
                                setCurrentPage(1);
                              }}
                              className="w-3.5 h-3.5 rounded"
                              style={{ accentColor: '#2563eb' }}
                            />
                            <span className="inline-flex flex-1 items-center gap-1.5">
                              <span
                                className="h-2 w-2 flex-shrink-0 rounded-full"
                                style={getCVStatusFilterDotStyle(opt.value)}
                                aria-hidden
                              />
                              <span>{opt.label}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setBulkImportModalOpen(true)}
                    onMouseEnter={() => setHoveredBulkImportButton(true)}
                    onMouseLeave={() => setHoveredBulkImportButton(false)}
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1.5 text-[8px] font-semibold transition-colors sm:px-2.5 sm:text-[10px] lg:gap-1 lg:px-2 lg:text-[9px] xl:gap-1.5 xl:px-3 xl:text-[10px]"
                    style={{
                      backgroundColor: hoveredBulkImportButton ? '#eff6ff' : 'white',
                      borderColor: '#2563eb',
                      color: '#1d4ed8'
                    }}
                  >
                    <Table className="h-3 w-3 flex-shrink-0 xl:h-3.5 xl:w-3.5" />
                    {t.candidatesPageBulkImport || 'Import Excel'}
                  </button>
                )}
              </>
            ) : null}
            <button
              onClick={() => {
                setQuickCreateOpen(true);
              }}
              onMouseEnter={() => setHoveredAddCandidateButton(true)}
              onMouseLeave={() => setHoveredAddCandidateButton(false)}
              className="hidden rounded-full px-2.5 py-1.5 text-[9px] font-semibold transition-colors sm:inline-flex sm:text-[10px] lg:px-2 lg:py-1 lg:text-[9px] xl:px-3 xl:py-1.5 xl:text-[10px]"
              style={{
                backgroundColor: hoveredAddCandidateButton ? '#dc2626' : '#ef4444',
                color: 'white'
              }}
            >
              {t.addCandidateShort}
            </button>
          </div>
        </div>
      </div>

      {isAdmin && isSuperAdmin && selectedRows.size > 0 && (
        <div
          className="mb-2 flex flex-shrink-0 flex-wrap items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs lg:gap-1.5 lg:px-2 lg:py-1.5 lg:text-[11px] xl:gap-2 xl:px-3 xl:py-2 xl:text-xs"
          style={{ borderColor: '#fcd34d', backgroundColor: 'rgba(254, 243, 199, 0.65)' }}
        >
          <span className="font-semibold" style={{ color: '#92400e' }}>
            {(t.candidatesPageBulkStatusHint || '').replace('{count}', String(selectedRows.size))}
          </span>
          <select
            value={bulkNewStatus}
            onChange={(e) => setBulkNewStatus(e.target.value)}
            className="rounded-lg border px-2 py-1.5 font-medium outline-none"
            style={{ borderColor: '#d1d5db', color: '#374151', backgroundColor: 'white' }}
          >
            <option value="">{t.candidatesPageBulkStatusPlaceholder}</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={bulkStatusApplying || !bulkNewStatus}
            onClick={handleBulkApplyStatus}
            className="rounded-lg px-3 py-1.5 font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#2563eb' }}
          >
            {bulkStatusApplying ? '…' : t.candidatesPageBulkStatusApply}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRows(new Set());
              setBulkNewStatus('');
            }}
            className="rounded-lg border px-2 py-1.5 font-medium"
            style={{ borderColor: '#d1d5db', color: '#374151', backgroundColor: 'white' }}
          >
            {t.candidatesPageBulkStatusClearSelection}
          </button>
        </div>
      )}

      <div className="mb-2 flex flex-shrink-0 flex-wrap items-center justify-between gap-y-2 xl:mb-3">
        <div className="flex items-center gap-1 xl:gap-1.5">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('first')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="px-1.5 py-1 border rounded text-xs font-semibold transition-colors lg:px-1 lg:py-0.5 lg:text-[11px] xl:px-0.5 xl:py-0.5 xl:text-xs"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'first' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db', color: '#374151',
              opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('prev')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="px-1.5 py-1 border rounded text-xs font-semibold transition-colors lg:px-1 lg:py-0.5 lg:text-[11px] xl:px-0.5 xl:py-0.5 xl:text-xs"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'prev' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db', color: '#374151',
              opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {[...Array(Math.min(7, totalPages))].map((_, i) => {
            let pageNum;
            if (totalPages <= 7) pageNum = i + 1;
            else if (currentPage <= 4) pageNum = i + 1;
            else if (currentPage >= totalPages - 3) pageNum = totalPages - 6 + i;
            else pageNum = currentPage - 3 + i;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                onMouseEnter={() => currentPage !== pageNum && setHoveredPaginationButtonIndex(pageNum)}
                onMouseLeave={() => setHoveredPaginationButtonIndex(null)}
                className="px-2 py-1 rounded text-xs font-semibold transition-colors lg:px-1.5 lg:py-0.5 lg:text-[11px] xl:px-2.5 xl:py-1 xl:text-xs"
                style={{
                  backgroundColor: currentPage === pageNum ? '#2563eb' : (hoveredPaginationButtonIndex === pageNum ? '#f9fafb' : 'white'),
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
            onMouseEnter={() => currentPage !== totalPages && setHoveredPaginationNavButton('next')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="px-1.5 py-1 border rounded text-xs font-semibold transition-colors lg:px-1 lg:py-0.5 lg:text-[11px] xl:px-0.5 xl:py-0.5 xl:text-xs"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'next' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db', color: '#374151',
              opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            onMouseEnter={() => currentPage !== totalPages && setHoveredPaginationNavButton('last')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="px-1.5 py-1 border rounded text-xs font-semibold transition-colors lg:px-1 lg:py-0.5 lg:text-[11px] xl:px-0.5 xl:py-0.5 xl:text-xs"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'last' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db', color: '#374151',
              opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 lg:gap-1 xl:gap-2">
          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="px-2 py-1 border rounded text-xs font-semibold lg:px-1.5 lg:py-0.5 lg:text-[11px] xl:px-2.5 xl:py-1 xl:text-xs"
            style={{ borderColor: '#d1d5db', color: '#374151', outline: 'none' }}
            onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span className="text-xs font-semibold lg:text-[11px] xl:text-xs" style={{ color: '#374151' }}>{totalItems} {t.items}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto relative">
        {/* Mobile: danh sách dạng card */}
        <div className="space-y-3 px-0.5 pb-4 lg:hidden">
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white py-10 text-center text-sm" style={{ color: '#6b7280' }}>
              {t.loadingCandidates}
            </div>
          ) : candidates.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-10 text-center text-sm" style={{ color: '#6b7280' }}>
              {t.noCandidatesFound}
            </div>
          ) : (
            candidates.map((candidate, index) => {
              const { s, ctvName, applicantOwner, isGreyedOut, isNotMyManaged, isPromotedInactive, isRowVisuallyDimmed } = getCandidateRowUi(candidate);
              const dupRef = isAdmin ? formatDuplicateWithCvRef(candidate) : null;
              return (
                <div
                  key={candidate.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (isNotMyManaged) return;
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    openCandidateDetail(candidate);
                  }}
                  className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow"
                  style={{
                    opacity: isRowVisuallyDimmed ? (isNotMyManaged ? 0.45 : 0.55) : 1,
                    cursor: isRowVisuallyDimmed ? 'not-allowed' : 'pointer',
                    pointerEvents: isNotMyManaged ? 'none' : 'auto',
                  }}
                  onClick={() => openCandidateDetail(candidate)}
                >
                  <div className="flex gap-2">
                    <div className="flex-shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
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
                          <div className="flex items-start gap-1.5">
                            <span className="text-base font-semibold text-gray-900">{displayName(candidate)}</span>
                            {renderMissingFieldBadges(candidate, { className: 'ml-1' })}
                            {(isCvPromotedInactive(candidate) || (!isAdmin && isCvUnavailableForNomination(candidate))) && (
                              <AlertTriangle
                                className="h-4 w-4 flex-shrink-0"
                                style={{ color: '#f97316' }}
                                title={isCvPromotedInactive(candidate) ? getCvDisplayStatusLabel(candidate, language) : t.duplicate}
                              />
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500">
                            ID: {candidate.code || candidate.id}
                          </p>
                          {isAdmin && dupRef != null && (
                            <div className="mt-1 text-sm text-gray-700">
                              <span className="font-medium text-gray-500">
                                {t.colDuplicateWithCvId || 'Trùng với hồ sơ'}:{' '}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/candidates/${dupRef.dupId}`);
                                }}
                                className="text-left font-semibold text-blue-600 hover:underline"
                                title={dupRef.tooltip}
                              >
                                <span className="break-words">{dupRef.profileLabel}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        {canEditCvStatusInline(candidate) && !isCvPromotedInactive(candidate) ? (
                          <select
                            value={normalizeCvStatusValue(candidate.status)}
                            onChange={(e) =>
                              handleCvStatusInlineChange(candidate, parseInt(e.target.value, 10))
                            }
                            disabled={cvStatusUpdatingId === candidate.id}
                            className="w-full max-w-full cursor-pointer rounded-lg border px-2 py-2 text-sm font-semibold"
                            style={{
                              backgroundColor: s.bg,
                              color: s.color,
                              borderColor: s.border,
                              outline: 'none',
                              opacity: cvStatusUpdatingId === candidate.id ? 0.65 : 1,
                            }}
                          >
                            {statusOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className="inline-flex rounded-lg px-2 py-1 text-sm font-medium"
                            style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                          >
                            {getCvDisplayStatusLabel(candidate, language)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                          {t.numberOfApplications}: {candidate.applicationsCount ?? 0}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`${basePath}/${candidate.id}/applications`);
                            }}
                            className="rounded p-1 text-blue-600 hover:bg-blue-50"
                            title={t.viewApplications}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </span>
                        <span>
                          {t.createdDate}: {formatDate(candidate.createdAt || candidate.created_at)}
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="space-y-1.5 border-t border-gray-100 pt-2 text-sm">
                          {candidate.email && candidate.email.includes('@') && (
                            <div className="flex min-w-0 items-start gap-1.5 break-all text-gray-700">
                              <Mail className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                              <span>{candidate.email}</span>
                            </div>
                          )}
                          {candidate.phone && (
                            <div className="flex items-center gap-1.5 text-gray-700">
                              <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                              <span className="break-all">{candidate.phone}</span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.collaborator && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/collaborators/${candidate.collaborator.id}`);
                                }}
                                className="inline-flex items-center gap-0.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800"
                              >
                                CTV {ctvName}
                              </button>
                            )}
                            {applicantOwner !== '—' && (
                              <span
                                className="inline-flex max-w-full items-center gap-0.5 truncate rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800"
                                title={applicantOwner.secondary ? `${applicantOwner.primary} (${applicantOwner.secondary})` : applicantOwner.primary}
                              >
                                UV {applicantOwner.primary}
                              </span>
                            )}
                            {!candidate.collaborator && applicantOwner === '—' && (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium text-gray-500">{t.colAdminName}:</span>{' '}
                            {candidate.admin?.name || '—'}
                          </div>
                        </div>
                      )}
                      <div
                        className="flex flex-wrap items-center justify-end gap-1 border-t border-gray-100 pt-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isGreyedOut && !(isAdmin && isPromotedInactive) ? (
                          <span className="text-sm font-medium text-gray-400">—</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCandidateDetail(candidate);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {t.viewDetail}
                            </button>
                            {showEditDelete && canOperateOnCandidate(candidate) && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`${basePath}/${candidate.id}/edit`);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                  {t.editTitle}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDelete(candidate.id, e)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 shadow-sm"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {t.deleteTitle}
                                </button>
                              </>
                            )}
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

        <div className="hidden h-full overflow-x-auto lg:block">
          <table className="w-full table-auto border-separate [border-spacing:0_2px] xl:[border-spacing:0_4px]">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'white' }}>
              <tr>
                <th className="w-7 px-px py-1.5 text-center text-[8px] font-bold xl:w-8 xl:px-0.5 xl:py-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827' }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.size === candidates.length && candidates.length > 0}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded"
                    style={{ accentColor: '#2563eb', borderColor: '#d1d5db' }}
                  />
                </th>
                <th
                  className="min-w-[96px] cursor-pointer px-px py-1.5 text-left text-[8px] font-bold transition-colors xl:min-w-[124px] xl:px-0.5 xl:py-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                  style={{ color: '#111827', backgroundColor: hoveredTableHeader === 'name' ? '#f3f4f6' : 'transparent' }}
                  onClick={() => handleSort('name')}
                  onMouseEnter={() => setHoveredTableHeader('name')}
                  onMouseLeave={() => setHoveredTableHeader(null)}
                >
                  <div className="flex items-center gap-0 xl:gap-0.5">{t.candidateName} {getSortIcon('name')}</div>
                </th>
                <th className="min-w-[70px] px-px py-1.5 text-left text-[8px] font-bold xl:min-w-[92px] xl:px-0.5 xl:py-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827' }}>{t.cvStatus || t.status}</th>
                <th
                  className="min-w-[70px] cursor-pointer px-px py-1.5 text-left text-[8px] font-bold transition-colors xl:min-w-[92px] xl:px-0.5 xl:py-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                  style={{ color: '#111827', backgroundColor: hoveredTableHeader === 'applicationsCount' ? '#f3f4f6' : 'transparent' }}
                  onClick={() => handleSort('applicationsCount')}
                  onMouseEnter={() => setHoveredTableHeader('applicationsCount')}
                  onMouseLeave={() => setHoveredTableHeader(null)}
                >
                  <div className="flex items-center gap-0 xl:gap-0.5">{t.numberOfApplications} {getSortIcon('applicationsCount')}</div>
                </th>
                <th
                  className="min-w-[58px] cursor-pointer py-1.5 pl-px pr-0 text-left text-[8px] font-bold transition-colors xl:min-w-[76px] xl:py-1.5 xl:pl-0.5 xl:pr-0 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                  style={{ color: '#111827', backgroundColor: hoveredTableHeader === 'createdAt' ? '#f3f4f6' : 'transparent' }}
                  onClick={() => handleSort('createdAt')}
                  onMouseEnter={() => setHoveredTableHeader('createdAt')}
                  onMouseLeave={() => setHoveredTableHeader(null)}
                >
                  <div className="flex items-center gap-0 xl:gap-0.5">{t.createdDate} {getSortIcon('createdAt')}</div>
                </th>
                
                {isAdmin && (
                  <>
                    <th className="min-w-[52px] py-1.5 pl-0 pr-px text-left text-[8px] font-bold xl:min-w-[74px] xl:pl-0 xl:pr-0.5 xl:py-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827' }}>{t.colEmail}</th>
                    <th className="min-w-[48px] px-px py-1.5 text-left text-[8px] font-bold xl:min-w-[70px] xl:px-0.5 xl:py-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827' }}>{t.colPhone}</th>
                    <th className="min-w-[100px] whitespace-nowrap px-px py-1.5 text-left text-[8px] font-bold xl:min-w-[140px] xl:px-0.5 xl:py-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827' }}>Phân loại</th>
                    <th className="min-w-[48px] whitespace-nowrap px-px py-1.5 text-left text-[8px] font-bold xl:min-w-[70px] xl:px-0.5 xl:py-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827' }}>{t.colAdminName}</th>
                  </>
                )}
                <th className="min-w-[80px] px-px py-1.5 text-center text-[8px] font-bold xl:min-w-[100px] xl:px-0.5 xl:py-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colCount} className="px-2 py-5 text-center text-[8px] xl:px-3 xl:py-6 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#6b7280' }}>{t.loadingCandidates}</td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-2 py-5 text-center text-[8px] xl:px-3 xl:py-6 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#6b7280' }}>{t.noCandidatesFound}</td>
                </tr>
              ) : (
                candidates.map((candidate, index) => {
                  const { s, ctvName, applicantOwner, isGreyedOut, isNotMyManaged, isPromotedInactive, isRowVisuallyDimmed } = getCandidateRowUi(candidate);
                  const dupRef = isAdmin ? formatDuplicateWithCvRef(candidate) : null;
                  return (
                    <tr
                      key={candidate.id}
                      className="transition-colors"
                      style={{
                        backgroundColor: isRowVisuallyDimmed ? '#f3f4f6' : (hoveredRowIndex === index ? '#f9fafb' : 'white'),
                        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
                        borderRadius: 12,
                        opacity: isRowVisuallyDimmed ? (isNotMyManaged ? 0.45 : 0.55) : 1,
                        cursor: isRowVisuallyDimmed ? 'not-allowed' : 'pointer',
                        pointerEvents: isNotMyManaged ? 'none' : 'auto',
                      }}
                      onClick={() => openCandidateDetail(candidate)}
                      onMouseEnter={() => setHoveredRowIndex(index)}
                      onMouseLeave={() => setHoveredRowIndex(null)}
                    >
                      <td className="px-px py-px text-center align-middle xl:px-0.5 xl:py-0.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(index)}
                          onChange={() => handleSelectRow(index)}
                          className="w-3.5 h-3.5 rounded"
                          style={{ accentColor: '#2563eb', borderColor: '#d1d5db' }}
                        />
                      </td>
                      <td className="cursor-pointer px-px py-px text-[8px] align-middle xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827' }}>
                        <div>
                          <div className="mb-0.5 flex items-start gap-1 xl:gap-1">
                            <span className="font-medium">{displayName(candidate)}</span>
                            {renderMissingFieldBadges(candidate, { className: 'ml-1' })}
                            {(isCvPromotedInactive(candidate) || (!isAdmin && isCvUnavailableForNomination(candidate))) && (
                              <span
                                className="inline-flex items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600"
                                title={isCvPromotedInactive(candidate) ? getCvDisplayStatusLabel(candidate, language) : t.duplicate}
                                aria-label={isCvPromotedInactive(candidate) ? getCvDisplayStatusLabel(candidate, language) : t.duplicate}
                                style={{ width: 18, height: 18 }}
                              >
                                <AlertTriangle
                                  className="w-3 h-3 flex-shrink-0"
                                  style={{ color: '#f97316' }}
                                />
                              </span>
                            )}
                          </div>
                          <div className="text-[8px] lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#6b7280' }}>
                            ID: {candidate.code || candidate.id}
                          </div>
                          {dupRef != null && (
                            <div className="mt-1 min-w-0 text-[8px] lg:text-[9px] xl:text-[10px] 2xl:text-[11px] text-gray-700">
                              <span className="font-medium text-gray-500">
                                {t.colDuplicateWithCvId || 'Trùng với hồ sơ'}:{' '}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/candidates/${dupRef.dupId}`);
                                }}
                                className="text-left font-semibold text-blue-600 hover:underline"
                                title={dupRef.tooltip}
                              >
                                <span className="break-words">{dupRef.profileLabel}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-px py-px align-middle xl:px-0.5 xl:py-0.5" onClick={(e) => e.stopPropagation()}>
                        {canEditCvStatusInline(candidate) && !isCvPromotedInactive(candidate) ? (
                          <select
                            value={normalizeCvStatusValue(candidate.status)}
                            onChange={(e) =>
                              handleCvStatusInlineChange(candidate, parseInt(e.target.value, 10))
                            }
                            disabled={cvStatusUpdatingId === candidate.id}
                            className="w-full max-w-[148px] cursor-pointer rounded border px-1 py-0.5 text-[8px] font-semibold xl:max-w-[160px] xl:px-1 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                            style={{
                              backgroundColor: s.bg,
                              color: s.color,
                              borderColor: s.border,
                              outline: 'none',
                              opacity: cvStatusUpdatingId === candidate.id ? 0.65 : 1,
                            }}
                          >
                            {statusOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className="inline-flex rounded px-px py-px text-[8px] font-medium xl:px-1 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                            style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                          >
                            {getCvDisplayStatusLabel(candidate, language)}
                          </span>
                        )}
                      </td>
                      <td className="px-px py-px align-middle xl:px-0.5 xl:py-0.5">
                        <div className="flex items-center gap-0.5">
                          <span className="text-[8px] font-medium lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#111827' }}>{candidate.applicationsCount ?? 0}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`${basePath}/${candidate.id}/applications`); }}
                            onMouseEnter={() => setHoveredApplicationsLinkIndex(index)}
                            onMouseLeave={() => setHoveredApplicationsLinkIndex(null)}
                            className="p-0.5"
                            style={{ color: hoveredApplicationsLinkIndex === index ? '#1e40af' : '#2563eb' }}
                            title={t.viewApplications}
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-px pl-px pr-0 align-middle text-[8px] xl:py-0.5 xl:pl-0.5 xl:pr-0 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#374151' }}>{formatDate(candidate.createdAt || candidate.created_at)}</td>
                      {isAdmin && (
                        <>
                          <td className="py-px pl-0 pr-px align-middle text-[8px] xl:py-0.5 xl:pl-0 xl:pr-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#374151' }}>
                            {candidate.email && candidate.email.includes('@') ? (
                              <div className="flex min-w-0 items-start gap-0.5">
                                <Mail className="mt-0.5 h-2 w-2 flex-shrink-0" style={{ color: '#9ca3af' }} />
                                <span className="min-w-0 break-all whitespace-normal">{candidate.email}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-px py-px align-middle text-[8px] xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#374151' }}>
                            {candidate.phone ? (
                              <div className="flex items-center gap-0.5">
                                <Phone className="w-2 h-2 flex-shrink-0" style={{ color: '#9ca3af' }} />
                                <span className="truncate">{candidate.phone}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-px py-px align-middle xl:px-0.5 xl:py-0.5">
                            <div className="flex flex-wrap items-center gap-0.5 xl:gap-1">
                              {candidate.collaborator && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/collaborators/${candidate.collaborator.id}`); }}
                                  onMouseEnter={() => setHoveredCollaboratorLinkIndex(index)}
                                  onMouseLeave={() => setHoveredCollaboratorLinkIndex(null)}
                                  className="inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[8px] font-semibold transition-colors xl:px-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                                  style={{
                                    backgroundColor: hoveredCollaboratorLinkIndex === index ? '#dbeafe' : '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #bfdbfe',
                                  }}
                                  title={ctvName}
                                >
                                  CTV {ctvName}
                                </button>
                              )}
                              {applicantOwner !== '—' && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[8px] font-semibold xl:px-1.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]"
                                  style={{
                                    backgroundColor: '#f0fdf4',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0',
                                  }}
                                  title={applicantOwner.secondary ? `${applicantOwner.primary} (${applicantOwner.secondary})` : applicantOwner.primary}
                                >
                                  UV {applicantOwner.primary}
                                </span>
                              )}
                              {!candidate.collaborator && applicantOwner === '—' && (
                                <span className="text-[8px] lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#9ca3af' }}>—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-px py-px align-middle text-[8px] xl:px-0.5 xl:py-0.5 lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#374151' }}>{candidate.admin?.name || '—'}</td>
                        </>
                      )}
                      <td className="px-px py-px align-middle xl:px-0.5 xl:py-0.5" onClick={(e) => e.stopPropagation()}>
                        {isGreyedOut && !(isAdmin && isPromotedInactive) ? (
                          <div className="flex items-center justify-center">
                            <span className="text-[8px] font-medium lg:text-[9px] xl:text-[10px] 2xl:text-[11px]" style={{ color: '#9ca3af' }}>—</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); openCandidateDetail(candidate); }}
                              onMouseEnter={() => setHoveredViewButtonIndex(index)}
                              onMouseLeave={() => setHoveredViewButtonIndex(null)}
                              className="p-0.5 rounded transition-colors"
                              style={{ color: hoveredViewButtonIndex === index ? '#374151' : '#6b7280', backgroundColor: hoveredViewButtonIndex === index ? '#f3f4f6' : 'transparent' }}
                              title={t.viewDetail}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            {showEditDelete && canOperateOnCandidate(candidate) && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`${basePath}/${candidate.id}/edit`); }}
                                  onMouseEnter={() => setHoveredEditButtonIndex(index)}
                                  onMouseLeave={() => setHoveredEditButtonIndex(null)}
                                  className="p-0.5 rounded transition-colors"
                                  style={{ color: hoveredEditButtonIndex === index ? '#374151' : '#6b7280', backgroundColor: hoveredEditButtonIndex === index ? '#f3f4f6' : 'transparent' }}
                                  title={t.editTitle}
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => handleDelete(candidate.id, e)}
                                  onMouseEnter={() => setHoveredDeleteButtonIndex(index)}
                                  onMouseLeave={() => setHoveredDeleteButtonIndex(null)}
                                  className="p-0.5 rounded transition-colors"
                                  style={{ color: hoveredDeleteButtonIndex === index ? '#374151' : '#6b7280', backgroundColor: hoveredDeleteButtonIndex === index ? '#f3f4f6' : 'transparent' }}
                                  title={t.deleteTitle}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CandidatesPageContent;
