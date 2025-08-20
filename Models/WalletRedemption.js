import mongoose from 'mongoose';

const walletRedemptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  accountHolderName: {
    type: String,
    required: true
  },
  accountNumber: {
    type: String,
    required: true
  },
  ifscCode: {
    type: String,
    required: true
  },
  bankName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Rejected'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

const WalletRedemption = mongoose.model('WalletRedemption', walletRedemptionSchema);
export default WalletRedemption;
