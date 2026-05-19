import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import apiService from '../../services/api';
import { translations } from '../../translations/translations';

function findCategoryInTree(categories, targetId) {
  if (!categories || !Array.isArray(categories)) return null;
  const s = String(targetId);
  for (const cat of categories) {
    if (String(cat.id) === s) return cat;
    const found = findCategoryInTree(cat.children, targetId);
    if (found) return found;
  }
  return null;
}

function getRootIdForLeaf(flatCategories, leafId) {
  if (!leafId || !flatCategories?.length) return null;
  let id = String(leafId);
  const parentById = new Map(flatCategories.map((c) => [String(c.id), c.parentId ? String(c.parentId) : null]));
  const guard = new Set();
  while (parentById.has(id) && parentById.get(id)) {
    if (guard.has(id)) break;
    guard.add(id);
    id = parentById.get(id);
  }
  return id;
}

function useModalCopy(language) {
  return useMemo(() => {
    if (language === 'en') {
      return {
        title: 'Choose job category',
        groupHint: 'Field',
        detailHint: 'Details',
        singleHint: 'You can select only one option.',
        pickGroupFirst: 'Choose a field above first.',
        clear: 'Clear',
        confirm: 'Confirm',
      };
    }
    if (language === 'ja') {
      return {
        title: '\u8077\u7a2e\u3092\u9078\u3076',
        groupHint: '\u5927\u5206\u985e',
        detailHint: '\u8a73\u7d30',
        singleHint: '\u9078\u629e\u3067\u304d\u308b\u306e\u306f1\u3064\u3060\u3051\u3067\u3059\u3002',
        pickGroupFirst: '\u5148\u306b\u5927\u5206\u985e\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002',
        clear: '\u9078\u629e\u89e3\u9664',
        confirm: '\u78ba\u8a8d',
      };
    }
    return {
      title: 'Ch\u1ecdn ng\u00e0nh ngh\u1ec1',
      groupHint: 'Nh\u00f3m ng\u00e0nh',
      detailHint: 'Chi ti\u1ebft',
      singleHint: 'Ch\u1ec9 \u0111\u01b0\u1ee3c ch\u1ecdn 1 m\u1ee5c.',
      pickGroupFirst: 'Vui l\u00f2ng ch\u1ecdn nh\u00f3m ng\u00e0nh ph\u00eda tr\u00ean tr\u01b0\u1edbc.',
      clear: 'B\u1ecf ch\u1ecdn',
      confirm: 'X\u00e1c nh\u1eadn',
    };
  }, [language]);
}

