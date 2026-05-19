import express from 'express';
import { applicantCvController } from '../controllers/applicant/cvController.js';
import { cvController } from '../controllers/collaborator/cvController.js';
import { authenticateApplicant } from '../middleware/applicantAuth.js';

const router = express.Router();

router.post('/preview', authenticateApplicant, cvController.previewCVTemplate);
router.post('/preview-pdf', authenticateApplicant, cvController.previewCVTemplatePdf);

router.get('/:id/cv-file-list', authenticateApplicant, cvController.getCVFileListAsApplicant);
router.get('/:id/download-zip', authenticateApplicant, cvController.downloadCVZipAsApplicant);
router.get('/:id/view-url', authenticateApplicant, cvController.getCVFileUrlAsApplicant);
router.get('/:id/file-content', authenticateApplicant, cvController.getCVFileContentAsApplicant);

router.get('/', authenticateApplicant, applicantCvController.getMyCVs);
router.get('/:id', authenticateApplicant, applicantCvController.getMyCVById);
router.post('/', authenticateApplicant, cvController.createCVAsApplicant);

export default router;

