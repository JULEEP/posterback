import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', },
  message: { type: String, default: '' },
  images: [{ type: String }], // URLs from Cloudinary
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Chat', chatSchema);
