import express from 'express';
import { collaboratorAssignmentController } from '../controllers/admin/collaboratorAssignmentController.js';
import { authenticate, isSuperAdmin, isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/collaborator-assignments
 * @desc    Lấy danh sách phân công CTV
 * @access  Private (Super Admin xem tất cả, AdminBackOffice xem của mình)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, collaboratorAssignmentController.getAssignments);

/**
 * @route   GET /api/admin/collaborator-assignments/unassigned
 * @desc    Lấy danh sách CTV chưa được phân công
 * @access  Private (Super Admin only)
 */
router.get('/unassigned', authenticate, isSuperAdmin, collaboratorAssignmentController.getUnassignedCvStorages);

/**
 * @route   GET /api/admin/collaborator-assignments/my-assigned
 * @desc    AdminBackOffice xem danh sách CTV được phân công cho mình
 * @access  Private (AdminBackOffice)
 */
router.get('/my-assigned', authenticate, isSuperAdminOrBackoffice, collaboratorAssignmentController.getMyAssignedCvStorages);

/**
 * @route   GET /api/admin/collaborator-assignments/history
 * @desc    Xem lịch sử phân công CTV
 * @access  Private (Super Admin only)
 */
router.get('/history', authenticate, isSuperAdmin, collaboratorAssignmentController.getAssignmentHistory);

/**
 * @route   GET /api/admin/collaborator-assignments/statistics
 * @desc    Xem thống kê CTV được phân công
 * @access  Private (Super Admin xem tất cả, AdminBackOffice xem của mình)
 */
router.get('/statistics', authenticate, isSuperAdminOrBackoffice, collaboratorAssignmentController.getStatistics);

/**
 * @route   GET /api/admin/collaborator-assignments/:id
 * @desc    Lấy chi tiết phân công
 * @access  Private (Super Admin xem tất cả, AdminBackOffice xem của mình)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, collaboratorAssignmentController.getAssignmentById);

/**
 * @route   POST /api/admin/collaborator-assignments
 * @desc    Phân công 1 CTV cho 1 AdminBackOffice
 * @access  Private (Super Admin only)
 */
router.post('/', authenticate, isSuperAdmin, collaboratorAssignmentController.createAssignment);

/**
 * @route   POST /api/admin/collaborator-assignments/bulk
 * @desc    Phân công nhiều CTV cho 1 AdminBackOffice
 * @access  Private (Super Admin only)
 */
router.post('/bulk', authenticate, isSuperAdmin, collaboratorAssignmentController.bulkAssign);

/**
 * @route   PUT /api/admin/collaborator-assignments/:id
 * @desc    Cập nhật phân công (chuyển CTV sang AdminBackOffice khác)
 * @access  Private (Super Admin only)
 */
router.put('/:id', authenticate, isSuperAdmin, collaboratorAssignmentController.updateAssignment);

/**
 * @route   DELETE /api/admin/collaborator-assignments/:id
 * @desc    Hủy phân công CTV
 * @access  Private (Super Admin only)
 */
router.delete('/:id', authenticate, isSuperAdmin, collaboratorAssignmentController.deleteAssignment);

export default router;

