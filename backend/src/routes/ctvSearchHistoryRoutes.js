import express from 'express';
import { searchHistoryController } from '../controllers/collaborator/searchHistoryController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

/**
 * @route   GET /api/ctv/search-history
 * @desc    Get list of search history
 * @access  Private (CTV)
 */
router.get('/', authenticateCTV, searchHistoryController.getSearchHistory);

/**
 * @route   POST /api/ctv/search-history
 * @desc    Save search history
 * @access  Private (CTV)
 */
router.post('/', authenticateCTV, searchHistoryController.saveSearchHistory);

/**
 * @route   DELETE /api/ctv/search-history
 * @desc    Clear all search history
 * @access  Private (CTV)
 */
router.delete('/', authenticateCTV, searchHistoryController.clearSearchHistory);

/**
 * @route   DELETE /api/ctv/search-history/:id
 * @desc    Delete search history by ID
 * @access  Private (CTV)
 */
router.delete('/:id', authenticateCTV, searchHistoryController.deleteSearchHistory);

export default router;

