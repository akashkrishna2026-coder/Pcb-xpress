import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { getMfgUser } from '@/lib/storage';
import { 
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  MessageSquare,
  Upload,
  History,
  Download,
  Eye,
  Edit,
  AlertCircle,
  Loader2,
  Settings,
  Image,
  User
} from 'lucide-react';

const UpdateJobCardSection = ({ workOrderId, token, onJobCardUpdated }) => {
  const { toast } = useToast();
  const operator = getMfgUser();
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateFile, setUpdateFile] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [editFormData, setEditFormData] = useState({
    operatorName: '',
    operatorId: '',
    specialInstructions: '',
    notes: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [panelDrawingFiles, setPanelDrawingFiles] = useState([]);
  const [uploadingPanelDrawing, setUploadingPanelDrawing] = useState(false);
  const [editorName, setEditorName] = useState(operator?.name || operator?.loginId || operator?.email || '');

  // Load job cards for the work order
  useEffect(() => {
    if (workOrderId && token) {
      loadJobCards();
    }
  }, [workOrderId, token]);

  const loadJobCards = async () => {
    try {
      setLoading(true);
      const response = await api.mfgGetJobCards(token, workOrderId);
      setJobCards(response.jobCards || []);
    } catch (err) {
      console.error('Failed to load job cards:', err);
      toast({
        title: 'Error',
        description: 'Failed to load job cards',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'rejected':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCreatedHistoryEntry = (history) => {
    const list = Array.isArray(history) ? history : [];
    return list.find((entry) => entry?.action === 'created') || null;
  };

  const getLatestHistoryEntry = (history) => {
    const list = Array.isArray(history) ? history : [];
    return list.reduce((latest, entry) => {
      if (!entry?.timestamp) return latest;
      const entryTs = new Date(entry.timestamp).getTime();
      const latestTs = latest?.timestamp ? new Date(latest.timestamp).getTime() : -Infinity;
      return entryTs >= latestTs ? entry : latest;
    }, null);
  };

  const handleEditInputChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePanelDrawingUpload = async (event) => {
    const files = event.target.files;
    if (!files?.length || !selectedJobCard) return;

    setUploadingPanelDrawing(true);
    try {
      for (const file of Array.from(files)) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('kind', 'spec');
        formDataUpload.append('category', 'intake');
        formDataUpload.append('description', `Panel drawing uploaded during job card edit`);

        await api.mfgUploadAttachment(token, workOrderId, formDataUpload);
      }

      toast({
        title: 'Panel drawing uploaded successfully',
        description: 'The panel drawing has been attached to the work order.',
      });

      // Refresh job cards to get updated attachments
      await loadJobCards();
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err?.message || 'Unable to upload panel drawing.',
        variant: 'destructive',
      });
    } finally {
      setUploadingPanelDrawing(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemovePanelDrawing = async (filename) => {
    if (!confirm(`Are you sure you want to remove ${filename}?`)) return;

    try {
      await api.mfgDeleteAttachment(token, workOrderId, filename);
      toast({ title: 'Panel drawing removed successfully' });
      await loadJobCards();
    } catch (err) {
      toast({
        title: 'Remove failed',
        description: err?.message || 'Unable to remove panel drawing.',
        variant: 'destructive',
      });
    }
  };

  const handleEditJobCard = () => {
    if (!selectedJobCard) return;
    
    // Pre-fill form with current job card data
    setEditFormData({
      operatorName: selectedJobCard.history?.[0]?.operatorName || '',
      operatorId: selectedJobCard.history?.[0]?.operatorId || '',
      specialInstructions: selectedJobCard.description || '',
      notes: selectedJobCard.history?.[0]?.notes || ''
    });
    
    // Load current attachments for the work order
    loadWorkOrderFiles();
    
    setShowEditDialog(true);
  };

  const loadWorkOrderFiles = async () => {
    try {
      const res = await api.mfgWorkOrders(token, { focus: 'cam' });
      const orders = res.workOrders || [];
      const wo = orders.find(w => w._id === workOrderId);
      if (wo) {
        const allAttachments = wo?.camAttachments || [];
        const filteredFiles = allAttachments.filter(att =>
          ['gerber', 'bom', 'drill_file', 'photo_file', 'spec', 'film'].includes(att.kind)
        );
        setUploadedFiles(filteredFiles);

        // Separate panel drawing files
        const panelDrawings = allAttachments.filter(att =>
          att.kind === 'spec' && (
            att.filename?.toLowerCase().includes('panel') ||
            att.filename?.toLowerCase().includes('drawing') ||
            att.originalName?.toLowerCase().includes('panel') ||
            att.originalName?.toLowerCase().includes('drawing')
          )
        );
        setPanelDrawingFiles(panelDrawings);
      }
    } catch (err) {
      console.error('Failed to load work order files:', err);
    }
  };

  const handleDoneEdit = () => {
    if (!editorName.trim()) {
      setEditorName(operator?.name || operator?.loginId || operator?.email || '');
    }
    setShowNameDialog(true);
  };

  const handleNameSubmit = async () => {
    if (!editorName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your name',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessingAction(true);
      
      // Update the existing job card with new operator information
      const formData = new FormData();
      
      // Only include file if a new one was uploaded
      if (updateFile) {
        formData.append('file', updateFile);
      }
      
      formData.append('description', `Job card edited by ${editorName} on ${new Date().toLocaleDateString()}`);
      formData.append('notes', `Original job card edited by ${editorName}. ${editFormData.notes}`);
      formData.append('operatorName', editorName);
      formData.append('operatorId', editFormData.operatorId);
      formData.append('specialInstructions', editFormData.specialInstructions);
      formData.append('updateExisting', 'true'); // Flag to update existing instead of creating new version

      await api.mfgUpdateJobCard(token, workOrderId, selectedJobCard.filename, formData);

      toast({
        title: 'Job card updated successfully',
        description: `Job card has been updated by ${editorName}`,
      });

      setShowNameDialog(false);
      setShowEditDialog(false);
      setEditorName('');
      setEditFormData({ operatorName: '', operatorId: '', specialInstructions: '', notes: '' });
      setUpdateFile(null);
      
      await loadJobCards();
      if (onJobCardUpdated) onJobCardUpdated();
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err?.message || 'Unable to update job card.',
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedJobCard) return;

    try {
      setProcessingAction(true);
      await api.mfgApproveJobCard(token, workOrderId, selectedJobCard.filename, {
        notes: approvalNotes,
      });

      toast({
        title: 'Job card approved',
        description: 'The job card has been approved successfully.',
      });

      setShowApprovalDialog(false);
      setApprovalNotes('');
      loadJobCards();
      if (onJobCardUpdated) onJobCardUpdated();
    } catch (err) {
      toast({
        title: 'Approval failed',
        description: err?.message || 'Unable to approve job card.',
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedJobCard || !rejectionReason.trim()) return;

    try {
      setProcessingAction(true);
      await api.mfgRejectJobCard(token, workOrderId, selectedJobCard.filename, {
        rejectionReason: rejectionReason.trim(),
        notes: approvalNotes,
      });

      toast({
        title: 'Job card rejected',
        description: 'The job card has been rejected.',
      });

      setShowRejectDialog(false);
      setRejectionReason('');
      setApprovalNotes('');
      loadJobCards();
      if (onJobCardUpdated) onJobCardUpdated();
    } catch (err) {
      toast({
        title: 'Rejection failed',
        description: err?.message || 'Unable to reject job card.',
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedJobCard || !commentText.trim()) return;

    try {
      setProcessingAction(true);
      await api.mfgAddJobCardComment(token, workOrderId, selectedJobCard.filename, {
        comment: commentText.trim(),
      });

      toast({
        title: 'Comment added',
        description: 'Your comment has been added to the job card.',
      });

      setShowCommentDialog(false);
      setCommentText('');
      loadJobCards();
      if (onJobCardUpdated) onJobCardUpdated();
    } catch (err) {
      toast({
        title: 'Comment failed',
        description: err?.message || 'Unable to add comment.',
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleUpdateJobCard = async () => {
    if (!selectedJobCard || !updateFile) return;

    try {
      setProcessingAction(true);
      const formData = new FormData();
      formData.append('file', updateFile);
      formData.append('description', `Updated job card version ${(selectedJobCard.version || 1) + 1}`);
      formData.append('notes', updateNotes || 'Job card updated');

      await api.mfgUpdateJobCard(token, workOrderId, selectedJobCard.filename, formData);

      toast({
        title: 'Job card updated',
        description: 'A new version of the job card has been created.',
      });

      setShowUpdateDialog(false);
      setUpdateFile(null);
      setUpdateNotes('');
      loadJobCards();
      if (onJobCardUpdated) onJobCardUpdated();
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err?.message || 'Unable to update job card.',
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDownload = (jobCard) => {
    window.open(jobCard.url, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading job cards...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Job Cards ({jobCards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No job cards found for this work order.</p>
              <p className="text-sm">Create a job card first to manage approvals and updates.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobCards.map((jobCard, index) => (
                <Card key={`${jobCard.filename}_${jobCard.version || 1}_${jobCard.uploadedAt}_${index}`} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(jobCard.approvalStatus)}
                          <span className="font-medium">{jobCard.originalName}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(jobCard.approvalStatus)}`}>
                            {jobCard.approvalStatus?.toUpperCase() || 'PENDING'}
                          </span>
                          {jobCard.version && jobCard.version > 1 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              v{jobCard.version}
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Size: {formatFileSize(jobCard.size)}</div>
                          <div>Uploaded: {new Date(jobCard.uploadedAt).toLocaleDateString()}</div>
                          {jobCard.approvedAt && (
                            <div>Approved: {new Date(jobCard.approvedAt).toLocaleDateString()}</div>
                          )}
                          {(() => {
                            const createdEntry = getCreatedHistoryEntry(jobCard.history);
                            const latestEntry = getLatestHistoryEntry(jobCard.history);

                            const createdLine = createdEntry ? (
                              <div className="text-blue-600">
                                <User className="h-4 w-4 inline mr-1" />
                                Created By: {createdEntry.operatorName} on {new Date(createdEntry.timestamp).toLocaleDateString()}
                              </div>
                            ) : null;

                            const editedLine =
                              latestEntry && (!createdEntry || latestEntry.timestamp !== createdEntry.timestamp) ? (
                                <div className="text-blue-600">
                                  <User className="h-4 w-4 inline mr-1" />
                                  Edited By: {latestEntry.operatorName} on {new Date(latestEntry.timestamp).toLocaleDateString()}
                                </div>
                              ) : null;

                            return (
                              <>
                                {createdLine}
                                {editedLine}
                              </>
                            );
                          })()}
                          {jobCard.rejectionReason && (
                            <div className="text-red-600">
                              <AlertCircle className="h-4 w-4 inline mr-1" />
                              Rejected: {jobCard.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(jobCard)}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedJobCard(jobCard);
                            setShowHistoryDialog(true);
                          }}
                          className="flex items-center gap-1"
                        >
                          <History className="h-4 w-4" />
                          History
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedJobCard(jobCard);
                            setShowCommentDialog(true);
                          }}
                          className="flex items-center gap-1"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Comment
                        </Button>

                        {jobCard.approvalStatus === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedJobCard(jobCard);
                                setShowApprovalDialog(true);
                              }}
                              className="flex items-center gap-1 text-green-600 border-green-300 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedJobCard(jobCard);
                                setShowRejectDialog(true);
                              }}
                              className="flex items-center gap-1 text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedJobCard(jobCard);
                            handleEditJobCard();
                          }}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Job Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Job Card</label>
              <p className="text-sm text-muted-foreground">{selectedJobCard?.originalName}</p>
            </div>
            <div>
              <label htmlFor="approvalNotes" className="text-sm font-medium">Approval Notes (Optional)</label>
              <Textarea
                id="approvalNotes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={processingAction}>
                {processingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Approve Job Card
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Job Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Job Card</label>
              <p className="text-sm text-muted-foreground">{selectedJobCard?.originalName}</p>
            </div>
            <div>
              <label htmlFor="rejectionReason" className="text-sm font-medium">Rejection Reason *</label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                rows={3}
                required
              />
            </div>
            <div>
              <label htmlFor="rejectNotes" className="text-sm font-medium">Additional Notes (Optional)</label>
              <Textarea
                id="rejectNotes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={processingAction || !rejectionReason.trim()}
                variant="destructive"
              >
                {processingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reject Job Card
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Job Card</label>
              <p className="text-sm text-muted-foreground">{selectedJobCard?.originalName}</p>
            </div>
            <div>
              <label htmlFor="comment" className="text-sm font-medium">Comment *</label>
              <Textarea
                id="comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Enter your comment..."
                rows={4}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCommentDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddComment}
                disabled={processingAction || !commentText.trim()}
              >
                {processingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Work Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Work Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div><strong>WO:</strong> {selectedJobCard?.originalName}</div>
                <div><strong>Version:</strong> {selectedJobCard?.version || 1}</div>
                <div><strong>Status:</strong> {selectedJobCard?.approvalStatus || 'Pending'}</div>
                {(() => {
                  const createdEntry = getCreatedHistoryEntry(selectedJobCard?.history);
                  const latestEntry = getLatestHistoryEntry(selectedJobCard?.history);
                  if (!createdEntry || !latestEntry) return null;
                  return (
                    <div>
                      <div><strong>Created By:</strong> {createdEntry.operatorName} on {new Date(createdEntry.timestamp).toLocaleDateString()}</div>
                      <div><strong>Last Edited By:</strong> {latestEntry.operatorName} on {new Date(latestEntry.timestamp).toLocaleDateString()}</div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Operator Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="editOperatorName" className="text-sm font-medium">Operator Name *</label>
                <Input
                  id="editOperatorName"
                  value={editFormData.operatorName}
                  onChange={(e) => handleEditInputChange('operatorName', e.target.value)}
                  placeholder="Enter operator name"
                />
              </div>
              <div>
                <label htmlFor="editOperatorId" className="text-sm font-medium">Operator ID</label>
                <Input
                  id="editOperatorId"
                  value={editFormData.operatorId}
                  onChange={(e) => handleEditInputChange('operatorId', e.target.value)}
                  placeholder="Enter operator ID"
                />
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <label htmlFor="editSpecialInstructions" className="text-sm font-medium">Special Instructions</label>
              <Textarea
                id="editSpecialInstructions"
                value={editFormData.specialInstructions}
                onChange={(e) => handleEditInputChange('specialInstructions', e.target.value)}
                placeholder="Enter any special instructions for this job"
                rows={3}
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="editNotes" className="text-sm font-medium">Notes</label>
              <Textarea
                id="editNotes"
                value={editFormData.notes}
                onChange={(e) => handleEditInputChange('notes', e.target.value)}
                placeholder="Additional notes"
                rows={2}
              />
            </div>

            {/* Panel Drawing Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Panel Drawing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {panelDrawingFiles.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">No panel drawing attached. Upload a panel drawing for this job card.</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('editPanelDrawingInput')?.click()}
                        disabled={uploadingPanelDrawing}
                      >
                        {uploadingPanelDrawing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Panel Drawing
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Attached Panel Drawing:</p>
                    {panelDrawingFiles.map((file) => (
                      <div key={file.filename} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4" />
                          <span className="truncate">{file.originalName || file.filename}</span>
                          <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePanelDrawing(file.filename)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('editPanelDrawingInput')?.click()}
                      disabled={uploadingPanelDrawing}
                    >
                      {uploadingPanelDrawing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Replace Panel Drawing
                    </Button>
                  </div>
                )}
                <input
                  id="editPanelDrawingInput"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf"
                  className="hidden"
                  onChange={handlePanelDrawingUpload}
                />
              </CardContent>
            </Card>

            {/* Attached Files */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Other Attached Files ({uploadedFiles.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {uploadedFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No other files attached to this work order yet.</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div key={file.filename} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span className="truncate">{file.originalName || file.filename}</span>
                        <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleDoneEdit} disabled={processingAction}>
                {processingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Name Entry Dialog */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Your Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="editorName" className="text-sm font-medium">Your Name *</label>
              <Input
                id="editorName"
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder="Enter your name"
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleNameSubmit} disabled={processingAction || !editorName.trim()}>
                {processingAction && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Card History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Job Card</label>
              <p className="text-sm text-muted-foreground">{selectedJobCard?.originalName}</p>
            </div>
            {selectedJobCard?.history && selectedJobCard.history.length > 0 ? (
              <div className="space-y-3">
                {selectedJobCard.history
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((entry, index) => (
                    <Card key={index} className="border-l-4 border-l-gray-300">
                      <CardContent className="pt-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{entry.operatorName}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium capitalize">{entry.action.replace('_', ' ')}</span>
                              {entry.previousStatus && entry.newStatus && (
                                <span className="ml-2 text-muted-foreground">
                                  ({entry.previousStatus} → {entry.newStatus})
                                </span>
                              )}
                              {entry.version && (
                                <span className="ml-2 text-muted-foreground">
                                  Version {entry.version}
                                </span>
                              )}
                            </div>
                            {entry.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No history available for this job card.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UpdateJobCardSection;