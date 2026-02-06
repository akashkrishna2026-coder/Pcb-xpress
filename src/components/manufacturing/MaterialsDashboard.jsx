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
  Truck,
  TrendingDown,
} from 'lucide-react';
import {
  MfgLayout,
  WorkOrderBoard,
  ProcessActivityLog,
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

const MaterialsDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [token, setTokenState] = useState(() => getMfgToken());
  const [operator, setOperator] = useState(() => getMfgUser());
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [shortagesBoard, setShortagesBoard] = useState([]);
  const [supplierBoard, setSupplierBoard] = useState([]);
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
  const isMaterialsLead = useMemo(() => operatorRole === 'materials_lead', [operatorRole]);

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
      const [summaryRes, shortagesRes, supplierRes] = await Promise.all([
        api.mfgSummary(tokenValue),
        api.mfgWorkOrders(tokenValue, { focus: 'shortages', limit: 20 }),
        api.mfgWorkOrders(tokenValue, { focus: 'suppliers', limit: 20 }),
      ]);
      setSummary(summaryRes?.summary || null);
      setShortagesBoard(Array.isArray(shortagesRes?.workOrders) ? shortagesRes.workOrders : []);
      setSupplierBoard(
        Array.isArray(supplierRes?.workOrders) ? supplierRes.workOrders : []
      );
    } catch (err) {
      toast({
        title: 'Unable to load materials data',
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
    [...shortagesBoard, ...supplierBoard].forEach((wo) => {
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
  }, [shortagesBoard, supplierBoard]);

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

  const shortageImpactLabel = () => {
    if (!summary) return 'Shortage impact';
    const count = summary.shortages?.shortageCount || 0;
    const qty = summary.shortages?.totalShortageQty || 0;
    return `${count} items, ${qty} pcs impacted`;
  };

  return (
    <MfgLayout
      title="Materials Dashboard"
      operator={operator}
      onRefresh={handleRefresh}
      refreshing={refreshing || summaryLoading || boardsLoading}
      onSignOut={handleSignOut}
      loading={loading}
      loadingMessage="Loading materials workspace..."
    >
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Materials Management Overview
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            title="Open shortages"
            value={summary?.shortages?.shortageCount ?? '--'}
            icon={<AlertTriangle className="h-4 w-4" />}
            highlight="alert"
            caption={shortageImpactLabel()}
            loading={summaryLoading}
          />
          <SummaryTile
            title="Supplier deliveries due"
            value={summary?.supplierDeliveries ?? '--'}
            icon={<Truck className="h-4 w-4" />}
            highlight="info"
            loading={summaryLoading}
          />
          <SummaryTile
            title="Critical shortages"
            value={summary?.criticalShortages ?? '--'}
            icon={<TrendingDown className="h-4 w-4" />}
            highlight="alert"
            loading={summaryLoading}
          />
          <SummaryTile
            title="Materials blocked WOs"
            value={summary?.materialsBlocked ?? '--'}
            icon={<PackageSearch className="h-4 w-4" />}
            highlight="warning"
            loading={summaryLoading}
          />
          <SummaryTile
            title="PO requisitions pending"
            value={summary?.pendingPOs ?? '--'}
            icon={<ClipboardList className="h-4 w-4" />}
            loading={summaryLoading}
          />
          <SummaryTile
            title="Supplier performance"
            value={summary?.supplierPerformance ?? '--'}
            icon={<Activity className="h-4 w-4" />}
            caption="On-time delivery %"
            loading={summaryLoading}
          />
          <SummaryTile
            title="Due next 48h"
            value={summary?.dueSoon ?? '--'}
            icon={<Clock className="h-4 w-4" />}
            loading={summaryLoading}
          />
          <SummaryTile
            title="Inventory turnover"
            value={summary?.inventoryTurnover ?? '--'}
            icon={<RefreshCw className="h-4 w-4" />}
            loading={summaryLoading}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <WorkOrderBoard
          title="Material shortages board"
          subtitle="Work orders impacted by material shortages requiring expedited procurement."
          icon={<AlertTriangle className="h-5 w-5 text-primary" />}
          workOrders={shortagesBoard}
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
              key: 'shortages',
              label: 'Shortages',
              render: (wo) => {
                const shortages = wo?.materials?.shortages || [];
                return (
                  <div>
                    <div className="font-medium">
                      {wo?.materials?.shortageCount ?? shortages.length} items
                    </div>
                    {shortages.slice(0, 2).map((item, idx) => (
                      <div
                        key={`${item.itemCode || 'item'}-${idx}`}
                        className="text-xs text-muted-foreground"
                      >
                        {item.itemCode || 'Item'} - {item.shortageQty ?? 0} pcs
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
              key: 'supplier',
              label: 'Supplier',
              render: (wo) => (
                <div>
                  <div className="font-medium">
                    {wo.supplierName || 'TBD'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Lead time: {wo.supplierLeadTime || '--'} days
                  </div>
                </div>
              )
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
                    handleProcessAction('release', wo, { boardContext: 'shortages' })
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
                    handleProcessAction('hold', wo, { boardContext: 'shortages' })
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
          title="Supplier delivery tracking"
          subtitle="Monitor supplier deliveries and update ETAs for material availability."
          icon={<Truck className="h-5 w-5 text-primary" />}
          workOrders={supplierBoard}
          columns={[
            {
              key: 'woNumber',
              label: 'WO',
              className: 'whitespace-nowrap',
              render: (wo) => (
                <div>
                  {wo.woNumber}
                  <div className="text-xs text-muted-foreground">
                    {wo.product || '--'}
                  </div>
                </div>
              )
            },
            {
              key: 'supplier',
              label: 'Supplier',
              render: (wo) => (
                <div>
                  <div className="font-medium">
                    {wo.supplierName || 'Unassigned'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    PO: {wo.purchaseOrder || '--'}
                  </div>
                </div>
              )
            },
            {
              key: 'deliveryStatus',
              label: 'Delivery Status',
              render: (wo) => (
                <div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      wo?.deliveryStatus === 'on_time'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : wo?.deliveryStatus === 'delayed'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {wo?.deliveryStatus || 'pending'}
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">
                    ETA: {formatDate(wo?.supplierETA)}
                  </div>
                </div>
              )
            },
            {
              key: 'items',
              label: 'Items',
              render: (wo) => (
                <div>
                  <div className="font-medium">
                    {wo.deliveryItems?.length || 0} items
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Qty: {wo.totalDeliveryQty || 0}
                  </div>
                </div>
              )
            },
            {
              key: 'dueDate',
              label: 'WO Due',
              align: 'right',
              render: (wo) => formatDate(wo?.dueDate)
            },
            { key: 'actions', label: 'Actions', align: 'right' }
          ]}
          loading={boardsLoading}
          emptyMessage="No supplier deliveries to track."
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
                    handleProcessAction('release', wo, { boardContext: 'suppliers' })
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
                    handleProcessAction('hold', wo, { boardContext: 'suppliers' })
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
          title="Shortage Resolution Checklist"
          items={[
            { label: "Identify critical material shortages impacting production" },
            { label: "Contact suppliers for expedited delivery options" },
            { label: "Evaluate alternative suppliers and sources" },
            { label: "Update purchase orders with revised ETAs" },
            { label: "Communicate delays to production planning team" },
            { label: "Monitor shortage resolution progress" }
          ]}
        />
        <ChecklistCard
          title="Supplier Management Checklist"
          items={[
            { label: "Track supplier delivery performance metrics" },
            { label: "Update supplier lead times based on actual performance" },
            { label: "Review supplier quality and reliability" },
            { label: "Negotiate improved terms for critical materials" },
            { label: "Maintain supplier contact lists and escalation paths" },
            { label: "Conduct regular supplier performance reviews" }
          ]}
        />
        <ChecklistCard
          title="Inventory Management Checklist"
          items={[
            { label: "Monitor inventory turnover rates" },
            { label: "Identify slow-moving and obsolete inventory" },
            { label: "Optimize safety stock levels" },
            { label: "Review minimum order quantities" },
            { label: "Implement inventory control procedures" },
            { label: "Conduct cycle counting and reconciliation" }
          ]}
        />
        <ChecklistCard
          title="Procurement Planning Checklist"
          items={[
            { label: "Forecast material requirements based on production plans" },
            { label: "Generate purchase requisitions proactively" },
            { label: "Consolidate orders for better pricing" },
            { label: "Review blanket orders and long-term agreements" },
            { label: "Monitor commodity prices and market conditions" },
            { label: "Plan for seasonal demand fluctuations" }
          ]}
        />
      </section>
    </MfgLayout>
  );
};

export default MaterialsDashboard;