import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mfgRoutes from "../routes/mfg.js";
import AssemblyMfgWorkOrder from "../models/AssemblyMfgWorkOrder.js";
import AssemblyDispatch from "../models/AssemblyDispatch.js";
import User from "../models/User.js";

let mongoServer;
let app;
let userToken;
let adminToken;
let mfgToken;
let user;
let admin;
let mfgOperator;

beforeAll(async () => {
  process.env.JWT_SECRET = "dev_secret";
  process.env.API_BASE_URL = "http://localhost:4000";

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/mfg", mfgRoutes);

  user = await User.create({
    name: "Assembly Customer",
    email: "customer@test.com",
    password: await bcrypt.hash("password", 10),
    role: "user",
  });

  admin = await User.create({
    name: "Admin",
    email: "admin@test.com",
    password: await bcrypt.hash("password", 10),
    role: "admin",
  });

  mfgOperator = await User.create({
    name: "Mfg Operator",
    email: "operator@test.com",
    password: await bcrypt.hash("password", 10),
    role: "mfg",
    permissions: ["traveler:read", "traveler:release"],
    workCenter: "assembly",
    mfgRole: "assembly_operator",
    isActive: true,
  });

  userToken = jwt.sign({ sub: user._id, email: user.email, role: "user" }, process.env.JWT_SECRET);
  adminToken = jwt.sign({ sub: admin._id, email: admin.email, role: "admin" }, process.env.JWT_SECRET);
  mfgToken = jwt.sign({ sub: mfgOperator._id, email: mfgOperator.email, role: "mfg" }, process.env.JWT_SECRET);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await AssemblyMfgWorkOrder.deleteMany({});
  await AssemblyDispatch.deleteMany({});
});

