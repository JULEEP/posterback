import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema({
  videoUrl: {
    type: String,
  },
  likeCount: {
    type: Number,
    default: 0,
  },
    hotTop: {          // ✅ Added field
      type: Boolean,
      default: false,
    },
      thumbnailUrl: {
    type: String,
    default: null,
  },
  isLiked: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

const Reel = mongoose.model('Reel', reelSchema);

export default Reel;
