import { extractToken, verifyToken } from '../utils/jwt.js';
import { Admin } from '../models/index.js';

/**
 * Authentication middleware - Verify JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
        code: 'NO_TOKEN'
      });
    }

    const decoded = verifyToken(token);
    
    // Find admin by ID from token
    const admin = await Admin.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'rememberToken'] }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    if (!admin.isActive || admin.status !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Attach admin to request
    req.admin = admin;
    req.adminId = admin.id;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired token',
      code: error.code || 'TOKEN_INVALID'
    });
  }
};

/**
 * Authorization middleware - Check admin role
 * @param {Array} allowedRoles - Array of allowed roles (1: Super Admin, 2: Admin Backoffice, 3: Admin CA Team)
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

/**
 * Check if admin is Super Admin
 */
export const isSuperAdmin = authorize(1);

/**
 * Check if admin is Super Admin or Admin Backoffice
 */
export const isSuperAdminOrBackoffice = authorize(1, 2);

/**
 * Check if admin is any admin role (Super Admin, Backoffice, or CA Team)
 */
export const isAnyAdmin = authorize(1, 2, 3);

/**
 * Auth for OAuth connect: accept token from Authorization header or from query (?token=...).
 * Used when frontend redirects to /api/oauth/outlook/connect?token=JWT (browser cannot send header on redirect).
 */
export const authenticateOrQueryToken = async (req, res, next) => {
  try {
    let token = extractToken(req.headers.authorization);
    if (!token && req.query && typeof req.query.token === 'string') {
      token = req.query.token.trim();
    }
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
        code: 'NO_TOKEN'
      });
    }
    const decoded = verifyToken(token);
    const admin = await Admin.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'rememberToken'] }
    });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }
    if (!admin.isActive || admin.status !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }
    req.admin = admin;
    req.adminId = admin.id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired token',
      code: error.code || 'TOKEN_INVALID'
    });
  }
};

