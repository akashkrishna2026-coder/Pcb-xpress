import React, { useEffect, useState, useMemo } from 'react';
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
import {
  Factory,
  FileText,
  Settings,
  Filter,
  Plus,
  Download,
  Search,
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
  PackageSearch,
  RefreshCw,
  Wrench,
  Image,
  Film,
  Eye,
} from 'lucide-react';
import {
  DashboardLayout,
  SummaryTile,
  WorkOrderBoard,
  TravelerActivityLog,
  ChecklistCard,
  CamFileUpload,
  CamSidebar,
  CamTopbar,
  DfmReviewPanel,
  DfmReports,
  CamPipelinePanel,
} from '@/components/manufacturing';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  camPipelineStages,
  pcbPipelineStages,
  camStageStatusKeys,
  normalizeStageState,
  getPcbStageStatus,
  getStageStatusDisplay,
  getStageTimestamp,
  getCamStageStatus,
} from '../../../server/src/lib/camPipelineUtils';
import FilmUploadForm from './FilmUploadForm';
import JobCardForm from './JobCardForm';
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

const formatDate = (value) => {
  if (!value) return '--';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '--';
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

const CamDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Authentication state
  const [token, setTokenState] = useState(() => getMfgToken());
  const [operator, setOperator] = useState(() => getMfgUser());

  // UI state
  const [activeSection, setActiveSection] = useState('work-orders');
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [summary, setSummary] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
  const [travelerEvents, setTravelerEvents] = useState([]);
  const [travelerEventsLoading, setTravelerEventsLoading] = useState(false);
  const [lastFetchedWorkOrderId, setLastFetchedWorkOrderId] = useState(null);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [jobCardDialogOpen, setJobCardDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [etchingConfirmOpen, setEtchingConfirmOpen] = useState(false);

  // Permissions
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

  const handleProceedToSheetCutting = async () => {
    try {
      await api.mfgUpdateWorkOrder(token, selectedWorkOrderId, { stage: 'sheet_cutting', travelerReady: true });
      
      // Log traveler event
      await api.mfgLogTravelerEvent(token, selectedWorkOrderId, {
        action: 'release',
        station: operator?.workCenter || 'CAM Intake',
        note: 'Work order proceeded to Sheet Cutting stage',
        metadata: {
          toStage: 'sheet_cutting',
          fromStage: 'cam',
          travelerReady: 'true',
        },
      });
      
      toast({ title: 'Work order proceeded to sheet cutting' });
      loadDashboardData(token);
      setEtchingConfirmOpen(false);
    } catch (err) {
      toast({
        title: 'Failed to update status',
        description: err?.message || 'Unable to proceed work order.',
        variant: 'destructive',
      });
      setEtchingConfirmOpen(false);
    }
  };

  const handleCancelEtching = () => {
    setEtchingConfirmOpen(false);
  };

  const operatorRole = useMemo(() => operator?.role || '', [operator]);

  // Authentication check
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
          console.log('Operator loaded:', res.operator);
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

  // Load dashboard data
  const loadDashboardData = async (tokenValue) => {
    setSummaryLoading(true);
    setBoardsLoading(true);
    try {
      const [summaryRes, workOrdersRes] = await Promise.all([
        api.mfgSummary(tokenValue),
        api.mfgWorkOrders(tokenValue, {
          focus: 'cam',
          limit: 50,
          search: searchQuery || undefined
        }),
      ]);
      setSummary(summaryRes?.summary || null);
      setWorkOrders(Array.isArray(workOrdersRes?.workOrders) ? workOrdersRes.workOrders : []);
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
  }, [token, searchQuery]);

  // Sign out handler
  const handleSignOut = () => {
    clearMfgUser();
    clearMfgToken();
    setTokenState(null);
    setOperator(null);
    navigate('/mfgpcbxpress/login');
    toast({ title: 'Signed out' });
  };

  // Download file handler
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

  // Refresh handler
  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    await loadDashboardData(token);
    setRefreshing(false);
  };

  // Work order selection
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
        label: parts.filter(Boolean).join(' • ') || id,
        workOrder: wo,
      });
    });
    return Array.from(map.values());
  }, [workOrders]);

  const selectedWorkOrder = useMemo(() => {
    if (!selectedWorkOrderId) return null;
    return allWorkOrders.find((item) => item.id === selectedWorkOrderId)?.workOrder || null;
  }, [allWorkOrders, selectedWorkOrderId]);

  // Traveler events
  const fetchTravelerEvents = async (workOrderId, { showToast = true } = {}) => {
    if (!token || !workOrderId) return;
    setTravelerEventsLoading(true);
    try {
      console.log('Fetching traveler events for workOrderId:', workOrderId);
      const res = await api.mfgListTravelerEvents(token, workOrderId, { limit: 50 });
      console.log('Traveler events response:', res);

      const events = Array.isArray(res?.events) ? res.events : [];
      setTravelerEvents(events);
      setLastFetchedWorkOrderId(workOrderId);
    } catch (err) {
      console.error('Failed to fetch traveler events:', err);
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
        : workOrderOrId?._id || workOrderOrId?.id || null;
    if (!id) {
      setSelectedWorkOrderId(null);
      return;
    }
    setSelectedWorkOrderId(id);
    // Force refresh traveler events when explicitly selecting a work order
    setLastFetchedWorkOrderId(null);
  };

  // Traveler actions
  const handleTravelerAction = async (action, workOrder, { boardContext } = {}) => {
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

    setEventSubmitting(true);
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

  // Auto-select first work order and load events
  useEffect(() => {
    if (!token) return;
    if (allWorkOrders.length === 0) {
      setSelectedWorkOrderId(null);
      setTravelerEvents([]);
      setLastFetchedWorkOrderId(null);
      return;
    }
    const availableIds = allWorkOrders.map((item) => item.id);
    let targetId = selectedWorkOrderId;
    if (!targetId || !availableIds.includes(targetId)) {
      targetId = availableIds[0];
      setSelectedWorkOrderId(targetId);
    }
    console.log('useEffect - targetId:', targetId, 'lastFetchedWorkOrderId:', lastFetchedWorkOrderId);
    if (targetId && targetId !== lastFetchedWorkOrderId) {
      fetchTravelerEvents(targetId, { showToast: false });
    }
  }, [allWorkOrders, selectedWorkOrderId, token, lastFetchedWorkOrderId]);

  // Topbar handlers
  const handleBulkImport = () => {
    toast({ title: 'Bulk import not implemented yet' });
  };

  const handleExport = () => {
    const rows = filteredWorkOrders.map((wo) => ({
      WO: wo.woNumber,
      Product: wo.product || '',
      Customer: wo.customer || '',
      Stage: wo.stage || '',
      Priority: wo.priority || 'normal',
      DueDate: wo.dueDate ? new Date(wo.dueDate).toISOString() : '',
    }));
    const header = Object.keys(rows[0] || { WO: '', Product: '', Customer: '', Stage: '', Priority: '', DueDate: '' });
    const csv = [header.join(','), ...rows.map(r => header.map(h => String(r[h]).replace(/[",\n\r]/g, ' ')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cam_work_orders_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast({ title: 'Exported work orders CSV' });
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleFilter = () => {
    setFilterPendingOnly((v) => !v);
    toast({ title: filterPendingOnly ? 'Showing all' : 'Showing pending only' });
  };

  const handleAddWorkOrder = async () => {
    if (!token) return;
    try {
      const product = window.prompt('Enter product name');
      if (!product) return;
      const customer = window.prompt('Enter customer name') || '';
      const qtyStr = window.prompt('Enter quantity', '1');
      const quantity = Math.max(1, parseInt(qtyStr || '1', 10));
      const body = { product, customer, quantity, stage: 'cam', travelerReady: true };
      await api.mfgCreateWorkOrder(token, body);
      toast({ title: 'Work order created' });
      await loadDashboardData(token);
    } catch (err) {
      toast({ title: 'Failed to add work order', description: err?.message || 'Try again', variant: 'destructive' });
    }
  };

  // settings removed

  // Filtered work orders for board
  const filteredWorkOrders = useMemo(() => {
    const q = String(searchQuery || '').toLowerCase();
    return workOrders.filter((wo) => {
      const matchesQ = !q || [wo.woNumber, wo.product, wo.customer].some(v => String(v || '').toLowerCase().includes(q));
      const pendingOnly = !filterPendingOnly || String(wo?.camStatus?.state || 'pending').toLowerCase() === 'pending';
      return matchesQ && pendingOnly;
    });
  }, [workOrders, searchQuery, filterPendingOnly]);

  // Sidebar handlers
  const handleFileUpload = () => {
    toast({ title: 'File upload not implemented yet' });
  };

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {

      case 'work-orders':
        return (
          <WorkOrderBoard
            title="CAM Work Queue"
            subtitle="Work orders requiring CAM processing."
            icon={<ClipboardList className="h-5 w-5 text-primary" />}
            workOrders={filteredWorkOrders}
            columns={[
              { key: 'woNumber', label: 'WO', className: 'whitespace-nowrap' },
              { key: 'product', label: 'Product' },
              {
                key: 'customerFiles',
                label: 'Customer Files',
                render: (wo) => {
                  const customerFiles = (wo.camAttachments || []).filter(att => (att.category === 'intake' || att.kind === 'bom') && ['gerber', 'bom'].includes(att.kind));
                  if (customerFiles.length === 0) return <span className="text-muted-foreground">None</span>;
                  return (
                    <div className="flex flex-col gap-1">
                      {customerFiles.map(file => (
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
                }
              },
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
            emptyMessage="No work orders in your CAM queue."
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
        );

      case 'cam-uploads':
        return (
          <div className="space-y-6">
            {/* File Upload */}
            {selectedWorkOrderId ? (
              <CamFileUpload
                workOrderId={selectedWorkOrderId}
                token={token}
                category="intake"
                onUploadComplete={() => loadDashboardData(token)}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>CAM File Upload</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Select a work order to upload CAM files.
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Customer Files View */}
            {selectedWorkOrder ? (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Files for {selectedWorkOrder.woNumber}</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const customerFiles = (selectedWorkOrder.camAttachments || []).filter(att => ['gerber', 'bom'].includes(att.kind));
                    if (customerFiles.length === 0) {
                      return <p className="text-sm text-muted-foreground">No customer Gerber/BOM files available for this work order.</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {customerFiles.map((file) => (
                          <div key={file.filename} className="flex items-center gap-2 p-2 border rounded">
                            <FileText className="h-4 w-4" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{file.originalName || file.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                              </p>
                              {file.camNumber && (
                                <p className="text-xs text-blue-600 font-medium">
                                  CAM: {file.camNumber}
                                </p>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              file.kind === 'gerber' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-green-100 text-green-800 border border-green-200'
                            }`}>
                              {file.kind === 'gerber' ? 'Gerber' : 'BOM'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(selectedWorkOrderId, file.filename)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Select a work order to view customer files.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'nc-drill-upload':
        return (
          <div className="space-y-6">
            {/* NC Drill File Upload */}
            {selectedWorkOrderId ? (
              <CamFileUpload
                workOrderId={selectedWorkOrderId}
                token={token}
                category="nc_drill"
                onUploadComplete={() => loadDashboardData(token)}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>NC Drill File Upload</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Select a work order to upload drill files (.drl, .txt).
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'film-upload':
        return (
          <div className="space-y-6">
            {/* Film File Upload */}
            {selectedWorkOrderId ? (
              <CamFileUpload
                workOrderId={selectedWorkOrderId}
                token={token}
                category="phototools"
                onUploadComplete={() => loadDashboardData(token)}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Film File Upload</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Select a work order to upload film files (.png, .jpg, etc.).
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'job-card-creation':
        return (
          <div className="space-y-6">
            {/* Job Card Creation */}
            {selectedWorkOrder ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Create Job Card</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create a job card for work order {selectedWorkOrder.woNumber}.
                    </p>
                    <Button onClick={() => setJobCardDialogOpen(true)}>
                      Create Job Card
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Proceed to Next Stage</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      After creating the job card, proceed the work order to sheet cutting.
                    </p>
                    <Button
                      onClick={async () => {
                        if (!selectedWorkOrderId || !selectedWorkOrder) return;
                        const atts = selectedWorkOrder.camAttachments || [];
                        const hasGerber = atts.some(a => a.kind === 'gerber');
                        const hasBom = atts.some(a => a.kind === 'bom');
                        const hasJobCard = atts.some(a => a.kind === 'job_card');
                        if (!hasGerber || !hasBom || !hasJobCard) {
                          toast({
                            title: 'Missing required files',
                            description: 'Ensure GERBER, BOM, and Job Card are uploaded before proceeding.',
                            variant: 'destructive',
                          });
                          return;
                        }
                        setEtchingConfirmOpen(true);
                      }}
                      disabled={!selectedWorkOrder}
                    >
                      Proceed to SheetCutting
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Job Card Creation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Select a work order to create a job card.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'job-cards-list':
        return (
          <div className="space-y-6">
            {/* Job Cards List */}
            <Card>
              <CardHeader>
                <CardTitle>Job Cards List</CardTitle>
                <p className="text-sm text-muted-foreground">
                  View all job cards for work orders in the CAM process.
                </p>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Filter work orders that have job card attachments
                  const workOrdersWithJobCards = workOrders.filter(wo =>
                    (wo.camAttachments || []).some(att => att.kind === 'job_card')
                  );

                  if (workOrdersWithJobCards.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        No job cards found. Create job cards from the "Job Card Creation" section.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {workOrdersWithJobCards.map((wo) => {
                        const jobCardAttachments = (wo.camAttachments || []).filter(att => att.kind === 'job_card');
                        return (
                          <div key={wo._id || wo.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium">{wo.woNumber} - {wo.product}</h3>
                              <span className="text-sm text-muted-foreground">
                                {jobCardAttachments.length} job card{jobCardAttachments.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {jobCardAttachments.map((attachment, index) => (
                                <div key={`${attachment.filename}_${attachment.uploadedAt}_${wo._id || wo.id}_${index}`} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <FileText className="h-4 w-4" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{attachment.originalName || attachment.filename}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatFileSize(attachment.size)} • Uploaded {new Date(attachment.uploadedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 border border-cyan-200">
                                    Job Card
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownload(wo._id || wo.id, attachment.filename)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        );

      case 'update-job-cards':
        return (
          <div className="space-y-6">
            {/* Update Job Cards Section */}
            <Card>
              <CardHeader>
                <CardTitle>Update Job Cards</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage job card approvals, comments, and updates for all work orders.
                </p>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Filter work orders that have job card attachments
                  const workOrdersWithJobCards = workOrders.filter(wo =>
                    (wo.camAttachments || []).some(att => att.kind === 'job_card')
                  );

                  if (workOrdersWithJobCards.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        No job cards found to update. Create job cards from the "Job Card Creation" section.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {workOrdersWithJobCards.map((wo) => (
                        <UpdateJobCardSection
                          key={wo._id || wo.id}
                          workOrderId={wo._id || wo.id}
                          workOrderNumber={wo.woNumber}
                          token={token}
                          onJobCardUpdated={() => {
                            loadDashboardData(token);
                            toast({ title: 'Job card updated successfully' });
                          }}
                        />
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        );

      case 'pcb-pipeline':
        return (
          <div className="space-y-6">
            {/* PCB Pipeline View */}
            <Card>
              <CardHeader>
                <CardTitle>PCB Manufacturing Pipeline</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Overview of the complete PCB fabrication process from CAM to dispatch.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* PCB Fabrication Pipeline Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">PCB Fabrication Process</h3>
                    <div className="space-y-3">
                      {pcbPipelineStages.map((stage, index) => {
                        const derivedState = getPcbStageStatus(selectedWorkOrder, stage.id);
                        const statusDisplay = getStageStatusDisplay(derivedState);

                        return (
                          <div
                            key={stage.id}
                            className="border rounded-lg p-3 shadow-sm bg-white"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center ${
                                    derivedState === 'completed' ? 'bg-green-500 text-white' :
                                    derivedState === 'in_progress' ? 'bg-blue-500 text-white' :
                                    'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {index + 1}
                                </span>
                                <div>
                                  <p className="font-medium text-sm text-gray-900">{stage.label}</p>
                                  {stage.description ? (
                                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                                  ) : null}
                                </div>
                              </div>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusDisplay.className}`}>
                                {statusDisplay.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        title="CAM Dashboard"
        subtitle="Computer-Aided Manufacturing"
        operator={operator}
        workCenter={operator?.workCenter || 'CAM Station'}
        loading={loading}
        loadingMessage="Loading CAM workspace..."
      />
    );
  }

  console.log('Rendering CAM Dashboard with activeSection:', activeSection);
  return (
    <DashboardLayout
      title="CAM Dashboard"
      subtitle="Computer-Aided Manufacturing"
      operator={operator}
      workCenter={operator?.workCenter || 'CAM Station'}
      onRefresh={handleRefresh}
      refreshing={refreshing || summaryLoading || boardsLoading}
      onSignOut={handleSignOut}
      loading={loading}
    >
      <div className="flex gap-6">
        {/* Sidebar */}
        <CamSidebar
          activeSection={activeSection}
          onNavigate={setActiveSection}
        />

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Topbar */}
          <CamTopbar
            onExport={handleExport}
            onSearch={handleSearch}
            onFilter={handleFilter}
            onAddWorkOrder={handleAddWorkOrder}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={loading}
          />


          {/* Content */}
          {renderContent()}

          {/* Traveler Activity Log */}
          <TravelerActivityLog
            selectedWorkOrder={selectedWorkOrder}
            selectedWorkOrderId={selectedWorkOrderId}
            travelerEvents={travelerEvents}
            loading={travelerEventsLoading}
            onRefresh={() => {
              if (selectedWorkOrder) {
                const workOrderId = selectedWorkOrder._id || selectedWorkOrder.id;
                if (workOrderId) fetchTravelerEvents(workOrderId, { showToast: true });
              }
            }}
            onSelectWorkOrder={handleSelectWorkOrder}
            workOrders={allWorkOrders}
            onTravelerAction={handleTravelerAction}
            hasPermission={hasPermission}
            eventSubmitting={eventSubmitting}
          />

          {/* Job Card Form Dialog */}
          <JobCardForm
            open={jobCardDialogOpen}
            onOpenChange={setJobCardDialogOpen}
            workOrderId={selectedWorkOrderId}
            token={token}
            onJobCardCreated={() => {
              loadDashboardData(token);
              toast({ title: 'Job card created successfully' });
              setJobCardDialogOpen(false);
            }}
          />

          {/* Etching Confirmation Dialog */}
          <Dialog open={etchingConfirmOpen} onOpenChange={setEtchingConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Proceed to SheetCutting</DialogTitle>
                <DialogDescription>
                  This will move the work order to the sheet cutting stage and mark it as traveler ready. Are you sure?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={handleCancelEtching}>
                  Cancel
                </Button>
                <Button onClick={handleProceedToSheetCutting}>
                  OK
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default CamDashboard;
