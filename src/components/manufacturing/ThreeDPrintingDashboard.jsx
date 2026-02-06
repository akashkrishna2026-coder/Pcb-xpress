import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Printer,
  Settings,
  CheckSquare,
  Package,
  CheckCircle,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';

const threeDPrintingConfig = {
  title: '3D Printing Dashboard',
  subtitle:
   'Dedicated 3D printing operations from quote to dispatch',
  stage: '3d_printing_intake',
  focus: '3d_printing',
  summaryKey: '3d_printing',
  statusKey: 'threeDPrintingStatus',
  checklistKey: 'threeDPrintingChecklist',
  nextStage: '3d_printing_dispatch',
  boardContext: '3d_printing',
  board: {
    title: '3D Printing Work Queue',
    subtitle: 'Orders requiring 3D printing services.',
    statusLabel: 'Printing State',
    releaseLabel: 'Dispatch Target',
    attachments: {
      label: 'Print Assets',
      kinds: ['model', 'stl', 'step', '3mf', 'slicing_profile'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').startsWith('3d_printing'),
  navItems: [
    { id: 'work-orders', label: 'Print Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'file-prep',
      label: 'File Preparation',
      icon: FileText,
      type: 'attachments',
      attachmentKinds: ['model', 'stl', 'step', '3mf'],
      title: 'Print Files',
      description: '3D model files and CAD data for printing.',
      emptyLabel: 'No print files uploaded.',
    },
    {
      id: 'slicing',
      label: 'Slicing Setup',
      icon: Settings,
      type: 'attachments',
      attachmentKinds: ['slicing_profile', 'gcode'],
      title: 'Slicing Profiles',
      description: 'Slicing configurations and G-code files.',
      emptyLabel: 'No slicing data uploaded.',
    },
    {
      id: 'printing',
      label: 'Active Printing',
      icon: Printer,
      type: 'attachments',
      attachmentKinds: ['print_log', 'timelapse'],
      title: 'Print Logs',
      description: 'Printing logs and progress tracking.',
      emptyLabel: 'No print logs available.',
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'dispatch', label: 'Dispatch', icon: Package, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Pending Files',
      description: 'Orders waiting for file preparation',
      valueKey: 'pendingFiles',
    },
    {
      title: 'In Queue',
      description: 'Ready for printing',
      valueKey: 'inQueue',
    },
    {
      title: 'Printing',
      description: 'Currently active prints',
      valueKey: 'printing',
      status: 'warning',
    },
    {
      title: 'Post-Processing',
      description: 'Finishing and cleanup',
      valueKey: 'postProcessing',
    },
  ],
};

const ThreeDPrintingDashboard = () => (
  <ConfigurableStationDashboard config={threeDPrintingConfig} />
);

export default ThreeDPrintingDashboard;