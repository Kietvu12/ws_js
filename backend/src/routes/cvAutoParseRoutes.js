import express from 'express';
import { authenticate, isSuperAdminOrBackoffice } from '../middleware/auth.js';
import { cvAutoParseService } from '../services/cvAutoParseService.js';

const router = express.Router();

/**
 * POST /api/admin/cv-auto-parse/start
 * Start background worker (single-process).
 */
router.post('/start', authenticate, isSuperAdminOrBackoffice, async (req, res, next) => {
  try {
    const result = cvAutoParseService.startAutoParse({ adminId: req.admin?.id || null });
    if (!result.ok) {
      return res.status(409).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      message: 'Auto parse CV started',
      data: { running: true }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/cv-auto-parse/stop
 * Stop worker after current CV finishes, then return stats.
 */
router.post('/stop', authenticate, isSuperAdminOrBackoffice, async (req, res, next) => {
  try {
    const result = cvAutoParseService.stopAutoParse();
    if (!result.ok) {
      return res.status(409).json({ success: false, message: result.message, data: result.result });
    }

    const stats = await result.stopPromise;
    res.json({
      success: true,
      message: 'Auto parse CV stopped',
      data: stats
    });
  } catch (err) {
    next(err);
  }
});

export default router;

