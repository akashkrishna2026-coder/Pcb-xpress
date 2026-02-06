import React from 'react';
import { LayoutDashboard, ClipboardList, FileSpreadsheet, HardDrive, CheckSquare, CheckCircle } from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import AttachmentUploadPanel from './AttachmentUploadPanel';

const wireTestingConfig = {
  title: 'Wire Testing Dashboard',
  subtitle: 'Electrical continuity and validation for harness assemblies',
  stage: 'wire_testing',
  focus: 'wire_testing',
  attachmentField: 'assemblyAttachments',
  summaryKey: 'wire_testing',
  statusKey: 'wireTestingStatus',
  checklistKey: 'wireTestingChecklist',
  nextStage: 'wire_harness_dispatch',
  boardContext: 'wire_testing',
  board: {
    title: 'Wire Testing Queue',
    subtitle: 'Harness assemblies awaiting electrical validation.',
    statusLabel: 'Wire Test State',
    releaseLabel: '3D Printing Target',
    attachments: {
      label: 'Test Documentation',
      kinds: ['wire_test_report', 'continuity_log', 'orcad_file', 'schematic_source', 'assembly_card', 'bom', 'assembly', 'assembly_instruction'],
      categories: ['assembly', 'intake'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'wire_testing',
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
      description: 'Assembly cards and revision references for harness verification.',
    },
    {
      id: 'orcad-files',
      label: 'OrCAD Files',
      icon: FileSpreadsheet,
      type: 'custom',
      render: ({ selectedWorkOrder, token, onWorkOrderUpdated }) => (
        <AttachmentUploadPanel
          workOrder={selectedWorkOrder}
          token={token}
          onWorkOrderUpdated={onWorkOrderUpdated}
          title="OrCAD / Schematic Uploads"
          description="Upload netlists, schematic sources, or OrCAD design packages required for harness verification."
          kinds={[
            { value: 'orcad_file', label: 'OrCAD Package' },
            { value: 'schematic_source', label: 'Schematic Source' },
          ]}
          defaultKind="orcad_file"
          category="assembly"
          accept=".zip,.brd,.dsn,.opj,.pcb,.max,.sch,.prj,.edb"
        />
      ),
    },
    {
      id: 'test-artifacts',
      label: 'Test Artifacts',
      icon: HardDrive,
      type: 'attachments',
      attachmentKinds: ['wire_test_report', 'continuity_log'],
      attachmentField: 'assemblyAttachments',
      title: 'Test Artifacts',
      description: 'Continuity logs, fixture setups, and test result summaries.',
      emptyLabel: 'No test artifacts uploaded yet.',
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
      description: 'Harness BOM and assembly instructions passed from stencil.',
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently undergoing wire testing',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Scheduled for testing today',
      valueKey: 'dueToday',
    },
    {
      title: 'On Hold',
      description: 'Awaiting clarification or fixtures',
      valueKey: 'onHold',
      status: 'warning',
    },
  ],
};

const WireTestingDashboard = () => (
  <ConfigurableStationDashboard config={wireTestingConfig} />
);

export default WireTestingDashboard;