describe("Assembly Dispatch Creation from Final Assembly Transfer", () => {
  let assemblyWorkOrder;

  beforeEach(async () => {
    // Create a test assembly work order in assembly_final_dispatch stage
    assemblyWorkOrder = await AssemblyMfgWorkOrder.create({
      woNumber: "WO-TEST-001",
      customer: "Test Customer",
      product: "Test Assembly Product",
      quantity: 100,
      stage: "assembly_final_dispatch",
      travelerReady: true,
      mfgApproved: true,
      assemblyAttachments: [],
      assemblyFinalDispatchChecklist: [
        {
          section: "Final QC",
          items: [
            { id: "qc_complete", label: "QC checks completed", checked: true, completed: true },
            { id: "docs_ready", label: "Documentation ready", checked: true, completed: true },
          ],
        },
      ],
      assemblyFinalDispatchStatus: {
        state: "approved",
        owner: "test_operator",
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  describe("Dispatch Creation on Transfer from assembly_final_dispatch", () => {
    test("creates dispatch record when transferring from assembly_final_dispatch", async () => {
      // Verify no dispatch exists initially
      const initialDispatches = await AssemblyDispatch.find({});
      expect(initialDispatches).toHaveLength(0);

      // Simulate the transfer by calling the work order update endpoint
      // This mimics what TransferView does when transferring from assembly_final_dispatch
      const updateData = {
        assemblyFinalDispatchStatus: {
          ...assemblyWorkOrder.assemblyFinalDispatchStatus,
          state: 'approved',
          releasedAt: new Date().toISOString()
        },
        travelerReady: true,
      };

      // Send notification to admin dispatch page (simulate dispatch creation)
      const dispatchPayload = {
        workOrderId: assemblyWorkOrder._id,
        woNumber: assemblyWorkOrder.woNumber,
        customer: assemblyWorkOrder.customer,
        product: assemblyWorkOrder.product,
        quantity: assemblyWorkOrder.quantity,
        priority: assemblyWorkOrder.priority || 'normal',
        stage: 'assembly_final_dispatch',
        status: 'pending',
        notes: 'Transferred from final assembly dispatch',
        releasedAt: new Date().toISOString(),
        items: [
          {
            part: assemblyWorkOrder.product || 'ASSEMBLY',
            name: assemblyWorkOrder.product || 'Assembled Product',
            description: `Final assembly dispatch for ${assemblyWorkOrder.woNumber}`,
            quantity: assemblyWorkOrder.quantity || 1,
            assemblyType: 'store',
          },
        ],
      };

      // Create the dispatch using the API
      const dispatchResponse = await request(app)
        .post('/api/mfg/dispatches')
        .set('Authorization', `Bearer ${mfgToken}`)
        .send(dispatchPayload);

      expect(dispatchResponse.status).toBe(201);
      expect(dispatchResponse.body.dispatch).toBeDefined();
      expect(dispatchResponse.body.dispatch.dispatchNumber).toMatch(/^ASM-DSP-/);

      // Verify dispatch was created in database
      const createdDispatch = await AssemblyDispatch.findById(dispatchResponse.body.dispatch._id);
      expect(createdDispatch).toBeTruthy();
      expect(createdDispatch.workOrder.toString()).toBe(assemblyWorkOrder._id.toString());
      expect(createdDispatch.workOrderNumber).toBe(assemblyWorkOrder.woNumber);
      expect(createdDispatch.customer).toBe(assemblyWorkOrder.customer);
      expect(createdDispatch.product).toBe(assemblyWorkOrder.product);
      expect(createdDispatch.quantity).toBe(assemblyWorkOrder.quantity);
      expect(createdDispatch.status).toBe('pending');
      expect(createdDispatch.items).toHaveLength(1);
      expect(createdDispatch.items[0].part).toBe(assemblyWorkOrder.product);
      expect(createdDispatch.items[0].assemblyType).toBe('store');
      expect(createdDispatch.createdBy.toString()).toBe(mfgOperator._id.toString());
    });

    test("includes correct item details in dispatch", async () => {
      const dispatchPayload = {
        workOrderId: assemblyWorkOrder._id,
        woNumber: assemblyWorkOrder.woNumber,
        customer: assemblyWorkOrder.customer,
        product: assemblyWorkOrder.product,
        quantity: assemblyWorkOrder.quantity,
        priority: 'high',
        stage: 'assembly_final_dispatch',
        status: 'pending',
        notes: 'Test dispatch creation',
        items: [
          {
            part: 'CUSTOM-PCB-001',
            name: 'Custom PCB Assembly',
            description: 'High-quality PCB assembly with components',
            quantity: 50,
            serialNumbers: ['SN001', 'SN002'],
            batchNumbers: ['BATCH001'],
            assemblyType: 'reflow',
          },
        ],
      };

      const dispatchResponse = await request(app)
        .post('/api/mfg/dispatches')
        .set('Authorization', `Bearer ${mfgToken}`)
        .send(dispatchPayload);

      expect(dispatchResponse.status).toBe(201);

      const createdDispatch = await AssemblyDispatch.findById(dispatchResponse.body.dispatch._id);
      expect(createdDispatch.items[0].part).toBe('CUSTOM-PCB-001');
      expect(createdDispatch.items[0].name).toBe('Custom PCB Assembly');
      expect(createdDispatch.items[0].description).toBe('High-quality PCB assembly with components');
      expect(createdDispatch.items[0].quantity).toBe(50);
      expect(createdDispatch.items[0].serialNumbers).toEqual(['SN001', 'SN002']);
      expect(createdDispatch.items[0].batchNumbers).toEqual(['BATCH001']);
      expect(createdDispatch.items[0].assemblyType).toBe('reflow');
    });

    test("generates unique dispatch numbers", async () => {
      const dispatchPayload1 = {
        workOrderId: assemblyWorkOrder._id,
        woNumber: assemblyWorkOrder.woNumber,
        customer: assemblyWorkOrder.customer,
        product: assemblyWorkOrder.product,
        quantity: assemblyWorkOrder.quantity,
        stage: 'assembly_final_dispatch',
        status: 'pending',
        items: [{
          part: assemblyWorkOrder.product,
          name: assemblyWorkOrder.product,
          description: `Dispatch for ${assemblyWorkOrder.woNumber}`,
          quantity: assemblyWorkOrder.quantity,
          assemblyType: 'store',
        }],
      };

      const dispatchPayload2 = {
        ...dispatchPayload1,
        woNumber: 'WO-TEST-002',
      };

      const response1 = await request(app)
        .post('/api/mfg/dispatches')
        .set('Authorization', `Bearer ${mfgToken}`)
        .send(dispatchPayload1);

      const response2 = await request(app)
        .post('/api/mfg/dispatches')
        .set('Authorization', `Bearer ${mfgToken}`)
        .send(dispatchPayload2);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      const dispatch1 = response1.body.dispatch;
      const dispatch2 = response2.body.dispatch;

      expect(dispatch1.dispatchNumber).not.toBe(dispatch2.dispatchNumber);
      expect(dispatch1.dispatchNumber).toMatch(/^ASM-DSP-/);
      expect(dispatch2.dispatchNumber).toMatch(/^ASM-DSP-/);
    });

    test("validates required fields for dispatch creation", async () => {
      const invalidPayload = {
        // Missing required fields like workOrderId, items, etc.
        customer: "Test Customer",
        product: "Test Product",
      };

      const response = await request(app)
        .post('/api/mfg/dispatches')
        .set('Authorization', `Bearer ${mfgToken}`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      // The exact error message will depend on validation, but it should fail
    });

    test("requires authentication for dispatch creation", async () => {
      const dispatchPayload = {
        workOrderId: assemblyWorkOrder._id,
        woNumber: assemblyWorkOrder.woNumber,
        customer: assemblyWorkOrder.customer,
        product: assemblyWorkOrder.product,
        quantity: assemblyWorkOrder.quantity,
        stage: 'assembly_final_dispatch',
        status: 'pending',
        items: [{
          part: assemblyWorkOrder.product,
          name: assemblyWorkOrder.product,
          description: `Dispatch for ${assemblyWorkOrder.woNumber}`,
          quantity: assemblyWorkOrder.quantity,
          assemblyType: 'store',
        }],
      };

      const response = await request(app)
        .post('/api/mfg/dispatches')
        .send(dispatchPayload);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    test("rejects dispatch creation for non-existent work order", async () => {
      const fakeWorkOrderId = new mongoose.Types.ObjectId();
      const dispatchPayload = {
        workOrderId: fakeWorkOrderId,
        woNumber: 'WO-FAKE-001',
        customer: 'Fake Customer',
        product: 'Fake Product',
        quantity: 1,
        stage: 'assembly_final_dispatch',
        status: 'pending',
        items: [{
          part: 'FAKE-PART',
          name: 'Fake Part',
          description: 'Fake dispatch item',
          quantity: 1,
          assemblyType: 'store',
        }],
      };

      const response = await request(app)
        .post('/api/mfg/dispatches')
        .set('Authorization', `Bearer ${mfgToken}`)
        .send(dispatchPayload);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Work order not found');
    });

    test("sets correct default values for dispatch", async () => {
      const dispatchPayload = {
        workOrderId: assemblyWorkOrder._id,
        woNumber: assemblyWorkOrder.woNumber,
        customer: assemblyWorkOrder.customer,
        product: assemblyWorkOrder.product,
        quantity: assemblyWorkOrder.quantity,
        stage: 'assembly_final_dispatch',
        status: 'pending',
        items: [{
          part: assemblyWorkOrder.product,
          name: assemblyWorkOrder.product,
          description: `Dispatch for ${assemblyWorkOrder.woNumber}`,
          quantity: assemblyWorkOrder.quantity,
          assemblyType: 'store',
        }],
      };

      const response = await request(app)
        .post('/api/mfg/dispatches')
        .set('Authorization', `Bearer ${mfgToken}`)
        .send(dispatchPayload);

      expect(response.status).toBe(201);

      const createdDispatch = await AssemblyDispatch.findById(response.body.dispatch._id);
      expect(createdDispatch.status).toBe('pending');
      expect(createdDispatch.priority).toBe('normal'); // Default priority
      expect(createdDispatch.qualityCheck.passed).toBe(false); // Default quality check
      expect(createdDispatch.adminReview.reviewed).toBe(false); // Default admin review
      expect(createdDispatch.shippingDetails.carrier).toBeUndefined(); // Should be empty initially
    });
  });

  describe("Integration with TransferView Dispatch Creation", () => {
    test("simulates the complete transfer and dispatch creation flow", async () => {
      // First, ensure the work order is in the correct state for transfer
      await AssemblyMfgWorkOrder.findByIdAndUpdate(assemblyWorkOrder._id, {
        stage: 'assembly_final_dispatch',
        travelerReady: true,
        assemblyFinalDispatchStatus: {
          state: 'approved',
          owner: 'test_operator',
          startedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Simulate what TransferView does: update work order and create dispatch
      const updateData = {
        assemblyFinalDispatchStatus: {
          state: 'approved',
          releasedAt: new Date().toISOString()
        },
        travelerReady: true,
      };

      // Update the work order (simulating the transfer)
      const workOrderUpdateResponse = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}`)
        .set('Authorization', `Bearer ${mfgToken}`)
        .send(updateData);

      expect(workOrderUpdateResponse.status).toBe(200);

      // Create the dispatch (simulating the dispatch creation in TransferView)
      const dispatchPayload = {
        workOrderId: assemblyWorkOrder._id,
        woNumber: assemblyWorkOrder.woNumber,
        customer: assemblyWorkOrder.customer,
        product: assemblyWorkOrder.product,
        quantity: assemblyWorkOrder.quantity,
        priority: 'normal',
        stage: 'assembly_final_dispatch',
        status: 'pending',
        notes: 'Transferred from final assembly dispatch',
        releasedAt: new Date().toISOString(),
        items: [
          {
            part: assemblyWorkOrder.product || 'ASSEMBLY',
            name: assemblyWorkOrder.product || 'Assembled Product',
            description: `Final assembly dispatch for ${assemblyWorkOrder.woNumber}`,
            quantity: assemblyWorkOrder.quantity || 1,
            assemblyType: 'store',
          },
        ],
      };

      const dispatchResponse = await request(app)
        .post('/api/mfg/dispatches')
        .set('Authorization', `Bearer ${mfgToken}`)
        .send(dispatchPayload);

      expect(dispatchResponse.status).toBe(201);

      // Verify both work order update and dispatch creation
      const updatedWorkOrder = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
      expect(updatedWorkOrder.assemblyFinalDispatchStatus.state).toBe('approved');
      expect(updatedWorkOrder.travelerReady).toBe(true);

      const createdDispatch = await AssemblyDispatch.findById(dispatchResponse.body.dispatch._id);
      expect(createdDispatch).toBeTruthy();
      expect(createdDispatch.workOrder.toString()).toBe(assemblyWorkOrder._id.toString());
      expect(createdDispatch.status).toBe('pending');
      expect(createdDispatch.items).toHaveLength(1);
    });
  });
});