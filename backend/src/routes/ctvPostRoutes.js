import express from 'express';
import { postController } from '../controllers/collaborator/postController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

/**
 * @route   GET /api/ctv/posts
 * @desc    Get list of posts (CTV)
 * @access  Private (CTV)
 */
router.get('/', authenticateCTV, postController.getPosts);

/**
 * @route   GET /api/ctv/posts/:id
 * @desc    Get post by ID (CTV)
 * @access  Private (CTV)
 */
router.get('/:id', authenticateCTV, postController.getPostById);

export default router;

