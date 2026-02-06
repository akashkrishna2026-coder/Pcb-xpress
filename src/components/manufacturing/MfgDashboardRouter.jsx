import React from 'react';
import { useLocation } from 'react-router-dom';
import { getMfgUser } from '@/lib/storage';
import ProductionControlDashboard from './ProductionControlDashboard';
import PlanningDashboard from './PlanningDashboard';
import MaterialsDashboard from './MaterialsDashboard';
import SheetCuttingDashboard from './SheetCuttingDashboard';
import CNCDrillingDashboard from './CNCDrillingDashboard';
import SandingDashboard from './SandingDashboard';
import BrushingDashboard from './BrushingDashboard';
import PTHLineDashboard from './PTHLineDashboard';
import PhotoImagingDashboard from './PhotoImagingDashboard';
import DeveloperDashboard from './DeveloperDashboard';
import PhotoImagingQADashboard from './PhotoImagingQADashboard';
import EtchQADashboard from './EtchQADashboard';
import EtchingStationDashboard from './EtchingStationDashboard';
import SolderMaskDashboard from './SolderMaskDashboard';
import SurfaceFinishDashboard from './SurfaceFinishDashboard';
import LegendPrintingDashboard from './LegendPrintingDashboard';
import CNCRoutingDashboard from './CNCRoutingDashboard';
import VScoringDashboard from './VScoringDashboard';
import FlyingProbeDashboard from './FlyingProbeDashboard';
import FinalQCPDIRDashboard from './FinalQCPDIRDashboard';
import HALQADashboard from './HALQADashboard';
import PackingDashboard from './PackingDashboard';
import DispatchDashboard from './DispatchDashboard';
import AssemblyStoreDashboard from './AssemblyStoreDashboard';
import StencilDashboard from './StencilDashboard';
import AssemblyReflowDashboard from './AssemblyReflowDashboard';
import THSolderingDashboard from './THSolderingDashboard';
import VisualInspectionDashboard from './VisualInspectionDashboard';
import ICTDashboard from './ICTDashboard';
import FlashingDashboard from './FlashingDashboard';
import FunctionalTestDashboard from './FunctionalTestDashboard';
import WireHarnessIntakeDashboard from './WireHarnessIntakeDashboard';
import WireHarnessDashboard from './WireHarnessDashboard';
import WireTestingDashboard from './WireTestingDashboard';
import WireHarnessDispatchDashboard from './WireHarnessDispatchDashboard';
import PCBTestingDashboard from './PCBTestingDashboard';
import TestingDashboard from './TestingDashboard';
import PCBDispatchDashboard from './PCBDispatchDashboard';
import Assembly3DPrintingDashboard from './Assembly3DPrintingDashboard';
import ThreeDPrintingDashboard from './ThreeDPrintingDashboard';
import FinalAssemblyDispatchDashboard from './FinalAssemblyDispatchDashboard';
import CamDashboard from './CamDashboard';
import TinStrippingDashboard from './TinStrippingDashboard';
import MfgDashboardPage from '@/pages/MfgDashboardPage';

