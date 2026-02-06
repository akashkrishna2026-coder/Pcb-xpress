import bcrypt from 'bcryptjs';
import { Router } from 'express';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { ensureUploadDir, filePublicUrl, makeMulter } from '../lib/uploads.js';
import AssemblyDispatch from '../models/AssemblyDispatch.js';
import AssemblyMfgWorkOrder from '../models/AssemblyMfgWorkOrder.js';
import Dispatch from '../models/Dispatch.js';
import ThreeDPrintingDispatch from '../models/ThreeDPrintingDispatch.js';
import WireHarnessDispatch from '../models/WireHarnessDispatch.js';
import Film from '../models/Film.js';
import MfgTravelerEvent from '../models/MfgTravelerEvent.js';
import MfgWorkOrder from '../models/MfgWorkOrder.js';
import TestingWorkOrder from '../models/TestingWorkOrder.js';
import User from '../models/User.js';

const router = Router();
const upload = makeMulter();

function decodeToken(req) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      return jwt.verify(parts[1], process.env.JWT_SECRET || 'dev_secret');
    } catch (_) {
      return null;
    }
  }
  return null;
}

function requireMfgOrAdmin(req, res, next) {
  const decoded = decodeToken(req);
  if (!decoded || (decoded.role !== 'mfg' && decoded.role !== 'admin')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = decoded;
  return next();
}

function requireAdmin(req, res, next) {
  const decoded = decodeToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = decoded;
  return next();
}

function normalizePermissions(perms) {
  if (!Array.isArray(perms)) return [];
  const uniq = new Set();
  perms.forEach((p) => {
    if (typeof p === 'string' && p.trim()) {
      uniq.add(p.trim().toLowerCase());
    }
  });
  return Array.from(uniq);
}

async function resolveOperatorContext(req) {
  if (req.operatorContext) return req.operatorContext;
  if (!req.user) return null;
  if (req.user.role === 'admin') {
    const context = { isAdmin: true, permissions: ['*'] };
    req.operatorContext = context;
    return context;
  }
  const operator = await User.findById(req.user.sub)
    .select('_id name loginId role permissions isActive workCenter mfgRole email')
    .lean();
  if (!operator || operator.role !== 'mfg' || operator.isActive === false) {
    return null;
  }
  const permissions = normalizePermissions(operator.permissions);
  const context = { isAdmin: false, operator, permissions };
  req.operatorContext = context;
  return context;
}

function hasPermission(context, permission) {
  if (!permission) return true;
  if (!context) return false;
  if (context.isAdmin) return true;
  return context.permissions.includes(permission);
}

router.get('/summary', requireMfgOrAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const [
      totalWorkOrders,
      camPending,
      camBlocked,
      materialsBlocked,
      travelerReady,
      dueSoon,
      releaseDueSoon,
      filmIssues,
    ] = await Promise.all([
      MfgWorkOrder.countDocuments(),
      MfgWorkOrder.countDocuments({
        stage: 'cam',
        'camStatus.state': { $in: ['pending', 'in_review'] },
      }),
      MfgWorkOrder.countDocuments({
        stage: 'cam',
        'camStatus.state': 'blocked',
      }),
      MfgWorkOrder.countDocuments({
        stage: { $in: ['planning', 'fabrication'] },
        'materials.ready': { $ne: true },
      }),
      MfgWorkOrder.countDocuments({ travelerReady: true }),
      MfgWorkOrder.countDocuments({
        dueDate: { $gte: now, $lte: soon },
      }),
      MfgWorkOrder.countDocuments({
        'camStatus.state': { $in: ['pending', 'in_review'] },
        'camStatus.releaseTarget': { $gte: now, $lte: soon },
      }),
      Film.countDocuments({ status: { $in: ['damaged', 'expired'] } }),
    ]);

    let shortageSummary = { shortageCount: 0, totalShortageQty: 0 };
    const shortageAgg = await MfgWorkOrder.aggregate([
      { $match: { 'materials.shortages': { $exists: true, $ne: [] } } },
      { $unwind: '$materials.shortages' },
      {
        $group: {
          _id: null,
          shortageCount: { $sum: 1 },
          totalShortageQty: {
            $sum: { $ifNull: ['$materials.shortages.shortageQty', 0] },
          },
        },
      },
    ]);
    if (shortageAgg.length > 0) {
      shortageSummary = {
        shortageCount: shortageAgg[0].shortageCount,
        totalShortageQty: shortageAgg[0].totalShortageQty,
      };
    }

    res.json({
      summary: {
        totalWorkOrders,
        camPending,
        camBlocked,
        materialsBlocked,
        travelerReady,
        dueSoon,
        releaseDueSoon,
        shortages: shortageSummary,
        filmIssues,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load manufacturing summary' });
  }
});

router.get('/work-orders', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const {
      status,
      stage,
      focus,
      search,
      priority,
      limit: limitRaw,
      page: pageRaw,
      role,
      station,
    } = req.query || {};

    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 25));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = {};

    if (status) {
      const parts = String(status)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 0) filter.status = { $in: parts };
    }

    if (stage) {
      const parts = String(stage)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 0) filter.stage = { $in: parts };
    }

    if (priority) {
      const parts = String(priority)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 0) filter.priority = { $in: parts };
    }

    // Determine which collection to use based on focus
    let WorkOrderModel = MfgWorkOrder; // Default to PCB work orders
    let isAssemblyFocus = false;
    let isTestingFocus = false;

    if (focus === 'cam') {
      filter.stage = 'cam';
      if (req.user.role !== 'admin') {
        filter.mfgApproved = true;
      }
      // Apply role-based filtering for CAM work orders
      if (role === 'cam_intake') {
        filter['camStatus.state'] = 'pending';
      } else if (role === 'cam_nc_drill' || role === 'cam_phototools') {
        filter['camStatus.state'] = { $in: ['in_review', 'approved'] };
      } else {
        filter['camStatus.state'] = { $in: ['pending', 'in_review', 'blocked'] };
      }
    } else if (focus === 'materials') {
      filter.stage = { $in: ['planning', 'fabrication'] };
      filter['materials.ready'] = { $ne: true };
    } else if (focus === 'ready') {
      filter.travelerReady = true;
    } else if (focus === 'hot') {
      filter.priority = 'hot';
    } else if (focus === 'photo_imaging') {
      filter.stage = 'photo_imaging';
      filter.travelerReady = true;
    } else if (focus === 'developer') {
      filter.stage = 'developer';
      filter.travelerReady = true;
    } else if (focus === 'etching') {
      filter.stage = 'etching';
      filter.travelerReady = true;
    } else if (focus === 'tin_stripping') {
      filter.stage = 'tin_stripping';
      filter.travelerReady = true;
    } else if (focus === 'solder_mask') {
      filter.stage = 'solder_mask';
      filter.travelerReady = true;
    } else if (focus === 'surface_finish') {
      filter.stage = 'surface_finish';
      filter.travelerReady = true;
    } else if (focus === 'legend_print') {
      filter.stage = 'legend_print';
      filter.travelerReady = true;
    } else if (focus === 'cnc_routing') {
      filter.stage = 'cnc_routing';
      filter.travelerReady = true;
    } else if (focus === 'v_score') {
      filter.stage = 'v_score';
      filter.travelerReady = true;
    } else if (focus === 'flying_probe') {
      filter.stage = 'flying_probe';
      filter.travelerReady = true;
    } else if (focus === 'final_qc_pdir') {
      filter.stage = 'final_qc_pdir';
      filter.travelerReady = true;
    } else if (focus === 'dispatch') {
      filter.stage = 'dispatch';
      filter.travelerReady = true;
    } else if (focus === '3d_printing') {
      filter.stage = {
        $in: [
          '3d_printing_intake',
          '3d_printing_file_prep',
          '3d_printing_slicing',
          '3d_printing_queue',
          '3d_printing_active',
          '3d_printing_post_processing',
          '3d_printing_qc',
          '3d_printing_dispatch',
        ],
      };
      filter.travelerReady = true;
    } else if (focus === '3d_printing_intake') {
      filter.stage = '3d_printing_intake';
      filter.travelerReady = true;
    } else if (focus === '3d_printing_file_prep') {
      filter.stage = '3d_printing_file_prep';
      filter.travelerReady = true;
    } else if (focus === '3d_printing_slicing' || focus === '3d_printing_queue') {
      filter.stage = focus === '3d_printing_queue' ? '3d_printing_queue' : '3d_printing_slicing';
      filter.travelerReady = true;
    } else if (focus === '3d_printing_active') {
      filter.stage = '3d_printing_active';
      filter.travelerReady = true;
    } else if (focus === '3d_printing_post_processing') {
      filter.stage = '3d_printing_post_processing';
      filter.travelerReady = true;
    } else if (focus === '3d_printing_qc') {
      filter.stage = '3d_printing_qc';
      filter.travelerReady = true;
    } else if (focus === '3d_printing_dispatch') {
      filter.stage = '3d_printing_dispatch';
      filter.travelerReady = true;
   } else if (focus === 'assembly_store') {
     WorkOrderModel = AssemblyMfgWorkOrder;
     isAssemblyFocus = true;
     filter.stage = 'assembly_store';
     filter.travelerReady = true;
     } else if (focus === 'stencil') {
       WorkOrderModel = AssemblyMfgWorkOrder;
       isAssemblyFocus = true;
       filter.stage = 'stencil';
       filter.travelerReady = true;
     } else if (focus === 'assembly_reflow') {
       WorkOrderModel = AssemblyMfgWorkOrder;
       isAssemblyFocus = true;
       filter.stage = 'assembly_reflow';
       filter.travelerReady = true;
     } else if (focus === 'th_soldering') {
       WorkOrderModel = AssemblyMfgWorkOrder;
       isAssemblyFocus = true;
       filter.stage = 'th_soldering';
       filter.travelerReady = true;
     } else if (focus === 'visual_inspection') {
       WorkOrderModel = AssemblyMfgWorkOrder;
       isAssemblyFocus = true;
       filter.stage = 'visual_inspection';
       filter.travelerReady = true;
     } else if (focus === 'ict') {
       WorkOrderModel = AssemblyMfgWorkOrder;
       isAssemblyFocus = true;
       filter.stage = 'ict';
       filter.travelerReady = true;
     } else if (focus === 'flashing') {
       WorkOrderModel = AssemblyMfgWorkOrder;
       isAssemblyFocus = true;
       filter.stage = 'flashing';
       filter.travelerReady = true;
   } else if (focus === 'functional_test') {
     WorkOrderModel = AssemblyMfgWorkOrder;
     isAssemblyFocus = true;
     filter.stage = 'functional_test';
     filter.travelerReady = true;
   } else if (focus === 'wire_harness_intake') {
     WorkOrderModel = AssemblyMfgWorkOrder;
     isAssemblyFocus = true;
     filter.stage = 'wire_harness_intake';
     filter.travelerReady = true;
   } else if (focus === 'wire_harness') {
     WorkOrderModel = AssemblyMfgWorkOrder;
     isAssemblyFocus = true;
     filter.stage = 'wire_harness';
     filter.travelerReady = true;
    } else if (focus === 'wire_testing') {
     WorkOrderModel = AssemblyMfgWorkOrder;
     isAssemblyFocus = true;
     filter.stage = 'wire_testing';
     filter.travelerReady = true;
    } else if (focus === 'testing') {
      WorkOrderModel = TestingWorkOrder;
      isTestingFocus = true;
      filter.stage = {
        $in: [
          'testing_intake',
          'functional_testing',
          'electrical_testing',
          'burn_in_testing',
          'environmental_testing',
          'mixed_testing',
          'testing_review',
          'testing_dispatch',
        ],
      };
    } else if (focus === 'testing_dispatch') {
      WorkOrderModel = TestingWorkOrder;
      isTestingFocus = true;
      filter.stage = 'testing_dispatch';
      filter.travelerReady = true;
    } else if (focus === 'dispatch') {
      WorkOrderModel = TestingWorkOrder;
      isTestingFocus = true;
      filter.stage = 'dispatch';
      filter.travelerReady = true;
  } else if (focus === 'wire_harness_dispatch') {
    WorkOrderModel = AssemblyMfgWorkOrder;
    isAssemblyFocus = true;
    filter.stage = 'wire_harness_dispatch';
    filter.travelerReady = true;
  } else if (focus === 'assembly_3d_printing') {
    WorkOrderModel = AssemblyMfgWorkOrder;
    isAssemblyFocus = true;
    filter.stage = 'assembly_3d_printing';
     filter.travelerReady = true;
   } else if (focus === 'assembly_final_dispatch') {
     WorkOrderModel = AssemblyMfgWorkOrder;
     isAssemblyFocus = true;
     filter.stage = 'assembly_final_dispatch';
     filter.travelerReady = true;
   } else if (focus === 'station') {
       // Station-specific filtering for operator dashboards
       // Map role to specific stage for proper workflow control
       if (role === 'sanding') {
         filter.stage = 'sanding';
         filter.travelerReady = true;
       } else if (role === 'brushing') {
         filter.stage = 'brushing';
         filter.travelerReady = true;
       } else if (role === 'sheet_cutting') {
         // Sheet cutting gets work orders from sheet_cutting stage
         filter.stage = 'sheet_cutting';
         filter.travelerReady = true;
       } else if (role === 'cnc_drilling') {
         // CNC drilling gets work orders from cnc_drilling stage only
         filter.stage = 'cnc_drilling';
         filter.travelerReady = true;
      } else if (role === 'pth_line') {
        // PTH line receives work orders once brushing approves them into PTH stage
        filter.stage = 'pth';
        filter.travelerReady = true;
      } else if (role && role.startsWith('3d_printing')) {
        switch (role) {
          case '3d_printing_intake':
            filter.stage = '3d_printing_intake';
            break;
          case '3d_printing_file_prep':
            filter.stage = '3d_printing_file_prep';
            break;
          case '3d_printing_slicing':
          case '3d_printing_queue':
            filter.stage = role === '3d_printing_queue' ? '3d_printing_queue' : '3d_printing_slicing';
            break;
          case '3d_printing_active':
            filter.stage = '3d_printing_active';
            break;
          case '3d_printing_post_processing':
            filter.stage = '3d_printing_post_processing';
            break;
          case '3d_printing_qc':
            filter.stage = '3d_printing_qc';
            break;
          case '3d_printing_dispatch':
            filter.stage = '3d_printing_dispatch';
            break;
          default:
            filter.stage = {
              $in: [
                '3d_printing_intake',
                '3d_printing_file_prep',
                '3d_printing_slicing',
                '3d_printing_queue',
                '3d_printing_active',
                '3d_printing_post_processing',
                '3d_printing_qc',
                '3d_printing_dispatch',
              ],
            };
            break;
        }
        filter.travelerReady = true;
      } else if (role && role.startsWith('testing')) {
        WorkOrderModel = TestingWorkOrder;
        isTestingFocus = true;
        switch (role) {
          case 'testing_intake':
            filter.stage = 'testing_intake';
            break;
          case 'functional_testing':
            filter.stage = 'functional_testing';
            break;
          case 'electrical_testing':
            filter.stage = 'electrical_testing';
            break;
          case 'burn_in_testing':
            filter.stage = 'burn_in_testing';
            break;
          case 'environmental_testing':
            filter.stage = 'environmental_testing';
            break;
          case 'mixed_testing':
            filter.stage = 'mixed_testing';
            break;
          case 'testing_dispatch':
            filter.stage = 'testing_dispatch';
            break;
          case 'dispatch':
            filter.stage = 'dispatch';
            break;
          default:
            filter.stage = {
              $in: [
                'testing_intake',
                'functional_testing',
                'electrical_testing',
                'burn_in_testing',
                'environmental_testing',
                'mixed_testing',
                'testing_review',
                'testing_dispatch',
                'dispatch',
              ],
            };
            break;
        }
        filter.travelerReady = true;
      } else {
        // Default to fabrication for other roles
        filter.stage = 'fabrication';
        filter.travelerReady = true;
      }
     } else if (focus === 'brushing') {
       // Direct brushing focus for brushing dashboard
       filter.stage = 'brushing';
       filter.travelerReady = true;
     }

    if (station) {
      // Direct station filtering - can be used to filter by work center
      // Preserve any stage/travelerReady constraints already applied (e.g. by role focus)
      if (!Object.prototype.hasOwnProperty.call(filter, 'stage')) {
        filter.stage = 'fabrication';
      }
      if (!Object.prototype.hasOwnProperty.call(filter, 'travelerReady')) {
        filter.travelerReady = true;
      }
    }

    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { woNumber: rx },
        { customer: rx },
        { product: rx },
        { salesOrder: rx },
      ];
    }

    console.log('GET /work-orders - Final filter:', filter);
    console.log('GET /work-orders - WorkOrderModel:', WorkOrderModel.modelName);
    console.log('GET /work-orders - Limit:', limit, 'Page:', page, 'Skip:', skip);

    const [total, workOrders] = await Promise.all([
      WorkOrderModel.countDocuments(filter),
      WorkOrderModel.find(filter)
        .sort({ priority: -1, dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    console.log('GET /work-orders - Total count:', total);
    console.log('GET /work-orders - Returned work orders:', workOrders.length);

    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({
      workOrders,
      total,
      page,
      pages,
      limit,
    });
  } catch (err) {
    console.error('GET /work-orders - Error:', err);
    res.status(500).json({ message: 'Failed to load work orders' });
  }
});

router.get('/work-orders/:id', requireMfgOrAdmin, async (req, res) => {
  try {
    // Try AssemblyMfgWorkOrder first, then fallback to MfgWorkOrder
    let wo = await AssemblyMfgWorkOrder.findById(req.params.id).lean();
    if (!wo) {
      wo = await MfgWorkOrder.findById(req.params.id).lean();
    }
    if (!wo) return res.status(404).json({ message: 'Work order not found' });
    res.json({ workOrder: wo });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load work order' });
  }
});

router.post('/work-orders', requireAdmin, async (req, res) => {
  try {
    const payload = req.body || {};
    const doc = await MfgWorkOrder.create(payload);
    res.status(201).json({ workOrder: doc });
  } catch (err) {
    if (err?.code === 11000) {
      res.status(409).json({ message: 'Work order already exists' });
    } else {
      res.status(500).json({ message: 'Failed to create work order' });
    }
  }
});

router.patch('/work-orders/:id', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    // Determine which model to use by checking both collections
    let WorkOrderModel = MfgWorkOrder;
    let existingWO = await AssemblyMfgWorkOrder.findById(req.params.id).lean();
    if (existingWO) {
      WorkOrderModel = AssemblyMfgWorkOrder;
    } else {
      existingWO = await TestingWorkOrder.findById(req.params.id).lean();
      if (existingWO) {
        WorkOrderModel = TestingWorkOrder;
      } else {
        existingWO = await MfgWorkOrder.findById(req.params.id).lean();
        if (!existingWO) {
          return res.status(404).json({ message: 'Work order not found' });
        }
      }
    }

    // Define allowed fields based on the work order type
    const isAssembly = WorkOrderModel === AssemblyMfgWorkOrder;
    const isTesting = WorkOrderModel === TestingWorkOrder;
    const allowedFields = [
      'stage',
      'travelerReady',
      'status',
    ];

    if (isAssembly) {
      // Assembly-specific fields
      allowedFields.push(
        'assemblyStoreParams',
        'assemblyStoreChecklist',
        'assemblyStoreStatus',
        'stencilParams',
        'stencilChecklist',
        'stencilStatus',
        'assemblyReflowParams',
        'assemblyReflowChecklist',
        'assemblyReflowStatus',
        'thSolderingParams',
        'thSolderingChecklist',
        'thSolderingStatus',
        'visualInspectionParams',
        'visualInspectionChecklist',
        'visualInspectionStatus',
        'ictParams',
        'ictChecklist',
        'ictStatus',
        'flashingParams',
        'flashingChecklist',
        'flashingStatus',
        'functionalTestParams',
        'functionalTestChecklist',
        'functionalTestStatus',
        'wireHarnessIntakeParams',
        'wireHarnessIntakeChecklist',
        'wireHarnessIntakeStatus',
        'wireHarnessParams',
        'wireHarnessChecklist',
        'wireHarnessStatus',
        'wireTestingParams',
        'wireTestingChecklist',
        'wireTestingStatus',
        'wireHarnessDispatchParams',
        'wireHarnessDispatchChecklist',
        'wireHarnessDispatchStatus',
        'assembly3DPrintingParams',
        'assembly3DPrintingChecklist',
        'assembly3DPrintingStatus',
        'assemblyFinalDispatchParams',
        'assemblyFinalDispatchChecklist',
        'assemblyFinalDispatchStatus'
      );
    } else if (isTesting) {
      allowedFields.push(
        'testType',
        'requirements',
        'priority',
        'tester',
        'testingStatus',
        'testingChecklist',
        'reviewStatus',
        'reviewChecklist',
        'dispatchStatus',
        'dispatchChecklist',
        'testingAttachments'
      );
    } else {
      // PCB-specific fields
      allowedFields.push(
        'materials',
        'photoImagingParams',
        'photoImagingChecklist',
        'photoImagingStatus',
        'developerParams',
        'developerChecklist',
        'developerStatus',
        'etchingParams',
        'etchingChecklist',
        'etchingStatus',
        'tinStrippingParams',
        'tinStrippingChecklist',
        'tinStrippingStatus',
        'solderMaskParams',
        'solderMaskChecklist',
        'solderMaskStatus',
        'surfaceFinishParams',
        'surfaceFinishChecklist',
        'surfaceFinishStatus',
        'legendPrintingParams',
        'legendPrintingChecklist',
        'legendPrintingStatus',
        'cncRoutingParams',
        'cncRoutingChecklist',
        'cncRoutingStatus',
        'vScoringParams',
        'vScoringChecklist',
        'vScoringStatus',
        'flyingProbeParams',
        'flyingProbeChecklist',
        'flyingProbeStatus',
        'finalQCPDIRParams',
        'finalQCPDIRChecklist',
        'finalQCPDIRStatus',
        'packingParams',
        'packingChecklist',
        'packingStatus',
        'dispatchParams',
        'dispatchChecklist',
        'dispatchStatus',
        'threeDPrintingParams',
        'threeDPrintingChecklist',
        'threeDPrintingStatus',
        'threeDPrintingIntakeStatus',
        'threeDPrintingFilePrepStatus',
        'threeDPrintingSlicingStatus',
        'threeDPrintingQueueStatus',
        'threeDPrintingActiveStatus',
        'threeDPrintingPostProcessingStatus',
        'threeDPrintingQcStatus',
        'threeDPrintingDispatchStatus'
      );
    }

    const updates = req.body || {};
    const filteredUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }
    if (Object.keys(filteredUpdates).length === 0) {
      console.log('PATCH /work-orders/:id - No allowed fields found. Updates:', updates, 'Allowed fields:', allowedFields);
      return res.status(400).json({ message: 'No allowed fields to update' });
    }

    // Validate stage transitions
    if (filteredUpdates.stage) {
      const validStages = isAssembly ? [
        'assembly_store',
        'stencil',
        'assembly_reflow',
        'th_soldering',
        'visual_inspection',
        'ict',
        'flashing',
        'functional_test',
        'wire_harness_intake',
        'wire_harness',
        'wire_testing',
        'wire_harness_dispatch',
        'assembly_3d_printing',
        'assembly_final_dispatch',
      ] : isTesting ? [
        'testing_intake',
        'functional_testing',
        'electrical_testing',
        'burn_in_testing',
        'environmental_testing',
        'mixed_testing',
        'testing_review',
        'testing_dispatch',
      ] : [
        'cam',
        'planning',
        'fabrication',
        'drilling',
        'sheet_cutting',
        'cnc_drilling',
        'sanding',
        'brushing',
        'photo_imaging',
        'developer',
        'etching',
        'tin_strip',
        'tin_stripping',
        'solder_mask',
        'surface_finish',
        'legend_print',
        'cnc_routing',
        'v_score',
        'flying_probe',
        'final_qc_pdir',
        '3d_printing_intake',
        '3d_printing_file_prep',
        '3d_printing_slicing',
        '3d_printing_queue',
        '3d_printing_active',
        '3d_printing_post_processing',
        '3d_printing_qc',
        '3d_printing_dispatch',
        'packing',
        'dispatch',
        'pth',
        'final_qa',
        'assembly',
        'shipping',
        'shipped',
      ];
      console.log('PATCH /work-orders/:id - Validating stage:', filteredUpdates.stage, 'Is Assembly:', isAssembly, 'Valid stages:', validStages);
      if (!validStages.includes(filteredUpdates.stage)) {
        console.log('PATCH /work-orders/:id - Invalid stage:', filteredUpdates.stage, 'Valid stages:', validStages);
        return res.status(400).json({ message: 'Invalid stage transition' });
      }
    }

    // Add diagnostic logging
    console.log('PATCH /work-orders/:id - WorkOrder ID:', req.params.id);
    console.log('PATCH /work-orders/:id - WorkOrderModel:', WorkOrderModel.modelName);
    console.log('PATCH /work-orders/:id - Requested updates:', updates);
    console.log('PATCH /work-orders/:id - Filtered updates:', filteredUpdates);
    console.log('PATCH /work-orders/:id - Operator context:', context);

    const doc = await WorkOrderModel.findByIdAndUpdate(req.params.id, filteredUpdates, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ message: 'Work order not found' });
    res.json({ workOrder: doc });
  } catch (err) {
    console.error('PATCH /work-orders/:id - Error:', err);
    res.status(500).json({ message: 'Failed to update work order' });
  }
});

