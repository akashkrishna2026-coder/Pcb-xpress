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
  SummaryTile,
  WorkOrderBoard,
  ProcessActivityLog,
  ChecklistView,
  TransferView,
} from '@/components/manufacturing';
import PcbPipelinePanel from './PcbPipelinePanel';
import AttachmentUploadPanel from './AttachmentUploadPanel';
import { getNextPcbStage } from '../../../server/src/lib/camPipelineUtils';

const humanizeKind = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const stageReferenceMeta = {
  materials: { label: 'Material Lot / Batch No', placeholder: 'Enter material lot or batch number' },
  sheet_cutting: { label: 'Panel Drawing No', placeholder: 'Enter panel drawing number' },
  cnc_drilling: { label: 'Drilling Batch No', placeholder: 'Enter drilling batch number' },
  pth_line: { label: 'PTH Batch No', placeholder: 'Enter PTH batch number' },
  photo_imaging: { label: 'Photoimaging Batch No', placeholder: 'Enter photoimaging batch number' },
  photoimaging: { label: 'Photoimaging Batch No', placeholder: 'Enter photoimaging batch number' },
  photo_imaging_qa: { label: 'Photoimaging QA Ref', placeholder: 'Enter photoimaging QA reference' },
  developer: { label: 'Developer Batch No', placeholder: 'Enter developer batch number' },
  etching: { label: 'Etching Batch No', placeholder: 'Enter etching batch number' },
  etching_station: { label: 'Etching Batch No', placeholder: 'Enter etching batch number' },
  etch_qa: { label: 'Etching QA Ref', placeholder: 'Enter etching QA reference' },
  tin_stripping: { label: 'Tin Stripping Batch No', placeholder: 'Enter tin stripping batch number' },
  solder_mask: { label: 'Solder Mask Lot No', placeholder: 'Enter solder mask lot number' },
  solder_mask_qa: { label: 'Solder Mask QA Ref', placeholder: 'Enter solder mask QA reference' },
  legend_printing: { label: 'Legend Print Batch No', placeholder: 'Enter legend print batch number' },
  legend_print: { label: 'Legend Print Batch No', placeholder: 'Enter legend print batch number' },
  surface_finish: { label: 'Surface Finish Batch No', placeholder: 'Enter surface finish batch number' },
  brushing: { label: 'Brushing Batch No', placeholder: 'Enter brushing batch number' },
  final_qc: { label: 'Final QC Ref', placeholder: 'Enter final QC reference' },
  testing: { label: 'Test Report / Batch No', placeholder: 'Enter test report or batch number' },
  final_qc_pdir: { label: 'Final QC (PDIR) Ref', placeholder: 'Enter final QC PDIR reference' },
  final_qc_pdi: { label: 'Final QC (PDI) Ref', placeholder: 'Enter final QC PDI reference' },
};

const normalizeStageId = (value) => {
  const v = String(value || '').toLowerCase();
  if (v === 'photoimaging') return 'photo_imaging';
  if (v === 'etching_station') return 'etching';
  if (v === 'hal_station') return 'surface_finish';
  return v;
};

