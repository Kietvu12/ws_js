import React, { useState, useEffect } from 'react';
import {
  Search, SlidersHorizontal, Copy, Bookmark, Lock, ChevronDown, ChevronLeft, ChevronRight,
  MapPin, Briefcase, Award, DollarSign, Zap, CreditCard, Users, Star, BookmarkPlus
} from 'lucide-react';
import { SCOUT_CANDIDATES } from './mockData';

const AVATAR_COLORS = ['#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#dc2626'];

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

function ScoutCard({ candidate, index, isSelected, onSelect }) {
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div onClick={onSelect} style={{
      padding: 20, cursor: 'pointer', transition: 'all 0.15s',
      backgroundColor: '#fff', borderRadius: 12, border: isSelected ? '2px solid #dc2626' : '1px solid #E5E7EB',
      boxShadow: isSelected ? '0 0 0 3px rgba(220,38,38,0.1)' : '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <div className="flex gap-3 items-start">
        <div style={{
          width: 48, height: 48, borderRadius: '50%', backgroundColor: avatarColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          color: '#fff', fontSize: 18, fontWeight: 700,
        }}>
          {String.fromCharCode(65 + index)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <h3 className="truncate" style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                Ứng viên ẩn danh #{candidate.id}
              </h3>
              <p className="truncate" style={{ fontSize: 14, color: '#dc2626', margin: '2px 0 0', fontWeight: 500 }}>{candidate.title}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button style={{
                padding: 6, border: '1px solid #E5E7EB', borderRadius: 6,
                backgroundColor: '#fff', cursor: 'pointer', display: 'flex',
              }}><Copy size={14} color="#9CA3AF" /></button>
              <button style={{
                padding: 6, border: '1px solid #E5E7EB', borderRadius: 6,
                backgroundColor: '#fff', cursor: 'pointer', display: 'flex',
              }}><Bookmark size={14} color="#9CA3AF" /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5" style={{ fontSize: 13, color: '#6B7280' }}>
            <span className="flex items-center gap-1">
              <Briefcase size={13} color="#9CA3AF" /> {candidate.exp}
            </span>
            <span className="flex items-center gap-1">
              <Award size={13} color="#9CA3AF" /> {candidate.level}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={13} color="#9CA3AF" /> {candidate.location}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={13} color="#9CA3AF" /> {candidate.salary}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {candidate.skills.map((skill, i) => (
              <span key={i} style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 12,
                backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 500,
              }}>{skill}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompanyScout() {
  const [selectedId, setSelectedId] = useState(SCOUT_CANDIDATES[0]?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const selected = SCOUT_CANDIDATES.find(c => c.id === selectedId) || SCOUT_CANDIDATES[0];
  const selectedIndex = SCOUT_CANDIDATES.findIndex(c => c.id === selectedId);
  const avatarColor = AVATAR_COLORS[selectedIndex % AVATAR_COLORS.length];

  const pageButtons = isMobile ? [1, 2, 3] : [1, 2, 3, 4, 5];

  return (
    <div style={{ backgroundColor: '#F9FAFB' }}>
      {/* Search & Filters */}
      <div className="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6">
        <div className="p-4 sm:p-5 mb-4" style={{
          borderRadius: 12, backgroundColor: '#fff', border: '1px solid #E5E7EB',
        }}>
          {/* Main search */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 mb-3.5" style={{
            border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#F9FAFB',
          }}>
            <Search size={18} color="#9CA3AF" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Nhập từ khóa (ví dụ: React Developer, Sales...)" style={{
                border: 'none', outline: 'none', fontSize: 14, width: '100%',
                backgroundColor: 'transparent', color: '#374151',
              }}
            />
          </div>

          {/* Filter row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-2.5">
            {['Vị trí', 'Kinh nghiệm', 'Địa điểm', 'Mức lương mong muốn'].map((label, i) => (
              <select key={i} style={{
                padding: '8px 14px', border: '1px solid #E5E7EB', borderRadius: 8,
                backgroundColor: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer',
                width: '100%',
              }}>
                <option>{label}</option>
              </select>
            ))}
          </div>

          {/* Filter row 2 */}
          <div className="flex flex-wrap gap-2.5 items-center">
            {['Kỹ năng', 'Cấp bậc', 'Hình thức làm việc'].map((label, i) => (
              <select key={i} className="flex-1 min-w-[120px] sm:min-w-[150px] sm:flex-none sm:w-auto" style={{
                padding: '8px 14px', border: '1px solid #E5E7EB', borderRadius: 8,
                backgroundColor: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer',
              }}>
                <option>{label}</option>
              </select>
            ))}
            <button className="w-full sm:w-auto" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px',
              border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#fff',
              fontSize: 13, color: '#dc2626', cursor: 'pointer', fontWeight: 500,
            }}>
              <SlidersHorizontal size={14} /> Bộ lọc nâng cao
            </button>
          </div>
        </div>

        {/* Result count + sort */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
            <span style={{ fontWeight: 700, color: '#dc2626' }}>1,248</span> ứng viên phù hợp
          </p>
          <select style={{
            padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: 8,
            backgroundColor: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer',
          }}>
            <option>Phù hợp nhất</option>
            <option>Mới nhất</option>
            <option>Kinh nghiệm cao</option>
          </select>
        </div>
      </div>

      {/* Main content: list + detail */}
      <div className="flex flex-col lg:flex-row gap-5 px-4 sm:px-6 lg:px-8 pb-8">
        {/* Left - candidate list */}
        <div className="w-full lg:w-[63%] flex flex-col gap-3">
          {SCOUT_CANDIDATES.map((c, i) => (
            <ScoutCard key={c.id} candidate={c} index={i}
              isSelected={c.id === selectedId}
              onSelect={() => setSelectedId(c.id)}
            />
          ))}

          {/* Pagination */}
          <div className="flex justify-center items-center gap-1.5 sm:gap-2 py-4">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{
              padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: 6,
              backgroundColor: '#fff', cursor: 'pointer', display: 'flex',
            }}><ChevronLeft size={16} color="#6B7280" /></button>
            {pageButtons.map(p => (
              <button key={p} onClick={() => setCurrentPage(p)} style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                border: currentPage === p ? 'none' : '1px solid #E5E7EB',
                backgroundColor: currentPage === p ? '#dc2626' : '#fff',
                color: currentPage === p ? '#fff' : '#374151', fontWeight: currentPage === p ? 600 : 400,
              }}>{p}</button>
            ))}
            <span style={{ color: '#9CA3AF', fontSize: 13 }}>...</span>
            <button style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              border: '1px solid #E5E7EB', backgroundColor: '#fff', color: '#374151',
            }}>125</button>
            <button onClick={() => setCurrentPage(p => Math.min(125, p + 1))} style={{
              padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: 6,
              backgroundColor: '#fff', cursor: 'pointer', display: 'flex',
            }}><ChevronRight size={16} color="#6B7280" /></button>
          </div>
        </div>

        {/* Right - detail panel */}
        <div className="w-full lg:w-[35%] lg:sticky lg:top-5 lg:self-start">
          <div style={{
            borderRadius: 12, backgroundColor: '#fff', border: '1px solid #E5E7EB',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div className="p-5 sm:p-6 pb-4 text-center">
              <div style={{
                width: 64, height: 64, borderRadius: '50%', backgroundColor: avatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px', color: '#fff', fontSize: 24, fontWeight: 700,
              }}>
                {String.fromCharCode(65 + selectedIndex)}
              </div>
              <h3 className="flex items-center justify-center gap-1.5 flex-wrap" style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Ứng viên ẩn danh <Lock size={14} color="#9CA3AF" />
              </h3>
              <p style={{ fontSize: 14, color: '#dc2626', margin: '4px 0 0', fontWeight: 500 }}>{selected.title}</p>

              <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 mt-3" style={{ fontSize: 13, color: '#6B7280' }}>
                <span className="flex items-center gap-1">
                  <Briefcase size={13} /> {selected.exp}
                </span>
                <span className="flex items-center gap-1">
                  <Award size={13} /> {selected.level}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} /> {selected.location}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
                <DollarSign size={13} style={{ verticalAlign: 'middle' }} /> {selected.salary}
              </div>
            </div>

            {/* Info banner */}
            <div className="mx-4 sm:mx-5 mb-4" style={{
              padding: '12px 16px', borderRadius: 8,
              backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Lock size={16} color="#dc2626" />
              <span style={{ fontSize: 13, color: '#991b1b' }}>Thông tin ứng viên đang được ẩn</span>
            </div>

            {/* Approach question */}
            <div className="px-4 sm:px-5 pb-5">
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 14px' }}>
                Bạn muốn tiếp cận ứng viên bằng cách nào?
              </p>

              {/* Option 1: Credit */}
              <div style={{
                padding: 16, borderRadius: 10, border: '1px solid #E5E7EB',
                marginBottom: 12, backgroundColor: '#FAFAFE',
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={18} color="#dc2626" />
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                    Mở liên hệ bằng Credit
                  </h4>
                </div>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 4px' }}>
                  Sử dụng credit để xem thông tin liên hệ ứng viên
                </p>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 6, backgroundColor: '#fef2f2',
                  fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 12,
                }}>
                  <Zap size={13} /> 1 credit
                </div>
                <button style={{
                  width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                  backgroundColor: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <CreditCard size={16} /> Mở liên hệ ứng viên
                </button>
              </div>

              {/* Option 2: WS */}
              <div style={{
                padding: 16, borderRadius: 10, border: '1px solid #E5E7EB',
                marginBottom: 16, backgroundColor: '#fef2f2',
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={18} color="#dc2626" />
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                    Gửi yêu cầu WS tiếp cận
                  </h4>
                </div>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 4px' }}>
                  WS sẽ hỗ trợ tiếp cận và giới thiệu ứng viên
                </p>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 6, backgroundColor: '#fef2f2',
                  fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 12,
                }}>
                  Phí giới thiệu 20%
                </div>
                <button style={{
                  width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                  backgroundColor: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <Users size={16} /> Gửi yêu cầu WS tiếp cận
                </button>
              </div>

              {/* Save candidate link */}
              <div style={{ textAlign: 'center' }}>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  border: 'none', backgroundColor: 'transparent',
                  fontSize: 13, color: '#dc2626', cursor: 'pointer', fontWeight: 500,
                }}>
                  <BookmarkPlus size={15} /> Lưu ứng viên
                </button>
              </div>
            </div>

            {/* Skills */}
            <div className="px-4 sm:px-5 pb-5">
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>Kỹ năng</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.skills.map((skill, i) => (
                  <span key={i} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 12,
                    backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 500,
                  }}>{skill}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
