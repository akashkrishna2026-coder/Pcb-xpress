export const assemblyPipelineStages = [
  { id: 'assembly_store', label: 'Assembly Store Issue' },
  { id: 'stencil', label: 'Stencil Printing' },
  { id: 'assembly_reflow', label: 'SMT Reflow' },
  { id: 'th_soldering', label: 'TH Soldering' },
  { id: 'visual_inspection', label: 'Visual Inspection' },
  { id: 'ict', label: 'ICT Testing' },
  { id: 'flashing', label: 'Flashing' },
  { id: 'functional_test', label: 'Functional Test' },
  { id: 'wire_harness_intake', label: 'Wire Harness Intake' },
  { id: 'wire_harness', label: 'Wire Harness' },
  { id: 'wire_testing', label: 'Wire Testing' },
  { id: 'assembly_3d_printing', label: '3D Printing & Fixtures' },
  { id: 'assembly_final_dispatch', label: 'Final QC & Dispatch' },
];

export const assemblyStageStatusKeys = {
  assembly_store: 'assemblyStoreStatus',
  stencil: 'stencilStatus',
  assembly_reflow: 'assemblyReflowStatus',
  th_soldering: 'thSolderingStatus',
  visual_inspection: 'visualInspectionStatus',
  ict: 'ictStatus',
  flashing: 'flashingStatus',
  functional_test: 'functionalTestStatus',
  wire_harness_intake: 'wireHarnessIntakeStatus',
  wire_harness: 'wireHarnessStatus',
  wire_testing: 'wireTestingStatus',
  assembly_3d_printing: 'assembly3DPrintingStatus',
  assembly_final_dispatch: 'assemblyFinalDispatchStatus',
};

export const normalizeStageState = (value) => {
  const state = String(value || '').toLowerCase();
  if (['approved', 'completed', 'done', 'ready'].includes(state)) return 'completed';
  if (['in_progress', 'processing', 'running', 'active'].includes(state)) return 'in_progress';
  if (['blocked', 'on_hold', 'hold', 'issue'].includes(state)) return 'blocked';
  if (['rejected', 'failed', 'cancelled'].includes(state)) return 'rejected';
  if (!state || ['queued', 'waiting', 'pending'].includes(state)) return 'pending';
  return state;
};

const stageStatusStyles = {
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border border-green-200' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 border border-blue-200' },
  blocked: { label: 'On Hold', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  rejected: { label: 'Attention', className: 'bg-red-100 text-red-700 border border-red-200' },
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
};

export const getStageStatusDisplay = (state) => stageStatusStyles[state] || stageStatusStyles.pending;

export const getStageStatusData = (workOrder, stageId) => {
  if (!workOrder) return null;
  const statusKey = assemblyStageStatusKeys[stageId];
  return statusKey ? workOrder[statusKey] || null : null;
};

export const getStageTimestamp = (statusData) =>
  statusData?.updatedAt || statusData?.completedAt || statusData?.releasedAt || statusData?.startedAt || null;
