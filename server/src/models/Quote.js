import mongoose from 'mongoose';

export const QUOTE_SERVICE_COLLECTIONS = {
  pcb: 'quotes',
  pcb_assembly: 'assembly_quotes',
  '3dprinting': '3d_printing_quotes',
  testing: 'testing_quotes',
  wire_harness: 'wire_harness_quotes',
};

const SERVICE_KEYS = Object.freeze(Object.keys(QUOTE_SERVICE_COLLECTIONS));
const DEFAULT_SERVICE = 'pcb';

const MODEL_NAMES = {
  pcb: 'Quote',
  pcb_assembly: 'AssemblyQuote',
  '3dprinting': 'ThreeDPrintingQuote',
  testing: 'TestingQuote',
  wire_harness: 'WireHarnessQuote',
};

const SERVICE_QUERY_MAP = {
  pcb: ['pcb'],
  pcb_assembly: ['pcb_assembly', 'pcb'],
  '3dprinting': ['3dprinting', 'pcb'],
  testing: ['testing', 'pcb'],
  wire_harness: ['wire_harness', 'pcb'],
};

const COMMON_SPEC_FIELDS = {
  specs: { type: Object },
  specs3d: { type: Object },
  specsAssembly: { type: Object },
  specsTesting: { type: Object },
  specsHarness: { type: Object },
};

const modelsCache = new Map();

// Function to generate custom quote ID in format Q[Year][Month][Day][Quote Count]
export async function generateCustomQuoteId(service = DEFAULT_SERVICE, retryCount = 0) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  // Get the start and end of today for counting quotes created today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  const model = getQuoteModel(service);
  const todayCount = await model.countDocuments({
    createdAt: { $gte: todayStart, $lt: todayEnd }
  });
  
  // Add retry count to avoid duplicates
  const quoteNumber = String(todayCount + 1 + retryCount).padStart(3, '0');
  const quoteId = `Q${year}${month}${day}${quoteNumber}`;
  
  return quoteId;
}

// Function to generate custom PI ID by replacing Q with PI in quote ID
export async function generateCustomPIId(quoteId) {
  if (!quoteId) {
    // Fallback: generate PI ID in format PI[Year][Month][Day][PI Count]
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const model = getQuoteModel();
    const todayPICount = await model.countDocuments({
      'proformaInvoice.piNumber': { $exists: true },
      createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) }
    });
    
    const piNumber = String(todayPICount + 1).padStart(3, '0');
    return `PI${year}${month}${day}${piNumber}`;
  }
  
  // Replace Q with PI in the quote ID
  return quoteId.replace(/^Q/, 'PI');
}

function createQuoteSchema(serviceKey, { specField, allowedServices } = {}) {
  const specDefinition =
    specField ? { [specField]: { type: Object } } : {};
  const serviceEnum =
    Array.isArray(allowedServices) && allowedServices.length > 0
      ? allowedServices
      : [serviceKey];

  const schema = new mongoose.Schema(
    {
      quoteId: { type: String, unique: true, required: true, index: true },
      service: {
        type: String,
        enum: serviceEnum,
        default: serviceKey,
        required: true,
        index: true,
      },
      ...COMMON_SPEC_FIELDS,
      ...specDefinition,
      delivery: { type: Object },
      bomStats: { type: Object },
      enquiryId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Enquiry', 
        index: true 
      },
      quote: { type: Object, required: true },
      adminQuote: {
        total: { type: Number },
        currency: { type: String, default: 'INR' },
        notes: { type: String, default: '' },
        breakdown: { type: mongoose.Schema.Types.Mixed },
      },
      status: { type: String, enum: ['requested', 'sent'], default: 'requested', index: true },
      sentAt: { type: Date },
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
        submittedAt: { type: Date },
        approvedAt: { type: Date },
        rejectedAt: { type: Date },
        rejectionReason: { type: String },
        proofFile: {
          originalName: String,
          filename: String,
          mimeType: String,
          size: Number,
          url: String,
        },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewNotes: { type: String },
      },
      mfgApproved: { type: Boolean, default: false },
      stage: {
        type: String,
        enum: [
          'requested',
          'sent',
          'approved',
          'cam',
          'assembly_store',
          '3d_printing_intake',
          'testing',
          'wire_harness_intake',
          'wire_harness',
          'rejected',
        ],
        default: 'requested',
      },
      mfgRejectionReason: { type: String },
      attachments: [
        {
          kind: {
            type: String,
            enum: ['gerber', 'bom', 'model', 'assembly', 'test', 'harness'],
          },
          originalName: String,
          filename: String,
          mimeType: String,
          size: Number,
          url: String,
        },
      ],
      contact: {
        name: { type: String, default: '' },
        email: { type: String, required: true, lowercase: true, trim: true, index: true },
        company: { type: String, default: '' },
        phone: { type: String, default: '' },
        address: { type: String, default: '' },
        gstin: { type: String, default: '' },
      },
      proformaInvoice: {
        piNumber: { type: String, unique: true, sparse: true },
        items: [{
          description: { type: String, required: true },
          quantity: { type: Number, required: true },
          unitPrice: { type: Number, required: true },
          totalPrice: { type: Number, required: true },
        }],
        subtotal: { type: Number, default: 0 },
        discountPercentage: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        taxRate: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        currency: { type: String, default: 'INR' },
        notes: { type: String, default: '' },
        terms: { type: String, default: '100% advance payment required. Delivery timeline: 7–10 business days.' },
        status: { 
          type: String, 
          enum: ['draft', 'sent', 'confirmed', 'rejected', 'expired'], 
          default: 'draft' 
        },
        sentAt: { type: Date },
        confirmedAt: { type: Date },
        expiresAt: { type: Date },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
      edited: { type: Boolean, default: false },
      editedAt: { type: Date },
    },
    { timestamps: true }
  );

  schema.index({ createdAt: -1 });
  return schema;
}

