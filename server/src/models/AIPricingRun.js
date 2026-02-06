import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    url: { type: String, default: '' },
  },
  { _id: false }
);

const TotalsSchema = new mongoose.Schema(
  {
    products: { type: Number, default: 0 },
    doubled: { type: Number, default: 0 },
    normalized: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
  },
  { _id: false }
);

const ItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    productNumericId: { type: Number, default: null },
    name: { type: String, default: '' },
    basePrice: { type: Number, default: 0 },
    oldPrice: { type: Number, default: 0 },
    newPrice: { type: Number, default: 0 },
    availabilityHits: { type: Number, default: 0 },
    availabilityStatus: { type: String, enum: ['available', 'unavailable'], default: 'unavailable' },
    priceAction: { type: String, enum: ['changed', 'unchanged'], default: 'unchanged' },
    sampleUrls: { type: [String], default: [] },
  },
  { _id: false }
);

const AIPricingRunSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, index: true, unique: true },
    status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    dryRun: { type: Boolean, default: false },
    pricingRules: {
      markupUnavailable: { type: Number, default: 0.25 },
      scaleByScarcity: { type: Boolean, default: true },
      rounding: { type: String, enum: ['none', 'nearest_0.99'], default: 'nearest_0.99' },
      minPrice: { type: Number, default: 0 },
      maxPrice: { type: Number, default: 0 },
    },
    vendorsUsed: { type: [VendorSchema], default: [] },
    totals: { type: TotalsSchema, default: () => ({}) },
    items: { type: [ItemSchema], default: [] },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

const AIPricingRun = mongoose.models.AIPricingRun || mongoose.model('AIPricingRun', AIPricingRunSchema);

export default AIPricingRun;

