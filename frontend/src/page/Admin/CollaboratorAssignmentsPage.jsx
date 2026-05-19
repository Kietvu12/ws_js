import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import {
  Search,
  Plus,
  Users,
  User,
  UserCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import { getJobApplicationStatus } from '../../utils/jobApplicationStatus';

const CollaboratorAssignmentsPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const dateLocale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  const [adminFilter, setAdminFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
  const [admins, setAdmins] = useState([]);
  const [unassignedCvStorages, setUnassignedCvStorages] = useState([]); // dùng cho phân công nhanh (1 hồ sơ)
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [selectedAdminName, setSelectedAdminName] = useState('');
  const [selectedCvStorageId, setSelectedCvStorageId] = useState('');
  const [selectedCvStorageName, setSelectedCvStorageName] = useState('');
  const [selectedCvStorageIds, setSelectedCvStorageIds] = useState(new Set());
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [showCollaboratorDropdown, setShowCollaboratorDropdown] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [collaboratorSearch, setCollaboratorSearch] = useState('');
  const [showQuickAssign, setShowQuickAssign] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);

  // Bulk helpers: search CTV / Admin để tự động chọn tất cả hồ sơ của họ
  const [bulkCollaboratorSearch, setBulkCollaboratorSearch] = useState('');
  const [bulkCollaboratorResults, setBulkCollaboratorResults] = useState([]);
  const [showBulkCollaboratorDropdown, setShowBulkCollaboratorDropdown] = useState(false);
  const [selectedBulkCollaborator, setSelectedBulkCollaborator] = useState(null);

  const [bulkOwnerAdminSearch, setBulkOwnerAdminSearch] = useState('');
  const [bulkOwnerAdminResults, setBulkOwnerAdminResults] = useState([]);
  const [showBulkOwnerAdminDropdown, setShowBulkOwnerAdminDropdown] = useState(false);
  const [selectedBulkOwnerAdmin, setSelectedBulkOwnerAdmin] = useState(null);
  const [bulkCvList, setBulkCvList] = useState([]); // danh sách hồ sơ theo CTV/Admin trong phân công hàng loạt
  const [bulkCvListLoading, setBulkCvListLoading] = useState(false);
  const bulkCollaboratorSearchTimeoutRef = useRef(null);
  const bulkOwnerAdminSearchTimeoutRef = useRef(null);
  
  // Hover states
  const [hoveredAssignButton, setHoveredAssignButton] = useState(false);
  const [hoveredClearAdminButton, setHoveredClearAdminButton] = useState(false);
  const [hoveredClearCollaboratorButton, setHoveredClearCollaboratorButton] = useState(false);
  const [hoveredAdminDropdownItemIndex, setHoveredAdminDropdownItemIndex] = useState(null);
  const [hoveredCollaboratorDropdownItemIndex, setHoveredCollaboratorDropdownItemIndex] = useState(null);
  const [hoveredSearchButton, setHoveredSearchButton] = useState(false);
  const [hoveredUnassignButtonIndex, setHoveredUnassignButtonIndex] = useState(null);
  const [hoveredPaginationNavButton, setHoveredPaginationNavButton] = useState(null);
  const [hoveredSelectAllButton, setHoveredSelectAllButton] = useState(false);
  const [hoveredBulkAssignButton, setHoveredBulkAssignButton] = useState(false);
  const [hoveredCollaboratorItemIndex, setHoveredCollaboratorItemIndex] = useState(null);
  const [hoveredBulkCollaboratorResultIndex, setHoveredBulkCollaboratorResultIndex] = useState(null);
  const [hoveredBulkOwnerAdminResultIndex, setHoveredBulkOwnerAdminResultIndex] = useState(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [expandedAdminId, setExpandedAdminId] = useState(null);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState(null);
  const [applicationsByAssignmentId, setApplicationsByAssignmentId] = useState({});
  const [loadingApplicationsId, setLoadingApplicationsId] = useState(null);
  const [isAdminFilterOpen, setIsAdminFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  useEffect(() => {
    loadAssignments();
    loadAdmins();
    loadUnassignedCvStorages();
  }, [currentPage, itemsPerPage, adminFilter, statusFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const inAdmin = event.target.closest('.admin-dropdown-container');
      const inCollaborator = event.target.closest('.collaborator-dropdown-container');
      const inBulkCollaborator = event.target.closest('.bulk-collaborator-search-container');
      const inBulkOwnerAdmin = event.target.closest('.bulk-owner-admin-search-container');
      const inAssignFilters = event.target.closest('.assign-filters-container');

      if (!inAdmin) setShowAdminDropdown(false);
      if (!inCollaborator) setShowCollaboratorDropdown(false);
      if (!inBulkCollaborator) setShowBulkCollaboratorDropdown(false);
      if (!inBulkOwnerAdmin) setShowBulkOwnerAdminDropdown(false);
      if (!inAssignFilters) {
        setIsAdminFilterOpen(false);
        setIsStatusFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Header search sync via query string `?search=...`
    setSearchQuery(headerSearch);
    setCurrentPage(1);
  }, [headerSearch]);

  // Debounce search CTV cho bulk assign
  useEffect(() => {
    if (bulkCollaboratorSearchTimeoutRef.current) {
      clearTimeout(bulkCollaboratorSearchTimeoutRef.current);
    }

    const value = bulkCollaboratorSearch;
    if (!value || value.trim().length < 2) {
      setBulkCollaboratorResults([]);
      setShowBulkCollaboratorDropdown(false);
      return;
    }

    bulkCollaboratorSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiService.getCollaborators({
          search: value.trim(),
          status: 1,
          limit: 20
        });
        if (res.success && res.data) {
          setBulkCollaboratorResults(res.data.collaborators || []);
          setShowBulkCollaboratorDropdown((res.data.collaborators || []).length > 0);
        } else {
          setBulkCollaboratorResults([]);
          setShowBulkCollaboratorDropdown(false);
        }
      } catch (error) {
        console.error('Error searching collaborators for bulk assign:', error);
        setBulkCollaboratorResults([]);
        setShowBulkCollaboratorDropdown(false);
      }
    }, 300);

    return () => {
      if (bulkCollaboratorSearchTimeoutRef.current) {
        clearTimeout(bulkCollaboratorSearchTimeoutRef.current);
      }
    };
  }, [bulkCollaboratorSearch]);

  // Debounce search Admin chủ hồ sơ cho bulk assign
  useEffect(() => {
    if (bulkOwnerAdminSearchTimeoutRef.current) {
      clearTimeout(bulkOwnerAdminSearchTimeoutRef.current);
    }

    const value = bulkOwnerAdminSearch;
    if (!value || value.trim().length < 2) {
      setBulkOwnerAdminResults([]);
      setShowBulkOwnerAdminDropdown(false);
      return;
    }

    bulkOwnerAdminSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiService.getAdmins({
          search: value.trim(),
          status: 1,
          limit: 20
        });
        if (res.success && res.data) {
          setBulkOwnerAdminResults(res.data.admins || []);
          setShowBulkOwnerAdminDropdown((res.data.admins || []).length > 0);
        } else {
          setBulkOwnerAdminResults([]);
          setShowBulkOwnerAdminDropdown(false);
        }
      } catch (error) {
        console.error('Error searching admins for bulk CV owner:', error);
        setBulkOwnerAdminResults([]);
        setShowBulkOwnerAdminDropdown(false);
      }
    }, 300);

    return () => {
      if (bulkOwnerAdminSearchTimeoutRef.current) {
        clearTimeout(bulkOwnerAdminSearchTimeoutRef.current);
      }
    };
  }, [bulkOwnerAdminSearch]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (adminFilter) {
        params.adminId = adminFilter;
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await apiService.getCollaboratorAssignments(params);
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
      console.error('Error loading assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      const response = await apiService.getAdmins({ role: 2, status: 1 }); // Only AdminBackOffice
      if (response.success && response.data) {
        setAdmins(response.data.admins || []);
      }
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  };

  const loadUnassignedCvStorages = async () => {
    try {
      let all = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await apiService.getUnassignedCvStorages({ page, limit: 100 });
        if (response.success && response.data) {
          const list = response.data.cvStorages || [];
          all = [...all, ...list];
          const pagination = response.data.pagination || {};
          if (pagination.totalPages && page >= pagination.totalPages) hasMore = false;
          else if (list.length < 100) hasMore = false;
          else page++;
        } else hasMore = false;
      }
      // Loại bỏ trùng theo id để tránh duplicate hiển thị
      const uniqueMap = new Map();
      all.forEach(cv => {
        if (cv && cv.id && !uniqueMap.has(cv.id)) {
          uniqueMap.set(cv.id, cv);
        }
      });
      setUnassignedCvStorages(Array.from(uniqueMap.values()));
    } catch (error) {
      console.error('Error loading unassigned CV storages:', error);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setAdminFilter('');
    setStatusFilter('');
    setCurrentPage(1);
    setIsAdminFilterOpen(false);
    setIsStatusFilterOpen(false);
    loadAssignments();
  };

  const handleAssign = async () => {
    if (!selectedAdminId || !selectedCvStorageId) {
      alert(t.assignAlertSelectAdminAndCandidate || 'Vui lòng chọn AdminBackOffice và hồ sơ ứng viên');
      return;
    }

    try {
      setAssigning(true);
      const response = await apiService.createCollaboratorAssignment({
        cvStorageId: parseInt(selectedCvStorageId),
        adminId: parseInt(selectedAdminId),
        notes: assignNotes
      });
      if (response.success) {
        alert(t.assignSuccess || 'Phân công hồ sơ thành công!');
        setSelectedAdminId('');
        setSelectedAdminName('');
        setSelectedCvStorageId('');
        setSelectedCvStorageName('');
        setAdminSearch('');
        setCollaboratorSearch('');
        setAssignNotes('');
        loadAssignments();
        loadUnassignedCvStorages();
      } else {
        alert(response.message || (t.assignError || 'Có lỗi xảy ra khi phân công'));
      }
    } catch (error) {
      console.error('Error assigning:', error);
      alert(error.message || (t.assignError || 'Có lỗi xảy ra khi phân công'));
    } finally {
      setAssigning(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedAdminId || !selectedCvStorageIds || selectedCvStorageIds.size === 0) {
      alert(t.assignBulkAlertSelect || 'Vui lòng chọn AdminBackOffice và ít nhất 1 hồ sơ');
      return;
    }

    try {
      setAssigning(true);
      const response = await apiService.bulkAssignCollaborators({
        cvStorageIds: Array.from(selectedCvStorageIds).map(id => parseInt(id)),
        adminId: parseInt(selectedAdminId)
      });
      if (response.success) {
        alert(`${t.assignBulkSuccess || 'Phân công thành công'} ${response.data.assignments?.length || selectedCvStorageIds.size} ${t.assignProfilesSelected || 'hồ sơ'}!`);
        setSelectedAdminId('');
        setSelectedAdminName('');
        setSelectedCvStorageIds(new Set());
        setAdminSearch('');
        setCollaboratorSearch('');
        setAssignNotes('');
        loadAssignments();
        loadUnassignedCvStorages();
      } else {
        alert(response.message || (t.assignError || 'Có lỗi xảy ra khi phân công'));
      }
    } catch (error) {
      console.error('Error bulk assigning:', error);
      alert(error.message || (t.assignError || 'Có lỗi xảy ra khi phân công'));
    } finally {
      setAssigning(false);
    }
  };

  // Bulk helper: khi chọn 1 CTV, tự động lấy tất cả CV của CTV đó và set vào selectedCvStorageIds
  const handleSelectBulkCollaborator = async (collaborator) => {
    setSelectedBulkCollaborator(collaborator);
    setSelectedBulkOwnerAdmin(null);
    setBulkCollaboratorSearch(collaborator.name || collaborator.email || collaborator.code || `CTV #${collaborator.id}`);
    setShowBulkCollaboratorDropdown(false);

    try {
      setBulkCvListLoading(true);
      const res = await apiService.getAdminCVs({
        collaboratorId: collaborator.id,
        limit: 1000,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });
      if (res.success && res.data) {
        const cvs = res.data.cvs || [];
        setBulkCvList(cvs);
        const ids = cvs.map(cv => cv.id).filter(Boolean);
        setSelectedCvStorageIds(new Set(ids)); // mặc định chọn hết
      } else {
        setBulkCvList([]);
        setSelectedCvStorageIds(new Set());
      }
    } catch (error) {
      console.error('Error loading CVs by collaborator for bulk assign:', error);
      setBulkCvList([]);
      setSelectedCvStorageIds(new Set());
    } finally {
      setBulkCvListLoading(false);
    }
  };

  // Bulk helper: khi chọn 1 Admin (đang phụ trách CV), tự động lấy tất cả CV của Admin đó
  const handleSelectBulkOwnerAdmin = async (ownerAdmin) => {
    setSelectedBulkOwnerAdmin(ownerAdmin);
    setSelectedBulkCollaborator(null);
    setBulkOwnerAdminSearch(ownerAdmin.name || ownerAdmin.email || `Admin #${ownerAdmin.id}`);
    setShowBulkOwnerAdminDropdown(false);

    try {
      setBulkCvListLoading(true);
      const res = await apiService.getAdminCVs({
        adminId: ownerAdmin.id,
        limit: 1000,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });
      if (res.success && res.data) {
        const cvs = res.data.cvs || [];
        setBulkCvList(cvs);
        const ids = cvs.map(cv => cv.id).filter(Boolean);
        setSelectedCvStorageIds(new Set(ids)); // mặc định chọn hết
      } else {
        setBulkCvList([]);
        setSelectedCvStorageIds(new Set());
      }
    } catch (error) {
      console.error('Error loading CVs by admin for bulk assign:', error);
      setBulkCvList([]);
      setSelectedCvStorageIds(new Set());
    } finally {
      setBulkCvListLoading(false);
    }
  };

  const handleUnassign = async (assignmentId) => {
    if (!window.confirm(t.assignUnassignConfirm || 'Bạn có chắc muốn hủy phân công này?')) return;
    try {
      const response = await apiService.deleteCollaboratorAssignment(assignmentId);
      if (response.success) {
        alert(t.assignUnassignSuccess || 'Hủy phân công thành công!');
        loadAssignments();
        loadUnassignedCvStorages();
      } else {
        alert(response.message || (t.assignUnassignError || 'Có lỗi xảy ra khi hủy phân công'));
      }
    } catch (error) {
      console.error('Error unassigning:', error);
      alert(error.message || (t.assignUnassignError || 'Có lỗi xảy ra khi hủy phân công'));
    }
  };

  const handleTransfer = async (assignmentId, newAdminId) => {
    try {
      const response = await apiService.updateCollaboratorAssignment(assignmentId, {
        adminId: parseInt(newAdminId),
        notes: 'Chuyển từ AdminBackOffice khác'
      });
      if (response.success) {
        alert(t.assignTransferSuccess || 'Chuyển phân công thành công!');
        loadAssignments();
      } else {
        alert(response.message || (t.assignTransferError || 'Có lỗi xảy ra khi chuyển phân công'));
      }
    } catch (error) {
      console.error('Error transferring:', error);
      alert(error.message || (t.assignTransferError || 'Có lỗi xảy ra khi chuyển phân công'));
    }
  };

  const formatJobStatus = (status) => {
    const info = getJobApplicationStatus(status);
    return info?.label || '—';
  };

  const loadApplicationsForAssignment = async (assignment, adminId) => {
    const key = assignment.id;
    if (expandedAssignmentId === key) {
      setExpandedAssignmentId(null);
      return;
    }
    setExpandedAssignmentId(key);
    if (applicationsByAssignmentId[key]) {
      return;
    }
    try {
      setLoadingApplicationsId(key);
      const cvId = assignment.cvStorageId || assignment.cvStorage?.id;
      const params = {
        cvId,
        adminResponsibleId: adminId,
        sortBy: 'appliedAt',
        sortOrder: 'DESC',
        limit: 50,
        page: 1
      };
      const res = await apiService.getAdminJobApplications(params);
      if (res.success && res.data) {
        const list = res.data.jobApplications || res.data.applications || [];
        setApplicationsByAssignmentId(prev => ({ ...prev, [key]: list }));
      } else {
        setApplicationsByAssignmentId(prev => ({ ...prev, [key]: [] }));
      }
    } catch (e) {
      console.error('Error loading applications for assignment:', e);
      setApplicationsByAssignmentId(prev => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingApplicationsId(null);
    }
  };

  const filteredAdmins = admins.filter(admin => {
    const searchLower = adminSearch.toLowerCase();
    return (
      admin.name.toLowerCase().includes(searchLower) ||
      admin.email.toLowerCase().includes(searchLower) ||
      admin.id.toString().includes(adminSearch)
    );
  });

  const filteredUnassignedCvStorages = unassignedCvStorages.filter(cv => {
    const searchLower = collaboratorSearch.toLowerCase();
    return (
      (cv.name || '').toLowerCase().includes(searchLower) ||
      (cv.email || '').toLowerCase().includes(searchLower) ||
      (cv.code || cv.id || '').toString().includes(collaboratorSearch)
    );
  });

  const handleAdminSelect = (admin) => {
    setSelectedAdminId(admin.id);
    setSelectedAdminName(admin.name);
    setAdminSearch(admin.name);
    setShowAdminDropdown(false);
  };

  const handleCvStorageSelect = (cv) => {
    setSelectedCvStorageId(cv.id);
    setSelectedCvStorageName(cv.name || cv.code || `#${cv.id}`);
    setCollaboratorSearch(cv.name || cv.code || '');
    setShowCollaboratorDropdown(false);
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
                {t.assignPageTitle || 'Phân công hồ sơ ứng viên cho AdminBackOffice'}
              </h1>
              <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: '#6b7280' }}>{t.assignPageSubtitle || 'Giao hồ sơ ứng viên cho AdminBackOffice phụ trách'}</p>
            </div>
          </div>
        </div>

        {/* Quick Assign Form */}
        <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#111827' }}>
              <Plus className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
              {t.assignQuickTitle || 'Phân công hồ sơ nhanh'}
            </h2>
            <button
              type="button"
              onClick={() => setShowQuickAssign(prev => !prev)}
              className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              {showQuickAssign ? (t.assignCollapse || 'Thu gọn') : (t.assignExpand || 'Mở rộng')}
              <ChevronRight className={`w-3 h-3 transition-transform ${showQuickAssign ? 'rotate-90' : ''}`} />
            </button>
          </div>
        {showQuickAssign && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] sm:text-xs font-semibold mb-1" style={{ color: '#374151' }}>
                  {t.assignSelectAdmin || 'Chọn AdminBackOffice'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="relative admin-dropdown-container">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder={t.assignSelectAdminPlaceholder || 'Tìm kiếm AdminBackOffice...'}
                    value={adminSearch}
                    onChange={(e) => {
                      setAdminSearch(e.target.value);
                      setShowAdminDropdown(true);
                    }}
                    onFocus={(e) => {
                      setShowAdminDropdown(true);
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                    className="w-full pl-9 pr-2.5 py-1.5 border rounded-lg text-xs"
                    style={{
                      borderColor: '#d1d5db',
                      outline: 'none'
                    }}
                  />
                  {selectedAdminId && (
                    <button
                      onClick={() => {
                        setSelectedAdminId('');
                        setSelectedAdminName('');
                        setAdminSearch('');
                      }}
                      onMouseEnter={() => setHoveredClearAdminButton(true)}
                      onMouseLeave={() => setHoveredClearAdminButton(false)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      style={{
                        color: hoveredClearAdminButton ? '#4b5563' : '#9ca3af'
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {showAdminDropdown && filteredAdmins.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ backgroundColor: 'white', borderColor: '#d1d5db' }}>
                      {filteredAdmins.map((admin, index) => (
                        <button
                          key={admin.id}
                          type="button"
                          onClick={() => handleAdminSelect(admin)}
                          onMouseEnter={() => setHoveredAdminDropdownItemIndex(index)}
                          onMouseLeave={() => setHoveredAdminDropdownItemIndex(null)}
                          className="w-full px-3 py-2 text-left text-sm flex items-center justify-between"
                          style={{
                            backgroundColor: hoveredAdminDropdownItemIndex === index ? '#f3f4f6' : 'transparent'
                          }}
                        >
                          <div>
                            <div className="font-medium" style={{ color: '#111827' }}>{admin.name}</div>
                            <div className="text-xs" style={{ color: '#6b7280' }}>{admin.email}</div>
                          </div>
                          {selectedAdminId === admin.id && (
                            <Check className="w-4 h-4" style={{ color: '#2563eb' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="h-5 mt-1">
                  {selectedAdminId && (
                    <div className="text-xs" style={{ color: '#2563eb' }}>
                      {t.assignSelectedLabel || 'Đã chọn'}: {selectedAdminName}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] sm:text-xs font-semibold mb-1" style={{ color: '#374151' }}>
                  {t.assignSelectCandidate || 'Chọn hồ sơ ứng viên'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="relative collaborator-dropdown-container">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder={t.assignSelectCandidatePlaceholder || 'Tìm kiếm hồ sơ chưa được giao...'}
                    value={collaboratorSearch}
                    onChange={(e) => {
                      setCollaboratorSearch(e.target.value);
                      setShowCollaboratorDropdown(true);
                    }}
                    onFocus={(e) => {
                      setShowCollaboratorDropdown(true);
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                    className="w-full pl-9 pr-2.5 py-1.5 border rounded-lg text-xs"
                    style={{
                      borderColor: '#d1d5db',
                      outline: 'none'
                    }}
                  />
                  {selectedCvStorageId && (
                    <button
                      onClick={() => {
                        setSelectedCvStorageId('');
                        setSelectedCvStorageName('');
                        setCollaboratorSearch('');
                      }}
                      onMouseEnter={() => setHoveredClearCollaboratorButton(true)}
                      onMouseLeave={() => setHoveredClearCollaboratorButton(false)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      style={{
                        color: hoveredClearCollaboratorButton ? '#4b5563' : '#9ca3af'
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {showCollaboratorDropdown && filteredUnassignedCvStorages.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ backgroundColor: 'white', borderColor: '#d1d5db' }}>
                      {filteredUnassignedCvStorages.map((cv, index) => (
                        <button
                          key={cv.id}
                          type="button"
                          onClick={() => handleCvStorageSelect(cv)}
                          onMouseEnter={() => setHoveredCollaboratorDropdownItemIndex(index)}
                          onMouseLeave={() => setHoveredCollaboratorDropdownItemIndex(null)}
                          className="w-full px-3 py-2 text-left text-sm flex items-center justify-between"
                          style={{
                            backgroundColor: hoveredCollaboratorDropdownItemIndex === index ? '#f3f4f6' : 'transparent'
                          }}
                        >
                          <div>
                            <div className="font-medium" style={{ color: '#111827' }}>{cv.name || cv.code || `#${cv.id}`}</div>
                            <div className="text-xs" style={{ color: '#6b7280' }}>
                              {cv.code || cv.id} • {cv.email}
                            </div>
                          </div>
                          {selectedCvStorageId === cv.id && (
                            <Check className="w-4 h-4" style={{ color: '#2563eb' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="h-5 mt-1">
                  {selectedCvStorageId && (
                    <div className="text-xs" style={{ color: '#2563eb' }}>
                      {t.assignSelectedLabel || 'Đã chọn'}: {selectedCvStorageName}
                    </div>
                  )}
                  {filteredUnassignedCvStorages.length === 0 && collaboratorSearch && (
                    <div className="text-xs" style={{ color: '#6b7280' }}>
                      {t.assignNoProfilesFound || 'Không tìm thấy hồ sơ nào'}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleAssign}
                  disabled={assigning || !selectedAdminId || !selectedCvStorageId}
                  onMouseEnter={() => !(assigning || !selectedAdminId || !selectedCvStorageId) && setHoveredAssignButton(true)}
                  onMouseLeave={() => setHoveredAssignButton(false)}
                  className="w-full px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: (assigning || !selectedAdminId || !selectedCvStorageId)
                      ? '#86efac'
                      : (hoveredAssignButton ? '#15803d' : '#16a34a'),
                    color: 'white',
                    opacity: (assigning || !selectedAdminId || !selectedCvStorageId) ? 0.5 : 1,
                    cursor: (assigning || !selectedAdminId || !selectedCvStorageId) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {assigning ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t.assignAssigning || 'Đang phân công...'}
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      {t.assignButton || 'Phân công'}
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>{t.assignNotesLabel || 'Ghi chú (tùy chọn)'}</label>
              <textarea
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                rows="2"
                placeholder={t.assignNotesPlaceholder || 'Ghi chú về phân công này...'}
                className="w-full px-3 py-2 border rounded-lg text-sm"
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
          </>
        )}
      </div>

      {/* Bulk Assign Section */}
      <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#111827' }}>
            <Plus className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
            {t.assignBulkSectionTitle || 'Phân công hồ sơ hàng loạt'} ({selectedCvStorageIds.size} {t.assignBulkProfilesSelected || 'hồ sơ đã chọn'})
          </h2>
          <button
            type="button"
            onClick={() => setShowBulkAssign((prev) => !prev)}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            {showBulkAssign ? (t.assignCollapse || 'Thu gọn') : (t.assignExpand || 'Mở rộng')}
            <ChevronRight className={`w-3 h-3 transition-transform ${showBulkAssign ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {showBulkAssign && (
          <>
            {/* Dòng chọn AdminBackOffice + nút phân công */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>
                  {t.assignBulkSelectAdmin || 'Chọn AdminBackOffice phụ trách'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="relative admin-dropdown-container">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder={t.assignSelectAdminPlaceholder || 'Tìm kiếm AdminBackOffice...'}
                    value={adminSearch}
                    onChange={(e) => {
                      setAdminSearch(e.target.value);
                      setShowAdminDropdown(true);
                    }}
                    onFocus={(e) => {
                      setShowAdminDropdown(true);
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                    style={{
                      borderColor: '#d1d5db',
                      outline: 'none'
                    }}
                  />
                  {selectedAdminId && (
                    <button
                      onClick={() => {
                        setSelectedAdminId('');
                        setSelectedAdminName('');
                        setAdminSearch('');
                      }}
                      onMouseEnter={() => setHoveredClearAdminButton(true)}
                      onMouseLeave={() => setHoveredClearAdminButton(false)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      style={{
                        color: hoveredClearAdminButton ? '#4b5563' : '#9ca3af'
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {showAdminDropdown && filteredAdmins.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ backgroundColor: 'white', borderColor: '#d1d5db' }}>
                      {filteredAdmins.map((admin, index) => (
                        <button
                          key={admin.id}
                          type="button"
                          onClick={() => handleAdminSelect(admin)}
                          onMouseEnter={() => setHoveredAdminDropdownItemIndex(index)}
                          onMouseLeave={() => setHoveredAdminDropdownItemIndex(null)}
                          className="w-full px-3 py-2 text-left text-sm flex items-center justify-between"
                          style={{
                            backgroundColor: hoveredAdminDropdownItemIndex === index ? '#f3f4f6' : 'transparent'
                          }}
                        >
                          <div>
                            <div className="font-medium" style={{ color: '#111827' }}>{admin.name}</div>
                            <div className="text-xs" style={{ color: '#6b7280' }}>{admin.email}</div>
                          </div>
                          {selectedAdminId === admin.id && (
                            <Check className="w-4 h-4" style={{ color: '#2563eb' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleBulkAssign}
                  disabled={assigning || !selectedAdminId || selectedCvStorageIds.size === 0}
                  onMouseEnter={() => !(assigning || !selectedAdminId || selectedCvStorageIds.size === 0) && setHoveredBulkAssignButton(true)}
                  onMouseLeave={() => setHoveredBulkAssignButton(false)}
                  className="w-full px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: (assigning || !selectedAdminId || selectedCvStorageIds.size === 0)
                      ? '#93c5fd'
                      : (hoveredBulkAssignButton ? '#1d4ed8' : '#2563eb'),
                    color: 'white',
                    opacity: (assigning || !selectedAdminId || selectedCvStorageIds.size === 0) ? 0.5 : 1,
                    cursor: (assigning || !selectedAdminId || selectedCvStorageIds.size === 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {assigning ? (t.assignAssigning || 'Đang phân công...') : `${t.assignBulkAssignCount || 'Phân công'} ${selectedCvStorageIds.size} ${t.assignProfilesCount || 'hồ sơ'}`}
                </button>
              </div>
            </div>

            {/* Tìm theo CTV / Admin để tự động chọn tất cả hồ sơ của họ */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bulk-collaborator-search-container">
                <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>
                  {t.assignSearchByCtv || 'Tìm theo CTV (chọn để lấy tất cả hồ sơ của CTV)'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder={t.assignSearchByCtvPlaceholder || 'Nhập tên, email hoặc mã CTV...'}
                    value={bulkCollaboratorSearch}
                    onChange={(e) => {
                      setBulkCollaboratorSearch(e.target.value);
                    }}
                    onFocus={() => {
                      if (bulkCollaboratorResults.length > 0) {
                        setShowBulkCollaboratorDropdown(true);
                      }
                    }}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                    style={{
                      borderColor: '#d1d5db',
                      outline: 'none'
                    }}
                  />
                  {bulkCollaboratorSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setBulkCollaboratorSearch('');
                        setBulkCollaboratorResults([]);
                        setShowBulkCollaboratorDropdown(false);
                        setSelectedBulkCollaborator(null);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {showBulkCollaboratorDropdown && bulkCollaboratorResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto bg-white" style={{ borderColor: '#d1d5db' }}>
                      {bulkCollaboratorResults.map((collab, index) => (
                        <button
                          key={collab.id}
                          type="button"
                          onClick={() => handleSelectBulkCollaborator(collab)}
                          onMouseEnter={() => setHoveredBulkCollaboratorResultIndex(index)}
                          onMouseLeave={() => setHoveredBulkCollaboratorResultIndex(null)}
                          className="w-full px-3 py-2 text-left text-sm flex items-center justify-between"
                          style={{
                            backgroundColor: hoveredBulkCollaboratorResultIndex === index ? '#f3f4f6' : 'transparent'
                          }}
                        >
                          <div>
                            <div className="font-medium" style={{ color: '#111827' }}>{collab.name}</div>
                            <div className="text-xs" style={{ color: '#6b7280' }}>
                              {collab.email} {collab.code && `• ${collab.code}`}
                            </div>
                          </div>
                          {selectedBulkCollaborator && selectedBulkCollaborator.id === collab.id && (
                            <Check className="w-4 h-4" style={{ color: '#2563eb' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[11px]" style={{ color: '#6b7280' }}>
                  {t.assignBulkCtvHint || 'Khi chọn CTV, hệ thống sẽ tự động chọn tất cả hồ sơ ứng viên thuộc CTV đó để phân công cho AdminBackOffice đã chọn.'}
                </p>
              </div>

              <div className="bulk-owner-admin-search-container">
                <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>
                  {t.assignSearchByAdmin || 'Tìm theo Admin (chọn để lấy tất cả hồ sơ của Admin)'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder={t.assignSearchByAdminPlaceholder || 'Nhập tên, email hoặc mã Admin...'}
                    value={bulkOwnerAdminSearch}
                    onChange={(e) => {
                      setBulkOwnerAdminSearch(e.target.value);
                    }}
                    onFocus={() => {
                      if (bulkOwnerAdminResults.length > 0) {
                        setShowBulkOwnerAdminDropdown(true);
                      }
                    }}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                    style={{
                      borderColor: '#d1d5db',
                      outline: 'none'
                    }}
                  />
                  {bulkOwnerAdminSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setBulkOwnerAdminSearch('');
                        setBulkOwnerAdminResults([]);
                        setShowBulkOwnerAdminDropdown(false);
                        setSelectedBulkOwnerAdmin(null);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {showBulkOwnerAdminDropdown && bulkOwnerAdminResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto bg-white" style={{ borderColor: '#d1d5db' }}>
                      {bulkOwnerAdminResults.map((ownerAdmin, index) => (
                        <button
                          key={ownerAdmin.id}
                          type="button"
                          onClick={() => handleSelectBulkOwnerAdmin(ownerAdmin)}
                          onMouseEnter={() => setHoveredBulkOwnerAdminResultIndex(index)}
                          onMouseLeave={() => setHoveredBulkOwnerAdminResultIndex(null)}
                          className="w-full px-3 py-2 text-left text-sm flex items-center justify-between"
                          style={{
                            backgroundColor: hoveredBulkOwnerAdminResultIndex === index ? '#f3f4f6' : 'transparent'
                          }}
                        >
                          <div>
                            <div className="font-medium" style={{ color: '#111827' }}>{ownerAdmin.name}</div>
                            <div className="text-xs" style={{ color: '#6b7280' }}>
                              {ownerAdmin.email} {ownerAdmin.code && `• ${ownerAdmin.code}`}
                            </div>
                          </div>
                          {selectedBulkOwnerAdmin && selectedBulkOwnerAdmin.id === ownerAdmin.id && (
                            <Check className="w-4 h-4" style={{ color: '#2563eb' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[11px]" style={{ color: '#6b7280' }}>
                  {t.assignBulkAdminHint || 'Khi chọn Admin, hệ thống sẽ tự động chọn tất cả hồ sơ ứng viên đang thuộc Admin đó để phân công cho AdminBackOffice đã chọn.'}
                </p>
              </div>
            </div>

            <div className="mt-4 border rounded-lg max-h-96 overflow-y-auto" style={{ borderColor: '#e5e7eb' }}>
              <div className="p-2 border-b flex items-center justify-between" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                <span className="text-xs font-semibold" style={{ color: '#374151' }}>
                  {selectedBulkCollaborator
                    ? `${t.assignBulkListOfCtv || 'Danh sách hồ sơ ứng viên của CTV'} ${selectedBulkCollaborator.name || selectedBulkCollaborator.code || ''} (${bulkCvList.length})`
                    : selectedBulkOwnerAdmin
                      ? `${t.assignBulkListOfAdmin || 'Danh sách hồ sơ ứng viên của Admin'} ${selectedBulkOwnerAdmin.name || ''} (${bulkCvList.length})`
                      : `${t.assignBulkListTitle || 'Danh sách hồ sơ ứng viên'} (${bulkCvList.length})`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedCvStorageIds.size === bulkCvList.length) {
                        setSelectedCvStorageIds(new Set());
                      } else {
                        setSelectedCvStorageIds(new Set(bulkCvList.map(c => c.id)));
                      }
                    }}
                    onMouseEnter={() => setHoveredSelectAllButton(true)}
                    onMouseLeave={() => setHoveredSelectAllButton(false)}
                    className="text-xs"
                    style={{
                      color: hoveredSelectAllButton ? '#1e40af' : '#2563eb'
                    }}
                  >
                    {selectedCvStorageIds.size === bulkCvList.length ? (t.assignDeselectAll || 'Bỏ chọn tất cả') : (t.assignSelectAll || 'Chọn tất cả')}
                  </button>
                </div>
              </div>
              {bulkCvListLoading ? (
                <div className="p-3 text-xs" style={{ color: '#6b7280' }}>{t.assignLoadingList || 'Đang tải danh sách hồ sơ...'}</div>
              ) : bulkCvList.length === 0 ? (
                <div className="p-3 text-xs" style={{ color: '#6b7280' }}>
                  {selectedBulkCollaborator || selectedBulkOwnerAdmin
                    ? (t.assignNoProfilesForCtvAdmin || 'Không tìm thấy hồ sơ ứng viên nào cho CTV/Admin này.')
                    : (t.assignPleaseSelectCtvAdmin || 'Vui lòng chọn CTV hoặc Admin để hiển thị danh sách hồ sơ.')}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#e5e7eb' }}>
                  {bulkCvList.map((cv, index) => (
                    <div
                      key={cv.id}
                      className="p-3 flex items-center gap-3 cursor-pointer transition-colors"
                      onMouseEnter={() => setHoveredCollaboratorItemIndex(index)}
                      onMouseLeave={() => setHoveredCollaboratorItemIndex(null)}
                      onClick={() => {
                        const newSet = new Set(selectedCvStorageIds);
                        if (newSet.has(cv.id)) {
                          newSet.delete(cv.id);
                        } else {
                          newSet.add(cv.id);
                        }
                        setSelectedCvStorageIds(newSet);
                      }}
                      style={{
                        backgroundColor: selectedCvStorageIds.has(cv.id)
                          ? '#eff6ff'
                          : (hoveredCollaboratorItemIndex === index ? '#f9fafb' : 'transparent')
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCvStorageIds.has(cv.id)}
                        onChange={() => {}}
                        className="w-4 h-4 rounded"
                        style={{
                          accentColor: '#2563eb',
                          borderColor: '#d1d5db'
                        }}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: '#111827' }}>{cv.name || cv.code || `#${cv.id}`}</div>
                        <div className="text-xs" style={{ color: '#6b7280' }}>{cv.email} {cv.code && `• ${cv.code}`}</div>
                      </div>
                      {selectedCvStorageIds.has(cv.id) && (
                        <Check className="w-4 h-4" style={{ color: '#2563eb' }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

        {/* Filters */}
        <div className="assign-filters-container flex items-center gap-2.5 flex-wrap justify-between flex-shrink-0">
          <div className="flex items-center px-3 py-1.5 rounded-full bg-white text-[12px] sm:text-[13px] min-w-[220px] flex-1" style={{ border: '1px solid #e5e7eb' }}>
            <Search className="w-3.5 h-3.5 mr-2 flex-shrink-0" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder={t.assignFilterSearchPlaceholder || 'Tên, email, mã hồ sơ...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none min-w-0 text-[12px] sm:text-[13px]"
            />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsAdminFilterOpen(!isAdminFilterOpen);
                  setIsStatusFilterOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[11px] sm:text-xs font-semibold"
                style={{ color: '#374151', border: '1px solid #e5e7eb' }}
              >
                {adminFilter ? (admins.find(a => a.id == adminFilter)?.name || t.assignFilterAdmin) : (t.assignFilterAdmin || 'AdminBackOffice')}
                <ChevronDown className="w-3 h-3" />
              </button>
              {isAdminFilterOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <label className="flex items-center gap-1.5 cursor-pointer py-0.5">
                    <input type="radio" name="assign-admin" checked={adminFilter === ''} onChange={() => { setAdminFilter(''); setCurrentPage(1); }} className="w-3.5 h-3.5" />
                    <span>{t.allStatus || 'Tất cả'}</span>
                  </label>
                  {admins.map(admin => (
                    <label key={admin.id} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                      <input type="radio" name="assign-admin" checked={String(adminFilter) === String(admin.id)} onChange={() => { setAdminFilter(admin.id); setCurrentPage(1); }} className="w-3.5 h-3.5" />
                      <span>{admin.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsStatusFilterOpen(!isStatusFilterOpen);
                  setIsAdminFilterOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[11px] sm:text-xs font-semibold"
                style={{ color: '#374151', border: '1px solid #e5e7eb' }}
              >
                {statusFilter === '1' ? (t.assignStatusActive || 'Đang hoạt động') : statusFilter === '0' ? (t.assignStatusCancelled || 'Đã hủy') : (t.assignFilterStatus || 'Trạng thái')}
                <ChevronDown className="w-3 h-3" />
              </button>
              {isStatusFilterOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <label className="flex items-center gap-1.5 cursor-pointer py-0.5">
                    <input type="radio" name="assign-status" checked={statusFilter === ''} onChange={() => { setStatusFilter(''); setCurrentPage(1); }} className="w-3.5 h-3.5" />
                    <span>{t.allStatus || 'Tất cả'}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer py-0.5">
                    <input type="radio" name="assign-status" checked={statusFilter === '1'} onChange={() => { setStatusFilter('1'); setCurrentPage(1); }} className="w-3.5 h-3.5" />
                    <span>{t.assignStatusActive || 'Đang hoạt động'}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer py-0.5">
                    <input type="radio" name="assign-status" checked={statusFilter === '0'} onChange={() => { setStatusFilter('0'); setCurrentPage(1); }} className="w-3.5 h-3.5" />
                    <span>{t.assignStatusCancelled || 'Đã hủy'}</span>
                  </label>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors"
              style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
            >
              {t.resetFilter || 'Xóa lọc'}
            </button>
          </div>
        </div>

        {/* Assignments - multiple level dropdown by AdminBackOffice */}
        <div className="rounded-lg border overflow-hidden flex-1 min-h-0 flex flex-col" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="p-2.5 border-b flex items-center" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
            <h2 className="text-xs font-bold" style={{ color: '#111827' }}>
              Danh sách admin &amp; tình trạng quản lý
            </h2>
          </div>
          {loading ? (
            <div className="p-6 text-center flex-1 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2563eb' }}></div>
              <p className="mt-2 text-xs" style={{ color: '#6b7280' }}>{t.loadingData || 'Đang tải...'}</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-6 text-center flex-1 flex flex-col items-center justify-center">
              <UserCheck className="w-10 h-10 mb-2" style={{ color: '#9ca3af' }} />
              <p className="text-xs" style={{ color: '#6b7280' }}>{t.assignNoAssignments || 'Chưa có phân công nào'}</p>
            </div>
        ) : (
          <>
            {Object.values(
              assignments.reduce((acc, assignment) => {
                const adminId = assignment.admin?.id || assignment.adminId || 0;
                if (!acc[adminId]) {
                  acc[adminId] = {
                    adminId,
                    adminName: assignment.admin?.name || (t.assignNoAdmin || 'Chưa có Admin'),
                    adminEmail: assignment.admin?.email || '',
                    assignments: []
                  };
                }
                acc[adminId].assignments.push(assignment);
                return acc;
              }, {})
            ).map((group) => (
              <div key={group.adminId || 'none'} className="border-b last:border-b-0" style={{ borderColor: '#e5e7eb' }}>
                <button
                  type="button"
                  onClick={() => setExpandedAdminId((prev) => (prev === group.adminId ? null : group.adminId))}
                  className="w-full px-2.5 py-2 flex items-center justify-between text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                    <div>
                      <div className="text-[10px] sm:text-xs font-semibold" style={{ color: '#111827' }}>
                        {group.adminName}
                      </div>
                      {group.adminEmail && (
                        <div className="text-[10px]" style={{ color: '#6b7280' }}>
                          {group.adminEmail}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                      {group.assignments.length} {t.assignProfilesCount || 'hồ sơ'}
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${expandedAdminId === group.adminId ? 'transform rotate-90' : ''}`}
                      style={{ color: '#6b7280' }}
                    />
                  </div>
                </button>
                {expandedAdminId === group.adminId && (
                  <div className="px-2.5 pb-2">
                    <div className="mt-1.5 rounded border" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-[10px] sm:text-xs">
                          <thead>
                            <tr className="border-b" style={{ borderColor: '#e5e7eb' }}>
                              <th className="px-2.5 py-1.5 text-left font-semibold" style={{ color: '#374151' }}>{t.assignColCandidate || 'Hồ sơ ứng viên'}</th>
                              <th className="px-2.5 py-1.5 text-left font-semibold" style={{ color: '#374151' }}>{t.assignColAssignedBy || 'Người phân công'}</th>
                              <th className="px-2.5 py-1.5 text-left font-semibold" style={{ color: '#374151' }}>{t.assignColAssignedDate || 'Ngày phân công'}</th>
                              <th className="px-2.5 py-1.5 text-left font-semibold" style={{ color: '#374151' }}>{t.assignColNotes || 'Ghi chú'}</th>
                              <th className="px-2.5 py-1.5 text-left font-semibold" style={{ color: '#374151' }}>{t.assignColStatus || 'Trạng thái'}</th>
                              <th className="px-2.5 py-1.5 text-left font-semibold" style={{ color: '#374151' }}>{t.colActions || 'Thao tác'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.assignments.map((assignment) => {
                              const apps = applicationsByAssignmentId[assignment.id] || [];
                              const isExpanded = expandedAssignmentId === assignment.id;
                              return (
                                <React.Fragment key={assignment.id}>
                                  <tr
                                    className="border-b last:border-b-0"
                                    style={{ borderColor: '#e5e7eb', backgroundColor: hoveredRowIndex === assignment.id ? '#f3f4f6' : 'transparent' }}
                                    onMouseEnter={() => setHoveredRowIndex(assignment.id)}
                                    onMouseLeave={() => setHoveredRowIndex(null)}
                                  >
                                    <td className="px-2.5 py-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <User className="w-3 h-3" style={{ color: '#9ca3af' }} />
                                        <div className="min-w-0">
                                          <div className="text-[10px] sm:text-xs font-medium truncate" style={{ color: '#111827' }}>
                                            {assignment.cvStorage?.name || assignment.cvStorage?.code || '—'}
                                          </div>
                                          <div className="text-[10px] truncate" style={{ color: '#6b7280' }}>
                                            {assignment.cvStorage?.email || '—'} {assignment.cvStorage?.code && `• ${assignment.cvStorage.code}`}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-2.5 py-1.5">
                                      <div className="text-[10px] sm:text-xs" style={{ color: '#111827' }}>
                                        {assignment.assignedByAdmin?.name || '—'}
                                      </div>
                                      <div className="text-[10px]" style={{ color: '#6b7280' }}>
                                        {assignment.assignedByAdmin?.email || '—'}
                                      </div>
                                    </td>
                                    <td className="px-2.5 py-1.5">
                                      <div className="text-[10px] sm:text-xs" style={{ color: '#111827' }}>
                                        {formatDate(assignment.createdAt || assignment.created_at)}
                                      </div>
                                    </td>
                                    <td className="px-2.5 py-1.5">
                                      <div className="text-[10px] max-w-xs truncate" style={{ color: '#4b5563' }}>
                                        {assignment.notes || '—'}
                                      </div>
                                    </td>
                                    <td className="px-2.5 py-1.5">
                                      <span
                                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                        style={{
                                          backgroundColor: assignment.status === 1 ? '#dcfce7' : '#f3f4f6',
                                          color: assignment.status === 1 ? '#166534' : '#1f2937'
                                        }}
                                      >
                                        {assignment.status === 1 ? (t.assignStatusActive || 'Đang hoạt động') : (t.assignStatusCancelled || 'Đã hủy')}
                                      </span>
                                    </td>
                                    <td className="px-2.5 py-1.5">
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => loadApplicationsForAssignment(assignment, group.adminId)}
                                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors"
                                          style={{
                                            borderColor: '#bfdbfe',
                                            backgroundColor: isExpanded ? '#eff6ff' : '#ffffff',
                                            color: '#1d4ed8'
                                          }}
                                        >
                                          {t.assignNominationsButton || 'Đơn tiến cử'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUnassign(assignment.id)}
                                          onMouseEnter={() => setHoveredUnassignButtonIndex(assignment.id)}
                                          onMouseLeave={() => setHoveredUnassignButtonIndex(null)}
                                          className="px-2 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-colors"
                                          style={{
                                            color: hoveredUnassignButtonIndex === assignment.id ? '#991b1b' : '#dc2626',
                                            backgroundColor: hoveredUnassignButtonIndex === assignment.id ? '#fef2f2' : 'transparent'
                                          }}
                                          title={t.assignUnassignTooltip || 'Hủy phân công'}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr className="border-b last:border-b-0" style={{ borderColor: '#e5e7eb' }}>
                                      <td colSpan={6} className="px-3 pb-3 pt-1">
                                        <div className="rounded-lg border bg-white" style={{ borderColor: '#e5e7eb' }}>
                                          <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: '#e5e7eb' }}>
                                            <span className="text-[11px] font-semibold" style={{ color: '#111827' }}>
                                              {t.assignNominationsByAdmin || 'Đơn tiến cử do Admin này phụ trách'}
                                            </span>
                                            {loadingApplicationsId === assignment.id && (
                                              <span className="text-[11px]" style={{ color: '#6b7280' }}>
                                                {t.myAssignedLoading || 'Đang tải...'}
                                              </span>
                                            )}
                                          </div>
                                          <div className="max-h-56 overflow-y-auto">
                                            {loadingApplicationsId === assignment.id ? (
                                              <div className="px-3 py-2 text-[11px]" style={{ color: '#6b7280' }}>
                                                {t.assignLoadingNominations || 'Đang tải đơn tiến cử...'}
                                              </div>
                                            ) : apps.length === 0 ? (
                                              <div className="px-3 py-2 text-[11px]" style={{ color: '#6b7280' }}>
                                                {t.assignNoNominations || 'Không có đơn tiến cử do Admin này phụ trách cho hồ sơ này.'}
                                              </div>
                                            ) : (
                                              <table className="w-full text-[11px]">
                                                <thead>
                                                  <tr className="border-b" style={{ borderColor: '#e5e7eb' }}>
                                                    <th className="px-3 py-1 text-left font-semibold" style={{ color: '#374151' }}>{t.colId || 'ID'}</th>
                                                    <th className="px-3 py-1 text-left font-semibold" style={{ color: '#374151' }}>{t.assignColApplicant || 'Ứng viên'}</th>
                                                    <th className="px-3 py-1 text-left font-semibold" style={{ color: '#374151' }}>{t.assignColJob || 'Job'}</th>
                                                    <th className="px-3 py-1 text-left font-semibold" style={{ color: '#374151' }}>{t.assignColStatus || 'Trạng thái'}</th>
                                                    <th className="px-3 py-1 text-left font-semibold" style={{ color: '#374151' }}>{t.assignColNominationDate || 'Ngày tiến cử'}</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {apps.map(app => (
                                                    <tr key={app.id} className="border-b last:border-b-0" style={{ borderColor: '#e5e7eb' }}>
                                                      <td className="px-3 py-1">
                                                        <span style={{ color: '#2563eb', cursor: 'pointer' }}>
                                                          {app.id}
                                                        </span>
                                                      </td>
                                                      <td className="px-3 py-1" style={{ color: '#111827' }}>
                                                        {app.cv?.name || app.name || '—'}
                                                      </td>
                                                      <td className="px-3 py-1" style={{ color: '#111827' }}>
                                                        {app.job?.title || app.job?.jobCode || '—'}
                                                      </td>
                                                      <td className="px-3 py-1" style={{ color: '#111827' }}>
                                                        {formatJobStatus(app.status)}
                                                      </td>
                                                      <td className="px-3 py-1" style={{ color: '#111827' }}>
                                                        {formatDate(app.appliedAt)}
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
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
                    onMouseEnter={() => currentPage !== pagination.totalPages && setHoveredPaginationNavButton('next')}
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
                    onMouseEnter={() => currentPage !== pagination.totalPages && setHoveredPaginationNavButton('last')}
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

        {/* Bulk Assign Section */}
        <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb', display: 'none' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#111827' }}>
              <Plus className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
              {t.assignBulkSectionTitle || 'Phân công hồ sơ hàng loạt'} ({selectedCvStorageIds.size} {t.assignBulkProfilesSelected || 'hồ sơ đã chọn'})
            </h2>
            <button
              type="button"
              onClick={() => setShowBulkAssign((prev) => !prev)}
              className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              {showBulkAssign ? (t.assignCollapse || 'Thu gọn') : (t.assignExpand || 'Mở rộng')}
              <ChevronRight className={`w-3 h-3 transition-transform ${showBulkAssign ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {showBulkAssign && (
            <>
              {/* Dòng chọn AdminBackOffice + nút phân công */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>
                {t.assignBulkSelectAdmin || 'Chọn AdminBackOffice phụ trách'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="relative admin-dropdown-container">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder={t.assignSelectAdminPlaceholder || 'Tìm kiếm AdminBackOffice...'}
                  value={adminSearch}
                  onChange={(e) => {
                    setAdminSearch(e.target.value);
                    setShowAdminDropdown(true);
                  }}
                  onFocus={(e) => {
                    setShowAdminDropdown(true);
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                  style={{
                    borderColor: '#d1d5db',
                    outline: 'none'
                  }}
                />
                {selectedAdminId && (
                  <button
                    onClick={() => {
                      setSelectedAdminId('');
                      setSelectedAdminName('');
                      setAdminSearch('');
                    }}
                    onMouseEnter={() => setHoveredClearAdminButton(true)}
                    onMouseLeave={() => setHoveredClearAdminButton(false)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    style={{
                      color: hoveredClearAdminButton ? '#4b5563' : '#9ca3af'
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showAdminDropdown && filteredAdmins.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ backgroundColor: 'white', borderColor: '#d1d5db' }}>
                    {filteredAdmins.map((admin, index) => (
                      <button
                        key={admin.id}
                        type="button"
                        onClick={() => handleAdminSelect(admin)}
                        onMouseEnter={() => setHoveredAdminDropdownItemIndex(index)}
                        onMouseLeave={() => setHoveredAdminDropdownItemIndex(null)}
                        className="w-full px-3 py-2 text-left text-sm flex items-center justify-between"
                        style={{
                          backgroundColor: hoveredAdminDropdownItemIndex === index ? '#f3f4f6' : 'transparent'
                        }}
                      >
                        <div>
                          <div className="font-medium" style={{ color: '#111827' }}>{admin.name}</div>
                          <div className="text-xs" style={{ color: '#6b7280' }}>{admin.email}</div>
                        </div>
                        {selectedAdminId === admin.id && (
                          <Check className="w-4 h-4" style={{ color: '#2563eb' }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleBulkAssign}
                disabled={assigning || !selectedAdminId || selectedCvStorageIds.size === 0}
                onMouseEnter={() => !(assigning || !selectedAdminId || selectedCvStorageIds.size === 0) && setHoveredBulkAssignButton(true)}
                onMouseLeave={() => setHoveredBulkAssignButton(false)}
                className="w-full px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: (assigning || !selectedAdminId || selectedCvStorageIds.size === 0)
                    ? '#93c5fd'
                    : (hoveredBulkAssignButton ? '#1d4ed8' : '#2563eb'),
                  color: 'white',
                  opacity: (assigning || !selectedAdminId || selectedCvStorageIds.size === 0) ? 0.5 : 1,
                  cursor: (assigning || !selectedAdminId || selectedCvStorageIds.size === 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {assigning ? (t.assignAssigning || 'Đang phân công...') : `${t.assignBulkAssignCount || 'Phân công'} ${selectedCvStorageIds.size} ${t.assignProfilesCount || 'hồ sơ'}`}
              </button>
            </div>
          </div>

          {/* Tìm theo CTV / Admin để tự động chọn tất cả hồ sơ của họ */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bulk-collaborator-search-container">
              <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>
                {t.assignSearchByCtv || 'Tìm theo CTV (chọn để lấy tất cả hồ sơ của CTV)'}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder={t.assignSearchByCtvPlaceholder || 'Nhập tên, email hoặc mã CTV...'}
                  value={bulkCollaboratorSearch}
                  onChange={(e) => {
                    setBulkCollaboratorSearch(e.target.value);
                  }}
                  onFocus={() => {
                    if (bulkCollaboratorResults.length > 0) {
                      setShowBulkCollaboratorDropdown(true);
                    }
                  }}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                  style={{
                    borderColor: '#d1d5db',
                    outline: 'none'
                  }}
                />
                {bulkCollaboratorSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setBulkCollaboratorSearch('');
                      setBulkCollaboratorResults([]);
                      setShowBulkCollaboratorDropdown(false);
                      setSelectedBulkCollaborator(null);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showBulkCollaboratorDropdown && bulkCollaboratorResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto bg-white" style={{ borderColor: '#d1d5db' }}>
                    {bulkCollaboratorResults.map((collab, index) => (
                      <button
                        key={collab.id}
                        type="button"
                        onClick={() => handleSelectBulkCollaborator(collab)}
                        onMouseEnter={() => setHoveredBulkCollaboratorResultIndex(index)}
                        onMouseLeave={() => setHoveredBulkCollaboratorResultIndex(null)}
                        className="w-full px-3 py-2 text-left text-sm flex items-center justify-between"
                        style={{
                          backgroundColor: hoveredBulkCollaboratorResultIndex === index ? '#f3f4f6' : 'transparent'
                        }}
                      >
                        <div>
                          <div className="font-medium" style={{ color: '#111827' }}>{collab.name}</div>
                          <div className="text-xs" style={{ color: '#6b7280' }}>
                            {collab.email} {collab.code && `• ${collab.code}`}
                          </div>
                        </div>
                        {selectedBulkCollaborator && selectedBulkCollaborator.id === collab.id && (
                          <Check className="w-4 h-4" style={{ color: '#2563eb' }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1 text-[11px]" style={{ color: '#6b7280' }}>
                {t.assignBulkCtvHint || 'Khi chọn CTV, hệ thống sẽ tự động chọn tất cả hồ sơ ứng viên thuộc CTV đó để phân công cho AdminBackOffice đã chọn.'}
              </p>
            </div>

            <div className="bulk-owner-admin-search-container">
              <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>
                {t.assignSearchByAdmin || 'Tìm theo Admin (chọn để lấy tất cả hồ sơ của Admin)'}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder={t.assignSearchByAdminPlaceholder || 'Nhập tên, email hoặc mã Admin...'}
                  value={bulkOwnerAdminSearch}
                  onChange={(e) => {
                    setBulkOwnerAdminSearch(e.target.value);
                  }}
                  onFocus={() => {
                    if (bulkOwnerAdminResults.length > 0) {
                      setShowBulkOwnerAdminDropdown(true);
                    }
                  }}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                  style={{
                    borderColor: '#d1d5db',
                    outline: 'none'
                  }}
                />
                {bulkOwnerAdminSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setBulkOwnerAdminSearch('');
                      setBulkOwnerAdminResults([]);
                      setShowBulkOwnerAdminDropdown(false);
                      setSelectedBulkOwnerAdmin(null);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showBulkOwnerAdminDropdown && bulkOwnerAdminResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto bg-white" style={{ borderColor: '#d1d5db' }}>
                    {bulkOwnerAdminResults.map((ownerAdmin, index) => (
                      <button
                        key={ownerAdmin.id}
                        type="button"
                        onClick={() => handleSelectBulkOwnerAdmin(ownerAdmin)}
                        onMouseEnter={() => setHoveredBulkOwnerAdminResultIndex(index)}
                        onMouseLeave={() => setHoveredBulkOwnerAdminResultIndex(null)}
                        className="w-full px-3 py-2 text-left text-sm flex items-center justify-between"
                        style={{
                          backgroundColor: hoveredBulkOwnerAdminResultIndex === index ? '#f3f4f6' : 'transparent'
                        }}
                      >
                        <div>
                          <div className="font-medium" style={{ color: '#111827' }}>{ownerAdmin.name}</div>
                          <div className="text-xs" style={{ color: '#6b7280' }}>
                            {ownerAdmin.email} {ownerAdmin.code && `• ${ownerAdmin.code}`}
                          </div>
                        </div>
                        {selectedBulkOwnerAdmin && selectedBulkOwnerAdmin.id === ownerAdmin.id && (
                          <Check className="w-4 h-4" style={{ color: '#2563eb' }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1 text-[11px]" style={{ color: '#6b7280' }}>
                {t.assignBulkAdminHint || 'Khi chọn Admin, hệ thống sẽ tự động chọn tất cả hồ sơ ứng viên đang thuộc Admin đó để phân công cho AdminBackOffice đã chọn.'}
              </p>
            </div>
          </div>

          <div className="mt-4 border rounded-lg max-h-96 overflow-y-auto" style={{ borderColor: '#e5e7eb' }}>
            <div className="p-2 border-b flex items-center justify-between" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
              <span className="text-xs font-semibold" style={{ color: '#374151' }}>
                {selectedBulkCollaborator
                  ? `${t.assignBulkListOfCtv || 'Danh sách hồ sơ ứng viên của CTV'} ${selectedBulkCollaborator.name || selectedBulkCollaborator.code || ''} (${bulkCvList.length})`
                  : selectedBulkOwnerAdmin
                    ? `${t.assignBulkListOfAdmin || 'Danh sách hồ sơ ứng viên của Admin'} ${selectedBulkOwnerAdmin.name || ''} (${bulkCvList.length})`
                    : `${t.assignBulkListTitle || 'Danh sách hồ sơ ứng viên'} (${bulkCvList.length})`}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (selectedCvStorageIds.size === bulkCvList.length) {
                      setSelectedCvStorageIds(new Set());
                    } else {
                      setSelectedCvStorageIds(new Set(bulkCvList.map(c => c.id)));
                    }
                  }}
                  onMouseEnter={() => setHoveredSelectAllButton(true)}
                  onMouseLeave={() => setHoveredSelectAllButton(false)}
                  className="text-xs"
                  style={{
                    color: hoveredSelectAllButton ? '#1e40af' : '#2563eb'
                  }}
                >
                  {selectedCvStorageIds.size === bulkCvList.length ? (t.assignDeselectAll || 'Bỏ chọn tất cả') : (t.assignSelectAll || 'Chọn tất cả')}
                </button>
              </div>
            </div>
            {bulkCvListLoading ? (
              <div className="p-3 text-xs" style={{ color: '#6b7280' }}>{t.assignLoadingList || 'Đang tải danh sách hồ sơ...'}</div>
            ) : bulkCvList.length === 0 ? (
              <div className="p-3 text-xs" style={{ color: '#6b7280' }}>
                {selectedBulkCollaborator || selectedBulkOwnerAdmin
                  ? (t.assignNoProfilesForCtvAdmin || 'Không tìm thấy hồ sơ ứng viên nào cho CTV/Admin này.')
                  : (t.assignPleaseSelectCtvAdmin || 'Vui lòng chọn CTV hoặc Admin để hiển thị danh sách hồ sơ.')}
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#e5e7eb' }}>
                {bulkCvList.map((cv, index) => (
                  <div
                    key={cv.id}
                    className="p-3 flex items-center gap-3 cursor-pointer transition-colors"
                    onMouseEnter={() => setHoveredCollaboratorItemIndex(index)}
                    onMouseLeave={() => setHoveredCollaboratorItemIndex(null)}
                    onClick={() => {
                      const newSet = new Set(selectedCvStorageIds);
                      if (newSet.has(cv.id)) {
                        newSet.delete(cv.id);
                      } else {
                        newSet.add(cv.id);
                      }
                      setSelectedCvStorageIds(newSet);
                    }}
                    style={{
                      backgroundColor: selectedCvStorageIds.has(cv.id)
                        ? '#eff6ff'
                        : (hoveredCollaboratorItemIndex === index ? '#f9fafb' : 'transparent')
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCvStorageIds.has(cv.id)}
                      onChange={() => {}}
                      className="w-4 h-4 rounded"
                      style={{
                        accentColor: '#2563eb',
                        borderColor: '#d1d5db'
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: '#111827' }}>{cv.name || cv.code || `#${cv.id}`}</div>
                      <div className="text-xs" style={{ color: '#6b7280' }}>{cv.email} {cv.code && `• ${cv.code}`}</div>
                    </div>
                    {selectedCvStorageIds.has(cv.id) && (
                      <Check className="w-4 h-4" style={{ color: '#2563eb' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaboratorAssignmentsPage;

