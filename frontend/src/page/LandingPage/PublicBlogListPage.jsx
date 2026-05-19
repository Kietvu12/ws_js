import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Filter, Loader2, Search } from 'lucide-react';
import apiService, { normalizePostImageUrl } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import { pickPublicPostCategoryLabel } from '../../utils/publicPostDisplay';

const blogSeoMeta = {
  vi: { title: 'Tin tức, kinh nghiệm và cập nhật từ JobShare', description: 'Cập nhật tin tức, xu hướng việc làm Nhật Bản, mẹo tuyển dụng kỹ sư và thông tin hữu ích từ Workstation JobShare.' },
  en: { title: 'News & Blog | Workstation JobShare', description: 'Latest news, Japan job market trends, engineer recruitment tips and useful information from Workstation JobShare.' },
  ja: { title: 'ニュース & ブログ | Workstation JobShare', description: '最新ニュース、日本の就職トレンド、エンジニア採用のヒント、Workstation JobShareからの有益な情報。' },
};

const HERO_BG = '/assets/businessman-standing-reading-newspaper.jpg';

function formatDate(iso, locale) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickTitle(post, lang) {
  if (lang === 'en') return post?.titleEn || post?.title || '';
  if (lang === 'ja') return post?.titleJp || post?.titleEn || post?.title || '';
  return post?.title || post?.titleEn || post?.titleJp || '';
}

function pickExcerpt(post, lang) {
  const raw =
    lang === 'en'
      ? post?.metaDescriptionEn || post?.metaDescription
      : lang === 'ja'
        ? post?.metaDescriptionJp || post?.metaDescriptionEn || post?.metaDescription
        : post?.metaDescription || post?.metaDescriptionEn;
  if (raw && String(raw).trim()) return String(raw).trim();
  const content =
    lang === 'en'
      ? post?.contentEn || post?.content
      : lang === 'ja'
        ? post?.contentJp || post?.contentEn || post?.content
        : post?.content;
  const text = stripHtml(content || '');
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

function cardImage(post) {
  const raw = post?.thumbnail || post?.image || post?.metaImage || '';
  return raw ? normalizePostImageUrl(raw) : '';
}

/** Nhóm bài theo category, danh mục không xác định để cuối */
function groupPostsByCategory(posts) {
  const map = new Map();
  for (const post of posts) {
    const rawId = post.categoryId;
    const hasId = rawId != null && String(rawId).trim() !== '';
    const key = hasId ? String(rawId) : '__uncat__';
    if (!map.has(key)) {
      map.set(key, {
        categoryId: hasId ? String(rawId) : null,
        category: post.category || null,
        posts: [],
      });
    }
    map.get(key).posts.push(post);
  }
  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    const aUncat = !a.categoryId;
    const bUncat = !b.categoryId;
    if (aUncat !== bUncat) return aUncat ? 1 : -1;
    const sa = a.category?.sortOrder ?? 9999;
    const sb = b.category?.sortOrder ?? 9999;
    if (sa !== sb) return sa - sb;
    return (a.category?.name || '').localeCompare(b.category?.name || '', undefined, { sensitivity: 'base' });
  });
  return groups;
}

