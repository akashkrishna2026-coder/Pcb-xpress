import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../lib/db.js';
import User from '../models/User.js';

const mfgUsers = [
  // Existing users
  { email: 'cam.intake@pcbxpress.in', mfgRole: 'cam_intake', workCenter: 'CAM Intake' },
  { email: 'cam.ncdrill@pcbxpress.in', mfgRole: 'cam_nc_drill', workCenter: 'CAM NC Drill' },
  { email: 'photo.imaging@pcbxpress.in', mfgRole: 'photo_imaging', workCenter: 'Photo Imaging' },
  { email: 'qa.photo@pcbxpress.in', mfgRole: 'qa_photo_imaging', workCenter: 'QA Photo Imaging' },
  { email: 'cam.phototools@pcbxpress.in', loginId: 'cam.phototools@pcbxpress.in', mfgRole: 'cam_phototools', workCenter: 'CAM Phototools' },
  { email: 'production.control@pcbxpress.in', mfgRole: 'production_control', workCenter: 'Production Control' },
  { email: 'sheet.cutting@pcbxpress.in', mfgRole: 'sheet_cutting', workCenter: 'Sheet Cutting' },
  { email: 'cnc.drill@pcbxpress.in', mfgRole: 'cnc_drilling', workCenter: 'CNC Drilling' },
  { email: 'sanding.operator@pcbxpress.in', mfgRole: 'sanding', workCenter: 'Sanding' },
  { email: 'brushing.operator@pcbxpress.in', mfgRole: 'brushing', workCenter: 'Brushing' },
  { email: 'pth.operator@pcbxpress.in', mfgRole: 'pth_line', workCenter: 'PTH Line' },
  { email: 'photo.imaging@pcbxpress.in', mfgRole: 'photo_imaging', workCenter: 'Photo Imaging' },
  { email: 'developer.operator@pcbxpress.in', mfgRole: 'developer', workCenter: 'Developer' },
  { email: 'qa.photo@pcbxpress.in', mfgRole: 'qa_photo_imaging', workCenter: 'QA Photo Imaging' },
  { email: 'etching.operator@pcbxpress.in', mfgRole: 'etching', workCenter: 'Etching' },
  { email: 'tin.strip@pcbxpress.in', mfgRole: 'tin_strip', workCenter: 'Tin Strip' },
  { email: 'qa.etch@pcbxpress.in', mfgRole: 'qa_etch', workCenter: 'QA Etch' },
  { email: 'qa.dryfilm@pcbxpress.in', mfgRole: 'qa_dry_film', workCenter: 'QA Dry Film' },
  { email: 'resist.strip@pcbxpress.in', mfgRole: 'resist_strip', workCenter: 'Resist Strip' },
  { email: 'dryfilm.strip@pcbxpress.in', mfgRole: 'dry_film_strip', workCenter: 'Dry Film Strip' },
  { email: 'pattern.plating@pcbxpress.in', mfgRole: 'pattern_plating', workCenter: 'Pattern Plating' },
  { email: 'solder.mask@pcbxpress.in', mfgRole: 'solder_mask', workCenter: 'Solder Mask' },
  { email: 'qa.soldermask@pcbxpress.in', mfgRole: 'qa_solder_mask', workCenter: 'QA Solder Mask' },
  { email: 'hal.operator@pcbxpress.in', mfgRole: 'hal', workCenter: 'HAL' },
  { email: 'qa.hal@pcbxpress.in', mfgRole: 'qa_hal', workCenter: 'QA HAL' },
  { email: 'legend.print@pcbxpress.in', mfgRole: 'legend_print', workCenter: 'Legend Print' },
  { email: 'cnc.routing@pcbxpress.in', mfgRole: 'cnc_routing', workCenter: 'CNC Routing' },
  { email: 'vscore@pcbxpress.in', mfgRole: 'v_score', workCenter: 'V-Scoring' },
  { email: 'test.flyingprobe@pcbxpress.in', mfgRole: 'test_flying_probe', workCenter: 'Flying Probe Test' },
  { email: 'qa.final@pcbxpress.in', mfgRole: 'qa_final', workCenter: 'Final QA' },
  { email: 'packing@pcbxpress.in', mfgRole: 'packing', workCenter: 'Packing' },
  { email: 'dispatch@pcbxpress.in', mfgRole: 'dispatch', workCenter: 'Dispatch' },
  { email: 'materials.lead@pcbxpress.in', mfgRole: 'materials_lead', workCenter: 'Materials' },
  { email: 'planner@pcbxpress.in', mfgRole: 'production_planner', workCenter: 'Production Planning' },
  { email: 'qa.manager@pcbxpress.in', mfgRole: 'qa_manager', workCenter: 'QA Management' },

  // New assembly users
  { email: 'assembly.store@pcbxpress.in', mfgRole: 'assembly_store', workCenter: 'Assembly Store' },
  { email: 'stencil.operator@pcbxpress.in', mfgRole: 'stencil', workCenter: 'Stencil Printing' },
  { email: 'assembly.reflow@pcbxpress.in', mfgRole: 'assembly_reflow', workCenter: 'Assembly Reflow' },
  { email: 'th.soldering@pcbxpress.in', mfgRole: 'th_soldering', workCenter: 'TH Soldering' },
  { email: 'visual.inspection@pcbxpress.in', mfgRole: 'visual_inspection', workCenter: 'Visual Inspection' },
  { email: 'ict.operator@pcbxpress.in', mfgRole: 'ict', workCenter: 'ICT Testing' },
  { email: 'flashing.operator@pcbxpress.in', mfgRole: 'flashing', workCenter: 'Flashing' },
  { email: 'functional.test@pcbxpress.in', mfgRole: 'functional_test', workCenter: 'Functional Test' },
  { email: 'wire.harness.intake@pcbxpress.in', mfgRole: 'wire_harness_intake', workCenter: 'Wire Harness Intake' },
  { email: 'wire.harness@pcbxpress.in', mfgRole: 'wire_harness', workCenter: 'Wire Harness' },
  { email: 'wire.testing@pcbxpress.in', loginId: 'wire-testing-01', mfgRole: 'wire_testing', workCenter: 'Wire Testing' },
  { email: 'wire.harness.dispatch@pcbxpress.in', mfgRole: 'wire_harness_dispatch', workCenter: 'Wire Harness Dispatch' },

  // Assembly Dispatch user
  { email: 'assembly.dispatch@pcbxpress.in', mfgRole: 'assembly_dispatch', workCenter: 'Assembly Dispatch' },

  // 3D Printing users
  { email: 'assembly.3d.printing@pcbxpress.in', mfgRole: 'assembly_3d_printing', workCenter: 'Assembly 3D Printing' },
  { email: '3d.printing@pcbxpress.in', mfgRole: '3d_printing', workCenter: '3D Printing' },
  { email: '3d.intake@pcbxpress.in', mfgRole: '3d_printing_intake', workCenter: '3D Printing Intake' },
  { email: '3d.fileprep@pcbxpress.in', mfgRole: '3d_printing_file_prep', workCenter: '3D File Preparation' },
  { email: '3d.slicing@pcbxpress.in', mfgRole: '3d_printing_slicing', workCenter: '3D Slicing' },
  { email: '3d.active@pcbxpress.in', mfgRole: '3d_printing_active', workCenter: '3D Active Printing' },
  { email: '3d.postprocess@pcbxpress.in', mfgRole: '3d_printing_post_processing', workCenter: '3D Post-Processing' },
  { email: '3d.qc@pcbxpress.in', mfgRole: '3d_printing_qc', workCenter: '3D Quality Control' },

  // Testing user
  { email: 'testing.operator@pcbxpress.in', mfgRole: 'testing', workCenter: 'Testing Operations' },
];