router.patch('/work-orders/:id/stage', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { stage } = req.body || {};
    if (!stage) {
      return res.status(400).json({ message: 'Stage is required' });
    }

    // Determine which model to use
    let WorkOrderModel = MfgWorkOrder;
    let existingWO = await AssemblyMfgWorkOrder.findById(req.params.id).lean();
    if (existingWO) {
      WorkOrderModel = AssemblyMfgWorkOrder;
    } else {
      existingWO = await TestingWorkOrder.findById(req.params.id).lean();
      if (existingWO) {
        WorkOrderModel = TestingWorkOrder;
      } else {
        existingWO = await MfgWorkOrder.findById(req.params.id).lean();
        if (!existingWO) {
          return res.status(404).json({ message: 'Work order not found' });
        }
      }
    }

    // Validate stage transitions based on work order type
    const isAssembly = WorkOrderModel === AssemblyMfgWorkOrder;
    const isTesting = WorkOrderModel === TestingWorkOrder;
    const validStages = isAssembly ? [
      'assembly_store',
      'stencil',
      'assembly_reflow',
      'th_soldering',
      'visual_inspection',
      'ict',
      'flashing',
      'functional_test',
      'wire_harness_intake',
      'wire_harness',
      'wire_testing',
      'wire_harness_dispatch',
      'assembly_3d_printing',
      'assembly_final_dispatch',
    ] : isTesting ? [
      'testing_intake',
      'functional_testing',
      'electrical_testing',
      'burn_in_testing',
      'environmental_testing',
      'mixed_testing',
      'testing_review',
      'testing_dispatch',
    ] : [
      'cam',
      'planning',
      'fabrication',
      'drilling',
      'sheet_cutting',
      'cnc_drilling',
      'sanding',
      'brushing',
      'photo_imaging',
      'developer',
      'etching',
      'tin_strip',
      'tin_stripping',
      'solder_mask',
      'surface_finish',
      'legend_print',
      'cnc_routing',
      'v_score',
      'flying_probe',
      'final_qc_pdir',
      '3d_printing_intake',
      '3d_printing_file_prep',
      '3d_printing_slicing',
      '3d_printing_queue',
      '3d_printing_active',
      '3d_printing_post_processing',
      '3d_printing_qc',
      '3d_printing_dispatch',
      'packing',
      'dispatch',
      'pth',
      'final_qa',
      'assembly',
      'shipping',
      'shipped',
    ];
    console.log('PATCH /work-orders/:id/stage - Validating stage:', stage, 'Is Assembly:', isAssembly, 'Valid stages:', validStages);
    if (!validStages.includes(stage)) {
      console.log('PATCH /work-orders/:id/stage - Invalid stage:', stage, 'Valid stages:', validStages);
        return res.status(400).json({ message: 'Invalid stage' });
    }

    console.log('PATCH /work-orders/:id/stage - WorkOrder ID:', req.params.id);
    console.log('PATCH /work-orders/:id/stage - WorkOrderModel:', WorkOrderModel.modelName);
    console.log('PATCH /work-orders/:id/stage - New stage:', stage);
    console.log('PATCH /work-orders/:id/stage - Operator context:', context);

    // Handle automatic assembly card generation for assembly_store to stencil transition
    if (isAssembly && existingWO.stage === 'assembly_store' && stage === 'stencil') {
      // Check if assembly card already exists
      const woWithAttachments = await AssemblyMfgWorkOrder.findById(req.params.id).select('assemblyAttachments').lean();
      const existingCard = woWithAttachments?.assemblyAttachments?.find(att => att.kind === 'assembly_card');

      if (!existingCard) {
        // Generate assembly card automatically
        const finalOperatorId = context.isAdmin ? req.user.sub : context.operator._id;
        const finalOperatorName = context.isAdmin ? 'System Admin' : context.operator.name || context.operator.loginId;

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `assembly_card_${existingWO.woNumber}_${timestamp}.pdf`;

        // Create placeholder file (in production, generate actual PDF)
        const uploadDir = ensureUploadDir();
        const filePath = path.join(uploadDir, filename);
        const placeholderContent = `Assembly Card for Work Order: ${existingWO.woNumber}\nCustomer: ${existingWO.customer}\nProduct: ${existingWO.product}\nQuantity: ${existingWO.quantity}\nGenerated on: ${new Date().toISOString()}`;

        fs.writeFileSync(filePath, placeholderContent);

        const historyEntry = {
          action: 'created',
          operator: operatorId,
          operatorName,
          timestamp: new Date(),
          notes: 'Assembly card automatically generated on transfer to stencil',
        };

        // Create assembly card attachment
        const assemblyCard = {
          kind: 'assembly_card',
          category: 'assembly',
          originalName: `Assembly_Card_${existingWO.woNumber}.pdf`,
          filename,
          mimeType: 'application/pdf',
          size: Buffer.byteLength(placeholderContent),
          url: filePublicUrl(filename),
          uploadedBy: operatorId,
          uploadedAt: new Date(),
          description: `Assembly card for work order ${existingWO.woNumber}`,
          approvalStatus: 'pending',
          version: 1,
          history: [historyEntry],
        };

        // Update work order with new stage and assembly card
        const doc = await WorkOrderModel.findByIdAndUpdate(
          req.params.id,
          {
            stage,
            $push: { assemblyAttachments: assemblyCard }
          },
          { new: true, runValidators: true }
        );
        if (!doc) return res.status(404).json({ message: 'Work order not found' });
        return res.json({ workOrder: doc });
      }
    }

    const doc = await WorkOrderModel.findByIdAndUpdate(req.params.id, { stage }, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ message: 'Work order not found' });
    res.json({ workOrder: doc });
  } catch (err) {
    console.error('PATCH /work-orders/:id/stage - Error:', err);
    res.status(500).json({ message: 'Failed to update work order stage' });
  }
});

