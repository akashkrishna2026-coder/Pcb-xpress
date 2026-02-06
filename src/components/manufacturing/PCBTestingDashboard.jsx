import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  TerminalSquare,
  CheckSquare,
  CheckCircle,
  TestTube,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';

const pcbTestingConfig = {
  title: 'PCB Testing Dashboard',
  subtitle: 'PCB validation and testing operations',
  stage: 'testing',
  focus: 'testing',
  summaryKey: 'testing',
  statusKey: 'testingStatus',
  checklistKey: 'testingChecklist',
  nextStage: 'final_qc',
  boardContext: 'testing',
  board: {
    title: 'Testing Queue',
    subtitle: 'Orders awaiting PCB testing.',
    statusLabel: 'Testing State',
    releaseLabel: 'Final QC Target',
    attachments: {
      label: 'Testing Documents',
      kinds: ['test_plan', 'test_report', 'test_data'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'testing',
  navItems: [
    { id: 'work-orders', label: 'Testing Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'test-plans',
      label: 'Test Plans',
      icon: ClipboardList,
      type: 'attachments',
      attachmentKinds: ['test_plan'],
      title: 'Test Plans',
      description: 'Testing procedures and specifications.',
    },
    {
      id: 'test-reports',
      label: 'Test Reports',
      icon: TerminalSquare,
      type: 'attachments',
      attachmentKinds: ['test_report', 'test_data'],
      title: 'Test Reports & Data',
      description: 'Test results and measurement data.',
      emptyLabel: 'No test reports uploaded.',
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Tests',
      description: 'Currently in testing',
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

const PCBTestingDashboard = () => (
  <ConfigurableStationDashboard config={pcbTestingConfig} />
);

export default PCBTestingDashboard;