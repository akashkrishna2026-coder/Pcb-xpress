import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Loader2, FileText, Settings, Image, Upload, X } from 'lucide-react';
import jsPDF from 'jspdf';

const JobCardForm = ({ open, onOpenChange, workOrderId, token, onJobCardCreated }) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
  const [workOrder, setWorkOrder] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [panelDrawingFiles, setPanelDrawingFiles] = useState([]);
  const [uploadingPanelDrawing, setUploadingPanelDrawing] = useState(false);
  const [formData, setFormData] = useState({
    operatorName: '',
    operatorId: '',
    notes: '',
    specialInstructions: '',
  });

  // Load all work orders
  useEffect(() => {
    if (open && token) {
      const loadWorkOrders = async () => {
        try {
          const res = await api.mfgWorkOrders(token, { focus: 'cam' });
          const orders = res.workOrders || [];
          setWorkOrders(orders);
          // Set initial selection
          if (workOrderId) {
            setSelectedWorkOrderId(workOrderId);
          } else if (orders.length > 0) {
            setSelectedWorkOrderId(orders[0]._id);
          }
        } catch (err) {
          console.error('Failed to load work orders:', err);
        }
      };
      loadWorkOrders();
    }
  }, [open, token, workOrderId]);

  // Update work order and files when selection changes
  useEffect(() => {
    if (selectedWorkOrderId && workOrders.length > 0) {
      const wo = workOrders.find(w => w._id === selectedWorkOrderId);
      setWorkOrder(wo);
      const allAttachments = wo?.camAttachments || [];
      console.log('All attachments for work order:', allAttachments);
      const filteredFiles = allAttachments.filter(att =>
        ['gerber', 'bom', 'drill_file', 'photo_file', 'spec', 'film'].includes(att.kind)
      );
      console.log('Filtered files for job card:', filteredFiles);
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
    } else {
      setWorkOrder(null);
      setUploadedFiles([]);
      setPanelDrawingFiles([]);
    }
  }, [selectedWorkOrderId, workOrders]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePanelDrawingUpload = async (event) => {
    const files = event.target.files;
    if (!files?.length || !selectedWorkOrderId) return;

    setUploadingPanelDrawing(true);
    try {
      for (const file of Array.from(files)) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('kind', 'spec');
        formDataUpload.append('category', 'intake');
        formDataUpload.append('description', `Panel drawing uploaded during job card creation`);

        await api.mfgUploadAttachment(token, selectedWorkOrderId, formDataUpload);
      }

      toast({
        title: 'Panel drawing uploaded successfully',
        description: 'The panel drawing has been attached to the work order.',
      });

      // Refresh work orders to get updated attachments
      const res = await api.mfgWorkOrders(token, { focus: 'cam' });
      const orders = res.workOrders || [];
      setWorkOrders(orders);

    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err?.message || 'Unable to upload panel drawing.',
        variant: 'destructive',
      });
    } finally {
      setUploadingPanelDrawing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePanelDrawing = async (filename) => {
    if (!confirm(`Are you sure you want to remove ${filename}?`)) return;

    try {
      await api.mfgDeleteAttachment(token, selectedWorkOrderId, filename);
      toast({ title: 'Panel drawing removed successfully' });

      // Refresh work orders to get updated attachments
      const res = await api.mfgWorkOrders(token, { focus: 'cam' });
      const orders = res.workOrders || [];
      setWorkOrders(orders);

      // Also refresh the parent dashboard data
      if (onJobCardCreated) {
        onJobCardCreated();
      }

      // Also refresh the parent dashboard data
      if (onJobCardCreated) {
        onJobCardCreated();
      }

    } catch (err) {
      toast({
        title: 'Remove failed',
        description: err?.message || 'Unable to remove panel drawing.',
        variant: 'destructive',
      });
    }
  };

  const getFileTypeIcon = (category) => {
    switch (category) {
      case 'drill':
        return <Settings className="h-4 w-4" />;
      case 'gerber':
        return <FileText className="h-4 w-4" />;
      case 'image':
        return <Image className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const generateJobCardPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text('PCB Job Card', 105, 20, { align: 'center' });

    // Work Order Information
    doc.setFontSize(14);
    doc.text('Work Order Information', 20, 40);

    doc.setFontSize(10);
    let yPos = 50;
    if (workOrder) {
      doc.text(`WO Number: ${workOrder.woNumber || 'N/A'}`, 20, yPos);
      yPos += 8;
      doc.text(`Product: ${workOrder.product || 'N/A'}`, 20, yPos);
      yPos += 8;
      doc.text(`Customer: ${workOrder.customer || 'N/A'}`, 20, yPos);
      yPos += 8;
      doc.text(`Quantity: ${workOrder.quantity || 'N/A'}`, 20, yPos);
      yPos += 8;
      doc.text(`Priority: ${workOrder.priority || 'normal'}`, 20, yPos);
      yPos += 8;
      doc.text(`Stage: ${workOrder.stage || 'N/A'}`, 20, yPos);
      yPos += 8;
      if (workOrder.dueDate) {
        doc.text(`Due Date: ${new Date(workOrder.dueDate).toLocaleDateString()}`, 20, yPos);
        yPos += 8;
      }
    }

    // Operator Information
    yPos += 10;
    doc.setFontSize(14);
    doc.text('Operator Information', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`Operator Name: ${formData.operatorName || 'N/A'}`, 20, yPos);
    yPos += 8;
    doc.text(`Operator ID: ${formData.operatorId || 'N/A'}`, 20, yPos);
    yPos += 8;
    doc.text(`Date Created: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 8;
    doc.text(`Time Created: ${new Date().toLocaleTimeString()}`, 20, yPos);
    yPos += 8;

    // Special Instructions
    if (formData.specialInstructions) {
      yPos += 10;
      doc.setFontSize(14);
      doc.text('Special Instructions', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      const splitInstructions = doc.splitTextToSize(formData.specialInstructions, 170);
      doc.text(splitInstructions, 20, yPos);
      yPos += splitInstructions.length * 5;
    }

    // Notes
    if (formData.notes) {
      yPos += 10;
      doc.setFontSize(14);
      doc.text('Notes', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(formData.notes, 170);
      doc.text(splitNotes, 20, yPos);
      yPos += splitNotes.length * 5;
    }

    // File References
    yPos += 10;
    doc.setFontSize(14);
    doc.text('Attached Files', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    if (uploadedFiles.length === 0) {
      doc.text('No files attached', 20, yPos);
    } else {
      uploadedFiles.forEach((file, index) => {
        if (yPos > 270) { // Check if we need a new page
          doc.addPage();
          yPos = 20;
        }

        const category = getFileCategory(file.filename);
        const iconText = category === 'drill' ? '[DRILL]' :
                        category === 'gerber' ? '[GERBER]' :
                        category === 'image' ? '[IMAGE]' : '[FILE]';

        doc.text(`${index + 1}. ${iconText} ${file.originalName || file.filename}`, 20, yPos);
        yPos += 6;
        doc.text(`   Size: ${formatFileSize(file.size)} | Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}`, 20, yPos);
        yPos += 8;
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      doc.text(`Generated by PCB Xpress MES - ${new Date().toISOString()}`, 20, 290);
    }

    return doc;
  };

  const getFileCategory = (filename) => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (['.drl', '.txt'].includes(ext)) return 'drill';
    if (['.gbr', '.ger', '.pho', '.art', '.gbl', '.gtl', '.gbs', '.gts', '.gbo', '.gto', '.gml', '.gm1', '.gm2', '.gm3'].includes(ext)) return 'gerber';
    if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.tif'].includes(ext)) return 'image';
    return 'other';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreateJobCard = async () => {
    if (!selectedWorkOrderId) {
      toast({
        title: 'Submittion Error',
        description: 'Please select a work order',
        variant: 'destructive',
      });
      return;
    }
    if (!formData.operatorName.trim()) {
      toast({
        title: 'Submittion Error',
        description: 'Operator name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Starting job card creation for work order:', selectedWorkOrderId);
      console.log('Work order data:', workOrder);
      console.log('Uploaded files for job card:', uploadedFiles);

      // Check for panel drawing files (now included in 'spec' kind)
      const panelDrawingFiles = (workOrder?.camAttachments || []).filter(att =>
        att.kind === 'spec' && (
          att.filename?.toLowerCase().includes('panel') ||
          att.filename?.toLowerCase().includes('drawing') ||
          att.originalName?.toLowerCase().includes('panel') ||
          att.originalName?.toLowerCase().includes('drawing')
        )
      );
      console.log('Panel drawing files found:', panelDrawingFiles);

      // Generate PDF
      const doc = generateJobCardPDF();
      const pdfBlob = doc.output('blob');
      console.log('PDF generated successfully');

      // Create FormData for upload
      const formDataUpload = new FormData();
      formDataUpload.append('file', pdfBlob, `Job_Card_${workOrder?.woNumber || selectedWorkOrderId}_${new Date().toISOString().split('T')[0]}.pdf`);
      formDataUpload.append('kind', 'job_card');
      formDataUpload.append('category', 'intake');
      formDataUpload.append('description', `Job card created by ${formData.operatorName} on ${new Date().toLocaleDateString()}`);
      formDataUpload.append('operatorName', formData.operatorName);
      formDataUpload.append('operatorId', formData.operatorId);
      formDataUpload.append('specialInstructions', formData.specialInstructions);

      // Upload the PDF
      await api.mfgUploadAttachment(token, selectedWorkOrderId, formDataUpload);
      console.log('Job card PDF uploaded successfully');

      toast({
        title: 'Job card created successfully',
        description: 'The job card PDF has been generated and attached to the work order.',
      });

      onJobCardCreated();
    } catch (err) {
      console.error('Error creating job card:', err);
      toast({
        title: 'Failed to create job card',
        description: err?.message || 'Unable to generate and upload job card PDF.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Job Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Work Order Selection */}
          <div>
            <label htmlFor="workOrderSelect" className="text-sm font-medium">Select Work Order *</label>
            <select
              id="workOrderSelect"
              value={selectedWorkOrderId || ''}
              onChange={(e) => setSelectedWorkOrderId(e.target.value)}
              className="w-full p-2 border rounded mt-1"
            >
              <option value="">Select a work order</option>
              {workOrders.map(wo => (
                <option key={wo._id} value={wo._id}>
                  {wo.woNumber} - {wo.product} - {wo.customer}
                </option>
              ))}
            </select>
          </div>

          {/* Work Order Summary */}
          {workOrder && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Work Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div><strong>WO:</strong> {workOrder.woNumber}</div>
                <div><strong>Product:</strong> {workOrder.product}</div>
                <div><strong>Customer:</strong> {workOrder.customer}</div>
                <div><strong>Quantity:</strong> {workOrder.quantity}</div>
                <div><strong>Priority:</strong> {workOrder.priority}</div>
              </CardContent>
            </Card>
          )}

          {/* Operator Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="operatorName" className="text-sm font-medium">Operator Name *</label>
              <Input
                id="operatorName"
                value={formData.operatorName}
                onChange={(e) => handleInputChange('operatorName', e.target.value)}
                placeholder="Enter operator name"
              />
            </div>
            <div>
              <label htmlFor="operatorId" className="text-sm font-medium">Operator ID</label>
              <Input
                id="operatorId"
                value={formData.operatorId}
                onChange={(e) => handleInputChange('operatorId', e.target.value)}
                placeholder="Enter operator ID"
              />
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label htmlFor="specialInstructions" className="text-sm font-medium">Special Instructions</label>
            <Textarea
              id="specialInstructions"
              value={formData.specialInstructions}
              onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
              placeholder="Enter any special instructions for this job"
              rows={3}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="text-sm font-medium">Notes</label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
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
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPanelDrawing || !selectedWorkOrderId}
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPanelDrawing}
                  >
                    {uploadingPanelDrawing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Replace Panel Drawing
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf"
                className="hidden"
                onChange={handlePanelDrawingUpload}
              />
            </CardContent>
          </Card>

          {/* File References */}
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
                      {getFileTypeIcon(getFileCategory(file.originalName || file.filename))}
                      <span className="truncate">{file.originalName || file.filename}</span>
                      <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        file.kind === 'gerber' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        file.kind === 'bom' ? 'bg-green-100 text-green-800 border border-green-200' :
                        file.kind === 'drill_file' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        file.kind === 'spec' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        file.kind === 'film' ? 'bg-pink-100 text-pink-800 border border-pink-200' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {file.kind === 'gerber' ? 'Gerber' :
                         file.kind === 'bom' ? 'BOM' :
                         file.kind === 'drill_file' ? 'Drill' :
                         file.kind === 'spec' ? 'Panel Drawing' :
                         file.kind.charAt(0).toUpperCase() + file.kind.slice(1).replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateJobCard} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Job Card
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobCardForm;
