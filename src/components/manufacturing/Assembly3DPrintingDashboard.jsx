import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  FileSpreadsheet,
  Printer,
  PenTool,
  Tag,
  GitBranch,
  FileText,
  Route,
  CheckSquare,
  CheckCircle,
} from 'lucide-react';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import AssemblyPipelinePanel from './AssemblyPipelinePanel';
import AttachmentUploadPanel from './AttachmentUploadPanel';

const assembly3DPrintingConfig = {
  title: 'Assembly 3D Printing Dashboard',
  subtitle: 'Fixture fabrication, labelling, and assembly add-ons',
  stage: 'assembly_3d_printing',
  focus: 'assembly_3d_printing',
  attachmentField: 'assemblyAttachments',
  summaryKey: 'assembly_3d_printing',
  statusKey: 'assembly3DPrintingStatus',
  checklistKey: 'assembly3DPrintingChecklist',
  nextStage: 'assembly_final_dispatch',
  boardContext: 'assembly_3d_printing',
  board: {
    title: '3D Printing Work Queue',
    subtitle: 'Orders needing fixtures, labels, or printed peripherals.',
    statusLabel: '3D Printing State',
    releaseLabel: 'Final QC Target',
    attachments: {
      label: 'Printing Assets',
      kinds: ['assembly_job_card', 'drawing', 'labelling_asset', 'print_file', 'wiring_diagram', 'harness_drawing', 'wire_spec', 'bom', 'assembly', 'assembly_instruction'],
      categories: ['assembly', 'intake'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'assembly_3d_printing',
  navItems: [
    { id: 'work-orders', label: 'Assembly Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'job-card',
      label: 'Assembly Job Card',
      icon: ClipboardList,
      type: 'attachments',
      attachmentKinds: ['assembly_job_card', 'assembly_card'],
      attachmentField: 'assemblyAttachments',
      title: 'Assembly Job Cards',
      description: 'Assembly job cards and traveller notes for printed fixtures.',
    },
    {
      id: 'bom',
      label: 'BOM',
      icon: FileSpreadsheet,
      type: 'attachments',
      attachmentKinds: ['bom', 'assembly', 'assembly_instruction'],
      attachmentCategories: ['intake'],
      attachmentField: 'assemblyAttachments',
      title: 'Bill of Materials',
      description: 'Fixture and accessory BOM carried over from upstream stations.',
    },
    {
      id: 'drawing',
      label: 'Drawings',
      icon: PenTool,
      type: 'attachments',
      attachmentKinds: ['drawing', 'fixture_drawing', 'cad_render'],
      attachmentField: 'assemblyAttachments',
      title: 'Drawings',
      description: 'Mechanical drawings and CAD references for printing.',
      emptyLabel: 'No drawings uploaded.',
    },
    {
      id: 'labelling',
      label: 'Labelling',
      icon: Tag,
      type: 'attachments',
      attachmentKinds: ['labelling_asset', 'label_artwork'],
      attachmentField: 'assemblyAttachments',
      title: 'Labelling Assets',
      description: 'Label artwork, decals, and branding to accompany the assembly.',
      emptyLabel: 'No label assets uploaded.',
    },
    {
      id: 'print-files',
      label: 'Print Files',
      icon: Printer,
      type: 'attachments',
      attachmentKinds: ['print_file', 'stl', 'step', '3mf'],
      attachmentField: 'assemblyAttachments',
      title: '3D Print Files',
      description: 'STL/STEP files and slicing data for fixture printing.',
      emptyLabel: 'No print files uploaded.',
    },
    {
      id: 'wiring-diagram',
      label: 'Wiring Diagram',
      icon: GitBranch,
      type: 'custom',
      render: ({ selectedWorkOrder, token, onWorkOrderUpdated }) => (
        <AttachmentUploadPanel
          workOrder={selectedWorkOrder}
          token={token}
          onWorkOrderUpdated={onWorkOrderUpdated}
          title="Wiring Diagram Uploads"
          description="Upload latest harness drawings, pin-out maps, or annotated wiring diagrams."
          kinds={[
            { value: 'wiring_diagram', label: 'Wiring Diagram' },
            { value: 'harness_drawing', label: 'Harness Drawing' },
          ]}
          defaultKind="wiring_diagram"
          category="assembly"
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.dxf,.dwg,.zip"
        />
      ),
    },
    {
      id: 'wire-specs',
      label: 'Wire Specs',
      icon: FileText,
      type: 'attachments',
      attachmentKinds: ['wire_spec', 'connector_spec'],
      attachmentField: 'assemblyAttachments',
      title: 'Wire Specifications',
      description: 'Wire gauges, connector specs, and build notes.',
      emptyLabel: 'No wire specs uploaded.',
    },
    {
      id: 'assembly-pipeline',
      label: 'Assembly Pipeline',
      icon: Route,
      type: 'custom',
      render: ({ selectedWorkOrder }) => (
        <AssemblyPipelinePanel selectedWorkOrder={selectedWorkOrder} highlightStage="assembly_3d_printing" />
      ),
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { id: 'final', label: 'Final', icon: CheckCircle, type: 'transfer' },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently printing or post-processing',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Scheduled for printing completion',
      valueKey: 'dueToday',
    },
    {
      title: 'On Hold',
      description: 'Waiting on design approval or materials',
      valueKey: 'onHold',
      status: 'warning',
    },
  ],
};

const Assembly3DPrintingDashboard = () => (
  <ConfigurableStationDashboard config={assembly3DPrintingConfig} />
);

export default Assembly3DPrintingDashboard;
