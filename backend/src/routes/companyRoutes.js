import express from 'express';
import { companyController } from '../controllers/admin/companyController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * Company Routes
 * Base path: /api/admin/companies
 */

// Get list of companies
router.get('/', authenticate, isSuperAdminOrBackoffice, companyController.getCompanies);

// Get company by ID
router.get('/:id', authenticate, isSuperAdminOrBackoffice, companyController.getCompanyById);

// Create new company
router.post('/', authenticate, isSuperAdminOrBackoffice, companyController.createCompany);

// Update company
router.put('/:id', authenticate, isSuperAdminOrBackoffice, companyController.updateCompany);

// Delete company
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, companyController.deleteCompany);

// Toggle company status
router.patch('/:id/toggle-status', authenticate, isSuperAdminOrBackoffice, companyController.toggleStatus);

export default router;

