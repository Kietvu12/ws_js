import { Router } from 'express';
import { registerPublicEvent } from '../controllers/public/publicEventController.js';

const router = Router();

router.post('/:id/register', registerPublicEvent);

export default router;
