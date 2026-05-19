import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import heroBg from '../../assets/mid-section-business-people-shaking-hands-outdoors.jpg';
import LandingJobBrowseSection, { emptyAppliedSession } from './LandingJobBrowseSection';
import LandingJobFilterBarSession1 from './LandingJobFilterBarSession1';

const seoMeta = {
  vi: { title: 'Danh sách việc làm kỹ sư tại Nhật Bản | Workstation JobShare', description: 'Khám phá hàng trăm cơ hội việc làm kỹ sư tại Nhật Bản. Tìm kiếm theo ngành nghề, khu vực, mức lương. Cập nhật mỗi ngày trên JobShare.', keywords: 'việc làm Nhật Bản, danh sách việc làm, kỹ sư Nhật, tìm việc, JobShare jobs, Japan engineering jobs' },
  en: { title: 'Engineering Job Listings in Japan | Workstation JobShare', description: 'Explore hundreds of engineering job opportunities in Japan. Search by industry, location, salary. Updated daily on JobShare.', keywords: 'Japan jobs listing, engineering jobs, job search Japan, JobShare, career opportunities Japan' },
  ja: { title: '日本のエンジニア求人一覧 | Workstation JobShare', description: '日本のエンジニア求人を多数掲載。業種・地域・給与で検索可能。JobShareで毎日更新中。', keywords: 'エンジニア求人一覧, 日本求人, 求人検索, JobShare, エンジニア転職' },
};

const i18n = {
  vi: {
    searchPlaceholder: 'Tìm theo tên công việc, công ty, kỹ năng...',
    dateFromLabel: 'Từ ngày',
    dateToLabel: 'Đến ngày',
    searchButton: 'Tìm kiếm',
    jpAny: 'Mọi mức',
    jpNone: 'Không yêu cầu rõ',
    jpN5: 'N5',
    jpN4: 'N4',
    jpN3: 'N3',
    jpN2: 'N2',
    jpN1: 'N1',
  },
  en: {
    searchPlaceholder: 'Search by job title, company, skills...',
    dateFromLabel: 'From date',
    dateToLabel: 'To date',
    searchButton: 'Search',
    jpAny: 'Any level',
    jpNone: 'No clear requirement',
    jpN5: 'N5',
    jpN4: 'N4',
    jpN3: 'N3',
    jpN2: 'N2',
    jpN1: 'N1',
  },
  ja: {
    searchPlaceholder: '職種・会社・スキルで検索',
    dateFromLabel: '開始日',
    dateToLabel: '終了日',
    searchButton: '検索',
    jpAny: 'すべて',
    jpNone: '明記なし',
    jpN5: 'N5',
    jpN4: 'N4',
    jpN3: 'N3',
    jpN2: 'N2',
    jpN1: 'N1',
  },
};

