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
import { Download, Eye, RefreshCw, Zap, Upload, FileText, Image, Archive } from 'lucide-react';
import {
  DashboardLayout,
  WorkOrderBoard,
  ProcessActivityLog,
  ChecklistView,
   SummaryTile,
  TransferView,
  VScoringSidebar,
  PcbPipelinePanel,
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

const VScoringDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [token, setTokenState] = useState(() => getMfgToken());
  const [operator, setOperator] = useState(() => getMfgUser());

  const [activeSection, setActiveSection] = useState('work-orders');
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
  
  // File upload state for Blade Specs
  const [bladeSpecFiles, setBladeSpecFiles] = useState([]);
  const [uploadingBladeSpec, setUploadingBladeSpec] = useState(false);

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
          focus: 'v_score',
          limit: 50,
        }),
      ]);

      setSummary(summaryRes?.summary || null);

      const fetchedWorkOrders = Array.isArray(workOrdersRes?.workOrders)
        ? workOrdersRes.workOrders
        : [];

      const readyForVScore = fetchedWorkOrders.filter((wo) => {
        if (!wo) return false;
        const stage = String(wo.stage || '').toLowerCase();
        if (stage !== 'v_score') return false;
        const routingState = String(wo?.cncRoutingStatus?.state || '').toLowerCase();
        return routingState === 'approved';
      });

      setWorkOrders(readyForVScore);
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
  }, [token]);

  // Fetch blade spec files when work order changes
  useEffect(() => {
    if (selectedWorkOrderId) {
      fetchBladeSpecFiles();
    } else {
      setBladeSpecFiles([]);
    }
  }, [selectedWorkOrderId]);

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
      return;
    }
    setSelectedWorkOrderId(id);
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

  const renderJobCards = () => (
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

  // File upload handlers for Blade Specs
  const handleBladeSpecFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    // Debug: Check what selectedWorkOrderId contains
    console.log('selectedWorkOrderId:', selectedWorkOrderId);
    console.log('typeof selectedWorkOrderId:', typeof selectedWorkOrderId);
    
    // Check if files are selected
    if (!files.length) {
      toast({
        title: 'No files selected',
        description: 'Please select files to upload.',
        variant: 'destructive',
      });
      return;
    }
    
    // Check if work order is selected
    if (!selectedWorkOrderId) {
      toast({
        title: 'No work order selected',
        description: 'Please select a work order before uploading files.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file types
    const allowedTypes = [
      'application/zip',
      'application/x-zip-compressed',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp'
    ];

    const validFiles = files.filter(file => allowedTypes.includes(file.type) || file.name.toLowerCase().endsWith('.txt'));
    
    if (validFiles.length !== files.length) {
      toast({
        title: 'Invalid file types',
        description: 'Only ZIP, TXT, and image files are allowed.',
        variant: 'destructive',
      });
      return;
    }

    if (validFiles.length === 0) {
      toast({
        title: 'No valid files',
        description: 'No valid files found in selection.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingBladeSpec(true);
    try {
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData();
        
        // Debug: Log what we're sending
        console.log('Uploading file:', file.name, file.type, file.size);
        console.log('Work Order ID:', selectedWorkOrderId);
        console.log('typeof selectedWorkOrderId:', typeof selectedWorkOrderId);
        
        formData.append('file', file);
        formData.append('category', 'intake'); // Use allowed category
        formData.append('kind', 'spec'); // Add required 'kind' field
        formData.append('station', 'v_scoring');
        formData.append('description', `Blade specification file uploaded from V-Scoring dashboard - ${file.name}`); // Special description for identification
        
        // Debug: Log FormData contents
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
          console.log(key, value instanceof File ? `File: ${value.name}` : value);
        }

        console.log('About to call API with workOrderId:', selectedWorkOrderId);
        const response = await api.mfgUploadAttachment(token, selectedWorkOrderId, formData);
        return response;
      });

      await Promise.all(uploadPromises);
      
      toast({
        title: 'Files uploaded successfully',
        description: `${validFiles.length} blade specification file(s) uploaded.`,
      });

      // Refresh the files list
      await fetchBladeSpecFiles();
    } catch (err) {
      console.error('Upload error details:', err);
      toast({
        title: 'Upload failed',
        description: err?.message || 'Failed to upload blade specification files.',
        variant: 'destructive',
      });
    } finally {
      setUploadingBladeSpec(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const fetchBladeSpecFiles = async () => {
    if (!selectedWorkOrderId) return;
    
    try {
      const response = await api.mfgListAttachments(token, selectedWorkOrderId);
      const allAttachments = response?.attachments || [];
      
      // Filter only files uploaded from Blade Specs (by description)
      const bladeSpecFiles = allAttachments.filter(attachment => 
        attachment.description && 
        attachment.description.includes('Blade specification file uploaded from V-Scoring dashboard')
      );
      
      setBladeSpecFiles(bladeSpecFiles);
    } catch (err) {
      console.error('Failed to fetch blade spec files:', err);
    }
  };

  const handleDownloadBladeSpec = async (filename) => {
    if (!selectedWorkOrderId) return;
    
    try {
      const blob = await api.mfgDownloadAttachment(token, selectedWorkOrderId, filename);
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
        description: err?.message || 'Failed to download file.',
        variant: 'destructive',
      });
    }
  };

  const getFileIcon = (filename) => {
    const extension = filename?.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'zip':
        return <Archive className="h-4 w-4" />;
      case 'txt':
        return <FileText className="h-4 w-4" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return <Image className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const renderBladeSpecs = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Blade Specifications</CardTitle>
        <p className="text-sm text-muted-foreground">
          Review recorded blade and scoring parameters for this work order.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* File Upload Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium">Blade Specification Files</h4>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="blade-spec-upload"
                  multiple
                  accept=".zip,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                  onChange={handleBladeSpecFileUpload}
                  className="hidden"
                  disabled={uploadingBladeSpec || !selectedWorkOrderId}
                />
                <Button
                  size="sm"
                  onClick={() => document.getElementById('blade-spec-upload')?.click()}
                  disabled={uploadingBladeSpec || !selectedWorkOrderId}
                >
                  {uploadingBladeSpec ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Upload ZIP, TXT, and image files (JPG, PNG, GIF, BMP, WebP) for blade specifications.
            </p>
          </div>

          {/* Files List */}
          {bladeSpecFiles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Uploaded Files</h4>
              <div className="space-y-2">
                {bladeSpecFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.filename)}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{file.filename}</p>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            Blade Spec
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.uploadedAt).toLocaleString()} • {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadBladeSpec(file.filename)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Parameters */}
          <div>
            <h4 className="text-sm font-medium mb-3">Scoring Parameters</h4>
            {selectedWorkOrder?.vScoringParams ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {Object.entries(selectedWorkOrder.vScoringParams).map(([key, value]) => (
                  <div key={key} className="rounded-lg border p-3 bg-muted/40">
                    <div className="text-xs uppercase text-muted-foreground">{key}</div>
                    <div className="font-medium">{String(value ?? '--')}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No blade specifications recorded.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'work-orders':
        return (
          <WorkOrderBoard
            title="V-Scoring Work Queue"
            subtitle="Score panels for separation and downstream processing."
            icon={<Zap className="h-5 w-5 text-primary" />}
            workOrders={workOrders}
            columns={[
              { key: 'woNumber', label: 'WO', className: 'whitespace-nowrap' },
              { key: 'product', label: 'Product' },
              {
                key: 'bladeSpec',
                label: 'Blade Spec Files',
                render: (wo) => {
                  const files = (wo.camAttachments || []).filter((att) =>
                    ['blade_spec', 'job_card'].includes(att.kind)
                  );
                  if (files.length === 0) return <span className="text-muted-foreground">None</span>;
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
              },
              {
                key: 'vScoringStatus',
                label: 'Scoring State',
                render: (wo) => (
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusVariant(
                        wo?.vScoringStatus?.state
                      )}`}
                    >
                      {wo?.vScoringStatus?.state || 'pending'}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      Owner: {wo?.vScoringStatus?.owner || '--'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'releaseTarget',
                label: 'Release Target',
                render: (wo) => formatDateTime(wo?.vScoringStatus?.releaseTarget),
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
                ),
              },
              { key: 'actions', label: 'Actions', align: 'right' },
            ]}
            loading={boardsLoading}
            emptyMessage="No work orders in the V-scoring queue."
            selectedWorkOrderId={selectedWorkOrderId}
            onSelectWorkOrder={handleSelectWorkOrder}
            renderActions={(wo) => (
              <>
                {hasPermission('process:read') && (
                  <Button variant="ghost" size="sm" onClick={() => handleSelectWorkOrder(wo)}>
                    View Log
                  </Button>
                )}
                {hasPermission('process:release') && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={processProcessEventSubmitting}
                    onClick={() =>
                      handleProcessAction('release', wo, { boardContext: 'v_score' })
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
                      handleProcessAction('hold', wo, { boardContext: 'v_score' })
                    }
                  >
                    Hold
                  </Button>
                )}
              </>
            )}
          />
        );

      case 'job-cards':
        return renderJobCards();

      case 'blade-specs':
        return renderBladeSpecs();

      case 'checklist':
        return (
          <ChecklistView
            workOrder={selectedWorkOrder}
            token={token}
            station="v_score"
            checklistKey="vScoringChecklist"
            statusKey="vScoringStatus"
            onChecklistUpdate={(updatedWorkOrder) => {
              if (updatedWorkOrder) {
                handleWorkOrderUpdated(updatedWorkOrder);
              }
            }}
          />
        );

      case 'final':
        return (
          <TransferView
            workOrder={selectedWorkOrder}
            token={token}
            currentStage="v_score"
            nextStage="flying_probe"
            onTransfer={() => {
              loadDashboardData(token);
            }}
            onTravelerAction={handleProcessAction}
            hasPermission={hasPermission}
          />
        );

      case 'pcb-pipeline':
        return (
          <PcbPipelinePanel
            selectedWorkOrder={selectedWorkOrder}
            highlightStage="v_score"
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        title="V-Scoring Station Dashboard"
        subtitle="Score panels for controlled breakaway"
        operator={operator}
        workCenter={operator?.workCenter || 'V-Scoring Station'}
        loading={loading}
        loadingMessage="Loading V-scoring workspace..."
      />
    );
  }

  return (
    <DashboardLayout
      title="V-Scoring Station Dashboard"
      subtitle="Score panels for controlled breakaway"
      operator={operator}
      workCenter={operator?.workCenter || 'V-Scoring Station'}
      onRefresh={handleRefresh}
      refreshing={refreshing || summaryLoading || boardsLoading}
      onSignOut={handleSignOut}
      loading={loading}
    >
      <div className="flex gap-6">
        <VScoringSidebar activeSection={activeSection} onNavigate={setActiveSection} />

        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryTile
              title="Active Orders"
              value={summary?.v_score?.active || workOrders.length || 0}
              description="Currently in V-scoring"
            />
            <SummaryTile
              title="Due Today"
              value={summary?.v_score?.dueToday || 0}
              description="Scheduled for scoring"
            />
            <SummaryTile
              title="On Hold"
              value={summary?.v_score?.onHold || 0}
              status="warning"
              description="Requires attention"
            />
          </div>

          {renderContent()}

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

export default VScoringDashboard;
