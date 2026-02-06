import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  FileSpreadsheet,
  Image as ImageIcon,
  Route,
  CheckSquare,
  CheckCircle,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import VisualInspectionImagesPanel from './VisualInspectionImagesPanel';
import AssemblyPipelinePanel from './AssemblyPipelinePanel';

const visualInspectionConfig = {
  title: 'Visual Inspection Dashboard',
  subtitle: 'Final visual checks before ICT',
  stage: 'visual_inspection',
  focus: 'visual_inspection',
  attachmentField: 'assemblyAttachments',
  summaryKey: 'visual_inspection',
  statusKey: 'visualInspectionStatus',
  checklistKey: 'visualInspectionChecklist',
  nextStage: 'ict',
  boardContext: 'visual_inspection',
  board: {
    title: 'Visual Inspection Queue',
    subtitle: 'Orders awaiting visual inspection and documentation.',
    statusLabel: 'Inspection State',
    releaseLabel: 'ICT Target',
    attachments: {
      label: 'Inspection Docs',
      kinds: ['assembly_card', 'visual_report', 'assembly', 'assembly_instruction', 'bom'],
      categories: ['assembly', 'inspection', 'intake'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'visual_inspection',
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
      description: 'Assembly cards and inspection references.',
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
      description: 'Upstream stencil BOM and assembly instructions for inspection reference.',
    },
    {
      id: 'inspection-images',
      label: 'Inspection Images',
      icon: ImageIcon,
      type: 'custom',
      render: ({ selectedWorkOrder, token, onWorkOrderUpdated }) => (
        <VisualInspectionImagesPanel
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
        <AssemblyPipelinePanel selectedWorkOrder={selectedWorkOrder} highlightStage="visual_inspection" />
      ),
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in visual inspection',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Scheduled for inspection',
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

const VisualInspectionDashboard = () => (
  <ConfigurableStationDashboard config={visualInspectionConfig} />
);

export default VisualInspectionDashboard;
