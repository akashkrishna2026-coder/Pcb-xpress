import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  PackageCheck,
  Tag,
  ShieldCheck,
  CheckSquare,
  CheckCircle,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';

const packingConfig = {
  title: 'Packing Station Dashboard',
  subtitle: 'Pack, label, and prepare shipments',
  stage: 'packing',
  focus: 'packing',
  summaryKey: 'packing',
  statusKey: 'packingStatus',
  checklistKey: 'packingChecklist',
  nextStage: 'dispatch',
  boardContext: 'packing',
  board: {
    title: 'Packing Work Queue',
    subtitle: 'Work orders awaiting packing and labeling.',
    statusLabel: 'Packing State',
    releaseLabel: 'Dispatch Target',
    attachments: {
      label: 'Packing Documents',
      kinds: ['packing_list', 'label', 'esd_report', 'job_card'],
    },
  },
  filterWorkOrders: (wo) => {
    if (!wo) return false;
    const stageMatch = String(wo.stage || '').toLowerCase() === 'packing';
    const finalState = String(wo?.finalQCPDIRStatus?.state || '').toLowerCase();
    return stageMatch && finalState === 'approved';
  },
  navItems: [
    { id: 'work-orders', label: 'Work Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'job-cards',
      label: 'Job Cards',
      icon: ClipboardList,
      type: 'attachments',
      attachmentKinds: ['job_card'],
      title: 'Packing Job Cards',
      description: 'Traveler instructions and packing requirements.',
    },
    {
      id: 'packing-list',
      label: 'Packing List',
      icon: PackageCheck,
      type: 'attachments',
      attachmentKinds: ['packing_list'],
      title: 'Packing Lists',
      description: 'Customer packing lists and documentation.',
    },
    {
      id: 'labels',
      label: 'Labels',
      icon: Tag,
      type: 'attachments',
      attachmentKinds: ['label', 'shipping_label'],
      title: 'Labels',
      description: 'Shipping and internal labels ready for printing.',
    },
    {
      id: 'esd',
      label: 'ESD',
      icon: ShieldCheck,
      type: 'attachments',
      attachmentKinds: ['esd_report', 'esd_certificate'],
      title: 'ESD Documentation',
      description: 'ESD logs and handling certificates.',
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in packing',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Scheduled for dispatch',
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

const PackingDashboard = () => <ConfigurableStationDashboard config={packingConfig} />;

export default PackingDashboard;
