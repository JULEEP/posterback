import mongoose from 'mongoose';

const logoSettingsSchema = new mongoose.Schema({
  x: { type: Number, default: 20 },
  y: { type: Number, default: 20 },
  width: { type: Number, default: 70 },
  height: { type: Number, default: 70 },
  borderRadius: { type: Number, default: 8 },
  borderWidth: { type: Number, default: 0 },
  borderColor: { type: String, default: '#000000' },
  shape: { type: String, enum: ['rectangle', 'rounded', 'circle'], default: 'rectangle' }
}, { _id: false });

const textStyleSchema = new mongoose.Schema({
  fontSize: { type: Number, default: 14 },
  fontWeight: { type: String, default: 'normal' },
  color: { type: String, default: '#000000' },
  italic: { type: Boolean, default: false },
  underline: { type: Boolean, default: false },
  x: { type: Number, default: 50 },
  y: { type: Number, default: 100 }
}, { _id: false });

const socialLinkSchema = new mongoose.Schema({
  id: { type: String, required: true },
  platform: { type: String, default: 'website' },
  url: { type: String, default: '' },
  iconUrl: { type: String, default: '' },
  iconName: { type: String, default: '' },
  color: { type: String, default: '#6c757d' },
  x: { type: Number, default: 50 },
  y: { type: Number, default: 400 },
  iconSize: { type: Number, default: 30 },
  showUrl: { type: Boolean, default: true },
  urlColor: { type: String, default: '#666666' },
  urlFontSize: { type: Number, default: 12 }
}, { _id: false });

const designSchema = new mongoose.Schema({
  backgroundColor: { type: String, default: '#ffffff' },
  textColor: { type: String, default: '#000000' },
  accentColor: { type: String, default: '#3b82f6' },
  fontFamily: { type: String, default: 'Poppins' },
  fontSize: { type: String, default: '14' },
  showLogo: { type: Boolean, default: true },
  showQrCode: { type: Boolean, default: false },
  roundedCorners: { type: Boolean, default: true },
  shadow: { type: Boolean, default: true },
  border: { type: Boolean, default: true }
}, { _id: false });

const businessCardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  company: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  website: { type: String, default: '' },
  
  // Images
  logo: { type: String, default: '' }, // Cloudinary URL for logo
  qrCode: { type: String, default: '' }, // Cloudinary URL for QR code
  templateImage: { type: String, default: '' }, // Cloudinary URL for template
  previewImage: { type: String, default: '' }, // Cloudinary URL for final preview
  
  // Settings
  logoSettings: { type: logoSettingsSchema, default: () => ({}) },
  textStyles: {
    name: { type: textStyleSchema, default: () => ({ fontSize: 28, fontWeight: 'bold', y: 100 }) },
    title: { type: textStyleSchema, default: () => ({ fontSize: 18, y: 150 }) },
    company: { type: textStyleSchema, default: () => ({ fontSize: 16, y: 190 }) },
    email: { type: textStyleSchema, default: () => ({ fontSize: 14, y: 250 }) },
    phone: { type: textStyleSchema, default: () => ({ fontSize: 14, y: 280 }) },
    address: { type: textStyleSchema, default: () => ({ fontSize: 12, y: 310 }) },
    website: { type: textStyleSchema, default: () => ({ fontSize: 12, y: 340 }) }
  },
  
  socialLinks: { type: [socialLinkSchema], default: [] },
  design: { type: designSchema, default: () => ({}) },
  useTemplate: { type: Boolean, default: false },
  
  // User reference (if needed)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

// Add indexes for better query performance
businessCardSchema.index({ userId: 1 });
businessCardSchema.index({ createdAt: -1 });

const BusinessCard = mongoose.model('BusinessCard', businessCardSchema);

export default BusinessCard;