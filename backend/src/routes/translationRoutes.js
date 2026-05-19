import express from 'express';

const router = express.Router();
const LIBRETRANSLATE_ENDPOINT = process.env.LIBRETRANSLATE_ENDPOINT || 'https://libretranslate.de/translate';
const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';

async function translateWithLibreTranslate(text, source, target, format) {
  const upstream = await fetch(LIBRETRANSLATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source, target, format }),
  });

  if (!upstream.ok) {
    throw new Error(`LibreTranslate ${upstream.status}`);
  }

  const data = await upstream.json().catch(() => ({}));
  return String(data?.translatedText ?? '');
}

async function translateWithMyMemory(text, source, target) {
  const url = `${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`${source}|${target}`)}`;
  const upstream = await fetch(url);

  if (!upstream.ok) {
    throw new Error(`MyMemory ${upstream.status}`);
  }

  const data = await upstream.json().catch(() => ({}));
  return String(data?.responseData?.translatedText ?? '');
}

router.post('/libretranslate', async (req, res) => {
  try {
    const { q, source = 'auto', target = 'en', format = 'text' } = req.body || {};
    const text = Array.isArray(q) ? q.join('\n') : String(q ?? '');

    if (!text.trim()) {
      return res.json({ success: true, translatedText: '' });
    }

    const lines = text.split('\n');
    const translatedLines = [];

    for (const line of lines) {
      if (!line.trim()) {
        translatedLines.push(line);
        continue;
      }

      try {
        const translated = await translateWithLibreTranslate(line, source, target, format);
        translatedLines.push(translated || line);
      } catch (libreErr) {
        const fallbackSource = source === 'auto' ? 'vi' : source;
        try {
          const translated = await translateWithMyMemory(line, fallbackSource, target);
          translatedLines.push(translated || line);
        } catch (fallbackErr) {
          console.warn('Translation fallback failed:', { libreErr: libreErr?.message, fallbackErr: fallbackErr?.message });
          translatedLines.push(line);
        }
      }
    }

    return res.json({
      success: true,
      translatedText: translatedLines.join('\n'),
      provider: 'libretranslate+fallback',
    });
  } catch (error) {
    console.error('LibreTranslate proxy error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Translation proxy failed',
    });
  }
});

export default router;
