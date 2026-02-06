import React from 'react';
import { LayoutDashboard, ClipboardList, FileSpreadsheet, GitBranch, FileText, CheckSquare, CheckCircle } from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import AttachmentUploadPanel from './AttachmentUploadPanel';

const wireHarnessConfig = {
  title: 'Wire Harness Dashboard',
  subtitle: 'Harness assembly and documentation',
  stage: 'wire_harness',
  focus: 'wire_harness',
  attachmentField: 'assemblyAttachments',
  summaryKey: 'wire_harness',
  statusKey: 'wireHarnessStatus',
  checklistKey: 'wireHarnessChecklist',
  nextStage: 'wire_testing',
  boardContext: 'wire_harness',
  board: {
    title: 'Wire Harness Work Queue',
    subtitle: 'Orders awaiting harness assembly.',
    statusLabel: 'Harness State',
    releaseLabel: 'Wire Test Target',
    attachments: {
      label: 'Harness Documents',
      kinds: ['wiring_diagram', 'harness_drawing', 'wire_spec', 'assembly_card', 'bom', 'assembly', 'assembly_instruction'],
      categories: ['assembly', 'intake'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'wire_harness',
  navItems: [
    { id: 'work-orders', label: 'Assembly Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'assembly-card',
      label: 'Assembly Card',
      icon: ClipboardList,
      type: 'attachments',
      attachmentKinds: ['assembly_card'],
      attachmentField: 'assemblyAttachments',
      attachmentCategories: ['assembly'],
      title: 'Assembly Cards',
      description: 'Assembly cards for harness assembly.',
    },
    {
      id: 'bom',
      label: 'BOM',
      icon: FileSpreadsheet,
      type: 'attachments',
      attachmentKinds: ['bom', 'assembly', 'assembly_instruction'],
      attachmentCategories: ['intake'],
      attachmentField: 'assemblyAttachments',
      title: 'Bill of Materials',
      description: 'Harness-specific BOM, pin-out, and component references from stencil.',
    },
    {
      id: 'wiring-diagram',
      label: 'Wiring Diagram',
      icon: GitBranch,
      type: 'custom',
      render: ({ selectedWorkOrder, token, onWorkOrderUpdated }) => (
        <AttachmentUploadPanel
          workOrder={selectedWorkOrder}
          token={token}
          onWorkOrderUpdated={onWorkOrderUpdated}
          title="Wiring Diagram Uploads"
          description="Upload latest harness drawings, pin-out maps, or annotated wiring diagrams."
          kinds={[
            { value: 'wiring_diagram', label: 'Wiring Diagram' },
            { value: 'harness_drawing', label: 'Harness Drawing' },
          ]}
          defaultKind="wiring_diagram"
          category="assembly"
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.dxf,.dwg,.zip"
        />
      ),
    },
    {
      id: 'wire-specs',
      label: 'Wire Specs',
      icon: FileText,
      type: 'attachments',
      attachmentKinds: ['wire_spec', 'connector_spec'],
      attachmentField: 'assemblyAttachments',
      title: 'Wire Specifications',
      description: 'Wire gauges, connector specs, and build notes.',
      emptyLabel: 'No wire specs uploaded.',
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in wire harness',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Scheduled for harness assembly',
      valueKey: 'dueToday',
    },
    {
      title: 'On Hold',
      description: 'Requires attention',
      valueKey: 'onHold',
      status: 'warning',
    },
  ],
};

const WireHarnessDashboard = () => (
  <ConfigurableStationDashboard config={wireHarnessConfig} />
);

export default WireHarnessDashboard;
