import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import {
  Search,
  UserCheck,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Mail,
  Phone,
} from 'lucide-react';

const MyAssignedCollaboratorsPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const dateLocale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });

  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredViewButtonIndex, setHoveredViewButtonIndex] = useState(null);
  const [hoveredPaginationNavButton, setHoveredPaginationNavButton] = useState(null);

  useEffect(() => {
    loadMyAssigned();
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    // Header search sync via query string `?search=...`
    setSearchQuery(headerSearch);
  }, [headerSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const loadMyAssigned = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        status: 1
      };
      if (searchQuery) params.search = searchQuery;

      const response = await apiService.getMyAssignedCollaborators(params);
      if (response.success && response.data) {
        setAssignments(response.data.assignments || []);
        setPagination(response.data.pagination || {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0
        });
      }
    } catch (error) {
      console.error('Error loading assigned CVs:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0 px-2 sm:px-3 py-1.5 space-y-3">
        <div className="rounded-lg p-3 border flex items-center justify-between flex-shrink-0" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" style={{ color: '#2563eb' }} />
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#111827' }}>
                {t.myAssignedTitle || 'Hồ sơ được giao cho tôi'}
              </h1>
              <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: '#6b7280' }}>
                {t.myAssignedSubtitle || 'Danh sách hồ sơ ứng viên được Super Admin giao cho bạn phụ trách'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
          <div className="flex items-center px-3 py-1.5 rounded-full bg-white text-[12px] sm:text-[13px] min-w-[220px] flex-1" style={{ border: '1px solid #e5e7eb' }}>
            <Search className="w-3.5 h-3.5 mr-2 flex-shrink-0" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder={t.myAssignedSearchPlaceholder || 'Tìm theo tên, email, mã hồ sơ...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none min-w-0 text-[12px] sm:text-[13px]"
            />
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden flex-1 min-h-0 flex flex-col" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          {loading ? (
            <div className="p-6 text-center flex-1 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2563eb' }}></div>
              <p className="mt-2 text-xs" style={{ color: '#6b7280' }}>{t.myAssignedLoading || 'Đang tải...'}</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-6 text-center flex-1 flex flex-col items-center justify-center">
              <FileText className="w-10 h-10 mb-2" style={{ color: '#9ca3af' }} />
              <p className="text-xs" style={{ color: '#6b7280' }}>{t.myAssignedNoData || 'Bạn chưa được giao hồ sơ nào'}</p>
              <p className="text-[10px] mt-1" style={{ color: '#9ca3af' }}>{t.myAssignedNoDataHint || 'Vui lòng liên hệ Super Admin để được giao hồ sơ phụ trách'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto flex-1 min-h-0">
                <table className="w-full">
                  <thead className="border-b sticky top-0 z-10" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                    <tr>
                      <th className="px-2.5 py-1.5 text-left text-[10px] sm:text-xs font-semibold" style={{ color: '#374151' }}>{t.myAssignedColCandidate || 'Hồ sơ ứng viên'}</th>
                      <th className="px-2.5 py-1.5 text-left text-[10px] sm:text-xs font-semibold" style={{ color: '#374151' }}>{t.myAssignedColAssignedDate || 'Ngày giao'}</th>
                      <th className="px-2.5 py-1.5 text-left text-[10px] sm:text-xs font-semibold" style={{ color: '#374151' }}>{t.colActions || 'Thao tác'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#e5e7eb' }}>
                    {assignments.map((assignment, index) => {
                      const cv = assignment.cvStorage;
                      return (
                        <tr
                          key={assignment.id}
                          style={{ backgroundColor: hoveredRowIndex === index ? '#f9fafb' : 'transparent' }}
                          onMouseEnter={() => setHoveredRowIndex(index)}
                          onMouseLeave={() => setHoveredRowIndex(null)}
                        >
                          <td className="px-2.5 py-1.5">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded" style={{ backgroundColor: '#dbeafe' }}>
                                <FileText className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] sm:text-xs font-medium truncate" style={{ color: '#111827' }}>
                                  {cv?.name || '—'}
                                </div>
                                <div className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: '#6b7280' }}>
                                  <span>Mã: {cv?.code || '—'}</span>
                                </div>
                                <div className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: '#6b7280' }}>
                                  <Mail className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{cv?.email || '—'}</span>
                                </div>
                                {cv?.phone && (
                                  <div className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: '#6b7280' }}>
                                    <Phone className="w-3 h-3 flex-shrink-0" />
                                    {cv.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-2.5 py-1.5">
                            <div className="text-[10px] sm:text-xs" style={{ color: '#111827' }}>
                              {formatDate(assignment.createdAt)}
                            </div>
                          </td>
                          <td className="px-2.5 py-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/candidates/${cv?.id}`)}
                              onMouseEnter={() => setHoveredViewButtonIndex(index)}
                              onMouseLeave={() => setHoveredViewButtonIndex(null)}
                              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-colors"
                              style={{
                                color: '#2563eb',
                                backgroundColor: hoveredViewButtonIndex === index ? '#eff6ff' : 'transparent'
                              }}
                              title={t.myAssignedViewProfileTooltip || 'Xem chi tiết hồ sơ'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {t.myAssignedViewProfile || 'Xem hồ sơ'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="px-2 py-2 border-t flex items-center justify-between flex-wrap gap-2" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                  <div className="text-[10px] font-semibold" style={{ color: '#374151' }}>
                    {t.myAssignedPaginationShow || 'Hiển thị'} {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, pagination.total)} {t.myAssignedPaginationOf || 'của'} {pagination.total}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('first')}
                      onMouseLeave={() => setHoveredPaginationNavButton(null)}
                      className="w-7 h-7 flex items-center justify-center border rounded-full text-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderColor: '#d1d5db', backgroundColor: hoveredPaginationNavButton === 'first' ? '#f3f4f6' : 'transparent' }}
                    >
                      <ChevronsLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('prev')}
                      onMouseLeave={() => setHoveredPaginationNavButton(null)}
                      className="w-7 h-7 flex items-center justify-center border rounded-full text-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderColor: '#d1d5db', backgroundColor: hoveredPaginationNavButton === 'prev' ? '#f3f4f6' : 'transparent' }}
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-semibold px-1.5" style={{ color: '#374151' }}>
                      {currentPage} / {pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                      disabled={currentPage === pagination.totalPages}
                      onMouseEnter={() => currentPage < pagination.totalPages && setHoveredPaginationNavButton('next')}
                      onMouseLeave={() => setHoveredPaginationNavButton(null)}
                      className="w-7 h-7 flex items-center justify-center border rounded-full text-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderColor: '#d1d5db', backgroundColor: hoveredPaginationNavButton === 'next' ? '#f3f4f6' : 'transparent' }}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pagination.totalPages)}
                      disabled={currentPage === pagination.totalPages}
                      onMouseEnter={() => currentPage < pagination.totalPages && setHoveredPaginationNavButton('last')}
                      onMouseLeave={() => setHoveredPaginationNavButton(null)}
                      className="w-7 h-7 flex items-center justify-center border rounded-full text-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderColor: '#d1d5db', backgroundColor: hoveredPaginationNavButton === 'last' ? '#f3f4f6' : 'transparent' }}
                    >
                      <ChevronsRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyAssignedCollaboratorsPage;
