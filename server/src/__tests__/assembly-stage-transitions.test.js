import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mfgRoutes from "../routes/mfg.js";
import AssemblyMfgWorkOrder from "../models/AssemblyMfgWorkOrder.js";
import MfgWorkOrder from "../models/MfgWorkOrder.js";
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
  await MfgWorkOrder.deleteMany({});
});

describe("Assembly Stage Transition Validation", () => {
  let assemblyWorkOrder;
  let pcbWorkOrder;

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

    // Create a test PCB work order for comparison
    pcbWorkOrder = await MfgWorkOrder.create({
      woNumber: "PCB-TEST-001",
      customer: "Test PCB Customer",
      product: "Test PCB Product",
      quantity: 50,
      stage: "cam",
      travelerReady: true,
      mfgApproved: true,
      camAttachments: [],
    });
  });

  describe("Valid Assembly Stage Transitions", () => {
    test("allows valid assembly stage transitions in sequence", async () => {
      const validTransitions = [
        "assembly_store",
        "stencil",
        "assembly_reflow",
        "th_soldering",
        "visual_inspection",
        "ict",
        "flashing",
        "functional_test",
        "wire_harness_intake",
        "wire_harness",
        "wire_testing",
        "assembly_3d_printing",
        "assembly_final_dispatch"
      ];

      let currentStage = "assembly_store";

      for (const nextStage of validTransitions.slice(1)) {
        const response = await request(app)
          .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .send({ stage: nextStage });

        expect(response.status).toBe(200);
        expect(response.body.workOrder.stage).toBe(nextStage);

        // Verify database update
        const updatedWO = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
        expect(updatedWO.stage).toBe(nextStage);

        currentStage = nextStage;
      }
    });

    test("allows transitioning back to earlier stages", async () => {
      // First move to stencil
      await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .send({ stage: "stencil" });

      // Then move back to assembly_store
      const response = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .send({ stage: "assembly_store" });

      expect(response.status).toBe(200);
      expect(response.body.workOrder.stage).toBe("assembly_store");

      const updatedWO = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
      expect(updatedWO.stage).toBe("assembly_store");
    });

    test("allows non-sequential valid transitions", async () => {
      // Jump from assembly_store directly to visual_inspection
      const response = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .send({ stage: "visual_inspection" });

      expect(response.status).toBe(200);
      expect(response.body.workOrder.stage).toBe("visual_inspection");

      const updatedWO = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
      expect(updatedWO.stage).toBe("visual_inspection");
    });
  });

  describe("Invalid Stage Name Rejection", () => {
    test("rejects invalid stage names for assembly work orders", async () => {
      const invalidStages = [
        "invalid_stage",
        "cam",
        "planning",
        "fabrication",
        "drilling",
        "photo_imaging",
        "developer",
        "etching",
        "solder_mask",
        "surface_finish",
        "legend_print",
        "cnc_routing",
        "v_score",
        "flying_probe",
        "final_qc_pdir",
        "packing",
        "dispatch",
        "shipping",
        "shipped",
        "final_qa",
        "assembly",
        "pth"
      ];

      for (const invalidStage of invalidStages) {
        const response = await request(app)
          .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .send({ stage: invalidStage });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid stage");

        // Verify stage didn't change
        const wo = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
        expect(wo.stage).toBe("assembly_store");
      }
    });

    test("rejects empty or null stage values", async () => {
      const invalidStages = ["", null, undefined];

      for (const invalidStage of invalidStages) {
        const response = await request(app)
          .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .send({ stage: invalidStage });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Stage is required");

        // Verify stage didn't change
        const wo = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
        expect(wo.stage).toBe("assembly_store");
      }
    });
  });

  describe("Traveler Ready Requirement Validation", () => {
    test("allows stage transitions when travelerReady is true", async () => {
      // Ensure work order has travelerReady: true
      await AssemblyMfgWorkOrder.findByIdAndUpdate(assemblyWorkOrder._id, {
        travelerReady: true
      });

      const response = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .send({ stage: "stencil" });

      expect(response.status).toBe(200);
      expect(response.body.workOrder.stage).toBe("stencil");
    });

    test("allows stage transitions even when travelerReady is false", async () => {
      // Set travelerReady to false
      await AssemblyMfgWorkOrder.findByIdAndUpdate(assemblyWorkOrder._id, {
        travelerReady: false
      });

      const response = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .send({ stage: "stencil" });

      // Stage transitions should still work regardless of travelerReady status
      expect(response.status).toBe(200);
      expect(response.body.workOrder.stage).toBe("stencil");
    });
  });

  describe("Permission Checks", () => {
    test("allows stage transitions for mfg role users", async () => {
      const response = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .send({ stage: "stencil" });

      expect(response.status).toBe(200);
      expect(response.body.workOrder.stage).toBe("stencil");
    });

    test("allows stage transitions for admin role users", async () => {
      const response = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ stage: "stencil" });

      expect(response.status).toBe(200);
      expect(response.body.workOrder.stage).toBe("stencil");
    });

    test("rejects stage transitions for user role (non-mfg/admin)", async () => {
      const response = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ stage: "stencil" });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized");

      // Verify stage didn't change
      const wo = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
      expect(wo.stage).toBe("assembly_store");
    });

    test("rejects stage transitions without authentication", async () => {
      const response = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .send({ stage: "stencil" });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized");

      // Verify stage didn't change
      const wo = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
      expect(wo.stage).toBe("assembly_store");
    });
  });

  describe("Assembly vs PCB Stage Validation", () => {
    test("validates assembly stages for assembly work orders", async () => {
      const assemblyStages = [
        "assembly_store",
        "stencil",
        "assembly_reflow",
        "th_soldering",
        "visual_inspection",
        "ict",
        "flashing",
        "functional_test",
        "wire_harness_intake",
        "wire_harness",
        "wire_testing",
        "assembly_3d_printing",
        "assembly_final_dispatch"
      ];

      for (const stage of assemblyStages) {
        const response = await request(app)
          .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .send({ stage });

        expect(response.status).toBe(200);
        expect(response.body.workOrder.stage).toBe(stage);

        // Reset to assembly_store for next test
        await AssemblyMfgWorkOrder.findByIdAndUpdate(assemblyWorkOrder._id, {
          stage: "assembly_store"
        });
      }
    });

    test("validates PCB stages for PCB work orders", async () => {
      const pcbStages = [
        "cam",
        "planning",
        "fabrication",
        "drilling",
        "sanding",
        "brushing",
        "photo_imaging",
        "developer",
        "etching",
        "tin_strip",
        "solder_mask",
        "surface_finish",
        "legend_print",
        "cnc_routing",
        "v_score",
        "flying_probe",
        "final_qc_pdir",
        "packing",
        "dispatch",
        "pth",
        "final_qa",
        "assembly",
        "shipping",
        "shipped"
      ];

      for (const stage of pcbStages) {
        const response = await request(app)
          .patch(`/api/mfg/work-orders/${pcbWorkOrder._id}/stage`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .send({ stage });

        expect(response.status).toBe(200);
        expect(response.body.workOrder.stage).toBe(stage);

        // Reset to cam for next test
        await MfgWorkOrder.findByIdAndUpdate(pcbWorkOrder._id, {
          stage: "cam"
        });
      }
    });

    test("rejects PCB stages for assembly work orders", async () => {
      const pcbOnlyStages = ["cam", "planning", "fabrication", "drilling", "photo_imaging"];

      for (const stage of pcbOnlyStages) {
        const response = await request(app)
          .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .send({ stage });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid stage");

        // Verify stage didn't change
        const wo = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
        expect(wo.stage).toBe("assembly_store");
      }
    });

    test("rejects assembly stages for PCB work orders", async () => {
      const assemblyOnlyStages = ["assembly_store", "stencil", "assembly_reflow", "th_soldering"];

      for (const stage of assemblyOnlyStages) {
        const response = await request(app)
          .patch(`/api/mfg/work-orders/${pcbWorkOrder._id}/stage`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .send({ stage });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid stage");

        // Verify stage didn't change
        const wo = await MfgWorkOrder.findById(pcbWorkOrder._id);
        expect(wo.stage).toBe("cam");
      }
    });
  });

  describe("Integration with Stage Transition Endpoint", () => {
    test("successfully updates work order stage in database", async () => {
      const initialStage = assemblyWorkOrder.stage;

      const response = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .send({ stage: "stencil" });

      expect(response.status).toBe(200);
      expect(response.body.workOrder.stage).toBe("stencil");

      // Verify database was updated
      const updatedWO = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
      expect(updatedWO.stage).toBe("stencil");
      expect(updatedWO.stage).not.toBe(initialStage);
    });

    test("returns updated work order in response", async () => {
      const response = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .send({ stage: "stencil" });

      expect(response.status).toBe(200);
      expect(response.body.workOrder).toBeDefined();
      expect(response.body.workOrder._id).toBe(assemblyWorkOrder._id.toString());
      expect(response.body.workOrder.stage).toBe("stencil");
      expect(response.body.workOrder.woNumber).toBe(assemblyWorkOrder.woNumber);
    });

    test("handles non-existent work order", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .patch(`/api/mfg/work-orders/${fakeId}/stage`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .send({ stage: "stencil" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Work order not found");
    });

    test("automatically generates assembly card on assembly_store to stencil transition", async () => {
      // Ensure no assembly card exists initially
      const initialWO = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
      expect(initialWO.assemblyAttachments.filter(att => att.kind === 'assembly_card')).toHaveLength(0);

      const response = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .send({ stage: "stencil" });

      expect(response.status).toBe(200);
      expect(response.body.workOrder.stage).toBe("stencil");

      // Verify assembly card was generated
      const updatedWO = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
      const assemblyCards = updatedWO.assemblyAttachments.filter(att => att.kind === 'assembly_card');
      expect(assemblyCards).toHaveLength(1);
      expect(assemblyCards[0].category).toBe('assembly');
    });

    test("does not generate assembly card on other transitions", async () => {
      const response = await request(app)
        .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .send({ stage: "assembly_reflow" });

      expect(response.status).toBe(200);
      expect(response.body.workOrder.stage).toBe("assembly_reflow");

      // Verify no assembly card was generated
      const updatedWO = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
      const assemblyCards = updatedWO.assemblyAttachments.filter(att => att.kind === 'assembly_card');
      expect(assemblyCards).toHaveLength(0);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("handles malformed request bodies", async () => {
      const malformedBodies = [
        {},
        { stage: null },
        { stage: undefined },
        { invalidField: "stencil" }
      ];

      for (const body of malformedBodies) {
        const response = await request(app)
          .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .send(body);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Stage is required");

        // Verify stage didn't change
        const wo = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
        expect(wo.stage).toBe("assembly_store");
      }
    });

    test("handles concurrent stage transitions", async () => {
      // This test verifies that multiple rapid transitions work correctly
      const stages = ["stencil", "assembly_reflow", "th_soldering"];

      for (const stage of stages) {
        const response = await request(app)
          .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .send({ stage });

        expect(response.status).toBe(200);
        expect(response.body.workOrder.stage).toBe(stage);
      }

      // Verify final stage
      const finalWO = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
      expect(finalWO.stage).toBe("th_soldering");
    });

    test("validates stage transitions with special characters", async () => {
      const invalidStages = [
        "assembly_store ",
        " stencil",
        "assembly-reflow",
        "ASSEMBLY_STORE",
        "Assembly_Store"
      ];

      for (const stage of invalidStages) {
        const response = await request(app)
          .patch(`/api/mfg/work-orders/${assemblyWorkOrder._id}/stage`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .send({ stage });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid stage");

        // Verify stage didn't change
        const wo = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id);
        expect(wo.stage).toBe("assembly_store");
      }
    });
  });
});
