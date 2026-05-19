import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService, { normalizePostImageUrl } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import AgentJobsPageSession2 from '../../component/Agent/AgentJobsPageSession2';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Info,
  Settings,
  Package,
  Briefcase,
  Calendar,
  Loader2,
  Check,
  Image as ImageIcon,
} from 'lucide-react';

const pickByLanguage = (viText, enText, jpText, lang) => {
  if (lang === 'en' && (enText != null && enText !== '')) return enText;
  if (lang === 'ja' && (jpText != null && jpText !== '')) return jpText;
  return viText != null && viText !== '' ? viText : enText || jpText || '';
};

/** Trang số quanh current (tối đa 7 nút), thay vì luôn 1..7 */
const getVisiblePages = (current, total, max = 7) => {
  if (total <= 0) return [];
  if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
  const half = Math.floor(max / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, start + max - 1);
  if (end - start + 1 < max) start = Math.max(1, end - max + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

const AdminJobPickupsPage = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';

  const [adminRole, setAdminRole] = useState(null);
  const canMutate = adminRole === 1 || adminRole === 2;

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [pickups, setPickups] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', nameEn: '', nameJp: '', coverUrl: '' });
  const [coverUploading, setCoverUploading] = useState(false);

  const [pickupPanelOpen, setPickupPanelOpen] = useState(false);
  const [activePickup, setActivePickup] = useState(null);
  const [attachSearchText, setAttachSearchText] = useState('');
  const [attachSearchResults, setAttachSearchResults] = useState([]);
  const [attachSearchLoading, setAttachSearchLoading] = useState(false);
  /** job id string -> job object từ kết quả tìm (giữ chọn khi đổi từ khóa) */
  const [attachSelectedJobs, setAttachSelectedJobs] = useState({});
  const [attachDropdownOpen, setAttachDropdownOpen] = useState(false);
  const attachSearchWrapRef = useRef(null);
  /** Tăng để remount AgentJobsPageSession2 sau khi gắn thêm job */
  const [jobsListRefreshKey, setJobsListRefreshKey] = useState(0);
  const [detachingFromPickupJobId, setDetachingFromPickupJobId] = useState(null);
  const [slideIn, setSlideIn] = useState(false);

  // Hover (giống CampaignsPage)
  const [hoveredResetButton, setHoveredResetButton] = useState(false);
  const [hoveredInfoButton, setHoveredInfoButton] = useState(false);
  const [hoveredAddButton, setHoveredAddButton] = useState(false);
  const [hoveredSettingsButton, setHoveredSettingsButton] = useState(false);
  const [hoveredPaginationNavButton, setHoveredPaginationNavButton] = useState(null);
  const [hoveredPaginationButtonIndex, setHoveredPaginationButtonIndex] = useState(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredIdLinkIndex, setHoveredIdLinkIndex] = useState(null);
  const [hoveredNameLinkIndex, setHoveredNameLinkIndex] = useState(null);
  const [hoveredJobsCountIndex, setHoveredJobsCountIndex] = useState(null);
  const [hoveredListButtonIndex, setHoveredListButtonIndex] = useState(null);
  const [hoveredEditButtonIndex, setHoveredEditButtonIndex] = useState(null);
  const [hoveredDeleteButtonIndex, setHoveredDeleteButtonIndex] = useState(null);
  const [expandedPickupIds, setExpandedPickupIds] = useState(new Set());

  const dateLocale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';

  useEffect(() => {
    setSearchQuery(headerSearch);
    setCurrentPage(1);
  }, [headerSearch]);

  useEffect(() => {
    if (pickupPanelOpen) {
      setSlideIn(false);
      const t = setTimeout(() => setSlideIn(true), 10);
      return () => clearTimeout(t);
    }
    setSlideIn(false);
  }, [pickupPanelOpen]);

  useEffect(() => {
    if (!pickupPanelOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSlideIn(false);
        setDetachingFromPickupJobId(null);
        setPickupPanelOpen(false);
        setActivePickup(null);
        setAttachSearchText('');
        setAttachSearchResults([]);
        setAttachSelectedJobs({});
        setAttachDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pickupPanelOpen]);

  const pickJobTitle = useCallback(
    (job) => {
      if (!job) return '';
      return pickByLanguage(
        job.title || job.title_vi,
        job.titleEn || job.title_en,
        job.titleJp || job.title_jp,
        language
      );
    },
    [language]
  );

  useEffect(() => {
    if (!pickupPanelOpen || !canMutate) {
      if (!pickupPanelOpen) {
        setAttachSearchResults([]);
        setAttachSearchLoading(false);
      }
      return;
    }
    const q = attachSearchText.trim();
    if (q.length < 2) {
      setAttachSearchResults([]);
      setAttachSearchLoading(false);
      return;
    }
    setAttachSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await apiService.getAdminJobs({
          search: q,
          limit: 15,
          sortBy: 'id',
          sortOrder: 'DESC'
        });
        if (res?.success && res.data?.jobs) {
          setAttachSearchResults(res.data.jobs);
        } else {
          setAttachSearchResults([]);
        }
      } catch {
        setAttachSearchResults([]);
      } finally {
        setAttachSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [attachSearchText, pickupPanelOpen, canMutate]);

  useEffect(() => {
    if (!attachDropdownOpen) return;
    const onDown = (e) => {
      if (attachSearchWrapRef.current && !attachSearchWrapRef.current.contains(e.target)) {
        setAttachDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [attachDropdownOpen]);

  const pickupJobFilters = useMemo(
    () => (activePickup ? { pickupId: String(activePickup.id) } : {}),
    [activePickup]
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.getAdminProfile();
        if (res?.success && res.data?.admin?.role != null) {
          setAdminRole(res.data.admin.role);
        }
      } catch {
        setAdminRole(null);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await apiService.getAdminJobPickups(params);
      if (res?.success && res.data) {
        setPickups(res.data.pickups || []);
        setPagination(
          res.data.pagination || { total: 0, page: 1, limit: itemsPerPage, totalPages: 0 }
        );
      } else {
        setPickups([]);
        if (res && res.success === false) {
          alert(res?.message || t.jobPickupsLoadError);
        }
      }
    } catch (e) {
      console.error(e);
      alert(t.jobPickupsLoadError);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, t.jobPickupsLoadError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalItems = pagination.total || 0;
  const totalPages = pagination.totalPages || 0;
  const visiblePages = getVisiblePages(currentPage, totalPages, 7);

  const handleSelectRow = (index) => {
    const next = new Set(selectedRows);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedRows(next);
  };

  const handleReset = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', nameEn: '', nameJp: '', coverUrl: '' });
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      nameEn: p.nameEn || '',
      nameJp: p.nameJp || '',
      coverUrl: p.coverUrl || p.cover_url || ''
    });
    setFormOpen(true);
  };

  const saveForm = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert(t.jobPickupsNameRequired);
      return;
    }
    const body = {
      name: form.name.trim(),
      nameEn: form.nameEn.trim() || null,
      nameJp: form.nameJp.trim() || null
    };
    try {
      if (editingId) {
        const res = await apiService.updateAdminJobPickup(editingId, body);
        if (res?.success) {
          setFormOpen(false);
          load();
        } else {
          alert(res?.message || 'Error');
        }
      } else {
        const res = await apiService.createAdminJobPickup(body);
        if (res?.success) {
          const pickup = res.data?.pickup;
          if (pickup?.id) {
            setEditingId(pickup.id);
            setForm((f) => ({
              ...f,
              coverUrl: pickup.coverUrl || pickup.cover_url || ''
            }));
          } else {
            setFormOpen(false);
          }
          load();
        } else {
          alert(res?.message || 'Error');
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error');
    }
  };

  const handleJobPickupCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    try {
      setCoverUploading(true);
      const res = await apiService.uploadAdminJobPickupCover(editingId, file);
      if (res?.success && res.data?.pickup) {
        const cu = res.data.pickup.coverUrl ?? res.data.key ?? '';
        setForm((prev) => ({ ...prev, coverUrl: cu }));
      } else {
        alert(res?.message || 'Upload ảnh cover thất bại');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Upload ảnh cover thất bại');
    } finally {
      setCoverUploading(false);
      e.target.value = '';
    }
  };

  const remove = async (p) => {
    if (!canMutate) return;
    if (!window.confirm(t.jobPickupsDeleteConfirm)) return;
    try {
      const res = await apiService.deleteAdminJobPickup(p.id);
      if (res?.success) {
        load();
        if (activePickup?.id === p.id) {
          setPickupPanelOpen(false);
          setActivePickup(null);
        }
      } else {
        alert(res?.message || 'Error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openPickupPanel = (p) => {
    setActivePickup(p);
    setAttachSearchText('');
    setAttachSearchResults([]);
    setAttachSelectedJobs({});
    setAttachDropdownOpen(false);
    setPickupPanelOpen(true);
  };

  const closePickupPanel = () => {
    setSlideIn(false);
    setDetachingFromPickupJobId(null);
    setPickupPanelOpen(false);
    setActivePickup(null);
    setAttachSearchText('');
    setAttachSearchResults([]);
    setAttachSelectedJobs({});
    setAttachDropdownOpen(false);
  };

  const toggleAttachJobInResults = (j) => {
    const k = String(j.id);
    setAttachSelectedJobs((prev) => {
      const next = { ...prev };
      if (next[k]) delete next[k];
      else next[k] = j;
      return next;
    });
  };

  const removeAttachSelectedJob = (jobId) => {
    const k = String(jobId);
    setAttachSelectedJobs((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const addJobToActivePickup = async () => {
    if (!canMutate || !activePickup) return;
    const ids = Object.keys(attachSelectedJobs).map((k) => parseInt(k, 10)).filter((n) => !Number.isNaN(n));
    if (ids.length === 0) {
      alert(t.jobPickupsSelectJobFirst);
      return;
    }
    try {
      const res = await apiService.addJobsToAdminJobPickup(activePickup.id, ids);
      if (res?.success) {
        const added = res.data?.added ?? 0;
        if (added === 0) {
          alert(res?.message || t.jobPickupsBatchNoneAdded);
        } else {
          const skipped = res.data?.skipped?.length ?? 0;
          if (skipped > 0) {
            const msg = t.jobPickupsBatchPartial
              .replace('{added}', String(added))
              .replace('{skipped}', String(skipped));
            alert(msg);
          }
        }
        setAttachSearchText('');
        setAttachSearchResults([]);
        setAttachSelectedJobs({});
        setAttachDropdownOpen(false);
        setJobsListRefreshKey((k) => k + 1);
        load();
      } else {
        alert(res?.message || 'Error');
      }
    } catch (e) {
      console.error(e);
      alert(e.message || 'Error');
    }
  };

  const handleRemoveJobFromPickup = async (job) => {
    if (!canMutate || !activePickup) return;
    if (!window.confirm(t.jobPickupsRemoveJobConfirm)) return;
    const jobId = String(job?.id ?? '').trim();
    if (!jobId) return;
    setDetachingFromPickupJobId(jobId);
    try {
      const res = await apiService.removeJobFromAdminJobPickup(activePickup.id, jobId);
      if (res?.success) {
        setJobsListRefreshKey((k) => k + 1);
        load();
      } else {
        alert(res?.message || 'Error');
      }
    } catch (e) {
      console.error(e);
      alert(e.message || 'Error');
    } finally {
      setDetachingFromPickupJobId(null);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0 px-2 sm:px-3 py-1.5 space-y-3">
        {/* Filter bar — giống CampaignsPage */}
        <div className="job-pickups-filters-container flex items-center gap-2.5 flex-wrap justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center px-3 py-1.5 rounded-full bg-white text-[12px] sm:text-[13px] min-w-[220px] flex-1">
              <Search className="w-3.5 h-3.5 mr-2" style={{ color: '#9ca3af' }} />
              <input
                type="text"
                placeholder={t.jobPickupsSearchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-[12px] sm:text-[13px]"
                style={{ border: 'none' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleReset}
              onMouseEnter={() => setHoveredResetButton(true)}
              onMouseLeave={() => setHoveredResetButton(false)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors"
              style={{
                backgroundColor: hoveredResetButton ? '#e5e7eb' : '#f3f4f6',
                color: '#374151'
              }}
            >
              {t.resetButton || 'Reset'}
            </button>
            <button
              type="button"
              title={t.jobPickupsSubtitle}
              onMouseEnter={() => setHoveredInfoButton(true)}
              onMouseLeave={() => setHoveredInfoButton(false)}
              className="p-1.5"
              style={{ color: hoveredInfoButton ? '#1f2937' : '#4b5563' }}
            >
              <Info className="w-4 h-4" />
            </button>
            {canMutate && (
              <button
                type="button"
                onClick={openCreate}
                onMouseEnter={() => setHoveredAddButton(true)}
                onMouseLeave={() => setHoveredAddButton(false)}
                className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: hoveredAddButton ? '#b91c1c' : '#dc2626',
                  color: 'white'
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                {t.jobPickupsAdd}
              </button>
            )}
            <button
              type="button"
              onMouseEnter={() => setHoveredSettingsButton(true)}
              onMouseLeave={() => setHoveredSettingsButton(false)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: hoveredSettingsButton ? '#111827' : '#1f2937',
                color: 'white'
              }}
            >
              <Settings className="w-3.5 h-3.5" />
              {t.settingsButton || 'Cài đặt'}
            </button>
          </div>
        </div>

        {/* Pagination — cùng layout CampaignsPage */}
        <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('first')}
              onMouseLeave={() => setHoveredPaginationNavButton(null)}
              className="w-7 h-7 rounded-full border text-[10px] font-semibold transition-colors flex items-center justify-center"
              style={{
                backgroundColor: hoveredPaginationNavButton === 'first' ? '#f9fafb' : 'white',
                borderColor: '#d1d5db',
                color: '#374151',
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('prev')}
              onMouseLeave={() => setHoveredPaginationNavButton(null)}
              className="w-7 h-7 rounded-full border text-[10px] font-semibold transition-colors flex items-center justify-center"
              style={{
                backgroundColor: hoveredPaginationNavButton === 'prev' ? '#f9fafb' : 'white',
                borderColor: '#d1d5db',
                color: '#374151',
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {visiblePages.map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                onMouseEnter={() => currentPage !== pageNum && setHoveredPaginationButtonIndex(pageNum)}
                onMouseLeave={() => setHoveredPaginationButtonIndex(null)}
                className="w-7 h-7 rounded-full border text-[10px] font-semibold transition-colors flex items-center justify-center"
                style={{
                  backgroundColor:
                    currentPage === pageNum
                      ? '#2563eb'
                      : hoveredPaginationButtonIndex === pageNum
                        ? '#f9fafb'
                        : 'white',
                  borderColor: '#d1d5db',
                  color: currentPage === pageNum ? 'white' : '#374151'
                }}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages || totalPages < 1}
              onMouseEnter={() => currentPage !== totalPages && setHoveredPaginationNavButton('next')}
              onMouseLeave={() => setHoveredPaginationNavButton(null)}
              className="w-7 h-7 rounded-full border text-[10px] font-semibold transition-colors flex items-center justify-center"
              style={{
                backgroundColor: hoveredPaginationNavButton === 'next' ? '#f9fafb' : 'white',
                borderColor: '#d1d5db',
                color: '#374151',
                opacity: currentPage === totalPages || totalPages < 1 ? 0.5 : 1,
                cursor: currentPage === totalPages || totalPages < 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages < 1}
              onMouseEnter={() => currentPage !== totalPages && setHoveredPaginationNavButton('last')}
              onMouseLeave={() => setHoveredPaginationNavButton(null)}
              className="w-7 h-7 rounded-full border text-[10px] font-semibold transition-colors flex items-center justify-center"
              style={{
                backgroundColor: hoveredPaginationNavButton === 'last' ? '#f9fafb' : 'white',
                borderColor: '#d1d5db',
                color: '#374151',
                opacity: currentPage === totalPages || totalPages < 1 ? 0.5 : 1,
                cursor: currentPage === totalPages || totalPages < 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 border rounded text-[10px] font-semibold"
              style={{ borderColor: '#d1d5db', color: '#374151', outline: 'none' }}
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
            <span className="text-[10px] font-semibold" style={{ color: '#374151' }}>
              {totalItems} {t.itemsCount}
            </span>
          </div>
        </div>

        {/* Card grid + gradient đáy — giống CampaignsPage */}
        <div className="flex-1 overflow-y-auto min-h-0 rounded-lg relative" style={{ borderColor: '#e5e7eb' }}>
          <div
            className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none z-10 rounded-b-lg"
            style={{ background: 'linear-gradient(to top, rgba(255,250,250,0.92), transparent)' }}
            aria-hidden
          />
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="inline-flex items-center justify-center gap-2 text-sm" style={{ color: '#6b7280' }}>
                <span
                  className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#2563eb' }}
                />
                {t.loadingData}
              </span>
            </div>
          ) : pickups.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#6b7280' }}>
              {t.jobPickupsNoData}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
              {pickups.map((p, index) => {
                const displayName = pickByLanguage(p.name, p.nameEn, p.nameJp, language);
                const subEnJp = [p.nameEn, p.nameJp].filter(Boolean).join(' · ');
                const createdAt = p.createdAt
                  ? new Date(p.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })
                  : '—';

                const coverSrc = p.coverUrl || p.cover_url;
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border bg-white p-4 transition-colors hover:shadow-md"
                    style={{
                      borderColor: '#e5e7eb',
                      backgroundColor: hoveredRowIndex === index ? '#f9fafb' : 'white'
                    }}
                    onMouseEnter={() => setHoveredRowIndex(index)}
                    onMouseLeave={() => setHoveredRowIndex(null)}
                  >
                    {coverSrc ? (
                      <div className="-mx-4 -mt-4 mb-3 overflow-hidden rounded-t-xl">
                        <img
                          src={normalizePostImageUrl(coverSrc)}
                          alt=""
                          className="h-24 w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(index)}
                          onChange={() => handleSelectRow(index)}
                          className="w-3.5 h-3.5 rounded flex-shrink-0"
                          style={{ accentColor: '#2563eb', borderColor: '#d1d5db' }}
                        />
                        <button
                          type="button"
                          onClick={() => openPickupPanel(p)}
                          onMouseEnter={() => setHoveredIdLinkIndex(index)}
                          onMouseLeave={() => setHoveredIdLinkIndex(null)}
                          className="font-medium text-[11px] flex items-center gap-0.5 truncate"
                          style={{ color: hoveredIdLinkIndex === index ? '#1e40af' : '#2563eb' }}
                        >
                          {p.id}
                          <List className="w-2.5 h-2.5 flex-shrink-0" />
                        </button>
                      </div>
                      <span
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}
                      >
                        <Package className="w-3 h-3" />
                        {t.agentHomeJobPickup}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                        style={{ backgroundColor: '#a855f7' }}
                      >
                        <Package className="w-4 h-4" />
                      </div>
                      <button
                        type="button"
                        onClick={() => openPickupPanel(p)}
                        onMouseEnter={() => setHoveredNameLinkIndex(index)}
                        onMouseLeave={() => setHoveredNameLinkIndex(null)}
                        className="text-sm font-semibold text-left truncate flex-1 min-w-0"
                        style={{ color: hoveredNameLinkIndex === index ? '#2563eb' : '#111827' }}
                      >
                        {displayName}
                      </button>
                    </div>

                    <div className="mb-3">
                      <p
                        className={`text-xs min-h-[2.5rem] ${
                          expandedPickupIds.has(p.id) ? '' : 'line-clamp-2'
                        }`}
                        style={{ color: '#374151' }}
                      >
                        {subEnJp || '—'}
                      </p>
                      {subEnJp && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPickupIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            });
                          }}
                          className="text-[11px] font-semibold mt-0.5 transition-colors hover:underline"
                          style={{ color: '#2563eb' }}
                        >
                          {expandedPickupIds.has(p.id) ? t.adminSidebarCollapse : t.readMore}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => openPickupPanel(p)}
                        onMouseEnter={() => setHoveredJobsCountIndex(index)}
                        onMouseLeave={() => setHoveredJobsCountIndex(null)}
                        className="flex items-center gap-1.5 text-xs rounded-lg py-1.5 px-2 transition-colors w-full"
                        style={{
                          color: hoveredJobsCountIndex === index ? '#1e40af' : '#374151',
                          backgroundColor: hoveredJobsCountIndex === index ? '#eff6ff' : '#f9fafb'
                        }}
                      >
                        <Briefcase className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                        <span className="font-semibold">{p.jobsCount ?? 0}</span>
                        <span className="opacity-80">{t.jobPickupsJobsCount}</span>
                      </button>
                    </div>

                    <div
                      className="flex items-center justify-between gap-2 pt-2 border-t"
                      style={{ borderColor: '#e5e7eb' }}
                    >
                      <div className="flex items-center gap-1 text-[11px]" style={{ color: '#6b7280' }}>
                        <Calendar className="w-3 h-3" style={{ color: '#9ca3af' }} />
                        {createdAt}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openPickupPanel(p)}
                          onMouseEnter={() => setHoveredListButtonIndex(index)}
                          onMouseLeave={() => setHoveredListButtonIndex(null)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{
                            color: hoveredListButtonIndex === index ? '#1e40af' : '#2563eb',
                            backgroundColor: hoveredListButtonIndex === index ? '#eff6ff' : 'transparent'
                          }}
                          title={t.jobPickupsViewJobs}
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                        {canMutate && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              onMouseEnter={() => setHoveredEditButtonIndex(index)}
                              onMouseLeave={() => setHoveredEditButtonIndex(null)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{
                                color: hoveredEditButtonIndex === index ? '#1f2937' : '#4b5563',
                                backgroundColor: hoveredEditButtonIndex === index ? '#f3f4f6' : 'transparent'
                              }}
                              title={t.jobPickupsEdit}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(p)}
                              onMouseEnter={() => setHoveredDeleteButtonIndex(index)}
                              onMouseLeave={() => setHoveredDeleteButtonIndex(null)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{
                                color: hoveredDeleteButtonIndex === index ? '#991b1b' : '#dc2626',
                                backgroundColor: hoveredDeleteButtonIndex === index ? '#fef2f2' : 'transparent'
                              }}
                              title={t.jobPickupsDelete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setFormOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-xl border bg-white p-4 shadow-lg"
            style={{ borderColor: '#e5e7eb' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>
                {editingId ? t.jobPickupsModalEditTitle : t.jobPickupsModalCreateTitle}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded p-1"
                style={{ color: '#6b7280' }}
                aria-label="close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveForm} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: '#374151' }}>
                  {t.jobPickupsName}
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: '#d1d5db', outline: 'none' }}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: '#374151' }}>
                  {t.jobPickupsNameEn}
                </label>
                <input
                  value={form.nameEn}
                  onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: '#d1d5db', outline: 'none' }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: '#374151' }}>
                  {t.jobPickupsNameJp}
                </label>
                <input
                  value={form.nameJp}
                  onChange={(e) => setForm((f) => ({ ...f, nameJp: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: '#d1d5db', outline: 'none' }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold flex items-center gap-1.5" style={{ color: '#374151' }}>
                  <ImageIcon className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                  {t.jobPickupsCoverLabel || 'Ảnh cover'}
                </label>
                {!editingId ? (
                  <p className="text-[11px]" style={{ color: '#6b7280' }}>
                    {t.jobPickupsCoverHintCreate || 'Lưu pick-up trước, sau đó chọn ảnh cover.'}
                  </p>
                ) : (
                  <>
                    {form.coverUrl ? (
                      <div className="mb-2 overflow-hidden rounded-lg border" style={{ borderColor: '#e5e7eb' }}>
                        <img
                          src={normalizePostImageUrl(form.coverUrl)}
                          alt=""
                          className="max-h-36 w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      disabled={coverUploading}
                      onChange={handleJobPickupCoverChange}
                      className="block w-full text-[11px] file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1"
                    />
                    {coverUploading ? (
                      <p className="mt-1 text-[11px]" style={{ color: '#2563eb' }}>
                        {t.uploadingLabel || 'Đang tải...'}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold"
                  style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
                >
                  {t.jobPickupsCancel}
                </button>
                <button
                  type="submit"
                  className="rounded-full px-4 py-2 text-xs font-semibold"
                  style={{ backgroundColor: '#dc2626', color: 'white' }}
                >
                  {t.jobPickupsSave}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pickupPanelOpen && activePickup && (
        <div className="fixed inset-0 z-[100] flex" role="presentation">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closePickupPanel}
            onKeyDown={(e) => e.key === 'Escape' && closePickupPanel()}
            aria-hidden
          />
          <aside
            className={`relative ml-auto flex h-full w-full max-w-5xl flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
              slideIn ? 'translate-x-0' : 'translate-x-full'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-pickup-panel-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex flex-shrink-0 items-start justify-between gap-2 border-b px-3 py-3 sm:px-4"
              style={{ borderColor: '#e5e7eb' }}
            >
              <div className="min-w-0">
                <h2
                  id="job-pickup-panel-title"
                  className="text-base font-bold sm:text-lg"
                  style={{ color: '#111827' }}
                >
                  {t.jobPickupsJobsTitle}
                </h2>
                <p className="text-xs sm:text-sm" style={{ color: '#4b5563' }}>
                  {activePickup.name}
                  {activePickup.nameEn ? ` · ${activePickup.nameEn}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={closePickupPanel}
                className="flex-shrink-0 rounded-lg p-2"
                style={{ color: '#6b7280' }}
                title={t.jobPickupsCancel}
                aria-label="close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {canMutate && (
              <div
                className="flex flex-col gap-2 border-b px-3 py-2.5 sm:px-4"
                style={{ borderColor: '#f3f4f6' }}
              >
                <label className="block text-[10px] font-semibold" style={{ color: '#374151' }}>
                  {t.jobPickupsAttachSearchLabel}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
                  <div ref={attachSearchWrapRef} className="min-w-0 sm:flex-1">
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
                        style={{ color: '#9ca3af' }}
                      />
                      <input
                        type="text"
                        value={attachSearchText}
                        onChange={(e) => {
                          setAttachSearchText(e.target.value);
                          setAttachDropdownOpen(true);
                        }}
                        onFocus={() => setAttachDropdownOpen(true)}
                        placeholder={t.jobPickupsSearchJobPlaceholder}
                        className="h-[38px] w-full rounded-lg border py-1.5 pl-9 pr-9 text-sm"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                        autoComplete="off"
                      />
                      {attachSearchLoading && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden>
                          <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#6b7280' }} />
                        </span>
                      )}
                      {attachDropdownOpen && attachSearchText.trim().length >= 2 && (
                        <ul
                          className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-0.5 shadow-lg"
                          role="listbox"
                        >
                          {attachSearchLoading && attachSearchResults.length === 0 ? (
                            <li className="px-3 py-2 text-xs" style={{ color: '#6b7280' }}>
                              {t.jobPickupsAttachSearching}
                            </li>
                          ) : !attachSearchLoading && attachSearchResults.length === 0 ? (
                            <li className="px-3 py-2 text-xs" style={{ color: '#6b7280' }}>
                              {t.jobPickupsSearchNoResults}
                            </li>
                          ) : (
                            attachSearchResults.map((j) => {
                              const selected = Boolean(attachSelectedJobs[String(j.id)]);
                              return (
                                <li
                                  key={j.id}
                                  role="option"
                                  aria-selected={selected}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    toggleAttachJobInResults(j);
                                  }}
                                  className="flex cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                                  style={selected ? { backgroundColor: '#eff6ff' } : undefined}
                                >
                                  <span
                                    className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border"
                                    style={
                                      selected
                                        ? { borderColor: '#dc2626', backgroundColor: '#dc2626' }
                                        : { borderColor: '#d1d5db', backgroundColor: '#fff' }
                                    }
                                  >
                                    {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <span className="font-mono text-xs" style={{ color: '#4b5563' }}>
                                      {j.jobCode}
                                    </span>
                                    <div className="line-clamp-1" style={{ color: '#111827' }}>
                                      {pickJobTitle(j) || '—'}
                                    </div>
                                  </div>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addJobToActivePickup}
                    disabled={Object.keys(attachSelectedJobs).length === 0}
                    className="h-[38px] min-h-[38px] w-full flex-shrink-0 rounded-full px-4 text-xs font-semibold sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ backgroundColor: '#dc2626', color: 'white' }}
                  >
                    {Object.keys(attachSelectedJobs).length > 1
                      ? t.jobPickupsAddJobsWithCount.replace(
                          '{count}',
                          String(Object.keys(attachSelectedJobs).length)
                        )
                      : t.jobPickupsAddJob}
                  </button>
                </div>
                {Object.keys(attachSelectedJobs).length > 0 && (
                  <div className="pt-0.5">
                    <p className="mb-1.5 text-[10px] font-medium" style={{ color: '#6b7280' }}>
                      {t.jobPickupsSelectedCount.replace(
                        '{count}',
                        String(Object.keys(attachSelectedJobs).length)
                      )}
                    </p>
                    <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-dashed p-1.5" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb', opacity: 0.75 }}>
                      {Object.values(attachSelectedJobs).map((j) => (
                        <li
                          key={j.id}
                          className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-sm"
                          style={{ borderColor: '#e5e7eb', backgroundColor: '#fff', color: '#6b7280' }}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-xs" style={{ color: '#9ca3af' }}>
                              {j.jobCode}
                            </span>
                            <div className="line-clamp-1" style={{ color: '#6b7280' }}>
                              {pickJobTitle(j) || '—'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachSelectedJob(j.id)}
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-gray-200"
                            style={{ color: '#6b7280' }}
                            title={t.jobPickupsRemoveFromSelection}
                            aria-label={t.jobPickupsRemoveFromSelection}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-hidden px-1 pb-2 pt-1 sm:px-2 sm:pb-3">
              <div className="h-[min(100dvh,920px)] min-h-[400px] w-full sm:min-h-[480px]">
                <AgentJobsPageSession2
                  key={`pickup-jobs-${activePickup.id}-${jobsListRefreshKey}`}
                  filters={pickupJobFilters}
                  showAllJobs
                  enablePagination
                  useAdminAPI
                  jobsBasePath="/admin/jobs"
                  hideViewMoreButton
                  onJobDeleted={() => {
                    load();
                    setJobsListRefreshKey((k) => k + 1);
                  }}
                  onJobStatusUpdated={() => {
                    load();
                    setJobsListRefreshKey((k) => k + 1);
                  }}
                  onRemoveFromJobPickup={canMutate ? handleRemoveJobFromPickup : undefined}
                  detachingFromPickupJobId={detachingFromPickupJobId}
                />
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default AdminJobPickupsPage;
