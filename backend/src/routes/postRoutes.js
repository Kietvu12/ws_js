import express from 'express';
import { postController } from '../controllers/admin/postController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';
import { uploadPostImage as uploadPostImageMw } from '../middleware/postUploadMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/admin/posts
 * @desc    Get list of posts
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, postController.getPosts);

/**
 * @route   POST /api/admin/posts/upload-temp
 * @desc    Upload image when creating new post (no id yet). S3: posts/temp/
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/upload-temp', authenticate, isSuperAdminOrBackoffice, uploadPostImageMw, postController.uploadPostTempImage);

/**
 * @route   POST /api/admin/posts/upload-thumbnail-temp
 * @desc    Upload thumbnail when creating new post (no id yet). S3: posts/temp/thumb_*
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/upload-thumbnail-temp', authenticate, isSuperAdminOrBackoffice, uploadPostImageMw, postController.uploadPostTempThumbnail);

/**
 * @route   GET /api/admin/posts/:id
 * @desc    Get post by ID
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, postController.getPostById);

/**
 * @route   POST /api/admin/posts
 * @desc    Create new post
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, postController.createPost);

/**
 * @route   POST /api/admin/posts/:id/upload-image
 * @desc    Upload image for post. S3: posts/{id}/
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/:id/upload-image', authenticate, isSuperAdminOrBackoffice, uploadPostImageMw, postController.uploadPostImage);

/**
 * @route   POST /api/admin/posts/:id/upload-thumbnail
 * @desc    Upload thumbnail for post. S3: posts/{id}/thumb_*
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/:id/upload-thumbnail', authenticate, isSuperAdminOrBackoffice, uploadPostImageMw, postController.uploadPostThumbnail);

/**
 * @route   PUT /api/admin/posts/:id
 * @desc    Update post
 * @access  Private (Super Admin, Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, postController.updatePost);

/**
 * @route   PATCH /api/admin/posts/:id/status
 * @desc    Update post status
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/:id/status', authenticate, isSuperAdminOrBackoffice, postController.updateStatus);

/**
 * @route   DELETE /api/admin/posts/:id
 * @desc    Delete post (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, postController.deletePost);

export default router;