router.patch('/work-orders/:id/approve', requireAdmin, async (req, res) => {
  try {
    // Try AssemblyMfgWorkOrder first, then fallback to MfgWorkOrder
    let doc = await AssemblyMfgWorkOrder.findByIdAndUpdate(req.params.id, { mfgApproved: true }, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      doc = await MfgWorkOrder.findByIdAndUpdate(req.params.id, { mfgApproved: true }, {
        new: true,
        runValidators: true,
      });
    }
    if (!doc) return res.status(404).json({ message: 'Work order not found' });
    res.json({ workOrder: doc });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve work order' });
  }
});

router.get('/operators', requireAdmin, async (req, res) => {
  try {
    const { search, isActive } = req.query || {};
    const filter = { role: 'mfg' };
    if (typeof isActive !== 'undefined') {
      filter.isActive = String(isActive).toLowerCase() === 'true';
    }
    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { loginId: rx }, { mfgRole: rx }];
    }
    const operators = await User.find(filter)
      .select('_id name email loginId mfgRole workCenter permissions isActive createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ operators });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load operators' });
  }
});

router.post('/operators', requireAdmin, async (req, res) => {
  try {
    const {
      name = '',
      email,
      password,
      loginId,
      mfgRole = '',
      workCenter = '',
      permissions,
      isActive = true,
    } = req.body || {};

    if (!email || !password || !loginId) {
      return res.status(400).json({ message: 'Email, password, and loginId are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const lowerEmail = String(email).toLowerCase().trim();
    const lowerLoginId = String(loginId).toLowerCase().trim();

    const existing = await User.findOne({
      $or: [{ email: lowerEmail }, { loginId: lowerLoginId }],
    });
    if (existing) {
      return res.status(409).json({ message: 'Email or loginId already in use' });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      name,
      email: lowerEmail,
      password: hash,
      loginId: lowerLoginId,
      role: 'mfg',
      mfgRole,
      workCenter,
      permissions: normalizePermissions(permissions),
      isActive: Boolean(isActive),
    });

    res.status(201).json({
      operator: {
        id: user._id,
        name: user.name,
        email: user.email,
        loginId: user.loginId,
        mfgRole: user.mfgRole,
        workCenter: user.workCenter,
        permissions: user.permissions,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create operator' });
  }
});

router.patch('/operators/:id', requireAdmin, async (req, res) => {
  try {
    const updates = req.body || {};
    const payload = {};

    if (typeof updates.name === 'string') payload.name = updates.name;
    if (typeof updates.mfgRole === 'string') payload.mfgRole = updates.mfgRole;
    if (typeof updates.workCenter === 'string') payload.workCenter = updates.workCenter;
    if (typeof updates.isActive !== 'undefined') payload.isActive = Boolean(updates.isActive);
    if (Array.isArray(updates.permissions)) {
      payload.permissions = normalizePermissions(updates.permissions);
    }
    if (typeof updates.loginId === 'string' && updates.loginId.trim()) {
      payload.loginId = updates.loginId.trim().toLowerCase();
    }
    if (typeof updates.email === 'string' && updates.email.trim()) {
      payload.email = updates.email.trim().toLowerCase();
    }
    if (typeof updates.password === 'string' && updates.password) {
      if (updates.password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      payload.password = await bcrypt.hash(updates.password, 10);
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    try {
      const updated = await User.findOneAndUpdate(
        { _id: req.params.id, role: 'mfg' },
        { $set: payload },
        { new: true, runValidators: true }
      )
        .select('_id name email loginId mfgRole workCenter permissions isActive createdAt updatedAt')
        .lean();
      if (!updated) {
        return res.status(404).json({ message: 'Operator not found' });
      }
      res.json({ operator: updated });
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({ message: 'Email or loginId already in use' });
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to update operator' });
  }
});

router.get('/work-orders/:id/traveler-events', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }
    if (!hasPermission(context, 'traveler:read')) {
      return res.status(403).json({ message: 'Missing permission: traveler:read' });
    }

    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

    // Try both collections to find the work order
    let workOrder = await AssemblyMfgWorkOrder.findById(req.params.id)
      .select('_id woNumber')
      .lean();
    if (!workOrder) {
      workOrder = await MfgWorkOrder.findById(req.params.id)
        .select('_id woNumber')
        .lean();
    }
    if (!workOrder) {
      const woNumber = String(req.params.id || '').trim().toUpperCase();
      if (woNumber) {
        workOrder = await AssemblyMfgWorkOrder.findOne({ woNumber })
          .select('_id woNumber')
          .lean();
        if (!workOrder) {
          workOrder = await MfgWorkOrder.findOne({ woNumber })
            .select('_id woNumber')
            .lean();
        }
      }
    }
    if (!workOrder) {
      return res.status(404).json({ message: 'Work order not found' });
    }

    console.log('GET /work-orders/:id/traveler-events - WorkOrder found:', workOrder);
    console.log('GET /work-orders/:id/traveler-events - Searching for events with workOrder:', workOrder._id);

    const events = await MfgTravelerEvent.find({ workOrder: workOrder._id })
      .sort({ occurredAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    console.log('GET /work-orders/:id/traveler-events - Found events:', events.length);

    res.json({ events });
  } catch (err) {
    console.error('GET /work-orders/:id/traveler-events - Error:', err);
    res.status(500).json({ message: 'Failed to load traveler events' });
  }
});

router.post('/work-orders/:id/traveler-events', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const {
      action,
      station,
      status,
      note = '',
      metadata,
    } = req.body || {};

    const normalizedAction = String(action || '').trim().toLowerCase();
    const allowedActions = new Set(['scan', 'release', 'hold', 'qc_pass', 'qc_fail', 'note']);
    if (!allowedActions.has(normalizedAction)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const requiredPermission = {
      release: 'traveler:release',
      qc_pass: 'traveler:release',
      hold: 'qc:hold',
      qc_fail: 'qc:hold',
      scan: 'traveler:read',
      note: null,
    }[normalizedAction];

    if (!hasPermission(context, requiredPermission)) {
      return res.status(403).json({
        message: `Missing permission: ${requiredPermission || 'N/A'}`,
      });
    }

    const stationLabel = String(station || context.operator?.workCenter || '').trim();
    if (!stationLabel) {
      return res.status(400).json({ message: 'Station is required' });
    }

    // Try both collections to find the work order
    let workOrder = await AssemblyMfgWorkOrder.findById(req.params.id)
      .select('_id woNumber stage status travelerReady')
      .lean();
    if (!workOrder) {
      workOrder = await MfgWorkOrder.findById(req.params.id)
        .select('_id woNumber stage status travelerReady')
        .lean();
    }
    if (!workOrder) {
      const woNumber = String(req.params.id || '').trim().toUpperCase();
      if (woNumber) {
        workOrder = await AssemblyMfgWorkOrder.findOne({ woNumber })
          .select('_id woNumber stage status travelerReady')
          .lean();
        if (!workOrder) {
          workOrder = await MfgWorkOrder.findOne({ woNumber })
            .select('_id woNumber stage status travelerReady')
            .lean();
        }
      }
    }
    if (!workOrder) {
      return res.status(404).json({ message: 'Work order not found' });
    }

    const metadataPayload =
      metadata && typeof metadata === 'object'
        ? Object.entries(metadata).reduce((acc, [key, value]) => {
            if (typeof value === 'undefined') return acc;
            acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
            return acc;
          }, {})
        : undefined;

    const event = await MfgTravelerEvent.create({
      workOrder: workOrder._id,
      workOrderNumber: workOrder.woNumber,
      station: stationLabel,
      action: normalizedAction,
      status: status ? String(status).trim().toLowerCase() : undefined,
      note: note ? String(note).trim() : '',
      metadata: metadataPayload && Object.keys(metadataPayload).length > 0 ? metadataPayload : undefined,
      operator: context.isAdmin ? req.user.sub : context.operator._id,
      operatorLoginId: context.isAdmin ? 'admin' : context.operator.loginId,
      operatorName: context.isAdmin ? 'System Admin' : context.operator.name || context.operator.loginId,
      permissionsSnapshot: context.isAdmin ? ['*'] : context.permissions,
      occurredAt: new Date(),
    });

    res.status(201).json({ event });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record traveler event' });
  }
});

router.get('/work-orders/:id/attachments', requireMfgOrAdmin, async (req, res) => {
  try {
    // Try AssemblyMfgWorkOrder first, then fallback to MfgWorkOrder
    let wo = await AssemblyMfgWorkOrder.findById(req.params.id).select('assemblyAttachments').lean();
    if (!wo) {
      wo = await TestingWorkOrder.findById(req.params.id).select('testingAttachments').lean();
      if (wo) {
        wo.assemblyAttachments = wo.testingAttachments;
      } else {
        wo = await MfgWorkOrder.findById(req.params.id).select('camAttachments').lean();
        if (wo) {
          wo.assemblyAttachments = wo.camAttachments; // Normalize field name
        }
      }
    }
    if (!wo) return res.status(404).json({ message: 'Work order not found' });
    res.json({ attachments: wo.assemblyAttachments || [] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load attachments' });
  }
});

router.get('/work-orders/:id/attachments/:filename/download', requireMfgOrAdmin, async (req, res) => {
  try {
    const { id, filename } = req.params;

    // Determine which model and field to use
    let WorkOrderModel = MfgWorkOrder;
    let attachmentField = 'camAttachments';

    // Check if this is an assembly or testing work order
    const assemblyWO = await AssemblyMfgWorkOrder.findById(id).lean();
    if (assemblyWO) {
      WorkOrderModel = AssemblyMfgWorkOrder;
      attachmentField = 'assemblyAttachments';
    } else {
      const testingWO = await TestingWorkOrder.findById(id).lean();
      if (testingWO) {
        WorkOrderModel = TestingWorkOrder;
        attachmentField = 'testingAttachments';
      }
    }

    // Find the work order and check if attachment exists
    const wo = await WorkOrderModel.findById(id).select(attachmentField).lean();
    if (!wo) return res.status(404).json({ message: 'Work order not found' });

    const attachment = wo[attachmentField].find(att => att.filename === filename);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Get the file path
    const uploadDir = ensureUploadDir();
    const filePath = path.join(uploadDir, filename);

    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName || filename}"`);
    res.setHeader('Content-Length', attachment.size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to stream file' });
      }
    });
  } catch (err) {
    console.error('Download attachment error:', err);
    res.status(500).json({ message: 'Failed to download attachment' });
  }
});

router.post('/work-orders/:id/attachments', requireMfgOrAdmin, upload.single('file'), async (req, res) => {
  try {
    const { kind, category, description, operatorName, operatorId, specialInstructions, camNumber } = req.body;
    if (!req.file) return res.status(400).json({ message: 'File is required' });
    if (!kind || !category) return res.status(400).json({ message: 'Kind and category are required' });

    // Determine which model and field to use
    let WorkOrderModel = MfgWorkOrder;
    let attachmentField = 'camAttachments';
    let allowedKinds = ['drill_file', 'photo_file', 'job_card', 'gerber', 'bom', 'spec', 'film'];
    let allowedCategories = ['intake', 'nc_drill', 'phototools'];

    // Check if this is an assembly work order
    const assemblyWO = await AssemblyMfgWorkOrder.findById(req.params.id).lean();
    if (assemblyWO) {
      WorkOrderModel = AssemblyMfgWorkOrder;
      attachmentField = 'assemblyAttachments';
      allowedKinds = [
        'bom',
        'assembly',
        'assembly_card',
        'pick_list',
        'assembly_instruction',
        'visual_report',
        'inspection_image',
        'visual_photo',
        'aoi_image',
        'film',
      ];
      allowedCategories = ['intake', 'assembly', 'inspection'];
    } else {
      // Check if it's a testing work order
      const testingWO = await TestingWorkOrder.findById(req.params.id).lean();
      if (testingWO) {
        WorkOrderModel = TestingWorkOrder;
        attachmentField = 'testingAttachments';
        allowedKinds = ['drill_file', 'photo_file', 'job_card', 'gerber', 'bom', 'spec', 'film'];
        allowedCategories = ['intake', 'nc_drill', 'phototools', 'testing'];
      } else {
        // Check if it's a PCB work order
        const pcbWO = await MfgWorkOrder.findById(req.params.id).lean();
        if (!pcbWO) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ message: 'Work order not found' });
        }
      }
    }

    if (!allowedKinds.includes(kind)) return res.status(400).json({ message: 'Invalid kind' });
    if (!allowedCategories.includes(category)) return res.status(400).json({ message: 'Invalid category' });

    // Validate file type based on category
    let allowedMimeTypes = [];
    if (category === 'phototools' || category === 'inspection') {
      allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp', 'application/pdf', 'text/plain', 'application/zip', 'application/x-excellon'];
    } else {
      allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/zip', 'text/plain', 'application/octet-stream', 'application/x-excellon'];
    }

    // Special handling for DRL files - allow them regardless of MIME type if extension is correct
    const fileExt = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));
    const isDrlFile = fileExt === '.drl';

    // Allow DRL files even if MIME type doesn't match
    if (!isDrlFile && !allowedMimeTypes.includes(req.file.mimetype)) {
      console.log('POST /work-orders/:id/attachments - MIME type not allowed:', req.file.mimetype, 'for category:', category);
      // Delete the uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid file type for this upload category' });
    }

    const context = await resolveOperatorContext(req);
    const finalOperatorId = context.isAdmin ? req.user.sub : context.operator._id;
    const finalOperatorName = context.isAdmin ? 'System Admin' : context.operator.name || context.operator.loginId;

    // Base attachment object
    const attachment = {
      kind,
      category,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: filePublicUrl(req.file.filename),
      uploadedBy: finalOperatorId,
      description: description || '',
    };

    // Add CAM number if provided
    if (camNumber) {
      attachment.camNumber = camNumber.trim();
    }

    // Add job card specific fields if this is a job card
    if (kind === 'job_card' || kind === 'assembly_card') {
      attachment.operatorName = operatorName || finalOperatorName;
      attachment.operatorId = operatorId || finalOperatorId;
      attachment.specialInstructions = specialInstructions || '';
      attachment.approvalStatus = 'pending';
      attachment.version = 1;
      attachment.history = [{
        action: 'created',
        operator: finalOperatorId,
        operatorName: operatorName || finalOperatorName,
        timestamp: new Date(),
        notes: description || `Job card created by ${operatorName || finalOperatorName}`,
        version: 1,
        specialInstructions: specialInstructions || '',
      }];
    }

    console.log('POST /work-orders/:id/attachments - Attempting to add attachment:', attachment);

    try {
      const wo = await WorkOrderModel.findByIdAndUpdate(
        req.params.id,
        { $push: { [attachmentField]: attachment } },
        { new: true, runValidators: true }
      ).select(attachmentField).lean();

      console.log('POST /work-orders/:id/attachments - Attachment added successfully');

      if (!wo) {
        // Delete the file if work order not found
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Work order not found' });
      }

      // Find the newly added attachment
      const newAttachment = wo[attachmentField][wo[attachmentField].length - 1];
      res.status(201).json({ attachment: newAttachment });
    } catch (err) {
      console.error('POST /work-orders/:id/attachments - Database update error:', err);
      // Clean up file if error
      if (req.file && req.file.path) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      res.status(500).json({ message: 'Failed to upload attachment' });
    }
  } catch (err) {
    // Clean up file if error
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ message: 'Failed to upload attachment' });
  }
});

router.delete('/work-orders/:id/attachments/:filename', requireMfgOrAdmin, async (req, res) => {
  try {
    const { id, filename } = req.params;

    // Determine which model and field to use
    let WorkOrderModel = MfgWorkOrder;
    let attachmentField = 'camAttachments';

    // Check if this is an assembly work order
    const assemblyWO = await AssemblyMfgWorkOrder.findById(id).lean();
    if (assemblyWO) {
      WorkOrderModel = AssemblyMfgWorkOrder;
      attachmentField = 'assemblyAttachments';
    }

    // First, find and remove the attachment from the array
    const wo = await WorkOrderModel.findOneAndUpdate(
      { _id: id, [`${attachmentField}.filename`]: filename },
      { $pull: { [attachmentField]: { filename } } },
      { new: true }
    ).select(attachmentField).lean();

    if (!wo) return res.status(404).json({ message: 'Work order or attachment not found' });

    // Delete the file from disk
    const uploadDir = ensureUploadDir();
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'Attachment deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete attachment' });
  }
});

// Job Card Management Endpoints
router.get('/work-orders/:id/job-cards', requireMfgOrAdmin, async (req, res) => {
  try {
    // Try AssemblyMfgWorkOrder first, then fallback to MfgWorkOrder
    let wo = await AssemblyMfgWorkOrder.findById(req.params.id).select('assemblyAttachments').lean();
    if (!wo) {
      wo = await MfgWorkOrder.findById(req.params.id).select('camAttachments').lean();
      if (wo) {
        wo.assemblyAttachments = wo.camAttachments; // Normalize field name
      }
    }
    if (!wo) return res.status(404).json({ message: 'Work order not found' });

    const jobCards = (wo.assemblyAttachments || []).filter(att => att.kind === 'job_card' || att.kind === 'assembly_card');
    res.json({ jobCards });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load job cards' });
  }
});

