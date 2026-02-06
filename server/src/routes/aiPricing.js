import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import Product from '../models/Product.js';
import AIAgentSettings from '../models/AIAgentSettings.js';
import { checkAvailability, normalizeVendors } from '../lib/agent.js';
import { computePrice } from '../lib/pricing.js';
import AIReport from '../models/AIReport.js';

const router = Router();

let currentJob = null; // in-memory pointer for quick status

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const decoded = jwt.verify(parts[1], process.env.JWT_SECRET || 'dev_secret');
      if (decoded.role === 'admin') {
        req.user = decoded;
        return next();
      }
    } catch (_) {}
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

async function getSettingsDoc(selectSecret = false) {
  const query = selectSecret ? AIAgentSettings.findOne().select('+apiKey') : AIAgentSettings.findOne();
  let doc = await query;
  if (!doc) {
    doc = new AIAgentSettings();
    await doc.save();
  }
  return doc;
}

// Validation Schemas
const vendorSchema = z.object({
  name: z.string().min(1),
  url: z.string().optional().default(''),
  enabled: z.boolean().optional().default(true),
});

const modelSettingsSchema = z.object({
  temperature: z.number().min(0).max(1).default(0.2),
  top_p: z.number().min(0).max(1).default(1),
}).partial();

const pricingRulesSchema = z.object({
  markupUnavailable: z.number().min(0).max(3).default(0.25),
  scaleByScarcity: z.boolean().default(true),
  rounding: z.enum(['none', 'nearest_0.99']).default('nearest_0.99'),
  minPrice: z.number().min(0).default(0),
  maxPrice: z.number().min(0).default(0),
}).partial();

const settingsUpdateSchema = z.object({
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  guardrails: z.string().optional(),
  modelSettings: modelSettingsSchema.optional(),
  pricingRules: pricingRulesSchema.optional(),
  searchVendors: z.array(vendorSchema).optional(),
  apiKey: z.string().min(1).optional(),
  resetApiKey: z.boolean().optional(),
});

// GET /api/ai-pricing/settings
router.get('/settings', requireAdmin, async (_req, res) => {
  try {
    const doc = await getSettingsDoc(false);
    res.json({ settings: doc.toSafeObject() });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load AI settings' });
  }
});

// PUT /api/ai-pricing/settings
router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const parsed = settingsUpdateSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }
    const { model, systemPrompt, guardrails, apiKey, resetApiKey, searchVendors, modelSettings, pricingRules } = parsed.data;
    const doc = await getSettingsDoc(true);
    if (typeof model === 'string') doc.model = model;
    if (typeof systemPrompt === 'string') doc.systemPrompt = systemPrompt;
    if (typeof guardrails === 'string') doc.guardrails = guardrails;
    if (modelSettings && typeof modelSettings === 'object') {
      doc.modelSettings = { ...doc.modelSettings, ...modelSettings };
    }
    if (pricingRules && typeof pricingRules === 'object') {
      doc.pricingRules = { ...doc.pricingRules, ...pricingRules };
    }
    if (Array.isArray(searchVendors)) {
      doc.searchVendors = searchVendors
        .filter((v) => v && v.name)
        .map((v) => ({ name: String(v.name), url: v.url ? String(v.url) : '', enabled: v.enabled !== false }));
    }
    if (resetApiKey) doc.apiKey = null;
    else if (typeof apiKey === 'string' && apiKey.trim()) doc.apiKey = apiKey.trim();
    await doc.save();
    res.json({ settings: doc.toSafeObject() });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update AI settings' });
  }
});

