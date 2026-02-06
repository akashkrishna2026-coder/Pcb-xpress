import React from 'react';
import OperatorDashboard from './OperatorDashboard';

const SolderMaskQADashboard = () => {
  const checklists = [
    {
      title: "Solder Mask QA Inspection Criteria",
      items: [
        { label: "Verify solder mask coverage over copper traces" },
        { label: "Check alignment accuracy with copper pattern (±0.05mm)" },
        { label: "Inspect for pinholes, voids, or incomplete coverage" },
        { label: "Verify solder mask thickness meets specifications" },
        { label: "Check for proper tenting over vias and holes" },
        { label: "Inspect surface finish and color uniformity" },
        { label: "Verify UV exposure and development parameters" },
        { label: "Check for solder mask residue or contamination" },
        { label: "Document cure time and temperature settings" },
        { label: "Verify panel flatness and dimensional stability" }
      ]
    },
    {
      title: "Defect Tracking & Hold/Release Decisions",
      items: [
        { label: "Log all solder mask defects (pinholes, misalignment, voids)" },
        { label: "Categorize defects by location and severity" },
        { label: "Determine impact on electrical performance and reliability" },
        { label: "Place hold on work orders with critical solder mask issues" },
        { label: "Release work orders meeting solder mask quality standards" },
        { label: "Document inspection results and defect locations" },
        { label: "Escalate process issues to solder mask process engineer" },
        { label: "Update traveler with solder mask QA inspection status" }
      ]
    }
  ];

  return (
    <OperatorDashboard
      stationName="Solder Mask QA"
      stationRole="qa_solder_mask"
      workOrderFilter={{
        stage: 'fabrication',
        currentStation: 'Solder Mask QA'
      }}
      checklists={checklists}
      qcEnabled={true}
      scanEnabled={true}
      switchLink={{ station: 'solder_mask', label: 'Solder Mask Operator' }}
      workOrdersAtBottom={true}
    />
  );
};

export default SolderMaskQADashboard;