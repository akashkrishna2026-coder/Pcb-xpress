import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  FileSpreadsheet,
  Thermometer,
  CheckSquare,
  CheckCircle,
  Route,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import AssemblyPipelinePanel from './AssemblyPipelinePanel';
import ReflowLogsPanel from './ReflowLogsPanel';

const assemblyReflowConfig = {
  title: 'Assembly Reflow Dashboard',
  subtitle: 'Surface mount reflow processing and QC',
  stage: 'assembly_reflow',
  focus: 'assembly_reflow',
  attachmentField: 'assemblyAttachments',
  summaryKey: 'assembly_reflow',
  statusKey: 'assemblyReflowStatus',
  checklistKey: 'assemblyReflowChecklist',
  nextStage: 'th_soldering',
  boardContext: 'assembly_reflow',
  board: {
    title: 'Reflow Work Queue',
    subtitle: 'Orders awaiting reflow soldering.',
    statusLabel: 'Reflow State',
    releaseLabel: 'TH Solder Target',
    attachments: {
      label: 'Reflow Documents',
      kinds: ['assembly_card', 'assembly', 'assembly_instruction', 'reflow_report', 'reflow_profile'],
      categories: ['assembly', 'intake'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'assembly_reflow',
  navItems: [
    { id: 'work-orders', label: 'Reflow Queue', icon: LayoutDashboard, type: 'board' },
    {
      id: 'assembly-card',
      label: 'Assembly Card',
      icon: ClipboardList,
      type: 'attachments',
      attachmentKinds: ['assembly_card'],
      attachmentCategories: ['assembly'],
      attachmentField: 'assemblyAttachments',
      title: 'Assembly Cards',
      description: 'Assembly cards and traveler details.',
    },
    {
      id: 'reflow-logs',
      label: 'Reflow Logs',
      icon: Thermometer,
      type: 'custom',
      render: ({ selectedWorkOrder, handleDownload }) => (
        <ReflowLogsPanel selectedWorkOrder={selectedWorkOrder} handleDownload={handleDownload} />
      ),
    },
    {
      id: 'bom',
      label: 'BOM',
      icon: FileSpreadsheet,
      type: 'attachments',
      attachmentKinds: ['bom', 'assembly', 'assembly_instruction'],
      attachmentField: 'assemblyAttachments',
      title: 'Bill of Materials',
      description: 'Reference BOM for reflow verification.',
    },
    {
      id: 'assembly-pipeline',
      label: 'Assembly Pipeline',
      icon: Route,
      type: 'custom',
      render: ({ selectedWorkOrder }) => (
        <AssemblyPipelinePanel selectedWorkOrder={selectedWorkOrder} highlightStage="assembly_reflow" />
      ),
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in reflow',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Scheduled for soldering',
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

const AssemblyReflowDashboard = () => (
  <ConfigurableStationDashboard config={assemblyReflowConfig} />
);

export default AssemblyReflowDashboard;
