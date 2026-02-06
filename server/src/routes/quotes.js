import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {
  createQuoteDocument,
  countQuoteDocuments,
  findQuoteDocuments,
  findQuoteById,
  findQuoteByIdAndUpdate,
} from '../models/Quote.js';
import MfgWorkOrder from '../models/MfgWorkOrder.js';
import AssemblyMfgWorkOrder from '../models/AssemblyMfgWorkOrder.js';
import TestingWorkOrder from '../models/TestingWorkOrder.js';
import { makeMulter, filePublicUrl } from '../lib/uploads.js';
import multer from 'multer';
import { PcbMaterial, PcbFinish } from '../models/PcbSpecification.js';
import {
  ThreeDPrintingTech,
  ThreeDPrintingMaterial,
  ThreeDPrintingResolution,
  ThreeDPrintingFinishing,
} from '../models/ThreeDPrintingSpecification.js';

const router = Router();

function tryDecodeToken(req) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      return jwt.verify(parts[1], process.env.JWT_SECRET || 'dev_secret');
    } catch (_) {}
  }
  return null;
}

function requireUser(req, res, next) {
  const decoded = tryDecodeToken(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  req.user = decoded;
  next();
}

function requireAdmin(req, res, next) {
  const decoded = tryDecodeToken(req);
  if (!decoded || decoded.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });
  req.user = decoded;
  next();
}

function requireAdminOrSales(req, res, next) {
  const decoded = tryDecodeToken(req);
  if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'sales')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = decoded;
  next();
}

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || ''));
}

function asNumber(n, { min, max } = {}) {
  const v = Number(n);
  if (!isFinite(v)) return undefined;
  if (min != null && v < min) return undefined;
  if (max != null && v > max) return undefined;
  return v;
}

