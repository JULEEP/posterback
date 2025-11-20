// routes/paymentRoutes.js
import express from 'express';
import { payWithRazorpay, phonePeCallbackHandler, checkPhonePeStatus, getAllPayments, purchasePlanSimple, payWithApple, handleAppleWebhook } from '../Controller/paymentController.js';

const router = express.Router();

router.post('/phonepe', payWithRazorpay);
router.post('/purchase-plan', purchasePlanSimple);
router.post('/phonepe/callback', phonePeCallbackHandler);
router.get('/status/:merchantOrderId', checkPhonePeStatus);
router.get('/payments', getAllPayments);

// User purchase route
router.post("/apple/pay", payWithApple);

// Apple Webhook route (must NOT have auth middleware)
router.post("/apple/webhook", express.raw({ type: "*/*" }), handleAppleWebhook);

export default router;
