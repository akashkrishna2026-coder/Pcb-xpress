import React from 'react';
import OperatorDashboard from './OperatorDashboard';

/**
 * PhotoImagingQADashboard
 * A perfectly aligned QA interface for Photo Imaging stations.
 */
const PhotoImagingQADashboard = () => {
  const checklists = [
    {
      title: "Inspection Criteria",
      items: [
        { label: "Verify artwork alignment and registration (±0.05mm)" },
        { label: "Check line width/spacing (min 0.1mm)" },
        { label: "Inspect for pinholes, breaks, or shorts" },
        { label: "Verify resist coverage and thickness uniformity" },
        { label: "Check emulsion adhesion (no lifting)" },
        { label: "Inspect UV exposure uniformity" },
        { label: "Verify developer concentration & temperature" },
        { label: "Check for resist residue/incomplete development" },
        { label: "Document exposure/development parameters" },
        { label: "Confirm panel cleanliness" }
      ]
    },
    {
      title: "Control & Decisions",
      items: [
        { label: "Log and categorize defects (Critical/Major/Minor)" },
        { label: "Determine Rework vs. Scrap status" },
        { label: "Execute 'Hold' on critical defects" },
        { label: "Execute 'Release' for quality-passed orders" },
        { label: "Document final inspection results" },
        { label: "Escalate major defects to QA Manager" },
        { label: "Update physical/digital Traveler status" }
      ]
    }
  ];

  return (
    <OperatorDashboard
      stationName="Photo Imaging QA"
      stationRole="qa_photo_imaging"
      workOrderFilter={{
        stage: 'fabrication',
        currentStation: 'Photo Imaging QA'
      }}
      checklists={checklists}
      qcEnabled={true}
      scanEnabled={true}
      switchLink={{ station: 'photo_imaging', label: 'Photo Imaging Operator' }}
      // Reduce summary columns at common 1366×768 widths to avoid card overlap
      summaryGridClass={"grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"}
      // Make checklists use a single column on narrow-md and two on larger widths
      checklistsGridClass={"grid gap-6 grid-cols-1 lg:grid-cols-2"}
      // Move work orders and tracker to bottom of page
      workOrdersAtBottom={true}
    />
  );
};

export default PhotoImagingQADashboard;