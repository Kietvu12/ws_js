import express from 'express';
import { notificationController } from '../controllers/collaborator/notificationController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

router.get('/', authenticateCTV, notificationController.getNotifications);
router.get('/unread-count', authenticateCTV, notificationController.getUnreadCount);
router.get('/stream', authenticateCTV, notificationController.stream);
router.patch('/read-all', authenticateCTV, notificationController.markAllRead);
router.patch('/:id/read', authenticateCTV, notificationController.markRead);

export default router;
