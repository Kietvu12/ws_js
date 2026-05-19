import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import {
  Search,
  Plus,
  Settings,
  Info,
  ExternalLink,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronsUpDown,
  Mail,
  Phone,
  User,
  DollarSign,
} from 'lucide-react';


const CollaboratorsPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  const [selectedStatus, setSelectedStatus] = useState('');
  const [joinDateFrom, setJoinDateFrom] = useState('');
  const [joinDateTo, setJoinDateTo] = useState('');
  const [sortOption, setSortOption] = useState('joinDateDesc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [collaborators, setCollaborators] = useState([]);
  const [rankLevels, setRankLevels] = useState([]);
  const [rankLevelsLoading, setRankLevelsLoading] = useState(true);
  const [rankLevelSavingId, setRankLevelSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  
  // Hover states
  const [hoveredAddCollaboratorButton, setHoveredAddCollaboratorButton] = useState(false);
  const [hoveredPaginationNavButton, setHoveredPaginationNavButton] = useState(null);
  const [hoveredPaginationButtonIndex, setHoveredPaginationButtonIndex] = useState(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredCollaboratorIdLinkIndex, setHoveredCollaboratorIdLinkIndex] = useState(null);
  const [hoveredEditButtonIndex, setHoveredEditButtonIndex] = useState(null);
  const [hoveredDeleteButtonIndex, setHoveredDeleteButtonIndex] = useState(null);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isSortFilterOpen, setIsSortFilterOpen] = useState(false);

  useEffect(() => {
    // Header search sync via query string `?search=...`
    setSearchQuery(headerSearch);
    setCurrentPage(1);
  }, [headerSearch]);

  useEffect(() => {
    loadCollaborators();
  }, [currentPage, itemsPerPage, selectedStatus, sortOption, searchQuery, joinDateFrom, joinDateTo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setRankLevelsLoading(true);
        const res = await apiService.getCollaboratorRankLevels();
        if (!cancelled && res.success && res.data?.rankLevels) {
          setRankLevels(res.data.rankLevels);
        }
      } catch (e) {
        console.error('Error loading rank levels:', e);
      } finally {
        if (!cancelled) setRankLevelsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
      };

      // Sort options: tên, ngày tham gia, số hồ sơ (2 chiều)
      if (sortOption.startsWith('alphabet')) {
        params.sortBy = 'name';
        params.sortOrder = sortOption === 'alphabetDesc' ? 'DESC' : 'ASC';
      } else if (sortOption.startsWith('applications')) {
        params.sortBy = 'applicationsCount';
        params.sortOrder = sortOption === 'applicationsAsc' ? 'ASC' : 'DESC';
      } else {
        // Ngày tham gia
        params.sortBy = 'created_at';
        params.sortOrder = sortOption === 'joinDateAsc' ? 'ASC' : 'DESC';
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (selectedStatus) {
        params.status = selectedStatus === 'active' ? 1 : 0;
      }

      if (joinDateFrom) {
        params.joinDateFrom = joinDateFrom;
      }
      if (joinDateTo) {
        params.joinDateTo = joinDateTo;
      }

      const response = await apiService.getCollaborators(params);
      if (response.success && response.data) {
        setCollaborators(response.data.collaborators || []);
        setPagination(response.data.pagination || {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0
        });
      }
    } catch (error) {
      console.error('Error loading collaborators:', error);
      setCollaborators([]);
    } finally {
      setLoading(false);
    }
  };

  // Sample data for collaborators (fallback)
  const sampleCollaborators = [
    { 
      id: 'CTV001', 
      name: 'Nguyen Van A', 
      email: 'nguyenvana@example.com', 
      phone: '0901234567', 
      candidatesCount: 15, 
      jobsCount: 8, 
      totalEarned: 12500000, 
      status: 'active', 
      joinDate: '2024/01/15' 
    },
    { 
      id: 'CTV002', 
      name: 'Tran Thi B', 
      email: 'tranthib@example.com', 
      phone: '0902345678', 
      candidatesCount: 23, 
      jobsCount: 12, 
      totalEarned: 18500000, 
      status: 'active', 
      joinDate: '2024/02/20' 
    },
    { 
      id: 'CTV003', 
      name: 'Le Van C', 
      email: 'levanc@example.com', 
      phone: '0903456789', 
      candidatesCount: 8, 
      jobsCount: 5, 
      totalEarned: 7500000, 
      status: 'active', 
      joinDate: '2024/03/10' 
    },
    { 
      id: 'CTV004', 
      name: 'Pham Thi D', 
      email: 'phamthid@example.com', 
      phone: '0904567890', 
      candidatesCount: 31, 
      jobsCount: 18, 
      totalEarned: 24500000, 
      status: 'active', 
      joinDate: '2024/01/05' 
    },
    { 
      id: 'CTV005', 
      name: 'Hoang Van E', 
      email: 'hoangvane@example.com', 
      phone: '0905678901', 
      candidatesCount: 5, 
      jobsCount: 3, 
      totalEarned: 4200000, 
      status: 'inactive', 
      joinDate: '2024/04/15' 
    },
    { 
      id: 'CTV006', 
      name: 'Vu Thi F', 
      email: 'vuthif@example.com', 
      phone: '0906789012', 
      candidatesCount: 19, 
      jobsCount: 11, 
      totalEarned: 15200000, 
      status: 'active', 
      joinDate: '2024/02/28' 
    },
    { 
      id: 'CTV007', 
      name: 'Do Van G', 
      email: 'dovang@example.com', 
      phone: '0907890123', 
      candidatesCount: 12, 
      jobsCount: 7, 
      totalEarned: 9800000, 
      status: 'active', 
      joinDate: '2024/03/22' 
    },
    { 
      id: 'CTV008', 
      name: 'Bui Thi H', 
      email: 'buithih@example.com', 
      phone: '0908901234', 
      candidatesCount: 27, 
      jobsCount: 15, 
      totalEarned: 21000000, 
      status: 'active', 
      joinDate: '2024/01/18' 
    },
    { 
      id: 'CTV009', 
      name: 'Dang Van I', 
      email: 'dangvani@example.com', 
      phone: '0909012345', 
      candidatesCount: 4, 
      jobsCount: 2, 
      totalEarned: 3200000, 
      status: 'inactive', 
      joinDate: '2024/05/10' 
    },
    { 
      id: 'CTV010', 
      name: 'Ngo Thi K', 
      email: 'ngothik@example.com', 
      phone: '0900123456', 
      candidatesCount: 35, 
      jobsCount: 20, 
      totalEarned: 28500000, 
      status: 'active', 
      joinDate: '2023/12/01' 
    },
    { 
      id: 'CTV011', 
      name: 'Ly Van L', 
      email: 'lyvanl@example.com', 
      phone: '0901234567', 
      candidatesCount: 18, 
      jobsCount: 10, 
      totalEarned: 14500000, 
      status: 'active', 
      joinDate: '2024/02/14' 
    },
    { 
      id: 'CTV012', 
      name: 'Truong Thi M', 
      email: 'truongthim@example.com', 
      phone: '0902345678', 
      candidatesCount: 22, 
      jobsCount: 13, 
      totalEarned: 17500000, 
      status: 'active', 
      joinDate: '2024/01/25' 
    },
    { 
      id: 'CTV013', 
      name: 'Vo Van N', 
      email: 'vovann@example.com', 
      phone: '0903456789', 
      candidatesCount: 9, 
      jobsCount: 6, 
      totalEarned: 7200000, 
      status: 'active', 
      joinDate: '2024/03/30' 
    },
    { 
      id: 'CTV014', 
      name: 'Dao Thi O', 
      email: 'daothio@example.com', 
      phone: '0904567890', 
      candidatesCount: 29, 
      jobsCount: 16, 
      totalEarned: 23000000, 
      status: 'active', 
      joinDate: '2024/01/08' 
    },
    { 
      id: 'CTV015', 
      name: 'Duong Van P', 
      email: 'duongvanp@example.com', 
      phone: '0905678901', 
      candidatesCount: 6, 
      jobsCount: 4, 
      totalEarned: 4800000, 
      status: 'inactive', 
      joinDate: '2024/04/20' 
    },
    { 
      id: 'CTV016', 
      name: 'Lam Thi Q', 
      email: 'lamthiq@example.com', 
      phone: '0906789012', 
      candidatesCount: 41, 
      jobsCount: 24, 
      totalEarned: 32500000, 
      status: 'active', 
      joinDate: '2023/11/15' 
    },
    { 
      id: 'CTV017', 
      name: 'Phan Van R', 
      email: 'phanvanr@example.com', 
      phone: '0907890123', 
      candidatesCount: 14, 
      jobsCount: 9, 
      totalEarned: 11200000, 
      status: 'active', 
      joinDate: '2024/02/05' 
    },
    { 
      id: 'CTV018', 
      name: 'Ho Thi S', 
      email: 'hothis@example.com', 
      phone: '0908901234', 
      candidatesCount: 33, 
      jobsCount: 19, 
      totalEarned: 26500000, 
      status: 'active', 
      joinDate: '2023/12/20' 
    },
    { 
      id: 'CTV019', 
      name: 'Mac Van T', 
      email: 'macvant@example.com', 
      phone: '0909012345', 
      candidatesCount: 11, 
      jobsCount: 7, 
      totalEarned: 8900000, 
      status: 'active', 
      joinDate: '2024/03/15' 
    },
    { 
      id: 'CTV020', 
      name: 'Kieu Thi U', 
      email: 'kieuthiu@example.com', 
      phone: '0900123456', 
      candidatesCount: 26, 
      jobsCount: 14, 
      totalEarned: 20500000, 
      status: 'active', 
      joinDate: '2024/01/30' 
    },
  ];

  const totalItems = pagination.total || 0;
  const totalPages = pagination.totalPages || 0;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(collaborators.map((_, index) => index)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedStatus('');
    setJoinDateFrom('');
    setJoinDateTo('');
    setOnlyActive(false);
    setShowInactiveOnly(false);
    setCurrentPage(1);
    loadCollaborators();
  };

  const formatCurrency = (amount) => {
    const locale =
      language === 'en' ? 'en-US' :
      language === 'ja' ? 'ja-JP' :
      'vi-VN';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleEdit = (collaboratorId) => {
    navigate(`/admin/collaborators/${collaboratorId}/edit`);
  };

  const handleRankLevelChange = async (collaboratorId, newRankLevelIdStr) => {
    const idNum = parseInt(newRankLevelIdStr, 10);
    if (Number.isNaN(idNum)) return;
    setRankLevelSavingId(collaboratorId);
    try {
      const res = await apiService.updateCollaborator(collaboratorId, { rankLevelId: idNum });
      if (res.success) {
        const picked = rankLevels.find((r) => Number(r.id) === idNum);
        setCollaborators((prev) =>
          prev.map((c) =>
            c.id === collaboratorId
              ? {
                  ...c,
                  rankLevelId: idNum,
                  rankLevel: picked
                    ? {
                        id: picked.id,
                        name: picked.name,
                        percent: picked.percent,
                        pointsRequired: picked.pointsRequired
                      }
                    : c.rankLevel
                }
              : c
          )
        );
      } else {
        alert(res.message || t.collaboratorsRankLevelUpdateError);
      }
    } catch (error) {
      console.error('Error updating rank level:', error);
      alert(error.message || t.collaboratorsRankLevelUpdateError);
    } finally {
      setRankLevelSavingId(null);
    }
  };

  const handleDelete = async (collaboratorId) => {
    if (window.confirm(t.collaboratorsConfirmDelete)) {
      try {
        const response = await apiService.deleteCollaborator(collaboratorId);
        if (response.success) {
          alert(response.message || t.collaboratorsDeleteSuccess);
          loadCollaborators();
        } else {
          alert(response.message || t.collaboratorsDeleteError);
        }
      } catch (error) {
        console.error('Error deleting collaborator:', error);
        alert(error.message || t.collaboratorsDeleteError);
      }
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filter Section */}
      <div className="px-2 sm:px-3 py-1.5 mb-1.5 flex-shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap justify-between">
          {/* 1. Search box: input + nút Tìm kiếm trong một khung viền đỏ */}
          <div className="flex items-stretch rounded-lg border border-red-500 bg-white text-[12px] sm:text-[13px] w-full max-w-[500px] overflow-hidden shadow-sm">
            <div className="flex flex-1 items-center gap-2 pl-3 pr-2 py-1.5 min-w-0">
              <Search className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
              <input
                type="text"
                placeholder={t.collaboratorsSearchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 min-w-0 bg-transparent outline-none text-[12px] sm:text-[13px] text-gray-700 placeholder:text-gray-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              className="px-4 py-1.5 rounded-r-lg bg-red-500 text-white font-semibold text-[12px] sm:text-[13px] hover:bg-red-600 transition-colors flex-shrink-0"
            >
              Tìm kiếm
            </button>
          </div>

          {/* Các filter dạng pill + nút thêm CTV bên phải */}
          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            {/* Date range pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDateFilterOpen(!isDateFilterOpen);
                  setIsStatusFilterOpen(false);
                  setIsSortFilterOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[11px] sm:text-xs font-semibold border border-red-500"
                style={{ color: '#374151' }}
              >
                Ngày tham gia
                <ChevronDown className="w-3 h-3" />
              </button>
              {isDateFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="font-semibold text-gray-700">Từ ngày</span>
                      <input
                        type="date"
                        value={joinDateFrom}
                        onChange={(e) => setJoinDateFrom(e.target.value)}
                        className="px-2 py-1 border rounded"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-semibold text-gray-700">Đến ngày</span>
                      <input
                        type="date"
                        value={joinDateTo}
                        onChange={(e) => setJoinDateTo(e.target.value)}
                        className="px-2 py-1 border rounded"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setJoinDateFrom('');
                        setJoinDateTo('');
                      }}
                      className="self-end mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}
                      >
                      Xóa lọc
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsStatusFilterOpen(!isStatusFilterOpen);
                  setIsDateFilterOpen(false);
                  setIsSortFilterOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[11px] sm:text-xs font-semibold border border-red-500"
                style={{ color: '#374151' }}
              >
                Trạng thái
                <ChevronDown className="w-3 h-3" />
              </button>
              {isStatusFilterOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="collab-status-filter"
                        value=""
                        checked={selectedStatus === ''}
                        onChange={(e) => {
                          setSelectedStatus(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-3.5 h-3.5"
                      />
                      <span>Tất cả</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="collab-status-filter"
                        value="active"
                        checked={selectedStatus === 'active'}
                        onChange={(e) => {
                          setSelectedStatus(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-3.5 h-3.5"
                      />
                      <span>{t.collaboratorsStatusActive}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="collab-status-filter"
                        value="inactive"
                        checked={selectedStatus === 'inactive'}
                        onChange={(e) => {
                          setSelectedStatus(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-3.5 h-3.5"
                      />
                      <span>{t.collaboratorsStatusInactive}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Sort by pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSortFilterOpen(!isSortFilterOpen);
                  setIsDateFilterOpen(false);
                  setIsStatusFilterOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[11px] sm:text-xs font-semibold border border-red-500"
                style={{ color: '#374151' }}
              >
                Sắp xếp
                <ChevronDown className="w-3 h-3" />
              </button>
              {isSortFilterOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-3">
                    {/* Tên */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-gray-700">Tên</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSortOption((prev) => {
                            if (prev === 'alphabetAsc') return 'alphabetDesc';
                            return 'alphabetAsc';
                          });
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

                    {/* Ngày tham gia */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-gray-700">Ngày tham gia</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSortOption((prev) => {
                            if (prev === 'joinDateAsc') return 'joinDateDesc';
                            return 'joinDateAsc';
                          });
                          setCurrentPage(1);
                        }}
                        className="px-2.5 py-0.5 rounded-full border flex items-center gap-1 text-[10px]"
                        style={{
                          borderColor: sortOption.startsWith('joinDate') ? '#2563eb' : '#e5e7eb',
                          backgroundColor: sortOption.startsWith('joinDate') ? '#eff6ff' : 'white',
                          color: sortOption.startsWith('joinDate') ? '#1d4ed8' : '#4b5563',
                        }}
                      >
                        <ChevronsUpDown className="w-3 h-3" />
                        <span>{sortOption === 'joinDateAsc' ? 'Cũ → Mới' : 'Mới → Cũ'}</span>
                      </button>
                    </div>

                    {/* Số hồ sơ ứng viên */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-gray-700">Số hồ sơ ứng viên</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSortOption((prev) => {
                            if (prev === 'applicationsAsc') return 'applicationsDesc';
                            return 'applicationsAsc';
                          });
                          setCurrentPage(1);
                        }}
                        className="px-2.5 py-0.5 rounded-full border flex items-center gap-1 text-[10px]"
                        style={{
                          borderColor: sortOption.startsWith('applications') ? '#2563eb' : '#e5e7eb',
                          backgroundColor: sortOption.startsWith('applications') ? '#eff6ff' : 'white',
                          color: sortOption.startsWith('applications') ? '#1d4ed8' : '#4b5563',
                        }}
                      >
                        <ChevronsUpDown className="w-3 h-3" />
                        <span>{sortOption === 'applicationsAsc' ? 'Ít → Nhiều' : 'Nhiều → Ít'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Nút thêm CTV */}
            <button
              onClick={() => navigate('/admin/collaborators/new')}
              onMouseEnter={() => setHoveredAddCollaboratorButton(true)}
              onMouseLeave={() => setHoveredAddCollaboratorButton(false)}
              className="px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5"
              style={{
                backgroundColor: hoveredAddCollaboratorButton ? '#b91c1c' : '#dc2626',
                color: 'white'
              }}
            >
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">Thêm CTV</span>
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
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
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
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {[...Array(Math.min(7, totalPages))].map((_, i) => {
            let pageNum;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (currentPage <= 4) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = currentPage - 3 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                onMouseEnter={() => currentPage !== pageNum && setHoveredPaginationButtonIndex(pageNum)}
                onMouseLeave={() => setHoveredPaginationButtonIndex(null)}
                className="w-5 h-5 rounded-full text-[8px] font-semibold flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: currentPage === pageNum
                    ? 'red-500'
                    : (hoveredPaginationButtonIndex === pageNum ? 'red' : 'white'),
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
            className="w-5 h-5 border rounded-full text-[8px] font-semibold flex items-center justify-center transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'next' ? 'red-500' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: currentPage === totalPages ? 0.5 : 1,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
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
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
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
            style={{
              borderColor: '#d1d5db',
              color: '#374151',
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
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span className="text-[10px] font-semibold" style={{ color: '#374151' }}>{totalItems} {t.collaboratorsTotalItemsSuffix}</span>
        </div>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: '#6b7280' }}>
            {t.collaboratorsLoading}
          </div>
        ) : collaborators.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: '#6b7280' }}>
            {t.collaboratorsNoData}
          </div>
        ) : (
          <div className="p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            {collaborators.map((collaborator, index) => {
              const statusActive = collaborator.status === 1;
              const statusLabel = statusActive ? t.collaboratorsStatusActive : t.collaboratorsStatusInactive;
              const joinDate = collaborator.createdAt
                ? new Date(collaborator.createdAt).toLocaleDateString(
                    language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN'
                  )
                : collaborator.approvedAt
                ? new Date(collaborator.approvedAt).toLocaleDateString(
                    language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN'
                  )
                : '-';
              const initials = (collaborator.name || '')
                .split(' ')
                .filter(Boolean)
                .slice(-2)
                .map((p) => p[0])
                .join('')
                .toUpperCase() || 'CV';
              const isBusinessCollaborator =
                collaborator.organizationType === 'company' || collaborator.organizationType === 'organization';
              const businessTagLabel =
                language === 'en' ? 'Business' : language === 'ja' ? 'ビジネス' : 'Doanh nghiệp';

              return (
                <div
                  key={collaborator.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/collaborators/${collaborator.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/admin/collaborators/${collaborator.id}`);
                    }
                  }}
                  onMouseEnter={() => setHoveredRowIndex(index)}
                  onMouseLeave={() => setHoveredRowIndex(null)}
                  className="relative text-left bg-white rounded-xl border shadow-[0_8px_20px_rgba(15,23,42,0.06)] px-3 sm:px-3.5 py-3 sm:py-3.5 flex flex-col gap-2.5 transition-transform transition-shadow cursor-pointer"
                  style={{
                    borderColor: hoveredRowIndex === index ? '#bfdbfe' : '#e5e7eb',
                    transform: hoveredRowIndex === index ? 'translateY(-1px)' : 'translateY(0)',
                  }}
                >
                  {/* Status pill */}
                  <div className="absolute top-2 left-3 flex items-center gap-1">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                      {statusLabel}
                    </span>
                  </div>

                  {/* Avatar + name */}
                  <div className="pt-3 flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-50 flex items-center justify-center text-xs sm:text-sm font-semibold text-blue-700 border border-blue-100">
                      {initials}
                    </div>
                    <div className="text-center w-full px-1">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <p className="text-[11px] sm:text-xs font-semibold" style={{ color: '#111827' }}>
                          {collaborator.name}
                        </p>
                        {isBusinessCollaborator && (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                            {businessTagLabel}
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-1.5 flex flex-col items-stretch gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <label className="text-[9px] font-semibold text-center" style={{ color: '#6b7280' }}>
                          {t.collaboratorsColRank}
                        </label>
                        {rankLevelsLoading ? (
                          <span className="text-[9px] text-center" style={{ color: '#9ca3af' }}>…</span>
                        ) : (
                          <select
                            value={
                              collaborator.rankLevelId != null && collaborator.rankLevelId !== ''
                                ? String(collaborator.rankLevelId)
                                : ''
                            }
                            disabled={rankLevelSavingId === collaborator.id || rankLevels.length === 0}
                            onChange={(e) => {
                              e.stopPropagation();
                              const v = e.target.value;
                              if (!v) return;
                              handleRankLevelChange(collaborator.id, v);
                            }}
                            className="w-full max-w-[220px] mx-auto text-[9px] sm:text-[10px] px-2 py-1 rounded-lg border border-slate-200 bg-white"
                            style={{ color: '#374151', outline: 'none' }}
                          >
                            {rankLevels.length === 0 ? (
                              <option value="">{t.collaboratorsRankLevelNoOptions}</option>
                            ) : (
                              <>
                                {(collaborator.rankLevelId == null || collaborator.rankLevelId === '') && (
                                  <option value="" disabled>
                                    {t.collaboratorsRankLevelSelectPlaceholder}
                                  </option>
                                )}
                                {rankLevels.map((rl) => (
                                  <option key={rl.id} value={String(rl.id)}>
                                    {rl.name}
                                    {rl.percent != null ? ` (${rl.percent}%)` : ''}
                                  </option>
                                ))}
                              </>
                            )}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="mt-1 rounded-xl border border-slate-100 bg-slate-50/60 px-2.5 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px]" style={{ color: '#6b7280' }}>
                      <span>
                        #
                        {' '}
                        {collaborator.code || collaborator.id}
                      </span>
                      <span>
                        {t.collaboratorsColCandidatesCount}
                        :
                        {' '}
                        <span className="font-semibold" style={{ color: '#111827' }}>
                          {collaborator.applicationsCount || 0}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px]" style={{ color: '#4b5563' }}>
                      <User className="w-3 h-3 flex-shrink-0" style={{ color: '#9ca3af' }} />
                      <span className="truncate">
                        {t.collaboratorsColTotalEarned}
                        :
                        {' '}
                        <span className="font-semibold" style={{ color: '#111827' }}>
                          {formatCurrency(collaborator.totalPaid || 0)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px]" style={{ color: '#4b5563' }}>
                      <Mail className="w-3 h-3 flex-shrink-0" style={{ color: '#9ca3af' }} />
                      <span className="truncate">{collaborator.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px]" style={{ color: '#4b5563' }}>
                      <Phone className="w-3 h-3 flex-shrink-0" style={{ color: '#9ca3af' }} />
                      <span className="truncate">{collaborator.phone || '-'}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-1.5 flex items-center justify-between text-[9px] sm:text-[10px]">
                    <span style={{ color: '#6b7280' }}>
                      {t.collaboratorsJoinedPrefix || 'Joined'}
                      {' '}
                      {joinDate}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(collaborator.id);
                        }}
                        onMouseEnter={() => setHoveredEditButtonIndex(index)}
                        onMouseLeave={() => setHoveredEditButtonIndex(null)}
                        className="px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-1"
                        style={{
                          backgroundColor: hoveredEditButtonIndex === index ? '#eff6ff' : 'transparent',
                          color: hoveredEditButtonIndex === index ? '#1e40af' : '#2563eb',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        {t.viewDetailShort || t.viewDetail}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(collaborator.id);
                        }}
                        onMouseEnter={() => setHoveredDeleteButtonIndex(index)}
                        onMouseLeave={() => setHoveredDeleteButtonIndex(null)}
                        className="p-1 rounded-full"
                        style={{
                          backgroundColor: hoveredDeleteButtonIndex === index ? '#fee2e2' : 'transparent',
                          color: hoveredDeleteButtonIndex === index ? '#991b1b' : '#dc2626',
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaboratorsPage;
