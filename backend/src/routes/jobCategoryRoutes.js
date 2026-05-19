import express from 'express';
import { jobCategoryController } from '../controllers/admin/jobCategoryController.js';
import { authenticate, isSuperAdminOrBackoffice, isAnyAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Job Category Routes
 * Base path: /api/admin/job-categories
 */

// Get job category tree (hierarchical structure) - Allow all admin roles to view
router.get('/tree', authenticate, isAnyAdmin, jobCategoryController.getJobCategoryTree);

// Get list of job categories - Allow all admin roles to view
router.get('/', authenticate, isAnyAdmin, jobCategoryController.getJobCategories);

// Get job category by ID - Allow all admin roles to view
router.get('/:id', authenticate, isAnyAdmin, jobCategoryController.getJobCategoryById);

// Create new job category
router.post('/', authenticate, isSuperAdminOrBackoffice, jobCategoryController.createJobCategory);

// Update job category
router.put('/:id', authenticate, isSuperAdminOrBackoffice, jobCategoryController.updateJobCategory);

// Delete job category
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, jobCategoryController.deleteJobCategory);

export default router;

