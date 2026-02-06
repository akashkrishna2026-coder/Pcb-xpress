import { Router } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import Film from '../models/Film.js';
import User from '../models/User.js';
import { makeMulter, filePublicUrl, ensureUploadDir } from '../lib/uploads.js';

const router = Router();
const upload = makeMulter();

function decodeToken(req) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      return jwt.verify(parts[1], process.env.JWT_SECRET || 'dev_secret');
    } catch (_) {
      return null;
    }
  }
  return null;
}

function requireMfgOrAdmin(req, res, next) {
  const decoded = decodeToken(req);
  if (!decoded || (decoded.role !== 'mfg' && decoded.role !== 'admin')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = decoded;
  return next();
}

function normalizePermissions(perms) {
  if (!Array.isArray(perms)) return [];
  const uniq = new Set();
  perms.forEach((p) => {
    if (typeof p === 'string' && p.trim()) {
      uniq.add(p.trim().toLowerCase());
    }
  });
  return Array.from(uniq);
}

async function resolveOperatorContext(req) {
  if (req.operatorContext) return req.operatorContext;
  if (!req.user) return null;
  if (req.user.role === 'admin') {
    const context = { isAdmin: true, permissions: ['*'] };
    req.operatorContext = context;
    return context;
  }
  const operator = await User.findById(req.user.sub)
    .select('_id name loginId role permissions isActive workCenter mfgRole email')
    .lean();
  if (!operator || operator.role !== 'mfg' || operator.isActive === false) {
    return null;
  }
  const permissions = normalizePermissions(operator.permissions);
  const context = { isAdmin: false, operator, permissions };
  req.operatorContext = context;
  return context;
}

function hasPermission(context, permission) {
  if (!permission) return true;
  if (!context) return false;
  if (context.isAdmin) return true;
  return context.permissions.includes(permission);
}

// Middleware to check cam_phototools permission
function requirePhototoolsPermission(req, res, next) {
  resolveOperatorContext(req).then(context => {
    if (!context || !hasPermission(context, 'cam_phototools')) {
      return res.status(403).json({ message: 'Access denied: cam_phototools permission required' });
    }
    req.operatorContext = context;
    next();
  }).catch(err => {
    res.status(500).json({ message: 'Authorization error' });
  });
}

// GET /films - List films with filtering
router.get('/', requireMfgOrAdmin, requirePhototoolsPermission, async (req, res) => {
  try {
    const { status, type, search, limit: limitRaw, page: pageRaw } = req.query || {};

    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 25));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = {};

    if (status) {
      const parts = String(status).split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) filter.status = { $in: parts };
    }

    if (type) {
      const parts = String(type).split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) filter.type = { $in: parts };
    }

    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { name: rx },
        { manufacturer: rx },
        { batchNumber: rx },
        { notes: rx }
      ];
    }

    const [total, films] = await Promise.all([
      Film.countDocuments(filter),
      Film.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({
      films,
      total,
      page,
      pages,
      limit,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load films' });
  }
});

// GET /films/summary - Film summary metrics
router.get('/summary', requireMfgOrAdmin, requirePhototoolsPermission, async (req, res) => {
  try {
    const [
      totalFilms,
      availableFilms,
      damagedFilms,
      expiredFilms,
    ] = await Promise.all([
      Film.countDocuments(),
      Film.countDocuments({ status: 'available' }),
      Film.countDocuments({ status: 'damaged' }),
      Film.countDocuments({ status: 'expired' }),
    ]);

    res.json({
      summary: {
        totalFilms,
        availableFilms,
        damagedFilms,
        expiredFilms,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load film summary' });
  }
});

// POST /films - Create new film
router.post('/', requireMfgOrAdmin, requirePhototoolsPermission, upload.single('file'), async (req, res) => {
  try {
    const payload = req.body || {};
    const context = req.operatorContext;

    payload.createdBy = context.isAdmin ? req.user.sub : context.operator._id;
    payload.updatedBy = payload.createdBy;

    if (req.file) {
      payload.fileUrl = filePublicUrl(req.file.filename);
      payload.fileName = req.file.originalname;
      payload.fileSize = req.file.size;
    }

    const film = await Film.create(payload);
    res.status(201).json({ film });
  } catch (err) {
    // Clean up file if error
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    if (err?.code === 11000) {
      res.status(409).json({ message: 'Film already exists' });
    } else {
      res.status(500).json({ message: 'Failed to create film' });
    }
  }
});

// GET /films/:id - Get single film
router.get('/:id', requireMfgOrAdmin, requirePhototoolsPermission, async (req, res) => {
  try {
    const film = await Film.findById(req.params.id).lean();
    if (!film) return res.status(404).json({ message: 'Film not found' });
    res.json({ film });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load film' });
  }
});

// PUT /films/:id - Update film
router.put('/:id', requireMfgOrAdmin, requirePhototoolsPermission, async (req, res) => {
  try {
    const updates = req.body || {};
    const context = req.operatorContext;

    updates.updatedBy = context.isAdmin ? req.user.sub : context.operator._id;

    const film = await Film.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!film) return res.status(404).json({ message: 'Film not found' });
    res.json({ film });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update film' });
  }
});

// DELETE /films/:id - Delete film
router.delete('/:id', requireMfgOrAdmin, requirePhototoolsPermission, async (req, res) => {
  try {
    const film = await Film.findByIdAndDelete(req.params.id);
    if (!film) return res.status(404).json({ message: 'Film not found' });
    res.json({ message: 'Film deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete film' });
  }
});

// POST /films/:id/upload - Upload file for film
router.post('/:id/upload', requireMfgOrAdmin, requirePhototoolsPermission, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'File is required' });

    const film = await Film.findByIdAndUpdate(id, {
      fileUrl: filePublicUrl(req.file.filename),
      fileName: req.file.originalname,
      fileSize: req.file.size,
      updatedBy: req.operatorContext.isAdmin ? req.user.sub : req.operatorContext.operator._id,
    }, { new: true });
    if (!film) {
      // Delete uploaded file if film not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Film not found' });
    }
    res.json({ film });
  } catch (err) {
    // Clean up file if error
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ message: 'Failed to upload file' });
  }
});

export default router;