router.patch('/work-orders/:id/job-cards/:filename/approve', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { id, filename } = req.params;
    const { notes } = req.body || {};

    // Determine which model and field to use
    let WorkOrderModel = MfgWorkOrder;
    let attachmentField = 'camAttachments';

    // Check if this is an assembly work order
    const assemblyWO = await AssemblyMfgWorkOrder.findById(id).lean();
    if (assemblyWO) {
      WorkOrderModel = AssemblyMfgWorkOrder;
      attachmentField = 'assemblyAttachments';
    }

    const finalOperatorId = context.isAdmin ? req.user.sub : context.operator._id;
    const finalOperatorName = context.isAdmin ? 'System Admin' : context.operator.name || context.operator.loginId;

    const historyEntry = {
      action: 'approved',
      operator: finalOperatorId,
      operatorName: finalOperatorName,
      timestamp: new Date(),
      notes: notes || '',
      previousStatus: 'pending',
      newStatus: 'approved',
    };

    const wo = await WorkOrderModel.findOneAndUpdate(
      { _id: id, [`${attachmentField}.filename`]: filename },
      {
        $set: {
          [`${attachmentField}.$.approvalStatus`]: 'approved',
          [`${attachmentField}.$.approvedBy`]: finalOperatorId,
          [`${attachmentField}.$.approvedAt`]: new Date(),
        },
        $push: { [`${attachmentField}.$.history`]: historyEntry },
      },
      { new: true, runValidators: true }
    ).select(attachmentField).lean();

    if (!wo) return res.status(404).json({ message: 'Work order or job card not found' });

    const updatedJobCard = wo[attachmentField].find(att => att.filename === filename);

    // Handle automatic transfer to assembly_reflow for assembly work orders when assembly_card is approved
    if (assemblyWO && updatedJobCard.kind === 'assembly_card' && updatedJobCard.approvalStatus === 'approved') {
      // Check if work order is currently in stencil stage
      if (assemblyWO.stage === 'stencil') {
        // Automatically transfer to assembly_reflow
        await WorkOrderModel.findByIdAndUpdate(id, { stage: 'assembly_reflow' }, { runValidators: true });
        console.log(`Work order ${assemblyWO.woNumber} automatically transferred to assembly_reflow on assembly card approval`);
      }
    }

    res.json({ jobCard: updatedJobCard });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve job card' });
  }
});

