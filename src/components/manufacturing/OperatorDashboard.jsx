import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import {
  getMfgUser,
  setMfgUser,
  clearMfgUser,
  getMfgToken,
  clearMfgToken,
} from '@/lib/storage';
import {
  Factory,
  AlertTriangle,
  ClipboardList,
  ClipboardCheck,
  Clock,
  Activity,
  PackageSearch,
  RefreshCw,
  Scan,
  CheckCircle,
  XCircle,
  Pause,
} from 'lucide-react';
import {
  MfgLayout,
  SummaryTile,
  WorkOrderBoard,
  ProcessActivityLog,
  ChecklistCard,
} from '@/components/manufacturing';

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

const formatDate = (value) => {
  if (!value) return '--';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '--';
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const priorityVariant = (priority) => {
  switch (priority) {
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

const formatActionLabel = (action) => {
  switch (String(action || '').toLowerCase()) {
    case 'release':
      return 'Released';
    case 'hold':
      return 'Hold Placed';
    case 'qc_pass':
      return 'QC Passed';
    case 'qc_fail':
      return 'QC Failed';
    case 'scan':
      return 'Traveler Scanned';
    case 'note':
      return 'Note';
    default:
      return action || 'Update';
  }
};

const OperatorDashboard = ({
  stationName,
  stationRole,
  workOrderFilter = {},
  checklists = [],
  qcEnabled = false,
  scanEnabled = true,
  switchLink = null,
  // layout override classes (optional) to allow per-page tuning
  summaryGridClass = 'grid gap-4 md:grid-cols-2 xl:grid-cols-4',
  checklistsGridClass = 'grid gap-6 md:grid-cols-2',
  // For QA dashboards: move work orders and tracker to bottom instead of middle
  workOrdersAtBottom = false,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [token, setTokenState] = useState(() => getMfgToken());
  const [operator, setOperator] = useState(() => getMfgUser());
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [stationWorkOrders, setStationWorkOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
  const [processEvents, setProcessEvents] = useState([]);
  const [processEventsLoading, setProcessEventsLoading] = useState(false);
  const [lastFetchedProcessOrderId, setLastFetchedProcessOrderId] = useState(null);
  const [processProcessEventSubmitting, setProcessEventSubmitting] = useState(false);
  const [scanInput, setScanInput] = useState('');

  const tokenMemo = useMemo(() => token, [token]);
  const operatorPermissions = useMemo(
    () => new Set((operator?.permissions || []).map((p) => String(p).toLowerCase())),
    [operator]
  );
  const hasPermission = (permission) => {
    if (!permission) return true;
    if (!permission.trim()) return true;
    if (!operatorPermissions) return false;
    if (operatorPermissions.has('*')) return true;
    return operatorPermissions.has(permission.toLowerCase());
  };

  useEffect(() => {
    if (!tokenMemo) {
      navigate('/mfgpcbxpress/login');
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await api.mfgMe(tokenMemo);
        if (res?.operator) {
          setOperator(res.operator);
          setMfgUser(res.operator);
        }
      } catch (err) {
        // Only clear session on authentication errors (401), not on network/server errors
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
          // For other errors (network, server), keep the session but show error
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
  }, [navigate, toast, tokenMemo]);

  const loadDashboardData = async (tokenValue) => {
    setSummaryLoading(true);
    setBoardsLoading(true);
    try {
      const [summaryRes, workOrdersRes] = await Promise.all([
        api.mfgSummary(tokenValue),
        api.mfgWorkOrders(tokenValue, {
          focus: 'station',
          station: operator?.workCenter,
          role: stationRole,
          ...workOrderFilter,
          limit: 20
        }),
      ]);
      setSummary(summaryRes?.summary || null);
      setStationWorkOrders(Array.isArray(workOrdersRes?.workOrders) ? workOrdersRes.workOrders : []);
    } catch (err) {
      toast({
        title: 'Unable to load station data',
        description: err?.message || 'Check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setSummaryLoading(false);
      setBoardsLoading(false);
    }
  };

  useEffect(() => {
    if (!tokenMemo || !operator) return;
    loadDashboardData(tokenMemo);
  }, [tokenMemo, operator]);

  const handleSignOut = () => {
    clearMfgUser();
    clearMfgToken();
    setTokenState(null);
    setOperator(null);
    navigate('/mfgpcbxpress/login');
    toast({ title: 'Signed out' });
  };

  const handleRefresh = async () => {
    if (!tokenMemo) return;
    setRefreshing(true);
    await loadDashboardData(tokenMemo);
    setRefreshing(false);
  };

  const allWorkOrders = useMemo(() => {
    const map = new Map();
    stationWorkOrders.forEach((wo) => {
      if (!wo) return;
      const id = wo._id || wo.id;
      if (!id || map.has(id)) return;
      const parts = [];
      if (wo.woNumber) parts.push(wo.woNumber);
      if (wo.product) parts.push(wo.product);
      if (wo.stage) parts.push(wo.stage);
      map.set(id, {
        id,
        label: parts.filter(Boolean).join(' • ') || id,
        workOrder: wo,
      });
    });
    return Array.from(map.values());
  }, [stationWorkOrders]);

  const selectedWorkOrder = useMemo(() => {
    if (!selectedWorkOrderId) return null;
    return allWorkOrders.find((item) => item.id === selectedWorkOrderId)?.workOrder || null;
  }, [allWorkOrders, selectedWorkOrderId]);

  const fetchProcessEvents = async (workOrderId, { showToast = true } = {}) => {
    if (!tokenMemo || !workOrderId) return;
    setProcessEventsLoading(true);
    try {
      const res = await api.mfgListTravelerEvents(tokenMemo, workOrderId, { limit: 50 });
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
    if (!tokenMemo) {
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
        ? 'process:release'
        : action === 'scan'
        ? 'process:read'
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
      const input = window.prompt('Enter reason (optional):', '');
      if (input === null) {
        return;
      }
      noteValue = input;
    }

    setProcessEventSubmitting(true);
    try {
      await api.mfgLogProcessEvent(tokenMemo, workOrderId, {
        action,
        station: operator?.workCenter || stationName || boardContext || 'station',
        note: noteValue,
        metadata: {
          board: boardContext || '',
          priority: workOrder?.priority || '',
          stage: workOrder?.stage || '',
        },
      });
      toast({ title: 'Traveler event recorded' });
      await fetchProcessEvents(workOrderId, { showToast: false });
      await loadDashboardData(tokenMemo); // Refresh work orders
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

  const handleScanTraveler = async () => {
    if (!scanInput.trim()) {
      toast({
        title: 'Scan required',
        description: 'Please enter a work order number to scan.',
        variant: 'destructive',
      });
      return;
    }

    const scannedWO = stationWorkOrders.find(wo =>
      wo.woNumber?.toLowerCase() === scanInput.trim().toLowerCase()
    );

    if (!scannedWO) {
      toast({
        title: 'Work order not found',
        description: `Work order ${scanInput} is not assigned to this station.`,
        variant: 'destructive',
      });
      setScanInput('');
      return;
    }

    await handleProcessAction('scan', scannedWO, { boardContext: 'scan' });
    setScanInput('');
  };

  const handleRefreshEvents = () => {
    if (!selectedWorkOrder) return;
    const workOrderId = selectedWorkOrder._id || selectedWorkOrder.id || selectedWorkOrder.woNumber;
    if (!workOrderId) return;
    fetchProcessEvents(workOrderId, { showToast: true });
  };

  useEffect(() => {
    if (!tokenMemo) return;
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
  }, [allWorkOrders, selectedWorkOrderId, tokenMemo, lastFetchedProcessOrderId]);

  const stationQueueLabel = () => {
    if (!summary) return `${stationName} queue`;
    const total = stationWorkOrders.length;
    return `${total} work orders at station`;
  };

  // Work Order Board section (reusable for layout control)
  const WorkOrderSection = (
    <section>
      <WorkOrderBoard
        title={`${stationName} Work Queue`}
        subtitle={`Work orders currently at ${stationName.toLowerCase()} station.`}
        icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
        workOrders={stationWorkOrders}
        columns={[
          { key: 'woNumber', label: 'WO', className: 'whitespace-nowrap' },
          { key: 'product', label: 'Product' },
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
            )
          },
          {
            key: 'travelerStatus',
            label: 'Status',
            render: (wo) => (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  wo?.travelerStatus === 'active'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : wo?.travelerStatus === 'on_hold'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-green-100 text-green-800 border border-green-200'
                }`}
              >
                {wo?.travelerStatus || 'released'}
              </span>
            )
          },
          {
            key: 'dueDate',
            label: 'Due date',
            align: 'right',
            render: (wo) => formatDate(wo?.dueDate)
          },
          { key: 'actions', label: 'Actions', align: 'right' }
        ]}
        loading={boardsLoading}
        emptyMessage={`No work orders at ${stationName.toLowerCase()} station.`}
        selectedWorkOrderId={selectedWorkOrderId}
        onSelectWorkOrder={handleSelectWorkOrder}
        renderActions={(wo) => (
          <>
            {hasPermission('process:read') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectWorkOrder(wo)}
              >
                View Log
              </Button>
            )}
            {scanEnabled && hasPermission('process:read') && (
              <Button
                variant="outline"
                size="sm"
                disabled={processProcessEventSubmitting}
                onClick={() => handleProcessAction('scan', wo, { boardContext: 'station' })}
              >
                <Scan className="h-4 w-4 mr-1" />
                Scan
              </Button>
            )}
            {qcEnabled && hasPermission('process:release') && (
              <Button
                variant="outline"
                size="sm"
                disabled={processProcessEventSubmitting}
                onClick={() => handleProcessAction('qc_pass', wo, { boardContext: 'station' })}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Pass
              </Button>
            )}
            {qcEnabled && hasPermission('qc:hold') && (
              <Button
                variant="destructive"
                size="sm"
                disabled={processProcessEventSubmitting}
                onClick={() => handleProcessAction('qc_fail', wo, { boardContext: 'station' })}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Fail
              </Button>
            )}
            {hasPermission('qc:hold') && (
              <Button
                variant="destructive"
                size="sm"
                disabled={processProcessEventSubmitting}
                onClick={() => handleProcessAction('hold', wo, { boardContext: 'station' })}
              >
                <Pause className="h-4 w-4 mr-1" />
                Hold
              </Button>
            )}
          </>
        )}
        hasPermission={hasPermission}
      />
    </section>
  );

  // Process Activity Log section (reusable for layout control)
  const ActivityLogSection = (
    <ProcessActivityLog
      selectedWorkOrder={selectedWorkOrder}
      selectedWorkOrderId={selectedWorkOrderId}
      processEvents={processEvents}
      loading={processEventsLoading}
      onRefresh={handleRefreshEvents}
      onSelectWorkOrder={handleSelectWorkOrder}
      workOrders={allWorkOrders}
      onProcessAction={handleProcessAction}
      hasPermission={hasPermission}
      processProcessEventSubmitting={processProcessEventSubmitting}
    />
  );

  // Checklists section (reusable for layout control)
  const ChecklistsSection = checklists.length > 0 ? (
    <section className={checklistsGridClass}>
      {checklists.map((checklist, index) => (
        <ChecklistCard
          key={index}
          title={checklist.title}
          items={checklist.items}
        />
      ))}
    </section>
  ) : null;

  return (
    <MfgLayout
      title={`${stationName} Dashboard`}
      operator={operator}
      onRefresh={handleRefresh}
      refreshing={refreshing || summaryLoading || boardsLoading}
      onSignOut={handleSignOut}
      loading={loading}
      loadingMessage={`Loading ${stationName.toLowerCase()} workspace...`}
    >
      {switchLink && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/mfgpcbxpress/dashboard?station=${switchLink.station}`)}
            className="gap-2"
          >
            <span>Go to {switchLink.label}</span>
          </Button>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {stationName} Station Overview
        </h2>
        <div className={summaryGridClass}>
          <SummaryTile
            title="Station queue"
            value={stationWorkOrders.length}
            icon={<ClipboardList className="h-4 w-4" />}
            loading={boardsLoading}
            caption={stationQueueLabel()}
          />
          <SummaryTile
            title="Active travelers"
            value={stationWorkOrders.filter(wo => wo.travelerStatus === 'active').length}
            icon={<Activity className="h-4 w-4" />}
            loading={boardsLoading}
          />
          <SummaryTile
            title="On hold"
            value={stationWorkOrders.filter(wo => wo.travelerStatus === 'on_hold').length}
            icon={<Pause className="h-4 w-4" />}
            highlight="warning"
            loading={boardsLoading}
          />
          <SummaryTile
            title="Completed today"
            value={summary?.completedToday || 0}
            icon={<CheckCircle className="h-4 w-4" />}
            loading={summaryLoading}
          />
        </div>
      </section>

      {scanEnabled && (
        <section>
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Traveler Scanner
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Scan or enter work order number..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleScanTraveler()}
                className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
              />
              <Button
                onClick={handleScanTraveler}
                disabled={!scanInput.trim() || processProcessEventSubmitting}
              >
                <Scan className="h-4 w-4 mr-2" />
                Scan
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Conditional layout: workOrdersAtBottom puts checklists first, then work orders */}
      {workOrdersAtBottom ? (
        <>
          {ChecklistsSection}
          {WorkOrderSection}
          {ActivityLogSection}
        </>
      ) : (
        <>
          {WorkOrderSection}
          {ActivityLogSection}
          {ChecklistsSection}
        </>
      )}
    </MfgLayout>
  );
};

export default OperatorDashboard;