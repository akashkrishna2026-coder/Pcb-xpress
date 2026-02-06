import React from 'react';
import OperatorDashboard from './OperatorDashboard';

const FinalQADashboard = () => {
  const checklists = [
    {
      title: "Final QA Inspection Criteria",
      items: [
        { label: "Verify all previous process inspections are complete" },
        { label: "Check dimensional accuracy and panel specifications" },
        { label: "Inspect surface finish and cosmetic appearance" },
        { label: "Verify electrical test results and continuity" },
        { label: "Check hole locations and plating quality" },
        { label: "Inspect for scratches, dents, or physical damage" },
        { label: "Verify marking, legend, and identification accuracy" },
        { label: "Check packaging and labeling requirements" },
        { label: "Document final inspection measurements and results" },
        { label: "Verify compliance with customer specifications" }
      ]
    },
    {
      title: "Defect Tracking & Hold/Release Decisions",
      items: [
        { label: "Log all final inspection defects and nonconformances" },
        { label: "Categorize defects by criticality and customer impact" },
        { label: "Determine disposition (accept, rework, reject, RTV)" },
        { label: "Place hold on work orders failing final inspection" },
        { label: "Release work orders meeting all quality requirements" },
        { label: "Document final QA results and certification" },
        { label: "Escalate critical issues to quality manager" },
        { label: "Update traveler with final QA approval status" }
      ]
    }
  ];

  return (
    <OperatorDashboard
      stationName="Final QA"
      stationRole="qa_final"
      workOrderFilter={{
        stage: 'final_qa',
        currentStation: 'Final QA'
      }}
      checklists={checklists}
      qcEnabled={true}
      scanEnabled={true}
      switchLink={{ station: 'final_qc_pdir', label: 'Final QC PDIR' }}
      workOrdersAtBottom={true}
    />
  );
};

export default FinalQADashboard;