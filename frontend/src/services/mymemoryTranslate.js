/**
 * Dịch văn bản qua MyMemory API (https://mymemory.translated.net)
 * Giới hạn: ~5000 ký tự/ngày (anonymous), 50000 nếu có email (de=email)
 */
const MYMEMORY_BASE = 'https://api.mymemory.translated.net/get';
const MAX_CHARS_PER_REQUEST = 450; // An toàn dưới 500 bytes UTF-8

const translationCache = new Map();

function cacheKey(text, fromLang, toLang) {
  return `${fromLang}|${toLang}|${text}`;
}

/**
 * Dịch một đoạn văn bản
 * @param {string} text - Văn bản cần dịch
 * @param {string} fromLang - Mã nguồn: 'vi', 'en', 'ja'
 * @param {string} toLang - Mã đích: 'vi', 'en', 'ja'
 * @returns {Promise<string>}
 */
export async function translateText(text, fromLang, toLang) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  if (fromLang === toLang) return text;

  const key = cacheKey(trimmed, fromLang, toLang);
  if (translationCache.has(key)) return translationCache.get(key);

  try {
    const langpair = `${fromLang}|${toLang}`;
    const encoded = encodeURIComponent(trimmed.length > MAX_CHARS_PER_REQUEST ? trimmed.slice(0, MAX_CHARS_PER_REQUEST) : trimmed);
    const url = `${MYMEMORY_BASE}?q=${encoded}&langpair=${langpair}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      let result = data.responseData.translatedText;
      if (trimmed.length > MAX_CHARS_PER_REQUEST) {
        result += '...';
      }
      translationCache.set(key, result);
      return result;
    }
    return text;
  } catch (err) {
    console.warn('[MyMemory] Translate error:', err);
    return text;
  }
}

/**
 * Dịch nhiều chuỗi song song (giới hạn để tránh rate limit)
 * @param {string[]} texts
 * @param {string} fromLang
 * @param {string} toLang
 * @param {number} concurrency - Số request đồng thời
 */
export async function translateTexts(texts, fromLang, toLang, concurrency = 3) {
  const unique = [...new Set(texts.filter(Boolean))];
  const results = {};
  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    const translated = await Promise.all(
      batch.map((t) => translateText(t, fromLang, toLang))
    );
    batch.forEach((t, j) => {
      results[t] = translated[j];
    });
  }
  return results;
}
