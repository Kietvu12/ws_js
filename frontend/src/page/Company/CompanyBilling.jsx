import React, { useState } from 'react';
import {
  CreditCard, TrendingUp, Clock, FileText, AlertCircle, Plus, Search,
  Filter, ChevronLeft, ChevronRight, ArrowRight, ExternalLink, Zap,
  CheckCircle2, Circle, Package, Globe, Users, MoreHorizontal, Download
} from 'lucide-react';
import {
  BILLING_STATS, CREDIT_HISTORY, ACTIVE_SERVICES, REQUEST_LIST, PENDING_INVOICES
} from './mockData';

const STATUS_COLORS = {
  'Đang xử lý': { bg: '#fef2f2', color: '#dc2626' },
  'Hoàn thành': { bg: '#fee2e2', color: '#dc2626' },
  'Chờ WS phản hồi': { bg: '#fecaca', color: '#b91c1c' },
  'Chờ phản hồi': { bg: '#fecaca', color: '#b91c1c' },
  'Đã đóng': { bg: '#F3F4F6', color: '#6B7280' },
};

const REQUEST_TABS = [
  { label: 'Tất cả', count: 18 },
  { label: 'Đang xử lý', count: 7 },
  { label: 'Chờ phản hồi', count: 3 },
  { label: 'Hoàn thành', count: 6 },
  { label: 'Đã đóng', count: 2 },
];

const STAT_ICONS = [CreditCard, TrendingUp, Clock, Package, AlertCircle];

const SERVICE_ICONS = [Zap, TrendingUp, Globe, Users];

const SERVICE_STATUS_COLORS = {
  'Đang hoạt động': { bg: '#fee2e2', color: '#dc2626' },
  'Đang xử lý': { bg: '#fef2f2', color: '#dc2626' },
};

const RECENT_ACTIVITY = [
  { text: 'Unlock ứng viên Trần Minh Đức', time: '10 phút trước', type: 'credit' },
  { text: 'Request SP-2405-012 được cập nhật', time: '1 giờ trước', type: 'request' },
  { text: 'Nạp 2,000 credit thành công', time: '1 ngày trước', type: 'credit' },
  { text: 'Invoice INV-2405-028 đã tạo', time: '2 ngày trước', type: 'invoice' },
];

