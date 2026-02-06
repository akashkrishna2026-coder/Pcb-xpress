import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../index.js';
import Transaction from '../models/Transaction.js';
import Order from '../models/Order.js';
import { createQuoteDocument } from '../models/Quote.js';
import { getAdminToken, getUserToken } from './helpers/auth.js';

describe('Finance API', () => {
  let adminToken;
  let userToken;
  let testOrder;
  let testQuote;
  let testTransaction;

  beforeAll(async () => {
    adminToken = await getAdminToken();
    userToken = await getUserToken();

    // Create test data
    testOrder = await Order.create({
      items: [{ part: 'TEST001', name: 'Test Item', price: 100, quantity: 1 }],
      amounts: { subtotal: 100, shipping: 10, taxes: 5, total: 115, currency: 'INR' },
      shipping: {
        fullName: 'Test User',
        email: 'test@example.com',
        address1: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'India'
      },
      status: 'Pending',
      user: 'test-user-id'
    });

    testQuote = await createQuoteDocument({
      service: 'pcb',
      contact: { name: 'Test User', email: 'test@example.com' },
      quote: { total: 200 },
      adminQuote: { total: 200, currency: 'INR' },
      status: 'sent',
      user: 'test-user-id'
    });
  });

  afterAll(async () => {
    await Transaction.deleteMany({});
    await Order.findByIdAndDelete(testOrder._id);
    await mongoose.connection.close();
  });

  describe('GET /api/finance/transactions', () => {
    it('should return transactions list for admin', async () => {
      const res = await request(app)
        .get('/api/finance/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.transactions)).toBe(true);
      expect(typeof res.body.pagination).toBe('object');
    });

    it('should reject non-admin access', async () => {
      await request(app)
        .get('/api/finance/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);
    });

    it('should filter transactions by type', async () => {
      const res = await request(app)
        .get('/api/finance/transactions?type=order')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.transactions)).toBe(true);
    });
  });

  describe('GET /api/finance/transactions/:id', () => {
    it('should return transaction details', async () => {
      // First create a transaction
      const transaction = await Transaction.createFromOrder(testOrder);

      const res = await request(app)
        .get(`/api/finance/transactions/${transaction._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.transaction._id).toBe(transaction._id.toString());
    });

    it('should return 404 for non-existent transaction', async () => {
      await request(app)
        .get('/api/finance/transactions/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/finance/transactions/:id/status', () => {
    it('should update transaction status', async () => {
      const transaction = await Transaction.createFromOrder(testOrder);

      const res = await request(app)
        .put(`/api/finance/transactions/${transaction._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(res.body.transaction.status).toBe('completed');
    });

    it('should reject invalid status', async () => {
      const transaction = await Transaction.createFromOrder(testOrder);

      await request(app)
        .put(`/api/finance/transactions/${transaction._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);
    });
  });

  describe('PUT /api/finance/transactions/:id/payment-proof', () => {
    it('should approve payment proof', async () => {
      const transaction = await Transaction.createFromOrder(testOrder);
      transaction.paymentProof.status = 'submitted';
      await transaction.save();

      const res = await request(app)
        .put(`/api/finance/transactions/${transaction._id}/payment-proof`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(200);

      expect(res.body.transaction.paymentProof.status).toBe('approved');
    });

    it('should reject payment proof with reason', async () => {
      const transaction = await Transaction.createFromOrder(testOrder);
      transaction.paymentProof.status = 'submitted';
      await transaction.save();

      const res = await request(app)
        .put(`/api/finance/transactions/${transaction._id}/payment-proof`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected', rejectionReason: 'Invalid proof' })
        .expect(200);

      expect(res.body.transaction.paymentProof.status).toBe('rejected');
      expect(res.body.transaction.paymentProof.rejectionReason).toBe('Invalid proof');
    });
  });

  describe('POST /api/finance/transactions/:id/refund', () => {
    it('should process refund', async () => {
      const transaction = await Transaction.createFromOrder(testOrder);
      transaction.status = 'completed';
      await transaction.save();

      const res = await request(app)
        .post(`/api/finance/transactions/${transaction._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          refundAmount: 50,
          reason: 'Customer request',
          refundMethod: 'bank_transfer',
          notes: 'Test refund'
        })
        .expect(200);

      expect(res.body.transaction.status).toBe('refunded');
      expect(res.body.transaction.refundDetails.refundAmount).toBe(50);
    });

    it('should reject refund for non-completed transaction', async () => {
      const transaction = await Transaction.createFromOrder(testOrder);
      transaction.status = 'pending';
      await transaction.save();

      await request(app)
        .post(`/api/finance/transactions/${transaction._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          refundAmount: 50,
          reason: 'Test',
          refundMethod: 'bank_transfer'
        })
        .expect(400);
    });
  });

  describe('GET /api/finance/reports/summary', () => {
    it('should return financial summary', async () => {
      const res = await request(app)
        .get('/api/finance/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(typeof res.body.summary).toBe('object');
      expect(typeof res.body.summary.totalRevenue).toBe('number');
      expect(Array.isArray(res.body.revenueByService)).toBe(true);
      expect(Array.isArray(res.body.revenueByType)).toBe(true);
    });
  });

  describe('GET /api/finance/reports/export', () => {
    it('should export transactions as CSV', async () => {
      const res = await request(app)
        .get('/api/finance/reports/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(typeof res.text).toBe('string');
      expect(res.text).toContain('ID,Type,Amount');
    });
  });

  describe('POST /api/finance/transactions/sync', () => {
    it('should sync transactions from orders and quotes', async () => {
      const res = await request(app)
        .post('/api/finance/transactions/sync')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(typeof res.body.message).toBe('string');
      expect(res.body.message).toContain('Synced');
    });

    it('should sync only orders', async () => {
      const res = await request(app)
        .post('/api/finance/transactions/sync')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'orders' })
        .expect(200);

      expect(typeof res.body.message).toBe('string');
    });
  });
});