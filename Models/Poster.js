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
  },
   name: { type: String, },
  categoryName: { type: String, },
  festivalDate: { type: Date },
  description: { type: String },
  tags: { type: [String], default: [] },
  email: { type: String },
  mobile: { type: String },
  title: { type: String },
  posterImage: {
    url: { type: String,  },
    publicId: { type: String,}
  },
   designData: {
      // ✅ New field: Background image path or filename
bgImage: {
  url: String,
  publicId: String
},
   overlayImages: [   // array for multiple overlay images
      {
        url: String,
        publicId: String
      }
    ],
    bgImageSettings: {
      filters: {
        brightness: { type: Number, default: 100 },
        contrast: { type: Number, default: 100 },
        saturation: { type: Number, default: 100 },
        grayscale: { type: Number, default: 0 },
        blur: { type: Number, default: 0 }
      }
    },
    overlaySettings: {
      overlays: [{
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        width: { type: Number, default: 200 },
        height: { type: Number, default: 200 },
        shape: { 
          type: String, 
          enum: ['rectangle', 'rounded', 'circle', 'ellipse'],
          default: 'rectangle'
        },
        borderRadius: { type: Number, default: 0 }
      }]
    },
    textSettings: {
      nameX: { type: Number, default: 100 },
      nameY: { type: Number, default: 1040 },
      emailX: { type: Number, default: 360 },
      emailY: { type: Number, default: 1040 },
      mobileX: { type: Number, default: 770 },
      mobileY: { type: Number, default: 1040 },
      titleX: { type: Number, default: 450 },
      titleY: { type: Number, default: 50 },
      descriptionX: { type: Number, default: 50 },
      descriptionY: { type: Number, default: 200 },
      tagsX: { type: Number, default: 50 },
      tagsY: { type: Number, default: 300 }
    },
    textStyles: {
      name: {
        fontSize: { type: Number, default: 24 },
        color: { type: String, default: '#000000' },
        fontFamily: { 
          type: String, 
          enum: ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Helvetica', 'Comic Sans MS'],
          default: 'Arial'
        },
        fontWeight: { 
          type: String, 
          enum: ['normal', 'bold', 'lighter'],
          default: 'bold'
        },
        fontStyle: { 
          type: String, 
          enum: ['normal', 'italic'],
          default: 'normal'
        }
      },
      email: {
        fontSize: { type: Number, default: 18 },
        color: { type: String, default: '#000000' },
        fontFamily: { type: String, default: 'Arial' },
        fontWeight: { type: String, default: 'normal' },
        fontStyle: { type: String, default: 'normal' }
      },
      mobile: {
        fontSize: { type: Number, default: 18 },
        color: { type: String, default: '#000000' },
        fontFamily: { type: String, default: 'Arial' },
        fontWeight: { type: String, default: 'normal' },
        fontStyle: { type: String, default: 'normal' }
      },
      title: {
        fontSize: { type: Number, default: 32 },
        color: { type: String, default: '#000000' },
        fontFamily: { type: String, default: 'Arial' },
        fontWeight: { type: String, default: 'bold' },
        fontStyle: { type: String, default: 'normal' }
      },
      description: {
        fontSize: { type: Number, default: 16 },
        color: { type: String, default: '#000000' },
        fontFamily: { type: String, default: 'Arial' },
        fontWeight: { type: String, default: 'normal' },
        fontStyle: { type: String, default: 'normal' }
      },
      tags: {
        fontSize: { type: Number, default: 14 },
        color: { type: String, default: '#000000' },
        fontFamily: { type: String, default: 'Arial' },
        fontWeight: { type: String, default: 'normal' },
        fontStyle: { type: String, default: 'italic' }
      }
    },
    textVisibility: {
      name: { 
        type: String, 
        enum: ['visible', 'hidden'],
        default: 'visible'
      },
      email: { type: String, default: 'visible' },
      mobile: { type: String, default: 'visible' },
      title: { type: String, default: 'visible' },
      description: { type: String, default: 'visible' },
      tags: { type: String, default: 'visible' }
    },
    overlayImageFilters: [{
      brightness: { type: Number, default: 100 },
      contrast: { type: Number, default: 100 },
      saturation: { type: Number, default: 100 },
      grayscale: { type: Number, default: 0 },
      blur: { type: Number, default: 0 }
    }]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Poster = mongoose.model('Poster', posterSchema);

export default Poster;
