import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Upload,
  Plus,
  Save,
  X,
  Image as ImageIcon,
  Users,
} from 'lucide-react';

const AdminAddCompanyPage = () => {
  const navigate = useNavigate();
  const { companyId } = useParams();
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    companyCode: '',
    type: '',
    // Contact Information
    email: '',
    phone: '',
    address: '',
    website: '',
    // Additional Information
    description: '',
    // Status
    status: true,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [emailAddresses, setEmailAddresses] = useState([]);
  const [businessFields, setBusinessFields] = useState([]);
  const [offices, setOffices] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);
  const [hoveredLogoUploadArea, setHoveredLogoUploadArea] = useState(false);
  const [hoveredRemoveLogoButton, setHoveredRemoveLogoButton] = useState(false);
  const [hoveredAddEmailButton, setHoveredAddEmailButton] = useState(false);
  const [hoveredRemoveEmailButtonIndex, setHoveredRemoveEmailButtonIndex] = useState(null);
  const [hoveredAddBusinessFieldButton, setHoveredAddBusinessFieldButton] = useState(false);
  const [hoveredRemoveBusinessFieldButtonIndex, setHoveredRemoveBusinessFieldButtonIndex] = useState(null);
  const [hoveredAddOfficeButton, setHoveredAddOfficeButton] = useState(false);
  const [hoveredRemoveOfficeButtonIndex, setHoveredRemoveOfficeButtonIndex] = useState(null);

  useEffect(() => {
    if (companyId) {
      loadCompanyData();
    }
  }, [companyId]);

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCompanyById(companyId);
      if (response.success && response.data?.company) {
        const company = response.data.company;
        setFormData({
          name: company.name || '',
          companyCode: company.companyCode || '',
          type: company.type || '',
          email: company.email || '',
          phone: company.phone || '',
          address: company.address || '',
          website: company.website || '',
          description: company.description || '',
          status: company.status !== undefined ? company.status : true,
        });
        if (company.logo) {
          setLogoPreview(company.logo);
        }
        if (company.emailAddresses) {
          setEmailAddresses(company.emailAddresses.map(ea => ({ email: ea.email || '' })));
        }
        if (company.businessFields) {
          setBusinessFields(company.businessFields.map(bf => ({ content: bf.content || '' })));
        }
        if (company.offices) {
          setOffices(company.offices.map(office => ({
            address: office.address || '',
            isHeadOffice: office.isHeadOffice || false
          })));
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error);
      alert('Lỗi khi tải thông tin doanh nghiệp');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'select-one' && name === 'status' ? value === 'true' : value)
    }));
    // Clear error
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleLogoChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Tên công ty là bắt buộc';
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
      
      // Prepare data
      const submitData = {
        name: formData.name.trim(),
        companyCode: formData.companyCode || null,
        type: formData.type || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        website: formData.website || null,
        description: formData.description || null,
        status: formData.status,
        emailAddresses: emailAddresses.filter(ea => ea.email && ea.email.trim()).map(ea => ({ email: ea.email.trim() })),
        businessFields: businessFields.filter(bf => bf.content && bf.content.trim()).map(bf => ({ content: bf.content.trim() })),
        offices: offices.filter(office => office.address && office.address.trim()).map(office => ({
          address: office.address.trim(),
          isHeadOffice: office.isHeadOffice || false
        }))
      };

      // If logo file exists, use FormData
      if (logoFile) {
        const formDataToSend = new FormData();
        formDataToSend.append('logo', logoFile);
        Object.keys(submitData).forEach(key => {
          if (submitData[key] !== null && submitData[key] !== undefined) {
            if (Array.isArray(submitData[key])) {
              formDataToSend.append(key, JSON.stringify(submitData[key]));
            } else if (typeof submitData[key] === 'object') {
              formDataToSend.append(key, JSON.stringify(submitData[key]));
            } else {
              formDataToSend.append(key, submitData[key]);
            }
          }
        });
        
        const response = companyId
          ? await apiService.updateCompany(companyId, formDataToSend)
          : await apiService.createCompany(formDataToSend);
        
        if (response.success) {
          alert(companyId ? 'Cập nhật doanh nghiệp thành công!' : 'Tạo doanh nghiệp thành công!');
          navigate('/admin/companies');
        } else {
          alert(response.message || (companyId ? 'Có lỗi xảy ra khi cập nhật' : 'Có lỗi xảy ra khi tạo'));
        }
      } else {
        // No logo file, send JSON
        const response = companyId
          ? await apiService.updateCompany(companyId, submitData)
          : await apiService.createCompany(submitData);
        
        if (response.success) {
          alert(companyId ? 'Cập nhật doanh nghiệp thành công!' : 'Tạo doanh nghiệp thành công!');
          navigate('/admin/companies');
        } else {
          alert(response.message || (companyId ? 'Có lỗi xảy ra khi cập nhật' : 'Có lỗi xảy ra khi tạo'));
        }
      }
    } catch (error) {
      console.error(`Error ${companyId ? 'updating' : 'creating'} company:`, error);
      alert(error.message || (companyId ? 'Có lỗi xảy ra khi cập nhật' : 'Có lỗi xảy ra khi tạo'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Bạn có chắc muốn hủy? Dữ liệu chưa lưu sẽ bị mất.')) {
      navigate('/admin/companies');
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0 px-2 sm:px-3 py-1.5 space-y-3">
        {/* Header */}
        <div className="rounded-lg p-3 border flex items-center justify-between flex-shrink-0" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/companies')}
              onMouseEnter={() => setHoveredBackButton(true)}
              onMouseLeave={() => setHoveredBackButton(false)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: hoveredBackButton ? '#f3f4f6' : 'transparent' }}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: '#4b5563' }} />
            </button>
            <div>
              <h1 className="text-base font-bold" style={{ color: '#111827' }}>
                {companyId ? 'Chỉnh sửa doanh nghiệp' : 'Tạo doanh nghiệp'}
              </h1>
              <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: '#6b7280' }}>
                {companyId ? 'Cập nhật thông tin doanh nghiệp' : 'Thêm thông tin doanh nghiệp mới vào hệ thống'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              onMouseEnter={() => setHoveredCancelButton(true)}
              onMouseLeave={() => setHoveredCancelButton(false)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors flex items-center gap-1.5"
              style={{ backgroundColor: hoveredCancelButton ? '#e5e7eb' : '#f3f4f6', color: '#374151' }}
            >
              <X className="w-3.5 h-3.5" />
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              onMouseEnter={() => !loading && setHoveredSaveButton(true)}
              onMouseLeave={() => setHoveredSaveButton(false)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: loading ? '#93c5fd' : (hoveredSaveButton ? '#1d4ed8' : '#2563eb'),
                color: 'white',
                opacity: loading ? 0.5 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? (companyId ? 'Đang cập nhật...' : 'Đang lưu...') : (companyId ? 'Cập nhật' : 'Lưu doanh nghiệp')}
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-3">
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5 pb-2 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <Building2 className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                Thông tin cơ bản
              </h2>
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    Tên công ty <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="VD: Công ty TNHH ABC"
                    required
                    className="w-full px-2.5 py-1.5 border rounded text-xs"
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
                {errors.name && <p className="text-[10px] mt-0.5" style={{ color: '#ef4444' }}>{errors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                      Mã công ty <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="companyCode"
                      value={formData.companyCode}
                      onChange={handleInputChange}
                      placeholder="VD: ABC, NTS, SECOM"
                      required
                      className="w-full px-2.5 py-1.5 border rounded text-xs"
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
                    <label className="block text-[10px] sm:text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                      Vị trí
                    </label>
                    <select
                      name="type"
                      value={formData.type === undefined || formData.type === null ? '' : String(formData.type)}
                      onChange={handleInputChange}
                      className="w-full px-2.5 py-1.5 border rounded text-xs"
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
                    <option value="">Chọn vị trí</option>
                    <option value="1">Nhật Bản</option>
                    <option value="2">Việt Nam</option>
                    <option value="3">Việt & Nhật</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    Trạng thái <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status ? 'true' : 'false'}
                    onChange={handleInputChange}
                    required
                    className="w-full px-2.5 py-1.5 border rounded text-xs"
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
                  <option value="true">Đang hoạt động</option>
                  <option value="false">Ngừng hoạt động</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5 pb-2 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <Mail className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                Thông tin liên hệ
              </h2>
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="VD: contact@company.com"
                      className="w-full pl-9 pr-2.5 py-1.5 border rounded text-xs"
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
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="VD: 03-1234-5678"
                      className="w-full pl-9 pr-2.5 py-1.5 border rounded text-xs"
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
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    Địa chỉ
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="VD: 7-23-3 Nishi-Kamata, Ota-ku, Tokyo"
                      className="w-full pl-9 pr-2.5 py-1.5 border rounded text-xs"
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
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="VD: https://company.com"
                      className="w-full pl-9 pr-2.5 py-1.5 border rounded text-xs"
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

            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5 pb-2 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <Users className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                Địa chỉ Email
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] sm:text-xs font-semibold" style={{ color: '#111827' }}>
                    Danh sách email
                  </label>
                  <button
                    type="button"
                    onClick={() => setEmailAddresses([...emailAddresses, { email: '' }])}
                    onMouseEnter={() => setHoveredAddEmailButton(true)}
                    onMouseLeave={() => setHoveredAddEmailButton(false)}
                    className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1"
                    style={{ color: hoveredAddEmailButton ? '#1d4ed8' : '#2563eb' }}
                  >
                    <Plus className="w-3 h-3" />
                    Thêm email
                  </button>
                </div>
              {emailAddresses.map((ea, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="VD: contact@company.com"
                    value={ea.email}
                    onChange={(e) => {
                      const newEmails = [...emailAddresses];
                      newEmails[index].email = e.target.value;
                      setEmailAddresses(newEmails);
                    }}
                    className="flex-1 px-2 py-1.5 border rounded text-xs"
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
                  <button
                    type="button"
                    onClick={() => setEmailAddresses(emailAddresses.filter((_, i) => i !== index))}
                    onMouseEnter={() => setHoveredRemoveEmailButtonIndex(index)}
                    onMouseLeave={() => setHoveredRemoveEmailButtonIndex(null)}
                    className="p-1.5"
                    style={{
                      color: hoveredRemoveEmailButtonIndex === index ? '#b91c1c' : '#ef4444'
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
                {emailAddresses.length === 0 && (
                  <p className="text-[10px]" style={{ color: '#6b7280' }}>Chưa có email nào. Nhấn "Thêm email" để thêm.</p>
                )}
              </div>
            </div>

            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5 pb-2 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <FileText className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                Lĩnh vực kinh doanh
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] sm:text-xs font-semibold" style={{ color: '#111827' }}>
                    Danh sách lĩnh vực
                  </label>
                  <button
                    type="button"
                    onClick={() => setBusinessFields([...businessFields, { content: '' }])}
                    onMouseEnter={() => setHoveredAddBusinessFieldButton(true)}
                    onMouseLeave={() => setHoveredAddBusinessFieldButton(false)}
                    className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1"
                    style={{ color: hoveredAddBusinessFieldButton ? '#1d4ed8' : '#2563eb' }}
                  >
                    <Plus className="w-3 h-3" />
                    Thêm lĩnh vực
                  </button>
                </div>
              {businessFields.map((bf, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="VD: Công nghệ thông tin, Tuyển dụng"
                    value={bf.content}
                    onChange={(e) => {
                      const newFields = [...businessFields];
                      newFields[index].content = e.target.value;
                      setBusinessFields(newFields);
                    }}
                    className="flex-1 px-2 py-1.5 border rounded text-xs"
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
                  <button
                    type="button"
                    onClick={() => setBusinessFields(businessFields.filter((_, i) => i !== index))}
                    onMouseEnter={() => setHoveredRemoveBusinessFieldButtonIndex(index)}
                    onMouseLeave={() => setHoveredRemoveBusinessFieldButtonIndex(null)}
                    className="p-1.5"
                    style={{
                      color: hoveredRemoveBusinessFieldButtonIndex === index ? '#b91c1c' : '#ef4444'
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
                {businessFields.length === 0 && (
                  <p className="text-[10px]" style={{ color: '#6b7280' }}>Chưa có lĩnh vực nào. Nhấn "Thêm lĩnh vực" để thêm.</p>
                )}
              </div>
            </div>

            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5 pb-2 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <MapPin className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                Văn phòng
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] sm:text-xs font-semibold" style={{ color: '#111827' }}>
                    Danh sách văn phòng
                  </label>
                  <button
                    type="button"
                    onClick={() => setOffices([...offices, { address: '', isHeadOffice: false }])}
                    onMouseEnter={() => setHoveredAddOfficeButton(true)}
                    onMouseLeave={() => setHoveredAddOfficeButton(false)}
                    className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1"
                    style={{ color: hoveredAddOfficeButton ? '#1d4ed8' : '#2563eb' }}
                  >
                    <Plus className="w-3 h-3" />
                    Thêm văn phòng
                  </button>
                </div>
                {offices.map((office, index) => (
                  <div key={index} className="p-2 border rounded space-y-1.5" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Địa chỉ văn phòng"
                      value={office.address}
                      onChange={(e) => {
                        const newOffices = [...offices];
                        newOffices[index].address = e.target.value;
                        setOffices(newOffices);
                      }}
                      className="flex-1 px-2 py-1.5 border rounded text-xs"
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
                    <button
                      type="button"
                      onClick={() => setOffices(offices.filter((_, i) => i !== index))}
                      onMouseEnter={() => setHoveredRemoveOfficeButtonIndex(index)}
                      onMouseLeave={() => setHoveredRemoveOfficeButtonIndex(null)}
                      className="p-1.5"
                      style={{
                        color: hoveredRemoveOfficeButtonIndex === index ? '#b91c1c' : '#ef4444'
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={office.isHeadOffice}
                        onChange={(e) => {
                          const newOffices = [...offices];
                          newOffices[index].isHeadOffice = e.target.checked;
                          setOffices(newOffices);
                        }}
                        className="w-3.5 h-3.5 rounded"
                        style={{ accentColor: '#2563eb', borderColor: '#d1d5db' }}
                      />
                      <label className="text-[10px] sm:text-xs font-semibold" style={{ color: '#111827' }}>
                        Văn phòng chính
                      </label>
                    </div>
                  </div>
                ))}
                {offices.length === 0 && (
                  <p className="text-[10px]" style={{ color: '#6b7280' }}>Chưa có văn phòng nào. Nhấn "Thêm văn phòng" để thêm.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5 pb-2 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <ImageIcon className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                Logo công ty
              </h2>
              <div>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center transition-colors"
                  onMouseEnter={() => setHoveredLogoUploadArea(true)}
                  onMouseLeave={() => setHoveredLogoUploadArea(false)}
                  style={{ borderColor: hoveredLogoUploadArea ? '#2563eb' : '#d1d5db' }}
                >
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      {logoPreview ? (
                        <div className="relative">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-20 h-20 object-contain rounded border"
                            style={{ borderColor: '#e5e7eb' }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setLogoPreview(null);
                              setLogoFile(null);
                            }}
                            onMouseEnter={() => setHoveredRemoveLogoButton(true)}
                            onMouseLeave={() => setHoveredRemoveLogoButton(false)}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                            style={{ backgroundColor: hoveredRemoveLogoButton ? '#dc2626' : '#ef4444', color: 'white' }}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
                          <ImageIcon className="w-8 h-8" style={{ color: '#9ca3af' }} />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#111827' }}>
                          {logoPreview ? 'Thay đổi logo' : 'Kéo thả hoặc chọn file'}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>PNG, JPG, SVG - tối đa 5MB</p>
                      </div>
                    </div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-2 flex items-center gap-1.5 pb-2 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <FileText className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                Mô tả công ty
              </h2>
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold mb-1" style={{ color: '#111827' }}>
                  Giới thiệu về công ty
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Nhập mô tả về công ty, lĩnh vực hoạt động, quy mô, văn hóa công ty..."
                  rows="6"
                  className="w-full px-2.5 py-1.5 border rounded text-xs resize-none"
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
        </form>
      </div>
    </div>
  );
};

export default AdminAddCompanyPage;

