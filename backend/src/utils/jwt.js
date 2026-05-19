import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiration (default: from config)
 * @returns {string} JWT token
 */
export const generateToken = (payload, expiresIn = null) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: expiresIn || config.jwt.expiresIn
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const e = new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      e.code = 'TOKEN_EXPIRED';
      throw e;
    }
    const e = new Error('Token không hợp lệ hoặc đã hết hạn.');
    e.code = 'TOKEN_INVALID';
    throw e;
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header
 * @returns {string|null} Token or null
 */
export const extractToken = (authHeader) => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

