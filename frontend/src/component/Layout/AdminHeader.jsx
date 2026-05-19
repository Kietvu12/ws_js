import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, User, Search, Settings, LogOut, Languages, Info, Menu } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { translations } from '../../translations/translations';
import apiService from '../../services/api';

const ICON_TINT = '#b07a8a';
const BREADCRUMB_COLOR = '#67748E';
const TITLE_COLOR = '#441C2C';

const AdminHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, changeLanguage } = useLanguage();
  const notify = useNotification();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const userMenuRef = useRef(null);
  const t = translations[language] || translations.vi;
  const uiText = {
    searchPlaceholder: language === 'vi' ? 'Tìm kiếm' : language === 'en' ? 'Search' : '検索',
    notifications: language === 'vi' ? 'Thông báo' : language === 'en' ? 'Notifications' : '通知',
    autoParseTitle: language === 'vi' ? 'Auto-parse CV' : language === 'en' ? 'Auto-parse CV' : 'CV自動解析',
    autoParseOn: language === 'vi' ? 'Tắt auto-parse CV' : language === 'en' ? 'Turn off auto-parse CV' : 'CV自動解析をオフ',
    autoParseOff: language === 'vi' ? 'Bật auto-parse CV' : language === 'en' ? 'Turn on auto-parse CV' : 'CV自動解析をオン',
    info: language === 'vi' ? 'Thông tin' : language === 'en' ? 'Info' : '情報'
  };
  const [hoveredUserMenuItemIndex, setHoveredUserMenuItemIndex] = useState(null);
  const [autoParseRunning, setAutoParseRunning] = useState(false);
  const [autoParseBusy, setAutoParseBusy] = useState(false);
  const [headerSearch, setHeaderSearch] = useState(() => {
    const sp = new URLSearchParams(location.search || '');
    return sp.get('search') || '';
  });
  const [showHeaderSearchSuggestions, setShowHeaderSearchSuggestions] = useState(false);
  const [recentHeaderSearches, setRecentHeaderSearches] = useState(() => {
    try {
      const raw = localStorage.getItem('adminHeaderRecentSearches');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 5) : [];
    } catch {
      return [];
    }
  });

  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState({
    events: [],
    jobs: [],
    collaborators: [],
    cvs: [],
    companies: [],
    admins: [],
    jobCategories: [],
    paymentRequests: [],
  });
  const [globalSearchError, setGlobalSearchError] = useState(null);
  const globalSearchRequestIdRef = useRef(0);
  const [adminNotifUnread, setAdminNotifUnread] = useState(0);
  const [adminNotifOpen, setAdminNotifOpen] = useState(false);
  const [adminNotifList, setAdminNotifList] = useState([]);
  const [adminNotifLoading, setAdminNotifLoading] = useState(false);
  const adminNotifPanelRef = useRef(null);

  const refreshAdminNotifCount = async () => {
    try {
      const c = await apiService.getAdminNotificationUnreadCount();
      setAdminNotifUnread(typeof c === 'number' ? c : 0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let timer;
    const tick = () => refreshAdminNotifCount();
    tick();
    timer = setInterval(tick, 45000);
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (!adminNotifOpen) return undefined;
    const load = async () => {
      setAdminNotifLoading(true);
      try {
        const res = await apiService.getAdminNotifications({ page: 1, limit: 20 });
        const rows = res?.data?.notifications ?? res?.notifications ?? [];
        setAdminNotifList(Array.isArray(rows) ? rows : []);
      } catch {
        setAdminNotifList([]);
      } finally {
        setAdminNotifLoading(false);
      }
    };
    load();
    const onDoc = (e) => {
      if (adminNotifPanelRef.current && !adminNotifPanelRef.current.contains(e.target)) {
        setAdminNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [adminNotifOpen]);

  useEffect(() => {
    const sp = new URLSearchParams(location.search || '');
    setHeaderSearch(sp.get('search') || '');
  }, [location.search]);

  useEffect(() => {
    const query = String(headerSearch || '').trim();
    if (!showHeaderSearchSuggestions || query.length < 2) {
      setGlobalSearchLoading(false);
      setGlobalSearchError(null);
      setGlobalSearchResults({
        events: [],
        jobs: [],
        collaborators: [],
        cvs: [],
        companies: [],
        admins: [],
        jobCategories: [],
        paymentRequests: [],
      });
      return;
    }

    globalSearchRequestIdRef.current += 1;
    const reqId = globalSearchRequestIdRef.current;
    setGlobalSearchLoading(true);
    setGlobalSearchError(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const params = { page: 1, limit: 5, search: query };
        const jobParams = { limit: 5, search: query };
        const [eventsRes, jobsRes, collaboratorsRes, cvsRes, companiesRes, adminsRes, jobCatsRes, paymentRes] =
          await Promise.allSettled([
            apiService.getAdminEvents(params),
            apiService.getAdminJobs(jobParams),
            apiService.getCollaborators(params),
            apiService.getAdminCVs(params),
            apiService.getCompanies(params),
            apiService.getAdmins(params),
            apiService.getJobCategories({ ...params }),
            apiService.getAdminPaymentRequests(params),
          ]);

        if (reqId !== globalSearchRequestIdRef.current) return;

        // Each API uses different response key, so map explicitly:
        const events = eventsRes.status === 'fulfilled' ? (eventsRes.value?.data?.events || eventsRes.value?.data?.items || eventsRes.value?.data?.results || []) : [];
        const jobs = jobsRes.status === 'fulfilled' ? (jobsRes.value?.data?.jobs || jobsRes.value?.data?.items || []) : [];
        const collaborators = collaboratorsRes.status === 'fulfilled' ? (collaboratorsRes.value?.data?.collaborators || collaboratorsRes.value?.data?.items || []) : [];
        const cvs = cvsRes.status === 'fulfilled' ? (cvsRes.value?.data?.cvs || cvsRes.value?.data?.items || []) : [];
        const companies = companiesRes.status === 'fulfilled' ? (companiesRes.value?.data?.companies || companiesRes.value?.data?.items || []) : [];
        const admins = adminsRes.status === 'fulfilled' ? (adminsRes.value?.data?.admins || adminsRes.value?.data?.items || []) : [];
        const jobCategories = jobCatsRes.status === 'fulfilled' ? (jobCatsRes.value?.data?.categories || jobCatsRes.value?.data?.items || []) : [];
        const paymentRequests = paymentRes.status === 'fulfilled' ? (paymentRes.value?.data?.paymentRequests || paymentRes.value?.data?.items || []) : [];

        setGlobalSearchResults({
          events: Array.isArray(events) ? events.slice(0, 5) : [],
          jobs: Array.isArray(jobs) ? jobs.slice(0, 5) : [],
          collaborators: Array.isArray(collaborators) ? collaborators.slice(0, 5) : [],
          cvs: Array.isArray(cvs) ? cvs.slice(0, 5) : [],
          companies: Array.isArray(companies) ? companies.slice(0, 5) : [],
          admins: Array.isArray(admins) ? admins.slice(0, 5) : [],
          jobCategories: Array.isArray(jobCategories) ? jobCategories.slice(0, 5) : [],
          paymentRequests: Array.isArray(paymentRequests) ? paymentRequests.slice(0, 5) : [],
        });
      } catch (err) {
        if (reqId !== globalSearchRequestIdRef.current) return;
        setGlobalSearchError(err?.message || 'Global search error');
      } finally {
        if (reqId !== globalSearchRequestIdRef.current) return;
        setGlobalSearchLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [headerSearch, showHeaderSearchSuggestions]);

  // Lấy thông tin user từ localStorage
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

  const routeMap = {
    '/admin': t.adminDashboard,
    '/admin/collaborators': t.adminCollaboratorManagement,
    '/admin/candidates': t.adminCandidateManagement,
    '/admin/jobs': t.adminJobManagement,
    '/admin/job-categories': t.adminJobCategoryManagement,
    '/admin/job-pickups': t.adminJobPickupManagement,
    '/admin/nominations': t.adminNominationManagement,
    '/admin/payments': t.adminPaymentManagement,
    '/admin/companies': t.adminSourceCompanyManagement,
    '/admin/reports': t.adminReport,
    '/admin/accounts': t.adminAccountManagement,
    '/admin/campaigns': t.adminCampaigns,
    '/admin/public-ctv-chat': t.adminPublicCtvChatInbox,
    '/admin/emails': t.adminSystemEmail,
    '/admin/settings': t.adminSettings,
    '/admin/posts': 'Bài viết',
  };

  const getPageTitle = () => {
    if (routeMap[location.pathname]) return routeMap[location.pathname];
    for (const [route, title] of Object.entries(routeMap)) {
      if (location.pathname.startsWith(route) && route !== '/admin') return title;
    }
    return routeMap['/admin'];
  };

  const getBreadcrumb = () => {
    const title = getPageTitle();
    const label = location.pathname === '/admin' ? t.adminDashboard : title;
    return `Pages / ${label}`;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleLanguage = () => {
    const next =
      language === 'vi'
        ? 'en'
        : language === 'en'
        ? 'ja'
        : 'vi';
    changeLanguage(next);
  };

  // Xử lý đăng xuất
  const handleLogout = async () => {
    try {
      await apiService.logoutAdmin();
      // Xóa thông tin đăng nhập
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      // Trang /login mặc định là CTV — admin luôn về /admin/login
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Vẫn xóa thông tin và chuyển về trang đăng nhập ngay cả khi API lỗi
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      navigate('/admin/login');
    }
  };

  const handleSubmitHeaderSearch = (e) => {
    e.preventDefault();
    const trimmed = String(headerSearch || '').trim();
    const sp = new URLSearchParams(location.search || '');

    if (trimmed) sp.set('search', trimmed);
    else sp.delete('search');

    const nextSearch = sp.toString();

    // Save to "recent searches" for suggestion dropdown
    if (trimmed) {
      setRecentHeaderSearches((prev) => {
        const next = [trimmed, ...(Array.isArray(prev) ? prev : [])].filter((v, idx, arr) => arr.indexOf(v) === idx);
        const sliced = next.slice(0, 5);
        try {
          localStorage.setItem('adminHeaderRecentSearches', JSON.stringify(sliced));
        } catch {
          // ignore storage failures
        }
        return sliced;
      });
    }

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true }
    );
  };

  const handleToggleAutoParse = async () => {
    if (autoParseBusy) return;
    setAutoParseBusy(true);
    try {
      // Toggle theo trạng thái backend để tránh lệch state khi reload trang.
      // - Nếu chưa chạy => start
      // - Nếu đang chạy => start trả 409 => tự gọi stop
      try {
        const res = await apiService.startAutoParseCVs();
        if (!res?.success) throw new Error(res?.message || 'Không thể bắt đầu auto-parse CV');
        setAutoParseRunning(true);
        notify.info('Đã bật auto-parse CV (chạy ngầm).');
      } catch (err) {
        if (err?.status === 409) {
          const res = await apiService.stopAutoParseCVs();
          if (!res?.success) throw new Error(res?.message || 'Không thể tắt auto-parse CV');
          const { processed, success, failed } = res?.data || {};
          setAutoParseRunning(false);
          notify.success(
            `Đã duyệt ${processed || 0} CV. Thành công: ${success || 0}. Thất bại: ${failed || 0}.`
          );
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error('auto-parse toggle error:', err);
      notify.error(err?.message || 'Có lỗi khi thao tác auto-parse CV');
    } finally {
      setAutoParseBusy(false);
    }
  };

  return (
    <header className="px-6 py-1 sm:py-2 md:py-2.5 sticky top-0 z-50 bg-transparent">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {/* Left: breadcrumb + title */}
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('admin-mobile-sidebar-open'))}
            className="-ml-2 mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border bg-white lg:hidden"
            style={{ borderColor: 'rgba(0,0,0,0.08)', color: ICON_TINT }}
            aria-label="Open admin menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[7px] sm:text-[10px] md:text-xs" style={{ color: BREADCRUMB_COLOR }}>
            {getBreadcrumb()}
          </p>
          <h1 className="text-[9px] sm:text-sm md:text-lg font-bold truncate" style={{ color: TITLE_COLOR }}>
            {getPageTitle()}
          </h1>
          </div>
        </div>

        {/* Right: single rounded container */}
        <div
          className="flex items-center gap-0.5 sm:gap-1.5 md:gap-2 px-1.5 sm:px-2.5 md:px-3.5 py-0.5 sm:py-1 md:py-1.5 rounded-2xl border bg-white"
          style={{
            borderColor: 'rgba(0,0,0,0.06)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {/* Search */}
          <form
            onSubmit={handleSubmitHeaderSearch}
            className="relative hidden md:block flex-shrink-0 w-[320px]"
            onFocus={() => setShowHeaderSearchSuggestions(true)}
            onBlur={() => {
              // Delay so click on suggestion item can register
              window.setTimeout(() => setShowHeaderSearchSuggestions(false), 300);
            }}
          >
            <button
              type="submit"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 rounded-lg hover:bg-transparent"
              aria-label={uiText.searchPlaceholder}
              style={{ color: ICON_TINT }}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              onFocus={() => setShowHeaderSearchSuggestions(true)}
              placeholder={uiText.searchPlaceholder}
              className="pl-8 pr-2 py-1 rounded-lg text-[10px] sm:text-xs md:text-sm focus:outline-none w-full bg-transparent border-0 focus:ring-0"
              style={{ color: '#1e293b' }}
            />
            {showHeaderSearchSuggestions && (
              <div
                className="absolute left-0 mt-1 bg-white rounded-xl border shadow-lg z-50 overflow-y-auto overflow-x-hidden"
                style={{
                  borderColor: '#e5e7eb',
                  width: '520px',
                  maxWidth: 'calc(100vw - 96px)',
                  maxHeight: '520px'
                }}
              >
                <div className="px-3 py-2" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="text-[10px] sm:text-xs font-bold" style={{ color: '#111827' }}>
                    Kết quả "{String(headerSearch || '').trim() || ''}"
                  </div>
                  <div className="text-[10px] sm:text-xs mt-0.5" style={{ color: '#64748b' }}>
                    {globalSearchLoading ? 'Đang tìm...' : (globalSearchError ? 'Có lỗi khi tìm kiếm.' : 'Tìm nhanh theo dữ liệu hệ thống')}
                  </div>
                </div>

                <div className="px-3 py-2 border-t" style={{ borderColor: '#f3f4f6' }}>
                  <div className="text-[10px] font-bold uppercase" style={{ color: '#6b7280' }}>
                    Tính năng nhanh
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutoParse}
                    disabled={autoParseBusy}
                    className="mt-2 w-full text-left px-3 py-2 rounded-lg border text-[10px] font-semibold"
                    style={{
                      borderColor: '#bfdbfe',
                      color: '#1d4ed8',
                      backgroundColor: autoParseBusy ? '#eff6ff' : '#ffffff',
                      opacity: autoParseBusy ? 0.7 : 1,
                      cursor: autoParseBusy ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {autoParseRunning ? 'Bật/Tắt auto-parse CV (tắt)' : 'Bật/Tắt auto-parse CV (bật)'}
                  </button>
                </div>

                {String(headerSearch || '').trim().length >= 2 && (
                  <div className="px-3 py-2 border-t" style={{ borderColor: '#f3f4f6' }}>
                    {globalSearchError && (
                      <div className="text-[10px] sm:text-xs" style={{ color: '#dc2626' }}>
                        {globalSearchError}
                      </div>
                    )}

                    {!globalSearchError && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold" style={{ color: '#111827' }}>Jobs</div>
                          <div className="mt-1 space-y-1">
                            {(globalSearchResults.jobs || []).map((j) => (
                              <button
                                key={j.id}
                                type="button"
                                className="w-full text-left px-2 py-1 rounded-lg hover:bg-gray-50 truncate text-[10px]"
                                style={{ color: '#1f2937' }}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => navigate(`/admin/jobs/${j.id}`)}
                              >
                                {j.jobCode || j.id}: {j.title || '—'}
                              </button>
                            ))}
                        {(globalSearchResults.jobs || []).length === 0 && (
                          <div className="text-[10px] text-gray-400 px-2 py-1">Không có kết quả</div>
                        )}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-[10px] font-bold" style={{ color: '#111827' }}>CV</div>
                          <div className="mt-1 space-y-1">
                            {(globalSearchResults.cvs || []).map((cv) => (
                              <button
                                key={cv.id}
                                type="button"
                                className="w-full text-left px-2 py-1 rounded-lg hover:bg-gray-50 truncate text-[10px]"
                                style={{ color: '#1f2937' }}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => navigate(`/admin/candidates/${cv.id}`)}
                              >
                                {cv.code || cv.name || cv.fullName || cv.id}
                              </button>
                            ))}
                        {(globalSearchResults.cvs || []).length === 0 && (
                          <div className="text-[10px] text-gray-400 px-2 py-1">Không có kết quả</div>
                        )}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-[10px] font-bold" style={{ color: '#111827' }}>CTV</div>
                          <div className="mt-1 space-y-1">
                            {(globalSearchResults.collaborators || []).map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="w-full text-left px-2 py-1 rounded-lg hover:bg-gray-50 truncate text-[10px]"
                                style={{ color: '#1f2937' }}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => navigate(`/admin/collaborators/${c.id}`)}
                              >
                                {c.code || c.name || c.fullName || c.id}
                              </button>
                            ))}
                        {(globalSearchResults.collaborators || []).length === 0 && (
                          <div className="text-[10px] text-gray-400 px-2 py-1">Không có kết quả</div>
                        )}
                          </div>
                        </div>
                      </div>
                    )}

                {!globalSearchLoading &&
                  !globalSearchError &&
                  (globalSearchResults.jobs?.length || 0) === 0 &&
                  (globalSearchResults.cvs?.length || 0) === 0 &&
                  (globalSearchResults.collaborators?.length || 0) === 0 && (
                    <div className="text-[10px] mt-2" style={{ color: '#64748b' }}>
                      Không có dữ liệu phù hợp. Thử từ khóa khác.
                    </div>
                  )}
                  </div>
                )}

                {(String(headerSearch || '').trim().length < 2 || (globalSearchResults.jobs || []).length === 0) && recentHeaderSearches.length > 0 && (
                  <div className="border-t" style={{ borderColor: '#f3f4f6' }}>
                    <div className="px-3 py-2 text-[10px] font-bold" style={{ color: '#6b7280' }}>Gợi ý gần đây</div>
                    {recentHeaderSearches.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setHeaderSearch(q);
                          setShowHeaderSearchSuggestions(false);
                          const sp = new URLSearchParams(location.search || '');
                          sp.set('search', q);
                          const next = sp.toString();
                          navigate(
                            { pathname: location.pathname, search: next ? `?${next}` : '' },
                            { replace: true }
                          );
                        }}
                        className="w-full text-left px-3 py-2 text-[10px] sm:text-xs hover:bg-gray-50"
                        style={{ color: '#374151' }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>

          <div className="hidden md:block w-px h-6 bg-gray-200" aria-hidden />

          <div className="relative flex-shrink-0" ref={adminNotifPanelRef}>
            <button
              type="button"
              className="relative p-0.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={uiText.notifications}
              aria-expanded={adminNotifOpen}
              onClick={() => setAdminNotifOpen((o) => !o)}
            >
              <Bell className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" style={{ color: ICON_TINT }} />
              {adminNotifUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-[3px] rounded-full text-[9px] font-bold flex items-center justify-center bg-red-500 text-white">
                  {adminNotifUnread > 99 ? '99+' : adminNotifUnread}
                </span>
              )}
            </button>
            {adminNotifOpen && (
              <div
                className="absolute right-0 mt-1 w-[min(100vw-24px,380px)] max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border bg-white shadow-lg z-[60]"
                style={{ borderColor: '#e5e7eb' }}
                role="menu"
              >
                <div className="px-3 py-2 border-b flex items-center justify-between gap-2" style={{ borderColor: '#f3f4f6' }}>
                  <span className="text-[11px] font-bold" style={{ color: '#111827' }}>{uiText.notifications}</span>
                  {adminNotifUnread > 0 && (
                    <button
                      type="button"
                      className="text-[10px] font-semibold"
                      style={{ color: '#2563eb' }}
                      onClick={async () => {
                        try {
                          await apiService.markAllAdminNotificationsRead();
                          setAdminNotifList((prev) =>
                            (Array.isArray(prev) ? prev : []).map((n) => ({ ...n, isRead: true }))
                          );
                          await refreshAdminNotifCount();
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      {language === 'vi' ? 'Đọc hết' : language === 'en' ? 'Mark all read' : 'すべて既読'}
                    </button>
                  )}
                </div>
                {adminNotifLoading && (
                  <div className="px-3 py-6 text-center text-[10px]" style={{ color: '#6b7280' }}>…</div>
                )}
                {!adminNotifLoading && (!adminNotifList || adminNotifList.length === 0) && (
                  <div className="px-3 py-6 text-center text-[10px]" style={{ color: '#6b7280' }}>
                    {language === 'vi' ? 'Không có thông báo.' : language === 'en' ? 'No notifications.' : '通知はありません。'}
                  </div>
                )}
                {!adminNotifLoading &&
                  (adminNotifList || []).map((n) => {
                    const id = n.id;
                    const url = n.url || '';
                    const unread = !n.isRead;
                    return (
                      <button
                        key={id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                        style={{ borderColor: '#f3f4f6', backgroundColor: unread ? '#f8fafc' : 'white' }}
                        onClick={async () => {
                          try {
                            if (unread) {
                              await apiService.markAdminNotificationRead(id);
                              await refreshAdminNotifCount();
                            }
                          } catch {
                            /* ignore */
                          }
                          setAdminNotifOpen(false);
                          if (url && typeof url === 'string' && url.startsWith('/')) {
                            navigate(url);
                          }
                        }}
                      >
                        <div className="text-[11px] font-semibold line-clamp-2" style={{ color: '#111827' }}>
                          {n.title || '—'}
                        </div>
                        <div className="text-[10px] mt-0.5 line-clamp-3" style={{ color: '#64748b' }}>
                          {n.content || ''}
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Language toggle */}
          <button
            type="button"
            onClick={handleToggleLanguage}
            className="p-0.5 rounded-lg hover:bg-gray-100 transition-colors hidden sm:inline-flex items-center gap-0.5"
            aria-label="Change language"
          >
            <Languages className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" style={{ color: ICON_TINT }} />
            <span className="hidden md:inline text-[9px] font-medium text-gray-700">
              {language.toUpperCase()}
            </span>
          </button>

          <button
            type="button"
            className="p-0.5 rounded-lg hover:bg-gray-100 transition-colors hidden md:inline-flex"
            aria-label={uiText.info}
          >
            <Info className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" style={{ color: ICON_TINT }} />
          </button>

          <div className="hidden md:block w-px h-6 bg-gray-200" aria-hidden />

          {/* User avatar + dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-0.5 rounded-full p-0.5 hover:opacity-90 transition-opacity"
            >
              <div
                className="w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-200"
                style={{ backgroundColor: '#e2e8f0' }}
              >
                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" style={{ color: ICON_TINT }} />
              </div>
            </button>
            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg border z-50 bg-white"
                style={{ borderColor: '#e5e7eb', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}
              >
                <div className="p-4 border-b" style={{ borderColor: '#e5e7eb' }}>
                  <p className="text-sm font-medium text-gray-900">{userInfo?.name || t.adminDefaultName}</p>
                  <p className="text-xs text-gray-500">{userInfo?.email || t.adminDefaultEmail}</p>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredUserMenuItemIndex('account')}
                    onMouseLeave={() => setHoveredUserMenuItemIndex(null)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    {t.adminAccountInfo}
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredUserMenuItemIndex('settings')}
                    onMouseLeave={() => setHoveredUserMenuItemIndex(null)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    {t.adminSettings}
                  </button>
                  <div className="border-t my-1" style={{ borderColor: '#e5e7eb' }} />
                  <button
                    type="button"
                    onClick={handleLogout}
                    onMouseEnter={() => setHoveredUserMenuItemIndex('logout')}
                    onMouseLeave={() => setHoveredUserMenuItemIndex(null)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t.adminLogout}
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

export default AdminHeader;