const StationSidebar = ({ items = [], activeSection, onNavigate }) => (
  <aside className="w-64 bg-white border-r border-gray-200">
    <nav className="p-4">
      <ul className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <li key={item.id}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={`w-full justify-start ${
                  isActive
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => onNavigate && onNavigate(item.id)}
              >
                {Icon ? <Icon className="h-4 w-4 mr-3" /> : null}
                {item.label}
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  </aside>
);

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

const renderAttachmentSection = ({
  selectedWorkOrder,
  token,
  onWorkOrderUpdated,
  handleRefresh,
  refreshing,
  handleDownload,
  kinds = [],
  categories = [],
  title,
  description,
  emptyLabel = 'No files uploaded.',
  attachmentField = 'camAttachments', // Allow configurable attachment field
  referenceLabel,
  referencePlaceholder,
  referenceRequired = false,
  accept = '*/*',
}) => (
  <div className="space-y-6">
    <AttachmentUploadPanel
      workOrder={selectedWorkOrder}
      token={token}
      onWorkOrderUpdated={onWorkOrderUpdated}
      title={title}
      description={description}
      kinds={kinds.map((kind) => ({ value: kind, label: humanizeKind(kind) }))}
      defaultKind={kinds[0]}
      category={categories?.[0] || 'assembly'}
      accept={accept}
      emptyLabel={emptyLabel}
      referenceLabel={referenceLabel}
      referencePlaceholder={referencePlaceholder}
      referenceRequired={referenceRequired}
    />

    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selectedWorkOrder ? (
          <div className="space-y-3">
            {(() => {
              const attachments = (selectedWorkOrder[attachmentField] || []).filter((att) => {
                const matchesKind = !kinds?.length || kinds.includes(att.kind);
                const matchesCategory = !categories?.length || categories.includes(att.category);
                return matchesKind && matchesCategory;
              });

              if (attachments.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">{emptyLabel}</p>
                );
              }

              return attachments.map((file) => (
                <div
                  key={file.filename}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <div className="font-medium">{file.originalName || file.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      Uploaded {formatDateTime(file.uploadedAt)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() =>
                        handleDownload(selectedWorkOrder._id || selectedWorkOrder.id, file.filename)
                      }
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ));
            })()}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a work order to view files.
          </p>
        )}
      </CardContent>
    </Card>
  </div>
);

const buildBoardColumns = ({
  attachments,
  statusKey,
  statusLabel,
  releaseLabel,
  attachmentField = 'camAttachments', // Allow configurable attachment field
}) => {
  const columns = [
    { key: 'woNumber', label: 'WO', className: 'whitespace-nowrap' },
    { key: 'product', label: 'Product' },
  ];

  if (attachments) {
    columns.push({
      key: 'attachments',
      label: attachments.label || 'Attachments',
      render: (wo, handleDownload) => {
        const kinds = attachments.kinds || [];
        const categories = attachments.categories || [];
        const files = (wo[attachmentField] || []).filter((att) => {
          const matchesKind = !kinds.length || kinds.includes(att.kind);
          const matchesCategory = !categories.length || categories.includes(att.category);
          return matchesKind && matchesCategory;
        });
        if (files.length === 0) {
          return <span className="text-muted-foreground">None</span>;
        }
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
    });
  }

  if (statusKey) {
    columns.push({
      key: 'status',
      label: statusLabel || 'Status',
      render: (wo) => (
        <div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusVariant(
              wo?.[statusKey]?.state
            )}`}
          >
            {wo?.[statusKey]?.state || 'pending'}
          </span>
          <div className="text-xs text-muted-foreground">
            Owner: {wo?.[statusKey]?.owner || '--'}
          </div>
        </div>
      ),
    });
  }

  if (releaseLabel && statusKey) {
    columns.push({
      key: 'releaseTarget',
      label: releaseLabel,
      render: (wo) => formatDateTime(wo?.[statusKey]?.releaseTarget),
    });
  }

  columns.push({
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
  });

  columns.push({ key: 'actions', label: 'Actions', align: 'right' });

  return columns;
};

const defaultFilter = (stage, statusKey) => (wo) =>
  wo && String(wo.stage || '').toLowerCase() === stage.toLowerCase()
  && (!statusKey ||
    ['approved', 'ready', 'completed'].includes(
      String(wo?.[statusKey]?.state || '').toLowerCase()
    ));

