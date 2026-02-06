import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import MfgWorkOrder from '../models/MfgWorkOrder.js';
import User from '../models/User.js';
import mfgRoutes from '../routes/mfg.js';

let mongoServer;
let app;
let adminToken;
let mfgToken;
let testWorkOrder;

beforeAll(async () => {
  // Set JWT secret for tests
  process.env.JWT_SECRET = 'dev_secret';

  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create Express app
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/mfg', mfgRoutes);

  // Create test users
  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@test.com',
    password: await bcrypt.hash('password', 10),
    role: 'admin',
  });

  const mfgUser = await User.create({
    name: 'Mfg User',
    email: 'mfg@test.com',
    password: await bcrypt.hash('password', 10),
    role: 'mfg',
    loginId: 'mfguser',
    permissions: ['dfm:manage', 'cam:review'],
  });

  adminToken = jwt.sign({ sub: adminUser._id, role: 'admin' }, 'dev_secret');
  mfgToken = jwt.sign({ sub: mfgUser._id, role: 'mfg' }, 'dev_secret');

  // Create test work order
  testWorkOrder = await MfgWorkOrder.create({
    woNumber: 'WO-TEST-001',
    product: 'Test PCB',
    customer: 'Test Customer',
    quantity: 100,
    priority: 'high',
    stage: 'cam',
    camStatus: {
      state: 'pending',
      owner: 'Test Owner',
    },
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Work Order Retrieval', () => {
  test('should get work order details with mfg role', async () => {
    const response = await request(app)
      .get(`/api/mfg/work-orders/${testWorkOrder._id}`)
      .set('Authorization', `Bearer ${mfgToken}`);

    expect(response.status).toBe(200);
    expect(response.body.workOrder).toMatchObject({
      woNumber: 'WO-TEST-001',
      product: 'Test PCB',
      customer: 'Test Customer',
      stage: 'cam',
    });
  });

  test('should return 401 for invalid token', async () => {
    const response = await request(app)
      .get(`/api/mfg/work-orders/${testWorkOrder._id}`)
      .set('Authorization', 'Bearer invalid_token');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Unauthorized');
  });

  test('should return 404 for non-existent work order', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .get(`/api/mfg/work-orders/${fakeId}`)
      .set('Authorization', `Bearer ${mfgToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Work order not found');
  });
});

describe('DFM Exception Management', () => {
  test('should add DFM exception', async () => {
    const exceptionData = {
      code: 'DFM-TEST-001',
      description: 'Test DFM issue',
      severity: 'medium',
      owner: 'Test Owner',
      notes: 'Test notes',
    };

    const response = await request(app)
      .post(`/api/mfg/work-orders/${testWorkOrder._id}/dfm-exceptions`)
      .set('Authorization', `Bearer ${mfgToken}`)
      .send(exceptionData);

    expect(response.status).toBe(201);
    expect(response.body.exception).toMatchObject({
      code: 'DFM-TEST-001',
      description: 'Test DFM issue',
      severity: 'medium',
      status: 'open',
    });
  });

  test('should list DFM exceptions', async () => {
    const response = await request(app)
      .get(`/api/mfg/work-orders/${testWorkOrder._id}/dfm-exceptions`)
      .set('Authorization', `Bearer ${mfgToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.exceptions)).toBe(true);
    expect(response.body.exceptions.length).toBeGreaterThan(0);
  });

  test('should update DFM exception', async () => {
    // First get the exception
    const listResponse = await request(app)
      .get(`/api/mfg/work-orders/${testWorkOrder._id}/dfm-exceptions`)
      .set('Authorization', `Bearer ${mfgToken}`);

    console.log('List response:', listResponse.body);
    expect(listResponse.body.exceptions).toHaveLength(1);
    const exceptionId = listResponse.body.exceptions[0]._id;
    console.log('Exception ID:', exceptionId, typeof exceptionId);

    const updateData = {
      status: 'resolved',
      notes: 'Updated notes',
    };

    const response = await request(app)
      .patch(`/api/mfg/work-orders/${testWorkOrder._id}/dfm-exceptions/${exceptionId}`)
      .set('Authorization', `Bearer ${mfgToken}`)
      .send(updateData);

    console.log('Update response:', response.status, response.body);
    expect(response.status).toBe(200);
    expect(response.body.exception.status).toBe('resolved');
    expect(response.body.exception.notes).toBe('Updated notes');
  });

  test('should delete DFM exception', async () => {
    // First get the exception
    const listResponse = await request(app)
      .get(`/api/mfg/work-orders/${testWorkOrder._id}/dfm-exceptions`)
      .set('Authorization', `Bearer ${mfgToken}`);

    const exceptionId = listResponse.body.exceptions[0]._id;

    const response = await request(app)
      .delete(`/api/mfg/work-orders/${testWorkOrder._id}/dfm-exceptions/${exceptionId}`)
      .set('Authorization', `Bearer ${mfgToken}`);

    expect(response.status).toBe(200);

    // Verify it's deleted
    const listAfterDelete = await request(app)
      .get(`/api/mfg/work-orders/${testWorkOrder._id}/dfm-exceptions`)
      .set('Authorization', `Bearer ${mfgToken}`);

    expect(listAfterDelete.body.exceptions.length).toBe(0);
  });
});

describe('CAM Status Management', () => {
  test('should update CAM status', async () => {
    const statusData = {
      state: 'in_review',
      owner: 'Updated Owner',
      notes: 'Review in progress',
    };

    const response = await request(app)
      .patch(`/api/mfg/work-orders/${testWorkOrder._id}/cam-status`)
      .set('Authorization', `Bearer ${mfgToken}`)
      .send(statusData);

    expect(response.status).toBe(200);
    expect(response.body.camStatus.state).toBe('in_review');
    expect(response.body.camStatus.owner).toBe('Updated Owner');
  });
});

describe('DFM Analytics', () => {
  test('should get DFM analytics', async () => {
    const response = await request(app)
      .get('/api/mfg/analytics/dfm')
      .set('Authorization', `Bearer ${mfgToken}`);

    expect(response.status).toBe(200);
    expect(response.body.analytics).toHaveProperty('statusSummary');
    expect(response.body.analytics).toHaveProperty('reviewTimes');
    expect(response.body.analytics).toHaveProperty('exceptionResolution');
    expect(response.body.analytics).toHaveProperty('issueCategories');
    expect(response.body.analytics).toHaveProperty('monthlyTrends');
  });
});