async function main() {
  await connectDB();

  const password = 'Pcbxpress@123';
  const hash = await bcrypt.hash(password, 10);

  for (const userData of mfgUsers) {
    let user = await User.findOne({ 
      $or: [
        { email: userData.email?.toLowerCase() || '' },
        { loginId: userData.loginId?.toLowerCase() || '' }
      ]
    });
    if (!user) {
      const createUserFields = {
        name: userData.email?.split('@')[0]?.replace(/[._]/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || userData.loginId?.split('@')[0]?.replace(/[._]/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
        email: userData.email?.toLowerCase() || userData.loginId?.toLowerCase() || '',
        password: userData.password || hash,
        role: 'mfg',
        mfgRole: userData.mfgRole,
        workCenter: userData.workCenter,
        isActive: true,
      };
      
      // Add loginId if provided
      if (userData.loginId) {
        createUserFields.loginId = userData.loginId.toLowerCase();
      }
      
      user = await User.create(createUserFields);
      console.log('Created MFG user:', { 
        email: user.email, 
        loginId: user.loginId, 
        mfgRole: user.mfgRole, 
        workCenter: user.workCenter,
        hasCustomPassword: !!userData.password 
      });
    } else {
      console.log('MFG user already exists:', userData.email || userData.loginId);
    }
  }

  await mongoose.disconnect();
  console.log('MFG user seeding completed.');
}

main().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
