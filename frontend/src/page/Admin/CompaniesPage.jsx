import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import {
  Search,
  Plus,
  ExternalLink,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Building2,
  Briefcase,
  Globe,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowUpDown,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';

const CompaniesPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  const [selectedLocation, setSelectedLocation] = useState(''); // type 1=Nhật Bản, 2=Việt Nam, 3=Việt & Nhật
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [hoveredResetButton, setHoveredResetButton] = useState(false);
  const [hoveredRefreshButton, setHoveredRefreshButton] = useState(false);
  const [hoveredAddCompanyButton, setHoveredAddCompanyButton] = useState(false);
  const [hoveredPaginationNavButton, setHoveredPaginationNavButton] = useState(null);
  const [hoveredPaginationButtonIndex, setHoveredPaginationButtonIndex] = useState(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredCompanyIdLinkIndex, setHoveredCompanyIdLinkIndex] = useState(null);
  const [hoveredCompanyNameLinkIndex, setHoveredCompanyNameLinkIndex] = useState(null);
  const [hoveredWebsiteLinkIndex, setHoveredWebsiteLinkIndex] = useState(null);
  const [hoveredJobCountLinkIndex, setHoveredJobCountLinkIndex] = useState(null);
  const [hoveredToggleStatusButtonIndex, setHoveredToggleStatusButtonIndex] = useState(null);
  const [hoveredViewButtonIndex, setHoveredViewButtonIndex] = useState(null);
  const [hoveredEditButtonIndex, setHoveredEditButtonIndex] = useState(null);
  const [hoveredDeleteButtonIndex, setHoveredDeleteButtonIndex] = useState(null);

  useEffect(() => {
    // Header search sync via query string `?search=...`
    setSearchQuery(headerSearch);
    setCurrentPage(1);
  }, [headerSearch]);

  useEffect(() => {
    loadCompanies();
  }, [currentPage, itemsPerPage, selectedLocation, selectedStatus, searchQuery, language]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'id',
        sortOrder: 'DESC'
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (selectedLocation) {
        params.type = selectedLocation; // 1, 2, 3
      }

      if (selectedStatus) {
        params.status = selectedStatus === 'active' ? '1' : '0';
      }

      const response = await apiService.getCompanies(params);
      if (response.success && response.data) {
        setCompanies(response.data.companies || []);
        setPagination(response.data.pagination || {
          total: 0,
          page: 1,
          limit: itemsPerPage,
          totalPages: 0
        });
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      alert(t.errorLoadCompanies);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(t.confirmDeleteCompany.replace('{name}', name))) {
      return;
    }

    try {
      const response = await apiService.deleteCompany(id);
      if (response.success) {
        alert(t.deleteCompanySuccess);
        loadCompanies();
      } else {
        alert(response.message || t.errorDeleteCompany);
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      alert(error.message || t.errorDeleteCompany);
    }
  };

  const handleToggleStatus = async (company) => {
    try {
      const response = await apiService.toggleCompanyStatus(company.id);
      if (response.success) {
        alert(t.updateStatusSuccess);
        loadCompanies();
      } else {
        alert(response.message || t.errorOccurred);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert(error.message || t.errorOccurred);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedLocation('');
    setSelectedStatus('');
    setCurrentPage(1);
    setIsLocationFilterOpen(false);
    setIsStatusFilterOpen(false);
  };


  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(companies.map((_, index) => index)));
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

  const dateLocale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString(dateLocale);
  };

  const getLocationLabel = (type) => {
    const num = type != null ? Number(type) : null;
    if (num === 1) return t.companyLocationJapan;
    if (num === 2) return t.companyLocationVietnam;
    if (num === 3) return t.companyLocationVietnamJapan;
    return '—';
  };

  const totalPages = pagination.totalPages || 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filter Section */}
      <div className="px-2 sm:px-3 py-1.5 mb-1.5 flex-shrink-0">
        <div className="flex w-full items-center gap-2.5 flex-wrap justify-between">
          <div className="flex min-w-0 flex-1 items-center rounded-full bg-white px-3 py-1.5 text-[11px] sm:min-w-[220px] sm:text-[13px]">
            <Search className="w-3.5 h-3.5 mr-2 flex-shrink-0" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder={t.companiesSearchPlaceholder}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-transparent outline-none text-[11px] sm:text-[13px]"
              style={{ border: 'none' }}
            />
          </div>
          <button
            onClick={() => navigate('/admin/companies/create')}
            onMouseEnter={() => setHoveredAddCompanyButton(true)}
            onMouseLeave={() => setHoveredAddCompanyButton(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[10px] sm:hidden"
            style={{ backgroundColor: hoveredAddCompanyButton ? '#b91c1c' : '#dc2626', color: 'white' }}
            aria-label={t.addCompanyButton}
            title={t.addCompanyButton}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            onMouseEnter={() => setHoveredResetButton(true)}
            onMouseLeave={() => setHoveredResetButton(false)}
            className="inline-flex h-8 items-center justify-center rounded-full px-3 text-[10px] font-semibold sm:hidden"
            style={{ backgroundColor: hoveredResetButton ? '#e5e7eb' : '#f3f4f6', color: '#374151' }}
          >
            {t.resetButton}
          </button>
          <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:flex-wrap sm:justify-end sm:gap-2.5 sm:overflow-visible sm:pb-0">
            <button
              onClick={handleReset}
              onMouseEnter={() => setHoveredResetButton(true)}
              onMouseLeave={() => setHoveredResetButton(false)}
              className="hidden px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors sm:inline-flex"
              style={{ backgroundColor: hoveredResetButton ? '#e5e7eb' : '#f3f4f6', color: '#374151' }}
            >
              {t.resetButton}
            </button>
            <button
              onClick={loadCompanies}
              onMouseEnter={() => setHoveredRefreshButton(true)}
              onMouseLeave={() => setHoveredRefreshButton(false)}
              className="px-2 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              style={{ backgroundColor: hoveredRefreshButton ? '#e5e7eb' : '#f3f4f6', color: '#374151' }}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="sm:hidden">Làm mới</span>
              <span className="hidden sm:inline">{t.refreshButton}</span>
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setIsLocationFilterOpen(!isLocationFilterOpen); setIsStatusFilterOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[10px] sm:text-xs font-semibold whitespace-nowrap shrink-0"
                style={{ color: '#374151' }}
              >
                {t.locationFilterLabel || t.colLocation}
                <ChevronDown className="w-3 h-3" />
              </button>
              {isLocationFilterOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="company-location" value="" checked={selectedLocation === ''} onChange={() => { setSelectedLocation(''); setCurrentPage(1); setIsLocationFilterOpen(false); }} className="w-3.5 h-3.5" style={{ accentColor: '#2563eb' }} />
                      <span>{t.allStatus}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="company-location" value="1" checked={selectedLocation === '1'} onChange={() => { setSelectedLocation('1'); setCurrentPage(1); setIsLocationFilterOpen(false); }} className="w-3.5 h-3.5" style={{ accentColor: '#2563eb' }} />
                      <span>{t.companyLocationJapan}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="company-location" value="2" checked={selectedLocation === '2'} onChange={() => { setSelectedLocation('2'); setCurrentPage(1); setIsLocationFilterOpen(false); }} className="w-3.5 h-3.5" style={{ accentColor: '#2563eb' }} />
                      <span>{t.companyLocationVietnam}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="company-location" value="3" checked={selectedLocation === '3'} onChange={() => { setSelectedLocation('3'); setCurrentPage(1); setIsLocationFilterOpen(false); }} className="w-3.5 h-3.5" style={{ accentColor: '#2563eb' }} />
                      <span>{t.companyLocationVietnamJapan}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setIsStatusFilterOpen(!isStatusFilterOpen); setIsLocationFilterOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[10px] sm:text-xs font-semibold whitespace-nowrap shrink-0"
                style={{ color: '#374151' }}
              >
                {t.statusFilterLabel}
                <ChevronDown className="w-3 h-3" />
              </button>
              {isStatusFilterOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="company-status" value="" checked={selectedStatus === ''} onChange={() => { setSelectedStatus(''); setCurrentPage(1); setIsStatusFilterOpen(false); }} className="w-3.5 h-3.5" style={{ accentColor: '#2563eb' }} />
                      <span>{t.allStatus}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="company-status" value="active" checked={selectedStatus === 'active'} onChange={() => { setSelectedStatus('active'); setCurrentPage(1); setIsStatusFilterOpen(false); }} className="w-3.5 h-3.5" style={{ accentColor: '#2563eb' }} />
                      <span>{t.statusActive}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="company-status" value="inactive" checked={selectedStatus === 'inactive'} onChange={() => { setSelectedStatus('inactive'); setCurrentPage(1); setIsStatusFilterOpen(false); }} className="w-3.5 h-3.5" style={{ accentColor: '#2563eb' }} />
                      <span>{t.statusInactive}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/admin/companies/create')}
              onMouseEnter={() => setHoveredAddCompanyButton(true)}
              onMouseLeave={() => setHoveredAddCompanyButton(false)}
              className="hidden sm:inline-flex px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold items-center gap-1.5 transition-colors"
              style={{ backgroundColor: hoveredAddCompanyButton ? '#b91c1c' : '#dc2626', color: 'white' }}
            >
              <Plus className="w-3.5 h-3.5" />
              {t.addCompanyButton}
            </button>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2 sm:px-3 mb-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1 || loading}
            onMouseEnter={() => !(currentPage === 1 || loading) && setHoveredPaginationNavButton('first')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="w-7 h-7 border rounded-full text-[10px] font-semibold flex items-center justify-center transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'first' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: (currentPage === 1 || loading) ? 0.5 : 1,
              cursor: (currentPage === 1 || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            onMouseEnter={() => !(currentPage === 1 || loading) && setHoveredPaginationNavButton('prev')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="w-7 h-7 border rounded-full text-[10px] font-semibold flex items-center justify-center transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'prev' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: (currentPage === 1 || loading) ? 0.5 : 1,
              cursor: (currentPage === 1 || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {[...Array(Math.min(7, Math.max(1, totalPages)))].map((_, i) => {
            let pageNum = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
            if (pageNum < 1 || pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                disabled={loading}
                onMouseEnter={() => !loading && currentPage !== pageNum && setHoveredPaginationButtonIndex(pageNum)}
                onMouseLeave={() => setHoveredPaginationButtonIndex(null)}
                className="w-7 h-7 rounded-full text-[10px] font-semibold flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: currentPage === pageNum ? '#2563eb' : (hoveredPaginationButtonIndex === pageNum ? '#f9fafb' : 'white'),
                  border: currentPage === pageNum ? 'none' : '1px solid #d1d5db',
                  color: currentPage === pageNum ? 'white' : '#374151',
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            onMouseEnter={() => !(currentPage >= totalPages || loading) && setHoveredPaginationNavButton('next')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="w-7 h-7 border rounded-full text-[10px] font-semibold flex items-center justify-center transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'next' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: (currentPage >= totalPages || loading) ? 0.5 : 1,
              cursor: (currentPage >= totalPages || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage >= totalPages || loading}
            onMouseEnter={() => !(currentPage >= totalPages || loading) && setHoveredPaginationNavButton('last')}
            onMouseLeave={() => setHoveredPaginationNavButton(null)}
            className="w-7 h-7 border rounded-full text-[10px] font-semibold flex items-center justify-center transition-colors"
            style={{
              backgroundColor: hoveredPaginationNavButton === 'last' ? '#f9fafb' : 'white',
              borderColor: '#d1d5db',
              color: '#374151',
              opacity: (currentPage >= totalPages || loading) ? 0.5 : 1,
              cursor: (currentPage >= totalPages || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            disabled={loading}
            className="px-2 py-0.5 border rounded-full text-[10px] font-semibold"
            style={{ borderColor: '#d1d5db', color: '#374151', outline: 'none', opacity: loading ? 0.5 : 1 }}
            onFocus={(e) => { if (!loading) { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)'; } }}
            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span className="text-[10px] font-semibold" style={{ color: '#374151' }}>{pagination.total} {t.itemsCount}</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto rounded-lg border min-h-0 relative" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2563eb' }}></div>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12 text-xs" style={{ color: '#6b7280' }}>
            {t.noCompaniesYet}
          </div>
        ) : (
          <div className="overflow-x-auto h-full">
            <div className="grid grid-cols-1 gap-2 p-2 sm:hidden">
              {companies.map((company, index) => (
                <div
                  key={`mobile-${company.id}`}
                  className="rounded-xl border bg-white p-2.5"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={() => handleSelectRow(index)}
                        className="w-3.5 h-3.5 rounded"
                        style={{ accentColor: '#2563eb', borderColor: '#d1d5db' }}
                      />
                      <button
                        onClick={() => navigate(`/admin/companies/${company.id}`)}
                        className="font-medium text-[10px] flex items-center gap-1 truncate"
                        style={{ color: '#2563eb' }}
                      >
                        #{company.id}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(company)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: company.status ? '#dcfce7' : '#fee2e2',
                        color: company.status ? '#166534' : '#991b1b'
                      }}
                    >
                      {company.status ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {company.status ? t.statusActive : t.statusInactive}
                    </button>
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    {company.logo ? (
                      <img src={company.logo} alt={company.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-[10px]" style={{ backgroundColor: '#2563eb' }}>
                        {company.name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <button
                        onClick={() => navigate(`/admin/companies/${company.id}`)}
                        className="block truncate text-left text-[11px] font-semibold"
                        style={{ color: '#111827' }}
                      >
                        {company.name || '—'}
                      </button>
                      <p className="text-[10px] truncate" style={{ color: '#6b7280' }}>{company.companyCode || '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]" style={{ color: '#374151' }}>
                    <span>{t.colLocation}:</span>
                    <span className="text-right">{getLocationLabel(company.type)}</span>
                    <span>{t.colJobCount}:</span>
                    <button
                      onClick={() => navigate(`/admin/jobs?company=${company.id}`)}
                      className="text-right font-semibold"
                      style={{ color: '#2563eb' }}
                    >
                      {company.jobsCount || 0}
                    </button>
                    <span>{t.colCreatedAt}:</span>
                    <span className="text-right">{formatDate(company.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-1.5 border-t pt-1.5" style={{ borderColor: '#f3f4f6' }}>
                    {company.website && (
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="p-1 rounded" style={{ color: '#2563eb' }} title={t.colWebsite}>
                        <Globe className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => navigate(`/admin/companies/${company.id}`)} className="p-1 rounded" style={{ color: '#2563eb' }} title={t.viewDetailTooltip}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => navigate(`/admin/companies/${company.id}/edit`)} className="p-1 rounded" style={{ color: '#4b5563' }} title={t.edit}>
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(company.id, company.name)} className="p-1 rounded" style={{ color: '#dc2626' }} title={t.delete}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <table className="hidden sm:table w-full">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th className="px-2 py-1.5 text-center text-[10px] font-bold border-b w-10" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.size === companies.length && companies.length > 0}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 rounded"
                      style={{ accentColor: '#2563eb', borderColor: '#d1d5db' }}
                    />
                  </th>
                  <th className="px-2.5 py-1.5 text-left text-[10px] font-bold border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colId}</th>
                  <th className="px-2.5 py-1.5 text-left text-[10px] font-bold border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colCompanyName}</th>
                  <th className="px-2.5 py-1.5 text-left text-[10px] font-bold border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colCompanyCode}</th>
                  <th className="px-2.5 py-1.5 text-left text-[10px] font-bold border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colLocation}</th>
                  <th className="px-2.5 py-1.5 text-left text-[10px] font-bold border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colWebsite}</th>
                  <th className="px-2.5 py-1.5 text-left text-[10px] font-bold border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colJobCount}</th>
                  <th className="px-2.5 py-1.5 text-left text-[10px] font-bold border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colStatus}</th>
                  <th className="px-2.5 py-1.5 text-left text-[10px] font-bold border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colCreatedAt}</th>
                  <th className="px-2.5 py-1.5 text-center text-[10px] font-bold border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#e5e7eb' }}>
                {companies.map((company, index) => (
                  <tr
                    key={company.id}
                    className="transition-colors"
                    onMouseEnter={() => setHoveredRowIndex(index)}
                    onMouseLeave={() => setHoveredRowIndex(null)}
                    style={{
                      backgroundColor: hoveredRowIndex === index ? '#f9fafb' : 'transparent'
                    }}
                  >
                    <td className="px-2.5 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={() => handleSelectRow(index)}
                        className="w-3.5 h-3.5 rounded"
                        style={{
                          accentColor: '#2563eb',
                          borderColor: '#d1d5db'
                        }}
                      />
                    </td>
                    <td className="px-2.5 py-1.5">
                      <button
                        onClick={() => navigate(`/admin/companies/${company.id}`)}
                        onMouseEnter={() => setHoveredCompanyIdLinkIndex(index)}
                        onMouseLeave={() => setHoveredCompanyIdLinkIndex(null)}
                        className="font-medium text-[10px] flex items-center gap-1"
                        style={{
                          color: hoveredCompanyIdLinkIndex === index ? '#1e40af' : '#2563eb'
                        }}
                      >
                        {company.id}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt={company.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-[10px]" style={{ backgroundColor: '#2563eb' }}>
                            {company.name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                        )}
                        <button
                          onClick={() => navigate(`/admin/companies/${company.id}`)}
                          onMouseEnter={() => setHoveredCompanyNameLinkIndex(index)}
                          onMouseLeave={() => setHoveredCompanyNameLinkIndex(null)}
                          className="text-[10px] font-semibold"
                          style={{
                            color: hoveredCompanyNameLinkIndex === index ? '#2563eb' : '#111827'
                          }}
                        >
                          {company.name || '—'}
                        </button>
                      </div>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <span className="text-[10px] font-medium" style={{ color: '#374151' }}>{company.companyCode || '—'}</span>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>
                        {getLocationLabel(company.type)}
                      </span>
                    </td>
                    <td className="px-2.5 py-1.5">
                      {company.website ? (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onMouseEnter={() => setHoveredWebsiteLinkIndex(index)}
                          onMouseLeave={() => setHoveredWebsiteLinkIndex(null)}
                          className="text-[10px] flex items-center gap-1"
                          style={{
                            color: hoveredWebsiteLinkIndex === index ? '#1e40af' : '#2563eb'
                          }}
                        >
                          <Globe className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{t.colWebsite}</span>
                        </a>
                      ) : (
                        <span className="text-[10px]" style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                    <td className="px-2.5 py-1.5">
                      <button
                        onClick={() => navigate(`/admin/jobs?company=${company.id}`)}
                        onMouseEnter={() => setHoveredJobCountLinkIndex(index)}
                        onMouseLeave={() => setHoveredJobCountLinkIndex(null)}
                        className="text-[10px] font-semibold flex items-center gap-1"
                        style={{
                          color: hoveredJobCountLinkIndex === index ? '#1e40af' : '#2563eb'
                        }}
                      >
                        <Briefcase className="w-3 h-3" />
                        {company.jobsCount || 0}
                      </button>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <button
                        onClick={() => handleToggleStatus(company)}
                        onMouseEnter={() => setHoveredToggleStatusButtonIndex(index)}
                        onMouseLeave={() => setHoveredToggleStatusButtonIndex(null)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors"
                        style={{
                          backgroundColor: company.status
                            ? (hoveredToggleStatusButtonIndex === index ? '#bbf7d0' : '#dcfce7')
                            : (hoveredToggleStatusButtonIndex === index ? '#fecaca' : '#fee2e2'),
                          color: company.status ? '#166534' : '#991b1b'
                        }}
                      >
                        {company.status ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {company.status ? t.statusActive : t.statusInactive}
                      </button>
                    </td>
                    <td className="px-2.5 py-1.5 text-[10px]" style={{ color: '#374151' }}>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" style={{ color: '#9ca3af' }} />
                        {formatDate(company.createdAt)}
                      </div>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/admin/companies/${company.id}`)}
                          onMouseEnter={() => setHoveredViewButtonIndex(index)}
                          onMouseLeave={() => setHoveredViewButtonIndex(null)}
                          className="p-1 rounded transition-colors"
                          style={{
                            color: hoveredViewButtonIndex === index ? '#1e40af' : '#2563eb',
                            backgroundColor: hoveredViewButtonIndex === index ? '#eff6ff' : 'transparent'
                          }}
                          title={t.viewDetailTooltip}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/companies/${company.id}/edit`)}
                          onMouseEnter={() => setHoveredEditButtonIndex(index)}
                          onMouseLeave={() => setHoveredEditButtonIndex(null)}
                          className="p-1 rounded transition-colors"
                          style={{
                            color: hoveredEditButtonIndex === index ? '#1f2937' : '#4b5563',
                            backgroundColor: hoveredEditButtonIndex === index ? '#f3f4f6' : 'transparent'
                          }}
                          title={t.edit}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(company.id, company.name)}
                          onMouseEnter={() => setHoveredDeleteButtonIndex(index)}
                          onMouseLeave={() => setHoveredDeleteButtonIndex(null)}
                          className="p-1 rounded transition-colors"
                          style={{
                            color: hoveredDeleteButtonIndex === index ? '#991b1b' : '#dc2626',
                            backgroundColor: hoveredDeleteButtonIndex === index ? '#fef2f2' : 'transparent'
                          }}
                          title={t.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompaniesPage;
