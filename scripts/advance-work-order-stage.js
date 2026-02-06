import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../server/src/lib/db.js';
import MfgWorkOrder from '../server/src/models/MfgWorkOrder.js';

async function main() {
  const [, , woNumber, newStage, travelerReadyArg] = process.argv;

  if (!woNumber || !newStage) {
    console.error('Usage: node scripts/advance-work-order-stage.js <WO_NUMBER> <NEW_STAGE> [travelerReady]');
    process.exit(1);
  }

  const travelerReady =
    typeof travelerReadyArg === 'undefined' ? true : travelerReadyArg.toLowerCase() === 'true';

  await connectDB();

  const result = await MfgWorkOrder.findOneAndUpdate(
    { woNumber },
    {
      $set: {
        stage: newStage,
        travelerReady,
        notes: `Stage manually updated to ${newStage} via advance-work-order-stage script on ${new Date().toISOString()}`,
      },
      $currentDate: { updatedAt: true },
    },
    { new: true }
  );

  if (!result) {
    console.error(`Work order ${woNumber} not found.`);
    process.exitCode = 1;
  } else {
    console.log(`Work order ${woNumber} updated to stage ${result.stage}. Traveler ready: ${result.travelerReady}`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Failed to update work order stage:', err);
  await mongoose.disconnect();
  process.exit(1);
});