async function validateQuotePayload(body = {}) {
  const errors = [];
  const out = {
    service: body.service,
    specs: undefined,
    specs3d: undefined,
    specsAssembly: undefined,
    specsTesting: undefined,
    delivery: {},
    bomStats: {},
    quote: {},
    contact: {},
  };

   // Service
    if (!['pcb', '3dprinting', 'pcb_assembly', 'testing', 'wire_harness'].includes(body.service)) {
      errors.push({ field: 'service', message: 'Must be "pcb", "pcb_assembly", "3dprinting", "testing" or "wire_harness"' });
    }

   // Contact
   if (!isEmail(body?.contact?.email)) {
     errors.push({ field: 'contact.email', message: 'Valid email required' });
   } else {
     out.contact.email = String(body.contact.email).toLowerCase();
   }
   if (body?.contact?.name) out.contact.name = String(body.contact.name).slice(0, 120);
   if (body?.contact?.company) out.contact.company = String(body.contact.company).slice(0, 120);
   if (body?.contact?.phone) out.contact.phone = String(body.contact.phone).slice(0, 20);
   if (body?.contact?.address) out.contact.address = String(body.contact.address).slice(0, 500);

   // Delivery
   const speed = body?.delivery?.speed === 'express' ? 'express' : 'standard';
   out.delivery.speed = speed;

   // PCB specs
   if (body.service === 'pcb') {
     const s = body.specs || {};
     const widthMm = asNumber(s.widthMm, { min: 1, max: 5000 });
     const heightMm = asNumber(s.heightMm, { min: 1, max: 5000 });
     const layers = asNumber(s.layers, { min: 1, max: 64 });
     const quantity = asNumber(s.quantity, { min: 1, max: 100000 });

     // Query active materials and finishes
     const [materials, finishes] = await Promise.all([
       PcbMaterial.find({ isActive: true }).select('name'),
       PcbFinish.find({ isActive: true }).select('name')
     ]);
     const materialNames = materials.map(m => m.name);
     const finishNames = finishes.map(f => f.name);

     // Fallback to hardcoded if no specs in DB
     const allowedMaterials = materialNames.length > 0 ? materialNames : ['FR4', 'Isola', 'Rogers', 'Aluminum', 'Ceramic'];
     const allowedFinishes = finishNames.length > 0 ? finishNames : ['HASL', 'ENIG', 'OSP', 'Immersion Silver', 'Immersion Tin', 'Hard Gold'];

     // Case-insensitive matching for materials and finishes
     const findMaterial = (name) => allowedMaterials.find(m => m.toLowerCase() === String(name || '').toLowerCase());
     const findFinish = (name) => allowedFinishes.find(f => f.toLowerCase() === String(name || '').toLowerCase());
     const material = findMaterial(s.material);
     const finish = findFinish(s.finish);

     if (!widthMm) errors.push({ field: 'specs.widthMm', message: 'Width (mm) required' });
     if (!heightMm) errors.push({ field: 'specs.heightMm', message: 'Height (mm) required' });
     if (!layers) errors.push({ field: 'specs.layers', message: 'Layers required' });
     if (!quantity) errors.push({ field: 'specs.quantity', message: 'Quantity required' });
     if (!material) errors.push({ field: 'specs.material', message: 'Invalid material' });
     if (!finish) errors.push({ field: 'specs.finish', message: 'Invalid finish' });
     out.specs = { widthMm, heightMm, layers, quantity, material, finish };
   }

   // 3D specs
   if (body.service === '3dprinting') {
     const s = body.specs3d || {};
     const dims = {
       xMm: asNumber(s?.dims?.xMm, { min: 1, max: 2000 }),
       yMm: asNumber(s?.dims?.yMm, { min: 1, max: 2000 }),
       zMm: asNumber(s?.dims?.zMm, { min: 1, max: 2000 }),
     };
     const quantity = asNumber(s.quantity, { min: 1, max: 10000 });

     // Query active specs
     const [techs, materials, resolutions, finishings] = await Promise.all([
       ThreeDPrintingTech.find({ isActive: true }).select('name'),
       ThreeDPrintingMaterial.find({ isActive: true }).select('name compatibleTechs'),
       ThreeDPrintingResolution.find({ isActive: true }).select('name'),
       ThreeDPrintingFinishing.find({ isActive: true }).select('name')
     ]);
     const techNames = techs.map(t => t.name);
     const materialNames3d = materials.map(m => m.name);
     const resolutionNames = resolutions.map(r => r.name);
     const finishingNames = finishings.map(f => f.name);

     // Fallback to hardcoded if no specs in DB
     const allowedTechs = techNames.length > 0 ? techNames : ['FDM', 'SLA', 'SLS'];
     const allowedMaterials3d = materialNames3d.length > 0 ? materialNames3d : ['PLA', 'ABS', 'PETG', 'TPU', 'Resin', 'Tough Resin', 'Nylon', 'Nylon PA12'];
     const allowedResolutions = resolutionNames.length > 0 ? resolutionNames : ['Draft', 'Standard', 'High', 'Ultra'];
     const allowedFinishings = finishingNames.length > 0 ? finishingNames : ['Raw', 'Sanded', 'Polished', 'Painted', 'Dyed'];

     // Case-insensitive matching helpers
     const findTech = (name) => allowedTechs.find(t => t.toLowerCase() === String(name || '').toLowerCase());
     const findMaterial3d = (name) => allowedMaterials3d.find(m => m.toLowerCase() === String(name || '').toLowerCase());
     const findResolution = (name) => allowedResolutions.find(r => r.toLowerCase() === String(name || '').toLowerCase());
     const findFinishing = (name) => allowedFinishings.find(f => f.toLowerCase() === String(name || '').toLowerCase());

     const tech = findTech(s.tech);
     const resolution = findResolution(s.resolution);
     const finishing = findFinishing(s.finishing);
     const material = findMaterial3d(s.material);

     const infillPercent = tech && tech.toUpperCase() === 'FDM' ? asNumber(s.infillPercent, { min: 0, max: 100 }) : undefined;

     if (!tech) errors.push({ field: 'specs3d.tech', message: 'Invalid process' });
     if (!dims.xMm || !dims.yMm || !dims.zMm) errors.push({ field: 'specs3d.dims', message: 'Dimensions required' });
     if (!quantity) errors.push({ field: 'specs3d.quantity', message: 'Quantity required' });
     if (!resolution) errors.push({ field: 'specs3d.resolution', message: 'Invalid resolution' });
     if (!material) errors.push({ field: 'specs3d.material', message: 'Invalid material' });
     if (!finishing) errors.push({ field: 'specs3d.finishing', message: 'Invalid finishing' });

     out.specs3d = { tech, dims, quantity, resolution, finishing, material, infillPercent };
   }

   // Assembly specs
   if (body.service === 'pcb_assembly') {
     const s = body.specsAssembly || body.specs || {};
     const boardWidthMm = asNumber(s.boardWidthMm, { min: 1, max: 5000 });
     const boardHeightMm = asNumber(s.boardHeightMm, { min: 1, max: 5000 });
     const layers = asNumber(s.layers, { min: 1, max: 64 });
     const componentCount = asNumber(s.componentCount, { min: 1, max: 500000 });
     const quantity = asNumber(s.quantity, { min: 1, max: 100000 });
     const assemblyType = ['smt', 'tht', 'mixed'].includes(s.assemblyType) ? s.assemblyType : undefined;
     const solderType = ['lead_free', 'leaded'].includes(s.solderType) ? s.solderType : undefined;

     if (!boardWidthMm) errors.push({ field: 'specsAssembly.boardWidthMm', message: 'Board width (mm) required' });
     if (!boardHeightMm) errors.push({ field: 'specsAssembly.boardHeightMm', message: 'Board height (mm) required' });
     if (!layers) errors.push({ field: 'specsAssembly.layers', message: 'Layer count required' });
     if (!componentCount) errors.push({ field: 'specsAssembly.componentCount', message: 'Component count required' });
     if (!quantity) errors.push({ field: 'specsAssembly.quantity', message: 'Quantity required' });
     if (!assemblyType) errors.push({ field: 'specsAssembly.assemblyType', message: 'Invalid assembly type' });
     if (!solderType) errors.push({ field: 'specsAssembly.solderType', message: 'Invalid solder type' });

     out.specsAssembly = {
       boardWidthMm,
       boardHeightMm,
       layers,
       componentCount,
       quantity,
       assemblyType,
       solderType,
     };
   }

   // Testing specs
   if (body.service === 'testing') {
     const s = body.specsTesting || {};
     const testType = ['functional', 'electrical', 'burn_in', 'environmental', 'mixed'].includes(s.testType) ? s.testType : undefined;
     const quantity = asNumber(s.quantity, { min: 1, max: 100000 });
     const requirements = typeof s.requirements === 'string' ? s.requirements.slice(0, 2000) : '';

     if (!testType) errors.push({ field: 'specsTesting.testType', message: 'Invalid test type' });
     if (!quantity) errors.push({ field: 'specsTesting.quantity', message: 'Quantity required' });

     out.specsTesting = {
       testType,
       quantity,
       requirements,
     };
   }

   // Wire Harness specs
   if (body.service === 'wire_harness') {
     const s = body.specsHarness || {};
     const boardWidthMm = asNumber(s.boardWidthMm, { min: 1, max: 5000 });
     const boardHeightMm = asNumber(s.boardHeightMm, { min: 1, max: 5000 });
     const wireCount = asNumber(s.wireCount, { min: 1, max: 10000 });
     const connectorCount = asNumber(s.connectorCount, { min: 0, max: 1000 });
     const quantity = asNumber(s.quantity, { min: 1, max: 100000 });
     const wireGauge = ['14AWG', '16AWG', '18AWG', '20AWG', '22AWG', '24AWG', '26AWG', '28AWG'].includes(s.wireGauge) ? s.wireGauge : undefined;
     const connectorType = ['molex', 'jst', 'dupont', 'te', 'amp', 'other'].includes(s.connectorType) ? s.connectorType : undefined;
     const harnessType = ['power', 'signal', 'mixed', 'custom'].includes(s.harnessType) ? s.harnessType : undefined;

     if (!boardWidthMm) errors.push({ field: 'specsHarness.boardWidthMm', message: 'Board width (mm) required' });
     if (!boardHeightMm) errors.push({ field: 'specsHarness.boardHeightMm', message: 'Board height (mm) required' });
     if (!wireCount) errors.push({ field: 'specsHarness.wireCount', message: 'Wire count required' });
     if (connectorCount == null) errors.push({ field: 'specsHarness.connectorCount', message: 'Connector count required' });
     if (!quantity) errors.push({ field: 'specsHarness.quantity', message: 'Quantity required' });
     if (!wireGauge) errors.push({ field: 'specsHarness.wireGauge', message: 'Invalid wire gauge' });
     if (!connectorType) errors.push({ field: 'specsHarness.connectorType', message: 'Invalid connector type' });
     if (!harnessType) errors.push({ field: 'specsHarness.harnessType', message: 'Invalid harness type' });

     out.specsHarness = {
       boardWidthMm,
       boardHeightMm,
       wireCount,
       connectorCount,
       quantity,
       wireGauge,
       connectorType,
       harnessType,
     };
   }

   // Quote breakdown basic presence
   if (!body.quote || typeof body.quote !== 'object' || typeof body.quote.total !== 'number') {
     errors.push({ field: 'quote', message: 'Quote with numeric total required' });
   } else {
     out.quote = body.quote;
   }

   // Optional
   if (body?.bomStats && typeof body.bomStats === 'object') out.bomStats = body.bomStats;

   return { ok: errors.length === 0, errors, value: out };
}

