import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import {
  Search,
  Users,
  Mail,
  Phone,
  Briefcase,
  FileText,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  BarChart3,
  Loader2,
  UserCheck,
} from 'lucide-react';

const GroupCollaboratorsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupInfo, setGroupInfo] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [statistics, setStatistics] = useState(null);
  
  // Hover states
  const [hoveredSearchButton, setHoveredSearchButton] = useState(false);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredViewButtonIndex, setHoveredViewButtonIndex] = useState(null);
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
      loadGroupCollaborators();
      loadStatistics();
    }
  }, [currentPage, itemsPerPage, groupInfo]);

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

  const loadGroupCollaborators = async () => {
    try {
      setLoading(true);
      
      // Get all admins in group
      const adminIds = groupInfo?.admins?.map(a => a.id) || [];
      
      if (adminIds.length === 0) {
        setCollaborators([]);
        setPagination({
          total: 0,
          page: 1,
          limit: itemsPerPage,
          totalPages: 0
        });
        return;
      }

      // Get all collaborators assigned to admins in this group
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        status: 1, // Only active assignments
        adminId: adminIds.join(',')
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await apiService.getCollaboratorAssignments(params);
      if (response.success && response.data) {
        // Extract unique collaborators from assignments
        const uniqueCollaborators = [];
        const collaboratorMap = new Map();
        
        response.data.assignments?.forEach(assignment => {
          if (assignment.collaborator && !collaboratorMap.has(assignment.collaboratorId)) {
            collaboratorMap.set(assignment.collaboratorId, assignment.collaborator);
            uniqueCollaborators.push({
              ...assignment.collaborator,
              assignedAdmin: assignment.admin
            });
          }
        });

        setCollaborators(uniqueCollaborators);
        setPagination(response.data.pagination || {
          total: uniqueCollaborators.length,
          page: currentPage,
          limit: itemsPerPage,
          totalPages: Math.ceil(uniqueCollaborators.length / itemsPerPage)
        });
      }
    } catch (error) {
      console.error('Error loading group collaborators:', error);
      setCollaborators([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await apiService.getMyGroupStatistics();
      if (response.success && response.data) {
        setStatistics(response.data.groupStatistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadGroupCollaborators();
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
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>CTV của nhóm</h1>
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

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg shadow-sm border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#dbeafe' }}>
                <Users className="w-5 h-5" style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: '#4b5563' }}>Tổng số CTV</p>
                <p className="text-xl font-bold" style={{ color: '#111827' }}>{statistics.collaboratorCount || 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg shadow-sm border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
                <FileText className="w-5 h-5" style={{ color: '#16a34a' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: '#4b5563' }}>Số đơn ứng tuyển</p>
                <p className="text-xl font-bold" style={{ color: '#111827' }}>{statistics.jobApplicationCount || 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg shadow-sm border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f3e8ff' }}>
                <Briefcase className="w-5 h-5" style={{ color: '#9333ea' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: '#4b5563' }}>Số CV</p>
                <p className="text-xl font-bold" style={{ color: '#111827' }}>{statistics.cvCount || 0}</p>
              </div>
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
                placeholder="Tìm kiếm theo tên, email, mã CTV..."
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

      {/* Collaborators Table */}
      <div className="rounded-lg shadow-sm border overflow-hidden" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2563eb' }} />
          </div>
        ) : collaborators.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4" style={{ color: '#9ca3af' }} />
            <p style={{ color: '#4b5563' }}>Không có CTV nào trong nhóm</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>CTV</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>Mã CTV</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>Admin phụ trách</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>Địa chỉ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>Ngày tham gia</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: '#111827' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#e5e7eb' }}>
                  {collaborators.map((collaborator, index) => (
                    <tr
                      key={collaborator.id}
                      className="transition-colors"
                      onMouseEnter={() => setHoveredRowIndex(index)}
                      onMouseLeave={() => setHoveredRowIndex(null)}
                      style={{
                        backgroundColor: hoveredRowIndex === index ? '#f9fafb' : 'transparent'
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
                            <Users className="w-5 h-5" style={{ color: '#16a34a' }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: '#111827' }}>{collaborator.name || collaborator.email}</p>
                            <p className="text-xs" style={{ color: '#4b5563' }}>{collaborator.email}</p>
                            {collaborator.phone && (
                              <p className="text-xs" style={{ color: '#6b7280' }}>{collaborator.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium" style={{ color: '#111827' }}>{collaborator.code || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {collaborator.assignedAdmin ? (
                          <span className="text-sm" style={{ color: '#374151' }}>
                            {collaborator.assignedAdmin.name || collaborator.assignedAdmin.email}
                          </span>
                        ) : (
                          <span className="text-sm" style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: '#374151' }}>{collaborator.address || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: '#374151' }}>{formatDate(collaborator.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/admin/collaborators/${collaborator.id}`)}
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
                  Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} CTV
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

export default GroupCollaboratorsPage;

