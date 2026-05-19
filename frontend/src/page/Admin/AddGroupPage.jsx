import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import {
  ArrowLeft,
  Save,
  X,
  Loader2,
} from 'lucide-react';

const AddGroupPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== 'new';
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    referralCode: '',
    description: '',
    status: 1
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);
  const [hoveredGenerateButton, setHoveredGenerateButton] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadGroupData();
    }
  }, [id]);

  const loadGroupData = async () => {
    try {
      setLoadingData(true);
      const response = await apiService.getGroupById(id);
      if (response.success && response.data?.group) {
        const group = response.data.group;
        setFormData({
          name: group.name || '',
          code: group.code || '',
          referralCode: group.referralCode || '',
          description: group.description || '',
          status: group.status !== undefined ? group.status : 1
        });
      }
    } catch (error) {
      console.error('Error loading group data:', error);
      alert(error.message || 'Không thể tải thông tin nhóm');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'status' ? parseInt(value) : value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const generateCode = (name) => {
    if (!name) return '';
    return name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '_')
      .substring(0, 50);
  };

  const generateReferralCode = () => {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `REF_${random}`;
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      code: prev.code || generateCode(name)
    }));
    handleInputChange(e);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên nhóm là bắt buộc';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Mã nhóm là bắt buộc';
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Mã nhóm chỉ được chứa chữ in hoa, số và dấu gạch dưới';
    }

    if (!formData.referralCode.trim()) {
      newErrors.referralCode = 'Mã giới thiệu là bắt buộc';
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
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        referralCode: formData.referralCode.trim(),
        description: formData.description.trim(),
        status: formData.status
      };

      let response;
      if (isEdit) {
        response = await apiService.updateGroup(id, submitData);
      } else {
        response = await apiService.createGroup(submitData);
      }

      if (response.success) {
        alert(isEdit ? 'Cập nhật nhóm thành công!' : 'Tạo nhóm thành công!');
        navigate('/admin/groups');
      } else {
        alert(response.message || `Có lỗi xảy ra khi ${isEdit ? 'cập nhật' : 'tạo'} nhóm`);
      }
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} group:`, error);
      alert(error.message || `Có lỗi xảy ra khi ${isEdit ? 'cập nhật' : 'tạo'} nhóm`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Bạn có chắc muốn hủy? Dữ liệu chưa lưu sẽ bị mất.')) {
      navigate('/admin/groups');
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2563eb' }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancel}
            onMouseEnter={() => setHoveredBackButton(true)}
            onMouseLeave={() => setHoveredBackButton(false)}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: hoveredBackButton ? '#f3f4f6' : 'transparent'
            }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#4b5563' }} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>
            {isEdit ? 'Chỉnh sửa nhóm' : 'Tạo nhóm mới'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            onMouseEnter={() => setHoveredCancelButton(true)}
            onMouseLeave={() => setHoveredCancelButton(false)}
            className="px-4 py-2 border rounded-lg transition-colors flex items-center gap-2"
            style={{
              borderColor: '#d1d5db',
              color: '#374151',
              backgroundColor: hoveredCancelButton ? '#f9fafb' : 'transparent'
            }}
          >
            <X className="w-4 h-4" />
            <span>Hủy</span>
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            onMouseEnter={() => !loading && setHoveredSaveButton(true)}
            onMouseLeave={() => setHoveredSaveButton(false)}
            className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            style={{
              backgroundColor: loading 
                ? '#93c5fd' 
                : (hoveredSaveButton ? '#1d4ed8' : '#2563eb'),
              color: 'white',
              opacity: loading ? 0.5 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-lg shadow-sm border p-6 space-y-6" style={{ backgroundColor: 'white', borderColor: '#e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tên nhóm */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Tên nhóm <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleNameChange}
              className="w-full px-4 py-2 border rounded-lg"
              style={{
                borderColor: errors.name ? '#fca5a5' : '#d1d5db',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563eb';
                e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.name ? '#fca5a5' : '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="Nhập tên nhóm"
            />
            {errors.name && <p className="mt-1 text-sm" style={{ color: '#dc2626' }}>{errors.name}</p>}
          </div>

          {/* Mã nhóm */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Mã nhóm <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg"
              style={{
                borderColor: errors.code ? '#fca5a5' : '#d1d5db',
                outline: 'none',
                textTransform: 'uppercase'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563eb';
                e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.code ? '#fca5a5' : '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="Nhập mã nhóm (VD: GROUP_01)"
            />
            {errors.code && <p className="mt-1 text-sm" style={{ color: '#dc2626' }}>{errors.code}</p>}
            <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>Mã nhóm sẽ tự động tạo từ tên nhóm</p>
          </div>

          {/* Mã giới thiệu */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Mã giới thiệu <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="referralCode"
                value={formData.referralCode}
                onChange={handleInputChange}
                className="flex-1 px-4 py-2 border rounded-lg"
                style={{
                  borderColor: errors.referralCode ? '#fca5a5' : '#d1d5db',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.referralCode ? '#fca5a5' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Nhập mã giới thiệu"
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, referralCode: generateReferralCode() }))}
                onMouseEnter={() => setHoveredGenerateButton(true)}
                onMouseLeave={() => setHoveredGenerateButton(false)}
                className="px-4 py-2 rounded-lg transition-colors text-sm"
                style={{
                  backgroundColor: hoveredGenerateButton ? '#e5e7eb' : '#f3f4f6',
                  color: '#374151'
                }}
              >
                Tạo tự động
              </button>
            </div>
            {errors.referralCode && <p className="mt-1 text-sm" style={{ color: '#dc2626' }}>{errors.referralCode}</p>}
          </div>

          {/* Trạng thái */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Trạng thái <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border rounded-lg"
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
              <option value={1}>Đang hoạt động</option>
              <option value={0}>Không hoạt động</option>
            </select>
          </div>

          {/* Mô tả */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Mô tả
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2 border rounded-lg"
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
              placeholder="Nhập mô tả về nhóm"
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddGroupPage;

