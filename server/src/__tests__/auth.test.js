import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Auth Routes', () => {
  test('POST /api/auth/signup - should create a new user', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.email).toBe('test@example.com');
  });

  test('POST /api/auth/login - should login existing user', async () => {
    // First signup
    await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test User',
        email: 'login@example.com',
        password: 'password123'
      });

    // Then login
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe('login@example.com');
  });

  test('POST /api/auth/signup - should reject invalid data', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'invalid',
        password: '123'
      });

    expect(response.status).toBe(400);
  });
});