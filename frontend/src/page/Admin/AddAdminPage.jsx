import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import {
  ArrowLeft,
  Save,
  X,
  Loader2,
  User,
  Mail,
  Phone,
  Lock,
  Shield,
} from 'lucide-react';

const AddAdminPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== 'new';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 2,
    groupId: '',
    isActive: true,
    status: 1
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [groups, setGroups] = useState([]);
  
  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);

  useEffect(() => {
    loadGroups();
    if (isEdit) {
      loadAdminData();
    }
  }, [id]);

  const loadGroups = async () => {
    try {
      const response = await apiService.getAllGroups();
      if (response.success && response.data?.groups) {
        setGroups(response.data.groups);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadAdminData = async () => {
    try {
      setLoadingData(true);
      const response = await apiService.getAdminById(id);
      if (response.success && response.data?.admin) {
        const admin = response.data.admin;
        setFormData({
          name: admin.name || '',
          email: admin.email || '',
          phone: admin.phone || '',
          password: '',
          confirmPassword: '',
          role: admin.role || 2,
          groupId: admin.groupId || '',
          isActive: admin.isActive !== undefined ? admin.isActive : true,
          status: admin.status !== undefined ? admin.status : 1
        });
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      alert(error.message || 'Không thể tải thông tin admin');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'role' || name === 'groupId' || name === 'status' ? parseInt(value) || '' : value)
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên admin là bắt buộc';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại là bắt buộc';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    if (!isEdit && !formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (formData.role === 3 && !formData.groupId) {
      newErrors.groupId = 'Admin CA Team phải thuộc một nhóm';
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
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        groupId: formData.groupId || null,
        isActive: formData.isActive,
        status: formData.status
      };

      // Only include password if it's provided (for edit) or required (for create)
      if (!isEdit || formData.password) {
        submitData.password = formData.password;
      }

      let response;
      if (isEdit) {
        response = await apiService.updateAdmin(id, submitData);
      } else {
        response = await apiService.createAdmin(submitData);
      }

      if (response.success) {
        alert(isEdit ? 'Cập nhật admin thành công!' : 'Tạo admin thành công!');
        navigate('/admin/accounts');
      } else {
        alert(response.message || `Có lỗi xảy ra khi ${isEdit ? 'cập nhật' : 'tạo'} admin`);
      }
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} admin:`, error);
      alert(error.message || `Có lỗi xảy ra khi ${isEdit ? 'cập nhật' : 'tạo'} admin`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Bạn có chắc muốn hủy? Dữ liệu chưa lưu sẽ bị mất.')) {
      navigate('/admin/accounts');
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
            {isEdit ? 'Chỉnh sửa tài khoản admin' : 'Tạo tài khoản admin mới'}
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
          {/* Tên */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Tên <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                style={{
                  borderColor: errors.name ? '#fca5a5' : '#d1d5db',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.name ? '#fca5a5' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Nhập tên admin"
              />
            </div>
            {errors.name && <p className="mt-1 text-sm" style={{ color: '#dc2626' }}>{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Email <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                style={{
                  borderColor: errors.email ? '#fca5a5' : '#d1d5db',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.email ? '#fca5a5' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Nhập email"
              />
            </div>
            {errors.email && <p className="mt-1 text-sm" style={{ color: '#dc2626' }}>{errors.email}</p>}
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Số điện thoại <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                style={{
                  borderColor: errors.phone ? '#fca5a5' : '#d1d5db',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.phone ? '#fca5a5' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Nhập số điện thoại"
              />
            </div>
            {errors.phone && <p className="mt-1 text-sm" style={{ color: '#dc2626' }}>{errors.phone}</p>}
          </div>

          {/* Vai trò */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Vai trò <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                style={{
                  borderColor: '#d1d5db',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value={1}>Super Admin</option>
                <option value={2}>Admin Backoffice</option>
                <option value={3}>Admin CA Team</option>
              </select>
            </div>
          </div>

          {/* Nhóm (chỉ hiển thị khi role = 3) */}
          {formData.role === 3 && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                Nhóm <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                name="groupId"
                value={formData.groupId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-lg"
                style={{
                  borderColor: errors.groupId ? '#fca5a5' : '#d1d5db',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.groupId ? '#fca5a5' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">-- Chọn nhóm --</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {errors.groupId && <p className="mt-1 text-sm" style={{ color: '#dc2626' }}>{errors.groupId}</p>}
            </div>
          )}

          {/* Mật khẩu */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Mật khẩu {!isEdit && <span style={{ color: '#ef4444' }}>*</span>}
              {isEdit && <span className="text-xs" style={{ color: '#6b7280' }}>(Để trống nếu không đổi)</span>}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                style={{
                  borderColor: errors.password ? '#fca5a5' : '#d1d5db',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.password ? '#fca5a5' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder={isEdit ? "Nhập mật khẩu mới (nếu đổi)" : "Nhập mật khẩu"}
              />
            </div>
            {errors.password && <p className="mt-1 text-sm" style={{ color: '#dc2626' }}>{errors.password}</p>}
          </div>

          {/* Xác nhận mật khẩu */}
          {formData.password && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                Xác nhận mật khẩu <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9ca3af' }} />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  style={{
                    borderColor: errors.confirmPassword ? '#fca5a5' : '#d1d5db',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.confirmPassword ? '#fca5a5' : '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="Nhập lại mật khẩu"
                />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm" style={{ color: '#dc2626' }}>{errors.confirmPassword}</p>}
            </div>
          )}

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
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
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

          {/* Is Active */}
          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="w-4 h-4 rounded"
              style={{
                accentColor: '#2563eb',
                borderColor: '#d1d5db'
              }}
            />
            <label className="text-sm font-medium" style={{ color: '#374151' }}>
              Tài khoản đang hoạt động
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddAdminPage;

