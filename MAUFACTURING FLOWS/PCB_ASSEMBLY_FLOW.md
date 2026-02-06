# PCB Assembly Flow

## Overview
This document outlines the complete PCB assembly workflow from component preparation to final dispatch. The process involves multiple assembly stations and quality checkpoints to ensure reliable PCB assembly.

## Assembly Stations

### 1. Assembly Store Issue
**Stage**: `assembly_store` → `stencil`
**Dashboard**: `AssemblyStoreDashboard.jsx`
**Responsibilities**:
- Component inventory management
- Kitting and preparation
- Material availability verification

**Key Features**:
- Component tracking
- Inventory management
- Assembly preparation checklists
- BOM management and pick lists

### 2. Stencil Printing
**Stage**: `stencil` → `assembly_reflow`
**Dashboard**: `StencilDashboard.jsx`
**Responsibilities**:
- Solder paste stencil preparation
- Registration and alignment
- Stencil quality verification

### 3. SMT Reflow
**Stage**: `assembly_reflow` → `th_soldering`
**Dashboard**: `AssemblyReflowDashboard.jsx`
**Responsibilities**:
- Automated component placement
- Solder reflow process
- Temperature profile control
- Reflow quality monitoring

### 4. TH Soldering
**Stage**: `th_soldering` → `visual_inspection`
**Dashboard**: `THSolderingDashboard.jsx`
**Responsibilities**:
- Through-hole component assembly
- Hand soldering operations
- Wave soldering (if applicable)

### 5. Visual Inspection
**Stage**: `visual_inspection` → `ict`
**Dashboard**: `VisualInspectionDashboard.jsx`
**Responsibilities**:
- Post-assembly visual verification
- Solder joint inspection
- Component placement checks

### 6. ICT Testing
**Stage**: `ict` → `flashing`
**Dashboard**: `ICTDashboard.jsx`
**Responsibilities**:
- In-circuit testing
- Component verification
- Electrical continuity testing

### 7. Flashing
**Stage**: `flashing` → `functional_test`
**Dashboard**: `FlashingDashboard.jsx`
**Responsibilities**:
- Firmware programming
- Device configuration
- Software loading

### 8. Functional Test
**Stage**: `functional_test` -> `wire_harness_intake`
**Dashboard**: `FunctionalTestDashboard.jsx`
**Responsibilities**:
- System-level functional verification
- Performance testing
- Environmental stress screening
- Release readiness for harness intake

### 9. Wire Harness Intake
**Stage**: `wire_harness_intake` -> `wire_harness`
**Dashboard**: `WireHarnessIntakeDashboard.jsx`
**Responsibilities**:
- Verify payment approval and admin release
- Validate harness drawings, BOMs, and traveler packets
- Assign harness work center and prepare intake documentation

### 10. Wire Harness
**Stage**: `wire_harness` -> `wire_testing`
**Dashboards**: `WireHarnessIntakeDashboard.jsx`, `WireHarnessDashboard.jsx`
**Responsibilities**:
- Wire cutting and stripping
- Connector crimping and assembly
- Harness routing and securing

### 11. Wire Testing
**Stage**: `wire_testing` -> `assembly_3d_printing`
**Dashboard**: `WireTestingDashboard.jsx`
**Responsibilities**:
- Harness continuity testing
- Pin-out verification
- Connector integrity testing

### 12. 3D Printing & Fixtures
**Stage**: `assembly_3d_printing` -> `assembly_final_dispatch`
**Dashboard**: `Assembly3DPrintingDashboard.jsx`
**Responsibilities**:
- 3D printed component integration
- Mechanical assembly operations
- Quality verification

### 13. Final QC & Dispatch
**Stage**: `assembly_final_dispatch` -> `pcb_assembly` (admin)
**Dashboard**: `FinalAssemblyDispatchDashboard.jsx`
**Responsibilities**:
- Comprehensive quality inspection
- Functional verification
- Documentation completion
- Final packaging and labeling
## Admin Dispatch Integration

### PCB Assembly Dispatch
**Admin Route**: `/pcbXpress/dispatch/pcb-assembly`
**Component**: `AdminPcbAssemblyDispatchPage.jsx`
**Purpose**: Final dispatch coordination for PCB assembly lots

## Specialized Assembly Types

### Wire Harness Assembly
**Stage**: `wire_harness_intake` -> `wire_harness` -> `wire_testing`
**Dashboards**: `WireHarnessIntakeDashboard.jsx`, `WireHarnessDashboard.jsx`
**Responsibilities**:
- Wire cutting and stripping
- Connector crimping and assembly
- Harness routing and securing

**Next Stage**: `wire_harness` -> Wire Harness Dashboard
**Transfer**: `wire_testing` -> Wire Testing Dashboard

### 3D Printing Assembly
**Stage**: `assembly_3d_printing` → `3d_printing` (admin)
**Dashboard**: `Assembly3DPrintingDashboard.jsx`
**Responsibilities**:
- 3D printed component integration
- Post-processing operations
- Quality verification

## Quality Gates

Each assembly station includes:
- **Checklists**: Process-specific quality requirements
- **Traveler Events**: Progress tracking and status updates
- **Attachment Management**: Documentation and test results
- **Transfer Controls**: Stage advancement with validation

## File Management

### Required Attachments by Stage:
- **Assembly Store**: Component lists, inventory reports
- **Stencil**: Stencil designs, registration checks
- **Solder Paste**: Paste certificates, viscosity reports
- **Pick & Place**: Placement programs, component maps
- **Reflow**: Temperature profiles, process parameters
- **Inspection**: AOI reports, defect analysis
- **Wire Harness Intake**: Harness drawings, traveler packets, payment approvals
- **Testing**: Test programs, failure reports
- **Final Assembly**: Assembly drawings, work instructions
- **QC**: Inspection reports, test certificates

## Equipment Integration

### Automated Systems:
- **Pick and Place Machines**: Component placement automation
- **Reflow Ovens**: Controlled soldering process
- **AOI Systems**: Automated optical inspection
- **ICT/FCT Testers**: Electrical testing equipment

### Manual Operations:
- **Stencil Printing**: Manual solder paste application
- **Hand Soldering**: Through-hole and rework operations
- **Visual Inspection**: Manual quality verification
- **Packaging**: Final product packaging

## Access Control

Assembly stations are accessed via:
- **Login**: `/mfgpcbxpress/login`
- **Dashboard Router**: `/mfgpcbxpress/dashboard`
- **Role-based Permissions**: Station-specific access control

## Monitoring and Reporting

- **Summary Tiles**: Active assemblies, due dates, hold status
- **Work Order Boards**: Visual kanban-style tracking
- **Traveler Logs**: Complete audit trail
- **Admin Dispatch**: Final shipping coordination

## Integration Points

### With PCB Manufacturing:
- Receives completed PCBs from dispatch stage
- Maintains traceability through assembly process

### With Testing:
- Functional testing integration
- ICT and boundary scan coordination

### With Quality Systems:
- Statistical process control
- Defect tracking and analysis
- Continuous improvement data