export default function CompanyBilling() {
  const [requestTab, setRequestTab] = useState('Tất cả');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredRequests = REQUEST_LIST.filter(r => {
    const matchTab = requestTab === 'Tất cả' || r.status === requestTab;
    const matchSearch = !searchTerm || r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'all' || r.type === typeFilter;
    return matchTab && matchSearch && matchType;
  });

  return (
    <div className="bg-gray-50 p-3 sm:p-4 lg:p-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {BILLING_STATS.map((stat, i) => {
          const Icon = STAT_ICONS[i];
          const isFirst = i === 0;
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4"
              style={isFirst ? { borderLeft: '4px solid #dc2626' } : {}}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{stat.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: isFirst ? '#fef2f2' : '#F9FAFB' }}>
                  <Icon size={16} style={{ color: isFirst ? '#dc2626' : '#6B7280' }} />
                </div>
              </div>
              <p className={`font-bold ${isFirst ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'} text-gray-900`}>{stat.value}</p>
              {stat.extra && (
                <button className="text-xs text-red-600 font-medium mt-1 hover:underline">{stat.extra}</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Three-column layout → stacks on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Left: Credit History */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Lịch sử giao dịch credit</h3>
            <button className="text-xs text-red-600 font-medium hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight size={10} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 font-medium text-gray-500 whitespace-nowrap">Ngày</th>
                  <th className="text-left py-2 font-medium text-gray-500 whitespace-nowrap">Loại</th>
                  <th className="text-right py-2 font-medium text-gray-500 whitespace-nowrap">+/-</th>
                  <th className="text-right py-2 font-medium text-gray-500 whitespace-nowrap">Số dư</th>
                </tr>
              </thead>
              <tbody>
                {CREDIT_HISTORY.slice(0, 5).map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 text-gray-600 whitespace-nowrap">{item.date.split(' ')[0]}</td>
                    <td className="py-2 text-gray-700 max-w-[100px] truncate">{item.type}</td>
                    <td className="py-2 text-right font-semibold" style={{ color: item.change > 0 ? '#dc2626' : '#DC2626' }}>
                      {item.change > 0 ? `+${item.change}` : item.change}
                    </td>
                    <td className="py-2 text-right text-gray-600">{item.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Credit sidebar section */}
          <div className="mt-4 pt-4 border-t border-gray-100 rounded-lg bg-red-50 p-3">
            <p className="text-sm font-semibold text-gray-900">Credit hiện tại: <span style={{ color: '#dc2626' }}>2,450 credit</span></p>
            <p className="text-xs text-gray-500 mt-1">Có thể mở ~24 hồ sơ ứng viên</p>
            <button className="mt-3 w-full py-2 rounded-lg text-white text-xs font-semibold"
              style={{ backgroundColor: '#dc2626' }}>
              Nạp thêm credit
            </button>
            <button className="mt-2 w-full text-center text-xs text-red-600 font-medium hover:underline flex items-center justify-center gap-1">
              Xem lịch sử credit <ArrowRight size={10} />
            </button>
          </div>
        </div>

        {/* Middle: Active Services */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Dịch vụ đang sử dụng</h3>
            <button className="text-xs text-red-600 font-medium hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight size={10} />
            </button>
          </div>
          <div className="space-y-3">
            {ACTIVE_SERVICES.map((service, i) => {
              const Icon = SERVICE_ICONS[i] || Package;
              const statusStyle = SERVICE_STATUS_COLORS[service.status] || { bg: '#F3F4F6', color: '#6B7280' };
              return (
                <div key={i} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#fef2f2' }}>
                      <Icon size={16} style={{ color: '#dc2626' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{service.name}</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap flex-shrink-0"
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                          {service.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{service.detail}</p>
                      <button className="text-xs text-red-600 font-medium mt-1 hover:underline">Chi tiết</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Requests + Invoices */}
        <div className="space-y-3 sm:space-y-4 md:col-span-2 lg:col-span-1">
          {/* Create Request Button */}
          <button className="w-full sm:w-auto lg:w-full py-3 px-6 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
            style={{ backgroundColor: '#dc2626' }}>
            <Plus size={16} />
            Tạo yêu cầu mới
          </button>

          {/* Recent Requests */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Yêu cầu gần đây</h3>
            <div className="space-y-2">
              {REQUEST_LIST.slice(0, 3).map((req, i) => {
                const statusStyle = STATUS_COLORS[req.status] || { bg: '#F3F4F6', color: '#6B7280' };
                return (
                  <div key={i} className="p-2.5 rounded-lg border border-gray-100 hover:border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-medium text-red-600">{req.code}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{req.type}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{req.createdAt}</p>
                  </div>
                );
              })}
            </div>
            <button className="mt-3 w-full text-center text-xs text-red-600 font-medium hover:underline flex items-center justify-center gap-1">
              Xem tất cả <ArrowRight size={10} />
            </button>
          </div>

          {/* Pending Invoices */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Invoice chưa thanh toán</h3>
            <div className="space-y-2">
              {PENDING_INVOICES.map((inv, i) => (
                <div key={i} className="p-3 rounded-lg border border-red-100 bg-red-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-gray-700">{inv.code}</span>
                    <span className="text-sm font-bold text-gray-900">{inv.amount}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-500">Hạn: {inv.deadline}</span>
                    <button className="px-2.5 py-1 rounded-lg text-[10px] font-medium text-red-700 bg-red-100 hover:bg-red-200 transition-colors">
                      Chưa thanh toán
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Hoạt động gần đây</h3>
            <div className="space-y-3">
              {RECENT_ACTIVITY.map((activity, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{
                      backgroundColor: activity.type === 'credit' ? '#dc2626' :
                        activity.type === 'request' ? '#ef4444' : '#EF4444'
                    }} />
                  <div>
                    <p className="text-xs text-gray-700">{activity.text}</p>
                    <p className="text-[10px] text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Request List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-0">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Danh sách yêu cầu</h3>
          <div className="flex items-center gap-1 border-b border-gray-100 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
            {REQUEST_TABS.map(tab => (
              <button
                key={tab.label}
                onClick={() => setRequestTab(tab.label)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0"
                style={{
                  borderColor: requestTab === tab.label ? '#dc2626' : 'transparent',
                  color: requestTab === tab.label ? '#dc2626' : '#6B7280',
                }}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      backgroundColor: requestTab === tab.label ? '#fef2f2' : '#F3F4F6',
                      color: requestTab === tab.label ? '#dc2626' : '#6B7280',
                    }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 border-b border-gray-100">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 bg-white">
            <option value="all">Loại yêu cầu: Tất cả</option>
            <option value="Scout Performance">Scout Performance</option>
            <option value="Landing Page Premium">Landing Page Premium</option>
            <option value="Mua thêm credit">Mua thêm credit</option>
            <option value="Marketplace Support">Marketplace Support</option>
            <option value="Hóa đơn / Báo giá">Hóa đơn / Báo giá</option>
          </select>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, loại yêu cầu..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Mã yêu cầu</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Loại yêu cầu</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">JD liên quan</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Ứng viên liên quan</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Trạng thái</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">WS phụ trách</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Ngày tạo</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req, i) => {
                const statusStyle = STATUS_COLORS[req.status] || { bg: '#F3F4F6', color: '#6B7280' };
                return (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 sm:px-4 py-3">
                      <span className="font-mono text-xs font-medium text-red-600">{req.code}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{req.type}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{req.jd}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{req.candidate}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{req.wsAssigned}</td>
                    <td className="px-3 py-3 text-center text-gray-500 text-xs whitespace-nowrap">{req.createdAt}</td>
                    <td className="px-3 py-3 text-center text-gray-500 text-xs whitespace-nowrap">{req.updatedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-3 sm:px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">Hiển thị 1 - {filteredRequests.length} trong tổng số 18 yêu cầu</p>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><ChevronLeft size={16} /></button>
            <button className="w-8 h-8 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#dc2626' }}>1</button>
            <button className="w-8 h-8 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">2</button>
            <button className="w-8 h-8 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">3</button>
            <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
