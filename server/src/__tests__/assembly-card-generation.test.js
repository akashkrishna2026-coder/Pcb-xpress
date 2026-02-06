import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mfgRoutes from "../routes/mfg.js";
import User from "../models/User.js";
import AssemblyMfgWorkOrder from "../models/AssemblyMfgWorkOrder.js";
import fs from "fs";
import path from "path";

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

  // Clean up any generated files
  const uploadDir = path.join(process.cwd(), "server", "uploads");
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);
    files.forEach(file => {
      if (file.startsWith("assembly_card_")) {
        fs.unlinkSync(path.join(uploadDir, file));
      }
    });
  }
});

describe("Assembly Card Generation", () => {
  let assemblyWorkOrder;

  beforeEach(async () => {
    // Create a test assembly work order
    assemblyWorkOrder = await AssemblyMfgWorkOrder.create({
      woNumber: "WO-TEST-001",
      customer: "Test Customer",
      product: "Test Assembly Product",
      quantity: 100,
      stage: "assembly_store",
      travelerReady: true,
      mfgApproved: true,
      assemblyAttachments: [],
    });
  });

  test("automatically generates assembly card when transitioning from assembly_store to stencil", async () => {
    const response = await request(app)
      .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
      .set("Authorization", `Bearer ${mfgToken}`)
      .send({ stage: "stencil" });

    expect(response.status).toBe(200);
    expect(response.body.workOrder.stage).toBe("stencil");

    // Verify assembly card was created
    const updatedWorkOrder = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id).lean();
    expect(updatedWorkOrder.assemblyAttachments).toHaveLength(1);

    const assemblyCard = updatedWorkOrder.assemblyAttachments[0];
    expect(assemblyCard.kind).toBe("assembly_card");
    expect(assemblyCard.category).toBe("assembly");
    expect(assemblyCard.filename).toMatch(/^assembly_card_WO-TEST-001_/);
    expect(assemblyCard.filename).toMatch(/\.pdf$/);
    expect(assemblyCard.originalName).toBe("Assembly_Card_WO-TEST-001.pdf");
    expect(assemblyCard.mimeType).toBe("application/pdf");
    expect(assemblyCard.approvalStatus).toBeUndefined();
    expect(assemblyCard.version).toBeUndefined();
    expect(assemblyCard.history).toBeUndefined();

    // Verify file was created on disk
    const uploadDir = path.join(process.cwd(), "server", "uploads");
    expect(fs.existsSync(path.join(uploadDir, assemblyCard.filename))).toBe(true);

    // Verify file content
    const fileContent = fs.readFileSync(path.join(uploadDir, assemblyCard.filename), "utf8");
    expect(fileContent).toContain("Assembly Card for Work Order: WO-TEST-001");
    expect(fileContent).toContain("Customer: Test Customer");
    expect(fileContent).toContain("Product: Test Assembly Product");
    expect(fileContent).toContain("Quantity: 100");
  });

  test("prevents duplicate assembly card generation if one already exists", async () => {
    // First, manually add an assembly card
    const existingCard = {
      kind: "assembly_card",
      category: "assembly",
      originalName: "Assembly_Card_WO-TEST-001.pdf",
      filename: "assembly_card_WO-TEST-001_existing.pdf",
      mimeType: "application/pdf",
      size: 1024,
      url: "http://localhost:4000/uploads/assembly_card_WO-TEST-001_existing.pdf",
      uploadedBy: mfgOperator._id,
      uploadedAt: new Date(),
      description: "Existing assembly card",
      approvalStatus: "pending",
      version: 1,
      history: [{
        action: "created",
        operator: mfgOperator._id,
        operatorName: mfgOperator.name,
        timestamp: new Date(),
        notes: "Manually created",
      }],
    };

    await AssemblyMfgWorkOrder.findByIdAndUpdate(assemblyWorkOrder._id, {
      $push: { assemblyAttachments: existingCard }
    });

    // Create the existing file on disk
    const uploadDir = path.join(process.cwd(), "server", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadDir, existingCard.filename), "Existing assembly card content");

    // Attempt to transition to stencil - should not create a new card
    const response = await request(app)
      .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
      .set("Authorization", `Bearer ${mfgToken}`)
      .send({ stage: "stencil" });

    expect(response.status).toBe(200);
    expect(response.body.workOrder.stage).toBe("stencil");

    // Verify only the existing card remains
    const updatedWorkOrder = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id).lean();
    expect(updatedWorkOrder.assemblyAttachments).toHaveLength(1);
    expect(updatedWorkOrder.assemblyAttachments[0].filename).toBe("assembly_card_WO-TEST-001_existing.pdf");

    // Verify no new file was created
    const files = fs.readdirSync(uploadDir).filter(f => f.startsWith("assembly_card_WO-TEST-001_"));
    expect(files).toHaveLength(1);
    expect(files[0]).toBe("assembly_card_WO-TEST-001_existing.pdf");
  });

  test("properly creates and stores assembly card file with correct metadata", async () => {
    const response = await request(app)
      .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
      .set("Authorization", `Bearer ${mfgToken}`)
      .send({ stage: "stencil" });

    expect(response.status).toBe(200);

    const updatedWorkOrder = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id).lean();
    const assemblyCard = updatedWorkOrder.assemblyAttachments[0];

    // Verify metadata
    expect(assemblyCard.uploadedBy.toString()).toBe(mfgOperator._id.toString());
    expect(assemblyCard.uploadedAt).toBeInstanceOf(Date);
    expect(assemblyCard.description).toBe(`Assembly card for work order ${assemblyWorkOrder.woNumber}`);
    expect(assemblyCard.url).toMatch(/^http:\/\/localhost:4000\/api\/uploads\//);

    // Verify file exists and has correct content
    const uploadDir = path.join(process.cwd(), "server", "uploads");
    const filePath = path.join(uploadDir, assemblyCard.filename);
    expect(fs.existsSync(filePath)).toBe(true);

    const fileContent = fs.readFileSync(filePath, "utf8");
    expect(fileContent).toContain(`Assembly Card for Work Order: ${assemblyWorkOrder.woNumber}`);
    expect(fileContent).toContain(`Customer: ${assemblyWorkOrder.customer}`);
    expect(fileContent).toContain(`Product: ${assemblyWorkOrder.product}`);
    expect(fileContent).toContain(`Quantity: ${assemblyWorkOrder.quantity}`);

    // Verify file size matches content
    expect(assemblyCard.size).toBe(Buffer.byteLength(fileContent));
  });

  test("integrates properly with stage transition endpoint and updates work order", async () => {
    // Verify initial state
    let workOrder = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id).lean();
    expect(workOrder.stage).toBe("assembly_store");
    expect(workOrder.assemblyAttachments).toHaveLength(0);

    // Transition to stencil
    const response = await request(app)
      .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
      .set("Authorization", `Bearer ${mfgToken}`)
      .send({ stage: "stencil" });

    expect(response.status).toBe(200);
    expect(response.body.workOrder.stage).toBe("stencil");

    // Verify work order was updated in database
    workOrder = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id).lean();
    expect(workOrder.stage).toBe("stencil");
    expect(workOrder.assemblyAttachments).toHaveLength(1);

    // Verify the attachment is properly linked
    const assemblyCard = workOrder.assemblyAttachments[0];
    expect(assemblyCard.kind).toBe("assembly_card");
    expect(assemblyCard.filename).toMatch(/^assembly_card_WO-TEST-001_/);

    // Verify file exists
    const uploadDir = path.join(process.cwd(), "server", "uploads");
    expect(fs.existsSync(path.join(uploadDir, assemblyCard.filename))).toBe(true);
  });

  test("handles stage transitions that do not trigger assembly card generation", async () => {
    // Transition to a different stage that shouldn't generate assembly card
    const response = await request(app)
      .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
      .set("Authorization", `Bearer ${mfgToken}`)
      .send({ stage: "assembly_reflow" });

    expect(response.status).toBe(200);
    expect(response.body.workOrder.stage).toBe("assembly_reflow");

    // Verify no assembly card was created
    const updatedWorkOrder = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id).lean();
    expect(updatedWorkOrder.assemblyAttachments).toHaveLength(0);

    // Verify no files were created
    const uploadDir = path.join(process.cwd(), "server", "uploads");
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir).filter(f => f.startsWith("assembly_card_"));
      expect(files).toHaveLength(0);
    }
  });

  test("requires proper authorization for stage transitions", async () => {
    // Try with user token (should fail)
    const response = await request(app)
      .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ stage: "stencil" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Unauthorized");

    // Verify no changes were made
    const workOrder = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id).lean();
    expect(workOrder.stage).toBe("assembly_store");
    expect(workOrder.assemblyAttachments).toHaveLength(0);
  });

  test("validates stage transitions for assembly work orders", async () => {
    // Try invalid stage
    const response = await request(app)
      .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
      .set("Authorization", `Bearer ${mfgToken}`)
      .send({ stage: "invalid_stage" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid stage");

    // Verify no changes were made
    const workOrder = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id).lean();
    expect(workOrder.stage).toBe("assembly_store");
  });
});