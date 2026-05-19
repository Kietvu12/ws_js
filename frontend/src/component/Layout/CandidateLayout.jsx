import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building2, LogOut, Menu, User, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import CandidateLandingChatbot from '../LandingPage/CandidateLandingChatbot';
import LandingPersonaSwitcher from './LandingPersonaSwitcher';

const PERSONA_OPTIONS = [
  {
    id: 'collaborator',
    title: { vi: 'Cộng tác viên', en: 'Collaborator', ja: 'コラボレーター' },
    subtitle: { vi: 'Giới thiệu ứng viên & nhận hoa hồng', en: 'Refer candidates and earn commission', ja: '候補者を紹介して報酬を獲得' },
    href: '/landing/collaborator',
    icon: Building2,
    activeColor: '#dc2626',
  },
  {
    id: 'candidate',
    title: { vi: 'Ứng viên', en: 'Candidate', ja: '応募者' },
    subtitle: { vi: 'Tìm việc tại Nhật Bản', en: 'Find jobs in Japan', ja: '日本で仕事を探す', },
    href: '/landing/candidate',
    icon: User,
    activeColor: '#2563eb',
  },
  {
    id: 'company',
    title: { vi: 'Doanh nghiệp', en: 'Company', ja: '企業' },
    subtitle: { vi: 'Đăng tuyển & tìm ứng viên', en: 'Post jobs and find candidates', ja: '求人掲載と候補者探し', },
    href: '/landing/company',
    icon: Building2,
    activeColor: '#111827',
  },
];