// Create a quote (requires authentication)
const upload = makeMulter();
const uploadFields = upload.fields([
  { name: 'gerber', maxCount: 1 },
  { name: 'bom', maxCount: 1 },
  { name: 'model', maxCount: 1 },
  { name: 'assembly', maxCount: 1 },
  { name: 'test', maxCount: 1 },
  { name: 'harness', maxCount: 1 },
]);

router.post('/', requireUser, (req, res, next) => {
  // Detect multipart
  const ct = req.headers['content-type'] || '';
  if (ct.startsWith('multipart/form-data')) return uploadFields(req, res, next);
  return next();
}, async (req, res) => {
  try {
    const decoded = tryDecodeToken(req);

    // If multipart, parse JSON fields
    let body = req.body || {};
    const maybeParse = (val) => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return val; }
      }
      return val;
    };
    if (req.files) {
      ['specs', 'specs3d', 'specsAssembly', 'specsTesting', 'specsHarness', 'delivery', 'bomStats', 'quote', 'contact'].forEach((k) => {
        if (body[k]) body[k] = maybeParse(body[k]);
      });
    }

    const { ok, errors, value } = await validateQuotePayload(body);
    if (!ok) return res.status(400).json({ error: 'Validation failed', details: errors });

    const attachments = [];
    const addFile = (field, kind) => {
      const f = req.files && req.files[field] && req.files[field][0];
      if (!f) return;
      attachments.push({
        kind,
        originalName: f.originalname,
        filename: f.filename,
        mimeType: f.mimetype,
        size: f.size,
        url: filePublicUrl(f.filename),
      });
    };
    addFile('gerber', 'gerber');
    addFile('bom', 'bom');
    addFile('model', 'model');
    addFile('assembly', 'assembly');
    addFile('test', 'test');
    addFile('harness', 'harness');

    const doc = await createQuoteDocument({
      ...value,
      attachments,
      user: decoded ? decoded.sub : undefined,
    });
    res.status(201).json({ quote: { quoteId: doc.quoteId, id: doc._id, ...doc.toObject() } });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Upload failed', details: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List my quotes (based on token's user id or email)
