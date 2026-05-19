import express from 'express';
import { jobApplicationController } from '../controllers/admin/jobApplicationController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/job-applications
 * @desc    Get list of job applications
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, jobApplicationController.getJobApplications);

/**
 * @route   POST /api/admin/job-applications/bulk-delete-duplicate-cv-nominations
 * @desc    Soft-delete all nominations whose CV is duplicate (status 3); notify CTV per deleted row (when collaboratorId)
 * @access  Private (Super Admin, Backoffice; permission per row)
 */
router.post(
  '/bulk-delete-duplicate-cv-nominations',
  authenticate,
  isSuperAdminOrBackoffice,
  jobApplicationController.bulkDeleteDuplicateCvNominations
);

/**
 * @route   GET /api/admin/job-applications/:id
 * @desc    Get job application by ID
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, jobApplicationController.getJobApplicationById);

/**
 * @route   GET /api/admin/job-applications/:id/memos
 * @desc    Get memos for a job application
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id/memos', authenticate, isSuperAdminOrBackoffice, jobApplicationController.getMemos);

/**
 * @route   POST /api/admin/job-applications
 * @desc    Create new job application
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, jobApplicationController.createJobApplication);

/**
 * @route   PUT /api/admin/job-applications/:id
 * @desc    Update job application
 * @access  Private (Super Admin, Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, jobApplicationController.updateJobApplication);

/**
 * @route   PUT /api/admin/job-applications/:id/memos/:memoId
 * @desc    Update memo for a job application
 * @access  Private (Super Admin, Backoffice; only SuperAdmin can update)
 */
router.put('/:id/memos/:memoId', authenticate, isSuperAdminOrBackoffice, jobApplicationController.updateMemo);

/**
 * @route   POST /api/admin/job-applications/:id/memos
 * @desc    Create memo for a job application
 * @access  Private (Super Admin, Backoffice; only SuperAdmin can create)
 */
router.post('/:id/memos', authenticate, isSuperAdminOrBackoffice, jobApplicationController.createMemo);

/**
 * @route   DELETE /api/admin/job-applications/:id/memos/:memoId
 * @desc    Delete memo for a job application
 * @access  Private (Super Admin, Backoffice; only SuperAdmin can delete)
 */
router.delete('/:id/memos/:memoId', authenticate, isSuperAdminOrBackoffice, jobApplicationController.deleteMemo);

/**
 * @route   PATCH /api/admin/job-applications/:id/status
 * @desc    Update job application status
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/:id/status', authenticate, isSuperAdminOrBackoffice, jobApplicationController.updateStatus);

/**
 * @route   DELETE /api/admin/job-applications/:id
 * @desc    Delete job application (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, jobApplicationController.deleteJobApplication);

export default router;

