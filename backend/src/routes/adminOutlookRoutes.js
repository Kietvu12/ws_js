import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as outlookEmailController from '../controllers/admin/outlookEmailController.js';

const router = express.Router();

router.get('/connection', authenticate, outlookEmailController.getConnection);
router.post('/disconnect', authenticate, outlookEmailController.disconnect);
router.post('/sync', authenticate, outlookEmailController.sync);
router.post('/send', authenticate, outlookEmailController.sendEmail);
router.get('/emails', authenticate, outlookEmailController.listEmails);
router.get('/emails/:id', authenticate, outlookEmailController.getEmailById);

export default router;
