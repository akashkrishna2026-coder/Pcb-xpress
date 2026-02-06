import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db.js';
import Transaction from '../src/models/Transaction.js';

async function main() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Connected successfully.');

    console.log('Checking for duplicate transactions based on referenceId...');

    // Aggregate to find groups with more than one transaction per referenceId
    const duplicates = await Transaction.aggregate([
      {
        $group: {
          _id: "$referenceId",
          transactions: {
            $push: {
              _id: "$_id",
              createdAt: "$createdAt",
              status: "$status"
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $project: {
          transactions: {
            $sortArray: {
              input: "$transactions",
              sortBy: { createdAt: -1 }
            }
          },
          count: 1
        }
      }
    ]);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate transactions found. All referenceIds are unique.');
    } else {
      console.log(`❌ Found ${duplicates.length} groups with duplicate transactions:`);
      duplicates.forEach((group, index) => {
        console.log(`\nGroup ${index + 1}: referenceId ${group._id}, count: ${group.count}`);
        group.transactions.forEach((tx, i) => {
          console.log(`  ${i + 1}. ID: ${tx._id}, Created: ${tx.createdAt}, Status: ${tx.status}`);
        });
      });
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('Database connection closed.');
    } catch (disconnectError) {
      console.error('Error disconnecting:', disconnectError);
    }
  }
}

main();