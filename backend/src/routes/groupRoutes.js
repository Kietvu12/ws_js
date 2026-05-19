import express from 'express';
import { groupController } from '../controllers/admin/groupController.js';
import { authenticate, isSuperAdmin, isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/groups
 * @desc    Lấy danh sách nhóm quyền
 * @access  Private (Super Admin only)
 */
router.get('/', authenticate, isSuperAdmin, groupController.getGroups);

/**
 * @route   GET /api/admin/groups/all
 * @desc    Lấy tất cả nhóm quyền (cho dropdown)
 * @access  Private (Super Admin only)
 */
router.get('/all', authenticate, isSuperAdmin, groupController.getAllGroups);

/**
 * @route   GET /api/admin/groups/my-group
 * @desc    Lấy thông tin nhóm của mình (Admin CA Team)
 * @access  Private (Admin CA Team - role = 3)
 */
router.get('/my-group', authenticate, groupController.getMyGroup);

/**
 * @route   GET /api/admin/groups/my-group/statistics
 * @desc    Lấy thống kê nhóm của mình (Admin CA Team)
 * @access  Private (Admin CA Team - role = 3)
 */
router.get('/my-group/statistics', authenticate, groupController.getMyGroupStatistics);

/**
 * @route   GET /api/admin/groups/:id
 * @desc    Lấy thông tin nhóm quyền theo ID
 * @access  Private (Super Admin only)
 */
router.get('/:id', authenticate, isSuperAdmin, groupController.getGroupById);

/**
 * @route   GET /api/admin/groups/:id/statistics
 * @desc    Lấy thống kê nhóm quyền
 * @access  Private (Super Admin only)
 */
router.get('/:id/statistics', authenticate, isSuperAdmin, groupController.getGroupStatistics);

/**
 * @route   GET /api/admin/groups/:id/history
 * @desc    Lấy lịch sử hoạt động của nhóm
 * @access  Private (Super Admin only)
 */
router.get('/:id/history', authenticate, isSuperAdmin, groupController.getGroupHistory);

/**
 * @route   POST /api/admin/groups
 * @desc    Tạo nhóm quyền mới
 * @access  Private (Super Admin only)
 */
router.post('/', authenticate, isSuperAdmin, groupController.createGroup);

/**
 * @route   PUT /api/admin/groups/:id
 * @desc    Cập nhật nhóm quyền
 * @access  Private (Super Admin only)
 */
router.put('/:id', authenticate, isSuperAdmin, groupController.updateGroup);

/**
 * @route   PUT /api/admin/groups/:id/assign-admin
 * @desc    Gán admin vào nhóm
 * @access  Private (Super Admin only)
 */
router.put('/:id/assign-admin', authenticate, isSuperAdmin, groupController.assignAdminToGroup);

/**
 * @route   PUT /api/admin/groups/:id/bulk-assign-admins
 * @desc    Gán nhiều admin vào nhóm
 * @access  Private (Super Admin only)
 */
router.put('/:id/bulk-assign-admins', authenticate, isSuperAdmin, groupController.bulkAssignAdminsToGroup);

/**
 * @route   PUT /api/admin/groups/:id/remove-admin
 * @desc    Gỡ admin khỏi nhóm
 * @access  Private (Super Admin only)
 */
router.put('/:id/remove-admin', authenticate, isSuperAdmin, groupController.removeAdminFromGroup);

/**
 * @route   DELETE /api/admin/groups/:id
 * @desc    Xóa nhóm quyền (soft delete)
 * @access  Private (Super Admin only)
 */
router.delete('/:id', authenticate, isSuperAdmin, groupController.deleteGroup);

export default router;

