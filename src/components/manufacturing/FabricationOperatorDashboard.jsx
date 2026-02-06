import React from 'react';
import OperatorDashboard from './OperatorDashboard';

const FabricationOperatorDashboard = ({ stationName, stationRole, workCenter, checklists = [] }) => {
  const defaultChecklists = [
    {
      title: `${stationName} Setup Checklist`,
      items: [
        { label: "Review work order specifications and requirements" },
        { label: "Verify equipment calibration and maintenance status" },
        { label: "Check material availability and quality" },
        { label: "Load appropriate programs and parameters" },
        { label: "Inspect tools and consumables" },
        { label: "Verify safety equipment and procedures" }
      ]
    },
    {
      title: "Process Quality Standards",
      items: [
        { label: "Follow established process parameters" },
        { label: "Monitor process indicators and controls" },
        { label: "Document any deviations or special conditions" },
        { label: "Perform in-process quality checks" },
        { label: "Verify output meets specifications" },
        { label: "Scan traveler and update status before next operation" }
      ]
    }
  ];

  return (
    <OperatorDashboard
      stationName={stationName}
      stationRole={stationRole}
      workOrderFilter={{
        stage: 'fabrication',
        currentStation: workCenter
      }}
      checklists={checklists.length > 0 ? checklists : defaultChecklists}
      qcEnabled={true}
      scanEnabled={true}
    />
  );
};

export default FabricationOperatorDashboard;