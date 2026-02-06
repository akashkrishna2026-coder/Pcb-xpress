import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Cpu,
  FileCode,
  FileSpreadsheet,
  Route,
  CheckSquare,
  CheckCircle,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import AssemblyPipelinePanel from './AssemblyPipelinePanel';
import AttachmentUploadPanel from './AttachmentUploadPanel';
import FlashingControllerPanel from './FlashingControllerPanel';

const flashingConfig = {
  title: 'Flashing Station Dashboard',
  subtitle: 'Firmware loading and controller configuration',
  stage: 'flashing',
  focus: 'flashing',
  attachmentField: 'assemblyAttachments',
  summaryKey: 'flashing',
  statusKey: 'flashingStatus',
  checklistKey: 'flashingChecklist',
  nextStage: 'functional_test',
  boardContext: 'flashing',
  board: {
    title: 'Flashing Work Queue',
    subtitle: 'Orders awaiting firmware flashing.',
    statusLabel: 'Flashing State',
    releaseLabel: 'Functional Test Target',
    attachments: {
      label: 'Flashing Documents',
      kinds: ['firmware', 'release_notes', 'controller_select', 'assembly_card', 'bom', 'assembly', 'assembly_instruction'],
      categories: ['assembly', 'intake'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'flashing',
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
      description: 'Assembly cards and flashing instructions.',
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
      description: 'Stencil-issued BOMs and assembly docs to validate firmware build variants.',
    },
    {
      id: 'controller-select',
      label: 'Controller Selection',
      icon: Cpu,
      type: 'custom',
      render: ({ selectedWorkOrder, token, onWorkOrderUpdated }) => (
        <FlashingControllerPanel
          workOrder={selectedWorkOrder}
          token={token}
          onWorkOrderUpdated={onWorkOrderUpdated}
        />
      ),
    },
    {
      id: 'firmware',
      label: 'Firmware Uploads',
      icon: FileCode,
      type: 'custom',
      render: ({ selectedWorkOrder, token, onWorkOrderUpdated }) => (
        <AttachmentUploadPanel
          workOrder={selectedWorkOrder}
          token={token}
          onWorkOrderUpdated={onWorkOrderUpdated}
          title="Firmware & Release Notes"
          description="Upload firmware binaries, release notes, or configuration packs released from engineering."
          kinds={[
            { value: 'firmware', label: 'Firmware Binary' },
            { value: 'release_notes', label: 'Release Notes' },
          ]}
          defaultKind="firmware"
          category="assembly"
          accept=".bin,.hex,.zip,.gz,.tar,.txt,.pdf"
        />
      ),
    },
    {
      id: 'assembly-pipeline',
      label: 'Assembly Pipeline',
      icon: Route,
      type: 'custom',
      render: ({ selectedWorkOrder }) => (
        <AssemblyPipelinePanel selectedWorkOrder={selectedWorkOrder} highlightStage="flashing" />
      ),
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in flashing',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Scheduled for firmware loading',
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

const FlashingDashboard = () => <ConfigurableStationDashboard config={flashingConfig} />;

export default FlashingDashboard;
