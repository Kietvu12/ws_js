import path from 'path';

/** Ký tự không hợp lệ trên Windows — dùng cho tên file tải JD. */
export function sanitizeFilenamePart(input) {
  const s = String(input ?? '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return s || 'download';
}

/**
 * Tên file tải: {jobCode}_{title}.{ext}
 * ext lấy từ đường dẫn lưu (mặc định .pdf).
 */
export function buildJdDownloadFilename(jobCode, title, filePath) {
  const ext = path.extname(String(filePath || '')) || '.pdf';
  const codePart = sanitizeFilenamePart(jobCode);
  const titlePart = sanitizeFilenamePart(title || 'JD');
  return `${codePart}_${titlePart}${ext}`;
}
