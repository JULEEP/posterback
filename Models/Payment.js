import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    merchantOrderId: {
      type: String,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    amount: {
      type: Number,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["INITIATED", "PENDING", "COMPLETED", "FAILED", "CANCELLED"],
      default: "INITIATED",
    },
    paymentResponse: {
      type: Object,
    },
    transactionId: {
  type: String,
},
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Define and export the model
const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
