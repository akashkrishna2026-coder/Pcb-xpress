import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import quotesRoutes from "../routes/quotes.js";
import User from "../models/User.js";
import {
  deleteQuotes,
  findQuoteById,
  findQuoteByIdAndUpdate,
} from "../models/Quote.js";
import MfgWorkOrder from "../models/MfgWorkOrder.js";
import AssemblyMfgWorkOrder from "../models/AssemblyMfgWorkOrder.js";

let mongoServer;
let app;
let userToken;
let adminToken;
let user;

beforeAll(async () => {
  process.env.JWT_SECRET = "dev_secret";
  process.env.API_BASE_URL = "http://localhost:4000";

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/quotes", quotesRoutes);

  user = await User.create({
    name: "Assembly Customer",
    email: "customer@test.com",
    password: await bcrypt.hash("password", 10),
    role: "user",
  });

  const admin = await User.create({
    name: "Admin",
    email: "admin@test.com",
    password: await bcrypt.hash("password", 10),
    role: "admin",
  });

  userToken = jwt.sign({ sub: user._id, email: user.email, role: "user" }, process.env.JWT_SECRET);
  adminToken = jwt.sign({ sub: admin._id, email: admin.email, role: "admin" }, process.env.JWT_SECRET);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await deleteQuotes({});
  await MfgWorkOrder.deleteMany({});
  await AssemblyMfgWorkOrder.deleteMany({});
});

describe("Assembly quote lifecycle", () => {
  test("creates an assembly quote with specs metadata", async () => {
    const payload = {
      service: "pcb_assembly",
      specsAssembly: {
        boardWidthMm: 120,
        boardHeightMm: 80,
        layers: 4,
        assemblyType: "smt",
        componentCount: 250,
        solderType: "lead_free",
        quantity: 100,
      },
      delivery: { speed: "express" },
      contact: { email: "customer@test.com", name: "Assembly Customer" },
      quote: { total: 0 },
      bomStats: { totalLines: 10 },
    };

    const response = await request(app)
      .post("/api/quotes")
      .set("Authorization", `Bearer ${userToken}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.quote.service).toBe("pcb_assembly");
    expect(response.body.quote.specsAssembly).toMatchObject({
      boardWidthMm: 120,
      boardHeightMm: 80,
      layers: 4,
      assemblyType: "smt",
      componentCount: 250,
      solderType: "lead_free",
      quantity: 100,
    });

    const stored = await findQuoteById(response.body.quote.id, { lean: true });
    expect(stored).toBeTruthy();
    expect(stored.service).toBe("pcb_assembly");
    expect(stored.specsAssembly).toMatchObject({
      boardWidthMm: 120,
      boardHeightMm: 80,
      layers: 4,
      assemblyType: "smt",
      componentCount: 250,
      solderType: "lead_free",
      quantity: 100,
    });
  });

  test("promotes an assembly quote to manufacturing work order at assembly store stage", async () => {
    const payload = {
      service: "pcb_assembly",
      specsAssembly: {
        boardWidthMm: 150,
        boardHeightMm: 90,
        layers: 6,
        assemblyType: "mixed",
        componentCount: 480,
        solderType: "leaded",
        quantity: 250,
      },
      delivery: { speed: "standard" },
      contact: { email: "customer@test.com", name: "Assembly Customer" },
      quote: { total: 150000 },
    };

    const { body } = await request(app)
      .post("/api/quotes")
      .set("Authorization", `Bearer ${userToken}`)
      .send(payload);

    const quoteId = body.quote.id;

    await findQuoteByIdAndUpdate(quoteId, {
      paymentProof: { status: "approved", approvedAt: new Date() },
    });

    const approval = await request(app)
      .put(`/api/quotes/${quoteId}/mfg-approve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send();

    expect(approval.status).toBe(200);
    expect(approval.body.workOrder.stage).toBe("assembly_store");
    expect(approval.body.workOrder.quantity).toBe(250);
    expect(approval.body.workOrder.product).toContain("Assembly:");

    const refreshedQuote = await findQuoteById(quoteId, { lean: true });
    expect(refreshedQuote.mfgApproved).toBe(true);
    expect(refreshedQuote.stage).toBe("assembly_store");

    const workOrder = await AssemblyMfgWorkOrder.findOne({ quoteId }).lean();
    expect(workOrder).toBeTruthy();
    expect(workOrder.stage).toBe("assembly_store");
  });
});