router.patch('/work-orders/:id/job-cards/:filename/reject', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { id, filename } = req.params;
    const { rejectionReason, notes } = req.body || {};

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    // Determine which model and field to use
    let WorkOrderModel = MfgWorkOrder;
    let attachmentField = 'camAttachments';

    // Check if this is an assembly work order
    const assemblyWO = await AssemblyMfgWorkOrder.findById(id).lean();
    if (assemblyWO) {
      WorkOrderModel = AssemblyMfgWorkOrder;
      attachmentField = 'assemblyAttachments';
    }

    const finalOperatorId = context.isAdmin ? req.user.sub : context.operator._id;
    const finalOperatorName = context.isAdmin ? 'System Admin' : context.operator.name || context.operator.loginId;

    const historyEntry = {
      action: 'rejected',
      operator: finalOperatorId,
      operatorName: finalOperatorName,
      timestamp: new Date(),
      notes: notes || '',
      previousStatus: 'pending',
      newStatus: 'rejected',
    };

    const wo = await WorkOrderModel.findOneAndUpdate(
      { _id: id, [`${attachmentField}.filename`]: filename },
      {
        $set: {
          [`${attachmentField}.$.approvalStatus`]: 'rejected',
          [`${attachmentField}.$.rejectionReason`]: rejectionReason,
        },
        $push: { [`${attachmentField}.$.history`]: historyEntry },
      },
      { new: true, runValidators: true }
    ).select(attachmentField).lean();

    if (!wo) return res.status(404).json({ message: 'Work order or job card not found' });

    const updatedJobCard = wo[attachmentField].find(att => att.filename === filename);
    res.json({ jobCard: updatedJobCard });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject job card' });
  }
});

router.post('/work-orders/:id/job-cards/:filename/comments', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { id, filename } = req.params;
    const { comment } = req.body || {};

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Comment is required' });
    }

    // Determine which model and field to use
    let WorkOrderModel = MfgWorkOrder;
    let attachmentField = 'camAttachments';

    // Check if this is an assembly work order
    const assemblyWO = await AssemblyMfgWorkOrder.findById(id).lean();
    if (assemblyWO) {
      WorkOrderModel = AssemblyMfgWorkOrder;
      attachmentField = 'assemblyAttachments';
    }

    const finalOperatorId = context.isAdmin ? req.user.sub : context.operator._id;
    const finalOperatorName = context.isAdmin ? 'System Admin' : context.operator.name || context.operator.loginId;

    const historyEntry = {
      action: 'comment_added',
      operator: finalOperatorId,
      operatorName: finalOperatorName,
      timestamp: new Date(),
      notes: comment.trim(),
    };

    const wo = await WorkOrderModel.findOneAndUpdate(
      { _id: id, [`${attachmentField}.filename`]: filename },
      { $push: { [`${attachmentField}.$.history`]: historyEntry } },
      { new: true, runValidators: true }
    ).select(attachmentField).lean();

    if (!wo) return res.status(404).json({ message: 'Work order or job card not found' });

    const updatedJobCard = wo[attachmentField].find(att => att.filename === filename);
    res.status(201).json({ jobCard: updatedJobCard });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

// Automatic Assembly Card Generation
router.post('/work-orders/:id/generate-assembly-card', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { id } = req.params;
    const { description } = req.body || {};

    // Check if this is an assembly work order
    const wo = await AssemblyMfgWorkOrder.findById(id).lean();
    if (!wo) {
      return res.status(404).json({ message: 'Assembly work order not found' });
    }

    // Check if assembly card already exists
    const existingCard = wo.assemblyAttachments.find(att => att.kind === 'assembly_card');
    if (existingCard) {
      return res.status(409).json({ message: 'Assembly card already exists for this work order' });
    }

    const finalOperatorId = context.isAdmin ? req.user.sub : context.operator._id;
    const finalOperatorName = context.isAdmin ? 'System Admin' : context.operator.name || context.operator.loginId;

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `assembly_card_${wo.woNumber}_${timestamp}.pdf`;

    // For now, create a placeholder file (in production, generate actual PDF)
    const uploadDir = ensureUploadDir();
    const filePath = path.join(uploadDir, filename);
    const placeholderContent = `Assembly Card for Work Order: ${wo.woNumber}\nCustomer: ${wo.customer}\nProduct: ${wo.product}\nQuantity: ${wo.quantity}\nGenerated on: ${new Date().toISOString()}`;

    fs.writeFileSync(filePath, placeholderContent);

    const historyEntry = {
      action: 'created',
      operator: operatorId,
      operatorName,
      timestamp: new Date(),
      notes: 'Assembly card automatically generated on transfer to stencil',
    };

    // Create assembly card attachment
    const assemblyCard = {
      kind: 'assembly_card',
      category: 'assembly',
      originalName: `Assembly_Card_${wo.woNumber}.pdf`,
      filename,
      mimeType: 'application/pdf',
      size: Buffer.byteLength(placeholderContent),
      url: filePublicUrl(filename),
      uploadedBy: operatorId,
      uploadedAt: new Date(),
      description: description || `Assembly card for work order ${wo.woNumber}`,
      approvalStatus: 'pending',
      version: 1,
      history: [historyEntry],
    };

    const updatedWo = await AssemblyMfgWorkOrder.findByIdAndUpdate(
      id,
      { $push: { assemblyAttachments: assemblyCard } },
      { new: true, runValidators: true }
    ).select('assemblyAttachments').lean();

    if (!updatedWo) {
      // Clean up file if work order update failed
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(404).json({ message: 'Work order not found' });
    }

    const addedCard = updatedWo.assemblyAttachments[updatedWo.assemblyAttachments.length - 1];
    res.status(201).json({ assemblyCard: addedCard });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate assembly card' });
  }
});

// Handle both file upload and text-only updates
const handleJobCardUpdate = async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { id, filename } = req.params;
    const { description, notes, operatorName, operatorId, specialInstructions, updateExisting } = req.body || {};

    console.log('DEBUG - Received operatorName:', operatorName);
    console.log('DEBUG - Request body keys:', Object.keys(req.body || {}));

    // Determine which model and field to use
    let WorkOrderModel = MfgWorkOrder;
    let attachmentField = 'camAttachments';
    let jobCardKind = 'job_card';
    let category = 'intake';

    // Check if this is an assembly work order
    const assemblyWO = await AssemblyMfgWorkOrder.findById(id).lean();
    if (assemblyWO) {
      WorkOrderModel = AssemblyMfgWorkOrder;
      attachmentField = 'assemblyAttachments';
      jobCardKind = 'assembly_card';
      category = 'assembly';
    }

    // Find the work order and job card
    const wo = await WorkOrderModel.findById(id).select(attachmentField).lean();
    if (!wo) return res.status(404).json({ message: 'Work order not found' });

    const jobCardIndex = wo[attachmentField].findIndex(att => att.filename === filename && (att.kind === 'job_card' || att.kind === 'assembly_card'));
    if (jobCardIndex === -1) return res.status(404).json({ message: 'Job card not found' });

    const originalJobCard = wo[attachmentField][jobCardIndex];
    const finalOperatorId = context.isAdmin ? req.user.sub : context.operator._id;
    const finalOperatorName = context.isAdmin ? 'System Admin' : context.operator.name || context.operator.loginId;

    // Check if we should update the existing job card instead of creating a new version
    if (updateExisting === 'true') {
      // Update existing job card
      const updateData = {
        [`${attachmentField}.$.description`]: description || `Job card edited by ${finalOperatorName} on ${new Date().toLocaleDateString()}`,
        [`${attachmentField}.$.specialInstructions`]: specialInstructions || originalJobCard.specialInstructions || '',
        [`${attachmentField}.$.uploadedBy`]: finalOperatorId,
        [`${attachmentField}.$.uploadedAt`]: new Date(),
      };

      // Update file if provided
      if (req.file) {
        // Validate file type for job card updates
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: 'Invalid file type. Only PDF and images are allowed for job card updates.' });
        }

        // Replace the existing file
        const uploadDir = ensureUploadDir();
        const newPath = path.join(uploadDir, filename);
        
        // Remove old file if it exists
        if (fs.existsSync(newPath)) {
          fs.unlinkSync(newPath);
        }
        
        // Move new file to the correct location
        fs.renameSync(req.file.path, newPath);

        updateData[`${attachmentField}.$.mimeType`] = req.file.mimetype;
        updateData[`${attachmentField}.$.size`] = req.file.size;
        updateData[`${attachmentField}.$.url`] = filePublicUrl(filename);
      }

      // Add history entry
      const usedOperatorName = operatorName || finalOperatorName;
      console.log('DEBUG - Using operatorName in history:', usedOperatorName);
      console.log('DEBUG - operatorName from req.body:', operatorName);
      console.log('DEBUG - finalOperatorName:', finalOperatorName);
      
      const historyEntry = {
        action: 'updated',
        operator: finalOperatorId,
        operatorName: usedOperatorName, // Use the entered name from the form
        timestamp: new Date(),
        notes: notes || `Job card updated by ${usedOperatorName}${specialInstructions ? ` with special instructions: ${specialInstructions}` : ''}`,
        version: originalJobCard.version || 1,
        specialInstructions: specialInstructions || '',
      };

      updateData[`${attachmentField}.$.history`] = [...(originalJobCard.history || []), historyEntry];

      // Update the job card in place
      const updatedWo = await WorkOrderModel.findOneAndUpdate(
        { 
          _id: id,
          [`${attachmentField}.filename`]: filename,
          [`${attachmentField}.kind`]: jobCardKind
        },
        { $set: updateData },
        { new: true, runValidators: true }
      ).select(attachmentField).lean();

      if (!updatedWo) {
        // Clean up file if work order update failed
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ message: 'Work order not found' });
      }

      const updatedJobCard = updatedWo[attachmentField][jobCardIndex];
      res.status(200).json({ jobCard: updatedJobCard });
    } else {
      // Original logic - create new version
      if (!req.file) return res.status(400).json({ message: 'Updated job card file is required' });

      // Validate file type for job card updates
      const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Invalid file type. Only PDF and images are allowed for job card updates.' });
      }

      // Create new version
      const newVersion = (originalJobCard.version || 1) + 1;
      const newFilename = `${filename.replace(/\.[^/.]+$/, '')}_v${newVersion}.pdf`;

      // Rename the uploaded file to the new version filename
      const uploadDir = ensureUploadDir();
      const oldPath = req.file.path;
      const newPath = path.join(uploadDir, newFilename);
      fs.renameSync(oldPath, newPath);

      const historyEntry = {
        action: 'updated',
        operator: finalOperatorId,
        operatorName: operatorName || finalOperatorName, // Use the entered name from the form
        timestamp: new Date(),
        notes: notes || `Job card updated to new version${specialInstructions ? ` with special instructions: ${specialInstructions}` : ''}`,
        version: newVersion,
        specialInstructions: specialInstructions || '',
      };

      // Add the new version as a new attachment
      const newJobCard = {
        kind: jobCardKind,
        category,
        originalName: `Job_Card_Update_v${newVersion}.pdf`,
        filename: newFilename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: filePublicUrl(newFilename),
        uploadedBy: finalOperatorId,
        uploadedAt: new Date(),
        description: description || `Updated job card version ${newVersion}`,
        approvalStatus: 'pending',
        version: newVersion,
        parentJobCard: originalJobCard._id,
        history: [historyEntry],
        specialInstructions: specialInstructions || '',
      };

      const updatedWo = await WorkOrderModel.findByIdAndUpdate(
        id,
        { $push: { [attachmentField]: newJobCard } },
        { new: true, runValidators: true }
      ).select(attachmentField).lean();

      if (!updatedWo) {
        // Clean up file if work order update failed
        if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
        return res.status(404).json({ message: 'Work order not found' });
      }

      const addedJobCard = updatedWo[attachmentField][updatedWo[attachmentField].length - 1];
      res.status(201).json({ jobCard: addedJobCard });
    }
  } catch (err) {
    // Clean up file if error
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ message: 'Failed to update job card' });
  }
};