export default function JobList() {
  const { language } = useLanguage();
  const t = i18n[language] || i18n.vi;
  const { pathname } = useLocation();
  const jobsBasePath = useMemo(() => {
    if (pathname.startsWith('/landing/collaborator')) return '/landing/collaborator/jobs';
    if (pathname.startsWith('/collaborator')) return '/collaborator/jobs';
    if (pathname.startsWith('/landing/candidate')) return '/landing/candidate/jobs';
    if (pathname.startsWith('/candidate')) return '/candidate/jobs';
    return '/collaborator/jobs';
  }, [pathname]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedSession, setAppliedSession] = useState(emptyAppliedSession);
  const filterBarRef = useRef(null);

  const jpLabels = useMemo(
    () => ({
      any: t.jpAny,
      none: t.jpNone,
      n5: t.jpN5,
      n4: t.jpN4,
      n3: t.jpN3,
      n2: t.jpN2,
      n1: t.jpN1,
    }),
    [t]
  );

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    setDateFrom(searchParams.get('from') || '');
    setDateTo(searchParams.get('to') || '');
  }, [searchParams]);

  const applyFilters = useCallback(() => {
    const next = new URLSearchParams();
    const q = searchQuery.trim();
    if (q) next.set('q', q);
    if (dateFrom) next.set('from', dateFrom);
    if (dateTo) next.set('to', dateTo);
    setSearchParams(next);
  }, [searchQuery, dateFrom, dateTo, setSearchParams]);

  const runSearch = useCallback(() => {
    applyFilters();
    filterBarRef.current?.submit();
  }, [applyFilters]);

  const seo = seoMeta[language] || seoMeta.vi;

  return (
    <div className="flex h-[100dvh] flex-col bg-[#FFFAFA] text-[#1a1a1a]">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords} />
        <link rel="canonical" href="https://ws-jobshare.com/landing/candidate/jobs" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content="https://ws-jobshare.com/landing/candidate/jobs" />
        <meta property="og:image" content="https://ws-jobshare.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
      </Helmet>
      <section
        className="relative shrink-0 -mt-[68px] w-full bg-cover bg-center bg-no-repeat pt-[68px] pb-3 sm:pb-4"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#020817]/85 via-[#0f172a]/65 to-[#0f172a]/45" />
        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-4 lg:px-6">
          <div className="w-full min-w-0 max-w-full">
            <div className="grid min-w-0 grid-cols-1 gap-2 [color-scheme:dark] sm:grid-cols-3 sm:items-center sm:gap-2 md:gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center xl:gap-3">
              <div className="relative min-w-0 sm:col-span-3 lg:col-span-1">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white sm:left-3 sm:h-4 sm:w-4"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                  placeholder={t.searchPlaceholder}
                  className="h-9 w-full min-w-0 rounded-lg border border-white/35 bg-black/25 pl-9 pr-3 text-xs text-white shadow-sm backdrop-blur-md placeholder:text-white/45 outline-none transition-[border-color,box-shadow] focus:border-white/55 focus:ring-2 focus:ring-white/20 sm:h-9 sm:pl-10 sm:text-sm lg:h-9"
                />
              </div>

              <div className="flex min-w-0 items-center gap-2 sm:col-span-1 sm:min-w-0">
                <label
                  htmlFor="joblist-date-from"
                  className="shrink-0 text-[10px] font-semibold whitespace-nowrap text-white/90 sm:text-xs"
                >
                  {t.dateFromLabel}
                </label>
                <input
                  id="joblist-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="box-border h-9 min-w-0 flex-1 rounded-lg border border-white/35 bg-black/25 px-2 text-xs text-white shadow-sm backdrop-blur-md outline-none transition-[border-color,box-shadow] focus:border-white/55 focus:ring-2 focus:ring-white/20 sm:min-w-[7.5rem] lg:w-[9.25rem] lg:flex-none xl:w-[9.75rem]"
                />
              </div>

              <div className="flex min-w-0 items-center gap-2 sm:col-span-1 sm:min-w-0">
                <label
                  htmlFor="joblist-date-to"
                  className="shrink-0 text-[10px] font-semibold whitespace-nowrap text-white/90 sm:text-xs"
                >
                  {t.dateToLabel}
                </label>
                <input
                  id="joblist-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="box-border h-9 min-w-0 flex-1 rounded-lg border border-white/35 bg-black/25 px-2 text-xs text-white shadow-sm backdrop-blur-md outline-none transition-[border-color,box-shadow] focus:border-white/55 focus:ring-2 focus:ring-white/20 sm:min-w-[7.5rem] lg:w-[9.25rem] lg:flex-none xl:w-[9.75rem]"
                />
              </div>

              <button
                type="button"
                onClick={runSearch}
                className="inline-flex h-9 w-full min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#ED212F] px-3 text-xs font-semibold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-[#d11824] sm:col-span-1 sm:w-full sm:text-sm lg:w-auto lg:px-4"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-white sm:h-4 sm:w-4" aria-hidden />
                <span className="min-w-0 truncate">{t.searchButton}</span>
              </button>
            </div>

            <LandingJobFilterBarSession1
              ref={filterBarRef}
              variant="hero"
              searchBtnLabel={t.searchButton}
              jpLabels={jpLabels}
              onSearch={setAppliedSession}
            />
          </div>
        </div>
      </section>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <LandingJobBrowseSection
          jobsBasePath={jobsBasePath}
          listQueryKey={searchParams.toString()}
          appliedSession={appliedSession}
        />
      </div>
    </div>
  );
}
