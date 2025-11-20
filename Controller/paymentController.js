import {
  StandardCheckoutClient,
  Env,
  StandardCheckoutPayRequest
} from 'pg-sdk-node';

import Plan from '../Models/Plan.js';
import User from '../Models/User.js';
import Payment from '../Models/Payment.js';
import { v4 as uuidv4 } from 'uuid';
import Razorpay from 'razorpay';
import iap from "apple-iap";


// const razorpay = new Razorpay({
//  key_id: 'rzp_live_QbfofYHBZgtn7V',
//  key_secret: 'pPCBFrLelXZZ1d6lrT41wVkR',
// });

const razorpay = new Razorpay({
  key_id:"rzp_live_RTmw5UsY3ffNxq",
  key_secret:"KCaEBOsYRHE0GyHIS1SN8p5c",
});



// const razorpay = new Razorpay({
//  key_id: 'rzp_test_BxtRNvflG06PTV',
//  key_secret: 'RecEtdcenmR7Lm4AIEwo4KFr',
// });

export const payWithRazorpay = async (req, res) => {
  try {
    const { userId, planId, transactionId } = req.body;

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Validate plan
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    // Determine amount
    let offerPrice = plan.offerPrice !== undefined && plan.offerPrice !== null
      ? plan.offerPrice
      : plan.originalPrice ?? 0;

    const amount = Number(offerPrice);
    if (isNaN(amount) || amount < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount for payment. Must be at least ₹1.",
      });
    }

    console.log("Final computed amount (₹):", amount);

    const merchantOrderId = `txn_${uuidv4()}`;

    let paymentInfo = await razorpay.payments.fetch(transactionId);
    if (!paymentInfo) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    // Capture if not captured
    if (
      paymentInfo.status === "authorized" ||
      paymentInfo.status === "created" ||
      paymentInfo.status === "failed"
    ) {
      try {
        await razorpay.payments.capture(transactionId, Math.round(amount * 100), "INR");
        paymentInfo = await razorpay.payments.fetch(transactionId);
      } catch (err) {
        console.error("Payment capture failed:", err);
        return res.status(500).json({ success: false, message: "Payment capture failed" });
      }
    }

    // Warn if refunded
    if (paymentInfo.status === "refunded") {
      console.warn("Warning: Payment has been refunded but proceeding with plan activation.");
    }

    // If not captured
    if (paymentInfo.status !== "captured") {
      return res.status(400).json({
        success: false,
        message: `Payment not captured. Status: ${paymentInfo.status}`,
      });
    }

    // Save payment record
    await Payment.create({
      merchantOrderId,
      userId: user._id,
      plan: plan._id,
      amount: Math.round(amount * 100),
      currency: "INR",
      status: "captured",
      paymentResponse: paymentInfo,
      transactionId,
    });

    // Set subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Add plan to user
    user.subscribedPlans.push({
      planId: plan._id,
      name: plan.name,
      originalPrice: plan.originalPrice,
      offerPrice,
      discountPercentage: plan.discountPercentage,
      duration: plan.duration,
      startDate,
      endDate,
      isPurchasedPlan: true,
    });

    await user.save();

    // ✅ Referral wallet credit
    if (user.referredBy) {
      const referrer = await User.findById(user.referredBy);
      if (referrer) {
        referrer.wallet = (referrer.wallet || 0) + 200;
        await referrer.save();
      }
    }

    // Date formatting helper
    const formatDate = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    };

    // ✅ Final response
    res.status(200).json({
      success: true,
      message: "Payment successful and plan added to user",
      merchantOrderId,
      transactionId,
      amount,
      currency: "INR",
      plan: {
        id: plan._id,
        name: plan.name,
        originalPrice: plan.originalPrice,
        offerPrice,
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
    console.error("Razorpay payment error:", error);
    res.status(500).json({
      success: false,
      message: "Razorpay payment failed",
      error: error.message || "Something went wrong",
    });
  }
};


export const purchasePlanSimple = async (req, res) => {
  try {
    const { userId, planId } = req.body;

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Validate plan
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    // Set subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1-year duration (adjust if needed)

    // Add plan to user
    user.subscribedPlans.push({
      planId: plan._id,
      name: plan.name,
      originalPrice: plan.originalPrice,
      offerPrice: plan.offerPrice ?? plan.originalPrice,
      discountPercentage: plan.discountPercentage,
      duration: plan.duration,
      startDate,
      endDate,
      isPurchasedPlan: true,
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Plan purchased successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      plan: {
        id: plan._id,
        name: plan.name,
        originalPrice: plan.originalPrice,
        offerPrice: plan.offerPrice ?? plan.originalPrice,
        discountPercentage: plan.discountPercentage,
        duration: plan.duration,
        startDate,
        endDate,
        isPurchasedPlan: true,
      },
    });

  } catch (error) {
    console.error("Purchase plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to purchase plan",
      error: error.message,
    });
  }
};


