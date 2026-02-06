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
  Users,
  Calendar,
} from 'lucide-react';
import {
  MfgLayout,
  WorkOrderBoard,
  TravelerActivityLog,
  ChecklistCard,
  SummaryTile,
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

const severityRank = (severity) => {
  switch (severity) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
};

const camStateVariant = (state) => {
  switch (state) {
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

const summarizeDfms = (dfmList = []) => {
  const active = dfmList.filter((d) => d?.status !== 'resolved');
  return {
    total: dfmList.length,
    open: active.length,
    highestSeverity:
      active
        .map((d) => d?.severity)
        .sort((a, b) => severityRank(b) - severityRank(a))[0] || null,
  };
};

const nextShortageEta = (shortages = []) => {
  if (!Array.isArray(shortages) || shortages.length === 0) return null;
  const sorted = shortages
    .filter((s) => s?.status !== 'received' && s?.status !== 'cancelled')
    .map((s) => new Date(s.eta || s.updatedAt || s.createdAt || Date.now()))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  return sorted[0] || null;
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

const ProductionControlDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [token, setTokenState] = useState(() => getMfgToken());
  const [operator, setOperator] = useState(() => getMfgUser());
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [camBoard, setCamBoard] = useState([]);
  const [materialsBoard, setMaterialsBoard] = useState([]);
  const [travelerBoard, setTravelerBoard] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
  const [processEvents, setProcessEvents] = useState([]);
  const [processEventsLoading, setProcessEventsLoading] = useState(false);
  const [lastFetchedProcessOrderId, setLastFetchedProcessOrderId] = useState(null);
  const [processProcessEventSubmitting, setProcessEventSubmitting] = useState(false);

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

  const operatorRole = useMemo(() => operator?.mfgRole || '', [operator]);
  const isProductionControl = useMemo(() => operatorRole === 'production_control', [operatorRole]);

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
  }, [navigate, toast, tokenMemo]);

  const loadDashboardData = async (tokenValue) => {
    setSummaryLoading(true);
    setBoardsLoading(true);
    try {
      const [summaryRes, camRes, materialsRes, travelerRes] = await Promise.all([
        api.mfgSummary(tokenValue),
        api.mfgWorkOrders(tokenValue, { focus: 'cam', limit: 20 }),
        api.mfgWorkOrders(tokenValue, { focus: 'materials', limit: 20 }),
        api.mfgWorkOrders(tokenValue, { focus: 'traveler', limit: 20 }),
      ]);
      setSummary(summaryRes?.summary || null);
      setCamBoard(Array.isArray(camRes?.workOrders) ? camRes.workOrders : []);
      setMaterialsBoard(
        Array.isArray(materialsRes?.workOrders) ? materialsRes.workOrders : []
      );
      setTravelerBoard(
        Array.isArray(travelerRes?.workOrders) ? travelerRes.workOrders : []
      );
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
    if (!tokenMemo) return;
    loadDashboardData(tokenMemo);
  }, [tokenMemo]);

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
    [...camBoard, ...materialsBoard, ...travelerBoard].forEach((wo) => {
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
  }, [camBoard, materialsBoard, travelerBoard]);

  const selectedWorkOrder = useMemo(() => {
    if (!selectedWorkOrderId) return null;
    return allWorkOrders.find((item) => item.id === selectedWorkOrderId)?.workOrder || null;
  }, [allWorkOrders, selectedWorkOrderId]);

  const fetchProcessEvents = async (workOrderId, { showToast = true } = {}) => {
    if (!tokenMemo || !workOrderId) return;
    setProcessEventsLoading(true);
    try {
      const res = await api.mfgListProcessEvents(tokenMemo, workOrderId, { limit: 50 });
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
      const input = window.prompt('Enter hold reason (optional):', '');
      if (input === null) {
        return;
      }
      noteValue = input;
    }

    setProcessEventSubmitting(true);
    try {
      await api.mfgLogProcessEvent(tokenMemo, workOrderId, {
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

  const travelerQueueLabel = () => {
    if (!summary) return 'Traveler readiness';
    const ready = summary.travelerReady || 0;
    const total = summary.totalWorkOrders || 0;
    return `${ready}/${total} travelers ready`;
  };

  return (
    <MfgLayout
      title="Production Control Dashboard"
      operator={operator}
      onRefresh={handleRefresh}
      refreshing={refreshing || summaryLoading || boardsLoading}
      onSignOut={handleSignOut}
      loading={loading}
      loadingMessage="Loading production control workspace..."
    >
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Production Control Overview
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            title="Total work orders"
            value={summary?.totalWorkOrders ?? '--'}
            icon={<ClipboardList className="h-4 w-4" />}
            loading={summaryLoading}
          />
          <SummaryTile
            title="CAM pending review"
            value={summary?.camPending ?? '--'}
            icon={<ClipboardCheck className="h-4 w-4" />}
            highlight="info"
            loading={summaryLoading}
          />
          <SummaryTile
            title="CAM blocked"
            value={summary?.camBlocked ?? '--'}
            icon={<AlertTriangle className="h-4 w-4" />}
            highlight="alert"
            loading={summaryLoading}
          />
          <SummaryTile
            title="Materials not ready"
            value={summary?.materialsBlocked ?? '--'}
            icon={<PackageSearch className="h-4 w-4" />}
            highlight="warning"
            loading={summaryLoading}
          />
          <SummaryTile
            title="Travelers released"
            value={summary?.travelerReady ?? '--'}
            icon={<Activity className="h-4 w-4" />}
            caption={travelerQueueLabel()}
            loading={summaryLoading}
          />
          <SummaryTile
            title="Due next 48h"
            value={summary?.dueSoon ?? '--'}
            icon={<Clock className="h-4 w-4" />}
            loading={summaryLoading}
          />
          <SummaryTile
            title="Release target 48h"
            value={summary?.releaseDueSoon ?? '--'}
            icon={<ClipboardCheck className="h-4 w-4" />}
            loading={summaryLoading}
          />
          <SummaryTile
            title="Open shortages"
            value={summary?.shortages?.shortageCount ?? '--'}
            icon={<AlertTriangle className="h-4 w-4" />}
            caption={
              summary?.shortages
                ? `${summary.shortages.totalShortageQty ?? 0} pcs impacted`
                : undefined
            }
            loading={summaryLoading}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <WorkOrderBoard
          title="CAM release board"
          subtitle="Outstanding DFM actions and revision locks before traveler sign-off."
          icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
          workOrders={camBoard}
          columns={[
            { key: 'woNumber', label: 'WO', className: 'whitespace-nowrap' },
            { key: 'product', label: 'Product' },
            {
              key: 'camStatus',
              label: 'CAM state',
              render: (wo) => (
                <div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${camStateVariant(
                      wo?.camStatus?.state
                    )}`}
                  >
                    {wo?.camStatus?.state || 'pending'}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    Owner: {wo?.camStatus?.owner || '--'}
                  </div>
                </div>
              )
            },
            {
              key: 'dfm',
              label: 'DFM open',
              render: (wo) => {
                const dfm = summarizeDfms(wo?.dfmExceptions);
                return (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border bg-gray-100 px-2 py-0.5 text-xs font-medium">
                      {dfm.open}/{dfm.total}
                    </span>
                    {dfm.highestSeverity && (
                      <span className="text-xs uppercase text-amber-600">
                        {dfm.highestSeverity}
                      </span>
                    )}
                  </div>
                );
              }
            },
            {
              key: 'releaseTarget',
              label: 'Release target',
              render: (wo) => formatDateTime(wo?.camStatus?.releaseTarget)
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
              )
            },
            { key: 'actions', label: 'Actions', align: 'right' }
          ]}
          loading={boardsLoading}
          emptyMessage="No work orders pending CAM review."
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
              {hasPermission('process:release') && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={processProcessEventSubmitting}
                  onClick={() =>
                    handleProcessAction('release', wo, { boardContext: 'cam' })
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
                    handleProcessAction('hold', wo, { boardContext: 'cam' })
                  }
                >
                  Hold
                </Button>
              )}
            </>
          )}
          hasPermission={hasPermission}
        />

        <WorkOrderBoard
          title="Materials readiness board"
          subtitle="Highlighting shortages and planners responsible for release to fabrication."
          icon={<PackageSearch className="h-5 w-5 text-primary" />}
          workOrders={materialsBoard}
          columns={[
            {
              key: 'woNumber',
              label: 'WO',
              className: 'whitespace-nowrap',
              render: (wo) => (
                <div>
                  {wo.woNumber}
                  <div className="text-xs text-muted-foreground">
                    {wo.product || wo.customer || '--'}
                  </div>
                </div>
              )
            },
            {
              key: 'planner',
              label: 'Planner',
              render: (wo) => (
                <div>
                  <div className="font-medium">
                    {wo.planner || 'Unassigned'}
                  </div>
                  <div className="text-xs text-muted-foreground">Stage: {wo.stage}</div>
                </div>
              )
            },
            {
              key: 'materials',
              label: 'Materials',
              render: (wo) => (
                <div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      wo?.materials?.ready
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {wo?.materials?.ready ? 'Ready' : 'Pending'}
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">
                    MRP: {formatDateTime(wo?.materials?.mrpRun)}
                  </div>
                </div>
              )
            },
            {
              key: 'shortages',
              label: 'Shortages',
              render: (wo) => {
                const shortages = wo?.materials?.shortages || [];
                return (
                  <div>
                    <div className="font-medium">
                      {wo?.materials?.shortageCount ?? shortages.length} open
                    </div>
                    {shortages.slice(0, 2).map((item, idx) => (
                      <div
                        key={`${item.itemCode || 'item'}-${idx}`}
                        className="text-xs text-muted-foreground"
                      >
                        {item.itemCode || 'Item'} - {item.shortageQty ?? 0} pcs -{' '}
                        {item.status || 'open'}
                      </div>
                    ))}
                    {shortages.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{shortages.length - 2} more
                      </div>
                    )}
                  </div>
                );
              }
            },
            {
              key: 'eta',
              label: 'Next ETA',
              render: (wo) => {
                const shortages = wo?.materials?.shortages || [];
                const eta = nextShortageEta(shortages);
                return eta ? formatDate(eta) : '--';
              }
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
          emptyMessage="No material shortages outstanding."
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
              {hasPermission('process:release') && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={processProcessEventSubmitting}
                  onClick={() =>
                    handleProcessAction('release', wo, {
                      boardContext: 'materials',
                    })
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
                    handleProcessAction('hold', wo, {
                      boardContext: 'materials',
                    })
                  }
                >
                  Hold
                </Button>
              )}
            </>
          )}
          hasPermission={hasPermission}
        />

        <WorkOrderBoard
          title="Traveler coordination board"
          subtitle="Active travelers in fabrication requiring oversight and coordination."
          icon={<Users className="h-5 w-5 text-primary" />}
          workOrders={travelerBoard}
          columns={[
            { key: 'woNumber', label: 'WO', className: 'whitespace-nowrap' },
            { key: 'product', label: 'Product' },
            {
              key: 'stage',
              label: 'Current Stage',
              render: (wo) => (
                <div>
                  <div className="font-medium">{wo.stage || 'Unknown'}</div>
                  <div className="text-xs text-muted-foreground">
                    Station: {wo.currentStation || '--'}
                  </div>
                </div>
              )
            },
            {
              key: 'travelerStatus',
              label: 'Traveler Status',
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
              key: 'lastActivity',
              label: 'Last Activity',
              render: (wo) => formatDateTime(wo?.lastTravelerEvent?.timestamp)
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
          emptyMessage="No active travelers in fabrication."
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
              {hasPermission('process:release') && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={processProcessEventSubmitting}
                  onClick={() =>
                    handleProcessAction('release', wo, { boardContext: 'traveler' })
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
                    handleProcessAction('hold', wo, { boardContext: 'traveler' })
                  }
                >
                  Hold
                </Button>
              )}
            </>
          )}
          hasPermission={hasPermission}
        />
      </section>

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

      <section className="grid gap-6 md:grid-cols-2">
        <ChecklistCard
          title="Job Card Preparation Checklist"
          items={[
            { label: "Review work order requirements and specifications" },
            { label: "Verify CAM release and DFM resolution" },
            { label: "Confirm materials readiness and shortage resolution" },
            { label: "Assign appropriate work centers and routing" },
            { label: "Set production priorities and due dates" },
            { label: "Generate and attach job cards to travelers" }
          ]}
        />
        <ChecklistCard
          title="Traveler Release Coordination"
          items={[
            { label: "Validate all pre-release gates are satisfied" },
            { label: "Coordinate with CAM, Materials, and QC teams" },
            { label: "Update traveler status to 'released'" },
            { label: "Notify fabrication supervisors of new work" },
            { label: "Monitor initial traveler scans and progress" },
            { label: "Escalate any immediate blocking issues" }
          ]}
        />
        <ChecklistCard
          title="Production Scheduling Oversight"
          items={[
            { label: "Review capacity utilization across work centers" },
            { label: "Balance workload distribution and priorities" },
            { label: "Identify and resolve scheduling conflicts" },
            { label: "Monitor on-time delivery performance" },
            { label: "Adjust schedules for expedited orders" },
            { label: "Plan for upcoming material deliveries" }
          ]}
        />
        <ChecklistCard
          title="Quality and Compliance Monitoring"
          items={[
            { label: "Ensure QC checkpoints are properly defined" },
            { label: "Monitor hold and rejection rates" },
            { label: "Review traveler audit trails for compliance" },
            { label: "Track rework and scrap metrics" },
            { label: "Verify process documentation completeness" },
            { label: "Conduct regular process audits" }
          ]}
        />
      </section>
    </MfgLayout>
  );
};

export default ProductionControlDashboard;