/** Modal: pick one job category (group or leaf); two columns on md+, stacked on mobile. */
export default function JobCategoryPickerModal({
  open,
  onClose,
  useAdminAPI = false,
  language = 'vi',
  initialLeafId = null,
  onConfirm,
}) {
  const t = translations[language] || translations.vi;
  const copy = useModalCopy(language);
  const [categoryTree, setCategoryTree] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeRootId, setActiveRootId] = useState(null);
  const [draftCategoryId, setDraftCategoryId] = useState(null);

  const closeAria =
    language === 'en' ? 'Close' : language === 'ja' ? '\u9589\u3058\u308b' : '\u0110\u00f3ng';

  const getCategoryDisplayName = useCallback(
    (cat) => {
      if (!cat) return '';
      if (language === 'vi') return cat.name || '';
      if (language === 'en') return cat.nameEn || cat.name || '';
      return cat.nameJp || cat.nameEn || cat.name || '';
    },
    [language]
  );

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const processTree = (tree) => {
        if (!tree || !Array.isArray(tree)) {
          setCategoryTree([]);
          setFlatCategories([]);
          return;
        }
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
        setFlatCategories(flattenTree(tree));
      };

      try {
        const treeResponse = useAdminAPI
          ? await apiService.getJobCategoryTree({ status: 1 })
          : await apiService.getCTVJobCategoryTree();
        if (treeResponse?.success && treeResponse?.data?.tree) {
          processTree(treeResponse.data.tree);
          return;
        }
      } catch {
        /* fallback */
      }

      try {
        const fetchCategories = useAdminAPI
          ? () => apiService.getJobCategories({ status: 1, limit: 500 })
          : () => apiService.getCTVJobCategories({ status: 1, limit: 500 });
        const response = await fetchCategories();
        if (response?.success && response?.data?.categories?.length > 0) {
          const allCategories = response.data.categories.map((cat) => ({
            id: String(cat.id),
            name: cat.name,
            nameEn: cat.nameEn,
            nameJp: cat.nameJp,
            parentId: cat.parentId ? String(cat.parentId) : null,
            order: cat.order ?? 0,
          }));
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
          processTree(buildTree(allCategories));
        } else {
          setCategoryTree([]);
          setFlatCategories([]);
        }
      } catch {
        setCategoryTree([]);
        setFlatCategories([]);
      }
    } finally {
      setLoading(false);
    }
  }, [useAdminAPI]);

  useEffect(() => {
    if (!open) return;
    loadTree();
  }, [open, loadTree]);

  useEffect(() => {
    if (!open || loading) return;
    const roots = categoryTree.filter((c) => !c.parentId);
    const init = initialLeafId != null && String(initialLeafId).trim() !== ''
      ? String(initialLeafId)
      : null;
    if (init && flatCategories.length) {
      const rootId = getRootIdForLeaf(flatCategories, init);
      setActiveRootId(rootId || (roots[0] ? String(roots[0].id) : null));
      setDraftCategoryId(init);
    } else {
      setDraftCategoryId(null);
      setActiveRootId(roots[0] ? String(roots[0].id) : null);
    }
  }, [open, loading, initialLeafId, categoryTree, flatCategories]);

  const renderNestedCategories = (category, level = 0) => {
    if (!category) return null;
    const categoryId = String(category.id);
    const hasChildren = category.children && category.children.length > 0;
    return (
      <div className="space-y-0.5 sm:space-y-1">
        <label
          className="flex items-center gap-3 min-h-[48px] sm:min-h-[44px] px-2 py-2.5 sm:p-2 rounded-lg hover:bg-gray-50 cursor-pointer active:bg-gray-100"
          style={{ paddingLeft: `${12 + level * 14}px` }}
          onClick={() => {
            setDraftCategoryId((prev) => (prev === categoryId ? null : categoryId));
          }}
        >
          <input
            type="radio"
            name="job-category-pick-modal"
            checked={draftCategoryId === categoryId}
            readOnly
            className="w-[18px] h-[18px] sm:w-4 sm:h-4 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
            aria-label={getCategoryDisplayName(category)}
          />
          <span className="text-sm sm:text-xs text-gray-900 flex-1 leading-snug">
            {level > 0 ? (
              <span className="text-gray-400 mr-1" aria-hidden="true">
                {'\u2514\u2500'}
              </span>
            ) : null}
            {getCategoryDisplayName(category)}
          </span>
        </label>
        {hasChildren ? (
          <div>
            {category.children.map((child) => (
              <div key={String(child.id)}>
                {renderNestedCategories(child, level + 1)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const handleConfirm = () => {
    if (!draftCategoryId) {
      onConfirm?.({ id: null, displayName: '' });
    } else {
      const node = findCategoryInTree(categoryTree, draftCategoryId);
      onConfirm?.({
        id: parseInt(draftCategoryId, 10),
        displayName: getCategoryDisplayName(node),
      });
    }
    onClose?.();
  };

  const roots = categoryTree.filter((c) => !c.parentId);
  const fieldInTree = activeRootId ? findCategoryInTree(categoryTree, activeRootId) : null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white flex flex-col w-full max-w-4xl h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[min(85vh,900px)] rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-category-modal-title"
      >
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 sm:py-3.5 border-b border-gray-200 bg-white">
          <div className="min-w-0 flex-1">
            <h2 id="job-category-modal-title" className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
              {copy.title}
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-snug">{copy.singleHint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 -mr-1 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation shrink-0"
            aria-label={closeAria}
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Root categories */}
          <div className="flex flex-col w-full md:w-1/2 md:min-w-0 min-h-0 border-b border-gray-200 md:border-b-0 md:border-r max-h-[42vh] md:max-h-none md:flex-1">
            <div className="flex-shrink-0 px-3 py-2 sm:px-4 bg-gray-50/80 border-b border-gray-100 md:border-gray-100">
              <span className="text-xs font-medium text-gray-700">{copy.groupHint}</span>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500 text-sm">{t.loading}</div>
              ) : (
                <div className="space-y-1" role="list" aria-label={copy.groupHint}>
                  {roots.map((cat) => {
                    const catId = String(cat.id);
                    const active = activeRootId === catId;
                    return (
                      <button
                        key={catId}
                        type="button"
                        onClick={() => {
                          setActiveRootId(catId);
                          setDraftCategoryId(catId);
                        }}
                        className={`w-full text-left flex items-center gap-3 min-h-[48px] sm:min-h-[44px] px-3 py-2.5 rounded-lg text-sm sm:text-xs transition-colors touch-manipulation ${
                          active ? 'bg-blue-50 ring-2 ring-blue-200 text-gray-900' : 'hover:bg-gray-50 active:bg-gray-100 text-gray-900'
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${active ? 'bg-blue-600' : 'bg-gray-300'}`}
                          aria-hidden="true"
                        />
                        <span className="flex-1 leading-snug">{getCategoryDisplayName(cat)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Detail: single radio selection */}
          <div className="flex flex-col w-full md:w-1/2 md:min-w-0 min-h-0 flex-1">
            <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2 sm:px-4 bg-gray-50/80 border-b border-gray-100">
              <div className="min-w-0">
                <span className="text-xs font-medium text-gray-700 block">{copy.detailHint}</span>
                <span className="text-[10px] text-gray-500 hidden sm:block">{copy.singleHint}</span>
              </div>
              <button
                type="button"
                className="text-xs text-gray-600 hover:text-gray-900 py-2 px-2 -mr-2 rounded-lg hover:bg-gray-100 touch-manipulation shrink-0"
                onClick={() => setDraftCategoryId(null)}
              >
                {copy.clear}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 min-h-0">
              {loading ? (
                <div className="text-center py-8 text-gray-500 text-sm">{t.loading}</div>
              ) : !fieldInTree || !fieldInTree.children?.length ? (
                <div className="text-center py-8 text-gray-500 text-sm px-2">{copy.pickGroupFirst}</div>
              ) : (
                <div role="radiogroup" aria-label={copy.detailHint}>
                  {renderNestedCategories(fieldInTree, 0)}
                </div>
              )}
            </div>
            <div
              className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-200 bg-white"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full min-h-[48px] sm:min-h-[44px] py-3 sm:py-2 px-4 rounded-xl sm:rounded-lg transition-colors font-medium text-white text-sm sm:text-base touch-manipulation hover:bg-blue-700 active:bg-blue-800"
                style={{ backgroundColor: '#2563eb' }}
              >
                {copy.confirm}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
