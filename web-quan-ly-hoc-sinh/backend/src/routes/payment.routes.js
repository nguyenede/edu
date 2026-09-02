const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const validation = require('../middlewares/validation.middleware');

router.get('/', protect, authorize('admin', 'student', 'parent'), validation.pagination, validation.handleValidation, paymentController.getPayments);
router.post('/', protect, authorize('admin'), validation.payment, paymentController.createPayment);
router.put('/:id/pay', protect, authorize('admin'), ...validation.idParam(), paymentController.markPaid);

module.exports = router;
