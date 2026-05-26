import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Users,
  Search,
  Target,
  Palette,
  Handshake,
  BookOpen,
  BarChart3,
  MessageCircle,
  CreditCard,
  Settings,
  Bell,
  Languages,
  User,
  Info,
  Menu,
  X,
} from 'lucide-react';
import { SIDEBAR_SECTIONS, COMPANY_USER } from './mockData';

const SIDEBAR_BG = '#002a5c';
const SIDEBAR_WIDTH = 208;
const HEADER_HEIGHT = 60;

const ICON_MAP = {
  dashboard: LayoutDashboard,
  jd: FileText,
  nominations: FileCheck,
  candidates: Users,
  scout: Search,
  'scout-performance': Target,
  'saiyo-branding': Palette,
  'san-ctv': Handshake,
  knowledge: BookOpen,
  reports: BarChart3,
  messages: MessageCircle,
  billing: CreditCard,
};

const isActivePath = (itemPath, currentPath) => {
  if (itemPath === '/company') {
    return currentPath === '/company' || currentPath === '/company/';
  }
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
};

// ─── Sidebar ────────────────────────────────────────────────────────────────────

const CompanySidebar = ({ mobileSidebarOpen, setMobileSidebarOpen }) => {
  const location = useLocation();
  const [hoveredId, setHoveredId] = useState(null);

  const renderNavItem = (item, isActive) => {
    const Icon = ICON_MAP[item.id] || FileText;

    return (
      <Link
        key={item.id}
        to={item.path}
        onClick={() => setMobileSidebarOpen(false)}
        onMouseEnter={() => setHoveredId(item.id)}
        onMouseLeave={() => setHoveredId(null)}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
        style={{
          backgroundColor: isActive
            ? '#b91c1c'
            : hoveredId === item.id
              ? '#1a4178'
              : 'transparent',
          color: isActive ? '#ffffff' : '#cddcf0',
        }}
      >
        <Icon
          className="h-[18px] w-[18px] flex-shrink-0"
          style={{ color: isActive ? '#ffffff' : '#8fb3de' }}
        />
        <span className="leading-tight">{item.label}</span>
      </Link>
    );
  };

  const navContent = (
    <>
      {/* Logo */}
      <div
        className="flex items-center px-4 border-b"
        style={{ height: HEADER_HEIGHT, borderColor: '#1a4178' }}
      >
        <Link to="/company" className="flex items-center cursor-pointer overflow-hidden">
          <img
            src="/landing/jobshare-logo.png"
            alt="JobShare"
            className="max-h-9 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SIDEBAR_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? 'mt-5' : ''}>
            {section.title && (
              <p
                className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: '#8fb3de' }}
              >
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) =>
                renderNavItem(item, isActivePath(item.path, location.pathname)),
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* CTA card */}
      <div className="mx-3 mb-3 rounded-xl p-4" style={{ backgroundColor: '#1a4178' }}>
        <p className="text-xs font-semibold text-white">Bạn cần tư vấn?</p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: '#cddcf0' }}>
          Đội ngũ WS sẵn sàng hỗ trợ bạn 24/7.
        </p>
        <button
          type="button"
          className="mt-3 w-full rounded-lg py-2 text-xs font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: '#dc2626' }}
        >
          Liên hệ ngay
        </button>
      </div>

      {/* Settings */}
      <div className="border-t px-3 py-3" style={{ borderColor: '#1a4178' }}>
        <Link
          to="/company/settings"
          onClick={() => setMobileSidebarOpen(false)}
          onMouseEnter={() => setHoveredId('settings')}
          onMouseLeave={() => setHoveredId(null)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: isActivePath('/company/settings', location.pathname)
              ? '#b91c1c'
              : hoveredId === 'settings'
                ? '#1a4178'
                : 'transparent',
            color: isActivePath('/company/settings', location.pathname)
              ? '#ffffff'
              : '#cddcf0',
          }}
        >
          <Settings
            className="h-[18px] w-[18px] flex-shrink-0"
            style={{
              color: isActivePath('/company/settings', location.pathname)
                ? '#ffffff'
                : '#8fb3de',
            }}
          />
          <span>Cài đặt</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex h-screen flex-col flex-shrink-0"
        style={{
          width: SIDEBAR_WIDTH,
          backgroundColor: SIDEBAR_BG,
        }}
      >
        {navContent}
      </aside>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-[100] lg:hidden ${mobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className={`absolute inset-0 transition-opacity ${mobileSidebarOpen ? 'bg-black/40 opacity-100' : 'opacity-0'}`}
          aria-label="Close menu overlay"
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[80vw] max-w-[280px] flex-col shadow-2xl transition-transform duration-300 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ backgroundColor: SIDEBAR_BG }}
        >
          {/* Mobile header: logo + close */}
          <div
            className="flex items-center justify-between px-4 border-b flex-shrink-0"
            style={{ height: HEADER_HEIGHT, borderColor: '#1a4178' }}
          >
            <Link to="/company" onClick={() => setMobileSidebarOpen(false)} className="flex items-center overflow-hidden">
              <img src="/landing/jobshare-logo.png" alt="JobShare" className="max-h-8 w-auto object-contain" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: '#e5e7eb' }}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SIDEBAR_SECTIONS.map((section, sIdx) => (
              <div key={sIdx} className={sIdx > 0 ? 'mt-5' : ''}>
                {section.title && (
                  <p
                    className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: '#8fb3de' }}
                  >
                    {section.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) =>
                    renderNavItem(item, isActivePath(item.path, location.pathname)),
                  )}
                </div>
              </div>
            ))}
          </nav>

          {/* Mobile CTA */}
          <div className="mx-3 mb-3 rounded-xl p-3" style={{ backgroundColor: '#1a4178' }}>
            <p className="text-xs font-semibold text-white">Bạn cần tư vấn?</p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: '#cddcf0' }}>
              Đội ngũ WS sẵn sàng hỗ trợ bạn 24/7.
            </p>
            <button
              type="button"
              className="mt-2 w-full rounded-lg py-2 text-xs font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#dc2626' }}
            >
              Liên hệ ngay
            </button>
          </div>

          {/* Mobile settings */}
          <div className="border-t px-3 py-3 flex-shrink-0" style={{ borderColor: '#1a4178' }}>
            <Link
              to="/company/settings"
              onClick={() => setMobileSidebarOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: isActivePath('/company/settings', location.pathname) ? '#b91c1c' : 'transparent',
                color: isActivePath('/company/settings', location.pathname) ? '#ffffff' : '#cddcf0',
              }}
            >
              <Settings
                className="h-[18px] w-[18px] flex-shrink-0"
                style={{ color: isActivePath('/company/settings', location.pathname) ? '#ffffff' : '#8fb3de' }}
              />
              <span>Cài đặt</span>
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
};

