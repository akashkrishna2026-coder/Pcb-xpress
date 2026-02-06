import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD format for daily tracking
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    loginId: { type: String, trim: true, default: '' },
    // When a login maps to multiple operators (e.g., "Ajesh & Ashik"), this stores the selected individual
    operatorName: { type: String, trim: true, default: '' },
    mfgRole: { type: String, trim: true, default: '' },
    workCenter: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: '' },
    loggedInAt: { type: Date, default: Date.now, index: true },
    logoutAt: { type: Date, default: null },
    ip: { type: String, trim: true, default: '' },
    userAgent: { type: String, trim: true, default: '' },
    loginCount: { type: Number, default: 1 }, // Track how many times logged in that day
    breaks: [
      {
        at: { type: Date, default: Date.now },
        type: { type: String, enum: ['start', 'end'], required: true },
        note: { type: String, trim: true, default: '' },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    movements: [
      {
        at: { type: Date, default: Date.now },
        type: { type: String, enum: ['out', 'in'], required: true },
        note: { type: String, trim: true, default: '' },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true, collection: 'attendence' }
);

// Compound index for efficient daily lookups per user
AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ role: 1, loggedInAt: -1 });

export default mongoose.model('Attendance', AttendanceSchema);
