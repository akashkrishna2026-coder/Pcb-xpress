import React from 'react';
import OperatorDashboard from './OperatorDashboard';

const DispatchCoordinatorDashboard = () => {
  const dispatchChecklists = [
    {
      title: "Shipping Coordination Checklist",
      items: [
        { label: "Review shipping requirements and customer specifications" },
        { label: "Verify all packing operations are complete and documented" },
        { label: "Confirm shipping addresses and contact information" },
        { label: "Select appropriate shipping method and carrier" },
        { label: "Calculate shipping costs and obtain approval if required" },
        { label: "Prepare shipping documentation (commercial invoice, packing list)" },
        { label: "Arrange for pickup or delivery scheduling" }
      ]
    },
    {
      title: "Dispatch Readiness Verification",
      items: [
        { label: "Confirm all work orders are packed and ready for shipment" },
        { label: "Verify export compliance and documentation requirements" },
        { label: "Check insurance requirements for high-value shipments" },
        { label: "Review hazardous materials shipping requirements if applicable" },
        { label: "Confirm delivery schedules align with customer expectations" },
        { label: "Update tracking systems with shipment information" },
        { label: "Communicate dispatch status to relevant stakeholders" }
      ]
    },
    {
      title: "Quality Assurance for Dispatch",
      items: [
        { label: "Perform final inspection of packed items before dispatch" },
        { label: "Verify all required certifications are included" },
        { label: "Check packaging integrity and security seals" },
        { label: "Confirm proper labeling and barcoding" },
        { label: "Review documentation accuracy and completeness" },
        { label: "Ensure proper handling instructions are communicated" }
      ]
    }
  ];

  return (
    <OperatorDashboard
      stationName="Dispatch Coordination"
      stationRole="dispatch"
      workOrderFilter={{
        stage: 'shipping',
        status: 'complete'
      }}
      checklists={dispatchChecklists}
      qcEnabled={true}
      scanEnabled={true}
    />
  );
};

export default DispatchCoordinatorDashboard;