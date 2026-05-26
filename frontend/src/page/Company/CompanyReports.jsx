import React, { useState } from 'react';
import {
  Calendar, ChevronDown, Download, TrendingUp, TrendingDown, BarChart3,
  PieChart, Activity, Lightbulb, FileText, Clock, Award
} from 'lucide-react';
import { REPORT_STATS, REPORT_CONVERSION, REPORT_TOP_JDS } from './mockData';

const JD_PERFORMANCE_TABLE = [
  { jd: 'Frontend Developer', dept: 'IT', received: 42, interview: 15, hired: 5, rate: '35%', status: 'Tốt' },
  { jd: 'QA Engineer', dept: 'IT', received: 28, interview: 10, hired: 3, rate: '32%', status: 'Tốt' },
  { jd: 'Product Owner', dept: 'Product', received: 22, interview: 8, hired: 2, rate: '30%', status: 'Khá' },
  { jd: 'DevOps Engineer', dept: 'IT', received: 18, interview: 6, hired: 1, rate: '28%', status: 'Khá' },
  { jd: 'Data Analyst', dept: 'Data', received: 15, interview: 4, hired: 1, rate: '25%', status: 'Trung bình' },
  { jd: 'Sales Executive', dept: 'Sales', received: 31, interview: 3, hired: 0, rate: '10%', status: 'Cần cải thiện' },
];

const INSIGHTS = [
  { color: '#dc2626', title: 'Hiệu quả tăng', text: 'Tỷ lệ chuyển đổi tăng 5.2% so với tháng trước nhờ tối ưu JD.' },
  { color: '#ef4444', title: 'Nguồn tốt nhất', text: 'Scout Performance đem lại 45% ứng viên chất lượng cao nhất.' },
  { color: '#b91c1c', title: 'Cần cải thiện', text: 'JD Sales Executive có tỷ lệ chuyển đổi thấp nhất (10%). Nên cập nhật mô tả.' },
  { color: '#991b1b', title: 'Xu hướng', text: 'Ứng viên IT tăng 22% trong 30 ngày qua, đây là thời điểm tốt để mở rộng tuyển dụng.' },
];

const SOURCE_STATS = [
  { label: 'Scout Performance', value: 45, color: '#991b1b' },
  { label: 'Sàn CTV', value: 30, color: '#dc2626' },
  { label: 'Scout Credit', value: 15, color: '#ef4444' },
  { label: 'Landing Page', value: 10, color: '#fca5a5' },
];

const CUSTOM_REPORTS = [
  { title: 'Báo cáo tuyển dụng tổng hợp tháng 5/2024', type: 'PDF' },
  { title: 'Phân tích hiệu quả theo phòng ban Q2/2024', type: 'Excel' },
  { title: 'Báo cáo chi phí tuyển dụng năm 2024', type: 'PDF' },
  { title: 'So sánh hiệu quả các kênh tuyển dụng', type: 'Excel' },
];

const STATUS_COLORS = {
  'Tốt': { bg: '#fef2f2', color: '#dc2626' },
  'Khá': { bg: '#fee2e2', color: '#b91c1c' },
  'Trung bình': { bg: '#fecaca', color: '#991b1b' },
  'Cần cải thiện': { bg: '#F3F4F6', color: '#6B7280' },
};

const CHART_LEGEND = [
  { label: 'JD đã đăng', color: '#991b1b' },
  { label: 'Tiến cử nhận được', color: '#dc2626' },
  { label: 'Phỏng vấn', color: '#ef4444' },
  { label: 'Tuyển thành công', color: '#fca5a5' },
];

