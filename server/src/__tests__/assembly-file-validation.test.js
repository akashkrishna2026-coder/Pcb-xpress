import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mfgRoutes from "../routes/mfg.js";
import AssemblyMfgWorkOrder from "../models/AssemblyMfgWorkOrder.js";
import User from "../models/User.js";
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
      if (file.startsWith("test_") || file.includes("assembly")) {
        fs.unlinkSync(path.join(uploadDir, file));
      }
    });
  }
});

describe("Assembly File Validation", () => {
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

  describe("BOM File Upload Validation", () => {
    test("accepts valid BOM file upload with required fields", async () => {
      const response = await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("kind", "bom")
        .field("category", "intake")
        .field("description", "Test BOM file")
        .attach("file", Buffer.from("BOM content"), {
          filename: "test_bom.xlsx",
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

      expect(response.status).toBe(201);
      expect(response.body.attachment).toBeDefined();
      expect(response.body.attachment.kind).toBe("bom");
      expect(response.body.attachment.category).toBe("intake");
      expect(response.body.attachment.originalName).toBe("test_bom.xlsx");
      expect(response.body.attachment.mimeType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      expect(response.body.attachment.uploadedBy).toBe(mfgOperator._id.toString());
    });

    test("rejects BOM file upload without required kind field", async () => {
      const response = await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("category", "intake")
        .attach("file", Buffer.from("BOM content"), "test_bom.xlsx");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Kind and category are required");
    });

    test("rejects BOM file upload without required category field", async () => {
      const response = await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("kind", "bom")
        .attach("file", Buffer.from("BOM content"), "test_bom.xlsx");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Kind and category are required");
    });

    test("rejects BOM file upload without file", async () => {
      const response = await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("kind", "bom")
        .field("category", "intake");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("File is required");
    });
  });

  describe("Assembly Instruction File Validation", () => {
    test("accepts valid assembly instruction file upload", async () => {
      const response = await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("kind", "assembly_instruction")
        .field("category", "assembly")
        .field("description", "Test assembly instructions")
        .attach("file", Buffer.from("Step 1: Place component\nStep 2: Solder"), {
          filename: "assembly_instructions.pdf",
          contentType: "application/pdf"
        });

      expect(response.status).toBe(201);
      expect(response.body.attachment.kind).toBe("assembly_instruction");
      expect(response.body.attachment.category).toBe("assembly");
    });

    test("validates assembly instruction file content format", async () => {
      // Test with valid PDF content
      const validPdfContent = Buffer.from("%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Assembly Instructions) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000200 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n284\n%%EOF");

      const response = await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("kind", "assembly_instruction")
        .field("category", "assembly")
        .attach("file", validPdfContent, {
          filename: "valid_instructions.pdf",
          contentType: "application/pdf"
        });

      expect(response.status).toBe(201);
    });
  });

  describe("File Type and Size Restrictions", () => {
    test("accepts allowed MIME types for assembly files", async () => {
      const allowedTypes = [
        { mime: "application/pdf", ext: "pdf" },
        { mime: "image/jpeg", ext: "jpg" },
        { mime: "image/png", ext: "png" },
        { mime: "image/gif", ext: "gif" },
        { mime: "application/zip", ext: "zip" },
        { mime: "text/plain", ext: "txt" }
      ];

      for (const type of allowedTypes) {
        const response = await request(app)
          .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .field("kind", "assembly")
          .field("category", "assembly")
          .attach("file", Buffer.from("test content"), {
            filename: `test.${type.ext}`,
            contentType: type.mime
          });

        expect(response.status).toBe(201);
        expect(response.body.attachment.mimeType).toBe(type.mime);
      }
    });

    test("rejects invalid MIME types for assembly files", async () => {
      const invalidTypes = [
        { mime: "application/javascript", ext: "js" },
        { mime: "text/html", ext: "html" },
        { mime: "application/x-msdownload", ext: "exe" }
      ];

      for (const type of invalidTypes) {
        const response = await request(app)
          .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .field("kind", "assembly")
          .field("category", "assembly")
          .attach("file", Buffer.from("test content"), {
            filename: `test.${type.ext}`,
            contentType: type.mime
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid file type for this upload category");
      }
    });

    test("enforces file size limits (50MB)", async () => {
      // Create a file larger than 50MB (51MB)
      const largeFileSize = 51 * 1024 * 1024;
      const largeFile = Buffer.alloc(largeFileSize, 'x');

      const response = await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("kind", "bom")
        .field("category", "intake")
        .attach("file", largeFile, {
          filename: "large_bom.xlsx",
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("File too large");
    });

    test("accepts files within size limits", async () => {
      // Create a file smaller than 50MB (1MB)
      const smallFileSize = 1 * 1024 * 1024;
      const smallFile = Buffer.alloc(smallFileSize, 'x');

      const response = await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("kind", "bom")
        .field("category", "intake")
        .attach("file", smallFile, {
          filename: "small_bom.xlsx",
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

      expect(response.status).toBe(201);
      expect(response.body.attachment.size).toBe(smallFileSize);
    });
  });

  describe("Attachment Category and Kind Validation", () => {
    test("accepts valid assembly attachment kinds", async () => {
      const validKinds = ['bom', 'assembly', 'assembly_card', 'pick_list', 'assembly_instruction'];

      for (const kind of validKinds) {
        const response = await request(app)
          .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .field("kind", kind)
          .field("category", "assembly")
          .attach("file", Buffer.from("test content"), {
            filename: `test_${kind}.pdf`,
            contentType: "application/pdf"
          });

        expect(response.status).toBe(201);
        expect(response.body.attachment.kind).toBe(kind);
      }
    });

    test("rejects invalid assembly attachment kinds", async () => {
      const invalidKinds = ['invalid_kind', 'gerber', 'drill_file'];

      for (const kind of invalidKinds) {
        const response = await request(app)
          .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .field("kind", kind)
          .field("category", "assembly")
          .attach("file", Buffer.from("test content"), "test.pdf");

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid kind");
      }
    });

    test("accepts valid assembly attachment categories", async () => {
      const validCategories = ['intake', 'assembly'];

      for (const category of validCategories) {
        const response = await request(app)
          .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .field("kind", "bom")
          .field("category", category)
          .attach("file", Buffer.from("test content"), {
            filename: "test_bom.xlsx",
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          });

        expect(response.status).toBe(201);
        expect(response.body.attachment.category).toBe(category);
        expect(response.body.attachment.uploadedBy).toBe(mfgOperator._id.toString());
      }
    });

    test("rejects invalid assembly attachment categories", async () => {
      const invalidCategories = ['invalid_category', 'phototools', 'nc_drill'];

      for (const category of invalidCategories) {
        const response = await request(app)
          .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
          .set("Authorization", `Bearer ${mfgToken}`)
          .field("kind", "bom")
          .field("category", category)
          .attach("file", Buffer.from("test content"), "test.xlsx");

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid category");
      }
    });
  });

  describe("Integration with Attachment Upload Endpoint", () => {
    test("successfully uploads and stores file on disk", async () => {
      const testContent = "Test BOM file content";
      const response = await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("kind", "bom")
        .field("category", "intake")
        .field("description", "Integration test BOM")
        .attach("file", Buffer.from(testContent), {
          filename: "integration_bom.xlsx",
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

      expect(response.status).toBe(201);

      const attachment = response.body.attachment;
      expect(attachment.filename).toMatch(/^(\d+)_integration_bom\.xlsx$/);
      expect(attachment.size).toBe(Buffer.byteLength(testContent));
      expect(attachment.uploadedBy).toBe(mfgOperator._id.toString());
      expect(attachment.uploadedAt).toBeInstanceOf(String);

      // Verify file exists on disk
      const uploadDir = path.join(process.cwd(), "server", "uploads");
      expect(fs.existsSync(path.join(uploadDir, attachment.filename))).toBe(true);

      // Verify file content
      const fileContent = fs.readFileSync(path.join(uploadDir, attachment.filename), "utf8");
      expect(fileContent).toBe(testContent);
    });

    test("updates work order with attachment metadata", async () => {
      const initialAttachments = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id).select('assemblyAttachments');
      expect(initialAttachments.assemblyAttachments).toHaveLength(0);

      await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("kind", "bom")
        .field("category", "intake")
        .attach("file", Buffer.from("BOM content"), {
          filename: "test_bom.xlsx",
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

      const updatedWorkOrder = await AssemblyMfgWorkOrder.findById(assemblyWorkOrder._id).select('assemblyAttachments');
      expect(updatedWorkOrder.assemblyAttachments).toHaveLength(1);
      expect(updatedWorkOrder.assemblyAttachments[0].kind).toBe("bom");
      expect(updatedWorkOrder.assemblyAttachments[0].category).toBe("intake");
    });

    test("returns proper attachment URL", async () => {
      const response = await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("kind", "assembly_instruction")
        .field("category", "assembly")
        .attach("file", Buffer.from("Instructions content"), {
          filename: "instructions.pdf",
          contentType: "application/pdf"
        });

      expect(response.status).toBe(201);
      expect(response.body.attachment.url).toMatch(/^http:\/\/localhost:4000\/api\/uploads\//);
      expect(response.body.attachment.url).toContain(response.body.attachment.filename);
    });
  });

  describe("Error Handling for Invalid Uploads", () => {
    test("handles non-existent work order", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/mfg/work-orders/${fakeId}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("kind", "bom")
        .field("category", "intake")
        .attach("file", Buffer.from("test"), "test.xlsx");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Work order not found");
    });

    test("requires proper authorization", async () => {
      const response = await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${userToken}`)
        .field("kind", "bom")
        .field("category", "intake")
        .attach("file", Buffer.from("test"), "test.xlsx");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized");
    });

    test("cleans up files on validation failure", async () => {
      const uploadDir = path.join(process.cwd(), "server", "uploads");

      // Count files before upload
      const filesBefore = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir).length : 0;

      // Attempt upload with invalid MIME type
      await request(app)
        .post(`/api/mfg/work-orders/${assemblyWorkOrder._id}/attachments`)
        .set("Authorization", `Bearer ${mfgToken}`)
        .field("kind", "bom")
        .field("category", "assembly")
        .attach("file", Buffer.from("test content"), {
          filename: "invalid.exe",
          contentType: "application/x-msdownload"
        });

      // Count files after failed upload
      const filesAfter = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir).length : 0;

      // Should be the same (no orphaned files)
      expect(filesAfter).toBe(filesBefore);
    });
  });
});