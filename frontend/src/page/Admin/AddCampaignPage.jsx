import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService, { normalizePostImageUrl } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import {
  ArrowLeft,
  Target,
  Calendar,
  FileText,
  Save,
  X,
  Clock,
  TrendingUp,
  Users,
  Briefcase,
  Image as ImageIcon,
} from 'lucide-react';

const LANG_TABS = [
  { key: 'vi', labelKey: 'addCampaignLangVi' },
  { key: 'en', labelKey: 'addCampaignLangEn' },
  { key: 'ja', labelKey: 'addCampaignLangJa' },
];

const AddCampaignPage = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [activeLangTab, setActiveLangTab] = useState('vi');
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    nameJp: '',
    description: '',
    descriptionEn: '',
    descriptionJp: '',
    status: 0,
    startDate: '',
    endDate: '',
    maxCv: 0,
    percent: 0,
    isActive: false,
    autoStart: false,
    autoEnd: false,
    coverUrl: '',
  });
  const [coverUploading, setCoverUploading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);
  const [hoveredJobItemIndex, setHoveredJobItemIndex] = useState(null);
  const [hoveredRemoveJobButtonIndex, setHoveredRemoveJobButtonIndex] = useState(null);

  useEffect(() => {
    loadJobs(''); // Load all jobs initially
    if (campaignId) {
      loadCampaignData();
    }
  }, [campaignId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showJobDropdown && !event.target.closest('.job-search-container')) {
        setShowJobDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showJobDropdown]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAdminCampaignById(campaignId);
      if (response.success && response.data?.campaign) {
        const campaign = response.data.campaign;
        setFormData({
          name: campaign.name || '',
          nameEn: campaign.nameEn || campaign.name_en || '',
          nameJp: campaign.nameJp || campaign.name_jp || '',
          description: campaign.description || '',
          descriptionEn: campaign.descriptionEn || campaign.description_en || '',
          descriptionJp: campaign.descriptionJp || campaign.description_jp || '',
          status: campaign.status !== undefined ? campaign.status : 0,
          startDate: campaign.startDate || campaign.start_date 
            ? new Date(campaign.startDate || campaign.start_date).toISOString().split('T')[0]
            : '',
          endDate: campaign.endDate || campaign.end_date
            ? new Date(campaign.endDate || campaign.end_date).toISOString().split('T')[0]
            : '',
          maxCv: campaign.maxCv || campaign.max_cv || 0,
          percent: campaign.percent || 0,
          isActive: campaign.status === 1,
          autoStart: false,
          autoEnd: false,
          coverUrl: campaign.coverUrl || campaign.cover_url || '',
        });
        
        // Load selected jobs
        if (campaign.jobCampaigns && campaign.jobCampaigns.length > 0) {
          const jobIds = campaign.jobCampaigns.map(jc => jc.jobId || jc.job?.id).filter(Boolean);
          setSelectedJobIds(jobIds.map(id => id.toString()));
          // Also load these jobs into the jobs list for display
          const selectedJobs = campaign.jobCampaigns
            .map(jc => jc.job)
            .filter(Boolean);
          if (selectedJobs.length > 0) {
            setJobs(prev => {
              const existingIds = prev.map(j => j.id);
              const newJobs = selectedJobs.filter(j => !existingIds.includes(j.id));
              return [...prev, ...newJobs];
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
      alert(t.addCampaignErrorLoad || 'Lỗi khi tải thông tin chiến dịch');
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async (search = '') => {
    try {
      const collected = [];
      let cursor = null;
      const limit = 50;
      const searchTrim = (search || '').trim();
      for (let i = 0; i < 10 && collected.length < 200; i += 1) {
        const params = {
          limit,
          status: 1,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        };
        if (searchTrim) params.search = searchTrim;
        if (cursor) params.cursor = cursor;
        const response = await apiService.getAdminJobs(params);
        if (!response.success || !response.data?.jobs?.length) break;
        collected.push(...response.data.jobs);
        const pag = response.data.pagination || {};
        if (!pag.hasMore || !pag.nextCursor) break;
        cursor = pag.nextCursor;
      }
      setJobs(collected);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (!jobSearchQuery) return true;
    const query = jobSearchQuery.toLowerCase();
    return (
      job.jobCode?.toLowerCase().includes(query) ||
      job.title?.toLowerCase().includes(query)
    );
  });

  const handleJobSearch = (e) => {
    const query = e.target.value;
    setJobSearchQuery(query);
    setShowJobDropdown(true);
    if (query.length > 0) {
      loadJobs(query);
    }
  };

  const handleSelectJob = (job) => {
    if (!selectedJobIds.includes(job.id.toString())) {
      setSelectedJobIds([...selectedJobIds, job.id.toString()]);
    }
    setJobSearchQuery('');
    setShowJobDropdown(false);
  };

  const handleRemoveJob = (jobId) => {
    setSelectedJobIds(selectedJobIds.filter(id => id !== jobId.toString()));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = t.addCampaignValidationNameRequired || 'Tên chiến dịch là bắt buộc';
    }

    if (!formData.description || !formData.description.trim()) {
      newErrors.description = t.addCampaignValidationDescriptionRequired || 'Mô tả là bắt buộc';
    }

    if (!formData.startDate) {
      newErrors.startDate = t.addCampaignValidationStartDateRequired || 'Ngày bắt đầu là bắt buộc';
    }

    if (!formData.endDate) {
      newErrors.endDate = t.addCampaignValidationEndDateRequired || 'Ngày kết thúc là bắt buộc';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (start >= end) {
        newErrors.endDate = t.addCampaignValidationEndDateAfterStart || 'Ngày kết thúc phải sau ngày bắt đầu';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const submitData = {
        name: formData.name,
        nameEn: formData.nameEn || null,
        nameJp: formData.nameJp || null,
        description: formData.description,
        descriptionEn: formData.descriptionEn || null,
        descriptionJp: formData.descriptionJp || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxCv: parseInt(formData.maxCv) || 0,
        percent: parseInt(formData.percent) || 0,
        status: formData.isActive ? 1 : formData.status,
        jobIds: selectedJobIds.map(id => parseInt(id))
      };

      const response = campaignId 
        ? await apiService.updateAdminCampaign(campaignId, submitData)
        : await apiService.createAdminCampaign(submitData);
      
      if (response.success) {
        alert(campaignId ? (t.addCampaignUpdateSuccess || 'Chiến dịch đã được cập nhật thành công!') : (t.addCampaignCreateSuccess || 'Chiến dịch đã được tạo thành công!'));
        const newId = response.data?.campaign?.id;
        if (campaignId) {
          navigate(`/admin/campaigns/${campaignId}`);
        } else if (newId) {
          navigate(`/admin/campaigns/${newId}/edit`);
        } else {
          navigate('/admin/campaigns');
        }
      } else {
        alert(response.message || (campaignId ? (t.addCampaignErrorUpdate || 'Có lỗi xảy ra khi cập nhật chiến dịch') : (t.addCampaignErrorCreate || 'Có lỗi xảy ra khi tạo chiến dịch')));
      }
    } catch (error) {
      console.error(`Error ${campaignId ? 'updating' : 'creating'} campaign:`, error);
      alert(error.message || (campaignId ? (t.addCampaignErrorUpdate || 'Có lỗi xảy ra khi cập nhật chiến dịch') : (t.addCampaignErrorCreate || 'Có lỗi xảy ra khi tạo chiến dịch')));
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId) return;
    try {
      setCoverUploading(true);
      const res = await apiService.uploadAdminCampaignCover(campaignId, file);
      if (res?.success && res.data?.campaign) {
        const cu = res.data.campaign.coverUrl ?? res.data.key ?? '';
        setFormData((prev) => ({ ...prev, coverUrl: cu }));
      } else {
        alert(res?.message || 'Upload ảnh cover thất bại');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Upload ảnh cover thất bại');
    } finally {
      setCoverUploading(false);
      e.target.value = '';
    }
  };

  const handleCancel = () => {
    if (window.confirm(t.addCampaignConfirmCancel || 'Bạn có chắc muốn hủy? Dữ liệu chưa lưu sẽ bị mất.')) {
      navigate(campaignId ? `/admin/campaigns/${campaignId}` : '/admin/campaigns');
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-lg p-4 border flex items-center justify-between" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(campaignId ? `/admin/campaigns/${campaignId}` : '/admin/campaigns')}
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
            <h1 className="text-lg font-bold" style={{ color: '#111827' }}>{campaignId ? (t.addCampaignPageTitleEdit || 'Chỉnh sửa chiến dịch') : (t.addCampaignPageTitleCreate || 'Tạo chiến dịch')}</h1>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{campaignId ? (t.addCampaignPageSubtitleEdit || 'Cập nhật thông tin chiến dịch') : (t.addCampaignPageSubtitleCreate || 'Thêm thông tin chiến dịch tuyển dụng mới vào hệ thống')}</p>
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
            {t.cancelButton || 'Hủy'}
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
            {loading ? (campaignId ? (t.updatingLabel || 'Đang cập nhật...') : (t.savingLabel || 'Đang lưu...')) : (campaignId ? (t.updateCampaignButton || 'Cập nhật chiến dịch') : (t.saveCampaignButton || 'Lưu chiến dịch'))}
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left Column */}
        <div className="space-y-3">
          {/* Basic Information */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Target className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.addCampaignBasicInfo || 'Thông tin cơ bản'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  {t.campaignColStatus || 'Trạng thái'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: parseInt(e.target.value) }))}
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
                >
                  <option value="0">{t.campaignStatusLabelInactive || 'Ngừng hoạt động'}</option>
                  <option value="1">{t.campaignStatusLabelActive || 'Đang hoạt động'}</option>
                  <option value="2">{t.campaignStatusLabelEnded || 'Đã kết thúc'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#111827' }}>
                  <ImageIcon className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                  {t.addCampaignCoverLabel || 'Ảnh cover'}
                </label>
                {!campaignId ? (
                  <p className="text-[11px]" style={{ color: '#6b7280' }}>
                    {t.addCampaignCoverHintCreate || 'Lưu chiến dịch trước; sau đó bạn có thể tải ảnh cover tại đây.'}
                  </p>
                ) : (
                  <>
                    {formData.coverUrl ? (
                      <div className="mb-2 overflow-hidden rounded-lg border" style={{ borderColor: '#e5e7eb' }}>
                        <img
                          src={normalizePostImageUrl(formData.coverUrl)}
                          alt=""
                          className="max-h-40 w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      disabled={coverUploading || loading}
                      onChange={handleCampaignCoverChange}
                      className="block w-full text-[11px] file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1"
                    />
                    {coverUploading ? (
                      <p className="mt-1 text-[11px]" style={{ color: '#2563eb' }}>
                        {t.uploadingLabel || 'Đang tải...'}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
              {/* Language tabs for name & description */}
              <div className="flex gap-1 border-b pb-2" style={{ borderColor: '#e5e7eb' }}>
                {LANG_TABS.map(({ key, labelKey }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveLangTab(key)}
                    className="px-3 py-1.5 rounded text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: activeLangTab === key ? '#2563eb' : '#f3f4f6',
                      color: activeLangTab === key ? 'white' : '#374151'
                    }}
                  >
                    {t[labelKey] || key}
                  </button>
                ))}
              </div>
              {activeLangTab === 'vi' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {t.addCampaignNameLabel || 'Tên chiến dịch'} (Vi) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={t.addCampaignNamePlaceholder || 'VD: Chiến dịch Tuyển dụng Mùa Xuân 2025'}
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
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {t.addCampaignDescriptionLabel || 'Mô tả chiến dịch'} (Vi) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder={t.addCampaignDescriptionPlaceholder || 'Mô tả chi tiết...'}
                      rows="5"
                      className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
                      style={{
                        borderColor: errors.description ? '#ef4444' : '#d1d5db',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors.description ? '#ef4444' : '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    {errors.description && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.description}</p>}
                  </div>
                </>
              )}
              {activeLangTab === 'en' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {t.addCampaignNameLabel || 'Campaign name'} (En)
                    </label>
                    <input
                      type="text"
                      name="nameEn"
                      value={formData.nameEn}
                      onChange={handleInputChange}
                      placeholder={t.addCampaignNamePlaceholder || 'e.g. Spring 2025 Recruitment Campaign'}
                      className="w-full px-3 py-2 border rounded-lg text-xs"
                      style={{ borderColor: '#d1d5db', outline: 'none' }}
                      onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {t.addCampaignDescriptionLabel || 'Campaign description'} (En)
                    </label>
                    <textarea
                      name="descriptionEn"
                      value={formData.descriptionEn}
                      onChange={handleInputChange}
                      placeholder={t.addCampaignDescriptionPlaceholder || 'Detailed description...'}
                      rows="5"
                      className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
                      style={{ borderColor: '#d1d5db', outline: 'none' }}
                      onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </>
              )}
              {activeLangTab === 'ja' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {t.addCampaignNameLabel || 'キャンペーン名'} (Ja)
                    </label>
                    <input
                      type="text"
                      name="nameJp"
                      value={formData.nameJp}
                      onChange={handleInputChange}
                      placeholder={t.addCampaignNamePlaceholder || '例：2025年春採用キャンペーン'}
                      className="w-full px-3 py-2 border rounded-lg text-xs"
                      style={{ borderColor: '#d1d5db', outline: 'none' }}
                      onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                      {t.addCampaignDescriptionLabel || 'キャンペーン説明'} (Ja)
                    </label>
                    <textarea
                      name="descriptionJp"
                      value={formData.descriptionJp}
                      onChange={handleInputChange}
                      placeholder={t.addCampaignDescriptionPlaceholder || '説明...'}
                      rows="5"
                      className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
                      style={{ borderColor: '#d1d5db', outline: 'none' }}
                      onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Time Period */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Calendar className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.addCampaignTimeSection || 'Thời gian chiến dịch'}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {t.addCampaignStartDateLabel || 'Ngày bắt đầu'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
                      style={{
                        borderColor: errors.startDate ? '#ef4444' : '#d1d5db',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors.startDate ? '#ef4444' : '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    {errors.startDate && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.startDate}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {t.addCampaignEndDateLabel || 'Ngày kết thúc'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      required
                      min={formData.startDate}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
                      style={{
                        borderColor: errors.endDate ? '#ef4444' : '#d1d5db',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors.endDate ? '#ef4444' : '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    {errors.endDate && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.endDate}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="autoStart"
                    checked={formData.autoStart}
                    onChange={handleInputChange}
                    className="w-3.5 h-3.5 rounded"
                    style={{
                      accentColor: '#2563eb',
                      borderColor: '#d1d5db'
                    }}
                  />
                  <label className="text-xs font-semibold" style={{ color: '#111827' }}>
                    {t.addCampaignAutoStartLabel || 'Tự động kích hoạt khi đến ngày bắt đầu'}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="autoEnd"
                    checked={formData.autoEnd}
                    onChange={handleInputChange}
                    className="w-3.5 h-3.5 rounded"
                    style={{
                      accentColor: '#2563eb',
                      borderColor: '#d1d5db'
                    }}
                  />
                  <label className="text-xs font-semibold" style={{ color: '#111827' }}>
                    {t.addCampaignAutoEndLabel || 'Tự động kết thúc khi đến ngày kết thúc'}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Settings */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Target className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.addCampaignSettingsSection || 'Cài đặt chiến dịch'}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                    {t.addCampaignMaxCvLabel || 'Số CV tối đa'}
                  </label>
                  <input
                    type="number"
                    name="maxCv"
                    value={formData.maxCv}
                    onChange={handleInputChange}
                    placeholder={t.addCampaignMaxCvPlaceholder || 'VD: 100'}
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
                    {t.addCampaignPercentLabel || 'Phần trăm (%)'}
                  </label>
                  <input
                    type="number"
                    name="percent"
                    value={formData.percent}
                    onChange={handleInputChange}
                    placeholder={t.addCampaignPercentPlaceholder || 'VD: 10'}
                    min="0"
                    max="100"
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
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Campaign Statistics Preview */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <TrendingUp className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.addCampaignStatsSection || 'Thống kê (Dự kiến)'}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3 border" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                    <span className="text-[10px] font-medium" style={{ color: '#1e40af' }}>{t.addCampaignJobCountLabel || 'Số job'}</span>
                  </div>
                  <div className="text-lg font-bold" style={{ color: '#1e3a8a' }}>{selectedJobIds.length}</div>
                  <p className="text-[10px] mt-1" style={{ color: '#1d4ed8' }}>{t.addCampaignJobsSelectedLabel || 'Công việc đã chọn'}</p>
                </div>
                <div className="rounded-lg p-3 border" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
                    <span className="text-[10px] font-medium" style={{ color: '#166534' }}>{t.addCampaignApplicationsLabel || 'Ứng tuyển'}</span>
                  </div>
                  <div className="text-lg font-bold" style={{ color: '#14532d' }}>0</div>
                  <p className="text-[10px] mt-1" style={{ color: '#15803d' }}>{t.addCampaignUpdatedLaterLabel || 'Sẽ được cập nhật sau'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3 border" style={{ backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: '#9333ea' }} />
                    <span className="text-[10px] font-medium" style={{ color: '#6b21a8' }}>{t.addCampaignNominationsLabel || 'Tiến cử'}</span>
                  </div>
                  <div className="text-lg font-bold" style={{ color: '#581c87' }}>0</div>
                  <p className="text-[10px] mt-1" style={{ color: '#7e22ce' }}>{t.addCampaignUpdatedLaterLabel || 'Sẽ được cập nhật sau'}</p>
                </div>
                <div className="rounded-lg p-3 border" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5" style={{ color: '#ea580c' }} />
                    <span className="text-[10px] font-medium" style={{ color: '#9a3412' }}>{t.addCampaignViewsLabel || 'Lượt xem'}</span>
                  </div>
                  <div className="text-lg font-bold" style={{ color: '#7c2d12' }}>0</div>
                  <p className="text-[10px] mt-1" style={{ color: '#c2410c' }}>{t.addCampaignUpdatedLaterLabel || 'Sẽ được cập nhật sau'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <FileText className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.addCampaignAdditionalInfo || 'Thông tin bổ sung'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  {t.addCampaignInternalNotesLabel || 'Ghi chú nội bộ'}
                </label>
                <textarea
                  name="notes"
                  placeholder={t.addCampaignInternalNotesPlaceholder || 'Ghi chú nội bộ về chiến dịch (chỉ admin mới thấy)...'}
                  rows="4"
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-3.5 h-3.5 rounded"
                  style={{
                    accentColor: '#2563eb',
                    borderColor: '#d1d5db'
                  }}
                />
                <label className="text-xs font-semibold" style={{ color: '#111827' }}>
                  {t.addCampaignActivateAfterCreateLabel || 'Kích hoạt chiến dịch ngay sau khi tạo'}
                </label>
              </div>
            </div>
          </div>

          {/* Jobs Selection */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Briefcase className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.addCampaignJobsSection || 'Công việc trong chiến dịch'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                  {t.addCampaignSearchJobsLabel || 'Tìm kiếm và chọn công việc'}
                </label>
                <div className="relative job-search-container">
                  <input
                    type="text"
                    value={jobSearchQuery}
                    onChange={handleJobSearch}
                    placeholder={t.addCampaignJobSearchPlaceholder || 'Nhập mã hoặc tên công việc để tìm kiếm...'}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{
                      borderColor: '#d1d5db',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                      setShowJobDropdown(true);
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {showJobDropdown && filteredJobs.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ backgroundColor: 'white', borderColor: '#d1d5db', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}>
                      {filteredJobs
                        .filter(job => !selectedJobIds.includes(job.id.toString()))
                        .map((job, index) => (
                          <div
                            key={job.id}
                            onClick={() => handleSelectJob(job)}
                            onMouseEnter={() => setHoveredJobItemIndex(index)}
                            onMouseLeave={() => setHoveredJobItemIndex(null)}
                            className="px-3 py-2 cursor-pointer border-b last:border-b-0"
                            style={{
                              backgroundColor: hoveredJobItemIndex === index ? '#eff6ff' : 'transparent',
                              borderColor: '#f3f4f6'
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-semibold" style={{ color: '#111827' }}>
                                  [{job.jobCode}] {job.title}
                                </p>
                                {job.company && (
                                  <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>
                                    {job.company.name}
                                  </p>
                                )}
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={
                                job.status === 1 
                                  ? { backgroundColor: '#dcfce7', color: '#166534' }
                                  : job.status === 0 
                                  ? { backgroundColor: '#f3f4f6', color: '#374151' }
                                  : { backgroundColor: '#fee2e2', color: '#991b1b' }
                              }>
                                {job.status === 1 ? (t.jobStatusPublished || 'Published') : job.status === 0 ? (t.jobStatusDraft || 'Draft') : (t.jobStatusClosed || 'Closed')}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>
                  {t.addCampaignJobSearchHint || 'Nhập mã hoặc tên công việc để tìm kiếm và chọn'}
                </p>
                {selectedJobIds.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold" style={{ color: '#111827' }}>
                      {t.addCampaignSelectedCountLabel || 'Đã chọn'} ({selectedJobIds.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedJobIds.map((jobId, index) => {
                        const job = jobs.find(j => j.id === parseInt(jobId));
                        return job ? (
                          <span
                            key={jobId}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border"
                            style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                          >
                            [{job.jobCode}] {job.title}
                            <button
                              type="button"
                              onClick={() => handleRemoveJob(jobId)}
                              onMouseEnter={() => setHoveredRemoveJobButtonIndex(index)}
                              onMouseLeave={() => setHoveredRemoveJobButtonIndex(null)}
                              className="rounded p-0.5 transition-colors"
                              style={{
                                color: hoveredRemoveJobButtonIndex === index ? '#1e40af' : '#1d4ed8',
                                backgroundColor: hoveredRemoveJobButtonIndex === index ? '#dbeafe' : 'transparent'
                              }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Campaign Settings */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              {t.addCampaignSettingsSection || 'Cài đặt chiến dịch'}
            </h2>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#111827' }}>{t.addCampaignSettingsNoteTitle || 'Lưu ý:'}</p>
                <ul className="text-[10px] space-y-1 list-disc list-inside" style={{ color: '#374151' }}>
                  <li>{t.addCampaignSettingsNote1 || 'Chiến dịch sẽ được hiển thị trên trang công khai sau khi được kích hoạt'}</li>
                  <li>{t.addCampaignSettingsNote2 || 'Bạn có thể chọn công việc để thêm vào chiến dịch ngay khi tạo'}</li>
                  <li>{t.addCampaignSettingsNote3 || 'Thống kê sẽ được cập nhật tự động khi có hoạt động'}</li>
                  <li>{t.addCampaignSettingsNote4 || 'Ngân sách có thể được điều chỉnh sau'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Action Buttons */}
      <div className="rounded-lg border p-4 flex items-center justify-end gap-3" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <button
          type="button"
          onClick={handleCancel}
          onMouseEnter={() => setHoveredCancelButton(true)}
          onMouseLeave={() => setHoveredCancelButton(false)}
          className="px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
          style={{
            backgroundColor: hoveredCancelButton ? '#e5e7eb' : '#f3f4f6',
            color: '#374151'
          }}
        >
          <X className="w-3.5 h-3.5" />
          {t.cancelButton || 'Hủy'}
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={loading}
          onMouseEnter={() => !loading && setHoveredSaveButton(true)}
          onMouseLeave={() => setHoveredSaveButton(false)}
          className="px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
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
          {loading ? (campaignId ? (t.updatingLabel || 'Đang cập nhật...') : (t.savingLabel || 'Đang lưu...')) : (campaignId ? (t.updateCampaignButton || 'Cập nhật chiến dịch') : (t.saveCampaignButton || 'Lưu chiến dịch'))}
        </button>
      </div>
    </div>
  );
};

export default AddCampaignPage;

