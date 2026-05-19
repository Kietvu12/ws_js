import express from 'express';
import { jobController } from '../controllers/collaborator/jobController.js';
import { authenticateCTV, optionalAuthenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

/**
 * @route   GET /api/ctv/jobs
 * @desc    Get list of jobs (with filters)
 * @access  Public (optional CTV Bearer để lưu lịch sử tìm kiếm)
 */
router.get('/', optionalAuthenticateCTV, jobController.getJobs);

/**
 * @route   GET /api/ctv/jobs/by-campaign/:campaignId
 * @desc    Get jobs by campaign ID
 * @access  Public
 */
router.get('/by-campaign/:campaignId', jobController.getJobsByCampaign);

/**
 * @route   GET /api/ctv/jobs/by-job-pickup/:jobPickupId
 * @desc    Get jobs by job pickup ID
 * @access  Public
 */
router.get('/by-job-pickup/:jobPickupId', jobController.getJobsByJobPickup);

/**
 * @route   GET /api/ctv/jobs/:id/view-url
 * @desc    Lấy URL xem/tải file JD hoặc required CV form
 * @access  Private (CTV)
 */
router.get('/:id/view-url', authenticateCTV, jobController.getJobFileUrl);

/**
 * @route   GET /api/ctv/jobs/:id
 * @desc    Get job by ID (chỉ job đã published)
 * @access  Public
 */
router.get('/:id', jobController.getJobById);

export default router;

