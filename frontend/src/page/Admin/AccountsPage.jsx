import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  User,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  Shield,
  Building2,
  AlertCircle,
} from 'lucide-react';

const I18N = {
  vi: {
    title: 'Quản lý tài khoản',
    subtitle: 'Quản lý tài khoản admin và CTV trong hệ thống',
    createButton: 'Tạo tài khoản mới',
    adminTab: 'Admin',
    collaboratorTab: 'Cộng tác viên (CTV)',
    collaboratorTabShort: 'CTV',
    searchPlaceholder: 'Tìm kiếm theo tên, email...',
    roleAll: 'Tất cả vai trò',
    statusAll: 'Tất cả trạng thái',
    statusActive: 'Đang hoạt động',
    statusInactive: 'Không hoạt động',
    searchButton: 'Tìm',
    noAccounts: 'Không có tài khoản nào',
    tableAccount: 'Tài khoản',
    tableRole: 'Vai trò',
    tableGroup: 'Nhóm',
    tableCode: 'Mã CTV',
    tableAddress: 'Địa chỉ',
    tableStatus: 'Trạng thái',
    tableCreatedAt: 'Ngày tạo',
    tableActions: 'Thao tác',
    roleSuperAdmin: 'Super Admin',
    roleBackoffice: 'Admin Backoffice',
    roleCATeam: 'Admin CA Team',
    roleUnknown: 'Không xác định',
    active: 'Đang hoạt động',
    inactive: 'Không hoạt động',
    viewDetail: 'Xem chi tiết',
    edit: 'Chỉnh sửa',
    delete: 'Xóa',
    deleteError: 'Không thể xóa tài khoản',
  },
  en: {
    title: 'Account Management',
    subtitle: 'Manage admin and collaborator accounts in the system',
    createButton: 'Create new account',
    adminTab: 'Admin',
    collaboratorTab: 'Collaborator (CTV)',
    collaboratorTabShort: 'CTV',
    searchPlaceholder: 'Search by name, email...',
    roleAll: 'All roles',
    statusAll: 'All statuses',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    searchButton: 'Search',
    noAccounts: 'No accounts found',
    tableAccount: 'Account',
    tableRole: 'Role',
    tableGroup: 'Group',
    tableCode: 'CTV Code',
    tableAddress: 'Address',
    tableStatus: 'Status',
    tableCreatedAt: 'Created at',
    tableActions: 'Actions',
    roleSuperAdmin: 'Super Admin',
    roleBackoffice: 'Admin Backoffice',
    roleCATeam: 'Admin CA Team',
    roleUnknown: 'Unknown',
    active: 'Active',
    inactive: 'Inactive',
    viewDetail: 'View detail',
    edit: 'Edit',
    delete: 'Delete',
    deleteError: 'Unable to delete account',
  },
  ja: {
    title: 'アカウント管理',
    subtitle: 'システム内の管理者とCTVアカウントを管理します',
    createButton: '新しいアカウントを作成',
    adminTab: '管理者',
    collaboratorTab: 'コラボレーター（CTV）',
    collaboratorTabShort: 'CTV',
    searchPlaceholder: '名前、メールで検索...',
    roleAll: 'すべての役割',
    statusAll: 'すべての状態',
    statusActive: '有効',
    statusInactive: '無効',
    searchButton: '検索',
    noAccounts: 'アカウントがありません',
    tableAccount: 'アカウント',
    tableRole: '役割',
    tableGroup: 'グループ',
    tableCode: 'CTVコード',
    tableAddress: '住所',
    tableStatus: '状態',
    tableCreatedAt: '作成日',
    tableActions: '操作',
    roleSuperAdmin: 'Super Admin',
    roleBackoffice: 'Admin Backoffice',
    roleCATeam: 'Admin CA Team',
    roleUnknown: '不明',
    active: '有効',
    inactive: '無効',
    viewDetail: '詳細を見る',
    edit: '編集',
    delete: '削除',
    deleteError: 'アカウントを削除できません',
  },
};

const AccountsPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = I18N[language] || I18N.vi;
  const [accountType, setAccountType] = useState('admin'); // 'admin' or 'collaborator'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const headerSearch = searchParams.get('search') || '';
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Hover states
  const [hoveredCreateButton, setHoveredCreateButton] = useState(false);
  const [hoveredAdminTab, setHoveredAdminTab] = useState(false);
  const [hoveredCollaboratorTab, setHoveredCollaboratorTab] = useState(false);
  const [hoveredSearchButton, setHoveredSearchButton] = useState(false);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredActionButtonIndex, setHoveredActionButtonIndex] = useState(null);
  const [hoveredPaginationButtonIndex, setHoveredPaginationButtonIndex] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
    if (accountType === 'admin') {
      loadAdmins();
    } else {
      loadCollaborators();
    }
  }, [accountType, currentPage, itemsPerPage, roleFilter, statusFilter]);

  useEffect(() => {
    // Header search sync via query string `?search=...`
    setSearchQuery(headerSearch);
    setCurrentPage(1);
  }, [headerSearch]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (roleFilter) {
        params.role = roleFilter;
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await apiService.getAdmins(params);
      if (response.success && response.data) {
        setAccounts(response.data.admins || []);
        setPagination(response.data.pagination || {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0
        });
      }
    } catch (error) {
      console.error('Error loading admins:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (statusFilter) {
        params.status = statusFilter === '1' ? 1 : statusFilter === '0' ? 0 : '';
      }

      const response = await apiService.getCollaborators(params);
      if (response.success && response.data) {
        setAccounts(response.data.collaborators || []);
        setPagination(response.data.pagination || {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0
        });
      }
    } catch (error) {
      console.error('Error loading collaborators:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    if (accountType === 'admin') {
      loadAdmins();
    } else {
      loadCollaborators();
    }
  };

  const handleDelete = async (accountId) => {
    try {
      setDeleting(true);
      if (accountType === 'admin') {
        await apiService.deleteAdmin(accountId);
      } else {
        await apiService.deleteCollaborator(accountId);
      }
      setDeleteConfirm(null);
      if (accountType === 'admin') {
        loadAdmins();
      } else {
        loadCollaborators();
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert(error.message || t.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 1:
        return { 
          label: t.roleSuperAdmin, 
          style: { backgroundColor: '#f3e8ff', color: '#6b21a8' }, 
          icon: Shield 
        };
      case 2:
        return { 
          label: t.roleBackoffice, 
          style: { backgroundColor: '#dbeafe', color: '#1e40af' }, 
          icon: Users 
        };
      case 3:
        return { 
          label: t.roleCATeam, 
          style: { backgroundColor: '#dcfce7', color: '#166534' }, 
          icon: Building2 
        };
      default:
        return { 
          label: t.roleUnknown, 
          style: { backgroundColor: '#f3f4f6', color: '#1f2937' }, 
          icon: User 
        };
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

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold" style={{ color: '#111827' }}>{t.title}</h1>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: '#4b5563' }}>{t.subtitle}</p>
        </div>
        <button
          onClick={() => {
            if (accountType === 'admin') {
              navigate('/admin/accounts/new');
            } else {
              navigate('/admin/collaborators/new');
            }
          }}
          onMouseEnter={() => setHoveredCreateButton(true)}
          onMouseLeave={() => setHoveredCreateButton(false)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:px-4 sm:text-sm transition-colors"
          style={{
            backgroundColor: hoveredCreateButton ? '#1d4ed8' : '#2563eb',
            color: 'white'
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t.createButton}</span>
        </button>
      </div>

      {/* Account Type Tabs */}
      <div className="rounded-lg shadow-sm border p-1" style={{ backgroundColor: 'white', borderColor: '#e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <div className="flex gap-1">
          <button
            onClick={() => setAccountType('admin')}
            onMouseEnter={() => setHoveredAdminTab(true)}
            onMouseLeave={() => setHoveredAdminTab(false)}
            className="flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
            style={{
              backgroundColor: accountType === 'admin' 
                ? '#2563eb' 
                : (hoveredAdminTab ? '#f3f4f6' : 'transparent'),
              color: accountType === 'admin' ? 'white' : '#374151'
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              <span>{t.adminTab}</span>
            </div>
          </button>
          <button
            onClick={() => setAccountType('collaborator')}
            onMouseEnter={() => setHoveredCollaboratorTab(true)}
            onMouseLeave={() => setHoveredCollaboratorTab(false)}
            className="flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
            style={{
              backgroundColor: accountType === 'collaborator' 
                ? '#2563eb' 
                : (hoveredCollaboratorTab ? '#f3f4f6' : 'transparent'),
              color: accountType === 'collaborator' ? 'white' : '#374151'
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">{t.collaboratorTab}</span>
              <span className="sm:hidden">{t.collaboratorTabShort}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg shadow-sm border p-3 sm:p-4" style={{ backgroundColor: 'white', borderColor: '#e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <div className="flex flex-col md:flex-row gap-2 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
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
              />
            </div>
          </div>
          {accountType === 'admin' && (
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm"
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
              <option value="">{t.roleAll}</option>
              <option value="1">{t.roleSuperAdmin}</option>
              <option value="2">{t.roleBackoffice}</option>
              <option value="3">{t.roleCATeam}</option>
            </select>
          )}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border rounded-lg text-sm"
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
            <option value="">{t.statusAll}</option>
            <option value="1">{t.statusActive}</option>
            <option value="0">{t.statusInactive}</option>
          </select>
          <button
            onClick={handleSearch}
            onMouseEnter={() => setHoveredSearchButton(true)}
            onMouseLeave={() => setHoveredSearchButton(false)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              backgroundColor: hoveredSearchButton ? '#1d4ed8' : '#2563eb',
              color: 'white'
            }}
          >
            {t.searchButton}
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="rounded-lg shadow-sm border overflow-hidden" style={{ backgroundColor: 'white', borderColor: '#e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2563eb' }} />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto mb-4" style={{ color: '#9ca3af' }} />
            <p style={{ color: '#4b5563' }}>{t.noAccounts}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2 p-2 md:hidden">
              {accounts.map((account) => {
                const isAdminType = accountType === 'admin';
                const roleInfo = isAdminType ? getRoleLabel(account.role) : null;
                const RoleIcon = roleInfo?.icon;
                return (
                  <div key={`mobile-${account.id}`} className="rounded-xl border p-2.5" style={{ borderColor: '#e5e7eb' }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: '#111827' }}>{account.name || account.email}</p>
                        <p className="truncate text-xs" style={{ color: '#4b5563' }}>{account.email}</p>
                      </div>
                      {((isAdminType && account.isActive && account.status === 1) || (!isAdminType && account.status === 1)) ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                          <CheckCircle className="w-3 h-3" /> On
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                          <XCircle className="w-3 h-3" /> Off
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]" style={{ color: '#374151' }}>
                      {isAdminType ? (
                        <>
                          <span>Vai trò:</span>
                          <span className="text-right">{roleInfo?.label || '—'}</span>
                          <span>Nhóm:</span>
                          <span className="text-right truncate">{account.group?.name || '—'}</span>
                        </>
                      ) : (
                        <>
                          <span>Mã CTV:</span>
                          <span className="text-right truncate">{account.code || '—'}</span>
                          <span>SĐT:</span>
                          <span className="text-right truncate">{account.phone || '—'}</span>
                        </>
                      )}
                      <span>Ngày tạo:</span>
                      <span className="text-right">{formatDate(account.createdAt)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1.5 border-t pt-1.5" style={{ borderColor: '#f3f4f6' }}>
                      <button onClick={() => navigate(isAdminType ? `/admin/accounts/${account.id}` : `/admin/collaborators/${account.id}`)} className="p-1 rounded" style={{ color: '#2563eb' }} title="Xem chi tiết">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => navigate(isAdminType ? `/admin/accounts/${account.id}/edit` : `/admin/collaborators/${account.id}/edit`)} className="p-1 rounded" style={{ color: '#4b5563' }} title="Chỉnh sửa">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(account)} className="p-1 rounded" style={{ color: '#dc2626' }} title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="border-b" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>{t.tableAccount}</th>
                    {accountType === 'admin' && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>{t.tableRole}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>{t.tableGroup}</th>
                      </>
                    )}
                    {accountType === 'collaborator' && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>{t.tableCode}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>{t.tableAddress}</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>{t.tableStatus}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#111827' }}>{t.tableCreatedAt}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: '#111827' }}>{t.tableActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#e5e7eb' }}>
                  {accounts.map((account, index) => {
                    if (accountType === 'admin') {
                      const roleInfo = getRoleLabel(account.role);
                      const RoleIcon = roleInfo.icon;
                      const actionButtonKey = `admin-${account.id}`;
                      return (
                        <tr 
                          key={account.id} 
                          onMouseEnter={() => setHoveredRowIndex(index)}
                          onMouseLeave={() => setHoveredRowIndex(null)}
                          style={{
                            backgroundColor: hoveredRowIndex === index ? '#f9fafb' : 'transparent'
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dbeafe' }}>
                                <Shield className="w-5 h-5" style={{ color: '#2563eb' }} />
                              </div>
                              <div>
                                <p className="text-sm font-medium" style={{ color: '#111827' }}>{account.name || account.email}</p>
                                <p className="text-xs" style={{ color: '#4b5563' }}>{account.email}</p>
                                {account.phone && (
                                  <p className="text-xs" style={{ color: '#6b7280' }}>{account.phone}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={roleInfo.style}>
                              <RoleIcon className="w-3 h-3" />
                              {roleInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {account.group ? (
                              <span className="text-sm" style={{ color: '#374151' }}>{account.group.name}</span>
                            ) : (
                              <span className="text-sm" style={{ color: '#9ca3af' }}>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {account.isActive && account.status === 1 ? (
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
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm" style={{ color: '#374151' }}>{formatDate(account.createdAt)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/admin/accounts/${account.id}`)}
                                onMouseEnter={() => setHoveredActionButtonIndex(`${actionButtonKey}-view`)}
                                onMouseLeave={() => setHoveredActionButtonIndex(null)}
                                className="p-2 rounded-lg transition-colors"
                                style={{
                                  color: '#2563eb',
                                  backgroundColor: hoveredActionButtonIndex === `${actionButtonKey}-view` ? '#eff6ff' : 'transparent'
                                }}
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/admin/accounts/${account.id}/edit`)}
                                onMouseEnter={() => setHoveredActionButtonIndex(`${actionButtonKey}-edit`)}
                                onMouseLeave={() => setHoveredActionButtonIndex(null)}
                                className="p-2 rounded-lg transition-colors"
                                style={{
                                  color: '#4b5563',
                                  backgroundColor: hoveredActionButtonIndex === `${actionButtonKey}-edit` ? '#f9fafb' : 'transparent'
                                }}
                                title="Chỉnh sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(account)}
                                onMouseEnter={() => setHoveredActionButtonIndex(`${actionButtonKey}-delete`)}
                                onMouseLeave={() => setHoveredActionButtonIndex(null)}
                                className="p-2 rounded-lg transition-colors"
                                style={{
                                  color: '#dc2626',
                                  backgroundColor: hoveredActionButtonIndex === `${actionButtonKey}-delete` ? '#fef2f2' : 'transparent'
                                }}
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    } else {
                      // Collaborator
                      const actionButtonKey = `collaborator-${account.id}`;
                      return (
                        <tr 
                          key={account.id} 
                          onMouseEnter={() => setHoveredRowIndex(index)}
                          onMouseLeave={() => setHoveredRowIndex(null)}
                          style={{
                            backgroundColor: hoveredRowIndex === index ? '#f9fafb' : 'transparent'
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
                                <Users className="w-5 h-5" style={{ color: '#16a34a' }} />
                              </div>
                              <div>
                                <p className="text-sm font-medium" style={{ color: '#111827' }}>{account.name || account.email}</p>
                                <p className="text-xs" style={{ color: '#4b5563' }}>{account.email}</p>
                                {account.phone && (
                                  <p className="text-xs" style={{ color: '#6b7280' }}>{account.phone}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium" style={{ color: '#111827' }}>{account.code || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm" style={{ color: '#374151' }}>{account.address || '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {account.status === 1 ? (
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
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm" style={{ color: '#374151' }}>{formatDate(account.createdAt)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/admin/collaborators/${account.id}`)}
                                onMouseEnter={() => setHoveredActionButtonIndex(`${actionButtonKey}-view`)}
                                onMouseLeave={() => setHoveredActionButtonIndex(null)}
                                className="p-2 rounded-lg transition-colors"
                                style={{
                                  color: '#2563eb',
                                  backgroundColor: hoveredActionButtonIndex === `${actionButtonKey}-view` ? '#eff6ff' : 'transparent'
                                }}
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/admin/collaborators/${account.id}/edit`)}
                                onMouseEnter={() => setHoveredActionButtonIndex(`${actionButtonKey}-edit`)}
                                onMouseLeave={() => setHoveredActionButtonIndex(null)}
                                className="p-2 rounded-lg transition-colors"
                                style={{
                                  color: '#4b5563',
                                  backgroundColor: hoveredActionButtonIndex === `${actionButtonKey}-edit` ? '#f9fafb' : 'transparent'
                                }}
                                title="Chỉnh sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(account)}
                                onMouseEnter={() => setHoveredActionButtonIndex(`${actionButtonKey}-delete`)}
                                onMouseLeave={() => setHoveredActionButtonIndex(null)}
                                className="p-2 rounded-lg transition-colors"
                                style={{
                                  color: '#dc2626',
                                  backgroundColor: hoveredActionButtonIndex === `${actionButtonKey}-delete` ? '#fef2f2' : 'transparent'
                                }}
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: '#e5e7eb' }}>
                <div className="text-sm" style={{ color: '#374151' }}>
                  Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} tài khoản
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={pagination.page === 1}
                    onMouseEnter={() => !(pagination.page === 1) && setHoveredPaginationButtonIndex('first')}
                    onMouseLeave={() => setHoveredPaginationButtonIndex(null)}
                    className="p-2 border rounded-lg disabled:cursor-not-allowed transition-colors"
                    style={{
                      borderColor: '#d1d5db',
                      opacity: pagination.page === 1 ? 0.5 : 1,
                      backgroundColor: hoveredPaginationButtonIndex === 'first' && pagination.page !== 1 ? '#f9fafb' : 'transparent'
                    }}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    onMouseEnter={() => !(pagination.page === 1) && setHoveredPaginationButtonIndex('prev')}
                    onMouseLeave={() => setHoveredPaginationButtonIndex(null)}
                    className="p-2 border rounded-lg disabled:cursor-not-allowed transition-colors"
                    style={{
                      borderColor: '#d1d5db',
                      opacity: pagination.page === 1 ? 0.5 : 1,
                      backgroundColor: hoveredPaginationButtonIndex === 'prev' && pagination.page !== 1 ? '#f9fafb' : 'transparent'
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm" style={{ color: '#374151' }}>
                    Trang {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    onMouseEnter={() => !(pagination.page >= pagination.totalPages) && setHoveredPaginationButtonIndex('next')}
                    onMouseLeave={() => setHoveredPaginationButtonIndex(null)}
                    className="p-2 border rounded-lg disabled:cursor-not-allowed transition-colors"
                    style={{
                      borderColor: '#d1d5db',
                      opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
                      backgroundColor: hoveredPaginationButtonIndex === 'next' && pagination.page < pagination.totalPages ? '#f9fafb' : 'transparent'
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(pagination.totalPages)}
                    disabled={pagination.page >= pagination.totalPages}
                    onMouseEnter={() => !(pagination.page >= pagination.totalPages) && setHoveredPaginationButtonIndex('last')}
                    onMouseLeave={() => setHoveredPaginationButtonIndex(null)}
                    className="p-2 border rounded-lg disabled:cursor-not-allowed transition-colors"
                    style={{
                      borderColor: '#d1d5db',
                      opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
                      backgroundColor: hoveredPaginationButtonIndex === 'last' && pagination.page < pagination.totalPages ? '#f9fafb' : 'transparent'
                    }}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AccountsPage;
