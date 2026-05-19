import express from 'express';
import { adminPublicCtvChatController } from '../controllers/admin/adminPublicCtvChatController.js';
import { authenticate, authenticateOrQueryToken, isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

router.get(
  '/search-collaborators',
  authenticate,
  isSuperAdminOrBackoffice,
  adminPublicCtvChatController.searchCollaborators
);
router.get(
  '/sessions',
  authenticate,
  isSuperAdminOrBackoffice,
  adminPublicCtvChatController.listSessions
);
router.post(
  '/sessions',
  authenticate,
  isSuperAdminOrBackoffice,
  adminPublicCtvChatController.createSession
);
router.get(
  '/sessions/:sessionId/messages',
  authenticate,
  isSuperAdminOrBackoffice,
  adminPublicCtvChatController.getMessages
);
router.post(
  '/sessions/:sessionId/messages',
  authenticate,
  isSuperAdminOrBackoffice,
  adminPublicCtvChatController.postMessage
);
router.get(
  '/inbox-stream',
  authenticateOrQueryToken,
  isSuperAdminOrBackoffice,
  adminPublicCtvChatController.inboxStream
);

export default router;
