import mongoose from 'mongoose';
import MfgWorkOrder from '../src/models/MfgWorkOrder.js';
import MfgTravelerEvent from '../src/models/MfgTravelerEvent.js';

const seedTravelerEvents = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcb-xpress');
    console.log('Connected to MongoDB');

    // Get all work orders
    const workOrders = await MfgWorkOrder.find({});
    console.log(`Found ${workOrders.length} work orders`);

    for (const workOrder of workOrders) {
      // Check if events already exist for this work order
      const existingEvents = await MfgTravelerEvent.find({ workOrder: workOrder._id });
      if (existingEvents.length > 0) {
        console.log(`Work order ${workOrder.woNumber} already has ${existingEvents.length} events, skipping...`);
        continue;
      }

      console.log(`Creating events for work order ${workOrder.woNumber}`);

      // Create sample traveler events
      const events = [
        {
          workOrder: workOrder._id,
          workOrderNumber: workOrder.woNumber,
          action: 'scan',
          station: 'CAM Intake',
          operatorName: 'CAM Intake Engineer',
          operatorLoginId: 'cam-intake-01',
          occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          note: 'Work order scanned into CAM process',
          metadata: {
            board: 'CAM',
            priority: workOrder.priority || 'normal',
            stage: workOrder.stage || 'cam'
          }
        },
        {
          workOrder: workOrder._id,
          workOrderNumber: workOrder.woNumber,
          action: 'release',
          station: 'CAM Intake',
          operatorName: 'CAM Intake Engineer',
          operatorLoginId: 'cam-intake-01',
          occurredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          note: 'CAM review completed, released to next stage',
          metadata: {
            board: 'CAM',
            priority: workOrder.priority || 'normal',
            stage: workOrder.stage || 'cam'
          }
        }
      ];

      await MfgTravelerEvent.insertMany(events);
      console.log(`Created ${events.length} events for work order ${workOrder.woNumber}`);
    }

    console.log('Traveler events seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding traveler events:', error);
    process.exit(1);
  }
};

seedTravelerEvents();
