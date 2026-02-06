import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  FileSpreadsheet,
  TerminalSquare,
  Route,
  CheckSquare,
  CheckCircle,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import AssemblyPipelinePanel from './AssemblyPipelinePanel';
import AttachmentUploadPanel from './AttachmentUploadPanel';

const functionalTestConfig = {
  title: 'Functional Test Dashboard',
  subtitle: 'Functional validation and reporting',
  stage: 'functional_test',
  focus: 'functional_test',
  attachmentField: 'assemblyAttachments',
  summaryKey: 'functional_test',
  statusKey: 'functionalTestStatus',
  checklistKey: 'functionalTestChecklist',
  nextStage: 'wire_harness_intake',
  boardContext: 'functional_test',
  board: {
    title: 'Functional Test Queue',
    subtitle: 'Orders awaiting functional verification.',
    statusLabel: 'Functional Test State',
    releaseLabel: 'Wire Harness Intake Target',
    attachments: {
      label: 'Functional Documents',
      kinds: ['assembly_card', 'serial_log', 'functional_report', 'bom', 'assembly', 'assembly_instruction'],
      categories: ['assembly', 'intake'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'functional_test',
  navItems: [
    { id: 'work-orders', label: 'Assembly Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'assembly-card',
      label: 'Assembly Cards',
      icon: ClipboardList,
      type: 'attachments',
      attachmentKinds: ['assembly_card'],
      attachmentField: 'assemblyAttachments',
      attachmentCategories: ['assembly'],
      title: 'Assembly Cards',
      description: 'Assembly cards and functional test instructions.',
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
      description: 'Reference BOM for validating functional test configurations.',
    },
    {
      id: 'serial-output',
      label: 'Serial Output',
      icon: TerminalSquare,
      type: 'custom',
      render: ({ selectedWorkOrder, token, onWorkOrderUpdated }) => (
        <AttachmentUploadPanel
          workOrder={selectedWorkOrder}
          token={token}
          onWorkOrderUpdated={onWorkOrderUpdated}
          title="Serial Output & Test Reports"
          description="Upload serial logs, automated test captures, and final functional reports."
          kinds={[
            { value: 'serial_log', label: 'Serial Log' },
            { value: 'functional_report', label: 'Functional Report' },
          ]}
          defaultKind="serial_log"
          category="assembly"
          accept=".log,.txt,.csv,.json,.pdf,.zip"
        />
      ),
    },
    {
      id: 'assembly-pipeline',
      label: 'Assembly Pipeline',
      icon: Route,
      type: 'custom',
      render: ({ selectedWorkOrder }) => (
        <AssemblyPipelinePanel selectedWorkOrder={selectedWorkOrder} highlightStage="functional_test" />
      ),
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in functional test',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Scheduled for testing',
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

const FunctionalTestDashboard = () => (
  <ConfigurableStationDashboard config={functionalTestConfig} />
);

export default FunctionalTestDashboard;
