import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { RefreshCw, Save } from 'lucide-react';
import { ChecklistCard } from '@/components/manufacturing';

const CHECKLIST_TEMPLATES = {
  photo_imaging: {
    setup: {
      title: 'Photo Imaging Setup Checklist',
      items: [
        { id: 'verify_artwork', label: 'Verify artwork films from CAM phototools' },
        { id: 'check_emulsion', label: 'Check emulsion type and coating thickness' },
        { id: 'inspect_uv_unit', label: 'Inspect UV exposure unit calibration' },
        { id: 'load_film', label: 'Load correct film for layer (resist/solder mask)' },
        { id: 'verify_registration', label: 'Verify registration pins and panel alignment' },
        { id: 'check_solutions', label: 'Check developer and stripper solution concentrations' },
      ],
    },
    imaging: {
      title: 'Imaging Process Checklist',
      items: [
        { id: 'load_panel', label: 'Load panel into exposure frame correctly' },
        { id: 'align_film', label: 'Align film with registration marks' },
        { id: 'apply_vacuum', label: 'Apply vacuum and verify hold time' },
        { id: 'set_exposure', label: 'Set correct exposure time and UV intensity' },
        { id: 'start_exposure', label: 'Start exposure cycle and monitor process' },
        { id: 'complete_exposure', label: 'Complete exposure and release vacuum' },
      ],
    },
    development: {
      title: 'Development Process Checklist',
      items: [
        { id: 'prepare_developer', label: 'Prepare developer solution at correct temperature' },
        { id: 'develop_panel', label: 'Develop panel for specified time' },
        { id: 'rinse_panel', label: 'Rinse panel thoroughly with DI water' },
        { id: 'dry_panel', label: 'Dry panel completely before inspection' },
        { id: 'record_parameters', label: 'Record actual development parameters used' },
      ],
    },
    quality: {
      title: 'Quality Control Checklist',
      items: [
        { id: 'check_line_width', label: 'Check line width and spacing (min 0.1mm)' },
        { id: 'inspect_pinholes', label: 'Inspect for pinholes, breaks, or shorts in pattern' },
        { id: 'verify_registration', label: 'Verify registration accuracy between layers' },
        { id: 'check_coverage', label: 'Check for proper resist coverage and thickness' },
        { id: 'document_params', label: 'Document exposure time and development parameters' },
        { id: 'scan_traveler', label: 'Scan traveler and update status before etching' },
      ],
    },
  },
  developer: {
    setup: {
      title: 'Developer Setup Checklist',
      items: [
        { id: 'check_developer_concentration', label: 'Verify developer solution concentration and temperature' },
        { id: 'inspect_spray_nozzles', label: 'Inspect spray nozzles and conveyor speed settings' },
        { id: 'prepare_rinse_tanks', label: 'Prepare DI rinse tanks and verify flow rates' },
        { id: 'verify_exhaust', label: 'Verify exhaust and ventilation systems are operational' },
      ],
    },
    processing: {
      title: 'Development Process Checklist',
      items: [
        { id: 'load_panels', label: 'Load panels with correct orientation and spacing' },
        { id: 'start_development', label: 'Start development cycle and monitor spray coverage' },
        { id: 'monitor_breakthrough', label: 'Monitor photoresist breakthrough points' },
        { id: 'verify_development_time', label: 'Verify conveyor speed and development time' },
      ],
    },
    rinse: {
      title: 'Rinse & Dry Checklist',
      items: [
        { id: 'primary_rinse', label: 'Perform primary DI rinse and ensure complete removal of chemistry' },
        { id: 'final_rinse', label: 'Perform final rinse with clean DI water' },
        { id: 'dry_panels', label: 'Dry panels thoroughly before inspection' },
      ],
    },
    quality: {
      title: 'Developer Quality Control Checklist',
      items: [
        { id: 'inspect_features', label: 'Inspect developed pattern for completeness and cleanliness' },
        { id: 'check_undercut', label: 'Check for undercut or lifting of resist' },
        { id: 'verify_registration', label: 'Verify registration accuracy after development' },
        { id: 'log_parameters', label: 'Log development parameters and operator notes' },
        { id: 'release_for_etch', label: 'Confirm panel ready for etching stage' },
      ],
    },
  },
  etching: {
    setup: {
      title: 'Etching Setup Checklist',
      items: [
        { id: 'check_etchant_chemistry', label: 'Verify etchant chemistry concentration and temperature' },
        { id: 'inspect_spray_system', label: 'Inspect spray nozzles and pump operation' },
        { id: 'verify_conveyor_speed', label: 'Verify conveyor speed and dwell time settings' },
        { id: 'prepare_rinse_section', label: 'Prepare rinse section and confirm DI supply' },
      ],
    },
    processing: {
      title: 'Etching Process Checklist',
      items: [
        { id: 'start_etch_cycle', label: 'Start etching cycle and observe initial panels' },
        { id: 'monitor_etch_rate', label: 'Monitor etch rate and adjust parameters as needed' },
        { id: 'verify_breakthrough', label: 'Verify complete copper removal in required areas' },
        { id: 'monitor_resist_integrity', label: 'Ensure photoresist remains intact during etch' },
      ],
    },
    rinse: {
      title: 'Post-Etch Rinse & Inspection',
      items: [
        { id: 'perform_primary_rinse', label: 'Perform primary rinse to remove etchant residues' },
        { id: 'neutralize_surface', label: 'Neutralize panel surface if required' },
        { id: 'dry_and_cool', label: 'Dry panels and allow to cool before QC inspection' },
      ],
    },
    quality: {
      title: 'Etching Quality Control Checklist',
      items: [
        { id: 'inspect_line_width', label: 'Inspect line width and spacing against spec' },
        { id: 'check_copper_balance', label: 'Check copper balance and uniformity' },
        { id: 'confirm_no_overetch', label: 'Confirm no over-etch or pitting present' },
        { id: 'log_results', label: 'Record etch parameters and inspection results' },
        { id: 'release_for_next_stage', label: 'Release panel for next manufacturing stage' },
      ],
    },
  },
  solder_mask: {
    preparation: {
      title: 'Solder Mask Preparation Checklist',
      items: [
        { id: 'verify_material_batch', label: 'Verify solder mask batch number and expiration date' },
        { id: 'check_viscosity', label: 'Check solder mask viscosity and record measurement' },
        { id: 'clean_panels', label: 'Ensure panels are cleaned and pre-baked per specification' },
        { id: 'inspect_equipment', label: 'Inspect coating equipment and confirm setup parameters' },
        { id: 'mix_material', label: 'Mix solder mask material per manufacturer instructions' },
      ],
    },
    coating: {
      title: 'Coating Process Checklist',
      items: [
        { id: 'set_coating_parameters', label: 'Set coating speed, pressure, and gap settings' },
        { id: 'apply_coating', label: 'Apply solder mask evenly across all panels' },
        { id: 'inspect_coverage', label: 'Inspect coating for pinholes, bubbles, or streaks' },
        { id: 'flash_dry', label: 'Flash dry panels for specified temperature and time' },
        { id: 'record_process_notes', label: 'Record coating observations and adjustments' },
      ],
    },
    imaging: {
      title: 'Imaging & Development Checklist',
      items: [
        { id: 'align_artwork', label: 'Align artwork to panel registration marks' },
        { id: 'expose_panels', label: 'Expose panels using correct energy settings' },
        { id: 'develop_mask', label: 'Develop solder mask openings to specification' },
        { id: 'rinse_and_dry', label: 'Rinse panels thoroughly and dry completely' },
        { id: 'inspect_openings', label: 'Inspect pad and via openings for completeness' },
      ],
    },
    curing: {
      title: 'Final Cure & Quality Checklist',
      items: [
        { id: 'pre_cure_inspection', label: 'Perform visual inspection before final cure' },
        { id: 'final_cure', label: 'Cure panels per temperature and time specification' },
        { id: 'adhesion_test', label: 'Perform adhesion or tape test on representative panel' },
        { id: 'measure_thickness', label: 'Measure solder mask thickness at critical locations' },
        { id: 'document_completion', label: 'Document cure results and sign off for transfer' },
      ],
    },
  },
  surface_finish: {
    pre_treatment: {
      title: 'Surface Preparation Checklist',
      items: [
        { id: 'confirm_panel_cleanliness', label: 'Confirm panels are cleaned and dried before finishing' },
        { id: 'inspect_contact_fingers', label: 'Inspect gold fingers/contact pads for contamination' },
        { id: 'verify_rack_setup', label: 'Verify rack or conveyor setup for finishing line' },
        { id: 'log_lot_details', label: 'Record surface finish chemistry lot and parameters' },
      ],
    },
    process: {
      title: 'Surface Finish Process Checklist',
      items: [
        { id: 'set_bath_parameters', label: 'Set bath temperature, dwell time, and chemistry concentrations' },
        { id: 'run_test_coupon', label: 'Process and inspect a test coupon before live panels' },
        { id: 'monitor_line', label: 'Monitor line speed and agitation during finishing' },
        { id: 'rinse_sequence', label: 'Execute rinse sequence between process steps' },
      ],
    },
    inspection: {
      title: 'Post-Finish Inspection Checklist',
      items: [
        { id: 'visual_inspection', label: 'Perform visual inspection for discoloration or defects' },
        { id: 'thickness_measurement', label: 'Measure plating thickness at critical points' },
        { id: 'adhesion_check', label: 'Conduct adhesion or solderability check if required' },
        { id: 'document_results', label: 'Document finish results and operator notes' },
      ],
    },
    release: {
      title: 'Release Checklist',
      items: [
        { id: 'qc_signoff', label: 'Obtain QC sign-off for surface finish batch' },
        { id: 'update_traveler', label: 'Update traveler with finish parameters and lot numbers' },
        { id: 'stage_for_legend', label: 'Stage approved panels for legend printing' },
      ],
    },
  },
  legend_print: {
    preparation: {
      title: 'Legend Preparation Checklist',
      items: [
        { id: 'verify_legend_artwork', label: 'Verify legend artwork revision and layer alignment' },
        { id: 'inspect_screens', label: 'Inspect legend screens for damage or wear' },
        { id: 'mix_ink', label: 'Mix legend ink to specified viscosity and color' },
        { id: 'set_printer', label: 'Set printer or screen parameters for panel size' },
      ],
    },
    printing: {
      title: 'Printing Process Checklist',
      items: [
        { id: 'align_registration', label: 'Align registration to panel fiducials' },
        { id: 'print_legend', label: 'Print legend on sample panel and verify quality' },
        { id: 'monitor_print', label: 'Monitor printing for smearing or missing text' },
        { id: 'flash_cure', label: 'Flash cure or pre-dry printed legends' },
      ],
    },
    curing: {
      title: 'Curing Checklist',
      items: [
        { id: 'set_cure_profile', label: 'Set cure oven temperature and dwell time' },
        { id: 'cure_panels', label: 'Cure panels according to specification' },
        { id: 'cool_down', label: 'Allow panels to cool before handling' },
        { id: 'clean_screens', label: 'Clean screens and tools after production' },
      ],
    },
    inspection: {
      title: 'Legend Inspection Checklist',
      items: [
        { id: 'verify_contrast', label: 'Verify legend contrast and readability' },
        { id: 'check_registration', label: 'Check legend registration to copper features' },
        { id: 'inspect_defects', label: 'Inspect for voids, smears, or missing characters' },
        { id: 'record_signoff', label: 'Record inspection results and sign off for routing' },
      ],
    },
  },
  cnc_routing: {
    routing: {
      title: 'Routing Operations Checklist',
      items: [
        { id: 'load_panels', label: 'Load panels and secure tooling pins' },
        { id: 'verify_route_outline', label: 'Verify route outlines against traveler' },
        { id: 'check_spindle', label: 'Check spindle speeds and bit condition' },
        { id: 'qc_camera_capture', label: 'Capture QC images of routed edges' },
      ],
    },
    inspection: {
      title: 'Routing Inspection Checklist',
      items: [
        { id: 'inspect_burrs', label: 'Inspect for burrs and delamination' },
        { id: 'measure_dimensions', label: 'Measure panel dimensions and route accuracy' },
        { id: 'clean_panels', label: 'Clean and remove debris from routed panels' },
        { id: 'handoff_vscore', label: 'Stage panels for V-Scoring' },
      ],
    },
  },
  v_score: {
    setup: {
      title: 'Blade & Machine Setup',
      items: [
        { id: 'review_blade_specs', label: 'Review blade specs and scoring depth requirements' },
        { id: 'set_score_depth', label: 'Set scoring depth and spacing per traveler' },
        { id: 'calibrate_guides', label: 'Calibrate guides and clamp positions' },
      ],
    },
    scoring: {
      title: 'Scoring Execution Checklist',
      items: [
        { id: 'score_separation', label: 'Score panels for separation per specification' },
        { id: 'monitor_alignment', label: 'Monitor alignment and depth across panel' },
        { id: 'inspect_blade_wear', label: 'Inspect blade wear and replace if needed' },
      ],
    },
    release: {
      title: 'Release Checklist',
      items: [
        { id: 'qc_signoff', label: 'Obtain QC sign-off for scoring quality' },
        { id: 'update_traveler', label: 'Update traveler with scoring parameters' },
        { id: 'stage_flying_probe', label: 'Stage panels for flying probe testing' },
      ],
    },
  },
  flying_probe: {
    preparation: {
      title: 'Test Setup Checklist',
      items: [
        { id: 'load_netlist', label: 'Load net files/netlist into tester' },
        { id: 'verify_job_card', label: 'Verify job card instructions and panel orientation' },
        { id: 'fixture_check', label: 'Check fixtures/probes for wear or damage' },
      ],
    },
    testing: {
      title: 'Electrical Test Checklist',
      items: [
        { id: 'run_electrical_test', label: 'Run full electrical test on panel' },
        { id: 'capture_pdf_report', label: 'Capture PDF report detailing shorts and opens' },
        { id: 'log_failures', label: 'Log any failures and mark panels for rework' },
      ],
    },
    disposition: {
      title: 'Disposition Checklist',
      items: [
        { id: 'pass_to_final_qc', label: 'If PASS, stage for Final QC PDIR' },
        { id: 'rework_plan', label: 'If FAIL, initiate rework and retest plan' },
        { id: 'update_traveler', label: 'Update traveler with final test disposition' },
      ],
    },
  },
  final_qc_pdir: {
    inspection: {
      title: 'Final QC Inspection Checklist',
      items: [
        { id: 'review_checklist', label: 'Complete final QC checklist items' },
        { id: 'verify_lcr_results', label: 'Verify LCR meter readings within tolerance' },
        { id: 'review_aoi_images', label: 'Review AOI images for anomalies' },
        { id: 'confirm_signoff', label: 'Confirm PDIR sign-off and documentation' },
      ],
    },
    release: {
      title: 'Packaging Release Checklist',
      items: [
        { id: 'update_pdir_notes', label: 'Update PDIR notes and attach reports' },
        { id: 'seal_panels', label: 'Seal approved panels for packaging' },
        { id: 'notify_packaging', label: 'Notify packaging team of release' },
      ],
    },
  },
  packing: {
    prep: {
      title: 'Packing Preparation',
      items: [
        { id: 'review_packing_list', label: 'Review packing list and quantities' },
        { id: 'gather_materials', label: 'Gather boxes, foam, and ESD-safe materials' },
        { id: 'print_labels', label: 'Print shipping and internal labels' },
      ],
    },
    esd: {
      title: 'ESD & Protection',
      items: [
        { id: 'verify_esd_bags', label: 'Verify ESD bags or shielding are available' },
        { id: 'inspect_grounding', label: 'Inspect workstation grounding before packing' },
        { id: 'log_serials', label: 'Log serials/customer references on packing sheet' },
      ],
    },
    closeout: {
      title: 'Final Packing Checklist',
      items: [
        { id: 'seal_containers', label: 'Seal containers and apply tamper seals' },
        { id: 'attach_documentation', label: 'Attach packing list and quality documents' },
        { id: 'handoff_dispatch', label: 'Handoff packed goods to dispatch staging' },
      ],
    },
  },
  dispatch: {
    staging: {
      title: 'Dispatch Staging Checklist',
      items: [
        { id: 'verify_documents', label: 'Verify shipping documentation is complete' },
        { id: 'schedule_courier', label: 'Schedule courier or arrange transport' },
        { id: 'update_system', label: 'Update ERP/MES with dispatch details' },
      ],
    },
    release: {
      title: 'Dispatch Release Checklist',
      items: [
        { id: 'load_vehicle', label: 'Load vehicle maintaining ESD protection' },
        { id: 'record_tracking', label: 'Record tracking number and dispatch sign-off' },
      ],
    },
  },
  assembly_store: {
    issue: {
      title: 'Component Issue Checklist',
      items: [
        { id: 'verify_bom', label: 'Verify BOM revision and quantities' },
        { id: 'pick_components', label: 'Pick components/reels as per BOM' },
        { id: 'label_bins', label: 'Label bins or reels for line delivery' },
      ],
    },
    transfer: {
      title: 'Line Transfer Checklist',
      items: [
        { id: 'update_inventory', label: 'Update inventory for issued components' },
        { id: 'verify_feeders', label: 'Verify feeder assignments and spares' },
        { id: 'stage_for_stencil', label: 'Stage materials for stencil printer' },
      ],
    },
  },
  stencil: {
    prep: {
      title: 'Stencil Preparation Checklist',
      items: [
        { id: 'review_bom', label: 'Review assembly BOM for stencil requirements' },
        { id: 'size_check', label: 'Perform stencil size check and alignment' },
        { id: 'solder_paste_mix', label: 'Mix solder paste per specification' },
      ],
    },
    operation: {
      title: 'Stencil Operation Checklist',
      items: [
        { id: 'clean_screen', label: 'Clean screen and capture image evidence' },
        { id: 'separate_machines', label: 'Separate top/bottom machine setups' },
        { id: 'record_settings', label: 'Record print pressure and speed' },
      ],
    },
  },
  assembly_reflow: {
    run: {
      title: 'Reflow Operation Checklist',
      items: [
        { id: 'verify_profile', label: 'Verify reflow profile for top and bottom sides' },
        { id: 'solder_top', label: 'Run solder cycle on top side' },
        { id: 'solder_bottom', label: 'Run solder cycle on bottom side' },
      ],
    },
    qc: {
      title: 'Reflow QC Checklist',
      items: [
        { id: 'check_polarity', label: 'Check for component polarity or mismatch issues' },
        { id: 'inspect_solder', label: 'Inspect solder joints for bridges or voids' },
        { id: 'export_reports', label: 'Export top/bottom reflow reports' },
      ],
    },
  },
  th_soldering: {
    prep: {
      title: 'TH Soldering Prep Checklist',
      items: [
        { id: 'review_tray_components', label: 'Review tray components against traveler' },
        { id: 'preheat_tools', label: 'Preheat soldering tools and verify tips' },
        { id: 'assign_operators', label: 'Assign operators for manual soldering' },
      ],
    },
    qc: {
      title: 'Manual Soldering QC',
      items: [
        { id: 'inspect_quality', label: 'Inspect solder quality on TH joints' },
        { id: 'log_rework', label: 'Log rework or touch-up required' },
        { id: 'ready_for_visual', label: 'Mark panels ready for visual inspection' },
      ],
    },
  },
  visual_inspection: {
    inspection: {
      title: 'Visual Inspection Checklist',
      items: [
        { id: 'review_assembly_card', label: 'Review assembly card and documentation' },
        { id: 'inspect_components', label: 'Inspect components for orientation and placement' },
        { id: 'capture_images', label: 'Capture inspection images and attach' },
      ],
    },
    release: {
      title: 'Visual Inspection Release',
      items: [
        { id: 'document_findings', label: 'Document findings and corrective actions' },
        { id: 'signoff_visual', label: 'Sign off visual inspection checklist' },
        { id: 'stage_for_ict', label: 'Stage units for ICT testing' },
      ],
    },
  },
  ict: {
    setup: {
      title: 'ICT Setup Checklist',
      items: [
        { id: 'load_test_program', label: 'Load ICT test program and fixtures' },
        { id: 'verify_test_points', label: 'Verify test points voltage/value ranges' },
        { id: 'calibrate_equipment', label: 'Calibrate measurement equipment' },
      ],
    },
    testing: {
      title: 'ICT Testing Checklist',
      items: [
        { id: 'run_test', label: 'Run ICT test cycle' },
        { id: 'capture_results', label: 'Capture test results and PDF report' },
        { id: 'log_failures', label: 'Log failures and corrections' },
      ],
    },
  },
  flashing: {
    prep: {
      title: 'Flashing Preparation Checklist',
      items: [
        { id: 'select_controller', label: 'Select controller/MCU variant' },
        { id: 'load_firmware', label: 'Load firmware files and release notes' },
        { id: 'setup_jigs', label: 'Setup flashing jigs and connections' },
      ],
    },
    execution: {
      title: 'Flashing Execution Checklist',
      items: [
        { id: 'flash_units', label: 'Flash firmware onto units' },
        { id: 'verify_checksum', label: 'Verify checksum and firmware version' },
        { id: 'record_serials', label: 'Record flashed serial numbers' },
      ],
    },
  },
  functional_test: {
    testing: {
      title: 'Functional Test Checklist',
      items: [
        { id: 'review_test_plan', label: 'Review functional test plan' },
        { id: 'run_functional_test', label: 'Run functional test sequence' },
        { id: 'log_serial_output', label: 'Log serial output and observations' },
      ],
    },
    disposition: {
      title: 'Functional Test Disposition',
      items: [
        { id: 'document_results', label: 'Document PASS/FAIL results' },
        { id: 'capture_reports', label: 'Capture functional test reports or screenshots' },
        { id: 'prepare_wire_harness', label: 'Prepare units for wire harnessing' },
      ],
    },
  },
  wire_harness_intake: {
    review: {
      title: 'Wire Harness Intake Review',
      items: [
        { id: 'verify_harness_docs', label: 'Verify harness drawings and specifications' },
        { id: 'confirm_bom', label: 'Confirm BOM and wire specification coverage' },
        { id: 'validate_payment', label: 'Confirm payment approval and admin release' },
      ],
    },
    release: {
      title: 'Traveler Release Checklist',
      items: [
        { id: 'prepare_traveler', label: 'Prepare traveler packet for harness assembly' },
        { id: 'upload_intake_package', label: 'Upload intake package & supporting documents' },
        { id: 'assign_harness_cell', label: 'Assign harness workstation and responsible operator' },
      ],
    },
  },
  wire_harness: {
    prep: {
      title: 'Wire Harness Preparation',
      items: [
        { id: 'review_wiring_diagram', label: 'Review wiring diagram and specifications' },
        { id: 'gather_cables', label: 'Gather cables, connectors, and labels' },
        { id: 'assign_workstations', label: 'Assign workstations and tools' },
      ],
    },
    assembly: {
      title: 'Harness Assembly Checklist',
      items: [
        { id: 'assemble_harness', label: 'Assemble harness per diagram' },
        { id: 'verify_length', label: 'Verify cable lengths and strain relief' },
        { id: 'tag_harness', label: 'Tag harness with serial/build info' },
      ],
    },
  },
  wire_testing: {
    testing: {
      title: 'Wire Testing Checklist',
      items: [
        { id: 'continuity_test', label: 'Perform continuity tests on harness' },
        { id: 'insulation_test', label: 'Perform insulation or hipot test if required' },
        { id: 'log_results', label: 'Log wire test results and attach report' },
      ],
    },
    release: {
      title: 'Wire Testing Release',
      items: [
        { id: 'qc_signoff_wire', label: 'Obtain QC sign-off for harness' },
        { id: 'stage_for_next', label: 'Stage harness for next process/shipment' },
      ],
    },
  },
};

