import express from 'express';
import { authenticateCTV } from '../middleware/ctvAuth.js';
import { ctvEventController } from '../controllers/ctv/eventController.js';

const router = express.Router();

router.get('/', authenticateCTV, ctvEventController.list);
router.get('/:id', authenticateCTV, ctvEventController.getById);
router.post('/:id/register', authenticateCTV, ctvEventController.register);

export default router;

