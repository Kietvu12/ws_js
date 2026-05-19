import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Tag,
  Eye,
  EyeOff,
  ArrowUpDown,
  Copy,
  MoreVertical,
  X,
} from 'lucide-react';

const pickByLanguage = (viText, enText, jpText, lang) => {
  if (lang === 'en') {
    return enText || viText || jpText || '';
  }
  if (lang === 'ja') {
    return jpText || enText || viText || '';
  }
  return viText || enText || jpText || '';
};

const JobCategoriesPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  const [selectedStatus, setSelectedStatus] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddParentId, setQuickAddParentId] = useState(null);
  const [quickAddFormData, setQuickAddFormData] = useState({
    name: '',
    slug: '',
    description: '',
    order: 0,
    status: 1,
  });
  
  // Hover states
  const [hoveredAddCategoryButton, setHoveredAddCategoryButton] = useState(false);
  const [hoveredRefreshButton, setHoveredRefreshButton] = useState(false);
  const [hoveredCategoryItemIndex, setHoveredCategoryItemIndex] = useState(null);
  const [hoveredExpandButtonIndex, setHoveredExpandButtonIndex] = useState(null);
  const [hoveredQuickAddButtonIndex, setHoveredQuickAddButtonIndex] = useState(null);
  const [hoveredToggleStatusButtonIndex, setHoveredToggleStatusButtonIndex] = useState(null);
  const [hoveredDuplicateButtonIndex, setHoveredDuplicateButtonIndex] = useState(null);
  const [hoveredEditButtonIndex, setHoveredEditButtonIndex] = useState(null);
  const [hoveredDeleteButtonIndex, setHoveredDeleteButtonIndex] = useState(null);
  const [hoveredCloseModalButton, setHoveredCloseModalButton] = useState(false);
  const [hoveredCancelModalButton, setHoveredCancelModalButton] = useState(false);
  const [hoveredSubmitModalButton, setHoveredSubmitModalButton] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  useEffect(() => {
    // Header search sync via query string `?search=...`
    setSearchQuery(headerSearch);
  }, [headerSearch]);

  useEffect(() => {
    loadCategories();
  }, [selectedStatus]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 1000, // Load all for tree view
        sortBy: 'order',
        sortOrder: 'ASC'
      };

      if (selectedStatus !== '') {
        params.status = selectedStatus;
      }

      const response = await apiService.getJobCategoryTree();
      if (response.success && response.data) {
        setCategories(response.data.tree || []);
        // Auto-expand all categories
        const allIds = [];
        const collectIds = (cats) => {
          cats.forEach(cat => {
            allIds.push(cat.id);
            if (cat.children && cat.children.length > 0) {
              collectIds(cat.children);
            }
          });
        };
        collectIds(response.data.tree || []);
        setExpandedCategories(new Set(allIds));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      alert(t.jobCategoriesLoadingError);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(t.jobCategoriesDeleteConfirm.replace('{name}', name))) {
      return;
    }

    try {
      const response = await apiService.deleteJobCategory(id);
      if (response.success) {
        alert(response.message || t.jobCategoriesDeleteSuccess);
        loadCategories();
      } else {
        alert(response.message || t.jobCategoriesDeleteError);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.message || t.jobCategoriesDeleteError);
    }
  };

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleStatus = async (category) => {
    try {
      const newStatus = category.status === 1 ? 0 : 1;
      const response = await apiService.updateJobCategory(category.id, {
        ...category,
        status: newStatus
      });
      if (response.success) {
        alert(response.message || t.jobCategoriesToggleStatusSuccess);
        loadCategories();
      } else {
        alert(response.message || t.jobCategoriesToggleStatusError);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.message || t.jobCategoriesToggleStatusError);
    }
  };

  const handleQuickAdd = (parentId) => {
    setQuickAddParentId(parentId);
    setQuickAddFormData({
      name: '',
      slug: '',
      description: '',
      order: 0,
      status: 1,
    });
    setShowQuickAddModal(true);
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    
    if (!quickAddFormData.name || !quickAddFormData.name.trim()) {
      alert(t.jobCategoriesQuickAddNameRequired);
      return;
    }

    try {
      const requestData = {
        name: quickAddFormData.name.trim(),
        slug: quickAddFormData.slug.trim() || generateSlug(quickAddFormData.name),
        description: quickAddFormData.description || null,
        parentId: quickAddParentId,
        order: quickAddFormData.order || 0,
        status: quickAddFormData.status,
      };

      const response = await apiService.createJobCategory(requestData);
      if (response.success) {
        alert(response.message || t.jobCategoriesQuickAddSuccess);
        setShowQuickAddModal(false);
        setQuickAddParentId(null);
        loadCategories();
        // Auto-expand parent
        if (quickAddParentId) {
          setExpandedCategories(prev => new Set([...prev, quickAddParentId]));
        }
      } else {
        alert(response.message || t.jobCategoriesQuickAddError);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert(error.message || t.jobCategoriesQuickAddError);
    }
  };

  const handleDuplicate = async (category) => {
    if (!window.confirm(t.jobCategoriesDuplicateConfirm.replace('{name}', category.name))) {
      return;
    }

    try {
      const requestData = {
        name: `${category.name} (Copy)`,
        slug: `${category.slug}-copy`,
        description: category.description || null,
        parentId: category.parentId,
        order: category.order || 0,
        status: category.status,
      };

      const response = await apiService.createJobCategory(requestData);
      if (response.success) {
        alert(response.message || t.jobCategoriesDuplicateSuccess);
        loadCategories();
      } else {
        alert(response.message || t.jobCategoriesDuplicateError);
      }
    } catch (error) {
      console.error('Error duplicating category:', error);
      alert(error.message || t.jobCategoriesDuplicateError);
    }
  };

  const filterCategories = (cats) => {
    if (!searchQuery) return cats;
    
    const query = searchQuery.toLowerCase();
    return cats.filter(cat => {
      const displayName = pickByLanguage(
        cat.name,
        cat.nameEn || cat.name_en,
        cat.nameJp || cat.name_jp,
        language
      );
      const matches =
        displayName.toLowerCase().includes(query) ||
        (cat.slug || '').toLowerCase().includes(query);
      const children = cat.children ? filterCategories(cat.children) : [];
      if (children.length > 0) {
        return { ...cat, children };
      }
      return matches;
    }).map(cat => {
      if (cat.children && cat.children.length > 0) {
        return { ...cat, children: filterCategories(cat.children) };
      }
      return cat;
    });
  };

  const renderCategory = (category, level = 0, index = null) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const isParent = !category.parentId; // Loại công việc
    const isChild = category.parentId; // Lĩnh vực

    const filteredChildren = category.children ? filterCategories(category.children) : [];
    const uniqueKey = `${category.id}-${level}-${index}`;

    const displayName = pickByLanguage(
      category.name,
      category.nameEn || category.name_en,
      category.nameJp || category.name_jp,
      language
    );
    const displayDescription = pickByLanguage(
      category.description,
      category.descriptionEn || category.description_en,
      category.descriptionJp || category.description_jp,
      language
    );

    return (
      <div key={category.id} className="mb-1">
        <div
          className="flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2 p-2.5 sm:p-3 rounded-lg border transition-colors"
          style={{
            paddingLeft: `${level * 16 + 10}px`,
            borderColor: selectedCategory?.id === category.id ? '#93c5fd' : '#e5e7eb',
            backgroundColor: selectedCategory?.id === category.id
              ? '#eff6ff'
              : (hoveredCategoryItemIndex === uniqueKey ? '#f9fafb' : 'transparent')
          }}
          onMouseEnter={() => setHoveredCategoryItemIndex(uniqueKey)}
          onMouseLeave={() => setHoveredCategoryItemIndex(null)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              onMouseEnter={() => setHoveredExpandButtonIndex(uniqueKey)}
              onMouseLeave={() => setHoveredExpandButtonIndex(null)}
              className="p-1 rounded transition-colors"
              style={{
                backgroundColor: hoveredExpandButtonIndex === uniqueKey ? '#e5e7eb' : 'transparent'
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" style={{ color: '#4b5563' }} />
              ) : (
                <ChevronRight className="w-4 h-4" style={{ color: '#4b5563' }} />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Icon */}
          {isParent ? (
            <FolderOpen className="w-5 h-5" style={{ color: '#2563eb' }} />
          ) : (
            <Tag className="w-4 h-4 ml-1" style={{ color: '#16a34a' }} />
          )}

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[13px] sm:text-sm truncate" style={{ color: '#111827' }}>
                {displayName}
              </span>
              {isParent && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                  {t.jobCategoriesParentBadge}
                </span>
              )}
              {isChild && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                 {t.jobCategoriesChildBadge}
                </span>
              )}
              {category.status === 0 && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded" style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                  {t.jobCategoriesHiddenBadge}
                </span>
              )}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              {t.jobCategoriesMetaLine
                .replace('{slug}', category.slug || '')
                .replace('{order}', category.order ?? 0)
                .replace('{jobsCount}', category.jobsCount ?? 0)}
            </div>
            {displayDescription && (
              <div className="text-xs mt-1 line-clamp-1" style={{ color: '#4b5563' }}>
                {displayDescription}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* Quick Add Child Button */}
            <button
              onClick={() => handleQuickAdd(category.id)}
              onMouseEnter={() => setHoveredQuickAddButtonIndex(uniqueKey)}
              onMouseLeave={() => setHoveredQuickAddButtonIndex(null)}
              className="p-1.5 sm:p-2 rounded transition-colors"
              style={{
                backgroundColor: hoveredQuickAddButtonIndex === uniqueKey ? '#dcfce7' : 'transparent'
              }}
              title={t.jobCategoriesQuickAddButtonTooltip}
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#16a34a' }} />
            </button>
            <button
              onClick={() => toggleStatus(category)}
              onMouseEnter={() => setHoveredToggleStatusButtonIndex(uniqueKey)}
              onMouseLeave={() => setHoveredToggleStatusButtonIndex(null)}
              className="p-1.5 sm:p-2 rounded transition-colors"
              style={{
                backgroundColor: hoveredToggleStatusButtonIndex === uniqueKey ? '#e5e7eb' : 'transparent'
              }}
              title={
                category.status === 1
                  ? t.jobCategoriesToggleStatusHideTooltip
                  : t.jobCategoriesToggleStatusShowTooltip
              }
            >
              {category.status === 1 ? (
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#4b5563' }} />
              ) : (
                <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#9ca3af' }} />
              )}
            </button>
            <button
              onClick={() => handleDuplicate(category)}
              onMouseEnter={() => setHoveredDuplicateButtonIndex(uniqueKey)}
              onMouseLeave={() => setHoveredDuplicateButtonIndex(null)}
              className="p-1.5 sm:p-2 rounded transition-colors"
              style={{
                backgroundColor: hoveredDuplicateButtonIndex === uniqueKey ? '#f3e8ff' : 'transparent'
              }}
              title={t.jobCategoriesDuplicateTooltip}
            >
              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#9333ea' }} />
            </button>
            <button
              onClick={() => navigate(`/admin/job-categories/${category.id}/edit`)}
              onMouseEnter={() => setHoveredEditButtonIndex(uniqueKey)}
              onMouseLeave={() => setHoveredEditButtonIndex(null)}
              className="p-1.5 sm:p-2 rounded transition-colors"
              style={{
                backgroundColor: hoveredEditButtonIndex === uniqueKey ? '#dbeafe' : 'transparent'
              }}
              title={t.jobCategoriesEditTooltip}
            >
              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#2563eb' }} />
            </button>
            <button
              onClick={() => handleDelete(category.id, category.name)}
              onMouseEnter={() => setHoveredDeleteButtonIndex(uniqueKey)}
              onMouseLeave={() => setHoveredDeleteButtonIndex(null)}
              className="p-1.5 sm:p-2 rounded transition-colors"
              style={{
                backgroundColor: hoveredDeleteButtonIndex === uniqueKey ? '#fee2e2' : 'transparent'
              }}
              title={t.jobCategoriesDeleteTooltip}
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#dc2626' }} />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {filteredChildren.map((child, childIndex) => renderCategory(child, level + 1, `${index}-${childIndex}`))}
          </div>
        )}
      </div>
    );
  };

  const filteredCategories = filterCategories(categories);

  return (
    <div className="space-y-4">
      {/* Filter section — UI giống CollaboratorsPage, chiều ngang bằng nội dung bên dưới */}
      <div className="py-1.5 mb-1.5 flex-shrink-0">
        <div className="flex w-full items-center gap-2.5 flex-wrap justify-between">
          {/* Search box (pill, không border) */}
          <div className="flex min-w-0 items-center px-3 py-1.5 rounded-full bg-white text-[11px] sm:text-[13px] sm:min-w-[220px] flex-1">
            <Search className="w-3.5 h-3.5 mr-2 shrink-0" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              placeholder={t.jobCategoriesSearchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none text-[11px] sm:text-[13px]"
              style={{ border: 'none' }}
            />
          </div>
          <button
            onClick={() => navigate('/admin/job-categories/add')}
            onMouseEnter={() => setHoveredAddCategoryButton(true)}
            onMouseLeave={() => setHoveredAddCategoryButton(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full sm:hidden"
            style={{
              backgroundColor: hoveredAddCategoryButton ? '#b91c1c' : '#dc2626',
              color: 'white'
            }}
            aria-label={t.jobCategoriesAddButton}
            title={t.jobCategoriesAddButton}
          >
            <Plus className="w-3 h-3" />
          </button>

          {/* Pills + nút bên phải */}
          <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:flex-wrap sm:justify-end sm:gap-2.5 sm:overflow-visible sm:pb-0">
            {/* Status pill với dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStatusFilterOpen((v) => !v)}
                className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[10px] sm:text-xs font-semibold whitespace-nowrap"
                style={{ color: '#374151' }}
              >
                {t.jobCategoriesStatusLabel}
                <ChevronDown className="w-3 h-3" />
              </button>
              {isStatusFilterOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white p-3 z-20 text-[11px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="job-cat-status"
                        value=""
                        checked={selectedStatus === ''}
                        onChange={(e) => { setSelectedStatus(e.target.value); setIsStatusFilterOpen(false); }}
                        className="w-3.5 h-3.5"
                      />
                      <span>{t.jobCategoriesStatusAll}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="job-cat-status"
                        value="1"
                        checked={selectedStatus === '1'}
                        onChange={(e) => { setSelectedStatus(e.target.value); setIsStatusFilterOpen(false); }}
                        className="w-3.5 h-3.5"
                      />
                      <span>{t.jobCategoriesStatusActive}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="job-cat-status"
                        value="0"
                        checked={selectedStatus === '0'}
                        onChange={(e) => { setSelectedStatus(e.target.value); setIsStatusFilterOpen(false); }}
                        className="w-3.5 h-3.5"
                      />
                      <span>{t.jobCategoriesStatusHidden}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Nút Làm mới */}
            <button
              onClick={loadCategories}
              onMouseEnter={() => setHoveredRefreshButton(true)}
              onMouseLeave={() => setHoveredRefreshButton(false)}
              className="flex shrink-0 items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap"
              style={{
                backgroundColor: hoveredRefreshButton ? '#e5e7eb' : '#f3f4f6',
                color: '#374151'
              }}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="sm:hidden">Làm mới</span>
              <span className="hidden sm:inline">{t.jobCategoriesRefresh}</span>
            </button>

            {/* Nút Thêm danh mục */}
            <button
              onClick={() => navigate('/admin/job-categories/add')}
              onMouseEnter={() => setHoveredAddCategoryButton(true)}
              onMouseLeave={() => setHoveredAddCategoryButton(false)}
              className="hidden sm:inline-flex px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold items-center gap-1.5"
              style={{
                backgroundColor: hoveredAddCategoryButton ? '#b91c1c' : '#dc2626',
                color: 'white'
              }}
            >
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">{t.jobCategoriesAddButton}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="rounded-lg border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2563eb' }}></div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: '#6b7280' }}>
            {searchQuery ? t.jobCategoriesEmptySearch : t.jobCategoriesEmpty}
          </div>
        ) : (
          <div className="p-4">
            {filteredCategories.map((category, index) => renderCategory(category, 0, index))}
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      {showQuickAddModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowQuickAddModal(false)}
        >
          <div 
            className="rounded-lg shadow-xl w-full max-w-md p-6"
            style={{ backgroundColor: 'white' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#111827' }}>
                Thêm category con nhanh
              </h3>
              <button
                onClick={() => setShowQuickAddModal(false)}
                onMouseEnter={() => setHoveredCloseModalButton(true)}
                onMouseLeave={() => setHoveredCloseModalButton(false)}
                className="p-1 rounded transition-colors"
                style={{
                  backgroundColor: hoveredCloseModalButton ? '#f3f4f6' : 'transparent'
                }}
              >
                <X className="w-5 h-5" style={{ color: '#4b5563' }} />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  Tên danh mục <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={quickAddFormData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setQuickAddFormData(prev => ({
                      ...prev,
                      name,
                      slug: prev.slug || generateSlug(name)
                    }));
                  }}
                  placeholder="VD: Software Development"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-xs"
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
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  Slug <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={quickAddFormData.slug}
                  onChange={(e) => setQuickAddFormData(prev => ({
                    ...prev,
                    slug: e.target.value
                  }))}
                  placeholder="VD: software-development"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-xs"
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

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  Mô tả
                </label>
                <textarea
                  value={quickAddFormData.description}
                  onChange={(e) => setQuickAddFormData(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder="Mô tả về danh mục..."
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    Thứ tự
                  </label>
                  <input
                    type="number"
                    value={quickAddFormData.order}
                    onChange={(e) => setQuickAddFormData(prev => ({
                      ...prev,
                      order: parseInt(e.target.value) || 0
                    }))}
                    min="0"
                    className="w-full px-3 py-2 border rounded-lg text-xs"
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

                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    Trạng thái
                  </label>
                  <select
                    value={quickAddFormData.status}
                    onChange={(e) => setQuickAddFormData(prev => ({
                      ...prev,
                      status: parseInt(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
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
                    <option value="1">Đang hoạt động</option>
                    <option value="0">Ẩn</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  onMouseEnter={() => setHoveredCancelModalButton(true)}
                  onMouseLeave={() => setHoveredCancelModalButton(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: hoveredCancelModalButton ? '#e5e7eb' : '#f3f4f6',
                    color: '#374151'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  onMouseEnter={() => setHoveredSubmitModalButton(true)}
                  onMouseLeave={() => setHoveredSubmitModalButton(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: hoveredSubmitModalButton ? '#1d4ed8' : '#2563eb',
                    color: 'white'
                  }}
                >
                  Tạo nhanh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobCategoriesPage;

