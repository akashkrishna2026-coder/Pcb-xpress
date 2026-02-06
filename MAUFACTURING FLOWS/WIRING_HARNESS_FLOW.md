# Wiring Harness Flow

## Overview
This document outlines the complete wiring harness workflow from frontend admin quote management to final dispatch. The process involves quote processing, payment verification, manufacturing assembly stations, testing, and logistics coordination to ensure reliable wiring harness production.

## Quote Management

### 1. Quote Request Reception
**Stage**: `quote_request` → `quote_sent`
**Admin Component**: `AdminWireHarnessQuotesPage.jsx`
**Responsibilities**:
- Receive wire harness quote requests from customers
- Review specifications (wire count, connectors, board size, gauge, type, quantity)
- Validate customer contact information and requirements

**Key Features**:
- Quote filtering by service type (wire_harness)
- Specification review (board dimensions, wire/connector counts, harness type)
- Customer contact management
- Attachment handling (drawings, BOMs, requirements)

### 2. Quote Preparation and Sending
**Stage**: `quote_sent`
**Responsibilities**:
- Calculate pricing based on specifications and complexity
- Prepare detailed quote with INR pricing
- Include delivery options (standard/express)
- Add notes for special requirements or terms

**Quote Components**:
- Board size specifications
- Wire count and gauge requirements
- Connector count and types
- Harness type classification
- Quantity and delivery speed
- Total pricing in INR

### 3. Payment Proof Submission
**Stage**: `payment_pending` → `payment_submitted`
**Responsibilities**:
- Customer submits payment proof after quote acceptance
- Admin reviews payment documentation
- Payment status tracking (not_submitted, submitted, approved, rejected)

**Payment Verification**:
- Proof file upload and storage
- Submission timestamp tracking
- Review notes and rejection reasons
- Approval workflow with audit trail

## Manufacturing Integration

### 4. Wire Harness Intake
**Stage**: `wire_harness_intake` → `wire_harness`
**Dashboard**: `WireHarnessIntakeDashboard.jsx`
**Responsibilities**:
- Verify payment approval and admin release
- Validate harness drawings, BOMs, and traveler packets
- Assign harness work center and prepare intake documentation

**Key Features**:
- Payment approval confirmation
- Document validation checklists
- Work center assignment
- Traveler packet preparation

### 5. Wire Harness Assembly
**Stage**: `wire_harness` → `wire_testing`
**Dashboards**: `WireHarnessIntakeDashboard.jsx`, `WireHarnessDashboard.jsx`
**Responsibilities**:
- Wire cutting and stripping operations
- Connector crimping and assembly
- Harness routing and securing
- Quality verification during assembly

**Assembly Processes**:
- Wire preparation (cutting to length, stripping insulation)
- Connector termination (crimping, soldering if required)
- Harness forming and routing
- Strain relief and mechanical securing
- Initial continuity checks

### 6. Wire Testing
**Stage**: `wire_testing` → `wire_harness_qc`
**Dashboard**: `WireTestingDashboard.jsx`
**Responsibilities**:
- Harness continuity testing
- Pin-out verification
- Connector integrity testing
- Electrical performance validation

**Test Types**:
- Continuity verification (wire-to-wire connections)
- Isolation testing (short circuit detection)
- Connector pin-out verification
- Load testing (current carrying capacity)
- Mechanical stress testing

## Admin Dispatch Integration

### 7. Wire Harness Dispatch
**Stage**: `wire_testing` → `harness_dispatch` (admin)
**Admin Route**: `/pcbXpress/dispatch/wire-harness`
**Component**: `AdminWireHarnessDispatchPage.jsx`
**Purpose**: Final dispatch coordination for completed wiring harnesses

**Dispatch Criteria**:
- Wire testing completion and pass status
- Traveler readiness confirmation
- Quality control approval
- Documentation completeness

## Quality Gates

Each stage includes:
- **Checklists**: Process-specific quality requirements
- **Traveler Events**: Progress tracking and status updates
- **Attachment Management**: Drawings, test results, quality reports
- **Transfer Controls**: Stage advancement with validation

## File Management

### Required Attachments by Stage:
- **Quote Request**: Harness drawings, BOMs, specification sheets
- **Payment Proof**: Bank receipts, transaction confirmations
- **Harness Intake**: Approved drawings, traveler packets, work instructions
- **Assembly**: Component datasheets, assembly procedures
- **Testing**: Test plans, pin-out diagrams, continuity reports
- **Dispatch**: Final inspection reports, packing lists, shipping documents

## Equipment Integration

### Assembly Equipment:
- **Wire Cutting/Stripping Machines**: Automated wire preparation
- **Crimping Tools**: Connector termination equipment
- **Routing Fixtures**: Harness forming and securing tools
- **Continuity Testers**: Basic electrical verification

### Test Equipment:
- **Multimeters**: Continuity and resistance testing
- **Cable Testers**: Comprehensive harness testing
- **Pull Testers**: Connector retention verification
- **Hipot Testers**: Isolation and voltage testing

## Access Control

Harness workflow access via:
- **Admin Portal**: `/pcbXpress/login` for quote and dispatch management
- **Manufacturing Portal**: `/mfgpcbxpress/login` for assembly stations
- **Role-based Permissions**: Stage-specific access control

## Monitoring and Reporting

- **Quote Pipeline**: Request to dispatch conversion tracking
- **Payment Status**: Approval rates and processing times
- **Manufacturing Metrics**: Assembly yields, test pass rates
- **Dispatch Performance**: On-time delivery, customer satisfaction

## Integration Points

### With Customer Portal:
- Quote request submission
- Payment proof upload
- Status tracking and notifications

### With Manufacturing:
- Work order generation from approved quotes
- Real-time status updates
- Quality feedback loops

### With Quality Systems:
- Statistical process control
- Defect tracking and analysis
- Continuous improvement data
- Customer quality reporting

## Process Flow Summary

1. **Customer Request** → Quote submitted via frontend
2. **Admin Review** → Specifications validated, quote sent
3. **Payment Processing** → Proof submitted and approved
4. **Manufacturing Intake** → Drawings and BOMs verified
5. **Harness Assembly** → Wires cut, stripped, crimped, routed
6. **Quality Testing** → Continuity, pin-out, integrity verified
7. **Final Dispatch** → Packaging and shipping coordination

## Key Performance Indicators

- **Quote Response Time**: Time from request to quote sent
- **Payment Approval Rate**: Percentage of approved payments
- **Manufacturing Yield**: Pass rate through assembly and testing
- **On-time Delivery**: Percentage of orders delivered on schedule
- **Customer Satisfaction**: Post-delivery feedback scores