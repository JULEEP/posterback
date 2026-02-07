import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema({
  videoUrl: {
    type: String,
  },
  likeCount: {
    type: Number,
    default: 0,
  },
  isLiked: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

const Reel = mongoose.model('Reel', reelSchema);

export default Reel;
