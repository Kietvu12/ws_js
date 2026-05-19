import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService, { normalizePostImageUrl } from '../../services/api';
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
  Calendar,
  Target,
  DollarSign,
  Eye,
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';

const pickByLanguage = (viText, enText, jpText, lang) => {
  if (lang === 'en' && (enText != null && enText !== '')) return enText;
  if (lang === 'ja' && (jpText != null && jpText !== '')) return jpText;
  return viText != null && viText !== '' ? viText : enText || jpText || '';
};

const CampaignsPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const dateLocale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  
  // Hover states
  const [hoveredResetButton, setHoveredResetButton] = useState(false);
  const [hoveredInfoButton, setHoveredInfoButton] = useState(false);
  const [hoveredAddCampaignButton, setHoveredAddCampaignButton] = useState(false);
  const [hoveredSettingsButton, setHoveredSettingsButton] = useState(false);
  const [hoveredPaginationNavButton, setHoveredPaginationNavButton] = useState(null);
  const [hoveredPaginationButtonIndex, setHoveredPaginationButtonIndex] = useState(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredCampaignIdLinkIndex, setHoveredCampaignIdLinkIndex] = useState(null);
  const [hoveredCampaignNameLinkIndex, setHoveredCampaignNameLinkIndex] = useState(null);
  const [hoveredJobCountLinkIndex, setHoveredJobCountLinkIndex] = useState(null);
  const [hoveredViewButtonIndex, setHoveredViewButtonIndex] = useState(null);
  const [hoveredEditButtonIndex, setHoveredEditButtonIndex] = useState(null);

  useEffect(() => {
    // Header search sync via query string `?search=...`
    setSearchQuery(headerSearch);
    setCurrentPage(1);
  }, [headerSearch]);
  const [hoveredDeleteButtonIndex, setHoveredDeleteButtonIndex] = useState(null);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [expandedCampaignIds, setExpandedCampaignIds] = useState(new Set());

  useEffect(() => {
    loadCampaigns();
  }, [currentPage, itemsPerPage, selectedStatus, dateFrom, dateTo, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inFilters = event.target.closest('.campaigns-filters-container');
      if (!inFilters) {
        setIsStatusFilterOpen(false);
        setIsDateFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCampaigns = async () => {
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

      // Map status từ frontend labels sang backend numbers
      if (selectedStatus) {
        const statusMap = {
          'active': 1,
          'upcoming': 0, // Có thể là 0 hoặc cần check date
          'ended': 2,
          'inactive': 0
        };
        params.status = statusMap[selectedStatus] !== undefined ? statusMap[selectedStatus] : selectedStatus;
      }

      if (dateFrom) {
        params.startDateFrom = dateFrom;
      }
      if (dateTo) {
        params.endDateTo = dateTo;
      }

      const response = await apiService.getAdminCampaigns(params);
      if (response.success && response.data) {
        setCampaigns(response.data.campaigns || []);
        setPagination(response.data.pagination || {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0
        });
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine status from campaign data
  const getCampaignStatus = (campaign) => {
    if (campaign.status === 1) return 'active';
    if (campaign.status === 2) return 'ended';
    const now = new Date();
    const startDate = new Date(campaign.startDate || campaign.start_date);
    const endDate = new Date(campaign.endDate || campaign.end_date);
    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'ended';
    if (campaign.status === 0) return 'inactive';
    return 'active';
  };

  // Mock data for campaigns (fallback)
  const sampleCampaigns = [
    {
      id: 'CAMP001',
      name: 'Chiến dịch Tuyển dụng Mùa Xuân 2025',
      description: 'Tuyển dụng hàng loạt các vị trí IT, xây dựng, và dịch vụ cho mùa xuân 2025',
      startDate: '2025/01/15',
      endDate: '2025/03/31',
      status: 'active',
      budget: 50000000,
      jobsCount: 45,
      views: 12500,
      applications: 320,
      nominations: 85,
      createdAt: '2024/12/20',
      updatedAt: '2025/01/10',
    },
    {
      id: 'CAMP002',
      name: 'Chiến dịch Tuyển dụng IT Specialist',
      description: 'Tuyển dụng chuyên sâu các vị trí IT, Software Engineer, DevOps',
      startDate: '2025/02/01',
      endDate: '2025/04/30',
      status: 'upcoming',
      budget: 30000000,
      jobsCount: 25,
      views: 0,
      applications: 0,
      nominations: 0,
      createdAt: '2025/01/05',
      updatedAt: '2025/01/08',
    },
    {
      id: 'CAMP003',
      name: 'Chiến dịch Tuyển dụng Xây dựng Q1 2025',
      description: 'Tuyển dụng các vị trí kỹ sư xây dựng, quản lý dự án',
      startDate: '2024/12/01',
      endDate: '2025/02/28',
      status: 'active',
      budget: 40000000,
      jobsCount: 30,
      views: 9800,
      applications: 245,
      nominations: 62,
      createdAt: '2024/11/15',
      updatedAt: '2025/01/12',
    },
    {
      id: 'CAMP004',
      name: 'Chiến dịch Tuyển dụng Dịch vụ Khách hàng',
      description: 'Tuyển dụng nhân viên dịch vụ khách hàng, tư vấn viên',
      startDate: '2024/10/01',
      endDate: '2024/12/31',
      status: 'ended',
      budget: 20000000,
      jobsCount: 18,
      views: 15200,
      applications: 410,
      nominations: 95,
      createdAt: '2024/09/20',
      updatedAt: '2025/01/01',
    },
    {
      id: 'CAMP005',
      name: 'Chiến dịch Tuyển dụng Marketing & Sales',
      description: 'Tuyển dụng các vị trí Marketing Manager, Sales Executive',
      startDate: '2025/01/20',
      endDate: '2025/05/31',
      status: 'active',
      budget: 35000000,
      jobsCount: 22,
      views: 5600,
      applications: 128,
      nominations: 35,
      createdAt: '2024/12/28',
      updatedAt: '2025/01/15',
    },
    {
      id: 'CAMP006',
      name: 'Chiến dịch Tuyển dụng Bảo vệ & An ninh',
      description: 'Tuyển dụng nhân viên bảo vệ, an ninh cho các tòa nhà và khu vực',
      startDate: '2025/03/01',
      endDate: '2025/06/30',
      status: 'upcoming',
      budget: 25000000,
      jobsCount: 15,
      views: 0,
      applications: 0,
      nominations: 0,
      createdAt: '2025/01/10',
      updatedAt: '2025/01/10',
    },
    {
      id: 'CAMP007',
      name: 'Chiến dịch Tuyển dụng Thời trang & Retail',
      description: 'Tuyển dụng nhân viên bán hàng, quản lý cửa hàng thời trang',
      startDate: '2024/11/01',
      endDate: '2025/01/31',
      status: 'active',
      budget: 18000000,
      jobsCount: 12,
      views: 7200,
      applications: 185,
      nominations: 42,
      createdAt: '2024/10/15',
      updatedAt: '2025/01/14',
    },
    {
      id: 'CAMP008',
      name: 'Chiến dịch Tuyển dụng Healthcare',
      description: 'Tuyển dụng y tá, điều dưỡng, nhân viên y tế',
      startDate: '2025/02/15',
      endDate: '2025/08/31',
      status: 'upcoming',
      budget: 45000000,
      jobsCount: 35,
      views: 0,
      applications: 0,
      nominations: 0,
      createdAt: '2025/01/12',
      updatedAt: '2025/01/12',
    },
  ];

  const totalItems = pagination.total || 0;
  const totalPages = pagination.totalPages || 0;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(campaigns.map((_, index) => index)));
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
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
    loadCampaigns();
  };

  const handleDelete = async (id) => {
    const msg = (t.confirmDeleteCampaign || 'Bạn có chắc muốn xóa chiến dịch {id}?').replace('{id}', id);
    if (window.confirm(msg)) {
      try {
        const response = await apiService.deleteAdminCampaign(id);
        if (response.success) {
          alert(t.deleteCampaignSuccess || 'Xóa chiến dịch thành công!');
          loadCampaigns();
        } else {
          alert(response.message || (t.errorDeleteCampaign || 'Có lỗi xảy ra khi xóa chiến dịch'));
        }
      } catch (error) {
        console.error('Error deleting campaign:', error);
        alert(error.message || (t.errorDeleteCampaign || 'Có lỗi xảy ra khi xóa chiến dịch'));
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: {
        label: t.campaignStatusLabelActive || 'Đang hoạt động',
        style: { backgroundColor: '#dcfce7', color: '#166534' },
        icon: CheckCircle,
      },
      upcoming: {
        label: t.campaignStatusLabelUpcoming || 'Sắp diễn ra',
        style: { backgroundColor: '#dbeafe', color: '#1e40af' },
        icon: Clock,
      },
      ended: {
        label: t.campaignStatusLabelEnded || 'Đã kết thúc',
        style: { backgroundColor: '#f3f4f6', color: '#1f2937' },
        icon: XCircle,
      },
      inactive: {
        label: t.campaignStatusLabelInactive || 'Ngừng hoạt động',
        style: { backgroundColor: '#fee2e2', color: '#991b1b' },
        icon: XCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={config.style}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(dateLocale, {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0 px-2 sm:px-3 py-1.5 space-y-3">
        {/* Filter bar */}
        <div className="campaigns-filters-container flex items-center gap-2.5 flex-wrap justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center px-3 py-1.5 rounded-full bg-white text-[12px] sm:text-[13px] min-w-[220px] flex-1">
              <Search className="w-3.5 h-3.5 mr-2" style={{ color: '#9ca3af' }} />
              <input
                type="text"
                placeholder={t.campaignsSearchPlaceholder || 'ID, tên chiến dịch, mô tả'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-[12px] sm:text-[13px]"
                style={{ border: 'none' }}
              />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsStatusFilterOpen(!isStatusFilterOpen);
                  setIsDateFilterOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[11px] sm:text-xs font-semibold"
                style={{ color: '#374151' }}
              >
                {t.statusFilterLabel || 'Trạng thái'}
                <ChevronDown className="w-3 h-3" />
              </button>
              {isStatusFilterOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { value: '', label: t.allStatus || 'Tất cả' },
                      { value: 'active', label: t.campaignStatusLabelActive || 'Đang hoạt động' },
                      { value: 'upcoming', label: t.campaignStatusLabelUpcoming || 'Sắp diễn ra' },
                      { value: 'ended', label: t.campaignStatusLabelEnded || 'Đã kết thúc' },
                      { value: 'inactive', label: t.campaignStatusLabelInactive || 'Ngừng hoạt động' },
                    ].map((opt) => (
                      <label key={opt.value || 'all'} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="statusFilter"
                          checked={selectedStatus === opt.value}
                          onChange={() => setSelectedStatus(opt.value)}
                          className="w-3.5 h-3.5"
                          style={{ accentColor: '#2563eb' }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDateFilterOpen(!isDateFilterOpen);
                  setIsStatusFilterOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[11px] sm:text-xs font-semibold"
                style={{ color: '#374151' }}
              >
                {t.dateRangeFilterLabel || 'Khoảng ngày'}
                <ChevronDown className="w-3 h-3" />
              </button>
              {isDateFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="font-semibold" style={{ color: '#374151' }}>{t.dateFromShort || 'Từ ngày'}</span>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="px-2 py-1 border rounded"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-semibold" style={{ color: '#374151' }}>{t.dateToShort || 'Đến ngày'}</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="px-2 py-1 border rounded"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="self-end mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}
                    >
                      {t.clearFilter || 'Xóa lọc'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
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
              onMouseEnter={() => setHoveredInfoButton(true)}
              onMouseLeave={() => setHoveredInfoButton(false)}
              className="p-1.5"
              style={{
                color: hoveredInfoButton ? '#1f2937' : '#4b5563'
              }}
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/admin/campaigns/create')}
              onMouseEnter={() => setHoveredAddCampaignButton(true)}
              onMouseLeave={() => setHoveredAddCampaignButton(false)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: hoveredAddCampaignButton ? '#b91c1c' : '#dc2626',
                color: 'white'
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              {t.addCampaignButton || '+ Thêm chiến dịch'}
            </button>
            <button
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

        {/* Pagination Controls */}
        <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <button
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
            onClick={() => setCurrentPage(currentPage - 1)}
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
          {[...Array(Math.min(7, totalPages))].map((_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                onMouseEnter={() => currentPage !== pageNum && setHoveredPaginationButtonIndex(pageNum)}
                onMouseLeave={() => setHoveredPaginationButtonIndex(null)}
                className="w-7 h-7 rounded-full border text-[10px] font-semibold transition-colors flex items-center justify-center"
                style={{
                  backgroundColor: currentPage === pageNum
                    ? '#2563eb'
                    : (hoveredPaginationButtonIndex === pageNum ? '#f9fafb' : 'white'),
                  borderColor: '#d1d5db',
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
            className="w-7 h-7 rounded-full border text-[10px] font-semibold transition-colors flex items-center justify-center"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'next' ? '#f9fafb' : 'white',
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
            className="w-7 h-7 rounded-full border text-[10px] font-semibold transition-colors flex items-center justify-center"
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
        <div className="flex items-center gap-2">
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 border rounded text-[10px] font-semibold"
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
          <span className="text-[10px] font-semibold" style={{ color: '#374151' }}>{totalItems} {t.itemsCount != null ? t.itemsCount : 'items'}</span>
        </div>
      </div>

      {/* Card grid thay cho bảng */}
      <div className="flex-1 overflow-y-auto min-h-0 rounded-lg relative" style={{ borderColor: '#e5e7eb' }}>
        {/* Lớp mờ ở mép dưới khi nội dung bị cắt */}
        <div
          className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none z-10 rounded-b-lg"
          style={{
            background: 'linear-gradient(to top, rgba(255,250,250,0.92), transparent)',
          }}
          aria-hidden
        />
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="inline-flex items-center justify-center gap-2 text-sm" style={{ color: '#6b7280' }}>
              <span className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#2563eb' }} />
              {t.loadingData || 'Đang tải...'}
            </span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#6b7280' }}>
            {t.noData || 'Không có dữ liệu'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
            {campaigns.map((campaign, index) => {
              const campaignStatus = getCampaignStatus(campaign);
              const startDate = campaign.startDate || campaign.start_date
                ? new Date(campaign.startDate || campaign.start_date).toLocaleDateString(dateLocale)
                : '—';
              const endDate = campaign.endDate || campaign.end_date
                ? new Date(campaign.endDate || campaign.end_date).toLocaleDateString(dateLocale)
                : '—';
              const createdAt = campaign.createdAt || campaign.created_at
                ? new Date(campaign.createdAt || campaign.created_at).toLocaleDateString(dateLocale)
                : '—';
              const displayName = pickByLanguage(
                campaign.name,
                campaign.nameEn || campaign.name_en,
                campaign.nameJp || campaign.name_jp,
                language
              );
              const displayDescription = pickByLanguage(
                campaign.description,
                campaign.descriptionEn || campaign.description_en,
                campaign.descriptionJp || campaign.description_jp,
                language
              );
              const coverSrc = campaign.coverUrl || campaign.cover_url;

              return (
                <div
                  key={campaign.id}
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
                  {/* Header: checkbox + ID + status */}
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
                        onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                        onMouseEnter={() => setHoveredCampaignIdLinkIndex(index)}
                        onMouseLeave={() => setHoveredCampaignIdLinkIndex(null)}
                        className="font-medium text-[11px] flex items-center gap-0.5 truncate"
                        style={{ color: hoveredCampaignIdLinkIndex === index ? '#1e40af' : '#2563eb' }}
                      >
                        {campaign.id}
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </button>
                    </div>
                    {getStatusBadge(campaignStatus)}
                  </div>

                  {/* Tên chiến dịch */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: '#a855f7' }}>
                      <Target className="w-4 h-4" />
                    </div>
                    <button
                      onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                      onMouseEnter={() => setHoveredCampaignNameLinkIndex(index)}
                      onMouseLeave={() => setHoveredCampaignNameLinkIndex(null)}
                      className="text-sm font-semibold text-left truncate flex-1 min-w-0"
                      style={{ color: hoveredCampaignNameLinkIndex === index ? '#2563eb' : '#111827' }}
                    >
                      {displayName}
                    </button>
                  </div>

                  {/* Mô tả + Xem thêm */}
                  <div className="mb-3">
                    <p
                      className={`text-xs ${expandedCampaignIds.has(campaign.id) ? '' : 'line-clamp-2'} min-h-[2.5rem]`}
                      style={{ color: '#374151' }}
                    >
                      {displayDescription || '—'}
                    </p>
                    {(displayDescription || '').length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCampaignIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(campaign.id)) next.delete(campaign.id);
                            else next.add(campaign.id);
                            return next;
                          });
                        }}
                        className="text-[11px] font-semibold mt-0.5 transition-colors hover:underline"
                        style={{ color: '#2563eb' }}
                      >
                        {expandedCampaignIds.has(campaign.id)
                          ? (t.adminSidebarCollapse || 'Thu gọn')
                          : (t.readMore || 'Xem thêm')}
                      </button>
                    )}
                  </div>

                  {/* Thời gian */}
                  <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: '#374151' }}>
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9ca3af' }} />
                    <span>{startDate} ~ {endDate}</span>
                  </div>

                  {/* Thống kê: Job, Views, Applications, Nominations */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={() => navigate(`/admin/jobs?campaign=${campaign.id}`)}
                      onMouseEnter={() => setHoveredJobCountLinkIndex(index)}
                      onMouseLeave={() => setHoveredJobCountLinkIndex(null)}
                      className="flex items-center gap-1.5 text-xs rounded-lg py-1.5 px-2 transition-colors"
                      style={{
                        color: hoveredJobCountLinkIndex === index ? '#1e40af' : '#374151',
                        backgroundColor: hoveredJobCountLinkIndex === index ? '#eff6ff' : '#f9fafb'
                      }}
                    >
                      <Briefcase className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                      <span className="font-semibold">{campaign.jobCampaigns?.length || 0}</span>
                      <span className="opacity-80">{t.campaignColJobCount || 'Số job'}</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-xs py-1.5 px-2 rounded-lg" style={{ backgroundColor: '#f9fafb', color: '#374151' }}>
                      <Eye className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                      <span className="font-semibold">{campaign.viewsCount || 0}</span>
                      <span className="opacity-80">{t.campaignColViews || 'Lượt xem'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs py-1.5 px-2 rounded-lg" style={{ backgroundColor: '#f9fafb', color: '#374151' }}>
                      <Users className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                      <span className="font-semibold">{campaign.applicationsCount || 0}</span>
                      <span className="opacity-80">{t.campaignColApplications || 'Ứng tuyển'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs py-1.5 px-2 rounded-lg" style={{ backgroundColor: '#f9fafb', color: '#374151' }}>
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                      <span className="font-semibold">{campaign.nominationsCount || 0}</span>
                      <span className="opacity-80">{t.campaignColNominations || 'Tiến cử'}</span>
                    </div>
                  </div>

                  {/* Ngày tạo + Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: '#e5e7eb' }}>
                    <div className="flex items-center gap-1 text-[11px]" style={{ color: '#6b7280' }}>
                      <Calendar className="w-3 h-3" style={{ color: '#9ca3af' }} />
                      {createdAt}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                        onMouseEnter={() => setHoveredViewButtonIndex(index)}
                        onMouseLeave={() => setHoveredViewButtonIndex(null)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{
                          color: hoveredViewButtonIndex === index ? '#1e40af' : '#2563eb',
                          backgroundColor: hoveredViewButtonIndex === index ? '#eff6ff' : 'transparent'
                        }}
                        title={t.viewDetailTooltip || 'Xem chi tiết'}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/admin/campaigns/${campaign.id}/edit`)}
                        onMouseEnter={() => setHoveredEditButtonIndex(index)}
                        onMouseLeave={() => setHoveredEditButtonIndex(null)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{
                          color: hoveredEditButtonIndex === index ? '#1f2937' : '#4b5563',
                          backgroundColor: hoveredEditButtonIndex === index ? '#f3f4f6' : 'transparent'
                        }}
                        title={t.edit || 'Chỉnh sửa'}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        onMouseEnter={() => setHoveredDeleteButtonIndex(index)}
                        onMouseLeave={() => setHoveredDeleteButtonIndex(null)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{
                          color: hoveredDeleteButtonIndex === index ? '#991b1b' : '#dc2626',
                          backgroundColor: hoveredDeleteButtonIndex === index ? '#fef2f2' : 'transparent'
                        }}
                        title={t.delete || 'Xóa'}
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
    </div>
  );
};

export default CampaignsPage;
