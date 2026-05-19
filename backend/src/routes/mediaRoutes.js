import express from 'express';
import { redirectS3View } from '../controllers/mediaController.js';

const router = express.Router();

/**
 * GET /api/media/s3-view?key= — redirect 302 sang presigned URL S3 (ảnh cover campaign/job-pickups, posts/..., ...)
 */
router.get('/s3-view', redirectS3View);

export default router;
