import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import {
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  Building2,
  CreditCard,
  Save,
  X,
  FileText,
  Upload,
  Trash2,
} from 'lucide-react';


const AddCollaboratorPage = () => {
  const { collaboratorId } = useParams();
  const isEditMode = Boolean(collaboratorId);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    collaboratorType: 'individual', // 'individual' -> CN, 'business' -> DN (để sinh mã CTV)
    password: '',
    confirmPassword: '',
    address: '',
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
    status: 'active',
    description: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [businessLicenseFile, setBusinessLicenseFile] = useState(null);
  const [existingBusinessLicense, setExistingBusinessLicense] = useState('');
  const [businessLicensePreviewUrl, setBusinessLicensePreviewUrl] = useState('');
  
  // Hover states
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'phone') {
      finalValue = value.replace(/\D/g, '').slice(0, 11);
    }
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBusinessLicenseChange = (e) => {
    const file = e.target.files?.[0] || null;
    setBusinessLicenseFile(file);
    if (errors.businessLicenseFile) {
      setErrors((prev) => ({ ...prev, businessLicenseFile: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.replace(/\s/g, '');

    if (!formData.name.trim()) {
      newErrors.name = t.addCtvErrorNameRequired;
    }

    if (!trimmedEmail) {
      newErrors.email = t.addCtvErrorEmailRequired;
    } else if (!trimmedEmail.includes('@')) {
      newErrors.email = t.addCtvErrorEmailAt;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = t.addCtvErrorEmailFormat;
    }

    if (!trimmedPhone) {
      newErrors.phone = t.addCtvErrorPhoneRequired;
    } else if (!/^[0-9]+$/.test(trimmedPhone)) {
      newErrors.phone = t.addCtvErrorPhoneDigits;
    } else if (trimmedPhone.length < 10 || trimmedPhone.length > 11) {
      newErrors.phone = t.addCtvErrorPhoneLength;
    } else if (/^0+$/.test(trimmedPhone)) {
      newErrors.phone = t.addCtvErrorPhoneZeros;
    } else if (!/^0[0-9]{9,10}$/.test(trimmedPhone)) {
      newErrors.phone = t.addCtvErrorPhoneFormat;
    }

    if (!isEditMode) {
      if (!formData.password) {
        newErrors.password = t.addCtvErrorPasswordRequired;
      } else if (formData.password.length < 6) {
        newErrors.password = t.addCtvErrorPasswordLength;
      }

      if (formData.password || formData.confirmPassword) {
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = t.addCtvErrorPasswordConfirm;
        }
      }
    }

    if (formData.bankAccount && !formData.bankName) {
      newErrors.bankName = t.addCtvErrorBankNameRequired;
    }

    if (isEditMode && formData.collaboratorType === 'business' && !businessLicenseFile && !existingBusinessLicense) {
      newErrors.businessLicenseFile = 'Vui lòng tải lên hoặc giữ lại giấy phép kinh doanh';
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
      if (isEditMode) {
        const submitData = {
          name: formData.name,
          email: formData.email.trim(),
          phone: formData.phone.replace(/\s/g, ''),
          organizationType: formData.collaboratorType === 'business' ? 'company' : 'individual',
          address: formData.address,
          bankName: formData.bankName,
          bankAccount: formData.bankAccount,
          bankAccountName: formData.bankAccountName,
          status: formData.status === 'active' ? '1' : '0',
          description: formData.description,
          businessLicense: existingBusinessLicense || '',
        };
        const response = await apiService.updateCollaborator(collaboratorId, submitData);
        if (response.success) {
          alert(response.message || 'Cập nhật CTV thành công');
          navigate('/admin/collaborators');
        } else {
          alert(response.message || 'Có lỗi xảy ra khi cập nhật CTV');
        }
      } else {
        const submitData = {
          name: formData.name,
          email: formData.email.trim(),
          phone: formData.phone.replace(/\s/g, ''),
          organizationType: formData.collaboratorType === 'business' ? 'company' : 'individual',
          password: formData.password,
          address: formData.address,
          bankName: formData.bankName,
          bankAccount: formData.bankAccount,
          bankAccountName: formData.bankAccountName,
          status: formData.status === 'active' ? 1 : 0,
          description: formData.description,
        };

        const response = await apiService.createCollaborator(submitData);
        if (response.success) {
          alert(response.message || t.addCtvCreateSuccess);
          navigate('/admin/collaborators');
        } else {
          alert(response.message || t.addCtvCreateErrorGeneric);
        }
      }
    } catch (error) {
      console.error('Error creating/updating collaborator:', error);
      alert(error.message || (isEditMode ? 'Có lỗi xảy ra khi cập nhật CTV' : t.addCtvCreateErrorGeneric));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm(t.addCtvConfirmCancel)) {
      navigate('/admin/collaborators');
    }
  };

  useEffect(() => {
    if (!isEditMode || !collaboratorId) return undefined;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await apiService.getCollaboratorById(collaboratorId);
        if (cancelled) return;
        const collaborator = response?.success ? response?.data?.collaborator : null;
        if (!collaborator) {
          alert(response?.message || 'Không tìm thấy CTV');
          navigate('/admin/collaborators');
          return;
        }

        setFormData({
          name: collaborator.name || '',
          email: collaborator.email || '',
          phone: collaborator.phone || '',
          collaboratorType:
            collaborator.organizationType === 'company' || collaborator.organizationType === 'organization' || collaborator.organizationType === 'business'
              ? 'business'
              : 'individual',
          password: '',
          confirmPassword: '',
          address: collaborator.address || '',
          bankName: collaborator.bankName || '',
          bankAccount: collaborator.bankAccount || '',
          bankAccountName: collaborator.bankAccountName || '',
          status: collaborator.status === 1 ? 'active' : 'inactive',
          description: collaborator.description || '',
        });
        setExistingBusinessLicense(collaborator.businessLicense || '');
        setBusinessLicensePreviewUrl(collaborator.businessLicenseUrl || '');
      } catch (error) {
        console.error('Error loading collaborator for edit:', error);
        alert(error.message || 'Lỗi khi tải thông tin CTV');
        navigate('/admin/collaborators');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [collaboratorId, isEditMode, navigate]);

  return (
    <div className="space-y-3">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Thông tin cơ bản */}
        <div className="rounded-lg border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
            <User className="w-4 h-4" style={{ color: '#2563eb' }} />
            {t.addCtvBasicInfo}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.addCtvTypeLabel} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                name="collaboratorType"
                value={formData.collaboratorType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg text-xs"
                style={{
                  borderColor: errors.collaboratorType ? '#ef4444' : '#d1d5db',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.collaboratorType ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="individual">{t.addCtvTypeIndividual}</option>
                <option value="business">{t.addCtvTypeBusiness}</option>
              </select>
              <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>{t.addCtvTypeHelp}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.addCtvNameLabel} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
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
                placeholder={t.addCtvNamePlaceholder}
              />
              {errors.name && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.addCtvEmailLabel} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
                  style={{
                    borderColor: errors.email ? '#ef4444' : '#d1d5db',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.email ? '#ef4444' : '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder={t.addCtvEmailPlaceholder}
                />
              </div>
              {errors.email && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.addCtvPhoneLabel} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
                  style={{
                    borderColor: errors.phone ? '#ef4444' : '#d1d5db',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.phone ? '#ef4444' : '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder={t.addCtvPhonePlaceholder}
                />
              </div>
              {errors.phone && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.phone}</p>}
            </div>

          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
              {t.addCtvAddressLabel}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
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
                placeholder={t.addCtvAddressPlaceholder}
              />
            </div>
          </div>
        </div>

        {/* Thông tin đăng nhập */}
        {(!isEditMode) && (
          <div className="rounded-lg border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Lock className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.addCtvLoginInfo}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                  {t.addCtvPasswordLabel} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
                    style={{
                      borderColor: errors.password ? '#ef4444' : '#d1d5db',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.password ? '#ef4444' : '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                    placeholder={t.addCtvPasswordPlaceholder}
                  />
                </div>
                {errors.password && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                  {t.addCtvPasswordConfirmLabel} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
                    style={{
                      borderColor: errors.confirmPassword ? '#ef4444' : '#d1d5db',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                    placeholder={t.addCtvPasswordConfirmPlaceholder}
                  />
                </div>
                {errors.confirmPassword && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Thông tin ngân hàng */}
        <div className="rounded-lg border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
            <CreditCard className="w-4 h-4" style={{ color: '#2563eb' }} />
            {t.addCtvBankInfo}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.addCtvBankNameLabel}
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
                  style={{
                    borderColor: errors.bankName ? '#ef4444' : '#d1d5db',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.bankName ? '#ef4444' : '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder={t.addCtvBankNamePlaceholder}
                />
              </div>
              {errors.bankName && <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{errors.bankName}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.addCtvBankAccountLabel}
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="text"
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-xs"
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
                  placeholder={t.addCtvBankAccountPlaceholder}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.addCtvBankAccountNameLabel}
              </label>
              <input
                type="text"
                name="bankAccountName"
                value={formData.bankAccountName}
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
                placeholder={t.addCtvBankAccountNamePlaceholder}
              />
            </div>
          </div>
        </div>

        {isEditMode && (
          <div className="rounded-lg border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <FileText className="w-4 h-4" style={{ color: '#2563eb' }} />
              Giấy phép kinh doanh
            </h2>
            <div className="rounded-lg border border-dashed p-4" style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: '#374151' }}>
                    File hiện tại
                  </p>
                  <div className="mt-2 text-sm" style={{ color: '#111827' }}>
                    {businessLicensePreviewUrl ? (
                      <a href={businessLicensePreviewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                        <FileText className="w-3.5 h-3.5" />
                        Xem file hiện tại
                      </a>
                    ) : existingBusinessLicense ? (
                      <span>{existingBusinessLicense}</span>
                    ) : (
                      <span style={{ color: '#6b7280' }}>Chưa có file giấy phép kinh doanh</span>
                    )}
                  </div>
                </div>
                {existingBusinessLicense && (
                  <button
                    type="button"
                    onClick={() => {
                      setExistingBusinessLicense('');
                      setBusinessLicensePreviewUrl('');
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold"
                    style={{ borderColor: '#fecaca', color: '#dc2626', backgroundColor: '#fff1f2' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa file hiện tại
                  </button>
                )}
              </div>
              <div className="mt-4">
                <label className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer" style={{ borderColor: '#d1d5db', color: '#374151', backgroundColor: 'white' }}>
                  <Upload className="w-3.5 h-3.5" />
                  Tải lên file mới
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleBusinessLicenseChange} />
                </label>
                {businessLicenseFile && (
                  <p className="mt-2 text-xs" style={{ color: '#6b7280' }}>File đã chọn: {businessLicenseFile.name}</p>
                )}
                {errors.businessLicenseFile && (
                  <p className="mt-2 text-xs" style={{ color: '#dc2626' }}>{errors.businessLicenseFile}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trạng thái và ghi chú */}
        <div className="rounded-lg border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <h2 className="text-sm font-bold mb-4 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.addCtvStatusNote}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.addCtvStatusLabel}
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
                <option value="active">{t.addCtvStatusActive}</option>
                <option value="inactive">{t.addCtvStatusInactive}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
                {t.addCtvNoteLabel}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
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
                placeholder={t.addCtvNotePlaceholder}
              />
            </div>
          </div>
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
              color: '#374151'
            }}
          >
            <X className="w-3.5 h-3.5" />
            {t.cancel}
          </button>
          <button
            type="submit"
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
            {loading ? t.saving : t.saveCollaborator}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCollaboratorPage;
