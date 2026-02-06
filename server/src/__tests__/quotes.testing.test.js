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
} from "../models/Quote.js";
import MfgWorkOrder from "../models/MfgWorkOrder.js";

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
    name: "Testing Customer",
    email: "testing@test.com",
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
});

describe("Testing quote lifecycle", () => {
  test("creates a testing quote with specs metadata", async () => {
    const payload = {
      service: "testing",
      specsTesting: {
        testType: "functional",
        requirements: "Comprehensive functional testing required for IoT device",
        quantity: 50,
      },
      delivery: { speed: "express" },
      contact: { email: "testing@test.com", name: "Testing Customer" },
      quote: { total: 0 },
    };

    const response = await request(app)
      .post("/api/quotes")
      .set("Authorization", `Bearer ${userToken}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.quote.service).toBe("testing");
    expect(response.body.quote.specsTesting).toMatchObject({
      testType: "functional",
      requirements: "Comprehensive functional testing required for IoT device",
      quantity: 50,
    });

    const stored = await findQuoteById(response.body.quote.id, { lean: true });
    expect(stored).toBeTruthy();
    expect(stored.service).toBe("testing");
    expect(stored.specsTesting).toMatchObject({
      testType: "functional",
      requirements: "Comprehensive functional testing required for IoT device",
      quantity: 50,
    });
  });

  test("admin can list testing quotes", async () => {
    // Create a testing quote
    const payload = {
      service: "testing",
      specsTesting: {
        testType: "electrical",
        requirements: "Electrical safety testing",
        quantity: 25,
      },
      delivery: { speed: "standard" },
      contact: { email: "testing@test.com", name: "Testing Customer" },
      quote: { total: 0 },
    };

    await request(app)
      .post("/api/quotes")
      .set("Authorization", `Bearer ${userToken}`)
      .send(payload);

    // Admin lists testing quotes
    const listResponse = await request(app)
      .get("/api/quotes?service=testing")
      .set("Authorization", `Bearer ${adminToken}`)
      .send();

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body.quotes)).toBe(true);
    expect(listResponse.body.quotes.length).toBe(1);
    expect(listResponse.body.quotes[0].service).toBe("testing");
    expect(listResponse.body.quotes[0].specsTesting.testType).toBe("electrical");
  });

  test("admin can send testing quote", async () => {
    // Create a testing quote
    const createPayload = {
      service: "testing",
      specsTesting: {
        testType: "burn_in",
        requirements: "Burn-in testing for reliability",
        quantity: 100,
      },
      delivery: { speed: "express" },
      contact: { email: "testing@test.com", name: "Testing Customer" },
      quote: { total: 0 },
    };

    const createResponse = await request(app)
      .post("/api/quotes")
      .set("Authorization", `Bearer ${userToken}`)
      .send(createPayload);

    const quoteId = createResponse.body.quote.id;

    // Admin sends quote
    const sendResponse = await request(app)
      .put(`/api/quotes/${quoteId}/admin-quote`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        total: 25000,
        currency: "INR",
        notes: "Testing quote for burn-in testing services"
      });

    expect(sendResponse.status).toBe(200);

    // Verify quote was updated
    const updatedQuote = await findQuoteById(quoteId, { lean: true });
    expect(updatedQuote.status).toBe("sent");
    expect(updatedQuote.adminQuote.total).toBe(25000);
    expect(updatedQuote.adminQuote.notes).toBe("Testing quote for burn-in testing services");
  });
});
