import React from 'react';
import {
  pcbPipelineStages,
  getPcbStageStatus,
  normalizeStageState,
  getStageStatusDisplay,
} from '../../../server/src/lib/camPipelineUtils';

const PcbPipelinePanel = ({ selectedWorkOrder, highlightStage }) => {
  const currentStage = String(highlightStage || selectedWorkOrder?.stage || '').toLowerCase();
  const currentIndex = pcbPipelineStages.findIndex((stage) => stage.id === currentStage);

  return (
    <div className="space-y-3">
      {pcbPipelineStages.map((stage, index) => {
        const baseState = selectedWorkOrder ? normalizeStageState(getPcbStageStatus(selectedWorkOrder, stage.id)) : 'pending';
        const isCurrent = index === currentIndex;
        const derivedState =
          isCurrent && highlightStage && baseState === 'pending' ? 'in_progress' : baseState;
        const statusDisplay = getStageStatusDisplay(derivedState);

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
                    derivedState === 'completed' ? 'bg-green-500 text-white' :
                    derivedState === 'in_progress' ? 'bg-blue-500 text-white' :
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
          </div>
        );
      })}
    </div>
  );
};

export default PcbPipelinePanel;