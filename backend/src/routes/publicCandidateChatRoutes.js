import express from 'express';
import { publicCandidateChatController } from '../controllers/public/publicCandidateChatController.js';

const router = express.Router();

router.post('/sessions', publicCandidateChatController.ensureSession);
router.get('/messages', publicCandidateChatController.getMessages);
router.post('/messages', publicCandidateChatController.postMessage);
router.get('/stream', publicCandidateChatController.stream);

export default router;
