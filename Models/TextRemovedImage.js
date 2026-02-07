import mongoose from "mongoose";

const textRemovedImageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Agar User model use ho raha hai
    },
    originalImageUrl: {
      type: String,
    },
    maskImageUrl: {
      type: String,
    },
    editedImageUrl: {
      type: String,
    },
    cloudinaryPublicId: {
      type: String,
    },
  },
  { timestamps: true } // createdAt & updatedAt automatically
);

export default mongoose.model("TextRemovedImage", textRemovedImageSchema);
