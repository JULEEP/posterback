import mongoose from 'mongoose';

const PosterCanvasSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    mobile: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      trim: true
    },
    textSettings: {
      type: mongoose.Schema.Types.Mixed,  // To store the JSON for text settings
      default: {}
    },
    overlaySettings: {
      type: mongoose.Schema.Types.Mixed,  // To store the JSON for overlay settings
      default: {}
    },
    images: {
      type: [String],
      default: []
    },
    backgroundImage: {
      type: String,  // New field to store background image URL
      trim: true
    },
    categoryName: {
      type: String,
      trim: true
    },
    price: {
      type: Number
    },
    description: {
      type: String
    },
    size: {
      type: String
    },
    festivalDate: {
      type: Date
    },
    inStock: {
      type: Boolean,
      default: true
    },
    tags: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const PosterCanvas = mongoose.model('PosterCanvas', PosterCanvasSchema);

export default PosterCanvas;
