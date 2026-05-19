import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Target,
  Calendar,
  Edit,
  Trash2,
  Briefcase,
  Users,
  Eye,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Building2,
} from 'lucide-react';
import apiService from '../../services/api';

const AdminCampaignDetailPage = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  
  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredEditButton, setHoveredEditButton] = useState(false);
  const [hoveredDeleteButton, setHoveredDeleteButton] = useState(false);
  const [hoveredBackToListButton, setHoveredBackToListButton] = useState(false);
  const [hoveredAddJobButton, setHoveredAddJobButton] = useState(false);
  const [hoveredJobCardIndex, setHoveredJobCardIndex] = useState(null);
  const [hoveredJobLinkIndex, setHoveredJobLinkIndex] = useState(null);

  useEffect(() => {
    loadCampaignDetail();
    loadCampaignJobs();
  }, [campaignId]);

  const loadCampaignDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAdminCampaignById(campaignId);
      
      if (response.success && response.data?.campaign) {
        setCampaign(response.data.campaign);
      } else {
        setError(response.message || 'Không tìm thấy thông tin chiến dịch');
      }
    } catch (error) {
      console.error('Error loading campaign detail:', error);
      setError(error.message || 'Lỗi khi tải thông tin chiến dịch');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignJobs = async () => {
    try {
      setJobsLoading(true);
      const all = [];
      let cursor = null;
      const limit = 50;
      for (let i = 0; i < 40; i += 1) {
        const params = {
          campaignId,
          limit,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        };
        if (cursor) params.cursor = cursor;
        const response = await apiService.getAdminJobs(params);
        if (!response.success || !response.data?.jobs?.length) break;
        all.push(...response.data.jobs);
        const pag = response.data.pagination || {};
        if (!pag.hasMore || !pag.nextCursor) break;
        cursor = pag.nextCursor;
      }
      setJobs(all);
    } catch (error) {
      console.error('Error loading campaign jobs:', error);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa chiến dịch này? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await apiService.deleteAdminCampaign(campaignId);
      if (response.success) {
        alert('Xóa chiến dịch thành công!');
        navigate('/admin/campaigns');
      } else {
        alert(response.message || 'Có lỗi xảy ra khi xóa chiến dịch');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert(error.message || 'Có lỗi xảy ra khi xóa chiến dịch');
    } finally {
      setDeleting(false);
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

  const formatStatus = (status) => {
    const statusMap = {
      0: { label: 'Ngừng hoạt động', style: { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' }, icon: XCircle },
      1: { label: 'Đang hoạt động', style: { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' }, icon: CheckCircle },
      2: { label: 'Đã kết thúc', style: { backgroundColor: '#f3f4f6', color: '#1f2937', borderColor: '#d1d5db' }, icon: Clock },
    };
    return statusMap[status] || statusMap[0];
  };

  const getStatusFromDates = (startDate, endDate, status) => {
    if (status === 1) return { label: 'Đang hoạt động', style: { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#86efac' }, icon: CheckCircle };
    if (status === 2) return { label: 'Đã kết thúc', style: { backgroundColor: '#f3f4f6', color: '#1f2937', borderColor: '#d1d5db' }, icon: Clock };
    if (status === 0) {
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (now < start) return { label: 'Sắp diễn ra', style: { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' }, icon: Clock };
      if (now > end) return { label: 'Đã kết thúc', style: { backgroundColor: '#f3f4f6', color: '#1f2937', borderColor: '#d1d5db' }, icon: Clock };
      return { label: 'Ngừng hoạt động', style: { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' }, icon: XCircle };
    }
    return { label: 'Ngừng hoạt động', style: { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' }, icon: XCircle };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2563eb' }}></div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="px-2 sm:px-3 py-3">
        <div className="rounded-lg border p-4 text-center" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <p className="text-xs" style={{ color: '#dc2626' }}>{error || 'Không tìm thấy thông tin chiến dịch'}</p>
          <button
            onClick={() => navigate('/admin/campaigns')}
            onMouseEnter={() => setHoveredBackToListButton(true)}
            onMouseLeave={() => setHoveredBackToListButton(false)}
            className="mt-3 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold"
            style={{ backgroundColor: hoveredBackToListButton ? '#1d4ed8' : '#2563eb', color: 'white' }}
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusFromDates(
    campaign.startDate || campaign.start_date,
    campaign.endDate || campaign.end_date,
    campaign.status
  );
  const StatusIcon = statusInfo.icon;
  const statusStyle = statusInfo.style;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0 px-2 sm:px-3 py-1.5 space-y-3">
        <div className="rounded-lg p-3 border flex items-center justify-between flex-shrink-0" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/campaigns')}
              onMouseEnter={() => setHoveredBackButton(true)}
              onMouseLeave={() => setHoveredBackButton(false)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: hoveredBackButton ? '#f3f4f6' : 'transparent' }}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: '#4b5563' }} />
            </button>
            <div>
              <h1 className="text-base font-bold" style={{ color: '#111827' }}>Chi tiết chiến dịch</h1>
              <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: '#6b7280' }}>
                ID: {campaign.id} - {campaign.name || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold border flex items-center gap-1" style={statusStyle}>
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </span>
            <button
              onClick={() => navigate(`/admin/campaigns/${campaignId}/edit`)}
              onMouseEnter={() => setHoveredEditButton(true)}
              onMouseLeave={() => setHoveredEditButton(false)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors flex items-center gap-1.5"
              style={{ backgroundColor: hoveredEditButton ? '#1d4ed8' : '#2563eb', color: 'white' }}
            >
              <Edit className="w-3.5 h-3.5" />
              Chỉnh sửa
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              onMouseEnter={() => !deleting && setHoveredDeleteButton(true)}
              onMouseLeave={() => setHoveredDeleteButton(false)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: deleting ? '#fca5a5' : (hoveredDeleteButton ? '#b91c1c' : '#dc2626'),
                color: 'white',
                opacity: deleting ? 0.5 : 1,
                cursor: deleting ? 'not-allowed' : 'pointer'
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 space-y-3">
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-xs font-bold mb-2 flex items-center gap-1.5 pb-2 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <Target className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                Thông tin chiến dịch
              </h2>
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-semibold mb-0.5" style={{ color: '#6b7280' }}>Tên chiến dịch</label>
                  <p className="text-xs font-semibold" style={{ color: '#111827' }}>{campaign.name || '—'}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-0.5" style={{ color: '#6b7280' }}>Mô tả</label>
                  <p className="text-xs whitespace-pre-wrap" style={{ color: '#111827' }}>{campaign.description || '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold mb-0.5" style={{ color: '#6b7280' }}>Ngày bắt đầu</label>
                    <p className="text-xs flex items-center gap-1" style={{ color: '#111827' }}>
                      <Calendar className="w-3 h-3" style={{ color: '#9ca3af' }} />
                      {formatDate(campaign.startDate || campaign.start_date)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-0.5" style={{ color: '#6b7280' }}>Ngày kết thúc</label>
                    <p className="text-xs flex items-center gap-1" style={{ color: '#111827' }}>
                      <Calendar className="w-3 h-3" style={{ color: '#9ca3af' }} />
                      {formatDate(campaign.endDate || campaign.end_date)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold mb-0.5" style={{ color: '#6b7280' }}>Số CV tối đa</label>
                    <p className="text-xs" style={{ color: '#111827' }}>{campaign.maxCv || campaign.max_cv || 0}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-0.5" style={{ color: '#6b7280' }}>Phần trăm (%)</label>
                    <p className="text-xs" style={{ color: '#111827' }}>{campaign.percent || 0}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-xs font-bold mb-2 flex items-center gap-1.5 pb-2 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <Briefcase className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                Danh sách công việc ({jobs.length})
              </h2>
              {jobsLoading ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderColor: '#2563eb' }}></div>
                  <p className="text-[10px] mt-1.5" style={{ color: '#6b7280' }}>Đang tải...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs" style={{ color: '#6b7280' }}>Chưa có công việc nào trong chiến dịch này</p>
                  <button
                    onClick={() => navigate(`/admin/jobs?campaign=${campaignId}`)}
                    onMouseEnter={() => setHoveredAddJobButton(true)}
                    onMouseLeave={() => setHoveredAddJobButton(false)}
                    className="mt-2 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold"
                    style={{ backgroundColor: hoveredAddJobButton ? '#1d4ed8' : '#2563eb', color: 'white' }}
                  >
                    Thêm công việc
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {jobs.map((job, index) => (
                    <div
                      key={job.id}
                      className="border rounded-lg p-2 sm:p-2.5 transition-colors"
                      onMouseEnter={() => setHoveredJobCardIndex(index)}
                      onMouseLeave={() => setHoveredJobCardIndex(null)}
                      style={{ borderColor: '#e5e7eb', backgroundColor: hoveredJobCardIndex === index ? '#f9fafb' : 'transparent' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => navigate(`/admin/jobs/${job.id}`)}
                            onMouseEnter={() => setHoveredJobLinkIndex(index)}
                            onMouseLeave={() => setHoveredJobLinkIndex(null)}
                            className="text-[10px] sm:text-xs font-semibold flex items-center gap-1 text-left"
                            style={{ color: hoveredJobLinkIndex === index ? '#2563eb' : '#111827' }}
                          >
                            {job.title || '—'}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </button>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {job.company && (
                              <span className="text-[10px] flex items-center gap-1" style={{ color: '#6b7280' }}>
                                <Building2 className="w-2.5 h-2.5" />
                                {job.company.name || '—'}
                              </span>
                            )}
                            {job.jobCode && (
                              <span className="text-[10px]" style={{ color: '#6b7280' }}>({job.jobCode})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-xs font-bold mb-2 flex items-center gap-1.5 pb-2 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <TrendingUp className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                Thống kê
              </h2>
              <div className="space-y-2">
                <div className="border rounded p-2" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Briefcase className="w-3 h-3" style={{ color: '#2563eb' }} />
                    <span className="text-[10px] font-medium" style={{ color: '#1e40af' }}>Số job</span>
                  </div>
                  <div className="text-xs font-bold" style={{ color: '#1e3a8a' }}>{jobs.length}</div>
                </div>
                <div className="border rounded p-2" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Users className="w-3 h-3" style={{ color: '#16a34a' }} />
                    <span className="text-[10px] font-medium" style={{ color: '#166534' }}>Ứng tuyển</span>
                  </div>
                  <div className="text-xs font-bold" style={{ color: '#14532d' }}>{campaign.applicationsCount || campaign.applications?.length || 0}</div>
                </div>
                <div className="border rounded p-2" style={{ backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <TrendingUp className="w-3 h-3" style={{ color: '#9333ea' }} />
                    <span className="text-[10px] font-medium" style={{ color: '#6b21a8' }}>Tiến cử</span>
                  </div>
                  <div className="text-xs font-bold" style={{ color: '#581c87' }}>{campaign.nominationsCount || 0}</div>
                </div>
                <div className="border rounded p-2" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Eye className="w-3 h-3" style={{ color: '#ea580c' }} />
                    <span className="text-[10px] font-medium" style={{ color: '#9a3412' }}>Lượt xem</span>
                  </div>
                  <div className="text-xs font-bold" style={{ color: '#7c2d12' }}>{campaign.viewsCount || 0}</div>
                </div>
              </div>
            </div>

            {campaign.applications && campaign.applications.length > 0 && (
              <div className="rounded-lg p-3 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
                <h2 className="text-xs font-bold mb-2 flex items-center gap-1.5 pb-2 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                  <Users className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                  Đơn ứng tuyển ({campaign.applications.length})
                </h2>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {campaign.applications.map((app) => (
                    <div key={app.id} className="border rounded p-1.5 text-[10px] sm:text-xs" style={{ borderColor: '#e5e7eb' }}>
                      <div className="font-medium" style={{ color: '#111827' }}>
                        {app.collaborator?.name || '—'} - {app.job?.title || '—'}
                      </div>
                      <div className="mt-0.5" style={{ color: '#6b7280' }}>
                        {app.job?.jobCode || app.job?.id || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCampaignDetailPage;

