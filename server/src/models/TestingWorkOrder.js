import mongoose from 'mongoose';

const TestingStageStatusSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      enum: ['pending', 'in_progress', 'approved', 'blocked'],
      default: 'pending',
      index: true,
    },
    owner: { type: String, trim: true },
    notes: { type: String, trim: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    releaseTarget: { type: Date },
    reviewedAt: { type: Date },
  },
  { _id: false }
);

const TestingAttachmentSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: [
        'test_plan',
        'test_report',
        'test_data',
        'procedure',
        'calibration_certificate',
        'safety_checklist',
        'dispatch_note',
        'packing_list',
        'invoice',
        'qa_certificate',
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ['intake', 'testing', 'review', 'dispatch'],
      default: 'testing',
    },
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const TestingWorkOrderSchema = new mongoose.Schema(
  {
    woNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote', required: true, index: true },
    customer: { type: String, trim: true, index: true },
    product: { type: String, trim: true },
    requirements: { type: String, trim: true },
    testType: {
      type: String,
      enum: ['functional', 'electrical', 'burn_in', 'environmental', 'mixed'],
      required: true,
      index: true,
    },
    quantity: { type: Number, default: 0 },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'hot'],
      default: 'normal',
      index: true,
    },
    status: {
      type: String,
      enum: ['testing_intake', 'testing_execution', 'testing_review', 'testing_dispatch', 'complete'],
      default: 'testing_intake',
      index: true,
    },
    stage: {
      type: String,
      enum: [
        'testing_intake',
        'functional_testing',
        'electrical_testing',
        'burn_in_testing',
        'environmental_testing',
        'mixed_testing',
        'testing_review',
        'testing_dispatch',
        'dispatch',
      ],
      default: 'testing_intake',
      index: true,
    },
    travelerReady: { type: Boolean, default: false },
    dueDate: { type: Date, index: true },
    tester: { type: String, trim: true },

    testingStatus: { type: TestingStageStatusSchema, default: () => ({}) },
    testingChecklist: { type: mongoose.Schema.Types.Mixed },

    reviewStatus: { type: TestingStageStatusSchema, default: () => ({}) },
    reviewChecklist: { type: mongoose.Schema.Types.Mixed },

    dispatchStatus: { type: TestingStageStatusSchema, default: () => ({}) },
    dispatchChecklist: { type: mongoose.Schema.Types.Mixed },

    testingAttachments: { type: [TestingAttachmentSchema], default: [] },
    travelerVersion: { type: String, trim: true },
    notes: { type: String, trim: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

TestingWorkOrderSchema.index({ woNumber: 1 });
TestingWorkOrderSchema.index({ status: 1, priority: -1 });
TestingWorkOrderSchema.index({ testType: 1, stage: 1 });

export default mongoose.model('TestingWorkOrder', TestingWorkOrderSchema);
