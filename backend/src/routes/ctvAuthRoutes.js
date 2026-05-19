import express from 'express';
import multer from 'multer';
import { collaboratorAuthController } from '../controllers/collaborator/collaboratorAuthController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * @route   POST /api/ctv/auth/register
 * @desc    Đăng ký tài khoản CTV mới
 * @access  Public
 */
router.post('/register', upload.single('businessLicenseFile'), collaboratorAuthController.register);

/**
 * @route   GET /api/ctv/auth/verify-email
 * @desc    Xác thực email CTV và tự động duyệt tài khoản
 * @access  Public
 */
router.get('/verify-email', collaboratorAuthController.verifyEmail);

/**
 * @route   POST /api/ctv/auth/login
 * @desc    Đăng nhập CTV
 * @access  Public
 */
router.post('/login', collaboratorAuthController.login);

/**
 * @route   POST /api/ctv/auth/forgot-password
 * @desc    Gửi email đặt lại mật khẩu
 * @access  Public
 */
router.post('/forgot-password', collaboratorAuthController.forgotPassword);

/**
 * @route   POST /api/ctv/auth/reset-password
 * @desc    Đặt lại mật khẩu bằng token
 * @access  Public
 */
router.post('/reset-password', collaboratorAuthController.resetPassword);

/**
 * @route   GET /api/ctv/auth/me
 * @desc    Lấy thông tin CTV hiện tại
 * @access  Private (CTV)
 */
router.get('/me', authenticateCTV, collaboratorAuthController.getMe);

/**
 * @route   PUT /api/ctv/auth/me
 * @desc    Cập nhật thông tin cá nhân CTV (chỉ các trường được phép)
 * @access  Private (CTV)
 */
router.put('/me', authenticateCTV, collaboratorAuthController.updateMe);

/**
 * @route   PUT /api/ctv/auth/me/business-license
 * @desc    Upload / thay thế giấy phép kinh doanh CTV
 * @access  Private (CTV)
 */
router.put('/me/business-license', authenticateCTV, upload.single('businessLicenseFile'), collaboratorAuthController.updateBusinessLicense);

/**
 * @route   DELETE /api/ctv/auth/me/business-license
 * @desc    Xóa giấy phép kinh doanh CTV
 * @access  Private (CTV)
 */
router.delete('/me/business-license', authenticateCTV, collaboratorAuthController.deleteBusinessLicense);

/**
 * @route   POST /api/ctv/auth/logout
 * @desc    Đăng xuất CTV
 * @access  Private (CTV)
 */
router.post('/logout', authenticateCTV, collaboratorAuthController.logout);

export default router;

