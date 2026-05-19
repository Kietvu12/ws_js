import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useParams } from 'react-router-dom';
import apiService, { normalizePostImageUrl } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useCandidateAuth } from '../context/CandidateAuthContext';
import { translations } from '../translations/translations';
import BlogEventRegistrationSidebar from '../component/Shared/BlogEventRegistrationSidebar';

const LOAD_ERROR_KEY = '__blog_load_error__';

function formatDate(iso, lang) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const locale = lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-US' : 'vi-VN';
  try {
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function getPostImage(post) {
  const raw = post?.thumbnail || post?.image || '';
  return raw ? normalizePostImageUrl(raw) : '';
}

function pickPostTitle(post, lang) {
  if (!post) return '';
  if (lang === 'en') return post.titleEn || post.title || '';
  if (lang === 'ja') return post.titleJp || post.titleEn || post.title || '';
  return post.title || post.titleEn || post.titleJp || '';
}

function pickPostContentHtml(post, lang) {
  if (!post) return '';
  if (lang === 'en') return post.contentEn || post.content || '';
  if (lang === 'ja') return post.contentJp || post.contentEn || post.content || '';
  return post.content || post.contentEn || post.contentJp || '';
}

export default function BlogDetailPage() {
  const { postId } = useParams();
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const { applicant } = useCandidateAuth();
  const t = translations[language] || translations.vi;
  const [post, setPost] = useState(null);
  const [linkedEvent, setLinkedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isStandaloneBlog = /^\/blog\/[^/]+$/.test(pathname);
  const backLink = useMemo(() => {
    const tr = translations[language] || translations.vi;
    const listLabel = tr.publicBlogBackToList;
    if (pathname.startsWith('/landing/candidate/') || pathname.startsWith('/candidate/')) {
      const p = pathname.startsWith('/landing/candidate') ? '/landing/candidate' : '/candidate';
      return { to: `${p}/blog`, label: listLabel };
    }
    if (pathname.startsWith('/landing/collaborator/') || pathname.startsWith('/collaborator/')) {
      const p = pathname.startsWith('/landing/collaborator') ? '/landing/collaborator' : '/collaborator';
      return { to: `${p}/blog`, label: listLabel };
    }
    return { to: '/login', label: tr.publicBlogBackToLogin };
  }, [pathname, language]);

  const blogSurface = useMemo(() => {
    if (pathname.startsWith('/landing/candidate') || pathname.startsWith('/candidate')) return 'candidate';
    return 'collaborator';
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiService.getPublicPostById(postId, { surface: blogSurface });
        const item = res?.data?.post || res?.data || null;
        const ev = res?.data?.linkedEvent ?? null;
        if (!cancelled) {
          setPost(item);
          setLinkedEvent(ev && ev.id ? ev : null);
        }
      } catch (e) {
        if (!cancelled) {
          setPost(null);
          setLinkedEvent(null);
          setError(e?.message ? String(e.message) : LOAD_ERROR_KEY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [postId, blogSurface]);

  const title = useMemo(() => {
    const tr = translations[language] || translations.vi;
    const raw = pickPostTitle(post, language);
    return raw.trim() ? raw : tr.publicBlogDetailTitleFallback;
  }, [post, language]);

  const tag = useMemo(() => {
    const tr = translations[language] || translations.vi;
    if (typeof post?.tag === 'string') {
      const first = post.tag.split(',').map((x) => x.trim()).filter(Boolean)[0];
      if (first) return first;
    }
    if (post?.category?.name) return post.category.name;
    return tr.publicBlogDefaultTag;
  }, [post, language]);

  const contentHtml = useMemo(() => pickPostContentHtml(post, language), [post, language]);

  const coverImage = useMemo(() => getPostImage(post), [post]);

  const errorDisplay = useMemo(() => {
    const tr = translations[language] || translations.vi;
    if (!error) return '';
    if (error === LOAD_ERROR_KEY) return tr.publicBlogDetailLoadError;
    return error;
  }, [error, language]);

  const eventPrefillName = applicant?.name?.trim() || '';
  const eventPrefillEmail = applicant?.email?.trim() || '';

  const blogSeoTitle = title ? `${title} | Workstation JobShare` : 'Blog | Workstation JobShare';
  const blogSeoDesc = contentHtml ? contentHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) : '';

  return (
    <div className="flex flex-1 flex-col">
      <Helmet>
        <title>{blogSeoTitle}</title>
        {blogSeoDesc && <meta name="description" content={blogSeoDesc} />}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={blogSeoTitle} />
        {blogSeoDesc && <meta property="og:description" content={blogSeoDesc} />}
        <meta property="og:url" content={`https://ws-jobshare.com${pathname}`} />
        {coverImage && <meta property="og:image" content={coverImage} />}
        <meta property="og:site_name" content="Workstation JobShare" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={blogSeoTitle} />
        {coverImage && <meta name="twitter:image" content={coverImage} />}
        {post && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": title,
            "url": `https://ws-jobshare.com${pathname}`,
            ...(coverImage ? { "image": coverImage } : {}),
            ...(post.publishedAt ? { "datePublished": post.publishedAt } : {}),
            "publisher": { "@type": "Organization", "name": "Workstation JobShare", "url": "https://ws-jobshare.com" }
          })}</script>
        )}
      </Helmet>
      <main
        className={`mx-auto flex w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-5 sm:py-10 ${
          isStandaloneBlog ? 'pt-[120px] sm:pt-[130px]' : 'pt-4 sm:pt-8'
        }`}
      >
        <section className="w-full min-w-0">
          <style>{`
            .blog-content h1, .blog-content h2, .blog-content h3, .blog-content h4, .blog-content h5, .blog-content h6 {
              color: #111827;
              font-weight: 700;
              line-height: 1.3;
              margin: 1.1em 0 0.55em;
            }
            .blog-content h1 { font-size: 2rem; }
            .blog-content h2 { font-size: 1.6rem; }
            .blog-content h3 { font-size: 1.35rem; }
            .blog-content p { margin: 0.85em 0; line-height: 1.75; color: #1f2937; }
            .blog-content ul, .blog-content ol { margin: 0.9em 0; padding-left: 1.5em; }
            .blog-content ul { list-style: disc; }
            .blog-content ol { list-style: decimal; }
            .blog-content li { margin: 0.35em 0; }
            .blog-content a { color: #2563eb; text-decoration: underline; }
            .blog-content blockquote {
              margin: 1em 0;
              padding: 0.75em 1em;
              border-left: 4px solid #e5e7eb;
              background: #f9fafb;
              color: #374151;
            }
            .blog-content img, .blog-content video {
              max-width: 100%;
              height: auto;
              border-radius: 0.75rem;
              margin: 0.9em 0;
            }
          `}</style>

          <div className="mb-5">
            <Link
              to={backLink.to}
              className="inline-flex items-center text-sm font-semibold !text-[#ED212F] hover:underline"
            >
              {backLink.label}
            </Link>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-[#6B7280]">
              {t.publicBlogDetailLoading}
            </div>
          ) : error || !post ? (
            <div className="rounded-2xl border border-[#F1C4C9] bg-[#FFF5F5] p-8 text-[#B42318]">
              {error ? errorDisplay : t.publicBlogDetailNotFound}
            </div>
          ) : (
            <article className="min-w-0 rounded-2xl bg-white p-5 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex h-[28px] items-center justify-center rounded-full bg-[#1848a0] px-3 text-[12px] font-bold text-white">
                  {tag}
                </span>
                <span className="text-[15px] font-medium text-[#4b5563]">
                  {formatDate(post?.publishedAt || post?.createdAt, language)}
                </span>
              </div>

              <h1 className="text-[clamp(1.5rem,4.2vw,2.2rem)] font-semibold leading-tight text-[#1f2937]">
                {title}
              </h1>

              {coverImage ? (
                <div className="mt-6">
                  <img src={coverImage} alt={title} className="h-auto w-full rounded-xl object-cover" />
                </div>
              ) : null}

              {linkedEvent?.id ? (
                <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
                  <div
                    className="blog-content min-w-0 flex-1 max-w-none text-[#1f2937]"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                  />
                  <div className="w-full shrink-0 lg:w-[380px]">
                    <BlogEventRegistrationSidebar
                      event={linkedEvent}
                      initialName={eventPrefillName}
                      initialEmail={eventPrefillEmail}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="blog-content mt-7 max-w-none text-[#1f2937]"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
              )}
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
