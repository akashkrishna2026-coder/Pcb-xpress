import mongoose from 'mongoose';

const PaymentMethodSchema = new mongoose.Schema(
  {
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    beneficiaryName: { type: String, required: true },
    qrCode: {
      originalName: String,
      filename: String,
      mimeType: String,
      size: Number,
      url: String,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ensure only one active payment method at a time
PaymentMethodSchema.pre('save', async function (next) {
  if (this.isActive) {
    await this.constructor.updateMany({ _id: { $ne: this._id } }, { isActive: false });
  }
  next();
});

export default mongoose.model('PaymentMethod', PaymentMethodSchema);