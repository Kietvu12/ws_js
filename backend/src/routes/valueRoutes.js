import express from 'express';
import { valueController } from '../controllers/admin/valueController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/values
 * @desc    Get list of values
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, valueController.getValues);

/**
 * @route   GET /api/admin/values/by-type/:typeId
 * @desc    Get all values by type
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/by-type/:typeId', authenticate, isSuperAdminOrBackoffice, valueController.getValuesByType);

/**
 * @route   GET /api/admin/values/:id
 * @desc    Get value by ID
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, valueController.getValueById);

/**
 * @route   POST /api/admin/values
 * @desc    Create new value
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, valueController.createValue);

/**
 * @route   PUT /api/admin/values/:id
 * @desc    Update value
 * @access  Private (Super Admin, Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, valueController.updateValue);

/**
 * @route   DELETE /api/admin/values/:id
 * @desc    Delete value (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, valueController.deleteValue);

export default router;

