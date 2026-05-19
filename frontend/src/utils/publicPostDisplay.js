/** Hiển thị bài public (blog) theo ngôn ngữ — dùng chung landing & danh sách */

function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function pickPublicPostTitle(post, lang) {
  if (!post) return '';
  if (lang === 'en') return post.titleEn || post.title || '';
  if (lang === 'ja') return post.titleJp || post.titleEn || post.title || '';
  return post.title || post.titleEn || post.titleJp || '';
}

function normalizeCategoryKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .replace(/[()（）]/g, '')
    .replace(/[‐‑–—]/g, '-')
    .replace(/\s*\/\s*/g, '/');
}

export function pickPublicPostCategoryLabel(post, lang, fallback = 'News') {
  if (!post) return fallback;
  const category = post.category || {};
  const rawName = String(category.name || category.nameVi || category.nameEn || category.nameJp || category.slug || '').trim();
  const key = normalizeCategoryKey(rawName);

  const dict = {
    vi: {
      thongbao: 'Thông báo',
      'thong bao': 'Thông báo',
      tin_tuc: 'Tin tức',
      'tin tuc': 'Tin tức',
      sukien: 'Sự kiện',
      'su kien': 'Sự kiện',
      campaign: 'Campaign',
      chien_dich: 'Chiến dịch',
      'chien dich': 'Chiến dịch',
    },
    en: {
      thongbao: 'Announcement',
      'thong bao': 'Announcement',
      tin_tuc: 'News',
      'tin tuc': 'News',
      sukien: 'Event',
      'su kien': 'Event',
      campaign: 'Campaign',
      chien_dich: 'Campaign',
      'chien dich': 'Campaign',
    },
    ja: {
      thongbao: 'お知らせ',
      'thong bao': 'お知らせ',
      tin_tuc: 'ニュース',
      'tin tuc': 'ニュース',
      sukien: 'イベント',
      'su kien': 'イベント',
      campaign: 'キャンペーン',
      chien_dich: 'キャンペーン',
      'chien dich': 'キャンペーン',
    },
  };

  const langDict = dict[lang] || dict.vi;
  return langDict[key] || category.name || fallback;
}

export function pickPublicPostExcerpt(post, lang) {
  if (!post) return '';
  const raw =
    lang === 'en'
      ? post.metaDescriptionEn || post.metaDescription
      : lang === 'ja'
        ? post.metaDescriptionJp || post.metaDescriptionEn || post.metaDescription
        : post.metaDescription || post.metaDescriptionEn;
  if (raw && String(raw).trim()) return String(raw).trim();
  const content =
    lang === 'en'
      ? post.contentEn || post.content
      : lang === 'ja'
        ? post.contentJp || post.contentEn || post.content
        : post.content;
  const text = stripHtml(content || '');
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

export function formatPublicPostDate(iso, lang) {
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
