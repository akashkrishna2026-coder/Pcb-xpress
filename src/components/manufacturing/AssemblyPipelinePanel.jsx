import React from 'react';
import {
  assemblyPipelineStages,
  assemblyStageStatusKeys,
  normalizeStageState,
  getStageStatusDisplay,
  getStageTimestamp,
} from '../../../server/src/lib/assemblyPipelineUtils';

const AssemblyPipelinePanel = ({ selectedWorkOrder, highlightStage }) => {
  if (!selectedWorkOrder) {
    return (
      <div className="p-4 border border-dashed rounded-lg text-sm text-muted-foreground bg-white">
        Select a work order to review the assembly pipeline.
      </div>
    );
  }

  const currentStage = String(highlightStage || selectedWorkOrder.stage || '').toLowerCase();
  const currentIndex = assemblyPipelineStages.findIndex((stage) => stage.id === currentStage);

  return (
    <div className="space-y-3">
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
  );
};

export default AssemblyPipelinePanel;
