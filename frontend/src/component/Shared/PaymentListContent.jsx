import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import {
  Search,
  ExternalLink,
  Eye,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  Clock,
  AlertCircle,
  Briefcase,
  Building2,
  Download,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  MoreVertical,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';

const pickByLanguage = (viText, enText, jpText, lang) => {
  if (lang === 'en') return enText || viText || '';
  if (lang === 'ja') return jpText || enText || viText || '';
  return viText || enText || jpText || '';
};

const getPaymentStatusLabel = (statusKey, t) => {
  const map = {
    pending: t.paymentStatusPending,
    approved: t.paymentStatusApproved,
    rejected: t.paymentStatusRejected,
    paid: t.paymentStatusPaid,
  };
  return map[statusKey] || t.paymentStatusPending;
};

const PaymentListContent = ({ variant }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const isAdmin = variant === 'admin';
  const basePath = isAdmin ? '/admin' : '/agent';
  const listPath = isAdmin ? 'payments' : 'payment-history';
  const listUrl = `${basePath}/${listPath}`;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });

  const [hoveredResetButton, setHoveredResetButton] = useState(false);
  const [hoveredExportButton, setHoveredExportButton] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [hoveredPaginationNavButton, setHoveredPaginationNavButton] = useState(null);
  const [hoveredPaginationButtonIndex, setHoveredPaginationButtonIndex] = useState(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredIdLinkIndex, setHoveredIdLinkIndex] = useState(null);
  const [hoveredRequestIdLinkIndex, setHoveredRequestIdLinkIndex] = useState(null);
  const [hoveredCollaboratorLinkIndex, setHoveredCollaboratorLinkIndex] = useState(null);
  const [hoveredCandidateLinkIndex, setHoveredCandidateLinkIndex] = useState(null);
  const [hoveredJobLinkIndex, setHoveredJobLinkIndex] = useState(null);
  const [hoveredViewButtonIndex, setHoveredViewButtonIndex] = useState(null);
  const [hoveredApproveButtonIndex, setHoveredApproveButtonIndex] = useState(null);
  const [hoveredRejectButtonIndex, setHoveredRejectButtonIndex] = useState(null);
  const [hoveredMarkAsPaidButtonIndex, setHoveredMarkAsPaidButtonIndex] = useState(null);
  const [hoveredMoreButtonIndex, setHoveredMoreButtonIndex] = useState(null);

  const [modalAction, setModalAction] = useState(null);
  const [modalPayment, setModalPayment] = useState(null);
  const [modalAmount, setModalAmount] = useState('');
  const [modalNote, setModalNote] = useState('');
  const [modalRejectedReason, setModalRejectedReason] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const openModal = (action, payment) => {
    setModalAction(action);
    setModalPayment(payment);
    setModalAmount(String(payment?.amount ?? ''));
    setModalNote('');
    setModalRejectedReason('');
  };

  const closeModal = () => {
    setModalAction(null);
    setModalPayment(null);
    setModalAmount('');
    setModalNote('');
    setModalRejectedReason('');
  };

  const mapStatus = (status) => {
    const statusMap = { 0: 'pending', 1: 'approved', 2: 'rejected', 3: 'paid' };
    return statusMap[status] ?? 'pending';
  };

  const loadPaymentRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) {
        const statusMap = { pending: 0, approved: 1, rejected: 2, paid: 3 };
        params.status = statusMap[statusFilter] !== undefined ? statusMap[statusFilter] : '';
      }
      if (dateFrom) {
        if (isAdmin) params.approvedFrom = dateFrom;
        else params.startDate = dateFrom;
      }
      if (dateTo) {
        if (isAdmin) params.approvedTo = dateTo;
        else params.endDate = dateTo;
      }

      const response = isAdmin
        ? await apiService.getAdminPaymentRequests(params)
        : await apiService.getPaymentRequests(params);

      if (response.success && response.data) {
        const rawList = response.data.paymentRequests || [];
        const job = (p) => p.jobApplication?.job;
        const rc = (p) => job(p)?.recruitingCompany || job(p)?.company;
        const mappedPayments = rawList.map((payment) => {
          const statusKey = mapStatus(payment.status);
          const j = job(payment);
          const r = rc(payment);
          const jobTitle = pickByLanguage(j?.title, j?.titleEn || j?.title_en, j?.titleJp || j?.title_jp, language);
          const companyName = pickByLanguage(
            r?.companyName || r?.name,
            r?.companyNameEn || r?.company_name_en,
            r?.companyNameJp || r?.company_name_jp,
            language
          );
          const base = {
            id: payment.id,
            requestId: payment.id.toString(),
            candidateName: payment.jobApplication?.cv?.name || payment.jobApplication?.cv?.fullName || payment.jobApplication?.name || '—',
            candidateId: payment.jobApplication?.cv?.code || payment.jobApplication?.cvCode || '—',
            jobTitle: jobTitle || '—',
            jobId: payment.jobApplication?.jobId,
            companyName: companyName || '—',
            applicationId: payment.jobApplicationId,
            amount: parseFloat(payment.amount) || 0,
            status: statusKey,
            requestDate: payment.createdAt || payment.created_at,
            approvedDate: payment.approvedAt || payment.approved_at || '—',
            paidDate: payment.status === 3 ? (payment.updatedAt || payment.updated_at || '—') : '—',
            paymentMethod: payment.paymentMethod || payment.payment_method || '—',
            cvId: payment.jobApplication?.cvId || payment.jobApplication?.cv?.id,
            jobSlug: payment.jobApplication?.job?.slug,
          };
          if (isAdmin) {
            base.collaboratorName = payment.collaborator?.name || '—';
            base.collaboratorId = payment.collaboratorId;
          }
          return base;
        });
        setPaymentRequests(mappedPayments);
        setPagination(response.data.pagination || { total: 0, page: currentPage, limit: itemsPerPage, totalPages: 0 });
      } else {
        setPaymentRequests([]);
        setError(response?.message || (isAdmin ? null : t.errorLoadPaymentHistory));
      }
    } catch (err) {
      console.error('Error loading payment requests:', err);
      setPaymentRequests([]);
      setError(isAdmin ? null : (err.message || t.errorLoadPaymentHistoryGeneric));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentRequests();
  }, [currentPage, itemsPerPage, statusFilter, dateFrom, dateTo, searchQuery, language, isAdmin]);

  const totalItems = pagination.total || 0;
  const totalPages = pagination.totalPages || 0;
  const totalPaid = paymentRequests.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = paymentRequests.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalApproved = paymentRequests.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0);
  const totalRejected = paymentRequests.filter(p => p.status === 'rejected').reduce((sum, p) => sum + p.amount, 0);
  const totalPendingCount = paymentRequests.filter(p => p.status === 'pending').length;
  const totalApprovedCount = paymentRequests.filter(p => p.status === 'approved').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { backgroundColor: '#fef9c3', color: '#854d0e' };
      case 'approved': return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'paid': return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'rejected': return { backgroundColor: '#fee2e2', color: '#991b1b' };
      default: return { backgroundColor: '#f3f4f6', color: '#1f2937' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-3.5 h-3.5" />;
      case 'approved': return <AlertCircle className="w-3.5 h-3.5" />;
      case 'paid': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'rejected': return <XCircle className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedRows(new Set(paymentRequests.map((_, i) => i)));
    else setSelectedRows(new Set());
  };

  const handleSelectRow = (index) => {
    const next = new Set(selectedRows);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedRows(next);
  };

  const handleReset = () => {
    setSearchQuery('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
    setIsStatusFilterOpen(false);
    setIsDateFilterOpen(false);
  };

  const handleSubmitModal = async () => {
    if (!modalPayment || !modalAction) return;
    if (modalAction === 'reject' && !modalRejectedReason?.trim()) {
      alert(t.pleaseEnterRejectReason);
      return;
    }
    if ((modalAction === 'approve' || modalAction === 'markPaid') && (modalAmount === '' || modalAmount === null || Number.isNaN(parseFloat(modalAmount)) || parseFloat(modalAmount) < 0)) {
      alert(t.chatErrorPaymentAmountRequired || t.amountToPayLabel);
      return;
    }
    const id = modalPayment.id;
    try {
      setModalLoading(true);
      let response;
      if (modalAction === 'approve') response = await apiService.approvePaymentRequest(id, modalNote, modalAmount ? parseFloat(modalAmount) : undefined);
      else if (modalAction === 'reject') response = await apiService.rejectPaymentRequest(id, modalRejectedReason.trim(), modalNote);
      else if (modalAction === 'markPaid') response = await apiService.markPaymentRequestAsPaid(id, modalNote, modalAmount ? parseFloat(modalAmount) : undefined);
      if (response?.success) {
        alert(modalAction === 'approve' ? t.approvePaymentSuccess : modalAction === 'reject' ? t.rejectPaymentSuccess : t.markPaidSuccess);
        closeModal();
        loadPaymentRequests();
      } else {
        alert(response?.message || t.errorOccurred);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || t.errorOccurred);
    } finally {
      setModalLoading(false);
    }
  };

  const dateLocale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';
  const handleApprove = (p) => openModal('approve', p);
  const handleReject = (p) => openModal('reject', p);
  const handleMarkAsPaid = (p) => openModal('markPaid', p);
  const filteredPayments = paymentRequests;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {isAdmin && (
        <div className="mb-1.5 grid grid-cols-2 gap-1 sm:mb-2 sm:grid-cols-2 sm:gap-1 md:gap-1.5 lg:grid-cols-4 lg:gap-2">
          <div className="bg-white rounded sm:rounded-md p-1.5 sm:p-2 md:p-2.5 lg:p-3 flex items-start gap-1 sm:gap-1.5 md:gap-2 min-h-[40px] sm:min-h-[44px] md:min-h-[50px] lg:min-h-[58px]" style={{ boxShadow: 'none', border: 'none' }}>
            <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#dcfce7' }}>
              <CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5" style={{ color: '#16a34a' }} />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] truncate leading-tight" style={{ color: '#94a3b8' }}>{t.totalPaid}</p>
              <p className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm font-bold mt-0.5 truncate leading-tight" style={{ color: '#16a34a' }}>{totalPaid.toLocaleString(dateLocale)}đ</p>
              <p className="text-[8px] sm:text-[9px] mt-0.5 truncate" style={{ color: '#94a3b8' }}>{paymentRequests.filter(p => p.status === 'paid').length} {t.paymentRequestsCount}</p>
            </div>
          </div>
          <div className="bg-white rounded sm:rounded-md p-1.5 sm:p-2 md:p-2.5 lg:p-3 flex items-start gap-1 sm:gap-1.5 md:gap-2 min-h-[40px] sm:min-h-[44px] md:min-h-[50px] lg:min-h-[58px]" style={{ boxShadow: 'none', border: 'none' }}>
            <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#fef9c3' }}>
              <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5" style={{ color: '#ca8a04' }} />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] truncate leading-tight" style={{ color: '#94a3b8' }}>{t.paymentStatPending}</p>
              <p className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm font-bold mt-0.5 truncate leading-tight" style={{ color: '#ca8a04' }}>{totalPending.toLocaleString(dateLocale)}đ</p>
              <p className="text-[8px] sm:text-[9px] mt-0.5 truncate" style={{ color: '#94a3b8' }}>{totalPendingCount} {t.paymentRequestsCount}</p>
            </div>
          </div>
          <div className="bg-white rounded sm:rounded-md p-1.5 sm:p-2 md:p-2.5 lg:p-3 flex items-start gap-1 sm:gap-1.5 md:gap-2 min-h-[40px] sm:min-h-[44px] md:min-h-[50px] lg:min-h-[58px]" style={{ boxShadow: 'none', border: 'none' }}>
            <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#dbeafe' }}>
              <AlertCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5" style={{ color: '#2563eb' }} />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] truncate leading-tight" style={{ color: '#94a3b8' }}>{t.paymentStatApprovedAwaiting}</p>
              <p className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm font-bold mt-0.5 truncate leading-tight" style={{ color: '#2563eb' }}>{totalApproved.toLocaleString(dateLocale)}đ</p>
              <p className="text-[8px] sm:text-[9px] mt-0.5 truncate" style={{ color: '#94a3b8' }}>{totalApprovedCount} {t.paymentRequestsCount}</p>
            </div>
          </div>
          <div className="bg-white rounded sm:rounded-md p-1.5 sm:p-2 md:p-2.5 lg:p-3 flex items-start gap-1 sm:gap-1.5 md:gap-2 min-h-[40px] sm:min-h-[44px] md:min-h-[50px] lg:min-h-[58px]" style={{ boxShadow: 'none', border: 'none' }}>
            <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#fee2e2' }}>
              <XCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5" style={{ color: '#dc2626' }} />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] truncate leading-tight" style={{ color: '#94a3b8' }}>{t.paymentStatRejected}</p>
              <p className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm font-bold mt-0.5 truncate leading-tight" style={{ color: '#dc2626' }}>{totalRejected.toLocaleString(dateLocale)}đ</p>
              <p className="text-[8px] sm:text-[9px] mt-0.5 truncate" style={{ color: '#94a3b8' }}>{paymentRequests.filter(p => p.status === 'rejected').length} {t.paymentRequestsCount}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-3 flex-shrink-0 rounded-lg border p-2 sm:p-3" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-full border bg-white px-3 py-1.5 text-[11px] sm:min-w-[220px] sm:text-[13px]" style={{ borderColor: '#e5e7eb' }}>
            <Search className="w-3.5 h-3.5 mr-2 flex-shrink-0" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder={t.paymentsPageSearchPlaceholder || t.search}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-transparent text-[11px] outline-none sm:text-[13px]"
              style={{ border: 'none' }}
            />
          </div>
          <button onClick={handleReset} onMouseEnter={() => setHoveredResetButton(true)} onMouseLeave={() => setHoveredResetButton(false)}
            className="inline-flex h-8 flex-shrink-0 items-center justify-center rounded-full px-3 text-[10px] font-semibold sm:hidden"
            style={{ backgroundColor: hoveredResetButton ? '#e5e7eb' : '#f3f4f6', color: '#374151' }}>
            {t.resetButton || t.reset}
          </button>
          <div className="flex w-full items-center justify-start gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:flex-wrap sm:justify-end sm:gap-2.5 sm:overflow-visible sm:pb-0">
            <button onClick={handleReset} onMouseEnter={() => setHoveredResetButton(true)} onMouseLeave={() => setHoveredResetButton(false)}
              className="hidden rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors sm:inline-flex sm:text-xs"
              style={{ backgroundColor: hoveredResetButton ? '#e5e7eb' : '#f3f4f6', color: '#374151' }}>
              {t.resetButton || t.reset}
            </button>
            {/* Trạng thái: pill bấm mở dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsStatusFilterOpen(!isStatusFilterOpen);
                  setIsDateFilterOpen(false);
                }}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold sm:text-xs"
                style={{ color: '#374151' }}
              >
                {t.statusFilterLabel || t.statusLabel}
                <ChevronDown className="w-3 h-3" />
              </button>
              {isStatusFilterOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="payment-status-filter" value="" checked={statusFilter === ''} onChange={() => { setStatusFilter(''); setCurrentPage(1); setIsStatusFilterOpen(false); }} className="w-3.5 h-3.5" style={{ accentColor: '#2563eb' }} />
                      <span>{t.allStatus || t.all}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="payment-status-filter" value="pending" checked={statusFilter === 'pending'} onChange={() => { setStatusFilter('pending'); setCurrentPage(1); setIsStatusFilterOpen(false); }} className="w-3.5 h-3.5" style={{ accentColor: '#2563eb' }} />
                      <span>{t.paymentStatusPending}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="payment-status-filter" value="approved" checked={statusFilter === 'approved'} onChange={() => { setStatusFilter('approved'); setCurrentPage(1); setIsStatusFilterOpen(false); }} className="w-3.5 h-3.5" style={{ accentColor: '#2563eb' }} />
                      <span>{t.paymentStatusApproved}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="payment-status-filter" value="paid" checked={statusFilter === 'paid'} onChange={() => { setStatusFilter('paid'); setCurrentPage(1); setIsStatusFilterOpen(false); }} className="w-3.5 h-3.5" style={{ accentColor: '#2563eb' }} />
                      <span>{t.paymentStatusPaid}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="payment-status-filter" value="rejected" checked={statusFilter === 'rejected'} onChange={() => { setStatusFilter('rejected'); setCurrentPage(1); setIsStatusFilterOpen(false); }} className="w-3.5 h-3.5" style={{ accentColor: '#2563eb' }} />
                      <span>{t.paymentStatusRejected}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            {/* Từ ngày / khoảng ngày: pill bấm mở dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDateFilterOpen(!isDateFilterOpen);
                  setIsStatusFilterOpen(false);
                }}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold sm:text-xs"
                style={{ color: '#374151' }}
              >
                {t.dateRangeShort || t.dateFromLabel}
                <ChevronDown className="w-3 h-3" />
              </button>
              {isDateFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="font-semibold" style={{ color: '#374151' }}>{t.dateFromShort || t.dateFromLabel}</span>
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-2 py-1 border rounded" style={{ borderColor: '#d1d5db', outline: 'none' }} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-semibold" style={{ color: '#374151' }}>{t.dateToShort || t.dateToLabel}</span>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-2 py-1 border rounded" style={{ borderColor: '#d1d5db', outline: 'none' }} />
                    </label>
                    <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} className="self-end mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                      {t.clearFilter || 'Xóa lọc'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {isAdmin && (
              <button onMouseEnter={() => setHoveredExportButton(true)} onMouseLeave={() => setHoveredExportButton(false)}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1.5 text-[10px] font-semibold transition-colors sm:px-3 sm:text-xs"
                style={{ backgroundColor: hoveredExportButton ? '#e5e7eb' : '#f3f4f6', color: '#374151' }}>
                <Download className="h-3.5 w-3.5" />
                <span className="sm:hidden">Excel</span>
                <span className="hidden sm:inline">{t.exportExcel}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('first')} onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="px-1.5 py-1 border rounded text-xs font-semibold transition-colors" style={{ backgroundColor: hoveredPaginationNavButton === 'first' ? '#f9fafb' : 'white', borderColor: '#d1d5db', color: '#374151', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}><ChevronsLeft className="w-3.5 h-3.5" /></button>
          <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('prev')} onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="px-1.5 py-1 border rounded text-xs font-semibold transition-colors" style={{ backgroundColor: hoveredPaginationNavButton === 'prev' ? '#f9fafb' : 'white', borderColor: '#d1d5db', color: '#374151', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft className="w-3.5 h-3.5" /></button>
          {[...Array(Math.min(7, Math.max(1, totalPages)))].map((_, i) => {
            let pageNum = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
            if (pageNum < 1 || pageNum > totalPages) return null;
            return (
              <button key={pageNum} onClick={() => setCurrentPage(pageNum)} onMouseEnter={() => currentPage !== pageNum && setHoveredPaginationButtonIndex(pageNum)} onMouseLeave={() => setHoveredPaginationButtonIndex(null)}
                className="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                style={{ backgroundColor: currentPage === pageNum ? '#2563eb' : (hoveredPaginationButtonIndex === pageNum ? '#f9fafb' : 'white'), border: currentPage === pageNum ? 'none' : '1px solid #d1d5db', color: currentPage === pageNum ? 'white' : '#374151' }}>{pageNum}</button>
            );
          })}
          <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} onMouseEnter={() => currentPage < totalPages && setHoveredPaginationNavButton('next')} onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="px-1.5 py-1 border rounded text-xs font-semibold transition-colors" style={{ backgroundColor: hoveredPaginationNavButton === 'next' ? '#f9fafb' : 'white', borderColor: '#d1d5db', color: '#374151', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}><ChevronRight className="w-3.5 h-3.5" /></button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} onMouseEnter={() => currentPage < totalPages && setHoveredPaginationNavButton('last')} onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="px-1.5 py-1 border rounded text-xs font-semibold transition-colors" style={{ backgroundColor: hoveredPaginationNavButton === 'last' ? '#f9fafb' : 'white', borderColor: '#d1d5db', color: '#374151', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}><ChevronsRight className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex items-center gap-2">
          <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-2.5 py-1 border rounded text-xs font-semibold" style={{ borderColor: '#d1d5db', color: '#374151', outline: 'none' }}>
            <option value="20">20</option><option value="50">50</option><option value="100">100</option>
          </select>
          <span className="text-xs font-semibold" style={{ color: '#374151' }}>{totalItems} {t.itemsCount || t.resultsCount}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border min-h-0 p-3" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-gray-500" style={{ borderTopColor: '#2563eb' }} />
          </div>
        ) : !isAdmin && error ? (
          <div className="py-8 text-center text-sm" style={{ color: '#ef4444' }}>{error}</div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: '#6b7280' }}>{t.noPaymentRequests || t.noData}</div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 px-1">
              <input type="checkbox" checked={filteredPayments.length > 0 && selectedRows.size === filteredPayments.length} onChange={handleSelectAll} className="w-3 h-3 rounded" style={{ accentColor: '#2563eb' }} />
              <span className="text-[10px] font-semibold" style={{ color: '#6b7280' }}>{t.selectAll || 'Chọn tất cả'}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-2 xl:grid-cols-3" style={{ gridAutoRows: 'minmax(0, auto)' }}>
            {filteredPayments.map((payment, index) => (
              <div
                key={payment.id}
                className="rounded-xl border bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md min-w-0"
                style={{ borderColor: '#e5e7eb' }}
                onMouseEnter={() => setHoveredRowIndex(index)}
                onMouseLeave={() => setHoveredRowIndex(null)}
              >
                <div className="flex items-center justify-between gap-2 border-b bg-[#fafafa] p-2 sm:p-2.5" style={{ borderColor: '#f3f4f6' }}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <input type="checkbox" checked={selectedRows.has(index)} onChange={() => handleSelectRow(index)} className="w-3 h-3 rounded shrink-0" style={{ accentColor: '#2563eb' }} />
                    <button onClick={() => navigate(`${listUrl}/${payment.id}`)} onMouseEnter={() => setHoveredIdLinkIndex(index)} onMouseLeave={() => setHoveredIdLinkIndex(null)}
                      className="font-semibold text-[10px] flex items-center gap-0.5 truncate" style={{ color: hoveredIdLinkIndex === index ? '#1e40af' : '#2563eb' }}>#{payment.id}<ExternalLink className="w-2.5 h-2.5 shrink-0" /></button>
                  </div>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold shrink-0" style={getStatusColor(payment.status)}>{getStatusIcon(payment.status)}{getPaymentStatusLabel(payment.status, t)}</span>
                </div>
                <div className="space-y-1.5 p-2 sm:hidden">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        onClick={() => navigate(`${basePath}/candidates/${payment.cvId != null ? payment.cvId : payment.candidateId}`)}
                        className="block truncate text-left text-[10px] font-semibold"
                        style={{ color: '#111827' }}
                      >
                        {payment.candidateName}
                      </button>
                      <p className="truncate text-[9px]" style={{ color: '#6b7280' }}>{payment.candidateId}</p>
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color: '#16a34a' }}>
                      {payment.amount.toLocaleString(dateLocale)}đ
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => navigate(`${basePath}/collaborators/${payment.collaboratorId}`)}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold"
                      style={{ borderColor: '#dbeafe', color: '#1d4ed8', backgroundColor: '#eff6ff' }}
                    >
                      <Users className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{payment.collaboratorName}</span>
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`${basePath}/jobs/${payment.jobId}${payment.jobSlug ? `?slug=${payment.jobSlug}` : ''}`)}
                    className="line-clamp-2 text-left text-[10px] font-medium"
                    style={{ color: '#111827' }}
                  >
                    {payment.jobTitle}
                  </button>
                  <div className="flex items-center justify-between gap-2 border-t pt-1.5" style={{ borderColor: '#f3f4f6' }}>
                    <button
                      onClick={() => navigate(`${basePath}/nominations/${payment.applicationId}`)}
                      className="truncate text-[9px] font-medium"
                      style={{ color: '#2563eb' }}
                    >
                      {t.colRequestCode || t.requestCode} {payment.requestId}
                    </button>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => navigate(`${listUrl}/${payment.id}`)}
                        className="rounded-lg p-1"
                        style={{ color: '#2563eb' }}
                        title={t.viewDetailTooltip || t.viewDetail}
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      {isAdmin && payment.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(payment)} className="rounded-lg p-1" style={{ color: '#16a34a' }} title={t.approveTooltip}><CheckCircle className="h-3 w-3" /></button>
                          <button onClick={() => handleReject(payment)} className="rounded-lg p-1" style={{ color: '#dc2626' }} title={t.rejectTooltip}><XCircle className="h-3 w-3" /></button>
                        </>
                      )}
                      {isAdmin && payment.status === 'approved' && (
                        <button onClick={() => handleMarkAsPaid(payment)} className="rounded-lg p-1" style={{ color: '#16a34a' }} title={t.markAsPaidTooltip}><DollarSign className="h-3 w-3" /></button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="hidden space-y-1.5 p-2.5 sm:block">
                  {isAdmin && (
                    <div className="hidden sm:block">
                      <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>{t.colCtv}</p>
                      <button onClick={() => navigate(`${basePath}/collaborators/${payment.collaboratorId}`)} onMouseEnter={() => setHoveredCollaboratorLinkIndex(index)} onMouseLeave={() => setHoveredCollaboratorLinkIndex(null)}
                        className="text-[10px] font-medium flex items-center gap-0.5 truncate" style={{ color: hoveredCollaboratorLinkIndex === index ? '#1e40af' : '#2563eb' }}><Users className="w-2.5 h-2.5 shrink-0" />{payment.collaboratorName}</button>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="sm:hidden">
                      <button
                        onClick={() => navigate(`${basePath}/collaborators/${payment.collaboratorId}`)}
                        className="inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold"
                        style={{ borderColor: '#dbeafe', color: '#1d4ed8', backgroundColor: '#eff6ff' }}
                      >
                        <Users className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{payment.collaboratorName}</span>
                      </button>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>{t.colCandidate}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-[9px] shrink-0" style={{ backgroundColor: '#a855f7' }}>{(payment.candidateName || '—').charAt(0)}</div>
                      <div className="min-w-0">
                        <button onClick={() => navigate(`${basePath}/candidates/${payment.cvId != null ? payment.cvId : payment.candidateId}`)} onMouseEnter={() => setHoveredCandidateLinkIndex(index)} onMouseLeave={() => setHoveredCandidateLinkIndex(null)}
                          className="text-[10px] font-semibold block truncate text-left" style={{ color: hoveredCandidateLinkIndex === index ? '#2563eb' : '#111827' }}>{payment.candidateName}</button>
                        <p className="text-[9px] truncate" style={{ color: '#6b7280' }}>{payment.candidateId}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>{t.colJob}</p>
                    <button onClick={() => navigate(`${basePath}/jobs/${payment.jobId}${payment.jobSlug ? `?slug=${payment.jobSlug}` : ''}`)} onMouseEnter={() => setHoveredJobLinkIndex(index)} onMouseLeave={() => setHoveredJobLinkIndex(null)}
                      className="mt-0.5 flex items-start gap-1 text-left text-[10px] font-medium break-words whitespace-normal line-clamp-2 sm:line-clamp-4" style={{ color: hoveredJobLinkIndex === index ? '#2563eb' : '#111827' }}><Briefcase className="w-2.5 h-2.5 shrink-0 mt-0.5" />{payment.jobTitle}</button>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>{t.colCompany || t.company}</p>
                    <p className="text-[10px] flex items-center gap-0.5 mt-0.5 truncate" style={{ color: '#374151' }}><Building2 className="w-2.5 h-2.5 shrink-0" style={{ color: '#9ca3af' }} />{payment.companyName}</p>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 pt-1 border-t" style={{ borderColor: '#f3f4f6' }}>
                    <span className="text-[9px] font-semibold" style={{ color: '#6b7280' }}>{t.colAmount || t.amountLabel}</span>
                    <span className="text-xs font-bold" style={{ color: '#16a34a' }}>{payment.amount.toLocaleString(dateLocale)}đ</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] sm:hidden" style={{ color: '#6b7280' }}>
                    <span>{t.colRequestDate || t.requestDate}:</span>
                    <span className="text-right">{payment.requestDate ? new Date(payment.requestDate).toLocaleDateString(dateLocale) : '—'}</span>
                  </div>
                  <div className="hidden grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] sm:grid" style={{ color: '#6b7280' }}>
                    <span>{t.colRequestDate || t.requestDate}:</span>
                    <span className="text-right">{payment.requestDate ? new Date(payment.requestDate).toLocaleDateString(dateLocale) : '—'}</span>
                    <span>{t.colApprovedDate || t.approvedDate}:</span>
                    <span className="text-right">{payment.approvedDate !== '—' ? new Date(payment.approvedDate).toLocaleDateString(dateLocale) : '—'}</span>
                    <span>{t.colPaidDate || t.paidDate}:</span>
                    <span className="text-right">{payment.paidDate !== '—' ? new Date(payment.paidDate).toLocaleDateString(dateLocale) : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t" style={{ borderColor: '#f3f4f6' }}>
                    <button onClick={() => navigate(`${basePath}/nominations/${payment.applicationId}`)} onMouseEnter={() => setHoveredRequestIdLinkIndex(index)} onMouseLeave={() => setHoveredRequestIdLinkIndex(null)}
                      className="text-[9px] font-medium" style={{ color: hoveredRequestIdLinkIndex === index ? '#1e40af' : '#2563eb' }}>{t.colRequestCode || t.requestCode} {payment.requestId}</button>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => navigate(`${listUrl}/${payment.id}`)} onMouseEnter={() => setHoveredViewButtonIndex(index)} onMouseLeave={() => setHoveredViewButtonIndex(null)}
                        className="p-1 rounded-lg transition-colors" style={{ color: hoveredViewButtonIndex === index ? '#1e40af' : '#2563eb', backgroundColor: hoveredViewButtonIndex === index ? '#eff6ff' : 'transparent' }} title={t.viewDetailTooltip || t.viewDetail}><Eye className="w-3 h-3" /></button>
                      {isAdmin && payment.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(payment)} onMouseEnter={() => setHoveredApproveButtonIndex(index)} onMouseLeave={() => setHoveredApproveButtonIndex(null)} className="p-1 rounded-lg transition-colors" style={{ color: hoveredApproveButtonIndex === index ? '#15803d' : '#16a34a', backgroundColor: hoveredApproveButtonIndex === index ? '#dcfce7' : 'transparent' }} title={t.approveTooltip}><CheckCircle className="w-3 h-3" /></button>
                          <button onClick={() => handleReject(payment)} onMouseEnter={() => setHoveredRejectButtonIndex(index)} onMouseLeave={() => setHoveredRejectButtonIndex(null)} className="p-1 rounded-lg transition-colors" style={{ color: hoveredRejectButtonIndex === index ? '#991b1b' : '#dc2626', backgroundColor: hoveredRejectButtonIndex === index ? '#fee2e2' : 'transparent' }} title={t.rejectTooltip}><XCircle className="w-3 h-3" /></button>
                        </>
                      )}
                      {isAdmin && payment.status === 'approved' && (
                        <button onClick={() => handleMarkAsPaid(payment)} onMouseEnter={() => setHoveredMarkAsPaidButtonIndex(index)} onMouseLeave={() => setHoveredMarkAsPaidButtonIndex(null)} className="p-1 rounded-lg transition-colors" style={{ color: hoveredMarkAsPaidButtonIndex === index ? '#15803d' : '#16a34a', backgroundColor: hoveredMarkAsPaidButtonIndex === index ? '#dcfce7' : 'transparent' }} title={t.markAsPaidTooltip}><DollarSign className="w-3 h-3" /></button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </div>

      {isAdmin && modalAction && modalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div className="rounded-lg shadow-xl max-w-md w-full p-4 flex flex-col gap-3" style={{ backgroundColor: 'white' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: '#e5e7eb' }}>
              <h3 className="text-sm font-bold" style={{ color: '#111827' }}>{modalAction === 'approve' && t.modalApprovePaymentTitle}{modalAction === 'reject' && t.modalRejectPaymentTitle}{modalAction === 'markPaid' && t.modalMarkPaidTitle}</h3>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" style={{ color: '#6b7280' }} /></button>
            </div>
            {(modalAction === 'approve' || modalAction === 'markPaid') && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#111827' }}>{t.amountToPayLabel}</label>
                <input type="number" value={modalAmount} onChange={e => setModalAmount(e.target.value)} placeholder={t.placeholderAmountExample} min="0" step="1" className="w-full px-3 py-2 border rounded-lg text-xs" style={{ borderColor: '#d1d5db', outline: 'none' }} />
              </div>
            )}
            {modalAction === 'reject' && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#111827' }}>{t.rejectReasonRequired} <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea value={modalRejectedReason} onChange={e => setModalRejectedReason(e.target.value)} placeholder={t.placeholderRejectReason} rows="3" className="w-full px-3 py-2 border rounded-lg text-xs resize-none" style={{ borderColor: '#d1d5db', outline: 'none' }} />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: '#111827' }}>{t.notesOptional}</label>
              <input type="text" value={modalNote} onChange={e => setModalNote(e.target.value)} placeholder={t.placeholderNote} className="w-full px-3 py-2 border rounded-lg text-xs" style={{ borderColor: '#d1d5db', outline: 'none' }} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>{t.cancel}</button>
              <button onClick={handleSubmitModal} disabled={modalLoading || (modalAction === 'reject' && !modalRejectedReason?.trim())} className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: modalAction === 'reject' ? '#dc2626' : '#16a34a' }}>{modalLoading ? t.processing : (modalAction === 'approve' ? t.approveButton : modalAction === 'reject' ? t.rejectButton : t.confirmButton)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentListContent;
