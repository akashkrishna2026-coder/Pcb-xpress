import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Boxes,
  FileSpreadsheet,
  Route,
  CheckSquare,
  CheckCircle,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import ThTrayComponentsPanel from './ThTrayComponentsPanel';
import AssemblyPipelinePanel from './AssemblyPipelinePanel';

const thSolderingConfig = {
  title: 'TH Soldering Dashboard',
  subtitle: 'Through-hole soldering and manual operations',
  stage: 'th_soldering',
  focus: 'th_soldering',
  attachmentField: 'assemblyAttachments',
  summaryKey: 'th_soldering',
  statusKey: 'thSolderingStatus',
  checklistKey: 'thSolderingChecklist',
  nextStage: 'visual_inspection',
  boardContext: 'th_soldering',
  board: {
    title: 'TH Soldering Work Queue',
    subtitle: 'Orders awaiting manual soldering.',
    statusLabel: 'TH Soldering State',
    releaseLabel: 'Visual Inspection Target',
    attachments: {
      label: 'Soldering Documents',
      kinds: ['assembly_card', 'manual_solder_instruction', 'assembly', 'assembly_instruction', 'bom'],
      categories: ['assembly', 'intake'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'th_soldering',
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
      description: 'Traveler and manual soldering notes.',
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
      description: 'Reference BOM and issued component list from upstream stations.',
    },
    {
      id: 'tray-components',
      label: 'Tray Components',
      icon: Boxes,
      type: 'custom',
      render: ({ selectedWorkOrder, token, onWorkOrderUpdated }) => (
        <ThTrayComponentsPanel
          workOrder={selectedWorkOrder}
          token={token}
          onWorkOrderUpdated={onWorkOrderUpdated}
        />
      ),
    },
    {
      id: 'assembly-pipeline',
      label: 'Assembly Pipeline',
      icon: Route,
      type: 'custom',
      render: ({ selectedWorkOrder }) => (
        <AssemblyPipelinePanel selectedWorkOrder={selectedWorkOrder} highlightStage="th_soldering" />
      ),
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in TH soldering',
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

const THSolderingDashboard = () => (
  <ConfigurableStationDashboard config={thSolderingConfig} />
);

export default THSolderingDashboard;
