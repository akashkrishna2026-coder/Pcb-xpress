export const camPipelineStages = [
  {
    id: 'cam_uploads',
    label: 'CAM Uploads',
    description: 'Upload and process customer Gerber/BOM files'
  },
  {
    id: 'nc_drill_upload',
    label: 'NC Drill Upload',
    description: 'Upload NC drill files (.drl, .txt)'
  },
  {
    id: 'film_upload',
    label: 'Film Upload',
    description: 'Upload film files for printing (.png, .jpg, etc.)'
  },
  {
    id: 'job_card_creation',
    label: 'Job Card Creation',
    description: 'Create job cards for manufacturing'
  },
  {
    id: 'job_cards_list',
    label: 'Job Cards List',
    description: 'Review and manage created job cards'
  },
  {
    id: 'update_job_cards',
    label: 'Update Job Cards',
    description: 'Update and approve job card changes'
  },
  {
    id: 'assembly_dispatch',
    label: 'Assembly Dispatch',
    description: 'Dispatch to assembly and fabrication'
  },
];

export const pcbPipelineStages = [
  {
    id: 'sheet_cutting',
    label: 'Sheet Cutting',
    description: 'Cut PCB sheets to required dimensions'
  },
  {
    id: 'cnc_drilling',
    label: 'CNC Drilling',
    description: 'Drill holes using CNC machines'
  },
  {
    id: 'sanding',
    label: 'Sanding',
    description: 'Sand and prepare PCB surfaces'
  },
  {
    id: 'brushing',
    label: 'Brushing',
    description: 'Brush and clean PCB surfaces'
  },
  {
    id: 'photo_imaging',
    label: 'Photoimaging',
    description: 'Apply photoresist and expose patterns'
  },
  {
    id: 'developer',
    label: 'Developer',
    description: 'Develop exposed photoresist'
  },
  {
    id: 'etching_station',
    label: 'Etching Station',
    description: 'Etch copper traces'
  },
  {
    id: 'tin_stripping',
    label: 'Tin Stripping',
    description: 'Remove tin plating'
  },
  {
    id: 'solder_mask',
    label: 'Solder Mask',
    description: 'Apply solder mask layer'
  },
  {
    id: 'hal_station',
    label: 'HAL Station',
    description: 'Hot Air Leveling process'
  },
  {
    id: 'legend_print',
    label: 'Legend Print',
    description: 'Print component legends'
  },
  {
    id: 'cnc_routing',
    label: 'CNC Routing',
    description: 'Route PCB outlines using CNC'
  },
  {
    id: 'v_score',
    label: 'V-Score',
    description: 'Score PCBs for easy separation'
  },
  {
    id: 'flying_probe',
    label: 'Flying Probe',
    description: 'Electrical testing with flying probe'
  },
  {
    id: 'final_qc_pdir',
    label: 'Final QC',
    description: 'Final quality control inspection'
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    description: 'Dispatch to HQ (admin)'
  },
];

export const camStageStatusKeys = {
  cam_uploads: 'camUploadsStatus',
  nc_drill_upload: 'ncDrillUploadStatus',
  film_upload: 'filmUploadStatus',
  job_card_creation: 'jobCardCreationStatus',
  job_cards_list: 'jobCardsListStatus',
  update_job_cards: 'updateJobCardsStatus',
  assembly_dispatch: 'assemblyDispatchStatus',
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
  const statusKey = camStageStatusKeys[stageId];
  return statusKey ? workOrder[statusKey] || null : null;
};

export const getStageTimestamp = (statusData) =>
  statusData?.updatedAt || statusData?.completedAt || statusData?.releasedAt || statusData?.startedAt || null;

// Helper function to determine stage status based on work order data
export const getCamStageStatus = (workOrder, stageId) => {
  if (!workOrder) return 'pending';

  switch (stageId) {
    case 'cam_uploads':
      // Check if customer files (gerber/bom) are uploaded
      const customerFiles = (workOrder.camAttachments || []).filter(att =>
        att.category === 'intake' && ['gerber', 'bom'].includes(att.kind)
      );
      return customerFiles.length > 0 ? 'completed' : 'pending';

    case 'nc_drill_upload':
      // Check if NC drill files are uploaded
      const drillFiles = (workOrder.camAttachments || []).filter(att =>
        att.category === 'nc_drill' && att.kind === 'drill_file'
      );
      return drillFiles.length > 0 ? 'completed' : 'pending';

    case 'film_upload':
      // Check if film files are uploaded
      const filmFiles = (workOrder.camAttachments || []).filter(att =>
        att.category === 'phototools' && ['film', 'photo_file'].includes(att.kind)
      );
      return filmFiles.length > 0 ? 'completed' : 'pending';

    case 'job_card_creation':
      // Check if job cards exist
      const jobCards = (workOrder.camAttachments || []).filter(att =>
        att.kind === 'job_card'
      );
      return jobCards.length > 0 ? 'completed' : 'pending';

    case 'job_cards_list':
      // This is a view, so if job cards exist, it's available
      const hasJobCards = (workOrder.camAttachments || []).some(att =>
        att.kind === 'job_card'
      );
      return hasJobCards ? 'completed' : 'pending';

    case 'update_job_cards':
      // Check if job cards have been updated/approved
      const updatedJobCards = (workOrder.camAttachments || []).filter(att =>
        att.kind === 'job_card' && att.approvalStatus === 'approved'
      );
      return updatedJobCards.length > 0 ? 'completed' : 'pending';

    case 'assembly_dispatch':
      // Check if work order has been dispatched to fabrication
      return workOrder.stage && String(workOrder.stage).toLowerCase() !== 'cam'
        ? 'completed'
        : 'pending';

    default:
      return 'pending';
  }
};

export const getPcbStageStatus = (workOrder, stageId) => {
  if (!workOrder) return 'pending';

  const aliasMap = { tin_strip: 'tin_stripping' };
  const currentStage = String(workOrder.stage || '').toLowerCase();
  const normalizedCurrentStage = aliasMap[currentStage] || currentStage;
  const normalizedStageId = aliasMap[stageId] || stageId;

  const stageIndex = pcbPipelineStages.findIndex(s => s.id === normalizedStageId);
  const currentIndex = pcbPipelineStages.findIndex(s => s.id === normalizedCurrentStage);

  if (stageIndex < currentIndex) return 'completed';
  if (stageIndex === currentIndex) return 'in_progress';
  return 'pending';
};

export const getNextPcbStage = (workOrder, currentStage) => {
  if (!workOrder || !currentStage) return null;
  
  const aliasMap = { tin_strip: 'tin_stripping' };
  const normalizedStage = aliasMap[currentStage] || currentStage;

  const stageIndex = pcbPipelineStages.findIndex(s => s.id === normalizedStage);
  if (stageIndex === -1) return null;
  
  const nextStage = pcbPipelineStages[stageIndex + 1];
  return nextStage ? nextStage.id : null;
};