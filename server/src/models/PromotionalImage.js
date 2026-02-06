import mongoose from 'mongoose';

const PromotionalImageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: {
      originalName: String,
      filename: String,
      mimeType: String,
      size: Number,
      url: String,
    },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    displayFrequency: { type: Number, default: 24 }, // hours between displays
    maxPopupsPerSession: { type: Number, default: 3 }, // max popups per user session
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    targetUrl: { type: String }, // optional link when clicked
    clickCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for efficient queries
PromotionalImageSchema.index({ isActive: 1, displayOrder: 1 });
PromotionalImageSchema.index({ createdAt: -1 });

export default mongoose.model('PromotionalImage', PromotionalImageSchema);