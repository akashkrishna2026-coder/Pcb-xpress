import React from 'react';
import OperatorDashboard from './OperatorDashboard';

const PackingOperatorDashboard = () => {
  const packingChecklists = [
    {
      title: "Final Quality Inspection Checklist",
      items: [
        { label: "Verify all fabrication processes are complete and signed off" },
        { label: "Perform visual inspection for defects, scratches, or contamination" },
        { label: "Check electrical continuity and functionality if applicable" },
        { label: "Verify dimensional specifications meet requirements" },
        { label: "Confirm all quality control checkpoints are passed" },
        { label: "Review traveler documentation for completeness" }
      ]
    },
    {
      title: "Packing Procedures",
      items: [
        { label: "Select appropriate packaging materials based on product specifications" },
        { label: "Clean and prepare PCBs for packing (ESD protection, moisture control)" },
        { label: "Apply protective coatings or treatments as required" },
        { label: "Package items securely to prevent damage during transit" },
        { label: "Include all required documentation (certificates, manuals, labels)" },
        { label: "Verify packing list matches work order requirements" },
        { label: "Apply shipping labels and barcodes correctly" },
        { label: "Perform final weight and dimension check" }
      ]
    },
    {
      title: "Safety and ESD Compliance",
      items: [
        { label: "Wear appropriate ESD protection (wrist straps, heel straps)" },
        { label: "Verify work area is free of static-generating materials" },
        { label: "Handle PCBs by edges only to avoid contamination" },
        { label: "Use grounded packing materials and workstations" },
        { label: "Follow proper lifting techniques for heavy packages" }
      ]
    }
  ];

  return (
    <OperatorDashboard
      stationName="Packing Station"
      stationRole="packing"
      workOrderFilter={{
        stage: 'shipping',
        status: { $in: ['in_fab', 'complete'] }
      }}
      checklists={packingChecklists}
      qcEnabled={true}
      scanEnabled={true}
    />
  );
};

export default PackingOperatorDashboard;