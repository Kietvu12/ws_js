import express from 'express';
import { publicCtvChatController } from '../controllers/public/publicCtvChatController.js';
import { optionalAuthenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

router.post('/sessions', optionalAuthenticateCTV, publicCtvChatController.ensureSession);
router.get('/messages', optionalAuthenticateCTV, publicCtvChatController.getMessages);
router.post('/messages', optionalAuthenticateCTV, publicCtvChatController.postMessage);
router.get('/stream', optionalAuthenticateCTV, publicCtvChatController.stream);

export default router;
