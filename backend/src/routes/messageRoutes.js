import express from 'express';
import { messageController } from '../controllers/admin/messageController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';
import { uploadMessageAttachment } from '../middleware/messageAttachmentUploadMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/admin/messages
 * @desc    Get list of messages
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, messageController.getMessages);

/**
 * @route   GET /api/admin/messages/job-application/:jobApplicationId
 * @desc    Get messages by job application
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/job-application/:jobApplicationId', authenticate, isSuperAdminOrBackoffice, messageController.getMessagesByJobApplication);

/**
 * @route   GET /api/admin/messages/unread-count
 * @desc    Get count of messages from CTV not yet read by admin
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/unread-count', authenticate, isSuperAdminOrBackoffice, messageController.getUnreadCount);

/**
 * @route   GET /api/admin/messages/unread-by-application
 * @desc    Get unread message count per job application (for list badge)
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/unread-by-application', authenticate, isSuperAdminOrBackoffice, messageController.getUnreadByJobApplication);

/**
 * @route   GET /api/admin/messages/:id
 * @desc    Get message by ID
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, messageController.getMessageById);

/**
 * @route   POST /api/admin/messages
 * @desc    Create new message
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, uploadMessageAttachment, messageController.createMessage);

/**
 * @route   PATCH /api/admin/messages/:id/mark-read-admin
 * @desc    Mark message as read by admin
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/:id/mark-read-admin', authenticate, isSuperAdminOrBackoffice, messageController.markReadByAdmin);

/**
 * @route   PATCH /api/admin/messages/:id/mark-read-collaborator
 * @desc    Mark message as read by collaborator
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/:id/mark-read-collaborator', authenticate, isSuperAdminOrBackoffice, messageController.markReadByCollaborator);

/**
 * @route   PATCH /api/admin/messages/job-application/:jobApplicationId/mark-all-read-admin
 * @desc    Mark all messages as read by admin for a job application
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/job-application/:jobApplicationId/mark-all-read-admin', authenticate, isSuperAdminOrBackoffice, messageController.markAllReadByAdmin);

/**
 * @route   DELETE /api/admin/messages/:id
 * @desc    Delete message (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, messageController.deleteMessage);

export default router;

