import React from 'react';
import { LayoutDashboard, FileText, Package, CheckSquare, CheckCircle } from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';

const wireHarnessDispatchConfig = {
  title: 'Wire Harness Dispatch',
  subtitle: 'Finalize harness builds and hand them to logistics.',
  stage: 'wire_harness_dispatch',
  focus: 'wire_harness_dispatch',
  attachmentField: 'assemblyAttachments',
  summaryKey: 'wire_harness_dispatch',
  statusKey: 'wireHarnessDispatchStatus',
  checklistKey: 'wireHarnessDispatchChecklist',
  nextStage: 'wire_harness_dispatch',
  boardContext: 'wire_harness_dispatch',
  board: {
    title: 'Harness Dispatch Queue',
    subtitle: 'Completed harness builds awaiting packaging and shipment.',
    statusLabel: 'Dispatch State',
    releaseLabel: 'Shipping Target',
    attachments: {
      label: 'Dispatch Documents',
      kinds: ['dispatch_note', 'packing_list', 'invoice', 'wire_test_report'],
      categories: ['assembly', 'intake'],
    },
  },
  filterWorkOrders: (wo) => wo && String(wo.stage || '').toLowerCase() === 'wire_harness_dispatch',
  navItems: [
    { id: 'work-orders', label: 'Dispatch Queue', icon: LayoutDashboard, type: 'board' },
    {
      id: 'packing-docs',
      label: 'Packing Docs',
      icon: Package,
      type: 'attachments',
      attachmentKinds: ['dispatch_note', 'packing_list', 'invoice'],
      attachmentField: 'assemblyAttachments',
      attachmentCategories: ['assembly'],
      title: 'Packing Documents',
      description: 'Dispatch notes, packing lists, and invoices attached for shipment.',
      emptyLabel: 'No dispatch documents uploaded yet.',
    },
    {
      id: 'logs',
      label: 'Testing Logs',
      icon: FileText,
      type: 'attachments',
      attachmentKinds: ['wire_test_report', 'continuity_log'],
      attachmentField: 'assemblyAttachments',
      title: 'Testing References',
      description: 'Reference wire test reports and continuity logs for shipping paperwork.',
      emptyLabel: 'No testing logs attached.',
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Transfer', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Ready to Ship',
      description: 'Harness builds awaiting courier hand-off',
      valueKey: 'readyToShip',
    },
    {
      title: 'Documents Pending',
      description: 'Dispatches missing paperwork',
      valueKey: 'docsPending',
      status: 'warning',
    },
  ],
};

const WireHarnessDispatchDashboard = () => (
  <ConfigurableStationDashboard config={wireHarnessDispatchConfig} />
);

export default WireHarnessDispatchDashboard;
