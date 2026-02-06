import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db.js';
import MfgWorkOrder from '../src/models/MfgWorkOrder.js';

async function updateMfgApproved() {
  await connectDB();

  const result = await MfgWorkOrder.updateMany(
    {},
    { $set: { mfgApproved: true } }
  );

  console.log(`Updated ${result.modifiedCount} work orders to set mfgApproved: true`);

  await mongoose.disconnect();
}

updateMfgApproved().catch((err) => {
  console.error('Failed to update mfgApproved:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});