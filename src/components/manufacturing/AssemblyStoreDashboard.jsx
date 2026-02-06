import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  ClipboardList,
  CheckSquare,
  CheckCircle,
  Route,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import AssemblyPipelinePanel from './AssemblyPipelinePanel';
import {
  assemblyPipelineStages,
  assemblyStageStatusKeys,
  normalizeStageState,
  getStageStatusDisplay,
  getStageTimestamp,
} from '../../../server/src/lib/assemblyPipelineUtils';

const assemblyStoreConfig = {
  title: 'Assembly Store Issue Dashboard',
  subtitle: 'Issue components and feeders for assembly lines',
  stage: 'assembly_store',
  focus: 'assembly_store',
  summaryKey: 'assembly_store',
  statusKey: 'assemblyStoreStatus',
  checklistKey: 'assemblyStoreChecklist',
  nextStage: 'stencil',
  boardContext: 'assembly_store',
  board: {
    title: 'Assembly Store Work Queue',
    subtitle: 'Orders requiring component issue and kitting.',
    statusLabel: 'Store Issue State',
    releaseLabel: 'Stencil Target',
    attachments: {
      label: 'Issue Documents',
      kinds: ['bom', 'assembly', 'assembly_card', 'pick_list'],
    },
  },
  attachmentField: 'assemblyAttachments', // Use assembly-specific attachment field
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'assembly_store',
  navItems: [
    { id: 'work-orders', label: 'Work Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'bom',
      label: 'BOM',
      icon: FileSpreadsheet,
      type: 'attachments',
      attachmentKinds: ['bom', 'assembly'],
      title: 'Bill of Materials',
      description: 'Reference BOM and customer uploaded assembly files for issued components.',
    },
    {
      id: 'assembly-card',
      label: 'Assembly Card',
      icon: ClipboardList,
      type: 'custom',
      title: 'Assembly Card',
      description: 'Automatically generated assembly card based on station details and statuses.',
      render: ({ selectedWorkOrder }) => {
        if (!selectedWorkOrder) {
          return (
            <div className="p-4 border border-dashed rounded-lg text-sm text-muted-foreground bg-white">
              Select a work order to view the assembly card.
            </div>
          );
        }

        const currentStage = String(selectedWorkOrder.stage || '').toLowerCase();
        const currentIndex = assemblyPipelineStages.findIndex((stage) => stage.id === currentStage);

        return (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-white">
              <h3 className="text-lg font-semibold mb-4">Assembly Card - {selectedWorkOrder.woNumber || 'N/A'}</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <strong>Product:</strong> {selectedWorkOrder.product || 'N/A'}
                </div>
                <div>
                  <strong>Priority:</strong> {selectedWorkOrder.priority || 'Normal'}
                </div>
                <div>
                  <strong>Current Stage:</strong> {assemblyPipelineStages.find(s => s.id === currentStage)?.label || currentStage}
                </div>
                <div>
                  <strong>Status:</strong> {getStageStatusDisplay(normalizeStageState(selectedWorkOrder.assemblyStoreStatus?.state)).label}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-md font-semibold">Assembly Pipeline Progress</h4>
              {assemblyPipelineStages.map((stage, index) => {
                const statusKey = assemblyStageStatusKeys[stage.id];
                const statusData = statusKey ? selectedWorkOrder[statusKey] : null;
                const resolvedState = normalizeStageState(statusData?.state);
                const derivedState =
                  resolvedState === 'pending'
                    ? index < currentIndex
                      ? 'completed'
                      : index === currentIndex
                      ? 'in_progress'
                      : 'pending'
                    : resolvedState;
                const statusDisplay = getStageStatusDisplay(derivedState);
                const timestampValue = getStageTimestamp(statusData);
                const formattedTime = timestampValue ? new Date(timestampValue).toLocaleString() : null;
                const isCurrent = index === currentIndex;

                return (
                  <div
                    key={stage.id}
                    className={`border rounded-lg p-3 shadow-sm transition-colors ${
                      isCurrent ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center ${
                            index <= currentIndex ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{stage.label}</p>
                          {stage.description ? (
                            <p className="text-xs text-muted-foreground">{stage.description}</p>
                          ) : null}
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusDisplay.className}`}>
                        {statusDisplay.label}
                      </span>
                    </div>
                    {formattedTime ? (
                      <p className="text-xs text-muted-foreground mt-2">Last update: {formattedTime}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      },
    },
    {
      id: 'assembly-pipeline',
      label: 'Assembly Pipeline',
      icon: Route,
      type: 'custom',
      render: ({ selectedWorkOrder }) => <AssemblyPipelinePanel selectedWorkOrder={selectedWorkOrder} />,
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in assembly store issue',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Required for today’s builds',
      valueKey: 'dueToday',
    },
    {
      title: 'On Hold',
      description: 'Awaiting clarification',
      valueKey: 'onHold',
      status: 'warning',
    },
  ],
};

const AssemblyStoreDashboard = () => (
  <ConfigurableStationDashboard config={assemblyStoreConfig} />
);

export default AssemblyStoreDashboard;
