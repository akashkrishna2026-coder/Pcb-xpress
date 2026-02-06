// DFM Issue Templates for common manufacturing problems
export const DFM_TEMPLATES = {
  electrical: [
    {
      code: 'DFM-ELEC-001',
      description: 'Annular ring below minimum specification (6 mil)',
      severity: 'high',
      category: 'electrical',
      commonCauses: ['Tight component placement', 'Small pad sizes'],
      recommendations: ['Increase pad size', 'Adjust component placement', 'Use smaller drill size']
    },
    {
      code: 'DFM-ELEC-002',
      description: 'Trace width below minimum specification (4 mil)',
      severity: 'high',
      category: 'electrical',
      commonCauses: ['High density routing', 'Space constraints'],
      recommendations: ['Increase trace width', 'Use wider spacing rules', 'Consider layer stackup changes']
    },
    {
      code: 'DFM-ELEC-003',
      description: 'Via stub length exceeds maximum (8 mil)',
      severity: 'medium',
      category: 'electrical',
      commonCauses: ['Back-drill not specified', 'Layer stackup issues'],
      recommendations: ['Specify back-drill requirements', 'Adjust layer stackup', 'Use blind/buried vias']
    },
    {
      code: 'DFM-ELEC-004',
      description: 'Controlled impedance trace missing tolerance specification',
      severity: 'critical',
      category: 'electrical',
      commonCauses: ['Incomplete design specifications', 'Missing fabrication notes'],
      recommendations: ['Add impedance tolerance requirements', 'Specify test coupons', 'Include fabrication notes']
    },
    {
      code: 'DFM-ELEC-005',
      description: 'Power/ground plane clearance violation',
      severity: 'high',
      category: 'electrical',
      commonCauses: ['Tight clearance rules', 'High voltage requirements'],
      recommendations: ['Increase clearance spacing', 'Use appropriate material', 'Add teardrops']
    },
    {
      code: 'DFM-ELEC-006',
      description: 'Test point access obstructed',
      severity: 'medium',
      category: 'electrical',
      commonCauses: ['Component placement blocking access', 'Small test points'],
      recommendations: ['Relocate test points', 'Increase test point size', 'Add test coupons']
    }
  ],
  mechanical: [
    {
      code: 'DFM-MECH-001',
      description: 'Board edge to component clearance below minimum (20 mil)',
      severity: 'medium',
      category: 'mechanical',
      commonCauses: ['Edge component placement', 'Panelization constraints'],
      recommendations: ['Move components inward', 'Adjust panelization', 'Use edge rails']
    },
    {
      code: 'DFM-MECH-002',
      description: 'Hole-to-hole spacing below minimum (8 mil)',
      severity: 'high',
      category: 'mechanical',
      commonCauses: ['High density drilling', 'Component constraints'],
      recommendations: ['Increase hole spacing', 'Use laser drilling', 'Adjust component placement']
    },
    {
      code: 'DFM-MECH-003',
      description: 'Slot width below minimum specification (20 mil)',
      severity: 'high',
      category: 'mechanical',
      commonCauses: ['Small slot requirements', 'Routing constraints'],
      recommendations: ['Increase slot width', 'Use milling instead of routing', 'Adjust design']
    },
    {
      code: 'DFM-MECH-004',
      description: 'Board thickness tolerance not specified',
      severity: 'medium',
      category: 'mechanical',
      commonCauses: ['Incomplete specifications', 'Standard tolerance assumed'],
      recommendations: ['Specify thickness tolerance', 'Add fabrication notes', 'Include measurement requirements']
    },
    {
      code: 'DFM-MECH-005',
      description: 'Fiducial mark placement incorrect',
      severity: 'low',
      category: 'mechanical',
      commonCauses: ['Missing fiducials', 'Incorrect positioning'],
      recommendations: ['Add fiducial marks', 'Position per IPC standards', 'Include in fabrication drawing']
    },
    {
      code: 'DFM-MECH-006',
      description: 'Panelization features missing or inadequate',
      severity: 'medium',
      category: 'mechanical',
      commonCauses: ['No panelization specified', 'Inadequate breakaway tabs'],
      recommendations: ['Add panelization features', 'Include mouse bites', 'Specify breakaway method']
    }
  ],
  process: [
    {
      code: 'DFM-PROC-001',
      description: 'Solder mask clearance below minimum (3 mil)',
      severity: 'high',
      category: 'process',
      commonCauses: ['Tight solder mask rules', 'Small pad sizes'],
      recommendations: ['Increase solder mask clearance', 'Use larger pads', 'Adjust mask expansion']
    },
    {
      code: 'DFM-PROC-002',
      description: 'Silkscreen text size below minimum (6 mil)',
      severity: 'low',
      category: 'process',
      commonCauses: ['Small text requirements', 'Space constraints'],
      recommendations: ['Increase text size', 'Use vector fonts', 'Remove small text elements']
    },
    {
      code: 'DFM-PROC-003',
      description: 'Surface finish compatibility issues',
      severity: 'medium',
      category: 'process',
      commonCauses: ['Mixed surface finishes', 'Component compatibility'],
      recommendations: ['Specify compatible finish', 'Use single finish type', 'Add fabrication notes']
    },
    {
      code: 'DFM-PROC-004',
      description: 'Laminate material not specified or incompatible',
      severity: 'critical',
      category: 'process',
      commonCauses: ['Missing material specifications', 'Special requirements'],
      recommendations: ['Specify laminate type', 'Include material requirements', 'Add processing notes']
    },
    {
      code: 'DFM-PROC-005',
      description: 'Gold finger bevel angle incorrect',
      severity: 'medium',
      category: 'process',
      commonCauses: ['Missing bevel specification', 'Incorrect angle'],
      recommendations: ['Specify 45-degree bevel', 'Add fabrication notes', 'Include in drawing']
    },
    {
      code: 'DFM-PROC-006',
      description: 'Counterbore/countersink depth tolerance not specified',
      severity: 'medium',
      category: 'process',
      commonCauses: ['Incomplete specifications', 'Standard tolerance assumed'],
      recommendations: ['Specify depth tolerance', 'Add measurement requirements', 'Include in fabrication notes']
    }
  ]
};

// Helper function to get all templates
export const getAllDfmTemplates = () => {
  return [
    ...DFM_TEMPLATES.electrical,
    ...DFM_TEMPLATES.mechanical,
    ...DFM_TEMPLATES.process
  ];
};

// Helper function to get templates by category
export const getDfmTemplatesByCategory = (category) => {
  return DFM_TEMPLATES[category] || [];
};

// Helper function to get template by code
export const getDfmTemplateByCode = (code) => {
  const allTemplates = getAllDfmTemplates();
  return allTemplates.find(template => template.code === code);
};