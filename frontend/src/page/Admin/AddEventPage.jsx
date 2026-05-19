import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import {
  Calendar as CalendarIcon,
  MapPin,
  FileText,
  Save,
  X,
  Clock,
} from 'lucide-react';

const toDatetimeLocal = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
};

const AddEventPage = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const isEdit = Boolean(eventId);
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    location: '',
    status: 1,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadInitial, setLoadInitial] = useState(!!eventId);

  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoadInitial(true);
      const response = await apiService.getAdminEventById(eventId);
      if (response.success && response.data?.event) {
        const evt = response.data.event;
        setFormData({
          title: evt.title || '',
          description: evt.description || '',
          startAt: toDatetimeLocal(evt.start_at ?? evt.startAt),
          endAt: toDatetimeLocal(evt.end_at ?? evt.endAt),
          location: evt.location || '',
          status: evt.status !== undefined ? Number(evt.status) : 1,
        });
      }
    } catch (error) {
      console.error('Error loading event:', error);
      alert(t.eventsLoadError || 'Không tải được thông tin sự kiện.');
      navigate('/admin/events');
    } finally {
      setLoadInitial(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'status') finalValue = value === '1' ? 1 : 0;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title?.trim()) {
      newErrors.title = t.eventsErrorTitleRequired || 'Vui lòng nhập tiêu đề sự kiện';
    }
    if (!formData.startAt) {
      newErrors.startAt = t.eventsErrorStartRequired || 'Vui lòng chọn thời gian bắt đầu';
    }
    if (formData.endAt && formData.startAt && new Date(formData.endAt) <= new Date(formData.startAt)) {
      newErrors.endAt = t.eventsErrorEndAfterStart || 'Thời gian kết thúc phải sau thời gian bắt đầu';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const toUTC = (v) => v ? new Date(v).toISOString() : null;
      const payload = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        start_at: toUTC(formData.startAt),
        end_at: toUTC(formData.endAt),
        location: formData.location?.trim() || null,
        status: formData.status,
      };

      if (isEdit) {
        const response = await apiService.updateAdminEvent(eventId, payload);
        if (response.success) {
          alert(response.message || t.eventsUpdateSuccess || 'Cập nhật sự kiện thành công.');
          navigate('/admin/events');
        } else {
          alert(response.message || t.eventsUpdateError || 'Cập nhật thất bại.');
        }
      } else {
        const response = await apiService.createAdminEvent(payload);
        if (response.success) {
          alert(response.message || t.eventsCreateSuccess || 'Tạo sự kiện thành công.');
          navigate('/admin/events');
        } else {
          alert(response.message || t.eventsCreateError || 'Tạo sự kiện thất bại.');
        }
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert(error.message || (isEdit ? t.eventsUpdateError : t.eventsCreateError) || 'Đã xảy ra lỗi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm(t.eventsConfirmCancel || 'Bạn có chắc muốn hủy? Thay đổi sẽ không được lưu.')) {
      navigate('/admin/events');
    }
  };

  if (loadInitial && isEdit) {
    return (
      <div className="flex items-center justify-center py-12 text-sm" style={{ color: '#6b7280' }}>
        {t.eventsLoading || 'Đang tải...'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Thông tin cơ bản */}
        <div className="rounded-lg border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
            <CalendarIcon className="w-4 h-4" style={{ color: '#2563eb' }} />
            {t.eventsFormBasicInfo || 'Thông tin sự kiện'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.eventsFormTitle || 'Tiêu đề'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg text-xs"
                style={{
                  borderColor: errors.title ? '#ef4444' : '#d1d5db',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.title ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder={t.eventsFormTitlePlaceholder || 'Nhập tiêu đề sự kiện'}
              />
              {errors.title && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.eventsFormStartAt || 'Thời gian bắt đầu'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="datetime-local"
                  name="startAt"
                  value={formData.startAt}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
                  style={{
                    borderColor: errors.startAt ? '#ef4444' : '#d1d5db',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.startAt ? '#ef4444' : '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              {errors.startAt && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.startAt}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.eventsFormEndAt || 'Thời gian kết thúc'}
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="datetime-local"
                  name="endAt"
                  value={formData.endAt}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
                  style={{
                    borderColor: errors.endAt ? '#ef4444' : '#d1d5db',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.endAt ? '#ef4444' : '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              {errors.endAt && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.endAt}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.eventsFormLocation || 'Địa điểm'}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
                  style={{ borderColor: '#d1d5db', outline: 'none' }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder={t.eventsFormLocationPlaceholder || 'Nhập địa điểm'}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.eventsFormStatus || 'Trạng thái'}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg text-xs"
                style={{ borderColor: '#d1d5db', outline: 'none' }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value={1}>{t.eventsStatusActive || 'Đang diễn ra'}</option>
                <option value={0}>{t.eventsFormStatusCancelled || 'Đã hủy'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mô tả */}
        <div className="rounded-lg border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
            <FileText className="w-4 h-4" style={{ color: '#2563eb' }} />
            {t.eventsFormDescription || 'Mô tả'}
          </h2>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
            style={{ borderColor: '#d1d5db', outline: 'none' }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2563eb';
              e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
            placeholder={t.eventsFormDescriptionPlaceholder || 'Mô tả sự kiện (tùy chọn)'}
          />
        </div>

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
              color: '#374151',
            }}
          >
            <X className="w-3.5 h-3.5" />
            {t.cancel || 'Hủy'}
          </button>
          <button
            type="submit"
            disabled={loading}
            onMouseEnter={() => !loading && setHoveredSaveButton(true)}
            onMouseLeave={() => setHoveredSaveButton(false)}
            className="px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
            style={{
              backgroundColor: loading ? '#93c5fd' : hoveredSaveButton ? '#1d4ed8' : '#2563eb',
              color: 'white',
              opacity: loading ? 0.5 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <Save className="w-3.5 h-3.5" />
            {loading ? (t.saving || 'Đang lưu...') : (isEdit ? (t.save || 'Lưu') : (t.eventsFormCreateButton || 'Tạo sự kiện'))}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEventPage;
