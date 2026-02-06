import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';
import MfgWorkOrder from '../models/MfgWorkOrder.js';

async function seedBomAttachments() {
  await connectDB();

  // Query all manufacturing work orders
  const workOrders = await MfgWorkOrder.find({});

  console.log(`Found ${workOrders.length} manufacturing work orders`);

  // Dummy attachment data
  const bomAttachment = {
    kind: 'bom',
    category: 'intake',
    originalName: 'bom.xlsx',
    filename: 'bom.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1024,
    url: 'dummy-url',
    uploadedBy: new mongoose.Types.ObjectId(), // Dummy ObjectId
    uploadedAt: new Date(),
  };

  let updatedCount = 0;

  for (const wo of workOrders) {
    // Check if BOM attachment already exists
    const hasBom = wo.camAttachments.some(att => att.kind === 'bom' && att.category === 'intake');

    if (!hasBom) {
      // Add the BOM attachment
      await MfgWorkOrder.updateOne(
        { _id: wo._id },
        { $push: { camAttachments: bomAttachment } }
      );
      updatedCount++;
    }
  }

  console.log(`Added BOM attachments to ${updatedCount} work orders`);

  await mongoose.disconnect();
}

seedBomAttachments().catch((err) => {
  console.error('Failed to seed BOM attachments:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});