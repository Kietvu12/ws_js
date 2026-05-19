import express from 'express';
import { jobPickupController } from '../controllers/admin/jobPickupController.js';
import { authenticate, isSuperAdminOrBackoffice, isAnyAdmin } from '../middleware/auth.js';
import { uploadPostImage as uploadCoverImage } from '../middleware/postUploadMiddleware.js';

const router = express.Router();

/**
 * Admin Job Pick-up routes
 * Base: /api/admin/job-pickups
 */

// Nested `/:id/jobs` trước `/:id` để không bị ăn nhầm
router.get('/:id/jobs', authenticate, isAnyAdmin, jobPickupController.getJobsInPickup);
router.post('/:id/jobs', authenticate, isSuperAdminOrBackoffice, jobPickupController.addJobToPickup);
router.delete('/:id/jobs/:jobId', authenticate, isSuperAdminOrBackoffice, jobPickupController.removeJobFromPickup);

/**
 * POST /api/admin/job-pickups/:id/upload-cover — S3 prefix job-pickups/
 */
router.post(
  '/:id/upload-cover',
  authenticate,
  isSuperAdminOrBackoffice,
  uploadCoverImage,
  jobPickupController.uploadCover
);

router.get('/', authenticate, isAnyAdmin, jobPickupController.getJobPickups);
router.post('/', authenticate, isSuperAdminOrBackoffice, jobPickupController.createJobPickup);
router.get('/:id', authenticate, isAnyAdmin, jobPickupController.getJobPickupById);
router.put('/:id', authenticate, isSuperAdminOrBackoffice, jobPickupController.updateJobPickup);
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, jobPickupController.deleteJobPickup);

export default router;
