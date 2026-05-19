/**
 * Tải CV từ URL — hỗ trợ Google Docs/Sheets/Slides (export PDF) và URL file trực tiếp.
 * Google: chỉ ổn định khi tài liệu được chia sẻ "Bất kỳ ai có đường liên kết đều là người xem";
 * nếu chỉ có tài khoản nội bộ, Google trả trang đăng nhập HTML → không lấy được PDF.
 */
import path from 'path';

export function isLikelyHttpUrl(s) {
  const t = String(s ?? '').trim();
  return /^https?:\/\//i.test(t);
}

/**
 * Chuyển link mở Docs/Sheets/Slides sang URL export PDF (không đảm bảo tải được nếu private).
 * @param {string} inputUrl
 * @returns {string|null} URL để GET (PDF), hoặc null nếu không nhận dạng được
 */
export function buildGoogleExportPdfUrl(inputUrl) {
  const u = String(inputUrl).trim();
  let m = u.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (m) return `https://docs.google.com/document/d/${m[1]}/export?format=pdf`;
  m = u.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
  if (m) return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=pdf`;
  m = u.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i);
  if (m) return `https://docs.google.com/presentation/d/${m[1]}/export/pdf`;
  m = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  return null;
}

function looksLikeHtmlBuffer(buf) {
  const s = buf.slice(0, Math.min(400, buf.length)).toString('utf8').trim().toLowerCase();
  return s.startsWith('<!doctype') || s.startsWith('<html') || s.startsWith('<head');
}

/**
 * @param {string} ref - URL gốc (Google hoặc link file)
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<{ buffer: Buffer, mimetype: string, originalname: string }>}
 */
export async function fetchCvBufferFromReference(ref, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60000;
  const t = String(ref).trim();
  if (!isLikelyHttpUrl(t)) {
    throw new Error('Không phải URL hợp lệ');
  }

  const exportUrl = buildGoogleExportPdfUrl(t) || t;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(exportUrl, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/pdf,application/octet-stream,*/*'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 80) {
      throw new Error('Phản hồi quá nhỏ, có thể bị chặn hoặc lỗi');
    }

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('text/html') || looksLikeHtmlBuffer(buf)) {
      throw new Error(
        'Nhận được HTML (thường do Google yêu cầu đăng nhập — hãy chia sẻ file “Ai có đường liên kết đều xem được” hoặc dùng ZIP)'
      );
    }

    let originalname = 'cv-from-url.pdf';
    const cd = res.headers.get('content-disposition');
    if (cd) {
      const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
      if (m) {
        try {
          originalname = decodeURIComponent(m[1].trim());
        } catch {
          originalname = m[1].trim();
        }
      }
    }
    if (!path.extname(originalname)) originalname += '.pdf';

    const mimetype = ct.includes('pdf')
      ? 'application/pdf'
      : ct.includes('word')
        ? 'application/msword'
        : ct.includes('spreadsheet') || ct.includes('excel')
          ? 'application/Y.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/octet-stream';

    return { buffer: buf, mimetype, originalname };
  } finally {
    clearTimeout(tid);
  }
}
