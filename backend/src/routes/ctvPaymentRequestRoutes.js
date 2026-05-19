import express from 'express';
import { paymentRequestController } from '../controllers/collaborator/paymentRequestController.js';
import { authenticateCTV } from '../middleware/ctvAuth.js';

const router = express.Router();

/**
 * @route   GET /api/ctv/payment-requests
 * @desc    Get list of payment requests (only own requests)
 * @access  Private (CTV)
 */
router.get('/', authenticateCTV, paymentRequestController.getPaymentRequests);

/**
 * @route   GET /api/ctv/payment-requests/:id
 * @desc    Get payment request by ID (only own request)
 * @access  Private (CTV)
 */
router.get('/:id', authenticateCTV, paymentRequestController.getPaymentRequestById);

/**
 * @route   POST /api/ctv/payment-requests
 * @desc    Create new payment request
 * @access  Private (CTV)
 */
router.post('/', authenticateCTV, paymentRequestController.createPaymentRequest);

/**
 * @route   PUT /api/ctv/payment-requests/:id
 * @desc    Update payment request (only own request, only if status = 0)
 * @access  Private (CTV)
 */
router.put('/:id', authenticateCTV, paymentRequestController.updatePaymentRequest);

/**
 * @route   DELETE /api/ctv/payment-requests/:id
 * @desc    Delete payment request (only own request, only if status = 0)
 * @access  Private (CTV)
 */
router.delete('/:id', authenticateCTV, paymentRequestController.deletePaymentRequest);

export default router;

