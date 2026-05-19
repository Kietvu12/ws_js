import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';
import { BUSINESS_SECTOR_OPTIONS } from '../../utils/businessSectorOptions';
import {
  JAPAN_REGIONS,
  JAPAN_PREFECTURES,
  fetchJapanCitiesByPrefecture,
  kanaToRomaji,
} from '../../utils/japanLocationData';

/** Giống AgentJobsPageSession1 — không import từ file đó theo yêu cầu */
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

const fieldInputClass =
  'h-10 min-w-0 w-full cursor-pointer rounded-lg border border-white/35 bg-white px-2.5 text-sm text-neutral-900 shadow-sm outline-none focus:border-white focus:ring-2 focus:ring-white/80';
/** Ô lọc trên nền hero (glass, chữ trắng) */
const heroFieldClass =
  'h-9 min-w-0 w-full cursor-pointer rounded-lg border border-white/35 bg-black/25 px-2.5 text-xs text-white shadow-sm backdrop-blur-md placeholder:text-white/45 outline-none transition-[border-color,box-shadow] focus:border-white/55 focus:ring-2 focus:ring-white/20 sm:h-9 sm:text-sm';

const closeLocationModal = (setters) => {
  setters.setShowLocationModal(false);
  setters.setSelectedCountries([]);
  setters.setJapanFilterRegion(null);
  setters.setJapanFilterPrefecture(null);
};

/**
 * Thanh lọc landing: cùng modal / logic với AgentJobsPageSession1 (readonly + nút +).
 * onSearch nhận snapshot giống cách build params trong Session1.handleSearch (CTV).
 * variant="hero": gộp vào hero — glass UI, ẩn nút tìm (dùng ref.submit() từ nút tìm chung).
 */