function PostCard({ post, prefix, language, t, locale }) {
  const title = pickTitle(post, language);
  const excerpt = pickExcerpt(post, language);
  const img = cardImage(post);
  const dateStr = formatDate(post?.publishedAt || post?.createdAt, locale);
  const catName = pickPublicPostCategoryLabel(post, language, t.publicBlogDefaultTag);

  return (
    <li>
      <Link
        to={`${prefix}/blog/${post.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="aspect-[16/10] w-full overflow-hidden bg-neutral-100">
          {img ? (
            <img
              src={img}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-[11px] text-neutral-400">
              JobShare
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {catName ? (
              <span
                className="inline-flex max-w-full rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: post.category?.color || '#6b7280' }}
              >
                <span className="truncate">{catName}</span>
              </span>
            ) : null}
            {dateStr ? (
              <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                {dateStr}
              </div>
            ) : null}
          </div>
          <h2 className="line-clamp-2 text-base font-semibold leading-snug text-neutral-900 group-hover:text-[#ED212F]">
            {title || '—'}
          </h2>
          {excerpt ? (
            <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-600">{excerpt}</p>
          ) : null}
          <span className="mt-3 text-xs font-semibold text-[#ED212F]">
            {t.publicBlogReadMore} →
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function PublicBlogListPage() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;

  const prefix = useMemo(() => {
    if (pathname.startsWith('/landing/candidate')) return '/landing/candidate';
    if (pathname.startsWith('/candidate')) return '/candidate';
    if (pathname.startsWith('/landing/collaborator')) return '/landing/collaborator';
    return '/collaborator';
  }, [pathname]);

  const publicSurface = useMemo(() => {
    if (pathname.startsWith('/landing/candidate') || pathname.startsWith('/candidate')) return 'candidate';
    return 'collaborator';
  }, [pathname]);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 9;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryId, publicSurface]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.getPublicPostCategories();
        if (cancelled) return;
        const list = res?.data?.categories || [];
        setCategories(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const params = {
          page,
          limit,
          sortBy: 'published_at',
          sortOrder: 'DESC',
          surface: publicSurface,
        };
        if (search) params.search = search;
        if (categoryId) params.categoryId = categoryId;

        const res = await apiService.getPublicPosts(params);
        if (cancelled) return;
        const list = res?.data?.posts || [];
        const tp = res?.data?.pagination?.totalPages ?? 1;
        setPosts(Array.isArray(list) ? list : []);
        setTotalPages(Math.max(1, Number(tp) || 1));
      } catch (e) {
        if (!cancelled) {
          setPosts([]);
          setError(e?.message || 'Error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, search, categoryId, publicSurface]);

  const locale = language === 'ja' ? 'ja' : language === 'en' ? 'en' : 'vi';
  const grouped = useMemo(() => groupPostsByCategory(posts), [posts]);
  const blogSeo = blogSeoMeta[language] || blogSeoMeta.vi;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <Helmet>
        <title>{blogSeo.title}</title>
        <meta name="description" content={blogSeo.description} />
        <link rel="canonical" href={`https://ws-jobshare.com${prefix}/blog`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={blogSeo.title} />
        <meta property="og:description" content={blogSeo.description} />
        <meta property="og:url" content={`https://ws-jobshare.com${prefix}/blog`} />
      </Helmet>
      <section
        className="relative flex min-h-[280px] flex-col justify-end overflow-hidden md:min-h-[360px]"
        aria-labelledby="public-blog-hero-title"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25" />
        <div className="relative z-[1] mx-auto w-full max-w-[1200px] px-4 pb-10 pt-16 md:px-6 md:pb-12 md:pt-20">
          <h1
            id="public-blog-hero-title"
            className="text-3xl font-bold tracking-tight text-white md:text-4xl"
          >
            {t.publicBlogHeroTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/90 md:text-base">
            {t.publicBlogHeroSubtitle}
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 md:px-6">
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t.publicBlogSearchPlaceholder}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-3 text-sm text-neutral-900 outline-none ring-[#ED212F]/20 transition-shadow focus:border-[#ED212F]/40 focus:bg-white focus:ring-2"
              autoComplete="off"
            />
          </div>
          <div className="relative">
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-9 text-sm text-neutral-900 outline-none ring-[#ED212F]/20 transition-shadow focus:border-[#ED212F]/40 focus:bg-white focus:ring-2"
              aria-label={t.publicBlogFilterByContent}
            >
              <option value="">{t.publicBlogCategoryAll}</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {pickPublicPostCategoryLabel({ category: c }, language, t.publicBlogDefaultTag)}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              ▾
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-neutral-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#ED212F]" aria-hidden />
            <span className="text-sm">{t.publicBlogLoading}</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-6 text-center text-sm text-red-800">
            {error}
          </div>
        ) : posts.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-500">{t.publicBlogEmpty}</p>
        ) : (
          <>
            <div className="space-y-12">
              {grouped.map((group) => {
                const sectionTitle =
                  pickPublicPostCategoryLabel({ category: group.category }, language, group.categoryId ? `#${group.categoryId}` : t.publicBlogCategoryUncategorized);
                const headingColor = group.category?.color || '#171717';
                return (
                  <section key={group.categoryId || '__uncat__'} aria-labelledby={`blog-cat-${group.categoryId || 'uncat'}`}>
                    <div className="mb-4 flex items-center gap-3 border-b border-neutral-200 pb-3">
                      <span
                        id={`blog-cat-${group.categoryId || 'uncat'}`}
                        className="text-lg font-bold tracking-tight md:text-xl"
                        style={{ color: headingColor }}
                      >
                        {sectionTitle}
                      </span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                        {group.posts.length}
                      </span>
                    </div>
                    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {group.posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          prefix={prefix}
                          language={language}
                          t={t}
                          locale={locale}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>

            {totalPages > 1 ? (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-neutral-600">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
