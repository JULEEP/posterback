import mongoose from "mongoose";

const walletConfigSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const WalletConfig = mongoose.model("WalletConfig", walletConfigSchema);

export default WalletConfig;