router.get('/mine', requireUser, async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const userId = req.user.sub;
    const email = req.user.email?.toLowerCase?.();
    const filter = { $or: [ { user: userId }, { 'contact.email': email } ] };

    const total = await countQuoteDocuments(filter);
    const quotes = await findQuoteDocuments(filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    });
    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({ quotes, page, limit, total, pages });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin list (now also accessible by sales)
router.get('/', requireAdminOrSales, async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const filter = {};
    if (req.query.service && ['pcb', '3dprinting', 'pcb_assembly', 'testing', 'wire_harness'].includes(req.query.service)) {
      filter.service = req.query.service;
    }
    if (req.query.email) {
      filter['contact.email'] = String(req.query.email).toLowerCase();
    }
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) {
        const d = new Date(req.query.from);
        if (!isNaN(d)) filter.createdAt.$gte = d;
      }
      if (req.query.to) {
        const d = new Date(req.query.to);
        if (!isNaN(d)) filter.createdAt.$lte = d;
      }
      if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
    }

    const total = await countQuoteDocuments(filter);
    const quotes = await findQuoteDocuments(filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    });
    const pages = Math.max(1, Math.ceil(total / limit));
    res.json({ quotes, page, limit, total, pages });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: set or update a manual quote and mark as sent
router.put('/:id/admin-quote', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const total = Number(req.body?.total);
    if (!isFinite(total) || total < 0) {
      return res.status(400).json({ error: 'Invalid total' });
    }
    const currency = String(req.body?.currency || 'INR');
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.slice(0, 2000) : '';
    const breakdown = typeof req.body?.breakdown === 'object' ? req.body.breakdown : undefined;
    const update = {
      adminQuote: { total, currency, notes, ...(breakdown ? { breakdown } : {}) },
      status: 'sent',
      sentAt: new Date(),
    };
    const doc = await findQuoteByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ error: 'Quote not found' });
    return res.json({ quote: { quoteId: doc.quoteId, id: doc._id, ...doc.toObject() } });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update quote user association (for anonymous quotes)
