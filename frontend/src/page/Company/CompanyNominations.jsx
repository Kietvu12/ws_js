import React, { useState } from 'react';
import {
  Search, Filter, Download, Plus, ChevronUp, ChevronDown, MoreHorizontal,
  Clock, UserCheck, FileText, Eye, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  NOMINATION_STATS, NOMINATION_TABS, NOMINATION_LIST, NOMINATION_STATUS_CHART
} from './mockData';

const SOURCE_COLORS = {
  'Scout Credit': { color: '#dc2626', bg: '#fef2f2' },
  'Scout Performance': { color: '#b91c1c', bg: '#fef2f2' },
  'Sàn CTV (HR Partner)': { color: '#dc2626', bg: '#fee2e2' },
  'Branding LP': { color: '#fca5a5', bg: '#fee2e2' },
};

const STATUS_COLORS = {
  'Liên hệ': { color: '#dc2626', bg: '#fef2f2' },
  'Đang xử lý': { color: '#ef4444', bg: '#fecaca' },
  'Phỏng vấn': { color: '#b91c1c', bg: '#fef2f2' },
  'Đã tuyển': { color: '#dc2626', bg: '#fee2e2' },
  'Không phù hợp': { color: '#EF4444', bg: '#FEE2E2' },
  'Đã ứng tuyển': { color: '#ef4444', bg: '#fee2e2' },
};

const STAT_COLORS = ['#fef2f2', '#fef2f2', '#fee2e2', '#fecaca', '#DCFCE7'];

const PIE_DATA = [
  { label: 'Scout Credit', value: 92, pct: 39, color: '#dc2626' },
  { label: 'Tiến cử WS/CTV', value: 128, pct: 54, color: '#b91c1c' },
  { label: 'Khác', value: 16, pct: 7, color: '#ef4444' },
];

const RECENT_ACTIVITIES = [
  { text: 'Trần Minh Đức chuyển sang giai đoạn "Phỏng vấn"', time: '10 phút trước', icon: 'interview' },
  { text: 'Nguyễn Thị Hương được thêm vào JD Business Analyst', time: '1 giờ trước', icon: 'add' },
  { text: 'Lê Quang Huy hoàn thành hearing', time: '2 giờ trước', icon: 'check' },
  { text: 'Phạm Thùy Linh nhận offer thành công', time: '3 giờ trước', icon: 'offer' },
  { text: 'Vũ Hoàng Nam nộp CV qua Landing Page', time: '5 giờ trước', icon: 'cv' },
];

