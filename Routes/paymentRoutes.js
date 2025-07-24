// routes/paymentRoutes.js
import express from 'express';
import { payWithRazorpay, phonePeCallbackHandler, checkPhonePeStatus } from '../Controller/paymentController.js';

const router = express.Router();

router.post('/phonepe', payWithRazorpay);
router.post('/phonepe/callback', phonePeCallbackHandler);
router.get('/status/:merchantOrderId', checkPhonePeStatus);

export default router;
