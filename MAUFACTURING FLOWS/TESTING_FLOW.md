# Testing Flow

## Overview
This document outlines the complete testing workflow for PCB assemblies and wire harnesses. The process involves multiple testing methodologies and quality verification steps to ensure product reliability.

## Testing Stations

### 1. PCB Testing
**Stage**: `testing` → `final_qc_pdir`
**Dashboard**: `PCBTestingDashboard.jsx`
**Responsibilities**:
- Bare PCB electrical testing
- Continuity and isolation verification
- Automated test pattern execution

**Test Types**:
- Flying probe testing
- Bed-of-nails testing
- Boundary scan (JTAG)
- In-circuit testing (ICT)

### 2. Wire Testing
**Stage**: `wire_testing` → `wire_harness_qc`
**Dashboard**: `WireTestingDashboard.jsx`
**Responsibilities**:
- Harness continuity testing
- Pin-out verification
- Connector integrity testing

### 3. Functional Testing
**Stage**: `functional_test` → `final_qc`
**Dashboard**: `FunctionalTestDashboard.jsx`
**Responsibilities**:
- System-level functional verification
- Performance testing
- Environmental stress screening

### 4. Final QC (PDIR)
**Stage**: `final_qc_pdir` → `testing` (admin)
**Dashboard**: `FinalQCPDIRDashboard.jsx`
**Responsibilities**:
- Process verification
- Documentation review
- Final acceptance testing

## Admin Dispatch Integration

### Testing Dispatch
**Admin Route**: `/pcbXpress/dispatch/testing`
**Component**: `AdminTestingDispatchPage.jsx`
**Purpose**: Final dispatch coordination for tested PCB assemblies

## Specialized Testing Types

### PCB Testing Categories:
- **Bare Board Testing**: Pre-assembly electrical verification
- **In-Circuit Testing**: Post-assembly component verification
- **Functional Testing**: System-level performance validation
- **Boundary Scan**: Complex digital circuit testing

### Wire Harness Testing:
- **Continuity Testing**: Wire-to-wire connection verification
- **Isolation Testing**: Shorts and leakage detection
- **Connector Testing**: Contact integrity and retention
- **Load Testing**: Current carrying capacity verification

## Quality Gates

Each testing station includes:
- **Checklists**: Test-specific quality requirements
- **Traveler Events**: Progress tracking and status updates
- **Attachment Management**: Test programs, results, failure analysis
- **Transfer Controls**: Stage advancement with validation

## File Management

### Required Attachments by Stage:
- **PCB Testing**: Test programs, fixture designs, test results
- **Wire Testing**: Test plans, pin-out diagrams, continuity reports
- **Functional Testing**: Test procedures, performance specs, results
- **QC**: Inspection reports, certificates, final documentation

## Equipment Integration

### Test Equipment:
- **Flying Probe Testers**: Automated bare board testing
- **ICT Fixtures**: Bed-of-nails in-circuit testing
- **Boundary Scan Tools**: JTAG-based digital testing
- **Functional Test Stations**: Custom test fixtures

### Software Tools:
- **Test Program Generation**: Automated test creation
- **Data Analysis**: Test result processing and reporting
- **Failure Analysis**: Root cause identification
- **Statistical Analysis**: Process capability monitoring

## Test Program Management

### Test Program Development:
- **Fixture Design**: Mechanical test interface design
- **Program Creation**: Automated test sequence development
- **Validation**: Test program verification and correlation
- **Documentation**: Test procedure documentation

### Test Program Maintenance:
- **Version Control**: Test program revision management
- **Calibration**: Test equipment calibration tracking
- **Performance Monitoring**: Test yield and reliability tracking

## Failure Analysis Process

### Failure Investigation:
- **Fault Isolation**: Identifying failing components/circuits
- **Root Cause Analysis**: Determining failure mechanisms
- **Corrective Actions**: Implementing fixes and improvements
- **Preventive Measures**: Process improvements to prevent recurrence

### Documentation:
- **Failure Reports**: Detailed failure analysis documentation
- **Repair Records**: Component replacement and rework tracking
- **Trend Analysis**: Failure pattern identification

## Access Control

Testing stations are accessed via:
- **Login**: `/mfgpcbxpress/login`
- **Dashboard Router**: `/mfgpcbxpress/dashboard`
- **Role-based Permissions**: Test station-specific access control

## Monitoring and Reporting

- **Test Yields**: Pass/fail rates by test type
- **Equipment Utilization**: Tester availability and usage
- **Quality Metrics**: Defect rates, failure modes
- **Process Capability**: Statistical process control

## Integration Points

### With Manufacturing:
- Receives completed PCBs from final QC
- Provides feedback for process improvement
- Maintains traceability through testing

### With Assembly:
- Post-assembly testing coordination
- Functional verification integration
- Rework and repair coordination

### With Quality Systems:
- Statistical process control
- Defect tracking and analysis
- Continuous improvement data
- Customer quality reporting

## Test Coverage Requirements

### Coverage Metrics:
- **Fault Coverage**: Percentage of detectable faults
- **Test Escape Rate**: Undetected defect rate
- **Test Yield**: Percentage of passing units
- **False Failure Rate**: Incorrect failure identification

### Coverage Types:
- **Stuck-at Faults**: Logic gate testing
- **Bridging Faults**: Short circuit detection
- **Opens**: Continuity verification
- **Analog Parameters**: Performance specification testing