import express from 'express';
import { paymentRequestController } from '../controllers/admin/paymentRequestController.js';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdminOrBackoffice } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/admin/payment-requests
 * @desc    Get list of payment requests
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/', authenticate, isSuperAdminOrBackoffice, paymentRequestController.getPaymentRequests);

/**
 * @route   GET /api/admin/payment-requests/:id
 * @desc    Get payment request by ID
 * @access  Private (Super Admin, Backoffice)
 */
router.get('/:id', authenticate, isSuperAdminOrBackoffice, paymentRequestController.getPaymentRequestById);

/**
 * @route   PATCH /api/admin/payment-requests/:id/approve
 * @desc    Approve payment request
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/:id/approve', authenticate, isSuperAdminOrBackoffice, paymentRequestController.approvePaymentRequest);

/**
 * @route   PATCH /api/admin/payment-requests/:id/reject
 * @desc    Reject payment request
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/:id/reject', authenticate, isSuperAdminOrBackoffice, paymentRequestController.rejectPaymentRequest);

/**
 * @route   PATCH /api/admin/payment-requests/:id/mark-paid
 * @desc    Mark payment request as paid
 * @access  Private (Super Admin, Backoffice)
 */
router.patch('/:id/mark-paid', authenticate, isSuperAdminOrBackoffice, paymentRequestController.markAsPaid);

/**
 * @route   PUT /api/admin/payment-requests/:id
 * @desc    Update payment request (only if pending)
 * @access  Private (Super Admin, Backoffice)
 */
router.put('/:id', authenticate, isSuperAdminOrBackoffice, paymentRequestController.updatePaymentRequest);

/**
 * @route   DELETE /api/admin/payment-requests/:id
 * @desc    Delete payment request (soft delete)
 * @access  Private (Super Admin, Backoffice)
 */
router.delete('/:id', authenticate, isSuperAdminOrBackoffice, paymentRequestController.deletePaymentRequest);

export default router;

