import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Define the Plan Schema
const PlanSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Assuming a 'User' model exists
    },
    name: {
      type: String,
    },
    originalPrice: {
      type: Number,
    },
    offerPrice: {
      type: Number,
    },
    duration: {
        type: String, // Example: "1 Year", "6 Months", etc
      },
    discountPercentage: {
      type: Number,
    },
       appleProductId: {
      type: String,
    },
    features: {
      type: [String],
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

const Plan = model('Plan', PlanSchema);

export default Plan;
