import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['order', 'quote', 'refund'],
      required: true,
      index: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    referenceModel: {
      type: String,
      enum: ['Order', 'Quote'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'upi', 'card', 'cash', 'other'],
      default: 'bank_transfer',
    },
    paymentProof: {
      status: {
        type: String,
        enum: ['not_submitted', 'submitted', 'approved', 'rejected'],
        default: 'not_submitted',
      },
      submittedAt: Date,
      approvedAt: Date,
      rejectedAt: Date,
      rejectionReason: String,
      proofFile: {
        originalName: String,
        filename: String,
        mimeType: String,
        size: Number,
        url: String,
      },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewNotes: String,
    },
    refundDetails: {
      reason: String,
      processedAt: Date,
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      refundAmount: Number,
      refundMethod: String,
      notes: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    metadata: {
      service: String, // 'pcb', 'pcb_assembly', '3dprinting', etc.
      orderNumber: String,
      quoteNumber: String,
      customerEmail: String,
      customerName: String,
      items: [{
        name: String,
        quantity: Number,
        price: Number,
      }],
    },
    auditTrail: [{
      action: {
        type: String,
        enum: ['created', 'status_changed', 'payment_approved', 'payment_rejected', 'refunded', 'cancelled'],
      },
      timestamp: { type: Date, default: Date.now },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      notes: String,
      oldStatus: String,
      newStatus: String,
    }],
  },
  { timestamps: true }
);

// Indexes for efficient queries
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1 });
TransactionSchema.index({ 'metadata.service': 1 });

// Pre-save middleware to add audit trail entry
TransactionSchema.pre('save', function(next) {
  if (this.isNew) {
    this.auditTrail.push({
      action: 'created',
      timestamp: new Date(),
      notes: 'Transaction created',
    });
  }
  next();
});

// Static method to create transaction from order
TransactionSchema.statics.createFromOrder = async function(order) {
  const transaction = await this.findOneAndUpdate(
    { referenceId: order._id },
    {
      $setOnInsert: {
        type: 'order',
        referenceId: order._id,
        referenceModel: 'Order',
        amount: order.amounts?.total || 0,
        currency: order.amounts?.currency || 'INR',
        status: order.status === 'Pending' ? 'pending' :
                order.status === 'Processing' ? 'completed' :
                order.status === 'Shipped' ? 'completed' :
                order.status === 'Delivered' ? 'completed' : 'cancelled',
        paymentProof: order.paymentProof || {},
        user: order.user,
        metadata: {
          service: order.metadata?.service || 'store_order',
          orderNumber: order._id.toString(),
          customerEmail: order.shipping?.email,
          customerName: order.shipping?.fullName,
          items: order.items?.map(item => ({
            name: item.name || item.part,
            quantity: item.quantity || 1,
            price: item.price || 0,
          })) || [],
        },
      },
    },
    { upsert: true, new: true }
  );
  return transaction;
};

// Static method to create transaction from quote
TransactionSchema.statics.createFromQuote = async function(quote) {
  const transaction = await this.findOneAndUpdate(
    { referenceId: quote._id },
    {
      $setOnInsert: {
        type: 'quote',
        referenceId: quote._id,
        referenceModel: 'Quote',
        amount: quote.adminQuote?.total || quote.quote?.total || 0,
        currency: quote.adminQuote?.currency || 'INR',
        status: quote.paymentProof?.status === 'approved' ? 'completed' :
                quote.paymentProof?.status === 'rejected' ? 'failed' : 'pending',
        paymentProof: quote.paymentProof || {},
        user: quote.user,
        metadata: {
          service: quote.service,
          quoteNumber: quote._id.toString(),
          customerEmail: quote.contact?.email,
          customerName: quote.contact?.name,
        },
      },
    },
    { upsert: true, new: true }
  );
  return transaction;
};

// Instance method to add audit entry
TransactionSchema.methods.addAuditEntry = function(action, user, notes, oldStatus, newStatus) {
  this.auditTrail.push({
    action,
    timestamp: new Date(),
    user,
    notes,
    oldStatus,
    newStatus,
  });
  return this.save();
};

// Instance method to process refund
TransactionSchema.methods.processRefund = async function(refundAmount, reason, processedBy, refundMethod, notes) {
  if (this.status !== 'completed') {
    throw new Error('Can only refund completed transactions');
  }

  this.status = 'refunded';
  this.refundDetails = {
    reason,
    processedAt: new Date(),
    processedBy,
    refundAmount: refundAmount || this.amount,
    refundMethod,
    notes,
  };

  await this.addAuditEntry('refunded', processedBy, notes, 'completed', 'refunded');
  return this.save();
};

export default mongoose.model('Transaction', TransactionSchema);
