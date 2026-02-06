import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {
  ThreeDPrintingTech,
  ThreeDPrintingMaterial,
  ThreeDPrintingResolution,
  ThreeDPrintingFinishing
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

function requireAdmin(req, res, next) {
  const decoded = tryDecodeToken(req);
  if (!decoded || decoded.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });
  req.user = decoded;
  next();
}

// GET /api/3d-printing-specifications - Get all active 3D printing specifications
router.get('/', async (req, res) => {
  try {
    const [techs, materials, resolutions, finishings] = await Promise.all([
      ThreeDPrintingTech.find({ isActive: true }).sort({ name: 1 }),
      ThreeDPrintingMaterial.find({ isActive: true }).sort({ name: 1 }),
      ThreeDPrintingResolution.find({ isActive: true }).sort({ name: 1 }),
      ThreeDPrintingFinishing.find({ isActive: true }).sort({ name: 1 })
    ]);

    res.json({
      techs: techs.map(t => ({ id: t._id, name: t.name, description: t.description })),
      materials: materials.map(m => ({ id: m._id, name: m.name, description: m.description, compatibleTechs: m.compatibleTechs })),
      resolutions: resolutions.map(r => ({ id: r._id, name: r.name, description: r.description })),
      finishings: finishings.map(f => ({ id: f._id, name: f.name, description: f.description }))
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/3d-printing-specifications/admin - Admin get all specifications
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const [techs, materials, resolutions, finishings] = await Promise.all([
      ThreeDPrintingTech.find().sort({ createdAt: -1 }),
      ThreeDPrintingMaterial.find().sort({ createdAt: -1 }),
      ThreeDPrintingResolution.find().sort({ createdAt: -1 }),
      ThreeDPrintingFinishing.find().sort({ createdAt: -1 })
    ]);

    res.json({ techs, materials, resolutions, finishings });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Technologies CRUD
router.post('/techs', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Technology name is required' });
    }

    const tech = await ThreeDPrintingTech.create({
      name: name.trim(),
      description: description?.trim() || '',
      isActive: true
    });

    res.status(201).json({ tech });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Technology name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/techs/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const tech = await ThreeDPrintingTech.findById(id);
    if (!tech) return res.status(404).json({ error: 'Technology not found' });

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (isActive !== undefined) updates.isActive = isActive;

    Object.assign(tech, updates);
    await tech.save();

    res.json({ tech });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Technology name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/techs/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const tech = await ThreeDPrintingTech.findByIdAndDelete(id);
    if (!tech) return res.status(404).json({ error: 'Technology not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Materials CRUD
router.post('/materials', requireAdmin, async (req, res) => {
  try {
    const { name, description, compatibleTechs } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Material name is required' });
    }

    const material = await ThreeDPrintingMaterial.create({
      name: name.trim(),
      description: description?.trim() || '',
      compatibleTechs: Array.isArray(compatibleTechs) ? compatibleTechs : [],
      isActive: true
    });

    res.status(201).json({ material });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Material name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/materials/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, compatibleTechs, isActive } = req.body;

    const material = await ThreeDPrintingMaterial.findById(id);
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (compatibleTechs !== undefined) updates.compatibleTechs = Array.isArray(compatibleTechs) ? compatibleTechs : [];
    if (isActive !== undefined) updates.isActive = isActive;

    Object.assign(material, updates);
    await material.save();

    res.json({ material });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Material name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/materials/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const material = await ThreeDPrintingMaterial.findByIdAndDelete(id);
    if (!material) return res.status(404).json({ error: 'Material not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resolutions CRUD
router.post('/resolutions', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Resolution name is required' });
    }

    const resolution = await ThreeDPrintingResolution.create({
      name: name.trim(),
      description: description?.trim() || '',
      isActive: true
    });

    res.status(201).json({ resolution });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Resolution name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/resolutions/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const resolution = await ThreeDPrintingResolution.findById(id);
    if (!resolution) return res.status(404).json({ error: 'Resolution not found' });

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (isActive !== undefined) updates.isActive = isActive;

    Object.assign(resolution, updates);
    await resolution.save();

    res.json({ resolution });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Resolution name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/resolutions/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const resolution = await ThreeDPrintingResolution.findByIdAndDelete(id);
    if (!resolution) return res.status(404).json({ error: 'Resolution not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Finishing CRUD
router.post('/finishings', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Finishing name is required' });
    }

    const finishing = await ThreeDPrintingFinishing.create({
      name: name.trim(),
      description: description?.trim() || '',
      isActive: true
    });

    res.status(201).json({ finishing });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Finishing name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/finishings/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const finishing = await ThreeDPrintingFinishing.findById(id);
    if (!finishing) return res.status(404).json({ error: 'Finishing not found' });

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (isActive !== undefined) updates.isActive = isActive;

    Object.assign(finishing, updates);
    await finishing.save();

    res.json({ finishing });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Finishing name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/finishings/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const finishing = await ThreeDPrintingFinishing.findByIdAndDelete(id);
    if (!finishing) return res.status(404).json({ error: 'Finishing not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;