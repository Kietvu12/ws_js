import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  MapPin,
  DollarSign,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';
import { getJobApplicationStatus, getJobApplicationStatusLabelByLanguage } from '../../utils/jobApplicationStatus';

/**
 * Danh sách ứng tuyển của một ứng viên.
 * Dùng cho cả CTV và Admin (truyền useAdminAPI={true} khi render trong Admin).
 */
const CandidateApplicationsPage = ({ useAdminAPI = false }) => {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  const [candidate, setCandidate] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  const backPath = useAdminAPI ? `/admin/candidates/${candidateId}` : `/agent/candidates/${candidateId}`;
  const nominationDetailPathPrefix = useAdminAPI ? '/admin/nominations' : '/agent/nominations';

  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredViewButtonIndex, setHoveredViewButtonIndex] = useState(null);
  const [hoveredPaginationNavButton, setHoveredPaginationNavButton] = useState(null);

  useEffect(() => {
    loadCandidate();
  }, [candidateId, useAdminAPI]);

  useEffect(() => {
    if (candidate?.code || (useAdminAPI && candidate?.id)) {
      loadApplications();
    }
  }, [candidate?.code, candidate?.id, currentPage, useAdminAPI]);

  const loadCandidate = async () => {
    try {
      setLoading(true);
      const response = useAdminAPI
        ? await apiService.getAdminCVById(candidateId)
        : await apiService.getCVStorageById(candidateId);
      if (response.success && response.data?.cv) {
        setCandidate(response.data.cv);
      }
    } catch (error) {
      console.error('Error loading candidate:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    const cvCode = candidate?.code;
    const cvId = candidate?.id;
    if (!cvCode && !(useAdminAPI && cvId)) return;
    try {
      setLoading(true);
      const params = { page: currentPage, limit: itemsPerPage };
      if (useAdminAPI) {
        if (cvCode) params.cvCode = cvCode;
        else if (cvId) params.cvId = cvId;
      } else {
        params.cvCode = cvCode;
      }
      const response = useAdminAPI
        ? await apiService.getAdminJobApplications(params)
        : await apiService.getJobApplications(params);
      if (response.success && response.data) {
        setApplications(response.data.jobApplications || []);
        setTotalItems(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.totalPages || 0);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return dateString;
    }
  };

  const pickJobTitle = (job) => {
    if (!job) return 'N/A';
    const vi = job.title;
    const en = job.titleEn || job.title_en;
    const jp = job.titleJp || job.title_jp;
    if (language === 'en') return en || vi || 'N/A';
    if (language === 'ja') return jp || en || vi || 'N/A';
    return vi || en || jp || 'N/A';
  };

  const getStatusStyle = (status) => {
    const info = getJobApplicationStatus(status);
    const categoryStyles = {
      rejected: { backgroundColor: '#fee2e2', color: '#991b1b' },
      success: { backgroundColor: '#dcfce7', color: '#166534' },
      processing: { backgroundColor: '#dbeafe', color: '#1e40af' },
      interview: { backgroundColor: '#e0e7ff', color: '#3730a3' },
      waiting: { backgroundColor: '#fef3c7', color: '#92400e' },
      cancelled: { backgroundColor: '#f3f4f6', color: '#374151' }
    };
    return categoryStyles[info.category] || { backgroundColor: '#f3f4f6', color: '#1f2937' };
  };

  if (loading && !candidate) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#2563eb' }}></div>
          <p style={{ color: '#4b5563' }}>{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(backPath)}
              onMouseEnter={() => setHoveredBackButton(true)}
              onMouseLeave={() => setHoveredBackButton(false)}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: hoveredBackButton ? '#f3f4f6' : 'transparent'
              }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: '#374151' }} />
            </button>
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#111827' }}>{t.applicationsListTitle}</h1>
              {candidate && (
                <p className="text-sm mt-1" style={{ color: '#4b5563' }}>
                  {t.candidateLabel}: {candidate.name || candidate.nameKanji || 'N/A'} ({candidate.code})
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="rounded-xl border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        {loading ? (
          <div className="p-8 text-center" style={{ color: '#6b7280' }}>
            {t.loadingApplications}
          </div>
        ) : applications.length === 0 ? (
          <div className="p-8 text-center" style={{ color: '#6b7280' }}>
            {t.noApplications}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold" style={{ color: '#111827' }}>{t.colJobPosition}</th>
                    <th className="px-4 py-3 text-left text-xs font-bold" style={{ color: '#111827' }}>{t.colCompany}</th>
                    <th className="px-4 py-3 text-left text-xs font-bold" style={{ color: '#111827' }}>{t.colAppliedDate}</th>
                    <th className="px-4 py-3 text-left text-xs font-bold" style={{ color: '#111827' }}>{t.status}</th>
                    <th className="px-4 py-3 text-center text-xs font-bold" style={{ color: '#111827' }}>{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#e5e7eb' }}>
                  {applications.map((app, index) => (
                    <tr 
                      key={app.id} 
                      className="transition-colors"
                      style={{
                        backgroundColor: hoveredRowIndex === index ? '#f9fafb' : 'transparent'
                      }}
                      onMouseEnter={() => setHoveredRowIndex(index)}
                      onMouseLeave={() => setHoveredRowIndex(null)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" style={{ color: '#9ca3af' }} />
                          <span className="text-sm font-medium" style={{ color: '#111827' }}>
                            {pickJobTitle(app.job) || app.title || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" style={{ color: '#9ca3af' }} />
                          <span className="text-sm" style={{ color: '#374151' }}>
                            {app.job?.recruitingCompany?.companyName || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" style={{ color: '#9ca3af' }} />
                          <span className="text-sm" style={{ color: '#374151' }}>
                            {formatDate(app.appliedAt || app.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs font-medium" style={getStatusStyle(app.status)}>
                          {getJobApplicationStatusLabelByLanguage(app.status, language)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`${nominationDetailPathPrefix}/${app.id}`)}
                          onMouseEnter={() => setHoveredViewButtonIndex(index)}
                          onMouseLeave={() => setHoveredViewButtonIndex(null)}
                          className="p-1 rounded transition-colors"
                          style={{
                            color: hoveredViewButtonIndex === index ? '#1e40af' : '#2563eb',
                            backgroundColor: hoveredViewButtonIndex === index ? '#eff6ff' : 'transparent'
                          }}
                          title={t.viewDetail}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: '#e5e7eb' }}>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('first')}
                    onMouseLeave={() => setHoveredPaginationNavButton(null)}
                    className="px-2 py-1 border rounded text-xs font-bold transition-colors"
                    style={{
                      backgroundColor: hoveredPaginationNavButton === 'first' ? '#f9fafb' : 'white',
                      borderColor: '#d1d5db',
                      color: '#374151',
                      opacity: currentPage === 1 ? 0.5 : 1,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    onMouseEnter={() => currentPage !== 1 && setHoveredPaginationNavButton('prev')}
                    onMouseLeave={() => setHoveredPaginationNavButton(null)}
                    className="px-2 py-1 border rounded text-xs font-bold transition-colors"
                    style={{
                      backgroundColor: hoveredPaginationNavButton === 'prev' ? '#f9fafb' : 'white',
                      borderColor: '#d1d5db',
                      color: '#374151',
                      opacity: currentPage === 1 ? 0.5 : 1,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs px-2" style={{ color: '#4b5563' }}>
                    {t.pageOf} {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    onMouseEnter={() => currentPage < totalPages && setHoveredPaginationNavButton('next')}
                    onMouseLeave={() => setHoveredPaginationNavButton(null)}
                    className="px-2 py-1 border rounded text-xs font-bold transition-colors"
                    style={{
                      backgroundColor: hoveredPaginationNavButton === 'next' ? '#f9fafb' : 'white',
                      borderColor: '#d1d5db',
                      color: '#374151',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    onMouseEnter={() => currentPage < totalPages && setHoveredPaginationNavButton('last')}
                    onMouseLeave={() => setHoveredPaginationNavButton(null)}
                    className="px-2 py-1 border rounded text-xs font-bold transition-colors"
                    style={{
                      backgroundColor: hoveredPaginationNavButton === 'last' ? '#f9fafb' : 'white',
                      borderColor: '#d1d5db',
                      color: '#374151',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs" style={{ color: '#4b5563' }}>
                  {totalItems} {t.resultsCount}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CandidateApplicationsPage;

