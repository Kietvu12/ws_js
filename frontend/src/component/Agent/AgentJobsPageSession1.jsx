import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Globe,
  Star,
  CheckSquare,
  Plus,
  X,
  ChevronDown,
  Clock,
  RotateCw,
  Bookmark,
  Heart,
  Info,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';
import { BUSINESS_SECTOR_OPTIONS } from '../../utils/businessSectorOptions';
import { JAPAN_REGIONS, JAPAN_PREFECTURES, fetchJapanCitiesByPrefecture, kanaToRomaji } from '../../utils/japanLocationData';
import { getRecruitmentLocationLabel } from '../../utils/recruitmentLocationLabels';
import { hasActiveAgentJobSearchCriteria, hasAdminJobsToolbarListContext } from '../../utils/agentJobSearchCriteria';
import { JOB_HIGHLIGHT_OPTIONS } from '../../utils/jobHighlightOptions';


// Mock data for static options
const mockLocations = [
  'Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Fukuoka', 'Sapporo', 'Sendai',
  'Hiroshima', 'Kobe', 'Chiba', 'Saitama', 'Kanagawa', 'Aichi', 'Hyogo'
];

/** Tỉnh/thành Việt Nam — chọn phẳng giống AddJob */
const VIETNAM_PROVINCES = [
  'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'An Giang', 'Bà Rịa - Vũng Tàu',
  'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương',
  'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên',
  'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Tĩnh', 'Hải Dương',
  'Hậu Giang', 'Hòa Bình', 'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình',
  'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh',
  'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
  'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái',
];

const LOCATION_FILTER_COUNTRY_KEYS = ['Vietnam', 'Japan'];

const countryFilterLabel = (key, lang) => {
  if (key === 'Vietnam') return lang === 'en' ? 'Vietnam' : lang === 'ja' ? 'ベトナム' : 'Việt Nam';
  if (key === 'Japan') return lang === 'en' ? 'Japan' : lang === 'ja' ? '日本' : 'Nhật Bản';
  return key;
};

/** Khôi phục form tìm kiếm sau khi vào chi tiết job rồi quay lại (sessionStorage) */
const JOB_SEARCH_SESSION_KEY_PREFIX = 'wsj_agentJobSearch_v1';

const getDefaultJobSearchFilters = () => ({
  keyword: '',
  locations: [],
  fieldIds: [],
  jobTypeIds: [],
  sectorNames: [],
  age: null,
  salaryMin: '',
  salaryMax: '',
  recruitmentLocation: '',
  employmentType: null,
  highlights: [],
});

const createEmptyLocationModalDraft = () => [];
const ALL_JAPAN_REGIONS_KEY = '__ALL_JAPAN_REGIONS__';
const ALL_JAPAN_PREFECTURES_KEY = '__ALL_JAPAN_PREFECTURES__';
const createEmptyJapanSelectionDraft = () => ({ allRegions: false, regions: [], prefectures: [] });

const createJapanRegionEntry = (region, language) => ({
  country: 'Japan',
  location: language === 'ja' ? region.ja : region.en,
  locationJp: region.ja,
  jpId: `region|${region.id}`,
  locationLevel: 'region',
  searchTerm: region.ja,
});

const createJapanPrefectureEntry = (prefCode, language) => {
  const pref = JAPAN_PREFECTURES[prefCode];
  if (!pref) return null;
  return {
    country: 'Japan',
    location: language === 'ja' ? pref.ja : pref.en,
    locationJp: pref.ja,
    jpId: `pref|${prefCode}`,
    locationLevel: 'prefecture',
    searchTerm: pref.ja,
  };
};

const createJapanWardEntry = (prefCode, nameJa, nameKana, language) => {
  const pref = JAPAN_PREFECTURES[prefCode];
  const prefJa = pref?.ja || '';
  const prefEn = pref?.en || '';
  const toR = (kana, fb) => (kana ? kanaToRomaji(kana) : fb);
  const ja = `${prefJa} ${nameJa}`.trim();
  const alpha = `${prefEn} ${toR(nameKana, nameJa)}`.trim();
  return {
    country: 'Japan',
    location: language === 'ja' ? ja : alpha,
    locationJp: ja,
    jpId: `${prefCode}|${nameJa}`,
    locationLevel: 'ward',
    searchTerm: nameJa,
  };
};

const deriveJapanSelectionDraftFromLocations = (locations) => {
  const regionIdsFromEntries = [];
  const prefCodesFromEntries = [];
  const selectedPrefectures = Array.from(
    new Set(
      (Array.isArray(locations) ? locations : [])
        .filter((loc) => loc?.country === 'Japan' && typeof loc?.jpId === 'string')
        .map((loc) => {
          const rawId = String(loc.jpId);
          if (rawId.startsWith('region|')) {
            regionIdsFromEntries.push(rawId.split('|')[1]);
            return null;
          }
          if (rawId.startsWith('pref|')) {
            const prefCode = rawId.split('|')[1];
            prefCodesFromEntries.push(prefCode);
            return prefCode;
          }
          return rawId.split('|')[0];
        })
        .filter(Boolean)
    )
  );

  const selectedRegions = Array.from(new Set([
    ...regionIdsFromEntries,
    ...JAPAN_REGIONS.filter((region) =>
    region.prefectureCodes.some((prefCode) => selectedPrefectures.includes(prefCode))
  ).map((region) => region.id),
  ]));

  return {
    allRegions: false,
    regions: selectedRegions,
    prefectures: Array.from(new Set([...prefCodesFromEntries, ...selectedPrefectures])),
  };
};

export const mergeStoredJobSearchFilters = (raw) => {
  const d = getDefaultJobSearchFilters();
  if (!raw || typeof raw !== 'object') return d;
  return {
    ...d,
    ...raw,
    locations: Array.isArray(raw.locations) ? raw.locations : [],
    fieldIds: Array.isArray(raw.fieldIds) ? raw.fieldIds.map(String) : [],
    jobTypeIds: Array.isArray(raw.jobTypeIds) ? raw.jobTypeIds.map(String) : [],
    sectorNames: Array.isArray(raw.sectorNames) ? raw.sectorNames : [],
    recruitmentLocation: (() => {
      const v = raw.recruitmentLocation;
      if (v === null || v === undefined || v === '') return '';
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) && n >= 1 && n <= 4 ? String(n) : '';
    })(),
    highlights: Array.isArray(raw.highlights) ? raw.highlights : [],
  };
};

