import express from 'express';
import { ctvJobCategoryController } from '../controllers/collaborator/jobCategoryController.js';
const router = express.Router();

/**
 * @route   GET /api/ctv/job-categories
 * @desc    Get list of job categories (active)
 * @access  Public
 */
router.get('/', ctvJobCategoryController.getJobCategories);

/**
 * @route   GET /api/ctv/job-categories/tree
 * @desc    Get job category tree (hierarchical structure)
 * @access  Public
 */
router.get('/tree', ctvJobCategoryController.getJobCategoryTree);

export default router;

