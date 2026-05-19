import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import AgentJobsPageSession1, { readJobSearchSession, mergeStoredJobSearchFilters } from '../Agent/AgentJobsPageSession1';
import AgentJobsPageSession2 from '../Agent/AgentJobsPageSession2';
import { Plus, Building2, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';

/** Khôi phục danh sách job + filter công ty (admin) khi quay lại từ chi tiết */
/** v2: invalidate session cache so job payloads include multilingual valueRef. */
const JOBS_LIST_SESSION_PREFIX = 'wsj_jobsListPage_v2';

const readJobsListSession = (useAdminAPI) => {
  try {
    const raw = sessionStorage.getItem(`${JOBS_LIST_SESSION_PREFIX}_${useAdminAPI ? 'admin' : 'ctv'}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Component danh sách việc làm dùng chung cho Agent, Admin, Admin Group.
 * @param {string} jobsBasePath - Base path cho links (vd: '/agent/jobs', '/admin/jobs')
 * @param {boolean} useAdminAPI - Dùng API admin (get jobs admin) hay API CTV
 * @param {boolean} showAdminToolbar - Hiện toolbar Admin (Công ty Nguồn, campaign, Thêm job)
 * @param {string} [createPath] - Đường dẫn trang thêm job (vd: '/admin/jobs/create')
 * @param {boolean} [embedded] - Gắn trong trang public (landing): không khóa chiều cao viewport, cuộn theo trang
 */
const JobsListPage = ({
  jobsBasePath = '/agent/jobs',
  useAdminAPI = false,
  showAdminToolbar = false,
  createPath = '/admin/jobs/create',
  embedded = false,
}) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyDropdownRef = useRef(null);
  const [jobs, setJobs] = useState(() => null);
  const [filters, setFilters] = useState(() => {
    if (embedded) return null;
    const snap = readJobSearchSession(useAdminAPI);
    if (snap?.filters) return mergeStoredJobSearchFilters(snap.filters);
    return null;
  });
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(() => {
    if (embedded) return '';
    const snap = readJobsListSession(useAdminAPI);
    return snap?.selectedCompany != null && snap.selectedCompany !== ''
      ? snap.selectedCompany
      : '';
  });
  const [companySearchText, setCompanySearchText] = useState('');
  const [hasCampaignOnly, setHasCampaignOnly] = useState(() => {
    if (embedded) return false;
    const snap = readJobsListSession(useAdminAPI);
    return !!snap?.hasCampaignOnly;
  });
  const [adminJobStatusFilter, setAdminJobStatusFilter] = useState(() => {
    if (embedded) return '';
    const snap = readJobsListSession(useAdminAPI);
    const v = snap?.jobStatus;
    return v === '0' || v === '1' || v === '2' || v === '3' ? v : '';
  });
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  useEffect(() => {
    if (embedded) return undefined;
    try {
      sessionStorage.setItem(
        `${JOBS_LIST_SESSION_PREFIX}_${useAdminAPI ? 'admin' : 'ctv'}`,
        JSON.stringify({
          selectedCompany,
          hasCampaignOnly,
          jobStatus: adminJobStatusFilter,
        })
      );
    } catch {
      // ignore
    }
    return undefined;
  }, [selectedCompany, hasCampaignOnly, adminJobStatusFilter, useAdminAPI, embedded]);

  useEffect(() => {
    const campaignId = searchParams.get('campaignId');
    const articleId = searchParams.get('articleId');
    const eventId = searchParams.get('eventId');
    const pickupId = searchParams.get('pickupId');
    const postId = searchParams.get('postId');
    const isHot = searchParams.get('isHot') === 'true';
    const isPinned = searchParams.get('isPinned') === 'true';
    if (campaignId || articleId || eventId || pickupId || postId || isHot || isPinned) {
      setFilters({
        campaignId: campaignId ? parseInt(campaignId) : null,
        articleId: articleId ? parseInt(articleId) : null,
        eventId: eventId ? parseInt(eventId) : null,
        pickupId: pickupId ? parseInt(pickupId) : null,
        postId: postId ? parseInt(postId) : null,
        isHot: isHot || false,
        isPinned: isPinned || false,
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (showAdminToolbar) loadCompanies();
  }, [showAdminToolbar]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target)) {
        setCompanyDropdownOpen(false);
      }
    };
    if (companyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [companyDropdownOpen]);

  const loadCompanies = async () => {
    try {
      const response = await apiService.getCompanies({ limit: 500 });
      if (response.success && response.data) {
        const list = response.data.companies || response.data.items || (Array.isArray(response.data) ? response.data : []);
        setCompanies(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleSearch = (searchResults) => {
    if (searchResults === null) {
      setJobs(null);
      return;
    }
    setJobs(Array.isArray(searchResults) ? searchResults : []);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const getCompanyDisplayName = (company) => {
    if (!company) return '';
    const vi = company.companyName || company.name || '';
    const en = company.companyNameEn || company.company_name_en || company.nameEn || company.name_en || '';
    const ja = company.companyNameJp || company.company_name_jp || company.nameJp || company.name_jp || '';
    if (language === 'en') return en || vi || ja || '';
    if (language === 'ja') return ja || en || vi || '';
    return vi || en || ja || '';
  };

  const filteredCompanies = companySearchText.trim()
    ? companies.filter((c) =>
        [
          c.companyName, c.name, c.companyNameEn, c.company_name_en, c.nameEn, c.name_en,
          c.companyNameJp, c.company_name_jp, c.nameJp, c.name_jp
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(companySearchText.trim().toLowerCase())
      )
    : companies;

  return (
    <div
      className={
        embedded
          ? 'flex w-full flex-col gap-3 text-neutral-900 lg:flex-row lg:items-stretch lg:gap-4'
          : 'flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3 lg:flex-row lg:gap-3'
      }
    >
      <div
        className={
          embedded
            ? 'flex w-full flex-shrink-0 flex-col gap-2 lg:w-1/4 lg:max-h-[min(75vh,720px)] lg:overflow-y-auto'
            : /* Mobile: không dùng h-full — tránh ô filter chiếm trọn chiều cao, đẩy danh sách job về 0 */
              'flex w-full flex-shrink-0 flex-col gap-2 overflow-hidden lg:h-full lg:w-1/4 xl:w-[280px]'
        }
      >
        {showAdminToolbar && (
          <>
            {/* Tách riêng nút +Thêm job khỏi khu vực filter/tìm kiếm */}
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={() => navigate(createPath)}
                className="w-full px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors flex items-center justify-center gap-0.5"
                style={{ backgroundColor: '#dc2626', color: 'white' }}
              >
                <Plus className="w-2.5 h-2.5" />
                {language === 'vi' ? 'Thêm job' : language === 'ja' ? '求人追加' : 'Add job'}
              </button>
            </div>

            <div className="rounded p-1.5 border flex-shrink-0" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <div className="space-y-0.5">
                <label className="block text-[9px] font-semibold leading-tight" style={{ color: '#111827' }}>
                  {t.jobSourceCompanyLabel || (language === 'vi' ? 'Công ty nguồn' : language === 'ja' ? 'ソース企業' : 'Source company')}
                </label>
                <div className="relative" ref={companyDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                    className="w-full px-1.5 py-0.5 pr-5 border rounded text-[9px] text-left flex items-center gap-1"
                    style={{ borderColor: '#d1d5db', outline: 'none' }}
                  >
                    <Building2 className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#9ca3af' }} />
                    <span className="truncate">
                      {selectedCompany
                        ? (getCompanyDisplayName(companies.find((c) => c.id === selectedCompany))
                          || (language === 'vi' ? 'Chọn công ty' : language === 'ja' ? '企業を選択' : 'Select company'))
                        : (language === 'vi' ? 'Tất cả công ty' : language === 'ja' ? 'すべての企業' : 'All companies')}
                    </span>
                    <ChevronDown className="w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }} />
                  </button>
                  {companyDropdownOpen && (
                    <div className="absolute z-20 mt-0.5 w-full border rounded shadow-lg overflow-hidden" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
                      <div className="p-1 border-b" style={{ borderColor: '#e5e7eb' }}>
                        <input
                          type="text"
                          placeholder={language === 'vi' ? 'Gõ để tìm...' : language === 'ja' ? '入力して検索...' : 'Type to search...'}
                          value={companySearchText}
                          onChange={(e) => setCompanySearchText(e.target.value)}
                          className="w-full px-1.5 py-0.5 border rounded text-[9px]"
                          style={{ borderColor: '#d1d5db', outline: 'none' }}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-28 overflow-y-auto py-0.5">
                        <button
                          type="button"
                          className="w-full text-left px-1.5 py-1 text-[9px] hover:bg-gray-50"
                          onClick={() => { setSelectedCompany(''); setCompanySearchText(''); setCompanyDropdownOpen(false); }}
                        >
                          {language === 'vi' ? 'Tất cả công ty' : language === 'ja' ? 'すべての企業' : 'All companies'}
                        </button>
                        {filteredCompanies.map((company) => (
                          <button
                            key={company.id}
                            type="button"
                            className="w-full text-left px-1.5 py-1 text-[9px] hover:bg-gray-50 flex items-center gap-1"
                            onClick={() => { setSelectedCompany(company.id); setCompanySearchText(''); setCompanyDropdownOpen(false); }}
                          >
                            <Building2 className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#9ca3af' }} />
                            <span className="truncate">{getCompanyDisplayName(company) || '—'}</span>
                          </button>
                        ))}
                        {filteredCompanies.length === 0 && (
                          <div className="px-1.5 py-1 text-[9px] text-gray-500">
                            {language === 'vi' ? 'Không tìm thấy' : language === 'ja' ? '見つかりません' : 'No results'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                <button
                  type="button"
                  onClick={() => setHasCampaignOnly(!hasCampaignOnly)}
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors"
                  style={{ backgroundColor: hasCampaignOnly ? '#dc2626' : '#f3f4f6', color: hasCampaignOnly ? 'white' : '#374151' }}
                >
                  {language === 'vi' ? 'Tìm job có campaign' : language === 'ja' ? 'キャンペーン付き求人を検索' : 'Filter jobs with campaign'}
                </button>
                <label className="flex items-center gap-0.5 min-w-0">
                  <span className="text-[9px] font-semibold whitespace-nowrap" style={{ color: '#374151' }}>
                    {language === 'vi' ? 'Trạng thái' : language === 'ja' ? '状態' : 'Status'}
                  </span>
                  <select
                    value={adminJobStatusFilter}
                    onChange={(e) => setAdminJobStatusFilter(e.target.value)}
                    className="max-w-[9.5rem] rounded border px-1 py-0.5 text-[9px] font-medium bg-white"
                    style={{ borderColor: '#d1d5db', color: '#111827' }}
                  >
                    <option value="">
                      {language === 'vi' ? 'Tất cả' : language === 'ja' ? 'すべて' : 'All'}
                    </option>
                    <option value="0">{language === 'vi' ? 'Bản nháp' : language === 'ja' ? '下書き' : 'Draft'}</option>
                    <option value="1">{language === 'vi' ? 'Đã công bố' : language === 'ja' ? '公開中' : 'Published'}</option>
                    <option value="2">{language === 'vi' ? 'Đã đóng' : language === 'ja' ? '募集終了' : 'Closed'}</option>
                    <option value="3">{language === 'vi' ? 'Hết hạn' : language === 'ja' ? '期限切れ' : 'Expired'}</option>
                  </select>
                </label>
              </div>
            </div>
          </>
        )}

        <div
          className={
            embedded
              ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain lg:max-h-[min(75vh,720px)]'
              : showAdminToolbar
                ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain'
                : 'min-h-0 flex-1 overflow-hidden'
          }
        >
          <AgentJobsPageSession1
            onSearch={handleSearch}
            onFiltersChange={handleFiltersChange}
            compact={true}
            useAdminAPI={useAdminAPI}
            adminCompanyId={showAdminToolbar ? selectedCompany : undefined}
            adminHasCampaign={showAdminToolbar ? hasCampaignOnly : undefined}
            adminJobStatus={showAdminToolbar ? adminJobStatusFilter : undefined}
            hideCtvPersonalNav={embedded}
            onClearAdminToolbar={
              showAdminToolbar
                ? () => {
                    setSelectedCompany('');
                    setHasCampaignOnly(false);
                    setAdminJobStatusFilter('');
                    setCompanySearchText('');
                  }
                : undefined
            }
          />
        </div>
      </div>

      <div
        className={
          embedded
            ? 'h-[min(65vh,560px)] min-h-[480px] w-full min-w-0 flex-1 sm:min-h-[520px] lg:h-[min(75vh,820px)] lg:min-h-[560px]'
            : 'flex-1 min-h-0 min-w-0 overflow-hidden lg:h-full'
        }
      >
        <AgentJobsPageSession2
          jobs={jobs}
          filters={filters}
          showAllJobs={true}
          enablePagination={true}
          useAdminAPI={useAdminAPI}
          jobsBasePath={jobsBasePath}
          adminCompanyId={showAdminToolbar ? selectedCompany : undefined}
          adminHasCampaign={showAdminToolbar ? hasCampaignOnly : undefined}
          adminJobStatus={showAdminToolbar ? adminJobStatusFilter : undefined}
          onJobStatusUpdated={
            useAdminAPI
              ? (id, status) =>
                  setJobs((prev) => {
                    if (prev == null || !Array.isArray(prev)) return prev;
                    return prev.map((j) => (String(j.id) === String(id) ? { ...j, status } : j));
                  })
              : undefined
          }
          hideExpectedReferralFee={embedded}
          onJobDeleted={
            useAdminAPI
              ? (id) =>
                  setJobs((prev) => {
                    if (prev == null || !Array.isArray(prev)) return prev;
                    return prev.filter((j) => String(j.id) !== String(id));
                  })
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default JobsListPage;
