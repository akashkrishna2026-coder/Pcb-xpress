import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
  Factory,
  AlertTriangle,
  ClipboardList,
  ClipboardCheck,
  Clock,
  Activity,
  PackageSearch,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  Zap,
  Target,
  BarChart3,
  Filter,
} from 'lucide-react';
import {
  DashboardLayout,
  SummaryTile,
  WorkOrderBoard,
  TravelerActivityLog,
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

const formatListPreview = (list, accessor = (item) => item, max = 3) => {
  if (!Array.isArray(list) || list.length === 0) return '';
  const labels = list
    .map((item) => accessor(item))
    .filter(Boolean)
    .map((value) => String(value));
  if (labels.length === 0) return '';
  const preview = labels.slice(0, max).join(', ');
  const remaining = labels.length - max;
  return remaining > 0 ? `${preview} +${remaining}` : preview;
};

const alertSeverityVariant = (severity) => {
  switch (severity) {
    case 'critical':
      return 'destructive';
    case 'warning':
      return 'secondary';
    default:
      return 'outline';
  }
};

const MfgDashboardPage = () => {
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
  const [jobCardBoard, setJobCardBoard] = useState([]);
  const [travelerCoordinationBoard, setTravelerCoordinationBoard] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
  const [travelerEvents, setTravelerEvents] = useState([]);
  const [travelerEventsLoading, setTravelerEventsLoading] = useState(false);
  const [lastFetchedWorkOrderId, setLastFetchedWorkOrderId] = useState(null);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    stage: 'all',
    priority: 'all',
    search: '',
  });
  const autoRefreshIntervalRef = useRef(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

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
  const isCamRole = useMemo(() => {
    return ['cam_intake', 'cam_nc_drill', 'cam_phototools'].includes(operatorRole);
  }, [operatorRole]);
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
        clearMfgUser();
        clearMfgToken();
        setTokenState(null);
        toast({
          title: 'Session expired',
          description: err?.message || 'Sign in again to continue.',
          variant: 'destructive',
        });
        navigate('/mfgpcbxpress/login');
        return;
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate, toast, tokenMemo]);

  const loadDashboardData = useCallback(async (tokenValue) => {
    setSummaryLoading(true);
    setBoardsLoading(true);
    try {
      if (isCamRole) {
        // For CAM roles, load CAM-focused work orders with role-based filtering
        const [summaryRes, camRes] = await Promise.all([
          api.mfgSummary(tokenValue),
          api.mfgWorkOrders(tokenValue, { focus: 'cam', role: operatorRole, limit: 20 }),
        ]);
        setSummary(summaryRes?.summary || null);
        setCamBoard(Array.isArray(camRes?.workOrders) ? camRes.workOrders : []);
        setMaterialsBoard([]); // CAM roles don't need materials board
      } else {
        // For other roles, load both CAM and materials
        const [summaryRes, camRes, materialsRes] = await Promise.all([
          api.mfgSummary(tokenValue),
          api.mfgWorkOrders(tokenValue, { focus: 'cam', limit: 20 }),
          api.mfgWorkOrders(tokenValue, { focus: 'materials', limit: 20 }),
        ]);
        setSummary(summaryRes?.summary || null);
        setCamBoard(Array.isArray(camRes?.workOrders) ? camRes.workOrders : []);
        setMaterialsBoard(
          Array.isArray(materialsRes?.workOrders) ? materialsRes.workOrders : []
        );
      }
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
  }, [isCamRole, operatorRole, toast]);

  useEffect(() => {
    if (!tokenMemo) return;
    loadDashboardData(tokenMemo);
  }, [tokenMemo, loadDashboardData]);

  const handleSignOut = () => {
    clearMfgUser();
    clearMfgToken();
    setTokenState(null);
    setOperator(null);
    navigate('/mfgpcbxpress/login');
    toast({ title: 'Signed out' });
  };

  const handleRefresh = useCallback(async () => {
    if (!tokenMemo) return;
    setRefreshing(true);
    await loadDashboardData(tokenMemo);
    setRefreshing(false);
  }, [loadDashboardData, tokenMemo]);

  useEffect(() => {
    if (!autoRefreshEnabled || !tokenMemo) {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
      return;
    }
    autoRefreshIntervalRef.current = setInterval(() => {
      loadDashboardData(tokenMemo);
    }, 15000);
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled, loadDashboardData, tokenMemo]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      stage: 'all',
      priority: 'all',
      search: '',
    });
  }, []);

  const applyFilters = useCallback(
    (list) => {
      if (!Array.isArray(list)) return [];
      const stageFilter = String(filters.stage || 'all').toLowerCase();
      const priorityFilter = String(filters.priority || 'all').toLowerCase();
      const searchTerm = String(filters.search || '').trim().toLowerCase();

      return list.filter((wo) => {
        if (!wo) return false;
        const stageValue = String(wo.stage || '').toLowerCase();
        const priorityValue = String(wo.priority || '').toLowerCase();
        if (stageFilter !== 'all' && stageValue !== stageFilter) return false;
        if (priorityFilter !== 'all' && priorityValue !== priorityFilter) return false;

        if (searchTerm) {
          const haystack = [
            wo.woNumber,
            wo.product,
            wo.customer,
            wo.planner,
            stageValue,
            priorityValue,
            wo.customer?.name,
            wo.customer?.email,
          ]
            .flat()
            .filter(Boolean)
            .map((value) => String(value).toLowerCase())
            .join(' ');
          if (!haystack.includes(searchTerm)) return false;
        }

        return true;
      });
    },
    [filters]
  );

  const filteredCamBoard = useMemo(
    () => applyFilters(camBoard),
    [applyFilters, camBoard]
  );
  const filteredMaterialsBoard = useMemo(
    () => applyFilters(materialsBoard),
    [applyFilters, materialsBoard]
  );

  const stageOptions = useMemo(() => {
    const stages = new Set();
    [...camBoard, ...materialsBoard].forEach((wo) => {
      if (!wo?.stage) return;
      stages.add(String(wo.stage).toLowerCase());
    });
    return ['all', ...Array.from(stages.values()).sort()];
  }, [camBoard, materialsBoard]);

  const priorityOptions = useMemo(() => {
    const priorities = new Set();
    [...camBoard, ...materialsBoard].forEach((wo) => {
      if (!wo?.priority) return;
      priorities.add(String(wo.priority).toLowerCase());
    });
    return ['all', ...Array.from(priorities.values()).sort()];
  }, [camBoard, materialsBoard]);

  const allWorkOrders = useMemo(() => {
    const map = new Map();
    [...camBoard, ...materialsBoard].forEach((wo) => {
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
  }, [camBoard, materialsBoard]);

  const filteredAllWorkOrders = useMemo(() => {
    return allWorkOrders.filter((item) => applyFilters([item.workOrder]).length > 0);
  }, [allWorkOrders, applyFilters]);

  const selectedWorkOrder = useMemo(() => {
    if (!selectedWorkOrderId) return null;
    const filteredMatch = filteredAllWorkOrders.find((item) => item.id === selectedWorkOrderId);
    if (filteredMatch) return filteredMatch.workOrder;
    return allWorkOrders.find((item) => item.id === selectedWorkOrderId)?.workOrder || null;
  }, [allWorkOrders, filteredAllWorkOrders, selectedWorkOrderId]);

  const fetchTravelerEvents = async (workOrderId, { showToast = true } = {}) => {
    if (!tokenMemo || !workOrderId) return;
    setTravelerEventsLoading(true);
    try {
      const res = await api.mfgListTravelerEvents(tokenMemo, workOrderId, { limit: 50 });
      setTravelerEvents(Array.isArray(res?.events) ? res.events : []);
      setLastFetchedWorkOrderId(workOrderId);
    } catch (err) {
      if (showToast) {
        toast({
          title: 'Failed to load traveler activity',
          description: err?.message || 'Unable to fetch traveler log.',
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

    setEventSubmitting(true);
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
      setEventSubmitting(false);
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
    if (filteredAllWorkOrders.length === 0) {
      setSelectedWorkOrderId(null);
      setTravelerEvents([]);
      setLastFetchedWorkOrderId(null);
      return;
    }
    const availableIds = filteredAllWorkOrders.map((item) => item.id);
    let targetId = selectedWorkOrderId;
    if (!targetId || !availableIds.includes(targetId)) {
      targetId = availableIds[0];
      setSelectedWorkOrderId(targetId);
    }
    if (targetId && targetId !== lastFetchedWorkOrderId) {
      fetchTravelerEvents(targetId, { showToast: false });
    }
  }, [filteredAllWorkOrders, selectedWorkOrderId, tokenMemo, lastFetchedWorkOrderId]);

  const travelerQueueLabel = () => {
    if (!summary) return 'Traveler readiness';
    const ready = summary.travelerReady || 0;
    const total = summary.totalWorkOrders || 0;
    return `${ready}/${total} travelers ready`;
  };

  const alerts = useMemo(() => {
    const items = [];
    const blockedCam = camBoard.filter(
      (wo) => String(wo?.camStatus?.state || '').toLowerCase() === 'blocked'
    );
    if (blockedCam.length > 0) {
      items.push({
        id: 'cam-blocked',
        title: 'CAM tasks blocked',
        count: blockedCam.length,
        severity: 'critical',
        description: `Resolve ${formatListPreview(blockedCam, (wo) => wo?.woNumber || wo?.product)}`,
      });
    }

    const hotOrders = [...camBoard, ...materialsBoard].filter(
      (wo) => String(wo?.priority || '').toLowerCase() === 'hot'
    );
    if (hotOrders.length > 0) {
      items.push({
        id: 'hot-orders',
        title: 'HOT priority work orders',
        count: hotOrders.length,
        severity: 'critical',
        description: formatListPreview(hotOrders, (wo) => wo?.woNumber || wo?.product),
      });
    }

    const shortageWOs = materialsBoard.filter((wo) => {
      const shortageCount = wo?.materials?.shortageCount;
      const shortages = wo?.materials?.shortages;
      return (shortageCount != null && shortageCount > 0) || (Array.isArray(shortages) && shortages.length > 0);
    });
    if (shortageWOs.length > 0) {
      const nextEta = nextShortageEta(
        shortageWOs.flatMap((wo) => wo?.materials?.shortages || [])
      );
      items.push({
        id: 'materials-shortage',
        title: 'Material shortages pending',
        count: shortageWOs.length,
        severity: 'warning',
        description: `Next ETA ${nextEta ? formatDate(nextEta) : 'TBD'} • ${formatListPreview(
          shortageWOs,
          (wo) => wo?.woNumber || wo?.product
        )}`,
      });
    }

    const now = Date.now();
    const soonThreshold = now + 48 * 60 * 60 * 1000;
    const dueSoonList = [...camBoard, ...materialsBoard].filter((wo) => {
      if (!wo?.dueDate) return false;
      const due = new Date(wo.dueDate);
      if (Number.isNaN(due.getTime())) return false;
      const time = due.getTime();
      return time >= now && time <= soonThreshold;
    });
    if (dueSoonList.length > 0) {
      items.push({
        id: 'due-soon',
        title: 'Due within 48 hours',
        count: dueSoonList.length,
        severity: 'warning',
        description: formatListPreview(dueSoonList, (wo) => `${wo?.woNumber || wo?.product}`),
      });
    }

    if (summary?.shortages?.shortageCount > 0 && shortageWOs.length === 0) {
      items.push({
        id: 'summary-shortage',
        title: 'Open shortages reported',
        count: summary.shortages.shortageCount,
        severity: 'warning',
        description: `${summary.shortages.totalShortageQty ?? 0} pcs impacted across travelers`,
      });
    }

    return items;
  }, [camBoard, materialsBoard, summary]);

  return (
    <DashboardLayout
      title="Manufacturing Dashboard"
      subtitle="Manufacturing execution"
      operator={operator}
      workCenter={operator?.workCenter || 'Manufacturing Control'}
      onRefresh={handleRefresh}
      refreshing={refreshing || summaryLoading || boardsLoading}
      onSignOut={handleSignOut}
      loading={loading}
      loadingMessage="Loading operator workspace..."
    >
      <div className="mb-8 rounded-xl border bg-gradient-to-r from-slate-50 to-slate-100 p-6 shadow-sm">
        <div className="flex flex-col gap-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Filter & Search</h3>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap gap-3">
              <div className="w-full sm:w-44">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Stage
                </label>
                <Select
                  value={filters.stage}
                  onValueChange={(value) => handleFilterChange('stage', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All stages" />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === 'all'
                          ? 'All stages'
                          : option.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-44">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Priority
                </label>
                <Select
                  value={filters.priority}
                  onValueChange={(value) => handleFilterChange('priority', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === 'all'
                          ? 'All priorities'
                          : option.replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-64">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Search
                </label>
                <Input
                  value={filters.search}
                  onChange={(event) => handleFilterChange('search', event.target.value)}
                  placeholder="Search by WO, product, customer..."
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={autoRefreshEnabled ? 'default' : 'outline'}
                onClick={() => setAutoRefreshEnabled((prev) => !prev)}
                className="whitespace-nowrap"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefreshEnabled ? 'animate-spin' : ''}`} />
                {autoRefreshEnabled ? 'Auto on' : 'Auto off'}
              </Button>
              <Button
                variant="outline"
                disabled={filters.stage === 'all' && filters.priority === 'all' && !filters.search}
                onClick={clearFilters}
                className="whitespace-nowrap"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-6 flex items-center gap-3">
          <Factory className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Key Performance Indicators</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isCamRole ? (
            <>
              <SummaryTile
                title="My CAM queue"
                value={camBoard.length}
                icon={<ClipboardList className="h-4 w-4" />}
                loading={boardsLoading}
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
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </section>

      {alerts.length > 0 && (
        <section>
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle>Operational Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border border-red-200 bg-white p-4 hover:bg-red-50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-red-900">{alert.title}</p>
                        {alert.description && (
                          <p className="text-sm text-red-700 mt-1">{alert.description}</p>
                        )}
                      </div>
                      <Badge variant="destructive" className="text-lg px-3 py-1">
                        {alert.count}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-3">
        {/* Production Status Card */}
        <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Production Status</CardTitle>
              <Zap className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Active Orders</span>
                  <span className="text-2xl font-bold text-blue-600">{summary?.totalWorkOrders || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all" 
                    style={{ width: `${Math.min((summary?.totalWorkOrders || 0) / 100 * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Travelers Ready</p>
                  <p className="text-xl font-bold text-blue-600">{summary?.travelerReady || 0}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">On Schedule</p>
                  <p className="text-xl font-bold text-green-600">{(summary?.totalWorkOrders || 0) - (summary?.dueSoon || 0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate Card */}
        <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Completion Rate</CardTitle>
              <Target className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const completionRate = summary?.totalWorkOrders > 0 
                  ? Math.round((summary?.travelerReady / summary?.totalWorkOrders) * 100) 
                  : 0;
                return (
                  <>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">{completionRate}%</div>
                      <p className="text-sm text-muted-foreground">Overall Completion</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{summary?.travelerReady || 0}/{summary?.totalWorkOrders || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all" 
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics Card */}
        <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Performance</CardTitle>
              <BarChart3 className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">CAM Review</span>
                  <span className="text-sm font-bold">{summary?.camPending || 0} pending</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full" 
                    style={{ width: `${Math.min((summary?.camPending || 0) / (summary?.totalWorkOrders || 1) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Materials Ready</span>
                  <span className="text-sm font-bold">{summary?.materialsBlocked || 0} blocked</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ width: `${Math.min((summary?.materialsBlocked || 0) / (summary?.totalWorkOrders || 1) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Due Soon</span>
                  <Badge variant="secondary">{summary?.dueSoon || 0}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {isCamRole ? (
        <section>
          <WorkOrderBoard
            title={`${operator?.name || 'CAM'} Work Queue`}
            subtitle={`Work orders for ${operator?.workCenter || 'CAM processing'}.`}
            icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
            workOrders={filteredCamBoard}
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
                label: 'DFM issues',
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
            emptyMessage="No work orders in your queue."
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
                {hasPermission('cam:release') && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={eventSubmitting}
                    onClick={() =>
                      handleTravelerAction('release', wo, { boardContext: 'cam' })
                    }
                  >
                    Release
                  </Button>
                )}
                {hasPermission('qc:hold') && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={eventSubmitting}
                    onClick={() =>
                      handleTravelerAction('hold', wo, { boardContext: 'cam' })
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
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          <WorkOrderBoard
            title="CAM release board"
            subtitle="Outstanding DFM actions and revision locks before traveler sign-off."
            icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
            workOrders={filteredCamBoard}
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
                    disabled={eventSubmitting}
                    onClick={() =>
                      handleTravelerAction('release', wo, { boardContext: 'cam' })
                    }
                  >
                    Release
                  </Button>
                )}
                {hasPermission('qc:hold') && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={eventSubmitting}
                    onClick={() =>
                      handleTravelerAction('hold', wo, { boardContext: 'cam' })
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
            title="Materials and MRP readiness"
            subtitle="Highlighting shortages and planners responsible for release to fabrication."
            icon={<PackageSearch className="h-5 w-5 text-primary" />}
            workOrders={filteredMaterialsBoard}
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
                    disabled={eventSubmitting}
                    onClick={() =>
                      handleTravelerAction('release', wo, {
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
                    disabled={eventSubmitting}
                    onClick={() =>
                      handleTravelerAction('hold', wo, {
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
        </section>
      )}

      <TravelerActivityLog
        selectedWorkOrder={selectedWorkOrder}
        travelerEvents={travelerEvents}
        loading={travelerEventsLoading}
        onRefresh={handleRefreshEvents}
        onSelectWorkOrder={handleSelectWorkOrder}
        workOrders={allWorkOrders}
        onTravelerAction={handleTravelerAction}
        hasPermission={hasPermission}
        eventSubmitting={eventSubmitting}
      />

      <section className="grid gap-6 md:grid-cols-2">
        {operatorRole === 'cam_intake' && (
          <>
            <ChecklistCard
              title="CAM Intake Engineer Checklist"
              items={[
                { label: "Pull latest Gerber and BOM package from RFQ intake" },
                { label: "Run automated DFM and DRC checks" },
                { label: "Assign DFM exceptions to appropriate owners" },
                { label: "Review stack-up and impedance requirements" },
                { label: "Update CAM status from 'pending' to 'in_review'" },
                { label: "Route work order to NC Drill or Phototools as needed" }
              ]}
            />
            <ChecklistCard
              title="Intake Quality Gates"
              items={[
                { label: "Verify all required files are present and valid" },
                { label: "Check for design rule compliance" },
                { label: "Identify special process requirements" },
                { label: "Document any design limitations or concerns" },
                { label: "Escalate critical issues to engineering manager" }
              ]}
            />
          </>
        )}
        {operatorRole === 'cam_nc_drill' && (
          <>
            <ChecklistCard
              title="CAM NC Drill Checklist"
              items={[
                { label: "Review drill chart and tool requirements" },
                { label: "Generate NC drill programs for all layers" },
                { label: "Verify drill coordinates against Gerber data" },
                { label: "Check for minimum hole sizes and tolerances" },
                { label: "Generate drill drawing and tool list" },
                { label: "Update CAM status to 'approved' when complete" }
              ]}
            />
            <ChecklistCard
              title="Drill Programming Standards"
              items={[
                { label: "Use approved drill tools and sizes only" },
                { label: "Verify back-drill requirements" },
                { label: "Check for blind/buried via specifications" },
                { label: "Validate counter-sink and counter-bore depths" },
                { label: "Document any special drilling requirements" }
              ]}
            />
          </>
        )}
        {operatorRole === 'cam_phototools' && (
          <>
            <ChecklistCard
              title="CAM Phototools Checklist"
              items={[
                { label: "Generate photoplot films for all layers" },
                { label: "Apply solder mask and legend scaling" },
                { label: "Verify layer-to-layer registration" },
                { label: "Check for special aperture requirements" },
                { label: "Generate phototool drawings and specifications" },
                { label: "Update CAM status to 'approved' when complete" }
              ]}
            />
            <ChecklistCard
              title="Phototool Quality Standards"
              items={[
                { label: "Verify film resolution and scaling accuracy" },
                { label: "Check for proper layer orientation and mirroring" },
                { label: "Validate aperture shapes and sizes" },
                { label: "Ensure proper film positioning and fiducials" },
                { label: "Document any special imaging requirements" }
              ]}
            />
          </>
        )}
        {!isCamRole && (
          <>
            <ChecklistCard
              title="CAM operator checklist"
              items={[
                { label: "Pull latest Gerber and BOM package from RFQ intake" },
                { label: "Run automated DFM and DRC, assign exceptions to owners" },
                { label: "Confirm traveler revision matches CAM release notes" },
                { label: "Attach fixtures and tooling requirements before release" }
              ]}
            />
            <ChecklistCard
              title="Planner readiness actions"
              items={[
                { label: "Validate capacity slot against work center commitments" },
                { label: "Trigger MRP run and close purchase requisitions" },
                { label: "Escalate shortages tagged as HOT to materials lead" },
                { label: "Flip travelerReady only after materials and QC gates pass" }
              ]}
            />
          </>
        )}
      </section>
    </DashboardLayout>
  );
};


export default MfgDashboardPage;
