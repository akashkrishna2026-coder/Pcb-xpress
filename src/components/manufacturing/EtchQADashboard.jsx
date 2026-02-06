import React from 'react';
import OperatorDashboard from './OperatorDashboard';

const EtchQADashboard = () => {
  const checklists = [
    {
      title: "Etch Process QA Inspection Criteria",
      items: [
        { label: "Verify copper thickness meets specifications after etching" },
        { label: "Check line width and spacing accuracy (±0.05mm tolerance)" },
        { label: "Inspect for under-etching or over-etching defects" },
        { label: "Verify etch factor and profile angle requirements" },
        { label: "Check for copper residue or incomplete etching" },
        { label: "Inspect panel surface for etch uniformity" },
        { label: "Verify etchant concentration and temperature control" },
        { label: "Check for side-etching on fine lines and spaces" },
        { label: "Document etch time and process parameters" },
        { label: "Verify panel cleanliness and rinsing effectiveness" }
      ]
    },
    {
      title: "Defect Tracking & Hold/Release Decisions",
      items: [
        { label: "Log all etching defects (undercut, overcut, residue)" },
        { label: "Categorize defects by severity and impact" },
        { label: "Determine if rework is possible for minor defects" },
        { label: "Place hold on work orders with critical etch defects" },
        { label: "Release work orders meeting etch quality standards" },
        { label: "Document inspection results and measurements" },
        { label: "Escalate process control issues to engineering" },
        { label: "Update traveler with etch QA inspection status" }
      ]
    }
  ];

  return (
    <OperatorDashboard
      stationName="Etch QA"
      stationRole="qa_etch"
      workOrderFilter={{
        stage: 'fabrication',
        currentStation: 'Etch QA'
      }}
      checklists={checklists}
      qcEnabled={true}
      scanEnabled={true}
      switchLink={{ station: 'etching', label: 'Etching Operator' }}
      workOrdersAtBottom={true}
    />
  );
};

export default EtchQADashboard;