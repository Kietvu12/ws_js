import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import {
  Search,
  Eye,
  Edit,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Users,
} from 'lucide-react';

const GroupCandidatesPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupInfo, setGroupInfo] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  
  // Hover states
  const [hoveredSearchButton, setHoveredSearchButton] = useState(false);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredCollaboratorLinkIndex, setHoveredCollaboratorLinkIndex] = useState(null);
  const [hoveredViewButtonIndex, setHoveredViewButtonIndex] = useState(null);
  const [hoveredEditButtonIndex, setHoveredEditButtonIndex] = useState(null);
  const [hoveredPaginationNavButton, setHoveredPaginationNavButton] = useState(null);

  useEffect(() => {
    // Header search sync via query string `?search=...`
    setSearchQuery(headerSearch);
    setCurrentPage(1);
  }, [headerSearch]);

  useEffect(() => {
    loadGroupInfo();
  }, []);

  useEffect(() => {
    if (groupInfo) {
      loadCandidates();
    }
  }, [currentPage, itemsPerPage, statusFilter, groupInfo]);

  const loadGroupInfo = async () => {
    try {
      const response = await apiService.getMyGroup();
      if (response.success && response.data?.group) {
        setGroupInfo(response.data.group);
      }
    } catch (error) {
      console.error('Error loading group info:', error);
    }
  };

  const loadCandidates = async () => {
    try {
      setLoading(true);
      
      // The backend API getAdminCVs will automatically filter CVs for collaborators
      // assigned to the current admin (who is in the group)
      // So we just need to call the API with pagination and search params
      const params = {
        page: currentPage,
        limit: itemsPerPage
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await apiService.getAdminCVs(params);
      if (response.success && response.data) {
        setCandidates(response.data.cvs || []);
        setPagination(response.data.pagination || {
          total: 0,
          page: 1,
          limit: itemsPerPage,
          totalPages: 0
        });
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadCandidates();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>Hồ sơ ứng viên của nhóm</h1>
          <p className="text-sm mt-1" style={{ color: '#4b5563' }}>
            {groupInfo && `Nhóm: ${groupInfo.name} (${groupInfo.code})`}
          </p>
        </div>
      </div>

      {/* Group Info */}
      {groupInfo && (
        <div className="rounded-lg p-4" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', border: '1px solid' }}>
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: '#1e3a8a' }}>{groupInfo.name}</h2>
              <p className="text-sm" style={{ color: '#1d4ed8' }}>
                Mã nhóm: {groupInfo.code} | Số admin: {groupInfo.admins?.length || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg shadow-sm border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email, mã CV..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                style={{
                  borderColor: '#d1d5db',
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
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border rounded-lg"
            style={{
              borderColor: '#d1d5db',
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
            <option value="">Tất cả trạng thái</option>
            <option value="1">Đang hoạt động</option>
            <option value="0">Không hoạt động</option>
          </select>
          <button
            onClick={handleSearch}
            onMouseEnter={() => setHoveredSearchButton(true)}
            onMouseLeave={() => setHoveredSearchButton(false)}
            className="px-6 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: hoveredSearchButton ? '#1d4ed8' : '#2563eb',
              color: 'white'
            }}
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="rounded-lg shadow-sm border overflow-hidden" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2563eb' }} />
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: '#9ca3af' }} />
            <p style={{ color: '#4b5563' }}>Không có hồ sơ ứng viên nào</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>Ứng viên</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>Mã CV</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>CTV</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>Địa chỉ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>Ngày tạo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: '#111827' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#e5e7eb' }}>
                  {candidates.map((candidate, index) => (
                    <tr
                      key={candidate.id}
                      className="transition-colors"
                      onMouseEnter={() => setHoveredRowIndex(index)}
                      onMouseLeave={() => setHoveredRowIndex(null)}
                      style={{
                        backgroundColor: hoveredRowIndex === index ? '#f9fafb' : 'transparent'
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dbeafe' }}>
                            <User className="w-5 h-5" style={{ color: '#2563eb' }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: '#111827' }}>{candidate.name || '—'}</p>
                            {candidate.email && (
                              <p className="text-xs" style={{ color: '#4b5563' }}>{candidate.email}</p>
                            )}
                            {candidate.phone && (
                              <p className="text-xs" style={{ color: '#6b7280' }}>{candidate.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium" style={{ color: '#111827' }}>{candidate.code || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {candidate.collaborator ? (
                          <button
                            onClick={() => navigate(`/admin/collaborators/${candidate.collaboratorId}`)}
                            onMouseEnter={() => setHoveredCollaboratorLinkIndex(index)}
                            onMouseLeave={() => setHoveredCollaboratorLinkIndex(null)}
                            className="text-sm font-medium"
                            style={{
                              color: hoveredCollaboratorLinkIndex === index ? '#1e40af' : '#2563eb'
                            }}
                          >
                            {candidate.collaborator.name || candidate.collaborator.code || '—'}
                          </button>
                        ) : (
                          <span className="text-sm" style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" style={{ color: '#9ca3af' }} />
                          <span className="text-sm" style={{ color: '#374151' }}>{candidate.address || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: '#374151' }}>{formatDate(candidate.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/admin/candidates/${candidate.id}`)}
                            onMouseEnter={() => setHoveredViewButtonIndex(index)}
                            onMouseLeave={() => setHoveredViewButtonIndex(null)}
                            className="p-2 rounded-lg transition-colors"
                            style={{
                              color: '#2563eb',
                              backgroundColor: hoveredViewButtonIndex === index ? '#eff6ff' : 'transparent'
                            }}
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/candidates/${candidate.id}/edit`)}
                            onMouseEnter={() => setHoveredEditButtonIndex(index)}
                            onMouseLeave={() => setHoveredEditButtonIndex(null)}
                            className="p-2 rounded-lg transition-colors"
                            style={{
                              color: '#4b5563',
                              backgroundColor: hoveredEditButtonIndex === index ? '#f3f4f6' : 'transparent'
                            }}
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: '#e5e7eb' }}>
                <div className="text-sm" style={{ color: '#374151' }}>
                  Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} hồ sơ
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={pagination.page === 1}
                    onMouseEnter={() => pagination.page !== 1 && setHoveredPaginationNavButton('first')}
                    onMouseLeave={() => setHoveredPaginationNavButton(null)}
                    className="p-2 border rounded-lg"
                    style={{
                      borderColor: '#d1d5db',
                      backgroundColor: hoveredPaginationNavButton === 'first' ? '#f9fafb' : 'transparent',
                      opacity: pagination.page === 1 ? 0.5 : 1,
                      cursor: pagination.page === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    onMouseEnter={() => pagination.page !== 1 && setHoveredPaginationNavButton('prev')}
                    onMouseLeave={() => setHoveredPaginationNavButton(null)}
                    className="p-2 border rounded-lg"
                    style={{
                      borderColor: '#d1d5db',
                      backgroundColor: hoveredPaginationNavButton === 'prev' ? '#f9fafb' : 'transparent',
                      opacity: pagination.page === 1 ? 0.5 : 1,
                      cursor: pagination.page === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm" style={{ color: '#374151' }}>
                    Trang {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    onMouseEnter={() => pagination.page < pagination.totalPages && setHoveredPaginationNavButton('next')}
                    onMouseLeave={() => setHoveredPaginationNavButton(null)}
                    className="p-2 border rounded-lg"
                    style={{
                      borderColor: '#d1d5db',
                      backgroundColor: hoveredPaginationNavButton === 'next' ? '#f9fafb' : 'transparent',
                      opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
                      cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(pagination.totalPages)}
                    disabled={pagination.page >= pagination.totalPages}
                    onMouseEnter={() => pagination.page < pagination.totalPages && setHoveredPaginationNavButton('last')}
                    onMouseLeave={() => setHoveredPaginationNavButton(null)}
                    className="p-2 border rounded-lg"
                    style={{
                      borderColor: '#d1d5db',
                      backgroundColor: hoveredPaginationNavButton === 'last' ? '#f9fafb' : 'transparent',
                      opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
                      cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GroupCandidatesPage;

