import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Clock, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ja, vi as viFns } from 'date-fns/locale';
import apiService, { getAssetBaseUrl } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const dateLocales = { vi: viFns, en: enUS, ja };

function companyLogoUrl(logo) {
  if (!logo || typeof logo !== 'string') return null;
  const p = logo.trim();
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  const base = getAssetBaseUrl();
  const path = p.startsWith('/') ? p : `/${p}`;
  return `${base}${path}`;
}

/** Tên doanh nghiệp tuyển dụng trong JD (job_recruiting_companies), không phải công ty nguồn (companies). */
function jobRecruitingCompanyDisplayName(job, lang) {
  const rc = job.recruitingCompany;
  if (rc) {
    if (lang === 'en') {
      const n = rc.companyNameEn || rc.company_name_en;
      if (n) return n;
    }
    if (lang === 'ja') {
      const n = rc.companyNameJp || rc.company_name_jp;
      if (n) return n;
    }
    const n = rc.companyName || rc.company_name;
    if (n) return n;
  }
  return job.company?.name || job.companyName || '—';
}

function recruitmentLabel(type, lang) {
  const map = {
    vi: { 1: 'Toàn thời gian', 2: 'Chính thức (haken)', 3: 'Phái cử', 4: 'Bán thời gian', 5: 'Uỷ thác' },
    en: { 1: 'Full-time', 2: 'Permanent (haken)', 3: 'Seconded', 4: 'Part-time', 5: 'Contract' },
    ja: { 1: '正社員', 2: '正社員（派遣）', 3: '派遣', 4: 'パート', 5: '業務委託' },
  };
  const L = map[lang] || map.vi;
  const n = Number(type);
  return L[n] || L[1];
}

function jobMatchesJapanese(job, code) {
  if (!code || code === 'any') return true;
  const texts = [
    ...(job.requirements || []).flatMap((r) => [r.content, r.contentEn, r.contentJp]),
    ...(job.jobValues || []).map((jv) => jv?.valueRef?.valuename),
    job.title,
    job.titleEn,
    job.titleJp,
  ]
    .filter(Boolean)
    .join(' ');
  const lower = texts.toLowerCase();
  const c = code.toLowerCase();
  if (c === 'none') {
    return !/(n\s*[1-5]|jlpt|日本語能力|tiếng nhật|trình độ tiếng)/i.test(lower);
  }
  if (c === 'any') return true;
  const n = c.replace(/^n/i, '');
  if (/^[1-5]$/.test(n)) {
    const re = new RegExp(`n\\s*${n}\\b|jlpt\\s*n?\\s*${n}\\b|level\\s*n?\\s*${n}\\b`, 'i');
    return re.test(lower) || lower.includes(`n${n}`);
  }
  return lower.includes(c);
}

export function emptyAppliedSession() {
  return {
    filters: {
      locations: [],
      fieldIds: [],
      jobTypeIds: [],
      sectorNames: [],
    },
    japaneseLevel: '',
  };
}

const i18n = {
  vi: {
    views: 'lượt xem',
    posted: 'Đăng',
    empty: 'Không có việc làm phù hợp.',
    loadError: 'Không tải được danh sách. Thử lại sau.',
    loading: 'Đang tải…',
  },
  en: {
    views: 'views',
    posted: 'Posted',
    empty: 'No matching jobs.',
    loadError: 'Could not load jobs. Try again later.',
    loading: 'Loading…',
  },
  ja: {
    views: '回表示',
    posted: '掲載',
    empty: '該当する求人がありません。',
    loadError: '一覧を読み込めませんでした。',
    loading: '読み込み中…',
  },
};

