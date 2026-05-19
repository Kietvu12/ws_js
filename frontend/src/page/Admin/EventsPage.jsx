import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronsUpDown,
  MapPin,
  Calendar as CalendarIcon,
  Edit,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

const EventsPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  // 2 tab: đang diễn ra vs đã kết thúc
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [sortOption, setSortOption] = useState('eventDateDesc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  const [hoveredAddEventButton, setHoveredAddEventButton] = useState(false);
  const [hoveredPaginationNavButton, setHoveredPaginationNavButton] = useState(null);
  const [hoveredPaginationButtonIndex, setHoveredPaginationButtonIndex] = useState(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredEditButtonIndex, setHoveredEditButtonIndex] = useState(null);
  const [hoveredDeleteButtonIndex, setHoveredDeleteButtonIndex] = useState(null);
  const [isSortFilterOpen, setIsSortFilterOpen] = useState(false);

  useEffect(() => {
    // Header search sync via query string `?search=...`
    setSearchQuery(headerSearch);
    setCurrentPage(1);
  }, [headerSearch]);

  useEffect(() => {
    loadEvents();
  }, [currentPage, itemsPerPage, sortOption, searchQuery]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      let sortBy = 'start_at';
      let sortOrder = 'DESC';
      if (sortOption.startsWith('alphabet')) {
        sortBy = 'title';
        sortOrder = sortOption === 'alphabetDesc' ? 'DESC' : 'ASC';
      } else if (sortOption.startsWith('eventDate')) {
        sortBy = 'start_at';
        sortOrder = sortOption === 'eventDateAsc' ? 'ASC' : 'DESC';
      }
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
      };
      if (searchQuery?.trim()) params.search = searchQuery.trim();
      const response = await apiService.getAdminEvents(params);
      if (response.success && response.data) {
        setEvents(response.data.events || []);
        setPagination(response.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 });
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const totalItems = pagination.total || 0;
  const totalPages = Math.max(1, pagination.totalPages || 1);

  const handleReset = () => {
    setSearchQuery('');
    setSelectedStatus('active');
    setCurrentPage(1);
    loadEvents();
  };

  const handleEdit = (eventId) => {
    navigate(`/admin/events/${eventId}/edit`);
  };

  const handleDelete = async (eventId) => {
    if (window.confirm(t.eventsConfirmDelete || 'Bạn có chắc muốn xóa sự kiện này?')) {
      try {
        const response = await apiService.deleteAdminEvent(eventId);
        if (response.success) {
          loadEvents();
        } else {
          alert(response.message || t.eventsDeleteError || 'Xóa thất bại');
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        alert(error.message || t.eventsDeleteError || 'Xóa thất bại');
      }
    }
  };

  const formatDateTimeShort = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    const locale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';
    return d.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEventId = (id) => {
    if (id === undefined || id === null) return '';
    return String(id).padStart(8, '0');
  };

  const visibleEvents = events.filter((evt) => {
    const endAt = evt?.end_at ?? evt?.endAt;
    const isEnded = endAt ? new Date(endAt) < new Date() : false;
    return selectedStatus === 'active' ? !isEnded : isEnded;
  });

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Tabs */}
      <div className="hidden md:block w-56 sm:w-64 flex-shrink-0 border-r bg-white">
        <div className="p-3 sm:p-4 space-y-2">
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('active');
              setCurrentPage(1);
            }}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors text-[12px] font-semibold"
            style={{
              backgroundColor: selectedStatus === 'active' ? '#eff6ff' : 'white',
              color: selectedStatus === 'active' ? '#1d4ed8' : '#374151',
            }}
          >
            <span>{t.eventsStatusActive || 'Đang diễn ra'}</span>
            <CheckCircle2 className="w-4 h-4" style={{ color: selectedStatus === 'active' ? '#1d4ed8' : '#cbd5e1' }} />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('ended');
              setCurrentPage(1);
            }}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors text-[12px] font-semibold"
            style={{
              backgroundColor: selectedStatus === 'ended' ? '#eff6ff' : 'white',
              color: selectedStatus === 'ended' ? '#1d4ed8' : '#374151',
            }}
          >
            <span>{t.eventsStatusEnded || 'Đã kết thúc'}</span>
            <CheckCircle2 className="w-4 h-4" style={{ color: selectedStatus === 'ended' ? '#1d4ed8' : '#cbd5e1' }} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Status Tabs */}
        <div className="md:hidden px-2 pt-1 pb-0.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => {
                setSelectedStatus('active');
                setCurrentPage(1);
              }}
              className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold"
              style={{
                backgroundColor: selectedStatus === 'active' ? '#eff6ff' : 'white',
                color: selectedStatus === 'active' ? '#1d4ed8' : '#374151',
                border: '1px solid #e5e7eb',
              }}
            >
              {t.eventsStatusActive || 'Đang diễn ra'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedStatus('ended');
                setCurrentPage(1);
              }}
              className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold"
              style={{
                backgroundColor: selectedStatus === 'ended' ? '#eff6ff' : 'white',
                color: selectedStatus === 'ended' ? '#1d4ed8' : '#374151',
                border: '1px solid #e5e7eb',
              }}
            >
              {t.eventsStatusEnded || 'Đã kết thúc'}
            </button>
          </div>
        </div>
        {/* Filter Section */}
        <div className="px-2 sm:px-3 py-1.5 mb-1.5 flex-shrink-0">
        <div className="flex w-full items-center gap-2.5 flex-wrap justify-between">
          <div className="flex min-w-0 flex-1 items-center rounded-full bg-white px-3 py-1.5 text-[11px] sm:text-[13px] w-full max-w-[500px] sm:min-w-[220px]">
            <Search className="w-3.5 h-3.5 mr-2 flex-shrink-0" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder={t.eventsSearchPlaceholder || 'Tên sự kiện, địa điểm...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-transparent outline-none text-[11px] sm:text-[13px] text-gray-700 placeholder:text-gray-400"
              style={{ border: 'none' }}
            />
          </div>

          <button
            onClick={() => navigate('/admin/events/new')}
            onMouseEnter={() => setHoveredAddEventButton(true)}
            onMouseLeave={() => setHoveredAddEventButton(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full sm:hidden"
            style={{
              backgroundColor: hoveredAddEventButton ? '#b91c1c' : '#dc2626',
              color: 'white',
            }}
            aria-label={t.addEventButton || 'Thêm sự kiện'}
          >
            <Plus className="w-3 h-3" />
          </button>

          <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:flex-wrap sm:justify-end sm:gap-2.5 sm:overflow-visible sm:pb-0">
            {/* Sắp xếp */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSortFilterOpen(!isSortFilterOpen);
                }}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full bg-white text-[10px] sm:text-xs font-semibold"
                style={{ color: '#374151', border: '1px solid #f3f4f6' }}
              >
                Sắp xếp
                <ChevronDown className="w-3 h-3" />
              </button>
              {isSortFilterOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-gray-700">Tên</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSortOption((prev) => (prev === 'alphabetAsc' ? 'alphabetDesc' : 'alphabetAsc'));
                          setCurrentPage(1);
                        }}
                        className="px-2.5 py-0.5 rounded-full border flex items-center gap-1 text-[10px]"
                        style={{
                          borderColor: sortOption.startsWith('alphabet') ? '#2563eb' : '#e5e7eb',
                          backgroundColor: sortOption.startsWith('alphabet') ? '#eff6ff' : 'white',
                          color: sortOption.startsWith('alphabet') ? '#1d4ed8' : '#4b5563',
                        }}
                      >
                        <ChevronsUpDown className="w-3 h-3" />
                        <span>{sortOption === 'alphabetDesc' ? 'Z–A' : 'A–Z'}</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-gray-700">Ngày diễn ra</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSortOption((prev) => (prev === 'eventDateAsc' ? 'eventDateDesc' : 'eventDateAsc'));
                          setCurrentPage(1);
                        }}
                        className="px-2.5 py-0.5 rounded-full border flex items-center gap-1 text-[10px]"
                        style={{
                          borderColor: sortOption.startsWith('eventDate') ? '#2563eb' : '#e5e7eb',
                          backgroundColor: sortOption.startsWith('eventDate') ? '#eff6ff' : 'white',
                          color: sortOption.startsWith('eventDate') ? '#1d4ed8' : '#4b5563',
                        }}
                      >
                        <ChevronsUpDown className="w-3 h-3" />
                        <span>{sortOption === 'eventDateAsc' ? 'Cũ → Mới' : 'Mới → Cũ'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="shrink-0 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold transition-colors"
              style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
            >
              {t.reset || 'Reset'}
            </button>

            <button
              onClick={() => navigate('/admin/events/new')}
              onMouseEnter={() => setHoveredAddEventButton(true)}
              onMouseLeave={() => setHoveredAddEventButton(false)}
              className="hidden sm:inline-flex px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold items-center gap-1.5"
              style={{
                backgroundColor: hoveredAddEventButton ? '#b91c1c' : '#dc2626',
                color: 'white',
              }}
            >
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">Thêm sự kiện</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2 sm:px-3 mb-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('first')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="w-5 h-5 border rounded-full text-[8px] font-semibold flex items-center justify-center transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'first' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: currentPage === 1 ? 0.5 : 1,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('prev')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="w-5 h-5 border rounded-full text-[8px] font-semibold flex items-center justify-center transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'prev' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: currentPage === 1 ? 0.5 : 1,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
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
                className="w-5 h-5 rounded-full text-[8px] font-semibold flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: currentPage === pageNum ? '#ef4444' : hoveredPaginationButtonIndex === pageNum ? '#fef2f2' : 'white',
                  border: currentPage === pageNum ? 'none' : '1px solid #d1d5db',
                  color: currentPage === pageNum ? 'white' : '#374151',
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
            className="w-5 h-5 border rounded-full text-[8px] font-semibold flex items-center justify-center transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'next' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: currentPage === totalPages ? 0.5 : 1,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            onMouseEnter={() => currentPage !== totalPages && setHoveredPaginationNavButton('last')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="w-5 h-5 border rounded-full text-[8px] font-semibold flex items-center justify-center transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'last' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: currentPage === totalPages ? 0.5 : 1,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-0.5 border rounded-full text-[10px] font-semibold"
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
            {totalItems} {t.eventsTotalItemsSuffix || 'sự kiện'}
          </span>
        </div>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: '#6b7280' }}>
            {t.eventsLoading || 'Đang tải dữ liệu...'}
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: '#6b7280' }}>
            {t.eventsNoData || 'Chưa có sự kiện'}
          </div>
        ) : (
          <div className="p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            {visibleEvents.map((evt, index) => {
              const endAt = evt.end_at ?? evt.endAt;
              const isEnded = endAt && new Date(endAt) < new Date();
              const statusLabel = isEnded ? (t.eventsStatusEnded || 'Đã kết thúc') : (t.eventsStatusActive || 'Đang diễn ra');
              const badge = isEnded
                ? {
                    container: 'bg-slate-50 text-slate-700 border-slate-200',
                    dot: 'bg-slate-500',
                  }
                : {
                    container: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    dot: 'bg-emerald-500',
                  };
              return (
                <div
                  key={evt.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/events/${evt.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/admin/events/${evt.id}`);
                    }
                  }}
                  onMouseEnter={() => setHoveredRowIndex(index)}
                  onMouseLeave={() => setHoveredRowIndex(null)}
                  className="relative text-left bg-white rounded-xl border shadow-[0_8px_20px_rgba(15,23,42,0.06)] px-3 sm:px-3.5 py-3 sm:py-3.5 flex flex-col transition-transform transition-shadow cursor-pointer h-full min-h-[240px] sm:min-h-[260px]"
                  style={{
                    borderColor: hoveredRowIndex === index ? '#bfdbfe' : '#e5e7eb',
                    transform: hoveredRowIndex === index ? 'translateY(-1px)' : 'translateY(0)',
                  }}
                >
                  <div className="absolute top-2 right-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.container}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} mr-1`} />
                      {statusLabel}
                    </span>
                  </div>

                  <div className="pt-1 flex flex-col gap-2 flex-1">
                    <div className="pr-16">
                      <p className="text-[11px] sm:text-xs font-semibold line-clamp-2" style={{ color: '#111827' }}>
                        {evt.title || evt.name || 'Sự kiện'}
                      </p>
                    </div>

                    <div className="border-t border-slate-200" />

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[10px] sm:text-[11px] whitespace-nowrap" style={{ color: '#6b7280' }}>
                        <span className="font-semibold" style={{ color: '#4b5563' }}>ID</span>
                        <span className="font-mono" style={{ color: '#111827' }}>
                          {formatEventId(evt.id)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] sm:text-[11px] whitespace-nowrap" style={{ color: '#6b7280' }}>
                        <CalendarIcon className="w-3 h-3 flex-shrink-0" style={{ color: '#9ca3af' }} />
                        <span>
                          {formatDateTimeShort(evt.start_at)} → {formatDateTimeShort(evt.end_at)}
                        </span>
                      </div>

                      {evt.location && (
                        <div className="flex items-center gap-2 text-[10px] sm:text-[11px]" style={{ color: '#6b7280' }}>
                          <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#9ca3af' }} />
                          <span className="truncate">{evt.location}</span>
                        </div>
                      )}

                      {evt.description && (
                        <div>
                          <div className="text-[10px] sm:text-[11px] font-semibold" style={{ color: '#374151' }}>
                            Mô tả
                          </div>
                          <p className="text-[10px] sm:text-[11px] leading-snug mt-1 line-clamp-4" style={{ color: '#4b5563' }}>
                            {evt.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(evt.id);
                      }}
                      onMouseEnter={() => setHoveredEditButtonIndex(index)}
                      onMouseLeave={() => setHoveredEditButtonIndex(null)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors border"
                      style={{
                        backgroundColor: hoveredEditButtonIndex === index ? '#fde047' : '#facc15',
                        color: '#111827',
                        borderColor: '#f59e0b',
                      }}
                    >
                      {t.viewDetailShort || t.viewDetail || 'Chi tiết'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(evt.id);
                    }}
                    onMouseEnter={() => setHoveredDeleteButtonIndex(index)}
                    onMouseLeave={() => setHoveredDeleteButtonIndex(null)}
                    className="absolute top-12 right-3 p-1 rounded-full transition-opacity"
                    style={{
                      opacity: hoveredRowIndex === index ? 1 : 0,
                      pointerEvents: hoveredRowIndex === index ? 'auto' : 'none',
                      backgroundColor: hoveredDeleteButtonIndex === index ? '#fee2e2' : 'transparent',
                      color: hoveredDeleteButtonIndex === index ? '#991b1b' : '#dc2626',
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default EventsPage;