export default function CompanyReports() {
  const [dateRange] = useState('01/05/2024 - 31/05/2024');

  return (
    <div className="bg-gray-50 p-3 sm:p-5 lg:p-6">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-gray-700">{dateRange}</span>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 w-full sm:w-auto">
          Phòng ban <ChevronDown size={14} />
        </button>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 w-full sm:w-auto sm:ml-auto">
          <Download size={14} />
          Xuất báo cáo
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {REPORT_STATS.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
            <div className="text-xl font-bold text-gray-900">{stat.value}</div>
            <div className="flex items-center gap-1 mt-1">
              {stat.up ? (
                <TrendingUp size={12} className="text-red-500" />
              ) : (
                <TrendingDown size={12} className="text-red-500" />
              )}
              <span className={`text-xs font-medium ${stat.up ? 'text-red-600' : 'text-red-600'}`}>
                {stat.delta}
              </span>
              <span className="text-xs text-gray-400">vs tháng trước</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="w-full lg:flex-1 lg:max-w-[65%]">
          {/* Line Chart Placeholder */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Hiệu quả tuyển dụng tổng quan</h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              {CHART_LEGEND.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="h-40 sm:h-56 bg-gradient-to-b from-red-50/50 to-white rounded-lg border border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden">
              <svg className="w-full h-full absolute inset-0" viewBox="0 0 400 200" preserveAspectRatio="none">
                <polyline fill="none" stroke="#DC2626" strokeWidth="2" points="0,160 50,140 100,130 150,120 200,100 250,90 300,80 350,60 400,50" />
                <polyline fill="none" stroke="#ef4444" strokeWidth="2" points="0,180 50,170 100,155 150,145 200,130 250,120 300,110 350,95 400,85" />
                <polyline fill="none" stroke="#f87171" strokeWidth="2" points="0,185 50,180 100,175 150,170 200,160 250,155 300,145 350,140 400,130" />
                <polyline fill="none" stroke="#fca5a5" strokeWidth="2" points="0,190 50,188 100,185 150,182 200,178 250,175 300,172 350,168 400,165" />
              </svg>
              <span className="text-xs text-gray-400 relative z-10 bg-white/80 px-2 py-1 rounded">Biểu đồ xu hướng theo thời gian</span>
            </div>
          </div>

          {/* Bar Chart Placeholder */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Hiệu quả theo phòng ban</h2>
            <div className="h-36 sm:h-44 flex items-end justify-around gap-2 sm:gap-4 px-2 sm:px-4">
              {[
                { label: 'IT', value: 65, color: '#991b1b' },
                { label: 'Product', value: 48, color: '#b91c1c' },
                { label: 'Sales', value: 30, color: '#dc2626' },
                { label: 'Data', value: 42, color: '#ef4444' },
                { label: 'HR', value: 55, color: '#f87171' },
              ].map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs font-medium text-gray-700">{bar.value}%</span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{ height: `${bar.value * 1.8}px`, backgroundColor: bar.color, opacity: 0.85 }}
                  />
                  <span className="text-xs text-gray-500 mt-1">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* JD Performance Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Hiệu quả theo JD</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 font-medium text-gray-500 whitespace-nowrap">JD</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Phòng ban</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Tiến cử nhận được</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Vào phỏng vấn</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Tuyển thành công</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Tỷ lệ chuyển đổi</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500 whitespace-nowrap">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {JD_PERFORMANCE_TABLE.map((row, i) => {
                    const statusStyle = STATUS_COLORS[row.status] || { bg: '#F3F4F6', color: '#6B7280' };
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium text-gray-900">{row.jd}</td>
                        <td className="py-3 px-2 text-gray-600">{row.dept}</td>
                        <td className="py-3 px-2 text-center text-gray-600">{row.received}</td>
                        <td className="py-3 px-2 text-center text-gray-600">{row.interview}</td>
                        <td className="py-3 px-2 text-center text-gray-600">{row.hired}</td>
                        <td className="py-3 px-2 text-center font-medium text-gray-900">{row.rate}</td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-[35%]">
          {/* Donut Chart - Conversion Rate */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-4 sm:mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Tỷ lệ chuyển đổi tuyển dụng</h3>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="12" />
                  <circle
                    cx="60" cy="60" r="50" fill="none" stroke="#DC2626" strokeWidth="12"
                    strokeDasharray={`${REPORT_CONVERSION.overallRate * 3.14} ${314 - REPORT_CONVERSION.overallRate * 3.14}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{REPORT_CONVERSION.overallRate}%</span>
                  <span className="text-xs text-gray-500">Tổng</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {Object.values(REPORT_CONVERSION).filter(v => typeof v === 'object').map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{item.value}</span>
                    <span className="text-xs text-gray-400">({item.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-4 sm:mb-6">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Lightbulb size={14} className="text-red-500" />
              Insight nổi bật
            </h3>
            <div className="space-y-3">
              {INSIGHTS.map((insight, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-gray-50"
                  style={{ borderLeft: `3px solid ${insight.color}` }}
                >
                  <div className="text-xs font-semibold text-gray-900 mb-0.5">{insight.title}</div>
                  <p className="text-xs text-gray-600">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Source Performance - Horizontal Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-4 sm:mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Hiệu quả theo nguồn ứng viên</h3>
            <div className="space-y-3">
              {SOURCE_STATS.map((source, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-700">{source.label}</span>
                    <span className="font-medium text-gray-900">{source.value}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${source.value}%`, backgroundColor: source.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top JDs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-4 sm:mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Top vị trí tuyển dụng hiệu quả</h3>
            <div className="space-y-2">
              {REPORT_TOP_JDS.slice(0, 4).map((jd, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{jd.title}</div>
                      <div className="text-xs text-gray-400">{jd.dept}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{jd.conversionRate}%</div>
                    <div className="text-xs text-gray-400">{jd.hired} tuyển</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Average Time */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-4 sm:mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Thời gian tuyển dụng trung bình</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock size={24} className="text-red-600" />
                <span className="text-3xl font-bold text-gray-900">24</span>
                <span className="text-sm text-gray-500">ngày</span>
              </div>
              <div className="flex-1 h-8">
                <svg className="w-full h-full" viewBox="0 0 120 32" preserveAspectRatio="none">
                  <polyline
                    fill="none" stroke="#DC2626" strokeWidth="2"
                    points="0,28 15,25 30,22 45,26 60,20 75,18 90,22 105,16 120,14"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <TrendingDown size={12} /> Giảm 3 ngày so với tháng trước
            </p>
          </div>

          {/* Custom Reports */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Báo cáo tùy chỉnh</h3>
            <div className="space-y-2">
              {CUSTOM_REPORTS.map((report, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{report.title}</span>
                  </div>
                  <button className="p-1 text-gray-400 hover:text-red-600 flex-shrink-0">
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
