import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  TerminalSquare,
  CheckSquare,
  CheckCircle,
  TestTube,
  Truck,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';

const testingDashboardConfig = {
  title: 'Testing Dashboard',
  subtitle: 'Dedicated testing operations for functional, electrical, burn-in, environmental, and mixed testing',
  stage: 'testing',
  focus: 'testing',
  summaryKey: 'testing',
  statusKey: 'testingStatus',
  checklistKey: 'testingChecklist',
  nextStage: 'dispatch',
  boardContext: 'testing',
  board: {
    title: 'Testing Queue',
    subtitle: 'Orders awaiting dedicated testing operations.',
    statusLabel: 'Testing State',
    releaseLabel: 'Dispatch Target',
    attachments: {
      label: 'Testing Documents',
      kinds: ['test_plan', 'test_report', 'test_data', 'procedure', 'calibration_certificate', 'safety_checklist'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && [
      'testing_intake',
      'functional_testing',
      'electrical_testing',
      'burn_in_testing',
      'environmental_testing',
      'mixed_testing',
      'testing_review',
      'testing_dispatch',
      'dispatch'
    ].includes(String(wo.stage || '').toLowerCase()),
  navItems: [
    { id: 'work-orders', label: 'Testing Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'test-plans',
      label: 'Test Plans',
      icon: ClipboardList,
      type: 'attachments',
      attachmentKinds: ['test_plan', 'procedure'],
      title: 'Test Plans & Procedures',
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
    {
      id: 'calibration',
      label: 'Calibration',
      icon: TestTube,
      type: 'attachments',
      attachmentKinds: ['calibration_certificate'],
      title: 'Calibration Certificates',
      description: 'Equipment calibration records.',
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'dispatch', label: 'Dispatch', icon: Truck, type: 'transfer' },
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
    {
      title: 'Ready for Dispatch',
      description: 'Completed testing',
      valueKey: 'ready',
    },
  ],
};

const TestingDashboard = () => (
  <ConfigurableStationDashboard config={testingDashboardConfig} />
);

export default TestingDashboard;