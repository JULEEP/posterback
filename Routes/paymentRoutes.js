// routes/paymentRoutes.js
import express from 'express';
import { payWithRazorpay, phonePeCallbackHandler, checkPhonePeStatus, getAllPayments } from '../Controller/paymentController.js';

const router = express.Router();

router.post('/phonepe', payWithRazorpay);
router.post('/phonepe/callback', phonePeCallbackHandler);
router.get('/status/:merchantOrderId', checkPhonePeStatus);
router.get('/payments', getAllPayments);

export default router;
