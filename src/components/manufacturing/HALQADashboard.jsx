import React from 'react';
import OperatorDashboard from './OperatorDashboard';

const HALQADashboard = () => {
  const checklists = [
    {
      title: "HAL QA Inspection Criteria",
      items: [
        { label: "Verify HASL (Hot Air Solder Leveling) coating uniformity" },
        { label: "Check solder thickness meets specifications (typically 0.001-0.005 inches)" },
        { label: "Inspect for solder bridging between pads and traces" },
        { label: "Verify solder wetting and adhesion to copper surfaces" },
        { label: "Check for solder balls, icicles, or excessive solder buildup" },
        { label: "Inspect surface finish appearance and color consistency" },
        { label: "Verify preheat and solder pot temperature parameters" },
        { label: "Check for flux residue or contamination" },
        { label: "Document HAL process parameters and settings" },
        { label: "Verify panel flatness and dimensional stability post-HAL" }
      ]
    },
    {
      title: "Defect Tracking & Hold/Release Decisions",
      items: [
        { label: "Log all HAL defects (bridging, poor wetting, solder balls)" },
        { label: "Categorize defects by location and severity" },
        { label: "Determine impact on solderability and electrical performance" },
        { label: "Place hold on work orders with critical HAL issues" },
        { label: "Release work orders meeting HAL quality standards" },
        { label: "Document inspection results and defect locations" },
        { label: "Escalate process issues to HAL process engineer" },
        { label: "Update traveler with HAL QA inspection status" }
      ]
    }
  ];

  return (
    <OperatorDashboard
      stationName="HAL QA"
      stationRole="qa_hal"
      workOrderFilter={{
        stage: 'surface_finish',
        currentStation: 'HAL QA'
      }}
      checklists={checklists}
      qcEnabled={true}
      scanEnabled={true}
      switchLink={{ station: 'hal', label: 'HAL Operator' }}
      workOrdersAtBottom={true}
    />
  );
};

export default HALQADashboard;