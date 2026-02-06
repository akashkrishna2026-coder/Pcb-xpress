import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  FileSpreadsheet,
  Tag,
  Printer,
  CheckSquare,
  CheckCircle,
  GitBranch,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';

const dispatchConfig = {
  title: 'Dispatch Station Dashboard',
  subtitle: 'Finalize shipments and hand off to logistics',
  stage: 'dispatch',
  focus: 'dispatch',
  summaryKey: 'dispatch',
  statusKey: 'dispatchStatus',
  checklistKey: 'dispatchChecklist',
  nextStage: 'pcb',
  boardContext: 'dispatch',
  board: {
    title: 'Dispatch Work Queue',
    subtitle: 'Orders awaiting dispatch and shipment confirmation.',
    statusLabel: 'Dispatch State',
    releaseLabel: 'Shipping Target',
    attachments: {
      label: 'Dispatch Documents',
      kinds: ['invoice', 'shipping_label', 'packing_list', 'assembly_order'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'dispatch',
  navItems: [
    { id: 'work-orders', label: 'Work Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'assembly-orders',
      label: 'Assembly Orders',
      icon: ClipboardList,
      type: 'attachments',
      attachmentKinds: ['assembly_order', 'dispatch_instruction'],
    },
    {
      id: 'invoice',
      label: 'Invoice',
      icon: FileSpreadsheet,
      type: 'attachments',
      attachmentKinds: ['invoice', 'commercial_invoice'],
      title: 'Invoices',
      description: 'Customer invoices and commercial documents.',
      emptyLabel: 'No invoices uploaded.',
    },
    {
      id: 'shipping-labels',
      label: 'Shipping Labels',
      icon: Tag,
      type: 'attachments',
      attachmentKinds: ['shipping_label', 'label'],
      title: 'Shipping Labels',
      description: 'Labels ready for printing and application.',
      emptyLabel: 'No shipping labels uploaded.',
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    {
      id: 'final',
      label: 'Final',
      icon: CheckCircle,
      type: 'transfer',
    },
    {
      id: 'pcb-pipeline',
      label: 'PCB Pipeline',
      icon: GitBranch,
      type: 'pcb_pipeline',
      title: 'PCB Pipeline',
      description: 'Track PCB manufacturing progress through all stages.',
    },
    {
      id: 'print',
      label: 'Print',
      icon: Printer,
      type: 'print',
      extraContent: (
        <div className="text-sm text-muted-foreground">
          Use the printer controls to print shipping labels and finalize dispatch.
        </div>
      ),
    },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in dispatch',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Scheduled for shipment',
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

const DispatchDashboard = () => <ConfigurableStationDashboard config={dispatchConfig} />;

export default DispatchDashboard;