export const readJobSearchSession = (useAdminAPI) => {
  try {
    const raw = sessionStorage.getItem(`${JOB_SEARCH_SESSION_KEY_PREFIX}_${useAdminAPI ? 'admin' : 'ctv'}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const mockEmploymentTypes = [
  'Nhân viên chính thức',
  'Nhân viên hợp đồng',
  'Bán thời gian / Thời vụ',
  'Nhân viên tạm thời',
  'Ủy thác công việc',
];



// Header Navigation Buttons Component
const HeaderNavigationButtons = ({
  onSearchHistoryClick,
  onSavedCriteriaClick,
  onSavedListClick,
  compact = false,
  language = 'vi',
  hoveredNavButtonIndex,
  setHoveredNavButtonIndex,
  savedListsTotalJobs = 0,
}) => {
  if (compact) {
    return (
      <div className="mb-1">
        <div className="flex items-center gap-0">
          <button
            onClick={onSearchHistoryClick}
            onMouseEnter={() => setHoveredNavButtonIndex('history-compact')}
            onMouseLeave={() => setHoveredNavButtonIndex(null)}
            className="flex items-center gap-1 px-1.5 py-0.5 transition-colors justify-center text-[9px]"
            style={{
              backgroundColor: hoveredNavButtonIndex === 'history-compact' ? '#f9fafb' : 'transparent'
            }}
          >
            <Clock className="w-2.5 h-2.5" style={{ color: '#f97316' }} />
            <span className="font-medium truncate" style={{ color: '#1e3a8a' }}>
              {language === 'vi' ? 'Lịch sử' : language === 'ja' ? '履歴' : 'History'}
            </span>
          </button>
          <span className="text-[9px]" style={{ color: '#d1d5db' }}>|</span>
          <button
            onClick={onSavedCriteriaClick}
            onMouseEnter={() => setHoveredNavButtonIndex('criteria-compact')}
            onMouseLeave={() => setHoveredNavButtonIndex(null)}
            className="flex items-center gap-1 px-1.5 py-0.5 transition-colors justify-center text-[9px]"
            style={{
              backgroundColor: hoveredNavButtonIndex === 'criteria-compact' ? '#f9fafb' : 'transparent'
            }}
          >
            <Bookmark className="w-2.5 h-2.5" style={{ color: '#60a5fa' }} />
            <span className="font-medium truncate" style={{ color: '#1e3a8a' }}>
              {language === 'vi' ? 'Tiêu chí đã lưu' : language === 'ja' ? '保存条件' : 'Saved criteria'}
            </span>
          </button>
          <span className="text-[9px]" style={{ color: '#d1d5db' }}>|</span>
          <button
            onClick={onSavedListClick}
            onMouseEnter={() => setHoveredNavButtonIndex('list-compact')}
            onMouseLeave={() => setHoveredNavButtonIndex(null)}
            className="flex items-center gap-1 px-1.5 py-0.5 transition-colors justify-center text-[9px]"
            style={{
              backgroundColor: hoveredNavButtonIndex === 'list-compact' ? '#f9fafb' : 'transparent'
            }}
          >
            <Heart className="w-2.5 h-2.5" style={{ color: '#ef4444' }} />
            <span className="font-medium truncate" style={{ color: '#1e3a8a' }}>
              {(language === 'vi' ? 'Danh sách' : language === 'ja' ? 'リスト' : 'List')}
              {savedListsTotalJobs > 0 ? ` (${savedListsTotalJobs})` : ''}
            </span>
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-2">
      <div className="flex items-center gap-0">
        <button
          onClick={onSearchHistoryClick}
          onMouseEnter={() => setHoveredNavButtonIndex('history')}
          onMouseLeave={() => setHoveredNavButtonIndex(null)}
          className="flex items-center gap-1 px-2 py-1 transition-colors justify-center text-[9px]"
          style={{
            backgroundColor: hoveredNavButtonIndex === 'history' ? '#f9fafb' : 'transparent'
          }}
        >
          <Clock className="w-3 h-3" style={{ color: '#f97316' }} />
          <span className="font-medium whitespace-nowrap" style={{ color: '#1e3a8a' }}>
            {language === 'vi' ? 'Lịch sử tìm kiếm' : language === 'ja' ? '検索履歴' : 'Search history'}
          </span>
        </button>
        <span className="text-[9px]" style={{ color: '#d1d5db' }}>|</span>
        <button
          onClick={onSavedCriteriaClick}
          onMouseEnter={() => setHoveredNavButtonIndex('criteria')}
          onMouseLeave={() => setHoveredNavButtonIndex(null)}
          className="flex items-center gap-1 px-2 py-1 transition-colors justify-center text-[9px]"
          style={{
            backgroundColor: hoveredNavButtonIndex === 'criteria' ? '#f9fafb' : 'transparent'
          }}
        >
          <Bookmark className="w-3 h-3" style={{ color: '#60a5fa' }} />
          <span className="font-medium whitespace-nowrap" style={{ color: '#1e3a8a' }}>
            {language === 'vi' ? 'Tiêu chí tìm kiếm đã lưu' : language === 'ja' ? '保存済み検索条件' : 'Saved search criteria'}
          </span>
        </button>
        <span className="text-[9px]" style={{ color: '#d1d5db' }}>|</span>
        <button
          onClick={onSavedListClick}
          onMouseEnter={() => setHoveredNavButtonIndex('list')}
          onMouseLeave={() => setHoveredNavButtonIndex(null)}
          className="flex items-center gap-1 px-2 py-1 transition-colors justify-center text-[9px]"
          style={{
            backgroundColor: hoveredNavButtonIndex === 'list' ? '#f9fafb' : 'transparent'
          }}
        >
          <Heart className="w-3 h-3" style={{ color: '#ef4444' }} />
          <span className="font-medium whitespace-nowrap" style={{ color: '#1e3a8a' }}>
            {language === 'vi' ? 'Danh sách lưu giữ' : language === 'ja' ? '保存リスト' : 'Saved lists'}
            {savedListsTotalJobs > 0 ? (
              <span className="font-bold">
                {' '}
                {savedListsTotalJobs} {language === 'vi' ? 'job' : language === 'ja' ? '件' : 'jobs'}
              </span>
            ) : null}
          </span>
        </button>
      </div>
    </div>
  );
};

// FilterBlock đặt ngoài component để không bị tạo mới mỗi lần render (tránh input mất focus khi gõ)
const FilterBlock = ({ 
  icon: Icon, 
  label, 
  children, 
  helperText,
  compact = false
}) => (
  <div className="flex gap-1 min-w-0 items-start">
    <div className="flex-shrink-0 leading-none">
      <Icon className="w-3 h-3 text-gray-600" />
    </div>
    <div className="flex-1 space-y-0.5 min-w-0">
      <label className="text-[9px] font-medium text-gray-700 block h-3 leading-3">{label}</label>
      {children}
      {helperText && (
        <p className="text-[9px] text-gray-500">{helperText}</p>
      )}
    </div>
  </div>
);

const AgentJobsPageSession1 = ({
  onSearch,
  onFiltersChange,
  compact = false,
  useAdminAPI = false,
  adminCompanyId = '',
  adminHasCampaign = false,
  /** '' = mọi trạng thái; '0'..'3' = Draft / Published / Closed / Expired */
  adminJobStatus = '',
  adminCreatedFrom = '',
  adminCreatedTo = '',
  adminJapaneseLevel = '',
  adminRecruitmentLocation = '',
  adminWorkLocation = '',
  /** Ẩn Lịch sử / Tiêu chí đã lưu / Danh sách (trang landing public) */
  hideCtvPersonalNav = false,
  /** JobsListPage admin: reset công ty nguồn / campaign / trạng thái khi «Xóa điều kiện» */
  onClearAdminToolbar,
}) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const keywordInputRef = useRef(null);
  const persistJobSearchTimerRef = useRef(null);
  const jobSearchRestoreDoneRef = useRef(false);

  // State — khôi phục từ sessionStorage khi quay lại từ trang chi tiết job (không áp dụng landing embedded)
  const [filters, setFilters] = useState(() => {
    if (hideCtvPersonalNav) return getDefaultJobSearchFilters();
    const snap = readJobSearchSession(useAdminAPI);
    if (snap?.filters) return mergeStoredJobSearchFilters(snap.filters);
    return getDefaultJobSearchFilters();
  });

  // const [showKeywordMode, setShowKeywordMode] = useState(false); // Đã bỏ OR/AND cho keyword
  const [showLocationModal, setShowLocationModal] = useState(false); // Show both modals together
  const [selectedCountries, setSelectedCountries] = useState([]); // Array of selected countries
  const [draftLocations, setDraftLocations] = useState(createEmptyLocationModalDraft);
  /** Nhật Bản: vùng → tỉnh → phường/thành (giống AddJob) */
  const [japanFilterRegion, setJapanFilterRegion] = useState(null);
  const [japanFilterPrefecture, setJapanFilterPrefecture] = useState(null);
  const [japanSelectionDraft, setJapanSelectionDraft] = useState(createEmptyJapanSelectionDraft);
  const [japanFilterData, setJapanFilterData] = useState({ flat: [], tree: [] });
  const [japanPrefectureCache, setJapanPrefectureCache] = useState({});
  const [japanFilterLoading, setJapanFilterLoading] = useState(false);
  const [japanBulkLoading, setJapanBulkLoading] = useState(null);

  const resetLocationModalState = () => {
    setSelectedCountries([]);
    setDraftLocations(createEmptyLocationModalDraft());
    setJapanFilterRegion(null);
    setJapanFilterPrefecture(null);
    setJapanSelectionDraft(createEmptyJapanSelectionDraft());
    setJapanFilterData({ flat: [], tree: [] });
    setJapanPrefectureCache({});
    setJapanFilterLoading(false);
    setJapanBulkLoading(null);
  };

  const openLocationModal = () => {
    const nextDraftLocations = Array.isArray(filters.locations) ? [...filters.locations] : [];
    const countries = Array.from(
      new Set(nextDraftLocations.map((loc) => loc?.country).filter(Boolean))
    );
    const hasJapan = countries.includes('Japan');
    const nextJapanSelectionDraft = hasJapan
      ? deriveJapanSelectionDraftFromLocations(nextDraftLocations)
      : createEmptyJapanSelectionDraft();

    setSelectedCountries(countries);
    setDraftLocations(nextDraftLocations);
    setJapanSelectionDraft(nextJapanSelectionDraft);
    setJapanFilterRegion(
      nextJapanSelectionDraft.regions[0] || null
    );
    setJapanFilterPrefecture(
      nextJapanSelectionDraft.prefectures[0] || null
    );
    setJapanFilterData({ flat: [], tree: [] });
    setJapanFilterLoading(false);
    setJapanBulkLoading(null);
    setShowLocationModal(true);
  };

  const closeLocationModal = () => {
    setShowLocationModal(false);
    resetLocationModalState();
  };

  const confirmLocationModal = () => {
    setFilters((prev) => ({ ...prev, locations: draftLocations }));
    closeLocationModal();
  };

  useEffect(() => {
    if (!selectedCountries.includes('Japan')) {
      setJapanFilterRegion(null);
      setJapanFilterPrefecture(null);
      setJapanFilterData({ flat: [], tree: [] });
    }
  }, [selectedCountries]);

  useEffect(() => {
    if (!japanFilterPrefecture) {
      setJapanFilterData({ flat: [], tree: [] });
      return;
    }
    let cancelled = false;
    setJapanFilterLoading(true);
    loadJapanPrefectureData(japanFilterPrefecture)
      .then((r) => {
        if (!cancelled) setJapanFilterData(r || { flat: [], tree: [] });
      })
      .catch(() => {
        if (!cancelled) setJapanFilterData({ flat: [], tree: [] });
      })
      .finally(() => {
        if (!cancelled) setJapanFilterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [japanFilterPrefecture]);
  const [showFieldJobTypeModal, setShowFieldJobTypeModal] = useState(false); // Dual modal for field and job type
  const [showSectorModal, setShowSectorModal] = useState(false); // Modal chọn lĩnh vực kinh doanh
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingJobTypes, setLoadingJobTypes] = useState(false);
  const [availableFields, setAvailableFields] = useState([]);
  const [availableJobTypes, setAvailableJobTypes] = useState([]); // All job types with parentId
  const [categoryTree, setCategoryTree] = useState([]); // Full category tree for nested display
  const [selectedFields, setSelectedFields] = useState([]); // Selected fields for dual modal
  const [resultCount, setResultCount] = useState(() => {
    if (hideCtvPersonalNav) return 0;
    const snap = readJobSearchSession(useAdminAPI);
    return typeof snap?.resultCount === 'number' ? snap.resultCount : 0;
  });
  const [displayCount, setDisplayCount] = useState(0);
  const [locations, setLocations] = useState([]); // Địa điểm làm việc
  const [loading, setLoading] = useState(false);
  
  // New modal states
  const [showSearchHistoryModal, setShowSearchHistoryModal] = useState(false);
  const [showSavedCriteriaModal, setShowSavedCriteriaModal] = useState(false);
  const [showSavedListModal, setShowSavedListModal] = useState(false);
  const [showSaveCriteriaNameModal, setShowSaveCriteriaNameModal] = useState(false);
  const [saveCriteriaNameInput, setSaveCriteriaNameInput] = useState('');
  const [savedCriteriaRefreshTrigger, setSavedCriteriaRefreshTrigger] = useState(0);
  const [savedListsTotalJobs, setSavedListsTotalJobs] = useState(0); // tổng số job trong tất cả list (để hiển thị header)
  const [showMobileAdvancedFilter, setShowMobileAdvancedFilter] = useState(false); // Slide-in filter modal for mobile
  
  // Hover states
  const [hoveredNavButtonIndex, setHoveredNavButtonIndex] = useState(null);
  const [hoveredLocationButton, setHoveredLocationButton] = useState(false);
  const [hoveredFieldButton, setHoveredFieldButton] = useState(false);
  const [hoveredJobTypeButton, setHoveredJobTypeButton] = useState(false);
  const [hoveredSectorButton, setHoveredSectorButton] = useState(false);
  const [hoveredHighlightButton, setHoveredHighlightButton] = useState(false);
  const [hoveredCheckboxIndex, setHoveredCheckboxIndex] = useState(null);
  const [hoveredClearButton, setHoveredClearButton] = useState(false);
  const [hoveredSearchButton, setHoveredSearchButton] = useState(false);
  const [hoveredSaveSearchButton, setHoveredSaveSearchButton] = useState(false);
  const [hoveredModalCloseButton, setHoveredModalCloseButton] = useState(null);
  const [hoveredModalConfirmButton, setHoveredModalConfirmButton] = useState(null);
  const [hoveredModalItemIndex, setHoveredModalItemIndex] = useState(null);
  const [hoveredSlideModalCloseButton, setHoveredSlideModalCloseButton] = useState(false);
  const [hoveredSearchHistoryButtonIndex, setHoveredSearchHistoryButtonIndex] = useState(null);
  const [hoveredSavedCriteriaButtonIndex, setHoveredSavedCriteriaButtonIndex] = useState(null);
  const [hoveredSavedListButtonIndex, setHoveredSavedListButtonIndex] = useState(null);

  // Lưu form tìm kiếm + số kết quả để quay lại từ chi tiết job không mất điều kiện
  useEffect(() => {
    if (hideCtvPersonalNav) return undefined;
    const key = `${JOB_SEARCH_SESSION_KEY_PREFIX}_${useAdminAPI ? 'admin' : 'ctv'}`;
    if (persistJobSearchTimerRef.current) clearTimeout(persistJobSearchTimerRef.current);
    persistJobSearchTimerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify({ filters, resultCount }));
      } catch {
        // ignore quota / private mode
      }
    }, 250);
    return () => {
      if (persistJobSearchTimerRef.current) clearTimeout(persistJobSearchTimerRef.current);
    };
  }, [filters, resultCount, hideCtvPersonalNav, useAdminAPI]);

  // Load data on mount (reload categories when useAdminAPI thay đổi)
  useEffect(() => {
    loadCategoryTree();
    loadLocations();
  }, [useAdminAPI]);

  // Load category tree (full hierarchy)
  const loadCategoryTree = async () => {
    try {
      setLoadingFields(true);
      setLoadingJobTypes(true);
      
      const processTree = (tree) => {
        if (!tree || !Array.isArray(tree)) return;
        setCategoryTree(tree);
        const flattenTree = (categories, level = 0) => {
          let result = [];
          categories.forEach(cat => {
            result.push({
              ...cat,
              id: String(cat.id),
              level: level,
              parentId: cat.parentId ? String(cat.parentId) : null
            });
            if (cat.children && cat.children.length > 0) {
              result = result.concat(flattenTree(cat.children, level + 1));
            }
          });
          return result;
        };
        const allCategories = flattenTree(tree);
        const fields = allCategories.filter(cat => !cat.parentId);
        const jobTypes = allCategories.filter(cat => cat.parentId);
        setAvailableFields(fields.map(cat => ({
          id: cat.id,
          name: cat.name,
          nameEn: cat.nameEn,
          nameJp: cat.nameJp,
          level: cat.level
        })));
        setAvailableJobTypes(jobTypes.map(cat => ({
          id: cat.id,
          name: cat.name,
          nameEn: cat.nameEn,
          nameJp: cat.nameJp,
          parentId: cat.parentId,
          level: cat.level
        })));
      };

      // Dùng API tương ứng: Admin khi useAdminAPI, CTV khi dùng trang Agent
      try {
        const treeResponse = useAdminAPI
          ? await apiService.getJobCategoryTree({ status: 1 })
          : await apiService.getCTVJobCategoryTree();
        if (treeResponse?.success && treeResponse?.data?.tree) {
          processTree(treeResponse.data.tree);
          return;
        }
      } catch (treeError) {
        console.log('Tree API not available, falling back to flat list:', treeError?.message);
      }
      
      // Fallback: Load flat list với limit cao, rồi build lại cây phân cấp
      try {
        const fetchCategories = useAdminAPI
          ? () => apiService.getJobCategories({ status: 1, limit: 500 })
          : () => apiService.getCTVJobCategories({ status: 1, limit: 500 });
        const response = await fetchCategories();
        if (response?.success && response?.data?.categories?.length > 0) {
          const allCategories = response.data.categories.map(cat => ({
            id: String(cat.id),
            name: cat.name,
            nameEn: cat.nameEn,
            nameJp: cat.nameJp,
            parentId: cat.parentId ? String(cat.parentId) : null,
            order: cat.order ?? 0
          }));
          const fields = allCategories.filter(cat => !cat.parentId);
          const jobTypes = allCategories.filter(cat => cat.parentId);
          setAvailableFields(fields);
          setAvailableJobTypes(jobTypes);
          // Build tree từ flat list để panel bên phải hiển thị được Ngành nghề
          const buildTree = (list) => {
            const map = {};
            list.forEach(cat => { map[cat.id] = { ...cat, children: [] }; });
            const roots = [];
            list.forEach(cat => {
              const node = map[cat.id];
              if (cat.parentId && map[cat.parentId]) {
                map[cat.parentId].children.push(node);
              } else {
                roots.push(node);
              }
            });
            roots.forEach(r => r.children.sort((a, b) => (a.order || 0) - (b.order || 0)));
            return roots;
          };
          setCategoryTree(buildTree(allCategories));
        }
      } catch (categoryError) {
        console.log('Cannot load job categories:', categoryError?.message);
        setAvailableFields([]);
        setAvailableJobTypes([]);
        setCategoryTree([]);
      }
    } catch (error) {
      console.error('Error loading category tree:', error);
      setAvailableFields([]);
      setAvailableJobTypes([]);
      setCategoryTree([]);
    } finally {
      setLoadingFields(false);
      setLoadingJobTypes(false);
    }
  };

  // Helper: Lấy ID của category + tất cả con cháu (dùng khi chọn danh mục cha)
  const getCategoryAndDescendantIds = (category) => {
    const ids = [String(category.id)];
    if (category.children && category.children.length > 0) {
      category.children.forEach((child) => {
        ids.push(...getCategoryAndDescendantIds(child));
      });
    }
    return ids;
  };

  // Lấy tất cả ID Chi tiết (job type) dưới một Loại công việc (field) trong tree
  const getAllDetailIdsUnderField = (fieldInTree) => {
    if (!fieldInTree?.children?.length) return [];
    return fieldInTree.children.flatMap((child) => getCategoryAndDescendantIds(child));
  };

  // Chọn tất cả Chi tiết thuộc một Loại công việc
  const selectAllDetailsForField = (ids) => {
    if (!ids.length) return;
    setFilters((prev) => {
      const next = new Set(prev.jobTypeIds.map(String));
      ids.forEach((id) => next.add(String(id)));
      return { ...prev, jobTypeIds: Array.from(next) };
    });
  };

  // Bỏ chọn tất cả Chi tiết thuộc một Loại công việc
  const deselectAllDetailsForField = (ids) => {
    if (!ids.length) return;
    const toRemove = new Set(ids.map(String));
    setFilters((prev) => ({
      ...prev,
      jobTypeIds: prev.jobTypeIds.filter((id) => !toRemove.has(String(id))),
    }));
  };

  // Toggle chọn/bỏ chọn tất cả Chi tiết theo checkbox
  const toggleSelectAllDetailsForField = (ids) => {
    if (!ids.length) return;
    const currentSet = new Set(filters.jobTypeIds.map(String));
    const allSelected = ids.every((id) => currentSet.has(String(id)));
    if (allSelected) deselectAllDetailsForField(ids);
    else selectAllDetailsForField(ids);
  };

  // Helper: Find all descendants of a category (including nested children)
  const findAllDescendants = (categoryId, tree = categoryTree) => {
    const result = [];
    
    const findInTree = (categories, targetId) => {
      for (const cat of categories) {
        if (cat.id === String(targetId) || cat.id === targetId) {
          // Found the category, add all its descendants
          const addDescendants = (children) => {
            children.forEach(child => {
              result.push(String(child.id));
              if (child.children && child.children.length > 0) {
                addDescendants(child.children);
              }
            });
          };
          if (cat.children && cat.children.length > 0) {
            addDescendants(cat.children);
          }
          return true;
        }
        if (cat.children && cat.children.length > 0) {
          if (findInTree(cat.children, targetId)) {
            return true;
          }
        }
      }
      return false;
    };
    
    findInTree(tree, categoryId);
    return result;
  };

  /** Tìm node danh mục trong cây (dùng khi gửi API: chọn «Loại công việc» = cha → cần mọi id con cháu). */
  const findCategoryNodeInTree = (categories, id) => {
    if (!categories || !Array.isArray(categories)) return null;
    const s = String(id);
    for (const cat of categories) {
      if (String(cat.id) === s) return cat;
      const found = findCategoryNodeInTree(cat.children, id);
      if (found) return found;
    }
    return null;
  };

  const buildJobCategoryIdsFromFilterState = (fs) => {
    const ids = new Set();
    if (fs.jobTypeIds?.length > 0) {
      fs.jobTypeIds.forEach((id) => {
        const n = parseInt(String(id), 10);
        if (!Number.isNaN(n)) ids.add(n);
      });
    } else if (fs.fieldIds?.length > 0) {
      fs.fieldIds.forEach((fid) => {
        const node = findCategoryNodeInTree(categoryTree, fid);
        if (node) {
          getCategoryAndDescendantIds(node).forEach((rid) => {
            const n = parseInt(String(rid), 10);
            if (!Number.isNaN(n)) ids.add(n);
          });
        } else {
          const n = parseInt(String(fid), 10);
          if (!Number.isNaN(n)) ids.add(n);
        }
      });
    }
    return Array.from(ids);
  };

  const buildLocationsParamFromState = (fs) => {
    const locs = fs.locations;
    if (!locs?.length) return '';
    const parts = locs
      .map((loc) => {
        if (typeof loc === 'string') return loc;
        return loc?.searchTerm || loc?.locationJp || loc?.location;
      })
      .filter(Boolean);
    return parts.join('|||');
  };

  // Sync selectedFields with filters.fieldIds when modal opens
  useEffect(() => {
    if (showFieldJobTypeModal) {
      setSelectedFields(filters.fieldIds);
    }
  }, [showFieldJobTypeModal]);

  // Get job types for selected fields (including nested descendants)
  const getJobTypesForSelectedFields = () => {
    const allDescendantIds = new Set();
    
    selectedFields.forEach(fieldId => {
      // Get direct children
      const directChildren = availableJobTypes.filter(jt => jt.parentId === fieldId);
      directChildren.forEach(jt => allDescendantIds.add(jt.id));
      
      // Get nested descendants from tree
      const nestedDescendants = findAllDescendants(fieldId);
      nestedDescendants.forEach(id => allDescendantIds.add(id));
    });
    
    return availableJobTypes.filter(jt => allDescendantIds.has(jt.id));
  };

  // Load locations from jobs (working locations)
  const loadLocations = async () => {
    try {
      // Load jobs to extract unique locations
      const pageSize = 50;
      const maxPages = 25;
      const jobsAcc = [];
      let cursor = null;
      for (let i = 0; i < maxPages; i += 1) {
        const params = { limit: pageSize, sortBy: 'createdAt', sortOrder: 'DESC' };
        if (cursor) params.cursor = cursor;
        const response = useAdminAPI
          ? await apiService.getAdminJobs(params)
          : await apiService.getCTVJobs(params);
        if (!response.success || !response.data?.jobs) break;
        jobsAcc.push(...response.data.jobs);
        const pag = response.data.pagination || {};
        const hasMore = !!pag.hasMore;
        cursor = pag.nextCursor || null;
        if (!hasMore || !cursor) break;
      }
      if (jobsAcc.length > 0) {
        setResultCount(jobsAcc.length);

        const locationSet = new Set();
        jobsAcc.forEach((job) => {
          if (job.workingLocations && job.workingLocations.length > 0) {
            job.workingLocations.forEach((wl) => {
              if (wl.location) {
                locationSet.add(wl.location);
              }
            });
          }
        });
        if (locationSet.size > 0) {
          setLocations(Array.from(locationSet).sort());
        } else {
          setLocations(mockLocations);
        }
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      // Fallback: dùng mockLocations cho UI, giữ nguyên resultCount (0)
      setLocations(mockLocations);
    }
  };

  // Animate displayCount from 0 -> resultCount mỗi khi resultCount thay đổi
  useEffect(() => {
    let frameId;
    const duration = 600; // ms
    const start = performance.now();
    const from = 0;
    const to = resultCount;

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.round(from + (to - from) * eased);
      setDisplayCount(current);
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [resultCount]);

  const fetchJobsAccumulated = async (baseParams, maxJobs = 500) => {
    const pageSize = 50;
    const jobs = [];
    let cursor = null;
    while (jobs.length < maxJobs) {
      const params = { ...baseParams, limit: pageSize };
      delete params.page;
      if (cursor) params.cursor = cursor;
      const response = useAdminAPI
        ? await apiService.getAdminJobs(params)
        : await apiService.getCTVJobs(params);
      if (!response.success || !response.data?.jobs?.length) break;
      jobs.push(...response.data.jobs);
      const pag = response.data.pagination || {};
      if (!pag.hasMore || !pag.nextCursor) break;
      cursor = pag.nextCursor;
    }
    return jobs;
  };

  const recruitmentLocationLang = language === 'ja' ? 'ja' : language === 'en' ? 'en' : 'vi';

  const appendRecruitmentLocationToParams = (filterState, params) => {
    const v = filterState?.recruitmentLocation;
    if (v !== '' && v != null) {
      const n = parseInt(String(v), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 4) {
        params.recruitmentLocation = n;
        return;
      }
    }
    if (useAdminAPI && adminRecruitmentLocation) {
      const n = parseInt(String(adminRecruitmentLocation), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 4) {
        params.recruitmentLocation = n;
      }
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const trimmedKeyword = (filters.keyword ?? '').trim();

      const params = {};

      // Keyword search
      if (trimmedKeyword) {
        params.search = trimmedKeyword;
      }

      const categoryIds = buildJobCategoryIdsFromFilterState(filters);
      if (categoryIds.length > 0) {
        params.jobCategoryIds = categoryIds.join(',');
      }

      if (filters.sectorNames?.length > 0) {
        params.sectorNames = filters.sectorNames.join(',');
      }

      const locationsJoined = buildLocationsParamFromState(filters);
      if (locationsJoined) {
        params.locations = locationsJoined;
      }

      if (filters.salaryMin !== '' && filters.salaryMin != null && !Number.isNaN(Number(filters.salaryMin))) {
        params.minSalary = Number(filters.salaryMin);
      }
      if (filters.salaryMax !== '' && filters.salaryMax != null && !Number.isNaN(Number(filters.salaryMax))) {
        params.maxSalary = Number(filters.salaryMax);
      }

      params.sortBy = 'createdAt';
      params.sortOrder = 'DESC';

      if (useAdminAPI) {
        if (adminCompanyId) params.companyId = adminCompanyId;
        if (adminHasCampaign) params.hasCampaign = '1';
        if (adminJobStatus !== '' && adminJobStatus != null) params.status = String(adminJobStatus);
        if (adminCreatedFrom) params.createdFrom = adminCreatedFrom;
        if (adminCreatedTo) params.createdTo = adminCreatedTo;
        if (adminJapaneseLevel) params.japaneseLevel = adminJapaneseLevel;
        if (adminWorkLocation) params.workLocation = adminWorkLocation;
      }
      appendRecruitmentLocationToParams(filters, params);

      const jobs = await fetchJobsAccumulated(params);
      if (jobs.length > 0) {
        setResultCount(jobs.length);
        if (onSearch) onSearch(jobs);
        if (onFiltersChange) onFiltersChange({ ...filters, keyword: trimmedKeyword });
        if (!useAdminAPI && (trimmedKeyword || (filters && Object.keys(filters).length > 0))) {
          apiService.saveCTVSearchHistory({
            keyword: trimmedKeyword,
            filters: { ...filters, keyword: trimmedKeyword },
            resultCount: jobs.length
          }).catch(() => {});
        }
      } else {
        setResultCount(0);
        if (onSearch) {
          onSearch([]);
        }
        if (onFiltersChange) onFiltersChange({ ...filters, keyword: trimmedKeyword });
      }
    } catch (error) {
      console.error('Error searching jobs:', error);
      setResultCount(0);
      // Truyền empty array khi có lỗi
      if (onSearch) {
        onSearch([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Build params và gọi API tìm kiếm (dùng filters + keyword truyền vào)
  const runSearchWithFilters = async (filterState, keywordStr) => {
    const trimmedKeyword = (keywordStr ?? '').trim();
    const params = { sortBy: 'createdAt', sortOrder: 'DESC' };
    if (trimmedKeyword) params.search = trimmedKeyword;
    const catIds = buildJobCategoryIdsFromFilterState(filterState);
    if (catIds.length > 0) params.jobCategoryIds = catIds.join(',');
    if (filterState.sectorNames?.length > 0) params.sectorNames = filterState.sectorNames.join(',');
    const locJoined = buildLocationsParamFromState(filterState);
    if (locJoined) params.locations = locJoined;
    if (filterState.salaryMin !== '' && filterState.salaryMin != null && !Number.isNaN(Number(filterState.salaryMin))) {
      params.minSalary = Number(filterState.salaryMin);
    }
    if (filterState.salaryMax !== '' && filterState.salaryMax != null && !Number.isNaN(Number(filterState.salaryMax))) {
      params.maxSalary = Number(filterState.salaryMax);
    }
    if (useAdminAPI) {
      if (adminCompanyId) params.companyId = adminCompanyId;
      if (adminHasCampaign) params.hasCampaign = '1';
      if (adminJobStatus !== '' && adminJobStatus != null) params.status = String(adminJobStatus);
      if (adminCreatedFrom) params.createdFrom = adminCreatedFrom;
      if (adminCreatedTo) params.createdTo = adminCreatedTo;
      if (adminJapaneseLevel) params.japaneseLevel = adminJapaneseLevel;
      if (adminWorkLocation) params.workLocation = adminWorkLocation;
    }
    appendRecruitmentLocationToParams(filterState, params);
    const jobs = await fetchJobsAccumulated(params);
    if (jobs.length > 0) {
      setResultCount(jobs.length);
      if (onSearch) onSearch(jobs);
      if (onFiltersChange) onFiltersChange({ ...filterState, keyword: keywordStr });
    } else {
      setResultCount(0);
      if (onSearch) onSearch([]);
      if (onFiltersChange) onFiltersChange({ ...filterState, keyword: keywordStr });
    }
  };

  // Quay lại từ chi tiết job: điều kiện đã khôi phục vào form + session nhưng JobsListPage mất state jobs → gọi lại đúng query như lần Lọc/Tìm (chờ categoryTree nếu cần Lĩnh vực). Gồm cả khi chỉ lọc toolbar admin (công ty nguồn / campaign / trạng thái).
  useEffect(() => {
    if (hideCtvPersonalNav) return;
    if (jobSearchRestoreDoneRef.current) return;
    const snap = readJobSearchSession(useAdminAPI);
    const merged = snap?.filters ? mergeStoredJobSearchFilters(snap.filters) : getDefaultJobSearchFilters();
    const toolbarRestricts = hasAdminJobsToolbarListContext({
      useAdminAPI,
      adminCompanyId,
      adminHasCampaign,
      adminJobStatus,
    });
    if (!hasActiveAgentJobSearchCriteria(merged) && !toolbarRestricts) return;
    const needsCategoryTree = Array.isArray(merged.fieldIds) && merged.fieldIds.length > 0;
    if (needsCategoryTree && categoryTree.length === 0) return;
    jobSearchRestoreDoneRef.current = true;
    (async () => {
      try {
        setLoading(true);
        await runSearchWithFilters(merged, merged.keyword ?? '');
      } catch (e) {
        console.error(e);
        setResultCount(0);
        if (onSearch) onSearch([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [hideCtvPersonalNav, useAdminAPI, categoryTree.length, adminCompanyId, adminHasCampaign, adminJobStatus]);

  // Áp dụng tiêu chí từ lịch sử tìm kiếm hoặc tiêu chí đã lưu, rồi gọi tìm kiếm
  const applyFiltersAndSearch = async (payload) => {
    const nextFilters = payload.filters && typeof payload.filters === 'object'
      ? {
          keyword: payload.filters.keyword ?? payload.keyword ?? '',
          locations: Array.isArray(payload.filters.locations) ? payload.filters.locations : [],
          fieldIds: Array.isArray(payload.filters.fieldIds) ? payload.filters.fieldIds : [],
          jobTypeIds: Array.isArray(payload.filters.jobTypeIds) ? payload.filters.jobTypeIds : [],
          sectorNames: Array.isArray(payload.filters.sectorNames) ? payload.filters.sectorNames : [],
          age: payload.filters.age ?? null,
          salaryMin: payload.filters.salaryMin ?? '',
          salaryMax: payload.filters.salaryMax ?? '',
          recruitmentLocation: payload.filters.recruitmentLocation ?? '',
          employmentType: payload.filters.employmentType ?? null,
          highlights: Array.isArray(payload.filters.highlights) ? payload.filters.highlights : [],
        }
      : filters;
    const keyword = payload.keyword ?? payload.filters?.keyword ?? '';
    setFilters(nextFilters);
    setShowSearchHistoryModal(false);
    setShowSavedCriteriaModal(false);
    try {
      setLoading(true);
      await runSearchWithFilters(nextFilters, keyword);
    } catch (e) {
      console.error(e);
      setResultCount(0);
      if (onSearch) onSearch([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    setFilters(getDefaultJobSearchFilters());
    setResultCount(0);
    try {
      if (!hideCtvPersonalNav) {
        sessionStorage.removeItem(`${JOB_SEARCH_SESSION_KEY_PREFIX}_${useAdminAPI ? 'admin' : 'ctv'}`);
      }
    } catch {
      // ignore
    }
    if (typeof onClearAdminToolbar === 'function') onClearAdminToolbar();
    if (onSearch) onSearch(null);
    if (onFiltersChange) onFiltersChange(null);
  };

  const toggleCountry = (country) => {
    setSelectedCountries(prev => {
      if (prev.includes(country)) {
        // Remove country and all its locations
        const newCountries = prev.filter(c => c !== country);
        setDraftLocations((prevLocations) => prevLocations.filter((loc) => loc.country !== country));
        return newCountries;
      } else {
        // Add country
        return [...prev, country];
      }
    });
  };

  const toggleLocation = (location, country) => {
    setDraftLocations(prev => {
      const existingIndex = prev.findIndex(
        loc => loc.country === country && loc.location === location
      );
      
      if (existingIndex >= 0) {
        // Remove location
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        // Add location
        return [...prev, { country, location }];
      }
    });
  };

  const getAvailableProvinces = () => {
    const allProvinces = [];
    selectedCountries.forEach((country) => {
      if (country === 'Vietnam') {
        VIETNAM_PROVINCES.forEach((province) => {
          allProvinces.push({ country, location: province });
        });
      }
    });
    return allProvinces;
  };

  const toggleJapanLocationEntry = ({ location, locationJp, jpId, locationLevel = 'ward', searchTerm }) => {
    setDraftLocations((prev) => {
      const idx = prev.findIndex(
        (l) =>
          l.country === 'Japan' &&
          (jpId ? l.jpId === jpId : l.location === location)
      );
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      return [...prev, { country: 'Japan', location, locationJp, jpId, locationLevel, searchTerm: searchTerm || locationJp || location }];
    });
  };

  const applyJapanLocationBulk = (add, locObjs) => {
    setDraftLocations((prev) => {
      const ids = new Set(locObjs.map((l) => l.id));
      let next = [...prev];
      if (add) {
        const have = new Set(next.filter((l) => l.country === 'Japan').map((l) => l.jpId));
        locObjs.forEach((loc) => {
          if (!have.has(loc.id)) {
            next.push({
              country: 'Japan',
              location: loc.alpha,
              locationJp: loc.ja,
              jpId: loc.id,
              locationLevel: loc.locationLevel || 'ward',
              searchTerm: loc.searchTerm || loc.ja || loc.alpha,
            });
            have.add(loc.id);
          }
        });
      } else {
        next = next.filter((l) => l.country !== 'Japan' || !ids.has(l.jpId));
      }
      return next;
    });
  };

  const buildLocsFromTree = (prefCode, tree) =>
    tree.flatMap((c) =>
      c.standalone
        ? [createJapanWardEntry(prefCode, c.name, c.nameKana, language)]
        : (c.wards || []).map((w) => createJapanWardEntry(prefCode, w.fullName, w.fullNameKana, language))
    ).map((entry) => ({
      id: entry.jpId,
      ja: entry.locationJp,
      alpha: entry.location,
      locationLevel: entry.locationLevel,
      searchTerm: entry.searchTerm,
    }));

  const getSelectedJapanIds = (locationsSource = draftLocations) =>
    new Set(
      locationsSource
        .filter((l) => l.country === 'Japan')
        .map((l) => l.jpId || `${l.location}_Japan`)
    );

  const getVietnamLocationSet = (locationsSource = draftLocations) =>
    new Set(
      locationsSource
        .filter((l) => l.country === 'Vietnam')
        .map((l) => l.location)
    );

  const loadJapanPrefectureData = async (prefCode) => {
    if (japanPrefectureCache[prefCode]) return japanPrefectureCache[prefCode];
    const data = (await fetchJapanCitiesByPrefecture(prefCode)) || { flat: [], tree: [] };
    setJapanPrefectureCache((prev) => (prev[prefCode] ? prev : { ...prev, [prefCode]: data }));
    return data;
  };

  const getCachedJapanPrefectureLocs = (prefCode) =>
    buildLocsFromTree(prefCode, japanPrefectureCache[prefCode]?.tree || []);

  const getJapanRegionIdsForPanel = () => {
    if (japanSelectionDraft.allRegions) {
      return JAPAN_REGIONS.map((region) => region.id);
    }
    if (japanSelectionDraft.regions.length > 0) {
      return japanSelectionDraft.regions;
    }
    if (japanFilterRegion === ALL_JAPAN_REGIONS_KEY) {
      return JAPAN_REGIONS.map((region) => region.id);
    }
    return japanFilterRegion ? [japanFilterRegion] : [];
  };

  const getJapanPrefectureCodesForPanel = () => {
    const regionIds = getJapanRegionIdsForPanel();
    return Array.from(
      new Set(
        regionIds.flatMap(
          (regionId) => JAPAN_REGIONS.find((region) => region.id === regionId)?.prefectureCodes || []
        )
      )
    );
  };

  const isJapanPrefectureChecked = (prefCode) => japanSelectionDraft.prefectures.includes(prefCode);

  const isJapanRegionChecked = (regionId) =>
    japanSelectionDraft.allRegions || japanSelectionDraft.regions.includes(regionId);

  const areAllPrefecturesChecked = (prefCodes) =>
    Array.isArray(prefCodes) && prefCodes.length > 0 && prefCodes.every((code) => isJapanPrefectureChecked(code));

  const getJapanTargetPrefectureCodesForWardPanel = () => {
    if (japanSelectionDraft.prefectures.length > 0) {
      return japanSelectionDraft.prefectures;
    }
    if (japanFilterPrefecture === ALL_JAPAN_PREFECTURES_KEY) {
      return getJapanPrefectureCodesForPanel();
    }
    return japanFilterPrefecture ? [japanFilterPrefecture] : [];
  };

  const collectJapanLocationsForPrefCodes = async (prefCodes) => {
    const locGroups = await Promise.all(
      prefCodes.map(async (prefCode) => {
        try {
          const data = await loadJapanPrefectureData(prefCode);
          return buildLocsFromTree(prefCode, data?.tree || []);
        } catch {
          return [];
        }
      })
    );
    return locGroups.flat();
  };

  const selectAllPrefecture = async (prefCode, add) => {
    setJapanBulkLoading(`pref-${prefCode}`);
    try {
      const regionId = JAPAN_REGIONS.find((region) => region.prefectureCodes.includes(prefCode))?.id || null;
      if (add && regionId) {
        setJapanFilterRegion(regionId);
        setJapanFilterPrefecture(prefCode);
      }
      setJapanSelectionDraft((prev) => ({
        ...prev,
        prefectures: add ? Array.from(new Set([...prev.prefectures, prefCode])) : prev.prefectures.filter((code) => code !== prefCode),
      }));
      const prefEntry = createJapanPrefectureEntry(prefCode, language);
      if (prefEntry) {
        setDraftLocations((prev) => {
          const exists = prev.some((loc) => loc.country === 'Japan' && loc.jpId === prefEntry.jpId);
          if (add && !exists) return [...prev, prefEntry];
          if (!add && exists) return prev.filter((loc) => !(loc.country === 'Japan' && loc.jpId === prefEntry.jpId));
          return prev;
        });
      }
      if (!add && japanFilterPrefecture === prefCode) {
        setJapanFilterPrefecture(null);
      }
    } catch { /* ignore */ }
    setJapanBulkLoading(null);
  };

  const selectAllPrefecturesInPanel = async (prefCodes, add) => {
    if (!Array.isArray(prefCodes) || prefCodes.length === 0) return;
    setJapanBulkLoading('pref-panel');
    try {
      if (add) {
        setJapanFilterPrefecture(ALL_JAPAN_PREFECTURES_KEY);
      } else if (japanFilterPrefecture === ALL_JAPAN_PREFECTURES_KEY) {
        setJapanFilterPrefecture(null);
      }
      setJapanSelectionDraft((prev) => ({
        ...prev,
        prefectures: add
          ? Array.from(new Set([...prev.prefectures, ...prefCodes]))
          : prev.prefectures.filter((code) => !prefCodes.includes(code)),
      }));
      setDraftLocations((prev) => {
        let next = [...prev];
        prefCodes.forEach((prefCode) => {
          const prefEntry = createJapanPrefectureEntry(prefCode, language);
          if (!prefEntry) return;
          const exists = next.some((loc) => loc.country === 'Japan' && loc.jpId === prefEntry.jpId);
          if (add && !exists) next.push(prefEntry);
          if (!add && exists) next = next.filter((loc) => !(loc.country === 'Japan' && loc.jpId === prefEntry.jpId));
        });
        return next;
      });
    } catch {
      // ignore
    }
    setJapanBulkLoading(null);
  };

  const selectAllRegion = async (regionId, add) => {
    const region = JAPAN_REGIONS.find((r) => r.id === regionId);
    if (!region) return;
    setJapanBulkLoading(`reg-${regionId}`);
    if (add) {
      setJapanFilterRegion(regionId);
      setJapanFilterPrefecture(ALL_JAPAN_PREFECTURES_KEY);
    } else if (japanFilterRegion === regionId) {
      setJapanFilterPrefecture(null);
    }
    setJapanSelectionDraft((prev) => ({
      allRegions: prev.allRegions && add,
      regions: add ? Array.from(new Set([...prev.regions, regionId])) : prev.regions.filter((id) => id !== regionId),
      prefectures: prev.prefectures,
    }));
    const regionEntry = createJapanRegionEntry(region, language);
    setDraftLocations((prev) => {
      const exists = prev.some((loc) => loc.country === 'Japan' && loc.jpId === regionEntry.jpId);
      if (add && !exists) return [...prev, regionEntry];
      if (!add && exists) return prev.filter((loc) => !(loc.country === 'Japan' && loc.jpId === regionEntry.jpId));
      return prev;
    });
    setJapanBulkLoading(null);
  };

  const selectAllJapanLocations = async (add) => {
    setJapanBulkLoading('all-japan');
    try {
      if (add) {
        setJapanFilterRegion(ALL_JAPAN_REGIONS_KEY);
        setJapanFilterPrefecture(ALL_JAPAN_PREFECTURES_KEY);
      } else {
        setJapanFilterRegion(null);
        setJapanFilterPrefecture(null);
      }
      setJapanSelectionDraft({
        allRegions: add,
        regions: add ? JAPAN_REGIONS.map((region) => region.id) : [],
        prefectures: japanSelectionDraft.prefectures,
      });
      setDraftLocations((prev) => {
        let next = [...prev];
        JAPAN_REGIONS.forEach((region) => {
          const regionEntry = createJapanRegionEntry(region, language);
          const exists = next.some((loc) => loc.country === 'Japan' && loc.jpId === regionEntry.jpId);
          if (add && !exists) next.push(regionEntry);
          if (!add && exists) next = next.filter((loc) => !(loc.country === 'Japan' && loc.jpId === regionEntry.jpId));
        });
        return next;
      });
    } catch {
      // ignore
    }
    setJapanBulkLoading(null);
  };

  const getSelectedLocationsDisplay = () => {
    if (filters.locations.length === 0) return '';
    
    // Group by country
    const byCountry = {};
    filters.locations.forEach(loc => {
      if (!byCountry[loc.country]) {
        byCountry[loc.country] = [];
      }
      const disp =
        loc.country === 'Japan' && language === 'ja' && loc.locationJp
          ? loc.locationJp
          : loc.location;
      byCountry[loc.country].push(disp);
    });
    
    // Format: "Vietnam: Hà Nội, Hồ Chí Minh; Japan: Tokyo, Osaka"
    return Object.entries(byCountry)
      .map(([country, locations]) => `${country}: ${locations.join(', ')}`)
      .join('; ');
  };

  const toggleField = (fieldId) => {
    setSelectedFields(prev => {
      const newFields = prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId];
      
      // Update filters.fieldIds
      setFilters(prevFilters => {
        // Remove job types that belong to removed fields
        const newJobTypeIds = prevFilters.jobTypeIds.filter(jtId => {
          const jobType = availableJobTypes.find(jt => jt.id === jtId);
          return jobType && newFields.includes(jobType.parentId);
        });
        
        return {
          ...prevFilters,
          fieldIds: newFields,
          jobTypeIds: newJobTypeIds
        };
      });
      
      return newFields;
    });
  };

  const toggleJobType = (jobTypeId) => {
    setFilters(prev => {
      const existingIndex = prev.jobTypeIds.findIndex(id => id === jobTypeId);
      
      if (existingIndex >= 0) {
        // Remove job type
        return {
      ...prev,
          jobTypeIds: prev.jobTypeIds.filter((_, index) => index !== existingIndex)
        };
      } else {
        // Add job type
        return {
          ...prev,
          jobTypeIds: [...prev.jobTypeIds, jobTypeId]
        };
      }
    });
  };

  // Khi chọn 1 danh mục con có children → chọn/bỏ chọn tất cả con cháu của nó
  const toggleJobTypeWithDescendants = (category) => {
    const idsToToggle = getCategoryAndDescendantIds(category);
    const anySelected = idsToToggle.some(id => filters.jobTypeIds.includes(id));

    setFilters(prev => {
      if (anySelected) {
        const toRemove = new Set(idsToToggle);
        return {
          ...prev,
          jobTypeIds: prev.jobTypeIds.filter(id => !toRemove.has(id))
        };
      } else {
        const toAdd = new Set(idsToToggle);
        const existing = new Set(prev.jobTypeIds);
        toAdd.forEach(id => existing.add(id));
        return {
          ...prev,
          jobTypeIds: Array.from(existing)
        };
      }
    });
  };


  const toggleHighlight = (highlight) => {
    setFilters(prev => ({
      ...prev,
      highlights: prev.highlights.includes(highlight)
        ? prev.highlights.filter(h => h !== highlight)
        : [...prev.highlights, highlight],
    }));
  };

  /** Tên danh mục theo ngôn ngữ (name / nameEn / nameJp) */
  const getCategoryDisplayName = (cat) => {
    if (!cat) return '';
    if (language === 'vi') return cat.name || '';
    if (language === 'en') return cat.nameEn || cat.name || '';
    return cat.nameJp || cat.nameEn || cat.name || '';
  };

  const getSelectedFieldNames = () => {
    return filters.fieldIds
      .map(id => getCategoryDisplayName(availableFields.find(f => f.id === id)))
      .filter(Boolean)
      .join(', ');
  };

  const getSelectedJobTypeNames = () => {
    return filters.jobTypeIds
      .map(id => getCategoryDisplayName(availableJobTypes.find(jt => jt.id === id)))
      .filter(Boolean)
      .join(', ');
  };

  /** Tất cả lựa chọn Loại công việc + Ngành nghề (để hiển thị trong 1 ô) */
  const getSelectedCategoryDisplay = () => {
    const fieldNames = getSelectedFieldNames();
    const jobTypeNames = getSelectedJobTypeNames();
    return [fieldNames, jobTypeNames].filter(Boolean).join(', ');
  };

  const getSelectedSectorNames = () => {
    return (filters.sectorNames || []).join(', ');
  };

  const getSelectedHighlightsNames = () => {
    return filters.highlights.join(', ');
  };

  // Modal Component
  const MultiSelectModal = ({ 
    isOpen, 
    onClose, 
    title, 
    options, 
    selected, 
    onToggle,
    loading = false,
    isSingleSelect = false
  }) => {
    if (!isOpen) return null;

    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center" 
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
        onClick={onClose}
      >
        <div className="rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#e5e7eb' }}>
            <h3 className="text-base font-semibold" style={{ color: '#111827' }}>{title}</h3>
            <button 
              onClick={onClose} 
              onMouseEnter={() => setHoveredModalCloseButton('multiselect')}
              onMouseLeave={() => setHoveredModalCloseButton(null)}
              className="p-1 rounded transition-colors"
              style={{
                backgroundColor: hoveredModalCloseButton === 'multiselect' ? '#f3f4f6' : 'transparent'
              }}
            >
              <X className="w-5 h-5" style={{ color: '#4b5563' }} />
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : options.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {language === 'vi' ? 'Không có dữ liệu' : language === 'en' ? 'No data' : 'データなし'}
              </div>
            ) : (
              <div className="space-y-2">
                {options.map((option) => {
                  const id = typeof option === 'string' ? option : option.id;
                  const name = typeof option === 'string' ? option : option.name;
                  const isSelected = selected.includes(id);
                  
                  if (isSingleSelect) {
                    // Single select: click to select and close
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          onToggle(id);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer text-left transition-colors"
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'border-blue-600 bg-blue-600' 
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-xs text-gray-900">{name}</span>
                      </button>
                    );
                  }
                  
                  // Multi select: checkbox
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-900">{name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          {!isSingleSelect && (
          <div className="p-4 border-t" style={{ borderColor: '#e5e7eb' }}>
            <button
              onClick={onClose}
              onMouseEnter={() => setHoveredModalConfirmButton('multiselect')}
              onMouseLeave={() => setHoveredModalConfirmButton(null)}
              className="w-full py-2 px-4 rounded-lg transition-colors font-medium"
              style={{
                backgroundColor: hoveredModalConfirmButton === 'multiselect' ? '#2563eb' : '#2563eb',
                color: 'white'
              }}
            >
              {language === 'vi' ? 'Xác nhận' : language === 'en' ? 'Confirm' : '確認'}
            </button>
          </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
      `}</style>
      <div className={`${compact ? "w-full h-full flex flex-col" : "w-full sm:w-[400px] md:w-[500px] h-full flex flex-col"}`}>
        {/* Header Navigation (CTV: lịch sử / tiêu chí / danh sách — ẩn trên landing) */}
        {!hideCtvPersonalNav ? (
          <div className="flex-shrink-0 mb-0.5 sm:mb-1 lg:mb-2">
            <HeaderNavigationButtons
              onSearchHistoryClick={() => setShowSearchHistoryModal(true)}
              onSavedCriteriaClick={() => setShowSavedCriteriaModal(true)}
              onSavedListClick={() => setShowSavedListModal(true)}
              compact={compact}
              language={language}
              hoveredNavButtonIndex={hoveredNavButtonIndex}
              setHoveredNavButtonIndex={setHoveredNavButtonIndex}
              savedListsTotalJobs={savedListsTotalJobs}
            />
          </div>
        ) : null}

      <div className={`flex-1 flex flex-col bg-white ${compact ? 'rounded-lg' : 'rounded-2xl'} border border-gray-200 overflow-hidden min-h-0`}>
        {/* Mobile: Keyword search + Advanced filter button */}
        <div className="lg:hidden p-2 border-b border-gray-100">
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={filters.keyword ?? ''}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                placeholder={language === 'vi' ? 'Tìm kiếm công việc...' : language === 'en' ? 'Search jobs...' : '求人を検索...'}
                className="w-full pl-7 pr-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowMobileAdvancedFilter(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
              style={{ backgroundColor: showMobileAdvancedFilter ? '#f3f4f6' : 'white' }}
            >
              <SlidersHorizontal className="w-4 h-4" style={{ color: '#6b7280' }} />
              <span className="text-xs font-medium" style={{ color: '#374151' }}>
                {language === 'vi' ? 'Lọc' : language === 'en' ? 'Filter' : 'フィルター'}
              </span>
            </button>
          </div>
          {/* Quick search button for mobile */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              style={{
                backgroundColor: '#facc15',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" style={{ color: '#1f2937' }} />
              ) : (
                <Search className="w-3.5 h-3.5" style={{ color: '#1f2937' }} />
              )}
              <span className="text-xs font-semibold" style={{ color: '#1f2937' }}>
                {language === 'vi'
                  ? `Tìm ${displayCount.toLocaleString('vi-VN')} job`
                  : language === 'en'
                  ? `Search ${displayCount.toLocaleString()} jobs`
                  : `${displayCount.toLocaleString('ja-JP')} 件検索`}
              </span>
            </button>
          </div>
        </div>

        {/* Desktop: Full Scrollable Form Content */}
        <div className={`flex-1 overflow-y-auto overscroll-contain ${compact ? 'p-1 sm:p-1.5' : 'p-1.5 sm:p-2'} ${compact ? 'space-y-1 sm:space-y-1.5' : 'space-y-1.5 sm:space-y-2'} custom-scrollbar min-h-0 hidden lg:block`}>
          {/* A. Freeword / Keyword - controlled để tránh bị xóa khi re-render */}
        <FilterBlock icon={Search} label={language === 'vi' ? 'Từ khóa' : language === 'en' ? 'Keyword' : 'フリーワード'} compact={compact}>
          <div className="relative">
            <input
              type="text"
              ref={keywordInputRef}
              value={filters.keyword ?? ''}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              placeholder={language === 'vi' ? 'ID, tên job, nội dung công việc…' : language === 'en' ? 'ID, job name, job description…' : 'ID、求人名、業務内容…'}
              className="w-full px-2 py-1 text-[9px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </FilterBlock>

        {/* B. Địa điểm làm việc */}
        <FilterBlock icon={MapPin} label={language === 'vi' ? 'Địa điểm làm việc' : language === 'en' ? 'Work Location' : '勤務地'} compact={compact}>
          <div className="flex gap-1 items-center">
            <input
              type="text"
              readOnly
              value={getSelectedLocationsDisplay()}
              placeholder={language === 'vi' ? 'Chọn địa điểm làm việc' : language === 'en' ? 'Select work location' : '勤務地を選択'}
              className="flex-1 px-2 py-1 text-[9px] border border-gray-300 rounded bg-gray-50 cursor-pointer"
              onClick={openLocationModal}
            />
            <button
              onClick={openLocationModal}
              onMouseEnter={() => setHoveredLocationButton(true)}
              onMouseLeave={() => setHoveredLocationButton(false)}
              className="px-1.5 py-1 border rounded transition-colors flex-shrink-0"
              style={{
                borderColor: '#d1d5db',
                backgroundColor: hoveredLocationButton ? '#f9fafb' : 'transparent'
              }}
            >
              <Plus className="w-3 h-3" style={{ color: '#4b5563' }} />
            </button>
          </div>
        </FilterBlock>

        <FilterBlock
          icon={Globe}
          label={language === 'vi' ? 'Địa điểm tuyển dụng' : language === 'en' ? 'Recruitment location' : '採用地域'}
          compact={compact}
        >
          <select
            value={filters.recruitmentLocation || ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, recruitmentLocation: e.target.value || '' }))
            }
            className="w-full px-2 py-1 text-[9px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">
              {language === 'vi' ? 'Tất cả' : language === 'en' ? 'All' : 'すべて'}
            </option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={String(n)}>
                {getRecruitmentLocationLabel(n, recruitmentLocationLang)}
              </option>
            ))}
          </select>
        </FilterBlock>

        {/* Loại công việc (gộp cả loại + ngành nghề, tất cả tìm kiếm ở đây) */}
        <FilterBlock 
          icon={Briefcase} 
          label={t.agentJobsJobType}
          compact={compact}
        >
          <div className="flex gap-1 items-center">
            <input
              type="text"
              readOnly
              value={getSelectedCategoryDisplay() || ''}
              placeholder={t.agentJobsSelectJobTypePlaceholder}
              className="flex-1 px-2 py-1 text-[9px] border border-gray-300 rounded bg-gray-50 cursor-pointer"
              onClick={() => setShowFieldJobTypeModal(true)}
            />
            <button
              onClick={() => setShowFieldJobTypeModal(true)}
              className="px-1.5 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              <Plus className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        </FilterBlock>

        {/* D2. Lĩnh vực */}
        <FilterBlock 
          icon={Building2} 
          label={language === 'vi' ? 'Lĩnh vực' : language === 'en' ? 'Business Sector' : '業種'}
          compact={compact}
        >
          <div className="flex gap-1 items-center">
            <input
              type="text"
              readOnly
              value={getSelectedSectorNames() || ''}
              placeholder={language === 'vi' ? 'Chọn lĩnh vực kinh doanh' : language === 'en' ? 'Select business sector' : '業種を選択'}
              className="flex-1 px-2 py-1 text-[9px] border border-gray-300 rounded bg-gray-50 cursor-pointer"
              onClick={() => setShowSectorModal(true)}
            />
            <button
              onClick={() => setShowSectorModal(true)}
              className="px-1.5 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              <Plus className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        </FilterBlock>

        {/* E. Tuổi */}
        <FilterBlock icon={Calendar} label={language === 'vi' ? 'Tuổi' : language === 'en' ? 'Age' : '年齢'} compact={compact}>
          <div className="flex items-center gap-1 flex-wrap">
            <select
              value={filters.age || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, age: e.target.value || null }))}
              className="flex-1 min-w-0 px-2 py-1 text-[9px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{language === 'vi' ? 'Chọn tuổi' : language === 'en' ? 'Select age' : '選択'}</option>
              <option value="18">18</option>
              <option value="20">20</option>
              <option value="25">25</option>
              <option value="30">30</option>
              <option value="35">35</option>
              <option value="40">40</option>
            </select>
            <span className="text-[9px] text-gray-500 whitespace-nowrap flex-shrink-0">
              {language === 'vi' ? 'tuổi có thể ứng tuyển' : language === 'en' ? 'years old' : '歳で応募可能'}
            </span>
          </div>
        </FilterBlock>

        {/* F. Range lương */}
        <FilterBlock icon={DollarSign} label={language === 'vi' ? 'Range lương' : language === 'en' ? 'Salary Range' : '給与範囲'} compact={compact}>
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            <input
              type="number"
              value={filters.salaryMin}
              onChange={(e) => setFilters(prev => ({ ...prev, salaryMin: e.target.value ? Number(e.target.value) : '' }))}
              placeholder={language === 'vi' ? 'Từ' : language === 'en' ? 'From' : 'から'}
              className="flex-1 min-w-[60px] px-2 py-1 text-[9px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-500 flex-shrink-0 text-[9px]">~</span>
            <input
              type="number"
              value={filters.salaryMax}
              onChange={(e) => setFilters(prev => ({ ...prev, salaryMax: e.target.value ? Number(e.target.value) : '' }))}
              placeholder={language === 'vi' ? 'Đến' : language === 'en' ? 'To' : 'まで'}
              className="flex-1 min-w-[60px] px-2 py-1 text-[9px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-[9px] text-gray-500 whitespace-nowrap flex-shrink-0">
              {language === 'vi' ? 'triệu' : language === 'en' ? 'million' : '万円'}
            </span>
          </div>
        </FilterBlock>

        {/* G. Hình thức tuyển dụng */}
        <FilterBlock icon={FileText} label={language === 'vi' ? 'Hình thức tuyển dụng' : language === 'en' ? 'Employment Type' : '雇用形態'} compact={compact}>
          <select
            value={filters.employmentType || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, employmentType: e.target.value || null }))}
            className="w-full px-2 py-1 text-[9px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{language === 'vi' ? 'Chọn hình thức' : language === 'en' ? 'Select type' : '選択'}</option>
            {mockEmploymentTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </FilterBlock>

        {/* I. Điểm nổi bật */}
        <FilterBlock icon={Star} label={language === 'vi' ? 'Điểm nổi bật của job' : language === 'en' ? 'Job Highlights' : '求人の特徴'} compact={compact}>
          <div className="flex gap-1 items-center">
            <input
              type="text"
              readOnly
              value={getSelectedHighlightsNames() || ''}
              placeholder={language === 'vi' ? 'Chọn điểm nổi bật' : language === 'en' ? 'Select highlights' : '特徴を選択'}
              className="flex-1 px-2 py-1 text-[9px] border border-gray-300 rounded bg-gray-50 cursor-pointer"
              onClick={() => setShowHighlightModal(true)}
            />
            <button
              onClick={() => setShowHighlightModal(true)}
              className="px-1.5 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              <Plus className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        </FilterBlock>
        </div>

        {/* Fixed Buttons Row - Desktop only */}
        <div className={`hidden lg:block flex-shrink-0 border-t border-gray-200 bg-white ${compact ? 'p-1.5' : 'p-2'} ${compact ? 'rounded-b-lg' : 'rounded-b-2xl'}`}>
          <div className="space-y-1">
            <div className={`flex ${compact ? 'gap-1' : 'gap-1'} flex-col sm:flex-row`}>
              <button
                onClick={handleClearAll}
                onMouseEnter={() => setHoveredClearButton(true)}
                onMouseLeave={() => setHoveredClearButton(false)}
                className={`flex-1 ${compact ? 'py-1 px-2 text-[9px]' : 'py-1.5 px-2 text-[9px]'} font-medium rounded transition-colors`}
                style={{
                  color: '#374151',
                  backgroundColor: hoveredClearButton ? '#e5e7eb' : '#f3f4f6'
                }}
              >
                {language === 'vi' ? 'Xóa điều kiện' : language === 'en' ? 'Clear filters' : '条件をクリア'}
              </button>
              <button
                onClick={handleSearch}
                disabled={loading}
                onMouseEnter={() => setHoveredSearchButton(true)}
                onMouseLeave={() => setHoveredSearchButton(false)}
                className={`flex-1 ${compact ? 'h-7' : 'h-8'} rounded flex items-center justify-center gap-1 transition-colors shadow-md`}
                style={{
                  backgroundColor: hoveredSearchButton ? '#eab308' : '#facc15',
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                {loading ? (
                  <RotateCw className="w-3 h-3 animate-spin" style={{ color: '#1f2937' }} />
                ) : (
                  <Search className="w-3 h-3" style={{ color: '#1f2937' }} />
                )}
                <span className="text-[9px] font-semibold" style={{ color: '#1f2937' }}>
                  {language === 'vi'
                    ? `Tìm ${displayCount.toLocaleString('vi-VN')} job`
                    : language === 'en'
                    ? `Search ${displayCount.toLocaleString()} jobs`
                    : `${displayCount.toLocaleString('ja-JP')} 件の求人を検索`}
                </span>
              </button>
            </div>
            <p className="text-center text-[9px] text-gray-600">
              {language === 'vi' 
                ? `Đang hiển thị ${displayCount.toLocaleString('vi-VN')} việc phù hợp với điều kiện lọc`
                : language === 'en'
                ? `Showing ${displayCount.toLocaleString()} jobs matching your filters`
                : `${displayCount.toLocaleString('ja-JP')} 件の条件に合う求人を表示中`}
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setSaveCriteriaNameInput('');
                  setShowSaveCriteriaNameModal(true);
                }}
                onMouseEnter={() => setHoveredSaveSearchButton(true)}
                onMouseLeave={() => setHoveredSaveSearchButton(false)}
                className="px-2 py-0.5 text-[9px] rounded border font-medium transition-colors"
                style={{
                  borderColor: '#60a5fa',
                  color: '#1d4ed8',
                  backgroundColor: hoveredSaveSearchButton ? '#eff6ff' : 'white'
                }}
              >
                {language === 'vi' ? 'Lưu điều kiện đang tìm' : language === 'en' ? 'Save current filters' : '現在の条件を保存'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Advanced Filter Slide-in Modal */}
      {showMobileAdvancedFilter && (
        <>
          {/* Backdrop */}
          <div 
            className="lg:hidden fixed inset-0 z-50 bg-black/30 transition-opacity"
            onClick={() => setShowMobileAdvancedFilter(false)}
          />
          {/* Slide-in Panel from Left - leaves space for BottomNavbar */}
          <div 
            className="lg:hidden fixed top-0 left-0 z-50 w-[85vw] max-w-[320px] bg-white shadow-xl flex flex-col transform transition-transform duration-300 ease-out"
            style={{ 
              animation: 'slideInLeft 0.3s ease-out',
              bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
              borderBottomRightRadius: '12px',
            }}
          >
            <style>{`
              @keyframes slideInLeft {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
              }
            `}</style>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>
                {language === 'vi' ? 'Bộ lọc nâng cao' : language === 'en' ? 'Advanced Filters' : '詳細フィルター'}
              </h3>
              <button
                onClick={() => setShowMobileAdvancedFilter(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: '#6b7280' }} />
              </button>
            </div>
            
            {/* Scrollable Filter Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3 custom-scrollbar">
              {/* Địa điểm làm việc */}
              <FilterBlock icon={MapPin} label={language === 'vi' ? 'Địa điểm làm việc' : language === 'en' ? 'Work Location' : '勤務地'} compact={true}>
                <div className="flex gap-1 items-center">
                  <input
                    type="text"
                    readOnly
                    value={getSelectedLocationsDisplay()}
                    placeholder={language === 'vi' ? 'Chọn địa điểm' : language === 'en' ? 'Select location' : '勤務地を選択'}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded bg-gray-50 cursor-pointer"
                    onClick={openLocationModal}
                  />
                  <button
                    onClick={openLocationModal}
                    className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </FilterBlock>

              <FilterBlock
                icon={Globe}
                label={language === 'vi' ? 'Địa điểm tuyển dụng' : language === 'en' ? 'Recruitment location' : '採用地域'}
                compact={true}
              >
                <select
                  value={filters.recruitmentLocation || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, recruitmentLocation: e.target.value || '' }))
                  }
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {language === 'vi' ? 'Tất cả' : language === 'en' ? 'All' : 'すべて'}
                  </option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={String(n)}>
                      {getRecruitmentLocationLabel(n, recruitmentLocationLang)}
                    </option>
                  ))}
                </select>
              </FilterBlock>

              {/* Loại công việc */}
              <FilterBlock icon={Briefcase} label={t.agentJobsJobType} compact={true}>
                <div className="flex gap-1 items-center">
                  <input
                    type="text"
                    readOnly
                    value={getSelectedCategoryDisplay() || ''}
                    placeholder={t.agentJobsSelectJobTypePlaceholder}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded bg-gray-50 cursor-pointer"
                    onClick={() => setShowFieldJobTypeModal(true)}
                  />
                  <button
                    onClick={() => setShowFieldJobTypeModal(true)}
                    className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </FilterBlock>

              {/* Lĩnh vực */}
              <FilterBlock icon={Building2} label={language === 'vi' ? 'Lĩnh vực' : language === 'en' ? 'Business Sector' : '業種'} compact={true}>
                <div className="flex gap-1 items-center">
                  <input
                    type="text"
                    readOnly
                    value={getSelectedSectorNames() || ''}
                    placeholder={language === 'vi' ? 'Chọn lĩnh vực' : language === 'en' ? 'Select sector' : '業種を選択'}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded bg-gray-50 cursor-pointer"
                    onClick={() => setShowSectorModal(true)}
                  />
                  <button
                    onClick={() => setShowSectorModal(true)}
                    className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </FilterBlock>

              {/* Tuổi */}
              <FilterBlock icon={Calendar} label={language === 'vi' ? 'Tuổi' : language === 'en' ? 'Age' : '年齢'} compact={true}>
                <select
                  value={filters.age || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, age: e.target.value || null }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{language === 'vi' ? 'Chọn tuổi' : language === 'en' ? 'Select age' : '選択'}</option>
                  <option value="18">18</option>
                  <option value="20">20</option>
                  <option value="25">25</option>
                  <option value="30">30</option>
                  <option value="35">35</option>
                  <option value="40">40</option>
                </select>
              </FilterBlock>

              {/* Range lương */}
              <FilterBlock icon={DollarSign} label={language === 'vi' ? 'Range lương' : language === 'en' ? 'Salary Range' : '給与範囲'} compact={true}>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={filters.salaryMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, salaryMin: e.target.value ? Number(e.target.value) : '' }))}
                    placeholder={language === 'vi' ? 'Từ' : language === 'en' ? 'From' : 'から'}
                    className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500 text-xs">~</span>
                  <input
                    type="number"
                    value={filters.salaryMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, salaryMax: e.target.value ? Number(e.target.value) : '' }))}
                    placeholder={language === 'vi' ? 'Đến' : language === 'en' ? 'To' : 'まで'}
                    className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </FilterBlock>

              {/* Hình thức tuyển dụng */}
              <FilterBlock icon={FileText} label={language === 'vi' ? 'Hình thức tuyển dụng' : language === 'en' ? 'Employment Type' : '雇用形態'} compact={true}>
                <select
                  value={filters.employmentType || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, employmentType: e.target.value || null }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{language === 'vi' ? 'Chọn hình thức' : language === 'en' ? 'Select type' : '選択'}</option>
                  {mockEmploymentTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </FilterBlock>

              {/* Điểm nổi bật */}
              <FilterBlock icon={Star} label={language === 'vi' ? 'Điểm nổi bật' : language === 'en' ? 'Highlights' : '求人の特徴'} compact={true}>
                <div className="flex gap-1 items-center">
                  <input
                    type="text"
                    readOnly
                    value={getSelectedHighlightsNames() || ''}
                    placeholder={language === 'vi' ? 'Chọn điểm nổi bật' : language === 'en' ? 'Select highlights' : '特徴を選択'}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded bg-gray-50 cursor-pointer"
                    onClick={() => setShowHighlightModal(true)}
                  />
                  <button
                    onClick={() => setShowHighlightModal(true)}
                    className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </FilterBlock>

              {/* Điều kiện checkboxes */}
              <FilterBlock icon={CheckSquare} label={language === 'vi' ? 'Điều kiện' : language === 'en' ? 'Conditions' : '条件'} compact={true}>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.booleans.noExperienceOk}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        booleans: { ...prev.booleans, noExperienceOk: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-700">
                      {language === 'vi' ? 'Chưa có kinh nghiệm OK' : language === 'en' ? 'No experience OK' : '未経験OK'}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.booleans.underOneYearOk}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        booleans: { ...prev.booleans, underOneYearOk: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-700">
                      {language === 'vi' ? 'Dưới 1 năm kinh nghiệm OK' : language === 'en' ? 'Under 1 year exp OK' : '経験1年未満OK'}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.booleans.graduatingSoonOk}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        booleans: { ...prev.booleans, graduatingSoonOk: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-700">
                      {language === 'vi' ? 'Sắp tốt nghiệp OK' : language === 'en' ? 'Graduating soon OK' : '卒業予定者OK'}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.booleans.remoteOk}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        booleans: { ...prev.booleans, remoteOk: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-700">
                      {language === 'vi' ? 'Remote OK' : language === 'en' ? 'Remote OK' : 'リモートOK'}
                    </span>
                  </label>
                </div>
              </FilterBlock>
            </div>

            {/* Footer Buttons */}
            <div className="flex-shrink-0 p-3 border-t border-gray-200 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={handleClearAll}
                  className="flex-1 py-2.5 px-3 text-xs font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
                >
                  {language === 'vi' ? 'Xóa bộ lọc' : language === 'en' ? 'Clear all' : 'クリア'}
                </button>
                <button
                  onClick={() => {
                    handleSearch();
                    setShowMobileAdvancedFilter(false);
                  }}
                  disabled={loading}
                  className="flex-1 py-2.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: '#facc15',
                    color: '#1f2937',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {loading ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {language === 'vi' ? 'Áp dụng' : language === 'en' ? 'Apply' : '適用'}
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-500">
                {language === 'vi' 
                  ? `${displayCount.toLocaleString('vi-VN')} việc phù hợp`
                  : language === 'en'
                  ? `${displayCount.toLocaleString()} matching jobs`
                  : `${displayCount.toLocaleString('ja-JP')} 件該当`}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {/* Dual Modal: Country and Location Selection */}
      {showLocationModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          onClick={closeLocationModal}
        >
          <div 
            className="rounded-lg shadow-xl w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col lg:flex-row" 
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
          >
            {/* Left Panel: Country Selection */}
            <div className="w-full lg:w-[220px] flex-shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex h-11 items-center justify-between px-4 border-b bg-white" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-base font-semibold" style={{ color: '#111827' }}>
                  {language === 'vi' ? 'Chọn quốc gia' : language === 'en' ? 'Select Country' : '国を選択'}
                </h3>
                <button 
                  onClick={closeLocationModal}
                  onMouseEnter={() => setHoveredModalCloseButton('location')}
                  onMouseLeave={() => setHoveredModalCloseButton(null)}
                  className="p-1 rounded transition-colors"
                  style={{
                    backgroundColor: hoveredModalCloseButton === 'location' ? '#f3f4f6' : 'transparent'
                  }}
                >
                  <X className="w-5 h-5" style={{ color: '#4b5563' }} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="space-y-2">
                  {LOCATION_FILTER_COUNTRY_KEYS.map((country) => {
                    const isSelected = selectedCountries.includes(country);
                    return (
                      <label
                        key={country}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCountry(country)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-900">{countryFilterLabel(country, language)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Panel: Việt Nam = tỉnh phẳng; Nhật = vùng → tỉnh → phường */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex h-11 items-center justify-between px-4 border-b border-gray-200 bg-white">
                <h3 className="text-base font-semibold text-gray-900">
                  {language === 'vi'
                    ? 'Chọn địa điểm làm việc'
                    : language === 'en'
                    ? 'Select work location'
                    : '勤務地を選択'}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {selectedCountries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {language === 'vi'
                      ? 'Vui lòng chọn quốc gia trước'
                      : language === 'en'
                      ? 'Please select a country first'
                      : 'まず国を選択してください'}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedCountries.includes('Vietnam') && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-800 mb-2">
                          {countryFilterLabel('Vietnam', language)}
                        </h4>
                        <p className="text-[11px] text-gray-500 mb-2">
                          {language === 'vi'
                            ? 'Chọn một hoặc nhiều tỉnh/thành'
                            : language === 'en'
                            ? 'Select one or more provinces/cities'
                            : '都道府県・都市を選択'}
                        </p>
                        <div className="max-h-[36vh] overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-0.5">
                          {(() => {
                            const selectedVietnamLocations = getVietnamLocationSet();
                            const allSelected =
                              VIETNAM_PROVINCES.length > 0 &&
                              VIETNAM_PROVINCES.every((p) => selectedVietnamLocations.has(p));
                            return (
                              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border-b border-gray-100 mb-1">
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  onChange={(e) => {
                                    setDraftLocations((prev) => {
                                      const withoutVN = prev.filter((l) => l.country !== 'Vietnam');
                                      if (e.target.checked) {
                                        return [...withoutVN, ...VIETNAM_PROVINCES.map((p) => ({ country: 'Vietnam', location: p }))];
                                      }
                                      return withoutVN;
                                    });
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-xs font-medium text-gray-900">
                                  {language === 'vi' ? 'Tất cả' : language === 'en' ? 'All' : 'すべて'}
                                </span>
                              </label>
                            );
                          })()}
                          {VIETNAM_PROVINCES.map((province) => {
                            const isSelected = draftLocations.some(
                              (l) => l.country === 'Vietnam' && l.location === province
                            );
                            return (
                              <label
                                key={province}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleLocation(province, 'Vietnam')}
                                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-900">{province}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {selectedCountries.includes('Japan') && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-800 mb-1">
                          {countryFilterLabel('Japan', language)}
                        </h4>
                        <p className="text-[11px] text-gray-500 mb-2">
                          {language === 'vi'
                            ? 'Chọn vùng → tỉnh/thành → phường/quận (có thể chọn nhiều)'
                            : language === 'en'
                            ? 'Region → prefecture → city/ward (multi-select)'
                            : '地域 → 都道府県 → 市区町村'}
                        </p>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                          <div className="border rounded-lg overflow-hidden flex flex-col min-h-[240px] lg:h-[42vh]">
                            <div className="text-[10px] font-semibold px-3 py-2 bg-gray-100 text-gray-700 shrink-0 border-b border-gray-200">
                              {language === 'vi' ? 'Vùng' : language === 'en' ? 'Region' : '地域'}
                            </div>
                            <div className="overflow-y-auto flex-1 p-2">
                              <label className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-200 mb-1 pb-1.5">
                                <input
                                  type="checkbox"
                                  checked={japanSelectionDraft.allRegions}
                                  disabled={!!japanBulkLoading}
                                  onChange={(e) => selectAllJapanLocations(e.target.checked)}
                                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                />
                                <span
                                  className={`text-xs font-medium ${
                                    japanFilterRegion === ALL_JAPAN_REGIONS_KEY ? 'text-blue-800' : 'text-gray-900'
                                  }`}
                                >
                                  {language === 'vi' ? 'Tất cả' : language === 'en' ? 'All' : 'すべて'}
                                </span>
                              </label>
                              {JAPAN_REGIONS.map((reg) => (
                                <div key={reg.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded">
                                  <input
                                    type="checkbox"
                                    checked={isJapanRegionChecked(reg.id)}
                                    disabled={japanBulkLoading === `reg-${reg.id}`}
                                    onChange={(e) => selectAllRegion(reg.id, e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 shrink-0 cursor-pointer"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setJapanFilterRegion(reg.id);
                                      setJapanFilterPrefecture(null);
                                    }}
                                    className={`flex-1 rounded px-1 py-1 text-left text-xs cursor-pointer ${
                                      japanFilterRegion === reg.id
                                        ? 'bg-blue-50 text-blue-800 font-medium'
                                        : 'text-gray-800'
                                    }`}
                                  >
                                    {language === 'ja' ? reg.ja : reg.en}
                                    {japanBulkLoading === `reg-${reg.id}` && <span className="ml-1 text-[10px] text-gray-400">…</span>}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="border rounded-lg overflow-hidden flex flex-col min-h-[240px] lg:h-[42vh]">
                            <div className="text-[10px] font-semibold px-3 py-2 bg-gray-100 text-gray-700 shrink-0 border-b border-gray-200">
                              {language === 'vi' ? 'Tỉnh / thành' : language === 'en' ? 'Prefecture' : '都道府県'}
                            </div>
                            <div className="overflow-y-auto flex-1 p-2">
                              {getJapanPrefectureCodesForPanel().length === 0 && (
                                <div className="text-xs text-gray-400 p-2">
                                  {language === 'vi'
                                    ? 'Chọn vùng trước'
                                    : language === 'en'
                                    ? 'Select a region'
                                    : '地域を選んでください'}
                                </div>
                              )}
                              {getJapanPrefectureCodesForPanel().length > 0 && (() => {
                                const prefCodes = getJapanPrefectureCodesForPanel();
                                return (
                                  <>
                                    <label className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-200 mb-1 pb-1.5">
                                      <input
                                        type="checkbox"
                                        checked={areAllPrefecturesChecked(prefCodes)}
                                        disabled={!!japanBulkLoading}
                                        onChange={(e) => selectAllPrefecturesInPanel(prefCodes, e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                      />
                                      <span className="text-xs font-medium text-blue-800">
                                        {language === 'vi' ? 'Tất cả' : language === 'en' ? 'All' : 'すべて'}
                                      </span>
                                    </label>
                                    {prefCodes.map((code) => {
                                      const pref = JAPAN_PREFECTURES[code];
                                      if (!pref) return null;
                                      return (
                                        <div key={code} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded">
                                          <input
                                            type="checkbox"
                                            checked={isJapanPrefectureChecked(code)}
                                            disabled={japanBulkLoading === `pref-${code}`}
                                            onChange={(e) => selectAllPrefecture(code, e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 shrink-0 cursor-pointer"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => setJapanFilterPrefecture(code)}
                                            className={`flex-1 rounded px-1 py-1 text-left text-xs cursor-pointer ${
                                              japanFilterPrefecture === code
                                                ? 'bg-blue-50 text-blue-800 font-medium'
                                                : 'text-gray-800'
                                            }`}
                                          >
                                            {language === 'ja' ? pref.ja : pref.en}
                                            {japanBulkLoading === `pref-${code}` && <span className="ml-1 text-[10px] text-gray-400">…</span>}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="border rounded-lg overflow-hidden flex flex-col min-h-[240px] lg:h-[42vh]">
                            <div className="text-[10px] font-semibold px-3 py-2 bg-gray-100 text-gray-700 shrink-0 border-b border-gray-200">
                              {language === 'vi' ? 'Phường / quận' : language === 'en' ? 'City / ward' : '市区町村'}
                            </div>
                            <div className="overflow-y-auto flex-1 p-2">
                              {japanFilterLoading && (
                                <div className="text-xs text-gray-500 p-2">Loading…</div>
                              )}
                              {!japanFilterLoading && getJapanTargetPrefectureCodesForWardPanel().length > 0 && (() => {
                                const selectedIds = new Set(
                                  draftLocations
                                    .filter((l) => l.country === 'Japan')
                                    .map((l) => l.jpId || `${l.location}_Japan`)
                                );
                                const targetPrefCodes = getJapanTargetPrefectureCodesForWardPanel();
                                const prefSections = targetPrefCodes
                                  .map((prefCode) => {
                                    const tree =
                                      prefCode === japanFilterPrefecture && japanFilterPrefecture && japanFilterPrefecture !== ALL_JAPAN_PREFECTURES_KEY
                                        ? japanFilterData.tree || []
                                        : japanPrefectureCache[prefCode]?.tree || [];
                                    const pref = JAPAN_PREFECTURES[prefCode];
                                    const prefJa = pref?.ja || '';
                                    const prefEn = pref?.en || '';
                                    const toR = (kana, fb) => (kana ? kanaToRomaji(kana) : fb);
                                    const makeLoc = (nameJa, nameKana) => {
                                      const ja = `${prefJa} ${nameJa}`.trim();
                                      const alpha = `${prefEn} ${toR(nameKana, nameJa)}`.trim();
                                      const id = `${prefCode}|${nameJa}`;
                                      return { id, ja, alpha };
                                    };
                                    const allLocs = tree.flatMap((c) =>
                                      c.standalone
                                        ? [makeLoc(c.name, c.nameKana)]
                                        : (c.wards || []).map((w) => makeLoc(w.fullName, w.fullNameKana))
                                    );
                                    return { prefCode, prefJa, prefEn, tree, allLocs, makeLoc, toR };
                                  })
                                  .filter((section) => section.allLocs.length > 0);
                                const mergedAllLocs = prefSections.flatMap((section) => section.allLocs);
                                if (mergedAllLocs.length === 0) {
                                  return (
                                    <div className="text-xs text-gray-400 p-2">
                                      {language === 'vi'
                                        ? 'Không có dữ liệu'
                                        : language === 'en'
                                        ? 'No data'
                                        : 'データがありません'}
                                    </div>
                                  );
                                }
                                const allOn = mergedAllLocs.every((loc) => selectedIds.has(loc.id));
                                return (
                                  <>
                                    <label className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={allOn}
                                        onChange={(e) => applyJapanLocationBulk(e.target.checked, mergedAllLocs)}
                                        className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                                      />
                                      <span className="text-xs font-medium">
                                        {language === 'vi' ? 'Tất cả' : language === 'en' ? 'All' : 'すべて'}
                                      </span>
                                    </label>
                                    {prefSections.map((section) => {
                                      const sectionAllOn =
                                        section.allLocs.length > 0 && section.allLocs.every((loc) => selectedIds.has(loc.id));
                                      return (
                                        <div key={section.prefCode} className="mb-2 last:mb-0">
                                          {targetPrefCodes.length > 1 && (
                                            <label className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-100 mb-1">
                                              <input
                                                type="checkbox"
                                                checked={sectionAllOn}
                                                onChange={(e) => applyJapanLocationBulk(e.target.checked, section.allLocs)}
                                                className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                                              />
                                              <span className="text-xs font-semibold text-gray-800">
                                                {language === 'ja' ? section.prefJa : section.prefEn}
                                              </span>
                                            </label>
                                          )}
                                          {section.tree.map((city) => {
                                            const cityLocs = city.standalone
                                              ? [section.makeLoc(city.name, city.nameKana)]
                                              : (city.wards || []).map((w) => section.makeLoc(w.fullName, w.fullNameKana));
                                            const cityOn =
                                              cityLocs.length > 0 && cityLocs.every((l) => selectedIds.has(l.id));
                                            return (
                                              <div key={`${section.prefCode}-${city.name}`}>
                                                <label className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    checked={cityOn}
                                                    onChange={(e) => applyJapanLocationBulk(e.target.checked, cityLocs)}
                                                    className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                                                  />
                                                  <span className="text-xs font-medium text-gray-800">
                                                    {language === 'ja' ? city.name : section.toR(city.nameKana, city.name)}
                                                  </span>
                                                </label>
                                                {city.wards && city.wards.length > 0 && (
                                                  <div className="ml-3 pl-2 border-l border-gray-200">
                                                    {city.wards.map((w) => {
                                                      const loc = section.makeLoc(w.fullName, w.fullNameKana);
                                                      const on = selectedIds.has(loc.id);
                                                      return (
                                                        <label
                                                          key={`${section.prefCode}-${w.fullName}`}
                                                          className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                                                        >
                                                          <input
                                                            type="checkbox"
                                                            checked={on}
                                                            onChange={() =>
                                                              toggleJapanLocationEntry({
                                                                location: loc.alpha,
                                                                locationJp: loc.ja,
                                                                jpId: loc.id,
                                                              })
                                                            }
                                                            className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                                                          />
                                                          <span className="text-xs text-gray-700">
                                                            {language === 'ja' ? w.fullName : section.toR(w.fullNameKana, w.fullName)}
                                                          </span>
                                                        </label>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                              {!japanFilterLoading &&
                                getJapanPrefectureCodesForPanel().length > 0 &&
                                getJapanTargetPrefectureCodesForWardPanel().length === 0 && (
                                <div className="text-xs text-gray-400 p-2">
                                  {language === 'vi'
                                    ? 'Chọn tỉnh/thành'
                                    : language === 'en'
                                    ? 'Select prefecture'
                                    : '都道府県を選んでください'}
                                </div>
                              )}
                              {!japanFilterLoading && getJapanPrefectureCodesForPanel().length === 0 && (
                                <div className="text-xs text-gray-400 p-2">
                                  {language === 'vi'
                                    ? 'Chọn vùng và tỉnh'
                                    : language === 'en'
                                    ? 'Select region & prefecture'
                                    : '地域と都道府県を選んでください'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-4 border-t" style={{ borderColor: '#e5e7eb' }}>
                <button
                  onClick={confirmLocationModal}
                  onMouseEnter={() => setHoveredModalConfirmButton('location')}
                  onMouseLeave={() => setHoveredModalConfirmButton(null)}
                  className="w-full py-2 px-4 rounded-lg transition-colors font-medium"
                  style={{
                    backgroundColor: hoveredModalConfirmButton === 'location' ? '#2563eb' : '#2563eb',
                    color: 'white'
                  }}
                >
                  {language === 'vi' ? 'Xác nhận' : language === 'en' ? 'Confirm' : '確認'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Dual Modal: Field and Job Type Selection */}
      {showFieldJobTypeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          onClick={() => {
            setShowFieldJobTypeModal(false);
            setSelectedFields([]);
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Panel: Field Selection */}
            <div className="w-1/2 border-r border-gray-200 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">
                  {t.agentJobsSelectJobType}
                </h3>
                <button 
                  onClick={() => {
                    setShowFieldJobTypeModal(false);
                    setSelectedFields([]);
                  }} 
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingFields ? (
                  <div className="text-center py-8 text-gray-500 text-sm">{t.loading}</div>
                ) : (
                  <div className="space-y-1">
                    {/* Chỉ hiển thị các lĩnh vực cha (parentId = null) */}
                    {categoryTree.length > 0 ? (
                      // Chỉ render các category top-level (không có parentId)
                      categoryTree
                        .filter(cat => !cat.parentId) // Chỉ lấy các category cha
                        .map((cat) => {
                          const catId = String(cat.id);
                          const isSelected = selectedFields.includes(catId);
                          
                          return (
                            <label
                              key={catId}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleField(catId)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 flex-shrink-0"
                              />
                              <span className="text-xs text-gray-900 flex-1">
                                {getCategoryDisplayName(cat)}
                              </span>
                            </label>
                          );
                        })
                    ) : (
                      // Fallback: flat list - chỉ lấy các field không có parentId
                      availableFields
                        .filter(field => !field.parentId)
                        .map((field) => {
                          const isSelected = selectedFields.includes(field.id);
                          return (
                            <label
                              key={field.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleField(field.id)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-900">{getCategoryDisplayName(field)}</span>
                            </label>
                          );
                        })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Job Type Selection */}
            <div className="w-1/2 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
<h3 className="text-base font-semibold text-gray-900">
                {t.agentJobsDetails}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingJobTypes ? (
                  <div className="text-center py-8 text-gray-500 text-sm">{t.loading}</div>
                ) : selectedFields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {t.agentJobsSelectJobTypeFirst}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedFields.map((fieldId) => {
                      // Tìm field trong tree
                      const findCategoryInTree = (categories, targetId) => {
                        for (const cat of categories) {
                          if (String(cat.id) === String(targetId)) {
                            return cat;
                          }
                          if (cat.children && cat.children.length > 0) {
                            const found = findCategoryInTree(cat.children, targetId);
                            if (found) return found;
                          }
                        }
                        return null;
                      };
                      
                      const fieldInTree = findCategoryInTree(categoryTree, fieldId);
                      const field = availableFields.find(f => f.id === fieldId) || 
                                   (fieldInTree ? { id: String(fieldInTree.id), name: fieldInTree.name, nameEn: fieldInTree.nameEn, nameJp: fieldInTree.nameJp } : null);
                      
                      if (!field && !fieldInTree) return null;
                      
                      // Render nested job types với cấu trúc phân cấp đầy đủ
                      const renderNestedJobTypes = (category, level = 0) => {
                        if (!category.children || category.children.length === 0) return null;
                        
                        return (
                          <div className="space-y-1">
                            {category.children.map((child) => {
                              const childId = String(child.id);
                              const hasChildren = child.children && child.children.length > 0;
                              const idsInGroup = hasChildren ? getCategoryAndDescendantIds(child) : [childId];
                              const isSelected = hasChildren
                                ? idsInGroup.some(id => filters.jobTypeIds.includes(id))
                                : filters.jobTypeIds.includes(childId);
                              
                              return (
                                <div key={childId}>
                                  <label
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                    style={{ paddingLeft: `${level * 20}px` }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => hasChildren
                                        ? toggleJobTypeWithDescendants(child)
                                        : toggleJobType(childId)
                                      }
                                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 flex-shrink-0"
                                    />
                                    <span className="text-xs text-gray-900 flex-1">
                                      {level > 0 && <span className="text-gray-400 mr-1">└─</span>}
                                      {getCategoryDisplayName(child)}
                                    </span>
                                  </label>
                                  {/* Render children của child (con của con) */}
                                  {hasChildren && (
                                    <div>
                                      {renderNestedJobTypes(child, level + 1)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      };
                      
                      // Nếu có field trong tree và có children, render tree structure
                      if (fieldInTree && fieldInTree.children && fieldInTree.children.length > 0) {
                        const detailIdsForField = getAllDetailIdsUnderField(fieldInTree);
                        const allChecked = detailIdsForField.length > 0 && detailIdsForField.every((id) => filters.jobTypeIds.map(String).includes(String(id)));
                        const someChecked = detailIdsForField.length > 0 && detailIdsForField.some((id) => filters.jobTypeIds.map(String).includes(String(id)));
                        return (
                          <div key={fieldId} className="space-y-2">
                            <label className="flex items-center gap-2 mb-2 border-b border-gray-200 pb-2 cursor-pointer">
                              {detailIdsForField.length > 0 && (
                                <input
                                  type="checkbox"
                                  checked={allChecked}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someChecked && !allChecked;
                                  }}
                                  onChange={() => toggleSelectAllDetailsForField(detailIdsForField)}
                                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 flex-shrink-0"
                                />
                              )}
<h4 className="text-sm font-medium text-gray-700">
                                {getCategoryDisplayName(fieldInTree)}
                              </h4>
                              {detailIdsForField.length > 0 && (
                                <span className="text-xs text-gray-500">
                                ({t.selectAll})
                                </span>
                              )}
                            </label>
                            {renderNestedJobTypes(fieldInTree, 0)}
                          </div>
                        );
                      }
                      
                      // Fallback: Nếu không có tree structure, dùng flat list với descendants
                      const allDescendantIds = findAllDescendants(fieldId);
                      const directChildren = availableJobTypes.filter(jt => jt.parentId === fieldId);
                      const allJobTypesForField = [
                        ...directChildren,
                        ...availableJobTypes.filter(jt => allDescendantIds.includes(jt.id) && jt.parentId !== fieldId)
                      ];
                      
                      // Remove duplicates
                      const uniqueJobTypes = Array.from(
                        new Map(allJobTypesForField.map(jt => [jt.id, jt])).values()
                      );
                      
                      const detailIdsFlat = uniqueJobTypes.map((jt) => jt.id);
                      const allCheckedFlat = detailIdsFlat.length > 0 && detailIdsFlat.every((id) => filters.jobTypeIds.map(String).includes(String(id)));
                      const someCheckedFlat = detailIdsFlat.length > 0 && detailIdsFlat.some((id) => filters.jobTypeIds.map(String).includes(String(id)));
                      return (
                        <div key={fieldId} className="space-y-2">
                          <label className="flex items-center gap-2 mb-2 border-b border-gray-200 pb-2 cursor-pointer">
                            {detailIdsFlat.length > 0 && (
                              <input
                                type="checkbox"
                                checked={allCheckedFlat}
                                ref={(el) => {
                                  if (el) el.indeterminate = someCheckedFlat && !allCheckedFlat;
                                }}
                                onChange={() => toggleSelectAllDetailsForField(detailIdsFlat)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 flex-shrink-0"
                              />
                            )}
                            <h4 className="text-sm font-medium text-gray-700">
                              {getCategoryDisplayName(field || fieldInTree)}
                            </h4>
                            {detailIdsFlat.length > 0 && (
                              <span className="text-xs text-gray-500">
                                ({t.selectAll})
                              </span>
                            )}
                          </label>
                          <div className="space-y-1">
                            {uniqueJobTypes.map((jobType) => {
                              const isSelected = filters.jobTypeIds.includes(jobType.id);
                              return (
                                <label
                                  key={jobType.id}
                                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleJobType(jobType.id)}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-900">{getCategoryDisplayName(jobType)}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-4 border-t" style={{ borderColor: '#e5e7eb' }}>
                <button
                  onClick={() => {
                    setShowFieldJobTypeModal(false);
                    setSelectedFields([]);
                  }}
                  onMouseEnter={() => setHoveredModalConfirmButton('field')}
                  onMouseLeave={() => setHoveredModalConfirmButton(null)}
                  className="w-full py-2 px-4 rounded-lg transition-colors font-medium"
                  style={{
                    backgroundColor: hoveredModalConfirmButton === 'field' ? '#2563eb' : '#2563eb',
                    color: 'white'
                  }}
                >
                  {language === 'vi' ? 'Xác nhận' : language === 'en' ? 'Confirm' : '確認'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lĩnh vực kinh doanh */}
      {showSectorModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          onClick={() => setShowSectorModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                {language === 'vi' ? 'Chọn lĩnh vực kinh doanh' : language === 'en' ? 'Select business sector' : '業種を選択'}
              </h3>
              <button 
                onClick={() => setShowSectorModal(false)} 
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {BUSINESS_SECTOR_OPTIONS.map((option) => {
                  const value = option.vi; // canonical value for filters/API
                  const label =
                    language === 'en'
                      ? option.en || option.vi
                      : language === 'ja'
                      ? option.ja || option.vi
                      : option.vi;
                  const isSelected = (filters.sectorNames || []).includes(value);
                  return (
                    <label
                      key={option.key}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setFilters(prev => {
                            const current = prev.sectorNames || [];
                            if (current.includes(value)) {
                              return { ...prev, sectorNames: current.filter(s => s !== value) };
                            }
                            return { ...prev, sectorNames: [...current, value] };
                          });
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 flex-shrink-0"
                      />
                      <span className="text-xs text-gray-900 flex-1">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t" style={{ borderColor: '#e5e7eb' }}>
              <button
                onClick={() => setShowSectorModal(false)}
                onMouseEnter={() => setHoveredModalConfirmButton('sector')}
                onMouseLeave={() => setHoveredModalConfirmButton(null)}
                className="w-full py-2 px-4 rounded-lg transition-colors font-medium"
                style={{
                  backgroundColor: hoveredModalConfirmButton === 'sector' ? '#1d4ed8' : '#2563eb',
                  color: 'white'
                }}
              >
                {language === 'vi' ? 'Xác nhận' : language === 'en' ? 'Confirm' : '確認'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MultiSelectModal
        isOpen={showHighlightModal}
        onClose={() => setShowHighlightModal(false)}
        title={language === 'vi' ? 'Chọn điểm nổi bật' : language === 'en' ? 'Select Highlights' : '特徴を選択'}
        options={JOB_HIGHLIGHT_OPTIONS.map((item) => ({
          id: item.key,
          name: language === 'en' ? item.en : language === 'ja' ? item.jp : item.vi,
        }))}
        selected={filters.highlights}
        onToggle={toggleHighlight}
      />

      {/* Search History Modal */}
      <SlideInModal
        isOpen={showSearchHistoryModal}
        onClose={() => setShowSearchHistoryModal(false)}
        title={language === 'vi' ? 'Lịch sử tìm kiếm' : language === 'ja' ? '検索履歴' : 'Search history'}
        hoveredSlideModalCloseButton={hoveredSlideModalCloseButton}
        setHoveredSlideModalCloseButton={setHoveredSlideModalCloseButton}
      >
        <SearchHistoryContent
          isOpen={showSearchHistoryModal}
          onApply={applyFiltersAndSearch}
          language={language}
        />
      </SlideInModal>

      {/* Saved Criteria Modal */}
      <SlideInModal
        isOpen={showSavedCriteriaModal}
        onClose={() => setShowSavedCriteriaModal(false)}
        title={language === 'vi' ? 'Tiêu chí tìm kiếm đã lưu' : language === 'ja' ? '保存済み検索条件' : 'Saved search criteria'}
        hoveredSlideModalCloseButton={hoveredSlideModalCloseButton}
        setHoveredSlideModalCloseButton={setHoveredSlideModalCloseButton}
      >
        <SavedCriteriaContent
          isOpen={showSavedCriteriaModal}
          refreshTrigger={savedCriteriaRefreshTrigger}
          onApply={applyFiltersAndSearch}
          onDelete={async (id) => {
            try {
              await apiService.deleteSavedSearchCriteria(id);
              setSavedCriteriaRefreshTrigger((t) => t + 1);
            } catch (e) {
              console.error(e);
            }
          }}
          onSaveCurrentClick={() => {
            setShowSavedCriteriaModal(false);
            setSaveCriteriaNameInput('');
            setShowSaveCriteriaNameModal(true);
          }}
          language={language}
        />
      </SlideInModal>

      {/* Modal nhập tên khi lưu tiêu chí */}
      {showSaveCriteriaNameModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} onClick={() => setShowSaveCriteriaNameModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {language === 'vi' ? 'Đặt tên tiêu chí' : language === 'en' ? 'Name this criteria' : '条件の名前'}
            </h3>
            <input
              type="text"
              value={saveCriteriaNameInput}
              onChange={(e) => setSaveCriteriaNameInput(e.target.value)}
              placeholder={language === 'vi' ? 'VD: Tìm IT Tokyo' : 'e.g. IT Tokyo'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowSaveCriteriaNameModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {language === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const name = saveCriteriaNameInput.trim();
                  if (!name) return;
                  try {
                    const keywordVal = filters.keyword ?? '';
                    await apiService.createSavedSearchCriteria({
                      name,
                      filters: { ...filters, keyword: keywordVal }
                    });
                    setShowSaveCriteriaNameModal(false);
                    setSaveCriteriaNameInput('');
                    setSavedCriteriaRefreshTrigger((t) => t + 1);
                    setShowSavedCriteriaModal(true);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                {language === 'vi' ? 'Lưu' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved List Modal */}
      <SlideInModal
        isOpen={showSavedListModal}
        onClose={() => setShowSavedListModal(false)}
        title={language === 'vi' ? 'Danh sách lưu giữ' : language === 'ja' ? '保存リスト' : 'Saved lists'}
        hoveredSlideModalCloseButton={hoveredSlideModalCloseButton}
        setHoveredSlideModalCloseButton={setHoveredSlideModalCloseButton}
      >
        <SavedListContent
          isOpen={showSavedListModal}
          language={language}
          onTotalJobsChange={setSavedListsTotalJobs}
        />
      </SlideInModal>
      </div>
    </>
  );
};

// Slide In Modal Component
const SlideInModal = ({ isOpen, onClose, title, children, hoveredSlideModalCloseButton, setHoveredSlideModalCloseButton }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger animation after mount
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          backgroundColor: isAnimating ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0)',
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        className={`fixed inset-y-0 right-0 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '40vw' }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#e5e7eb' }}>
            <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>{title}</h2>
            <button
              onClick={onClose}
              onMouseEnter={() => setHoveredSlideModalCloseButton(true)}
              onMouseLeave={() => setHoveredSlideModalCloseButton(false)}
              className="p-2 rounded-full transition-colors"
              style={{
                backgroundColor: hoveredSlideModalCloseButton ? '#f3f4f6' : 'transparent'
              }}
            >
              <X className="w-5 h-5" style={{ color: '#4b5563' }} />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

// Search History Content
const SearchHistoryContent = ({ isOpen, onApply, language }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    apiService.getCTVSearchHistory({ page: 1, limit: 50 })
      .then((res) => {
        if (!cancelled && res.success && res.data?.searchHistory) setItems(res.data.searchHistory);
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: '1px', borderStyle: 'solid' }}>
        <div className="rounded-full p-1 flex-shrink-0 mt-0.5" style={{ backgroundColor: '#3b82f6' }}>
          <Info className="w-3 h-3" style={{ color: 'white' }} />
        </div>
        <p className="text-xs" style={{ color: '#1e3a8a' }}>
          {language === 'vi' ? '50 tiêu chí tìm kiếm gần đây nhất được hiển thị.' : 'Up to 50 recent search criteria.'}
        </p>
      </div>
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{language === 'vi' ? 'Chưa có lịch sử tìm kiếm.' : 'No search history.'}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-white">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{item.keyword || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  {item.filters && typeof item.filters === 'object' && Object.keys(item.filters).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-600">
                      {item.filters.keyword && (
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          {(language === 'vi' ? 'Từ khóa' : language === 'ja' ? 'キーワード' : 'Keyword')}: {item.filters.keyword}
                        </span>
                      )}
                      {item.filters.locations?.length > 0 && <span className="px-2 py-1 bg-gray-100 rounded">{language === 'vi' ? 'Địa điểm' : language === 'ja' ? '勤務地' : 'Location'}</span>}
                      {item.filters.fieldIds?.length > 0 && <span className="px-2 py-1 bg-gray-100 rounded">{language === 'vi' ? 'Loại công việc' : language === 'ja' ? '職種' : 'Job type'}</span>}
                      {item.filters.jobTypeIds?.length > 0 && <span className="px-2 py-1 bg-gray-100 rounded">{language === 'vi' ? 'Chi tiết' : language === 'ja' ? '詳細' : 'Details'}</span>}
                      {item.filters.sectorNames?.length > 0 && <span className="px-2 py-1 bg-gray-100 rounded">{language === 'vi' ? 'Lĩnh vực' : language === 'ja' ? '業種' : 'Sector'}</span>}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onApply?.({ keyword: item.keyword, filters: item.filters })}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-xs font-medium whitespace-nowrap flex-shrink-0"
                  style={{ backgroundColor: hoveredId === item.id ? '#bfdbfe' : '#dbeafe', color: '#1e40af' }}
                >
                  <Search className="w-4 h-4" />
                  <span>{language === 'vi' ? 'Tìm kiếm theo tiêu chí này' : 'Search with this'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Saved Criteria Content
const SavedCriteriaContent = ({ isOpen, refreshTrigger, onApply, onDelete, onSaveCurrentClick, language }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    apiService.getSavedSearchCriteria({ page: 1, limit: 50 })
      .then((res) => {
        if (!cancelled && res.success && res.data?.items) setItems(res.data.items);
        else if (!cancelled) setItems([]);
      })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, refreshTrigger]);

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: '1px', borderStyle: 'solid' }}>
        <div className="rounded-full p-1 flex-shrink-0 mt-0.5" style={{ backgroundColor: '#3b82f6' }}>
          <Info className="w-3 h-3" style={{ color: 'white' }} />
        </div>
        <p className="text-xs" style={{ color: '#1e3a8a' }}>
          {language === 'vi' ? 'Các tiêu chí tìm kiếm đã lưu của bạn.' : 'Your saved search criteria.'}
        </p>
      </div>
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{language === 'vi' ? 'Chưa lưu tiêu chí nào.' : 'No saved criteria.'}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-white">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <button type="button" onClick={() => onDelete?.(item.id)} className="text-red-500 hover:text-red-700 p-1 flex-shrink-0" aria-label={language === 'vi' ? 'Xóa' : language === 'ja' ? '削除' : 'Delete'}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(item.updatedAt || item.createdAt)}</span>
                  </div>
                  {item.filters && typeof item.filters === 'object' && (
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-600">
                      {item.filters.keyword && <span className="px-2 py-1 bg-gray-100 rounded">{language === 'vi' ? 'Từ khóa' : language === 'ja' ? 'キーワード' : 'Keyword'}</span>}
                      {item.filters.locations?.length > 0 && <span className="px-2 py-1 bg-gray-100 rounded">{language === 'vi' ? 'Địa điểm' : language === 'ja' ? '勤務地' : 'Location'}</span>}
                      {item.filters.fieldIds?.length > 0 && <span className="px-2 py-1 bg-gray-100 rounded">{language === 'vi' ? 'Loại công việc' : language === 'ja' ? '職種' : 'Job type'}</span>}
                      {item.filters.jobTypeIds?.length > 0 && <span className="px-2 py-1 bg-gray-100 rounded">{language === 'vi' ? 'Chi tiết' : language === 'ja' ? '詳細' : 'Details'}</span>}
                      {item.filters.sectorNames?.length > 0 && <span className="px-2 py-1 bg-gray-100 rounded">{language === 'vi' ? 'Lĩnh vực' : language === 'ja' ? '業種' : 'Sector'}</span>}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onApply?.({ keyword: item.filters?.keyword, filters: item.filters })}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-xs font-medium whitespace-nowrap flex-shrink-0"
                  style={{ backgroundColor: hoveredId === item.id ? '#bfdbfe' : '#dbeafe', color: '#1e40af' }}
                >
                  <Search className="w-4 h-4" />
                  <span>{language === 'vi' ? 'Áp dụng tiêu chí này' : 'Apply'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onSaveCurrentClick}
        className="w-full py-3 text-xs text-blue-600 hover:text-blue-700 border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition-colors font-medium"
      >
        + {language === 'vi' ? 'Lưu tiêu chí hiện tại' : 'Save current criteria'}
      </button>
    </div>
  );
};

// Saved List Content
const SavedListContent = ({ isOpen, language, onTotalJobsChange }) => {
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState(null);
  const [listJobs, setListJobs] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [hoveredJobId, setHoveredJobId] = useState(null);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListNameInput, setNewListNameInput] = useState('');
  const [listsRefreshTrigger, setListsRefreshTrigger] = useState(0);
  const [creatingList, setCreatingList] = useState(false);

  useEffect(() => {
    if (isOpen) setSelectedListId(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingLists(true);
    setListJobs([]);
    apiService.getSavedLists({ page: 1, limit: 100 })
      .then((res) => {
        if (!cancelled && res.success && res.data?.items) {
          setLists(res.data.items);
          const items = res.data.items;
          if (items.length > 0 && onTotalJobsChange) {
            Promise.all(items.slice(0, 20).map((l) => apiService.getSavedListJobs(l.id)))
              .then((arr) => {
                if (cancelled) return;
                const total = arr.reduce((sum, r) => sum + (r.data?.length ?? 0), 0);
                onTotalJobsChange(total);
              })
              .catch(() => { if (!cancelled) onTotalJobsChange(0); });
          } else if (onTotalJobsChange) onTotalJobsChange(0);
        } else if (!cancelled) setLists([]);
      })
      .catch(() => { if (!cancelled) setLists([]); })
      .finally(() => { if (!cancelled) setLoadingLists(false); });
    return () => { cancelled = true; };
  }, [isOpen, onTotalJobsChange, listsRefreshTrigger]);

  useEffect(() => {
    if (!selectedListId) {
      setListJobs([]);
      return;
    }
    let cancelled = false;
    setLoadingJobs(true);
    apiService.getSavedListJobs(selectedListId)
      .then((res) => {
        if (!cancelled && res.success && Array.isArray(res.data)) setListJobs(res.data);
        else if (!cancelled) setListJobs([]);
      })
      .catch(() => { if (!cancelled) setListJobs([]); })
      .finally(() => { if (!cancelled) setLoadingJobs(false); });
    return () => { cancelled = true; };
  }, [selectedListId]);

  const removeJob = async (listId, jobId) => {
    try {
      await apiService.removeJobFromSavedList(listId, jobId);
      setListJobs((prev) => prev.filter((e) => e.jobId !== jobId && e.job?.id !== jobId));
      if (onTotalJobsChange) onTotalJobsChange((prev) => Math.max(0, (prev ?? 0) - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const totalJobs = listJobs.length;
  const selectedList = lists.find((l) => l.id === selectedListId);

  return (
    <div className="space-y-4">
      <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: '1px', borderStyle: 'solid' }}>
        <div className="rounded-full p-1 flex-shrink-0 mt-0.5" style={{ backgroundColor: '#3b82f6' }}>
          <Info className="w-3 h-3" style={{ color: 'white' }} />
        </div>
        <p className="text-xs" style={{ color: '#1e3a8a' }}>
          {language === 'vi' ? 'Các danh sách (playlist) việc làm đã lưu. Chọn một danh sách để xem job.' : 'Your saved job lists. Select a list to view jobs.'}
        </p>
      </div>
      {loadingLists ? (
        <div className="text-center py-6 text-gray-500">Loading...</div>
      ) : lists.length === 0 ? (
        <div className="text-center py-6 space-y-4">
          <p className="text-gray-500">{language === 'vi' ? 'Chưa có danh sách nào.' : 'No saved lists.'}</p>
          <button
            type="button"
            onClick={() => { setNewListNameInput(''); setShowCreateListModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            {language === 'vi' ? 'Tạo danh sách lưu giữ' : 'Create saved list'}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-700">{language === 'vi' ? 'Chọn danh sách:' : 'Select list:'}</p>
              <button
                type="button"
                onClick={() => { setNewListNameInput(''); setShowCreateListModal(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                {language === 'vi' ? 'Tạo danh sách' : 'New list'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {lists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setSelectedListId(selectedListId === list.id ? null : list.id)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    selectedListId === list.id ? 'bg-blue-100 border-blue-400 text-blue-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {list.name}
                </button>
              ))}
            </div>
          </div>
          {selectedListId && (
            <div className="border-t pt-4" style={{ borderColor: '#e5e7eb' }}>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {selectedList?.name} {language === 'vi' ? '— việc làm:' : '— jobs:'}
              </p>
              {loadingJobs ? (
                <div className="text-center py-6 text-gray-500">Loading...</div>
              ) : listJobs.length === 0 ? (
                <div className="text-center py-6 text-gray-500">{language === 'vi' ? 'Chưa có job trong list.' : 'No jobs in this list.'}</div>
              ) : (
                <div className="space-y-3">
                  {listJobs.map((entry) => {
                    const job = entry.job || {};
                    const jobId = job.id ?? entry.jobId;
                    return (
                      <div key={entry.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-2 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">{job.title || '—'}</h3>
                            <div className="text-xs text-gray-600">
                              {job.jobCode && <span>Mã: {job.jobCode}</span>}
                              {job.deadline && <span className="ml-2">Hạn: {job.deadline}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => removeJob(selectedListId, jobId)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-red-200 text-red-600 hover:bg-red-50"
                              aria-label={language === 'vi' ? 'Xóa khỏi danh sách lưu giữ' : 'Remove from saved list'}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{language === 'vi' ? 'Xóa khỏi danh sách lưu giữ' : 'Remove from list'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => window.open(`/agent/jobs?jobId=${jobId}`, '_blank')}
                              onMouseEnter={() => setHoveredJobId(entry.id)}
                              onMouseLeave={() => setHoveredJobId(null)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                              style={{ backgroundColor: hoveredJobId === entry.id ? '#bfdbfe' : '#dbeafe', color: '#1e40af' }}
                            >
                              <Search className="w-4 h-4" />
                              <span>{language === 'vi' ? 'Xem chi tiết' : 'View'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal tạo danh sách mới */}
      {showCreateListModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} onClick={() => !creatingList && setShowCreateListModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {language === 'vi' ? 'Tạo danh sách lưu giữ' : 'Create saved list'}
            </h3>
            <input
              type="text"
              value={newListNameInput}
              onChange={(e) => setNewListNameInput(e.target.value)}
              placeholder={language === 'vi' ? 'Tên danh sách (VD: Việc làm IT yêu thích)' : 'List name'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={creatingList}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => !creatingList && setShowCreateListModal(false)}
                disabled={creatingList}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {language === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={creatingList || !newListNameInput.trim()}
                onClick={async () => {
                  const name = newListNameInput.trim();
                  if (!name || creatingList) return;
                  setCreatingList(true);
                  try {
                    const res = await apiService.createSavedList({ name });
                    if (res.success && res.data?.id) {
                      setShowCreateListModal(false);
                      setNewListNameInput('');
                      setListsRefreshTrigger((t) => t + 1);
                      setSelectedListId(res.data.id);
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setCreatingList(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
              >
                {creatingList ? (language === 'vi' ? 'Đang tạo...' : 'Creating...') : (language === 'vi' ? 'Tạo' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentJobsPageSession1;


