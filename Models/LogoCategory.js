import mongoose from "mongoose";

const logoCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    image: {
      type: String,
    },
  },
  { timestamps: true }
);

const LogoCategory = mongoose.model("LogoCategory", logoCategorySchema);

export default LogoCategory;
