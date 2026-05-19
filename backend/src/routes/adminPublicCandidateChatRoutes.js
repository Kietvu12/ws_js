import express from 'express';
import { adminPublicCandidateChatController } from '../controllers/admin/adminPublicCandidateChatController.js';
import { authenticate, authenticateOrQueryToken, isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

router.get(
  '/sessions',
  authenticate,
  isSuperAdminOrBackoffice,
  adminPublicCandidateChatController.listSessions
);
router.get(
  '/sessions/:sessionId/messages',
  authenticate,
  isSuperAdminOrBackoffice,
  adminPublicCandidateChatController.getMessages
);
router.post(
  '/sessions/:sessionId/messages',
  authenticate,
  isSuperAdminOrBackoffice,
  adminPublicCandidateChatController.postMessage
);
router.get(
  '/inbox-stream',
  authenticateOrQueryToken,
  isSuperAdminOrBackoffice,
  adminPublicCandidateChatController.inboxStream
);

export default router;
