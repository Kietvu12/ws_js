import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import {
  ArrowLeft,
  Users,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  User,
  Mail,
  Phone,
} from 'lucide-react';

const GroupDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(null);
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);
  
  // Hover states
  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredEditButton, setHoveredEditButton] = useState(false);
  const [hoveredTabInfo, setHoveredTabInfo] = useState(false);
  const [hoveredTabAdmins, setHoveredTabAdmins] = useState(false);
  const [hoveredTabStatistics, setHoveredTabStatistics] = useState(false);
  const [hoveredAssignAdminButton, setHoveredAssignAdminButton] = useState(false);
  const [hoveredRemoveAdminButtonIndex, setHoveredRemoveAdminButtonIndex] = useState(null);
  const [hoveredCancelAssignButton, setHoveredCancelAssignButton] = useState(false);
  const [hoveredConfirmAssignButton, setHoveredConfirmAssignButton] = useState(false);
  const [hoveredCancelRemoveButton, setHoveredCancelRemoveButton] = useState(false);
  const [hoveredConfirmRemoveButton, setHoveredConfirmRemoveButton] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      loadGroupDetail();
      loadStatistics();
    }
  }, [id]);

  const loadGroupDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getGroupById(id);
      
      if (response.success && response.data?.group) {
        setGroup(response.data.group);
      } else {
        setError(response.message || 'Không tìm thấy thông tin nhóm');
      }
    } catch (error) {
      console.error('Error loading group detail:', error);
      setError(error.message || 'Lỗi khi tải thông tin nhóm');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await apiService.getGroupStatistics(id);
      if (response.success && response.data) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadAvailableAdmins = async () => {
    try {
      const response = await apiService.getAdmins({ role: 3, limit: 1000 }); // Admin CA Team
      if (response.success && response.data?.admins) {
        // Filter out admins already in this group
        const adminsInGroup = group?.admins?.map(a => a.id) || [];
        const available = response.data.admins.filter(a => !adminsInGroup.includes(a.id));
        setAvailableAdmins(available);
      }
    } catch (error) {
      console.error('Error loading available admins:', error);
    }
  };

  const handleAssignAdmin = async () => {
    if (!selectedAdminId) {
      alert('Vui lòng chọn admin');
      return;
    }

    try {
      setAssigning(true);
      await apiService.assignAdminToGroup(id, selectedAdminId);
      setShowAssignModal(false);
      setSelectedAdminId('');
      loadGroupDetail();
      loadStatistics();
    } catch (error) {
      console.error('Error assigning admin:', error);
      alert(error.message || 'Không thể gán admin vào nhóm');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    try {
      setRemoving(true);
      await apiService.removeAdminFromGroup(id, adminId);
      setShowRemoveModal(null);
      loadGroupDetail();
      loadStatistics();
    } catch (error) {
      console.error('Error removing admin:', error);
      alert(error.message || 'Không thể gỡ admin khỏi nhóm');
    } finally {
      setRemoving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2563eb' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg p-4" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', border: '1px solid' }}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" style={{ color: '#dc2626' }} />
            <p style={{ color: '#991b1b' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/groups')}
            onMouseEnter={() => setHoveredBackButton(true)}
            onMouseLeave={() => setHoveredBackButton(false)}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: hoveredBackButton ? '#f3f4f6' : 'transparent'
            }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#4b5563' }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>{group.name}</h1>
            <p className="text-sm mt-1" style={{ color: '#4b5563' }}>Mã nhóm: {group.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/groups/${id}/edit`)}
            onMouseEnter={() => setHoveredEditButton(true)}
            onMouseLeave={() => setHoveredEditButton(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: hoveredEditButton ? '#1d4ed8' : '#2563eb',
              color: 'white'
            }}
          >
            <Edit className="w-4 h-4" />
            <span>Chỉnh sửa</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: '#e5e7eb' }}>
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('info')}
            onMouseEnter={() => activeTab !== 'info' && setHoveredTabInfo(true)}
            onMouseLeave={() => setHoveredTabInfo(false)}
            className="pb-3 px-1 border-b-2 font-medium text-sm"
            style={{
              borderColor: activeTab === 'info' ? '#2563eb' : 'transparent',
              color: activeTab === 'info' ? '#2563eb' : (hoveredTabInfo ? '#111827' : '#4b5563')
            }}
          >
            Thông tin
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            onMouseEnter={() => activeTab !== 'admins' && setHoveredTabAdmins(true)}
            onMouseLeave={() => setHoveredTabAdmins(false)}
            className="pb-3 px-1 border-b-2 font-medium text-sm"
            style={{
              borderColor: activeTab === 'admins' ? '#2563eb' : 'transparent',
              color: activeTab === 'admins' ? '#2563eb' : (hoveredTabAdmins ? '#111827' : '#4b5563')
            }}
          >
            Thành viên ({group.admins?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            onMouseEnter={() => activeTab !== 'statistics' && setHoveredTabStatistics(true)}
            onMouseLeave={() => setHoveredTabStatistics(false)}
            className="pb-3 px-1 border-b-2 font-medium text-sm"
            style={{
              borderColor: activeTab === 'statistics' ? '#2563eb' : 'transparent',
              color: activeTab === 'statistics' ? '#2563eb' : (hoveredTabStatistics ? '#111827' : '#4b5563')
            }}
          >
            Thống kê
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="rounded-lg shadow-sm border p-6 space-y-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium" style={{ color: '#374151' }}>Tên nhóm</label>
              <p className="text-sm mt-1" style={{ color: '#111827' }}>{group.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#374151' }}>Mã nhóm</label>
              <p className="text-sm mt-1" style={{ color: '#111827' }}>{group.code}</p>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#374151' }}>Mã giới thiệu</label>
              <p className="text-sm mt-1" style={{ color: '#111827' }}>{group.referralCode || '—'}</p>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#374151' }}>Trạng thái</label>
              <div className="mt-1">
                {group.status === 1 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                    <CheckCircle className="w-3 h-3" />
                    Đang hoạt động
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                    <XCircle className="w-3 h-3" />
                    Không hoạt động
                  </span>
                )}
              </div>
            </div>
            {group.description && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium" style={{ color: '#374151' }}>Mô tả</label>
                <p className="text-sm mt-1" style={{ color: '#111827' }}>{group.description}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium" style={{ color: '#374151' }}>Ngày tạo</label>
              <p className="text-sm mt-1" style={{ color: '#111827' }}>{formatDate(group.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: '#374151' }}>Ngày cập nhật</label>
              <p className="text-sm mt-1" style={{ color: '#111827' }}>{formatDate(group.updatedAt)}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>Thành viên nhóm</h2>
            <button
              onClick={() => {
                loadAvailableAdmins();
                setShowAssignModal(true);
              }}
              onMouseEnter={() => setHoveredAssignAdminButton(true)}
              onMouseLeave={() => setHoveredAssignAdminButton(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: hoveredAssignAdminButton ? '#1d4ed8' : '#2563eb',
                color: 'white'
              }}
            >
              <UserPlus className="w-4 h-4" />
              <span>Gán admin</span>
            </button>
          </div>
          {group.admins && group.admins.length > 0 ? (
            <div className="space-y-3">
              {group.admins.map((admin, index) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dbeafe' }}>
                      <User className="w-5 h-5" style={{ color: '#2563eb' }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#111827' }}>{admin.name || admin.email}</p>
                      <p className="text-xs" style={{ color: '#4b5563' }}>{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {admin.isActive && admin.status === 1 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                        <CheckCircle className="w-3 h-3" />
                        Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                        <XCircle className="w-3 h-3" />
                        Không hoạt động
                      </span>
                    )}
                    <button
                      onClick={() => setShowRemoveModal(admin)}
                      onMouseEnter={() => setHoveredRemoveAdminButtonIndex(index)}
                      onMouseLeave={() => setHoveredRemoveAdminButtonIndex(null)}
                      className="p-2 rounded-lg transition-colors"
                      style={{
                        color: '#dc2626',
                        backgroundColor: hoveredRemoveAdminButtonIndex === index ? '#fef2f2' : 'transparent'
                      }}
                      title="Gỡ khỏi nhóm"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4" style={{ color: '#9ca3af' }} />
              <p style={{ color: '#4b5563' }}>Chưa có admin nào trong nhóm</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'statistics' && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#dbeafe' }}>
                <Users className="w-6 h-6" style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: '#4b5563' }}>Số admin</p>
                <p className="text-2xl font-bold" style={{ color: '#111827' }}>{statistics.adminCount || 0}</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  {statistics.activeAdminCount || 0} hoạt động / {statistics.inactiveAdminCount || 0} không hoạt động
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
                <Users className="w-6 h-6" style={{ color: '#16a34a' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: '#4b5563' }}>Số CTV</p>
                <p className="text-2xl font-bold" style={{ color: '#111827' }}>{statistics.collaboratorCount || 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f3e8ff' }}>
                <BarChart3 className="w-6 h-6" style={{ color: '#9333ea' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: '#4b5563' }}>Số đơn ứng tuyển</p>
                <p className="text-2xl font-bold" style={{ color: '#111827' }}>{statistics.jobApplicationCount || 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg shadow-sm border p-6" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fed7aa' }}>
                <BarChart3 className="w-6 h-6" style={{ color: '#ea580c' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: '#4b5563' }}>Số CV</p>
                <p className="text-2xl font-bold" style={{ color: '#111827' }}>{statistics.cvCount || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Admin Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg p-6 max-w-md w-full mx-4" style={{ backgroundColor: 'white' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>Gán admin vào nhóm</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>Chọn admin</label>
              <select
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
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
                <option value="">-- Chọn admin --</option>
                {availableAdmins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name || admin.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAdminId('');
                }}
                disabled={assigning}
                onMouseEnter={() => !assigning && setHoveredCancelAssignButton(true)}
                onMouseLeave={() => setHoveredCancelAssignButton(false)}
                className="px-4 py-2 border rounded-lg"
                style={{
                  borderColor: '#d1d5db',
                  color: '#374151',
                  backgroundColor: hoveredCancelAssignButton ? '#f9fafb' : 'transparent',
                  opacity: assigning ? 0.5 : 1,
                  cursor: assigning ? 'not-allowed' : 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleAssignAdmin}
                disabled={assigning || !selectedAdminId}
                onMouseEnter={() => !(assigning || !selectedAdminId) && setHoveredConfirmAssignButton(true)}
                onMouseLeave={() => setHoveredConfirmAssignButton(false)}
                className="px-4 py-2 rounded-lg flex items-center gap-2"
                style={{
                  backgroundColor: (assigning || !selectedAdminId)
                    ? '#9ca3af'
                    : (hoveredConfirmAssignButton ? '#1d4ed8' : '#2563eb'),
                  color: 'white',
                  opacity: (assigning || !selectedAdminId) ? 0.5 : 1,
                  cursor: (assigning || !selectedAdminId) ? 'not-allowed' : 'pointer'
                }}
              >
                {assigning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gán...</span>
                  </>
                ) : (
                  'Gán'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Admin Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg p-6 max-w-md w-full mx-4" style={{ backgroundColor: 'white' }}>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6" style={{ color: '#dc2626' }} />
              <h3 className="text-lg font-semibold" style={{ color: '#111827' }}>Xác nhận gỡ admin</h3>
            </div>
            <p className="text-sm mb-6" style={{ color: '#374151' }}>
              Bạn có chắc chắn muốn gỡ <strong>{showRemoveModal.name || showRemoveModal.email}</strong> khỏi nhóm này?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRemoveModal(null)}
                disabled={removing}
                onMouseEnter={() => !removing && setHoveredCancelRemoveButton(true)}
                onMouseLeave={() => setHoveredCancelRemoveButton(false)}
                className="px-4 py-2 border rounded-lg"
                style={{
                  borderColor: '#d1d5db',
                  color: '#374151',
                  backgroundColor: hoveredCancelRemoveButton ? '#f9fafb' : 'transparent',
                  opacity: removing ? 0.5 : 1,
                  cursor: removing ? 'not-allowed' : 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={() => handleRemoveAdmin(showRemoveModal.id)}
                disabled={removing}
                onMouseEnter={() => !removing && setHoveredConfirmRemoveButton(true)}
                onMouseLeave={() => setHoveredConfirmRemoveButton(false)}
                className="px-4 py-2 rounded-lg flex items-center gap-2"
                style={{
                  backgroundColor: removing
                    ? '#9ca3af'
                    : (hoveredConfirmRemoveButton ? '#b91c1c' : '#dc2626'),
                  color: 'white',
                  opacity: removing ? 0.5 : 1,
                  cursor: removing ? 'not-allowed' : 'pointer'
                }}
              >
                {removing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gỡ...</span>
                  </>
                ) : (
                  'Gỡ'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetailPage;

