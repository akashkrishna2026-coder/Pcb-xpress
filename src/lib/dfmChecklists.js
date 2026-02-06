// Standardized DFM Checklists for manufacturing processes
export const DFM_CHECKLISTS = {
  camIntake: {
    id: 'cam_intake',
    title: 'CAM Intake Checklist',
    description: 'Pre-CAM review checklist for incoming design files',
    process: 'CAM Intake',
    items: [
      {
        id: 'cam_001',
        label: 'All required Gerber files present (copper, solder mask, silkscreen, drill)',
        category: 'file_integrity',
        required: true,
        severity: 'critical'
      },
      {
        id: 'cam_002',
        label: 'Gerber file format and version compatible with CAM software',
        category: 'file_integrity',
        required: true,
        severity: 'high'
      },
      {
        id: 'cam_003',
        label: 'Drill file format matches board requirements (NC drill vs. Excellon)',
        category: 'file_integrity',
        required: true,
        severity: 'high'
      },
      {
        id: 'cam_004',
        label: 'Layer stackup clearly defined and matches Gerber layers',
        category: 'design_specification',
        required: true,
        severity: 'critical'
      },
      {
        id: 'cam_005',
        label: 'Board dimensions and tolerances specified',
        category: 'design_specification',
        required: true,
        severity: 'high'
      },
      {
        id: 'cam_006',
        label: 'Material specifications complete (laminate type, thickness, copper weight)',
        category: 'design_specification',
        required: true,
        severity: 'critical'
      },
      {
        id: 'cam_007',
        label: 'Surface finish requirements specified',
        category: 'design_specification',
        required: true,
        severity: 'high'
      },
      {
        id: 'cam_008',
        label: 'Impedance control requirements included (if applicable)',
        category: 'design_specification',
        required: false,
        severity: 'medium'
      },
      {
        id: 'cam_009',
        label: 'Panelization requirements specified',
        category: 'manufacturing_requirements',
        required: true,
        severity: 'high'
      },
      {
        id: 'cam_010',
        label: 'Fiducial marks included and properly positioned',
        category: 'manufacturing_requirements',
        required: true,
        severity: 'medium'
      },
      {
        id: 'cam_011',
        label: 'Test points accessible and properly sized',
        category: 'manufacturing_requirements',
        required: false,
        severity: 'low'
      },
      {
        id: 'cam_012',
        label: 'Special fabrication notes reviewed and understood',
        category: 'documentation',
        required: true,
        severity: 'medium'
      }
    ]
  },
  ncDrill: {
    id: 'nc_drill',
    title: 'NC Drill Process Checklist',
    description: 'Checklist for NC drill file preparation and verification',
    process: 'NC Drill',
    items: [
      {
        id: 'drill_001',
        label: 'Drill file format validated (Excellon or Gerber)',
        category: 'file_preparation',
        required: true,
        severity: 'critical'
      },
      {
        id: 'drill_002',
        label: 'Tool list complete with all required drill sizes',
        category: 'file_preparation',
        required: true,
        severity: 'high'
      },
      {
        id: 'drill_003',
        label: 'Hole tolerances specified for each drill size',
        category: 'file_preparation',
        required: true,
        severity: 'high'
      },
      {
        id: 'drill_004',
        label: 'Plated vs. non-plated holes clearly identified',
        category: 'hole_classification',
        required: true,
        severity: 'critical'
      },
      {
        id: 'drill_005',
        label: 'Via holes identified and back-drill requirements noted',
        category: 'hole_classification',
        required: true,
        severity: 'high'
      },
      {
        id: 'drill_006',
        label: 'Blind/buried via specifications complete',
        category: 'hole_classification',
        required: false,
        severity: 'medium'
      },
      {
        id: 'drill_007',
        label: 'Minimum hole-to-hole spacing verified (8 mil minimum)',
        category: 'spacing_verification',
        required: true,
        severity: 'high'
      },
      {
        id: 'drill_008',
        label: 'Hole-to-copper clearance verified (6 mil minimum annular ring)',
        category: 'spacing_verification',
        required: true,
        severity: 'critical'
      },
      {
        id: 'drill_009',
        label: 'Slot milling requirements specified (if applicable)',
        category: 'special_features',
        required: false,
        severity: 'medium'
      },
      {
        id: 'drill_010',
        label: 'Counterbore/countersink specifications complete',
        category: 'special_features',
        required: false,
        severity: 'medium'
      },
      {
        id: 'drill_011',
        label: 'Drill file coordinates match board origin',
        category: 'coordinate_system',
        required: true,
        severity: 'critical'
      },
      {
        id: 'drill_012',
        label: 'Panel fiducials included in drill file',
        category: 'coordinate_system',
        required: true,
        severity: 'medium'
      }
    ]
  },
  phototools: {
    id: 'phototools',
    title: 'Phototools Process Checklist',
    description: 'Checklist for phototool generation and verification',
    process: 'Phototools',
    items: [
      {
        id: 'photo_001',
        label: 'All layer photoplots generated at correct scale (1:1)',
        category: 'file_generation',
        required: true,
        severity: 'critical'
      },
      {
        id: 'photo_002',
        label: 'Photoplot orientation correct ( emulsion side up)',
        category: 'file_generation',
        required: true,
        severity: 'critical'
      },
      {
        id: 'photo_003',
        label: 'Layer registration marks (targets) included',
        category: 'file_generation',
        required: true,
        severity: 'high'
      },
      {
        id: 'photo_004',
        label: 'Solder mask clearance verified (3 mil minimum)',
        category: 'mask_verification',
        required: true,
        severity: 'high'
      },
      {
        id: 'photo_005',
        label: 'Solder mask dams verified for BGA/QFN components',
        category: 'mask_verification',
        required: true,
        severity: 'medium'
      },
      {
        id: 'photo_006',
        label: 'Silkscreen text size meets minimum requirements (6 mil)',
        category: 'silkscreen_verification',
        required: true,
        severity: 'low'
      },
      {
        id: 'photo_007',
        label: 'Silkscreen-to-solder mask clearance verified (2 mil minimum)',
        category: 'silkscreen_verification',
        required: true,
        severity: 'medium'
      },
      {
        id: 'photo_008',
        label: 'Copper layer polarity correct (dark = copper)',
        category: 'layer_polarity',
        required: true,
        severity: 'critical'
      },
      {
        id: 'photo_009',
        label: 'Solder mask polarity correct (clear = mask opening)',
        category: 'layer_polarity',
        required: true,
        severity: 'critical'
      },
      {
        id: 'photo_010',
        label: 'Silkscreen polarity correct (dark = legend)',
        category: 'layer_polarity',
        required: true,
        severity: 'high'
      },
      {
        id: 'photo_011',
        label: 'Panel borders and rail marks included',
        category: 'panel_features',
        required: true,
        severity: 'medium'
      },
      {
        id: 'photo_012',
        label: 'Gold finger bevel included in solder mask (if applicable)',
        category: 'special_features',
        required: false,
        severity: 'medium'
      },
      {
        id: 'photo_013',
        label: 'Peelable mask areas defined (if applicable)',
        category: 'special_features',
        required: false,
        severity: 'low'
      },
      {
        id: 'photo_014',
        label: 'Carbon ink areas defined (if applicable)',
        category: 'special_features',
        required: false,
        severity: 'low'
      },
      {
        id: 'photo_015',
        label: 'Film resolution meets manufacturer requirements (minimum 5080 DPI)',
        category: 'output_quality',
        required: true,
        severity: 'high'
      }
    ]
  }
};

// Helper function to get all checklists
export const getAllDfmChecklists = () => {
  return Object.values(DFM_CHECKLISTS);
};

// Helper function to get checklist by ID
export const getDfmChecklistById = (id) => {
  return DFM_CHECKLISTS[id];
};

// Helper function to get checklists by process
export const getDfmChecklistsByProcess = (process) => {
  return getAllDfmChecklists().filter(checklist =>
    checklist.process.toLowerCase().includes(process.toLowerCase())
  );
};