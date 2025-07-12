import {
  StandardCheckoutClient,
  Env,
  StandardCheckoutPayRequest
} from 'pg-sdk-node';

import Plan from '../Models/Plan.js';
import User from '../Models/User.js';
import Payment from '../Models/Payment.js';
import { v4 as uuidv4 } from 'uuid';

// ✅ Init: PhonePe client with UAT (test) credentials
const client = StandardCheckoutClient.getInstance(
  "TEST-M22HFU8UDDBYR_25051", // ✅ Test Merchant ID
  "MjcxNTAxYjAtZjA1Ny00YmQwLTg3YTktMGIyOTNmMjIzNmMz", // ✅ Test Salt Key
  1, // ✅ Salt Index
  Env.UAT // ✅ Use Test Mode
);

export const payWithPhonePe = async (req, res) => {
  try {
    const { userId, planId } = req.body;

    // ✅ Validate user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Validate plan
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // 💰 Apply referral discount if user was referred
    let offerPrice = plan.offerPrice;
    if (user.referredBy) {
      offerPrice = Math.max(offerPrice - 100, 0); // Prevent negative amounts
    }

    const amount = offerPrice * 100; // Convert to paise
    const merchantOrderId = `txn_${uuidv4()}`;

    // ✅ Prepare PhonePe payment request
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amount)
      .build();

    const response = await client.pay(request);

    // 💾 Save payment record
    await Payment.create({
      merchantOrderId,
      userId: user._id,
      plan: plan._id,
      amount,
      currency: "INR",
      status: "INITIATED",
      paymentResponse: response,
    });

    // 📅 Calculate subscription duration
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    // 👇 Push the plan into the user's subscription array
    user.subscribedPlans.push({
      planId: plan._id,
      name: plan.name,
      originalPrice: plan.originalPrice,
      offerPrice: offerPrice,
      discountPercentage: plan.discountPercentage,
      duration: plan.duration,
      startDate,
      endDate,
      isPurchasedPlan: true,
    });

    await user.save();

    const formatDate = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    };

    // ✅ Send success response
    res.status(200).json({
      success: true,
      message: "Payment initiated and plan added to user",
      merchantOrderId,
      response,
      amount,
      currency: "INR",
      plan: {
        id: plan._id,
        name: plan.name,
        originalPrice: plan.originalPrice,
        offerPrice: offerPrice,
        discountPercentage: plan.discountPercentage,
        duration: plan.duration,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        isPurchasedPlan: true,
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });

  } catch (error) {
    console.error("❌ PhonePe SDK error:", error);
    res.status(500).json({
      success: false,
      message: "PhonePe payment error",
      error: error.message || "Something went wrong",
    });
  }
};


// ✅ 2. Handle Payment Callback
export const phonePeCallbackHandler = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log("📥 Callback received from PhonePe:", JSON.stringify(callbackData, null, 2));

    const { merchantOrderId, transactionId, state } = callbackData.payload || {};

    if (!merchantOrderId || !transactionId) {
      return res.status(400).json({ message: "Missing required fields in callback" });
    }

    // Extract userId from merchantOrderId (e.g., "txn_1694943091_<userId>")
    const userId = merchantOrderId.split('_').pop();

    if (state === "COMPLETED") {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Assume plan info was saved earlier — you can improve this by tracking pending orders
      const plan = await Plan.findOne(); // Fallback if no specific plan saved

      if (!plan) return res.status(404).json({ message: "Plan not found" });

      const newSubscribedPlan = {
        planId: plan._id,
        name: plan.name,
        originalPrice: plan.originalPrice,
        offerPrice: plan.offerPrice,
        discountPercentage: plan.discountPercentage,
        duration: plan.duration,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year
        transactionId,
      };

      user.subscribedPlans.push(newSubscribedPlan);
      await user.save();

      console.log("✅ Subscription activated for user:", userId);
    } else {
      console.log("❌ Payment failed or cancelled for transaction:", transactionId);
    }

    res.status(200).json({ message: "Callback handled successfully" });
  } catch (error) {
    console.error("❌ Error handling callback:", error.message);
    res.status(500).json({ message: "Callback handling failed" });
  }
};


export const checkPhonePeStatus = async (req, res) => {
 try {
    const { merchantOrderId } = req.params;

    // Find the payment and populate related user and plan
    const payment = await Payment.findOne({ merchantOrderId })
      .populate("userId", "-password") // Exclude password
      .populate("plan");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment details fetched successfully",
      payment: {
        merchantOrderId: payment.merchantOrderId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt || null,
      },
      user: {
        id: payment.userId._id,
        name: payment.userId.name,
        email: payment.userId.email,
        phone: payment.userId.phone,
      },
      plan: {
        id: payment.plan._id,
        name: payment.plan.name,
        description: payment.plan.description,
        price: payment.plan.price,
        offerPrice: payment.plan.offerPrice,
      },
    });

  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment details",
      error: error.message,
    });
  }
};
