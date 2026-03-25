import mongoose from 'mongoose';

const logoSchema = new mongoose.Schema({
  name: { 
    type: String,
    trim: true
  },
  image: { 
    type: String,
  },
    previewImage: {  // 👈 NEW FIELD
    type: String,
    default: ''
  },
  logoCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LogoCategory",
  },
  placeholders: {
    type: [mongoose.Schema.Types.Mixed], // 👈 FIX: Using Mixed type for flexibility
    default: []
  }
}, { 
  timestamps: true 
});

// Add index for better query performance
logoSchema.index({ logoCategoryId: 1 });
logoSchema.index({ createdAt: -1 });

const Logo = mongoose.model('Logo', logoSchema);

export default Logo;