const I18N = {
  vi: {
    navHome: 'Trang chủ',
    navJobs: 'Danh sách việc làm',
    navProfile: 'Hồ sơ của tôi',
    navAbout: 'Về chúng tôi',
    navPartners: 'Đối tác',
    navFaq: 'Hỏi và đáp',
    navBlog: 'Blog',
    login: 'Đăng nhập',
    register: 'Đăng ký',
    footerRights: 'Đã đăng ký bản quyền.',
    logout: 'Đăng xuất',
    openMenu: 'Mở menu',
    closeMenu: 'Đóng menu',
  },
  en: {
    navHome: 'Home',
    navJobs: 'Job Listings',
    navProfile: 'My Profile',
    navAbout: 'About Us',
    navPartners: 'Partners',
    navFaq: 'Q&A',
    navBlog: 'Blog',
    login: 'Log in',
    register: 'Sign up',
    footerRights: 'All rights reserved.',
    logout: 'Log out',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
  ja: {
    navHome: 'ホーム',
    navJobs: '求人一覧',
    navProfile: 'マイプロフィール',
    navAbout: '私たちについて',
    navPartners: 'パートナー',
    navFaq: 'Q&A',
    navBlog: 'ブログ',
    login: 'ログイン',
    register: '登録',
    footerRights: 'All rights reserved.',
    logout: 'ログアウト',
    openMenu: 'メニューを開く',
    closeMenu: 'メニューを閉じる',
  },
};

const LANGUAGE_OPTIONS = ['vi', 'en', 'ja'];

function buildCandidateNavLinks(prefix, t) {
  return [
    { to: prefix, label: t.navHome },
    { to: `${prefix}/jobs`, label: t.navJobs },
    { to: `${prefix}/profile`, label: t.navProfile },
    { href: '#', label: t.navAbout },
    { href: '#', label: t.navPartners },
    { href: '#', label: t.navFaq },
    { to: `${prefix}/blog`, label: t.navBlog },
  ];
}

function applicantInitials(applicant) {
  const raw = (applicant?.name || applicant?.email || '?').trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return raw.slice(0, 2).toUpperCase() || '?';
}

const CandidateLayout = () => {
  const { pathname } = useLocation();
  const prefix = pathname.startsWith('/landing/candidate') ? '/landing/candidate' : '/candidate';
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const t = I18N[language] || I18N.vi;
  const navLinks = buildCandidateNavLinks(prefix, t);
  const { applicant, isAuthenticated, logout } = useCandidateAuth();
  const [activePersona, setActivePersona] = useState('candidate');

  const isAuthScreen = /\/(login|register)$/.test(pathname);
  const isJobApplyPage = /\/jobs\/[^/]+\/apply\/?$/.test(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const onDoc = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) setMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileMenuOpen]);

  if (isAuthScreen) {
    return <Outlet />;
  }

  const navLinkClass = 'text-[11px] font-semibold text-neutral-900 transition-colors hover:text-neutral-600';
  const langBtnActive = 'bg-neutral-900 text-white';
  const langBtnIdle = 'text-neutral-700 hover:bg-neutral-200/80';
  const switchPersona = (id) => {
    setActivePersona(id);
    const target = PERSONA_OPTIONS.find((item) => item.id === id);
    if (target?.href) navigate(target.href);
  };
  const personaText = {
    collaborator: PERSONA_OPTIONS[0].title[language] || PERSONA_OPTIONS[0].title.vi,
    candidate: PERSONA_OPTIONS[1].title[language] || PERSONA_OPTIONS[1].title.vi,
    company: PERSONA_OPTIONS[2].title[language] || PERSONA_OPTIONS[2].title.vi,
  };
  const personaSubText = {
    collaborator: PERSONA_OPTIONS[0].subtitle[language] || PERSONA_OPTIONS[0].subtitle.vi,
    candidate: PERSONA_OPTIONS[1].subtitle[language] || PERSONA_OPTIONS[1].subtitle.vi,
    company: PERSONA_OPTIONS[2].subtitle[language] || PERSONA_OPTIONS[2].subtitle.vi,
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1a1a1a]">
      <header className="sticky top-0 z-[60] border-t border-b border-neutral-200 bg-white shadow-sm -mt-px">
        <div className="mx-auto w-full max-w-[1200px] px-2.5 sm:px-3 md:px-4 md:pt-2">
          <div className="overflow-hidden rounded-t-xl border border-neutral-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
            <div className="px-3 py-2 text-center text-[10px] font-medium text-neutral-800 sm:text-[11px]">
              {language === 'vi'
                ? 'Chào mừng bạn đến với Workstation JobShare, bạn muốn tham gia với tư cách nào?'
                : language === 'en'
                  ? 'Welcome to Workstation JobShare, how would you like to join?'
                  : 'JobShareワークステーションへようこそ。どの立場で参加しますか？'}
            </div>
            <div className="grid grid-cols-3 border-t border-neutral-200 bg-white">
              <button type="button" onClick={() => switchPersona('collaborator')} className="flex min-h-[54px] flex-col items-center justify-center gap-1 px-2 py-1.5 text-center transition-colors sm:min-h-[62px] sm:px-3 hover:bg-neutral-50">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-700" />
                <div className="text-[10px] sm:text-[11px] font-semibold text-neutral-900">{personaText.collaborator}</div>
                <div className="hidden sm:block text-[9px] text-neutral-500">{personaSubText.collaborator}</div>
              </button>
              <button type="button" onClick={() => switchPersona('candidate')} className="flex min-h-[54px] flex-col items-center justify-center gap-1 px-2 py-1.5 text-center transition-colors sm:min-h-[62px] sm:px-3 bg-red-50" style={{ boxShadow: 'inset 0 2px 0 #dc2626' }}>
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                <div className="text-[10px] sm:text-[11px] font-semibold text-red-700">{personaText.candidate}</div>
                <div className="hidden sm:block text-[9px] text-neutral-500">{personaSubText.candidate}</div>
              </button>
              <button type="button" onClick={() => switchPersona('company')} className="flex min-h-[54px] flex-col items-center justify-center gap-1 px-2 py-1.5 text-center transition-colors sm:min-h-[62px] sm:px-3 hover:bg-neutral-50">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-700" />
                <div className="text-[10px] sm:text-[11px] font-semibold text-neutral-900">{personaText.company}</div>
                <div className="hidden sm:block text-[9px] text-neutral-500">{personaSubText.company}</div>
              </button>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 bg-white px-4 py-3 md:px-6">
            <Link to={prefix} className="flex-shrink-0">
              <img src="/logo.png" alt="Job Share" className="h-6 w-auto md:h-7" />
            </Link>

            <nav className="hidden items-center gap-6 lg:flex">
              {navLinks.map((item) =>
                item.to != null ? (
                  <Link key={item.label} to={item.to} className={navLinkClass}>{item.label}</Link>
                ) : (
                  <a key={item.label} href={item.href} className={navLinkClass}>{item.label}</a>
                ),
              )}
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden items-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 md:inline-flex">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isActive = language === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => changeLanguage(lang)}
                      className={`h-7 min-w-9 rounded-md px-2 text-[10px] font-bold uppercase transition-colors ${isActive ? langBtnActive : langBtnIdle}`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>

              {isAuthenticated && applicant ? (
                <div className="relative hidden sm:block" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-neutral-300 bg-neutral-100 text-xs font-bold text-neutral-900 shadow-sm outline-none transition-colors hover:bg-neutral-200"
                    aria-expanded={menuOpen}
                    aria-haspopup="true"
                    title={t.openMenu}
                  >
                    {applicantInitials(applicant)}
                  </button>
                  {menuOpen ? (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1.5 text-slate-800 shadow-xl" role="menu">
                      <div className="border-b border-slate-100 px-3 py-2">
                        <p className="truncate text-xs font-semibold text-slate-900">{applicant.name}</p>
                        <p className="truncate text-[11px] text-slate-500">{applicant.email}</p>
                      </div>
                      <Link
                        to={`${prefix}/profile`}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <User className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                        {t.navProfile}
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setMenuOpen(false); logout(); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-3.5 w-3.5" aria-hidden />
                        {t.logout}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <Link
                    to={`${prefix}/login`}
                    className="hidden h-8 min-w-[96px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 text-[11px] font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 sm:inline-flex"
                  >
                    {t.login}
                  </Link>
                  <Link
                    to={`${prefix}/register`}
                    className="hidden h-8 min-w-[96px] items-center justify-center rounded-lg bg-neutral-900 px-3 text-[11px] font-semibold !text-white transition-colors hover:bg-neutral-800 sm:inline-flex"
                  >
                    {t.register}
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 transition-colors hover:bg-neutral-100 lg:hidden"
                aria-label={mobileMenuOpen ? t.closeMenu : t.openMenu}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <aside
            ref={mobileMenuRef}
            className="absolute right-0 top-0 flex h-full w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <Link to={prefix} onClick={() => setMobileMenuOpen(false)}>
                <img src="/logo.png" alt="Job Share" className="h-6 w-auto" />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100"
                aria-label={t.closeMenu}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isAuthenticated && applicant && (
              <div className="border-b border-neutral-200 px-5 py-3">
                <p className="truncate text-sm font-semibold text-neutral-900">{applicant.name}</p>
                <p className="truncate text-xs text-neutral-500">{applicant.email}</p>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto px-5 py-2">
              {navLinks.map((item) =>
                item.to != null ? (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block border-b border-neutral-100 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:text-[#ED212F]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block border-b border-neutral-100 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:text-[#ED212F]"
                  >
                    {item.label}
                  </a>
                ),
              )}
            </nav>

            <div className="border-t border-neutral-200 px-5 py-4 space-y-3">
              <div className="flex items-center justify-end">
                <div className="flex items-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
                  {LANGUAGE_OPTIONS.map((lang) => {
                    const isActive = language === lang;
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => changeLanguage(lang)}
                        className={`h-7 min-w-8 rounded-md px-1.5 text-[10px] font-bold uppercase transition-colors ${isActive ? langBtnActive : langBtnIdle}`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isAuthenticated && applicant ? (
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  {t.logout}
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to={`${prefix}/login`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-10 flex-1 items-center justify-center rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
                  >
                    {t.login}
                  </Link>
                  <Link
                    to={`${prefix}/register`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-10 flex-1 items-center justify-center rounded-lg bg-neutral-900 text-sm font-semibold !text-white transition-colors hover:bg-neutral-800 hover:!text-white"
                  >
                    {t.register}
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <main
        className={
          isJobApplyPage
            ? 'flex-1 mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 md:py-8 [&>*:first-child]:mt-0'
            : 'flex-1 [&>*:first-child]:mt-0'
        }
      >
        <Outlet />
      </main>

      <CandidateLandingChatbot />
    </div>
  );
};

export default CandidateLayout;
