import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';

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
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });
  req.user = decoded;
  next();
}

function requireAdmin(req, res, next) {
  const decoded = tryDecodeToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = decoded;
  next();
}

// Create an order (user)
router.post('/', requireUser, async (req, res) => {
  try {
    const body = req.body || {};
    if (!Array.isArray(body.items) || !body.items.length) {
      return res.status(400).json({ message: 'Items required' });
    }
    if (!body.amounts || typeof body.amounts !== 'object') {
      return res.status(400).json({ message: 'Amounts required' });
    }
    if (!body.shipping || typeof body.shipping !== 'object') {
      return res.status(400).json({ message: 'Shipping required' });
    }

    // Validate paymentMethod
    const allowedPaymentMethods = ['bank_transfer', 'upi', 'card', 'cash', 'other'];
    const paymentMethod = body.paymentMethod || 'bank_transfer';
    console.log('Received paymentMethod:', paymentMethod);
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    const doc = await Order.create({
      items: body.items.map((it) => ({
        part: String(it.part || ''),
        name: String(it.name || ''),
        mfr: String(it.mfr || ''),
        price: Number(it.price) || 0,
        quantity: Math.max(1, Number(it.quantity) || 1),
        img: String(it.img || ''),
      })),
      amounts: {
        subtotal: Number(body.amounts.subtotal) || 0,
        shipping: Number(body.amounts.shipping) || 0,
        taxes: Number(body.amounts.taxes) || 0,
        total: Number(body.amounts.total) || 0,
        currency: body.amounts.currency || 'INR',
      },
      shipping: body.shipping,
      paymentMethod,
      status: 'Pending',
      user: req.user.sub,
    });

    res.status(201).json({ order: { id: doc._id, ...doc.toObject() } });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// List my orders
router.get('/mine', requireUser, async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const filter = { user: req.user.sub };

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({ orders, page, limit, total, pages });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: list all
router.get('/', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({ orders, page, limit, total, pages });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: metadata (allowed status values) – optional helper for the UI
router.get('/meta', requireAdmin, (req, res) => {
  const allowed = Order.schema.path('status').options.enum; // ['Pending','Processing','Shipped','Delivered','Cancelled']
  res.json({ allowedStatuses: allowed });
});

// Admin: update status (tolerant + canonicalize)
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    // Always take the enum from the model to prevent drift.
    const allowed = Order.schema.path('status').options.enum;

    const incomingRaw =
      req.body && req.body.status != null ? String(req.body.status) : '';
    const incoming = incomingRaw.trim();

    // Case-insensitive match -> canonical form from enum
    const canonical = allowed.find(
      (a) => a.toLowerCase() === incoming.toLowerCase()
    );

    if (!canonical) {
      return res.status(400).json({
        message: 'Invalid status',
        received: incomingRaw,
        allowed,
      });
    }

    const doc = await Order.findByIdAndUpdate(
      req.params.id,
      { status: canonical },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Order not found' });

    res.json({ order: { id: doc._id, ...doc.toObject() } });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin: delete order
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const doc = await Order.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
