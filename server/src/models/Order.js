import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema(
  {
    part: String,
    name: String,
    mfr: String,
    price: Number,
    quantity: Number,
    img: String,
  },
  { _id: false }
);

const AmountsSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
  { _id: false }
);

const ShippingSchema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    phone: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  { _id: false }
);

const PaymentProofSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['not_submitted', 'submitted', 'approved', 'rejected'], default: 'not_submitted' },
    proofFile: {
      originalName: String,
      filename: String,
      mimeType: String,
      size: Number,
      url: String,
    },
    submittedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    reviewNotes: String,
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    items: { type: [OrderItemSchema], default: [] },
    amounts: { type: AmountsSchema, required: true },
    shipping: { type: ShippingSchema, required: true },
    status: { type: String, enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'upi', 'card', 'cash', 'other'],
      default: 'bank_transfer',
    },
    paymentProof: { type: PaymentProofSchema, default: {} },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });

export default mongoose.model('Order', OrderSchema);

