import express from 'express';
import { categoryController } from '../controllers/admin/categoryController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/categories
 * @desc    Get list of categories
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, categoryController.getCategories);

/**
 * @route   GET /api/admin/categories/all
 * @desc    Get all categories (for dropdowns)
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/all', authenticate, isSuperAdminOrBackoffice, categoryController.getAllCategories);

/**
 * @route   GET /api/admin/categories/:id
 * @desc    Get category by ID
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, categoryController.getCategoryById);

/**
 * @route   POST /api/admin/categories
 * @desc    Create new category
 * @access  Private (Super Admin, Backoffice)
 */
router.post('/', authenticate, isSuperAdminOrBackoffice, categoryController.createCategory);

/**
 * @route   PUT /api/admin/categories/:id
 * @desc    Update category
 * @access  Private (Super Admin, Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, categoryController.updateCategory);

/**
 * @route   DELETE /api/admin/categories/:id
 * @desc    Delete category (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, categoryController.deleteCategory);

export default router;