const ConfigurableStationDashboard = ({ config, customSidebar: CustomSidebar }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    title,
    subtitle,
    focus,
    stage,
    summaryKey,
    statusKey,
    checklistKey,
    nextStage,
    navItems = [],
    summaryTiles = [],
    filterWorkOrders,
    board = {},
    attachmentsEmptyText = 'No files uploaded.',
  } = config;

  const [token, setTokenState] = useState(() => getMfgToken());
  const [operator, setOperator] = useState(() => getMfgUser());
  const [activeSection, setActiveSection] = useState(navItems[0]?.id || 'work-orders');
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
          focus,
          limit: 50,
        }),
      ]);

      setSummary(summaryRes?.summary || null);

      const fetchedWorkOrders = Array.isArray(workOrdersRes?.workOrders)
        ? workOrdersRes.workOrders
        : [];

      const filterFn =
        typeof filterWorkOrders === 'function'
          ? filterWorkOrders
          : defaultFilter(stage, config.readyStatusKey || statusKey);

      setWorkOrders(fetchedWorkOrders.filter((wo) => filterFn(wo)));
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

  // Preserve the last selected work order data even after it moves to next stage
  const [preservedWorkOrder, setPreservedWorkOrder] = useState(null);
  
  const displayWorkOrder = useMemo(() => {
    if (selectedWorkOrder) return selectedWorkOrder;
    if (preservedWorkOrder && preservedWorkOrder._id === selectedWorkOrderId) return preservedWorkOrder;
    return null;
  }, [selectedWorkOrder, preservedWorkOrder, selectedWorkOrderId]);

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
        : workOrderOrId?._id || workOrderOrId?.id || null;
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
        station: operator?.workCenter || workOrder?.stage || boardContext || config.boardContext || stage,
        note: noteValue,
        metadata: {
          board: boardContext || config.boardContext || stage || '',
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

  const boardColumns = useMemo(
    () =>
      buildBoardColumns({
        attachments: board.attachments,
        statusKey,
        statusLabel: board.statusLabel,
        releaseLabel: board.releaseLabel,
        attachmentField: config.attachmentField || 'camAttachments', // Use configurable attachment field
      }),
    [board.attachments, board.releaseLabel, board.statusLabel, statusKey, config.attachmentField]
  );

  const summaryValues = summary?.[summaryKey] || {};

  const renderContent = () => {
    const activeItem = navItems.find((item) => item.id === activeSection);
    if (!activeItem || activeItem.type === 'board') {
      return (
        <WorkOrderBoard
          title={board.title || `${config.boardTitle || stage} Work Queue`}
          subtitle={board.subtitle || 'Track work orders in this station.'}
          icon={board.icon || <Zap className="h-5 w-5 text-primary" />}
          workOrders={workOrders}
          columns={boardColumns.map((column) =>
            column.key === 'attachments'
              ? {
                  ...column,
                  render: (wo) => column.render(wo, handleDownload),
                }
              : column
          )}
          loading={boardsLoading}
          emptyMessage={board.emptyMessage || 'No work orders in this queue.'}
          selectedWorkOrderId={selectedWorkOrderId}
          onSelectWorkOrder={handleSelectWorkOrder}
          renderActions={(wo) => (
            <>
              {hasPermission('process:read') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleSelectWorkOrder(wo);
                  }}
                >
                  View Log
                </Button>
              )}
              {hasPermission('process:release') && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={processProcessEventSubmitting}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleProcessAction('release', wo, { boardContext: config.boardContext || stage });
                  }}
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
                    handleProcessAction('hold', wo, { boardContext: config.boardContext || stage })
                  }
                >
                  Hold
                </Button>
              )}
            </>
          )}
        />
      );
    }

    if (activeItem.type === 'attachments') {
      const meta =
        stageReferenceMeta[normalizeStageId(config.stage)] ||
        stageReferenceMeta[normalizeStageId(stage)] ||
        null;
      return renderAttachmentSection({
        selectedWorkOrder,
        token,
        onWorkOrderUpdated: handleWorkOrderUpdated,
        handleRefresh,
        refreshing,
        handleDownload,
        kinds: activeItem.attachmentKinds || [],
        categories: activeItem.attachmentCategories || [],
        title: activeItem.title || activeItem.label,
        description: activeItem.description,
        emptyLabel: activeItem.emptyLabel || attachmentsEmptyText,
        attachmentField: activeItem.attachmentField || config.attachmentField || 'camAttachments', // Use navItem-specific attachment field
        referenceLabel: activeItem.referenceLabel || config.referenceLabel || meta?.label,
        referencePlaceholder: activeItem.referencePlaceholder || config.referencePlaceholder || meta?.placeholder,
        referenceRequired: Boolean(activeItem.referenceRequired || config.referenceRequired || false),
        accept: activeItem.accept || '*/*',
      });
    }

    if (activeItem.type === 'checklist') {
      return (
        <ChecklistView
          workOrder={selectedWorkOrder}
          token={token}
          station={stage}
          checklistKey={checklistKey}
          statusKey={statusKey}
          onChecklistUpdate={(updatedWorkOrder) => {
            if (updatedWorkOrder) {
              handleWorkOrderUpdated(updatedWorkOrder);
            }
          }}
        />
      );
    }

    if (activeItem.type === 'transfer') {
      const resolvedNextStage =
        selectedWorkOrder && selectedWorkOrder.pcbLayers
          ? getNextPcbStage(selectedWorkOrder, stage)
          : nextStage;

      return (
        <TransferView
          workOrder={selectedWorkOrder}
          token={token}
          currentStage={stage}
          nextStage={resolvedNextStage}
          onTransfer={() => {
            loadDashboardData(token);
          }}
          onProcessAction={handleProcessAction}
          hasPermission={hasPermission}
        />
      );
    }

    if (activeItem.type === 'custom' && typeof activeItem.render === 'function') {
      return activeItem.render({
        selectedWorkOrder,
        handleRefresh,
        refreshing,
        handleDownload,
        token,
        stage,
        onWorkOrderUpdated: handleWorkOrderUpdated,
      });
    }

    if (activeItem.type === 'pcb_pipeline') {
      return (
        <PcbPipelinePanel
          selectedWorkOrder={selectedWorkOrder}
          highlightStage={config.stage}
        />
      );
    }

    if (activeItem.type === 'traveler_activity') {
      return (
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
          workOrders={workOrders}
          onTravelerAction={handleProcessAction}
          hasPermission={hasPermission}
          eventSubmitting={processProcessEventSubmitting}
        />
      );
    }

    return null;
  };

  if (loading) {
    return (
      <DashboardLayout
        title={title}
        subtitle={subtitle}
        operator={operator}
        workCenter={operator?.workCenter || stage}
        loading={loading}
        loadingMessage={`Loading ${stage} workspace...`}
      />
    );
  }

  return (
    <DashboardLayout
      title={title}
      subtitle={subtitle}
      operator={operator}
      workCenter={operator?.workCenter || stage}
      onRefresh={handleRefresh}
      refreshing={refreshing || summaryLoading || boardsLoading}
      onSignOut={handleSignOut}
      loading={loading}
    >
      <div className="flex gap-6">
        {CustomSidebar ? (
          <CustomSidebar
            items={navItems}
            activeSection={activeSection}
            onNavigate={setActiveSection}
          />
        ) : (
          <StationSidebar
            items={navItems}
            activeSection={activeSection}
            onNavigate={setActiveSection}
          />
        )}

        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(summaryTiles.length > 0 ? summaryTiles : [
              {
                title: 'Active Orders',
                description: `Currently in ${stage.replace(/_/g, ' ')}`,
                valueKey: 'active',
              },
              {
                title: 'Due Today',
                description: 'Scheduled for completion',
                valueKey: 'dueToday',
              },
              {
                title: 'On Hold',
                description: 'Requires attention',
                valueKey: 'onHold',
                status: 'warning',
              },
            ]).map((tile) => (
              <SummaryTile
                key={tile.title}
                title={tile.title}
                description={tile.description}
                status={tile.status}
                value={
                  summaryValues?.[tile.valueKey] ??
                  (tile.valueKey === 'active' ? workOrders.length : 0)
                }
              />
            ))}
          </div>

          {renderContent()}

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

export { StationSidebar };
export default ConfigurableStationDashboard;

