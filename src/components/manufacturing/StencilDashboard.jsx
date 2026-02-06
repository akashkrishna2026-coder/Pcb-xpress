import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  FileSpreadsheet,
  CheckSquare,
  CheckCircle,
  Route,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import AssemblyPipelinePanel from './AssemblyPipelinePanel';

const stencilConfig = {
  title: 'Stencil Printer Dashboard',
  subtitle: 'Stencil preparation and solder paste printing',
  stage: 'stencil',
  focus: 'stencil',
  attachmentField: 'assemblyAttachments',
  summaryKey: 'stencil',
  statusKey: 'stencilStatus',
  checklistKey: 'stencilChecklist',
  nextStage: 'assembly_reflow',
  boardContext: 'stencil',
  board: {
    title: 'Stencil Printing Work Queue',
    subtitle: 'Orders awaiting stencil printing and verification.',
    statusLabel: 'Stencil State',
    releaseLabel: 'Reflow Target',
    attachments: {
      label: 'Stencil Files',
      kinds: ['assembly_card', 'bom', 'assembly', 'assembly_instruction'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'stencil',
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
      description: 'Assembly cards and traveler instructions.',
      showApprovalActions: true,
    },
    {
      id: 'bom',
      label: 'BOM',
      icon: FileSpreadsheet,
      type: 'attachments',
      attachmentKinds: ['bom', 'assembly', 'assembly_instruction'],
      attachmentField: 'assemblyAttachments',
      title: 'Bill of Materials',
      description: 'Reference BOM for stencil setup.',
    },
    {
      id: 'assembly-pipeline',
      label: 'Assembly Pipeline',
      icon: Route,
      type: 'custom',
      render: ({ selectedWorkOrder }) => (
        <AssemblyPipelinePanel selectedWorkOrder={selectedWorkOrder} highlightStage="stencil" />
      ),
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in stencil printing',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Scheduled for printing',
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

const StencilDashboard = () => <ConfigurableStationDashboard config={stencilConfig} />;

export default StencilDashboard;
