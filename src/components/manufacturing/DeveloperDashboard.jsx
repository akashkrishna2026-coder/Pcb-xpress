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
  FlaskConical,
  Eye,
  Layers,
  Ruler,
  FileImage,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';
import {
  DashboardLayout,
  WorkOrderBoard,
  ProcessActivityLog,
  ChecklistCard,
  DeveloperSidebar,
  DeveloperTopbar,
  FileViewerContainer,
  GerberViewer,
  PanelLayoutViewer,
  JobCardViewer,
  FilmViewer,
  ParametersView,
  ChecklistView,
  TransferView,
} from '@/components/manufacturing';
import {
  pcbPipelineStages,
  normalizeStageState,
  getPcbStageStatus,
  getStageStatusDisplay,
} from '../../../server/src/lib/camPipelineUtils';

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

const developerStateVariant = (state) => {
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

const DeveloperDashboard = () => {
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
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
  const [processEvents, setProcessEvents] = useState([]);
  const [processEventsLoading, setProcessEventsLoading] = useState(false);
  const [lastFetchedProcessOrderId, setLastFetchedProcessOrderId] = useState(null);
  const [processProcessEventSubmitting, setProcessEventSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // File viewer state
  const [activeFileViewer, setActiveFileViewer] = useState('gerber');
  const [selectedFile, setSelectedFile] = useState(null);

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
          focus: 'developer',
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

  // Preserve the last selected work order data even after it moves to next stage
  const [preservedWorkOrder, setPreservedWorkOrder] = useState(null);
  
  const displayWorkOrder = useMemo(() => {
    if (selectedWorkOrder) return selectedWorkOrder;
    if (preservedWorkOrder && preservedWorkOrder._id === selectedWorkOrderId) return preservedWorkOrder;
    return null;
  }, [selectedWorkOrder, preservedWorkOrder, selectedWorkOrderId]);

  // Traveler events
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
      setPreservedWorkOrder(null);
      setLastFetchedProcessOrderId(null);
      return;
    }
    setSelectedWorkOrderId(id);
    setLastFetchedProcessOrderId(null);
    
    // Preserve the work order data if it's being selected
    if (typeof workOrderOrId === 'object' && workOrderOrId) {
      setPreservedWorkOrder(workOrderOrId);
    }
  };

  // Traveler actions
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
      await api.mfgLogProcessEvent(token, workOrderId, {
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

  // Auto-select first work order and load events
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

  // Topbar handlers
  const handleBulkImport = () => {
    toast({ title: 'Bulk import not implemented yet' });
  };

  const handleExport = () => {
    toast({ title: 'Export not implemented yet' });
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleFilter = () => {
    toast({ title: 'Filter not implemented yet' });
  };

  const handleAddWorkOrder = () => {
    toast({ title: 'Add work order not implemented yet' });
  };

  const handleSettings = () => {
    toast({ title: 'Settings not implemented yet' });
  };

  // File viewer handlers
  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const handleFileViewerChange = (viewer) => {
    setActiveFileViewer(viewer);
  };

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'work-orders':
        return (
          <WorkOrderBoard
            title="Developer Work Queue"
            subtitle="Work orders requiring developer processing."
            icon={<FlaskConical className="h-5 w-5 text-primary" />}
            workOrders={workOrders}
            columns={[
              { key: 'woNumber', label: 'WO', className: 'whitespace-nowrap' },
              { key: 'product', label: 'Product' },
              {
                key: 'developerFiles',
                label: 'Developer Files',
                render: (wo) => {
                  const developerFiles = (wo.camAttachments || []).filter(att =>
                    ['gerber', 'developer_file', 'job_card'].includes(att.kind)
                  );
                  if (developerFiles.length === 0) return <span className="text-muted-foreground">None</span>;
                  return (
                    <div className="flex flex-col gap-1">
                      {developerFiles.map(file => (
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
                key: 'developerStatus',
                label: 'Developer state',
                render: (wo) => (
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${developerStateVariant(
                        wo?.developerStatus?.state
                      )}`}
                    >
                      {wo?.developerStatus?.state || 'pending'}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      Owner: {wo?.developerStatus?.owner || '--'}
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
                render: (wo) => formatDateTime(wo?.developerStatus?.releaseTarget)
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
            emptyMessage="No work orders in your developer queue."
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
                {hasPermission('developer:release') && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={processProcessEventSubmitting}
                    onClick={() =>
                      handleProcessAction('release', wo, { boardContext: 'developer' })
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
                      handleProcessAction('hold', wo, { boardContext: 'developer' })
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

      case 'file-viewer':
        return (
          <FileViewerContainer
            workOrder={selectedWorkOrder}
            activeViewer={activeFileViewer}
            selectedFile={selectedFile}
            onViewerChange={handleFileViewerChange}
            onFileSelect={handleFileSelect}
            token={token}
          />
        );

      case 'parameters':
        return (
          <ParametersView
            workOrder={selectedWorkOrder}
            token={token}
            station="developer"
            onUpdate={(updatedWorkOrder) => {
              if (updatedWorkOrder) {
                handleWorkOrderUpdated(updatedWorkOrder);
              }
            }}
          />
        );

      case 'checklist':
        return (
          <ChecklistView
            workOrder={selectedWorkOrder}
            token={token}
            station="developer"
            checklistKey="developerChecklist"
            statusKey="developerStatus"
            onChecklistUpdate={(updatedWorkOrder) => {
              if (updatedWorkOrder) {
                handleWorkOrderUpdated(updatedWorkOrder);
              }
            }}
          />
        );

      case 'transfer':
        return (
          <TransferView
            workOrder={selectedWorkOrder}
            token={token}
            currentStage="developer"
            nextStage="etching"
            onTransfer={() => {
              loadDashboardData(token);
            }}
            onProcessAction={handleProcessAction}
            hasPermission={hasPermission}
          />
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
                        const baseState = normalizeStageState(
                          getPcbStageStatus(selectedWorkOrder, stage.id)
                        );
                        const derivedState =
                          stage.id === 'developer' && baseState === 'pending'
                            ? 'in_progress'
                            : baseState;
                        const statusDisplay = getStageStatusDisplay(derivedState);

                        return (
                          <div
                            key={stage.id}
                            className={`border rounded-lg p-3 shadow-sm transition-colors ${
                              stage.id === 'developer' ? 'border-blue-400 bg-blue-50/40' : 'bg-white'
                            }`}
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
        title="Developer Dashboard"
        subtitle="Photoresist Development & Processing"
        operator={operator}
        workCenter={operator?.workCenter || 'Developer Station'}
        loading={loading}
        loadingMessage="Loading developer workspace..."
      />
    );
  }

  console.log('Rendering Developer Dashboard with activeSection:', activeSection);
  return (
    <DashboardLayout
      title="Developer Dashboard"
      subtitle="Photoresist Development & Processing"
      operator={operator}
      workCenter={operator?.workCenter || 'Developer Station'}
      onRefresh={handleRefresh}
      refreshing={refreshing || summaryLoading || boardsLoading}
      onSignOut={handleSignOut}
      loading={loading}
    >
      <div className="flex gap-6">
        {/* Sidebar */}
        <DeveloperSidebar
          activeSection={activeSection}
          onNavigate={setActiveSection}
        />

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Topbar */}
          <DeveloperTopbar
            onBulkImport={handleBulkImport}
            onExport={handleExport}
            onSearch={handleSearch}
            onFilter={handleFilter}
            onAddWorkOrder={handleAddWorkOrder}
            onSettings={handleSettings}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={loading}
          />

          {/* Content */}
          {renderContent()}

          {/* Process Activity Log */}
          <ProcessActivityLog
            selectedWorkOrder={displayWorkOrder}
            selectedWorkOrderId={selectedWorkOrderId}
            travelerEvents={processEvents}
            loading={processEventsLoading}
            onRefresh={() => {
              if (displayWorkOrder) {
                const workOrderId = displayWorkOrder._id || displayWorkOrder.id;
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

export default DeveloperDashboard;
