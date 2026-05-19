import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Bell, User, Globe, LogOut, BookOpen } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';
import { localizeNotification } from '../../utils/notificationI18n';

const BREADCRUMB_COLOR = '#67748E';
const TITLE_COLOR = '#441C2C';
const ICON_TINT = '#b07a8a';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, changeLanguage } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const languageMenuRef = useRef(null);
  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [latestNotifications, setLatestNotifications] = useState([]);
  const [latestLoading, setLatestLoading] = useState(false);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const notificationStreamAbortRef = useRef(null);
  const t = translations[language] || translations.vi;
  const notificationLabels = {
    title: language === 'vi' ? 'Thông báo' : language === 'en' ? 'Notifications' : '通知',
    loading: language === 'vi' ? 'Đang tải...' : language === 'en' ? 'Loading...' : '読み込み中...',
    recent: language === 'vi' ? 'Mới nhất gần đây' : language === 'en' ? 'Latest notifications' : '最新のお知らせ',
    empty: language === 'vi' ? 'Chưa có thông báo' : language === 'en' ? 'No notifications yet' : '通知はまだありません',
    noNew: language === 'vi' ? 'Không có thông báo mới.' : language === 'en' ? 'No new notifications.' : '新しい通知はありません。',
    viewMore: language === 'vi' ? 'Xem thêm' : language === 'en' ? 'View more' : 'もっと見る',
    unknownDate: language === 'vi' ? 'Không rõ ngày' : language === 'en' ? 'Unknown date' : '日付不明'
  };

  const [hoveredLanguageMenuItemIndex, setHoveredLanguageMenuItemIndex] = useState(null);
  const [hoveredUserMenuItemIndex, setHoveredUserMenuItemIndex] = useState(null);

  const userType = localStorage.getItem('userType');
  const isCTV = userType === 'ctv';

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUserInfo(JSON.parse(userStr));
      } catch (e) {
        console.error('Error parsing user info:', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setShowLanguageMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        setShowNotificationMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isCTV) return;

    fetchUnreadNotificationCount();
    const interval = setInterval(fetchUnreadNotificationCount, 60000);
    const onFocus = () => fetchUnreadNotificationCount();
    window.addEventListener('focus', onFocus);

    const onExternalUpdate = () => fetchUnreadNotificationCount();
    window.addEventListener('notifications:updated', onExternalUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('notifications:updated', onExternalUpdate);
    };
  }, [isCTV]);

  useEffect(() => {
    if (!isCTV) return;

    let mounted = true;
    const controller = new AbortController();
    notificationStreamAbortRef.current = controller;

    const patchLocalOnIncoming = (payload) => {
      if (!payload || !mounted) return;
      setLatestNotifications((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        const exists = current.some((n) => String(n?.id) === String(payload?.id));
        if (exists) {
          return current.map((n) => (String(n?.id) === String(payload?.id) ? { ...n, ...payload } : n));
        }
        return [payload, ...current].slice(0, 5);
      });
      setNotificationUnreadCount((c) => (typeof c === 'number' ? c + 1 : 1));
      window.dispatchEvent(new Event('notifications:updated'));
    };

    const start = async () => {
      let response = null;
      try {
        response = await apiService.streamCTVNotifications();
      } catch {
        return;
      }
      if (!mounted || !response || !response.ok || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const processEventBlock = (block) => {
        const lines = block.split('\n').map((l) => l.trimEnd());
        let eventName = null;
        let dataStr = null;
        for (const line of lines) {
          if (line.startsWith('event:')) eventName = line.slice('event:'.length).trim();
          if (line.startsWith('data:')) dataStr = line.slice('data:'.length).trim();
        }
        if (eventName === 'notification' && dataStr) {
          try {
            const payload = JSON.parse(dataStr);
            patchLocalOnIncoming(payload);
          } catch {
            // ignore malformed payload
          }
        }
      };

      try {
        while (mounted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            processEventBlock(trimmed);
          }
        }
      } catch {
        // stream closed
      }
    };

    start();

    return () => {
      mounted = false;
      controller.abort();
      notificationStreamAbortRef.current = null;
    };
  }, [isCTV]);

  const loadLatestNotifications = async () => {
    if (!isCTV) return;
    try {
      setLatestLoading(true);
      const res = await apiService.getCTVNotifications({ page: 1, limit: 5 });
      setLatestNotifications(res?.data?.notifications || []);
    } catch (err) {
      console.error('[Header] loadLatestNotifications error:', err);
      setLatestNotifications([]);
    } finally {
      setLatestLoading(false);
    }
  };

  const fetchUnreadNotificationCount = async () => {
    if (!isCTV) return;
    try {
      const count = await apiService.getCTVNotificationUnreadCount();
      setNotificationUnreadCount(typeof count === 'number' ? count : 0);
    } catch {
      setNotificationUnreadCount(0);
    }
  };

  const formatDateLabel = (ts) => {
    const d = ts ? new Date(ts) : null;
    if (!d || Number.isNaN(d.getTime())) return notificationLabels.unknownDate;
    const locale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';
    return d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const groupByDate = (items) => {
    const map = new Map();
    (items || []).forEach((n) => {
      const ts = n?.createdAt || n?.created_at || null;
      const label = formatDateLabel(ts);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(n);
    });
    return Array.from(map.entries()); // [label, notifications[]]
  };

  const handleLogout = async () => {
    try {
      if (localStorage.getItem('userType') === 'ctv') {
        await apiService.logoutCTV();
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      navigate('/login');
    }
  };

  const getPageTitle = () => {
    const routeMap = {
      '/agent': language === 'vi' ? 'Thông tin chung' : language === 'en' ? 'General Information' : '一般情報',
      '/agent/jobs': language === 'vi' ? 'Danh sách việc làm' : language === 'en' ? 'Job List' : '求人リスト',
      '/agent/events': language === 'vi' ? 'Sự kiện' : language === 'en' ? 'Events' : 'イベント',
      '/agent/candidates': language === 'vi' ? 'Hồ sơ ứng viên' : language === 'en' ? 'Candidate Profile' : '候補者プロフィール',
      '/agent/nominations': language === 'vi' ? 'Quản lý tiến cử' : language === 'en' ? 'Nomination Management' : '推薦管理',
      '/agent/payment-history': language === 'vi' ? 'Lịch sử thanh toán' : language === 'en' ? 'Payment History' : '支払い履歴',
      '/agent/contact': language === 'vi' ? 'Liên hệ' : language === 'en' ? 'Contact' : 'お問い合わせ',
      '/agent/faq': language === 'vi' ? 'Các câu hỏi thường gặp' : language === 'en' ? 'FAQ' : 'よくある質問',
      '/agent/terms': language === 'vi' ? 'Điều khoản sử dụng' : language === 'en' ? 'Terms of Use' : '利用規約',
      '/agent/hotline': language === 'vi' ? 'Hotline hỗ trợ 24/7 qua Zalo' : language === 'en' ? '24/7 Hotline Support via Zalo' : 'Zalo経由24時間ホットラインサポート',
    };
    if (routeMap[location.pathname]) return routeMap[location.pathname];
    for (const [route, title] of Object.entries(routeMap)) {
      if (location.pathname.startsWith(route) && route !== '/agent') return title;
    }
    return routeMap['/agent'];
  };

  const getBreadcrumb = () => {
    const title = getPageTitle();
    return `Pages / ${title}`;
  };

  const languages = [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
  ];

  return (
    <header className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 sticky top-0 z-50 bg-transparent">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: breadcrumb + title (same as AdminHeader) */}
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <p className="text-[8px] sm:text-[10px] md:text-xs truncate" style={{ color: BREADCRUMB_COLOR }}>
            {getBreadcrumb()}
          </p>
          <h1 className="text-xs sm:text-sm md:text-lg font-bold truncate" style={{ color: TITLE_COLOR }}>
            {getPageTitle()}
          </h1>
        </div>

        {/* Right: single rounded container (same structure as AdminHeader) */}
        <div
          className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-2.5 md:px-3.5 py-1 sm:py-1.5 md:py-1.5 rounded-2xl border bg-white flex-shrink-0"
          style={{
            borderColor: 'rgba(0,0,0,0.06)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {/* Hướng dẫn - link Notion
          <a
            href="https://dust-camel-0dd.notion.site/2c6563f4199880ae9cf0cbe005546446?v=2c6563f41998818a8e4d000cd327e761"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors hidden sm:inline-flex items-center gap-1"
            title={language === 'vi' ? 'Hướng dẫn sử dụng' : language === 'en' ? 'User Guide' : 'ユーザーガイド'}
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: ICON_TINT }} />
            <span className="hidden md:inline text-[10px] font-medium" style={{ color: '#374151' }}>
              {language === 'vi' ? 'Hướng dẫn' : language === 'en' ? 'Guide' : 'ガイド'}
            </span>
          </a> */}

          <div className="hidden sm:block w-px h-5 bg-gray-200" aria-hidden />

          {/* Language */}
          <div className="relative" ref={languageMenuRef}>
            <button
              type="button"
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-0.5"
              aria-label="Change language"
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: ICON_TINT }} />
              <span className="hidden md:inline text-[10px] font-medium text-gray-700">
                {language.toUpperCase()}
              </span>
            </button>
            {showLanguageMenu && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg border z-50 bg-white"
                style={{ borderColor: '#e5e7eb', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}
              >
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      changeLanguage(lang.code);
                      setShowLanguageMenu(false);
                    }}
                    onMouseEnter={() => setHoveredLanguageMenuItemIndex(lang.code)}
                    onMouseLeave={() => setHoveredLanguageMenuItemIndex(null)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors first:rounded-t-xl last:rounded-b-xl"
                    style={{
                      backgroundColor: language === lang.code ? '#fef2f2' : (hoveredLanguageMenuItemIndex === lang.code ? '#f9fafb' : 'transparent'),
                      color: language === lang.code ? '#dc2626' : '#374151',
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                    {language === lang.code && <span className="ml-auto" style={{ color: '#dc2626' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden sm:block w-px h-5 bg-gray-200" aria-hidden />

          {/* Notification Bell - keep red dot */}
          <div className="relative" ref={notificationMenuRef}>
            <button
              type="button"
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors relative"
              aria-label={notificationLabels.title}
              onClick={() => {
                if (!isCTV) return;
                const next = !showNotificationMenu;
                setShowNotificationMenu(next);
                if (next) loadLatestNotifications();
              }}
              style={{ cursor: isCTV ? 'pointer' : 'default' }}
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: ICON_TINT }} />
              {notificationUnreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
              )}
            </button>

            {showNotificationMenu && isCTV && (
              <div
                className="absolute right-0 mt-2 w-[calc(100vw-1rem)] sm:w-[320px] max-w-[320px] rounded-xl shadow-lg border z-50 bg-white"
                style={{
                  borderColor: '#e5e7eb',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'
                }}
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                  <div className="text-[12px] font-bold" style={{ color: '#111827' }}>{notificationLabels.title}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {latestLoading ? notificationLabels.loading : latestNotifications.length > 0 ? notificationLabels.recent : notificationLabels.empty}
                  </div>
                </div>

                <div className="max-h-[360px] overflow-y-auto px-1 py-1">
                  {latestLoading ? (
                    <div className="py-6 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-red-600" />
                    </div>
                  ) : latestNotifications.length === 0 ? (
                    <div className="px-3 py-4 text-[12px] text-gray-500">{notificationLabels.noNew}</div>
                  ) : (
                    (() => {
                      const groups = groupByDate(latestNotifications);
                      return groups.map(([dateLabel, items]) => (
                        <div key={dateLabel} className="px-2 py-1">
                          <div className="text-[10px] font-semibold text-gray-500 px-2 mb-1">
                            {dateLabel}
                          </div>
                          <div className="flex flex-col gap-1">
                            {items.map((n) => {
                              const localized = localizeNotification(n, language);
                              return (
                              <button
                                key={n.id}
                                type="button"
                                onClick={() => {
                                  setShowNotificationMenu(false);
                                  navigate('/agent/notifications');
                                }}
                                className="w-full text-left px-2 py-2 rounded-lg border"
                                style={{
                                  borderColor: n.isRead ? '#e5e7eb' : '#fee2e2',
                                  backgroundColor: n.isRead ? 'transparent' : '#fef2f2'
                                }}
                                title={localized.title}
                              >
                                <div className="text-[12px] font-bold truncate" style={{ color: '#111827' }}>
                                  {localized.title}
                                </div>
                                <div className="text-[12px] mt-0.5 text-gray-600 whitespace-pre-wrap line-clamp-2">
                                  {localized.content}
                                </div>
                              </button>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()
                  )}
                </div>

                {latestNotifications.length > 0 && !latestLoading && (
                  <div className="px-3 py-2 border-t" style={{ borderColor: '#e5e7eb' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotificationMenu(false);
                        navigate('/agent/notifications');
                      }}
                      className="w-full px-3 py-2 rounded-lg text-[12px] font-semibold"
                      style={{ backgroundColor: '#dc2626', color: 'white' }}
                    >
                      {notificationLabels.viewMore}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hidden sm:block w-px h-5 bg-gray-200" aria-hidden />

          {/* User avatar + dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-0.5 rounded-full p-0.5 hover:opacity-90 transition-opacity"
            >
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: '#dc2626' }}
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'white' }} />
              </div>
            </button>
            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-[calc(100vw-1rem)] sm:w-56 max-w-[14rem] rounded-xl shadow-lg border z-50 bg-white"
                style={{ borderColor: '#e5e7eb', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}
              >
                {userInfo && (
                  <div className="p-4 border-b" style={{ borderColor: '#e5e7eb' }}>
                    <p className="text-sm font-medium text-gray-900">{userInfo.name || (language === 'vi' ? 'Tài khoản' : language === 'en' ? 'Account' : 'アカウント')}</p>
                    <p className="text-xs text-gray-500">{userInfo.email || ''}</p>
                    {isCTV && userInfo?.rankLevel && (
                      <p className="text-xs mt-0.5 text-gray-500">
                        {userInfo.rankLevel.name || '—'} · {userInfo.rankLevel.percent != null ? `${Number(userInfo.rankLevel.percent)}%` : '—'}
                      </p>
                    )}
                  </div>
                )}
                <div className="py-1">
                  <Link
                    to={isCTV ? '/agent/profile' : '#'}
                    onClick={() => setShowUserMenu(false)}
                    onMouseEnter={() => setHoveredUserMenuItemIndex('account')}
                    onMouseLeave={() => setHoveredUserMenuItemIndex(null)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    {language === 'vi' ? 'Thông tin tài khoản' : language === 'en' ? 'Account info' : 'アカウント情報'}
                  </Link>
                  <div className="border-t my-1" style={{ borderColor: '#e5e7eb' }} />
                  <button
                    type="button"
                    onClick={handleLogout}
                    onMouseEnter={() => setHoveredUserMenuItemIndex('logout')}
                    onMouseLeave={() => setHoveredUserMenuItemIndex(null)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {language === 'vi' ? 'Đăng xuất' : language === 'en' ? 'Log out' : 'ログアウト'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
