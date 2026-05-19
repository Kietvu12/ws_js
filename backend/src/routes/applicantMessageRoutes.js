import express from 'express';
import { authenticateApplicant } from '../middleware/applicantAuth.js';
import { applicantMessageController } from '../controllers/applicant/messageController.js';
import { uploadMessageAttachment } from '../middleware/messageAttachmentUploadMiddleware.js';

const router = express.Router();

router.get(
  '/job-application/:jobApplicationId',
  authenticateApplicant,
  applicantMessageController.getMessagesByJobApplication
);
router.post(
  '/',
  authenticateApplicant,
  uploadMessageAttachment,
  applicantMessageController.createMessage
);

export default router;
