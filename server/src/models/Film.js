import mongoose from 'mongoose';

const filmSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['positive', 'negative', 'emulsion'],
    default: 'positive'
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'in_use', 'damaged', 'expired'],
    default: 'available'
  },
  manufacturer: {
    type: String,
    trim: true
  },
  batchNumber: {
    type: String,
    trim: true
  },
  expiryDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  workOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MfgWorkOrder'
  },
  fileUrl: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
filmSchema.index({ status: 1, type: 1 });

export default mongoose.model('Film', filmSchema);