function Badge({ label, colorMap }) {
  const style = colorMap?.[label] || { color: '#6B7280', bg: '#F3F4F6' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 9999,
      fontSize: 12, fontWeight: 500, color: style.color, backgroundColor: style.bg,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function DonutChart({ data, size = 140 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2, cy = size / 2, r = 52, strokeW = 22;
  let cumulative = 0;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const pct = d.value / total;
          const dashLen = pct * circumference;
          const dashOffset = -cumulative * circumference;
          cumulative += pct;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={strokeW}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={dashOffset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight={700} fill="#0f172a">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill="#6B7280">Tổng UV</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: d.color, flexShrink: 0 }} />
            <span style={{ color: '#374151' }}>{d.label}</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{d.value}</span>
            <span style={{ color: '#9CA3AF' }}>({d.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarChart({ data }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
            <span style={{ color: '#374151' }}>{d.label}</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{d.value}</span>
          </div>
          <div style={{ height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(d.value / max) * 100}%`,
              backgroundColor: d.color, borderRadius: 4, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CompanyNominations() {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={{ backgroundColor: '#F9FAFB' }}>
      {/* Action bar */}
      <div className="nom-header">
        <div className="nom-header-row" style={{ justifyContent: 'flex-end' }}>
          <div className="nom-header-actions">
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#fff',
              fontSize: 14, color: '#374151', cursor: 'pointer',
            }}>
              <Download size={16} /> Xuất báo cáo
            </button>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              border: 'none', borderRadius: 8, backgroundColor: '#dc2626',
              fontSize: 14, color: '#fff', cursor: 'pointer', fontWeight: 500,
            }}>
              <Plus size={16} /> Thêm ứng viên thủ công
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="nom-stats-row">
          <div className="nom-stats-cards">
            {NOMINATION_STATS.map((stat, i) => (
              <div key={i} style={{
                padding: 16, borderRadius: 12,
                backgroundColor: STAT_COLORS[i % STAT_COLORS.length],
                border: '1px solid rgba(0,0,0,0.04)',
              }}>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.4, whiteSpace: 'pre-line' }}>{stat.label}</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>{stat.value}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  {stat.up ? <ArrowUpRight size={14} color="#dc2626" /> : <ArrowDownRight size={14} color="#EF4444" />}
                  <span style={{ color: stat.up ? '#dc2626' : '#EF4444', fontWeight: 500 }}>{stat.delta}</span>
                  <span style={{ color: '#9CA3AF' }}>vs tháng trước</span>
                </div>
              </div>
            ))}
          </div>
          <div className="nom-chart-box">
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 12px' }}>Tỷ lệ nguồn ứng viên</p>
            <DonutChart data={PIE_DATA} />
          </div>
        </div>

        {/* Tabs */}
        <div className="nom-tabs">
          {NOMINATION_TABS.map((tab, i) => (
            <button key={i} onClick={() => setActiveTab(i)} style={{
              padding: '10px 20px', fontSize: 14, fontWeight: activeTab === i ? 600 : 400,
              color: activeTab === i ? '#dc2626' : '#6B7280', border: 'none',
              borderBottom: activeTab === i ? '2px solid #dc2626' : '2px solid transparent',
              backgroundColor: 'transparent', cursor: 'pointer', marginBottom: -2,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {tab.label}
              {tab.count !== null && (
                <span style={{
                  marginLeft: 6, padding: '1px 8px', borderRadius: 9999, fontSize: 12,
                  backgroundColor: activeTab === i ? '#fef2f2' : '#F3F4F6',
                  color: activeTab === i ? '#dc2626' : '#6B7280',
                }}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="nom-content">
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Filter Bar */}
          <div className="nom-filter-bar">
            <div className="nom-search-box" style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#fff',
            }}>
              <Search size={16} color="#9CA3AF" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm ứng viên..." style={{
                  border: 'none', outline: 'none', fontSize: 14, width: '100%', backgroundColor: 'transparent',
                }}
              />
            </div>
            {['JD / Vị trí', 'Nguồn', 'Trạng thái'].map((label, i) => (
              <select key={i} className="nom-filter-select" style={{
                padding: '8px 14px', border: '1px solid #E5E7EB', borderRadius: 8,
                backgroundColor: '#fff', fontSize: 14, color: '#374151', cursor: 'pointer',
              }}>
                <option>{label}</option>
              </select>
            ))}
            <button className="nom-filter-btn" style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#fff',
              fontSize: 14, color: '#374151', cursor: 'pointer',
            }}>
              <Filter size={16} /> Bộ lọc
            </button>
          </div>

          {/* Table */}
          <div style={{
            backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
            overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB' }}>
                    {['Ứng viên', 'JD / Vị trí', 'Nguồn', 'Loại', 'Tiến cử bởi', 'Trạng thái', 'Giai đoạn hiện tại', 'Ngày vào hệ thống', 'Thao tác'].map((h, i) => (
                      <th key={i} style={{
                        padding: '12px 14px', textAlign: 'left', fontWeight: 600,
                        color: '#6B7280', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NOMINATION_LIST.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}
                      className="hover-row">
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{item.email}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{item.phone}</div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 500, color: '#374151' }}>{item.jdTitle}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{item.jdTitleJp}</div>
                      </td>
                      <td style={{ padding: '14px' }}><Badge label={item.source} colorMap={SOURCE_COLORS} /></td>
                      <td style={{ padding: '14px', fontSize: 12, color: '#6B7280' }}>{item.sourceNote}</td>
                      <td style={{ padding: '14px', fontSize: 12, color: '#6B7280' }}>
                        {item.source.includes('CTV') ? 'CTV Phạm Văn Tùng' : item.source.includes('Scout') ? 'DN tự liên hệ' : 'Ứng viên'}
                      </td>
                      <td style={{ padding: '14px' }}><Badge label={item.status} colorMap={STATUS_COLORS} /></td>
                      <td style={{ padding: '14px', fontSize: 12, color: '#374151' }}>{item.phase}</td>
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 12, color: '#374151' }}>{item.entryDate}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{item.daysInSystem} ngày trước</div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <button style={{
                          padding: '4px 12px', borderRadius: 6, border: '1px solid #E5E7EB',
                          backgroundColor: '#fff', fontSize: 12, color: '#dc2626',
                          cursor: 'pointer', fontWeight: 500,
                        }}>Chi tiết</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="nom-sidebar">
          {/* Status chart */}
          <div style={{
            padding: 20, borderRadius: 12, backgroundColor: '#fff',
            border: '1px solid #E5E7EB',
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 16px' }}>
              Trạng thái tiến cử
            </h3>
            <HorizontalBarChart data={NOMINATION_STATUS_CHART} />
          </div>

          {/* Recent activities */}
          <div style={{
            padding: 20, borderRadius: 12, backgroundColor: '#fff',
            border: '1px solid #E5E7EB',
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 16px' }}>
              Hoạt động gần đây
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {RECENT_ACTIVITIES.map((act, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, padding: '10px 0',
                  borderBottom: i < RECENT_ACTIVITIES.length - 1 ? '1px solid #F3F4F6' : 'none',
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                    backgroundColor: i === 0 ? '#dc2626' : '#D1D5DB',
                  }} />
                  <div>
                    <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.4 }}>{act.text}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .hover-row:hover { background-color: #F9FAFB; }

        /* ── Mobile-first base ── */
        .nom-header { padding: 16px 16px 0; }
        .nom-header-row {
          display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;
        }
        .nom-header-actions { display: flex; gap: 10px; }
        .nom-header-actions > button { flex: 1; justify-content: center; }

        .nom-stats-row {
          display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;
        }
        .nom-stats-cards {
          display: grid; grid-template-columns: 1fr; gap: 12px;
        }
        .nom-chart-box {
          padding: 16px; border-radius: 12px;
          background-color: #fff; border: 1px solid #E5E7EB;
        }

        .nom-tabs {
          display: flex; border-bottom: 2px solid #E5E7EB;
          overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
        }
        .nom-tabs::-webkit-scrollbar { display: none; }

        .nom-content {
          display: flex; flex-direction: column; gap: 20px; padding: 16px;
        }
        .nom-sidebar {
          display: flex; flex-direction: column; gap: 16px; width: 100%;
        }

        .nom-filter-bar {
          display: flex; gap: 10px; margin-bottom: 16px;
          flex-wrap: wrap; align-items: center;
        }
        .nom-search-box { flex: 1; min-width: 0; }
        .nom-filter-select { width: calc(50% - 5px); }
        .nom-filter-btn { width: 100%; justify-content: center; }

        /* ── sm: 640px ── */
        @media (min-width: 640px) {
          .nom-header { padding: 20px 24px 0; }
          .nom-header-row {
            flex-direction: row; justify-content: space-between;
            align-items: flex-start; margin-bottom: 24px;
          }
          .nom-header-actions > button { flex: none; }
          .nom-stats-cards { grid-template-columns: repeat(2, 1fr); }
          .nom-content { padding: 20px 24px; }
          .nom-search-box { min-width: 200px; }
          .nom-filter-select { width: auto; min-width: 130px; }
          .nom-filter-btn { width: auto; }
        }

        /* ── lg: 1024px ── */
        @media (min-width: 1024px) {
          .nom-header { padding: 24px 32px 0; }
          .nom-stats-row { flex-direction: row; }
          .nom-stats-cards { grid-template-columns: repeat(5, 1fr); flex: 1; }
          .nom-chart-box { min-width: 340px; }
          .nom-content { flex-direction: row; padding: 20px 32px; }
          .nom-sidebar { width: 300px; flex-shrink: 0; }
        }
      `}</style>
    </div>
  );
}
