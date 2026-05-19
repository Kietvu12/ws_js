import express from 'express';
import { collaboratorController } from '../controllers/admin/collaboratorController.js';
import { authenticate, isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/collaborators
 * @desc    Lấy danh sách CTV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, collaboratorController.getCollaborators);

/**
 * @route   POST /api/admin/collaborators/approve-bulk
 * @desc    Phê duyệt hàng loạt CTV (body: { ids: number[] })
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/approve-bulk', authenticate, isSuperAdminOrBackoffice, collaboratorController.approveCollaboratorsBulk);

/**
 * @route   GET /api/admin/collaborators/rank-levels
 * @desc    Danh sách cấp rank (dropdown)
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/rank-levels', authenticate, isSuperAdminOrBackoffice, collaboratorController.getRankLevels);

/**
 * @route   GET /api/admin/collaborators/:id
 * @desc    Lấy thông tin CTV theo ID
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, collaboratorController.getCollaboratorById);

/**
 * @route   POST /api/admin/collaborators
 * @desc    Tạo CTV mới
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, collaboratorController.createCollaborator);

/**
 * @route   PUT /api/admin/collaborators/:id
 * @desc    Cập nhật thông tin CTV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, collaboratorController.updateCollaborator);

/**
 * @route   DELETE /api/admin/collaborators/:id
 * @desc    Xóa CTV (soft delete)
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, collaboratorController.deleteCollaborator);

/**
 * @route   POST /api/admin/collaborators/:id/approve
 * @desc    Duyệt CTV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/:id/approve', authenticate, isSuperAdminOrBackoffice, collaboratorController.approveCollaborator);

/**
 * @route   POST /api/admin/collaborators/:id/reject
 * @desc    Từ chối CTV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/:id/reject', authenticate, isSuperAdminOrBackoffice, collaboratorController.rejectCollaborator);

/**
 * @route   PATCH /api/admin/collaborators/:id/toggle-status
 * @desc    Kích hoạt/Vô hiệu hóa CTV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.patch('/:id/toggle-status', authenticate, isSuperAdminOrBackoffice, collaboratorController.toggleStatus);

/**
 * @route   POST /api/admin/collaborators/:id/reset-password
 * @desc    Đặt lại mật khẩu CTV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/:id/reset-password', authenticate, isSuperAdminOrBackoffice, collaboratorController.resetPassword);

export default router;

