import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/lib/db.js';
import User from '../src/models/User.js';

const DEFAULT_PASSWORD = process.env.DEFAULT_MFG_PASSWORD || 'Pcbxpress@123';

const OPERATORS = [
  {
    name: 'CAM Intake Engineer',
    email: 'cam.intake@pcbxpress.in',
    loginId: 'cam-intake-01',
    mfgRole: 'cam_intake',
    workCenter: 'CAM Intake',
    permissions: ['cam:review', 'traveler:read'],
  },
  {
    name: 'CAM NC Drill',
    email: 'cam.ncdrill@pcbxpress.in',
    loginId: 'cam-ncdrill-01',
    mfgRole: 'cam_nc_drill',
    workCenter: 'CAM NC Drill',
    permissions: ['cam:review', 'cam:release', 'traveler:read'],
  },
  {
    name: 'CAM Phototools',
    email: 'cam.phototools@pcbxpress.in',
    loginId: 'cam-phototools-01',
    mfgRole: 'cam_phototools',
    workCenter: 'CAM Phototools & Legend',
    permissions: ['cam:review', 'cam:release', 'traveler:read'],
  },
  {
    name: 'Production Controller',
    email: 'production.control@pcbxpress.in',
    loginId: 'production-control-01',
    mfgRole: 'production_control',
    workCenter: 'Job Card',
    permissions: ['traveler:read', 'traveler:release', 'planning:schedule'],
  },
  {
    name: 'Sheet Cutting Operator',
    email: 'sheet.cutting@pcbxpress.in',
    loginId: 'sheet-cutting-01',
    mfgRole: 'sheet_cutting',
    workCenter: 'Sheet Cutting',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'CNC Drilling Operator',
    email: 'cnc.drill@pcbxpress.in',
    loginId: 'cnc-drill-01',
    mfgRole: 'cnc_drilling',
    workCenter: 'CNC Drilling',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'PTH Line Operator',
    email: 'pth.operator@pcbxpress.in',
    loginId: 'pth-operator-01',
    mfgRole: 'pth_line',
    workCenter: 'PTH & Flash Plating',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'Photo Imaging Operator',
    email: 'photo.imaging@pcbxpress.in',
    loginId: 'photo-imaging-01',
    mfgRole: 'photo_imaging',
    workCenter: 'Photo Imaging',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'QA Photo Imaging',
    email: 'qa.photo@pcbxpress.in',
    loginId: 'qa-photo-01',
    mfgRole: 'qa_photo_imaging',
    workCenter: 'Photo Imaging QC',
    permissions: ['traveler:read', 'traveler:release', 'qc:hold'],
  },
  {
    name: 'Etching Line Operator',
    email: 'etching.operator@pcbxpress.in',
    loginId: 'etching-operator-01',
    mfgRole: 'etching',
    workCenter: 'Alkaline Etching',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'Tin Strip Operator',
    email: 'tin.strip@pcbxpress.in',
    loginId: 'tin-strip-01',
    mfgRole: 'tin_strip',
    workCenter: 'Tin Stripping',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'QA Etch Inspection',
    email: 'qa.etch@pcbxpress.in',
    loginId: 'qa-etch-01',
    mfgRole: 'qa_etch',
    workCenter: 'Etch QC',
    permissions: ['traveler:read', 'traveler:release', 'qc:hold'],
  },
  {
    name: 'QA Dry Film Inspection',
    email: 'qa.dryfilm@pcbxpress.in',
    loginId: 'qa-dryfilm-01',
    mfgRole: 'qa_dry_film',
    workCenter: 'Dry Film QC',
    permissions: ['traveler:read', 'traveler:release', 'qc:hold'],
  },
  {
    name: 'Resist Strip Operator',
    email: 'resist.strip@pcbxpress.in',
    loginId: 'resist-strip-01',
    mfgRole: 'resist_strip',
    workCenter: 'Resist Strip',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'Dry Film Strip Operator',
    email: 'dryfilm.strip@pcbxpress.in',
    loginId: 'dryfilm-strip-01',
    mfgRole: 'dry_film_strip',
    workCenter: 'Dry Film Stripping',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'Pattern Plating Operator',
    email: 'pattern.plating@pcbxpress.in',
    loginId: 'pattern-plating-01',
    mfgRole: 'pattern_plating',
    workCenter: 'Pattern Plating',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'Solder Mask Operator',
    email: 'solder.mask@pcbxpress.in',
    loginId: 'solder-mask-01',
    mfgRole: 'solder_mask',
    workCenter: 'Solder Mask',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'QA Solder Mask',
    email: 'qa.soldermask@pcbxpress.in',
    loginId: 'qa-soldermask-01',
    mfgRole: 'qa_solder_mask',
    workCenter: 'Solder Mask QC',
    permissions: ['traveler:read', 'traveler:release', 'qc:hold'],
  },
  {
    name: 'HAL Operator',
    email: 'hal.operator@pcbxpress.in',
    loginId: 'hal-operator-01',
    mfgRole: 'hal',
    workCenter: 'HAL Line',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'QA HAL',
    email: 'qa.hal@pcbxpress.in',
    loginId: 'qa-hal-01',
    mfgRole: 'qa_hal',
    workCenter: 'HAL QC',
    permissions: ['traveler:read', 'traveler:release', 'qc:hold'],
  },
  {
    name: 'Legend Printer Operator',
    email: 'legend.print@pcbxpress.in',
    loginId: 'legend-print-01',
    mfgRole: 'legend_print',
    workCenter: 'Legend Printing',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'CNC Routing Operator',
    email: 'cnc.routing@pcbxpress.in',
    loginId: 'cnc-routing-01',
    mfgRole: 'cnc_routing',
    workCenter: 'CNC Routing',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'V-Score Operator',
    email: 'vscore@pcbxpress.in',
    loginId: 'vscore-operator-01',
    mfgRole: 'v_score',
    workCenter: 'V-Scoring',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'Flying Probe Tester',
    email: 'test.flyingprobe@pcbxpress.in',
    loginId: 'test-fp-01',
    mfgRole: 'test_flying_probe',
    workCenter: 'Flying Probe Test',
    permissions: ['traveler:read', 'traveler:release', 'qc:hold'],
  },
  {
    name: 'QA Final Inspection',
    email: 'qa.final@pcbxpress.in',
    loginId: 'qa-final-01',
    mfgRole: 'qa_final',
    workCenter: 'Final Inspection',
    permissions: ['traveler:read', 'traveler:release', 'qc:hold'],
  },
  {
    name: 'Packing Operator',
    email: 'packing@pcbxpress.in',
    loginId: 'packing-operator-01',
    mfgRole: 'packing',
    workCenter: 'Packing',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'Dispatch Coordinator',
    email: 'dispatch@pcbxpress.in',
    loginId: 'dispatch-01',
    mfgRole: 'dispatch',
    workCenter: 'Dispatch',
    permissions: ['traveler:read', 'traveler:release', 'materials:shortages'],
  },
  {
    name: 'PCB Dispatch Operator',
    email: 'pcb.dispatch@pcbxpress.in',
    loginId: 'pcb-dispatch-01',
    mfgRole: 'pcb_dispatch',
    workCenter: 'PCB Dispatch',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'Materials Lead',
    email: 'materials.lead@pcbxpress.in',
    loginId: 'materials-lead-01',
    mfgRole: 'materials_lead',
    workCenter: 'Stores & Materials',
    permissions: ['traveler:read', 'materials:shortages', 'planning:schedule'],
  },
  {
    name: 'Production Planner',
    email: 'planner@pcbxpress.in',
    loginId: 'planner-01',
    mfgRole: 'production_planner',
    workCenter: 'Planning',
    permissions: ['traveler:read', 'traveler:release', 'planning:schedule'],
  },
  {
    name: 'QA Manager',
    email: 'qa.manager@pcbxpress.in',
    loginId: 'qa-manager-01',
    mfgRole: 'qa_manager',
    workCenter: 'Quality Management',
    permissions: ['traveler:read', 'qc:hold', 'traveler:release'],
  },
  {
    name: 'Sanding Operator',
    email: 'sanding.operator@pcbxpress.in',
    loginId: 'sanding-operator-01',
    mfgRole: 'sanding',
    workCenter: 'Sanding',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'Brushing Operator',
    email: 'brushing.operator@pcbxpress.in',
    loginId: 'brushing-operator-01',
    mfgRole: 'brushing',
    workCenter: 'Brushing',
    permissions: ['traveler:read', 'traveler:release'],
  },
  {
    name: 'Developer Operator',
    email: 'developer.operator@pcbxpress.in',
    loginId: 'developer-operator-01',
    mfgRole: 'developer',
    workCenter: 'Developer Station',
    permissions: ['traveler:read', 'traveler:release'],
  },
];

const normalizePermissions = (perms = []) =>
  Array.from(
    new Set(
      perms
        .filter((p) => typeof p === 'string')
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean)
    )
  );

async function seedOperators() {
  await connectDB();

  for (const operator of OPERATORS) {
    const email = operator.email.toLowerCase();
    const loginId = operator.loginId.toLowerCase();
    const password = operator.password || DEFAULT_PASSWORD;

    const hash = await bcrypt.hash(String(password), 10);

    await User.findOneAndUpdate(
      { role: 'mfg', $or: [{ email }, { loginId }] },
      {
        $set: {
          name: operator.name,
          email,
          loginId,
          role: 'mfg',
          password: hash,
          mfgRole: operator.mfgRole,
          workCenter: operator.workCenter,
          permissions: normalizePermissions(operator.permissions),
          isActive: operator.isActive !== false,
        },
      },
      { upsert: true, new: true }
    );
  }

  const total = await User.countDocuments({ role: 'mfg' });
  console.log(`Seeded ${OPERATORS.length} manufacturing operators. Total mfg users: ${total}`);

  await mongoose.disconnect();
}

seedOperators().catch((err) => {
  console.error('Failed to seed manufacturing operators:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
