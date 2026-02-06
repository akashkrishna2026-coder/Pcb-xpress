import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api, getApiBaseUrl } from '@/lib/api';
import {
  getMfgUser,
  setMfgUser,
  clearMfgUser,
  getMfgToken,
  clearMfgToken,
} from '@/lib/storage';
import {
  Factory,
  ClipboardList,
  FileText,
  Settings,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Scan,
  CheckCircle as CheckCircleIcon,
  XCircle,
  Pause,
  Download,
  Image,
} from 'lucide-react';
import {
  DashboardLayout,
  ProcessActivityLog,
  CNCDrillingSidebar,
  ChecklistCard,
} from '@/components/manufacturing';
import UpdateJobCardSection from './UpdateJobCardSection';
import CamFileUpload from '@/components/manufacturing/CamFileUpload';
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

const CNCDrillingDashboard = () => {
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
  const [travelerEvents, setTravelerEvents] = useState([]);
  const [travelerEventsLoading, setTravelerEventsLoading] = useState(false);
  const [lastFetchedTravelerOrderId, setLastFetchedTravelerOrderId] = useState(null);
  const [travelerEventSubmitting, setTravelerEventSubmitting] = useState(false);
  const [scanInput, setScanInput] = useState('');

  // Checklist state
  const [checklistState, setChecklistState] = useState({
    setup: [
      { label: 'Review drill chart', completed: false },
      { label: 'Verify program', completed: false },
      { label: 'Load bits', completed: false },
      { label: 'Calibrate machine', completed: false },
      { label: 'Set backing material', completed: false },
      { label: 'Verify coordinates', completed: false },
    ],
    quality: [
      { label: 'Check hole sizes', completed: false },
      { label: 'Inspect for burrs', completed: false },
      { label: 'Verify location accuracy', completed: false },
      { label: 'Check breakout', completed: false },
      { label: 'Update documentation', completed: false },
      { label: 'Update traveler', completed: false },
    ],
  });

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
          focus: 'station',
          station: operator?.workCenter,
          role: 'cnc_drilling',
          stage: 'cnc_drilling',
          currentStation: 'CNC Drilling',
          limit: 50,
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
    if (!token || !operator) return;
    loadDashboardData(token);
  }, [token, operator]);

  // Sign out handler
  const handleSignOut = () => {
    clearMfgUser();
    clearMfgToken();
    setTokenState(null);
    setOperator(null);
    navigate('/mfgpcbxpress/login');
    toast({ title: 'Signed out' });
  };

  // Checklist handlers
  const handleToggleChecklistItem = (category, index) => {
    setChecklistState(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) =>
        i === index ? { ...item, completed: !item.completed } : item
      ),
    }));
  };

  // Refresh handler
  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    await loadDashboardData(token);
    setRefreshing(false);
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
  const fetchTravelerEvents = async (workOrderId, { showToast = true } = {}) => {
    if (!token || !workOrderId) return;
    setTravelerEventsLoading(true);
    try {
      const res = await api.mfgListTravelerEvents(token, workOrderId, { limit: 50 });
      setTravelerEvents(Array.isArray(res?.events) ? res.events : []);
      setLastFetchedTravelerOrderId(workOrderId);
    } catch (err) {
      if (showToast) {
        toast({
          title: 'Failed to load process activity',
          description: err?.message || 'Unable to fetch process activity.',
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
      setPreservedWorkOrder(null);
      setLastFetchedTravelerOrderId(null);
      return;
    }
    setSelectedWorkOrderId(id);
    setLastFetchedTravelerOrderId(null);
    
    // Preserve the work order data if it's being selected
    if (typeof workOrderOrId === 'object' && workOrderOrId) {
      setPreservedWorkOrder(workOrderOrId);
    }
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

    setTravelerEventSubmitting(true);
    try {
      await api.mfgLogTravelerEvent(token, workOrderId, {
        action,
        station: operator?.workCenter || workOrder?.stage || boardContext || 'CNC Drilling',
        note: noteValue,
        metadata: {
          board: boardContext || '',
          priority: workOrder?.priority || '',
          stage: workOrder?.stage || '',
        },
      });
      toast({ title: 'Traveler event recorded' });
      await fetchTravelerEvents(workOrderId, { showToast: false });
      await loadDashboardData(token); // Refresh work orders
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

  const handleScanTraveler = async () => {
    if (!scanInput.trim()) {
      toast({
        title: 'Scan required',
        description: 'Please enter a work order number to scan.',
        variant: 'destructive',
      });
      return;
    }

    const scannedWO = workOrders.find(wo =>
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

    await handleTravelerAction('scan', scannedWO, { boardContext: 'scan' });
    setScanInput('');
  };

  // Auto-select first work order and load events
  useEffect(() => {
    if (!token) return;
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
  }, [allWorkOrders, selectedWorkOrderId, token, lastFetchedTravelerOrderId]);

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'work-orders':
        return (
          <div className="space-y-6">
            {/* Work Order Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Work Order Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Work Order</label>
                    <select
                      value={selectedWorkOrderId || ''}
                      onChange={(e) => handleSelectWorkOrder(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      <option value="">Select a work order...</option>
                      {allWorkOrders.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Work Order Details */}
            {selectedWorkOrder && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Work Order Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">WO Number</p>
                        <p className="text-lg font-semibold">{selectedWorkOrder.woNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Product</p>
                        <p className="text-lg">{selectedWorkOrder.product || '--'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Customer</p>
                        <p className="text-lg">{selectedWorkOrder.customer || '--'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                        <p className="text-lg">{selectedWorkOrder.quantity || '--'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Priority</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityVariant(selectedWorkOrder.priority)}`}>
                          {selectedWorkOrder.priority || 'normal'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                        <p className="text-lg">{formatDate(selectedWorkOrder.dueDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Stage</p>
                        <p className="text-lg">{selectedWorkOrder.stage || '--'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <p className="text-lg">{selectedWorkOrder.status || '--'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Material Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Material Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${selectedWorkOrder.materials?.ready ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium">
                          Materials {selectedWorkOrder.materials?.ready ? 'Ready' : 'Not Ready'}
                        </span>
                      </div>
                      {selectedWorkOrder.materials?.shortages && selectedWorkOrder.materials.shortages.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-red-600">Material Shortages:</p>
                          {selectedWorkOrder.materials.shortages.map((shortage, index) => (
                            <div key={index} className="text-sm text-red-600">
                              {shortage.partNumber || shortage.material} - Shortage: {shortage.shortageQty || 0}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Job Cards & Panel Drawings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Job Cards & Panel Drawings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const jobCards = (selectedWorkOrder.camAttachments || []).filter(att => att.kind === 'job_card');
                      const panelDrawings = (selectedWorkOrder.camAttachments || []).filter(att => ['gerber', 'bom', 'spec'].includes(att.kind));

                      if (jobCards.length === 0 && panelDrawings.length === 0) {
                        return <p className="text-sm text-muted-foreground">No job cards or panel drawings available.</p>;
                      }

                      return (
                        <div className="space-y-6">
                          {jobCards.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Job Cards</h4>
                              <div className="space-y-2">
                                {jobCards.map((file) => (
                                  <div key={file.filename} className="flex items-center gap-2 p-2 border rounded">
                                    <FileText className="h-4 w-4" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm truncate">{file.originalName || file.filename}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatFileSize(file.size)} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownload(selectedWorkOrderId, file.filename)}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {panelDrawings.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Panel Drawings & Specifications</h4>
                              <div className="space-y-2">
                                {panelDrawings.map((file) => (
                                  <div key={file.filename} className="flex items-center gap-2 p-2 border rounded">
                                    <FileText className="h-4 w-4" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm truncate">{file.originalName || file.filename}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatFileSize(file.size)} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownload(selectedWorkOrderId, file.filename)}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
              </>
            )}
          </div>
        );

      case 'job-cards':
        return (
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

      case 'nc-drill-file':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>NC Drill Files</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View and manage NC drill files for CNC drilling operations.
                </p>
                {selectedWorkOrder ? (
                  <div className="space-y-4">
                    <p className="text-sm">Work Order: {selectedWorkOrder.woNumber}</p>

                    <CamFileUpload
                      workOrderId={selectedWorkOrderId}
                      token={token}
                      category="nc_drill"
                    />

                    {(() => {
                      const drillFiles = (selectedWorkOrder.camAttachments || []).filter(att => att.kind === 'drill_file');

                      if (drillFiles.length === 0) {
                        return <p className="text-sm text-muted-foreground">No NC drill files available for this work order.</p>;
                      }

                      return (
                        <div className="space-y-4">
                          {drillFiles.map((file) => (
                            <Card key={file.filename} className="border-l-4 border-l-green-500">
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <FileText className="h-4 w-4" />
                                      <span className="font-medium">{file.originalName || file.filename}</span>
                                      {file.approvalStatus && (
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          file.approvalStatus === 'approved'
                                            ? 'text-green-700 bg-green-50 border border-green-200'
                                            : file.approvalStatus === 'rejected'
                                            ? 'text-red-700 bg-red-50 border border-red-200'
                                            : 'text-yellow-700 bg-yellow-50 border border-yellow-200'
                                        }`}>
                                          {file.approvalStatus.toUpperCase()}
                                        </span>
                                      )}
                                      {file.version && file.version > 1 && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                          v{file.version}
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-sm text-muted-foreground space-y-1">
                                      <div>Size: {formatFileSize(file.size)}</div>
                                      <div>Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</div>
                                      {file.uploadedBy && (
                                        <div>Creator: {typeof file.uploadedBy === 'object' ? file.uploadedBy.name || file.uploadedBy.email : file.uploadedBy}</div>
                                      )}
                                      {file.description && (
                                        <div>Description: {file.description}</div>
                                      )}
                                      {file.approvedAt && (
                                        <div>Approved: {new Date(file.approvedAt).toLocaleDateString()}</div>
                                      )}
                                      {file.rejectionReason && (
                                        <div className="text-red-600">
                                          Rejected: {file.rejectionReason}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex gap-2 ml-4">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(file.url, '_blank')}
                                      className="flex items-center gap-1"
                                    >
                                      <Image className="h-4 w-4" />
                                      Preview
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownload(selectedWorkOrderId, file.filename)}
                                      className="flex items-center gap-1"
                                    >
                                      <Download className="h-4 w-4" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a work order to view NC drill files.</p>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'checklist':
        return (
          <div className="space-y-6">
            {selectedWorkOrder ? (
              <div className="space-y-4">
                <p className="text-sm">Work Order: {selectedWorkOrder.woNumber}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ChecklistCard
                    title="CNC Drilling Setup Checklist"
                    items={checklistState.setup}
                    onToggleItem={(index) => handleToggleChecklistItem('setup', index)}
                  />
                  <ChecklistCard
                    title="Drilling Quality Standards"
                    items={checklistState.quality}
                    onToggleItem={(index) => handleToggleChecklistItem('quality', index)}
                  />
                </div>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">Progress: </span>
                        <span className="text-muted-foreground">
                          {checklistState.setup.filter(item => item.completed).length + checklistState.quality.filter(item => item.completed).length} / {checklistState.setup.length + checklistState.quality.length} items completed
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setChecklistState({
                            setup: checklistState.setup.map(item => ({ ...item, completed: false })),
                            quality: checklistState.quality.map(item => ({ ...item, completed: false })),
                          });
                          toast({ title: 'Checklist reset' });
                        }}
                      >
                        Reset Checklist
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Select a work order to access the checklist.</p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'final':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Final Approval - Proceed to Sanding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Review and approve the work order to proceed to sanding stage.
                </p>
                {selectedWorkOrder ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Work Order</p>
                        <p className="text-lg font-semibold">{selectedWorkOrder.woNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Current Stage</p>
                        <p className="text-lg">{selectedWorkOrder.stage || 'CNC Drilling'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Next Stage</p>
                        <p className="text-lg font-semibold text-blue-600">Sanding</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <p className="text-lg">{selectedWorkOrder.status || 'Ready'}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Approval Checklist:</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`h-4 w-4 ${checklistState.setup.every(item => item.completed) && checklistState.quality.every(item => item.completed) ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">CNC drilling checklist completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Job cards reviewed and approved</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">NC drill file loaded and verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Traveler scanned and logged</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={async () => {
                          if (!selectedWorkOrderId) return;
                          try {
                            await handleTravelerAction('release', selectedWorkOrder, { boardContext: 'final' });
                            await api.mfgUpdateWorkOrder(token, selectedWorkOrderId, { stage: 'sanding' });
                            toast({ title: 'Work order approved and proceeded to sanding' });
                            // Refresh traveler events one more time after stage update
                            await fetchTravelerEvents(selectedWorkOrderId, { showToast: false });
                            setSelectedWorkOrderId(null);
                            setScanInput('');
                            setTravelerEvents([]);
                            setLastFetchedTravelerOrderId(null);
                            setChecklistState((prev) => ({
                              ...prev,
                              setup: prev.setup.map((item) => ({ ...item, completed: false })),
                              quality: prev.quality.map((item) => ({ ...item, completed: false })),
                            }));
                            loadDashboardData(token);
                          } catch (err) {
                            toast({
                              title: 'Failed to approve work order',
                              description: err?.message || 'Unable to proceed work order.',
                              variant: 'destructive',
                            });
                          }
                        }}
                        disabled={
                          !selectedWorkOrder ||
                          !hasPermission('traveler:release') ||
                          !checklistState.setup.every(item => item.completed) ||
                          !checklistState.quality.every(item => item.completed)
                        }
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Proceed to Sanding
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a work order to proceed with final approval.</p>
                )}
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
                        const baseState = normalizeStageState(
                          getPcbStageStatus(selectedWorkOrder, stage.id)
                        );
                        const derivedState =
                          stage.id === 'cnc_drilling' && baseState === 'pending'
                            ? 'in_progress'
                            : baseState;
                        const statusDisplay = getStageStatusDisplay(derivedState);

                        return (
                          <div
                            key={stage.id}
                            className={`border rounded-lg p-3 shadow-sm transition-colors ${
                              stage.id === 'cnc_drilling' ? 'border-blue-400 bg-blue-50/40' : 'bg-white'
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
        title="CNC Drilling Dashboard"
        subtitle="CNC Drilling Operations"
        operator={operator}
        workCenter={operator?.workCenter || 'CNC Drilling Station'}
        loading={loading}
        loadingMessage="Loading CNC drilling workspace..."
      />
    );
  }

  console.log('Rendering CNC Drilling Dashboard with activeSection:', activeSection);

  // Add global work order name display
  const globalWorkOrderDisplay = selectedWorkOrder ? (
    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2">
        <Factory className="h-5 w-5 text-blue-600" />
        <span className="text-sm font-medium text-blue-800">Current Work Order:</span>
        <span className="text-lg font-semibold text-blue-900">{selectedWorkOrder.woNumber}</span>
        <span className="text-sm text-blue-700">• {selectedWorkOrder.product || 'No Product'}</span>
      </div>
    </div>
  ) : null;

  return (
    <DashboardLayout
      title="CNC Drilling Dashboard"
      subtitle="CNC Drilling Operations"
      operator={operator}
      workCenter={operator?.workCenter || 'CNC Drilling Station'}
      onRefresh={handleRefresh}
      refreshing={refreshing || summaryLoading || boardsLoading}
      onSignOut={handleSignOut}
      loading={loading}
    >
      <div className="flex gap-6">
        {/* Sidebar */}
        <CNCDrillingSidebar
          activeSection={activeSection}
          onNavigate={setActiveSection}
        />

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Global Work Order Display */}
          {globalWorkOrderDisplay}

          {/* Content */}
          {renderContent()}

          {/* Process Activity Log */}
          <ProcessActivityLog
            selectedWorkOrder={displayWorkOrder}
            selectedWorkOrderId={selectedWorkOrderId}
            travelerEvents={travelerEvents}
            loading={travelerEventsLoading}
            onRefresh={() => {
              if (displayWorkOrder) {
                const workOrderId = displayWorkOrder._id || displayWorkOrder.id || displayWorkOrder.woNumber;
                if (workOrderId) fetchTravelerEvents(workOrderId, { showToast: true });
              }
            }}
            onSelectWorkOrder={handleSelectWorkOrder}
            workOrders={allWorkOrders}
            onTravelerAction={handleTravelerAction}
            hasPermission={hasPermission}
            eventSubmitting={travelerEventSubmitting}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CNCDrillingDashboard;