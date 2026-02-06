import mongoose from 'mongoose';

const AssemblyStageStatusSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      enum: ['pending', 'in_review', 'approved', 'blocked'],
      default: 'pending',
      index: true,
    },
    owner: { type: String, trim: true },
    notes: { type: String, trim: true },
    lastReviewedAt: { type: Date },
    releaseTarget: { type: Date },
    releasedAt: { type: Date },
  },
  { _id: false }
);

const AssemblyAttachmentSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: [
        'bom',
        'assembly',
        'assembly_card',
        'pick_list',
        'assembly_instruction',
        'visual_report',
        'inspection_image',
        'visual_photo',
        'aoi_image',
        'harness',
        'harness_drawing',
        'connector_list',
        'wire_test_report',
        'continuity_log',
        'wire_spec',
        'connector_spec',
        'orcad_file',
        'schematic_source',
        'dispatch_note',
        'packing_list',
        'invoice',
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ['intake', 'assembly', 'inspection'],
      required: true,
    },
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
    description: { type: String },
  },
  { _id: false }
);

const AssemblyMfgWorkOrderSchema = new mongoose.Schema(
  {
    woNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    customer: { type: String, trim: true, index: true },
    product: { type: String, trim: true },
    quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'hot'],
      default: 'normal',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'assembly_store',
        'stencil',
        'assembly_reflow',
        'th_soldering',
        'visual_inspection',
        'ict',
        'flashing',
        'functional_test',
        'wire_harness_intake',
        'wire_harness',
        'wire_testing',
        'wire_harness_dispatch',
        'assembly_3d_printing',
        'assembly_final_dispatch',
        'hold',
        'complete',
      ],
      default: 'assembly_store',
      index: true,
    },
    stage: {
      type: String,
      enum: [
        'assembly_store',
        'stencil',
        'assembly_reflow',
        'th_soldering',
        'visual_inspection',
        'ict',
        'flashing',
        'functional_test',
        'wire_harness_intake',
        'wire_harness',
        'wire_testing',
        'wire_harness_dispatch',
        'assembly_3d_printing',
        'assembly_final_dispatch',
      ],
      default: 'assembly_store',
      index: true,
    },
    travelerVersion: { type: String, trim: true },
    travelerReady: { type: Boolean, default: false },
    mfgApproved: { type: Boolean, default: false },
    quantity: { type: Number, default: 0 },
    dueDate: { type: Date, index: true },

    // Assembly-specific status fields
    assemblyStoreStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    assemblyStoreParams: { type: mongoose.Schema.Types.Mixed },
    assemblyStoreChecklist: { type: mongoose.Schema.Types.Mixed },

    stencilStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    stencilParams: { type: mongoose.Schema.Types.Mixed },
    stencilChecklist: { type: mongoose.Schema.Types.Mixed },

    assemblyReflowStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    assemblyReflowParams: { type: mongoose.Schema.Types.Mixed },
    assemblyReflowChecklist: { type: mongoose.Schema.Types.Mixed },

    thSolderingStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    thSolderingParams: { type: mongoose.Schema.Types.Mixed },
    thSolderingChecklist: { type: mongoose.Schema.Types.Mixed },

    visualInspectionStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    visualInspectionParams: { type: mongoose.Schema.Types.Mixed },
    visualInspectionChecklist: { type: mongoose.Schema.Types.Mixed },

    ictStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    ictParams: { type: mongoose.Schema.Types.Mixed },
    ictChecklist: { type: mongoose.Schema.Types.Mixed },

    flashingStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    flashingParams: { type: mongoose.Schema.Types.Mixed },
    flashingChecklist: { type: mongoose.Schema.Types.Mixed },

    functionalTestStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    functionalTestParams: { type: mongoose.Schema.Types.Mixed },
    functionalTestChecklist: { type: mongoose.Schema.Types.Mixed },

    wireHarnessIntakeStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    wireHarnessIntakeParams: { type: mongoose.Schema.Types.Mixed },
    wireHarnessIntakeChecklist: { type: mongoose.Schema.Types.Mixed },

    wireHarnessStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    wireHarnessParams: { type: mongoose.Schema.Types.Mixed },
    wireHarnessChecklist: { type: mongoose.Schema.Types.Mixed },

    wireTestingStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    wireTestingParams: { type: mongoose.Schema.Types.Mixed },
    wireTestingChecklist: { type: mongoose.Schema.Types.Mixed },
    wireHarnessDispatchStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    wireHarnessDispatchParams: { type: mongoose.Schema.Types.Mixed },
    wireHarnessDispatchChecklist: { type: mongoose.Schema.Types.Mixed },

    assembly3DPrintingStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    assembly3DPrintingParams: { type: mongoose.Schema.Types.Mixed },
    assembly3DPrintingChecklist: { type: mongoose.Schema.Types.Mixed },

    assemblyFinalDispatchStatus: { type: AssemblyStageStatusSchema, default: () => ({}) },
    assemblyFinalDispatchParams: { type: mongoose.Schema.Types.Mixed },
    assemblyFinalDispatchChecklist: { type: mongoose.Schema.Types.Mixed },

    // Assembly-specific attachments
    assemblyAttachments: { type: [AssemblyAttachmentSchema], default: [] },

    notes: { type: String, trim: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

AssemblyMfgWorkOrderSchema.index({ woNumber: 1 });
AssemblyMfgWorkOrderSchema.index({ status: 1, priority: -1 });
AssemblyMfgWorkOrderSchema.index({ dueDate: 1, priority: -1 });

export default mongoose.model('AssemblyMfgWorkOrder', AssemblyMfgWorkOrderSchema);
