import mongoose from 'mongoose';

const walletRedemptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  amount: {
    type: Number,
  },
  accountHolderName: {
    type: String,
  },
  accountNumber: {
    type: String,
  },
  ifscCode: {
    type: String,
  },
  bankName: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Rejected'],
    default: 'Pending'
  },
  upiId: { type: String },  // Add UPI ID field
}, {
  timestamps: true
});

const WalletRedemption = mongoose.model('WalletRedemption', walletRedemptionSchema);
export default WalletRedemption;
