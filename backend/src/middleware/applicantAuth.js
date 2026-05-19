import { verifyToken } from '../utils/jwt.js';
import { Applicant } from '../models/index.js';

export const authenticateApplicant = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded.role !== 'APPLICANT') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Applicant role required.'
      });
    }

    const applicant = await Applicant.findByPk(decoded.id);
    if (!applicant) {
      return res.status(401).json({
        success: false,
        message: 'Applicant not found'
      });
    }
    if (applicant.status !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive'
      });
    }

    req.applicant = applicant;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired token',
      code: error.code || 'TOKEN_INVALID'
    });
  }
};

