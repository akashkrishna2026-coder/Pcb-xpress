import mongoose from 'mongoose';

const EnquirySchema = new mongoose.Schema(
  {
    // Customer information
    customerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    customerName: { 
      type: String, 
      required: true, 
      trim: true 
    },
    email: { 
      type: String, 
      required: true, 
      trim: true, 
      lowercase: true 
    },
    phone: { 
      type: String, 
      required: true, 
      trim: true 
    },
    company: { 
      type: String, 
      trim: true, 
      default: '' 
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    gstin: {
      type: String,
      trim: true,
      default: ''
    },
    
    // Enquiry details
    subject: { 
      type: String, 
      required: true, 
      trim: true 
    },
    message: { 
      type: String, 
      required: true, 
      trim: true 
    },
    category: { 
      type: String, 
      enum: ['general', 'product', 'pricing', 'technical', 'support', 'complaint', 'other'], 
      default: 'general' 
    },
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'urgent'], 
      default: 'medium' 
    },
    
    // Status tracking
    status: { 
      type: String, 
      enum: ['pending', 'in_progress', 'resolved', 'closed'], 
      default: 'pending' 
    },
    
    // Sales representative handling
    salesRep: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    
    // Response details
    response: { 
      type: String, 
      trim: true, 
      default: '' 
    },
    respondedAt: { 
      type: Date, 
      default: null 
    },
    
    // Resolution details
    resolution: { 
      type: String, 
      trim: true, 
      default: '' 
    },
    resolvedAt: { 
      type: Date, 
      default: null 
    },
    
    // Follow-up
    nextFollowup: { 
      type: Date, 
      default: null 
    },
    followupNotes: { 
      type: String, 
      trim: true, 
      default: '' 
    },
    
    // Metadata
    source: { 
      type: String, 
      enum: ['website', 'phone', 'email', 'office_visit', 'referral', 'other'], 
      default: 'website' 
    },
    tags: [{ 
      type: String, 
      trim: true 
    }],
    notes: { 
      type: String, 
      trim: true, 
      default: '' 
    },
    
    // Additional sales fields
    expectedValue: {
      type: Number,
      default: 0
    },
    deadline: {
      type: Date,
      default: null
    },
    assignedTo: {
      type: String,
      trim: true,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }, 
  { 
    timestamps: true 
  }
);

// Index for better query performance
EnquirySchema.index({ customerId: 1 });
EnquirySchema.index({ salesRep: 1 });
EnquirySchema.index({ status: 1 });
EnquirySchema.index({ priority: 1 });
EnquirySchema.index({ createdAt: -1 });
EnquirySchema.index({ deadline: 1 });
EnquirySchema.index({ assignedTo: 1 });
EnquirySchema.index({ expectedValue: -1 });

export default mongoose.model('Enquiry', EnquirySchema);
