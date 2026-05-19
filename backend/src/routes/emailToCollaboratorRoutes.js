import express from 'express';
import { emailToCollaboratorController } from '../controllers/admin/emailToCollaboratorController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/emails/collaborators
 * @desc    Get list of emails to collaborators
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, emailToCollaboratorController.getEmails);

/**
 * @route   GET /api/admin/emails/collaborators/:id
 * @desc    Get email by ID
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, emailToCollaboratorController.getEmailById);

/**
 * @route   POST /api/admin/emails/collaborators
 * @desc    Create new email to collaborator(s)
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, emailToCollaboratorController.createEmail);

/**
 * @route   POST /api/admin/emails/collaborators/:id/send
 * @desc    Send email to collaborator(s)
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/:id/send', authenticate, isSuperAdminOrBackoffice, emailToCollaboratorController.sendEmail);

/**
 * @route   PUT /api/admin/emails/collaborators/:id
 * @desc    Update email (only if draft)
 * @access  Private (Super Admin, Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, emailToCollaboratorController.updateEmail);

/**
 * @route   DELETE /api/admin/emails/collaborators/:id
 * @desc    Delete email (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, emailToCollaboratorController.deleteEmail);

export default router;

