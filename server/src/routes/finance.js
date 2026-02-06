import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Transaction from '../models/Transaction.js';
import Order from '../models/Order.js';
import { findQuoteById, findQuoteByIdAndUpdate } from '../models/Quote.js';

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
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = decoded;
  next();
}

function requireAdminOrSales(req, res, next) {
  const decoded = tryDecodeToken(req);
  if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'sales')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = decoded;
  next();
}

// GET /api/finance/transactions - List all transactions with filtering
router.get('/transactions', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      service,
      startDate,
      endDate,
      search,
    } = req.query;

    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (service) filter['metadata.service'] = service;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { 'metadata.orderNumber': new RegExp(search, 'i') },
        { 'metadata.quoteNumber': new RegExp(search, 'i') },
        { 'metadata.customerEmail': new RegExp(search, 'i') },
        { 'metadata.customerName': new RegExp(search, 'i') },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('DEBUG: Transaction filter:', JSON.stringify(filter, null, 2));
    const transactions = await Transaction.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Check for duplicates in returned transactions
    const ids = transactions.map(t => t._id.toString());
    const uniqueIds = new Set(ids);
    const hasDuplicateIds = ids.length !== uniqueIds.size;
    const referenceIds = transactions.map(t => t.referenceId.toString());
    const uniqueRefs = new Set(referenceIds);
    const hasDuplicateRefs = referenceIds.length !== uniqueRefs.size;
    console.log(`DEBUG: Total transactions in DB matching filter: ${total}`);
    console.log(`DEBUG: Transactions returned in this page: ${transactions.length}`);
    console.log(`DEBUG: Has duplicate _ids in result: ${hasDuplicateIds}`);
    if (hasDuplicateIds) {
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      console.log('DEBUG: Duplicate _ids found:', duplicates);
    }
    console.log(`DEBUG: Has duplicate referenceIds in result: ${hasDuplicateRefs}`);
    if (hasDuplicateRefs) {
      const duplicateRefs = referenceIds.filter((ref, index) => referenceIds.indexOf(ref) !== index);
      console.log('DEBUG: Duplicate referenceIds found:', duplicateRefs);
    }

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/finance/transactions/:id - Get transaction details
router.get('/transactions/:id', requireAdmin, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('user', 'name email')
      .populate('auditTrail.user', 'name email');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/finance/transactions/:id/status - Update transaction status
router.put('/transactions/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const oldStatus = transaction.status;
    transaction.status = status;

    await transaction.addAuditEntry(
      'status_changed',
      req.user.sub,
      notes || `Status changed from ${oldStatus} to ${status}`,
      oldStatus,
      status
    );

    res.json({ transaction });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/finance/transactions/:id/payment-proof - Update payment proof status
router.put('/transactions/:id/payment-proof', requireAdmin, async (req, res) => {
  try {
    const { status, rejectionReason, reviewNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.paymentProof.status !== 'submitted') {
      return res.status(400).json({ message: 'Payment proof must be submitted first' });
    }

    transaction.paymentProof.status = status;
    transaction.paymentProof.reviewedBy = req.user.sub;
    transaction.paymentProof.reviewNotes = reviewNotes || '';

    if (status === 'approved') {
      transaction.paymentProof.approvedAt = new Date();
      transaction.status = 'completed';
      await transaction.addAuditEntry('payment_approved', req.user.sub, reviewNotes);
    } else if (status === 'rejected') {
      transaction.paymentProof.rejectedAt = new Date();
      transaction.paymentProof.rejectionReason = rejectionReason;
      transaction.status = 'failed';
      await transaction.addAuditEntry('payment_rejected', req.user.sub, reviewNotes);
    }

    await transaction.save();

    // Update the original order/quote if needed
    if (transaction.referenceModel === 'Order') {
      await Order.findByIdAndUpdate(transaction.referenceId, {
        'paymentProof.status': status,
        'paymentProof.approvedAt': transaction.paymentProof.approvedAt,
        'paymentProof.rejectedAt': transaction.paymentProof.rejectedAt,
        'paymentProof.rejectionReason': rejectionReason,
        'paymentProof.reviewedBy': req.user.sub,
        'paymentProof.reviewNotes': reviewNotes,
      });
    } else if (transaction.referenceModel === 'Quote') {
      const quoteUpdateData = {
        'paymentProof.status': status,
        'paymentProof.approvedAt': transaction.paymentProof.approvedAt,
        'paymentProof.rejectedAt': transaction.paymentProof.rejectedAt,
        'paymentProof.rejectionReason': rejectionReason,
        'paymentProof.reviewedBy': req.user.sub,
        'paymentProof.reviewNotes': reviewNotes,
      };

      // Also update proforma invoice status if payment is approved
      if (status === 'approved') {
        const quote = await findQuoteById(transaction.referenceId);
        if (quote && quote.proformaInvoice) {
          quoteUpdateData['proformaInvoice.status'] = 'paid';
          quoteUpdateData['proformaInvoice.paidAt'] = new Date();
        }
      }

      await findQuoteByIdAndUpdate(transaction.referenceId, quoteUpdateData);
    }

    res.json({ transaction });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/finance/transactions/:id/refund - Process refund
router.post('/transactions/:id/refund', requireAdmin, async (req, res) => {
  try {
    const { refundAmount, reason, refundMethod, notes } = req.body;

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    await transaction.processRefund(
      refundAmount,
      reason,
      req.user.sub,
      refundMethod,
      notes
    );

    res.json({ transaction });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/finance/transactions/sync - Sync transactions from existing orders/quotes
router.post('/transactions/sync', requireAdmin, async (req, res) => {
  try {
    const { type } = req.body; // 'orders', 'quotes', or undefined for both

    let syncedCount = 0;

    if (!type || type === 'orders') {
      // Sync orders
      const orders = await Order.find({}).populate('user');
      for (const order of orders) {
        await Transaction.createFromOrder(order);
        syncedCount++;
      }
    }

    if (!type || type === 'quotes') {
      const { findQuoteDocuments } = await import('../models/Quote.js');
      const quotes = await findQuoteDocuments({}, { lean: true });
      for (const quote of quotes) {
        await Transaction.createFromQuote(quote);
        syncedCount++;
      }
    }

    res.json({ message: `Synced ${syncedCount} transactions` });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/finance/reports/summary - Financial summary report
router.get('/reports/summary', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      totalRevenue,
      totalRefunds,
      pendingPayments,
      completedPayments,
      failedPayments,
    ] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...dateFilter, status: 'completed', type: { $ne: 'refund' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { ...dateFilter, status: 'refunded' } },
        { $group: { _id: null, total: { $sum: '$refundDetails.refundAmount' } } },
      ]),
      Transaction.countDocuments({ ...dateFilter, status: 'pending' }),
      Transaction.countDocuments({ ...dateFilter, status: 'completed' }),
      Transaction.countDocuments({ ...dateFilter, status: 'failed' }),
    ]);

    const revenueByService = await Transaction.aggregate([
      { $match: { ...dateFilter, status: 'completed', type: { $ne: 'refund' } } },
      { $group: { _id: '$metadata.service', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]);

    const revenueByType = await Transaction.aggregate([
      { $match: { ...dateFilter, status: 'completed', type: { $ne: 'refund' } } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    res.json({
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalRefunds: totalRefunds[0]?.total || 0,
        netRevenue: (totalRevenue[0]?.total || 0) - (totalRefunds[0]?.total || 0),
        pendingPayments,
        completedPayments,
        failedPayments,
      },
      revenueByService,
      revenueByType,
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/finance/reports/summary-sales - Sales-friendly revenue summary
router.get('/reports/summary-sales', requireAdminOrSales, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      totalRevenue,
      totalRefunds,
      pendingPayments,
      completedPayments,
      failedPayments,
    ] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...dateFilter, status: 'completed', type: { $ne: 'refund' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { ...dateFilter, status: 'refunded' } },
        { $group: { _id: null, total: { $sum: '$refundDetails.refundAmount' } } },
      ]),
      Transaction.countDocuments({ ...dateFilter, status: 'pending' }),
      Transaction.countDocuments({ ...dateFilter, status: 'completed' }),
      Transaction.countDocuments({ ...dateFilter, status: 'failed' }),
    ]);

    res.json({
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalRefunds: totalRefunds[0]?.total || 0,
        netRevenue: (totalRevenue[0]?.total || 0) - (totalRefunds[0]?.total || 0),
        pendingPayments,
        completedPayments,
        failedPayments,
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/finance/reports/export - Export transactions data
router.get('/reports/export', requireAdmin, async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate, type, status } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      const csvData = transactions.map(t => ({
        ID: t._id,
        Type: t.type,
        Amount: t.amount,
        Currency: t.currency,
        Status: t.status,
        PaymentMethod: t.paymentMethod,
        CustomerName: t.metadata?.customerName || '',
        CustomerEmail: t.metadata?.customerEmail || '',
        Service: t.metadata?.service || '',
        CreatedAt: t.createdAt.toISOString(),
        OrderNumber: t.metadata?.orderNumber || '',
        QuoteNumber: t.metadata?.quoteNumber || '',
      }));

      // Convert to CSV string (simplified)
      const headers = Object.keys(csvData[0] || {});
      const csvString = [
        headers.join(','),
        ...csvData.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      res.send(csvString);
    } else {
      res.json({ transactions });
    }
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;