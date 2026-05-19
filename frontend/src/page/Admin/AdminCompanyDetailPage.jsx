import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Users,
  Briefcase,
  Calendar,
  CheckCircle,
  XCircle,
  Tag,
  Home,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';

const getResourceUrl = (pathOrUrl) => {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
  const p = pathOrUrl.trim();
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://73mlvrh5-3000.asse.devtunnels.ms/api';
  const apiBase = (baseUrl || '').replace(/\/api\/?$/, '');
  const clean = p.startsWith('/') ? p.slice(1) : p;
  return `${apiBase}/${clean}`;
};

const pickByLanguage = (viText, enText, jpText, lang) => {
  if (lang === 'en') return enText || viText || '';
  if (lang === 'ja') return jpText || enText || viText || '';
  return viText || enText || jpText || '';
};

const AdminCompanyDetailPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredEditButton, setHoveredEditButton] = useState(false);
  const [hoveredDeleteButton, setHoveredDeleteButton] = useState(false);
  const [hoveredBackToListButton, setHoveredBackToListButton] = useState(false);
  const [hoveredToggleStatusButton, setHoveredToggleStatusButton] = useState(false);
  const [hoveredWebsiteLink, setHoveredWebsiteLink] = useState(false);
  const [hoveredJobCardIndex, setHoveredJobCardIndex] = useState(null);
  const [hoveredViewAllJobsButton, setHoveredViewAllJobsButton] = useState(false);
  const [hoveredCreateJobButton, setHoveredCreateJobButton] = useState(false);

  useEffect(() => {
    loadCompanyDetail();
  }, [companyId]);

  const loadCompanyDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getCompanyById(companyId);
      
      if (response.success && response.data?.company) {
        setCompany(response.data.company);
      } else {
        setError(response.message || t.companyNotFound);
      }
    } catch (err) {
      console.error('Error loading company detail:', err);
      setError(err.message || t.errorLoadCompanyDetail);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t.confirmDeleteCompanyDetail.replace('{name}', company?.name || ''))) {
      return;
    }

    try {
      setDeleting(true);
      const response = await apiService.deleteCompany(companyId);
      if (response.success) {
        alert(t.deleteCompanySuccess);
        navigate('/admin/companies');
      } else {
        alert(response.message || t.errorDeleteCompany);
      }
    } catch (err) {
      console.error('Error deleting company:', err);
      alert(err.message || t.errorDeleteCompany);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await apiService.toggleCompanyStatus(companyId);
      if (response.success) {
        alert(t.updateStatusSuccess);
        loadCompanyDetail();
      } else {
        alert(response.message || t.errorOccurred);
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      alert(err.message || t.errorOccurred);
    }
  };

  const dateLocale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(dateLocale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getLocationLabel = (type) => {
    const num = type != null && type !== '' ? Number(type) : null;
    if (num === 1) return t.companyLocationJapan;
    if (num === 2) return t.companyLocationVietnam;
    if (num === 3) return t.companyLocationVietnamJapan;
    return '—';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#2563eb' }}></div>
          <p style={{ color: '#4b5563' }}>{t.loadingCompany}</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="mb-4" style={{ color: '#dc2626' }}>{error || t.companyNotFound}</p>
          <button
            onClick={() => navigate('/admin/companies')}
            onMouseEnter={() => setHoveredBackToListButton(true)}
            onMouseLeave={() => setHoveredBackToListButton(false)}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: hoveredBackToListButton ? '#1d4ed8' : '#2563eb',
              color: 'white'
            }}
          >
            {t.backToList}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg p-4 border flex items-center justify-between" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/companies')}
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
            <h1 className="text-lg font-bold" style={{ color: '#111827' }}>{company.name || t.companyDetailTitle}</h1>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{t.companyDetailSubtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStatus}
            onMouseEnter={() => setHoveredToggleStatusButton(true)}
            onMouseLeave={() => setHoveredToggleStatusButton(false)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
            style={company.status
              ? {
                  backgroundColor: hoveredToggleStatusButton ? '#bbf7d0' : '#dcfce7',
                  color: '#166534'
                }
              : {
                  backgroundColor: hoveredToggleStatusButton ? '#fecaca' : '#fee2e2',
                  color: '#991b1b'
                }
            }
          >
            {company.status ? (
              <>
                <CheckCircle className="w-4 h-4" />
                {t.statusActive}
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                {t.statusInactive}
              </>
            )}
          </button>
          <button
            onClick={() => navigate(`/admin/companies/${companyId}/edit`)}
            onMouseEnter={() => setHoveredEditButton(true)}
            onMouseLeave={() => setHoveredEditButton(false)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
            style={{
              backgroundColor: hoveredEditButton ? '#1d4ed8' : '#2563eb',
              color: 'white'
            }}
          >
            <Edit className="w-4 h-4" />
            {t.edit}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            onMouseEnter={() => !deleting && setHoveredDeleteButton(true)}
            onMouseLeave={() => setHoveredDeleteButton(false)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
            style={{
              backgroundColor: deleting
                ? '#fca5a5'
                : (hoveredDeleteButton ? '#b91c1c' : '#dc2626'),
              color: 'white',
              opacity: deleting ? 0.5 : 1,
              cursor: deleting ? 'not-allowed' : 'pointer'
            }}
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? t.deleting : t.delete}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Information */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Building2 className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.basicInfo}
            </h2>
            {company.logo && (
              <div className="mb-4">
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#6b7280' }}>{t.logoLabel}</label>
                <img
                  src={getResourceUrl(company.logo)}
                  alt={`${t.logoLabel} ${company.name || ''}`}
                  className="max-h-20 object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#6b7280' }}>{t.colCompanyName}</label>
                <p className="text-sm font-medium" style={{ color: '#111827' }}>{company.name || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#6b7280' }}>{t.colCompanyCode}</label>
                <p className="text-sm font-medium" style={{ color: '#111827' }}>{company.companyCode || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#6b7280' }}>{t.colLocation}</label>
                <p className="text-sm font-medium" style={{ color: '#111827' }}>
                  <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>
                    {getLocationLabel(company.type)}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#6b7280' }}>{t.statusLabel}</label>
                <p className="text-sm font-medium">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold" style={company.status
                    ? { backgroundColor: '#dcfce7', color: '#166534' }
                    : { backgroundColor: '#fee2e2', color: '#991b1b' }
                  }>
                    {company.status ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        {t.statusActive}
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        {t.statusInactive}
                      </>
                    )}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Mail className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.contactInfo}
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#9ca3af' }} />
                <div className="flex-1">
                  <label className="text-xs font-semibold mb-1 block" style={{ color: '#6b7280' }}>{t.primaryEmail}</label>
                  <p className="text-sm" style={{ color: '#111827' }}>{company.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#9ca3af' }} />
                <div className="flex-1">
                  <label className="text-xs font-semibold mb-1 block" style={{ color: '#6b7280' }}>{t.phoneLabel}</label>
                  <p className="text-sm" style={{ color: '#111827' }}>{company.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#9ca3af' }} />
                <div className="flex-1">
                  <label className="text-xs font-semibold mb-1 block" style={{ color: '#6b7280' }}>{t.address}</label>
                  <p className="text-sm" style={{ color: '#111827' }}>{company.address || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#9ca3af' }} />
                <div className="flex-1">
                  <label className="text-xs font-semibold mb-1 block" style={{ color: '#6b7280' }}>{t.websiteLabel}</label>
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onMouseEnter={() => setHoveredWebsiteLink(true)}
                      onMouseLeave={() => setHoveredWebsiteLink(false)}
                      className="text-sm"
                      style={{
                        color: hoveredWebsiteLink ? '#1e40af' : '#2563eb',
                        textDecoration: hoveredWebsiteLink ? 'underline' : 'none'
                      }}
                    >
                      {company.website}
                    </a>
                  ) : (
                    <p className="text-sm" style={{ color: '#111827' }}>—</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {company.description && (
            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <FileText className="w-4 h-4" style={{ color: '#2563eb' }} />
                {t.companyDescription}
              </h2>
              <div className="prose prose-sm max-w-none">
                <p className="text-sm whitespace-pre-wrap" style={{ color: '#374151' }}>{company.description}</p>
              </div>
            </div>
          )}

          {/* Email Addresses */}
          {company.emailAddresses && company.emailAddresses.length > 0 && (
            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <Users className="w-4 h-4" style={{ color: '#2563eb' }} />
                {t.emailList} ({company.emailAddresses.length})
              </h2>
              <div className="space-y-2">
                {company.emailAddresses.map((emailAddr, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: '#f9fafb' }}>
                    <Mail className="w-4 h-4" style={{ color: '#9ca3af' }} />
                    <span className="text-sm" style={{ color: '#111827' }}>{emailAddr.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Business Fields */}
          {company.businessFields && company.businessFields.length > 0 && (
            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <Tag className="w-4 h-4" style={{ color: '#2563eb' }} />
                {t.businessFields} ({company.businessFields.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {company.businessFields.map((field, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}
                  >
                    {field.content}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Offices */}
          {company.offices && company.offices.length > 0 && (
            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <Home className="w-4 h-4" style={{ color: '#2563eb' }} />
                {t.offices} ({company.offices.length})
              </h2>
              <div className="space-y-3">
                {company.offices.map((office, index) => (
                  <div key={index} className="p-3 border rounded-lg" style={{ borderColor: '#e5e7eb' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4" style={{ color: '#9ca3af' }} />
                          <span className="text-sm font-medium" style={{ color: '#111827' }}>{office.address}</span>
                        </div>
                      </div>
                      {office.isHeadOffice && (
                        <span className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                          {t.headOffice}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jobs */}
          {company.jobs && company.jobs.length > 0 && (
            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <Briefcase className="w-4 h-4" style={{ color: '#2563eb' }} />
                Công việc liên quan ({company.jobs.length})
              </h2>
              <div className="space-y-2">
                {company.jobs.map((job, index) => (
                  <button
                    key={job.id}
                    onClick={() => navigate(`/admin/jobs/${job.id}`)}
                    onMouseEnter={() => setHoveredJobCardIndex(index)}
                    onMouseLeave={() => setHoveredJobCardIndex(null)}
                    className="w-full text-left p-3 border rounded-lg transition-colors"
                    style={{
                      borderColor: '#e5e7eb',
                      backgroundColor: hoveredJobCardIndex === index ? '#f9fafb' : 'transparent'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#111827' }}>{job.title}</p>
                        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Mã: {job.jobCode}</p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-semibold" style={job.status === 1
                        ? { backgroundColor: '#dcfce7', color: '#166534' }
                        : job.status === 2
                        ? { backgroundColor: '#fee2e2', color: '#991b1b' }
                        : { backgroundColor: '#f3f4f6', color: '#374151' }
                      }>
                        {job.status === 1 ? 'Published' : job.status === 2 ? 'Closed' : 'Draft'}
                      </span>
                    </div>
                  </button>
                ))}
                {company.jobs.length >= 10 && (
                  <button
                    onClick={() => navigate(`/admin/jobs?company=${companyId}`)}
                    onMouseEnter={() => setHoveredViewAllJobsButton(true)}
                    onMouseLeave={() => setHoveredViewAllJobsButton(false)}
                    className="w-full text-center py-2 text-sm font-medium"
                    style={{
                      color: hoveredViewAllJobsButton ? '#1e40af' : '#2563eb'
                    }}
                  >
                    Xem tất cả công việc →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          {/* Logo */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Building2 className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.companyLogo}
            </h2>
            <div className="flex items-center justify-center">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="w-32 h-32 object-contain rounded-lg border"
                  style={{ borderColor: '#e5e7eb' }}
                />
              ) : (
                <div className="w-32 h-32 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
                  <Building2 className="w-12 h-12" style={{ color: '#9ca3af' }} />
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <Calendar className="w-4 h-4" style={{ color: '#2563eb' }} />
              {t.systemInfo}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#6b7280' }}>{t.createdAtLabel}</label>
                <p className="text-sm" style={{ color: '#111827' }}>{formatDate(company.createdAt)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#6b7280' }}>{t.lastUpdated}</label>
                <p className="text-sm" style={{ color: '#111827' }}>{formatDate(company.updatedAt)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#6b7280' }}>{t.colId}</label>
                <p className="text-sm font-mono" style={{ color: '#111827' }}>{company.id}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              {t.quickActions}
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/admin/jobs?company=${companyId}`)}
                onMouseEnter={() => setHoveredViewAllJobsButton(true)}
                onMouseLeave={() => setHoveredViewAllJobsButton(false)}
                className="w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: hoveredViewAllJobsButton ? '#dbeafe' : '#eff6ff',
                  color: '#1e40af'
                }}
              >
                <Briefcase className="w-4 h-4" />
                {t.viewAllJobsButton}
              </button>
              <button
                onClick={() => navigate(`/admin/jobs/create?companyId=${companyId}`)}
                onMouseEnter={() => setHoveredCreateJobButton(true)}
                onMouseLeave={() => setHoveredCreateJobButton(false)}
                className="w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: hoveredCreateJobButton ? '#bbf7d0' : '#dcfce7',
                  color: '#166534'
                }}
              >
                <Briefcase className="w-4 h-4" />
                {t.createNewJob}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCompanyDetailPage;

