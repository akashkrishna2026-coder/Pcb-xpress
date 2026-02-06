// FinalAssemblyDispatchDashboard.jsx
import {
  CheckCircle,
  CheckSquare,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  RefreshCw,
  Tag,
  Truck
} from 'lucide-react';
import { useState } from 'react';
import AssemblyPipelinePanel from './AssemblyPipelinePanel';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';
import AssemblyDispatchDataView from './AssemblyDispatchDataView';

const finalAssemblyDispatchConfig = {
  title: 'Final Assembly Dashboard',
  subtitle: 'Finalize assemblies and hand off to dispatch',
  stage: 'assembly_final_dispatch',
  focus: 'assembly_final_dispatch',
  summaryKey: 'assembly_final_dispatch',
  statusKey: 'assemblyFinalDispatchStatus',
  checklistKey: 'assemblyFinalDispatchChecklist',
  nextStage: 'shipping',
  boardContext: 'assembly_final_dispatch',
  currentStage: 'assembly_final_dispatch',
  attachmentField: 'assemblyAttachments',
  board: {
    title: 'Final Assembly Work Queue',
    subtitle: 'Orders awaiting final assembly and dispatch confirmation.',
    statusLabel: 'Assembly State',
    releaseLabel: 'Dispatch Target',
    attachments: {
      label: 'Assembly Documents',
      kinds: ['assembly_order', 'packing_list', 'assembly_card', 'bom', 'assembly_instruction', 'bom_vs_qty'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'assembly_final_dispatch',
  navItems: [
    { id: 'work-orders', label: 'Work Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'assembly-pipeline',
      label: 'Assembly Pipeline',
      icon: RefreshCw,
      type: 'assembly_pipeline',
      title: 'Assembly Pipeline',
      description: 'Track assembly progress through all stages.',
    },
    {
      id: 'assembly-orders',
      label: 'Assembly Orders',
      icon: ClipboardList,
      type: 'attachments',
      attachmentKinds: ['assembly_order', 'dispatch_instruction', 'assembly_card'],
      title: 'Assembly Orders',
      description: 'Assembly orders and intake instructions.',
    },
    {
      id: 'assembly-docs',
      label: 'Assembly Docs',
      icon: FileSpreadsheet,
      type: 'attachments',
      attachmentKinds: ['bom', 'assembly_instruction', 'bom_vs_qty'],
      title: 'Assembly Documents',
      description: 'BOMs, instructions, and verification docs.',
      emptyLabel: 'No assembly documents uploaded.',
    },
    {
      id: 'dispatch',
      label: 'Dispatch Prep',
      icon: Tag,
      type: 'attachments',
      attachmentKinds: ['packing_list', 'dispatch_instruction'],
      title: 'Dispatch Preparation',
      description: 'Packing lists and dispatch docs ready for handoff.',
      emptyLabel: 'No dispatch prep documents uploaded.',
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    {
      id: 'dispatch_data',
      label: 'Dispatch Data',
      icon: Truck,
      type: 'custom',
      title: 'Assembly Dispatch Data',
      description: 'View assembly dispatch data from the database.',
    },
    {
      id: 'final',
      label: 'Final',
      icon: CheckCircle,
      type: 'transfer',
      extraContent: (
        <div className="text-sm text-muted-foreground">
          Complete final checks and transfer to shipping logistics.
        </div>
      ),
    },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in final assembly',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Scheduled for dispatch',
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

const FinalAssemblyDispatchDashboard = () => {
  const [activeSection, setActiveSection] = useState('work-orders'); // Track active nav item
  const navItems = finalAssemblyDispatchConfig.navItems; // Pull from config

  const handleNavigate = (sectionId) => {
    setActiveSection(sectionId);
    // Optional: Add logic to switch content based on sectionId, e.g., render different panels
    // For now, ConfigurableStationDashboard handles the rendering based on navItems
  };

  return (
    <div className="h-screen bg-background">
      {/* Main Dashboard Content */}
      <main className="overflow-auto p-4">
        <ConfigurableStationDashboard
          config={finalAssemblyDispatchConfig}
          activeSection={activeSection} // Pass activeSection if ConfigurableStationDashboard uses it
        />
        {/* Optional: Render additional panels like AssemblyPipelinePanel based on activeSection */}
        {activeSection === 'assembly-pipeline' && <AssemblyPipelinePanel />}
        {activeSection === 'dispatch_data' && <AssemblyDispatchDataView />}
      </main>
    </div>
  );
};

export default FinalAssemblyDispatchDashboard;