// POST /api/ai-pricing/preview
router.post('/preview', requireAdmin, async (req, res) => {
  try {
    const schema = z.object({ productId: z.string().optional(), name: z.string().optional() });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
    const { productId, name } = parsed.data;

    let product = null;
    if (productId) {
      try { product = await Product.findById(productId); } catch (_) {}
      if (!product) {
        const asNum = Number(productId);
        if (Number.isFinite(asNum)) product = await Product.findOne({ id: asNum });
      }
    }
    if (!product && name) {
      product = await Product.findOne({ name });
    }
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const settings = await getSettingsDoc(true);
    const vendors = normalizeVendors(settings.searchVendors);
    const base = typeof product.base_price === 'number' && !Number.isNaN(product.base_price)
      ? product.base_price
      : (typeof product.price === 'number' ? product.price : 0);
    const avail = await checkAvailability(product, settings);
    const nextPrice = computePrice({ basePrice: base, hits: avail.hits, allowedCount: vendors.length, rules: settings.pricingRules });

    res.json({
      product: { id: String(product._id), name: product.name, basePrice: base, currentPrice: product.price },
      availability: { hits: avail.hits, vendors: avail.vendors, sampleUrls: avail.sampleUrls },
      computedPrice: nextPrice,
      rules: settings.pricingRules,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to preview price' });
  }
});

// POST /api/ai-pricing/run
router.post('/run', requireAdmin, async (req, res) => {
  try {
    const { dryRun = false } = req.body || {};
    if (currentJob && currentJob.status === 'running') {
      return res.status(409).json({ error: 'AI pricing run already in progress' });
    }
    // Validate OpenAI key presence; if absent, fail fast
    const s0 = await getSettingsDoc(true);
    // API key optional: we can fallback to heuristic if not present
    const startedAt = new Date();
    const runId = `${startedAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    currentJob = {
      runId,
      status: 'running',
      startedAt,
      dryRun: !!dryRun,
      stage: 'initializing',
      message: 'Starting AI pricing run',
      processed: 0,
      total: 0,
    };

    // update settings status + history (start)
    const settings = await getSettingsDoc(true);
    settings.status = 'running';
    settings.lastRunAt = null;
    settings.lastRunSummary = { runId, status: 'running', startedAt, dryRun: !!dryRun, totals: { products: 0, doubled: 0, normalized: 0, updated: 0 } };
    settings.runHistory = [settings.lastRunSummary, ...(settings.runHistory || [])].slice(0, 20);
    await settings.save();
    console.log('Started run, updated settings with runId:', runId, 'history length:', settings.runHistory.length);

    // kickoff async work (no await)
    (async () => {
      try {
        currentJob.stage = 'collecting_products';
        currentJob.message = 'Loading products';
        const products = await Product.find({}).lean();
        currentJob.total = products.length;
        let doubled = 0; // kept for backward-compatible summary naming
        let normalized = 0;
        let updated = 0;
        let processed = 0;
        const now = new Date();
        const vendors = normalizeVendors(settings.searchVendors);
        const ops = [];

        // Initialize run document
        console.log('Creating AIReport document for runId:', runId);
        const runDoc = await AIReport.create({
          runId,
          status: 'running',
          startedAt,
          dryRun: !!dryRun,
          pricingRules: settings.pricingRules || {},
          vendorsUsed: vendors.map(v => ({ name: v.name || '', url: v.url || '' })),
          totals: { products: products.length, doubled: 0, normalized: 0, updated: 0 },
        });
        console.log('Created AIReport document:', runDoc._id);
        let reportBatch = [];
        currentJob.stage = 'evaluating_availability';
        currentJob.message = 'Checking product availability';
        for (const p of products) {
          const base = typeof p.base_price === 'number' && !Number.isNaN(p.base_price)
            ? p.base_price
            : (typeof p.price === 'number' ? p.price : 0);

          const avail = await checkAvailability(p, settings);
          const nextPrice = computePrice({ basePrice: base, hits: avail.hits, allowedCount: vendors.length, rules: settings.pricingRules });

          if (avail.hits === 0) doubled += 1; else normalized += 1;
          if (Number(p.price) !== Number(nextPrice)) updated += 1;

          // Append report item
          const item = {
            productId: String(p._id),
            productNumericId: typeof p.id === 'number' ? p.id : null,
            name: p.name || '',
            basePrice: Number(base) || 0,
            oldPrice: Number(p.price) || 0,
            newPrice: Number(nextPrice) || 0,
            availabilityHits: Number(avail.hits) || 0,
            availabilityStatus: (Number(avail.hits) || 0) > 0 ? 'available' : 'unavailable',
            priceAction: Number(p.price) !== Number(nextPrice) ? 'changed' : 'unchanged',
            sampleUrls: Array.isArray(avail.sampleUrls) ? avail.sampleUrls.slice(0, 3) : [],
          };
          reportBatch.push(item);
          if (reportBatch.length >= 200) {
            await AIReport.updateOne({ runId }, { $push: { items: { $each: reportBatch } } });
            reportBatch = [];
          }

          if (!dryRun) {
            ops.push({
              updateOne: {
                filter: { _id: p._id },
                update: {
                  $set: {
                    price: nextPrice,
                    base_price: base,
                    availability_hits: avail.hits,
                    availability_last_checked: now,
                    availability_sample_urls: Array.isArray(avail.sampleUrls) ? avail.sampleUrls : [],
                    price_source: 'computed',
                    updated_at: now,
                  },
                },
              },
            });
          }
          processed += 1;
          currentJob.processed = processed;
        }
        // Flush any remaining report items
        if (reportBatch.length) {
          await AIReport.updateOne({ runId }, { $push: { items: { $each: reportBatch } } });
        }

        if (!dryRun && ops.length) {
          currentJob.stage = 'updating_database';
          currentJob.message = 'Applying price updates';
          await Product.bulkWrite(ops, { ordered: false });
        }
        const finishedAt = new Date();
        currentJob = {
          ...currentJob,
          status: 'completed',
          stage: 'finalizing',
          message: 'Recording run summary',
          finishedAt,
          totalProducts: products.length,
          doubled,
          normalized,
          updated,
        };
        const s2 = await getSettingsDoc(true);
        s2.status = 'idle';
        s2.lastRunAt = finishedAt;
        s2.lastRunSummary = {
          runId,
          status: 'completed',
          startedAt,
          finishedAt,
          dryRun: !!dryRun,
          totals: { products: products.length, doubled, normalized, updated },
        };
        s2.runHistory = (s2.runHistory || []).map((h) => (h.runId === runId ? s2.lastRunSummary : h));
        await s2.save();
        console.log('Completed run, updated settings with runId:', runId, 'history length:', s2.runHistory.length);

        // Update run document final status and totals
        await AIReport.updateOne(
          { runId },
          { $set: { status: 'completed', finishedAt, totals: { products: products.length, doubled, normalized, updated } } }
        );
      } catch (err) {
        const finishedAt = new Date();
        currentJob = { ...currentJob, status: 'failed', stage: 'error', message: err.message, finishedAt, error: err.message };
        const s3 = await getSettingsDoc(true);
        s3.status = 'error';
        s3.lastRunAt = finishedAt;
        s3.lastRunSummary = {
          runId,
          status: 'failed',
          startedAt,
          finishedAt,
          dryRun: !!dryRun,
          totals: { products: 0, doubled: 0, normalized: 0, updated: 0 },
          error: err.message,
        };
        s3.runHistory = (s3.runHistory || []).map((h) => (h.runId === runId ? s3.lastRunSummary : h));
        await s3.save();
        try {
          await AIReport.updateOne(
            { runId },
            { $set: { status: 'failed', finishedAt, error: err.message } },
            { upsert: true }
          );
        } catch (_) {}
      } finally {
        // Clear pointer after a short delay
        setTimeout(() => { currentJob = null; }, 5000);
      }
    })();

    res.json({ ok: true, runId, startedAt, dryRun: !!dryRun });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to start AI pricing run' });
  }
});

// GET /api/ai-pricing/status
router.get('/status', requireAdmin, async (_req, res) => {
  try {
    const doc = await getSettingsDoc(false);
    res.json({
      status: doc.status || 'idle',
      currentJob: currentJob || null,
      lastRun: doc.lastRunSummary || null,
      lastRunAt: doc.lastRunAt || null,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// GET /api/ai-pricing/history
router.get('/history', requireAdmin, async (_req, res) => {
  try {
    const doc = await getSettingsDoc(false);
    console.log('Fetching history, runHistory length:', (doc.runHistory || []).length);
    res.json({ history: doc.runHistory || [] });
  } catch (e) {
    console.error('Error fetching history:', e);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/ai-pricing/runs/latest
router.get('/runs/latest', requireAdmin, async (_req, res) => {
  try {
    const doc = await AIReport.findOne().sort({ startedAt: -1 }).lean();
    if (!doc) return res.json({ report: null });
    return res.json({ report: doc });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch latest report' });
  }
});

// GET /api/ai-pricing/runs/:runId
router.get('/runs/:runId', requireAdmin, async (req, res) => {
  try {
    const runId = String(req.params.runId || '');
    console.log('Fetching run report for runId:', runId);
    const doc = await AIReport.findOne({ runId }).lean();
    console.log('Found report document:', !!doc, doc ? doc.status : 'none');
    if (!doc) return res.json({ report: null });
    return res.json({ report: doc });
  } catch (e) {
    console.error('Error fetching report:', e);
    return res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// DELETE /api/ai-pricing/runs/:runId
router.delete('/runs/:runId', requireAdmin, async (req, res) => {
  try {
    const runId = String(req.params.runId || '');
    console.log('Deleting AI pricing run:', runId);
    // Delete report document if present
    const deleteResult = await AIReport.deleteOne({ runId });
    console.log('AIReport delete result:', deleteResult);
    // Also remove summary entry from settings history
    try {
      const historyResult = await AIAgentSettings.updateOne({}, { $pull: { runHistory: { runId } } });
      console.log('AIAgentSettings history update result:', historyResult);
    } catch (historyErr) {
      console.error('Error updating history:', historyErr);
    }
    console.log('Successfully deleted run:', runId);
    return res.json({ ok: true });
  } catch (e) {
    console.error('Error deleting AI pricing run:', e);
    return res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;