export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'name email phone')    // user ke selected fields populate karenge
      .populate('plan', 'name originalPrice offerPrice duration') // plan ke kuch fields bhi populate karenge
      .sort({ createdAt: -1 });                   // recent payments pehle

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("❌ Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
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




export const payWithApple = async (req, res) => {
  try {
    const { userId, planId, receiptData, productId } = req.body;

    // Validate fields
    if (!userId || !planId || !receiptData || !productId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Validate plan
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

    // Store productId in plan if missing
    if (!plan.appleProductId) {
      plan.appleProductId = productId;
      await plan.save();
    }

    // 1️⃣ Verify receipt with Apple
    const validationResponse = await iap.validate(iap.APPLE, receiptData);
    const isValid = iap.isValidated(validationResponse);

    if (!isValid)
      return res.status(400).json({ success: false, message: "Invalid Apple receipt" });

    // 2️⃣ Extract productId from receipt
    const purchasedProductId =
      validationResponse?.receipt?.in_app?.[0]?.product_id;

    if (purchasedProductId !== productId) {
      return res.status(400).json({
        success: false,
        message: "ProductId mismatch"
      });
    }

    const transactionId = validationResponse.receipt.in_app[0].transaction_id;
    const expiresMs = validationResponse.receipt.in_app[0].expires_date_ms;

    // 3️⃣ Save payment
    await Payment.create({
      merchantOrderId: "apple_" + uuidv4(),
      transactionId,
      userId,
      plan: planId,
      amount: plan.offerPrice ?? plan.originalPrice ?? 0,
      currency: "INR",
      status: "captured",
      paymentResponse: validationResponse,
      paidAt: new Date(),
    });

    // 4️⃣ Activate subscription
    const startDate = new Date();
    const endDate = expiresMs
      ? new Date(parseInt(expiresMs))
      : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    user.subscribedPlans.push({
      planId,
      name: plan.name,
      startDate,
      endDate,
      isPurchasedPlan: true,
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Subscription activated",
      subscription: { planId, name: plan.name, startDate, endDate },
    });

  } catch (err) {
    console.error("Apple purchase error:", err);
    return res.status(500).json({
      success: false,
      message: "Apple payment failed",
      error: err.message,
    });
  }
};



export const handleAppleWebhook = async (req, res) => {
  try {
    const notification = req.body;

    console.log("📩 Apple Webhook:", notification.notification_type);

    const latest = notification.unified_receipt?.latest_receipt_info?.[0];
    if (!latest) return res.status(400).send("Invalid payload");

    const productId = latest.product_id;
    const userId = latest.app_account_token; // userId from iOS
    const expiresDate = new Date(parseInt(latest.expires_date_ms));

    if (!userId) return res.status(200).send("No userId in webhook");

    const user = await User.findById(userId);
    if (!user) return res.status(200).send("User not found");

    // Find plan in DB by productId
    const plan = await Plan.findOne({ appleProductId: productId });
    if (!plan) return res.status(200).send("Plan not found");

    // Find subscription in user
    const index = user.subscribedPlans.findIndex(
      (p) => p.planId.toString() === plan._id.toString()
    );

    if (index === -1) return res.status(200).send("Plan not found for user");

    switch (notification.notification_type) {
      
      case "DID_RENEW":
      case "RENEWAL":
      case "INTERACTIVE_RENEWAL":
        user.subscribedPlans[index].endDate = expiresDate;
        user.subscribedPlans[index].isPurchasedPlan = true;
        break;

      case "DID_FAIL_TO_RENEW":
      case "BILLING_RETRY":
        user.subscribedPlans[index].isPurchasedPlan = false;
        break;

      case "CANCEL":
      case "REFUND":
      case "EXPIRED":
        user.subscribedPlans[index].isPurchasedPlan = false;
        break;

      default:
        console.log("Unhandled notification:", notification.notification_type);
    }

    await user.save();
    return res.status(200).send("OK");

  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).send("Error");
  }
};
