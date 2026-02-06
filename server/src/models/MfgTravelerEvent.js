import mongoose from 'mongoose';

const MfgTravelerEventSchema = new mongoose.Schema(
  {
    workOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MfgWorkOrder',
      required: true,
      index: true,
    },
    workOrderNumber: { type: String, trim: true, index: true },
    station: { type: String, trim: true, index: true },
    action: {
      type: String,
      enum: ['scan', 'release', 'hold', 'qc_pass', 'qc_fail', 'note'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'acknowledged'],
      default: 'completed',
    },
    note: { type: String, trim: true },
    metadata: {
      type: Map,
      of: String,
      default: undefined,
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    operatorLoginId: { type: String, trim: true, lowercase: true, index: true },
    operatorName: { type: String, trim: true },
    permissionsSnapshot: { type: [String], default: [] },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

MfgTravelerEventSchema.index({ workOrderNumber: 1, occurredAt: -1 });
MfgTravelerEventSchema.index({ station: 1, occurredAt: -1 });

export default mongoose.model('MfgTravelerEvent', MfgTravelerEventSchema);