// Route handlers for job card updates
router.post('/work-orders/:id/job-cards/:filename/update', requireMfgOrAdmin, upload.single('file'), handleJobCardUpdate);
router.post('/work-orders/:id/job-cards/:filename/update-text-only', requireMfgOrAdmin, upload.none(), handleJobCardUpdate);

// DFM Exception Management
router.get('/work-orders/:id/dfm-exceptions', requireMfgOrAdmin, async (req, res) => {
  try {
    const wo = await MfgWorkOrder.findById(req.params.id).select('dfmExceptions').lean();
    if (!wo) return res.status(404).json({ message: 'Work order not found' });
    res.json({ exceptions: wo.dfmExceptions || [] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load DFM exceptions' });
  }
});

router.post('/work-orders/:id/dfm-exceptions', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { code, description, severity, owner, actionDue, notes } = req.body || {};

    if (!code || !description) {
      return res.status(400).json({ message: 'Code and description are required' });
    }

    const exception = {
      code: String(code).trim(),
      description: String(description).trim(),
      severity: ['info', 'low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'medium',
      owner: owner ? String(owner).trim() : context.isAdmin ? 'admin' : context.operator.name || context.operator.loginId,
      status: 'open',
      actionDue: actionDue ? new Date(actionDue) : undefined,
      notes: notes ? String(notes).trim() : '',
    };

    const wo = await MfgWorkOrder.findByIdAndUpdate(
      req.params.id,
      { $push: { dfmExceptions: exception } },
      { new: true, runValidators: true }
    ).select('dfmExceptions').lean();

    if (!wo) return res.status(404).json({ message: 'Work order not found' });

    // Return the newly added exception
    const newException = wo.dfmExceptions[wo.dfmExceptions.length - 1];
    res.status(201).json({ exception: newException });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add DFM exception' });
  }
});

router.patch('/work-orders/:id/dfm-exceptions/:exceptionId', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { exceptionId } = req.params;
    const updates = req.body || {};

    const updatePayload = {};

    if (typeof updates.code === 'string') updatePayload['dfmExceptions.$.code'] = updates.code.trim();
    if (typeof updates.description === 'string') updatePayload['dfmExceptions.$.description'] = updates.description.trim();
    if (['info', 'low', 'medium', 'high', 'critical'].includes(updates.severity)) {
      updatePayload['dfmExceptions.$.severity'] = updates.severity;
    }
    if (typeof updates.owner === 'string') updatePayload['dfmExceptions.$.owner'] = updates.owner.trim();
    if (['open', 'acknowledged', 'in_progress', 'resolved'].includes(updates.status)) {
      updatePayload['dfmExceptions.$.status'] = updates.status;
      if (updates.status === 'resolved') {
        updatePayload['dfmExceptions.$.resolvedAt'] = new Date();
      }
    }
    if (updates.actionDue) updatePayload['dfmExceptions.$.actionDue'] = new Date(updates.actionDue);
    if (typeof updates.notes === 'string') updatePayload['dfmExceptions.$.notes'] = updates.notes.trim();

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ message: 'No valid updates provided' });
    }

    const wo = await MfgWorkOrder.findOneAndUpdate(
      { _id: req.params.id, 'dfmExceptions._id': exceptionId },
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).select('dfmExceptions').lean();

    if (!wo) return res.status(404).json({ message: 'Work order or exception not found' });

    // Find the updated exception
    const updatedException = wo.dfmExceptions.find(e => e._id.toString() === exceptionId);
    res.json({ exception: updatedException });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update DFM exception' });
  }
});

router.delete('/work-orders/:id/dfm-exceptions/:exceptionId', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { id, exceptionId } = req.params;

    const wo = await MfgWorkOrder.findOneAndUpdate(
      { _id: id, 'dfmExceptions._id': exceptionId },
      { $pull: { dfmExceptions: { _id: exceptionId } } },
      { new: true }
    ).select('dfmExceptions').lean();

    if (!wo) return res.status(404).json({ message: 'Work order or exception not found' });

    res.json({ message: 'DFM exception deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete DFM exception' });
  }
});

// CAM Status Management
router.patch('/work-orders/:id/cam-status', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { state, owner, notes, releaseTarget } = req.body || {};

    const updatePayload = {};

    if (['pending', 'in_review', 'approved', 'blocked'].includes(state)) {
      updatePayload['camStatus.state'] = state;
      updatePayload['camStatus.lastReviewedAt'] = new Date();
      if (state === 'approved') {
        updatePayload['camStatus.releasedAt'] = new Date();
      }
    }

    if (typeof owner === 'string') updatePayload['camStatus.owner'] = owner.trim();
    if (typeof notes === 'string') updatePayload['camStatus.notes'] = notes.trim();
    if (releaseTarget) updatePayload['camStatus.releaseTarget'] = new Date(releaseTarget);

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ message: 'No valid updates provided' });
    }

    const wo = await MfgWorkOrder.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).select('camStatus').lean();

    if (!wo) return res.status(404).json({ message: 'Work order not found' });

    res.json({ camStatus: wo.camStatus });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update CAM status' });
  }
});

