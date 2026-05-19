import express from 'express';
import { calendarController } from '../controllers/admin/calendarController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/calendars
 * @desc    Get list of calendars
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, calendarController.getCalendars);

/**
 * @route   GET /api/admin/calendars/:id
 * @desc    Get calendar by ID
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, calendarController.getCalendarById);

/**
 * @route   POST /api/admin/calendars
 * @desc    Create new calendar
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, calendarController.createCalendar);

/**
 * @route   PUT /api/admin/calendars/:id
 * @desc    Update calendar
 * @access  Private (Super Admin, Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, calendarController.updateCalendar);

/**
 * @route   PATCH /api/admin/calendars/:id/status
 * @desc    Update calendar status
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/:id/status', authenticate, isSuperAdminOrBackoffice, calendarController.updateStatus);

/**
 * @route   DELETE /api/admin/calendars/:id
 * @desc    Delete calendar (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, calendarController.deleteCalendar);

export default router;