const LandingJobFilterBarSession1 = forwardRef(function LandingJobFilterBarSession1(
  { barTitle, searchBtnLabel, jpLabels, onSearch, variant = 'default' },
  ref
) {
  const isHero = variant === 'hero';
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;

  const [filters, setFilters] = useState({
    locations: [],
    fieldIds: [],
    jobTypeIds: [],
    sectorNames: [],
  });

  const [japaneseLevel, setJapaneseLevel] = useState('');

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [japanFilterRegion, setJapanFilterRegion] = useState(null);
  const [japanFilterPrefecture, setJapanFilterPrefecture] = useState(null);
  const [japanFilterData, setJapanFilterData] = useState({ flat: [], tree: [] });
  const [japanFilterLoading, setJapanFilterLoading] = useState(false);

  const [showFieldJobTypeModal, setShowFieldJobTypeModal] = useState(false);
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [showJapaneseModal, setShowJapaneseModal] = useState(false);

  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingJobTypes, setLoadingJobTypes] = useState(false);
  const [availableFields, setAvailableFields] = useState([]);
  const [availableJobTypes, setAvailableJobTypes] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);

  useEffect(() => {
    if (showLocationModal) {
      const countries = new Set();
      filters.locations.forEach((loc) => {
        if (loc.country) countries.add(loc.country);
      });
      setSelectedCountries(Array.from(countries));
    }
  }, [showLocationModal]);

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
    fetchJapanCitiesByPrefecture(japanFilterPrefecture)
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

  useEffect(() => {
    if (showFieldJobTypeModal) {
      setSelectedFields(filters.fieldIds);
    }
  }, [showFieldJobTypeModal, filters.fieldIds]);

  const loadCategoryTree = useCallback(async () => {
    try {
      setLoadingFields(true);
      setLoadingJobTypes(true);

      const processTree = (tree) => {
        if (!tree || !Array.isArray(tree)) return;
        setCategoryTree(tree);
        const flattenTree = (categories, level = 0) => {
          let result = [];
          categories.forEach((cat) => {
            result.push({
              ...cat,
              id: String(cat.id),
              level,
              parentId: cat.parentId ? String(cat.parentId) : null,
            });
            if (cat.children && cat.children.length > 0) {
              result = result.concat(flattenTree(cat.children, level + 1));
            }
          });
          return result;
        };
        const allCategories = flattenTree(tree);
        const fields = allCategories.filter((cat) => !cat.parentId);
        const jobTypes = allCategories.filter((cat) => cat.parentId);
        setAvailableFields(
          fields.map((cat) => ({
            id: cat.id,
            name: cat.name,
            nameEn: cat.nameEn,
            nameJp: cat.nameJp,
            level: cat.level,
          }))
        );
        setAvailableJobTypes(
          jobTypes.map((cat) => ({
            id: cat.id,
            name: cat.name,
            nameEn: cat.nameEn,
            nameJp: cat.nameJp,
            parentId: cat.parentId,
            level: cat.level,
          }))
        );
      };

      try {
        const treeResponse = await apiService.getCTVJobCategoryTree();
        if (treeResponse?.success && treeResponse?.data?.tree) {
          processTree(treeResponse.data.tree);
          return;
        }
      } catch (treeError) {
        console.log('Tree API not available, falling back to flat list:', treeError?.message);
      }

      try {
        const response = await apiService.getCTVJobCategories({ status: 1, limit: 500 });
        if (response?.success && response?.data?.categories?.length > 0) {
          const allCategories = response.data.categories.map((cat) => ({
            id: String(cat.id),
            name: cat.name,
            nameEn: cat.nameEn,
            nameJp: cat.nameJp,
            parentId: cat.parentId ? String(cat.parentId) : null,
            order: cat.order ?? 0,
          }));
          const fields = allCategories.filter((cat) => !cat.parentId);
          const jobTypes = allCategories.filter((cat) => cat.parentId);
          setAvailableFields(fields);
          setAvailableJobTypes(jobTypes);
          const buildTree = (list) => {
            const map = {};
            list.forEach((cat) => {
              map[cat.id] = { ...cat, children: [] };
            });
            const roots = [];
            list.forEach((cat) => {
              const node = map[cat.id];
              if (cat.parentId && map[cat.parentId]) {
                map[cat.parentId].children.push(node);
              } else {
                roots.push(node);
              }
            });
            roots.forEach((r) => r.children.sort((a, b) => (a.order || 0) - (b.order || 0)));
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
  }, []);

  useEffect(() => {
    loadCategoryTree();
  }, [loadCategoryTree]);

  const getCategoryAndDescendantIds = (category) => {
    const ids = [String(category.id)];
    if (category.children && category.children.length > 0) {
      category.children.forEach((child) => {
        ids.push(...getCategoryAndDescendantIds(child));
      });
    }
    return ids;
  };

  const getAllDetailIdsUnderField = (fieldInTree) => {
    if (!fieldInTree?.children?.length) return [];
    return fieldInTree.children.flatMap((child) => getCategoryAndDescendantIds(child));
  };

  const selectAllDetailsForField = (ids) => {
    if (!ids.length) return;
    setFilters((prev) => {
      const next = new Set(prev.jobTypeIds.map(String));
      ids.forEach((id) => next.add(String(id)));
      return { ...prev, jobTypeIds: Array.from(next) };
    });
  };

  const deselectAllDetailsForField = (ids) => {
    if (!ids.length) return;
    const toRemove = new Set(ids.map(String));
    setFilters((prev) => ({
      ...prev,
      jobTypeIds: prev.jobTypeIds.filter((id) => !toRemove.has(String(id))),
    }));
  };

  const toggleSelectAllDetailsForField = (ids) => {
    if (!ids.length) return;
    const currentSet = new Set(filters.jobTypeIds.map(String));
    const allSelected = ids.every((id) => currentSet.has(String(id)));
    if (allSelected) deselectAllDetailsForField(ids);
    else selectAllDetailsForField(ids);
  };

  const findAllDescendants = (categoryId, tree = categoryTree) => {
    const result = [];
    const findInTree = (categories, targetId) => {
      for (const cat of categories) {
        if (cat.id === String(targetId) || cat.id === targetId) {
          const addDescendants = (children) => {
            children.forEach((child) => {
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

  const toggleCountry = (country) => {
    setSelectedCountries((prev) => {
      if (prev.includes(country)) {
        const newCountries = prev.filter((c) => c !== country);
        setFilters((prevFilters) => ({
          ...prevFilters,
          locations: prevFilters.locations.filter((loc) => loc.country !== country),
        }));
        return newCountries;
      }
      return [...prev, country];
    });
  };

  const toggleLocation = (location, country) => {
    setFilters((prev) => {
      const existingIndex = prev.locations.findIndex(
        (loc) => loc.country === country && loc.location === location
      );
      if (existingIndex >= 0) {
        return {
          ...prev,
          locations: prev.locations.filter((_, index) => index !== existingIndex),
        };
      }
      return {
        ...prev,
        locations: [...prev.locations, { country, location }],
      };
    });
  };

  const toggleJapanLocationEntry = ({ location, locationJp, jpId }) => {
    setFilters((prev) => {
      const idx = prev.locations.findIndex(
        (l) => l.country === 'Japan' && (jpId ? l.jpId === jpId : l.location === location)
      );
      if (idx >= 0) {
        return { ...prev, locations: prev.locations.filter((_, i) => i !== idx) };
      }
      return {
        ...prev,
        locations: [...prev.locations, { country: 'Japan', location, locationJp, jpId }],
      };
    });
  };

  const applyJapanLocationBulk = (add, locObjs) => {
    setFilters((prev) => {
      const ids = new Set(locObjs.map((l) => l.id));
      let next = [...prev.locations];
      if (add) {
        const have = new Set(next.filter((l) => l.country === 'Japan').map((l) => l.jpId));
        locObjs.forEach((loc) => {
          if (!have.has(loc.id)) {
            next.push({ country: 'Japan', location: loc.alpha, locationJp: loc.ja, jpId: loc.id });
            have.add(loc.id);
          }
        });
      } else {
        next = next.filter((l) => l.country !== 'Japan' || !ids.has(l.jpId));
      }
      return { ...prev, locations: next };
    });
  };

  const getSelectedLocationsDisplay = () => {
    if (filters.locations.length === 0) return '';
    const byCountry = {};
    filters.locations.forEach((loc) => {
      if (!byCountry[loc.country]) {
        byCountry[loc.country] = [];
      }
      const disp =
        loc.country === 'Japan' && language === 'ja' && loc.locationJp ? loc.locationJp : loc.location;
      byCountry[loc.country].push(disp);
    });
    return Object.entries(byCountry)
      .map(([country, locs]) => `${country}: ${locs.join(', ')}`)
      .join('; ');
  };

  const toggleField = (fieldId) => {
    setSelectedFields((prev) => {
      const newFields = prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId];

      setFilters((prevFilters) => {
        const newJobTypeIds = prevFilters.jobTypeIds.filter((jtId) => {
          const jobType = availableJobTypes.find((jt) => jt.id === jtId);
          return jobType && newFields.includes(jobType.parentId);
        });
        return {
          ...prevFilters,
          fieldIds: newFields,
          jobTypeIds: newJobTypeIds,
        };
      });

      return newFields;
    });
  };

  const toggleJobType = (jobTypeId) => {
    setFilters((prev) => {
      const existingIndex = prev.jobTypeIds.findIndex((id) => id === jobTypeId);
      if (existingIndex >= 0) {
        return {
          ...prev,
          jobTypeIds: prev.jobTypeIds.filter((_, index) => index !== existingIndex),
        };
      }
      return {
        ...prev,
        jobTypeIds: [...prev.jobTypeIds, jobTypeId],
      };
    });
  };

  const toggleJobTypeWithDescendants = (category) => {
    const idsToToggle = getCategoryAndDescendantIds(category);
    const anySelected = idsToToggle.some((id) => filters.jobTypeIds.includes(id));

    setFilters((prev) => {
      if (anySelected) {
        const toRemove = new Set(idsToToggle);
        return {
          ...prev,
          jobTypeIds: prev.jobTypeIds.filter((id) => !toRemove.has(id)),
        };
      }
      const toAdd = new Set(idsToToggle);
      const existing = new Set(prev.jobTypeIds);
      toAdd.forEach((id) => existing.add(id));
      return {
        ...prev,
        jobTypeIds: Array.from(existing),
      };
    });
  };

  const getCategoryDisplayName = (cat) => {
    if (!cat) return '';
    if (language === 'vi') return cat.name || '';
    if (language === 'en') return cat.nameEn || cat.name || '';
    return cat.nameJp || cat.nameEn || cat.name || '';
  };

  const getSelectedFieldNames = () =>
    filters.fieldIds
      .map((id) => getCategoryDisplayName(availableFields.find((f) => f.id === id)))
      .filter(Boolean)
      .join(', ');

  const getSelectedJobTypeNames = () =>
    filters.jobTypeIds
      .map((id) => getCategoryDisplayName(availableJobTypes.find((jt) => jt.id === id)))
      .filter(Boolean)
      .join(', ');

  const getSelectedCategoryDisplay = () => {
    const fieldNames = getSelectedFieldNames();
    const jobTypeNames = getSelectedJobTypeNames();
    return [fieldNames, jobTypeNames].filter(Boolean).join(', ');
  };

  const getSelectedSectorNames = () => (filters.sectorNames || []).join(', ');

  const japaneseDisplay = () => {
    if (!japaneseLevel) return '';
    const map = {
      none: jpLabels?.none,
      n5: jpLabels?.n5,
      n4: jpLabels?.n4,
      n3: jpLabels?.n3,
      n2: jpLabels?.n2,
      n1: jpLabels?.n1,
    };
    return map[japaneseLevel] || japaneseLevel;
  };

  const handleSearchClick = useCallback(() => {
    if (onSearch) {
      onSearch({
        filters: { ...filters },
        japaneseLevel,
      });
    }
  }, [filters, japaneseLevel, onSearch]);

  useImperativeHandle(
    ref,
    () => ({
      submit: () => handleSearchClick(),
    }),
    [handleSearchClick]
  );

  const fieldClass = isHero ? heroFieldClass : fieldInputClass;

  const setters = {
    setShowLocationModal,
    setSelectedCountries,
    setJapanFilterRegion,
    setJapanFilterPrefecture,
  };

  return (
    <>
      <style>{`
        .landing-filter-scrollbar::-webkit-scrollbar { width: 8px; }
        .landing-filter-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .landing-filter-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .landing-filter-scrollbar { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; }
      `}</style>

      <div
        className={
          isHero
            ? 'mt-3 w-full max-w-full text-left'
            : 'mb-6 rounded-2xl bg-[#2563eb] px-4 py-4 shadow-md sm:px-5 sm:py-5'
        }
      >
        {!isHero && barTitle ? (
          <h2 className="mb-3 text-base font-bold text-white sm:text-lg">{barTitle}</h2>
        ) : null}
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end xl:flex-nowrap xl:gap-2.5">
          <div className="min-w-0 flex-1 lg:min-w-[160px]">
            <input
              type="text"
              readOnly
              value={getSelectedCategoryDisplay() || ''}
              placeholder={t.agentJobsSelectJobTypePlaceholder}
              className={fieldClass}
              onClick={() => setShowFieldJobTypeModal(true)}
              aria-label={t.agentJobsSelectJobType}
            />
          </div>

          <div className="min-w-0 flex-1 lg:min-w-[160px]">
            <input
              type="text"
              readOnly
              value={getSelectedSectorNames() || ''}
              placeholder={
                language === 'vi'
                  ? 'Chọn lĩnh vực kinh doanh'
                  : language === 'en'
                    ? 'Select business sector'
                    : '業種を選択'
              }
              className={fieldClass}
              onClick={() => setShowSectorModal(true)}
              aria-label={language === 'vi' ? 'Lĩnh vực' : language === 'en' ? 'Sector' : '業種'}
            />
          </div>

          <div className="min-w-0 flex-1 lg:min-w-[140px]">
            <input
              type="text"
              readOnly
              value={japaneseDisplay()}
              placeholder={jpLabels?.any || '—'}
              className={fieldClass}
              onClick={() => setShowJapaneseModal(true)}
              aria-label={jpLabels?.any}
            />
          </div>

          <div className="min-w-0 flex-1 lg:min-w-[160px]">
            <input
              type="text"
              readOnly
              value={getSelectedLocationsDisplay()}
              placeholder={
                language === 'vi'
                  ? 'Chọn địa điểm làm việc'
                  : language === 'en'
                    ? 'Select work location'
                    : '勤務地を選択'
              }
              className={fieldClass}
              onClick={() => setShowLocationModal(true)}
              aria-label={language === 'vi' ? 'Địa điểm' : language === 'en' ? 'Location' : '勤務地'}
            />
          </div>

          {!isHero ? (
            <button
              type="button"
              onClick={handleSearchClick}
              className="h-10 shrink-0 rounded-lg bg-[#0f172a] px-5 text-sm font-semibold text-white transition-colors hover:bg-black"
            >
              {searchBtnLabel}
            </button>
          ) : null}
        </div>
      </div>

      {/* Location modal — giống Session1 */}
      {showLocationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          onClick={() => closeLocationModal(setters)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg shadow-xl lg:flex-row"
            style={{
              backgroundColor: 'white',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex w-full flex-shrink-0 flex-col border-b lg:w-[220px] lg:border-b-0 lg:border-r"
              style={{ borderColor: '#e5e7eb' }}
            >
              <div className="flex items-center justify-between border-b p-4" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-base font-semibold" style={{ color: '#111827' }}>
                  {language === 'vi' ? 'Chọn quốc gia' : language === 'en' ? 'Select Country' : '国を選択'}
                </h3>
                <button
                  type="button"
                  onClick={() => closeLocationModal(setters)}
                  className="rounded p-1 transition-colors hover:bg-gray-100"
                >
                  <X className="h-5 w-5" style={{ color: '#4b5563' }} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {LOCATION_FILTER_COUNTRY_KEYS.map((country) => {
                    const isSelected = selectedCountries.includes(country);
                    return (
                      <label
                        key={country}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCountry(country)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-900">{countryFilterLabel(country, language)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <h3 className="text-base font-semibold text-gray-900">
                  {language === 'vi'
                    ? 'Chọn địa điểm làm việc'
                    : language === 'en'
                      ? 'Select work location'
                      : '勤務地を選択'}
                </h3>
              </div>
              <div className="landing-filter-scrollbar flex-1 overflow-y-auto p-4">
                {selectedCountries.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
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
                        <h4 className="mb-2 text-sm font-medium text-gray-800">
                          {countryFilterLabel('Vietnam', language)}
                        </h4>
                        <p className="mb-2 text-[11px] text-gray-500">
                          {language === 'vi'
                            ? 'Chọn một hoặc nhiều tỉnh/thành'
                            : language === 'en'
                              ? 'Select one or more provinces/cities'
                              : '都道府県・都市を選択'}
                        </p>
                        <div className="landing-filter-scrollbar max-h-[36vh] space-y-0.5 overflow-y-auto rounded-lg border border-gray-100 p-2">
                          {VIETNAM_PROVINCES.map((province) => {
                            const isSelected = filters.locations.some(
                              (l) => l.country === 'Vietnam' && l.location === province
                            );
                            return (
                              <label
                                key={province}
                                className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleLocation(province, 'Vietnam')}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                        <h4 className="mb-1 text-sm font-medium text-gray-800">
                          {countryFilterLabel('Japan', language)}
                        </h4>
                        <p className="mb-2 text-[11px] text-gray-500">
                          {language === 'vi'
                            ? 'Chọn vùng → tỉnh/thành → phường/quận (có thể chọn nhiều)'
                            : language === 'en'
                              ? 'Region → prefecture → city/ward (multi-select)'
                              : '地域 → 都道府県 → 市区町村'}
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div className="flex max-h-[38vh] flex-col overflow-hidden rounded-lg border">
                            <div className="shrink-0 bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700">
                              {language === 'vi' ? 'Vùng' : language === 'en' ? 'Region' : '地域'}
                            </div>
                            <div className="landing-filter-scrollbar flex-1 overflow-y-auto p-1">
                              {JAPAN_REGIONS.map((reg) => (
                                <button
                                  key={reg.id}
                                  type="button"
                                  onClick={() => {
                                    setJapanFilterRegion(reg.id);
                                    setJapanFilterPrefecture(null);
                                  }}
                                  className={`w-full cursor-pointer rounded px-2 py-1.5 text-left text-xs ${
                                    japanFilterRegion === reg.id
                                      ? 'bg-blue-100 font-medium text-blue-800'
                                      : 'text-gray-800 hover:bg-gray-50'
                                  }`}
                                >
                                  {language === 'ja' ? reg.ja : reg.en}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex max-h-[38vh] flex-col overflow-hidden rounded-lg border">
                            <div className="shrink-0 bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700">
                              {language === 'vi' ? 'Tỉnh / thành' : language === 'en' ? 'Prefecture' : '都道府県'}
                            </div>
                            <div className="landing-filter-scrollbar flex-1 overflow-y-auto p-1">
                              {!japanFilterRegion && (
                                <div className="p-2 text-xs text-gray-400">
                                  {language === 'vi'
                                    ? 'Chọn vùng trước'
                                    : language === 'en'
                                      ? 'Select a region'
                                      : '地域を選んでください'}
                                </div>
                              )}
                              {japanFilterRegion &&
                                (JAPAN_REGIONS.find((r) => r.id === japanFilterRegion)?.prefectureCodes || []).map(
                                  (code) => {
                                    const pref = JAPAN_PREFECTURES[code];
                                    if (!pref) return null;
                                    return (
                                      <button
                                        key={code}
                                        type="button"
                                        onClick={() => setJapanFilterPrefecture(code)}
                                        className={`w-full cursor-pointer rounded px-2 py-1.5 text-left text-xs ${
                                          japanFilterPrefecture === code
                                            ? 'bg-blue-100 font-medium text-blue-800'
                                            : 'text-gray-800 hover:bg-gray-50'
                                        }`}
                                      >
                                        {language === 'ja' ? pref.ja : pref.en}
                                      </button>
                                    );
                                  }
                                )}
                            </div>
                          </div>
                          <div className="flex max-h-[38vh] flex-col overflow-hidden rounded-lg border sm:max-h-[42vh]">
                            <div className="shrink-0 bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700">
                              {language === 'vi' ? 'Phường / quận' : language === 'en' ? 'City / ward' : '市区町村'}
                            </div>
                            <div className="landing-filter-scrollbar flex-1 overflow-y-auto p-1">
                              {japanFilterLoading && <div className="p-2 text-xs text-gray-500">Loading…</div>}
                              {!japanFilterLoading &&
                                japanFilterPrefecture &&
                                (() => {
                                  const { tree } = japanFilterData;
                                  const pref = JAPAN_PREFECTURES[japanFilterPrefecture];
                                  const prefJa = pref?.ja || '';
                                  const prefEn = pref?.en || '';
                                  const toR = (kana, fb) => (kana ? kanaToRomaji(kana) : fb);
                                  const makeLoc = (nameJa, nameKana) => {
                                    const ja = `${prefJa} ${nameJa}`.trim();
                                    const alpha = `${prefEn} ${toR(nameKana, nameJa)}`.trim();
                                    const id = `${japanFilterPrefecture}|${nameJa}`;
                                    return { id, ja, alpha };
                                  };
                                  const selectedIds = new Set(
                                    filters.locations
                                      .filter((l) => l.country === 'Japan')
                                      .map((l) => l.jpId || `${l.location}_Japan`)
                                  );
                                  const allLocs = tree.flatMap((c) =>
                                    c.standalone
                                      ? [makeLoc(c.name, c.nameKana)]
                                      : (c.wards || []).map((w) => makeLoc(w.fullName, w.fullNameKana))
                                  );
                                  if (allLocs.length === 0) {
                                    return (
                                      <div className="p-2 text-xs text-gray-400">
                                        {language === 'vi'
                                          ? 'Không có dữ liệu'
                                          : language === 'en'
                                            ? 'No data'
                                            : 'データがありません'}
                                      </div>
                                    );
                                  }
                                  const allOn = allLocs.length > 0 && allLocs.every((loc) => selectedIds.has(loc.id));
                                  return (
                                    <>
                                      <label className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-gray-50">
                                        <input
                                          type="checkbox"
                                          checked={allOn}
                                          onChange={(e) => applyJapanLocationBulk(e.target.checked, allLocs)}
                                          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                                        />
                                        <span className="text-xs font-medium">
                                          {language === 'vi' ? 'Tất cả' : language === 'en' ? 'All' : 'すべて'}
                                        </span>
                                      </label>
                                      {tree.map((city) => {
                                        const cityLocs = city.standalone
                                          ? [makeLoc(city.name, city.nameKana)]
                                          : (city.wards || []).map((w) => makeLoc(w.fullName, w.fullNameKana));
                                        const cityOn =
                                          cityLocs.length > 0 && cityLocs.every((l) => selectedIds.has(l.id));
                                        return (
                                          <div key={city.name}>
                                            <label className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-gray-50">
                                              <input
                                                type="checkbox"
                                                checked={cityOn}
                                                onChange={(e) => applyJapanLocationBulk(e.target.checked, cityLocs)}
                                                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                                              />
                                              <span className="text-xs font-medium text-gray-800">
                                                {language === 'ja' ? city.name : toR(city.nameKana, city.name)}
                                              </span>
                                            </label>
                                            {city.wards && city.wards.length > 0 && (
                                              <div className="ml-3 border-l border-gray-200 pl-2">
                                                {city.wards.map((w) => {
                                                  const loc = makeLoc(w.fullName, w.fullNameKana);
                                                  const on = selectedIds.has(loc.id);
                                                  return (
                                                    <label
                                                      key={w.fullName}
                                                      className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-gray-50"
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
                                                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                                                      />
                                                      <span className="text-xs text-gray-700">
                                                        {language === 'ja'
                                                          ? w.fullName
                                                          : toR(w.fullNameKana, w.fullName)}
                                                      </span>
                                                    </label>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </>
                                  );
                                })()}
                              {!japanFilterLoading && japanFilterRegion && !japanFilterPrefecture && (
                                <div className="p-2 text-xs text-gray-400">
                                  {language === 'vi'
                                    ? 'Chọn tỉnh/thành'
                                    : language === 'en'
                                      ? 'Select prefecture'
                                      : '都道府県を選んでください'}
                                </div>
                              )}
                              {!japanFilterLoading && !japanFilterRegion && (
                                <div className="p-2 text-xs text-gray-400">
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
              <div className="border-t p-4" style={{ borderColor: '#e5e7eb' }}>
                <button
                  type="button"
                  onClick={() => closeLocationModal(setters)}
                  className="w-full rounded-lg bg-[#2563eb] py-2 px-4 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {language === 'vi' ? 'Xác nhận' : language === 'en' ? 'Confirm' : '確認'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Field + job type modal — giống Session1 */}
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
            className="flex max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex w-1/2 flex-col border-r border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <h3 className="text-base font-semibold text-gray-900">{t.agentJobsSelectJobType}</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowFieldJobTypeModal(false);
                    setSelectedFields([]);
                  }}
                  className="rounded p-1 transition-colors hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              <div className="landing-filter-scrollbar flex-1 overflow-y-auto p-4">
                {loadingFields ? (
                  <div className="py-8 text-center text-sm text-gray-500">{t.loading}</div>
                ) : (
                  <div className="space-y-1">
                    {categoryTree.length > 0 ? (
                      categoryTree
                        .filter((cat) => !cat.parentId)
                        .map((cat) => {
                          const catId = String(cat.id);
                          const isSelected = selectedFields.includes(catId);
                          return (
                            <label
                              key={catId}
                              className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleField(catId)}
                                className="h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="flex-1 text-xs text-gray-900">{getCategoryDisplayName(cat)}</span>
                            </label>
                          );
                        })
                    ) : (
                      availableFields
                        .filter((field) => !field.parentId)
                        .map((field) => {
                          const isSelected = selectedFields.includes(field.id);
                          return (
                            <label
                              key={field.id}
                              className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleField(field.id)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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

            <div className="flex w-1/2 flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <h3 className="text-base font-semibold text-gray-900">{t.agentJobsDetails}</h3>
              </div>
              <div className="landing-filter-scrollbar flex-1 overflow-y-auto p-4">
                {loadingJobTypes ? (
                  <div className="py-8 text-center text-sm text-gray-500">{t.loading}</div>
                ) : selectedFields.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">{t.agentJobsSelectJobTypeFirst}</div>
                ) : (
                  <div className="space-y-4">
                    {selectedFields.map((fieldId) => {
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
                      const field =
                        availableFields.find((f) => f.id === fieldId) ||
                        (fieldInTree
                          ? {
                              id: String(fieldInTree.id),
                              name: fieldInTree.name,
                              nameEn: fieldInTree.nameEn,
                              nameJp: fieldInTree.nameJp,
                            }
                          : null);

                      if (!field && !fieldInTree) return null;

                      const renderNestedJobTypes = (category, level = 0) => {
                        if (!category.children || category.children.length === 0) return null;
                        return (
                          <div className="space-y-1">
                            {category.children.map((child) => {
                              const childId = String(child.id);
                              const hasChildren = child.children && child.children.length > 0;
                              const idsInGroup = hasChildren ? getCategoryAndDescendantIds(child) : [childId];
                              const isSelected = hasChildren
                                ? idsInGroup.some((id) => filters.jobTypeIds.includes(id))
                                : filters.jobTypeIds.includes(childId);

                              return (
                                <div key={childId}>
                                  <label
                                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                                    style={{ paddingLeft: `${level * 20}px` }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() =>
                                        hasChildren ? toggleJobTypeWithDescendants(child) : toggleJobType(childId)
                                      }
                                      className="h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="flex-1 text-xs text-gray-900">
                                      {level > 0 && <span className="mr-1 text-gray-400">└─</span>}
                                      {getCategoryDisplayName(child)}
                                    </span>
                                  </label>
                                  {hasChildren && <div>{renderNestedJobTypes(child, level + 1)}</div>}
                                </div>
                              );
                            })}
                          </div>
                        );
                      };

                      if (fieldInTree && fieldInTree.children && fieldInTree.children.length > 0) {
                        const detailIdsForField = getAllDetailIdsUnderField(fieldInTree);
                        const allChecked =
                          detailIdsForField.length > 0 &&
                          detailIdsForField.every((id) => filters.jobTypeIds.map(String).includes(String(id)));
                        const someChecked =
                          detailIdsForField.length > 0 &&
                          detailIdsForField.some((id) => filters.jobTypeIds.map(String).includes(String(id)));
                        return (
                          <div key={fieldId} className="space-y-2">
                            <label className="mb-2 flex cursor-pointer items-center gap-2 border-b border-gray-200 pb-2">
                              {detailIdsForField.length > 0 && (
                                <input
                                  type="checkbox"
                                  checked={allChecked}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someChecked && !allChecked;
                                  }}
                                  onChange={() => toggleSelectAllDetailsForField(detailIdsForField)}
                                  className="h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              )}
                              <h4 className="text-sm font-medium text-gray-700">
                                {getCategoryDisplayName(fieldInTree)}
                              </h4>
                              {detailIdsForField.length > 0 && (
                                <span className="text-xs text-gray-500">({t.selectAll})</span>
                              )}
                            </label>
                            {renderNestedJobTypes(fieldInTree, 0)}
                          </div>
                        );
                      }

                      const allDescendantIds = findAllDescendants(fieldId);
                      const directChildren = availableJobTypes.filter((jt) => jt.parentId === fieldId);
                      const allJobTypesForField = [
                        ...directChildren,
                        ...availableJobTypes.filter(
                          (jt) => allDescendantIds.includes(jt.id) && jt.parentId !== fieldId
                        ),
                      ];
                      const uniqueJobTypes = Array.from(
                        new Map(allJobTypesForField.map((jt) => [jt.id, jt])).values()
                      );
                      const detailIdsFlat = uniqueJobTypes.map((jt) => jt.id);
                      const allCheckedFlat =
                        detailIdsFlat.length > 0 &&
                        detailIdsFlat.every((id) => filters.jobTypeIds.map(String).includes(String(id)));
                      const someCheckedFlat =
                        detailIdsFlat.length > 0 &&
                        detailIdsFlat.some((id) => filters.jobTypeIds.map(String).includes(String(id)));
                      return (
                        <div key={fieldId} className="space-y-2">
                          <label className="mb-2 flex cursor-pointer items-center gap-2 border-b border-gray-200 pb-2">
                            {detailIdsFlat.length > 0 && (
                              <input
                                type="checkbox"
                                checked={allCheckedFlat}
                                ref={(el) => {
                                  if (el) el.indeterminate = someCheckedFlat && !allCheckedFlat;
                                }}
                                onChange={() => toggleSelectAllDetailsForField(detailIdsFlat)}
                                className="h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            )}
                            <h4 className="text-sm font-medium text-gray-700">
                              {getCategoryDisplayName(field || fieldInTree)}
                            </h4>
                            {detailIdsFlat.length > 0 && (
                              <span className="text-xs text-gray-500">({t.selectAll})</span>
                            )}
                          </label>
                          <div className="space-y-1">
                            {uniqueJobTypes.map((jobType) => {
                              const isSelected = filters.jobTypeIds.includes(jobType.id);
                              return (
                                <label
                                  key={jobType.id}
                                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleJobType(jobType.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
              <div className="border-t p-4" style={{ borderColor: '#e5e7eb' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowFieldJobTypeModal(false);
                    setSelectedFields([]);
                  }}
                  className="w-full rounded-lg bg-[#2563eb] py-2 px-4 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {language === 'vi' ? 'Xác nhận' : language === 'en' ? 'Confirm' : '確認'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sector modal — giống Session1 */}
      {showSectorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          onClick={() => setShowSectorModal(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900">
                {language === 'vi'
                  ? 'Chọn lĩnh vực kinh doanh'
                  : language === 'en'
                    ? 'Select business sector'
                    : '業種を選択'}
              </h3>
              <button
                type="button"
                onClick={() => setShowSectorModal(false)}
                className="rounded p-1 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="landing-filter-scrollbar flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {BUSINESS_SECTOR_OPTIONS.map((option) => {
                  const value = option.vi;
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
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setFilters((prev) => {
                            const current = prev.sectorNames || [];
                            if (current.includes(value)) {
                              return { ...prev, sectorNames: current.filter((s) => s !== value) };
                            }
                            return { ...prev, sectorNames: [...current, value] };
                          });
                        }}
                        className="h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1 text-xs text-gray-900">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="border-t p-4" style={{ borderColor: '#e5e7eb' }}>
              <button
                type="button"
                onClick={() => setShowSectorModal(false)}
                className="w-full rounded-lg bg-[#2563eb] py-2 px-4 font-medium text-white transition-colors hover:bg-blue-700"
              >
                {language === 'vi' ? 'Xác nhận' : language === 'en' ? 'Confirm' : '確認'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trình độ tiếng — modal chọn một mức (lọc client phía landing) */}
      {showJapaneseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          onClick={() => setShowJapaneseModal(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900">
                {language === 'vi'
                  ? 'Trình độ tiếng Nhật'
                  : language === 'en'
                    ? 'Japanese level'
                    : '日本語レベル'}
              </h3>
              <button
                type="button"
                onClick={() => setShowJapaneseModal(false)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <div className="space-y-1">
                {[
                  { id: '', label: jpLabels?.any },
                  { id: 'none', label: jpLabels?.none },
                  { id: 'n5', label: jpLabels?.n5 },
                  { id: 'n4', label: jpLabels?.n4 },
                  { id: 'n3', label: jpLabels?.n3 },
                  { id: 'n2', label: jpLabels?.n2 },
                  { id: 'n1', label: jpLabels?.n1 },
                ].map((opt) => (
                  <button
                    key={opt.id || 'any'}
                    type="button"
                    onClick={() => {
                      setJapaneseLevel(opt.id);
                      setShowJapaneseModal(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left text-xs transition-colors hover:bg-gray-50 ${
                      japaneseLevel === opt.id ? 'bg-blue-50 font-medium text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        japaneseLevel === opt.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}
                    >
                      {japaneseLevel === opt.id ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t p-4" style={{ borderColor: '#e5e7eb' }}>
              <button
                type="button"
                onClick={() => setShowJapaneseModal(false)}
                className="w-full rounded-lg bg-[#2563eb] py-2 px-4 font-medium text-white hover:bg-blue-700"
              >
                {language === 'vi' ? 'Xác nhận' : language === 'en' ? 'Confirm' : '確認'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default LandingJobFilterBarSession1;
