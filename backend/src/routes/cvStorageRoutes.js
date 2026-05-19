import express from 'express';
import { cvStorageController, uploadCVFile } from '../controllers/admin/cvStorageController.js';
import { authenticate, isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/cv-storages
 * @desc    Lấy danh sách file CV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, cvStorageController.getCVStorages);

/**
 * @route   POST /api/admin/cv-storages/:id/upload
 * @desc    Upload file CV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/:id/upload', authenticate, isSuperAdminOrBackoffice, uploadCVFile, cvStorageController.uploadCVFile);

/**
 * @route   GET /api/admin/cv-storages/:id/download
 * @desc    Download file CV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/:id/download', authenticate, isSuperAdminOrBackoffice, cvStorageController.downloadCVFile);

/**
 * @route   GET /api/admin/cv-storages/:id/file-content
 * @desc    Stream nội dung file (proxy) để preview DOCX/DOC/XLSX tránh CORS
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/:id/file-content', authenticate, isSuperAdminOrBackoffice, cvStorageController.getCVFileContent);

/**
 * @route   GET /api/admin/cv-storages/:id/view-url
 * @desc    Lấy signed URL để xem file (S3) hoặc URL tĩnh (local)
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/:id/view-url', authenticate, isSuperAdminOrBackoffice, cvStorageController.getCVViewUrl);

/**
 * @route   GET /api/admin/cv-storages/:id/cv-file-list
 * @desc    List all CV files (originals + templates) with view/download URLs
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/:id/cv-file-list', authenticate, isSuperAdminOrBackoffice, cvStorageController.getCVFileList);

/**
 * @route   GET /api/admin/cv-storages/:id/download-zip
 * @desc    Download zip for CV_original or CV_Template
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/:id/download-zip', authenticate, isSuperAdminOrBackoffice, cvStorageController.downloadCVZip);

/**
 * @route   GET /api/admin/cv-storages/:id/snapshots
 * @desc    List CV snapshots (dateTime folders)
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.get('/:id/snapshots', authenticate, isSuperAdminOrBackoffice, cvStorageController.getCVSnapshots);

/**
 * @route   POST /api/admin/cv-storages/:id/rollback
 * @desc    Rollback CV to a previous snapshot (creates new snapshot from selected one)
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.post('/:id/rollback', authenticate, isSuperAdminOrBackoffice, cvStorageController.rollbackCV);

/**
 * @route   DELETE /api/admin/cv-storages/:id/file
 * @desc    Xóa file CV
 * @access  Private (Super Admin or Admin Backoffice)
 */
router.delete('/:id/file', authenticate, isSuperAdminOrBackoffice, cvStorageController.deleteCVFile);

export default router;