// DFM Analytics
router.get('/analytics/dfm', requireMfgOrAdmin, async (req, res) => {
  try {
    const now = new Date();

    // Work order status summary
    const statusSummary = await MfgWorkOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // DFM review times (average time from lastReviewedAt to releasedAt)
    const reviewTimesAgg = await MfgWorkOrder.aggregate([
      {
        $match: {
          'camStatus.lastReviewedAt': { $exists: true },
          'camStatus.releasedAt': { $exists: true }
        }
      },
      {
        $project: {
          reviewTime: {
            $divide: [
              { $subtract: ['$camStatus.releasedAt', '$camStatus.lastReviewedAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgReviewTime: { $avg: '$reviewTime' },
          minReviewTime: { $min: '$reviewTime' },
          maxReviewTime: { $max: '$reviewTime' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Exception resolution rates
    const exceptionStats = await MfgWorkOrder.aggregate([
      { $unwind: '$dfmExceptions' },
      {
        $group: {
          _id: '$dfmExceptions.status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Common issue categories
    const issueCategories = await MfgWorkOrder.aggregate([
      { $unwind: '$dfmExceptions' },
      {
        $group: {
          _id: '$dfmExceptions.code',
          count: { $sum: 1 },
          severity: { $first: '$dfmExceptions.severity' }
        }
      },
      {
        $sort: { count: -1 }
      },
      { $limit: 10 }
    ]);

    // Monthly trends (last 12 months)
    const monthlyTrends = await MfgWorkOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          workOrders: { $sum: 1 },
          exceptions: { $sum: { $size: '$dfmExceptions' } },
          resolved: {
            $sum: {
              $size: {
                $filter: {
                  input: '$dfmExceptions',
                  cond: { $eq: ['$$this.status', 'resolved'] }
                }
              }
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const totalExceptions = exceptionStats.reduce((sum, stat) => sum + stat.count, 0);
    const resolvedExceptions = exceptionStats.find(s => s._id === 'resolved')?.count || 0;
    const resolutionRate = totalExceptions > 0 ? (resolvedExceptions / totalExceptions) * 100 : 0;

    res.json({
      analytics: {
        statusSummary: statusSummary.map(s => ({ status: s._id, count: s.count })),
        reviewTimes: reviewTimesAgg[0] || { avgReviewTime: 0, minReviewTime: 0, maxReviewTime: 0, count: 0 },
        exceptionResolution: {
          total: totalExceptions,
          resolved: resolvedExceptions,
          rate: Math.round(resolutionRate * 100) / 100
        },
        issueCategories: issueCategories.map(c => ({
          code: c._id,
          count: c.count,
          severity: c.severity
        })),
        monthlyTrends: monthlyTrends.map(m => ({
          month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
          workOrders: m.workOrders,
          exceptions: m.exceptions,
          resolved: m.resolved
        }))
      }
    });
  } catch (err) {
    console.error('DFM Analytics error:', err);
    res.status(500).json({ message: 'Failed to load DFM analytics' });
  }
});

// Dispatch Management Endpoints
router.get('/dispatches', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const {
      status,
      priority,
      search,
      limit: limitRaw,
      page: pageRaw,
      workOrderNumber,
      customer,
      stage,
    } = req.query || {};

    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 25));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    // Determine which model to use based on stage
    let DispatchModel = Dispatch;
    let WorkOrderModel = MfgWorkOrder;

    if (stage === '3d_printing_dispatch') {
      DispatchModel = ThreeDPrintingDispatch;
    } else if (stage === 'wire_harness_dispatch') {
      DispatchModel = WireHarnessDispatch;
      WorkOrderModel = AssemblyMfgWorkOrder;
    } else if (stage === 'assembly_final_dispatch') {
      DispatchModel = AssemblyDispatch;
      WorkOrderModel = AssemblyMfgWorkOrder;
    } else if (stage === 'dispatch') {
      WorkOrderModel = MfgWorkOrder;
    }

    const filter = {};

    if (status) {
      const parts = String(status)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 0) filter.status = { $in: parts };
    }

    if (priority) {
      const parts = String(priority)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 0) filter.priority = { $in: parts };
    }

    if (workOrderNumber) {
      filter.workOrderNumber = new RegExp(String(workOrderNumber).trim(), 'i');
    }

    if (customer) {
      filter.customer = new RegExp(String(customer).trim(), 'i');
    }

    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { dispatchNumber: rx },
        { workOrderNumber: rx },
        { customer: rx },
        { product: rx },
      ];
    }

    const [total, dispatches] = await Promise.all([
      DispatchModel.countDocuments(filter),
      DispatchModel.find(filter)
        .populate('workOrder', 'woNumber customer product')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({
      dispatches,
      total,
      page,
      pages,
      limit,
    });
  } catch (err) {
    console.error('GET /dispatches - Error:', err);
    res.status(500).json({ message: 'Failed to load dispatches' });
  }
});

router.post('/dispatches', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const payload = req.body || {};
    console.log('POST /dispatches - Received payload:', payload);
    const { workOrder: workOrderId, workOrderId: workOrderIdAlt, stage } = payload;
    const actualWorkOrderId = workOrderId || workOrderIdAlt;
    console.log('POST /dispatches - Using workOrderId:', actualWorkOrderId);

    // Determine which model to use based on stage
    let WorkOrderModel = MfgWorkOrder;
    let DispatchModel = Dispatch;
    let isAssembly = false;

    if (stage === '3d_printing_dispatch') {
      DispatchModel = ThreeDPrintingDispatch;
    } else if (stage === 'wire_harness_dispatch') {
      WorkOrderModel = AssemblyMfgWorkOrder;
      DispatchModel = WireHarnessDispatch;
      isAssembly = true;
    } else if (stage === 'assembly_final_dispatch') {
      WorkOrderModel = AssemblyMfgWorkOrder;
      DispatchModel = AssemblyDispatch;
      isAssembly = true;
    } else if (stage === 'dispatch') {
      WorkOrderModel = MfgWorkOrder;
      DispatchModel = Dispatch;
      isAssembly = false;
    }

    // Validate work order exists and is in correct stage
    let workOrder = null;
    if (actualWorkOrderId) {
      workOrder = await WorkOrderModel.findById(actualWorkOrderId).lean();
      console.log('POST /dispatches - Found work order:', workOrder ? { id: workOrder._id, stage: workOrder.stage } : 'null');
      if (!workOrder) {
        console.log('POST /dispatches - Work order not found for ID:', actualWorkOrderId);
        return res.status(404).json({ message: 'Work order not found' });
      }
      if (stage && workOrder.stage !== stage) {
        console.log('POST /dispatches - Stage mismatch. Work order stage:', workOrder.stage, 'Required stage:', stage);
        return res.status(400).json({ message: `Work order must be in ${stage} stage` });
      }
    } else {
      // If no workOrderId provided, require essential fields
      if (!payload.customer || !payload.product || !payload.items || payload.items.length === 0) {
        return res.status(400).json({ message: 'Customer, product, and items are required when no workOrderId is provided' });
      }
    }

    // Generate dispatch number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    // Find the next sequence number for today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const todayCount = await DispatchModel.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    });
    const sequence = String(todayCount + 1).padStart(3, '0');

    const prefix = isAssembly ? 'ASM-DSP' : 'DSP';
    const dispatchNumber = `${prefix}-${year}${month}${day}-${sequence}`;

    const dispatchData = {
      workOrder: actualWorkOrderId,
      ...payload,
      dispatchNumber,
      workOrderNumber: workOrder.woNumber,
      customer: workOrder.customer,
      product: workOrder.product,
      quantity: workOrder.quantity,
      createdBy: context.isAdmin ? req.user.sub : context.operator._id,
    };

    console.log('POST /dispatches - Creating dispatch with data:', dispatchData);
    const dispatch = await DispatchModel.create(dispatchData);
    console.log('POST /dispatches - Dispatch created successfully:', { id: dispatch._id, dispatchNumber: dispatch.dispatchNumber });
    res.status(201).json({ dispatch });
  } catch (err) {
    console.error('POST /dispatches - Error:', err);
    if (err?.code === 11000) {
      res.status(409).json({ message: 'Dispatch number already exists' });
    } else {
      res.status(500).json({ message: 'Failed to create dispatch' });
    }
  }
});

router.patch('/dispatches/:id/approve', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const dispatch = await Dispatch.findByIdAndUpdate(
      req.params.id,
      {
        status: 'packing',
        approvedBy: context.isAdmin ? req.user.sub : context.operator._id,
        approvedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate('workOrder', 'woNumber customer product');

    if (!dispatch) {
      return res.status(404).json({ message: 'Dispatch not found' });
    }

    res.json({ dispatch });
  } catch (err) {
    console.error('PATCH /dispatches/:id/approve - Error:', err);
    res.status(500).json({ message: 'Failed to approve dispatch' });
  }
});

router.patch('/dispatches/:id/reject', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { reason } = req.body || {};
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const dispatch = await Dispatch.findByIdAndUpdate(
      req.params.id,
      {
        status: 'cancelled',
        rejectionReason: reason,
        rejectedBy: context.isAdmin ? req.user.sub : context.operator._id,
        rejectedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate('workOrder', 'woNumber customer product');

    if (!dispatch) {
      return res.status(404).json({ message: 'Dispatch not found' });
    }

    res.json({ dispatch });
  } catch (err) {
    console.error('PATCH /dispatches/:id/reject - Error:', err);
    res.status(500).json({ message: 'Failed to reject dispatch' });
  }
});

router.patch('/dispatches/:id/status', requireMfgOrAdmin, async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { status, notes } = req.body || {};
    const validStatuses = ['pending', 'packing', 'packed', 'shipped', 'delivered', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }

    const updateData = { status };
    const now = new Date();

    // Set appropriate timestamps based on status
    if (status === 'packed') {
      updateData.packedAt = now;
      updateData.packedBy = context.isAdmin ? req.user.sub : context.operator._id;
    } else if (status === 'shipped') {
      updateData.shippedDate = now;
      updateData.shippedBy = context.isAdmin ? req.user.sub : context.operator._id;
    } else if (status === 'delivered') {
      updateData.deliveredDate = now;
      updateData.deliveredBy = context.isAdmin ? req.user.sub : context.operator._id;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const dispatch = await Dispatch.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('workOrder', 'woNumber customer product');

    if (!dispatch) {
      return res.status(404).json({ message: 'Dispatch not found' });
    }

    res.json({ dispatch });
  } catch (err) {
    console.error('PATCH /dispatches/:id/status - Error:', err);
    res.status(500).json({ message: 'Failed to update dispatch status' });
  }
});

router.post('/dispatches/:id/documents', requireMfgOrAdmin, upload.single('file'), async (req, res) => {
  try {
    const context = await resolveOperatorContext(req);
    if (!context) {
      return res.status(403).json({ message: 'Operator not authorized' });
    }

    const { kind, description } = req.body;
    const allowedKinds = ['invoice', 'packingList', 'certificateOfConformance', 'testReport'];

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }
    if (!kind || !allowedKinds.includes(kind)) {
      return res.status(400).json({ message: 'Valid document kind is required' });
    }

    // Validate file type
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid file type. Only PDF and images are allowed.' });
    }

    const dispatch = await Dispatch.findById(req.params.id);
    if (!dispatch) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Dispatch not found' });
    }

    const documentData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: filePublicUrl(req.file.filename),
      uploadedBy: context.isAdmin ? req.user.sub : context.operator._id,
      uploadedAt: new Date(),
      description: description || '',
    };

    // Update the appropriate document field
    const updateField = `documents.${kind}`;
    if (kind === 'testReport') {
      // Test reports are an array
      await Dispatch.findByIdAndUpdate(
        req.params.id,
        { $push: { 'documents.testReports': documentData } },
        { new: true, runValidators: true }
      );
    } else {
      // Other documents are single fields
      await Dispatch.findByIdAndUpdate(
        req.params.id,
        { [updateField]: documentData },
        { new: true, runValidators: true }
      );
    }

    res.status(201).json({ document: documentData });
  } catch (err) {
    console.error('POST /dispatches/:id/documents - Error:', err);
    // Clean up file if error
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

export default router;
