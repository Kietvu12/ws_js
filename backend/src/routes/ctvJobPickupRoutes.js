import express from 'express';
import { jobPickupController } from '../controllers/collaborator/jobPickupController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

/**
 * @route   GET /api/ctv/job-pickups
 * @desc    Get list of job pickups (CTV)
 * @access  Private (CTV)
 */
router.get('/', authenticateCTV, jobPickupController.getJobPickups);

/**
 * @route   GET /api/ctv/job-pickups/:id
 * @desc    Get job pickup by ID (CTV)
 * @access  Private (CTV)
 */
router.get('/:id', authenticateCTV, jobPickupController.getJobPickupById);

export default router;

