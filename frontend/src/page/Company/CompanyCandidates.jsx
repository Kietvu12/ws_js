import React, { useState } from 'react';
import {
  Search, Filter, Share2, Plus, MoreHorizontal, ChevronDown, Mail, Phone,
  Linkedin, MapPin, Briefcase, Award, Calendar, Clock, Star, ExternalLink,
  MessageSquare, FileText, User, Sparkles, ChevronRight, Check, AlertTriangle
} from 'lucide-react';
import { CANDIDATE_LIST } from './mockData';

const SOURCE_COLORS = {
  'Scout Credit': { color: '#dc2626', bg: '#fef2f2' },
  'Scout Performance': { color: '#b91c1c', bg: '#fee2e2' },
  'Sàn CTV (HR Partner)': { color: '#991b1b', bg: '#fecaca' },
  'Branding LP': { color: '#ef4444', bg: '#fef2f2' },
};

const STATUS_COLORS = {
  'Mới': { color: '#dc2626', bg: '#fef2f2' },
  'Phỏng vấn': { color: '#b91c1c', bg: '#fef2f2' },
  'Đang xử lý': { color: '#ef4444', bg: '#fecaca' },
  'Đã tuyển': { color: '#dc2626', bg: '#fee2e2' },
  'Đã nhận CV': { color: '#ef4444', bg: '#fee2e2' },
};

const DETAIL_TABS = ['Tổng quan', 'CV & Hồ sơ', 'Lịch sử liên hệ', 'Đánh giá', 'Ghi chú', 'Hoạt động'];

const CANDIDATE_JOURNEY = [
  { label: 'Nhận hồ sơ', date: '20/05/2024', done: true },
  { label: 'Screening', date: '21/05/2024', done: true },
  { label: 'Hearing & Match', date: '22/05/2024', done: true },
  { label: 'Phỏng vấn vòng 1', date: 'Đang chờ', done: false, current: true },
  { label: 'Phỏng vấn vòng 2', date: '', done: false },
  { label: 'Offer', date: '', done: false },
  { label: 'Onboard', date: '', done: false },
];

const QUICK_ACTIONS = [
  { label: 'Gửi tin nhắn', icon: MessageSquare, color: '#dc2626' },
  { label: 'Lên lịch phỏng vấn', icon: Calendar, color: '#b91c1c' },
  { label: 'Yêu cầu bổ sung hồ sơ', icon: FileText, color: '#ef4444' },
  { label: 'Đánh dấu không phù hợp', icon: AlertTriangle, color: '#EF4444' },
];

function Badge({ label, colorMap }) {
  const style = colorMap?.[label] || { color: '#6B7280', bg: '#F3F4F6' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 9999,
      fontSize: 12, fontWeight: 500, color: style.color, backgroundColor: style.bg,
    }}>{label}</span>
  );
}

function CircularScore({ score, size = 100 }) {
  const r = 38, circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 80 ? '#dc2626' : score >= 60 ? '#ef4444' : '#EF4444';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx={50} cy={50} r={r} fill="none" stroke="#F3F4F6" strokeWidth={8} />
      <circle cx={50} cy={50} r={r} fill="none" stroke={scoreColor} strokeWidth={8}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x={50} y={46} textAnchor="middle" fontSize={22} fontWeight={700} fill="#0f172a">{score}%</text>
      <text x={50} y={62} textAnchor="middle" fontSize={9} fill="#6B7280">Phù hợp</text>
    </svg>
  );
}

function CandidateCard({ candidate, isSelected, onSelect }) {
  const srcStyle = SOURCE_COLORS[candidate.source] || { color: '#6B7280', bg: '#F3F4F6' };
  const statusStyle = STATUS_COLORS[candidate.status] || { color: '#6B7280', bg: '#F3F4F6' };
  return (
    <div onClick={onSelect} style={{
      padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s',
      borderLeft: isSelected ? '3px solid #dc2626' : '3px solid transparent',
      backgroundColor: isSelected ? '#fef2f2' : '#fff',
      borderBottom: '1px solid #F3F4F6',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{candidate.name}</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{candidate.title}</div>
        </div>
        <span style={{
          padding: '2px 8px', borderRadius: 9999, fontSize: 11,
          color: statusStyle.color, backgroundColor: statusStyle.bg, fontWeight: 500,
        }}>{candidate.status}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          padding: '1px 8px', borderRadius: 9999, fontSize: 11,
          color: srcStyle.color, backgroundColor: srcStyle.bg,
        }}>{candidate.source}</span>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{candidate.code}</span>
        <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>{candidate.date}</span>
      </div>
    </div>
  );
}

