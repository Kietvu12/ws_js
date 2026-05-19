/**
 * Chuẩn hóa data URL ảnh cho preview/PDF CV (backend chỉ nhận data:image/…).
 */
export function normalizeAvatarDataUrlForCvPreview(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const s = raw.trim();
  if (s.startsWith('data:image/')) return s;
  const m = /^data:([^;]+);base64,(.+)$/s.exec(s);
  if (!m?.[2]) return '';
  const declared = (m[1] || '').toLowerCase();
  if (declared.startsWith('image/')) return s;
  if (declared === 'application/octet-stream' || declared.startsWith('application/')) {
    return `data:image/jpeg;base64,${m[2]}`;
  }
  return '';
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
    reader.onerror = () => reject(reader.error || new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/** ArrayBuffer → data:image/…; giữ Content-Type từ response khi có. */
export async function arrayBufferToImageDataUrl(buffer, contentType = '') {
  let mime = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (!mime.startsWith('image/')) mime = 'image/jpeg';
  const dataUrl = await blobToDataUrl(new Blob([buffer], { type: mime }));
  return normalizeAvatarDataUrlForCvPreview(dataUrl) || dataUrl;
}

/** Fetch URL ảnh (signed S3, static local) → data URL cho preview backend. */
export async function fetchUrlAsImageDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return arrayBufferToImageDataUrl(buf, res.headers.get('content-type'));
}