const SERVICE_SCHEMAS = {
  pcb: createQuoteSchema('pcb', { specField: 'specs', allowedServices: SERVICE_KEYS }),
  pcb_assembly: createQuoteSchema('pcb_assembly', { specField: 'specsAssembly' }),
  '3dprinting': createQuoteSchema('3dprinting', { specField: 'specs3d' }),
  testing: createQuoteSchema('testing', { specField: 'specsTesting' }),
  wire_harness: createQuoteSchema('wire_harness', { specField: 'specsHarness' }),
};

function normalizeService(service) {
  return SERVICE_KEYS.includes(service) ? service : DEFAULT_SERVICE;
}

function schemaForService(service) {
  return SERVICE_SCHEMAS[service] || SERVICE_SCHEMAS[DEFAULT_SERVICE];
}

export function getQuoteModel(service = DEFAULT_SERVICE) {
  const normalized = normalizeService(service);
  if (modelsCache.has(normalized)) return modelsCache.get(normalized);

  const modelName = MODEL_NAMES[normalized];
  if (mongoose.models[modelName]) {
    const cachedModel = mongoose.models[modelName];
    modelsCache.set(normalized, cachedModel);
    return cachedModel;
  }

  const schema = schemaForService(normalized);
  const model = mongoose.model(modelName, schema, QUOTE_SERVICE_COLLECTIONS[normalized]);
  modelsCache.set(normalized, model);
  return model;
}

function stripService(filter = {}) {
  if (!filter || typeof filter !== 'object') return {};
  const { service, ...rest } = filter;
  return { ...rest };
}

function resolveServices(filter = {}) {
  const value = filter?.service;
  if (!value) return SERVICE_KEYS;

  if (typeof value === 'string') {
    return SERVICE_KEYS.includes(value) ? [value] : [DEFAULT_SERVICE];
  }

  if (value && typeof value === 'object') {
    if (Array.isArray(value.$in)) {
      const allowed = value.$in.filter((s) => SERVICE_KEYS.includes(s));
      return allowed.length > 0 ? allowed : SERVICE_KEYS;
    }
    if (Array.isArray(value.$nin)) {
      const excluded = new Set(value.$nin);
      const remaining = SERVICE_KEYS.filter((s) => !excluded.has(s));
      return remaining.length > 0 ? remaining : [DEFAULT_SERVICE];
    }
  }

  return SERVICE_KEYS;
}

function buildFilterForService(filter, service) {
  return { ...filter, service };
}

function buildQuerySpecs(services) {
  const specs = [];
  const seenKeys = new Set();
  services.forEach((service) => {
    const normalized = normalizeService(service);
    const targets = SERVICE_QUERY_MAP[normalized] || [normalized];
    targets.forEach((modelKey) => {
      const dedupeKey = `${modelKey}::${normalized}`;
      if (seenKeys.has(dedupeKey)) return;
      seenKeys.add(dedupeKey);
      specs.push({ modelKey, serviceFilter: normalized });
    });
  });
  return specs;
}

function normalizeSort(sort) {
  if (!sort || typeof sort !== 'object' || Array.isArray(sort)) {
    return [['createdAt', -1]];
  }
  const entries = Object.entries(sort);
  if (entries.length === 0) return [['createdAt', -1]];
  return entries.map(([field, direction]) => {
    if (typeof direction === 'string') {
      const lower = direction.toLowerCase();
      return [field, lower === 'desc' || lower === 'descending' ? -1 : 1];
    }
    return [field, direction === -1 ? -1 : 1];
  });
}

