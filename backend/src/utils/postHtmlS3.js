import { getSignedUrlForFile, s3Enabled } from '../services/s3Service.js';

function decodeHtmlAttrUrl(s) {
  return String(s || '').replace(/&amp;/g, '&');
}

/**
 * Lấy S3 object key cho ảnh bài viết từ URL ký sẵn, hoặc từ chuỗi key đã lưu (posts/temp/…, jsshare/posts/…).
 */
export function extractS3KeyFromPostMediaUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const t = decodeHtmlAttrUrl(url).trim();
  if (!t) return null;

  if (!/^https?:\/\//i.test(t)) {
    const nk = t.replace(/^\/+/, '');
    if (nk.startsWith('jsshare/') && nk.includes('posts/')) return nk;
    if (nk.startsWith('posts/')) return nk;
    const ji = nk.indexOf('jsshare/');
    if (ji >= 0 && nk.includes('posts/')) return nk.slice(ji);
    const pi = nk.indexOf('posts/');
    if (pi >= 0) return nk.slice(pi);
    return null;
  }

  try {
    const u = new URL(t);
    let pathname = (u.pathname || '').replace(/^\/+/, '');
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      /* giữ pathname gốc */
    }

    const host = (u.hostname || '').toLowerCase();
    if ((host.startsWith('s3.') || host.startsWith('s3-')) && host.includes('amazonaws.com')) {
      const segs = pathname.split('/').filter(Boolean);
      if (segs.length >= 2) {
        const withoutBucket = segs.slice(1).join('/');
        if (withoutBucket.includes('posts/')) return withoutBucket;
      }
    }

    if (pathname.includes('posts/')) {
      const idx = pathname.indexOf('jsshare/');
      if (idx >= 0) return pathname.slice(idx);
      if (pathname.startsWith('posts/')) return pathname;
      const p = pathname.indexOf('posts/');
      if (p >= 0) return pathname.slice(p);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function escapeHtmlAttrUrl(u) {
  return String(u).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Thay URL S3 có chữ ký trong <img src> bằng key ổn định để lưu DB (tránh hết hạn presign).
 */
export function normalizePostHtmlS3ToKeys(html) {
  if (!html || typeof html !== 'string') return html;
  return html.replace(/<img\b([^>]*?)src\s*=\s*(["'])([^"']*)\2/gi, (full, before, q, src) => {
    const raw = decodeHtmlAttrUrl(src);
    const key = extractS3KeyFromPostMediaUrl(raw);
    if (!key) return full;
    return `<img${before}src=${q}${key}${q}`;
  });
}

/**
 * Gán lại <img src> là key hoặc URL cũ → presigned URL mới (khi S3 bật).
 */
export async function resolvePostHtmlS3Keys(html) {
  if (!html || typeof html !== 'string' || !s3Enabled()) return html;
  if (!html.includes('<img') || (!html.includes('posts/') && !html.includes('amazonaws.com'))) return html;

  const regex = /<img\b([^>]*?)src\s*=\s*(["'])([^"']*)\2/gi;
  const matches = [...html.matchAll(regex)];
  if (!matches.length) return html;

  let out = html;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const full = m[0];
    const before = m[1];
    const q = m[2];
    const src = m[3];
    const raw = decodeHtmlAttrUrl(src);
    const key = extractS3KeyFromPostMediaUrl(raw);
    if (!key) continue;
    const signed = await getSignedUrlForFile(key, 'view');
    if (!signed) continue;
    const start = m.index;
    const newTag = `<img${before}src=${q}${escapeHtmlAttrUrl(signed)}${q}`;
    out = out.slice(0, start) + newTag + out.slice(start + full.length);
  }
  return out;
}

/**
 * Thumbnail / meta image: key trong DB → signed; URL S3 cũ → trích key → signed.
 */
export async function resolveS3DisplayUrl(value) {
  if (!value || typeof value !== 'string') return value;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    const key = extractS3KeyFromPostMediaUrl(value);
    if (key && s3Enabled()) {
      const u = await getSignedUrlForFile(key, 'view');
      return u || value;
    }
    return value;
  }
  if (s3Enabled()) {
    const u = await getSignedUrlForFile(value, 'view');
    return u || value;
  }
  return value;
}

export function normalizePostMediaFieldToKey(value) {
  if (!value || typeof value !== 'string') return value;
  const k = extractS3KeyFromPostMediaUrl(value.trim());
  return k || value.trim();
}

/** Gán nội dung HTML bài viết (content / EN / JP) sang presigned URL mới cho API trả về. */
export async function attachResolvedPostBodyHtml(post) {
  if (!post) return;
  const fields = ['content', 'contentEn', 'contentJp'];
  for (const f of fields) {
    const v = post.getDataValue(f);
    if (typeof v === 'string' && v.includes('<img')) {
      post.setDataValue(f, await resolvePostHtmlS3Keys(v));
    }
  }
}
