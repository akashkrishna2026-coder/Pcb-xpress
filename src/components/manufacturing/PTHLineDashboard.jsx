import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  LayoutDashboard,
  RefreshCw,
  Scan,
  CheckCircle as CheckCircleIcon,
  XCircle,
  Pause,
  Download,
  Image,
  Save,
} from 'lucide-react';
import {
  DashboardLayout,
  ProcessActivityLog,
  PTHSidebar,
  ChecklistCard,
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

const PTHLineDashboard = () => {
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
  const [scanInput, setScanInput] = useState('');

  // PTH Parameters state
  const [pthParameters, setPthParameters] = useState({
    platingThickness: '',
    temperature: '',
    dwellTime: '',
    chemistryConcentration: '',
    anodeCondition: '',
    cathodeCondition: '',
    filtrationStatus: '',
    notes: ''
  });

  // Checklist state
  const [checklistState, setChecklistState] = useState({
    setup: [
      { label: 'Verify PTH specifications from work order', completed: false },
      { label: 'Check chemistry concentrations and temperatures', completed: false },
      { label: 'Inspect conveyor system and dwell times', completed: false },
      { label: 'Load appropriate plating program for board thickness', completed: false },
      { label: 'Verify anode and cathode conditions', completed: false },
      { label: 'Check filtration and chemical replenishment systems', completed: false }
    ],
    quality: [
      { label: 'Measure hole wall copper thickness (25-35μm)', completed: false },
      { label: 'Check for voids, nodules, or plating defects', completed: false },
      { label: 'Verify aspect ratio and throw power', completed: false },
      { label: 'Inspect for proper coverage in deep holes', completed: false },
      { label: 'Document plating parameters and bath conditions', completed: false },
      { label: 'Scan traveler and update status before moving to imaging', completed: false }
    ]
  });

  // Final checklist state
  const [finalChecklistState, setFinalChecklistState] = useState([
    { label: 'PTH setup checklist completed', completed: false },
    { label: 'PTH parameters entered and verified', completed: false },
    { label: 'Quality control standards met', completed: false },
    { label: 'Traveler scanned and logged', completed: false },
    { label: 'Ready to proceed to Brushing & Drying', completed: false }
  ]);

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
          role: 'pth_line',
          stage: 'pth',
          currentStation: 'PTH',
          limit: 50,
        }),
      ]);
      setSummary(summaryRes?.summary || null);
      setWorkOrders(Array.isArray(workOrdersRes?.workOrders) ? workOrdersRes.workOrders : []);
    } catch (err) {
      toast({
        title: 'Unable to load PTH station data',
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

  const handleToggleFinalChecklistItem = (index) => {
    setFinalChecklistState(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // PTH Parameters handlers
  const handleParameterChange = (field, value) => {
    setPthParameters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveParameters = () => {
    // Here you could save to backend or local storage
    toast({ title: 'PTH parameters saved successfully' });
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
      const input = window.prompt('Enter reason (optional):', '');
      if (input === null) {
        return;
      }
      noteValue = input;
    }

    setProcessEventSubmitting(true);
    try {
      await api.mfgLogProcessEvent(token, workOrderId, {
        action,
        station: operator?.workCenter || 'PTH Line',
        note: noteValue,
        metadata: {
          board: boardContext || '',
          priority: workOrder?.priority || '',
          stage: workOrder?.stage || '',
        },
      });
      toast({ title: 'Traveler event recorded' });
      await fetchProcessEvents(workOrderId, { showToast: false });
      await loadDashboardData(token); // Refresh work orders
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

    await handleProcessAction('scan', scannedWO, { boardContext: 'scan' });
    setScanInput('');
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

  // Update final checklist based on other sections
  useEffect(() => {
    const setupCompleted = checklistState.setup.every(item => item.completed);
    const qualityCompleted = checklistState.quality.every(item => item.completed);
    const parametersEntered = Object.values(pthParameters).some(value => value.trim() !== '');
    const travelerChecklistCompleted = checklistState.quality.some(item =>
      item.label.toLowerCase().includes('traveler') && item.completed
    );
    const readyToProceed = setupCompleted && qualityCompleted && parametersEntered && travelerChecklistCompleted;

    setFinalChecklistState(prev =>
      prev.map((item, index) => {
        switch (index) {
          case 0:
            return { ...item, completed: setupCompleted };
          case 1:
            return { ...item, completed: parametersEntered };
          case 2:
            return { ...item, completed: qualityCompleted };
          case 3:
            return { ...item, completed: travelerChecklistCompleted };
          case 4:
            return { ...item, completed: readyToProceed };
          default:
            return item;
        }
      })
    );
  }, [checklistState, pthParameters]);

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
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => handleProcessAction('scan', selectedWorkOrder, { boardContext: 'work-order-overview' })}
                        disabled={processProcessEventSubmitting}
                        variant="outline"
                      >
                        <Scan className="h-4 w-4 mr-2" />
                        Scan Traveler
                      </Button>
                      <Button
                        onClick={() => handleProcessAction('release', selectedWorkOrder, { boardContext: 'work-order-overview' })}
                        disabled={processProcessEventSubmitting || !hasPermission('process:release')}
                        variant="outline"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Release
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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

      case 'checklist':
        return (
          <div className="space-y-6">
            {selectedWorkOrder ? (
              <div className="space-y-4">
                <p className="text-sm">Work Order: {selectedWorkOrder.woNumber}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ChecklistCard
                    title="PTH Line Setup Checklist"
                    items={checklistState.setup}
                    onToggleItem={(index) => handleToggleChecklistItem('setup', index)}
                  />
                  <ChecklistCard
                    title="PTH Quality Control Standards"
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

      case 'pth-parameters':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>PTH Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter PTH process parameters for the selected work order.
                </p>
                {selectedWorkOrder ? (
                  <div className="space-y-4">
                    <p className="text-sm">Work Order: {selectedWorkOrder.woNumber}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="platingThickness">Plating Thickness (μm)</Label>
                        <Input
                          id="platingThickness"
                          type="number"
                          placeholder="25-35"
                          value={pthParameters.platingThickness}
                          onChange={(e) => handleParameterChange('platingThickness', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="temperature">Temperature (°C)</Label>
                        <Input
                          id="temperature"
                          type="number"
                          placeholder="Enter temperature"
                          value={pthParameters.temperature}
                          onChange={(e) => handleParameterChange('temperature', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dwellTime">Dwell Time (seconds)</Label>
                        <Input
                          id="dwellTime"
                          type="number"
                          placeholder="Enter dwell time"
                          value={pthParameters.dwellTime}
                          onChange={(e) => handleParameterChange('dwellTime', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="chemistryConcentration">Chemistry Concentration</Label>
                        <Input
                          id="chemistryConcentration"
                          placeholder="Enter concentration"
                          value={pthParameters.chemistryConcentration}
                          onChange={(e) => handleParameterChange('chemistryConcentration', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="anodeCondition">Anode Condition</Label>
                        <Input
                          id="anodeCondition"
                          placeholder="Enter anode condition"
                          value={pthParameters.anodeCondition}
                          onChange={(e) => handleParameterChange('anodeCondition', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cathodeCondition">Cathode Condition</Label>
                        <Input
                          id="cathodeCondition"
                          placeholder="Enter cathode condition"
                          value={pthParameters.cathodeCondition}
                          onChange={(e) => handleParameterChange('cathodeCondition', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filtrationStatus">Filtration Status</Label>
                        <Input
                          id="filtrationStatus"
                          placeholder="Enter filtration status"
                          value={pthParameters.filtrationStatus}
                          onChange={(e) => handleParameterChange('filtrationStatus', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <textarea
                        id="notes"
                        className="w-full p-2 border rounded-md"
                        rows={3}
                        placeholder="Additional notes..."
                        value={pthParameters.notes}
                        onChange={(e) => handleParameterChange('notes', e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveParameters} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="h-4 w-4 mr-2" />
                        Save Parameters
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a work order to enter PTH parameters.</p>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'final-checklist':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Final Checklist - Proceed to Brushing & Drying</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete final verification before proceeding to the Brushing & Drying station.
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
                        <p className="text-lg">{selectedWorkOrder.stage || 'PTH Line'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Next Stage</p>
                        <p className="text-lg font-semibold text-blue-600">Brushing & Drying</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <p className="text-lg">{selectedWorkOrder.status || 'Ready'}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Final Approval Checklist:</h4>
                      <div className="space-y-2">
                        {finalChecklistState.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircleIcon className={`h-4 w-4 ${item.completed ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className="text-sm">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={async () => {
                          if (!selectedWorkOrderId) return;
                          try {
                            await handleProcessAction('release', selectedWorkOrder, { boardContext: 'final' });
                            await api.mfgUpdateWorkOrderStage(token, selectedWorkOrderId, 'brushing');
                            toast({ title: 'Work order approved and proceeded to Brushing & Drying' });
                            // Refresh process events one more time after stage update
                            await fetchProcessEvents(selectedWorkOrderId, { showToast: false });
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
                          !hasPermission('process:release') ||
                          !finalChecklistState.every(item => item.completed)
                        }
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Proceed to Brushing & Drying
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

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        title="PTH Line Dashboard"
        subtitle="PTH Line Operations"
        operator={operator}
        loading={loading}
        loadingMessage="Loading PTH workspace..."
      />
    );
  }

  console.log('Rendering PTH Line Dashboard with activeSection:', activeSection);

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
      title="PTH Line Dashboard"
      subtitle="PTH Line Operations"
      operator={operator}
      workCenter={operator?.workCenter || 'PTH Line Station'}
      onRefresh={handleRefresh}
      refreshing={refreshing || summaryLoading || boardsLoading}
      onSignOut={handleSignOut}
      loading={loading}
    >
      <div className="flex gap-6">
        {/* Sidebar */}
        <PTHSidebar
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
            processEvents={processEvents}
            loading={processEventsLoading}
            onRefresh={() => {
              if (displayWorkOrder) {
                const workOrderId = displayWorkOrder._id || displayWorkOrder.id;
                if (workOrderId) fetchProcessEvents(workOrderId, { showToast: true });
              }
            }}
            onSelectWorkOrder={handleSelectWorkOrder}
            workOrders={allWorkOrders}
            onProcessAction={handleProcessAction}
            hasPermission={hasPermission}
            processProcessEventSubmitting={processProcessEventSubmitting}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PTHLineDashboard;
