import React, { useState } from 'react';
import {
  Plus, ChevronDown, Sparkles, FileText, Settings, Layout,
  Search, Filter, MapPin, Eye, MoreHorizontal, ArrowRight,
  Clock, TrendingUp, ChevronLeft, ChevronRight, Zap, Users, Pause, XCircle, CheckCircle2, Lightbulb
} from 'lucide-react';
import { JD_LIST, JD_STATUS_MAP, JD_TEMPLATES, JD_STATS } from './mockData';

export default function CompanyJDList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  const filteredList = JD_LIST.filter(jd => {
    const matchSearch = jd.titleVi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jd.titleJp.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || jd.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="bg-gray-50 p-3 sm:p-5 lg:p-6">
      {/* Action bar */}
      <div className="flex justify-end mb-6">
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm w-full sm:w-auto"
          style={{ backgroundColor: '#dc2626' }}>
          <Plus size={16} />
          Tạo JD mới
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* AI Creation Banner */}
          <div className="rounded-xl overflow-hidden mb-6"
            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #ef4444 100%)' }}>
            <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
              {/* Left - AI actions */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Tạo JD nhanh với AI (Miễn phí)</h3>
                    <p className="text-white/70 text-sm">AI sẽ giúp bạn tạo JD chuyên nghiệp chỉ trong vài phút</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  {[
                    { icon: FileText, label: 'Tạo từ JD gốc', desc: 'Upload JD có sẵn' },
                    { icon: Settings, label: 'Tạo từ thông tin cơ bản', desc: 'Nhập tiêu chí tuyển dụng' },
                    { icon: Layout, label: 'Chọn từ template', desc: 'Template theo ngành' },
                  ].map((item, i) => (
                    <div key={i} className="flex-1 bg-white/10 backdrop-blur rounded-lg p-3 cursor-pointer hover:bg-white/20 transition-colors">
                      <item.icon size={18} className="text-white mb-2" />
                      <p className="text-white text-sm font-medium">{item.label}</p>
                      <p className="text-white/60 text-xs mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right - AI Suggestion */}
              <div className="w-full lg:w-72 bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-red-200" />
                  <span className="text-white/90 text-sm font-medium">Gợi ý từ AI</span>
                </div>
                <p className="text-white text-sm font-semibold mb-1">Ước tính có 128 ứng viên phù hợp</p>
                <p className="text-white/70 text-xs mb-3">Chất lượng ứng viên: Trung bình khá</p>
                <button className="text-red-200 text-xs font-medium flex items-center gap-1 hover:underline">
                  Xem ứng viên phù hợp ngay <ArrowRight size={12} />
                </button>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-white/80 text-xs font-medium mb-2">Mẹo để JD hiệu quả hơn</p>
                  <div className="space-y-1.5">
                    {['Mô tả rõ ràng yêu cầu', 'Nêu mức lương cạnh tranh', 'Liệt kê quyền lợi hấp dẫn'].map((tip, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-red-200" />
                        <span className="text-white/70 text-xs">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm JD..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 bg-white">
              <option value="all">Trạng thái: Tất cả</option>
              {Object.entries(JD_STATUS_MAP).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 bg-white">
              <option value="all">Dịch vụ: Tất cả</option>
              <option value="scout-credit">Scout Credit</option>
              <option value="scout-performance">Scout Performance</option>
              <option value="branding">Branding LP</option>
              <option value="san-ctv">Sàn CTV</option>
            </select>
            <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 bg-white">
              <option value="all">Thời gian: Tất cả</option>
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="90d">90 ngày qua</option>
            </select>
            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <Filter size={14} />
              Bộ lọc
            </button>
          </div>

          {/* JD Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">JD / Vị trí</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Trạng thái</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Dịch vụ đang sử dụng</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Ứng viên (Tổng)</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Ứng viên phù hợp</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Hiệu quả tuyển dụng</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Thời gian đăng</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map(jd => {
                    const status = JD_STATUS_MAP[jd.status];
                    return (
                      <tr key={jd.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                              <FileText size={16} className="text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{jd.titleVi}</p>
                              <p className="text-xs text-gray-400">{jd.titleJp}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <MapPin size={10} />{jd.location}
                                </span>
                                <span className="text-xs text-gray-400">• {jd.type}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium"
                            style={{ color: status.color, backgroundColor: status.bg }}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {jd.services.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{s}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-medium text-gray-700">{jd.totalCandidates}</td>
                        <td className="px-3 py-3 text-center font-medium text-red-600">{jd.matchedCandidates}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{
                                  width: `${jd.efficiency}%`,
                                  backgroundColor: jd.efficiency >= 35 ? '#dc2626' : jd.efficiency >= 20 ? '#ef4444' : '#fca5a5'
                                }} />
                            </div>
                            <span className="text-xs text-gray-500 w-8">{jd.efficiency}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <p className="text-xs text-gray-600">{jd.postedDate}</p>
                          {jd.postedDays && (
                            <p className="text-xs text-gray-400">{jd.postedDays} ngày trước</p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded font-medium">
                              Xem chi tiết
                            </button>
                            <button className="p-1 rounded hover:bg-gray-100 text-gray-400">
                              <MoreHorizontal size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-3 sm:px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-sm text-gray-500">Hiển thị 1 - {filteredList.length} trong {filteredList.length} JD</p>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><ChevronLeft size={16} /></button>
                <button className="w-8 h-8 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#dc2626' }}>1</button>
                <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-72 lg:flex-shrink-0 space-y-4">
          {/* JD Templates */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Template JD phổ biến</h3>
              <button className="text-xs text-red-600 font-medium hover:underline">Xem tất cả</button>
            </div>
            <div className="space-y-2">
              {JD_TEMPLATES.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <Layout size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-700">{t.label}</span>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* JD Stats */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Thống kê JD</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600">Tổng JD</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{JD_STATS.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600">Đang hoạt động</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{JD_STATS.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
                  <span className="text-sm text-gray-600">Tạm dừng</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{JD_STATS.paused}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                  <span className="text-sm text-gray-600">Đã đóng</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{JD_STATS.closed}</span>
              </div>
            </div>
            <button className="mt-4 w-full text-center text-xs text-red-600 font-medium hover:underline flex items-center justify-center gap-1">
              <TrendingUp size={12} />
              Xem báo cáo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
