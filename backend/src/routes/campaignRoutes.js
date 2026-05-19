import express from 'express';
import { campaignController } from '../controllers/admin/campaignController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';
import { uploadPostImage as uploadCoverImage } from '../middleware/postUploadMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/admin/campaigns
 * @desc    Get list of campaigns
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, campaignController.getCampaigns);

/**
 * @route   POST /api/admin/campaigns/:id/upload-cover
 * @desc    Upload campaign cover image (S3 prefix campaign/)
 * @access  Private (Super Admin, Backoffice)
 */
router.post(
  '/:id/upload-cover',
  authenticate,
  isSuperAdminOrBackoffice,
  uploadCoverImage,
  campaignController.uploadCover
);

/**
 * @route   GET /api/admin/campaigns/:id
 * @desc    Get campaign by ID
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, campaignController.getCampaignById);

/**
 * @route   POST /api/admin/campaigns
 * @desc    Create new campaign
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, campaignController.createCampaign);

/**
 * @route   PUT /api/admin/campaigns/:id
 * @desc    Update campaign
 * @access  Private (Super Admin, Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, campaignController.updateCampaign);

/**
 * @route   PATCH /api/admin/campaigns/:id/status
 * @desc    Update campaign status
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/:id/status', authenticate, isSuperAdminOrBackoffice, campaignController.updateStatus);

/**
 * @route   DELETE /api/admin/campaigns/:id
 * @desc    Delete campaign (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, campaignController.deleteCampaign);

export default router;

