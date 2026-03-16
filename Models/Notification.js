import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    title: {
      type: String,
    },

    message: {
      type: String,
    }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);