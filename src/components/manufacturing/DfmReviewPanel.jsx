import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import {
  FileText,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Settings,
  PackageSearch,
  Calendar,
  User,
  Tag,
  ListChecks,
  File,
  ClipboardList,
} from 'lucide-react';
import DashboardCard from './DashboardCard';
import DfmTemplates from './DfmTemplates';
import DfmChecklists from './DfmChecklists';

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
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const severityColors = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  info: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusColors = {
  open: 'bg-red-100 text-red-800 border-red-200',
  acknowledged: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
};

const camStateColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_review: 'bg-blue-100 text-blue-800 border-blue-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  blocked: 'bg-red-100 text-red-800 border-red-200',
};

const DfmReviewPanel = ({ workOrderId, token, operator, hasPermission }) => {
  const { toast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState('exceptions');
  const [workOrder, setWorkOrder] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [dfmExceptions, setDfmExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [dfmLoading, setDfmLoading] = useState(false);
  const [updatingCamStatus, setUpdatingCamStatus] = useState(false);

  // Form states
  const [showAddException, setShowAddException] = useState(false);
  const [editingException, setEditingException] = useState(null);
  const [newException, setNewException] = useState({
    code: '',
    description: '',
    severity: 'medium',
    owner: operator?.name || operator?.loginId || '',
    actionDue: '',
    notes: '',
  });

  // Load data
  const loadWorkOrder = async () => {
    if (!workOrderId || !token) return;
    try {
      const res = await api.mfgWorkOrder(token, workOrderId);
      setWorkOrder(res.workOrder);
    } catch (err) {
      toast({
        title: 'Failed to load work order',
        description: err?.message || 'Unable to fetch work order details.',
        variant: 'destructive',
      });
    }
  };

  const loadAttachments = async () => {
    if (!workOrderId || !token) return;
    setAttachmentsLoading(true);
    try {
      const res = await api.mfgListAttachments(token, workOrderId);
      setAttachments(Array.isArray(res.attachments) ? res.attachments : []);
    } catch (err) {
      toast({
        title: 'Failed to load attachments',
        description: err?.message || 'Unable to fetch file attachments.',
        variant: 'destructive',
      });
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const loadDfmExceptions = async () => {
    if (!workOrderId || !token) return;
    setDfmLoading(true);
    try {
      const res = await api.mfgListDfmExceptions(token, workOrderId);
      setDfmExceptions(Array.isArray(res.exceptions) ? res.exceptions : []);
    } catch (err) {
      toast({
        title: 'Failed to load DFM exceptions',
        description: err?.message || 'Unable to fetch DFM issues.',
        variant: 'destructive',
      });
    } finally {
      setDfmLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadWorkOrder(), loadAttachments(), loadDfmExceptions()]);
      setLoading(false);
    };
    loadData();
  }, [workOrderId, token]);

  // Computed values
  const dfmSummary = useMemo(() => {
    const active = dfmExceptions.filter((d) => d?.status !== 'resolved');
    return {
      total: dfmExceptions.length,
      open: active.length,
      highestSeverity: active
        .map((d) => d?.severity)
        .sort((a, b) => {
          const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
          return order[b] - order[a];
        })[0] || null,
    };
  }, [dfmExceptions]);

  // File operations
  const handleDownloadFile = async (filename) => {
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

  // DFM Exception operations
  const handleAddException = async () => {
    if (!newException.code.trim() || !newException.description.trim()) {
      toast({
        title: 'Submittion error',
        description: 'Code and description are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await api.mfgAddDfmException(token, workOrderId, {
        ...newException,
        actionDue: newException.actionDue ? new Date(newException.actionDue) : undefined,
      });
      setDfmExceptions(prev => [...prev, res.exception]);
      setNewException({
        code: '',
        description: '',
        severity: 'medium',
        owner: operator?.name || operator?.loginId || '',
        actionDue: '',
        notes: '',
      });
      setShowAddException(false);
      toast({ title: 'DFM exception added' });
    } catch (err) {
      toast({
        title: 'Failed to add exception',
        description: err?.message || 'Unable to create DFM exception.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateException = async (exceptionId, updates) => {
    try {
      const res = await api.mfgUpdateDfmException(token, workOrderId, exceptionId, updates);
      setDfmExceptions(prev =>
        prev.map(e => e._id === exceptionId ? res.exception : e)
      );
      setEditingException(null);
      toast({ title: 'DFM exception updated' });
    } catch (err) {
      toast({
        title: 'Failed to update exception',
        description: err?.message || 'Unable to update DFM exception.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteException = async (exceptionId) => {
    if (!window.confirm('Are you sure you want to delete this DFM exception?')) return;

    try {
      await api.mfgDeleteDfmException(token, workOrderId, exceptionId);
      setDfmExceptions(prev => prev.filter(e => e._id !== exceptionId));
      toast({ title: 'DFM exception deleted' });
    } catch (err) {
      toast({
        title: 'Failed to delete exception',
        description: err?.message || 'Unable to delete DFM exception.',
        variant: 'destructive',
      });
    }
  };

  // CAM Status operations
  const handleUpdateCamStatus = async (updates) => {
    setUpdatingCamStatus(true);
    try {
      const res = await api.mfgUpdateCamStatus(token, workOrderId, updates);
      setWorkOrder(prev => prev ? { ...prev, camStatus: res.camStatus } : null);
      toast({ title: 'CAM status updated' });
    } catch (err) {
      toast({
        title: 'Failed to update CAM status',
        description: err?.message || 'Unable to update CAM status.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingCamStatus(false);
    }
  };

  // Template selection handler
  const handleTemplateSelect = (template) => {
    // Pre-fill the add exception form with template data
    setNewException({
      code: template.code,
      description: template.description,
      severity: template.severity,
      owner: operator?.name || operator?.loginId || '',
      actionDue: '',
      notes: template.recommendations ? `Recommendations: ${template.recommendations.join(', ')}` : '',
    });
    setShowAddException(true);
    setActiveTab('exceptions');
  };

  // Checklist update handler
  const handleChecklistUpdate = (checklistId, checklistData) => {
    // Here you could save checklist progress to the work order
    console.log('Checklist updated:', checklistId, checklistData);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Loading DFM review panel...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Work order not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Work Order Details */}
      <DashboardCard
        title="Work Order Details"
        subtitle={`WO: ${workOrder.woNumber || '--'} • Product: ${workOrder.product || '--'}`}
        icon={<PackageSearch className="h-5 w-5 text-primary" />}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Work Order:</span>
              <span>{workOrder.woNumber || '--'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <PackageSearch className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Product:</span>
              <span>{workOrder.product || '--'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Customer:</span>
              <span>{workOrder.customer || '--'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Due Date:</span>
              <span>{formatDate(workOrder.dueDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Priority:</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                workOrder.priority === 'hot' ? 'bg-red-100 text-red-800' :
                workOrder.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                workOrder.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                'bg-green-100 text-green-800'
              }`}>
                {workOrder.priority || 'normal'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Quantity:</span>
              <span>{workOrder.quantity || '--'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">CAM Status:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${camStateColors[workOrder.camStatus?.state] || 'bg-gray-100 text-gray-800'}`}>
                {workOrder.camStatus?.state || 'pending'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">CAM Owner:</span>
              <span>{workOrder.camStatus?.owner || '--'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Release Target:</span>
              <span>{formatDateTime(workOrder.camStatus?.releaseTarget)}</span>
            </div>
          </div>
        </div>

        {workOrder.notes && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Notes:</h4>
            <p className="text-sm text-muted-foreground">{workOrder.notes}</p>
          </div>
        )}
      </DashboardCard>

      {/* File Attachments */}
      <DashboardCard
        title="File Attachments"
        subtitle={`${attachments.length} files attached`}
        icon={<FileText className="h-5 w-5 text-primary" />}
        headerActions={
          hasPermission('cam:upload') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast({ title: 'File upload functionality available in file upload section' })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          )
        }
      >
        {attachmentsLoading ? (
          <p className="text-sm text-muted-foreground">Loading attachments...</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files attached to this work order.</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div key={attachment._id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{attachment.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.kind} • {(attachment.size / 1024).toFixed(1)} KB •
                      Uploaded {formatDateTime(attachment.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadFile(attachment.filename)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {hasPermission('cam:upload') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast({ title: 'File preview not implemented yet' })}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>

      {/* DFM Review Section */}
      <DashboardCard
        title="DFM Review"
        subtitle={`${dfmSummary.open} open issues • ${dfmSummary.total} total`}
        icon={<AlertTriangle className="h-5 w-5 text-primary" />}
      >
        {/* Tabs */}
        <div className="border-b mb-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('exceptions')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'exceptions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Manual Exceptions
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <File className="h-4 w-4 inline mr-2" />
              Templates
            </button>
            <button
              onClick={() => setActiveTab('checklists')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'checklists'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <ClipboardList className="h-4 w-4 inline mr-2" />
              Checklists
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'exceptions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {dfmSummary.open} open issues • {dfmSummary.total} total
              </div>
              {hasPermission('dfm:manage') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddException(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exception
                </Button>
              )}
            </div>
        {dfmLoading ? (
          <p className="text-sm text-muted-foreground">Loading DFM exceptions...</p>
        ) : dfmExceptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No DFM exceptions found.</p>
        ) : (
          <div className="space-y-3">
            {dfmExceptions.map((exception) => (
              <div key={exception._id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{exception.code}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[exception.severity]}`}>
                      {exception.severity}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[exception.status]}`}>
                      {exception.status.replace('_', ' ')}
                    </span>
                  </div>
                  {hasPermission('dfm:manage') && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingException(exception)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteException(exception._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <p className="text-sm mb-2">{exception.description}</p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Owner: {exception.owner || '--'}</span>
                  {exception.actionDue && (
                    <span>Due: {formatDateTime(exception.actionDue)}</span>
                  )}
                  {exception.resolvedAt && (
                    <span>Resolved: {formatDateTime(exception.resolvedAt)}</span>
                  )}
                </div>

                {exception.notes && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">{exception.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Exception Form */}
        {showAddException && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Add New DFM Exception</h4>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Exception Code"
                  className="px-3 py-2 border rounded-md text-sm"
                  value={newException.code}
                  onChange={(e) => setNewException(prev => ({ ...prev, code: e.target.value }))}
                />
                <select
                  className="px-3 py-2 border rounded-md text-sm"
                  value={newException.severity}
                  onChange={(e) => setNewException(prev => ({ ...prev, severity: e.target.value }))}
                >
                  <option value="info">Info</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <textarea
                placeholder="Description"
                className="w-full px-3 py-2 border rounded-md text-sm"
                rows={2}
                value={newException.description}
                onChange={(e) => setNewException(prev => ({ ...prev, description: e.target.value }))}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Owner"
                  className="px-3 py-2 border rounded-md text-sm"
                  value={newException.owner}
                  onChange={(e) => setNewException(prev => ({ ...prev, owner: e.target.value }))}
                />
                <input
                  type="datetime-local"
                  className="px-3 py-2 border rounded-md text-sm"
                  value={newException.actionDue}
                  onChange={(e) => setNewException(prev => ({ ...prev, actionDue: e.target.value }))}
                />
              </div>
              <textarea
                placeholder="Notes (optional)"
                className="w-full px-3 py-2 border rounded-md text-sm"
                rows={2}
                value={newException.notes}
                onChange={(e) => setNewException(prev => ({ ...prev, notes: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddException}>
                  <Save className="h-4 w-4 mr-2" />
                  Add Exception
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddException(false);
                    setNewException({
                      code: '',
                      description: '',
                      severity: 'medium',
                      owner: operator?.name || operator?.loginId || '',
                      actionDue: '',
                      notes: '',
                    });
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Exception Form */}
        {editingException && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Edit DFM Exception</h4>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Exception Code"
                  className="px-3 py-2 border rounded-md text-sm"
                  value={editingException.code || ''}
                  onChange={(e) => setEditingException(prev => ({ ...prev, code: e.target.value }))}
                />
                <select
                  className="px-3 py-2 border rounded-md text-sm"
                  value={editingException.severity || 'medium'}
                  onChange={(e) => setEditingException(prev => ({ ...prev, severity: e.target.value }))}
                >
                  <option value="info">Info</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <textarea
                placeholder="Description"
                className="w-full px-3 py-2 border rounded-md text-sm"
                rows={2}
                value={editingException.description || ''}
                onChange={(e) => setEditingException(prev => ({ ...prev, description: e.target.value }))}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Owner"
                  className="px-3 py-2 border rounded-md text-sm"
                  value={editingException.owner || ''}
                  onChange={(e) => setEditingException(prev => ({ ...prev, owner: e.target.value }))}
                />
                <select
                  className="px-3 py-2 border rounded-md text-sm"
                  value={editingException.status || 'open'}
                  onChange={(e) => setEditingException(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="open">Open</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <textarea
                placeholder="Notes"
                className="w-full px-3 py-2 border rounded-md text-sm"
                rows={2}
                value={editingException.notes || ''}
                onChange={(e) => setEditingException(prev => ({ ...prev, notes: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleUpdateException(editingException._id, {
                    code: editingException.code,
                    description: editingException.description,
                    severity: editingException.severity,
                    owner: editingException.owner,
                    status: editingException.status,
                    notes: editingException.notes,
                  })}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Update Exception
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingException(null)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
          </div>
        )}

        {activeTab === 'templates' && (
          <DfmTemplates
            onSelectTemplate={handleTemplateSelect}
            selectedTemplates={dfmExceptions.map(e => ({ code: e.code }))}
          />
        )}

        {activeTab === 'checklists' && (
          <DfmChecklists
            workOrderId={workOrderId}
            token={token}
            operator={operator}
            hasPermission={hasPermission}
            onChecklistUpdate={handleChecklistUpdate}
          />
        )}
      </DashboardCard>

      {/* CAM Status Controls */}
      <DashboardCard
        title="CAM Status Controls"
        subtitle="Update CAM review status and release controls"
        icon={<Settings className="h-5 w-5 text-primary" />}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">CAM State</label>
              <select
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={workOrder.camStatus?.state || 'pending'}
                onChange={(e) => handleUpdateCamStatus({ state: e.target.value })}
                disabled={updatingCamStatus || !hasPermission('cam:review')}
              >
                <option value="pending">Pending</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CAM Owner</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={workOrder.camStatus?.owner || ''}
                onChange={(e) => handleUpdateCamStatus({ owner: e.target.value })}
                disabled={updatingCamStatus || !hasPermission('cam:review')}
                placeholder="Assign CAM owner"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Release Target</label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border rounded-md text-sm md:w-auto"
              value={workOrder.camStatus?.releaseTarget ?
                new Date(workOrder.camStatus.releaseTarget).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleUpdateCamStatus({
                releaseTarget: e.target.value ? new Date(e.target.value) : null
              })}
              disabled={updatingCamStatus || !hasPermission('cam:review')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">CAM Notes</label>
            <textarea
              className="w-full px-3 py-2 border rounded-md text-sm"
              rows={3}
              value={workOrder.camStatus?.notes || ''}
              onChange={(e) => handleUpdateCamStatus({ notes: e.target.value })}
              disabled={updatingCamStatus || !hasPermission('cam:review')}
              placeholder="Add CAM review notes..."
            />
          </div>

          <div className="flex gap-2">
            {hasPermission('cam:release') && (
              <Button
                onClick={() => handleUpdateCamStatus({ state: 'approved' })}
                disabled={updatingCamStatus || workOrder.camStatus?.state === 'approved'}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Release
              </Button>
            )}

            {hasPermission('qc:hold') && (
              <Button
                variant="destructive"
                onClick={() => {
                  const reason = window.prompt('Enter hold reason:');
                  if (reason) handleUpdateCamStatus({ state: 'blocked', notes: reason });
                }}
                disabled={updatingCamStatus}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Hold Work Order
              </Button>
            )}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
};

export default DfmReviewPanel;