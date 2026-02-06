import { Router } from 'express';
import jwt from 'jsonwebtoken';
import PaymentMethod from '../models/PaymentMethod.js';
import {
  findQuoteById,
  findQuoteByIdAndUpdate,
} from '../models/Quote.js';
import Order from '../models/Order.js';
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

// GET /api/payment-methods - Get active payment method for users
router.get('/', async (req, res) => {
  try {
    const method = await PaymentMethod.findOne({ isActive: true });
    if (!method) return res.json({ paymentMethod: null });
    res.json({ paymentMethod: method });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payment-methods/admin - Admin list all payment methods
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const methods = await PaymentMethod.find().sort({ createdAt: -1 });
    res.json({ paymentMethods: methods });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/payment-methods - Create new payment method (admin only)
const upload = makeMulter();
const uploadFields = upload.fields([
  { name: 'qrCode', maxCount: 1 },
  { name: 'proof', maxCount: 1 },
]);

router.post('/', requireAdmin, (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.startsWith('multipart/form-data')) return uploadFields(req, res, next);
  return next();
}, async (req, res) => {
  try {
    const { bankName, accountNumber, ifscCode, beneficiaryName, isActive } = req.body;

    const errors = [];
    if (!bankName || typeof bankName !== 'string') errors.push({ field: 'bankName', message: 'Bank name is required' });
    if (!accountNumber || typeof accountNumber !== 'string') errors.push({ field: 'accountNumber', message: 'Account number is required' });
    if (!ifscCode || typeof ifscCode !== 'string') errors.push({ field: 'ifscCode', message: 'IFSC code is required' });
    if (!beneficiaryName || typeof beneficiaryName !== 'string') errors.push({ field: 'beneficiaryName', message: 'Beneficiary name is required' });

    if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

    const qrCode = req.files && req.files.qrCode && req.files.qrCode[0];
    const qrData = qrCode ? {
      originalName: qrCode.originalname,
      filename: qrCode.filename,
      mimeType: qrCode.mimetype,
      size: qrCode.size,
      url: filePublicUrl(qrCode.filename),
    } : undefined;

    const method = await PaymentMethod.create({
      bankName: String(bankName).trim(),
      accountNumber: String(accountNumber).trim(),
      ifscCode: String(ifscCode).trim(),
      beneficiaryName: String(beneficiaryName).trim(),
      qrCode: qrData,
      isActive: isActive === 'true' || isActive === true,
    });

    res.status(201).json({ paymentMethod: method });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Upload failed', details: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/payment-methods/:id - Update payment method (admin only)
router.put('/:id', requireAdmin, (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.startsWith('multipart/form-data')) return uploadFields(req, res, next);
  return next();
}, async (req, res) => {
  try {
    const { id } = req.params;
    const { bankName, accountNumber, ifscCode, beneficiaryName, isActive } = req.body;

    const method = await PaymentMethod.findById(id);
    if (!method) return res.status(404).json({ error: 'Payment method not found' });

    const updates = {};
    if (bankName !== undefined) updates.bankName = String(bankName).trim();
    if (accountNumber !== undefined) updates.accountNumber = String(accountNumber).trim();
    if (ifscCode !== undefined) updates.ifscCode = String(ifscCode).trim();
    if (beneficiaryName !== undefined) updates.beneficiaryName = String(beneficiaryName).trim();
    if (isActive !== undefined) updates.isActive = isActive === 'true' || isActive === true;

    const qrCode = req.files && req.files.qrCode && req.files.qrCode[0];
    if (qrCode) {
      updates.qrCode = {
        originalName: qrCode.originalname,
        filename: qrCode.filename,
        mimeType: qrCode.mimetype,
        size: qrCode.size,
        url: filePublicUrl(qrCode.filename),
      };
    }

    Object.assign(method, updates);
    await method.save();

    res.json({ paymentMethod: method });
  } catch (err) {
    console.error('Upload proof error:', err);
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Upload failed', details: err.message });
    }
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// DELETE /api/payment-methods/:id - Delete payment method (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const method = await PaymentMethod.findByIdAndDelete(id);
    if (!method) return res.status(404).json({ error: 'Payment method not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/payment-methods/upload-proof - Upload payment proof (authenticated users)
const uploadProofFields = upload.fields([
  { name: 'proof', maxCount: 1 },
  { name: 'orderId', maxCount: 1 },
  { name: 'quoteId', maxCount: 1 }
]);

router.post('/upload-proof', uploadProofFields, async (req, res) => {
  try {
    const decoded = tryDecodeToken(req);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

    const { quoteId, orderId, paymentMethod } = req.body;
    const quoteIdValue = Array.isArray(quoteId) ? quoteId[0] : quoteId;
    const orderIdValue = Array.isArray(orderId) ? orderId[0] : orderId;
    if (!quoteIdValue && !orderIdValue) return res.status(400).json({ error: 'Quote ID or Order ID is required' });

    const proofFile = req.files && req.files.proof && req.files.proof[0];
    if (paymentMethod !== 'cash' && !proofFile) return res.status(400).json({ error: 'Proof file is required' });

    // Validate paymentMethod if provided
    const allowedPaymentMethods = ['bank_transfer', 'upi', 'card', 'cash', 'other'];
    if (paymentMethod && !allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const proofData = proofFile ? {
      originalName: proofFile.originalname,
      filename: proofFile.filename,
      mimeType: proofFile.mimetype,
      size: proofFile.size,
      url: filePublicUrl(proofFile.filename),
    } : null;

    let result = {};

    if (quoteIdValue) {
      // Handle quote payment proof
      const quote = await findQuoteById(quoteIdValue);
      if (!quote) return res.status(404).json({ error: 'Quote not found' });

      // Check if user owns this quote or is admin
      const isOwner = (quote.user && decoded.sub && quote.user.toString() === decoded.sub) ||
                      (quote.contact?.email && decoded.email && quote.contact.email === decoded.email);
      const isAdmin = decoded.role === 'admin';

      if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

      // Update quote with payment proof and method if provided
      if (paymentMethod === 'cash') {
        quote.paymentProof = {
          status: 'submitted',
          submittedAt: new Date(),
        };
      } else {
        quote.paymentProof = {
          status: 'submitted',
          submittedAt: new Date(),
          proofFile: proofData,
        };
      }
      if (paymentMethod) {
        quote.paymentMethod = paymentMethod;
      }

      await quote.save();
      result = { quoteId: quote._id };
    } else if (orderIdValue) {
      // Handle order payment proof
      const order = await Order.findById(orderIdValue);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      // Check if user owns this order or is admin
      const isOwner = (order.user && decoded.sub && order.user.toString() === decoded.sub) ||
                      (order.shipping?.email && decoded.email && order.shipping.email === decoded.email);
      const isAdmin = decoded.role === 'admin';

      if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

      // Update order with payment proof and method if provided
      if (paymentMethod === 'cash') {
        order.paymentProof = {
          status: 'submitted',
          submittedAt: new Date(),
        };
      } else {
        order.paymentProof = {
          status: 'submitted',
          submittedAt: new Date(),
          proofFile: proofData,
        };
      }
      if (paymentMethod) {
        order.paymentMethod = paymentMethod;
      }

      await order.save();
      result = { orderId: order._id };
    }

    res.status(201).json({
      message: 'Payment proof uploaded successfully',
      proof: proofData,
      ...result
    });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Upload failed', details: err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/payment-methods/:quoteId/proof-status - Update payment proof status (admin only)
router.put('/:quoteId/proof-status', requireAdmin, async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { status, rejectionReason, reviewNotes } = req.body;

    if (!['approved', 'rejected', 'not_submitted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved", "rejected", or "not_submitted"' });
    }

    const quote = await findQuoteById(quoteId);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    const updateData = {
      'paymentProof.status': status,
      'paymentProof.reviewedBy': req.user.sub,
      'paymentProof.reviewNotes': reviewNotes || '',
    };

    if (status === 'approved') {
      updateData['paymentProof.approvedAt'] = new Date();
      updateData['paymentProof.rejectedAt'] = null;
      updateData['paymentProof.rejectionReason'] = '';
      // Also update proforma invoice status to 'paid' if it exists
      if (quote.proformaInvoice) {
        updateData['proformaInvoice.status'] = 'paid';
        updateData['proformaInvoice.paidAt'] = new Date();
      }
    } else if (status === 'rejected') {
      updateData['paymentProof.rejectedAt'] = new Date();
      updateData['paymentProof.rejectionReason'] = rejectionReason || '';
      updateData['paymentProof.approvedAt'] = null;
    } else if (status === 'not_submitted') {
      updateData['paymentProof.approvedAt'] = null;
      updateData['paymentProof.rejectedAt'] = null;
      updateData['paymentProof.rejectionReason'] = '';
      // Reset proforma invoice status to 'sent' if it exists
      if (quote.proformaInvoice) {
        updateData['proformaInvoice.status'] = 'sent';
        updateData['proformaInvoice.paidAt'] = null;
      }
    }

    const updatedQuote = await findQuoteByIdAndUpdate(quoteId, updateData, { new: true });

    res.json({
      message: `Payment proof ${status}`,
      quote: {
        id: updatedQuote._id,
        paymentProof: updatedQuote.paymentProof,
        proformaInvoice: updatedQuote.proformaInvoice
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/payment-methods/orders/:orderId/proof-status - Update order payment proof status (admin only)
router.put('/orders/:orderId/proof-status', requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, rejectionReason, reviewNotes } = req.body;

    if (!['approved', 'rejected', 'not_submitted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved", "rejected", or "not_submitted"' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const updateData = {
      'paymentProof.status': status,
      'paymentProof.reviewedBy': req.user.sub,
      'paymentProof.reviewNotes': reviewNotes || '',
    };

    if (status === 'approved') {
      updateData['paymentProof.approvedAt'] = new Date();
      updateData['paymentProof.rejectedAt'] = null;
      updateData['paymentProof.rejectionReason'] = '';
    } else if (status === 'rejected') {
      updateData['paymentProof.rejectedAt'] = new Date();
      updateData['paymentProof.rejectionReason'] = rejectionReason || '';
      updateData['paymentProof.approvedAt'] = null;
    } else if (status === 'not_submitted') {
      updateData['paymentProof.approvedAt'] = null;
      updateData['paymentProof.rejectedAt'] = null;
      updateData['paymentProof.rejectionReason'] = '';
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, { new: true });

    res.json({
      message: `Payment proof ${status}`,
      order: {
        id: updatedOrder._id,
        paymentProof: updatedOrder.paymentProof
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
