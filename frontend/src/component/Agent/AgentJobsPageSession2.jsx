import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowRight,
  MapPin,
  Building2,
  Briefcase,
  DollarSign,
  Calendar,
  Users,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  UserPlus,
  ChevronDown,
  Plus,
  X,
  Edit,
  Copy,
  Check,
  Trash2,
  Pin,
  Unlink,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import apiService from '../../services/api';
import { openRemoteFileDownloadUrl } from '../../utils/safeFileDownload.js';
import { yearSalaryRangeStringForCommission } from '../../utils/salaryRangeForCommission';
import {
  normalizeJobCommissionType,
  resolveCampaignPercentFromJob,
  pickPrimaryCommissionJobValue,
} from '../../utils/jobCommissionUi';
import { localizedJobValueLabel } from '../../utils/jobValueLocalizedLabel';
import { hasJobAttachment } from '../../utils/jobAttachmentAvailability';
import { formatSalaryValueWithJlptIfRange } from '../../utils/salaryDisplay';
import { getRecruitmentLocationLabel } from '../../utils/recruitmentLocationLabels.js';
import { hasActiveAgentJobSearchCriteria, hasAdminJobsToolbarListContext } from '../../utils/agentJobSearchCriteria';

const JD_DOWNLOAD_TYPES = ['jdFile', 'jdFileEn', 'jdFileJp', 'jdOriginalFile'];

function hasAnyJdAttachmentInListPayload(job) {
  return JD_DOWNLOAD_TYPES.some((ft) => hasJobAttachment(job, ft));
}

/** List jobs often omit jd_* paths; show all JD variants until payload hints otherwise (CV form is not JD — not in this menu). */
function jdMenuItemVisible(job, fileType) {
  return !hasAnyJdAttachmentInListPayload(job) || hasJobAttachment(job, fileType);
}

/** jobs.status: 0 Draft, 1 Published, 2 Closed, 3 Expired */
function jobRowStatusCode(job) {
  if (!job || typeof job !== 'object') return null;
  const v = job.status ?? job.job_status;
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

const JOB_STATUS_LABELS = {
  0: { vi: 'Bản nháp', en: 'Draft', ja: '下書き' },
  1: { vi: 'Đã công bố', en: 'Published', ja: '公開中' },
  2: { vi: 'Đã đóng', en: 'Closed', ja: '募集終了' },
  3: { vi: 'Hết hạn', en: 'Expired', ja: '期限切れ' },
};

function jobStatusDisplayLabel(st, language) {
  if (st === null || st === undefined || st === '') {
    return language === 'vi' ? 'Không xác định' : language === 'en' ? 'Unknown' : '不明';
  }
  const n = Number(st);
  if (!Number.isFinite(n)) {
    return language === 'vi' ? 'Không xác định' : language === 'en' ? 'Unknown' : '不明';
  }
  const row = JOB_STATUS_LABELS[n];
  if (!row) {
    return language === 'vi' ? `Trạng thái ${n}` : language === 'en' ? `Status ${n}` : `状態 ${n}`;
  }
  return language === 'vi' ? row.vi : language === 'en' ? row.en : row.ja;
}

const ADMIN_JOB_STATUS_VALUES = [0, 1, 2, 3];

function AdminJobStatusSelect({ job, language, statusUpdating, onSelect, compact }) {
  const st = jobRowStatusCode(job);
  const selectValues = [...ADMIN_JOB_STATUS_VALUES];
  const stNum = st != null && Number.isFinite(Number(st)) ? Number(st) : null;
  if (stNum != null && !selectValues.includes(stNum)) {
    selectValues.push(stNum);
    selectValues.sort((a, b) => a - b);
  }
  const selValue = stNum != null ? String(stNum) : '';

  const hint =
    st === 0
      ? (language === 'vi' ? 'CTV chỉ thấy job đang công bố.' : language === 'en' ? 'CTV only sees published jobs.' : 'CTVは公開中のみ閲覧')
      : st === 2 || st === 3
        ? (language === 'vi' ? 'Ẩn với CTV.' : language === 'en' ? 'Hidden from CTV.' : 'CTV非表示')
        : null;

  const title =
    language === 'vi' ? 'Trạng thái job' : language === 'en' ? 'Job status' : '求人ステータス';

  const selectClass = compact
    ? 'w-full rounded-md border border-gray-200 bg-white text-[10px] py-0.5 pl-2 pr-5 font-medium text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-300 disabled:opacity-55'
    : 'w-full rounded-md border border-gray-200 bg-white text-[11px] py-1.5 pl-2 pr-6 font-medium text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-300 disabled:opacity-55';

  const selectEl = (
    <select
      value={selValue}
      disabled={statusUpdating}
      aria-label={title}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        const v = e.target.value;
        if (v === '') return;
        onSelect(job, v);
      }}
      className={selectClass}
    >
      {selValue === '' && (
        <option value="" disabled>
          {language === 'vi' ? 'Chưa gán' : language === 'en' ? 'Unset' : '未設定'}
        </option>
      )}
      {selectValues.map((v) => (
        <option key={v} value={String(v)}>
          {jobStatusDisplayLabel(v, language)}
        </option>
      ))}
    </select>
  );

  if (compact) {
    return (
      <div className="min-w-0 w-[8.25rem] shrink-0" title={title}>
        {selectEl}
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 rounded-lg border border-gray-200/90 bg-gradient-to-b from-slate-50 to-white px-2 py-1 shadow-sm">
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <span className="text-[8px] font-semibold uppercase tracking-widest text-gray-400">
          {language === 'vi' ? 'Trạng thái' : language === 'en' ? 'Status' : '状態'}
        </span>
        {stNum != null && (
          <span className="text-[8px] tabular-nums text-gray-500 bg-gray-100 px-1 py-px rounded">
            {stNum}
          </span>
        )}
      </div>
      {selectEl}
      {hint ? (
        <p className="mt-0.5 mb-0 text-[8px] text-gray-500 text-center leading-snug">{hint}</p>
      ) : null}
    </div>
  );
}

