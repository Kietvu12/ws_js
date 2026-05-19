import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import {
  ArrowLeft,
  Save,
  X,
  Folder,
  Tag,
  Plus,
  Trash2,
} from 'lucide-react';

const AddJobCategoryPage = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    nameJp: '',
    slug: '',
    description: '',
    descriptionEn: '',
    descriptionJp: '',
    parentId: null,
    order: 0,
    status: 1,
  });
  const [parentCategories, setParentCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [childCategories, setChildCategories] = useState([]); // Array of child categories to create
  const [showAddChildren, setShowAddChildren] = useState(false);
  
  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);
  const [hoveredAddChildrenButton, setHoveredAddChildrenButton] = useState(false);
  const [hoveredRemoveChildCategoryButtonIndex, setHoveredRemoveChildCategoryButtonIndex] = useState(null);
  const [hoveredAddChildCategoryButton, setHoveredAddChildCategoryButton] = useState(false);

  // Helper function to find category and all its descendants in tree
  const findCategoryAndDescendants = (categoryId, tree) => {
    const result = new Set();
    
    const findInTree = (cats, targetId) => {
      for (const cat of cats) {
        if (cat.id === targetId) {
          result.add(cat.id);
          // Add all descendants
          if (cat.children && cat.children.length > 0) {
            const addDescendants = (children) => {
              children.forEach(child => {
                result.add(child.id);
                if (child.children && child.children.length > 0) {
                  addDescendants(child.children);
                }
              });
            };
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

  useEffect(() => {
    loadParentCategories();
    if (categoryId) {
      loadCategoryData();
    }
  }, [categoryId]);

  const loadParentCategories = async () => {
    try {
      const response = await apiService.getJobCategoryTree();
      if (response.success && response.data) {
        // Flatten tree to get ALL categories (support nested categories)
        const flattenAllCategories = (cats, level = 0, parentPath = '') => {
          let result = [];
          cats.forEach(cat => {
            const currentPath = parentPath ? `${parentPath} > ${cat.name}` : cat.name;
            // Add current category with level info
            result.push({
              ...cat,
              level: level,
              displayName: '├─ '.repeat(level) + cat.name,
              fullPath: currentPath
            });
            // Recursively add children
            if (cat.children && cat.children.length > 0) {
              result = result.concat(flattenAllCategories(cat.children, level + 1, currentPath));
            }
          });
          return result;
        };
        const allCategories = flattenAllCategories(response.data.tree || []);
        // Exclude current category if editing (and its descendants to prevent circular reference)
        const filtered = categoryId 
          ? (() => {
              const currentId = parseInt(categoryId);
              const excludedIds = findCategoryAndDescendants(currentId, response.data.tree || []);
              return allCategories.filter(cat => !excludedIds.has(cat.id));
            })()
          : allCategories;
        setParentCategories(filtered);
      }
    } catch (error) {
      console.error('Error loading parent categories:', error);
    }
  };

  const loadCategoryData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getJobCategoryById(categoryId);
      if (response.success && response.data?.category) {
        const category = response.data.category;
        setFormData({
          name: category.name || '',
          nameEn: category.nameEn || category.name_en || '',
          nameJp: category.nameJp || category.name_jp || '',
          slug: category.slug || '',
          description: category.description || '',
          descriptionEn: category.descriptionEn || category.description_en || '',
          descriptionJp: category.descriptionJp || category.description_jp || '',
          parentId: category.parentId || null,
          order: category.order || 0,
          status: category.status !== undefined ? category.status : 1,
        });
      }
    } catch (error) {
      console.error('Error loading category data:', error);
      alert(t.jobCategoryLoadError);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
      };
      
      // Auto-generate slug from name
      if (name === 'name' && value) {
        newData.slug = generateSlug(value);
      }
      
      return newData;
    });
    
    // Clear error
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = t.jobCategoryNameRequired;
    }

    if (!formData.slug || !formData.slug.trim()) {
      newErrors.slug = t.jobCategorySlugRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addChildCategory = () => {
    setChildCategories(prev => [
      ...prev,
      {
        name: '',
        nameEn: '',
        nameJp: '',
        slug: '',
        description: '',
        descriptionEn: '',
        descriptionJp: '',
        parentId: formData.parentId || null, // Default to current category's parent, or will be set to current category after creation
        order: prev.length,
        status: 1,
        level: 0, // Will be calculated based on parent
      },
    ]);
  };

  const removeChildCategory = (index) => {
    setChildCategories(prev => prev.filter((_, i) => i !== index));
  };

  const updateChildCategory = (index, field, value) => {
    setChildCategories(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      // Auto-generate slug from name
      if (field === 'name' && value) {
        updated[index].slug = generateSlug(value);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    // Validate child categories if any
    // Only validate categories that have at least some information (user started filling)
    const childErrors = {};
    const validChildCategories = [];
    
    childCategories.forEach((child, index) => {
      // Check if this child category has any information (user started filling it)
      const hasAnyInfo = (child.name && child.name.trim()) || (child.slug && child.slug.trim());
      
      if (hasAnyInfo) {
        // Only validate if user started filling this category
        if (!child.name || !child.name.trim()) {
          childErrors[`child_${index}_name`] = 'Tên category con là bắt buộc';
        }
        if (!child.slug || !child.slug.trim()) {
          childErrors[`child_${index}_slug`] = 'Slug category con là bắt buộc';
        }
        
        // Only add to validChildCategories if it passes validation
        if (child.name && child.name.trim() && child.slug && child.slug.trim()) {
          validChildCategories.push(child);
        }
      }
      // If no info at all, skip this category (user didn't fill it, so ignore it)
    });

    if (Object.keys(childErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...childErrors }));
      alert('Vui lòng điền đầy đủ thông tin cho các category con (tên và slug là bắt buộc)');
      return;
    }

    try {
      setLoading(true);
      
      // Create main category first
      const mainCategoryData = {
        name: formData.name.trim(),
        nameEn: formData.nameEn?.trim() || null,
        nameJp: formData.nameJp?.trim() || null,
        slug: formData.slug.trim(),
        description: formData.description || null,
        descriptionEn: formData.descriptionEn || null,
        descriptionJp: formData.descriptionJp || null,
        parentId: formData.parentId || null,
        order: formData.order || 0,
        status: formData.status,
      };

      const mainResponse = categoryId
        ? await apiService.updateJobCategory(categoryId, mainCategoryData)
        : await apiService.createJobCategory(mainCategoryData);

      if (!mainResponse.success) {
        alert(
          mainResponse.message ||
            (categoryId ? t.jobCategoryMainErrorUpdate : t.jobCategoryMainErrorCreate)
        );
        return;
      }

      // Get the created/updated category ID
      const createdCategoryId = categoryId || mainResponse.data?.category?.id;
      
      // Create child categories if any (only those with valid information)
      const categoriesToCreate = childCategories.filter(child => 
        child.name && child.name.trim() && child.slug && child.slug.trim()
      );
      
      if (categoriesToCreate.length > 0) {
        // Create a map to store created category IDs
        const createdIds = new Map();
        createdIds.set('main', createdCategoryId);
        
        // Sort children by dependency: 
        // Categories that depend on other children (parentId starts with "child_") should be created after their parents
        const sortedChildren = [];
        const remaining = [...categoriesToCreate];
        const processed = new Set();
        
        // Create a map from child object to its index in categoriesToCreate
        const childIndexMap = new Map();
        categoriesToCreate.forEach((child, idx) => {
          childIndexMap.set(child, idx);
        });
        
        // Helper to check if a category's dependencies are satisfied
        const canCreate = (child) => {
          if (!child.parentId) return true; // No parent, can create
          if (typeof child.parentId === 'string' && child.parentId.startsWith('child_')) {
            // Find the referenced child category
            const depIndexStr = child.parentId.replace('child_', '');
            const depIndex = parseInt(depIndexStr);
            if (!isNaN(depIndex)) {
              // Check if the referenced child (by original index in childCategories) has been processed
              // We need to map back to categoriesToCreate index
              if (depIndex < childCategories.length) {
                const referencedChild = childCategories[depIndex];
                const refIndexInCategoriesToCreate = categoriesToCreate.findIndex(c => 
                  c.name === referencedChild.name && c.slug === referencedChild.slug
                );
                if (refIndexInCategoriesToCreate >= 0) {
                  return processed.has(refIndexInCategoriesToCreate);
                }
              }
            }
            return false; // Dependency not found or not processed
          }
          return true; // Existing category as parent, can create
        };
        
        // Process in rounds: create categories whose dependencies are satisfied
        while (remaining.length > 0) {
          let foundAny = false;
          for (let i = remaining.length - 1; i >= 0; i--) {
            const child = remaining[i];
            const indexInCategoriesToCreate = childIndexMap.get(child);
            if (indexInCategoriesToCreate !== undefined && canCreate(child)) {
              sortedChildren.push(child);
              remaining.splice(i, 1);
              processed.add(indexInCategoriesToCreate);
              foundAny = true;
            }
          }
          // If no progress, break to avoid infinite loop (circular dependency)
          if (!foundAny) {
            // Add remaining with warning
            sortedChildren.push(...remaining);
            break;
          }
        }

        const createdChildIds = [];
        const errors = [];

        // Create children sequentially to handle dependencies
        // Map each child to its index in categoriesToCreate for tracking
        const childToIndexMap = new Map();
        categoriesToCreate.forEach((child, index) => {
          const key = `${child.name}_${child.slug}`;
          childToIndexMap.set(key, index);
        });

        for (let sortedIndex = 0; sortedIndex < sortedChildren.length; sortedIndex++) {
          const child = sortedChildren[sortedIndex];
          const key = `${child.name}_${child.slug}`;
          const originalIndex = childToIndexMap.get(key) ?? sortedIndex;
          
          try {
            // Determine parentId: use specified parent, or main category, or a previously created child
            let finalParentId = child.parentId;
            
            // Check if parentId is a reference to another child category being created (string like "child_0")
            if (typeof finalParentId === 'string' && finalParentId.startsWith('child_')) {
              const referencedChildIndex = parseInt(finalParentId.replace('child_', ''));
              if (!isNaN(referencedChildIndex) && createdIds.has(`child_${referencedChildIndex}`)) {
                finalParentId = createdIds.get(`child_${referencedChildIndex}`);
              } else {
                // If the referenced child hasn't been created yet, use main category as fallback
                finalParentId = createdCategoryId;
              }
            } else if (!finalParentId || finalParentId === createdCategoryId) {
              finalParentId = createdCategoryId;
            } else if (typeof finalParentId === 'number') {
              // Check if it's a reference to a child by numeric index (shouldn't happen, but handle it)
              if (createdIds.has(`child_${finalParentId}`)) {
                finalParentId = createdIds.get(`child_${finalParentId}`);
              }
              // Otherwise, use the specified parentId (existing category ID)
            }

            const childData = {
              name: child.name.trim(),
              nameEn: child.nameEn?.trim() || null,
              nameJp: child.nameJp?.trim() || null,
              slug: child.slug.trim(),
              description: child.description || null,
              descriptionEn: child.descriptionEn || null,
              descriptionJp: child.descriptionJp || null,
              parentId: finalParentId,
              order: child.order !== undefined ? child.order : i,
              status: child.status || 1,
            };

            const childResponse = await apiService.createJobCategory(childData);
            
            if (childResponse.success && childResponse.data?.category?.id) {
              const childId = childResponse.data.category.id;
              // Store the created ID with the original index
              createdIds.set(`child_${originalIndex}`, childId);
              createdChildIds.push(childId);
            } else {
              errors.push(`Category "${child.name}": ${childResponse.message || 'Lỗi không xác định'}`);
            }
          } catch (error) {
            errors.push(`Category "${child.name}": ${error.message || 'Lỗi không xác định'}`);
          }
        }

        if (errors.length > 0) {
          alert(
            t.jobCategoryChildrenPartialSuccess
              .replace('{success}', createdChildIds.length)
              .replace('{total}', categoriesToCreate.length)
              .replace('{errors}', errors.join('\n'))
          );
        } else {
          alert(
            t.jobCategoryChildrenAllSuccess
              .replace('{total}', categoriesToCreate.length + 1)
              .replace('{children}', categoriesToCreate.length)
          );
        }
      } else {
        alert(categoryId ? t.jobCategoryMainUpdateSuccess : t.jobCategoryMainSaveSuccess);
      }

      navigate('/admin/job-categories');
    } catch (error) {
      console.error(`Error ${categoryId ? 'updating' : 'creating'} category:`, error);
      alert(
        error.message ||
          (categoryId ? t.jobCategoryMainErrorUpdate : t.jobCategoryMainErrorCreate)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm(t.jobCategoryConfirmCancel)) {
      navigate('/admin/job-categories');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg p-4 border flex items-center justify-between" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/job-categories')}
            onMouseEnter={() => setHoveredBackButton(true)}
            onMouseLeave={() => setHoveredBackButton(false)}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: hoveredBackButton ? '#f3f4f6' : 'transparent'
            }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: '#4b5563' }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: '#111827' }}>
              {categoryId ? t.editJobCategoryTitle : t.addJobCategoryTitle}
            </h1>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {categoryId ? t.editJobCategorySubtitle : t.addJobCategorySubtitle}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            onMouseEnter={() => setHoveredCancelButton(true)}
            onMouseLeave={() => setHoveredCancelButton(false)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            style={{
              backgroundColor: hoveredCancelButton ? '#e5e7eb' : '#f3f4f6',
              color: '#374151'
            }}
          >
            <X className="w-3.5 h-3.5" />
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            onMouseEnter={() => !loading && setHoveredSaveButton(true)}
            onMouseLeave={() => setHoveredSaveButton(false)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            style={{
              backgroundColor: loading 
                ? '#93c5fd' 
                : (hoveredSaveButton ? '#1d4ed8' : '#2563eb'),
              color: 'white',
              opacity: loading ? 0.5 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <Save className="w-3.5 h-3.5" />
            {loading
              ? categoryId
                ? t.jobCategorySavingUpdate
                : t.jobCategorySavingCreate
              : categoryId
              ? t.jobCategorySaveUpdate
              : t.jobCategorySaveCreate}
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-lg p-6 border space-y-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name (VI) */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
              {t.jobCategoryNameLabel} (VI) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t.jobCategoryNamePlaceholder}
              required
              className="w-full px-3 py-2 border rounded-lg text-xs"
              style={{
                borderColor: errors.name ? '#ef4444' : '#d1d5db',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563eb';
                e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.name ? '#ef4444' : '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
            {errors.name && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.name}</p>}
          </div>

          {/* Name (EN) */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
              {t.jobCategoryNameLabel} (EN)
            </label>
            <input
              type="text"
              name="nameEn"
              value={formData.nameEn}
              onChange={handleInputChange}
              placeholder="E.g. Information Technology"
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name (JP) */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
              {t.jobCategoryNameLabel} (JP)
            </label>
            <input
              type="text"
              name="nameJp"
              value={formData.nameJp}
              onChange={handleInputChange}
              placeholder="例：情報技術"
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

          {/* Slug */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
              {t.jobCategorySlugLabel} <span style={{ color: '#ef4444' }}>*</span>
              <span className="text-[10px] ml-2" style={{ color: '#6b7280' }}>
                (Tự động tạo từ tên VI)
              </span>
            </label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              placeholder={t.jobCategorySlugPlaceholder}
              required
              className="w-full px-3 py-2 border rounded-lg text-xs"
              style={{
                borderColor: errors.slug ? '#ef4444' : '#d1d5db',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563eb';
                e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.slug ? '#ef4444' : '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
            {errors.slug && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.slug}</p>}
          </div>
        </div>

        {/* Description */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
              {t.jobCategoryDescriptionLabel} (VI)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
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
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
              {t.jobCategoryDescriptionLabel} (EN)
            </label>
            <textarea
              name="descriptionEn"
              value={formData.descriptionEn}
              onChange={handleInputChange}
              placeholder="Description in English..."
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
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
              {t.jobCategoryDescriptionLabel} (JP)
            </label>
            <textarea
              name="descriptionJp"
              value={formData.descriptionJp}
              onChange={handleInputChange}
              placeholder="日本語での説明..."
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Parent Category */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
              {t.jobCategoryParentLabel}
            </label>
            <div className="relative">
              <Folder className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
              <select
                name="parentId"
                value={formData.parentId || ''}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    parentId: e.target.value ? parseInt(e.target.value) : null
                  }));
                }}
                className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs font-mono"
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
                <option value="">{t.jobCategoryParentNoneOption}</option>
                {parentCategories.length > 0 ? (
                  parentCategories.map((category) => {
                    const indent = '  '.repeat(category.level || 0);
                    const prefix = category.level > 0 ? '└─ ' : '';
                    const levelIndicator = category.level > 0 ? `[Cấp ${category.level}] ` : '[Cấp 0] ';
                    return (
                      <option key={category.id} value={category.id}>
                        {levelIndicator}{indent}{prefix}{category.name}
                      </option>
                    );
                  })
                ) : (
                  <option disabled>Đang tải danh sách categories...</option>
                )}
              </select>
            </div>
            <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>
              {formData.parentId 
                ? (() => {
                    const selectedParent = parentCategories.find(c => c.id === formData.parentId);
                    if (selectedParent) {
                      return `Category này sẽ là con của: "${selectedParent.fullPath || selectedParent.name}" (Cấp ${(selectedParent.level || 0) + 1})`;
                    }
                    return `Đây là category con của category đã chọn`;
                  })()
                : 'Đây là category cấp cha (không có parent) - Cấp 0'}
            </p>
            <p className="text-[10px] mt-1 font-medium" style={{ color: '#2563eb' }}>
              💡 Bạn có thể chọn bất kỳ category nào (kể cả category đã có parent) để tạo category con
            </p>
          </div>

          {/* Order */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
              {t.jobCategoryOrderLabel}
            </label>
            <input
              type="number"
              name="order"
              value={formData.order}
              onChange={handleInputChange}
              placeholder={t.jobCategoryOrderPlaceholder}
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

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
              {t.jobCategoryStatusLabel}
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
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
              <option value="1">{t.jobCategoryStatusActive}</option>
              <option value="0">{t.jobCategoryStatusHidden}</option>
            </select>
          </div>
        </div>

        {/* Add Child Categories Section */}
        {!categoryId && (
          <div className="border-t pt-4" style={{ borderColor: '#e5e7eb' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Thêm category con cùng lúc</h3>
                <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>
                  Tạo nhiều category con của category này trong một lần
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddChildren(!showAddChildren);
                  if (!showAddChildren && childCategories.length === 0) {
                    addChildCategory();
                  }
                }}
                onMouseEnter={() => setHoveredAddChildrenButton(true)}
                onMouseLeave={() => setHoveredAddChildrenButton(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: hoveredAddChildrenButton ? '#dbeafe' : '#eff6ff',
                  color: '#2563eb'
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddChildren ? 'Ẩn' : 'Thêm category con'}
              </button>
            </div>

            {showAddChildren && (
              <div className="space-y-3">
                {childCategories.map((child, index) => (
                  <div key={index} className="border rounded-lg p-4" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-xs font-semibold" style={{ color: '#374151' }}>
                        Category con #{index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeChildCategory(index)}
                        onMouseEnter={() => setHoveredRemoveChildCategoryButtonIndex(index)}
                        onMouseLeave={() => setHoveredRemoveChildCategoryButtonIndex(null)}
                        className="p-1 rounded transition-colors"
                        style={{
                          color: hoveredRemoveChildCategoryButtonIndex === index ? '#b91c1c' : '#ef4444',
                          backgroundColor: hoveredRemoveChildCategoryButtonIndex === index ? '#fef2f2' : 'transparent'
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: '#374151' }}>
                          Tên category con <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={child.name}
                          onChange={(e) => updateChildCategory(index, 'name', e.target.value)}
                          placeholder="VD: Software Development"
                          className="w-full px-2 py-1.5 border rounded text-xs"
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
                        {errors[`child_${index}_name`] && (
                          <p className="text-[10px] mt-0.5" style={{ color: '#ef4444' }}>{errors[`child_${index}_name`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: '#374151' }}>
                          Slug <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={child.slug}
                          onChange={(e) => updateChildCategory(index, 'slug', e.target.value)}
                          placeholder="VD: software-development"
                          className="w-full px-2 py-1.5 border rounded text-xs"
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
                        {errors[`child_${index}_slug`] && (
                          <p className="text-[10px] mt-0.5" style={{ color: '#ef4444' }}>{errors[`child_${index}_slug`]}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: '#374151' }}>
                          Mô tả (VI)
                        </label>
                        <textarea
                          value={child.description}
                          onChange={(e) => updateChildCategory(index, 'description', e.target.value)}
                          placeholder="Mô tả về category con..."
                          rows="2"
                          className="w-full px-2 py-1.5 border rounded text-xs resize-none"
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
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: '#374151' }}>
                          Mô tả (EN)
                        </label>
                        <textarea
                          value={child.descriptionEn}
                          onChange={(e) => updateChildCategory(index, 'descriptionEn', e.target.value)}
                          placeholder="Description in English..."
                          rows="2"
                          className="w-full px-2 py-1.5 border rounded text-xs resize-none"
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
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: '#374151' }}>
                          Mô tả (JP)
                        </label>
                        <textarea
                          value={child.descriptionJp}
                          onChange={(e) => updateChildCategory(index, 'descriptionJp', e.target.value)}
                          placeholder="日本語での説明..."
                          rows="2"
                          className="w-full px-2 py-1.5 border rounded text-xs resize-none"
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

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: '#374151' }}>
                          Thứ tự
                        </label>
                        <input
                          type="number"
                          value={child.order}
                          onChange={(e) => updateChildCategory(index, 'order', parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full px-2 py-1.5 border rounded text-xs"
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
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: '#374151' }}>
                          Trạng thái
                        </label>
                        <select
                          value={child.status}
                          onChange={(e) => updateChildCategory(index, 'status', parseInt(e.target.value))}
                          className="w-full px-2 py-1.5 border rounded text-xs"
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

                    {/* Parent for child category (can be current category, another existing category, or another child being created) */}
                    <div className="mt-3">
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: '#374151' }}>
                        Category cha của category con này
                      </label>
                      <select
                        value={child.parentId || ''}
                        onChange={(e) => updateChildCategory(index, 'parentId', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-2 py-1.5 border rounded text-xs"
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
                        <option value="">-- Sử dụng category chính làm parent --</option>
                        {/* Show other child categories being created (for nested children) */}
                        {childCategories.map((otherChild, otherIndex) => {
                          if (otherIndex === index) return null;
                          return (
                            <option key={`child_${otherIndex}`} value={`child_${otherIndex}`}>
                              [Category con #{otherIndex + 1}] {otherChild.name || 'Chưa đặt tên'}
                            </option>
                          );
                        })}
                        {/* Show existing categories */}
                        {parentCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.fullPath || cat.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[9px] mt-1" style={{ color: '#6b7280' }}>
                        {(() => {
                          if (!child.parentId) {
                            return `Category con này sẽ thuộc về category chính "${formData.name || 'category đang tạo'}"`;
                          }
                          const parentOption = childCategories.find((_, i) => `child_${i}` === child.parentId.toString());
                          if (parentOption) {
                            return `Category con này sẽ thuộc về category con khác đang được tạo: "${parentOption.name || 'Chưa đặt tên'}"`;
                          }
                          const existingParent = parentCategories.find(c => c.id === child.parentId);
                          if (existingParent) {
                            return `Category con này sẽ thuộc về: "${existingParent.fullPath || existingParent.name}"`;
                          }
                          return `Category con này sẽ thuộc về category đã chọn`;
                        })()}
                      </p>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addChildCategory}
                  onMouseEnter={() => setHoveredAddChildCategoryButton(true)}
                  onMouseLeave={() => setHoveredAddChildCategoryButton(false)}
                  className="w-full py-2 border-2 border-dashed rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
                  style={{
                    borderColor: hoveredAddChildCategoryButton ? '#60a5fa' : '#d1d5db',
                    color: hoveredAddChildCategoryButton ? '#2563eb' : '#4b5563'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Thêm category con khác
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-lg p-3 border" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
          <div className="flex items-start gap-2">
            <Tag className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#2563eb' }} />
            <div className="text-xs" style={{ color: '#1e40af' }}>
              <p className="font-semibold mb-1">Lưu ý về cấu trúc category:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Không chọn parent</strong> → Tạo category cấp cha (Cấp 0) - parentId = NULL</li>
                <li><strong>Chọn category cấp cha</strong> → Tạo category con (Cấp 1)</li>
                <li><strong>Chọn category cấp 1</strong> → Tạo category con của category con (Cấp 2)</li>
                <li><strong>Chọn category cấp 2</strong> → Tạo category cấp 3, và cứ thế...</li>
                <li className="mt-2 font-semibold" style={{ color: '#1e3a8a' }}>✅ Bạn có thể chọn BẤT KỲ category nào (kể cả category đã có parent) để tạo category con!</li>
                {!categoryId && (
                  <li className="mt-2 font-semibold" style={{ color: '#1e3a8a' }}>✅ Bạn có thể tạo nhiều category con cùng lúc bằng cách sử dụng phần "Thêm category con cùng lúc"!</li>
                )}
                <li>Slug sẽ được tự động tạo từ tên, bạn có thể chỉnh sửa nếu cần</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddJobCategoryPage;

