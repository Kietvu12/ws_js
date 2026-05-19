import express from 'express';
import { adminController } from '../controllers/admin/adminController.js';
import { dashboardController } from '../controllers/admin/dashboardController.js';
import { authenticate, isSuperAdmin, isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Thống kê dashboard: CTV, Jobs, Ứng tuyển, Yêu cầu thanh toán
 * @access  Private (Admin)
 */
router.get('/dashboard', authenticate, isSuperAdminOrBackoffice, dashboardController.getDashboard);

/**
 * @route   GET /api/admin/dashboard/nomination-over-time
 * @desc    Đơn tiến cử thành công/thất bại theo tháng (biểu đồ line)
 * @access  Private (Admin)
 */
router.get('/dashboard/nomination-over-time', authenticate, isSuperAdminOrBackoffice, dashboardController.getNominationOverTime);

/**
 * @route   GET /api/admin/dashboard/job-nomination-by-month
 * @desc    Số lượng job có / không có đơn tiến cử theo tháng trong năm
 * @access  Private (Admin)
 */
router.get('/dashboard/job-nomination-by-month', authenticate, isSuperAdminOrBackoffice, dashboardController.getJobNominationByMonth);

/**
 * @route   GET /api/admin/dashboard/registrations-over-time
 * @desc    Số lượt đăng ký hệ thống theo ngày trong tháng (filter month)
 * @access  Private (Admin)
 */
router.get('/dashboard/registrations-over-time', authenticate, isSuperAdminOrBackoffice, dashboardController.getRegistrationsOverTime);

/**
 * @route   GET /api/admin/dashboard/approvals-by-day
 * @desc    Số lượt phê duyệt đăng ký (approved/pending/rejected) theo ngày
 * @access  Private (Admin)
 */
router.get('/dashboard/approvals-by-day', authenticate, isSuperAdminOrBackoffice, dashboardController.getApprovalsByDay);

/**
 * @route   GET /api/admin/dashboard/job-statistics
 * @desc    Thống kê jobs (hot jobs) cho dashboard
 * @access  Private (Admin)
 */
router.get('/dashboard/job-statistics', authenticate, isSuperAdminOrBackoffice, dashboardController.getJobStatistics);

/**
 * @route   POST /api/admin/auth/login
 * @desc    Đăng nhập admin
 * @access  Public
 */
router.post('/auth/login', adminController.login);

/**
 * @route   POST /api/admin/auth/forgot-password
 * @desc    Gửi email đặt lại mật khẩu admin
 * @access  Public
 */
router.post('/auth/forgot-password', adminController.forgotPassword);

/**
 * @route   POST /api/admin/auth/reset-password
 * @desc    Đặt lại mật khẩu admin bằng token
 * @access  Public
 */
router.post('/auth/reset-password', adminController.resetPassword);

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Đăng xuất admin
 * @access  Private
 */
router.post('/auth/logout', authenticate, adminController.logout);

/**
 * @route   GET /api/admin/auth/me
 * @desc    Lấy thông tin admin hiện tại
 * @access  Private
 */
router.get('/auth/me', authenticate, adminController.getProfile);

/**
 * @route   GET /api/admin/admins
 * @desc    Lấy danh sách admin
 * @access  Private (Super Admin only)
 */
router.get('/admins', authenticate, isSuperAdmin, adminController.getAdmins);

/**
 * @route   GET /api/admin/admins/:id
 * @desc    Lấy thông tin admin theo ID
 * @access  Private (Super Admin only)
 */
router.get('/admins/:id', authenticate, isSuperAdmin, adminController.getAdminById);

/**
 * @route   POST /api/admin/admins
 * @desc    Tạo admin mới
 * @access  Private (Super Admin only)
 */
router.post('/admins', authenticate, isSuperAdmin, adminController.createAdmin);

/**
 * @route   PUT /api/admin/admins/:id
 * @desc    Cập nhật thông tin admin
 * @access  Private (Super Admin only)
 */
router.put('/admins/:id', authenticate, isSuperAdmin, adminController.updateAdmin);

/**
 * @route   DELETE /api/admin/admins/:id
 * @desc    Xóa admin (soft delete)
 * @access  Private (Super Admin only)
 */
router.delete('/admins/:id', authenticate, isSuperAdmin, adminController.deleteAdmin);

/**
 * @route   POST /api/admin/admins/:id/reset-password
 * @desc    Đặt lại mật khẩu admin
 * @access  Private (Super Admin only)
 */
router.post('/admins/:id/reset-password', authenticate, isSuperAdmin, adminController.resetPassword);

/**
 * @route   PATCH /api/admin/admins/:id/toggle-status
 * @desc    Kích hoạt/Vô hiệu hóa admin
 * @access  Private (Super Admin only)
 */
router.patch('/admins/:id/toggle-status', authenticate, isSuperAdmin, adminController.toggleStatus);

export default router;

