import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Inbox,
  Route,
  ClipboardList,
  CheckSquare,
  CheckCircle,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import AssemblyPipelinePanel from './AssemblyPipelinePanel';
import AttachmentUploadPanel from './AttachmentUploadPanel';

const wireHarnessIntakeConfig = {
  title: 'Wire Harness Intake Dashboard',
  subtitle: 'Quote review and traveler preparation for harness builds',
  stage: 'wire_harness_intake',
  focus: 'wire_harness_intake',
  attachmentField: 'assemblyAttachments',
  summaryKey: 'wire_harness_intake',
  statusKey: 'wireHarnessIntakeStatus',
  checklistKey: 'wireHarnessIntakeChecklist',
  nextStage: 'wire_harness',
  boardContext: 'wire_harness_intake',
  board: {
    title: 'Wire Harness Intake Queue',
    subtitle: 'Approved quotes awaiting traveler release into harness production.',
    statusLabel: 'Intake Status',
    releaseLabel: 'Harness Release Target',
    attachments: {
      label: 'Intake Documents',
      kinds: ['harness', 'bom', 'assembly', 'assembly_instruction', 'wire_spec'],
      categories: ['intake'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'wire_harness_intake',
  navItems: [
    { id: 'work-orders', label: 'Intake Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'intake-package',
      label: 'Quote Package',
      icon: Inbox,
      type: 'attachments',
      attachmentKinds: ['harness', 'assembly', 'assembly_instruction'],
      attachmentCategories: ['intake'],
      attachmentField: 'assemblyAttachments',
      title: 'Quote Package',
      description: 'Review uploaded harness drawings, assembly instructions, and traveler inputs.',
    },
    {
      id: 'bom',
      label: 'BOM & Wire Specs',
      icon: FileSpreadsheet,
      type: 'attachments',
      attachmentKinds: ['bom', 'wire_spec'],
      attachmentCategories: ['intake'],
      attachmentField: 'assemblyAttachments',
      title: 'BOM & Wire Specifications',
      description: 'Bill of materials, wire specifications, and connector definitions for intake validation.',
    },
    {
      id: 'intake-uploads',
      label: 'Upload Intake Docs',
      icon: ClipboardList,
      type: 'custom',
      render: ({ selectedWorkOrder, token, onWorkOrderUpdated }) => (
        <AttachmentUploadPanel
          workOrder={selectedWorkOrder}
          token={token}
          onWorkOrderUpdated={onWorkOrderUpdated}
          title="Upload Intake Documents"
          description="Add missing harness drawings, traveler packets, or release forms required before production."
          kinds={[
            { value: 'harness', label: 'Harness Drawing' },
            { value: 'assembly', label: 'Traveler Packet' },
            { value: 'assembly_instruction', label: 'Assembly Instructions' },
            { value: 'wire_spec', label: 'Wire Specification' },
          ]}
          defaultKind="harness"
          category="intake"
          accept=".pdf,.zip,.dxf,.dwg,.xls,.xlsx,.csv,.doc,.docx"
        />
      ),
    },
    {
      id: 'assembly-pipeline',
      label: 'Assembly Pipeline',
      icon: Route,
      type: 'custom',
      render: ({ selectedWorkOrder }) => (
        <AssemblyPipelinePanel selectedWorkOrder={selectedWorkOrder} highlightStage="wire_harness_intake" />
      ),
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Transfer', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Intake Queue',
      description: 'Harness orders awaiting traveler handoff',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Intake releases scheduled for today',
      valueKey: 'dueToday',
    },
    {
      title: 'Needs Attention',
      description: 'Orders on hold or missing data',
      valueKey: 'onHold',
      status: 'warning',
    },
  ],
};

const WireHarnessIntakeDashboard = () => (
  <ConfigurableStationDashboard config={wireHarnessIntakeConfig} />
);

export default WireHarnessIntakeDashboard;
