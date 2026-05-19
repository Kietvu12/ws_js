import express from 'express';
import { jobApplicationController } from '../controllers/collaborator/jobApplicationController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

/**
 * @route   GET /api/ctv/job-applications
 * @desc    Get list of job applications (only own applications)
 * @access  Private (CTV)
 */
router.get('/', authenticateCTV, jobApplicationController.getJobApplications);

/**
 * @route   GET /api/ctv/job-applications/candidates/:cvCode/nomination-history
 * @desc    Get nomination history for a candidate by CV code
 * @access  Private (CTV)
 */
router.get('/candidates/:cvCode/nomination-history', authenticateCTV, jobApplicationController.getCandidateNominationHistory);

/**
 * @route   GET /api/ctv/job-applications/:id
 * @desc    Get job application by ID (only own application)
 * @access  Private (CTV)
 */
router.get('/:id', authenticateCTV, jobApplicationController.getJobApplicationById);

/**
 * @route   POST /api/ctv/job-applications
 * @desc    Create new job application
 * @access  Private (CTV)
 */
router.post('/', authenticateCTV, jobApplicationController.createJobApplication);

/**
 * @route   PUT /api/ctv/job-applications/:id
 * @desc    Update job application (only own application, limited fields)
 * @access  Private (CTV)
 */
router.put('/:id', authenticateCTV, jobApplicationController.updateJobApplication);

/**
 * @route   DELETE /api/ctv/job-applications/:id
 * @desc    Delete job application (only own application, soft delete)
 * @access  Private (CTV)
 */
router.delete('/:id', authenticateCTV, jobApplicationController.deleteJobApplication);

export default router;

