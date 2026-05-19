import { Router } from 'express';
import { listPostCategories } from '../controllers/public/publicPostCategoriesController.js';

const router = Router();

router.get('/', listPostCategories);

export default router;
