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
  Calendar,
  TrendingUp,
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

const PlanningDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [token, setTokenState] = useState(() => getMfgToken());
  const [operator, setOperator] = useState(() => getMfgUser());
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [planningBoard, setPlanningBoard] = useState([]);
  const [capacityBoard, setCapacityBoard] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
  const [travelerEvents, setTravelerEvents] = useState([]);
  const [travelerEventsLoading, setTravelerEventsLoading] = useState(false);
  const [lastFetchedTravelerOrderId, setLastFetchedTravelerOrderId] = useState(null);
  const [travelerEventSubmitting, setTravelerEventSubmitting] = useState(false);

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
  const isProductionPlanner = useMemo(() => operatorRole === 'production_planner', [operatorRole]);

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
      const [summaryRes, planningRes, capacityRes] = await Promise.all([
        api.mfgSummary(tokenValue),
        api.mfgWorkOrders(tokenValue, { focus: 'planning', limit: 20 }),
        api.mfgWorkOrders(tokenValue, { focus: 'capacity', limit: 20 }),
      ]);
      setSummary(summaryRes?.summary || null);
      setPlanningBoard(Array.isArray(planningRes?.workOrders) ? planningRes.workOrders : []);
      setCapacityBoard(
        Array.isArray(capacityRes?.workOrders) ? capacityRes.workOrders : []
      );
    } catch (err) {
      toast({
        title: 'Unable to load planning data',
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
    [...planningBoard, ...capacityBoard].forEach((wo) => {
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
  }, [planningBoard, capacityBoard]);

  const selectedWorkOrder = useMemo(() => {
    if (!selectedWorkOrderId) return null;
    return allWorkOrders.find((item) => item.id === selectedWorkOrderId)?.workOrder || null;
  }, [allWorkOrders, selectedWorkOrderId]);

  const fetchTravelerEvents = async (workOrderId, { showToast = true } = {}) => {
    if (!tokenMemo || !workOrderId) return;
    setTravelerEventsLoading(true);
    try {
      const res = await api.mfgListTravelerEvents(tokenMemo, workOrderId, { limit: 50 });
      setTravelerEvents(Array.isArray(res?.events) ? res.events : []);
      setLastFetchedTravelerOrderId(workOrderId);
    } catch (err) {
      if (showToast) {
        toast({
          title: 'Failed to load traveler activity',
          description: err?.message || 'Unable to fetch traveler activity.',
          variant: 'destructive',
        });
      }
    } finally {
      setTravelerEventsLoading(false);
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

  const handleTravelerAction = async (action, workOrder, { boardContext } = {}) => {
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

    setTravelerEventSubmitting(true);
    try {
      await api.mfgLogTravelerEvent(tokenMemo, workOrderId, {
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
      await fetchTravelerEvents(workOrderId, { showToast: false });
    } catch (err) {
      toast({
        title: 'Action failed',
        description: err?.message || 'Unable to record traveler action.',
        variant: 'destructive',
      });
    } finally {
      setTravelerEventSubmitting(false);
    }
  };

  const handleRefreshEvents = () => {
    if (!selectedWorkOrder) return;
    const workOrderId = selectedWorkOrder._id || selectedWorkOrder.id || selectedWorkOrder.woNumber;
    if (!workOrderId) return;
    fetchTravelerEvents(workOrderId, { showToast: true });
  };

  useEffect(() => {
    if (!tokenMemo) return;
    if (allWorkOrders.length === 0) {
      setSelectedWorkOrderId(null);
      setTravelerEvents([]);
      setLastFetchedTravelerOrderId(null);
      return;
    }
    const availableIds = allWorkOrders.map((item) => item.id);
    let targetId = selectedWorkOrderId;
    if (!targetId || !availableIds.includes(targetId)) {
      targetId = availableIds[0];
      setSelectedWorkOrderId(targetId);
    }
    if (targetId && targetId !== lastFetchedTravelerOrderId) {
      fetchTravelerEvents(targetId, { showToast: false });
    }
  }, [allWorkOrders, selectedWorkOrderId, tokenMemo, lastFetchedTravelerOrderId]);

  const capacityUtilizationLabel = () => {
    if (!summary) return 'Capacity utilization';
    const utilized = summary.capacityUtilized || 0;
    const total = summary.capacityTotal || 0;
    return `${utilized}/${total} slots utilized`;
  };

  return (
    <MfgLayout
      title="Planning Dashboard"
      operator={operator}
      onRefresh={handleRefresh}
      refreshing={refreshing || summaryLoading || boardsLoading}
      onSignOut={handleSignOut}
      loading={loading}
      loadingMessage="Loading planning workspace..."
    >
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Production Planning Overview
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            title="Work orders to plan"
            value={planningBoard.length}
            icon={<ClipboardList className="h-4 w-4" />}
            loading={boardsLoading}
          />
          <SummaryTile
            title="Capacity conflicts"
            value={summary?.capacityConflicts ?? '--'}
            icon={<AlertTriangle className="h-4 w-4" />}
            highlight="alert"
            loading={summaryLoading}
          />
          <SummaryTile
            title="MRP runs pending"
            value={summary?.mrpPending ?? '--'}
            icon={<TrendingUp className="h-4 w-4" />}
            highlight="info"
            loading={summaryLoading}
          />
          <SummaryTile
            title="Capacity utilization"
            value={summary?.capacityUtilized ?? '--'}
            icon={<Factory className="h-4 w-4" />}
            caption={capacityUtilizationLabel()}
            loading={summaryLoading}
          />
          <SummaryTile
            title="Due next 48h"
            value={summary?.dueSoon ?? '--'}
            icon={<Clock className="h-4 w-4" />}
            loading={summaryLoading}
          />
          <SummaryTile
            title="Scheduling conflicts"
            value={summary?.schedulingConflicts ?? '--'}
            icon={<Calendar className="h-4 w-4" />}
            highlight="warning"
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
            loading={summaryLoading}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <WorkOrderBoard
          title="Planning queue"
          subtitle="Work orders requiring capacity planning and MRP execution."
          icon={<Calendar className="h-5 w-5 text-primary" />}
          workOrders={planningBoard}
          columns={[
            { key: 'woNumber', label: 'WO', className: 'whitespace-nowrap' },
            { key: 'product', label: 'Product' },
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
              label: 'MRP Status',
              render: (wo) => (
                <div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      wo?.materials?.mrpRun
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {wo?.materials?.mrpRun ? 'Run' : 'Pending'}
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">
                    Last: {formatDateTime(wo?.materials?.mrpRun)}
                  </div>
                </div>
              )
            },
            {
              key: 'capacity',
              label: 'Capacity',
              render: (wo) => (
                <div>
                  <div className="font-medium">
                    {wo.capacityRequired || 'TBD'} slots
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Available: {wo.capacityAvailable || '--'}
                  </div>
                </div>
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
          emptyMessage="No work orders requiring planning."
          selectedWorkOrderId={selectedWorkOrderId}
          onSelectWorkOrder={handleSelectWorkOrder}
          renderActions={(wo) => (
            <>
              {hasPermission('traveler:read') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectWorkOrder(wo)}
                >
                  View Log
                </Button>
              )}
              {hasPermission('traveler:release') && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={travelerEventSubmitting}
                  onClick={() =>
                    handleTravelerAction('release', wo, { boardContext: 'planning' })
                  }
                >
                  Release
                </Button>
              )}
              {hasPermission('qc:hold') && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={travelerEventSubmitting}
                  onClick={() =>
                    handleTravelerAction('hold', wo, { boardContext: 'planning' })
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
          title="Capacity planning board"
          subtitle="Work orders with capacity conflicts requiring rescheduling."
          icon={<Factory className="h-5 w-5 text-primary" />}
          workOrders={capacityBoard}
          columns={[
            { key: 'woNumber', label: 'WO', className: 'whitespace-nowrap' },
            { key: 'product', label: 'Product' },
            {
              key: 'workCenter',
              label: 'Work Center',
              render: (wo) => (
                <div>
                  <div className="font-medium">
                    {wo.workCenter || 'Unassigned'}
                  </div>
                  <div className="text-xs text-muted-foreground">Load: {wo.workCenterLoad || '--'}%</div>
                </div>
              )
            },
            {
              key: 'capacityConflict',
              label: 'Conflict',
              render: (wo) => (
                <div>
                  <span className="inline-flex items-center rounded-full border bg-red-100 px-2 py-0.5 text-xs font-medium border-red-200 text-red-800">
                    Overload
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">
                    Required: {wo.capacityRequired || 0}
                  </div>
                </div>
              )
            },
            {
              key: 'scheduledDate',
              label: 'Scheduled',
              render: (wo) => formatDateTime(wo?.scheduledDate)
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
          emptyMessage="No capacity conflicts detected."
          selectedWorkOrderId={selectedWorkOrderId}
          onSelectWorkOrder={handleSelectWorkOrder}
          renderActions={(wo) => (
            <>
              {hasPermission('traveler:read') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectWorkOrder(wo)}
                >
                  View Log
                </Button>
              )}
              {hasPermission('traveler:release') && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={travelerEventSubmitting}
                  onClick={() =>
                    handleTravelerAction('release', wo, { boardContext: 'capacity' })
                  }
                >
                  Release
                </Button>
              )}
              {hasPermission('qc:hold') && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={travelerEventSubmitting}
                  onClick={() =>
                    handleTravelerAction('hold', wo, { boardContext: 'capacity' })
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

      <TravelerActivityLog
        selectedWorkOrder={selectedWorkOrder}
        selectedWorkOrderId={selectedWorkOrderId}
        travelerEvents={travelerEvents}
        loading={travelerEventsLoading}
        onRefresh={handleRefreshEvents}
        onSelectWorkOrder={handleSelectWorkOrder}
        workOrders={allWorkOrders}
        onTravelerAction={handleTravelerAction}
        hasPermission={hasPermission}
        eventSubmitting={travelerEventSubmitting}
      />

      <section className="grid gap-6 md:grid-cols-2">
        <ChecklistCard
          title="Capacity Planning Checklist"
          items={[
            { label: "Review work center utilization and availability" },
            { label: "Identify capacity bottlenecks and constraints" },
            { label: "Balance workload across production lines" },
            { label: "Schedule preventive maintenance windows" },
            { label: "Plan for seasonal demand fluctuations" },
            { label: "Update capacity planning database" }
          ]}
        />
        <ChecklistCard
          title="MRP Execution Checklist"
          items={[
            { label: "Run MRP for all open work orders" },
            { label: "Review material requirements and availability" },
            { label: "Generate purchase requisitions for shortages" },
            { label: "Update supplier lead times and ETAs" },
            { label: "Resolve critical material constraints" },
            { label: "Validate MRP run results and exceptions" }
          ]}
        />
        <ChecklistCard
          title="Production Scheduling Checklist"
          items={[
            { label: "Prioritize hot orders and expedites" },
            { label: "Sequence work orders for optimal flow" },
            { label: "Coordinate with upstream and downstream processes" },
            { label: "Update production schedules and timelines" },
            { label: "Communicate schedule changes to stakeholders" },
            { label: "Monitor schedule adherence and performance" }
          ]}
        />
        <ChecklistCard
          title="Planning Performance Metrics"
          items={[
            { label: "Track on-time delivery performance" },
            { label: "Monitor capacity utilization rates" },
            { label: "Measure MRP accuracy and timeliness" },
            { label: "Analyze scheduling efficiency" },
            { label: "Review planning cycle times" },
            { label: "Identify continuous improvement opportunities" }
          ]}
        />
      </section>
    </MfgLayout>
  );
};

export default PlanningDashboard;