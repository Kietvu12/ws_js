import express from 'express';
import { dashboardController } from '../controllers/collaborator/dashboardController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

/**
 * @route   GET /api/ctv/dashboard
 * @desc    Get dashboard overview statistics
 * @access  Private (CTV)
 */
router.get('/', authenticateCTV, dashboardController.getDashboard);

/**
 * @route   GET /api/ctv/dashboard/chart
 * @desc    Get dashboard chart data
 * @access  Private (CTV)
 */
router.get('/chart', authenticateCTV, dashboardController.getDashboardChart);

/**
 * @route   GET /api/ctv/dashboard/category-distribution
 * @desc    Get job category distribution (phân bố theo nhóm ngành nghề)
 * @access  Private (CTV)
 */
router.get('/category-distribution', authenticateCTV, dashboardController.getCategoryDistribution);

/**
 * @route   GET /api/ctv/dashboard/offer-rejection
 * @desc    Get offer and rejection statistics (số lượng đơn được offer và bị từ chối theo thời gian)
 * @access  Private (CTV)
 */
router.get('/offer-rejection', authenticateCTV, dashboardController.getOfferRejectionStats);

export default router;

