import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Flag,
  FileCheck,
  FileText,
  History,
  CalendarDays,
  Phone,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';

const Sidebar = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [isExpanded, setIsExpanded] = useState(true);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const [hoveredMenuItemIndex, setHoveredMenuItemIndex] = useState(null);
  const [hoveredExpandButton, setHoveredExpandButton] = useState(false);
  const [ctvDisplayName, setCtvDisplayName] = useState('');
  const [rankLevelLabel, setRankLevelLabel] = useState('');

  const generalItems = [
    { id: 'thong-tin-chung', label: t.generalInfo, icon: LayoutGrid, path: '/agent' },
    { id: 'danh-sach-viec-lam', label: t.jobList, icon: Flag, path: '/agent/jobs' },
    { id: 'su-kien', label: t.agentEventsMenu, icon: CalendarDays, path: '/agent/events' },
    { id: 'ho-so-ung-vien', label: t.candidateProfile, icon: FileCheck, path: '/agent/candidates' },
    { id: 'quan-ly-tien-cu', label: t.nominationManagement, icon: FileText, path: '/agent/nominations' },
    { id: 'lich-su-thanh-toan', label: t.paymentHistory, icon: History, path: '/agent/payment-history' },
  ];

  const ZALO_HOTLINE_URL = 'https://zalo.me/0972899728';
  const otherItems = [
    { id: 'hotline-zalo', label: t.hotline, icon: Phone, path: '/agent/hotline', externalUrl: ZALO_HOTLINE_URL },
  ];

  /** Tag màu theo tên rank (Silver / Gold / Platinum / Diamond) */
  const rankTagStyle = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('diamond')) {
      return { backgroundColor: '#ede9fe', color: '#5b21b6', border: '1px solid #a78bfa' };
    }
    if (n.includes('platinum')) {
      return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #38bdf8' };
    }
    if (n.includes('gold')) {
      return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #f59e0b' };
    }
    if (n.includes('silver')) {
      return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #94a3b8' };
    }
    return { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' };
  };

  const isActive = (path) => {
    if (path === '/agent') {
      return location.pathname === '/agent' || location.pathname === '/agent/';
    }
    return location.pathname.startsWith(path);
  };

  const fetchUnreadMessageCount = async () => {
    try {
      const count = await apiService.getCTVUnreadMessageCount();
      setUnreadMessageCount(typeof count === 'number' ? count : 0);
    } catch {
      setUnreadMessageCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadMessageCount();
    const interval = setInterval(fetchUnreadMessageCount, 60000);
    const onFocus = () => fetchUnreadMessageCount();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.getCTVProfile();
        if (cancelled || !res?.success || !res?.data?.collaborator) return;
        const c = res.data.collaborator;
        const name = (c.name && String(c.name).trim()) || c.email || '';
        setCtvDisplayName(name);
        const rl = c.rankLevel;
        const label =
          rl && typeof rl.name === 'string' && rl.name.trim()
            ? rl.name.trim()
            : '';
        setRankLevelLabel(label);
      } catch {
        if (!cancelled) {
          setCtvDisplayName('');
          setRankLevelLabel('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const navInactive = '#ffffff';
  const navActiveBg = '#ffffff';
  const navActiveFg = '#b91c1c';

  return (
    <div
      className={`hidden lg:flex ${isExpanded ? 'w-52 xl:w-56' : 'w-16 xl:w-20'} h-screen flex-col border-r border-white/10 shadow-xl shadow-red-950/25 transition-all duration-300 relative bg-gradient-to-b from-[#c4121e] via-[#b91c1c] to-[#991b1b] text-white flex-shrink-0`}
    >
      {/* Logo Section */}
      <div
        className={`${isExpanded ? 'px-4 py-4' : 'p-3'} border-b border-white/15 flex items-center ${isExpanded ? 'justify-start' : 'justify-center'}`}
      >
        <Link
          to="/agent"
          className="flex items-center cursor-pointer overflow-hidden rounded-lg bg-white/10 p-1.5 ring-1 ring-white/20"
        >
          <img
            src="/landing/jobshare-logo.png"
            alt="JobShare"
            className={`object-contain ${isExpanded ? 'max-h-9 w-auto' : 'h-8 w-auto max-w-full'}`}
          />
        </Link>
      </div>

      {/* Lời chào CTV + level (tag màu) */}
      {isExpanded && (
        <div className="px-2.5 pt-3 pb-1">
          <div className="rounded-lg border border-white/20 bg-black/10 p-2.5 backdrop-blur-[2px]">
            <p className="text-[11px] leading-snug mb-1.5 text-white/90">
              <span className="text-white/70">{t.agentSidebarGreeting},</span>
              <br />
              <span className="font-semibold break-words text-white">{ctvDisplayName || '—'}</span>
            </p>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="text-[10px] shrink-0 text-white/70">
                {t.agentSidebarYourLevel}
              </span>
              {rankLevelLabel ? (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                  style={rankTagStyle(rankLevelLabel)}
                >
                  {rankLevelLabel}
                </span>
              ) : (
                <span className="text-[10px] italic text-white/50">
                  —
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Section - same padding and item style as AdminSidebar */}
      <div className="flex-1 overflow-y-auto overflow-x-visible px-2.5 py-3">
        <div className="space-y-1">
          {isExpanded && (
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/55">
              {t.general}
            </p>
          )}
          {generalItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.id}
                to={item.path}
                onMouseEnter={() => setHoveredMenuItemIndex(item.id)}
                onMouseLeave={() => setHoveredMenuItemIndex(null)}
                className={`relative flex w-full ${isExpanded ? 'items-center gap-1.5' : 'items-center justify-center'} rounded-lg px-1.5 py-1 transition-colors`}
                style={{
                  backgroundColor: active ? navActiveBg : (hoveredMenuItemIndex === item.id ? 'rgba(255,255,255,0.12)' : 'transparent'),
                  color: active ? navActiveFg : navInactive,
                }}
                title={!isExpanded ? item.label : undefined}
              >
                <span className="relative inline-flex">
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: active ? navActiveFg : 'rgba(255,255,255,0.92)' }} />
                  {item.id === 'quan-ly-tien-cu' && unreadMessageCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 flex h-2 min-w-[8px] items-center justify-center rounded-full text-[9px] font-semibold"
                      style={{ backgroundColor: '#fef08a', color: '#991b1b', padding: '0 4px' }}
                      title={
                        language === 'en'
                          ? `${unreadMessageCount} unread messages`
                          : language === 'ja'
                            ? `${unreadMessageCount} 件の未読`
                            : `${unreadMessageCount} tin nhắn chưa đọc`
                      }
                    >
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  )}
                </span>
                {isExpanded && (
                  <span className="min-w-0 flex-1 text-left text-[11px] font-medium sm:text-xs" style={{ color: active ? navActiveFg : navInactive }}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Others Section */}
        <div className={`${isExpanded ? 'mt-3 border-t border-white/15 pt-3' : 'mt-3'} space-y-1`}>
          {isExpanded && (
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/55">
              {t.others}
            </p>
          )}
          {otherItems.map((item) => {
            const Icon = item.icon;
            const active = !item.externalUrl && isActive(item.path);
            const sharedClass = `w-full flex ${isExpanded ? 'items-center gap-2' : 'items-center justify-center'} px-2 py-1.5 rounded-lg transition-colors`;
            const sharedStyle = {
              backgroundColor: active ? navActiveBg : (hoveredMenuItemIndex === item.id ? 'rgba(255,255,255,0.12)' : 'transparent'),
              color: active ? navActiveFg : navInactive,
            };

            if (item.externalUrl) {
              return (
                <a
                  key={item.id}
                  href={item.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => setHoveredMenuItemIndex(item.id)}
                  onMouseLeave={() => setHoveredMenuItemIndex(null)}
                  className={sharedClass}
                  style={{ ...sharedStyle, color: navInactive }}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.92)' }} />
                  {isExpanded && (
                    <span className="text-[11px] font-medium flex-1 text-left text-white/95">{item.label}</span>
                  )}
                </a>
              );
            }

            return (
              <Link
                key={item.id}
                to={item.path}
                onMouseEnter={() => setHoveredMenuItemIndex(item.id)}
                onMouseLeave={() => setHoveredMenuItemIndex(null)}
                className={sharedClass}
                style={sharedStyle}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? navActiveFg : 'rgba(255,255,255,0.92)' }} />
                {isExpanded && (
                  <span className="text-[11px] font-medium flex-1 text-left" style={{ color: active ? navActiveFg : navInactive }}>{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Expand/Collapse */}
      <div className={`${isExpanded ? 'px-3 py-3' : 'px-2 py-2'} border-t border-white/15`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          onMouseEnter={() => setHoveredExpandButton(true)}
          onMouseLeave={() => setHoveredExpandButton(false)}
          className={`w-full rounded-lg ${isExpanded ? 'px-2.5 py-2 flex items-center gap-1.5' : 'px-2 py-1.5 flex items-center justify-center'} transition-colors ring-1 ring-white/25`}
          style={{
            backgroundColor: hoveredExpandButton ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)',
            color: 'white',
          }}
          title={!isExpanded ? (language === 'vi' ? 'Mở rộng' : language === 'en' ? 'Expand' : '展開') : undefined}
        >
          {isExpanded ? (
            <>
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span className="text-xs font-medium">{language === 'vi' ? 'Thu gọn' : language === 'en' ? 'Collapse' : '折りたたむ'}</span>
            </>
          ) : (
            <Menu className="w-5 h-5 flex-shrink-0" />
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