const AgentJobsPageSession2 = ({
  jobs: propJobs,
  filters,
  showAllJobs = false,
  enablePagination = false,
  useAdminAPI = false,
  onJobDeleted,
  onJobStatusUpdated,
  onJobClick,
  hideViewMoreButton = false,
  /** Ẩn khối phí giới thiệu (CTV) / JobShare nhận (admin) — dùng trang landing public */
  hideExpectedReferralFee = false,
  /** Base URL danh sách + chi tiết (landing: /collaborator/jobs, agent: /agent/jobs) */
  jobsBasePath = '/agent/jobs',
  /** Toolbar admin (JobsListPage): lọc công ty nguồn / campaign / trạng thái — không có trong `filters` */
  adminCompanyId,
  adminHasCampaign = false,
  adminJobStatus = '',
  /** Admin — gỡ job khỏi job pick-up (bản ghi job_pickups_id), không xóa job */
  onRemoveFromJobPickup,
  /** ID job (string) đang gỡ khỏi pick-up — để disable nút */
  detachingFromPickupJobId = null,
}) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { pathname: locationPathname } = useLocation();
  const ctvJobsBase = (jobsBasePath || '/agent/jobs').replace(/\/$/, '');
  const listStateStorageKey = useMemo(
    () =>
      `wsj_agentJobsSession2_${useAdminAPI ? 'admin' : 'ctv'}_${locationPathname}_${ctvJobsBase}_${showAllJobs ? 'all' : 'preview'}_${enablePagination ? 'paged' : 'plain'}`,
    [useAdminAPI, locationPathname, ctvJobsBase, showAllJobs, enablePagination]
  );
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const raw = sessionStorage.getItem(listStateStorageKey);
      const snap = raw ? JSON.parse(raw) : null;
      const page = Number(snap?.currentPage || 1);
      return page > 0 ? page : 1;
    } catch {
      return 1;
    }
  });
  /** Cursor để gọi API trang p (1-based): pageCursors[p-1]; trang 1 = null */
  const [pageCursors, setPageCursors] = useState(() => {
    try {
      const raw = sessionStorage.getItem(listStateStorageKey);
      const snap = raw ? JSON.parse(raw) : null;
      return Array.isArray(snap?.pageCursors) ? snap.pageCursors : [null];
    } catch {
      return [null];
    }
  });
  const [hasMoreFromApi, setHasMoreFromApi] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [ctvProfile, setCtvProfile] = useState(null);
  const limit = showAllJobs ? 10 : 3; // Show 10 jobs per page if showAllJobs, otherwise 3
  const listContainerRef = useRef(null);
  const pageCursorsRef = useRef(pageCursors);
  pageCursorsRef.current = pageCursors;
  const lastSpecialFiltersKeyRef = useRef('');
  /** Giá trị propJobs lần trước — chỉ reset trang/cursor khi null đến từ «xóa kết quả tìm», không reset khi mount lại / back (danh sách server luôn null ban đầu). */
  const prevPropJobsRef = useRef(undefined);
  /** Tăng khi propJobs (kết quả tìm từ Session1) có dữ liệu — hủy ghi đè từ fetch server chậm */
  const serverListFetchGenerationRef = useRef(0);

  useEffect(() => {
    if (propJobs != null) {
      serverListFetchGenerationRef.current += 1;
    }
  }, [propJobs]);

  // Hover states
  const [hoveredPaginationButton, setHoveredPaginationButton] = useState(null);
  const [hoveredJobCardIndex, setHoveredJobCardIndex] = useState(null);
  const [hoveredDownloadButtonIndex, setHoveredDownloadButtonIndex] = useState(null);
  const [hoveredSaveButtonIndex, setHoveredSaveButtonIndex] = useState(null);
  const [hoveredSuggestButtonIndex, setHoveredSuggestButtonIndex] = useState(null);
  const [hoveredViewMoreButton, setHoveredViewMoreButton] = useState(false);
  const [openDownloadMenuJobId, setOpenDownloadMenuJobId] = useState(null);
  const [copiedJobId, setCopiedJobId] = useState(null);
  const [hoveredCopyJobId, setHoveredCopyJobId] = useState(null);
  // Lưu job vào Saved List (chỉ CTV)
  const [showSaveToListModal, setShowSaveToListModal] = useState(false);
  const [saveToListJobId, setSaveToListJobId] = useState(null);
  const [saveToListLists, setSaveToListLists] = useState([]);
  const [loadingSaveToListLists, setLoadingSaveToListLists] = useState(false);
  const [saveToListMessage, setSaveToListMessage] = useState(null);
  const [showCreateListInSaveModal, setShowCreateListInSaveModal] = useState(false);
  const [newListNameInSaveModal, setNewListNameInSaveModal] = useState('');
  const [creatingListInSaveModal, setCreatingListInSaveModal] = useState(false);
  const [togglingJobStatusId, setTogglingJobStatusId] = useState(null);
  const [deletingJobId, setDeletingJobId] = useState(null);
  const [bulkSelectedJobIds, setBulkSelectedJobIds] = useState(new Set());
  const [showCreatePickupModal, setShowCreatePickupModal] = useState(false);
  const [newPickupName, setNewPickupName] = useState('');
  const [creatingPickup, setCreatingPickup] = useState(false);
  const isClientSidePagination = showAllJobs && enablePagination && propJobs !== undefined && propJobs !== null;
  const canUseBulkPickupActions = useAdminAPI && showAllJobs && enablePagination;

  useEffect(() => {
    try {
      sessionStorage.setItem(
        listStateStorageKey,
        JSON.stringify({
          currentPage,
          pageCursors,
          scrollTop: listContainerRef.current?.scrollTop || 0,
        })
      );
    } catch {
      // ignore session persistence errors
    }
  }, [listStateStorageKey, currentPage, pageCursors, jobs.length, totalJobs, totalPages]);

  useEffect(() => {
    const node = listContainerRef.current;
    if (!node) return undefined;
    let frameId = null;
    const onScroll = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        try {
          const raw = sessionStorage.getItem(listStateStorageKey);
          const snap = raw ? JSON.parse(raw) : {};
          sessionStorage.setItem(
            listStateStorageKey,
            JSON.stringify({
              ...snap,
              currentPage,
              pageCursors,
              scrollTop: node.scrollTop,
            })
          );
        } catch {
          // ignore
        }
      });
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      node.removeEventListener('scroll', onScroll);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [listStateStorageKey, currentPage, pageCursors]);

  useEffect(() => {
    const node = listContainerRef.current;
    if (!node) return;
    try {
      const raw = sessionStorage.getItem(listStateStorageKey);
      const snap = raw ? JSON.parse(raw) : null;
      if (snap && Number.isFinite(Number(snap.scrollTop))) {
        requestAnimationFrame(() => {
          if (listContainerRef.current) {
            listContainerRef.current.scrollTop = Number(snap.scrollTop) || 0;
          }
        });
      }
    } catch {
      // ignore
    }
  }, [listStateStorageKey, jobs.length, loading]);

  // Load CTV profile to get rank level (only for CTV users)
  useEffect(() => {
    if (!useAdminAPI) {
      const loadCTVProfile = async () => {
        try {
          const response = await apiService.getCTVProfile();
          if (response.success && response.data) {
            setCtvProfile(response.data.collaborator || response.data);
          }
        } catch (error) {
          console.error('Error loading CTV profile:', error);
        }
      };
      loadCTVProfile();
    }
  }, [useAdminAPI]);

  // Load saved lists when "Save to list" modal opens
  useEffect(() => {
    if (!showSaveToListModal || !saveToListJobId) return;
    let cancelled = false;
    setLoadingSaveToListLists(true);
    setSaveToListMessage(null);
    apiService.getSavedLists({ page: 1, limit: 100 })
      .then((res) => {
        if (!cancelled && res.success && res.data?.items) setSaveToListLists(res.data.items);
        else if (!cancelled) setSaveToListLists([]);
      })
      .catch(() => { if (!cancelled) setSaveToListLists([]); })
      .finally(() => { if (!cancelled) setLoadingSaveToListLists(false); });
    return () => { cancelled = true; };
  }, [showSaveToListModal, saveToListJobId]);

  const handleOpenSaveToList = (jobId) => {
    setSaveToListJobId(jobId);
    setShowSaveToListModal(true);
    setShowCreateListInSaveModal(false);
    setNewListNameInSaveModal('');
    setSaveToListMessage(null);
  };

  const handleAddJobToList = async (listId) => {
    if (!saveToListJobId) return;
    setSaveToListMessage(null);
    try {
      await apiService.addJobToSavedList(listId, { jobId: saveToListJobId });
      setSaveToListMessage(language === 'vi' ? 'Đã thêm vào danh sách.' : language === 'en' ? 'Added to list.' : 'リストに追加しました。');
      setTimeout(() => { setShowSaveToListModal(false); setSaveToListJobId(null); }, 800);
    } catch (e) {
      setSaveToListMessage(e?.message || (language === 'vi' ? 'Thêm thất bại.' : language === 'en' ? 'Failed.' : '追加に失敗しました。'));
    }
  };

  const handleCopyJobUrl = (job, e) => {
    e?.stopPropagation?.();
    if (!job?.id) return;
    const url = `${window.location.origin}/collaborator/jobs/${job.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedJobId(job.id);
      setTimeout(() => {
        setCopiedJobId((cur) => (cur === job.id ? null : cur));
      }, 2000);
    }).catch(() => {
      alert(language === 'vi' ? 'Không sao chép được URL.' : language === 'en' ? 'Could not copy URL.' : 'URLをコピーできませんでした。');
    });
  };

  const handleDownloadJD = async (job, fileType = 'jdFile') => {
    if (!job?.id) return;
    setOpenDownloadMenuJobId(null);
    try {
      const url = useAdminAPI
        ? await apiService.getAdminJobFileUrl(job.id, fileType, 'download')
        : await apiService.getCtvJobFileUrl(job.id, fileType, 'download');
      if (url) openRemoteFileDownloadUrl(url);
      else alert(language === 'vi' ? 'Công việc này chưa có file JD.' : language === 'en' ? 'No JD file.' : 'JDファイルがありません。');
    } catch (e) {
      const msg = e?.message || (language === 'vi' ? 'Không tải được JD.' : language === 'en' ? 'Failed to download JD.' : 'JDのダウンロードに失敗しました。');
      alert(msg);
    }
  };

  const handleCreateListAndAddJob = async () => {
    const name = newListNameInSaveModal.trim();
    if (!name || creatingListInSaveModal || !saveToListJobId) return;
    setCreatingListInSaveModal(true);
    setSaveToListMessage(null);
    try {
      const createRes = await apiService.createSavedList({ name });
      if (!createRes.success || !createRes.data?.id) throw new Error('Create failed');
      await apiService.addJobToSavedList(createRes.data.id, { jobId: saveToListJobId });
      setSaveToListMessage(language === 'vi' ? 'Đã tạo danh sách và thêm công việc.' : language === 'en' ? 'List created and job added.' : 'リストを作成し、求人を追加しました。');
      setShowCreateListInSaveModal(false);
      setNewListNameInSaveModal('');
      setSaveToListLists((prev) => [...prev, createRes.data]);
      setTimeout(() => { setShowSaveToListModal(false); setSaveToListJobId(null); }, 800);
    } catch (e) {
      setSaveToListMessage(e?.message || (language === 'vi' ? 'Tạo danh sách thất bại.' : language === 'en' ? 'Failed.' : 'リスト作成に失敗しました。'));
    } finally {
      setCreatingListInSaveModal(false);
    }
  };

  const handleAdminJobStatusChange = async (job, newStatus) => {
    if (!job?.id || togglingJobStatusId === job.id) return;
    const n = parseInt(String(newStatus), 10);
    if (!Number.isFinite(n)) return;
    const cur = jobRowStatusCode(job);
    if (cur === n) return;
    try {
      setTogglingJobStatusId(job.id);
      const res = await apiService.updateJobStatus(job.id, n);
      const serverJob = res?.data?.job;
      let resolved = n;
      if (serverJob && typeof serverJob === 'object') {
        const fromServer = jobRowStatusCode(serverJob);
        if (fromServer != null) resolved = fromServer;
      }
      setJobs((prev) =>
        prev.map((j) => (String(j.id) === String(job.id) ? { ...j, status: resolved } : j))
      );
      if (onJobStatusUpdated) onJobStatusUpdated(job.id, resolved);
    } catch (e) {
      alert(e?.message || (language === 'vi' ? 'Không thể cập nhật trạng thái job.' : language === 'en' ? 'Failed to update job status.' : '求人ステータスの更新に失敗しました。'));
    } finally {
      setTogglingJobStatusId(null);
    }
  };

  const handleDeleteJob = async (job) => {
    if (!job?.id || deletingJobId === job.id) return;
    if (!window.confirm(language === 'vi' ? 'Bạn có chắc muốn xóa job này?' : language === 'en' ? 'Delete this job?' : 'この求人を削除しますか？')) return;
    try {
      setDeletingJobId(job.id);
      await apiService.deleteAdminJob(job.id);
      // Xóa mềm (backend DELETE /admin/jobs/:id đã soft delete).
      // Component vẫn tự remove khỏi list để UI phản hồi ngay (kể cả khi có onJobDeleted callback).
      setJobs((prev) => prev.filter((j) => String(j.id) !== String(job.id)));
      if (onJobDeleted) onJobDeleted(job.id);
    } catch (e) {
      alert(e?.message || (language === 'vi' ? 'Xóa job thất bại.' : language === 'en' ? 'Failed to delete job.' : '求人の削除に失敗しました。'));
    } finally {
      setDeletingJobId(null);
    }
  };

  // Update jobs when propJobs changes (from search). null = bỏ list đã lọc → chờ fetch server (vd. «Xóa điều kiện»)
  useEffect(() => {
    const prevJobs = prevPropJobsRef.current;

    if (propJobs === null) {
      setJobs([]);
      setTotalJobs(0);
      setTotalPages(1);
      setHasMoreFromApi(false);
      // JobsListPage giữ jobs=null cho danh sách server — không được reset trang khi mount lại hoặc back từ chi tiết (session đã khôi phục currentPage/pageCursors).
      const clearingSearchResults = prevJobs !== undefined && prevJobs !== null;
      if (clearingSearchResults) {
        setCurrentPage(1);
        setPageCursors([null]);
      }
      prevPropJobsRef.current = propJobs;
      return;
    }

    prevPropJobsRef.current = propJobs;

    if (propJobs !== undefined && propJobs !== null) {
      const list = Array.isArray(propJobs) ? propJobs : [];
      if (showAllJobs) {
        setJobs(list);
        setTotalJobs(list.length);
        setTotalPages(Math.max(1, Math.ceil(list.length / limit)));
        setCurrentPage((prev) => {
          const maxPages = Math.max(1, Math.ceil(list.length / limit));
          return Math.min(prev, maxPages);
        });
      } else {
        setJobs(list.slice(0, 3));
        setTotalJobs(list.length);
      }
    }
  }, [propJobs, showAllJobs, limit]);

  // Server list: cursor pagination when parent does not pass propJobs
  useEffect(() => {
    if (propJobs != null) return;
    if (!(showAllJobs && enablePagination)) return;

    // Form tìm kiếm hoặc toolbar admin đang thu hẹp list: Session1 khôi phục query — tránh loadInitialJobs thiếu companyId / hasCampaign / status
    const toolbarRestricts = hasAdminJobsToolbarListContext({
      useAdminAPI,
      adminCompanyId,
      adminHasCampaign,
      adminJobStatus,
    });
    if ((filters && hasActiveAgentJobSearchCriteria(filters)) || toolbarRestricts) {
      return;
    }

    const special =
      filters &&
      (filters.campaignId || filters.pickupId || filters.postId || filters.isHot || filters.isPinned);
    if (special) {
      const fk = JSON.stringify(filters);
      if (lastSpecialFiltersKeyRef.current === fk) return;
      lastSpecialFiltersKeyRef.current = fk;
      setPageCursors([null]);
      setCurrentPage(1);
      loadInitialJobs(1, [null]);
      return;
    }
    lastSpecialFiltersKeyRef.current = '';
    loadInitialJobs(currentPage, pageCursorsRef.current);
  }, [currentPage, filters, showAllJobs, enablePagination, propJobs, useAdminAPI, adminCompanyId, adminHasCampaign, adminJobStatus]);

  const loadInitialJobs = async (page = 1, cursorsSnapshot = pageCursorsRef.current) => {
    const fetchGeneration = serverListFetchGenerationRef.current;
    try {
      setLoading(true);
      // Build params with current filters if available
      const params = { limit };
      const cursorForPage = page > 1 ? cursorsSnapshot[page - 1] : null;
      if (cursorForPage) params.cursor = cursorForPage;
      
      if (filters) {
        // Apply filters from search
        if (filters.keyword && filters.keyword.trim()) {
          params.search = filters.keyword.trim();
        }
        // Category filter - ưu tiên jobTypeIds (Loại công việc), sau đó fieldIds (Lĩnh vực), cuối cùng businessTypeIds (Loại hình kinh doanh)
        if (filters.jobTypeIds && filters.jobTypeIds.length > 0) {
          params.jobCategoryId = parseInt(filters.jobTypeIds[0], 10);
        } else if (filters.fieldIds && filters.fieldIds.length > 0) {
          params.jobCategoryId = parseInt(filters.fieldIds[0], 10);
        } else if (filters.businessTypeIds && filters.businessTypeIds.length > 0) {
          params.jobCategoryId = parseInt(filters.businessTypeIds[0], 10);
        }
        if (!params.jobCategoryId) {
          if (filters.jobChildIds && filters.jobChildIds.length > 0) {
            params.jobCategoryId = parseInt(filters.jobChildIds[0], 10);
          } else if (filters.jobParentIds && filters.jobParentIds.length > 0) {
            params.jobCategoryId = parseInt(filters.jobParentIds[0], 10);
          }
        }
        if (filters.locations && filters.locations.length > 0) {
          params.location = filters.locations[0];
        }
        if (filters.salaryMin) {
          params.minSalary = String(filters.salaryMin);
        }
        if (filters.salaryMax) {
          params.maxSalary = String(filters.salaryMax);
        }
        // Support campaign, article, event, pickup, post filters
        if (filters.campaignId) {
          params.campaignId = filters.campaignId;
        }
        if (filters.articleId) {
          params.articleId = filters.articleId;
        }
        if (filters.eventId) {
          params.eventId = filters.eventId;
        }
        if (filters.pickupId) {
          params.pickupId = filters.pickupId;
        }
        if (filters.postId) {
          params.postId = filters.postId;
        }
        if (filters.isHot) {
          params.isHot = true;
        }
        if (filters.isPinned) {
          params.isPinned = true;
        }
      }
      
      params.sortBy = 'createdAt';
      params.sortOrder = 'DESC';
      
      // Use getAdminJobs for admin users, getCTVJobs for CTV users
      const response = useAdminAPI 
        ? await apiService.getAdminJobs(params)
        : await apiService.getCTVJobs(params);
      if (fetchGeneration !== serverListFetchGenerationRef.current) return;
      if (response.success && response.data) {
        setJobs(response.data.jobs || []);
        if (response.data.pagination) {
          const { nextCursor, hasMore, limit: lim, total, totalPages: tp } = response.data.pagination;
          if (nextCursor !== undefined || hasMore !== undefined) {
            setHasMoreFromApi(!!hasMore);
            setPageCursors((prev) => {
              const next = [...prev];
              next[page] = nextCursor || null;
              return next;
            });
            const pageSize = lim || limit;
            setTotalJobs((page - 1) * pageSize + (response.data.jobs || []).length + (hasMore ? 1 : 0));
            setTotalPages(null);
          } else if (tp != null && total != null) {
            setTotalPages(tp || 1);
            setTotalJobs(total || 0);
            setHasMoreFromApi(false);
            setCurrentPage(response.data.pagination.page || page);
          } else {
            setTotalPages(1);
            setTotalJobs((response.data.jobs || []).length);
            setHasMoreFromApi(false);
          }
        }
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      if (fetchGeneration === serverListFetchGenerationRef.current) {
        setJobs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    const serverCursorMode = showAllJobs && enablePagination && propJobs == null;
    let ok = false;
    if (serverCursorMode) {
      if (newPage === currentPage) ok = false;
      else if (newPage < currentPage) ok = true;
      else if (newPage === currentPage + 1 && hasMoreFromApi) ok = true;
    } else {
      ok = newPage >= 1 && newPage <= totalPages;
    }
    if (ok) {
      setCurrentPage(newPage);
      if (listContainerRef.current) {
        listContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Mock data for job listings (removed - no longer used)
const mockJobs = [
  {
    id: '00304192-9fcd0',
    tags: [
      { label: 'JobShare Selection', color: 'green' },
      { label: 'Nhân viên chính thức (hợp đồng không thời hạn)', color: 'blue' },
    ],
    title: '【Tuyển dụng toàn quốc!】Chuyển việc OK ở bất kỳ đâu tại Nhật Bản. Bắt đầu từ số không trong quản lý thi công xây dựng ~ Chào đón người chưa có kinh nghiệm ● Đào tạo & hỗ trợ chu đáo để bắt đầu yên tâm. Phụ nữ cũng đang hoạt động tích cực ~',
    category: 'Kỹ thuật xây dựng & dân dụng / Quản lý thi công & Giám sát công trình【Xây dựng】',
    company: 'Công ty TNHH Nikken Total Sourcing',
    keywords: [
      'Chấp nhận chưa có kinh nghiệm nghề',
      'Chấp nhận chưa có kinh nghiệm ngành',
      'Chấp nhận hoàn toàn chưa có kinh nghiệm',
      'Đăng tải trên phương tiện truyền thông OK (công khai tên công ty)',
      'Tuyển dụng qua headhunter OK (công khai tên công ty)',
      'Nghỉ thứ 7 và Chủ nhật',
      'Có thành tích nghỉ thai sản/nuôi con',
    ],
    details: [
      'Hỗ trợ toàn quốc, quản lý thi công xây dựng cho người chưa có kinh nghiệm, phí giới thiệu 77 triệu yên, đào tạo chu đáo, tuyển gấp bắt đầu giữa tháng 1',
      'Mã việc làm: 00318682-b9948 - Đảm bảo phỏng vấn cho tất cả ứng viên',
      'Tỉnh Mie Yokkaichi / Kỹ sư bảo trì thiết bị bán dẫn / Chấp nhận chưa có kinh nghiệm',
      'Tuyển chọn tốc độ',
    ],
    commission: {
      company: 'Cố định 77 triệu yên',
      full: 'Cố định 77 triệu yên',
      sameDayPayment: true,
    },
  },
  {
    id: '00180228-54b9a',
    tags: [
      { label: 'JobShare Selection', color: 'green' },
      { label: 'Nhân viên chính thức (hợp đồng không thời hạn)', color: 'blue' },
    ],
    title: 'Thực hiện tuyển chọn 1 ngày! Tuyển chọn tốc độ cao Nhân viên bảo vệ quen thuộc với "Bạn có đang SECOM không?"! (Beat Engineer) ◆ Lương trung bình 621 triệu yên/năm / Thưởng tối đa 198 triệu yên / Có nhà ở công ty & ký túc xá độc thân / OK nghỉ 10 ngày liên tiếp',
    category: 'Công nhân kỹ năng, Thiết bị, Giao thông & Vận tải / Bảo vệ, Bảo vệ',
    company: 'Công ty TNHH SECOM',
    keywords: [
      'Chấp nhận chưa có kinh nghiệm nghề',
      'Chấp nhận chưa có kinh nghiệm ngành',
      'Chấp nhận hoàn toàn chưa có kinh nghiệm',
      'Đăng tải trên phương tiện truyền thông OK (công khai tên công ty)',
      'Tuyển dụng qua headhunter OK (công khai tên công ty)',
      'Có thể sử dụng tiếng Anh',
      'Có chế độ nhà ở công ty / Hỗ trợ tiền thuê nhà',
    ],
    details: [
      'Giới hạn khu vực',
      'Tổ chức hội tuyển chọn 1 ngày',
      'Tuyển chọn tốc độ cao nhanh hơn cả tuyển chọn thông thường',
      'Lịch trình cũng mở vào tháng 1/2026',
    ],
    commission: {
      company: '36% lương lý thuyết hàng năm',
      full: '36% lương lý thuyết hàng năm',
      sameDayPayment: true,
    },
  },
];

  const translations = {
    vi: {
      headerTitle: 'JobShare Workstation',
      viewSkilledJobs: 'Xem việc làm kỹ năng quốc tế',
      viewNoExpJobs: 'Xem việc làm chấp nhận chưa có kinh nghiệm',
      companyInfo: 'Hội thảo thông tin công ty tuyển dụng',
      jobId: 'Mã việc làm',
      jobCategory: 'Phân loại nghề nghiệp',
      hiringCompany: 'Công ty tuyển dụng',
      companyCommission: 'Có thể nhận',
      fullAmount: 'Toàn bộ',
      sameDayPayment: 'Có thể thanh toán trong ngày',
      viewMore: 'Xem thêm JobShare Workstation khác',
    },
    en: {
      headerTitle: 'JobShare Workstation',
      viewSkilledJobs: 'View skilled foreign worker jobs',
      viewNoExpJobs: 'View jobs OK for no experience',
      companyInfo: 'Company information session for hiring companies',
      jobId: 'Job ID',
      jobCategory: 'Job Category',
      hiringCompany: 'Hiring Company',
      companyCommission: 'Your company',
      fullAmount: 'Full amount',
      sameDayPayment: 'Same-day deposit OK',
      viewMore: 'View other JobShare Workstation',
    },
    ja: {
      headerTitle: 'JobShare Workstation',
      viewSkilledJobs: '技人国求人を見る',
      viewNoExpJobs: '未経験OK求人を見る',
      companyInfo: '採用企業会社説明会',
      jobId: '求人ID',
      jobCategory: '職種分類',
      hiringCompany: '採用企業',
      companyCommission: '貴社',
      fullAmount: '全額',
      sameDayPayment: '即日入金OK',
      viewMore: '他のJobShare Workstationを見る',
    },
  };

  const t = translations[language] || translations.vi;

  const pickByLanguage = (viText, enText, jpText) => {
    const lang = language === 'jp' ? 'ja' : language;
    if (lang === 'en') return enText || viText || '';
    if (lang === 'ja') return jpText || enText || viText || '';
    return viText || enText || jpText || '';
  };

  /** Normalize job text from API (string, JSON string, array, or { vi, en, ja/jp }) — same rules as AddJob JD parse. */
  const jobTextToPlain = (raw, lang) => {
    if (raw == null || raw === '') return '';
    if (typeof raw === 'string') {
      const t = raw.trim();
      if (
        (t.startsWith('{') && t.endsWith('}')) ||
        (t.startsWith('[') && t.endsWith(']'))
      ) {
        try {
          return jobTextToPlain(JSON.parse(t), lang);
        } catch {
          /* not JSON; keep string */
        }
      }
      return raw;
    }
    if (Array.isArray(raw)) {
      return raw.map((x) => String(x).trim()).filter(Boolean).join('\n');
    }
    if (typeof raw === 'object') {
      let v;
      if (lang === 'vi') v = raw.vi;
      else if (lang === 'en') v = raw.en;
      else v = raw.ja ?? raw.jp;
      if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).join('\n');
      if (v != null && v !== '') return String(v);
      return '';
    }
    return String(raw);
  };

  const translateViaMyMemory = useMemo(() => {
    const cache = new Map();
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const translateLine = async (line, sourceCode, targetCode, attempt = 0) => {
      const source = sourceCode || 'vi';
      const target = targetCode || 'en';
      const cacheKey = `${source}|${target}|${line}`;
      if (cache.has(cacheKey)) return cache.get(cacheKey);

      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(line)}&langpair=${encodeURIComponent(`${source}|${target}`)}`;
      const res = await fetch(url);
      if (res.status === 429 && attempt < 2) {
        await sleep(750 * (attempt + 1));
        return translateLine(line, source, target, attempt + 1);
      }
      if (!res.ok) throw new Error(`MyMemory ${res.status}`);
      const data = await res.json().catch(() => ({}));
      const translated = String(data?.responseData?.translatedText ?? line);
      cache.set(cacheKey, translated);
      return translated;
    };

    return async (text, sourceLang, targetLang) => {
      const raw = String(text ?? '');
      if (!raw.trim()) return raw;
      const sourceCode = sourceLang === 'jp' ? 'ja' : sourceLang || 'vi';
      const targetCode = targetLang === 'jp' ? 'ja' : targetLang || 'en';
      const cacheKey = `${sourceCode}|${targetCode}|${raw}`;
      if (cache.has(cacheKey)) return cache.get(cacheKey);

      const lines = raw.split('\n');
      const translatedLines = [];
      for (const line of lines) {
        if (!line.trim()) {
          translatedLines.push(line);
          continue;
        }
        translatedLines.push(await translateLine(line, sourceCode, targetCode));
        await sleep(150);
      }

      const output = translatedLines.join('\n');
      cache.set(cacheKey, output);
      return output;
    };
  }, []);

  const resolveLocalizedText = useMemo(() => {
    return async (raw, targetLang) => {
      const normalizedLang = targetLang === 'jp' ? 'jp' : targetLang === 'en' ? 'en' : 'vi';
      const direct = jobTextToPlain(raw, normalizedLang);
      if (String(direct ?? '').trim()) return direct;

      if (normalizedLang === 'vi') {
        const fromEn = jobTextToPlain(raw, 'en');
        if (String(fromEn ?? '').trim()) return fromEn;
        const fromJp = jobTextToPlain(raw, 'ja');
        if (String(fromJp ?? '').trim()) return fromJp;
        return '';
      }

      if (normalizedLang === 'en') {
        const fromVi = jobTextToPlain(raw, 'vi');
        if (String(fromVi ?? '').trim()) {
          try {
            return await translateViaMyMemory(fromVi, 'vi', 'en');
          } catch (error) {
            console.warn('MyMemory fallback vi->en failed:', error);
          }
        }
        const fromJp = jobTextToPlain(raw, 'ja');
        if (String(fromJp ?? '').trim()) {
          try {
            return await translateViaMyMemory(fromJp, 'ja', 'en');
          } catch (error) {
            console.warn('MyMemory fallback ja->en failed:', error);
          }
        }
        return '';
      }

      const fromVi = jobTextToPlain(raw, 'vi');
      if (String(fromVi ?? '').trim()) {
        try {
          return await translateViaMyMemory(fromVi, 'vi', 'ja');
        } catch (error) {
          console.warn('MyMemory fallback vi->ja failed:', error);
        }
      }
      const fromEn = jobTextToPlain(raw, 'en');
      if (String(fromEn ?? '').trim()) {
        try {
          return await translateViaMyMemory(fromEn, 'en', 'ja');
        } catch (error) {
          console.warn('MyMemory fallback en->ja failed:', error);
        }
      }
      return '';
    };
  }, [translateViaMyMemory]);

  useEffect(() => {
    let cancelled = false;
    const fillMissingTranslations = async () => {
      if (!Array.isArray(jobs) || jobs.length === 0) return;
      const targetLang = language === 'jp' ? 'jp' : language === 'en' ? 'en' : 'vi';
      if (targetLang === 'vi') return;

      const nextJobs = await Promise.all(
        jobs.map(async (job) => {
          if (!job || typeof job !== 'object') return job;
          const next = { ...job };

          const title = await resolveLocalizedText({ vi: job.title, en: job.titleEn, ja: job.titleJp }, targetLang);
          if (!String(title || '').trim() && targetLang !== 'vi') {
            const fallbackTitle = await resolveLocalizedText(job.title, targetLang);
            if (fallbackTitle) next.title = fallbackTitle;
          } else if (title) {
            if (targetLang === 'en') next.titleEn = title;
            if (targetLang === 'jp') next.titleJp = title;
          }

          const description = await resolveLocalizedText({ vi: job.description, en: job.descriptionEn, ja: job.descriptionJp }, targetLang);
          if (description) {
            if (targetLang === 'en') next.descriptionEn = description;
            if (targetLang === 'jp') next.descriptionJp = description;
          }

          const reason = await resolveLocalizedText({ vi: job.recruitmentReason, en: job.recruitmentReasonEn, ja: job.recruitmentReasonJp }, targetLang);
          if (reason) {
            if (targetLang === 'en') next.recruitmentReasonEn = reason;
            if (targetLang === 'jp') next.recruitmentReasonJp = reason;
          }

          if (!job.company && job.recruitingCompany?.companyName) {
            const companyName = await resolveLocalizedText(
              {
                vi: job.recruitingCompany.companyName,
                en: job.recruitingCompany.companyNameEn || job.recruitingCompany.company_name_en,
                ja: job.recruitingCompany.companyNameJp || job.recruitingCompany.company_name_jp,
              },
              targetLang
            );
            if (companyName) {
              next.recruitingCompany = { ...(job.recruitingCompany || {}), ...(targetLang === 'en' ? { companyNameEn: companyName } : targetLang === 'jp' ? { companyNameJp: companyName } : {}) };
            }
          }

          return next;
        })
      );

      if (!cancelled) setJobs(nextJobs);
    };

    void fillMissingTranslations();
    return () => { cancelled = true; };
  }, [language, jobs, resolveLocalizedText]);

  const getTagColorClass = (color) => {
    const colors = {
      green: 'bg-green-100 text-green-800 border-green-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[color] || colors.green;
  };

  const getTagInlineStyle = (color) => {
    const colorMap = {
      green: { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' },
      orange: { backgroundColor: '#fed7aa', color: '#9a3412', borderColor: '#fdba74' },
      blue: { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' },
    };
    return colorMap[color] || colorMap.green;
  };

  // Strip HTML tags and format text
  const stripHtml = (html) => {
    if (html == null || html === '') return '';
    if (typeof html !== 'string') {
      const langKey = language === 'en' ? 'en' : language === 'jp' ? 'ja' : 'vi';
      html = jobTextToPlain(html, langKey);
    }
    if (!html) return '';

    // Check if it's already plain text
    if (!html.includes('<')) return html;
    
    try {
      // Create a temporary div element
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      
      // Convert <ul><li> and <ol><li> to bullet points
      const lists = tmp.querySelectorAll('ul, ol');
      lists.forEach(list => {
        const items = list.querySelectorAll('li');
        const bulletPoints = Array.from(items).map(li => {
          const text = li.textContent.trim();
          return text ? `• ${text}` : '';
        }).filter(Boolean).join('\n');
        
        if (bulletPoints) {
          const textNode = document.createTextNode(bulletPoints);
          if (list.parentNode) {
            list.parentNode.replaceChild(textNode, list);
          }
        } else {
          list.remove();
        }
      });
      
      // Convert <br> to newlines
      const breaks = tmp.querySelectorAll('br');
      breaks.forEach(br => {
        br.replaceWith('\n');
      });
      
      // Convert <p> to newlines
      const paragraphs = tmp.querySelectorAll('p');
      paragraphs.forEach(p => {
        const text = p.textContent.trim();
        if (text) {
          p.replaceWith(`\n${text}\n`);
        } else {
          p.remove();
        }
      });
      
      // Get text content
      let text = tmp.textContent || tmp.innerText || '';
      
      // Clean up extra whitespace and newlines
      text = text
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive newlines
        .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
        .trim();
      
      return text;
    } catch (error) {
      console.error('Error stripping HTML:', error);
      // Fallback: simple regex to remove HTML tags
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
  };

  // Format job data from API
  const formatJob = (job) => {
    const tags = [];
    if (job.isHot) {
      tags.push({
        label:
          language === 'vi'
            ? 'Việc làm nổi bật'
            : language === 'en'
              ? 'Featured job'
              : '注目求人',
        color: 'green',
      });
    }
    // Check if job belongs to a campaign (from jobCampaigns)
    const isInCampaign = job.jobCampaigns && job.jobCampaigns.length > 0;
    if (isInCampaign) {
      tags.push({ label: 'Campaign', color: 'blue' });
    }

    // Helper: parse salary range về đơn vị gốc (yen/Y) để nhân đúng với %:
    // 3.000.000 × 30% = 900.000 (không dùng 3 để nhân)
    const parseSalaryRangeRaw = (rangeStr) => {
      if (!rangeStr) return null;
      const m = String(rangeStr).trim().match(/([\d.,]+)\s*[-–—~〜～]\s*([\d.,]+)/);
      if (!m) return null;
      const parseNum = (s) => {
        const cleaned = String(s).replace(/[.,]/g, '');
        const num = parseFloat(cleaned) || 0;
        const digitCount = cleaned.replace(/[^0-9]/g, '').length;
        if (digitCount >= 7) return num;
        return num * 1000000;
      };
      const min = parseNum(m[1]);
      const max = parseNum(m[2]);
      if (min <= 0 || max <= 0) return null;
      return { min, max };
    };

    // Helper function to parse number from string with thousand separators
    // Salary range can be in different formats:
    // - "3.000.000" = 3,000,000 base units = 3 million (7 digits)
    // - "343.800.000" = 343,800,000 base units = 343.8 million (9 digits)
    // - "343.800" = 343.8 million (already in millions, 6 digits with separator)
    // - "3" = 3 million (already in millions, 1 digit)
    const parseNumber = (str) => {
      if (!str) return 0;
      const originalStr = String(str);
      // Remove all dots and commas (thousand separators), then parse
      const cleaned = originalStr.replace(/[.,]/g, '');
      const num = parseFloat(cleaned) || 0;
      
      // Count digits to determine the scale
      const digitCount = cleaned.replace(/[^0-9]/g, '').length;
      const hasSeparators = /[.,]/.test(originalStr);
      
      // If number has 7+ digits, it's definitely in base units (yen/Y)
      // Convert to millions: 3,000,000 -> 3 million
      if (digitCount >= 7) {
        return num / 1000000;
      }
      // If number has 4-6 digits with separators, it could be:
      // - "3.000" = 3,000 (thousands) -> 3 million if it's actually 3,000,000
      // - "343.800" = 343.8 million (already in millions with decimal separator)
      // We need to check: if it has a pattern like "343.800" (digits.digits), treat as decimal
      else if (digitCount >= 4 && hasSeparators) {
        // Check if it looks like a decimal in millions (e.g., "343.800" = 343.8)
        // Pattern: digits.digits where the part after dot is 3 digits (thousand separator in decimal)
        const decimalPattern = /^(\d+)\.(\d{3})$/;
        if (decimalPattern.test(originalStr)) {
          // It's already in millions with decimal separator: "343.800" = 343.8 million
          // Parse as decimal: replace the last dot with nothing, then divide by 1000
          // "343.800" -> "343800" -> 343800 -> 343.8
          const beforeDot = originalStr.split('.')[0];
          const afterDot = originalStr.split('.').slice(1).join('');
          return parseFloat(beforeDot + '.' + afterDot);
        }
        // Otherwise, it's likely thousands that need conversion
        // "3.000" = 3,000 -> 3 million (if it's actually 3,000,000)
        return num / 1000;
      }
      // If number is small (< 1000) or has 1-3 digits, assume it's already in millions
      // Example: "3" = 3 million
      else {
        return num;
      }
    };

    // Helper function to parse salary range "min - max" (supports thousand separators)
    const parseSalaryRange = (rangeStr) => {
      if (!rangeStr) return null;
      // Match pattern: "number - number" (supports dots, commas, spaces)
      // Examples: "3.000.000 - 8.000.000", "3000000 - 8000000", "3,000,000 - 8,000,000"
      const rangeMatch = rangeStr.match(/([\d.,]+)\s*[-–—~〜～]\s*([\d.,]+)/);
      if (rangeMatch) {
        const minSalary = parseNumber(rangeMatch[1]);
        const maxSalary = parseNumber(rangeMatch[2]);
        if (minSalary > 0 && maxSalary > 0) {
          return { min: minSalary, max: maxSalary, avg: (minSalary + maxSalary) / 2 };
        }
      }
      return null;
    };

    // Calculate commission based on salary range, job percent, and CTV rank percent
    // Lấy job_values có commission: Phí (typeId 2), JLPT (1), JLPT-range (3), JLPT_range (4) - backend dùng cả những type này
    const allJobValues = job.jobValues || job.profits || [];
    const commissionTypeIds = [1, 2, 3, 4]; // Phí, JLPT, JLPT-range, JLPT_range
    const jobValues = allJobValues.filter(jv => {
      const tid = jv.typeId ?? jv.id_typename ?? jv.type?.id;
      const tname = (jv.type?.typename || '').toLowerCase();
      const vid = Number(jv.valueId ?? jv.valueRef?.id ?? 0);
      if (vid === 34) return true;
      if (tid === 2 || tid === '2' || tname === 'phí' || tname === 'commission') return true;
      if (commissionTypeIds.includes(Number(tid))) return true;
      if (jv.type?.cvField && (jv.value !== null && jv.value !== undefined && jv.value !== '')) return true;
      return false;
    });
    // Ẩn block "tên điều kiện phí" (cột giữa) khi job_type = 2 và job_value = 6 hoặc 7
    const hideCommissionConditionLabel = jobValues.some(jv => {
      const tid = Number(jv.typeId ?? jv.type?.id ?? 0);
      const valueId = jv.valueId ?? jv.valueRef?.id;
      const val = jv.value;
      const numVal = val !== null && val !== undefined && val !== '' ? Number(val) : null;
      if (Number(valueId) === 34) return true;
      return tid === 2 && (Number(valueId) === 6 || Number(valueId) === 7 || numVal === 6 || numVal === 7);
    });
    const contactLabel = language === 'vi' ? 'Liên hệ' : language === 'en' ? 'Contact' : 'お問い合わせ';
    let commissionText = contactLabel;
    let commissionTiers = [];
    let isCommissionFromCampaign = false;
    
    // Campaign: nếu job thuộc campaign thì dùng % của campaign để tính phí
    const jobCampaigns = job.jobCampaigns || [];
    const campaignPercent = resolveCampaignPercentFromJob(job);
    const hasCampaignPercent = campaignPercent != null;
    
    // Admin: bỏ qua nhân rank. CTV: nhân với % rank_level
    const ctvRankPercent = ctvProfile?.rankLevel?.percent ? parseFloat(ctvProfile.rankLevel.percent) : 0;
    const rankMultiplier = useAdminAPI ? 1 : (ctvRankPercent > 0 ? ctvRankPercent / 100 : 1);
    
    const formatAmountWithCurrency = (amount) => {
      const nRaw = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
      const n = Math.round(nRaw);
      const formatted = n.toLocaleString('vi-VN');
      return `${formatted} JPY`;
    };
    const formatCommissionForDisplay = (amount) => {
      if (amount >= 1000) return Math.round(amount).toLocaleString('vi-VN');
      if (amount < 1) return amount.toFixed(2).replace(/\.?0+$/, '');
      if (amount < 10) return amount.toFixed(1).replace(/\.?0+$/, '');
      return Math.round(amount).toString();
    };
    const formatRangeWithCurrency = (min, max, formatFn) => {
      const fm = formatFn ? formatFn(min) : Math.round(min).toLocaleString('vi-VN');
      const fx = formatFn ? formatFn(max) : Math.round(max).toLocaleString('vi-VN');
      return `${fm} - ${fx} JPY`;
    };

    // Chỉ dùng salary_ranges có type = năm; không fallback month/HTML (tránh sai quy mô).
    const salaryRanges = job.salaryRanges || [];
    const rawRange = yearSalaryRangeStringForCommission(salaryRanges);
    const salaryRangeData = rawRange ? parseSalaryRangeRaw(rawRange) : null;

    // Admin: chỉ hiển thị % hoặc số tiền nhận từ khách, không tính tiền từ % × lương
    const adminOnlyPercentOrAmount = useAdminAPI;
    const formatAdminJobsharePercentReceived = (percentNumeric) => {
      if (!adminOnlyPercentOrAmount) return null;
      const n = typeof percentNumeric === 'number' ? percentNumeric : parseFloat(percentNumeric);
      if (!Number.isFinite(n)) return null;
      const formatted = n.toLocaleString('vi-VN');
      if (language === 'en') return `${formatted}% of annual income`;
      if (language === 'ja') return `${formatted}%（年収）`;
      return `${formatted}% thu nhập năm`;
    };

    /** CTV: net % = job % x level % when there is no numeric annual salary range (e.g. valueId 7 + textual salary). */
    const formatCtvReceivedPercentOfAnnualIncome = (percentNumeric) => {
      if (adminOnlyPercentOrAmount) return contactLabel;
      const n = typeof percentNumeric === 'number' ? percentNumeric : parseFloat(percentNumeric);
      if (!Number.isFinite(n) || n <= 0) return contactLabel;
      const formatted = Number.isInteger(n)
        ? n.toLocaleString('vi-VN')
        : n.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
      if (language === 'en') return `${formatted}% of annual income`;
      if (language === 'ja') return `${formatted}%（年収）`;
      return `${formatted}% thu nhập năm`;
    };

    // Backend đã tính sẵn (salary gốc × campaign%): min/max là giá trị gốc (yen/Y)
    if (job.computedCampaignCommission) {
      const { min, max } = job.computedCampaignCommission;
      isCommissionFromCampaign = true;
      if (adminOnlyPercentOrAmount && hasCampaignPercent && campaignPercent != null) {
        commissionText = formatAdminJobsharePercentReceived(campaignPercent) || `${campaignPercent}%`;
        commissionTiers = [{ label: 'Campaign', amount: commissionText }];
      } else {
        const ctvMin = min * rankMultiplier;
        const ctvMax = max * rankMultiplier;
        commissionText = formatRangeWithCurrency(ctvMin, ctvMax, formatCommissionForDisplay);
        commissionTiers = [{ label: 'Campaign', amount: commissionText }];
      }
    }
    // Campaign + salary range: tính phí theo lương gốc × campaign% (fallback khi backend chưa gửi)
    else if (hasCampaignPercent && campaignPercent > 0 && salaryRangeData) {
      isCommissionFromCampaign = true;
      if (adminOnlyPercentOrAmount) {
        commissionText = formatAdminJobsharePercentReceived(campaignPercent) || `${campaignPercent}%`;
        commissionTiers = [{ label: 'Campaign', amount: commissionText }];
      } else {
        const platformCommissionMin = salaryRangeData.min * (campaignPercent / 100);
        const platformCommissionMax = salaryRangeData.max * (campaignPercent / 100);
        const ctvMinAmount = platformCommissionMin * rankMultiplier;
        const ctvMaxAmount = platformCommissionMax * rankMultiplier;
        commissionText = formatRangeWithCurrency(ctvMinAmount, ctvMaxAmount, formatCommissionForDisplay);
        commissionTiers = [{ label: 'Campaign', amount: commissionText }];
      }
    } else if (jobValues.length > 0) {
      const firstJobValue = pickPrimaryCommissionJobValue(jobValues) ?? jobValues[0];
      const commissionType = normalizeJobCommissionType(job);
      const value = firstJobValue.value;
      const valueId = firstJobValue.valueId || firstJobValue.valueRef?.id;
      const valueIdNumber = Number(valueId ?? 0);
      const campaignPctUi =
        hasCampaignPercent && campaignPercent != null && Number(campaignPercent) > 0
          ? Number(campaignPercent)
          : null;
      const effectivePercent =
        campaignPctUi != null
          ? campaignPctUi
          : commissionType === 'percent'
            ? (parseFloat(value) || 0)
            : (parseFloat(value) || 0);
      isCommissionFromCampaign = campaignPctUi != null;
      
      if (valueIdNumber === 34) {
        if (useAdminAPI) {
          commissionText = value || contactLabel;
          commissionTiers = [{ label: language === 'vi' ? 'Giá trị nhận' : language === 'en' ? 'Received Value' : '受取額', amount: value || contactLabel }];
        } else {
          const ctvDisplayVal = firstJobValue.viewOnCollaborator || firstJobValue.view_on_collaborator || '';
          if (ctvDisplayVal) {
            const rangeMatch = ctvDisplayVal.match(/([\d.,]+)\s*[-–—]\s*([\d.,]+)/);
            if (rangeMatch) {
              const minVal = parseFloat(rangeMatch[1].replace(/[.,]/g, '')) || 0;
              const maxVal = parseFloat(rangeMatch[2].replace(/[.,]/g, '')) || 0;
              commissionText = formatRangeWithCurrency(minVal * rankMultiplier, maxVal * rankMultiplier, formatCommissionForDisplay);
            } else {
              const numVal = parseFloat(ctvDisplayVal.replace(/[.,]/g, '')) || 0;
              if (numVal > 0) {
                commissionText = formatAmountWithCurrency(numVal * rankMultiplier);
              } else {
                commissionText = ctvDisplayVal;
              }
            }
          } else {
            commissionText = contactLabel;
          }
          commissionTiers = [{ label: language === 'vi' ? 'Giá trị nhận' : language === 'en' ? 'Received Value' : '受取額', amount: commissionText }];
        }
      }
      // Check if valueId = 6 (exception case - display fixed amount directly)
      else if (valueIdNumber === 6) {
        if (value !== null && value !== undefined) {
          if (commissionType === 'fixed') {
            const fixedAmount = parseFloat(value) || 0;
            if (fixedAmount > 0) {
              const displayAmount = fixedAmount * rankMultiplier;
              commissionText = formatAmountWithCurrency(displayAmount);
            }
          } else if (commissionType === 'percent') {
            if (adminOnlyPercentOrAmount) {
              commissionText = formatAdminJobsharePercentReceived(effectivePercent) || `${effectivePercent}%`;
            } else if (salaryRangeData) {
              const jobPercent = effectivePercent;
              const platformCommissionMin = salaryRangeData.min * (jobPercent / 100);
              const platformCommissionMax = salaryRangeData.max * (jobPercent / 100);
              const ctvMinAmount = platformCommissionMin * rankMultiplier;
              const ctvMaxAmount = platformCommissionMax * rankMultiplier;
              commissionText = formatRangeWithCurrency(ctvMinAmount, ctvMaxAmount, formatCommissionForDisplay);
            } else {
              commissionText = `${effectivePercent}%`;
            }
          }
        }
      } else {
        // Normal case (includes valueId 7: job % x level % when no parseable annual range)
        const value7PercentNoAnnualRange =
          valueIdNumber === 7 &&
          commissionType === 'percent' &&
          !adminOnlyPercentOrAmount &&
          !salaryRangeData &&
          effectivePercent > 0;

        if (value7PercentNoAnnualRange) {
          commissionText = formatCtvReceivedPercentOfAnnualIncome(effectivePercent * rankMultiplier);
        } else if (adminOnlyPercentOrAmount && commissionType === 'percent') {
          commissionText = formatAdminJobsharePercentReceived(effectivePercent) || `${effectivePercent}%`;
        } else if (
          salaryRangeData &&
          commissionType === 'percent' &&
          (value !== null && value !== undefined || campaignPctUi != null)
        ) {
          const jobPercent = effectivePercent;
          const platformCommissionMin = salaryRangeData.min * (jobPercent / 100);
          const platformCommissionMax = salaryRangeData.max * (jobPercent / 100);
          const ctvMinAmount = platformCommissionMin * rankMultiplier;
          const ctvMaxAmount = platformCommissionMax * rankMultiplier;
          commissionText = formatRangeWithCurrency(ctvMinAmount, ctvMaxAmount, formatCommissionForDisplay);
        } else if (commissionType === 'fixed' && value !== null && value !== undefined) {
          const amount = parseFloat(value) || 0;
          if (amount > 0) {
            const displayAmount = amount * rankMultiplier;
            commissionText = formatAmountWithCurrency(displayAmount);
          }
        } else if (
          commissionType === 'percent' &&
          (value !== null && value !== undefined || campaignPctUi != null)
        ) {
          commissionText = adminOnlyPercentOrAmount
            ? formatAdminJobsharePercentReceived(effectivePercent) || `${effectivePercent}%`
            : `${effectivePercent}%`;
        }
      }

      if (
        campaignPctUi != null &&
        commissionText === contactLabel &&
        Number(firstJobValue?.valueId || firstJobValue?.valueRef?.id) !== 34
      ) {
        commissionText = adminOnlyPercentOrAmount
          ? formatAdminJobsharePercentReceived(campaignPctUi) || `${campaignPctUi}%`
          : `${campaignPctUi}%`;
      }

      // Build commission tiers: nếu phí theo campaign thì chỉ 1 tier "Campaign" với số tiền đã tính
      // id_value=34 đã set commissionTiers ở trên → giữ nguyên
      if (Number(firstJobValue?.valueId || firstJobValue?.valueRef?.id) === 34) {
        // giữ nguyên commissionTiers đã set
      } else if (isCommissionFromCampaign && commissionText !== contactLabel) {
        commissionTiers = [{ label: 'Campaign', amount: commissionText }];
      } else {
      commissionTiers = jobValues.map((jv) => {
        const tierCommissionType = normalizeJobCommissionType(job);
        const rawValue = jv.value;
        const jvValueId = Number(jv.valueId ?? jv.valueRef?.id ?? 0);
        let amountText = '';
        if (jvValueId === 34) {
          const ctvVal = jv.viewOnCollaborator || jv.view_on_collaborator || '';
          if (ctvVal) {
            const rm = ctvVal.match(/([\d.,]+)\s*[-–—]\s*([\d.,]+)/);
            if (rm) {
              const mn = parseFloat(rm[1].replace(/[.,]/g, '')) || 0;
              const mx = parseFloat(rm[2].replace(/[.,]/g, '')) || 0;
              amountText = formatRangeWithCurrency(mn * rankMultiplier, mx * rankMultiplier, formatCommissionForDisplay);
            } else {
              const nv = parseFloat(ctvVal.replace(/[.,]/g, '')) || 0;
              amountText = nv > 0 ? formatAmountWithCurrency(nv * rankMultiplier) : ctvVal;
            }
          } else {
            amountText = contactLabel;
          }
        } else if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
          if (tierCommissionType === 'percent') {
            const tierPercent = parseFloat(rawValue) || 0;
            const effectivePct = campaignPctUi != null ? campaignPctUi : tierPercent;
            if (adminOnlyPercentOrAmount) {
              amountText = formatAdminJobsharePercentReceived(effectivePct) || `${effectivePct.toLocaleString('vi-VN')}%`;
            } else if (salaryRangeData && effectivePct > 0) {
              const pMin = salaryRangeData.min * (effectivePct / 100) * rankMultiplier;
              const pMax = salaryRangeData.max * (effectivePct / 100) * rankMultiplier;
              amountText = formatRangeWithCurrency(pMin, pMax, formatCommissionForDisplay);
            } else if (jvValueId === 7 && effectivePct > 0) {
              amountText = formatCtvReceivedPercentOfAnnualIncome(effectivePct * rankMultiplier);
            } else {
              amountText = `${effectivePct.toLocaleString('vi-VN')}%`;
            }
          } else {
            const amt = parseFloat(rawValue) || 0;
            const displayAmt = amt > 0 ? amt * rankMultiplier : 0;
            amountText = displayAmt > 0 ? formatAmountWithCurrency(displayAmt) : '';
          }
        }
        const valueRef = jv.valueRef || {};
        const conditionLabel =
          localizedJobValueLabel(language, valueRef) ||
          (language === 'en' ? 'Fee' : language === 'vi' ? 'Phí' : '手数料');
        return (conditionLabel || amountText)
          ? { label: conditionLabel, amount: amountText || commissionText }
          : null;
      }).filter(Boolean);
      }
    }

    const requirements = job.requirements || [];
    const requirementTypeOrder = ['technique', 'experience', 'language', 'certification', 'education', 'skill', 'other', 'application'];
    const requiredRequirements = requirements.filter((req) => {
      const status = String(req?.status ?? '').toLowerCase();
      return status === 'required' || status === 'bắt buộc';
    });

    const applicationConditions = (() => {
      const source = requiredRequirements.length > 0 ? requiredRequirements : requirements;
      const sorted = [...source].sort((a, b) => {
        const ia = requirementTypeOrder.indexOf(String(a?.type ?? '').toLowerCase());
        const ib = requirementTypeOrder.indexOf(String(b?.type ?? '').toLowerCase());
        const sa = ia === -1 ? requirementTypeOrder.length : ia;
        const sb = ib === -1 ? requirementTypeOrder.length : ib;
        return sa - sb;
      });
      return sorted
        .map((req) => stripHtml(pickByLanguage(req.content, req.contentEn || req.content_en, req.contentJp || req.content_jp) || ''))
        .filter(Boolean);
    })();

    // Job content: description, recruitment reason, highlights (list API may omit empty description)
    const descVi = jobTextToPlain(job.description, 'vi');
    const descEn =
      jobTextToPlain(job.descriptionEn || job.description_en, 'en') ||
      jobTextToPlain(job.description, 'en');
    const descJp =
      jobTextToPlain(job.descriptionJp || job.description_jp, 'ja') ||
      jobTextToPlain(job.description, 'ja');
    const description = pickByLanguage(descVi, descEn, descJp);

    const rrVi = jobTextToPlain(job.recruitmentReason || job.recruitment_reason, 'vi');
    const rrEn =
      jobTextToPlain(job.recruitmentReasonEn || job.recruitment_reason_en, 'en') ||
      jobTextToPlain(job.recruitmentReason || job.recruitment_reason, 'en');
    const rrJp =
      jobTextToPlain(job.recruitmentReasonJp || job.recruitment_reason_jp, 'ja') ||
      jobTextToPlain(job.recruitmentReason || job.recruitment_reason, 'ja');
    const recruitmentReasonText = pickByLanguage(rrVi, rrEn, rrJp);

    const highlightsRaw = pickByLanguage(
      jobTextToPlain(job.highlights, 'vi'),
      jobTextToPlain(job.highlights, 'en'),
      jobTextToPlain(job.highlights, 'ja')
    ).trim();

    const legacyBody = pickByLanguage(
      jobTextToPlain(job.jobContent, 'vi'),
      jobTextToPlain(job.jobContent, 'en'),
      jobTextToPlain(job.jobContent, 'ja')
    ).trim();

    const rawJobBody = description || recruitmentReasonText || highlightsRaw || legacyBody || '';
    let jobContent = stripHtml(rawJobBody).trim();
    // Ignore ellipsis-only payload (bad cap maxLen=0 on API list truncate)
    if (!jobContent || /^[.…\s]+$/u.test(jobContent)) {
      jobContent = '';
    }

    // Get working location details (hỗ trợ cả Admin API và CTV API) + fallback từ workingLocations
    const workingLocationDetails = job.workingLocationDetails || [];
    const workLocation = job.workLocation || job.work_location || '';
    let locationText = workingLocationDetails
      .map(detail => {
        const content = pickByLanguage(
          detail.content,
          detail.contentEn || detail.content_en,
          detail.contentJp || detail.content_jp
        );
        return stripHtml(content || '');
      })
      .filter(Boolean)
      .join(', ');
    if (!locationText && (job.workingLocations || []).length > 0) {
      locationText = job.workingLocations
        .map(loc => {
          const locText = pickByLanguage(loc.location, loc.locationEn || loc.location_en, loc.locationJp || loc.location_jp);
          const countryText = pickByLanguage(loc.country, loc.countryEn || loc.country_en, loc.countryJp || loc.country_jp);
          return [locText, countryText].filter(Boolean).join(' - ');
        })
        .filter(Boolean)
        .join(', ');
    }
    if (!locationText) locationText = stripHtml(workLocation || '');

    const getSalaryTypeLabel = (typeRaw) => {
      const type = String(typeRaw || '').toLowerCase();
      if (type.includes('year') || type.includes('năm')) {
        return language === 'vi' ? 'Thu nhập năm' : language === 'en' ? 'Annual income' : '年収';
      }
      if (type.includes('month') || type.includes('tháng')) {
        return language === 'vi' ? 'Lương tháng' : language === 'en' ? 'Monthly salary' : '月給';
      }
      return language === 'vi' ? 'Mức lương' : language === 'en' ? 'Salary' : '給与';
    };

    const salaryRows = (job.salaryRanges || [])
      .map((sr) => {
        const value = stripHtml(
          pickByLanguage(sr.salaryRange, sr.salaryRangeEn || sr.salary_range_en, sr.salaryRangeJp || sr.salary_range_jp) || ''
        );
        if (!value) return null;
        const displayValue = formatSalaryValueWithJlptIfRange(value);
        return `${getSalaryTypeLabel(sr.type)}: ${displayValue}`;
      })
      .filter(Boolean);

    const estimatedSalary = job.estimatedSalary || job.estimated_salary || '';
    const salaryText = salaryRows.length > 0 ? salaryRows.join('\n') : stripHtml(estimatedSalary || '');
    
    // Get additional info
    const ageRange = job.ageRange || job.age || '';
    const nationality = job.nationality || '';
    const gender = job.gender || '';
    const educationLevel = job.educationLevel || '';
    const category = pickByLanguage(
      job.category?.name,
      job.category?.nameEn || job.category?.name_en,
      job.category?.nameJp || job.category?.name_jp
    ) || job.category?.name || '';
    
    // Format dates
    const formatDate = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      } catch (error) {
        return '';
      }
    };
    
    const updatedAt = formatDate(job.updatedAt);
    const publishedAt = formatDate(job.publishedAt || job.createdAt);

    const title = pickByLanguage(
      job.title,
      job.titleEn || job.title_en,
      job.titleJp || job.title_jp
    );

    const companyName = (() => {
      const viName = job.recruitingCompany?.companyName || '';
      const enName = job.recruitingCompany?.companyNameEn || job.recruitingCompany?.company_name_en || '';
      const jpName = job.recruitingCompany?.companyNameJp || job.recruitingCompany?.company_name_jp || '';

      if (language === 'ja') return jpName || enName || viName;
      if (language === 'en') return enName || viName;
      return viName || enName;
    })();

    const rawStatus = job.status ?? job.job_status;
    const statusNum =
      rawStatus === null || rawStatus === undefined || rawStatus === ''
        ? undefined
        : (() => {
            const p = parseInt(String(rawStatus), 10);
            return Number.isFinite(p) ? p : undefined;
          })();

    const interviewLocRaw =
      job.interviewLocation ??
      job.interview_location ??
      job.dataValues?.interviewLocation ??
      job.dataValues?.interview_location;
    const recruitmentLocLabel = getRecruitmentLocationLabel(interviewLocRaw, language);
    const recruitmentLocationUnset =
      language === 'vi' ? 'Chưa cập nhật' : language === 'en' ? 'Not set' : '未設定';

    return {
      id: String(job.id),
      jobCode: job.jobCode || job.id,
      status: statusNum,
      isPinned: !!(job.isPinned ?? job.is_pinned),
      tags,
      title: title || '',
      company: companyName || '',
      recruitingCompany: job.recruitingCompany,
      category,
      applicationConditions,
      jobContent,
      location: locationText,
      salary: salaryText,
      commission: commissionText,
      commissionTiers,
      hideCommissionConditionLabel: !!hideCommissionConditionLabel,
      isCommissionFromCampaign,
      isInCampaign,
      ageRange,
      nationality,
      gender,
      educationLevel,
      recruitmentLocation: recruitmentLocLabel || recruitmentLocationUnset,
      recruitmentLocationIsSet: !!recruitmentLocLabel,
      updatedAt,
      publishedAt,
    };
  };

  const displayJobs = useMemo(() => {
    if (!jobs.length) return [];
    const sorted = [...jobs].sort((a, b) => {
      const pa = (a.isPinned ?? a.is_pinned) ? 1 : 0;
      const pb = (b.isPinned ?? b.is_pinned) ? 1 : 0;
      if (pb !== pa) return pb - pa;
      return 0;
    });
    return sorted.map(formatJob);
  }, [jobs, ctvProfile, useAdminAPI, language]);

  const jobsToRender = useMemo(() => {
    if (!isClientSidePagination) return displayJobs;
    const start = (currentPage - 1) * limit;
    return displayJobs.slice(start, start + limit);
  }, [displayJobs, isClientSidePagination, currentPage, limit]);

  const listUsesCursor =
    showAllJobs && enablePagination && propJobs == null;

  const CURSOR_PAGE_WINDOW = 4;
  const cursorPageWindow = useMemo(() => {
    if (!listUsesCursor) return [];
    const start = currentPage <= 3 ? 1 : Math.max(1, currentPage - 2);
    return Array.from({ length: CURSOR_PAGE_WINDOW }, (_, i) => start + i);
  }, [listUsesCursor, currentPage]);

  const cursorPageClick = (pageNum) => {
    if (pageNum === currentPage || loading) return;
    if (pageNum < currentPage) {
      handlePageChange(pageNum);
      return;
    }
    if (pageNum === currentPage + 1 && hasMoreFromApi) {
      handlePageChange(pageNum);
    }
  };

  const isCursorPageButtonDisabled = (pageNum) => {
    if (pageNum === currentPage) return false;
    if (loading) return true;
    if (pageNum < currentPage) return false;
    if (pageNum === currentPage + 1) return !hasMoreFromApi;
    return true;
  };

  const selectedCount = bulkSelectedJobIds.size;
  const allCurrentPageSelected =
    jobsToRender.length > 0 && jobsToRender.every((job) => bulkSelectedJobIds.has(String(job.id)));

  const toggleBulkSelectedJob = (jobId) => {
    const id = String(jobId);
    setBulkSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllCurrentPage = () => {
    setBulkSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (allCurrentPageSelected) {
        jobsToRender.forEach((job) => next.delete(String(job.id)));
      } else {
        jobsToRender.forEach((job) => next.add(String(job.id)));
      }
      return next;
    });
  };

  const clearBulkSelection = () => setBulkSelectedJobIds(new Set());

  const handleCreatePickupFromSelection = async () => {
    if (!canUseBulkPickupActions || selectedCount === 0 || creatingPickup) return;
    const name = String(newPickupName || '').trim();
    if (!name) {
      alert(language === 'vi' ? 'Nhập tên danh sách lựa chọn.' : language === 'en' ? 'Please enter pickup name.' : 'リスト名を入力してください。');
      return;
    }
    try {
      setCreatingPickup(true);
      const createRes = await apiService.createAdminJobPickup({ name });
      if (!createRes?.success || !createRes?.data?.pickup?.id) {
        throw new Error(createRes?.message || 'Create pickup failed');
      }
      const pickupId = createRes.data.pickup.id;
      const ids = Array.from(bulkSelectedJobIds)
        .map((x) => parseInt(String(x), 10))
        .filter((n) => !Number.isNaN(n));
      const addRes = await apiService.addJobsToAdminJobPickup(pickupId, ids);
      if (!addRes?.success) {
        throw new Error(addRes?.message || 'Attach jobs failed');
      }
      setShowCreatePickupModal(false);
      setNewPickupName('');
      setBulkSelectedJobIds(new Set());
      alert(
        language === 'vi'
          ? 'Đã tạo danh sách lựa chọn mới.'
          : language === 'en'
            ? 'Created new pickup list.'
            : '新しいPick-upリストを作成しました。'
      );
    } catch (e) {
      alert(e?.message || 'Error');
    } finally {
      setCreatingPickup(false);
    }
  };

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f1f1f1;
        }
      `}</style>
      <div className="w-full h-full min-h-0 overflow-hidden flex flex-col">
        {/* Job Listings with Scroll */}
        <div ref={listContainerRef} className="flex-1 overflow-y-auto overscroll-contain px-0.5 sm:pr-2 min-h-0 relative">
        {/* Pagination - Show at top if showAllJobs and enablePagination */}
        {showAllJobs && enablePagination && (
          <div className="sticky top-0 z-10 mb-2 sm:mb-4 rounded-lg shadow-sm p-1.5 sm:p-2 md:p-3" style={{ backgroundColor: 'white', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <div
              className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 ${
                listUsesCursor ? 'justify-end' : 'justify-between'
              }`}
            >
              {!listUsesCursor && (
                <div className="text-[10px] sm:text-xs md:text-sm w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2" style={{ color: '#4b5563' }}>
                  <span>
                    {language === 'vi'
                      ? `Hiển thị ${jobsToRender.length} / ${totalJobs} công việc`
                      : language === 'en'
                        ? `Showing ${jobsToRender.length} / ${totalJobs} jobs`
                        : `${jobsToRender.length} / ${totalJobs} 件を表示`}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-0.5 sm:gap-1 w-full sm:w-auto justify-center sm:justify-end">
                {!listUsesCursor ? (
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1 || loading}
                  onMouseEnter={() => setHoveredPaginationButton('first')}
                  onMouseLeave={() => setHoveredPaginationButton(null)}
                  className="hidden sm:flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 text-sm font-medium rounded-lg transition-colors"
                  title={language === 'vi' ? 'Trang đầu' : language === 'en' ? 'First page' : '最初のページ'}
                  style={{
                    color: '#374151',
                    backgroundColor: hoveredPaginationButton === 'first' && !(currentPage === 1 || loading) ? '#e5e7eb' : '#f3f4f6',
                    opacity: (currentPage === 1 || loading) ? 0.5 : 1,
                    cursor: (currentPage === 1 || loading) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 -ml-1.5 sm:-ml-2" />
                </button>
                ) : null}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  onMouseEnter={() => setHoveredPaginationButton('prev')}
                  onMouseLeave={() => setHoveredPaginationButton(null)}
                  className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 text-sm font-medium rounded-lg transition-colors"
                  title={language === 'vi' ? 'Trang trước' : language === 'en' ? 'Previous page' : '前のページ'}
                  style={{
                    color: '#374151',
                    backgroundColor: hoveredPaginationButton === 'prev' && !(currentPage === 1 || loading) ? '#e5e7eb' : '#f3f4f6',
                    opacity: (currentPage === 1 || loading) ? 0.5 : 1,
                    cursor: (currentPage === 1 || loading) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <div className="flex items-center gap-0.5">
                  {listUsesCursor ? (
                    cursorPageWindow.map((pageNum) => {
                      const isActive = currentPage === pageNum;
                      const disabled = isCursorPageButtonDisabled(pageNum);
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => cursorPageClick(pageNum)}
                          disabled={disabled}
                          onMouseEnter={() => setHoveredPaginationButton(`cursor-${pageNum}`)}
                          onMouseLeave={() => setHoveredPaginationButton(null)}
                          className="w-7 h-7 sm:w-8 sm:h-8 text-[10px] sm:text-xs font-medium rounded-lg transition-colors"
                          style={{
                            backgroundColor: isActive ? '#2563eb' : (hoveredPaginationButton === `cursor-${pageNum}` && !disabled ? '#e5e7eb' : '#f3f4f6'),
                            color: isActive ? 'white' : '#374151',
                            opacity: disabled && !isActive ? 0.45 : 1,
                            cursor: disabled && !isActive ? 'not-allowed' : 'pointer',
                          }}
                          title={
                            pageNum > currentPage + 1
                              ? (language === 'vi'
                                ? 'Chi co the chuyen tung trang (nut tiep)'
                                : language === 'en'
                                  ? 'Use Next to advance one page at a time'
                                  : '順に次へで進んでください')
                              : undefined
                          }
                        >
                          {pageNum}
                        </button>
                      );
                    })
                  ) : (
                    Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          onMouseEnter={() => setHoveredPaginationButton(`page-${pageNum}`)}
                          onMouseLeave={() => setHoveredPaginationButton(null)}
                          className="w-7 h-7 sm:w-8 sm:h-8 text-[10px] sm:text-xs font-medium rounded-lg transition-colors"
                          style={{
                            backgroundColor: isActive ? '#2563eb' : (hoveredPaginationButton === `page-${pageNum}` ? '#e5e7eb' : '#f3f4f6'),
                            color: isActive ? 'white' : '#374151',
                            opacity: loading ? 0.5 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })
                  )}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={listUsesCursor ? (!hasMoreFromApi || loading) : (currentPage === totalPages || loading)}
                  onMouseEnter={() => setHoveredPaginationButton('next')}
                  onMouseLeave={() => setHoveredPaginationButton(null)}
                  className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 text-sm font-medium rounded-lg transition-colors"
                  title={language === 'vi' ? 'Trang sau' : language === 'en' ? 'Next page' : '次のページ'}
                  style={{
                    color: '#374151',
                    backgroundColor: hoveredPaginationButton === 'next' && !((listUsesCursor ? !hasMoreFromApi : currentPage === totalPages) || loading) ? '#e5e7eb' : '#f3f4f6',
                    opacity: ((listUsesCursor ? !hasMoreFromApi : currentPage === totalPages) || loading) ? 0.5 : 1,
                    cursor: ((listUsesCursor ? !hasMoreFromApi : currentPage === totalPages) || loading) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                {!listUsesCursor ? (
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages || loading}
                  onMouseEnter={() => setHoveredPaginationButton('last')}
                  onMouseLeave={() => setHoveredPaginationButton(null)}
                  className="hidden sm:flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 text-sm font-medium rounded-lg transition-colors"
                  title={language === 'vi' ? 'Trang cuối' : language === 'en' ? 'Last page' : '最後のページ'}
                  style={{
                    color: '#374151',
                    backgroundColor: hoveredPaginationButton === 'last' && !(currentPage === totalPages || loading) ? '#e5e7eb' : '#f3f4f6',
                    opacity: (currentPage === totalPages || loading) ? 0.5 : 1,
                    cursor: (currentPage === totalPages || loading) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 -ml-1.5 sm:-ml-2" />
                </button>
                ) : null}
              </div>
            </div>
            {canUseBulkPickupActions && selectedCount > 0 && (
              <div className="mt-2 border-t pt-2 flex flex-wrap items-center gap-2" style={{ borderColor: '#f3f4f6' }}>
                <label className="flex items-center gap-1.5 text-[11px] sm:text-xs" style={{ color: '#374151' }}>
                  <input type="checkbox" checked={allCurrentPageSelected} onChange={toggleSelectAllCurrentPage} />
                  <span>{language === 'vi' ? 'Chọn tất cả' : language === 'en' ? 'Select all' : 'すべて選択'}</span>
                </label>
                <button
                  type="button"
                  onClick={clearBulkSelection}
                  className="px-2.5 py-1 border rounded-md text-[11px] sm:text-xs"
                  style={{ borderColor: '#d1d5db', color: '#374151' }}
                >
                  {language === 'vi' ? 'Xóa các lựa chọn' : language === 'en' ? 'Clear selection' : '選択をクリア'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreatePickupModal(true)}
                  className="px-2.5 py-1 border rounded-md text-[11px] sm:text-xs"
                  style={{ borderColor: '#93c5fd', color: '#2563eb' }}
                >
                  {language === 'vi' ? 'Tạo danh sách lựa chọn mới' : language === 'en' ? 'Create new pickup list' : '新規Pick-upリスト作成'}
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div style={{ color: '#6b7280' }}>{language === 'vi' ? 'Đang tải...' : language === 'en' ? 'Loading...' : '読み込み中...'}</div>
          </div>
        ) : jobsToRender.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center px-4">
              <p className="text-base sm:text-lg mb-2" style={{ color: '#6b7280' }}>{language === 'vi' ? 'Không tìm thấy công việc nào' : language === 'en' ? 'No jobs found' : '求人が見つかりません'}</p>
              <p className="text-xs sm:text-sm" style={{ color: '#9ca3af' }}>{language === 'vi' ? 'Vui lòng thử lại với bộ lọc khác' : language === 'en' ? 'Please try different filters' : '別のフィルターをお試しください'}</p>
            </div>
          </div>
        ) : (
        <div className={`space-y-2 sm:space-y-3 ${showAllJobs && enablePagination ? '' : 'pb-20'}`}>
            {jobsToRender.map((job) => (
            <div
              key={job.id}
              onClick={() => {
                if (onJobClick) {
                  onJobClick(job);
                  return;
                }
                if (useAdminAPI) {
                  const currentPath = window.location.pathname;
                  if (currentPath.includes('/admin/group-jobs')) {
                    sessionStorage.setItem('jobDetailReferrer', '/admin/group-jobs');
                  } else {
                    sessionStorage.setItem('jobDetailReferrer', '/admin/jobs');
                  }
                }
                const fromPage = useAdminAPI 
                  ? (window.location.pathname.includes('/admin/group-jobs') ? 'group-jobs' : 'jobs')
                  : 'agent-jobs';
                try {
                  sessionStorage.setItem(
                    listStateStorageKey,
                    JSON.stringify({
                      currentPage,
                      pageCursors,
                      scrollTop: listContainerRef.current?.scrollTop || 0,
                    })
                  );
                } catch {
                  // ignore
                }
                navigate(useAdminAPI ? `/admin/jobs/${job.id}` : `${ctvJobsBase}/${job.id}`, {
                  state: { from: fromPage }
                });
              }}
              onMouseEnter={() => setHoveredJobCardIndex(job.id)}
              onMouseLeave={() => setHoveredJobCardIndex(null)}
              className="relative border rounded-lg p-2 sm:p-3 transition-all duration-200 cursor-pointer min-h-0 sm:min-h-[320px] flex flex-col"
              style={{
                backgroundColor: 'white',
                borderColor: '#e5e7eb',
                boxShadow: hoveredJobCardIndex === job.id ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              {job.isPinned ? (
                <div
                  className="pointer-events-none absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 flex items-center justify-center rounded-md bg-amber-500 p-1 sm:p-1.5 text-white shadow-md ring-1 ring-amber-600/25"
                  title={
                    language === 'vi' ? 'Ghim lên đầu' : language === 'en' ? 'Pinned to top' : '上部に固定'
                  }
                  role="img"
                  aria-label={
                    language === 'vi' ? 'Ghim lên đầu' : language === 'en' ? 'Pinned to top' : '上部に固定'
                  }
                >
                  <Pin className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
                </div>
              ) : null}
              <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 flex-1 min-h-0">
                {/* Main Content - Left Column */}
                <div className="flex-1 flex flex-col min-w-0 space-y-1.5 sm:space-y-2">
                  {/* Header: Code + Tags + Title + Category + Company */}
                  <div className="space-y-1 sm:space-y-1.5 pb-1.5 sm:pb-2 border-b flex-shrink-0" style={{ borderColor: '#f3f4f6' }}>
                    <div className="text-[10px] sm:text-[11px] font-medium" style={{ color: '#6b7280' }}>
                      <span className="inline-flex items-center gap-1.5">
                        {canUseBulkPickupActions && (
                          <input
                            type="checkbox"
                            checked={bulkSelectedJobIds.has(String(job.id))}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleBulkSelectedJob(job.id)}
                          />
                        )}
                        <span>
                          {language === 'vi' ? 'ID công việc' : language === 'en' ? 'Job ID' : '求人ID'}: <span style={{ color: '#374151' }}>{job.jobCode}</span>
                        </span>
                      </span>
                    </div>
                    {job.tags && job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 sm:gap-1">
                        {job.tags.map((tag, index) => (
                          <span key={index} className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium border" style={getTagInlineStyle(tag.color)}>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <h2 className="text-xs sm:text-sm font-bold leading-tight line-clamp-2 pr-1" style={{ color: '#2563eb' }}>{job.title}</h2>
                    {job.category && (
                      <div className="text-[10px] sm:text-[11px] line-clamp-1" style={{ color: '#374151' }}>
                        <span className="font-semibold" style={{ color: '#4b5563' }}>{language === 'vi' ? 'Phân loại' : language === 'en' ? 'Category' : '職種'}:</span>
                        <span className="ml-1 break-words">{job.category}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-1">
                      <Building2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-0.5 flex-shrink-0" style={{ color: '#6b7280' }} />
                      <div className="text-[10px] sm:text-[11px] line-clamp-1" style={{ color: '#374151' }}>
                        <span className="font-semibold" style={{ color: '#4b5563' }}>{t.hiringCompany}:</span>
                        <span className="ml-1">{job.company || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1">
                      <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-0.5 flex-shrink-0" style={{ color: '#6b7280' }} />
                      <div className="text-[10px] sm:text-[11px] min-w-0 leading-snug" style={{ color: '#374151' }}>
                        <span className="font-semibold" style={{ color: '#4b5563' }}>
                          {language === 'vi' ? 'Địa điểm tuyển dụng' : language === 'en' ? 'Recruitment location' : '採用地域'}:
                        </span>
                        <span
                          className={`ml-1 break-words ${job.recruitmentLocationIsSet ? '' : 'italic text-gray-400'}`}
                        >
                          {job.recruitmentLocation}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nội dung + Điều kiện: cùng chiều cao cố định */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 flex-1 min-h-0">
                    <div className="flex flex-col h-[80px] sm:h-[120px] border rounded-md flex-shrink-0 overflow-hidden" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                      <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 border-b flex-shrink-0 text-[9px] sm:text-[10px] font-semibold" style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                        {language === 'vi' ? 'Nội dung công việc' : language === 'en' ? 'Job Content' : '仕事内容'}
                      </div>
                      <div className="flex-1 overflow-y-auto px-1.5 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-[11px] leading-snug whitespace-pre-line custom-scrollbar min-h-0" style={{ color: job.jobContent ? '#374151' : '#9ca3af' }}>
                        {job.jobContent || (language === 'vi' ? 'Chưa có mô tả trên danh sách — xem chi tiết job.' : language === 'en' ? 'No preview text — open job for full detail.' : '一覧に概要がありません。詳細ページでご確認ください。')}
                      </div>
                    </div>
                    {job.applicationConditions && job.applicationConditions.length > 0 ? (
                      <div className="flex flex-col h-[80px] sm:h-[120px] border rounded-md flex-shrink-0 overflow-hidden" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                        <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 border-b flex-shrink-0 text-[9px] sm:text-[10px] font-semibold" style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                          {language === 'vi' ? 'Điều kiện ứng tuyển' : language === 'en' ? 'Conditions' : '応募条件'}
                        </div>
                        <div className="flex-1 overflow-y-auto px-1.5 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-[11px] space-y-0.5 sm:space-y-1 custom-scrollbar min-h-0" style={{ color: '#374151' }}>
                          {job.applicationConditions.map((condition, index) => (
                            <div key={index} className="flex items-start gap-1">
                              <span className="flex-shrink-0 font-bold" style={{ color: '#3b82f6' }}>•</span>
                              <span className="whitespace-pre-line leading-snug line-clamp-2">{condition}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-[80px] sm:h-[120px] rounded-md flex-shrink-0" style={{ backgroundColor: '#f9fafb', border: '1px dashed #e5e7eb' }} />
                    )}
                  </div>
                </div>

                {/* Side Panel - Right: commission (ẩn trên landing) + Quick Info */}
                <div className="w-full lg:w-64 xl:w-72 2xl:w-80 flex-shrink-0 flex flex-col gap-1.5 sm:gap-2">
                  {!hideExpectedReferralFee ? (
                    <>
                      {useAdminAPI && (
                        <AdminJobStatusSelect
                          job={job}
                          language={language}
                          statusUpdating={togglingJobStatusId === job.id}
                          onSelect={handleAdminJobStatusChange}
                          compact={false}
                        />
                      )}
                      {job.commissionTiers && job.commissionTiers.length > 0 ? (
                        <div className="flex-shrink-0 flex flex-col gap-1.5">
                          <div
                            className="flex rounded-md overflow-hidden shadow-sm border"
                            style={{
                              borderColor: '#7c3aed',
                            }}
                          >
                            {/* Left label spanning rows */}
                            <div
                              className="flex-[0_0_35%] min-w-0 px-2 py-2 text-[10px] font-medium flex items-center justify-center text-center leading-snug whitespace-normal"
                              style={{
                                backgroundColor: useAdminAPI ? '#5F5F5F' : '#4b4f5a',
                                color: '#ffffff',
                              }}
                            >
                              <span className="line-clamp-3">
                                {useAdminAPI
                                  ? (language === 'vi' ? 'Phí giới thiệu JobShare nhận từ khách hàng' : language === 'en' ? 'Referral fee (JS receives)' : '紹介料（JS受取）')
                                  : (language === 'vi'
                                    ? 'Phí giới thiệu dự kiến của bạn'
                                    : language === 'en'
                                    ? 'Estimated referral fee for you'
                                    : '想定紹介料（あなた）')}
                              </span>
                            </div>
                            {/* Right: condition + amount */}
                            {job.hideCommissionConditionLabel ? (
                              <div
                                className="flex-1 min-w-0 px-2 sm:px-3 py-2 text-[10px] sm:text-[12px] font-bold flex items-center justify-center text-center leading-snug"
                                style={{
                                  backgroundColor: '#DF2020',
                                  color: '#ffffff',
                                }}
                              >
                                <span className="break-words" title={job.commissionTiers[0]?.amount || job.commission}>
                                  {job.commissionTiers[0]?.amount || job.commission}
                                </span>
                              </div>
                            ) : (
                              <div className="flex-1 min-w-0 flex flex-col">
                                {job.commissionTiers.map((tier, index) => (
                                  <div
                                    key={index}
                                    className="flex min-h-[36px]"
                                    style={{
                                      borderTop: index === 0 ? 'none' : '1px solid #9ca3af',
                                    }}
                                  >
                                    <div
                                      className="w-24 sm:w-28 flex-shrink-0 px-2 py-1.5 text-[10px] sm:text-[11px] font-semibold flex items-center justify-center text-center leading-snug"
                                      style={{
                                        backgroundColor: useAdminAPI
                                          ? (job.isInCampaign ? '#e5f0fb' : '#EB9696')
                                          : '#EB9696',
                                        color: useAdminAPI
                                          ? (job.isInCampaign ? '#0d6bbd' : '#ffffff')
                                          : '#ffffff',
                                      }}
                                    >
                                      <span className="break-words line-clamp-2">{tier.label}</span>
                                    </div>
                                    <div
                                      className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 text-[10px] sm:text-[12px] font-bold flex items-center justify-center text-center leading-snug"
                                      style={{
                                        backgroundColor: '#DF2020',
                                        color: '#ffffff',
                                      }}
                                    >
                                      <span className="break-words" title={tier.amount || job.commission}>
                                        {tier.amount || job.commission}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : job.commission ? (
                        <div className="flex-shrink-0 flex flex-col gap-1.5">
                          <div
                            className="flex items-stretch rounded-md overflow-hidden shadow-sm border"
                            style={{ borderColor: '#7c3aed' }}
                          >
                            <div
                              className="flex-[0_0_45%] min-w-0 px-2 py-1 text-[10px] font-medium flex items-center justify-center text-center leading-snug whitespace-normal"
                              style={{
                                backgroundColor: useAdminAPI ? '#5F5F5F' : '#4b4f5a',
                                color: '#ffffff',
                              }}
                            >
                              <span className="line-clamp-2">
                                {useAdminAPI
                                  ? (language === 'vi' ? 'Phí giới thiệu JobShare nhận từ khách hàng' : language === 'en' ? 'Referral fee (JS receives)' : '紹介料（JS受取）')
                                  : (language === 'vi'
                                    ? 'Phí giới thiệu dự kiến của bạn'
                                    : language === 'en'
                                    ? 'Estimated referral fee for you'
                                    : '想定紹介料（あなた）')}
                              </span>
                            </div>
                            <div
                              className="flex-1 min-w-0 px-2 py-1.5 text-[10px] sm:text-[11px] font-bold flex items-center justify-center text-center break-words"
                              style={{
                                backgroundColor: '#DF2020',
                                color: '#ffffff',
                              }}
                              title={job.commission}
                            >
                              {job.commission}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[52px] rounded-md flex-shrink-0" style={{ backgroundColor: '#f9fafb', border: '1px dashed #e5e7eb' }} />
                      )}
                    </>
                  ) : null}
                  <div className="border rounded-md p-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                    <div className="text-[10px] font-bold pb-1 border-b mb-1.5" style={{ color: '#374151', borderColor: '#e5e7eb' }}>
                      {language === 'vi' ? 'Thông tin nhanh' : language === 'en' ? 'Quick Info' : 'クイック情報'}
                    </div>
                    <div className="space-y-1.5">
                      {job.salary && (
                        <div className="pb-1.5 border-b" style={{ borderColor: '#e5e7eb' }}>
                          <div className="text-[9px] font-semibold uppercase text-gray-500">{language === 'vi' ? 'Mức lương' : language === 'en' ? 'Salary' : '給与'}</div>
                          <div className="text-[11px] font-medium break-words whitespace-pre-line" style={{ color: '#111827' }}>{job.salary}</div>
                        </div>
                      )}
                      <div className="pb-1.5 border-b" style={{ borderColor: '#e5e7eb' }}>
                        <div className="text-[9px] font-semibold uppercase text-gray-500">
                          {language === 'vi' ? 'Địa điểm tuyển dụng' : language === 'en' ? 'Recruitment location' : '採用地域'}
                        </div>
                        <div
                          className={`text-[11px] font-medium leading-snug break-words line-clamp-2 ${
                            job.recruitmentLocationIsSet ? '' : 'italic text-gray-400'
                          }`}
                          style={{ color: job.recruitmentLocationIsSet ? '#111827' : undefined }}
                        >
                          {job.recruitmentLocation}
                        </div>
                      </div>
                      {job.ageRange && (
                        <div className="pb-1.5 border-b" style={{ borderColor: '#e5e7eb' }}>
                          <div className="text-[9px] font-semibold uppercase text-gray-500">{language === 'vi' ? 'Tuổi' : language === 'en' ? 'Age' : '年齢'}</div>
                          <div className="text-[11px] font-medium break-words" style={{ color: '#111827' }}>{job.ageRange}</div>
                        </div>
                      )}
                      {job.nationality && (
                        <div className="pb-1.5 border-b" style={{ borderColor: '#e5e7eb' }}>
                          <div className="text-[9px] font-semibold uppercase text-gray-500">{language === 'vi' ? 'Quốc tịch' : language === 'en' ? 'Nationality' : '国籍'}</div>
                          <div className="text-[11px] font-medium break-words" style={{ color: '#111827' }}>{job.nationality}</div>
                        </div>
                      )}
                      {job.gender && (
                        <div className="pb-1.5 border-b" style={{ borderColor: '#e5e7eb' }}>
                          <div className="text-[9px] font-semibold uppercase text-gray-500">{language === 'vi' ? 'Giới tính' : language === 'en' ? 'Gender' : '性別'}</div>
                          <div className="text-[11px] font-medium break-words" style={{ color: '#111827' }}>{job.gender}</div>
                        </div>
                      )}
                      {job.educationLevel && (
                        <div className="pb-1.5 border-b" style={{ borderColor: '#e5e7eb' }}>
                          <div className="text-[9px] font-semibold uppercase text-gray-500">{language === 'vi' ? 'Học vấn' : language === 'en' ? 'Education' : '学歴'}</div>
                          <div className="text-[11px] font-medium break-words line-clamp-2" style={{ color: '#111827' }}>{job.educationLevel}</div>
                        </div>
                      )}
                      {job.location && (
                        <div className="pb-1.5" style={{ borderColor: '#e5e7eb' }}>
                          <div className="text-[9px] font-semibold uppercase text-gray-500">{language === 'vi' ? 'Nơi làm việc' : language === 'en' ? 'Location' : '勤務地'}</div>
                          <div className="text-[11px] font-medium leading-snug whitespace-pre-line break-words line-clamp-2" style={{ color: '#111827' }}>{job.location}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer: ngày + nút - gọn, cố định */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 mt-2 border-t flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
                <div className="flex items-center gap-2 text-[11px]" style={{ color: '#6b7280' }}>
                  {!job.updatedAt && !job.publishedAt && <span />}
                </div>
                <div className="flex items-center gap-1.5 flex-nowrap overflow-visible max-w-full relative whitespace-nowrap pb-1 sm:pb-0">
                  {useAdminAPI ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleCopyJobUrl(job, e)}
                        onMouseEnter={() => setHoveredCopyJobId(job.id)}
                        onMouseLeave={() => setHoveredCopyJobId(null)}
                        className="flex shrink-0 items-center gap-1 px-2 py-1.5 border rounded-md text-[11px] font-medium whitespace-nowrap transition-colors"
                        style={{
                          borderColor: copiedJobId === job.id ? '#86efac' : '#93c5fd',
                          backgroundColor: copiedJobId === job.id ? '#f0fdf4' : (hoveredCopyJobId === job.id ? '#eff6ff' : 'transparent'),
                          color: copiedJobId === job.id ? '#16a34a' : '#2563eb',
                        }}
                      >
                        {copiedJobId === job.id ? <Check className="w-3 h-3 flex-shrink-0" /> : <Copy className="w-3 h-3 flex-shrink-0" />}
                        <span className="hidden sm:inline">
                          {copiedJobId === job.id
                            ? (language === 'vi' ? 'Đã sao chép!' : language === 'en' ? 'Copied!' : 'コピー済み!')
                            : (language === 'vi' ? 'Sao chép URL' : language === 'en' ? 'Copy URL' : 'URLをコピー')}
                        </span>
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDownloadMenuJobId(openDownloadMenuJobId === job.id ? null : job.id);
                          }}
                          onMouseEnter={() => setHoveredDownloadButtonIndex(job.id)}
                          onMouseLeave={() => setHoveredDownloadButtonIndex(null)}
                          className="flex shrink-0 items-center gap-1 px-2 py-1.5 border rounded-md text-[11px] font-medium whitespace-nowrap transition-colors"
                          style={{ borderColor: '#93c5fd', color: '#2563eb', backgroundColor: hoveredDownloadButtonIndex === job.id ? '#eff6ff' : 'transparent' }}
                        >
                          <Download className="w-3 h-3 flex-shrink-0" />
                          <span className="hidden sm:inline">{language === 'vi' ? 'Tải JD' : language === 'en' ? 'Download JD' : 'JDをダウンロード'}</span>
                          <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${openDownloadMenuJobId === job.id ? 'rotate-180' : ''}`} />
                        </button>
                        {openDownloadMenuJobId === job.id && (
                          <div
                            className="absolute right-0 top-full z-50 mt-1 w-44 max-w-[calc(100vw-1rem)] overflow-hidden rounded-md border bg-white text-[11px] shadow-lg flex flex-col"
                            style={{ borderColor: '#e5e7eb' }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            {jdMenuItemVisible(job, 'jdFile') && (
                              <button
                                type="button"
                                className="block w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors"
                                onClick={() => handleDownloadJD(job, 'jdFile')}
                              >
                                {language === 'vi' ? 'JD tiếng Việt' : language === 'en' ? 'JD Vietnamese' : 'JDベトナム語'}
                              </button>
                            )}
                            {jdMenuItemVisible(job, 'jdFileEn') && (
                              <button
                                type="button"
                                className="block w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors"
                                onClick={() => handleDownloadJD(job, 'jdFileEn')}
                              >
                                {language === 'vi' ? 'JD tiếng Anh' : language === 'en' ? 'JD English' : 'JD英語'}
                              </button>
                            )}
                            {jdMenuItemVisible(job, 'jdFileJp') && (
                              <button
                                type="button"
                                className="block w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors"
                                onClick={() => handleDownloadJD(job, 'jdFileJp')}
                              >
                                {language === 'vi' ? 'JD tiếng Nhật' : language === 'en' ? 'JD Japanese' : 'JD日本語'}
                              </button>
                            )}
                            {jdMenuItemVisible(job, 'jdOriginalFile') && (
                              <button
                                type="button"
                                className="block w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors"
                                onClick={() => handleDownloadJD(job, 'jdOriginalFile')}
                              >
                                {language === 'vi' ? 'JD gốc' : language === 'en' ? 'JD original' : 'JD原本'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/jobs/${job.id}/edit`); }}
                        className="flex shrink-0 items-center gap-1 px-2 py-1.5 border rounded-md text-[11px] font-medium whitespace-nowrap transition-colors"
                        style={{ borderColor: '#d1d5db', color: '#374151' }}
                      >
                        <Edit className="w-3 h-3" /> {language === 'vi' ? 'Sửa' : language === 'en' ? 'Edit' : '編集'}
                      </button>
                      {onRemoveFromJobPickup && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFromJobPickup(job);
                          }}
                          disabled={String(detachingFromPickupJobId || '') === String(job.id)}
                          className="flex items-center gap-1 px-2 py-1.5 border rounded-md text-[11px] font-medium transition-colors disabled:opacity-50"
                          style={{
                            borderColor: '#fcd34d',
                            color: '#92400e',
                            backgroundColor: '#fffbeb',
                          }}
                          title={
                            language === 'vi'
                              ? 'Xóa job khỏi danh sách pick-up này (không xóa job)'
                              : language === 'en'
                                ? 'Remove job from this pick-up list (does not delete the job)'
                                : 'このPick-up一覧から求人を外す（求人は削除されません）'
                          }
                        >
                          <Unlink className="w-3 h-3 flex-shrink-0" />
                          <span className="hidden sm:inline">
                            {language === 'vi'
                              ? 'Gỡ pick-up'
                              : language === 'en'
                                ? 'Remove from pick-up'
                                : 'Pick-upから外す'}
                          </span>
                        </button>
                      )}
                      {hideExpectedReferralFee && (
                        <AdminJobStatusSelect
                          job={job}
                          language={language}
                          statusUpdating={togglingJobStatusId === job.id}
                          onSelect={handleAdminJobStatusChange}
                          compact
                        />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteJob(job); }}
                        className="flex items-center gap-1 px-2 py-1.5 border rounded-md text-[11px] font-medium transition-colors"
                        style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                        disabled={deletingJobId === job.id}
                      >
                        <Trash2 className="w-3 h-3" /> {language === 'vi' ? 'Xóa' : language === 'en' ? 'Delete' : '削除'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenSaveToList(job.id); }}
                        onMouseEnter={() => setHoveredSaveButtonIndex(job.id)}
                        onMouseLeave={() => setHoveredSaveButtonIndex(null)}
                        className="flex items-center gap-1 px-2 py-1.5 border rounded-md text-[11px] font-medium transition-colors"
                        style={{ borderColor: '#93c5fd', color: '#2563eb', backgroundColor: hoveredSaveButtonIndex === job.id ? '#eff6ff' : 'transparent' }}
                      >
                        <Heart className="w-3 h-3" /><span>{language === 'vi' ? 'Lưu trữ' : language === 'en' ? 'Save' : '保存'}</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/jobs/${job.id}/nominate`); }}
                        onMouseEnter={() => setHoveredSuggestButtonIndex(job.id)}
                        onMouseLeave={() => setHoveredSuggestButtonIndex(null)}
                        className="flex shrink-0 items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors"
                        style={{ backgroundColor: hoveredSuggestButtonIndex === job.id ? '#fde047' : '#facc15', color: '#111827' }}
                      >
                        <UserPlus className="w-3 h-3" /><span className="hidden sm:inline">{language === 'vi' ? 'Đề cử ứng viên' : language === 'en' ? 'Nominate' : '推薦'}</span>
                      </button>
                    </>
                  ) : (
                  <>
                  <button
                    type="button"
                    onClick={(e) => handleCopyJobUrl(job, e)}
                    onMouseEnter={() => setHoveredCopyJobId(job.id)}
                    onMouseLeave={() => setHoveredCopyJobId(null)}
                    className="flex items-center gap-1 px-2 py-1.5 border rounded-md text-[11px] font-medium transition-colors"
                    style={{
                      borderColor: copiedJobId === job.id ? '#86efac' : '#93c5fd',
                      backgroundColor: copiedJobId === job.id ? '#f0fdf4' : (hoveredCopyJobId === job.id ? '#eff6ff' : 'transparent'),
                      color: copiedJobId === job.id ? '#16a34a' : '#2563eb',
                    }}
                  >
                    {copiedJobId === job.id ? <Check className="w-3 h-3 flex-shrink-0" /> : <Copy className="w-3 h-3 flex-shrink-0" />}
                    <span className="hidden sm:inline">
                      {copiedJobId === job.id
                        ? (language === 'vi' ? 'Đã sao chép!' : language === 'en' ? 'Copied!' : 'コピー済み!')
                        : (language === 'vi' ? 'Sao chép URL' : language === 'en' ? 'Copy URL' : 'URLをコピー')}
                    </span>
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDownloadMenuJobId(openDownloadMenuJobId === job.id ? null : job.id);
                      }}
                      onMouseEnter={() => setHoveredDownloadButtonIndex(job.id)}
                      onMouseLeave={() => setHoveredDownloadButtonIndex(null)}
                      className="flex items-center gap-1 px-2 py-1.5 border rounded-md text-[11px] font-medium transition-colors"
                      style={{ borderColor: '#93c5fd', color: '#2563eb', backgroundColor: hoveredDownloadButtonIndex === job.id ? '#eff6ff' : 'transparent' }}
                    >
                      <Download className="w-3 h-3 flex-shrink-0" />
                      <span className="hidden sm:inline">{language === 'vi' ? 'Tải JD' : language === 'en' ? 'Download JD' : 'JDをダウンロード'}</span>
                      <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${openDownloadMenuJobId === job.id ? 'rotate-180' : ''}`} />
                    </button>
                    {openDownloadMenuJobId === job.id && (
                      <div
                        className="absolute right-0 bottom-full z-50 mb-1 w-44 max-w-[calc(100vw-1rem)] bg-white border rounded-lg shadow-lg text-[10px] sm:text-xs py-1"
                        style={{ borderColor: '#e5e7eb' }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {jdMenuItemVisible(job, 'jdFile') && (
                          <button
                            type="button"
                            className="block w-full text-left px-2 sm:px-3 py-1.5 hover:bg-gray-50 transition-colors"
                            onClick={() => handleDownloadJD(job, 'jdFile')}
                          >
                            {language === 'vi' ? 'JD tiếng Việt' : language === 'en' ? 'JD Vietnamese' : 'JDベトナム語'}
                          </button>
                        )}
                        {jdMenuItemVisible(job, 'jdFileEn') && (
                          <button
                            type="button"
                            className="block w-full text-left px-2 sm:px-3 py-1.5 hover:bg-gray-50 transition-colors"
                            onClick={() => handleDownloadJD(job, 'jdFileEn')}
                          >
                            {language === 'vi' ? 'JD tiếng Anh' : language === 'en' ? 'JD English' : 'JD英語'}
                          </button>
                        )}
                        {jdMenuItemVisible(job, 'jdFileJp') && (
                          <button
                            type="button"
                            className="block w-full text-left px-2 sm:px-3 py-1.5 hover:bg-gray-50 transition-colors"
                            onClick={() => handleDownloadJD(job, 'jdFileJp')}
                          >
                            {language === 'vi' ? 'JD tiếng Nhật' : language === 'en' ? 'JD Japanese' : 'JD日本語'}
                          </button>
                        )}
                        {jdMenuItemVisible(job, 'jdOriginalFile') && (
                          <button
                            type="button"
                            className="block w-full text-left px-2 sm:px-3 py-1.5 hover:bg-gray-50 transition-colors"
                            onClick={() => handleDownloadJD(job, 'jdOriginalFile')}
                          >
                            {language === 'vi' ? 'JD gốc' : language === 'en' ? 'JD original' : 'JD原本'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {!useAdminAPI && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenSaveToList(job.id); }}
                    onMouseEnter={() => setHoveredSaveButtonIndex(job.id)}
                    onMouseLeave={() => setHoveredSaveButtonIndex(null)}
                    className="flex items-center gap-1 px-2 py-1.5 border rounded-md text-[11px] font-medium transition-colors"
                    style={{ borderColor: '#93c5fd', color: '#2563eb', backgroundColor: hoveredSaveButtonIndex === job.id ? '#eff6ff' : 'transparent' }}
                  >
                    <Heart className="w-3 h-3" /><span>{language === 'vi' ? 'Lưu' : language === 'en' ? 'Save' : '保存'}</span>
                  </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/agent/jobs/${job.id}/nominate`); }}
                    onMouseEnter={() => setHoveredSuggestButtonIndex(job.id)}
                    onMouseLeave={() => setHoveredSuggestButtonIndex(null)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                    style={{ backgroundColor: hoveredSuggestButtonIndex === job.id ? '#fde047' : '#facc15', color: '#111827' }}
                  >
                    <UserPlus className="w-3 h-3" /><span className="hidden sm:inline">{language === 'vi' ? 'Tiến cử ứng viên' : language === 'en' ? 'Nominate' : '推薦'}</span>
                  </button>
                  </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
        
        {/* Footer - Show viewMore button if not pagination and not hidden (e.g. in slide-in panel) */}
        {!hideViewMoreButton && (!showAllJobs || !enablePagination) ? (
          <div className="sticky bottom-4 text-center z-10 mt-4">
            <button 
              onClick={() => navigate(useAdminAPI ? '/admin/jobs' : ctvJobsBase)}
              onMouseEnter={() => setHoveredViewMoreButton(true)}
              onMouseLeave={() => setHoveredViewMoreButton(false)}
              className="px-8 py-4 rounded-lg transition-colors font-semibold text-lg shadow-2xl"
              style={{
                backgroundColor: hoveredViewMoreButton ? '#2563eb' : '#2563eb',
                color: 'white',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            >
              {t.viewMore}
            </button>
          </div>
        ) : null}
      </div>
    </div>

    {/* Modal chọn danh sách để lưu job (chỉ CTV) */}
    {showSaveToListModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }} onClick={() => !creatingListInSaveModal && setShowSaveToListModal(false)}>
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'vi' ? 'Lưu công việc vào danh sách' : language === 'en' ? 'Save job to list' : 'リストに求人を保存'}
            </h3>
            <button type="button" onClick={() => !creatingListInSaveModal && setShowSaveToListModal(false)} className="p-1 rounded hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          {saveToListMessage && (
            <p className={`text-sm mb-3 ${saveToListMessage.includes('thất bại') || saveToListMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {saveToListMessage}
            </p>
          )}
          {!showCreateListInSaveModal ? (
            <>
              {loadingSaveToListLists ? (
                <div className="text-center py-8 text-gray-500">{language === 'vi' ? 'Đang tải...' : language === 'en' ? 'Loading...' : '読み込み中...'}</div>
              ) : saveToListLists.length === 0 ? (
                <div className="py-4 space-y-3">
                  <p className="text-sm text-gray-600">{language === 'vi' ? 'Chưa có danh sách nào. Tạo danh sách mới để lưu công việc.' : language === 'en' ? 'No lists yet. Create one to save this job.' : 'リストがありません。新しいリストを作成して求人を保存しましょう。'}</p>
                  <button
                    type="button"
                    onClick={() => setShowCreateListInSaveModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 font-medium text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {language === 'vi' ? 'Tạo danh sách mới' : language === 'en' ? 'Create new list' : '新しいリストを作成'}
                  </button>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 min-h-0 space-y-2">
                  {saveToListLists.map((list) => (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => handleAddJobToList(list.id)}
                      className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors font-medium text-gray-900"
                    >
                      {list.name}
                    </button>
                  ))}
                </div>
              )}
              {saveToListLists.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateListInSaveModal(true)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {language === 'vi' ? 'Tạo danh sách mới' : language === 'en' ? 'Create new list' : '新しいリストを作成'}
                </button>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">{language === 'vi' ? 'Tên danh sách mới' : language === 'en' ? 'New list name' : '新しいリスト名'}</p>
              <input
                type="text"
                value={newListNameInSaveModal}
                onChange={(e) => setNewListNameInSaveModal(e.target.value)}
                placeholder={language === 'vi' ? 'VD: Việc làm IT yêu thích' : language === 'en' ? 'e.g. Favourite IT jobs' : '例: お気に入りのIT求人'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={creatingListInSaveModal}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => !creatingListInSaveModal && setShowCreateListInSaveModal(false)}
                  disabled={creatingListInSaveModal}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {language === 'vi' ? 'Hủy' : language === 'en' ? 'Cancel' : 'キャンセル'}
                </button>
                <button
                  type="button"
                  disabled={!newListNameInSaveModal.trim() || creatingListInSaveModal}
                  onClick={handleCreateListAndAddJob}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {creatingListInSaveModal ? (language === 'vi' ? 'Đang tạo...' : language === 'en' ? 'Creating...' : '作成中...') : (language === 'vi' ? 'Tạo và lưu' : language === 'en' ? 'Create & save' : '作成して保存')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    {showCreatePickupModal && (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
        onClick={() => !creatingPickup && setShowCreatePickupModal(false)}
      >
        <div
          className="bg-white rounded-xl shadow-xl p-4 sm:p-5 max-w-md w-full border"
          style={{ borderColor: '#e5e7eb' }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-base font-semibold text-gray-900">
            {language === 'vi' ? 'Tạo danh sách lựa chọn' : language === 'en' ? 'Create pickup list' : 'Pick-upリスト作成'}
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            {language === 'vi'
              ? `Sẽ thêm ${selectedCount} job đã chọn vào danh sách mới.`
              : language === 'en'
                ? `Will add ${selectedCount} selected job(s) into the new list.`
                : `選択した ${selectedCount} 件を新しいリストに追加します。`}
          </p>
          <input
            type="text"
            value={newPickupName}
            onChange={(e) => setNewPickupName(e.target.value)}
            placeholder={language === 'vi' ? 'Nhập tên JobPickup' : language === 'en' ? 'Enter JobPickup name' : 'JobPickup名を入力'}
            className="mt-3 w-full px-3 py-2 border rounded-lg text-sm"
            style={{ borderColor: '#d1d5db' }}
            disabled={creatingPickup}
            autoFocus
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreatePickupModal(false)}
              className="px-3 py-1.5 border rounded-md text-xs"
              style={{ borderColor: '#d1d5db', color: '#374151' }}
              disabled={creatingPickup}
            >
              {language === 'vi' ? 'Hủy' : language === 'en' ? 'Cancel' : 'キャンセル'}
            </button>
            <button
              type="button"
              onClick={handleCreatePickupFromSelection}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white"
              style={{ backgroundColor: '#2563eb' }}
              disabled={creatingPickup}
            >
              {creatingPickup
                ? (language === 'vi' ? 'Đang tạo...' : language === 'en' ? 'Creating...' : '作成中...')
                : (language === 'vi' ? 'Tạo' : language === 'en' ? 'Create' : '作成')}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AgentJobsPageSession2;

