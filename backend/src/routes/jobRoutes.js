import express from 'express';
import { jobController } from '../controllers/admin/jobController.js';
import { authenticate, isSuperAdminOrBackoffice, isAnyAdmin } from '../middleware/auth.js';
import { uploadJdOriginalOptional } from '../middleware/jdOriginalUploadMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/admin/jobs
 * @desc    Get list of jobs
 * @access  Private (Super Admin, Backoffice, Admin CA Team)
 */
router.get('/', authenticate, isAnyAdmin, jobController.getJobs);

/**
 * @route   GET /api/admin/jobs/:id/edit-data
 * @desc    Get lightweight job data for edit form
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id/edit-data', authenticate, isSuperAdminOrBackoffice, jobController.getJobEditData);

/**
 * @route   GET /api/admin/jobs/:id/view-url
 * @desc    Lấy URL xem/tải file JD hoặc required CV form (S3 hoặc local)
 * @access  Private (Super Admin, Backoffice, Admin CA Team)
 */
router.get('/:id/view-url', authenticate, isAnyAdmin, jobController.getJobFileUrl);

/**
 * @route   GET /api/admin/jobs/:id
 * @desc    Get job by ID
 * @access  Private (Super Admin, Backoffice, Admin CA Team)
 */
router.get('/:id', authenticate, isAnyAdmin, jobController.getJobById);

/**
 * @route   POST /api/admin/jobs/preview-jd-pdf
 * @desc    Preview JD template PDF A4 từ dữ liệu form (không lưu DB)
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/preview-jd-pdf', authenticate, isSuperAdminOrBackoffice, jobController.previewJdPdf);

/**
 * @route   GET /api/admin/jobs/:id/download?fileType=jdFile|jdFileEn|jdFileJp|jdOriginalFile|requiredCvForm
 * @desc    Download JD/required CV file với đúng filename (local stream hoặc redirect S3 signed URL)
 * @access  Private (Super Admin, Backoffice, Admin CA Team)
 */
router.get('/:id/download', authenticate, isAnyAdmin, jobController.downloadJobFile);

/**
 * @route   POST /api/admin/jobs
 * @desc    Create new job
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, uploadJdOriginalOptional, jobController.createJob);

/**
 * @route   PUT /api/admin/jobs/:id
 * @desc    Update job
 * @access  Private (Super Admin, Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, uploadJdOriginalOptional, jobController.updateJob);

/**
 * @route   DELETE /api/admin/jobs/:id
 * @desc    Delete job (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, jobController.deleteJob);

/**
 * @route   PATCH /api/admin/jobs/:id/toggle-pinned
 * @desc    Toggle job pinned status
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/:id/toggle-pinned', authenticate, isSuperAdminOrBackoffice, jobController.togglePinned);

/**
 * @route   PATCH /api/admin/jobs/:id/toggle-hot
 * @desc    Toggle job hot status
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/:id/toggle-hot', authenticate, isSuperAdminOrBackoffice, jobController.toggleHot);

/**
 * @route   PATCH /api/admin/jobs/:id/status
 * @desc    Update job status
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/:id/status', authenticate, isSuperAdminOrBackoffice, jobController.updateStatus);

export default router;

