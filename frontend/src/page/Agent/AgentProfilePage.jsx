import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, MapPin, Building2, CreditCard, Save, FileText, ExternalLink } from 'lucide-react';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const I18N = {
  vi: {
    title: 'Thông tin cá nhân',
    backHome: 'Về trang chủ',
    basicInfo: 'Thông tin cơ bản',
    fullName: 'Họ tên',
    fullNamePlaceholder: 'Họ và tên',
    birthday: 'Ngày sinh',
    gender: 'Giới tính',
    choose: '— Chọn —',
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
    description: 'Mô tả / Ghi chú',
    descriptionPlaceholder: 'Mô tả ngắn (tùy chọn)',
    businessLicense: 'Giấy phép kinh doanh',
    businessLicenseHint: 'Dán link file hoặc đường dẫn giấy phép',
    businessLicenseReplace: 'Thay đổi / bổ sung giấy phép',
    businessLicenseRemove: 'Xóa giấy phép',
    viewFile: 'Xem file',
    contact: 'Liên hệ',
    emailReadonly: 'Email (không đổi được)',
    phone: 'Số điện thoại',
    facebook: 'Facebook',
    zalo: 'Zalo',
    address: 'Địa chỉ',
    country: 'Quốc gia',
    countryPlaceholder: 'Việt Nam',
    postCode: 'Mã bưu điện',
    addressPlaceholder: 'Địa chỉ chi tiết',
    organization: 'Tổ chức (nếu có)',
    organizationType: 'Loại tổ chức',
    individual: 'Cá nhân',
    company: 'Công ty',
    organizationLabel: 'Tổ chức',
    companyName: 'Tên công ty / Tổ chức',
    taxCode: 'Mã số thuế',
    website: 'Website',
    businessAddress: 'Địa chỉ kinh doanh',
    bank: 'Ngân hàng',
    bankName: 'Ngân hàng',
    bankAccount: 'Số tài khoản',
    bankAccountName: 'Chủ tài khoản',
    bankBranch: 'Chi nhánh',
    cancel: 'Hủy',
    save: 'Lưu thay đổi',
    saving: 'Đang lưu...',
    success: 'Đã cập nhật thông tin thành công.',
    loadError: 'Không tải được thông tin',
    updateError: 'Cập nhật thất bại',
    loadFail: 'Lỗi khi tải thông tin',
    updateFail: 'Lỗi khi cập nhật',
  },
  en: {
    title: 'Personal information',
    backHome: 'Back to home',
    basicInfo: 'Basic information',
    fullName: 'Full name',
    fullNamePlaceholder: 'Full name',
    birthday: 'Birthday',
    gender: 'Gender',
    choose: '— Choose —',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    description: 'Description / Notes',
    descriptionPlaceholder: 'Short description (optional)',
    businessLicense: 'Business license',
    businessLicenseHint: 'Paste the file link or license path',
    businessLicenseReplace: 'Replace / add license',
    businessLicenseRemove: 'Remove license',
    viewFile: 'View file',
    contact: 'Contact',
    emailReadonly: 'Email (read-only)',
    phone: 'Phone number',
    facebook: 'Facebook',
    zalo: 'Zalo',
    address: 'Address',
    country: 'Country',
    countryPlaceholder: 'Vietnam',
    postCode: 'Postal code',
    addressPlaceholder: 'Detailed address',
    organization: 'Organization (optional)',
    organizationType: 'Organization type',
    individual: 'Individual',
    company: 'Company',
    organizationLabel: 'Organization',
    companyName: 'Company / Organization name',
    taxCode: 'Tax code',
    website: 'Website',
    businessAddress: 'Business address',
    bank: 'Bank',
    bankName: 'Bank name',
    bankAccount: 'Account number',
    bankAccountName: 'Account holder',
    bankBranch: 'Branch',
    cancel: 'Cancel',
    save: 'Save changes',
    saving: 'Saving...',
    success: 'Profile updated successfully.',
    loadError: 'Unable to load profile',
    updateError: 'Update failed',
    loadFail: 'Failed to load profile',
    updateFail: 'Failed to update profile',
  },
  ja: {
    title: '個人情報',
    backHome: 'ホームへ戻る',
    basicInfo: '基本情報',
    fullName: '氏名',
    fullNamePlaceholder: '氏名',
    birthday: '生年月日',
    gender: '性別',
    choose: '— 選択 —',
    male: '男性',
    female: '女性',
    other: 'その他',
    description: '説明 / メモ',
    descriptionPlaceholder: '短い説明（任意）',
    businessLicense: '営業許可証',
    businessLicenseHint: 'ファイルリンクまたはパスを貼り付けてください',
    businessLicenseReplace: '許可証を変更 / 追加',
    businessLicenseRemove: '許可証を削除',
    viewFile: 'ファイルを見る',
    contact: '連絡先',
    emailReadonly: 'メールアドレス（変更不可）',
    phone: '電話番号',
    facebook: 'Facebook',
    zalo: 'Zalo',
    address: '住所',
    country: '国',
    countryPlaceholder: 'ベトナム',
    postCode: '郵便番号',
    addressPlaceholder: '詳細住所',
    organization: '組織（任意）',
    organizationType: '組織区分',
    individual: '個人',
    company: '会社',
    organizationLabel: '組織',
    companyName: '会社名 / 組織名',
    taxCode: '税番号',
    website: 'ウェブサイト',
    businessAddress: '事業所住所',
    bank: '銀行',
    bankName: '銀行名',
    bankAccount: '口座番号',
    bankAccountName: '口座名義',
    bankBranch: '支店',
    cancel: 'キャンセル',
    save: '変更を保存',
    saving: '保存中...',
    success: '情報を更新しました。',
    loadError: '情報を読み込めません',
    updateError: '更新に失敗しました',
    loadFail: 'プロフィールの読み込みに失敗しました',
    updateFail: 'プロフィールの更新に失敗しました',
  },
};

