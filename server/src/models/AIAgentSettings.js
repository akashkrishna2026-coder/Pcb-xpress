import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const RunHistorySchema = new mongoose.Schema(
  {
    runId: { type: String, required: true },
    status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    dryRun: { type: Boolean, default: false },
    totals: {
      products: { type: Number, default: 0 },
      doubled: { type: Number, default: 0 },
      normalized: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
    },
    error: { type: String, default: null },
    initiatedBy: { type: String, default: null },
  },
  { _id: false }
);

const AIAgentSettingsSchema = new mongoose.Schema(
  {
    apiKey: { type: String, default: null, select: false },
    model: { type: String, default: 'gpt-4o-mini' },
    systemPrompt: { type: String, default: 'You are an electronics sourcing analyst who determines product availability across reputable vendors.' },
    guardrails: { type: String, default: '' },
    searchVendors: { type: [VendorSchema], default: [] },
    modelSettings: {
      temperature: { type: Number, default: 0.2 },
      top_p: { type: Number, default: 1 },
    },
    pricingRules: {
      markupUnavailable: { type: Number, default: 0.25 },
      scaleByScarcity: { type: Boolean, default: true },
      rounding: { type: String, enum: ['none', 'nearest_0.99'], default: 'nearest_0.99' },
      minPrice: { type: Number, default: 0 },
      maxPrice: { type: Number, default: 0 }, // 0 means no cap
    },
    status: { type: String, enum: ['idle', 'running', 'error'], default: 'idle' },
    lastRunAt: { type: Date, default: null },
    lastRunSummary: { type: mongoose.Schema.Types.Mixed, default: null },
    runHistory: { type: [RunHistorySchema], default: [] },
  },
  { timestamps: true }
);

AIAgentSettingsSchema.methods.toSafeObject = function toSafeObject(options = {}) {
  const { includeSecret = false } = options;
  const obj = this.toObject({ getters: true, virtuals: false });
  obj.hasApiKey = Boolean(this.apiKey);
  if (!includeSecret) delete obj.apiKey;
  if (Array.isArray(obj.runHistory)) obj.runHistory = obj.runHistory.slice(0, 20);
  return obj;
};

const AIAgentSettings =
  mongoose.models.AIAgentSettings || mongoose.model('AIAgentSettings', AIAgentSettingsSchema);

export default AIAgentSettings;
