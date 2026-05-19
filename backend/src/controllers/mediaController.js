import { isS3Key, getSignedUrlForFile, s3Enabled } from '../services/s3Service.js';

/**
 * Redirect tới signed URL S3 để hiển thị ảnh/file (img src không gửi Bearer).
 * GET /api/media/s3-view?key=...
 */
export async function redirectS3View(req, res, next) {
  try {
    const raw = String(req.query.key || req.query.path || '').trim();
    if (!raw) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số key' });
    }
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }
    const normalized = decoded.replace(/^\/+/, '').trim();
    if (!isS3Key(normalized)) {
      return res.status(400).json({ success: false, message: 'Không phải key S3 hợp lệ' });
    }
    if (!s3Enabled()) {
      return res.status(503).json({ success: false, message: 'S3 chưa cấu hình' });
    }
    const url = await getSignedUrlForFile(normalized, 'view');
    if (!url) {
      return res.status(502).json({ success: false, message: 'Không tạo được URL xem' });
    }
    return res.redirect(302, url);
  } catch (err) {
    next(err);
  }
}
