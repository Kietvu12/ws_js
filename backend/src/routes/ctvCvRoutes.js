import express from 'express';
import { cvController } from '../controllers/collaborator/cvController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

/**
 * @route   GET /api/ctv/cvs
 * @desc    Get list of CVs (only own CVs)
 * @access  Private (CTV)
 */
router.get('/', authenticateCTV, cvController.getCVs);

/**
 * @route   GET /api/ctv/cvs/:id/view-url
 * @desc    Lấy URL xem/tải file CV (chỉ CV của CTV)
 * @access  Private (CTV)
 */
router.get('/:id/view-url', authenticateCTV, cvController.getCVFileUrl);

/**
 * @route   GET /api/ctv/cvs/:id/file-content
 * @desc    Stream file CV để preview DOCX/DOC/XLSX (chỉ CV của CTV)
 * @access  Private (CTV)
 */
router.get('/:id/file-content', authenticateCTV, cvController.getCVFileContent);

/**
 * @route   GET /api/ctv/cvs/:id/cv-file-list
 * @desc    List all CV files (originals + templates) with view/download URLs
 * @access  Private (CTV)
 */
router.get('/:id/cv-file-list', authenticateCTV, cvController.getCVFileList);

/**
 * @route   GET /api/ctv/cvs/:id/download-zip
 * @desc    Download zip for CV_original or CV_Template
 * @access  Private (CTV)
 */
router.get('/:id/download-zip', authenticateCTV, cvController.downloadCVZip);

/**
 * @route   GET /api/ctv/cvs/:id/snapshots
 * @desc    List CV snapshots (dateTime folders)
 * @access  Private (CTV)
 */
router.get('/:id/snapshots', authenticateCTV, cvController.getCVSnapshots);

/**
 * @route   POST /api/ctv/cvs/:id/rollback
 * @desc    Rollback CV to a previous snapshot (creates new snapshot from selected one)
 * @access  Private (CTV)
 */
router.post('/:id/rollback', authenticateCTV, cvController.rollbackCV);

/**
 * @route   POST /api/ctv/cvs/:id/submit-supplement-review
 * @desc    CTV gửi duyệt bổ sung — thông báo admin
 * @access  Private (CTV)
 */
router.post('/:id/submit-supplement-review', authenticateCTV, cvController.submitSupplementReview);
router.post('/:id/mark-ready-for-parse', authenticateCTV, cvController.markReadyForParse);

/**
 * @route   GET /api/ctv/cvs/:id
 * @desc    Get CV by ID (only own CV)
 * @access  Private (CTV)
 */
router.get('/:id', authenticateCTV, cvController.getCVById);

/**
 * @route   POST /api/ctv/cvs/preview
 * @desc    Preview CV template HTML (form sẽ xuất ra khi tạo/sửa UV)
 * @access  Private (CTV)
 */
router.post('/preview', authenticateCTV, cvController.previewCVTemplate);

/**
 * @route   POST /api/ctv/cvs/preview-pdf
 * @desc    Preview CV template PDF (khớp tải về / PDF lưu)
 * @access  Private (CTV)
 */
router.post('/preview-pdf', authenticateCTV, cvController.previewCVTemplatePdf);

/**
 * @route   POST /api/ctv/cvs/check-duplicate
 * @desc    Kiểm tra CV trùng (name, email, phone)
 * @access  Private (CTV)
 */
router.post('/check-duplicate', authenticateCTV, cvController.checkDuplicate);

/**
 * @route   POST /api/ctv/cvs
 * @desc    Create new CV
 * @access  Private (CTV)
 */
router.post('/', authenticateCTV, cvController.createCV);

/**
 * @route   PUT /api/ctv/cvs/:id
 * @desc    Update CV (only own CV)
 * @access  Private (CTV)
 */
router.put('/:id', authenticateCTV, cvController.updateCV);

/**
 * @route   DELETE /api/ctv/cvs/:id
 * @desc    Delete CV (only own CV, soft delete)
 * @access  Private (CTV)
 */
router.delete('/:id', authenticateCTV, cvController.deleteCV);

/**
 * @route   GET /api/ctv/cvs/statistics
 * @desc    Get CV statistics and list (danh sách CV và thống kê đơn ứng tuyển)
 * @access  Private (CTV)
 */
router.get('/statistics', authenticateCTV, cvController.getCVStatistics);

/**
 * @route   GET /api/ctv/cvs/recent
 * @desc    Get recently updated CVs (sorted by updatedAt DESC)
 * @access  Private (CTV)
 */
router.get('/recent', authenticateCTV, cvController.getRecentCVs);

export default router;

