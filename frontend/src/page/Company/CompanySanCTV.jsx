import React, { useState } from 'react';
import {
  Briefcase, Users, UserCheck, Award, ArrowRight, Send, ChevronDown,
  MoreHorizontal, Clock, Eye, CreditCard, MessageCircle, ExternalLink
} from 'lucide-react';
import { SAN_CTV_STATS, SAN_CTV_JOBS } from './mockData';

const TABS = ['Job trên sàn', 'Đơn tiến cử', 'Ứng viên', 'Thanh toán & chia phí'];

const HOW_IT_WORKS = [
  'Doanh nghiệp đăng JD lên sàn CTV với mức thưởng hấp dẫn',
  'CTV (HR Partner) nhận job và tìm kiếm ứng viên phù hợp',
  'CTV tiến cử ứng viên → WS kiểm duyệt chất lượng',
  'Doanh nghiệp phỏng vấn & tuyển dụng ứng viên',
  'Thanh toán phí thưởng CTV sau khi tuyển thành công',
];

const RECENT_NOMINATIONS = [
  { candidate: 'Trần Văn Hùng', jd: 'Frontend Developer', ctv: 'Nguyễn Thị Mai', date: '20/05/2024', status: 'Mới' },
  { candidate: 'Lê Hoàng Anh', jd: 'QA Engineer', ctv: 'Phạm Văn Tùng', date: '19/05/2024', status: 'Đang xử lý' },
  { candidate: 'Vũ Minh Đức', jd: 'Frontend Developer', ctv: 'Trần Thị Lan', date: '18/05/2024', status: 'Phỏng vấn' },
];

const CHAT_MESSAGES = [
  { sender: 'CTV', name: 'Nguyễn Thị Mai', text: 'Em có 1 ứng viên rất phù hợp với vị trí Frontend Developer ạ. Bạn có 4 năm kinh nghiệm React.', time: '10:30', avatar: 'C' },
  { sender: 'DN', name: 'Bạn', text: 'Cảm ơn bạn! Cho mình xem CV của ứng viên được không?', time: '10:35', avatar: 'D' },
  { sender: 'WS', name: 'WS Team', text: 'Hồ sơ ứng viên đã được kiểm duyệt và đạt chất lượng. DN có thể xem chi tiết tại đây.', time: '10:48', avatar: 'W' },
];

const PAYMENT_DATA = [
  { candidate: 'Phạm Thùy Linh', jd: 'Sales Executive', ctv: 'Nguyễn Văn A', amount: '30,000,000đ', status: 'Đã thanh toán', date: '15/05/2024' },
  { candidate: 'Trần Minh Khoa', jd: 'Backend Developer', ctv: 'Trần Thị Lan', amount: '45,000,000đ', status: 'Chờ thanh toán', date: '20/05/2024' },
];

const STATUS_COLORS = {
  'Đang chạy': { bg: '#fef2f2', color: '#dc2626' },
  'Chờ WS duyệt': { bg: '#fee2e2', color: '#b91c1c' },
  'Tạm dừng': { bg: '#F3F4F6', color: '#6B7280' },
  'Đã đóng': { bg: '#E5E7EB', color: '#6B7280' },
  'Mới': { bg: '#fecaca', color: '#991b1b' },
  'Đang xử lý': { bg: '#fee2e2', color: '#b91c1c' },
  'Phỏng vấn': { bg: '#fef2f2', color: '#ef4444' },
  'Đã thanh toán': { bg: '#fef2f2', color: '#dc2626' },
  'Chờ thanh toán': { bg: '#fee2e2', color: '#b91c1c' },
};

