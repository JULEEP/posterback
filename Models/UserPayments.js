import mongoose from "mongoose";

const userPaymentsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    itemName: {
      type: String,
      required: true,
      enum: ["poster", "reels", "sticker", "logo"],
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    mediaUrl: {
      type: String, // Cloudinary URL for uploaded image/video
      default: null,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    transactionId: {
      type: String, // Razorpay transaction ID
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt automatic
  }
);

const UserPayments = mongoose.model("UserPayments", userPaymentsSchema);
export default UserPayments;