import express from 'express';
import { reportsController } from '../controllers/admin/reportsController.js';
import { authenticate, isSuperAdmin, isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/reports/overview
 * @desc    Overview KPIs (new candidates, Naitei, Nyusha, revenue)
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/overview', authenticate, isSuperAdminOrBackoffice, reportsController.getOverview);

/**
 * @route   GET /api/admin/reports/top-collaborators
 * @desc    Top collaborators by nominations / conversion rate
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/top-collaborators', authenticate, isSuperAdminOrBackoffice, reportsController.getTopCollaborators);

/**
 * @route   GET /api/admin/reports/nomination-effectiveness
 * @desc    Get nomination effectiveness statistics (Super Admin only)
 * @access  Private (Super Admin)
 */
router.get('/nomination-effectiveness', authenticate, isSuperAdmin, reportsController.getNominationEffectiveness);

/**
 * @route   GET /api/admin/reports/platform-effectiveness
 * @desc    Get platform operation effectiveness (Super Admin only)
 * @access  Private (Super Admin)
 */
router.get('/platform-effectiveness', authenticate, isSuperAdmin, reportsController.getPlatformEffectiveness);

/**
 * @route   GET /api/admin/reports/hr-effectiveness
 * @desc    Get HR / Admin Backoffice performance (files in process, interviews, Naitei, Nyusha, revenue)
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/hr-effectiveness', authenticate, isSuperAdminOrBackoffice, reportsController.getHREffectiveness);

/**
 * @route   GET /api/admin/reports/my-performance
 * @desc    Get admin's own performance report (All admins)
 * @access  Private
 */
router.get('/my-performance', authenticate, reportsController.getMyPerformance);

/**
 * @route   GET /api/admin/reports/export-excel
 * @desc    Export monthly report to Excel (3 sheets: Tổng hợp, Chi tiết ứng viên, Hiệu suất)
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/export-excel', authenticate, isSuperAdminOrBackoffice, reportsController.exportExcel);

export default router;

