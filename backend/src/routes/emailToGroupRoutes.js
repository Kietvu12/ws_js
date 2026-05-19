import express from 'express';
import { emailToGroupController } from '../controllers/admin/emailToGroupController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/emails/groups
 * @desc    Get list of emails to groups
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, emailToGroupController.getEmails);

/**
 * @route   GET /api/admin/emails/groups/:id
 * @desc    Get email by ID
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, emailToGroupController.getEmailById);

/**
 * @route   POST /api/admin/emails/groups
 * @desc    Create new email to group(s)
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, emailToGroupController.createEmail);

/**
 * @route   POST /api/admin/emails/groups/:id/send
 * @desc    Send email to group(s)
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/:id/send', authenticate, isSuperAdminOrBackoffice, emailToGroupController.sendEmail);

/**
 * @route   PUT /api/admin/emails/groups/:id
 * @desc    Update email (only if draft)
 * @access  Private (Super Admin, Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, emailToGroupController.updateEmail);

/**
 * @route   DELETE /api/admin/emails/groups/:id
 * @desc    Delete email (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, emailToGroupController.deleteEmail);

export default router;