const MfgDashboardRouter = () => {
  const operator = getMfgUser();
  const location = useLocation();
  const stationOverride = React.useMemo(() => {
    if (!location?.search) return null;
    const params = new URLSearchParams(location.search);
    const value = params.get('station');
    if (!value) return null;
    return value.toLowerCase().replace(/-/g, '_');
  }, [location?.search]);
  console.log('Operator:', operator);
  const role = operator?.role;
  const workCenter = operator?.workCenter;
  const effectiveRole = stationOverride || role;
  if (stationOverride) {
    console.log('Station override detected:', stationOverride);
  }
  console.log('Role:', role, 'WorkCenter:', workCenter);
  console.log('Routing based on role:', effectiveRole);

  // Route to role-specific dashboards
  switch (effectiveRole) {
    case 'production_control':
      return <ProductionControlDashboard />;

    case 'sheet_cutting':
      return <SheetCuttingDashboard />;

    case 'cnc_drilling':
      return <CNCDrillingDashboard />;

    case 'sanding':
      return <SandingDashboard />;

    case 'brushing':
      return <BrushingDashboard />;

    case 'pth_line':
      return <PTHLineDashboard />;

    case 'photo_imaging':
      return <PhotoImagingDashboard />;

    case 'developer':
      return <DeveloperDashboard />;

    // Specific dashboards for packing and dispatch roles
    case 'packing':
    case 'packaging':
      return <PackingDashboard />;

    case 'dispatch':
    case 'dispatch_coordinator':
      return <DispatchDashboard />;

    // Specific etching station dashboard
    case 'etching':
      return <EtchingStationDashboard />;

    // Specific solder mask dashboard
    case 'solder_mask':
      return <SolderMaskDashboard />;

    case 'surface_finish':
      return <SurfaceFinishDashboard />;

    case 'legend_print':
      return <LegendPrintingDashboard />;

    case 'cnc_routing':
      return <CNCRoutingDashboard />;

    case 'v_score':
      return <VScoringDashboard />;

    case 'flying_probe':
    case 'test_flying_probe':
      return <FlyingProbeDashboard />;

    case 'final_qc_pdir':
      return <FinalQCPDIRDashboard />;

    case 'assembly_store':
    case 'assembly_store_issue':
      return <AssemblyStoreDashboard />;

    case 'stencil':
      return <StencilDashboard />;

    case 'assembly_reflow':
      return <AssemblyReflowDashboard />;

    case 'th_soldering':
    case 'manual_solder':
      return <THSolderingDashboard />;

    case 'visual_inspection':
      return <VisualInspectionDashboard />;

    case 'ict':
      return <ICTDashboard />;

    case 'flashing':
      return <FlashingDashboard />;

    case 'functional_test':
      return <FunctionalTestDashboard />;

    case 'wire_harness_intake':
      return <WireHarnessIntakeDashboard />;

    case 'wire_harness':
      return <WireHarnessDashboard />;

    case 'wire_testing':
      return <WireTestingDashboard />;

    case 'wire_harness_dispatch':
      return <WireHarnessDispatchDashboard />;

    case 'pcb_testing':
      return <PCBTestingDashboard />;

    case 'testing':
    case 'testing_intake':
    case 'functional_testing':
    case 'electrical_testing':
    case 'burn_in_testing':
    case 'environmental_testing':
    case 'mixed_testing':
    case 'testing_review':
    case 'testing_dispatch':
      return <TestingDashboard />;

    case 'pcb_dispatch':
      return <PCBDispatchDashboard />;

    case 'assembly_3d_printing':
      return <Assembly3DPrintingDashboard />;

    case '3d_printing':
    case '3d_printing_intake':
    case '3d_printing_file_prep':
    case '3d_printing_slicing':
    case '3d_printing_queue':
    case '3d_printing_active':
    case '3d_printing_post_processing':
    case '3d_printing_qc':
      return <ThreeDPrintingDashboard />;

    case 'assembly_dispatch':
      return <FinalAssemblyDispatchDashboard />;

    // Generic fabrication operator dashboard for other roles
    case 'tin_strip':
      return <TinStrippingDashboard />;

    case 'resist_strip':
    case 'dry_film_strip':
    case 'pattern_plating':
      return <SurfaceFinishDashboard />;

    // QA dashboards
    case 'qa_photo_imaging':
      return <PhotoImagingQADashboard />;
    case 'qa_etch':
      return <EtchQADashboard />;
    case 'qa_solder_mask':
      return <SolderMaskDashboard />;
    case 'hal':
      return <SurfaceFinishDashboard />;
    case 'qa_hal':
      return <HALQADashboard />;
    case 'qa_final':
      return <FinalQCPDIRDashboard />;

    // Role-specific dashboards
    case 'production_planner':
      return <PlanningDashboard />;

    case 'materials_lead':
      return <MaterialsDashboard />;

    // CAM roles use dedicated CAM dashboard
    case 'cam_intake':
    case 'cam_nc_drill':
    case 'cam_phototools':
      return <CamDashboard />;

    // Other roles use existing dashboard
    case 'qa_dry_film':
    case 'qa_manager':
    default:
      console.log('Falling back to default dashboard for role:', effectiveRole);
      return <MfgDashboardPage />;
  }
};

export default MfgDashboardRouter;
