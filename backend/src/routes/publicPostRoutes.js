import { Router } from 'express';
import { postController } from '../controllers/collaborator/postController.js';

const router = Router();

/**
 * Public posts (no auth) - only published posts
 * @route   GET /api/public/posts
 * @route   GET /api/public/posts/:id
 */
router.get('/', postController.getPosts);
router.get('/:id', postController.getPostById);

export default router;