// ─── Header (same style as AdminHeader) ─────────────────────────────────────

const ICON_TINT = '#b07a8a';
const BREADCRUMB_COLOR = '#67748E';
const TITLE_COLOR = '#441C2C';

const ROUTE_MAP = {
  '/company': 'Tổng quan',
  '/company/jd': 'Tin tuyển dụng',
  '/company/nominations': 'Tiến cử',
  '/company/candidates': 'Ứng viên',
  '/company/scout': 'Tìm ứng viên',
  '/company/scout-performance': 'Tuyển dụng chuyên sâu',
  '/company/saiyo-branding': 'Trang tuyển dụng',
  '/company/san-ctv': 'Sàn cộng tác viên',
  '/company/knowledge': 'Thư viện kiến thức',
  '/company/reports': 'Báo cáo & phân tích',
  '/company/messages': 'Tin nhắn',
  '/company/billing': 'Thanh toán & tín dụng',
  '/company/settings': 'Cài đặt',
};

const CompanyHeader = ({ onOpenMobileSidebar }) => {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = () => {
    if (ROUTE_MAP[location.pathname]) return ROUTE_MAP[location.pathname];
    for (const [route, title] of Object.entries(ROUTE_MAP)) {
      if (location.pathname.startsWith(route) && route !== '/company') return title;
    }
    return ROUTE_MAP['/company'];
  };

  return (
    <header className="px-4 sm:px-6 py-1 sm:py-2 md:py-2.5 sticky top-0 z-50 bg-transparent">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {/* Left: breadcrumb + title */}
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="-ml-2 mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border bg-white lg:hidden"
            style={{ borderColor: 'rgba(0,0,0,0.08)', color: ICON_TINT }}
            aria-label="Mở menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[7px] sm:text-[10px] md:text-xs" style={{ color: BREADCRUMB_COLOR }}>
              Pages / {getPageTitle()}
            </p>
            <h1 className="text-[9px] sm:text-sm md:text-lg font-bold truncate" style={{ color: TITLE_COLOR }}>
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Right: rounded container */}
        <div
          className="flex items-center gap-0.5 sm:gap-1.5 md:gap-2 px-1.5 sm:px-2.5 md:px-3.5 py-0.5 sm:py-1 md:py-1.5 rounded-2xl border bg-white"
          style={{ borderColor: 'rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          {/* Search */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative hidden md:block flex-shrink-0 w-[280px]"
          >
            <button
              type="submit"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 rounded-lg hover:bg-transparent"
              style={{ color: ICON_TINT }}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Tìm kiếm"
              className="pl-8 pr-2 py-1 rounded-lg text-[10px] sm:text-xs md:text-sm focus:outline-none w-full bg-transparent border-0 focus:ring-0"
              style={{ color: '#1e293b' }}
            />
          </form>

          <div className="hidden md:block w-px h-6 bg-gray-200" aria-hidden />

          {/* Notification bell */}
          <button
            type="button"
            className="relative p-0.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Thông báo"
          >
            <Bell className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" style={{ color: ICON_TINT }} />
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-[3px] rounded-full text-[9px] font-bold flex items-center justify-center bg-red-500 text-white">
              3
            </span>
          </button>

          {/* Language toggle */}
          <button
            type="button"
            className="p-0.5 rounded-lg hover:bg-gray-100 transition-colors hidden sm:inline-flex items-center gap-0.5"
            aria-label="Đổi ngôn ngữ"
          >
            <Languages className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" style={{ color: ICON_TINT }} />
            <span className="hidden md:inline text-[9px] font-medium text-gray-700">VI</span>
          </button>

          {/* Info */}
          <button
            type="button"
            className="p-0.5 rounded-lg hover:bg-gray-100 transition-colors hidden md:inline-flex"
            aria-label="Thông tin"
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
                className="w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: '#e2e8f0' }}
              >
                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" style={{ color: ICON_TINT }} />
              </div>
            </button>
            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg border z-50 bg-white"
                style={{ borderColor: '#e5e7eb', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
              >
                <div className="p-4 border-b" style={{ borderColor: '#e5e7eb' }}>
                  <p className="text-sm font-medium text-gray-900">{COMPANY_USER.name}</p>
                  <p className="text-xs text-gray-500">{COMPANY_USER.role} — {COMPANY_USER.company}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/company/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Cài đặt
                  </Link>
                  <div className="border-t my-1" style={{ borderColor: '#e5e7eb' }} />
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Đăng xuất
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

// ─── Layout ─────────────────────────────────────────────────────────────────────

const CompanyLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div
      className="flex h-screen min-w-0 overflow-hidden"
      style={{ backgroundColor: '#f5f5f5' }}
    >
      <CompanySidebar
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <CompanyHeader onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CompanyLayout;