const STATION_LABELS = {
  photo_imaging: 'Photo Imaging',
  developer: 'Developer',
  etching: 'Etching',
  solder_mask: 'Solder Mask',
  surface_finish: 'Surface Finish',
  legend_print: 'Legend Printing',
  cnc_routing: 'CNC Routing',
  v_score: 'V-Scoring',
  flying_probe: 'Flying Probe',
  final_qc_pdir: 'Final QC (PDIR)',
  packing: 'Packing',
  dispatch: 'Dispatch',
  assembly_store: 'Assembly Store Issue',
  stencil: 'Stencil',
  assembly_reflow: 'Assembly Reflow',
  th_soldering: 'TH Soldering',
  visual_inspection: 'Visual Inspection',
  ict: 'ICT',
  flashing: 'Flashing',
  functional_test: 'Functional Test',
  wire_harness_intake: 'Wire Harness Intake',
  wire_harness: 'Wire Harness',
  wire_testing: 'Wire Testing',
};

const buildInitialChecklist = (templateDefinition) =>
  Object.fromEntries(
    Object.entries(templateDefinition).map(([sectionKey, section]) => [
      sectionKey,
      {
        title: section.title,
        items: section.items.map((item) => ({
          id: item.id,
          label: item.label,
          completed: false,
        })),
      },
    ])
  );

