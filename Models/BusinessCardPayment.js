import mongoose from "mongoose";

const BusinessCardPaymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User",},
    businessCardId: { type: mongoose.Schema.Types.ObjectId, ref: "BusinessCard", },
    mediaUrl: { type: String, },
    pdfUrl: { type: String }, // 👈 ye add karo
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    amount: { type: Number,  },
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    paidAt: { type: Date },
    transactionId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("BusinessCardPayment", BusinessCardPaymentSchema);