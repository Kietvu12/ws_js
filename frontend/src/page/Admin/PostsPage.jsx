import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import apiService, { normalizePostImageUrl } from '../../services/api';
import {
  POST_VISIBILITY_AGENT_HOME,
  POST_VISIBILITY_PUBLIC_CTV,
  POST_VISIBILITY_PUBLIC_CANDIDATE,
  POST_VISIBILITY_ALL,
  toggleVisibilityMask
} from '../../constants/postVisibility';
import RichTextEditor from '../../component/Shared/RichTextEditor';
import { Plus, Pencil, Trash2, Calendar, Eye, FileText, X, ImagePlus, EyeIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';

const STATUS_DRAFT = 1;
const STATUS_PUBLISHED = 2;

const LANGS = [
  { key: 'vi', label: 'Tiếng Việt' },
  { key: 'en', label: 'English' },
  { key: 'ja', label: '日本語' }
];

const defaultFormData = {
  title: '',
  content: '',
  slug: '',
  thumbnail: '',
  status: STATUS_DRAFT,
  type: 1,
  categoryId: '',
  eventId: '',
  tag: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  metaImage: '',
  metaUrl: '',
  publishedAt: '',
  titleEn: '',
  titleJa: '',
  contentEn: '',
  contentJa: '',
  slugEn: '',
  slugJa: '',
  metaTitleEn: '',
  metaTitleJa: '',
  metaDescriptionEn: '',
  metaDescriptionJa: '',
  visibilityMask: POST_VISIBILITY_ALL,
};

export default function PostsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;

  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(defaultFormData);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tagList, setTagList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState('vi');
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(null); // URL tạm sau khi upload (key lưu vào formData.thumbnail)
  const thumbnailImageInputRef = useRef(null);
  const [eventsList, setEventsList] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Similar to RichTextEditor: keep a safe margin under backend multer limit (~10MB).
  const MAX_UPLOAD_BYTES = 9 * 1024 * 1024; // ~9MB
  const MAX_IMAGE_DIM = 1600;

  const compressThumbnailIfNeeded = useCallback(async (file) => {
    if (!file) return file;
    if (file.size <= MAX_UPLOAD_BYTES) return file;

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Read file failed'));
      reader.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('Load image failed'));
      im.src = dataUrl;
    });

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(srcW, srcH));

    const dstW = Math.max(1, Math.round(srcW * scale));
    const dstH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = dstW;
    canvas.height = dstH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, dstW, dstH);

    const baseName = String(file?.name || 'thumbnail').replace(/\.[^/.]+$/, '').trim() || 'thumbnail';
    const targetName = `${baseName}.jpg`;

    const qualities = [0.85, 0.75, 0.65, 0.55, 0.45];
    let bestFile = null;

    for (const q of qualities) {
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', q);
      });
      if (!blob) continue;
      const candidate = new File([blob], targetName, { type: 'image/jpeg' });
      bestFile = candidate;
      if (candidate.size <= MAX_UPLOAD_BYTES) return candidate;
    }

    return bestFile || file;
  }, []);

  const pathname = location.pathname || '';
  const isList = pathname === '/admin/posts' || pathname === '/admin/posts/';
  const isEdit = id && id !== 'create';

  useEffect(() => {
    if (isList) {
      loadPosts();
    } else {
      loadCategories();
      if (isEdit) {
        loadPost(id);
      } else {
        setFormData(defaultFormData);
        setTagList([]);
        setThumbnailPreviewUrl(null);
        setLoading(false);
      }
    }
  }, [id, isList, isEdit]);

  const loadPosts = async (page = 1) => {
    try {
      setLoading(true);
      const res = await apiService.getAdminPosts({
        page,
        limit: 12,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });
      if (res.success && res.data) {
        setPosts(res.data.posts || []);
        setPagination(res.data.pagination || { total: 0, page: 1, limit: 12, totalPages: 0 });
      }
    } catch (err) {
      console.error('Error loading posts:', err);
      alert(t.postsLoadError || 'Lỗi khi tải danh sách bài viết: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPost = async (postId) => {
    try {
      setLoading(true);
      const res = await apiService.getAdminPostById(postId);
      if (res.success && res.data?.post) {
        const p = res.data.post;
        setThumbnailPreviewUrl(null);
        setFormData({
          title: p.title || '',
          content: p.content || '',
          slug: p.slug || '',
          thumbnail: p.thumbnail || '',
          status: p.status ?? STATUS_DRAFT,
          type: p.type ?? 1,
          categoryId: p.categoryId ? String(p.categoryId) : '',
          eventId: p.eventId ? String(p.eventId) : '',
          tag: p.tag || '',
          metaTitle: p.metaTitle || '',
          metaDescription: p.metaDescription || '',
          metaKeywords: p.metaKeywords || '',
          metaImage: p.metaImage || '',
          metaUrl: p.metaUrl || '',
          publishedAt: p.publishedAt ? p.publishedAt.slice(0, 16) : '',
          titleEn: p.titleEn || '',
          titleJa: p.titleJa || '',
          contentEn: p.contentEn || '',
          contentJa: p.contentJa || '',
          slugEn: p.slugEn || '',
          slugJa: p.slugJa || '',
          metaTitleEn: p.metaTitleEn || '',
          metaTitleJa: p.metaTitleJa || '',
          metaDescriptionEn: p.metaDescriptionEn || '',
          metaDescriptionJa: p.metaDescriptionJa || '',
          visibilityMask:
            p.visibilityMask != null && p.visibilityMask !== ''
              ? Number(p.visibilityMask)
              : POST_VISIBILITY_ALL,
        });
        if (p.tag) {
          setTagList(p.tag.split(',').map((x) => x.trim()).filter(Boolean));
        } else {
          setTagList([]);
        }
      }
    } catch (err) {
      console.error('Error loading post:', err);
      alert(t.postsLoadOneError || 'Lỗi khi tải bài viết: ' + err.message);
      navigate('/admin/posts');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await apiService.getPostCategoriesAll();
      if (res.success && res.data?.categories) {
        setCategories(res.data.categories);
      } else if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const selectedCategory = categories.find((c) => String(c.id) === formData.categoryId);
  const isEventCategory = selectedCategory && (selectedCategory.slug === 'su-kien' || (selectedCategory.slug && selectedCategory.slug.toLowerCase() === 'event'));

  useEffect(() => {
    if (!isEventCategory) {
      setFormData((prev) => (prev.eventId ? { ...prev, eventId: '' } : prev));
      return;
    }
    let cancelled = false;
    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const res = await apiService.getAdminEvents({ limit: 200, sortBy: 'start_at', sortOrder: 'DESC' });
        if (!cancelled && res.success && res.data?.events) {
          setEventsList(res.data.events);
        } else if (!cancelled) {
          setEventsList([]);
        }
      } catch (err) {
        if (!cancelled) setEventsList([]);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    };
    loadEvents();
    return () => { cancelled = true; };
  }, [isEventCategory]);

  const buildSlug = (title) => {
    if (!title) return '';
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const hasAnyTitle = () =>
    [formData.title, formData.titleEn, formData.titleJa].some((s) => s?.trim());
  const hasAnyContent = () =>
    [formData.content, formData.contentEn, formData.contentJa].some((s) => s?.trim());
  const getMainSlug = () =>
    formData.slug?.trim() ||
    buildSlug(formData.title) ||
    formData.slugEn?.trim() ||
    formData.slugJa?.trim() ||
    '';

  const handleSubmit = (e) => {
    e.preventDefault();
    const slug = getMainSlug() || 'draft-' + Date.now();
    if (!hasAnyTitle()) {
      alert(t.postsTitleRequired || 'Vui lòng nhập tiêu đề (ít nhất một ngôn ngữ)');
      return;
    }
    if (!hasAnyContent()) {
      alert(t.postsContentRequired || 'Vui lòng nhập nội dung (ít nhất một ngôn ngữ)');
      return;
    }
    if (!formData.visibilityMask) {
      alert(t.postsVisibilityRequired || 'Chọn ít nhất một nơi hiển thị.');
      return;
    }
    savePost({ ...formData, slug, tag: tagList.join(', ') });
  };

  const savePost = async (payload) => {
    try {
      setSaving(true);
      if (isEdit) {
        await apiService.updateAdminPost(id, payload);
        alert(t.postsUpdateSuccess || 'Cập nhật bài viết thành công');
      } else {
        await apiService.createAdminPost(payload);
        alert(t.postsCreateSuccess || 'Tạo bài viết thành công');
      }
      navigate('/admin/posts');
      loadPosts();
    } catch (err) {
      alert(t.postsSaveError || 'Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    const slug = getMainSlug() || 'draft-' + Date.now();
    if (!hasAnyTitle()) {
      alert(t.postsTitleRequired || 'Vui lòng nhập tiêu đề (ít nhất một ngôn ngữ)');
      return;
    }
    if (!formData.visibilityMask) {
      alert(t.postsVisibilityRequired || 'Chọn ít nhất một nơi hiển thị.');
      return;
    }
    savePost({
      ...formData,
      slug,
      status: STATUS_DRAFT,
      tag: tagList.join(', '),
    });
  };

  const handlePublish = () => {
    const slug = getMainSlug() || 'post-' + Date.now();
    if (!hasAnyTitle()) {
      alert(t.postsTitleRequired || 'Vui lòng nhập tiêu đề (ít nhất một ngôn ngữ)');
      return;
    }
    if (!hasAnyContent()) {
      alert(t.postsContentRequired || 'Vui lòng nhập nội dung (ít nhất một ngôn ngữ)');
      return;
    }
    if (!formData.visibilityMask) {
      alert(t.postsVisibilityRequired || 'Chọn ít nhất một nơi hiển thị.');
      return;
    }
    let status = STATUS_PUBLISHED;
    let publishedAt = formData.publishedAt ? new Date(formData.publishedAt) : null;
    if (publishedAt && publishedAt > new Date()) status = STATUS_DRAFT;
    savePost({
      ...formData,
      slug,
      status,
      publishedAt: publishedAt ? publishedAt.toISOString() : new Date().toISOString(),
      tag: tagList.join(', '),
    });
  };

  const handleThumbnailUpload = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.type)) {
      alert('Chỉ cho phép ảnh: JPG, PNG, GIF, WEBP');
      return;
    }
    try {
      setUploadingThumbnail(true);
      const compressed = await compressThumbnailIfNeeded(file);
      const res = isEdit
        ? await apiService.uploadPostThumbnail(id, compressed)
        : await apiService.uploadPostTempThumbnail(compressed);
      if (res?.success && res?.data) {
        setFormData((prev) => ({ ...prev, thumbnail: res.data.key }));
        setThumbnailPreviewUrl(res.data.url || null);
      }
    } catch (err) {
      alert('Lỗi upload thumbnail: ' + (err.message || ''));
    } finally {
      setUploadingThumbnail(false);
      if (thumbnailImageInputRef.current) thumbnailImageInputRef.current.value = '';
    }
  };

  const previewTitle =
    (activeLang === 'vi' ? formData.title : activeLang === 'en' ? formData.titleEn : formData.titleJa) ||
    formData.title || formData.titleEn || formData.titleJa || '';
  const previewContent =
    (activeLang === 'vi' ? formData.content : activeLang === 'en' ? formData.contentEn : formData.contentJa) ||
    formData.content || formData.contentEn || formData.contentJa || '';

  const handleDelete = async (postId) => {
    if (!confirm(t.postsDeleteConfirm || 'Bạn có chắc muốn xóa bài viết này?')) return;
    try {
      await apiService.deleteAdminPost(postId);
      alert(t.postsDeleteSuccess || 'Xóa bài viết thành công');
      loadPosts();
    } catch (err) {
      alert(t.postsDeleteError || 'Lỗi: ' + err.message);
    }
  };

  const handleAddTag = () => {
    const tagn = tagInput.trim();
    if (tagn && !tagList.includes(tagn)) {
      setTagList([...tagList, tagn]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagn) => {
    setTagList(tagList.filter((x) => x !== tagn));
  };

  if (!isList) {
    if (loading && isEdit) {
      return (
        <div className="flex flex-col h-full items-center justify-center min-h-[320px]" style={{ backgroundColor: '#FFFAFA' }}>
          <span className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#dc2626' }} />
          <p className="mt-3 text-xs font-medium text-gray-500">{t.loading || 'Đang tải...'}</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full min-h-0" style={{ backgroundColor: '#FFFAFA' }}>
        {/* Thanh hành động: Quay lại + Xem trước / Lưu nháp / Xuất bản */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 py-3 border-b px-1" style={{ borderColor: '#e5e7eb', backgroundColor: 'white' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/posts')}
            className="flex items-center gap-2 text-xs font-medium rounded-full px-3 py-1.5 transition-colors hover:bg-gray-100"
            style={{ color: '#4b5563' }}
          >
            <X className="w-3.5 h-3.5" />
            {t.postsBackToList || 'Quay lại danh sách'}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border"
              style={{ borderColor: '#e5e7eb', color: '#374151', backgroundColor: 'white' }}
            >
              <EyeIcon className="w-3.5 h-3.5" />
              {t.postsPreview || 'Xem trước'}
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
            >
              {t.postsSaveDraft || 'Lưu nháp'}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#dc2626' }}
            >
              {t.postsPublish || 'Xuất bản'}
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto min-h-0 py-5">
          <div className="max-w-6xl mx-auto px-1">
            <h1 className="text-base font-bold mb-4" style={{ color: '#111827' }}>
              {isEdit ? (t.postsEditTitle || 'Chỉnh sửa bài viết') : (t.postsCreateTitle || 'Tạo bài viết mới')}
            </h1>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Cột trái: Nội dung chính */}
              <div className="lg:col-span-2 flex flex-col gap-5">
                {/* Tab ngôn ngữ */}
                <div className="rounded-xl border p-1.5 flex gap-1 bg-white" style={{ borderColor: '#e5e7eb' }}>
                  {LANGS.map((lang) => (
                    <button
                      key={lang.key}
                      type="button"
                      onClick={() => setActiveLang(lang.key)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                        activeLang === lang.key
                          ? 'text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      style={activeLang === lang.key ? { backgroundColor: '#dc2626' } : {}}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>

                {/* Tiêu đề */}
                <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#e5e7eb' }}>
                  <label className="block">
                    <span className="text-xs font-semibold block mb-1.5" style={{ color: '#374151' }}>
                      {t.postsTitleLabel || 'Tiêu đề bài viết'}
                    </span>
                    <input
                      type="text"
                      value={activeLang === 'vi' ? formData.title : activeLang === 'en' ? formData.titleEn : formData.titleJa}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          ...(activeLang === 'vi' && { title: nextVal }),
                          ...(activeLang === 'en' && { titleEn: nextVal }),
                          ...(activeLang === 'ja' && { titleJa: nextVal }),
                        }));
                      }}
                      className="w-full rounded-lg border h-9 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      style={{ borderColor: '#e5e7eb', color: '#111827' }}
                      placeholder={t.postsTitlePlaceholder || 'Nhập tiêu đề'}
                    />
                  </label>
                </div>

                {/* Nội dung */}
                <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: '#e5e7eb' }}>
                    <span className="text-xs font-semibold" style={{ color: '#374151' }}>
                      {t.postsContentLabel || 'Nội dung chính'}
                    </span>
                  </div>
                  <div>
                    <RichTextEditor
                      key={`${activeLang}-${id || 'new'}`}
                      value={activeLang === 'vi' ? formData.content : activeLang === 'en' ? formData.contentEn : formData.contentJa}
                      langKey={activeLang}
                      onChange={(lang, html) =>
                        setFormData((prev) => ({
                          ...prev,
                          ...(lang === 'vi' && { content: html }),
                          ...(lang === 'en' && { contentEn: html }),
                          ...(lang === 'ja' && { contentJa: html }),
                        }))
                      }
                      placeholder={t.postsContentPlaceholder || 'Nhập nội dung...'}
                      postId={isEdit ? id : undefined}
                    />
                  </div>
                </div>

                {/* Ảnh đại diện */}
                <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#e5e7eb' }}>
                  <span className="text-xs font-semibold block mb-2" style={{ color: '#374151' }}>
                    {t.postsImageLabel || 'Ảnh đại diện'}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      ref={thumbnailImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => thumbnailImageInputRef.current?.click()}
                      disabled={uploadingThumbnail}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      {uploadingThumbnail ? (t.loading || 'Đang tải...') : (t.postsUploadImage || 'Upload từ thiết bị')}
                    </button>
                    <input
                      type="text"
                      value={formData.thumbnail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, thumbnail: e.target.value }))}
                      className="flex-1 min-w-[160px] rounded-lg border h-9 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      style={{ borderColor: '#e5e7eb' }}
                      placeholder="Hoặc dán URL ảnh..."
                    />
                  </div>
                  {(formData.thumbnail || thumbnailPreviewUrl) && (
                    <div className="mt-3">
                      <img
                        src={thumbnailPreviewUrl || normalizePostImageUrl(formData.thumbnail)}
                        alt="Ảnh đại diện"
                        className="max-h-40 w-full rounded-lg border object-cover"
                        style={{ borderColor: '#e5e7eb' }}
                        onError={(e) => (e.target.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar phải */}
              <aside className="flex flex-col gap-5">
                {/* Xuất bản */}
                <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#e5e7eb' }}>
                  <h3 className="text-xs font-bold mb-3" style={{ color: '#111827' }}>
                    {t.postsPublishBox || 'Xuất bản'}
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="publishAction"
                        checked={!formData.publishedAt}
                        onChange={() => setFormData((prev) => ({ ...prev, publishedAt: '' }))}
                        className="w-3.5 h-3.5"
                        style={{ accentColor: '#dc2626' }}
                      />
                      <span className="text-xs font-medium text-gray-700">{t.postsPublishNow || 'Xuất bản ngay'}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="publishAction"
                        checked={!!formData.publishedAt}
                        onChange={() => {
                          setFormData((prev) => {
                            if (prev.publishedAt) return prev;
                            const now = new Date();
                            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                            return { ...prev, publishedAt: now.toISOString().slice(0, 16) };
                          });
                        }}
                        className="w-3.5 h-3.5"
                        style={{ accentColor: '#dc2626' }}
                      />
                      <span className="text-xs font-medium text-gray-700">{t.postsSchedule || 'Lên lịch sau'}</span>
                    </label>
                    {formData.publishedAt && (
                      <input
                        type="datetime-local"
                        value={formData.publishedAt}
                        onChange={(e) => setFormData((prev) => ({ ...prev, publishedAt: e.target.value }))}
                        className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        style={{ borderColor: '#e5e7eb' }}
                      />
                    )}
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#e5e7eb' }}>
                  <h3 className="text-xs font-bold mb-2" style={{ color: '#111827' }}>
                    {t.postsVisibilityTitle || 'Where to show'}
                  </h3>
                  <p className="text-[11px] text-gray-500 mb-2.5">{t.postsVisibilityHint || ''}</p>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-3.5 h-3.5 shrink-0"
                        style={{ accentColor: '#dc2626' }}
                        checked={(formData.visibilityMask & POST_VISIBILITY_AGENT_HOME) !== 0}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            visibilityMask: toggleVisibilityMask(
                              prev.visibilityMask,
                              POST_VISIBILITY_AGENT_HOME,
                              e.target.checked
                            )
                          }))
                        }
                      />
                      <span className="text-xs text-gray-700">{t.postsVisibilityAgentHome}</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-3.5 h-3.5 shrink-0"
                        style={{ accentColor: '#dc2626' }}
                        checked={(formData.visibilityMask & POST_VISIBILITY_PUBLIC_CTV) !== 0}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            visibilityMask: toggleVisibilityMask(
                              prev.visibilityMask,
                              POST_VISIBILITY_PUBLIC_CTV,
                              e.target.checked
                            )
                          }))
                        }
                      />
                      <span className="text-xs text-gray-700">{t.postsVisibilityPublicCtv}</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-3.5 h-3.5 shrink-0"
                        style={{ accentColor: '#dc2626' }}
                        checked={(formData.visibilityMask & POST_VISIBILITY_PUBLIC_CANDIDATE) !== 0}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            visibilityMask: toggleVisibilityMask(
                              prev.visibilityMask,
                              POST_VISIBILITY_PUBLIC_CANDIDATE,
                              e.target.checked
                            )
                          }))
                        }
                      />
                      <span className="text-xs text-gray-700">{t.postsVisibilityPublicCandidate}</span>
                    </label>
                  </div>
                </div>

                {/* Phân loại & Tags */}
                <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#e5e7eb' }}>
                  <h3 className="text-xs font-bold mb-2" style={{ color: '#111827' }}>
                    {t.postsCategoryLabel || 'Phân loại'}
                  </h3>
                  <p className="text-[11px] font-medium text-gray-500 mb-1.5">{t.postsQuickCategory || 'Chọn nhanh danh mục'}</p>
                  {categoriesLoading ? (
                    <div className="py-2 mb-3 text-[11px] text-gray-500 flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#dc2626' }} />
                      {t.loading || 'Đang tải...'} {t.category || 'danh mục'}
                    </div>
                  ) : categories.length === 0 ? (
                    <p className="text-[11px] text-gray-500 py-2 mb-3">{t.postsNoCategories || 'Chưa có danh mục. Không load được danh sách category.'}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {categories.map((c) => {
                        const isEventCat = c.slug === 'su-kien' || (c.slug && c.slug.toLowerCase() === 'event');
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setFormData((prev) => ({
                              ...prev,
                              categoryId: String(c.id),
                              ...(isEventCategory && !isEventCat ? { eventId: '' } : {}),
                            }))}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                              formData.categoryId === String(c.id) ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            style={formData.categoryId === String(c.id) ? { backgroundColor: '#dc2626' } : {}}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <label className="block mb-3">
                    <span className="text-[11px] font-medium text-gray-600 block mb-0.5">{t.category || 'Danh mục'}</span>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => {
                        const newCategoryId = e.target.value;
                        const newCategory = categories.find((c) => String(c.id) === newCategoryId);
                        const wasEvent = isEventCategory;
                        const willBeEvent = newCategory && (newCategory.slug === 'su-kien' || (newCategory.slug && newCategory.slug.toLowerCase() === 'event'));
                        setFormData((prev) => ({
                          ...prev,
                          categoryId: newCategoryId,
                          ...(wasEvent && !willBeEvent ? { eventId: '' } : {}),
                        }));
                      }}
                      disabled={categoriesLoading}
                      className="w-full rounded-lg border h-9 px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ borderColor: '#e5e7eb' }}
                    >
                      <option value="">{categoriesLoading ? (t.loading || 'Đang tải...') : (t.postsSelectCategory || 'Chọn danh mục')}</option>
                      {!categoriesLoading && categories.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isEventCategory && (
                    <label className="block mb-3">
                      <span className="text-[11px] font-medium text-gray-600 block mb-0.5">{t.postsEventLinkLabel || 'Sự kiện liên kết'}</span>
                      <select
                        value={formData.eventId}
                        onChange={(e) => setFormData((prev) => ({ ...prev, eventId: e.target.value }))}
                        disabled={eventsLoading}
                        className="w-full rounded-lg border h-9 px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ borderColor: '#e5e7eb' }}
                      >
                        <option value="">{eventsLoading ? (t.loading || 'Đang tải...') : (t.postsSelectEvent || 'Chọn sự kiện')}</option>
                        {!eventsLoading && eventsList.map((ev) => (
                          <option key={ev.id} value={String(ev.id)}>
                            {ev.title || ev.name || `Sự kiện #${ev.id}`}
                            {ev.start_at || ev.startAt ? ` (${new Date(ev.start_at || ev.startAt).toLocaleDateString('vi-VN')})` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block">
                    <span className="text-[11px] font-medium text-gray-600 block mb-0.5">{t.postsTagsLabel || 'Tags'}</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        className="flex-1 rounded-lg border h-9 px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        style={{ borderColor: '#e5e7eb' }}
                        placeholder={t.postsTagsPlaceholder || 'Thêm tag...'}
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-white text-xs font-medium hover:opacity-90 shrink-0"
                        style={{ backgroundColor: '#dc2626' }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {tagList.map((tagn) => (
                        <span
                          key={tagn}
                          className="inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}
                        >
                          {tagn}
                          <button type="button" onClick={() => handleRemoveTag(tagn)} className="hover:opacity-80 rounded-full p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </label>
                </div>

                {/* SEO (thu gọn) */}
                <details className="rounded-xl border bg-white overflow-hidden group" style={{ borderColor: '#e5e7eb' }}>
                  <summary className="cursor-pointer list-none px-4 py-3 font-bold text-xs flex items-center justify-between hover:bg-gray-50/50">
                    <span style={{ color: '#111827' }}>{t.postsSeoTitle || 'Cài đặt SEO'}</span>
                    <span className="text-gray-400 text-[10px] group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="px-4 pb-4 pt-0 space-y-3 border-t" style={{ borderColor: '#e5e7eb' }}>
                    <label className="block pt-3">
                      <span className="text-[11px] font-medium text-gray-600 block mb-0.5">Meta Title</span>
                      <input
                        type="text"
                        value={activeLang === 'vi' ? formData.metaTitle : activeLang === 'en' ? formData.metaTitleEn : formData.metaTitleJa}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            ...(activeLang === 'vi' && { metaTitle: nextVal }),
                            ...(activeLang === 'en' && { metaTitleEn: nextVal }),
                            ...(activeLang === 'ja' && { metaTitleJa: nextVal }),
                          }));
                        }}
                        className="w-full rounded-lg border h-9 px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        style={{ borderColor: '#e5e7eb' }}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-medium text-gray-600 block mb-0.5">Meta Description</span>
                      <textarea
                        value={activeLang === 'vi' ? formData.metaDescription : activeLang === 'en' ? formData.metaDescriptionEn : formData.metaDescriptionJa}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            ...(activeLang === 'vi' && { metaDescription: nextVal }),
                            ...(activeLang === 'en' && { metaDescriptionEn: nextVal }),
                            ...(activeLang === 'ja' && { metaDescriptionJa: nextVal }),
                          }));
                        }}
                        className="w-full rounded-lg border min-h-16 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        style={{ borderColor: '#e5e7eb' }}
                        rows={3}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-medium text-gray-600 block mb-0.5">{t.postsSlugLabel || 'URL (slug)'}</span>
                      <input
                        type="text"
                        value={
                          (activeLang === 'vi' ? formData.slug : activeLang === 'en' ? formData.slugEn : formData.slugJa) ||
                          buildSlug(activeLang === 'vi' ? formData.title : activeLang === 'en' ? formData.titleEn : formData.titleJa)
                        }
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            ...(activeLang === 'vi' && { slug: nextVal }),
                            ...(activeLang === 'en' && { slugEn: nextVal }),
                            ...(activeLang === 'ja' && { slugJa: nextVal }),
                          }));
                        }}
                        className="w-full rounded-lg border h-9 px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        style={{ borderColor: '#e5e7eb' }}
                        placeholder="slug-bai-viet"
                      />
                    </label>
                  </div>
                </details>
              </aside>
            </form>

            {/* Modal xem trước */}
            {showPreview && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                onClick={() => setShowPreview(false)}
              >
                <div
                  className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#e5e7eb' }}>
                    <h3 className="text-sm font-bold" style={{ color: '#111827' }}>{t.postsPreview || 'Xem trước'}</h3>
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 prose prose-gray max-w-none text-xs prose-p:text-xs prose-headings:text-sm prose-h1:text-lg">
                    {(formData.thumbnail || thumbnailPreviewUrl) && (
                      <img
                        src={thumbnailPreviewUrl || normalizePostImageUrl(formData.thumbnail)}
                        alt={previewTitle}
                        className="w-full rounded-lg object-cover max-h-48 mb-3"
                        onError={(e) => (e.target.style.display = 'none')}
                      />
                    )}
                    <h1 className="text-lg font-bold text-gray-900 mb-3">{previewTitle || '(Chưa có tiêu đề)'}</h1>
                    <div
                      className="post-preview-content text-gray-700"
                      dangerouslySetInnerHTML={{ __html: previewContent || '<p class="text-gray-400">(Chưa có nội dung)</p>' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0" style={{ backgroundColor: '#FFFAFA' }}>
      <div className="flex-shrink-0 flex justify-between items-center py-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#111827' }}>{t.adminPostManagement || 'Quản lý bài viết'}</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>{t.postsSubtitle || 'Danh sách bài viết và tin tức'}</p>
        </div>
        <button
          onClick={() => navigate('/admin/posts/create')}
          className="flex items-center justify-center gap-2 min-w-[140px] h-10 px-4 rounded-full text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#dc2626' }}
        >
          <Plus className="w-5 h-5" />
          <span>{t.postsCreateButton || 'Tạo bài viết'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="rounded-xl border bg-white p-12 text-center" style={{ borderColor: '#e5e7eb' }}>
            <span className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin block mx-auto" style={{ borderColor: '#dc2626' }} />
            <p className="mt-3 text-sm text-gray-500">{t.loading || 'Đang tải...'}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center" style={{ borderColor: '#e5e7eb' }}>
            <FileText className="w-14 h-14 mx-auto mb-4" style={{ color: '#d1d5db' }} />
            <p className="text-lg font-semibold mb-1" style={{ color: '#374151' }}>{t.postsEmpty || 'Chưa có bài viết nào'}</p>
            <p className="text-sm mb-5" style={{ color: '#9ca3af' }}>{t.postsEmptyHint || 'Bấm "Tạo bài viết" để bắt đầu'}</p>
            <button
              onClick={() => navigate('/admin/posts/create')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold hover:opacity-90"
              style={{ backgroundColor: '#dc2626' }}
            >
              <Plus className="w-4 h-4" />
              {t.postsCreateButton || 'Tạo bài viết'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-xl border overflow-hidden group hover:shadow-md transition-shadow"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <div className="relative h-48 bg-gray-100 overflow-hidden">
                    {post.thumbnail ? (
                      <img
                        src={normalizePostImageUrl(post.thumbnail)}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => (e.target.style.display = 'none')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <FileText className="w-14 h-14 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${
                          post.status === STATUS_PUBLISHED ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                        }`}
                      >
                        {post.status === STATUS_PUBLISHED ? (t.postsStatusPublished || 'Xuất bản') : (t.postsStatusDraft || 'Nháp')}
                      </span>
                    </div>
                    {post.category && (
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/90 text-gray-700 shadow-sm">
                          {post.category.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 min-h-[3rem]">{post.title}</h3>
                    {(post.publishedAt || post.createdAt) && (
                      <div className="flex items-center gap-1 mb-2 text-gray-500 text-xs">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{post.viewCount ?? 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => navigate(`/admin/posts/${post.id}/edit`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold"
                      >
                        <Pencil className="w-4 h-4" />
                        <span>{t.postsEditButton || 'Sửa'}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{t.postsDeleteButton || 'Xóa'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => loadPosts(pagination.page - 1)}
                  className="px-4 py-2 rounded-full border bg-white text-sm font-semibold disabled:opacity-50 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#e5e7eb', color: '#374151' }}
                >
                  {t.previous || 'Trước'}
                </button>
                <span className="px-4 py-2 text-sm font-medium text-gray-600">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadPosts(pagination.page + 1)}
                  className="px-4 py-2 rounded-full border bg-white text-sm font-semibold disabled:opacity-50 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#e5e7eb', color: '#374151' }}
                >
                  {t.next || 'Sau'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
