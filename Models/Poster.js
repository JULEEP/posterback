// models/Poster.js
import mongoose from 'mongoose';

const posterSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  categoryName: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    min: 0
  },
  images: {
    type: [String], // Array of image URLs
    default: []
  },
  description: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    enum: ['A3', 'A4', 'A5', 'Custom'],
    default: 'A4'
  },
  festivalDate: {
    type: String,
    default: null
  },
  inStock: {
    type: Boolean,
    default: true
  },
  tags: {
    type: [String],
    default: []
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
    overlays: [{
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      width: { type: Number, default: 1080 },
      height: { type: Number, default: 1080 }
    }],
    shapes: [{
      type: { type: String, enum: ['rectangle', 'circle'], },
      x: { type: Number, },
      y: { type: Number, },
      width: { type: Number },    // Only for rectangle
      height: { type: Number },   // Only for rectangle
      radius: { type: Number },   // Only for circle
      color: { type: String, default: 'rgba(0,0,0,0.5)' }
    }]
  },
  backgroundImage: {
    type: String,  // To store background image URL
    trim: true
  },
  previewImage: {
  type: String,
  trim: true
},
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Poster = mongoose.model('Poster', posterSchema);

export default Poster;
