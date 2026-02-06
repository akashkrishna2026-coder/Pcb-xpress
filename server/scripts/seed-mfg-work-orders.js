import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db.js';
import MfgWorkOrder from '../src/models/MfgWorkOrder.js';

const sampleWorkOrders = [
  {
    woNumber: 'WO-2025-001',
    customer: 'AeroQ Labs',
    product: '4L Rigid FR4 1.6mm',
    revision: 'A',
    salesOrder: 'SO-9001',
    priority: 'high',
    status: 'cam',
    stage: 'cam',
    mfgApproved: true,
    quantity: 320,
    camOwner: 'cam.joseph',
    planner: 'planner.latha',
    plannedStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    camStatus: {
      state: 'in_review',
      owner: 'cam.joseph',
      notes: 'Awaiting stackup confirmation from customer',
      lastReviewedAt: new Date(),
      releaseTarget: new Date(Date.now() + 36 * 60 * 60 * 1000),
    },
    materials: {
      ready: false,
      mrpRun: new Date(Date.now() - 6 * 60 * 60 * 1000),
      shortageCount: 2,
      shortages: [
        {
          itemCode: 'CU-07035',
          description: '35um copper foil',
          requiredQty: 48,
          availableQty: 20,
          shortageQty: 28,
          status: 'ordered',
          supplier: 'CopperWorld',
          eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
        {
          itemCode: 'SM-ESD-GREEN',
          description: 'Solder mask green',
          requiredQty: 12,
          availableQty: 4,
          shortageQty: 8,
          status: 'in_transit',
          supplier: 'MaskCo',
          eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    dfmExceptions: [
      {
        code: 'DFM-001',
        description: 'Annular ring below 6 mil on layer L2',
        severity: 'high',
        owner: 'cam.joseph',
        status: 'in_progress',
        actionDue: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        code: 'DFM-014',
        description: 'Back-drill request missing tolerance note',
        severity: 'medium',
        owner: 'cam.joseph',
        status: 'open',
        actionDue: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    ],
  },
  {
    woNumber: 'WO-2025-002',
    customer: 'VoltEdge',
    product: '6L Control PCB',
    revision: 'C',
    salesOrder: 'SO-9002',
    priority: 'normal',
    status: 'planning',
    stage: 'planning',
    mfgApproved: true,
    quantity: 180,
    camOwner: 'cam.sneha',
    planner: 'planner.adam',
    travelerReady: true,
    plannedStart: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    camStatus: {
      state: 'approved',
      owner: 'cam.sneha',
      releasedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      releaseTarget: new Date(Date.now() - 18 * 60 * 60 * 1000),
    },
    materials: {
      ready: false,
      mrpRun: new Date(Date.now() - 3 * 60 * 60 * 1000),
      shortageCount: 1,
      shortages: [
        {
          itemCode: 'PREPEG-1080',
          description: 'Prepreg 1080 0.1mm',
          requiredQty: 60,
          availableQty: 40,
          shortageQty: 20,
          status: 'ordered',
          supplier: 'LaminatePro',
          eta: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    dfmExceptions: [],
  },
  {
    woNumber: 'WO-2025-003',
    customer: 'Mediva Instruments',
    product: 'Rigid-Flex 8L',
    revision: 'B',
    salesOrder: 'SO-9003',
    priority: 'hot',
    status: 'planning',
    stage: 'planning',
    mfgApproved: true,
    quantity: 75,
    camOwner: 'cam.elena',
    planner: 'planner.adam',
    plannedStart: new Date(Date.now() + 12 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    camStatus: {
      state: 'blocked',
      owner: 'cam.elena',
      notes: 'Need flex stackup validation',
      lastReviewedAt: new Date(),
      releaseTarget: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    materials: {
      ready: false,
      mrpRun: new Date(Date.now() - 5 * 60 * 60 * 1000),
      shortageCount: 3,
      shortages: [
        {
          itemCode: 'POLYIMIDE-0.08',
          description: 'Polyimide core 0.08mm',
          requiredQty: 30,
          availableQty: 0,
          shortageQty: 30,
          status: 'ordered',
          supplier: 'FlexCore',
          eta: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
        {
          itemCode: 'STIFFENER-PI',
          description: 'Polyimide stiffener',
          requiredQty: 40,
          availableQty: 10,
          shortageQty: 30,
          status: 'open',
          supplier: 'FlexCore',
        },
        {
          itemCode: 'ADH-730',
          description: 'Flexible adhesive 730',
          requiredQty: 15,
          availableQty: 12,
          shortageQty: 3,
          status: 'in_transit',
          supplier: 'ChemBond',
          eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    dfmExceptions: [
      {
        code: 'DFM-201',
        description: 'Flex bend radius below threshold',
        severity: 'critical',
        owner: 'qa.richard',
        status: 'acknowledged',
        actionDue: new Date(Date.now() + 12 * 60 * 60 * 1000),
      },
    ],
  },
  {
    woNumber: 'WO-2025-004',
    customer: 'IoTrix',
    product: '2L Express Proto',
    revision: 'A',
    salesOrder: 'SO-9004',
    priority: 'normal',
    status: 'released',
    stage: 'sanding',
    mfgApproved: true,
    quantity: 100,
    camOwner: 'cam.rahul',
    planner: 'planner.latha',
    travelerReady: true,
    plannedStart: new Date(Date.now() - 12 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    camStatus: {
      state: 'approved',
      owner: 'cam.rahul',
      releasedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      releaseTarget: new Date(Date.now() - 26 * 60 * 60 * 1000),
    },
    materials: {
      ready: true,
      mrpRun: new Date(Date.now() - 30 * 60 * 60 * 1000),
      shortageCount: 0,
      shortages: [],
    },
    dfmExceptions: [],
  },
  {
    woNumber: 'WO-2025-005',
    customer: 'Photon Labs',
    product: 'RF Panel 10L',
    revision: 'D',
    salesOrder: 'SO-9005',
    priority: 'high',
    status: 'cam',
    stage: 'cam',
    mfgApproved: true,
    quantity: 210,
    camOwner: 'cam.elena',
    planner: 'planner.samir',
    plannedStart: new Date(Date.now() + 48 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    camStatus: {
      state: 'pending',
      owner: 'cam.elena',
      notes: 'Awaiting RF copper weight confirmation',
      releaseTarget: new Date(Date.now() + 60 * 60 * 60 * 1000),
    },
    materials: {
      ready: false,
      mrpRun: null,
      shortageCount: 0,
      shortages: [],
    },
    dfmExceptions: [
      {
        code: 'DFM-322',
        description: 'Controlled impedance trace missing tolerance',
        severity: 'medium',
        owner: 'cam.elena',
        status: 'open',
        actionDue: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    ],
  },
];

async function seedWorkOrders() {
  await connectDB();

  for (const wo of sampleWorkOrders) {
    await MfgWorkOrder.findOneAndUpdate(
      { woNumber: wo.woNumber },
      { $set: wo },
      { upsert: true, new: true }
    );
  }

  const total = await MfgWorkOrder.countDocuments();
  console.log(`Seeded manufacturing work orders. Total records: ${total}`);

  await mongoose.disconnect();
}

seedWorkOrders().catch((err) => {
  console.error('Failed to seed manufacturing work orders:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
