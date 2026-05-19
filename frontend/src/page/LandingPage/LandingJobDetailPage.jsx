import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import heroBg from '../../assets/mid-section-business-people-shaking-hands-outdoors.jpg';
import JobDetailPage from '../../component/Shared/JobDetailPage';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useCandidateAuth } from '../../context/CandidateAuthContext';

function pickJobTitle(job, lang) {
  if (!job) return '';
  if (lang === 'en' && (job.titleEn || job.title_en)) return job.titleEn || job.title_en;
  if (lang === 'ja' && (job.titleJp || job.title_jp)) return job.titleJp || job.title_jp;
  return job.title || '';
}

const i18n = {
  vi: {
    backToList: 'Quay lại danh sách việc làm',
    heroLoading: 'Đang tải thông tin việc làm…',
    heroError: 'Không tìm thấy việc làm',
    relatedTitle: 'Việc làm tiêu biểu',
    relatedLoading: 'Đang tải…',
    relatedEmpty: 'Chưa có việc liên quan.',
  },
  en: {
    backToList: 'Back to job list',
    heroLoading: 'Loading job…',
    heroError: 'Job not found',
    relatedTitle: 'Featured jobs',
    relatedLoading: 'Loading…',
    relatedEmpty: 'No related jobs.',
  },
  ja: {
    backToList: '求人一覧に戻る',
    heroLoading: '読み込み中…',
    heroError: '求人が見つかりません',
    relatedTitle: 'おすすめ求人',
    relatedLoading: '読み込み中…',
    relatedEmpty: '関連求人はありません。',
  },
};

const candidateApplyBtn = {
  vi: { apply: 'Ứng tuyển', applyLogin: 'Đăng nhập để ứng tuyển' },
  en: { apply: 'Apply', applyLogin: 'Sign in to apply' },
  ja: { apply: '応募する', applyLogin: 'ログインして応募' },
};

