import { verifyToken } from '../utils/jwt.js';
import { Collaborator } from '../models/index.js';

/**
 * CTV Authentication Middleware
 */
export const authenticateCTV = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);

      // Check if user is CTV
      if (decoded.role !== 'CTV') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. CTV role required.'
        });
      }

      // Find collaborator (paranoid: true will automatically exclude soft-deleted records)
      const collaborator = await Collaborator.findByPk(decoded.id);

      if (!collaborator) {
        return res.status(401).json({
          success: false,
          message: 'Collaborator not found',
          code: 'COLLABORATOR_NOT_FOUND'
        });
      }

      // Check if account is approved
      if (!collaborator.approvedAt) {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending approval'
        });
      }

      // Check if account is active
      if (collaborator.status !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Your account is inactive'
        });
      }

      // Attach collaborator to request
      req.collaborator = collaborator;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid or expired token',
        code: error.code || 'TOKEN_INVALID'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Gắn req.collaborator nếu có Bearer token CTV hợp lệ; không token hoặc lỗi → bỏ qua (public).
 * Dùng cho GET danh sách job công khai nhưng vẫn hỗ trợ lưu lịch sử khi CTV đã đăng nhập.
 */
export const optionalAuthenticateCTV = async (req, res, next) => {
  req.collaborator = undefined;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return next();
    }
    if (decoded.role !== 'CTV') {
      return next();
    }
    const collaborator = await Collaborator.findByPk(decoded.id);
    if (
      collaborator &&
      collaborator.approvedAt &&
      collaborator.status === 1
    ) {
      req.collaborator = collaborator;
    }
    next();
  } catch (error) {
    next(error);
  }
};

