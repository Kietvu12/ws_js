import express from 'express';
import { cvController } from '../controllers/admin/cvController.js';
import { authenticate, isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/cvs
 * @desc    Lấy danh sách CV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, cvController.getCVs);

/**
 * @route   POST /api/admin/cvs/mark-overdue
 * @desc    Đánh dấu CV quá hạn 6 tháng và chuyển CV trùng mới nhất sang Hồ sơ mới
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/mark-overdue', authenticate, isSuperAdminOrBackoffice, cvController.markOverdueCVs);

/**
 * @route   POST /api/admin/cvs/bulk-import/preview
 * @desc    Xem trước dữ liệu import (theo sheet), không ghi DB
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/bulk-import/preview', authenticate, isSuperAdminOrBackoffice, cvController.bulkImportPreview);

/**
 * @route   POST /api/admin/cvs/bulk-import
 * @desc    Import danh sách ứng viên từ Excel (.xlsx) + ZIP file CV (tùy chọn)
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/bulk-import', authenticate, isSuperAdminOrBackoffice, cvController.bulkImportCVs);

/**
 * @route   PATCH /api/admin/cvs/:id/supplement-marks
 * @desc    Lưu đánh dấu bổ sung thông tin (nháp)
 */
router.patch('/:id/supplement-marks', authenticate, isSuperAdminOrBackoffice, cvController.patchSupplementMarks);

/**
 * @route   POST /api/admin/cvs/:id/supplement-marks/send
 * @desc    Gửi yêu cầu bổ sung tới CTV
 */
router.post('/:id/supplement-marks/send', authenticate, isSuperAdminOrBackoffice, cvController.sendSupplementRequest);

/**
 * @route   GET /api/admin/cvs/:id
 * @desc    Lấy thông tin CV theo ID
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, cvController.getCVById);

/**
 * @route   POST /api/admin/cvs
 * @desc    Tạo CV mới
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, cvController.createCV);

/**
 * @route   POST /api/admin/cvs/preview
 * @desc    Preview CV template HTML (không lưu, chỉ render)
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/preview', authenticate, isSuperAdminOrBackoffice, cvController.previewCVTemplate);

/**
 * @route   POST /api/admin/cvs/preview-pdf
 * @desc    Preview CV template PDF (Puppeteer — khớp file PDF khi lưu)
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/preview-pdf', authenticate, isSuperAdminOrBackoffice, cvController.previewCVTemplatePdf);

/**
 * @route   PUT /api/admin/cvs/:id
 * @desc    Cập nhật CV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, cvController.updateCV);

/**
 * @route   DELETE /api/admin/cvs/:id
 * @desc    Xóa CV (soft delete)
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, cvController.deleteCV);

/**
 * @route   GET /api/admin/cvs/:id/history
 * @desc    Lấy lịch sử cập nhật CV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/:id/history', authenticate, isSuperAdminOrBackoffice, cvController.getCVHistory);

export default router;

