import { Router } from 'express';
import jwt from 'jsonwebtoken';
import PromotionalImage from '../models/PromotionalImage.js';
import { makeMulter, filePublicUrl } from '../lib/uploads.js';
import multer from 'multer';

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

const upload = makeMulter();
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 }
]);

// GET /api/promotional-images - Get active promotional images for users
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    // Ensure both start and end constraints are applied together
    const images = await PromotionalImage.find({
      isActive: true,
      $and: [
        { $or: [
          { startDate: { $exists: false } },
          { startDate: { $lte: now } }
        ]},
        { $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: now } }
        ]}
      ]
    }).sort({ displayOrder: 1, createdAt: -1 });

    res.json({ images });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/promotional-images/admin - Admin get all promotional images
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const images = await PromotionalImage.find().sort({ displayOrder: 1, createdAt: -1 });
    res.json({ images });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/promotional-images - Create new promotional image (admin only)
router.post('/', requireAdmin, (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.startsWith('multipart/form-data')) return uploadFields(req, res, next);
  return next();
}, async (req, res) => {
  try {
    const { title, isActive, displayOrder, displayFrequency, startDate, endDate, targetUrl, maxPopupsPerSession } = req.body;

    const errors = [];
    if (!title || typeof title !== 'string') errors.push({ field: 'title', message: 'Title is required' });

    if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

    const imageFile = req.files && req.files.image && req.files.image[0];
    if (!imageFile) return res.status(400).json({ error: 'Image file is required' });

    const imageData = {
      originalName: imageFile.originalname,
      filename: imageFile.filename,
      mimeType: imageFile.mimetype,
      size: imageFile.size,
      url: filePublicUrl(imageFile.filename),
    };

    const promoImage = await PromotionalImage.create({
      title: String(title).trim(),
      image: imageData,
      isActive: isActive === 'true' || isActive === true,
      displayOrder: displayOrder ? Number(displayOrder) : 0,
      displayFrequency: displayFrequency ? Number(displayFrequency) : 24,
      maxPopupsPerSession: maxPopupsPerSession ? Number(maxPopupsPerSession) : 3,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      targetUrl: targetUrl ? String(targetUrl).trim() : undefined,
    });

    res.status(201).json({ image: promoImage });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Upload failed', details: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/promotional-images/:id - Update promotional image (admin only)
router.put('/:id', requireAdmin, (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.startsWith('multipart/form-data')) return uploadFields(req, res, next);
  return next();
}, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, isActive, displayOrder, displayFrequency, startDate, endDate, targetUrl, maxPopupsPerSession } = req.body;

    const image = await PromotionalImage.findById(id);
    if (!image) return res.status(404).json({ error: 'Promotional image not found' });

    const updates = {};
    if (title !== undefined) updates.title = String(title).trim();
    if (isActive !== undefined) updates.isActive = isActive === 'true' || isActive === true;
    if (displayOrder !== undefined) updates.displayOrder = Number(displayOrder);
    if (displayFrequency !== undefined) updates.displayFrequency = Number(displayFrequency);
    if (maxPopupsPerSession !== undefined) updates.maxPopupsPerSession = Number(maxPopupsPerSession);
    if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : new Date();
    if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : undefined;
    if (targetUrl !== undefined) updates.targetUrl = targetUrl ? String(targetUrl).trim() : undefined;

    const imageFile = req.files && req.files.image && req.files.image[0];
    if (imageFile) {
      updates.image = {
        originalName: imageFile.originalname,
        filename: imageFile.filename,
        mimeType: imageFile.mimetype,
        size: imageFile.size,
        url: filePublicUrl(imageFile.filename),
      };
    }

    Object.assign(image, updates);
    await image.save();

    res.json({ image });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Upload failed', details: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/promotional-images/:id - Delete promotional image (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const image = await PromotionalImage.findByIdAndDelete(id);
    if (!image) return res.status(404).json({ error: 'Promotional image not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/promotional-images/:id/click - Track click on promotional image
router.put('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;
    await PromotionalImage.findByIdAndUpdate(id, { $inc: { clickCount: 1 } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/promotional-images/:id/view - Track view of promotional image
router.put('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    await PromotionalImage.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
