import express from 'express';
import { initiatePayment, handlePayMeWebhook, getPaymentStatus, retryPayment } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/initiate', initiatePayment);
router.post('/payme/webhook', handlePayMeWebhook);
router.get('/status/:order_number', getPaymentStatus);
router.post('/retry', retryPayment);

export default router;
