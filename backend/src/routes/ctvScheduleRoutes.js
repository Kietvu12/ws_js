import express from 'express';
import { scheduleController } from '../controllers/collaborator/scheduleController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

/**
 * @route   GET /api/ctv/calendars/schedule
 * @desc    Get schedule (interviews and naitei) for CTV
 * @access  Private (CTV)
 */
router.get('/schedule', authenticateCTV, scheduleController.getSchedule);

/**
 * @route   POST /api/ctv/calendars
 * @desc    Create new calendar event for CTV
 * @access  Private (CTV)
 */
router.post('/', authenticateCTV, scheduleController.createCalendar);

export default router;

