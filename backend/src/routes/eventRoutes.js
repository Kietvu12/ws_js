import express from 'express';
import { eventController } from '../controllers/admin/eventController.js';
import { authenticate, isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, isSuperAdminOrBackoffice, eventController.list);
router.get('/:id', authenticate, isSuperAdminOrBackoffice, eventController.getById);
router.post('/', authenticate, isSuperAdminOrBackoffice, eventController.create);
router.put('/:id', authenticate, isSuperAdminOrBackoffice, eventController.update);
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, eventController.delete);

export default router;
