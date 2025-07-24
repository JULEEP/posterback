import mongoose from 'mongoose';

const contactUsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model, assuming you're linking it to a User
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt fields
  }
);

const ContactUs = mongoose.model('ContactUs', contactUsSchema);

export default ContactUs;
