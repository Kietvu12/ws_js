import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  X,
  Plus,
} from 'lucide-react';

const TAB_PENDING = 'pending';
const TAB_APPROVED = 'approved';
const TAB_REJECTED = 'rejected';

const CollaboratorApprovalPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [activeTab, setActiveTab] = useState(TAB_PENDING);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  useEffect(() => {
    // Header search sync via query string `?search=...`
    setSearchQuery(headerSearch);
    setCurrentPage(1);
  }, [headerSearch]);

  const getStatusParam = () => {
    if (activeTab === TAB_PENDING) return 0;
    if (activeTab === TAB_APPROVED) return 1;
    return null; // rejected: backend chưa hỗ trợ filter, hiển thị empty
  };

  const loadCollaborators = async () => {
    const statusParam = getStatusParam();
    if (activeTab === TAB_REJECTED) {
      setCollaborators([]);
      setPagination({ total: 0, page: 1, limit: itemsPerPage, totalPages: 0 });
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        status: statusParam,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await apiService.getCollaborators(params);
      if (response.success && response.data) {
        setCollaborators(response.data.collaborators || []);
        setPagination(
          response.data.pagination || {
            total: 0,
            page: 1,
            limit: itemsPerPage,
            totalPages: 0,
          }
        );
      }
    } catch (error) {
      console.error('Error loading collaborators:', error);
      setCollaborators([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollaborators();
  }, [activeTab, currentPage, itemsPerPage, searchQuery]);

  const totalItems = pagination.total || 0;
  const totalPages = pagination.totalPages || 0;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(collaborators.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleApproveBulk = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      alert(t.collaboratorApprovalNoSelection);
      return;
    }
    if (!window.confirm(t.collaboratorApprovalConfirmBulk.replace('{count}', ids.length))) return;
    try {
      setApproving(true);
      const response = await apiService.approveCollaboratorsBulk(ids);
      if (response.success) {
        alert(response.message || t.collaboratorApprovalSuccess);
        setSelectedIds(new Set());
        loadCollaborators();
      } else {
        alert(response.message || t.collaboratorApprovalFailure);
      }
    } catch (error) {
      alert(error.message || t.collaboratorApprovalErrorGeneric);
    } finally {
      setApproving(false);
    }
  };

  const handleApproveOne = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm(t.collaboratorApprovalConfirmOne)) return;
    try {
      setApproving(true);
      const response = await apiService.approveCollaborator(id);
      if (response.success) {
        alert(t.collaboratorApprovalSuccess);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        loadCollaborators();
      } else {
        alert(response.message || t.collaboratorApprovalFailure);
      }
    } catch (error) {
      alert(error.message || t.collaboratorApprovalErrorGeneric);
    } finally {
      setApproving(false);
    }
  };

  const handleRejectOne = async (id, e) => {
    e?.stopPropagation();
    const reason = window.prompt(t.rejectReasonLabel || 'Lý do từ chối (tùy chọn):');
    if (reason === null) return; // user cancelled
    try {
      setRejecting(true);
      const response = await apiService.rejectCollaborator(id, reason || undefined);
      if (response.success) {
        alert(response.message || 'Từ chối thành công.');
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        loadCollaborators();
      } else {
        alert(response.message || 'Từ chối thất bại.');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra.');
    } finally {
      setRejecting(false);
    }
  };

  const allSelected = collaborators.length > 0 && selectedIds.size === collaborators.length;
  const showBulkActions = activeTab === TAB_PENDING;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex-shrink-0 flex gap-1 border-b mb-3" style={{ borderColor: '#e5e7eb' }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab(TAB_PENDING);
            setCurrentPage(1);
            setSelectedIds(new Set());
          }}
          className="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors"
          style={{
            backgroundColor: activeTab === TAB_PENDING ? 'white' : 'transparent',
            color: activeTab === TAB_PENDING ? '#111827' : '#6b7280',
            borderBottom: activeTab === TAB_PENDING ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          {t.tabApprovalPending}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab(TAB_APPROVED);
            setCurrentPage(1);
            setSelectedIds(new Set());
          }}
          className="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors"
          style={{
            backgroundColor: activeTab === TAB_APPROVED ? 'white' : 'transparent',
            color: activeTab === TAB_APPROVED ? '#111827' : '#6b7280',
            borderBottom: activeTab === TAB_APPROVED ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          {t.tabApprovalApproved}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab(TAB_REJECTED);
            setCurrentPage(1);
            setSelectedIds(new Set());
          }}
          className="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors"
          style={{
            backgroundColor: activeTab === TAB_REJECTED ? 'white' : 'transparent',
            color: activeTab === TAB_REJECTED ? '#111827' : '#6b7280',
            borderBottom: activeTab === TAB_REJECTED ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          {t.tabApprovalRejected}
        </button>
      </div>

      {/* Search + bulk actions (chỉ tab Chưa phê duyệt) */}
      <div className="w-full py-1.5 mb-1.5 flex-shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap justify-between">
          <div
            className="flex items-center px-3 py-1.5 rounded-full bg-white text-[12px] sm:text-[13px] min-w-[220px] flex-1"
            style={{ border: '1px solid #e5e7eb' }}
          >
            <Search className="w-3.5 h-3.5 mr-2 flex-shrink-0" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder={t.collaboratorApprovalSearchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-transparent outline-none text-[12px] sm:text-[13px]"
              style={{ border: 'none' }}
            />
          </div>
          {showBulkActions && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border"
                style={{ borderColor: '#d1d5db', color: '#374151', backgroundColor: 'white' }}
              >
                {t.collaboratorApprovalClearSelection}
              </button>
              <button
                type="button"
                onClick={handleApproveBulk}
                disabled={approving || selectedIds.size === 0}
                className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: selectedIds.size > 0 ? '#7c3aed' : '#9ca3af' }}
              >
                <Plus className="w-3.5 h-3.5" />
                {t.collaboratorApprovalApproveSelected} ({selectedIds.size})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pagination - ẩn khi tab Rejected (empty) */}
      {activeTab !== TAB_REJECTED && (
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-full border text-xs font-semibold disabled:opacity-50"
              style={{ borderColor: '#d1d5db', color: '#374151' }}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-full border text-xs font-semibold disabled:opacity-50"
              style={{ borderColor: '#d1d5db', color: '#374151' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs" style={{ color: '#374151' }}>
              {t.pageOf} {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-full border text-xs font-semibold disabled:opacity-50"
              style={{ borderColor: '#d1d5db', color: '#374151' }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-full border text-xs font-semibold disabled:opacity-50"
              style={{ borderColor: '#d1d5db', color: '#374151' }}
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
              className="px-2 py-1 border rounded-full text-xs"
              style={{ borderColor: '#d1d5db', outline: 'none' }}
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="text-xs" style={{ color: '#374151' }}>
              {totalItems} {activeTab === TAB_PENDING ? t.collaboratorApprovalPendingCountLabel : ''}
            </span>
          </div>
        </div>
      )}

      {/* Danh sách card */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
        {activeTab === TAB_REJECTED ? (
          <div
            className="rounded-xl border py-12 text-center text-sm"
            style={{ backgroundColor: 'white', borderColor: '#e5e7eb', color: '#6b7280' }}
          >
            {t.noRejectedCollaborators}
          </div>
        ) : loading ? (
          <div
            className="rounded-xl border py-12 text-center text-sm"
            style={{ backgroundColor: 'white', borderColor: '#e5e7eb', color: '#6b7280' }}
          >
            {t.loadingData}
          </div>
        ) : collaborators.length === 0 ? (
          <div
            className="rounded-xl border py-12 text-center text-sm"
            style={{ backgroundColor: 'white', borderColor: '#e5e7eb', color: '#6b7280' }}
          >
            {activeTab === TAB_PENDING
              ? t.noCollaboratorsPendingApproval
              : t.noApprovedCollaborators}
          </div>
        ) : (
          collaborators.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/admin/collaborators/${c.id}`)}
              className="rounded-xl border grid grid-cols-[2rem_minmax(160px,200px)_minmax(200px,1fr)_minmax(140px,auto)_auto] gap-4 px-4 py-3 items-center cursor-pointer transition-colors hover:bg-gray-50/80"
              style={{
                backgroundColor: 'white',
                borderColor: '#e5e7eb',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
              }}
            >
              {/* Cột 1: checkbox (giữ chỗ đều nhau, pending mới có checkbox) */}
              <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {activeTab === TAB_PENDING ? (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => handleSelectRow(c.id)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#2563eb' }}
                  />
                ) : (
                  <span className="w-4 h-4 block" />
                )}
              </div>

              {/* Cột 2: Tên (trên), Mã (dưới) */}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: '#111827' }}>
                  {c.name || '-'}
                </div>
                <div className="text-xs truncate" style={{ color: '#9ca3af' }}>
                  {c.code || '-'}
                </div>
              </div>

              {/* Cột 3: Liên lạc — email (trên), SĐT (dưới) */}
              <div className="min-w-0">
                <div className="text-xs font-medium" style={{ color: '#6b7280' }}>
                  {t.contactLabel}
                </div>
                <div className="text-sm truncate" style={{ color: '#374151' }}>
                  {c.email || '-'}
                </div>
                <div className="text-sm truncate" style={{ color: '#374151' }}>
                  {c.phone || '-'}
                </div>
              </div>

              {/* Cột 4: Ngày phê duyệt / Ngày từ chối */}
              <div className="min-w-0">
                <div className="text-xs font-medium" style={{ color: '#6b7280' }}>
                  {activeTab === TAB_APPROVED
                    ? t.approvalDateLabel
                    : activeTab === TAB_REJECTED
                      ? t.rejectionDateLabel
                      : t.approvalDateLabel}
                </div>
                <div className="text-sm" style={{ color: '#374151' }}>
                  {activeTab === TAB_APPROVED && c.approvedAt
                    ? formatDate(c.approvedAt)
                    : c.rejectedAt
                      ? formatDate(c.rejectedAt)
                      : '-'}
                </div>
              </div>

              {/* Cột 5: Chi tiết + nút thao tác */}
              <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/collaborators/${c.id}`);
                  }}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border"
                  style={{ borderColor: '#d1d5db', color: '#374151', backgroundColor: 'white' }}
                >
                  {t.detailLabel || t.viewDetails}
                </button>
                {activeTab === TAB_PENDING && (
                  <button
                    type="button"
                    onClick={(e) => handleApproveOne(c.id, e)}
                    disabled={approving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: '#7c3aed' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t.approveButton || t.approve}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/collaborators/${c.id}/edit`);
                  }}
                  className="p-2 rounded-full border"
                  style={{ borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: 'white' }}
                  title={t.edit}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {activeTab === TAB_PENDING && (
                  <button
                    type="button"
                    onClick={(e) => handleRejectOne(c.id, e)}
                    disabled={rejecting}
                    className="p-2 rounded-full border disabled:opacity-50"
                    style={{ borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: 'white' }}
                    title={t.rejectButton || t.rejectTooltip}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CollaboratorApprovalPage;
