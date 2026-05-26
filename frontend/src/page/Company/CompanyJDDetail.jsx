import React, { useState } from 'react';
import {
  MapPin, Clock, Briefcase, User, Calendar, Edit3,
  ExternalLink, MoreHorizontal, Users, Zap, TrendingUp, Shield,
  Sparkles, ArrowRight, Eye, Star, CheckCircle2, Activity,
  FileText, Globe, UserCheck, AlertCircle
} from 'lucide-react';
import { JD_DETAIL, JD_STATUS_MAP } from './mockData';

const TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'description', label: 'Mô tả công việc' },
  { id: 'requirements', label: 'Yêu cầu ứng viên' },
  { id: 'benefits', label: 'Quyền lợi & phúc lợi' },
  { id: 'history', label: 'Lịch sử hoạt động' },
];

export default function CompanyJDDetail() {
  const [activeTab, setActiveTab] = useState('overview');
  const [healthPeriod, setHealthPeriod] = useState('7d');
  const status = JD_STATUS_MAP[JD_DETAIL.status];

  return (
    <div className="bg-gray-50 p-3 sm:p-5 lg:p-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ color: status.color, backgroundColor: status.bg }}>
                {status.label}
              </span>
              <span className="text-xs text-gray-400">Mã: {JD_DETAIL.id}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">{JD_DETAIL.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><MapPin size={14} />{JD_DETAIL.location}</span>
              <span className="flex items-center gap-1.5"><Briefcase size={14} />{JD_DETAIL.type}</span>
              <span className="flex items-center gap-1.5"><TrendingUp size={14} />{JD_DETAIL.level}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />Ngày đăng: {JD_DETAIL.postedDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} />Hết hạn: {JD_DETAIL.expiryDate}
                <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">
                  Còn {JD_DETAIL.daysLeft} ngày
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
              <User size={14} />
              <span>Tạo bởi: {JD_DETAIL.createdBy}</span>
            </div>
          </div>
          <div className="flex flex-col items-stretch lg:items-end gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                <Edit3 size={14} />Chỉnh sửa JD
              </button>
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                <ExternalLink size={14} />Tạo Landing Page
              </button>
              <button className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg border-2 text-red-600 hover:bg-red-50 transition-colors"
                style={{ borderColor: '#dc2626' }}>
                Đưa lên Sàn CTV
              </button>
              <button className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#dc2626' }}>
                Tìm ứng viên với Scout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="flex overflow-x-auto border-b border-gray-200 px-3 sm:px-6">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - Only Tổng quan */}
      {activeTab === 'overview' && (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Left Column */}
          <div className="flex-1 min-w-0 space-y-4 lg:space-y-6">
            {/* Recruitment Health */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h2 className="text-base font-semibold text-gray-900">Recruitment Health của JD</h2>
                <select value={healthPeriod} onChange={e => setHealthPeriod(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 bg-white">
                  <option value="7d">7 ngày qua</option>
                  <option value="30d">30 ngày qua</option>
                  <option value="all">Tất cả</option>
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {JD_DETAIL.health.map((item, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 p-3 sm:p-4 text-center">
                    <div className="relative w-16 h-16 mx-auto mb-3">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                        <circle cx="32" cy="32" r="28" fill="none" stroke={item.color} strokeWidth="6"
                          strokeDasharray={`${(item.score / 100) * 175.9} 175.9`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-900">{item.score}</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                    <p className="text-xs mt-1" style={{ color: item.color }}>{item.rating}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Suggestion */}
            <div className="rounded-xl border-2 p-4 sm:p-6" style={{ borderColor: '#dc2626', backgroundColor: '#fef2f2' }}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} style={{ color: '#dc2626' }} />
                <h3 className="text-base font-semibold text-gray-900">AI gợi ý</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    Có {JD_DETAIL.aiMatch.total} hồ sơ phù hợp với JD này
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
                      <p className="text-xl font-bold text-red-600">{JD_DETAIL.aiMatch.high}</p>
                      <p className="text-xs text-gray-500 mt-1">Match {'>'} 85%</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
                      <p className="text-xl font-bold text-red-500">{JD_DETAIL.aiMatch.medium}</p>
                      <p className="text-xs text-gray-500 mt-1">60 - 84%</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
                      <p className="text-xl font-bold text-red-400">{JD_DETAIL.aiMatch.potential}</p>
                      <p className="text-xs text-gray-500 mt-1">40 - 59%</p>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block w-px bg-gray-200" />
                <div className="border-t sm:border-t-0 pt-4 sm:pt-0 w-full sm:w-56 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Match trung bình</p>
                    <p className="text-lg font-bold" style={{ color: '#dc2626' }}>{JD_DETAIL.aiMatch.avgScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Top kỹ năng</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {JD_DETAIL.aiMatch.topSkills.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-700">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Top locations</p>
                    <p className="text-sm text-gray-700">{JD_DETAIL.aiMatch.topLocations.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Salary range</p>
                    <p className="text-sm font-medium text-gray-700">{JD_DETAIL.aiMatch.salaryRange}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Candidates */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Top ứng viên phù hợp nhất (Ẩn danh)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {JD_DETAIL.topCandidates.map((c, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <User size={18} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.title}</p>
                      </div>
                      <div className="px-2 py-1 rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: c.match >= 90 ? '#dc2626' : '#ef4444' }}>
                        {c.match}%
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><Briefcase size={11} />{c.exp}</span>
                      <span className="flex items-center gap-1"><MapPin size={11} />{c.location}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.skills.map((s, j) => (
                        <span key={j} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full text-center text-sm font-medium flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-red-50 transition-colors"
                style={{ color: '#dc2626' }}>
                Xem danh sách tất cả ứng viên match <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-4 lg:space-y-6">
            {/* Services */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Dịch vụ đang sử dụng cho JD này</h3>
              <div className="space-y-3">
                {JD_DETAIL.services.map((svc, i) => {
                  const isActive = svc.status === 'Đang sử dụng';
                  return (
                    <div key={i} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-red-50' : 'bg-gray-50'}`}>
                          {i === 0 && <Zap size={16} className={isActive ? 'text-red-600' : 'text-gray-400'} />}
                          {i === 1 && <Globe size={16} className={isActive ? 'text-red-600' : 'text-gray-400'} />}
                          {i === 2 && <Users size={16} className={isActive ? 'text-red-600' : 'text-gray-400'} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{svc.name}</p>
                          <span className={`text-xs font-medium ${isActive ? 'text-red-600' : 'text-gray-400'}`}>
                            {svc.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 ml-11">{svc.detail}</p>
                      <button className="text-xs font-medium mt-2 ml-11 hover:underline" style={{ color: '#dc2626' }}>
                        Xem chi tiết
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity History */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Lịch sử hoạt động gần đây</h3>
              <div className="space-y-4">
                {JD_DETAIL.history.map((h, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <Activity size={12} className="text-red-600" />
                      </div>
                      {i < JD_DETAIL.history.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm text-gray-700">{h.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{h.date}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full text-center text-xs font-medium flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-red-50 transition-colors"
                style={{ color: '#dc2626' }}>
                Xem tất cả lịch sử <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder for other tabs */}
      {activeTab !== 'overview' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 sm:p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm">Nội dung tab "{TABS.find(t => t.id === activeTab)?.label}" đang được phát triển</p>
        </div>
      )}
    </div>
  );
}
