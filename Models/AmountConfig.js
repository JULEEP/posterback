import mongoose from "mongoose";

const amountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const AmountConfig = mongoose.model("AmountConfig", amountSchema);

export default AmountConfig;