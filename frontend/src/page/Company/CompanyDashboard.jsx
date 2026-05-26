import React, { useState } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Info,
  Briefcase,
  Users,
  FileText,
  Bell,
  ChevronDown,
  MoreHorizontal,
  Zap,
  AlertTriangle,
  UserCheck,
  Unlock,
  Clock,
  Newspaper,
  Eye,
  ExternalLink,
} from 'lucide-react';
import {
  DASHBOARD_ALERTS,
  RECRUITMENT_HEALTH,
  DASHBOARD_QUICK_STATS,
  QUICK_ACTIONS,
  DASHBOARD_NOTIFICATIONS,
  JD_LIST,
  JD_STATUS_MAP,
} from './mockData';

const HEALTH_PERIOD_OPTIONS = ['7 ngày qua', '30 ngày qua', '90 ngày qua'];

const NEWS_ITEMS = [
  {
    title: '10 xu hướng tuyển dụng kỹ sư Nhật Bản 2024',
    date: '22/05/2024',
  },
  {
    title: 'Cách tối ưu JD để tăng tỷ lệ ứng tuyển',
    date: '20/05/2024',
  },
];

const STAT_ICONS = [Briefcase, Users, UserCheck, Unlock, Clock];

const ALERT_ICONS = [AlertTriangle, AlertTriangle, Users, Activity];

function getRatingStyle(rating) {
  if (rating === 'Tốt') return { bg: '#fee2e2', color: '#dc2626' };
  if (rating === 'Trung bình') return { bg: '#fecaca', color: '#b91c1c' };
  return { bg: '#FEE2E2', color: '#DC2626' };
}

function getEfficiencyColor(pct) {
  if (pct >= 35) return '#dc2626';
  if (pct >= 20) return '#ef4444';
  return '#EF4444';
}

