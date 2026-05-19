import express from 'express';
import { adminNotificationController } from '../controllers/admin/adminNotificationController.js';
import { authenticate, isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, isSuperAdminOrBackoffice, adminNotificationController.getNotifications);
router.get('/unread-count', authenticate, isSuperAdminOrBackoffice, adminNotificationController.getUnreadCount);
router.get('/stream', authenticate, isSuperAdminOrBackoffice, adminNotificationController.stream);
router.patch('/read-all', authenticate, isSuperAdminOrBackoffice, adminNotificationController.markAllRead);
router.patch('/:id/read', authenticate, isSuperAdminOrBackoffice, adminNotificationController.markRead);

export default router;
