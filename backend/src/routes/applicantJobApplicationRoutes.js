import express from 'express';
import { applicantJobApplicationController } from '../controllers/applicant/jobApplicationController.js';
import { authenticateApplicant } from '../middleware/applicantAuth.js';

const router = express.Router();

router.get('/', authenticateApplicant, applicantJobApplicationController.listMyJobApplications);
router.get('/:id', authenticateApplicant, applicantJobApplicationController.getMyJobApplicationById);
router.post('/', authenticateApplicant, applicantJobApplicationController.createMyJobApplication);

export default router;

