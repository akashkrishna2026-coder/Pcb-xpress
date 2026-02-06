import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import {
  getMfgUser,
  setMfgUser,
  clearMfgUser,
  getMfgToken,
  clearMfgToken,
} from '@/lib/storage';
import { Download, Eye, RefreshCw, Zap } from 'lucide-react';
import {
  DashboardLayout,
  WorkOrderBoard,
  ProcessActivityLog,
  ChecklistView,
  SummaryTile,
  TransferView,
  FinalQCPDIRSidebar,
  PcbPipelinePanel,
} from '@/components/manufacturing';
import UpdateJobCardSection from './UpdateJobCardSection';

const formatDateTime = (value) => {
  if (!value) return '--';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '--';
  return dt.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusVariant = (state) => {
  switch ((state || '').toLowerCase()) {
    case 'approved':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'in_review':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'blocked':
      return 'bg-red-100 text-red-800 border border-red-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  }
};

const priorityVariant = (priority) => {
  switch ((priority || '').toLowerCase()) {
    case 'hot':
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 'low':
      return 'bg-gray-100 text-gray-800 border border-gray-200';
    default:
      return 'bg-green-100 text-green-800 border border-green-200';
  }
};

const FinalQCPDIRDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [token, setTokenState] = useState(() => getMfgToken());
  const [operator, setOperator] = useState(() => getMfgUser());

  const [activeSection, setActiveSection] = useState('work-orders');
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
  const [processEvents, setProcessEvents] = useState([]);
  const [processEventsLoading, setProcessEventsLoading] = useState(false);
  const [lastFetchedProcessOrderId, setLastFetchedProcessOrderId] = useState(null);
  const [processProcessEventSubmitting, setProcessEventSubmitting] = useState(false);

  const operatorPermissions = useMemo(
    () => new Set((operator?.permissions || []).map((p) => String(p).toLowerCase())),
    [operator]
  );
  const hasPermission = (permission) => {
    if (!permission) return true;
    if (!permission.trim()) return true;
    if (operatorPermissions.has('*')) return true;
    return operatorPermissions.has(permission.toLowerCase());
  };

  useEffect(() => {
    if (!token) {
      navigate('/mfgpcbxpress/login');
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await api.mfgMe(token);
        if (res?.operator) {
          setOperator(res.operator);
          setMfgUser(res.operator);
        }
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) {
          clearMfgUser();
          clearMfgToken();
          setTokenState(null);
          toast({
            title: 'Session expired',
            description: err?.message || 'Sign in again to continue.',
            variant: 'destructive',
          });
          navigate('/mfgpcbxpress/login');
        } else {
          toast({
            title: 'Connection error',
            description: 'Unable to verify session. Please try refreshing.',
            variant: 'destructive',
          });
        }
        return;
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate, toast, token]);

  const loadDashboardData = async (tokenValue) => {
    setSummaryLoading(true);
    setBoardsLoading(true);
    try {
      const [summaryRes, workOrdersRes] = await Promise.all([
        api.mfgSummary(tokenValue),
        api.mfgWorkOrders(tokenValue, {
          focus: 'final_qc_pdir',
          limit: 50,
        }),
      ]);

      setSummary(summaryRes?.summary || null);

      const fetchedWorkOrders = Array.isArray(workOrdersRes?.workOrders)
        ? workOrdersRes.workOrders
        : [];

      const readyForFinalQC = fetchedWorkOrders.filter((wo) => {
        if (!wo) return false;
        const stage = String(wo.stage || '').toLowerCase();
        if (stage !== 'final_qc_pdir') return false;
        const flyingProbeState = String(wo?.flyingProbeStatus?.state || '').toLowerCase();
        return flyingProbeState === 'approved';
      });

      setWorkOrders(readyForFinalQC);
    } catch (err) {
      toast({
        title: 'Unable to load manufacturing data',
        description: err?.message || 'Check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setSummaryLoading(false);
      setBoardsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadDashboardData(token);
  }, [token]);

  const handleSignOut = () => {
    clearMfgUser();
    clearMfgToken();
    setTokenState(null);
    setOperator(null);
    navigate('/mfgpcbxpress/login');
    toast({ title: 'Signed out' });
  };

  const handleDownload = async (workOrderId, filename) => {
    try {
      const blob = await api.mfgDownloadAttachment(token, workOrderId, filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err?.message || 'Unable to download file.',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    await loadDashboardData(token);
    setRefreshing(false);
  };

  const handleWorkOrderUpdated = (updatedWorkOrder) => {
    if (!updatedWorkOrder) return;
    const updatedId = updatedWorkOrder._id || updatedWorkOrder.id;
    if (!updatedId) return;

    setWorkOrders((prev) => {
      let found = false;
      const next = prev.map((wo) => {
        const currentId = wo._id || wo.id;
        if (currentId && currentId === updatedId) {
          found = true;
          return { ...wo, ...updatedWorkOrder };
        }
        return wo;
      });
      return found ? next : prev;
    });
  };

  const allWorkOrders = useMemo(() => {
    const map = new Map();
    workOrders.forEach((wo) => {
      if (!wo) return;
      const id = wo._id || wo.id;
      if (!id || map.has(id)) return;
      const parts = [];
      if (wo.woNumber) parts.push(wo.woNumber);
      if (wo.product) parts.push(wo.product);
      if (wo.stage) parts.push(wo.stage);
      map.set(id, {
        id,
        label: parts.filter(Boolean).join(' | ') || id,
        workOrder: wo,
      });
    });
    return Array.from(map.values());
  }, [workOrders]);

  const selectedWorkOrder = useMemo(() => {
    if (!selectedWorkOrderId) return null;
    return allWorkOrders.find((item) => item.id === selectedWorkOrderId)?.workOrder || null;
  }, [allWorkOrders, selectedWorkOrderId]);

  const fetchProcessEvents = async (workOrderId, { showToast = true } = {}) => {
    if (!token || !workOrderId) return;
    setProcessEventsLoading(true);
    try {
      const res = await api.mfgListTravelerEvents(token, workOrderId, { limit: 50 });
      setProcessEvents(Array.isArray(res?.events) ? res.events : []);
      setLastFetchedProcessOrderId(workOrderId);
    } catch (err) {
      if (showToast) {
        toast({
          title: 'Failed to load process activity',
          description: err?.message || 'Unable to fetch process activity.',
          variant: 'destructive',
        });
      }
    } finally {
      setProcessEventsLoading(false);
    }
  };

  const handleSelectWorkOrder = (workOrderOrId) => {
    const id =
      typeof workOrderOrId === 'string'
        ? workOrderOrId
        : workOrderOrId?._id || workOrderOrId?.id || workOrderOrId?.woNumber || null;
    if (!id) {
      setSelectedWorkOrderId(null);
      return;
    }
    setSelectedWorkOrderId(id);
  };

  const handleProcessAction = async (action, workOrder, { boardContext } = {}) => {
    if (!token) {
      toast({
        title: 'Not authenticated',
        description: 'Sign in again to perform traveler actions.',
        variant: 'destructive',
      });
      return;
    }
    const workOrderId = workOrder?._id || workOrder?.id;
    if (!workOrderId) return;

    const permissionNeeded =
      action === 'hold' || action === 'qc_fail'
        ? 'qc:hold'
        : action === 'release' || action === 'qc_pass'
        ? 'traveler:release'
        : action === 'scan'
        ? 'traveler:read'
        : null;

    if (!hasPermission(permissionNeeded)) {
      toast({
        title: 'Permission denied',
        description: `You lack the ${permissionNeeded} permission for this action.`,
        variant: 'destructive',
      });
      return;
    }

    let noteValue = '';
    if (typeof window !== 'undefined' && (action === 'hold' || action === 'qc_fail')) {
      const input = window.prompt('Enter hold reason (optional):', '');
      if (input === null) {
        return;
      }
      noteValue = input;
    }

    setProcessEventSubmitting(true);
    try {
      await api.mfgLogTravelerEvent(token, workOrderId, {
        action,
        station: operator?.workCenter || workOrder?.stage || boardContext || 'station',
        note: noteValue,
        metadata: {
          board: boardContext || '',
          priority: workOrder?.priority || '',
          stage: workOrder?.stage || '',
        },
      });
      toast({ title: 'Traveler event recorded' });
      await fetchProcessEvents(workOrderId, { showToast: false });
    } catch (err) {
      toast({
        title: 'Action failed',
        description: err?.message || 'Unable to record traveler action.',
        variant: 'destructive',
      });
    } finally {
      setProcessEventSubmitting(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (allWorkOrders.length === 0) {
      setSelectedWorkOrderId(null);
      setProcessEvents([]);
      setLastFetchedProcessOrderId(null);
      return;
    }
    const availableIds = allWorkOrders.map((item) => item.id);
    let targetId = selectedWorkOrderId;
    if (!targetId || !availableIds.includes(targetId)) {
      targetId = availableIds[0];
      setSelectedWorkOrderId(targetId);
    }
    if (targetId && targetId !== lastFetchedProcessOrderId) {
      fetchProcessEvents(targetId, { showToast: false });
    }
  }, [allWorkOrders, selectedWorkOrderId, token, lastFetchedProcessOrderId]);

  const renderJobCards = () => (
    <div className="space-y-6">
      {selectedWorkOrderId ? (
        <UpdateJobCardSection
          workOrderId={selectedWorkOrderId}
          token={token}
          onJobCardUpdated={() => {
            loadDashboardData(token);
            toast({ title: 'Job card updated successfully' });
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Job Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Select a work order to view and update job cards.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderLCR = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">LCR Meter Results</CardTitle>
        <p className="text-sm text-muted-foreground">Review recorded LCR measurements.</p>
      </CardHeader>
      <CardContent>
        {selectedWorkOrder?.finalQCPDIRParams?.lcr ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {Object.entries(selectedWorkOrder.finalQCPDIRParams.lcr).map(([key, value]) => (
              <div key={key} className="rounded-lg border p-3 bg-muted/40">
                <div className="text-xs uppercase text-muted-foreground">{key}</div>
                <div className="font-medium">{String(value ?? '--')}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No LCR meter data recorded.</p>
        )}
      </CardContent>
    </Card>
  );

  const renderAOI = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AOI Images</CardTitle>
        <p className="text-sm text-muted-foreground">Review captured AOI imagery for final verification.</p>
      </CardHeader>
      <CardContent>
        {selectedWorkOrder ? (
          <div className="space-y-3">
            {(selectedWorkOrder.camAttachments || [])
              .filter((att) => ['aoi_image', 'aoi_report', 'inspection_photo'].includes(att.kind))
              .map((file) => (
                <div key={file.filename} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <div className="font-medium">{file.originalName || file.filename}</div>
                    <div className="text-xs text-muted-foreground">Uploaded {formatDateTime(file.uploadedAt)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <Eye className="h-4 w-4" /> View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handleDownload(selectedWorkOrder._id || selectedWorkOrder.id, file.filename)}
                    >
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </div>
                </div>
              ))}
            {(selectedWorkOrder.camAttachments || []).filter((att) => ['aoi_image', 'aoi_report', 'inspection_photo'].includes(att.kind)).length ===
              0 && <p className="text-sm text-muted-foreground">No AOI images uploaded.</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a work order to view AOI images.</p>
        )}
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'work-orders':
        return (
          <WorkOrderBoard
            title="Final QC PDIR Work Queue"
            subtitle="Perform final inspection and documentation."
            icon={<Zap className="h-5 w-5 text-primary" />}
            workOrders={workOrders}
            columns={[
              { key: 'woNumber', label: 'WO', className: 'whitespace-nowrap' },
              { key: 'product', label: 'Product' },
              {
                key: 'finalDocs',
                label: 'Final Documents',
                render: (wo) => {
                  const files = (wo.camAttachments || []).filter((att) =>
                    ['pdir_report', 'aoi_report', 'lcr_report'].includes(att.kind)
                  );
                  if (files.length === 0) return <span className="text-muted-foreground">None</span>;
                  return (
                    <div className="flex flex-col gap-1">
                      {files.map((file) => (
                        <Button
                          key={file.filename}
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-left justify-start"
                          onClick={() => handleDownload(wo._id || wo.id, file.filename)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          {file.originalName || file.filename}
                        </Button>
                      ))}
                    </div>
                  );
                },
              },
              {
                key: 'finalQCPDIRStatus',
                label: 'Final QC State',
                render: (wo) => (
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusVariant(
                        wo?.finalQCPDIRStatus?.state
                      )}`}
                    >
                      {wo?.finalQCPDIRStatus?.state || 'pending'}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      Owner: {wo?.finalQCPDIRStatus?.owner || '--'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'releaseTarget',
                label: 'Release Target',
                render: (wo) => formatDateTime(wo?.finalQCPDIRStatus?.releaseTarget),
              },
              {
                key: 'priority',
                label: 'Priority',
                align: 'right',
                render: (wo) => (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityVariant(
                      wo.priority
                    )}`}
                  >
                    {wo.priority || 'normal'}
                  </span>
                ),
              },
              { key: 'actions', label: 'Actions', align: 'right' },
            ]}
            loading={boardsLoading}
            emptyMessage="No work orders in the final QC queue."
            selectedWorkOrderId={selectedWorkOrderId}
            onSelectWorkOrder={handleSelectWorkOrder}
            renderActions={(wo) => (
              <>
                {hasPermission('process:read') && (
                  <Button variant="ghost" size="sm" onClick={() => handleSelectWorkOrder(wo)}>
                    View Log
                  </Button>
                )}
                {hasPermission('process:release') && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={processProcessEventSubmitting}
                    onClick={() =>
                      handleProcessAction('release', wo, { boardContext: 'final_qc_pdir' })
                    }
                  >
                    Release
                  </Button>
                )}
                {hasPermission('qc:hold') && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={processProcessEventSubmitting}
                    onClick={() =>
                      handleProcessAction('hold', wo, { boardContext: 'final_qc_pdir' })
                    }
                  >
                    Hold
                  </Button>
                )}
              </>
            )}
          />
        );

      case 'job-cards':
        return renderJobCards();

      case 'lcr-meter':
        return renderLCR();

      case 'aoi-images':
        return renderAOI();

      case 'checklist':
        return (
          <ChecklistView
            workOrder={selectedWorkOrder}
            token={token}
            station="final_qc_pdir"
            checklistKey="finalQCPDIRChecklist"
            statusKey="finalQCPDIRStatus"
            onChecklistUpdate={(updatedWorkOrder) => {
              if (updatedWorkOrder) {
                handleWorkOrderUpdated(updatedWorkOrder);
              }
            }}
          />
        );

      case 'pcb-pipeline':
        return (
          <PcbPipelinePanel
            selectedWorkOrder={selectedWorkOrder}
            highlightStage="final_qc"
          />
        );

      case 'final':
        return (
          <TransferView
            workOrder={selectedWorkOrder}
            token={token}
            currentStage="final_qc_pdir"
            nextStage="dispatch"
            onTransfer={() => {
              loadDashboardData(token);
            }}
            onTravelerAction={handleProcessAction}
            hasPermission={hasPermission}
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Final QC PDIR Dashboard"
        subtitle="Final inspection and release"
        operator={operator}
        workCenter={operator?.workCenter || 'Final QC PDIR'}
        loading={loading}
        loadingMessage="Loading final QC workspace..."
      />
    );
  }

  return (
    <DashboardLayout
      title="Final QC PDIR Dashboard"
      subtitle="Final inspection and release"
      operator={operator}
      workCenter={operator?.workCenter || 'Final QC PDIR'}
      onRefresh={handleRefresh}
      refreshing={refreshing || summaryLoading || boardsLoading}
      onSignOut={handleSignOut}
      loading={loading}
    >
      <div className="flex gap-6">
        <FinalQCPDIRSidebar activeSection={activeSection} onNavigate={setActiveSection} />

        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryTile
              title="Active Orders"
              value={summary?.final_qc_pdir?.active || workOrders.length || 0}
              description="Currently in final QC"
            />
            <SummaryTile
              title="Due Today"
              value={summary?.final_qc_pdir?.dueToday || 0}
              description="Scheduled for release"
            />
            <SummaryTile
              title="On Hold"
              value={summary?.final_qc_pdir?.onHold || 0}
              status="warning"
              description="Requires attention"
            />
          </div>

          {renderContent()}

          <ProcessActivityLog
            selectedWorkOrder={selectedWorkOrder}
            selectedWorkOrderId={selectedWorkOrderId}
            travelerEvents={processEvents}
            loading={processEventsLoading}
            onRefresh={() => {
              if (selectedWorkOrder) {
                const workOrderId =
                  selectedWorkOrder._id || selectedWorkOrder.id || selectedWorkOrder.woNumber;
                if (workOrderId) fetchProcessEvents(workOrderId, { showToast: true });
              }
            }}
            onSelectWorkOrder={handleSelectWorkOrder}
            workOrders={allWorkOrders}
            onTravelerAction={handleProcessAction}
            hasPermission={hasPermission}
            eventSubmitting={processProcessEventSubmitting}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FinalQCPDIRDashboard;
