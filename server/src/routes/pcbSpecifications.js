import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { PcbMaterial, PcbFinish } from '../models/PcbSpecification.js';

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

// GET /api/pcb-specifications - Get all active PCB materials and finishes
router.get('/', async (req, res) => {
  try {
    const [materials, finishes] = await Promise.all([
      PcbMaterial.find({ isActive: true }).sort({ name: 1 }),
      PcbFinish.find({ isActive: true }).sort({ name: 1 })
    ]);

    res.json({
      materials: materials.map(m => ({ id: m._id, name: m.name, description: m.description })),
      finishes: finishes.map(f => ({ id: f._id, name: f.name, description: f.description }))
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/pcb-specifications/admin - Admin get all materials and finishes
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const [materials, finishes] = await Promise.all([
      PcbMaterial.find().sort({ createdAt: -1 }),
      PcbFinish.find().sort({ createdAt: -1 })
    ]);

    res.json({ materials, finishes });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/pcb-specifications/materials - Create new material (admin only)
router.post('/materials', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Material name is required' });
    }

    const material = await PcbMaterial.create({
      name: name.trim(),
      description: description?.trim() || '',
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

// PUT /api/pcb-specifications/materials/:id - Update material (admin only)
router.put('/materials/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const material = await PcbMaterial.findById(id);
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
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

// DELETE /api/pcb-specifications/materials/:id - Delete material (admin only)
router.delete('/materials/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const material = await PcbMaterial.findByIdAndDelete(id);
    if (!material) return res.status(404).json({ error: 'Material not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/pcb-specifications/finishes - Create new finish (admin only)
router.post('/finishes', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Finish name is required' });
    }

    const finish = await PcbFinish.create({
      name: name.trim(),
      description: description?.trim() || '',
      isActive: true
    });

    res.status(201).json({ finish });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Finish name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/pcb-specifications/finishes/:id - Update finish (admin only)
router.put('/finishes/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const finish = await PcbFinish.findById(id);
    if (!finish) return res.status(404).json({ error: 'Finish not found' });

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (isActive !== undefined) updates.isActive = isActive;

    Object.assign(finish, updates);
    await finish.save();

    res.json({ finish });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Finish name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/pcb-specifications/finishes/:id - Delete finish (admin only)
router.delete('/finishes/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const finish = await PcbFinish.findByIdAndDelete(id);
    if (!finish) return res.status(404).json({ error: 'Finish not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;