import mongoose from 'mongoose';

const audioSchema = new mongoose.Schema({
  audioUrl: {
    type: String,
  },
  title: {
    type: String,
    default: ""
  },
  artist: {
    type: String,
    default: ""
  },
  duration: {
    type: Number,
    default: 0
  },
  size: {
    type: Number,
    default: 0
  },
  format: {
    type: String,
    default: ""
  },
  plays: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Audio = mongoose.model('Audio', audioSchema);
export default Audio;