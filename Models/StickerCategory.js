import mongoose from "mongoose";

const stickerCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    image: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const StickerCategory = mongoose.model("StickerCategory", stickerCategorySchema);

export default StickerCategory;