const normalizeChecklist = (savedChecklist, templateDefinition) => {
  if (!savedChecklist || typeof savedChecklist !== 'object') {
    return buildInitialChecklist(templateDefinition);
  }

  return Object.fromEntries(
    Object.entries(templateDefinition).map(([sectionKey, sectionTemplate]) => {
      const savedSection = savedChecklist[sectionKey];
      const items = sectionTemplate.items.map((itemTemplate) => {
        const savedItem = savedSection?.items?.find(
          (entry) => entry?.id === itemTemplate.id || entry?.label === itemTemplate.label
        );

        return {
          id: itemTemplate.id,
          label: itemTemplate.label,
          completed: !!(savedItem?.checked ?? savedItem?.completed),
        };
      });

      return [
        sectionKey,
        {
          title: savedSection?.title || sectionTemplate.title,
          items,
        },
      ];
    })
  );
};

const ChecklistView = ({
  workOrder,
  token,
  onChecklistUpdate,
  station = 'photo_imaging',
  checklistKey = 'photoImagingChecklist',
  statusKey = 'photoImagingStatus',
}) => {
  const { toast } = useToast();
  const template = useMemo(
    () => CHECKLIST_TEMPLATES[station] || CHECKLIST_TEMPLATES.photo_imaging,
    [station]
  );

  const [checklistData, setChecklistData] = useState(() => buildInitialChecklist(template));
  const [operatorName, setOperatorName] = useState('');
  const [completionTime, setCompletionTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setChecklistData(buildInitialChecklist(template));
    setCompletionTime('');
  }, [template]);

  useEffect(() => {
    const loadChecklist = async () => {
      if (!workOrder || !token) return;

      setLoading(true);
      try {
        const existingChecklist = checklistKey ? workOrder?.[checklistKey] : null;
        setChecklistData(normalizeChecklist(existingChecklist, template));

        const status = statusKey ? workOrder?.[statusKey] : null;
        const operator =
          status?.approvedBy ||
          status?.owner ||
          existingChecklist?.completedBy ||
          workOrder?.camStatus?.owner ||
          'Unknown';
        setOperatorName(operator);
        setCompletionTime(existingChecklist?.completedAt || '');
      } catch (err) {
        toast({
          title: 'Failed to load checklist',
          description: err?.message || 'Unable to load quality checklist.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadChecklist();
  }, [workOrder, token, template, checklistKey, statusKey, toast]);

  const handleToggleItem = (sectionKey, index) => {
    setChecklistData((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        items: prev[sectionKey].items.map((item, i) =>
          i === index ? { ...item, completed: !item.completed } : item
        ),
      },
    }));
  };

  const handleReset = () => {
    setChecklistData(buildInitialChecklist(template));
    setCompletionTime('');
    toast({ title: 'Checklist reset' });
  };

  const handleSave = async () => {
    if (!workOrder || !token) return;

    setSaving(true);
    try {
      const allSectionsComplete = Object.values(checklistData).every((section) =>
        section.items.every((item) => item.completed)
      );

      const completedAt = allSectionsComplete ? new Date().toISOString() : null;
      const completedBy = allSectionsComplete ? operatorName : null;

      const payload = Object.fromEntries(
        Object.entries(checklistData).map(([sectionKey, section]) => [
          sectionKey,
          {
            title: section.title,
            items: section.items.map((item) => ({
              id: item.id,
              label: item.label,
              checked: !!item.completed,
            })),
          },
        ])
      );

      payload.completedAt = completedAt;
      payload.completedBy = completedBy;

      const updateBody = {
        [checklistKey]: payload,
      };

      if (statusKey) {
        const status = { ...(workOrder?.[statusKey] || {}) };
        const normalizedState = (status.state || '').toLowerCase();

        if (allSectionsComplete) {
          status.state = 'approved';
          status.approvedAt = completedAt;
          status.approvedBy = completedBy || operatorName || 'Operator';
        } else if (!['blocked', 'hold'].includes(normalizedState)) {
          status.state = 'in_review';
          if ('approvedAt' in status) delete status.approvedAt;
          if ('approvedBy' in status) delete status.approvedBy;
        }

        updateBody[statusKey] = status;
      }

      const result = await api.mfgUpdateWorkOrder(
        token,
        workOrder._id || workOrder.id,
        updateBody
      );

      const updatedWorkOrder = result?.workOrder;
      if (updatedWorkOrder) {
        const latestChecklist = checklistKey ? updatedWorkOrder[checklistKey] : payload;
        setChecklistData(normalizeChecklist(latestChecklist, template));
        setCompletionTime(latestChecklist?.completedAt || completedAt || '');

        const latestStatus = statusKey ? updatedWorkOrder[statusKey] : null;
        if (latestStatus?.approvedBy) {
          setOperatorName(latestStatus.approvedBy);
        }

        onChecklistUpdate?.(updatedWorkOrder);
      } else {
        setChecklistData(normalizeChecklist(payload, template));
        setCompletionTime(completedAt || '');
        onChecklistUpdate?.(null);
      }

      toast({
        title: 'Checklist saved',
        description: allSectionsComplete
          ? 'All quality checks completed and approved.'
          : 'Checklist progress saved.',
      });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err?.message || 'Unable to save quality checklist.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const totalChecklistItems = useMemo(
    () =>
      Object.values(checklistData).reduce(
        (total, section) => total + section.items.length,
        0
      ),
    [checklistData]
  );

  const completedChecklistItems = useMemo(
    () =>
      Object.values(checklistData).reduce(
        (total, section) => total + section.items.filter((item) => item.completed).length,
        0
      ),
    [checklistData]
  );

  if (!workOrder) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quality Control Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a work order to view the quality checklist.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {STATION_LABELS[station] || 'Station'} Quality Checklist
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Work Order: {workOrder.woNumber} | Operator: {operatorName}
            {completionTime && ` | Completed: ${new Date(completionTime).toLocaleString()}`}
          </p>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading checklist...</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(checklistData).map(([sectionKey, section]) => (
              <ChecklistCard
                key={sectionKey}
                title={section.title}
                items={section.items}
                onToggleItem={(index) => handleToggleItem(sectionKey, index)}
              />
            ))}
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm">
                  <span className="font-medium">Progress: </span>
                  <span className="text-muted-foreground">
                    {completedChecklistItems} / {totalChecklistItems} items completed
                  </span>
                  {completionTime && (
                    <span className="block text-xs text-muted-foreground">
                      Last completed: {new Date(completionTime).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={loading || saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Checklist'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={loading || saving}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset Checklist
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChecklistView;
