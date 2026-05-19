import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileCheck,
  FileText,
  DollarSign,
  User,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import apiService from '../../services/api';

const MyGroupPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState(null);
  
  // Hover states
  const [hoveredViewCollaboratorsButton, setHoveredViewCollaboratorsButton] = useState(false);
  const [hoveredViewNominationsButton, setHoveredViewNominationsButton] = useState(false);
  const [hoveredViewPaymentsButton, setHoveredViewPaymentsButton] = useState(false);

  useEffect(() => {
    loadGroupData();
  }, []);

  const loadGroupData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load group info and statistics in parallel
      const [groupResponse, statsResponse] = await Promise.all([
        apiService.getMyGroup(),
        apiService.getMyGroupStatistics()
      ]);

      if (groupResponse.success) {
        setGroup(groupResponse.data.group);
      }

      if (statsResponse.success) {
        setStatistics(statsResponse.data);
      }
    } catch (err) {
      console.error('Error loading group data:', err);
      setError(err.message || 'Không thể tải thông tin nhóm');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2563eb' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-2 sm:px-3 py-3">
        <div className="rounded-lg p-3 border" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4" style={{ color: '#dc2626' }} />
            <p className="text-xs" style={{ color: '#991b1b' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="px-2 sm:px-3 py-3">
        <div className="rounded-lg p-3 border" style={{ backgroundColor: '#fefce8', borderColor: '#fde047' }}>
          <p className="text-xs" style={{ color: '#854d0e' }}>Bạn chưa được gán vào nhóm nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0 px-2 sm:px-3 py-1.5 space-y-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color: '#111827' }}>Thông tin nhóm</h1>
          <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Xem thông tin và thống kê nhóm của bạn</p>
        </div>

        <div className="rounded-lg border p-3" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <h2 className="text-sm font-bold mb-2" style={{ color: '#111827' }}>Thông tin nhóm</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold block" style={{ color: '#6b7280' }}>Tên nhóm</label>
              <p className="text-xs mt-0.5" style={{ color: '#111827' }}>{group.name}</p>
            </div>
            <div>
              <label className="text-[10px] font-semibold block" style={{ color: '#6b7280' }}>Mã nhóm</label>
              <p className="text-xs mt-0.5" style={{ color: '#111827' }}>{group.code}</p>
            </div>
            {group.referralCode && (
              <div>
                <label className="text-[10px] font-semibold block" style={{ color: '#6b7280' }}>Mã giới thiệu</label>
                <p className="text-xs mt-0.5" style={{ color: '#111827' }}>{group.referralCode}</p>
              </div>
            )}
            <div>
              <label className="text-[10px] font-semibold block" style={{ color: '#6b7280' }}>Trạng thái</label>
              <div className="mt-0.5">
                {group.status === 1 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                    <CheckCircle className="w-3 h-3" />
                    Đang hoạt động
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                    <XCircle className="w-3 h-3" />
                    Không hoạt động
                  </span>
                )}
              </div>
            </div>
            {group.description && (
              <div className="md:col-span-2">
                <label className="text-[10px] font-semibold block" style={{ color: '#6b7280' }}>Mô tả</label>
                <p className="text-xs mt-0.5" style={{ color: '#111827' }}>{group.description}</p>
              </div>
            )}
          </div>
        </div>

        {statistics && (
          <>
            <div className="rounded-lg border p-3" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-2" style={{ color: '#111827' }}>Thống kê nhóm</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 sm:gap-2">
                <div className="rounded p-2 md:p-2.5 flex items-start gap-1.5" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', border: '1px solid' }}>
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#dbeafe' }}>
                    <Users className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: '#2563eb' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] md:text-[9px]" style={{ color: '#94a3b8' }}>Số CTV</p>
                    <p className="text-[10px] md:text-xs font-bold mt-0.5" style={{ color: '#111827' }}>{statistics.groupStatistics?.collaboratorCount || 0}</p>
                  </div>
                </div>
                <div className="rounded p-2 md:p-2.5 flex items-start gap-1.5" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', border: '1px solid' }}>
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#dcfce7' }}>
                    <FileCheck className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: '#16a34a' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] md:text-[9px]" style={{ color: '#94a3b8' }}>Số đơn ứng tuyển</p>
                    <p className="text-[10px] md:text-xs font-bold mt-0.5" style={{ color: '#111827' }}>{statistics.groupStatistics?.jobApplicationCount || 0}</p>
                  </div>
                </div>
                <div className="rounded p-2 md:p-2.5 flex items-start gap-1.5" style={{ backgroundColor: '#faf5ff', borderColor: '#e9d5ff', border: '1px solid' }}>
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#f3e8ff' }}>
                    <FileText className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: '#9333ea' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] md:text-[9px]" style={{ color: '#94a3b8' }}>Số CV</p>
                    <p className="text-[10px] md:text-xs font-bold mt-0.5" style={{ color: '#111827' }}>{statistics.groupStatistics?.cvCount || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-3" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-2" style={{ color: '#111827' }}>Thống kê cá nhân</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-2">
                <div className="rounded p-2 md:p-2.5 flex items-start gap-1.5" style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', border: '1px solid' }}>
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#e0e7ff' }}>
                    <Users className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: '#4f46e5' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] md:text-[9px]" style={{ color: '#94a3b8' }}>CTV được phân công</p>
                    <p className="text-[10px] md:text-xs font-bold mt-0.5" style={{ color: '#111827' }}>{statistics.personalStatistics?.collaboratorCount || 0}</p>
                  </div>
                </div>
                <div className="rounded p-2 md:p-2.5 flex items-start gap-1.5" style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa', border: '1px solid' }}>
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#ffedd5' }}>
                    <FileCheck className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: '#ea580c' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] md:text-[9px]" style={{ color: '#94a3b8' }}>Đơn đã xử lý</p>
                    <p className="text-[10px] md:text-xs font-bold mt-0.5" style={{ color: '#111827' }}>{statistics.personalStatistics?.jobApplicationCount || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {group.admins && group.admins.length > 0 && (
          <div className="rounded-lg border p-3" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-2" style={{ color: '#111827' }}>Thành viên nhóm</h2>
            <div className="space-y-2">
              {group.admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-2 rounded-lg border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#dbeafe' }}>
                      <User className="w-4 h-4" style={{ color: '#2563eb' }} />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium" style={{ color: '#111827' }}>{admin.name || admin.email}</p>
                      <p className="text-[10px]" style={{ color: '#6b7280' }}>{admin.email}</p>
                    </div>
                  </div>
                  {admin.isActive && admin.status === 1 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                      <CheckCircle className="w-2.5 h-2.5" />
                      Hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                      <XCircle className="w-2.5 h-2.5" />
                      Không hoạt động
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border p-3" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <h2 className="text-sm font-bold mb-2" style={{ color: '#111827' }}>Thao tác nhanh</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/admin/group-collaborators')}
              onMouseEnter={() => setHoveredViewCollaboratorsButton(true)}
              onMouseLeave={() => setHoveredViewCollaboratorsButton(false)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-colors"
              style={{
                backgroundColor: hoveredViewCollaboratorsButton ? '#dbeafe' : '#eff6ff',
                borderColor: '#bfdbfe',
                color: '#1e40af',
                border: '1px solid #bfdbfe'
              }}
            >
              <Users className="w-3.5 h-3.5" />
              Xem CTV của nhóm
            </button>
            <button
              onClick={() => navigate('/admin/nominations')}
              onMouseEnter={() => setHoveredViewNominationsButton(true)}
              onMouseLeave={() => setHoveredViewNominationsButton(false)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-colors"
              style={{
                backgroundColor: hoveredViewNominationsButton ? '#bbf7d0' : '#f0fdf4',
                borderColor: '#86efac',
                color: '#14532d',
                border: '1px solid #86efac'
              }}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Xem đơn ứng tuyển
            </button>
            <button
              onClick={() => navigate('/admin/payments')}
              onMouseEnter={() => setHoveredViewPaymentsButton(true)}
              onMouseLeave={() => setHoveredViewPaymentsButton(false)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-colors"
              style={{
                backgroundColor: hoveredViewPaymentsButton ? '#e9d5ff' : '#faf5ff',
                borderColor: '#d8b4fe',
                color: '#581c87',
                border: '1px solid #d8b4fe'
              }}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Xem thanh toán
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyGroupPage;