export default function CompanyCandidates() {
  const [selectedId, setSelectedId] = useState(CANDIDATE_LIST[0]?.id);
  const [detailTab, setDetailTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const selected = CANDIDATE_LIST.find(c => c.id === selectedId) || CANDIDATE_LIST[0];

  const matchLevelColor = (level) => {
    if (level === 'Rất phù hợp') return '#dc2626';
    if (level === 'Phù hợp') return '#dc2626';
    return '#ef4444';
  };

  return (
    <div style={{ backgroundColor: '#F9FAFB', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search & filter bar */}
      <div className="cand-header">
        <div className="cand-search-row">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
            border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#fff', flex: 1,
          }}>
            <Search size={16} color="#9CA3AF" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm ứng viên..." style={{
                border: 'none', outline: 'none', fontSize: 14, width: '100%', backgroundColor: 'transparent',
              }}
            />
          </div>
          <button className="cand-filter-btn" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#fff',
            fontSize: 14, color: '#374151', cursor: 'pointer',
          }}>
            <Filter size={16} /> Bộ lọc
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="cand-layout">
        {/* Left sidebar list */}
        <div className="cand-list">
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: 13, color: '#6B7280' }}>Tổng số: </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>236 ứng viên</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {CANDIDATE_LIST.map(c => (
              <CandidateCard key={c.id} candidate={c}
                isSelected={c.id === selectedId}
                onSelect={() => setSelectedId(c.id)}
              />
            ))}
          </div>
        </div>

        {/* Right detail panel */}
        <div className="cand-detail">
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Candidate header */}
            <div className="cand-detail-header-padding" style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div className="cand-detail-header-flex">
                <div style={{
                  width: 56, height: 56, borderRadius: 12, backgroundColor: '#fef2f2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <User size={28} color="#dc2626" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>{selected.name}</h2>
                  <p style={{ fontSize: 14, color: '#6B7280', margin: '2px 0 8px' }}>{selected.title}</p>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#6B7280' }}>
                    {selected.gender && <span>{selected.gender}</span>}
                    {selected.age && <span>{selected.age} tuổi</span>}
                    {selected.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} />{selected.location}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge label={selected.source} colorMap={SOURCE_COLORS} />
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>JD: {selected.code}</span>
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>Ngày vào: {selected.date}</span>
                  </div>
                </div>
                <div className="cand-detail-header-actions">
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                    border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#fff',
                    fontSize: 13, color: '#374151', cursor: 'pointer',
                  }}><Share2 size={14} /> Chia sẻ hồ sơ</button>
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                    border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#fff',
                    fontSize: 13, color: '#374151', cursor: 'pointer',
                  }}><Plus size={14} /> Thêm vào JD khác</button>
                  <button style={{
                    padding: '7px 10px', border: '1px solid #E5E7EB', borderRadius: 8,
                    backgroundColor: '#fff', cursor: 'pointer',
                  }}><MoreHorizontal size={16} color="#6B7280" /></button>
                </div>
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="cand-detail-tabs">
              {DETAIL_TABS.map((tab, i) => (
                <button key={i} onClick={() => setDetailTab(i)} style={{
                  padding: '12px 16px', fontSize: 13, fontWeight: detailTab === i ? 600 : 400,
                  color: detailTab === i ? '#dc2626' : '#6B7280', border: 'none',
                  borderBottom: detailTab === i ? '2px solid #dc2626' : '2px solid transparent',
                  backgroundColor: 'transparent', cursor: 'pointer', marginBottom: -1,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>{tab}</button>
              ))}
            </div>

            {/* Tab content - Tổng quan */}
            <div className="cand-tab-content">
              {/* Left column - personal info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  padding: 16, borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 16,
                }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 14px' }}>Thông tin cá nhân</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { icon: Mail, label: 'Email', value: selected.email || 'N/A' },
                      { icon: Phone, label: 'Điện thoại', value: selected.phone || 'N/A' },
                      { icon: Linkedin, label: 'LinkedIn', value: selected.linkedin || 'N/A' },
                      { icon: MapPin, label: 'Địa điểm', value: selected.location || 'N/A' },
                      { icon: Briefcase, label: 'Kinh nghiệm', value: selected.exp || 'N/A' },
                      { icon: Award, label: 'Cấp bậc', value: selected.level || 'N/A' },
                      { icon: Star, label: 'Mức lương', value: selected.salary || 'N/A' },
                      { icon: Clock, label: 'Sẵn sàng', value: selected.availability || 'N/A' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <item.icon size={15} color="#9CA3AF" />
                        <span style={{ color: '#6B7280', minWidth: 90 }}>{item.label}</span>
                        <span style={{ color: '#0f172a', fontWeight: 500 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div style={{
                  padding: 16, borderRadius: 12, border: '1px solid #E5E7EB',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>Kỹ năng nổi bật</h4>
                    <span style={{ fontSize: 12, color: '#dc2626', cursor: 'pointer' }}>
                      Xem tất cả ({selected.skills?.length || 0}) →
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(selected.skills || []).slice(0, 8).map((skill, i) => (
                      <span key={i} style={{
                        padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                        backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB',
                      }}>{skill}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Center-right - match score */}
              <div className="cand-match-panel">
                <div style={{
                  padding: 16, borderRadius: 12, border: '1px solid #E5E7EB',
                  textAlign: 'center',
                }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 12px' }}>Độ phù hợp với JD</h4>
                  <CircularScore score={selected.matchScore || 0} />
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(selected.matchDetails || []).map((d, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center',
                      }}>
                        <span style={{ color: '#6B7280' }}>{d.label}</span>
                        <span style={{ fontWeight: 500, color: matchLevelColor(d.level) }}>{d.level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right sidebar */}
              <div className="cand-right-sidebar">
                {/* Current status */}
                <div style={{ padding: 16, borderRadius: 12, border: '1px solid #E5E7EB' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 10px' }}>Trạng thái hiện tại</h4>
                  <Badge label={selected.status} colorMap={STATUS_COLORS} />
                  <select style={{
                    width: '100%', marginTop: 10, padding: '7px 10px', fontSize: 13,
                    border: '1px solid #E5E7EB', borderRadius: 8, color: '#374151',
                    backgroundColor: '#fff', cursor: 'pointer',
                  }}>
                    <option>Chuyển trạng thái</option>
                    <option>Screening</option>
                    <option>Phỏng vấn</option>
                    <option>Offer</option>
                    <option>Đã tuyển</option>
                    <option>Không phù hợp</option>
                  </select>
                </div>

                {/* Journey */}
                <div style={{ padding: 16, borderRadius: 12, border: '1px solid #E5E7EB' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 12px' }}>Hành trình ứng viên</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {CANDIDATE_JOURNEY.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, position: 'relative' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                            backgroundColor: step.done ? '#dc2626' : step.current ? '#fef2f2' : '#F3F4F6',
                            border: step.current ? '2px solid #dc2626' : step.done ? 'none' : '2px solid #D1D5DB',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {step.done && <Check size={10} color="#fff" />}
                          </div>
                          {i < CANDIDATE_JOURNEY.length - 1 && (
                            <div style={{
                              width: 2, height: 24, backgroundColor: step.done ? '#dc2626' : '#E5E7EB',
                            }} />
                          )}
                        </div>
                        <div style={{ paddingBottom: 8 }}>
                          <div style={{
                            fontSize: 12, fontWeight: step.current ? 600 : 400,
                            color: step.done || step.current ? '#0f172a' : '#9CA3AF',
                          }}>{step.label}</div>
                          {step.date && (
                            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{step.date}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Related links */}
                <div style={{ padding: 16, borderRadius: 12, border: '1px solid #E5E7EB' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 10px' }}>Liên kết liên quan</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <a href="#" style={{
                      fontSize: 13, color: '#dc2626', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}><ExternalLink size={13} /> JD: {selected.code}</a>
                  </div>
                </div>

                {/* Quick actions */}
                <div style={{ padding: 16, borderRadius: 12, border: '1px solid #E5E7EB' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 10px' }}>Thao tác nhanh</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {QUICK_ACTIONS.map((act, i) => (
                      <button key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                        border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#fff',
                        fontSize: 13, color: '#374151', cursor: 'pointer', width: '100%', textAlign: 'left',
                      }}>
                        <act.icon size={14} color={act.color} />
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            {selected.aiSummary && (
              <div className="cand-ai-section">
                <div style={{
                  padding: 20, borderRadius: 12, border: '1px solid #E5E7EB',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Sparkles size={18} color="#dc2626" />
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>Tóm tắt AI</h4>
                  </div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: '0 0 16px' }}>
                    {selected.aiSummary}
                  </p>
                  <div className="cand-ai-columns">
                    <div style={{ flex: 1 }}>
                      <h5 style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} /> Điểm mạnh
                      </h5>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                        <li>5 năm kinh nghiệm React.js và Node.js</li>
                        <li>Từng làm tại các công ty công nghệ lớn</li>
                        <li>Kinh nghiệm triển khai dự án thực tế phong phú</li>
                      </ul>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h5 style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={14} /> Lưu ý
                      </h5>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                        <li>Mức lương kỳ vọng ở mức trung bình cao</li>
                        <li>Cần kiểm tra khả năng tiếng Nhật</li>
                        <li>Thời gian bắt đầu sau 2 tuần</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        /* ── Mobile-first base ── */
        .cand-header { padding: 16px 16px 12px; }
        .cand-search-row { display: flex; flex-direction: column; gap: 10px; }
        .cand-filter-btn { width: 100%; justify-content: center; }

        .cand-layout {
          display: flex; flex-direction: column; padding: 0 16px 16px; gap: 16px;
        }
        .cand-list {
          width: 100%; max-height: 280px; border-radius: 12px;
          background-color: #fff; border: 1px solid #E5E7EB;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .cand-detail {
          flex: 1; border-radius: 12px;
          background-color: #fff; border: 1px solid #E5E7EB;
          display: flex; flex-direction: column; overflow: hidden;
        }

        .cand-detail-header-padding { padding: 16px; }
        .cand-detail-header-flex {
          display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start;
        }
        .cand-detail-header-actions {
          display: flex; gap: 8px; flex-wrap: wrap; width: 100%;
        }
        .cand-detail-header-actions > button { flex: 1; justify-content: center; min-width: 0; }

        .cand-detail-tabs {
          display: flex; border-bottom: 1px solid #E5E7EB; padding: 0 16px;
          overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
        }
        .cand-detail-tabs::-webkit-scrollbar { display: none; }

        .cand-tab-content {
          display: flex; flex-direction: column; padding: 16px; gap: 16px;
        }
        .cand-match-panel { width: 100%; }
        .cand-right-sidebar {
          width: 100%; display: flex; flex-direction: column; gap: 16px;
        }

        .cand-ai-section { padding: 0 16px 16px; }
        .cand-ai-columns { display: flex; flex-direction: column; gap: 16px; }

        /* ── sm: 640px ── */
        @media (min-width: 640px) {
          .cand-header { padding: 20px 24px 14px; }
          .cand-search-row { flex-direction: row; }
          .cand-filter-btn { width: auto; }

          .cand-layout { padding: 0 24px 24px; }
          .cand-detail-header-padding { padding: 20px 24px; }
          .cand-detail-header-flex { flex-wrap: nowrap; gap: 16px; }
          .cand-detail-header-actions { width: auto; flex-wrap: nowrap; }
          .cand-detail-header-actions > button { flex: none; }
          .cand-detail-tabs { padding: 0 24px; }
          .cand-tab-content { padding: 20px 24px; gap: 20px; }
          .cand-ai-section { padding: 0 24px 24px; }
          .cand-ai-columns { flex-direction: row; }
        }

        /* ── md: 768px ── */
        @media (min-width: 768px) {
          .cand-tab-content { flex-direction: row; }
          .cand-match-panel { width: 220px; flex-shrink: 0; }
          .cand-right-sidebar { width: 240px; flex-shrink: 0; }
        }

        /* ── lg: 1024px ── */
        @media (min-width: 1024px) {
          .cand-header { padding: 24px 32px 16px; }
          .cand-layout {
            flex-direction: row; padding: 0 32px 32px;
            gap: 0; flex: 1; min-height: 0;
          }
          .cand-list {
            width: 25%; min-width: 280px; max-height: none;
            border-radius: 12px 0 0 12px; border-right: none;
          }
          .cand-detail { border-radius: 0 12px 12px 0; }
        }
      `}</style>
    </div>
  );
}
