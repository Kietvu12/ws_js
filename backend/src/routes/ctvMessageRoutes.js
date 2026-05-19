import express from 'express';
import { messageController } from '../controllers/collaborator/messageController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';
import { uploadMessageAttachment } from '../middleware/messageAttachmentUploadMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/ctv/messages/unread-count
 * @desc    Get count of messages from Admin not yet read by CTV
 * @access  Private (CTV)
 */
router.get('/unread-count', authenticateCTV, messageController.getUnreadCount);

/**
 * @route   GET /api/ctv/messages/unread-by-application
 * @desc    Get unread message count per job application (for list badge)
 * @access  Private (CTV)
 */
router.get('/unread-by-application', authenticateCTV, messageController.getUnreadByJobApplication);

/**
 * @route   GET /api/ctv/messages/job-application/:jobApplicationId
 * @desc    Get messages by job application
 * @access  Private (CTV)
 */
router.get('/job-application/:jobApplicationId', authenticateCTV, messageController.getMessagesByJobApplication);

/**
 * @route   GET /api/ctv/messages/admins
 * @desc    Lấy danh sách admin (Super Admin và Backoffice) để CTV gửi tin nhắn
 * @access  Private (CTV)
 */
router.get('/admins', authenticateCTV, messageController.getAdminsForMessage);

/**
 * @route   POST /api/ctv/messages
 * @desc    Create new message
 * @access  Private (CTV)
 */
router.post('/', authenticateCTV, uploadMessageAttachment, messageController.createMessage);

/**
 * @route   PATCH /api/ctv/messages/:id/mark-read
 * @desc    Mark message as read by collaborator
 * @access  Private (CTV)
 */
router.patch('/:id/mark-read', authenticateCTV, messageController.markReadByCollaborator);

/**
 * @route   PATCH /api/ctv/messages/job-application/:jobApplicationId/mark-all-read
 * @desc    Mark all messages as read by collaborator for a job application
 * @access  Private (CTV)
 */
router.patch('/job-application/:jobApplicationId/mark-all-read', authenticateCTV, messageController.markAllReadByCollaborator);

/**
 * @route   DELETE /api/ctv/messages/:id
 * @desc    Delete message (soft delete)
 * @access  Private (CTV)
 */
router.delete('/:id', authenticateCTV, messageController.deleteMessage);

export default router;

