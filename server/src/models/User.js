import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'mfg', 'sales', 'customer'], default: 'user', index: true },
    loginId: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    mfgRole: { type: String, trim: true, default: '' },
    workCenter: { type: String, trim: true, default: '' },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: { type: Boolean, default: true },
    // Optional business information
    gstNo: { type: String, trim: true, default: '', maxlength: 15 },
    phone: { type: String, trim: true, default: '', maxlength: 15 },
    department: { type: String, trim: true, default: '' },
    experience: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    company: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    // Sales specific fields
    gtInfo: {
      gtNumber: { type: String, trim: true, default: '' },
      issuedDate: { type: Date, default: null },
      issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
    },
    salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    priority: { type: String, enum: ['high', 'normal', 'low'], default: 'normal' },
    source: { type: String, enum: ['website', 'phone', 'office_visit', 'email', 'quote', 'signup', 'referral', 'other'], default: 'website' },
    visitHistory: [{
      visitDate: { type: Date, required: true },
      visitType: { type: String, trim: true, default: '' },
      purpose: { type: String, trim: true, default: '' },
      outcome: { type: String, trim: true, default: '' },
      nextFollowup: { type: Date, default: null },
      notes: { type: String, trim: true, default: '' },
      salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      createdAt: { type: Date, default: Date.now }
    }],
    lastVisit: { type: Date, default: null },
    // Login timing and history
    lastLogin: { type: Date, default: null },
    loginHistory: [{
      at: { type: Date, required: true },
      ip: { type: String, trim: true, default: '' },
      userAgent: { type: String, trim: true, default: '' }
    }],
    // Password reset OTP (one-time password) support
    resetOtpHash: { type: String, default: null },
    resetOtpExpires: { type: Date, default: null },
    resetOtpAttempts: { type: Number, default: 0 },
    metadata: {
      type: Map,
      of: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
