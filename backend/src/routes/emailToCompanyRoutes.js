import express from 'express';
import { emailToCompanyController } from '../controllers/admin/emailToCompanyController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/emails/companies
 * @desc    Get list of emails to companies
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, emailToCompanyController.getEmails);

/**
 * @route   GET /api/admin/emails/companies/:id
 * @desc    Get email by ID
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, emailToCompanyController.getEmailById);

/**
 * @route   POST /api/admin/emails/companies
 * @desc    Create new email to companies
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, emailToCompanyController.createEmail);

/**
 * @route   POST /api/admin/emails/companies/:id/send
 * @desc    Send email to companies
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/:id/send', authenticate, isSuperAdminOrBackoffice, emailToCompanyController.sendEmail);

/**
 * @route   PUT /api/admin/emails/companies/:id
 * @desc    Update email (only if draft)
 * @access  Private (Super Admin, Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, emailToCompanyController.updateEmail);

/**
 * @route   DELETE /api/admin/emails/companies/:id
 * @desc    Delete email (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, emailToCompanyController.deleteEmail);

export default router;