/** Danh sách nhỏ trong sidebar (dưới các nút), một cột — không phải lưới danh sách job */
function LandingSidebarRelatedJobs({ jobsBasePath, excludeJobId, categoryId }) {
  const { language } = useLanguage();
  const t = i18n[language] || i18n.vi;
  const basePath = (jobsBasePath || '/collaborator/jobs').replace(/\/$/, '');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const qp = {
          page: 1,
          limit: 12,
          status: 1,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        };
        const cid = categoryId != null ? Number(categoryId) : NaN;
        if (!Number.isNaN(cid) && cid > 0) qp.jobCategoryId = cid;
        const res = await apiService.getApplicantJobs(qp);
        if (cancelled) return;
        if (!res.success || !res.data?.jobs) {
          setJobs([]);
          return;
        }
        let list = Array.isArray(res.data.jobs) ? res.data.jobs : [];
        const ex = Number(excludeJobId);
        list = list.filter((j) => Number(j.id) !== ex).slice(0, 5);
        setJobs(list);
      } catch {
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [excludeJobId, categoryId]);

  const salaryLine = (job) => {
    const sr = job.salaryRanges?.[0] || job.salary_ranges?.[0];
    if (!sr) return '';
    if (language === 'en' && (sr.salaryRangeEn || sr.salary_range_en)) return sr.salaryRangeEn || sr.salary_range_en;
    if (language === 'ja' && (sr.salaryRangeJp || sr.salary_range_jp)) return sr.salaryRangeJp || sr.salary_range_jp;
    return sr.salaryRange || sr.salary_range || '';
  };

  return (
    <div className="w-full min-w-0">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">{t.relatedTitle}</h3>
      {loading ? (
        <p className="text-[11px] text-gray-400">{t.relatedLoading}</p>
      ) : jobs.length === 0 ? (
        <p className="text-[11px] text-gray-400">{t.relatedEmpty}</p>
      ) : (
        <ul className="max-h-[min(320px,42vh)] space-y-2 overflow-y-auto pr-0.5 [-webkit-overflow-scrolling:touch]">
          {jobs.map((job) => {
            const id = job.id;
            const title = pickJobTitle(job, language);
            const company = job.company?.name || job.recruitingCompany?.companyName || '—';
            const salary = salaryLine(job);
            return (
              <li key={id} className="min-w-0">
                <Link
                  to={`${basePath}/${id}`}
                  className="block rounded-md border border-gray-100 bg-gray-50/80 px-2 py-1.5 transition-colors hover:border-blue-200 hover:bg-blue-50/60"
                >
                  <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-gray-900">{title}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-gray-500">{company}</span>
                  {salary ? (
                    <span className="mt-0.5 block truncate text-[10px] font-medium text-blue-700">{salary}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function LandingJobDetailPage() {
  const { jobId } = useParams();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = i18n[language] || i18n.vi;
  const { isAuthenticated } = useCandidateAuth();
  const applyT = candidateApplyBtn[language] || candidateApplyBtn.vi;

  const jobsBasePath = useMemo(() => {
    if (pathname.startsWith('/landing/collaborator')) return '/landing/collaborator/jobs';
    if (pathname.startsWith('/collaborator')) return '/collaborator/jobs';
    if (pathname.startsWith('/landing/candidate')) return '/landing/candidate/jobs';
    if (pathname.startsWith('/candidate')) return '/candidate/jobs';
    return '/collaborator/jobs';
  }, [pathname]);

  const isCandidateRoute = pathname.startsWith('/landing/candidate') || pathname.startsWith('/candidate');

  const candidatePrefix = useMemo(() => {
    if (pathname.startsWith('/landing/candidate')) return '/landing/candidate';
    return '/candidate';
  }, [pathname]);

  const onCandidateApply = useCallback(
    async ({ jobId: id }) => {
      if (!isAuthenticated) {
        navigate(`${candidatePrefix}/login`, { state: { from: pathname + search } });
        return;
      }
      navigate(`${candidatePrefix}/jobs/${id}/apply`, {
        state: { skipApplicantCvSelect: true },
      });
    },
    [candidatePrefix, isAuthenticated, navigate, pathname, search]
  );

  const backPath = jobsBasePath;

  const [heroState, setHeroState] = useState({ status: 'loading', job: null });

  useEffect(() => {
    setHeroState({ status: 'loading', job: null });
  }, [jobId]);

  const onJobLoaded = useCallback((j) => {
    if (j) setHeroState({ status: 'ok', job: j });
    else setHeroState({ status: 'error', job: null });
  }, []);

  const heroTitle =
    heroState.status === 'ok'
      ? pickJobTitle(heroState.job, language)
      : heroState.status === 'error'
        ? t.heroError
        : t.heroLoading;

  const heroCompany =
    heroState.status === 'ok' && heroState.job
      ? heroState.job.recruitingCompany?.companyName ||
        heroState.job.recruitingCompany?.company_name ||
        heroState.job.company?.name ||
        ''
      : '';

  const categoryId =
    heroState.status === 'ok' && heroState.job?.category?.id != null
      ? heroState.job.category.id
      : null;

  const sidebarBelowActionsSlot =
    heroState.status === 'ok' ? (
      <LandingSidebarRelatedJobs jobsBasePath={jobsBasePath} excludeJobId={jobId} categoryId={categoryId} />
    ) : null;

  const seoTitle = heroState.status === 'ok' && heroTitle
    ? `${heroTitle}${heroCompany ? ` | ${heroCompany}` : ''} | Workstation JobShare`
    : 'Job Detail | Workstation JobShare';

  return (
    <div className="flex h-[100dvh] flex-col bg-[#FFFAFA] text-[#1a1a1a]">
      <Helmet>
        <title>{seoTitle}</title>
        {heroState.status === 'ok' && heroTitle && (
          <meta name="description" content={`${heroTitle}${heroCompany ? ` - ${heroCompany}` : ''} - Workstation JobShare`} />
        )}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:url" content={`https://ws-jobshare.com${pathname}`} />
        <meta property="og:image" content="https://ws-jobshare.com/og-image.png" />
        <meta property="og:site_name" content="Workstation JobShare" />
      </Helmet>
      <section
        className="relative shrink-0 -mt-[68px] w-full bg-cover bg-center bg-no-repeat pt-[68px] pb-4 sm:pb-5"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#020817]/85 via-[#0f172a]/65 to-[#0f172a]/45" />
        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-3 py-4 sm:px-4 md:px-5 lg:px-6">
          <Link
            to={jobsBasePath}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 transition-colors hover:text-white sm:text-sm"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t.backToList}
          </Link>
          <h1 className="text-lg font-bold leading-snug text-white sm:text-xl md:text-2xl">{heroTitle}</h1>
          {heroCompany ? (
            <p className="mt-2 max-w-3xl text-sm text-white/85">{heroCompany}</p>
          ) : null}
        </div>
      </section>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <JobDetailPage
          getJobApi={apiService.getApplicantJobById}
          backPath={backPath}
          showEditButton={false}
          hideSaveToList
          publicLanding
          onJobLoaded={onJobLoaded}
          sidebarBelowActionsSlot={sidebarBelowActionsSlot}
          {...(isCandidateRoute
            ? {
                onApply: onCandidateApply,
                applyButtonText: isAuthenticated ? applyT.apply : applyT.applyLogin,
              }
            : {})}
        />
      </div>
    </div>
  );
}
