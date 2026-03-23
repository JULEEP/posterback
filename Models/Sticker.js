import mongoose from "mongoose";

const stickerSchema = new mongoose.Schema(
  {
    stickerCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StickerCategory",
    },
    image: {
      type: String,
    },
  },
  { timestamps: true }
);

const Sticker = mongoose.model("Sticker", stickerSchema);

export default Sticker;