import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  FileSpreadsheet,
  Network,
  Route,
  CheckSquare,
  CheckCircle,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import AssemblyPipelinePanel from './AssemblyPipelinePanel';

const ictConfig = {
  title: 'ICT Testing Dashboard',
  subtitle: 'In-circuit testing and verification',
  stage: 'ict',
  focus: 'ict',
  attachmentField: 'assemblyAttachments',
  summaryKey: 'ict',
  statusKey: 'ictStatus',
  checklistKey: 'ictChecklist',
  nextStage: 'flashing',
  boardContext: 'ict',
  board: {
    title: 'ICT Work Queue',
    subtitle: 'Orders awaiting ICT testing.',
    statusLabel: 'ICT State',
    releaseLabel: 'Flashing Target',
    attachments: {
      label: 'ICT Documents',
      kinds: ['ict_test_plan', 'net_file', 'assembly_card', 'bom', 'assembly', 'assembly_instruction'],
      categories: ['assembly', 'intake'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'ict',
  navItems: [
    { id: 'work-orders', label: 'Assembly Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'assembly-cards',
      label: 'Assembly Job Cards',
      icon: ClipboardList,
      type: 'attachments',
      attachmentKinds: ['assembly_card'],
       attachmentField: 'assemblyAttachments',
       attachmentCategories: ['assembly'],
      title: 'Assembly Job Cards',
      description: 'Reference assembly job cards for ICT setup.',
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
      description: 'Stencil-issued BOMs and assembly instructions for ICT correlation.',
    },
    {
      id: 'test-points',
      label: 'Test Points',
      icon: Network,
      type: 'attachments',
      attachmentKinds: ['ict_test_plan', 'test_points', 'net_file'],
      attachmentField: 'assemblyAttachments',
      title: 'Test Points & Netlists',
      description: 'Voltage/value test points and netlists for ICT.',
      emptyLabel: 'No test point documentation uploaded.',
    },
    {
      id: 'assembly-pipeline',
      label: 'Assembly Pipeline',
      icon: Route,
      type: 'custom',
      render: ({ selectedWorkOrder }) => (
        <AssemblyPipelinePanel selectedWorkOrder={selectedWorkOrder} highlightStage="ict" />
      ),
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in ICT testing',
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

const ICTDashboard = () => <ConfigurableStationDashboard config={ictConfig} />;

export default ICTDashboard;
