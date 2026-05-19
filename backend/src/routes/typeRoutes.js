import express from 'express';
import { typeController } from '../controllers/admin/typeController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/types
 * @desc    Get list of types
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, typeController.getTypes);

/**
 * @route   GET /api/admin/types/all
 * @desc    Get all types (for dropdowns)
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/all', authenticate, isSuperAdminOrBackoffice, typeController.getAllTypes);

/**
 * @route   GET /api/admin/types/:id
 * @desc    Get type by ID
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, typeController.getTypeById);

/**
 * @route   POST /api/admin/types
 * @desc    Create new type
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, typeController.createType);

/**
 * @route   PUT /api/admin/types/:id
 * @desc    Update type
 * @access  Private (Super Admin, Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, typeController.updateType);

/**
 * @route   DELETE /api/admin/types/:id
 * @desc    Delete type (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, typeController.deleteType);

export default router;

