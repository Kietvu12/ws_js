import express from 'express';
import { campaignController } from '../controllers/collaborator/campaignController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

/**
 * @route   GET /api/ctv/campaigns
 * @desc    Get list of campaigns (CTV)
 * @access  Private (CTV)
 */
router.get('/', authenticateCTV, campaignController.getCampaigns);

/**
 * @route   GET /api/ctv/campaigns/:id
 * @desc    Get campaign by ID (CTV)
 * @access  Private (CTV)
 */
router.get('/:id', authenticateCTV, campaignController.getCampaignById);

export default router;