function MiniSparkline({ color, score }) {
  const points = Array.from({ length: 7 }, (_, i) => {
    const base = score / 100;
    const y = 28 - (base * 20 + Math.sin(i * 1.2 + score * 0.05) * 6 + Math.cos(i * 0.8) * 3);
    return `${i * 14},${Math.max(2, Math.min(26, y))}`;
  });
  return (
    <svg width="84" height="28" viewBox="0 0 84 28" style={{ display: 'block' }}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertCard({ alert, index }) {
  const IconComp = ALERT_ICONS[index] || AlertTriangle;
  const lines = alert.title.split('\n');
  return (
    <div
      style={{
        background: alert.color,
        border: `1px solid ${alert.borderColor}`,
      }}
      className="rounded-xl p-3 sm:p-4 flex flex-col justify-between min-h-[160px] sm:min-h-[200px] flex-1"
    >
      <div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
          style={{ background: alert.iconBg }}
        >
          <IconComp size={20} color="#fff" />
        </div>
        <p className="font-bold text-sm leading-snug text-gray-900">
          {lines[0]}
        </p>
        {lines[1] && (
          <p className="text-xs text-gray-500 mt-0.5">{lines[1]}</p>
        )}
        <p className="text-xs text-gray-600 mt-2 leading-relaxed">
          {alert.desc}
        </p>
      </div>
      <button
        className="mt-3 text-xs font-semibold py-2 px-3 rounded-lg text-white w-full transition-opacity hover:opacity-90"
        style={{ background: alert.iconBg }}
      >
        {alert.cta}
      </button>
    </div>
  );
}

function HealthCard({ item }) {
  const rs = getRatingStyle(item.rating);
  return (
    <div
      className="rounded-xl border bg-white p-3 sm:p-4 flex-1 min-w-0"
      style={{ borderColor: '#e5e7eb' }}
    >
      <p className="text-xs text-gray-500 leading-snug whitespace-pre-line mb-2">
        {item.label}
      </p>
      <div className="flex items-end gap-1 mb-1">
        <span className="text-2xl font-bold" style={{ color: item.color }}>
          {item.score}
        </span>
        <span className="text-xs text-gray-400 mb-1">/100</span>
      </div>
      <span
        className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-3"
        style={{ background: rs.bg, color: rs.color }}
      >
        {item.rating}
      </span>
      <div className="mb-2">
        <MiniSparkline color={item.color} score={item.score} />
      </div>
      <div className="flex items-center gap-1 text-xs">
        {item.up ? (
          <TrendingUp size={14} className="text-red-500" />
        ) : (
          <TrendingDown size={14} className="text-red-500" />
        )}
        <span className={item.up ? 'text-red-600' : 'text-red-500'}>
          {item.up ? '+' : '-'}{item.delta}
        </span>
        <span className="text-gray-400">vs tuần trước</span>
      </div>
    </div>
  );
}

function JDRow({ jd }) {
  const status = JD_STATUS_MAP[jd.status] || JD_STATUS_MAP.active;
  const effColor = getEfficiencyColor(jd.efficiency);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      <td className="py-3 px-3">
        <p className="text-sm font-medium text-gray-900">{jd.titleVi}</p>
        <p className="text-xs text-gray-400">{jd.titleJp}</p>
      </td>
      <td className="py-3 px-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full" style={{ background: status.bg, color: status.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
          {status.label}
        </span>
      </td>
      <td className="py-3 px-3">
        <div className="flex flex-wrap gap-1">
          {jd.services.map((s) => (
            <span
              key={s}
              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap"
            >
              {s}
            </span>
          ))}
        </div>
      </td>
      <td className="py-3 px-3 text-center text-sm font-medium text-gray-700">
        {jd.totalCandidates}
      </td>
      <td className="py-3 px-3 text-center text-sm font-medium text-gray-700">
        {jd.matchedCandidates}
      </td>
      <td className="py-3 px-3" style={{ minWidth: 120 }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${jd.efficiency}%`,
                background: effColor,
              }}
            />
          </div>
          <span className="text-xs font-medium" style={{ color: effColor }}>
            {jd.efficiency}%
          </span>
        </div>
      </td>
      <td className="py-3 px-3 text-center text-xs text-gray-500">
        {jd.postedDays != null ? `${jd.postedDays} ngày` : '—'}
      </td>
      <td className="py-3 px-3 text-center">
        <button className="p-1 rounded hover:bg-gray-100 transition-colors">
          <MoreHorizontal size={16} className="text-gray-400" />
        </button>
      </td>
    </tr>
  );
}

function SectionCard({ children, className = '' }) {
  return (
    <div
      className={`bg-white rounded-xl border shadow-sm ${className}`}
      style={{ borderColor: '#e5e7eb' }}
    >
      {children}
    </div>
  );
}

export default function CompanyDashboard() {
  const [healthPeriod, setHealthPeriod] = useState(HEALTH_PERIOD_OPTIONS[0]);
  const [showPeriodDrop, setShowPeriodDrop] = useState(false);

  const displayJDs = JD_LIST.slice(0, 5);

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Alert cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DASHBOARD_ALERTS.map((alert, i) => (
          <AlertCard key={i} alert={alert} index={i} />
        ))}
      </div>

      {/* Section 3: Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 sm:gap-5 lg:gap-6">
        {/* Left column */}
        <div className="space-y-4 sm:space-y-5 lg:space-y-6 min-w-0">
          {/* Recruitment Health */}
          <SectionCard className="p-3 sm:p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-gray-900">
                  Recruitment Health
                </h2>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Info size={16} />
                </button>
              </div>
              <div className="relative">
                <button
                  className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                  onClick={() => setShowPeriodDrop((p) => !p)}
                >
                  {healthPeriod}
                  <ChevronDown size={14} />
                </button>
                {showPeriodDrop && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[130px]">
                    {HEALTH_PERIOD_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
                        style={{
                          fontWeight: opt === healthPeriod ? 600 : 400,
                          color: opt === healthPeriod ? '#dc2626' : '#374151',
                        }}
                        onClick={() => {
                          setHealthPeriod(opt);
                          setShowPeriodDrop(false);
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {RECRUITMENT_HEALTH.map((item, i) => (
                <HealthCard key={i} item={item} />
              ))}
            </div>
          </SectionCard>

          {/* JD List Table */}
          <SectionCard>
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 lg:p-5 pb-0">
              <h2 className="text-sm sm:text-base font-bold text-gray-900">
                Danh sách JD (Anken)
              </h2>
              <button className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: '#dc2626' }}>
                Xem tất cả JD <ArrowRight size={14} />
              </button>
            </div>
            <div className="overflow-x-auto mt-3 -mx-px">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    {[
                      'JD / Vị trí',
                      'Trạng thái chất lượng',
                      'Dịch vụ đang sử dụng',
                      'Ứng viên (Tổng)',
                      'Ứng viên phù hợp',
                      'Hiệu quả tuyển dụng',
                      'Thời gian đăng',
                      'Thao tác',
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-2.5 px-3 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayJDs.map((jd) => (
                    <JDRow key={jd.id} jd={jd} />
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-4 sm:space-y-5">
          {/* Quick Stats */}
          <SectionCard className="p-3 sm:p-4 lg:p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              Tổng quan nhanh
            </h3>
            <div className="space-y-0">
              {DASHBOARD_QUICK_STATS.map((stat, i) => {
                const Icon = STAT_ICONS[i] || Activity;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: '#F3F4F6' }}
                      >
                        <Icon size={16} className="text-gray-500" />
                      </div>
                      <span className="text-sm text-gray-600 flex items-center gap-1.5">
                        {stat.label}
                        {stat.alert && (
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        )}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {stat.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Quick Actions */}
          <SectionCard className="p-3 sm:p-4 lg:p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              Thao tác nhanh
            </h3>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  className="w-full text-left rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors flex items-start gap-3 group"
                  style={{ borderLeftWidth: 3, borderLeftColor: action.color }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {action.desc}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-gray-300 group-hover:text-red-500 mt-0.5 flex-shrink-0 transition-colors"
                  />
                </button>
              ))}
            </div>
          </SectionCard>

          {/* Notifications */}
          <SectionCard className="p-3 sm:p-4 lg:p-5">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-bold text-gray-900">Thông báo</h3>
              <span
                className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
                style={{ background: '#EF4444' }}
              >
                {DASHBOARD_NOTIFICATIONS.length}
              </span>
            </div>
            <div className="space-y-0">
              {DASHBOARD_NOTIFICATIONS.map((n, i) => (
                <div
                  key={i}
                  className="py-2.5 border-b border-gray-50 last:border-0"
                  style={n.alert ? { background: '#FEF2F2', margin: '0 -12px', padding: '10px 12px', borderRadius: 8 } : {}}
                >
                  <div className="flex items-start gap-2">
                    <Bell
                      size={14}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: n.alert ? '#EF4444' : '#9CA3AF' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm leading-snug"
                        style={{
                          color: n.alert ? '#991B1B' : '#374151',
                          fontWeight: n.alert ? 500 : 400,
                        }}
                      >
                        {n.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* News & Insights */}
          <SectionCard className="p-3 sm:p-4 lg:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">
                Tin tức & Insights
              </h3>
              <button
                className="text-xs font-medium flex items-center gap-1 hover:underline"
                style={{ color: '#dc2626' }}
              >
                Xem tất cả <ExternalLink size={12} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
              {NEWS_ITEMS.map((article, i) => (
                <button
                  key={i}
                  className="w-full text-left rounded-lg border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  <div
                    className="h-24 sm:h-28 flex items-center justify-center"
                    style={{ background: '#F3F4F6' }}
                  >
                    <Newspaper size={28} className="text-gray-300" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-red-700 transition-colors leading-snug">
                      {article.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {article.date}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
