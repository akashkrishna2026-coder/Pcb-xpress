import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  FileSpreadsheet,
  Tag,
  Printer,
  CheckSquare,
  CheckCircle,
  GitBranch,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import ConfigurableStationDashboard from './ConfigurableStationDashboard';

const pcbDispatchConfig = {
  title: 'PCB Dispatch Station Dashboard',
  subtitle: 'Finalize PCB shipments and hand off to logistics',
  stage: 'dispatch',
  focus: 'dispatch',
  summaryKey: 'dispatch',
  statusKey: 'dispatchStatus',
  checklistKey: 'dispatchChecklist',
  nextStage: 'shipping',
  boardContext: 'dispatch',
  board: {
    title: 'PCB Dispatch Work Queue',
    subtitle: 'PCB orders awaiting dispatch and shipment confirmation.',
    statusLabel: 'Dispatch State',
    releaseLabel: 'Shipping Target',
    attachments: {
      label: 'Dispatch Documents',
      kinds: ['invoice', 'shipping_label', 'packing_list', 'pcb_order'],
    },
  },
  filterWorkOrders: (wo) =>
    wo && String(wo.stage || '').toLowerCase() === 'dispatch',
  navItems: [
    { id: 'work-orders', label: 'Work Orders', icon: LayoutDashboard, type: 'board' },
    {
      id: 'pcb-pipeline',
      label: 'PCB Pipeline',
      icon: GitBranch,
      type: 'pcb_pipeline',
      title: 'PCB Pipeline',
      description: 'Track PCB manufacturing progress through all stages.',
    },
    {
      id: 'pcb-orders',
      label: 'PCB Orders',
      icon: ClipboardList,
      type: 'attachments',
      attachmentKinds: ['pcb_order', 'dispatch_instruction'],
      title: 'PCB Orders',
      description: 'PCB manufacturing orders and dispatch instructions.',
    },
    {
      id: 'test-reports',
      label: 'Test Reports',
      icon: FileText,
      type: 'attachments',
      attachmentKinds: ['test_report', 'flying_probe_report', 'final_qc_report'],
      title: 'Test Reports',
      description: 'Electrical test results and quality inspection reports.',
      emptyLabel: 'No test reports uploaded.',
    },
    {
      id: 'invoice',
      label: 'Invoice',
      icon: FileSpreadsheet,
      type: 'attachments',
      attachmentKinds: ['invoice', 'commercial_invoice'],
      title: 'Invoices',
      description: 'Customer invoices and commercial documents.',
      emptyLabel: 'No invoices uploaded.',
    },
    {
      id: 'shipping-labels',
      label: 'Shipping Labels',
      icon: Tag,
      type: 'attachments',
      attachmentKinds: ['shipping_label', 'label'],
      title: 'Shipping Labels',
      description: 'Labels ready for printing and application.',
      emptyLabel: 'No shipping labels uploaded.',
    },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    {
      id: 'approval',
      label: 'Approval',
      icon: CheckCircle,
      type: 'custom',
      render: ({ selectedWorkOrder, handleRefresh, refreshing, token, stage, onWorkOrderUpdated }) => {
        const handleApprove = async () => {
          if (!selectedWorkOrder || !token) return;

          try {
            // Create dispatch record
            const dispatchData = {
              workOrder: selectedWorkOrder._id,
              priority: selectedWorkOrder.priority || 'normal',
              notes: `Dispatch approved for work order ${selectedWorkOrder.woNumber}`,
            };

            const dispatchResult = await api.mfgCreateDispatch(token, dispatchData);

            // Update work order stage to shipping
            await api.mfgUpdateWorkOrderStage(token, selectedWorkOrder._id, 'shipping');

            // Refresh the dashboard
            handleRefresh();

            // Show success message
            alert(`Dispatch created successfully! Dispatch Number: ${dispatchResult.dispatch.dispatchNumber}`);
          } catch (error) {
            console.error('Approval failed:', error);
            alert(`Approval failed: ${error.message}`);
          }
        };

        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Dispatch Approval</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Approve and create dispatch record for this work order.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedWorkOrder ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Work Order</label>
                      <p className="text-sm text-muted-foreground">{selectedWorkOrder.woNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Customer</label>
                      <p className="text-sm text-muted-foreground">{selectedWorkOrder.customer}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Product</label>
                      <p className="text-sm text-muted-foreground">{selectedWorkOrder.product}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Quantity</label>
                      <p className="text-sm text-muted-foreground">{selectedWorkOrder.quantity}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleApprove}
                      className="flex-1"
                      disabled={!selectedWorkOrder || selectedWorkOrder.stage !== 'dispatch'}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve & Create Dispatch
                    </Button>
                  </div>

                  {selectedWorkOrder.stage !== 'dispatch' && (
                    <p className="text-sm text-amber-600">
                      Work order must be in dispatch stage to approve.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a work order to approve dispatch.
                </p>
              )}
            </CardContent>
          </Card>
        );
      },
    },
    {
      id: 'final',
      label: 'Final',
      icon: CheckCircle,
      type: 'transfer',
      extraContent: (
        <div className="text-sm text-muted-foreground">
          Use the printer controls to print shipping labels and finalize PCB dispatch.
        </div>
      ),
    },
  ],
  summaryTiles: [
    {
      title: 'Active Orders',
      description: 'Currently in dispatch',
      valueKey: 'active',
    },
    {
      title: 'Due Today',
      description: 'Scheduled for shipment',
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

const PCBDispatchDashboard = () => <ConfigurableStationDashboard config={pcbDispatchConfig} />;

export default PCBDispatchDashboard;