router.put('/:id/user', requireUser, async (req, res) => {
  try {
    const doc = await findQuoteById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Quote not found' });
    // Check if the quote's contact email matches the user's email
    if (doc.contact?.email !== req.user.email) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    doc.user = req.user.sub;
    await doc.save();
    res.json({ quote: { quoteId: doc.quoteId, id: doc._id, ...doc.toObject() } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a quote (owner or admin)
router.delete('/:id', async (req, res) => {
  try {
    const decoded = tryDecodeToken(req);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
    const q = await findQuoteById(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });
    const isOwner = (q.user && decoded.sub && q.user.toString() === decoded.sub) || (q.contact?.email && decoded.email && q.contact.email === decoded.email);
    const isAdmin = decoded.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });
    await q.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manufacturing approval endpoints (admin only)
router.put('/:id/mfg-approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the quote
    const quote = await findQuoteById(id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Validate payment is approved
    if (quote.paymentProof?.status !== 'approved') {
      return res.status(400).json({ error: 'Payment must be approved before manufacturing approval' });
    }

    // Check if already auto-approved by sales
    if (quote.autoMfgApproved) {
      return res.status(409).json({ 
        error: 'Quote already auto-approved by sales and sent to manufacturing',
        workOrderExists: true
      });
    }

    // Check if work order already exists
    const existingWO = await MfgWorkOrder.findOne({ quoteId: id });
    if (existingWO) {
      return res.status(409).json({ error: 'Work order already exists for this quote' });
    }

    // Generate WO number
    let woNumber = `WO-QUOTE-${id}`;
    // For PCB service, use a serial work order number: WO-YYYYMMDD-XXX
    if (quote.service === 'pcb') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const todayCount = await MfgWorkOrder.countDocuments({ createdAt: { $gte: todayStart, $lt: todayEnd } });
      const seq = String(todayCount + 1).padStart(3, '0');
      woNumber = `WO-${year}${month}${day}-${seq}`;
    }

    // Build product description from quote specs
    let productDescription = '';
    if (quote.service === 'pcb' && quote.specs) {
      const s = quote.specs;
      productDescription = `PCB: ${s.widthMm}mm x ${s.heightMm}mm, ${s.layers} layers, Qty: ${s.quantity}, Material: ${s.material}, Finish: ${s.finish}`;
    } else if (quote.service === '3dprinting' && quote.specs3d) {
      const s = quote.specs3d;
      const dims = s.dims || {};
      const dimsText =
        [dims.xMm, dims.yMm, dims.zMm].every((value) => typeof value === 'number' && !Number.isNaN(value))
          ? `${dims.xMm}mm x ${dims.yMm}mm x ${dims.zMm}mm`
          : 'Custom dimensions';
      productDescription = `3D Print: ${dimsText}, Qty: ${s.quantity ?? 'N/A'}, Tech: ${s.tech || 'N/A'}, Material: ${s.material || 'N/A'}`;
    } else if (quote.service === 'pcb_assembly' && quote.specsAssembly) {
      const s = quote.specsAssembly;
      productDescription = `Assembly: ${s.boardWidthMm}mm x ${s.boardHeightMm}mm, ${s.layers} layers, ${String(
        s.assemblyType || ''
      ).toUpperCase()} with ${s.componentCount} components, Qty: ${s.quantity}, Solder: ${s.solderType}`;
    } else if (quote.service === 'testing' && quote.specsTesting) {
      const s = quote.specsTesting;
      productDescription = `Testing: ${String(s.testType || '').toUpperCase()}, Qty: ${s.quantity}, Requirements: ${s.requirements || 'N/A'}`;
    } else if (quote.service === 'wire_harness' && quote.specsHarness) {
      const s = quote.specsHarness;
      productDescription = `Wire Harness: ${s.harnessType || 'Custom'} harness, ${s.circuitCount || 0} circuits, ${s.connectorCount || 0} connectors, Qty: ${s.quantity}, Lead length: ${s.leadLengthMm || 'N/A'}mm`;
    }

    // Copy relevant attachments to work order
    console.log('Quote attachments:', quote.attachments?.map(att => ({ kind: att.kind, originalName: att.originalName })));
    const intakeAttachments = [];
    if (quote.attachments) {
      quote.attachments.forEach(att => {
        const isPcbAttachment = att.kind === 'gerber' || att.kind === 'bom';
        const isAssemblyAttachment =
          att.kind === 'bom' ||
          att.kind === 'assembly' ||
          att.kind === 'assembly_instruction';
        const isHarnessAttachment =
          [
            'harness',
            'harness_drawing',
            'connector_list',
            'wire_spec',
            'connector_spec',
            'wire_test_report',
            'continuity_log',
            'dispatch_note',
            'packing_list',
            'invoice',
            'bom',
            'assembly',
            'assembly_instruction',
          ].includes(att.kind);
        const isTestingAttachment =
          [
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
          ].includes(att.kind);
        const isThreeDAttachment =
          att.kind === 'model' ||
          att.kind === 'stl' ||
          att.kind === 'step' ||
          att.kind === '3mf' ||
          att.kind === 'slicing_profile' ||
          att.kind === 'gcode' ||
          att.kind === 'print_log' ||
          att.kind === 'timelapse';

        const shouldCopy =
          (quote.service === 'pcb' && isPcbAttachment) ||
          (quote.service === '3dprinting' && isThreeDAttachment) ||
          (quote.service === 'pcb_assembly' && isAssemblyAttachment) ||
          (quote.service === 'wire_harness' && isHarnessAttachment) ||
          (quote.service === 'testing' && isTestingAttachment);

        console.log(`Attachment ${att.kind}: isPcbAttachment=${isPcbAttachment}, shouldCopy=${shouldCopy}, service=${quote.service}`);

        if (shouldCopy) {
          let attachmentCategory = 'intake';
          if (quote.service === '3dprinting') attachmentCategory = '3d_printing';
          if (quote.service === 'testing') attachmentCategory = 'testing';
          intakeAttachments.push({
            kind: att.kind,
            category: attachmentCategory,
            originalName: att.originalName,
            filename: att.filename,
            mimeType: att.mimeType,
            size: att.size,
            url: att.url,
            uploadedBy: req.user.sub,
            uploadedAt: new Date(),
            description: `${att.kind.toUpperCase()} file from quote`,
          });
        }
      });
    }
    console.log('Intake attachments to copy:', intakeAttachments.map(att => ({ kind: att.kind, category: att.category })));

    // If no intake attachments were selected by kind, fall back to copying all attachments
    if (intakeAttachments.length === 0 && quote.attachments && quote.attachments.length > 0) {
      console.log('No kind-matched intake attachments found for quote; copying all attachments as fallback (admin mfg-approve)');
      quote.attachments.forEach(att => {
        let attachmentCategory = 'intake';
        if (quote.service === '3dprinting') attachmentCategory = '3d_printing';
        if (quote.service === 'testing') attachmentCategory = 'testing';
        intakeAttachments.push({
          kind: att.kind,
          category: attachmentCategory,
          originalName: att.originalName,
          filename: att.filename,
          mimeType: att.mimeType,
          size: att.size,
          url: att.url,
          uploadedBy: req.user && req.user.sub ? req.user.sub : undefined,
          uploadedAt: new Date(),
          description: `FALLBACK: ${att.kind ? att.kind.toUpperCase() : 'FILE'} copied from quote`,
        });
      });
      console.log('Fallback intake attachments copied:', intakeAttachments.map(a => ({ kind: a.kind, category: a.category })));
    }

    // Create work order
    let rawQuantity;
    let initialStage;
    if (quote.service === 'pcb') {
      rawQuantity = quote.specs?.quantity;
      initialStage = 'cam';
    } else if (quote.service === 'pcb_assembly') {
      rawQuantity = quote.specsAssembly?.quantity;
      initialStage = 'assembly_store';
    } else if (quote.service === '3dprinting') {
      rawQuantity = quote.specs3d?.quantity;
      initialStage = '3d_printing_intake';
    } else if (quote.service === 'testing') {
      rawQuantity = quote.specsTesting?.quantity;
      initialStage = 'testing_intake';
    } else if (quote.service === 'wire_harness') {
      rawQuantity = quote.specsHarness?.quantity;
      initialStage = 'wire_harness_intake';
    } else {
      rawQuantity = quote.specs3d?.quantity || quote.specsAssembly?.quantity || quote.specs?.quantity;
      initialStage = 'cam';
    }
    const quantity = typeof rawQuantity === 'number' && isFinite(rawQuantity) ? rawQuantity : 0;

    // Use AssemblyMfgWorkOrder for assembly quotes
    const WorkOrderModel =
      quote.service === 'pcb_assembly' || quote.service === 'wire_harness'
        ? AssemblyMfgWorkOrder
        : quote.service === 'testing'
        ? TestingWorkOrder
        : MfgWorkOrder;

    const now = new Date();
    let workOrder;
    if (quote.service === 'testing') {
      workOrder = await WorkOrderModel.create({
        woNumber,
        quoteId: id,
        customer: quote.contact?.name || quote.contact?.company || 'Unknown',
        product: productDescription || 'Testing order',
        requirements: quote.specsTesting?.requirements || '',
        testType: quote.specsTesting?.testType || 'functional',
        quantity,
        priority: 'normal',
        mfgApproved: true,
        stage: initialStage,
        status: 'testing_intake',
        travelerReady: true,
        testingStatus: { state: 'pending', startedAt: now },
        testingAttachments: intakeAttachments,
        dispatchStatus: { state: 'pending' },
        reviewStatus: { state: 'pending' },
        approvedBy: 'admin',
        approvedAt: now,
        adminApproved: true,
      });
    } else {
      workOrder = await WorkOrderModel.create({
        woNumber,
        customer: quote.contact?.name || quote.contact?.company || 'Unknown',
        product: productDescription || 'Quote product',
        quoteId: id,
        quantity,
        mfgApproved: true,
        stage: initialStage,
        travelerReady: true,
        status: initialStage,
        camStatus: { state: 'pending' }, // Initialize CAM status for PCB workflow
        approvedBy: 'admin',
        approvedAt: now,
        adminApproved: true,
        ...(quote.service === 'pcb_assembly'
          ? {
              assemblyAttachments: intakeAttachments, // Use assemblyAttachments for assembly work orders
              assemblyStoreStatus: { state: 'pending' },
            }
          : quote.service === 'wire_harness'
          ? {
              assemblyAttachments: intakeAttachments,
              wireHarnessIntakeStatus: { state: 'pending' },
            }
          : {
              camAttachments: intakeAttachments, // Use camAttachments for PCB work orders
              ...(quote.service === '3dprinting'
                ? {
                    threeDPrintingStatus: { state: 'pending', lastReviewedAt: now },
                    threeDPrintingIntakeStatus: { state: 'pending', lastReviewedAt: now },
                    threeDPrintingFilePrepStatus: { state: 'pending' },
                    threeDPrintingSlicingStatus: { state: 'pending' },
                    threeDPrintingQueueStatus: { state: 'pending' },
                    threeDPrintingActiveStatus: { state: 'pending' },
                    threeDPrintingPostProcessingStatus: { state: 'pending' },
                    threeDPrintingQcStatus: { state: 'pending' },
                    threeDPrintingDispatchStatus: { state: 'pending' },
                  }
                : {})
            }),
      });
    }

    // Update quote with manufacturing approval
    let quoteStage;
    if (quote.service === 'pcb_assembly') {
      quoteStage = 'assembly_store';
    } else if (quote.service === '3dprinting') {
      quoteStage = '3d_printing_intake';
    } else if (quote.service === 'testing') {
      quoteStage = 'testing_intake';
    } else if (quote.service === 'wire_harness') {
      quoteStage = 'wire_harness_intake';
    } else {
      quoteStage = 'cam';
    }
    await findQuoteByIdAndUpdate(id, {
      mfgApproved: true,
      stage: quoteStage,
      adminApprovedAt: now,
      adminApproved: true
    });

    res.json({
      quote: {
        quoteId: quote.quoteId,
        id: quote._id,
        ...quote.toObject(),
        mfgApproved: true,
        stage:
          quote.service === 'pcb_assembly'
            ? 'assembly_store'
            : quote.service === 'testing'
            ? 'testing'
            : quote.service === 'wire_harness'
            ? 'wire_harness_intake'
            : 'cam',
      },
      workOrder: { id: workOrder._id, ...workOrder.toObject() }
    });
  } catch (err) {
    console.error('Mfg approve error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/mfg-reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const quote = await findQuoteById(id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Update quote with rejection
    const updatedQuote = await findQuoteByIdAndUpdate(id, {
      mfgApproved: false,
      stage: 'rejected',
      mfgRejectionReason: reason.trim()
    }, { new: true });

    res.json({ quote: { quoteId: updatedQuote.quoteId, id: updatedQuote._id, ...updatedQuote.toObject() } });
  } catch (err) {
    console.error('Mfg reject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/quotes/:id/update - Update quote (customer only)
router.put('/:id/update', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    // Find the quote first
    const quote = await findQuoteById(id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Check if user owns this quote
    if (quote.user?.toString() !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden - You can only edit your own quotes' });
    }

    // Allowed fields to update
    const allowedFields = [
      'specs', 'delivery', 'contact', 'adminQuote', 'status', 'notes'
    ];

    // Filter updates to only include allowed fields
    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Mark as edited with timestamp
    filteredUpdates.edited = true;
    filteredUpdates.editedAt = new Date();

    // Update quote
    const updatedQuote = await findQuoteByIdAndUpdate(id, filteredUpdates, { new: true });

    res.json({ 
      quote: { 
        quoteId: updatedQuote.quoteId, 
        id: updatedQuote._id, 
        ...updatedQuote.toObject() 
      } 
    });
  } catch (err) {
    console.error('Update quote error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quotes/:id/proforma - Create proforma invoice
router.post('/:id/proforma', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { items, notes, taxRate = 0 } = req.body;

    // Find the quote first
    const quote = await findQuoteById(id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Check if user owns this quote
    if (quote.user?.toString() !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden - You can only access your own quotes' });
    }

    // Generate PI number
    const { generateCustomPIId } = await import('../models/Quote.js');
    const piNumber = await generateCustomPIId(quote.quoteId);

    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map(item => {
      const totalPrice = item.quantity * item.unitPrice;
      subtotal += totalPrice;
      return {
        ...item,
        totalPrice
      };
    });

    const discountAmount = 0; // Will be calculated when discount is applied
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const total = subtotal - discountAmount + taxAmount;

    // Create proforma invoice
    const proformaInvoice = {
      piNumber,
      items: processedItems,
      subtotal,
      discountPercentage: 0,
      discountAmount,
      taxRate,
      taxAmount,
      total,
      currency: 'INR',
      notes: notes || '',
      terms: '100% advance payment required. Delivery timeline: 7–10 business days.', // Default terms
      status: 'draft',
      sentAt: null,
      confirmedAt: null,
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      createdBy: req.user.sub
    };

    const updatedQuote = await findQuoteByIdAndUpdate(id, { 
      proformaInvoice 
    }, { new: true });

    res.json({ 
      proformaInvoice: updatedQuote.proformaInvoice,
      quote: { 
        quoteId: updatedQuote.quoteId, 
        id: updatedQuote._id, 
        ...updatedQuote.toObject() 
      } 
    });
  } catch (err) {
    console.error('Create proforma invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/quotes/:id/proforma - Update proforma invoice
router.put('/:id/proforma', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { items, notes, taxRate, discountPercentage } = req.body;

    // Find the quote first
    const quote = await findQuoteById(id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    if (!quote.proformaInvoice) {
      return res.status(404).json({ error: 'Proforma invoice not found' });
    }

    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map(item => {
      const totalPrice = item.quantity * item.unitPrice;
      subtotal += totalPrice;
      return {
        ...item,
        totalPrice
      };
    });

    const discountAmount = subtotal * (discountPercentage / 100);
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const total = subtotal - discountAmount + taxAmount;

    // Update proforma invoice
    const updatedProformaInvoice = {
      ...quote.proformaInvoice,
      items: processedItems,
      subtotal,
      discountPercentage,
      discountAmount,
      taxRate,
      taxAmount,
      total,
      notes
    };

    const updatedQuote = await findQuoteByIdAndUpdate(id, { 
      proformaInvoice: updatedProformaInvoice 
    }, { new: true });

    res.json({ 
      proformaInvoice: updatedQuote.proformaInvoice,
      quote: { 
        quoteId: updatedQuote.quoteId, 
        id: updatedQuote._id, 
        ...updatedQuote.toObject() 
      } 
    });
  } catch (err) {
    console.error('Update proforma invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quotes/:id/proforma/send - Send proforma invoice to customer
router.post('/:id/proforma/send', requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the quote first
    const quote = await findQuoteById(id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Check if user owns this quote
    if (quote.user?.toString() !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden - You can only access your own quotes' });
    }

    if (!quote.proformaInvoice) {
      return res.status(404).json({ error: 'Proforma invoice not found' });
    }

    // Recompute monetary fields to ensure client/user dashboard reflects exact admin-edited totals
    const pi = quote.proformaInvoice;
    const items = Array.isArray(pi.items) ? pi.items : [];
    let subtotal = 0;
    const processedItems = items.map((item) => {
      const qty = Number(item.quantity) || 0;
      const unit = Number(item.unitPrice) || 0;
      const totalPrice = qty * unit;
      subtotal += totalPrice;
      return { ...item, quantity: qty, unitPrice: unit, totalPrice };
    });
    const discountPct = Number(pi.discountPercentage) || 0;
    const taxRate = Number(pi.taxRate) || 0;
    const discountAmount = subtotal * (discountPct / 100);
    const taxable = subtotal - discountAmount;
    const taxAmount = taxable * (taxRate / 100);
    const total = taxable + taxAmount;

    // Update status, timestamps, and normalized totals
    const updatedProformaInvoice = {
      ...pi,
      items: processedItems,
      subtotal,
      discountPercentage: discountPct,
      discountAmount,
      taxRate,
      taxAmount,
      total,
      status: 'sent',
      sentAt: new Date()
    };

    const updatedQuote = await findQuoteByIdAndUpdate(id, { 
      proformaInvoice: updatedProformaInvoice 
    }, { new: true });

    res.json({ 
      proformaInvoice: updatedQuote.proformaInvoice,
      message: 'Proforma invoice sent successfully'
    });
  } catch (err) {
    console.error('Send proforma invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quotes/:id/proforma/confirm - Customer confirms proforma invoice
router.post('/:id/proforma/confirm', requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the quote first
    const quote = await findQuoteById(id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    if (!quote.proformaInvoice) {
      return res.status(404).json({ error: 'Proforma invoice not found' });
    }

    // Check if user owns this quote
    if (quote.user?.toString() !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden - You can only confirm your own quotes' });
    }

    // Update status and confirmed timestamp
    const updatedProformaInvoice = {
      ...quote.proformaInvoice,
      status: 'confirmed',
      confirmedAt: new Date()
    };

    const updatedQuote = await findQuoteByIdAndUpdate(id, { 
      proformaInvoice: updatedProformaInvoice 
    }, { new: true });

    res.json({ 
      proformaInvoice: updatedQuote.proformaInvoice,
      message: 'Proforma invoice confirmed successfully'
    });
  } catch (err) {
    console.error('Confirm proforma invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/quotes/:id - Update quote (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    // Find the quote first
    const quote = await findQuoteById(id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Allowed fields to update
    const allowedFields = [
      'specs', 'delivery', 'contact', 'adminQuote', 'status', 'notes'
    ];

    // Filter updates to only include allowed fields
    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // If the quote has already been sent, create a NEW quote for the customer
    if (quote.status === 'sent') {
      console.log('Editing a sent quote; creating a new quote instead (admin edit) for quote id', id);
      // Build payload by copying existing quote data, removing identifiers/timestamps
      const base = quote.toObject ? quote.toObject() : { ...quote };
      // Remove fields that should not be copied directly
      delete base._id;
      delete base.id;
      delete base.quoteId; // allow createQuoteDocument to generate a new quoteId
      delete base.createdAt;
      delete base.updatedAt;
      delete base.sentAt;

      // Apply allowed updates to the copied payload
      const newPayload = { ...base, ...filteredUpdates };
      // Ensure status is reset to 'requested' for the new quote
      newPayload.status = 'requested';
      newPayload.sentAt = undefined;
      // Keep contact as the customer (ensure email lowercase)
      if (base.contact && base.contact.email) newPayload.contact = { ...base.contact, email: String(base.contact.email).toLowerCase() };
      // Preserve original user if present
      if (base.user) newPayload.user = base.user;

      // Create new quote document
      const created = await createQuoteDocument(newPayload);
      console.log('Created new quote from sent quote:', { originalQuoteId: id, newQuoteId: created._id });

      return res.json({ quote: { quoteId: created.quoteId, id: created._id, ...created.toObject() } });
    }

    // Mark as edited with timestamp for regular updates
    filteredUpdates.edited = true;
    filteredUpdates.editedAt = new Date();

    // Update the quote
    const updatedQuote = await findQuoteByIdAndUpdate(id, filteredUpdates, { new: true });

    res.json({ 
      quote: { 
        quoteId: updatedQuote.quoteId, 
        id: updatedQuote._id, 
        ...updatedQuote.toObject() 
      } 
    });
  } catch (err) {
    console.error('Update quote error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
