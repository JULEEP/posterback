import mongoose from "mongoose";

const celebrationSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    video_url: {
      type: String,
      default: "",
    },
    duration_seconds: {
      type: Number,
      default: 0,
    },
    loop: {
      type: Boolean,
      default: true,
    },
    gradient_colors: {
      type: [String],
      default: ["#FF6B6B", "#4ECDC4"],
    },
    section_bg_color: {
      type: String,
      default: "#FFF5F5",
    },
    primary_text_color: {
      type: String,
      default: "#1A1A1A",
    },
    secondary_text_color: {
      type: String,
      default: "#888888",
    },
    accent_color: {
      type: String,
      default: "#FF6B6B",
    },
  },
  { timestamps: true }
);

const Celebration = mongoose.model("Celebration", celebrationSchema);

export default Celebration;