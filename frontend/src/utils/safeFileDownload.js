/**
 * Tải file an toàn trên iOS Safari / WebKit:
 * - window.open sau async thường bị chặn popup
 * - revokeObjectURL quá sớm làm mất blob trước khi tải xong
 */

export function isIOSOrIPadOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

/**
 * Tải Blob (PDF/ZIP/…) về máy. Trên iOS trì hoãn revoke lâu hơn.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlobAsFile(blob, filename = 'download') {
  if (!blob || !(blob instanceof Blob)) return;
  const url = URL.createObjectURL(blob);
  const name = String(filename || 'download').replace(/[\\/:*?"<>|]/g, '_') || 'download';
  const revokeDelayMs = isIOSOrIPadOS() ? 60000 : 4000;

  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (_) {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e2) {
      window.location.assign(url);
    }
  } finally {
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {}
    }, revokeDelayMs);
  }
}

/**
 * Mở URL đã ký (S3/presigned) để tải hoặc xem file.
 * Tránh window.open sau await (bị chặn trên iOS) bằng iframe ẩn + fallback.
 */
export function openRemoteFileDownloadUrl(url) {
  if (!url || typeof url !== 'string') return;

  if (isIOSOrIPadOS()) {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        iframe.remove();
      } catch (_) {}
    }, 180000);
    return;
  }

  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win || win.closed) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
