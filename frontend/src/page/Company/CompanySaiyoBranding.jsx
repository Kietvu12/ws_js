import React, { useState } from 'react';
import {
  Eye, Users, FileText, TrendingUp, Plus, ExternalLink, Edit2, Trash2,
  ArrowRight, CheckCircle, BarChart3, Globe, Megaphone, Calendar, Building2, Monitor
} from 'lucide-react';
import { LANDING_PAGES, BRANDING_STATS, BRANDING_SERVICES } from './mockData';

const TABS = ['Tổng quan', 'Thống kê chung'];

const BULLET_POINTS = [
  'Tạo trang tuyển dụng riêng cho công ty miễn phí',
  'Thu hút ứng viên trực tiếp từ nhiều nguồn',
  'Tùy chỉnh nội dung, hình ảnh và màu sắc',
  'Theo dõi hiệu quả với analytics chi tiết',
  'Tích hợp form ứng tuyển trực tiếp',
];

const RECENT_ACTIVITIES = [
  { text: 'Landing page "Frontend Developer" đạt 100 lượt xem', time: '2 giờ trước', icon: Eye },
  { text: 'Có 5 ứng viên mới từ landing page "Sales Engineer"', time: '5 giờ trước', icon: Users },
  { text: 'Landing page "QA Engineer" đã được tạm dừng', time: '1 ngày trước', icon: FileText },
  { text: 'Cập nhật nội dung landing page "Frontend Developer"', time: '2 ngày trước', icon: Edit2 },
];

export default function CompanySaiyoBranding() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="bg-gray-50 p-3 sm:p-5 lg:p-6">
      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-hide">
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
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column */}
        <div className="flex-1 min-w-0">
          {/* Create LP Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Tạo landing page tuyển dụng miễn phí
            </h2>
            <ul className="space-y-2 mb-4">
              {BULLET_POINTS.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors w-full sm:w-auto">
              <Plus size={16} />
              Tạo landing page mới
            </button>
          </div>

          {/* Landing Pages Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Landing page của bạn</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Tên trang</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Link</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Lượt xem</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Ứng viên</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Trạng thái</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {LANDING_PAGES.map((page) => (
                    <tr key={page.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium text-gray-900">{page.name}</td>
                      <td className="py-3 px-2">
                        <a href="#" className="text-red-600 hover:underline flex items-center gap-1">
                          {page.url} <ExternalLink size={12} />
                        </a>
                      </td>
                      <td className="py-3 px-2 text-center text-gray-600">{page.views.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-gray-600">{page.candidates}</td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: page.status === 'Đang hoạt động' ? '#fef2f2' : '#F3F4F6',
                            color: page.status === 'Đang hoạt động' ? '#dc2626' : '#6B7280',
                          }}
                        >
                          {page.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1 text-gray-400 hover:text-red-600"><Edit2 size={14} /></button>
                          <button className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats Row */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Hiệu quả chung của các landing page</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <Eye size={20} className="mx-auto text-red-600 mb-1" />
                <div className="text-2xl font-bold text-gray-900">{BRANDING_STATS.views.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Lượt xem</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <FileText size={20} className="mx-auto text-red-600 mb-1" />
                <div className="text-2xl font-bold text-gray-900">{BRANDING_STATS.forms}</div>
                <div className="text-xs text-gray-500">Lượt điền form</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <Users size={20} className="mx-auto text-red-600 mb-1" />
                <div className="text-2xl font-bold text-gray-900">{BRANDING_STATS.candidates}</div>
                <div className="text-xs text-gray-500">Ứng viên</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <TrendingUp size={20} className="mx-auto text-red-600 mb-1" />
                <div className="text-2xl font-bold text-gray-900">{BRANDING_STATS.conversionRate}%</div>
                <div className="text-xs text-gray-500">Tỷ lệ chuyển đổi</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 lg:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h2>
            <div className="space-y-4">
              {RECENT_ACTIVITIES.map((activity, i) => {
                const Icon = activity.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">{activity.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-80 xl:w-[35%] flex-shrink-0">
          {/* CTA Card */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-4 sm:p-5 lg:p-6 mb-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Muốn tuyển dụng hiệu quả hơn?</h3>
            <p className="text-sm text-red-100 mb-4">
              Sử dụng các dịch vụ Branding chuyên nghiệp để nâng cao thương hiệu tuyển dụng và thu hút nhiều ứng viên chất lượng hơn.
            </p>
          </div>

          {/* Service Cards */}
          <div className="space-y-4 mb-6">
            {BRANDING_SERVICES.map((service, i) => {
              const icons = [Globe, Megaphone, Calendar, Building2, Monitor];
              const Icon = icons[i % icons.length];
              return (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Icon size={20} className="text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900">{service.label}</h4>
                      <p className="text-xs text-gray-500 mt-1">{service.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA Button */}
          <button className="w-full py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors mb-3">
            Gửi yêu cầu tư vấn
          </button>
          <a href="#" className="flex items-center justify-center gap-1 text-sm text-red-600 hover:underline">
            Tìm hiểu thêm về Saiyo Branding <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
