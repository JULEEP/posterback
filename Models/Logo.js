import mongoose from 'mongoose';

const logoSchema = new mongoose.Schema({
  name: { 
    type: String, 
  },
  description: { 
    type: String, 
  },
  price: { 
    type: Number, 
  },
  image: { 
    type: String, 
  }, // Store image URL
  logoCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LogoCategory",
  }
}, { timestamps: true });

const Logo = mongoose.model('Logo', logoSchema);

export default Logo;
