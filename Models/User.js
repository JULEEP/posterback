import mongoose from 'mongoose';

const { Schema } = mongoose;


// User Schema without required and trim
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    // Removed 'required' and 'trim'
  },
  email: {
    type: String,
    lowercase: true,
  },
  mobile: {
    type: String,
  },
  otp: {
    type: String,
  },
   otpExpiry: {
    type: Date, // Expiry time for OTP
    required: false,
  },
  // Added fields as strings
  dob: {
    type: String, // Date of Birth as String
  },
  marriageAnniversaryDate: {
    type: String, // Marriage Anniversary Date as String
  },
  myBookings: [{
    type: Schema.Types.ObjectId,
    ref: 'Booking', // Reference to Booking model
  }],
  referralCode: {
  type: String,
  unique: true,
  uppercase: true,
  trim: true,
},

referralPoints: {
  type: Number,
  default: 0,
},
  // Customers field with an array of customers inside the same schema
  customers: [
    {
      name: { type: String, required: false },
      email: { type: String, required: false, unique: true },
      mobile: { type: String, required: false, unique: true },
      dob: { type: Date, required: false },
      address: { type: String, required: false },
      gender: { type: String, required: false },
      anniversaryDate: { type: Date, required: false },
    }
  ],
  profileImage: {
    type: String,
    default: 'default-profile-image.jpg', // Optional default image
  },
  // other fields
  subscribedPlans: [
    {
      planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
      },
      name: String,
      originalPrice: Number,
      offerPrice: Number,
      discountPercentage: Number,
      duration: String,
      startDate: Date,
      endDate: Date,
      isPurchasedPlan: { type: Boolean, default: false }, // ✅ default false

    },
  ],
    // ✅ Wallet for referral rewards
  wallet: {
    type: Number,
    default: 0,
  },
  myBookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  myStories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story' // Referring to the Story model
  }],
   posters: [{
    type: Schema.Types.ObjectId,
    ref: 'Poster'  // This references the 'Poster' model
  }],
}, {
  timestamps: true  // CreatedAt and UpdatedAt fields automatically
});

// Create model based on schema
const User = mongoose.model('User', userSchema);

export default User;
