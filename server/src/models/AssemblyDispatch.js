import mongoose from 'mongoose';

const AssemblyDispatchItemSchema = new mongoose.Schema(
  {
    part: String,
    name: String,
    description: String,
    quantity: { type: Number, default: 0 },
    serialNumbers: { type: [String], default: [] },
    batchNumbers: { type: [String], default: [] },
    assemblyType: {
      type: String,
      enum: ['reflow', 'store', '3d_printing'],
      required: true,
    },
  },
  { _id: false }
);

const AssemblyShippingDetailsSchema = new mongoose.Schema(
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

const AssemblyDispatchSchema = new mongoose.Schema(
  {
    dispatchNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'AssemblyMfgWorkOrder', required: true, index: true },
    workOrderNumber: { type: String, required: true, trim: true },
    customer: { type: String, trim: true, index: true },
    product: { type: String, trim: true },
    quantity: { type: Number, default: 0 },
    items: { type: [AssemblyDispatchItemSchema], default: [] },
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
    shippingDetails: { type: AssemblyShippingDetailsSchema, default: () => ({}) },
    packingInstructions: { type: String, trim: true },
    qualityCheck: {
      passed: { type: Boolean, default: false },
      checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      checkedAt: Date,
      notes: { type: String, trim: true },
    },
    adminReview: {
      reviewed: { type: Boolean, default: false },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      approved: { type: Boolean, default: false },
      notes: { type: String, trim: true },
    },
    documents: {
      invoice: { type: String }, // URL to invoice
      packingList: { type: String }, // URL to packing list
      certificateOfConformance: { type: String }, // URL to CoC
      testReports: { type: [String], default: [] }, // URLs to test reports
      assemblyInstructions: { type: String }, // URL to assembly instructions
    },
    notes: { type: String, trim: true },
    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    shippedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

AssemblyDispatchSchema.index({ dispatchNumber: 1 });
AssemblyDispatchSchema.index({ status: 1, priority: -1 });
AssemblyDispatchSchema.index({ dispatchDate: -1 });
AssemblyDispatchSchema.index({ 'shippingDetails.trackingNumber': 1 });

export default mongoose.model('AssemblyDispatch', AssemblyDispatchSchema);