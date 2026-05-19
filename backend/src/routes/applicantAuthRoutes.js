import express from 'express';
import { applicantAuthController } from '../controllers/applicant/applicantAuthController.js';
import { authenticateApplicant } from '../middleware/applicantAuth.js';

const router = express.Router();

router.post('/register', applicantAuthController.register);
router.post('/login', applicantAuthController.login);
router.post('/forgot-password', applicantAuthController.forgotPassword);
router.post('/reset-password', applicantAuthController.resetPassword);
router.get('/me', authenticateApplicant, applicantAuthController.getMe);
router.post('/logout', authenticateApplicant, applicantAuthController.logout);

export default router;

