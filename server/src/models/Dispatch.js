import mongoose from 'mongoose';

const DispatchItemSchema = new mongoose.Schema(
  {
    part: String,
    name: String,
    description: String,
    quantity: { type: Number, default: 0 },
    serialNumbers: { type: [String], default: [] },
    batchNumbers: { type: [String], default: [] },
  },
  { _id: false }
);

const ShippingDetailsSchema = new mongoose.Schema(
  {
    carrier: String,
    service: String,
    trackingNumber: String,
    shippingCost: { type: Number, default: 0 },
    estimatedDelivery: Date,
    actualDelivery: Date,
    shippingLabels: { type: [String], default: [] }, // URLs to shipping labels
  },
  { _id: false }
);

const DispatchSchema = new mongoose.Schema(
  {
    dispatchNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'MfgWorkOrder', required: true, index: true },
    workOrderNumber: { type: String, required: true, trim: true },
    customer: { type: String, trim: true, index: true },
    product: { type: String, trim: true },
    quantity: { type: Number, default: 0 },
    items: { type: [DispatchItemSchema], default: [] },
    status: {
      type: String,
      enum: ['pending', 'packing', 'packed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'hot'],
      default: 'normal',
      index: true,
    },
    dispatchDate: Date,
    shippedDate: Date,
    deliveredDate: Date,
    shippingDetails: { type: ShippingDetailsSchema, default: () => ({}) },
    packingInstructions: { type: String, trim: true },
    qualityCheck: {
      passed: { type: Boolean, default: false },
      checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      checkedAt: Date,
      notes: { type: String, trim: true },
    },
    documents: {
      invoice: { type: String }, // URL to invoice
      packingList: { type: String }, // URL to packing list
      certificateOfConformance: { type: String }, // URL to CoC
      testReports: { type: [String], default: [] }, // URLs to test reports
    },
    notes: { type: String, trim: true },
    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    shippedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

DispatchSchema.index({ dispatchNumber: 1 });
DispatchSchema.index({ status: 1, priority: -1 });
DispatchSchema.index({ dispatchDate: -1 });
DispatchSchema.index({ 'shippingDetails.trackingNumber': 1 });

export default mongoose.model('Dispatch', DispatchSchema);