const AgentProfilePage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = I18N[language] || I18N.vi;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    country: '',
    postCode: '',
    address: '',
    organizationType: 'individual',
    companyName: '',
    taxCode: '',
    website: '',
    businessAddress: '',
    businessLicense: '',
    businessLicenseUrl: '',
    birthday: '',
    gender: '',
    facebook: '',
    zalo: '',
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
    bankBranch: '',
    organizationLink: '',
    description: ''
  });
  const [hoveredBack, setHoveredBack] = useState(false);
  const [hoveredSave, setHoveredSave] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [licenseDeleting, setLicenseDeleting] = useState(false);
  const fileInputRef = useRef(null);
  const businessLicenseUrl = profile?.businessLicenseUrl || profile?.business_license_url || profile?.businessLicense || profile?.business_license || '';

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getCTVProfile();
      if (res?.success && res?.data?.collaborator) {
        const c = res.data.collaborator;
        setProfile(c);
        setForm({
          name: c.name ?? '',
          phone: c.phone ?? '',
          country: c.country ?? '',
          postCode: c.postCode ?? '',
          address: c.address ?? '',
          organizationType: c.organizationType ?? 'individual',
          companyName: c.companyName ?? '',
          taxCode: c.taxCode ?? '',
          website: c.website ?? '',
          businessAddress: c.businessAddress ?? '',
          businessLicense: c.businessLicense ?? '',
          businessLicenseUrl: c.businessLicenseUrl ?? c.business_license_url ?? c.business_license ?? '',
          birthday: c.birthday ? c.birthday.slice(0, 10) : '',
          gender: c.gender !== undefined && c.gender !== null ? String(c.gender) : '',
          facebook: c.facebook ?? '',
          zalo: c.zalo ?? '',
          bankName: c.bankName ?? '',
          bankAccount: c.bankAccount ?? '',
          bankAccountName: c.bankAccountName ?? '',
          bankBranch: c.bankBranch ?? '',
          organizationLink: c.organizationLink ?? '',
          description: c.description ?? ''
        });
      } else {
        setError(res?.message || t.loadError);
      }
    } catch (err) {
      setError(err.message || t.loadFail);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBusinessLicenseFile = async (file) => {
    if (!file) return;
    try {
      setLicenseUploading(true);
      setError(null);
      const res = await apiService.uploadCTVBusinessLicense(file);
      if (res?.success && res?.data?.collaborator) {
        const c = res.data.collaborator;
        setProfile(c);
        setForm((prev) => ({
          ...prev,
          businessLicense: c.businessLicense ?? '',
          businessLicenseUrl: c.businessLicenseUrl ?? c.business_license_url ?? c.business_license ?? '',
        }));
        localStorage.setItem('user', JSON.stringify(c));
        setSuccess(true);
      } else {
        setError(res?.message || t.updateError);
      }
    } catch (err) {
      setError(err.message || t.updateFail);
    } finally {
      setLicenseUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBusinessLicenseDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    await handleBusinessLicenseFile(file);
  };

  const handleDeleteBusinessLicense = async () => {
    try {
      setLicenseDeleting(true);
      setError(null);
      const res = await apiService.deleteCTVBusinessLicense();
      if (res?.success && res?.data?.collaborator) {
        const c = res.data.collaborator;
        setProfile(c);
        setForm((prev) => ({ ...prev, businessLicense: '', businessLicenseUrl: '' }));
        localStorage.setItem('user', JSON.stringify(c));
        setSuccess(true);
      } else {
        setError(res?.message || t.updateError);
      }
    } catch (err) {
      setError(err.message || t.updateFail);
    } finally {
      setLicenseDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccess(false);
      setError(null);
      const payload = {
        ...form,
        gender: form.gender === '' ? null : parseInt(form.gender, 10),
        businessLicenseUrl: form.businessLicenseUrl || form.businessLicense || null,
      };
      const res = await apiService.updateCTVProfile(payload);
      if (res?.success && res?.data?.collaborator) {
        setProfile(res.data.collaborator);
        localStorage.setItem('user', JSON.stringify(res.data.collaborator));
        setSuccess(true);
      } else {
        setError(res?.message || 'Cập nhật thất bại');
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: '#dc2626' }} />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="rounded-lg border p-6" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/agent')}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          {t.backHome}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            onMouseEnter={() => setHoveredBack(true)}
            onMouseLeave={() => setHoveredBack(false)}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: hoveredBack ? '#f3f4f6' : 'transparent' }}
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{t.title}</h1>
            <p className="text-sm text-gray-500">{profile?.email}</p>
            {profile?.rankLevel && (
              <p className="text-xs text-gray-500 mt-0.5">
                {profile.rankLevel.name} · {profile.rankLevel.percent != null ? `${Number(profile.rankLevel.percent)}%` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {success && (
          <div className="rounded-lg border p-3 text-sm text-green-700 bg-green-50 border-green-200">
            {t.success}
          </div>
        )}
        {error && profile && (
          <div className="rounded-lg border p-3 text-sm text-red-700 bg-red-50 border-red-200">
            {error}
          </div>
        )}

        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900">{t.basicInfo}</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.fullName}</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: '#e5e7eb' }}
                placeholder={t.fullNamePlaceholder}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.birthday}</label>
              <input
                type="date"
                name="birthday"
                value={form.birthday}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: '#e5e7eb' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.gender}</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: '#e5e7eb' }}
              >
                <option value="">{t.choose}</option>
                <option value="1">{t.male}</option>
                <option value="2">{t.female}</option>
                <option value="3">{t.other}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.description}</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: '#e5e7eb' }}
                placeholder={t.descriptionPlaceholder}
              />
            </div>
            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.businessLicense}</p>
                  <p className="text-xs text-slate-500">{t.businessLicenseHint}</p>
                </div>
              </div>

              <div
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragActive ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-slate-50'} ${licenseUploading ? 'opacity-70' : ''}`}
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDrop={handleBusinessLicenseDrop}
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 3v10" />
                    <path d="M8 7l4-4 4 4" />
                    <path d="M4 17a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4" />
                  </svg>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-900">Kéo thả file vào đây hoặc chọn file</p>
                <p className="mt-1 text-sm text-slate-500">PDF, JPG, PNG</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={licenseUploading}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {licenseUploading ? t.saving : 'Browse File'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => handleBusinessLicenseFile(e.target.files?.[0])}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {profile.businessLicense || businessLicenseUrl || 'Chưa có giấy phép'}
                      </p>
                      <p className="text-xs text-slate-500">{businessLicenseUrl ? 'Đã tải lên' : 'Chưa có tệp'}</p>
                      {form.businessLicense ? (
                        <p className="mt-1 text-xs text-amber-600">Đang chọn: {form.businessLicense}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {businessLicenseUrl ? (
                      <a
                        href={businessLicenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t.viewFile}
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleDeleteBusinessLicense}
                      disabled={licenseDeleting || (!businessLicenseUrl && !form.businessLicenseUrl)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {licenseDeleting ? t.saving : t.businessLicenseRemove}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900">{t.contact}</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.emailReadonly}</label>
              <input type="text" value={profile?.email ?? ''} readOnly disabled className="w-full rounded-lg border px-3 py-2 text-sm bg-gray-50" style={{ borderColor: '#e5e7eb' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.phone}</label>
              <input type="text" name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} placeholder="Số điện thoại" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.facebook}</label>
              <input type="text" name="facebook" value={form.facebook} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} placeholder="Link hoặc ID Facebook" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.zalo}</label>
              <input type="text" name="zalo" value={form.zalo} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} placeholder="Số Zalo" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900">{t.address}</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.country}</label>
              <input type="text" name="country" value={form.country} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} placeholder={t.countryPlaceholder} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.postCode}</label>
              <input type="text" name="postCode" value={form.postCode} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.address}</label>
              <input type="text" name="address" value={form.address} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} placeholder={t.addressPlaceholder} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
            <Building2 className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900">{t.organization}</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.organizationType}</label>
              <select name="organizationType" value={form.organizationType} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }}>
                <option value="individual">{t.individual}</option>
                <option value="company">{t.company}</option>
                <option value="organization">{t.organizationLabel}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.companyName}</label>
              <input type="text" name="companyName" value={form.companyName} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.taxCode}</label>
              <input type="text" name="taxCode" value={form.taxCode} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.website}</label>
              <input type="text" name="website" value={form.website} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.businessAddress}</label>
              <input type="text" name="businessAddress" value={form.businessAddress} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
            <CreditCard className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900">{t.bank}</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.bankName}</label>
              <input type="text" name="bankName" value={form.bankName} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.bankAccount}</label>
              <input type="text" name="bankAccount" value={form.bankAccount} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.bankAccountName}</label>
              <input type="text" name="bankAccountName" value={form.bankAccountName} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t.bankBranch}</label>
              <input type="text" name="bankBranch" value={form.bankBranch} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e5e7eb' }} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            onMouseEnter={() => setHoveredSave(true)}
            onMouseLeave={() => setHoveredSave(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: hoveredSave && !saving ? '#b91c1c' : '#dc2626' }}
          >
            <Save className="w-4 h-4" />
            {saving ? t.saving : t.save}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AgentProfilePage;