function getValue(source, path) {
  if (!source) return undefined;
  if (typeof source.get === 'function') {
    return source.get(path);
  }
  return path.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), source);
}

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  const va = typeof a.valueOf === 'function' ? a.valueOf() : a;
  const vb = typeof b.valueOf === 'function' ? b.valueOf() : b;
  if (va < vb) return -1;
  if (va > vb) return 1;
  return 0;
}

function compareDocuments(a, b, sortEntries) {
  for (const [field, direction] of sortEntries) {
    const cmp = compareValues(getValue(a, field), getValue(b, field));
    if (cmp !== 0) return cmp * direction;
  }
  return 0;
}

export async function createQuoteDocument(payload = {}) {
  const service = normalizeService(payload?.service);
  const model = getQuoteModel(service);
  
  let retryCount = 0;
  const maxRetries = 5;
  
  while (retryCount < maxRetries) {
    try {
      // Generate custom quote ID if not provided
      const quoteId = payload.quoteId || await generateCustomQuoteId(service, retryCount);
      
      const documentData = { ...payload, service, quoteId };
      
      const result = await model.create(documentData);
      return result;
      
    } catch (dbError) {
      // Check if it's a duplicate key error
      if (dbError.code === 11000 && dbError.keyPattern?.quoteId) {
        retryCount++;
        continue;
      }
      
      // For other errors, re-throw
      throw dbError;
    }
  }
  
  throw new Error(`Failed to generate unique quoteId after ${maxRetries} attempts`);
}

export async function countQuoteDocuments(filter = {}) {
  const services = resolveServices(filter);
  const baseFilter = stripService(filter);
  const querySpecs = buildQuerySpecs(services);

  const counts = await Promise.all(
    querySpecs.map(({ modelKey, serviceFilter }) => {
      const model = getQuoteModel(modelKey);
      return model.countDocuments(buildFilterForService(baseFilter, serviceFilter));
    })
  );

  return counts.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
}

export async function findQuoteDocuments(filter = {}, options = {}) {
  const { limit, skip = 0, sort, lean = false } = options;
  const services = resolveServices(filter);
  const baseFilter = stripService(filter);
  const sortEntries = normalizeSort(sort);
  const sortObject = Object.fromEntries(sortEntries);
  const perServiceLimit =
    typeof limit === 'number' && limit >= 0 ? skip + limit : undefined;

  const results = [];
  const querySpecs = buildQuerySpecs(services);
  for (const { modelKey, serviceFilter } of querySpecs) {
    const model = getQuoteModel(modelKey);
    const queryFilter = buildFilterForService(baseFilter, serviceFilter);
    let query = model.find(queryFilter).sort(sortObject);
    if (perServiceLimit != null) {
      query = query.limit(perServiceLimit);
    }
    if (lean) {
      query = query.lean();
    }
    const docs = await query.exec();
    results.push(...docs);
  }

  const seen = new Set();
  const deduped = [];
  for (const doc of results) {
    const idValue =
      doc && typeof doc === 'object'
        ? (typeof doc.get === 'function'
            ? doc.get('_id')?.toString()
            : doc._id?.toString?.() ?? doc.id?.toString?.())
        : undefined;
    if (idValue && seen.has(idValue)) continue;
    if (idValue) seen.add(idValue);
    deduped.push(doc);
  }

  deduped.sort((a, b) => compareDocuments(a, b, sortEntries));
  let sliced = deduped;
  if (skip) sliced = sliced.slice(skip);
  if (typeof limit === 'number') sliced = sliced.slice(0, limit);
  return sliced;
}

export async function findQuoteById(id, options = {}) {
  const { lean = false } = options;
  for (const service of SERVICE_KEYS) {
    const model = getQuoteModel(service);
    let query = model.findById(id);
    if (lean) query = query.lean();
    const doc = await query.exec();
    if (doc) return doc;
  }
  return null;
}

export async function findQuoteByIdAndUpdate(id, update, options = {}) {
  for (const service of SERVICE_KEYS) {
    const model = getQuoteModel(service);
    const doc = await model.findByIdAndUpdate(id, update, options);
    if (doc) return doc;
  }
  return null;
}

export async function deleteQuoteById(id) {
  const doc = await findQuoteById(id);
  if (!doc) return null;
  await doc.deleteOne();
  return doc;
}

export async function deleteQuotes(filter = {}) {
  const services = resolveServices(filter);
  const baseFilter = stripService(filter);
  const querySpecs = buildQuerySpecs(services);
  const results = await Promise.all(
    querySpecs.map(({ modelKey, serviceFilter }) => {
      const model = getQuoteModel(modelKey);
      return model.deleteMany(buildFilterForService(baseFilter, serviceFilter));
    })
  );
  return results.reduce((sum, res) => sum + (res?.deletedCount || 0), 0);
}

export const QUOTE_SERVICE_KEYS = SERVICE_KEYS;
