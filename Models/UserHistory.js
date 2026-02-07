import mongoose from "mongoose";

const userHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    logoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Logo",
    },
    editedImage: {
      type: String, // Cloudinary URL
    },
  },
  { timestamps: true }
);

const UserHistory = mongoose.model("UserHistory", userHistorySchema);

export default UserHistory;