export default function LandingJobBrowseSection({ jobsBasePath, listQueryKey, appliedSession }) {
  const { language } = useLanguage();
  const t = i18n[language] || i18n.vi;
  const navigate = useNavigate();
  const basePath = (jobsBasePath || '/collaborator/jobs').replace(/\/$/, '');

  const isCandidateJobsList = useMemo(
    () => /\/candidate\/jobs$/.test(basePath) || basePath.includes('/landing/candidate/jobs'),
    [basePath]
  );

  const candidatePrefix = useMemo(
    () => (basePath.includes('/landing/candidate') ? '/landing/candidate' : '/candidate'),
    [basePath]
  );


  const [rawJobs, setRawJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pageCursorsRef = useRef({ 1: null });
  const pageSize = 18;

  const [favorites, setFavorites] = useState(() => new Set());

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadJobs = useCallback(async (targetPage) => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams(listQueryKey || '');
      const q = params.get('q') || '';
      const from = params.get('from') || '';
      const to = params.get('to') || '';
      const qp = {
        limit: pageSize,
        status: 1,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };
      const cursor = pageCursorsRef.current[targetPage] ?? null;
      if (cursor) qp.cursor = cursor;
      if (q.trim()) qp.search = q.trim();
      if (from) qp.deadlineFrom = from;
      if (to) qp.deadlineTo = to;

      const { filters: f, japaneseLevel: jl } = appliedSession;
      if (f.jobTypeIds?.length > 0) {
        const id = parseInt(f.jobTypeIds[0], 10);
        if (!Number.isNaN(id)) qp.jobCategoryId = id;
      } else if (f.fieldIds?.length > 0) {
        const id = parseInt(f.fieldIds[0], 10);
        if (!Number.isNaN(id)) qp.jobCategoryId = id;
      }
      if (f.sectorNames?.length > 0) {
        qp.sectorNames = f.sectorNames.join(',');
      }
      if (f.locations?.length > 0) {
        const first = f.locations[0];
        qp.location = typeof first === 'string' ? first : first.location;
      }

      const res = await apiService.getApplicantJobs(qp);
      if (res.success && res.data?.jobs) {
        let jobs = Array.isArray(res.data.jobs) ? res.data.jobs : [];
        if (jl) {
          jobs = jobs.filter((job) => jobMatchesJapanese(job, jl));
        }
        setRawJobs(jobs);
        const nextCursor = res.data?.pagination?.nextCursor ?? null;
        setHasMore(Boolean(res.data?.pagination?.hasMore));
        if (nextCursor) {
          pageCursorsRef.current[targetPage + 1] = nextCursor;
        }
      } else {
        setRawJobs([]);
        setHasMore(false);
      }
    } catch (e) {
      console.error(e);
      setFetchError(true);
      setRawJobs([]);
    } finally {
      setLoading(false);
    }
  }, [listQueryKey, appliedSession]);

  useEffect(() => {
    setPage(1);
    pageCursorsRef.current = { 1: null };
    setHasMore(false);
  }, [listQueryKey, appliedSession]);

  useEffect(() => {
    loadJobs(page);
  }, [loadJobs, page]);

  const pagedJobs = rawJobs;
  const salaryLine = (job) => {
    const sr = job.salaryRanges?.[0] || job.salary_ranges?.[0];
    if (!sr) return '—';
    const baseValue =
      (language === 'en' && (sr.salaryRangeEn || sr.salary_range_en))
        ? sr.salaryRangeEn || sr.salary_range_en
        : language === 'ja' && (sr.salaryRangeJp || sr.salary_range_jp)
          ? sr.salaryRangeJp || sr.salary_range_jp
          : sr.salaryRange || sr.salary_range || '—';
    const text = String(baseValue || '').trim();
    if (!text || text === '—') return '—';
    return /JPY\b/i.test(text) ? text : `${text} JPY`;
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white px-2 pb-2 pt-10 sm:px-3 sm:pb-2 md:px-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1200px] flex-col">
        <div className="landing-jobs-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1 pb-4 pt-4 [-webkit-overflow-scrolling:touch] sm:px-2">
          {loading && <p className="py-8 text-center text-xs text-neutral-500">{t.loading}</p>}
          {!loading && fetchError && <p className="py-8 text-center text-xs text-red-600">{t.loadError}</p>}
          {!loading && !fetchError && rawJobs.length === 0 && (
            <p className="py-8 text-center text-xs text-neutral-500">{t.empty}</p>
          )}
          {!loading && !fetchError && rawJobs.length > 0 && (
            <>
            <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-3">
              {pagedJobs.map((job) => {
                const id = job.id;
                const logo = companyLogoUrl(
                  job.recruitingCompany?.logo ?? job.company?.logo
                );
                const posted = job.createdAt || job.created_at;
                const dist =
                  posted &&
                  formatDistanceToNow(new Date(posted), {
                    addSuffix: true,
                    locale: dateLocales[language] || viFns,
                  });
                const rt = job.recruitmentType ?? job.recruitment_type;
                const title =
                  language === 'en' && job.titleEn
                    ? job.titleEn
                    : language === 'ja' && job.titleJp
                      ? job.titleJp
                      : job.title;
                const vc = job.viewsCount ?? job.views_count;
                const metaBits = [];
                if (vc != null) metaBits.push(`${vc} ${t.views}`);
                if (dist) metaBits.push(`${t.posted} ${dist}`);
                const metaLine = metaBits.length > 0 ? metaBits.join(' · ') : '—';

                return (
                  <li key={id} className="relative min-w-0">
                    <article className="group relative flex h-full flex-col rounded-lg border border-neutral-200/90 bg-white p-2 shadow-sm transition-all duration-200 ease-out hover:z-20 hover:-translate-y-1 hover:border-[#ED212F] hover:bg-[#ED212F] hover:shadow-lg">
                      <div className="mb-1.5 flex items-start gap-1.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-100 transition-colors group-hover:bg-white/15">
                          {logo ? (
                            <img src={logo} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <Building2
                              className="h-3.5 w-3.5 text-neutral-400 transition-colors group-hover:text-white/90"
                              aria-hidden
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`${basePath}/${id}`}
                            className="line-clamp-2 text-[11px] font-semibold leading-snug text-neutral-900 transition-colors group-hover:!text-white"
                          >
                            {title}
                          </Link>
                          <p className="mt-0.5 truncate text-[10px] text-neutral-500 transition-colors group-hover:text-white/85">
                            {jobRecruitingCompanyDisplayName(job, language)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(id)}
                          className="-mr-0.5 -mt-0.5 shrink-0 rounded p-0.5 text-neutral-400 transition-colors hover:bg-white/20 hover:text-white group-hover:text-white/90"
                          aria-label="Favorite"
                        >
                          <Heart
                            className={`h-3.5 w-3.5 transition-colors ${
                              favorites.has(id)
                                ? 'fill-[#ED212F] text-[#ED212F] group-hover:fill-white group-hover:text-white'
                                : 'group-hover:text-white'
                            }`}
                            aria-hidden
                          />
                        </button>
                      </div>
                      <p className="mb-1 truncate text-[9px] text-neutral-500 transition-colors group-hover:text-white/80">
                        {recruitmentLabel(rt, language)}
                      </p>
                      <div className="mt-auto space-y-0.5 border-t border-neutral-100 pt-1.5 transition-colors group-hover:border-white/25">
                        <p className="truncate text-[11px] font-semibold text-neutral-900 transition-colors group-hover:text-white">
                          {salaryLine(job)}
                        </p>
                        <p className="flex items-center gap-0.5 text-[9px] text-neutral-400 transition-colors group-hover:text-white/75">
                          <Clock className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="min-w-0 truncate">{metaLine}</span>
                        </p>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>

            {hasMore || page > 1 ? (
              <div className="mt-5 flex items-center justify-center gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 transition-colors hover:border-[#ED212F] hover:text-[#ED212F] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Prev</span>
                </button>
                <span className="text-xs text-neutral-500">
                  Trang {page}{hasMore ? ' · còn nữa' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 transition-colors hover:border-[#ED212F] hover:text-[#ED212F] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            </>
          )}
        </div>
      </div>
      <style>{`
        .landing-jobs-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 #ffffff; }
        .landing-jobs-scroll::-webkit-scrollbar { width: 6px; }
        .landing-jobs-scroll::-webkit-scrollbar-track { background: #ffffff; border-radius: 3px; }
        .landing-jobs-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>
    </section>
  );
}
