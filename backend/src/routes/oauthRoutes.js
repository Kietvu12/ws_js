import express from 'express';
import { authenticateOrQueryToken } from '../middleware/auth.js';
import * as outlookOAuthController from '../controllers/admin/outlookOAuthController.js';

const router = express.Router();

// Connect: accept token from Authorization header or ?token= (for redirect from frontend)
router.get('/outlook/connect', authenticateOrQueryToken, outlookOAuthController.connect);
router.get('/outlook/callback', outlookOAuthController.callback);

export default router;