export default function CompanySanCTV() {
  const [activeTab, setActiveTab] = useState(0);

  const statIcons = [Briefcase, Users, UserCheck, Award];

  return (
    <div className="bg-gray-50 p-3 sm:p-5 lg:p-6">
      {/* Action bar */}
      <div className="flex justify-end mb-6">
        <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors w-full sm:w-auto">
          <Briefcase size={16} />
          Đưa job lên sàn
        </button>
      </div>

      {/* Stats Row */}
      <div className="flex gap-6 mb-6">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {SAN_CTV_STATS.map((stat, i) => {
            const Icon = statIcons[i];
            return (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <Icon size={16} className="text-red-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
                {stat.extra && <div className="text-xs text-red-600 mt-1">{stat.extra}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* How it works card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Cách hoạt động</h3>
        <div className="space-y-3">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-gray-600 pt-0.5">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === i
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel */}
        <div className="flex-1 min-w-0">
          {activeTab === 0 && (
            <>
              {/* Jobs Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Job đang đăng trên sàn</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Vị trí tuyển dụng</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Mức phí thưởng CTV</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Trạng thái</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Số CTV quan tâm</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Số đơn tiến cử</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Hạn tuyển</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SAN_CTV_JOBS.map((job, i) => {
                        const statusStyle = STATUS_COLORS[job.status] || { bg: '#F3F4F6', color: '#6B7280' };
                        return (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-2">
                              <div className="font-medium text-gray-900">{job.title}</div>
                              <div className="text-xs text-gray-400">{job.code}</div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-sm text-gray-900">{job.commission}</div>
                              <div className="text-xs text-gray-400">{job.commissionNote}</div>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                              >
                                {job.status}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center text-gray-600">{job.ctvInterested ?? '-'}</td>
                            <td className="py-3 px-2 text-center text-gray-600">{job.nominations ?? '-'}</td>
                            <td className="py-3 px-2 text-center text-gray-600">{job.deadline}</td>
                            <td className="py-3 px-2 text-center">
                              <button className="p-1 text-gray-400 hover:text-red-600">
                                <MoreHorizontal size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <a href="#" className="flex items-center gap-1 text-sm text-red-600 hover:underline mt-4">
                  Xem tất cả job <ArrowRight size={14} />
                </a>
              </div>

              {/* Recent Nominations */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Đơn tiến cử mới <span className="text-red-600">(3)</span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Ứng viên</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Vị trí</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500">CTV tiến cử</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-500">Ngày</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-500">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RECENT_NOMINATIONS.map((nom, i) => {
                        const statusStyle = STATUS_COLORS[nom.status] || { bg: '#F3F4F6', color: '#6B7280' };
                        return (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-2 font-medium text-gray-900">{nom.candidate}</td>
                            <td className="py-3 px-2 text-gray-600">{nom.jd}</td>
                            <td className="py-3 px-2 text-gray-600">{nom.ctv}</td>
                            <td className="py-3 px-2 text-center text-gray-500">{nom.date}</td>
                            <td className="py-3 px-2 text-center">
                              <span
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                              >
                                {nom.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Thanh toán & chia phí</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Ứng viên</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Vị trí</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500">CTV</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500">Số tiền</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-500">Trạng thái</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-500">Ngày</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PAYMENT_DATA.map((pay, i) => {
                        const statusStyle = STATUS_COLORS[pay.status] || { bg: '#F3F4F6', color: '#6B7280' };
                        return (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-2 font-medium text-gray-900">{pay.candidate}</td>
                            <td className="py-3 px-2 text-gray-600">{pay.jd}</td>
                            <td className="py-3 px-2 text-gray-600">{pay.ctv}</td>
                            <td className="py-3 px-2 text-right font-medium text-gray-900">{pay.amount}</td>
                            <td className="py-3 px-2 text-center">
                              <span
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                              >
                                {pay.status}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center text-gray-500">{pay.date}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab !== 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-gray-400 mb-2">
                <FileIcon size={40} className="mx-auto" />
              </div>
              <p className="text-gray-500 text-sm">Nội dung tab "{TABS[activeTab]}" sẽ hiển thị tại đây</p>
            </div>
          )}
        </div>

        {/* Right Panel - Chat */}
        <div className="w-full lg:w-80 xl:w-[40%] flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <MessageCircle size={16} className="text-red-600" />
                Trao đổi 3 bên
              </h3>
              <div className="mt-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ChevronDown size={12} />
                  <span>JD: Frontend Developer (FE-2405)</span>
                </div>
              </div>
            </div>

            {/* Participant Avatars */}
            <div className="px-4 py-2 border-b border-gray-50 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">D</div>
              <div className="w-6 h-6 rounded-full bg-red-400 text-white flex items-center justify-center text-xs font-bold">C</div>
              <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">W</div>
              <span className="text-xs text-gray-400 ml-1">DN · CTV · WS</span>
            </div>

            {/* Messages */}
            <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
              {CHAT_MESSAGES.map((msg, i) => {
                const bgColors = { CTV: '#fef2f2', DN: '#fee2e2', WS: '#fecaca' };
                const avatarColors = { CTV: '#ef4444', DN: '#dc2626', WS: '#b91c1c' };
                return (
                  <div key={i} className="flex gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: avatarColors[msg.sender] }}
                    >
                      {msg.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">{msg.name}</span>
                        <span className="text-xs text-gray-400">{msg.time}</span>
                      </div>
                      <div
                        className="p-2.5 rounded-lg text-sm text-gray-700"
                        style={{ backgroundColor: bgColors[msg.sender] }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View CV Link */}
            <div className="px-4 py-2 border-t border-gray-100">
              <a href="#" className="flex items-center gap-1 text-xs text-red-600 hover:underline">
                <Eye size={12} /> Xem hồ sơ ứng viên
              </a>
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileIcon({ size, className }) {
  return <Briefcase size={size} className={className} />;
}
