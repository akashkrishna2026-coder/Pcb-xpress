import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import {
  Upload,
  FileText,
  Image,
  X,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Edit3,
} from 'lucide-react';

// File type validation
const FILE_TYPES = {
  drill: ['.drl', '.txt'],
  gerber: ['.gbr', '.ger', '.pho', '.art', '.gbl', '.gtl', '.gbs', '.gts', '.gbo', '.gto', '.gml', '.gm1', '.gm2', '.gm3'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.tif'],
  jobCard: ['.pdf', '.docx', '.doc'],
};

const getFileCategory = (filename) => {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (FILE_TYPES.drill.includes(ext)) return 'drill';
  if (FILE_TYPES.gerber.includes(ext)) return 'gerber';
  if (FILE_TYPES.image.includes(ext)) return 'image';
  if (FILE_TYPES.jobCard.includes(ext)) return 'jobCard';
  return 'unknown';
};

const getFileIcon = (category) => {
  switch (category) {
    case 'drill':
    case 'gerber':
      return <FileText className="h-4 w-4" />;
    case 'image':
      return <Image className="h-4 w-4" />;
    case 'jobCard':
      return <FileText className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getNumberMeta = (category) => {
  switch (category) {
    case 'nc_drill':
      return {
        label: 'NC Drill Number',
        placeholder: 'Enter NC drill number',
        short: 'NC Drill',
      };
    case 'phototools':
      return {
        label: 'Film Number',
        placeholder: 'Enter film number',
        short: 'Film',
      };
    case 'intake':
    default:
      return {
        label: 'CAM Number',
        placeholder: 'Enter CAM number',
        short: 'CAM',
      };
  }
};

const CamFileUpload = ({ workOrderId, token, category = 'intake', onUploadComplete }) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const numberMeta = getNumberMeta(category);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [camNumberDialogOpen, setCamNumberDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [camNumber, setCamNumber] = useState('');
  const [reuploadFile, setReuploadFile] = useState(null);

  // Load existing attachments
  const loadAttachments = useCallback(async (options = {}) => {
    const { notifyParent = false } = options;
    if (!token || !workOrderId) return;
    try {
      setLoading(true);
      const res = await api.mfgListAttachments(token, workOrderId);
      const list = Array.isArray(res?.attachments) ? res.attachments : [];
      setUploadedFiles(list);
      if (notifyParent) {
        onUploadComplete?.(list);
      }
    } catch (err) {
      toast({
        title: 'Failed to load attachments',
        description: err?.message || 'Unable to fetch uploaded files.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [token, workOrderId, toast, onUploadComplete]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  // Validate files
  const validateFiles = (files) => {
    const validFiles = [];
    const invalidFiles = [];

    Array.from(files).forEach((file) => {
      const category = getFileCategory(file.name);
      if (category === 'unknown') {
        invalidFiles.push(`${file.name}: Unsupported file type`);
      } else if (file.size > 50 * 1024 * 1024) { // 50MB limit
        invalidFiles.push(`${file.name}: File too large (max 50MB)`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid files',
        description: invalidFiles.join('; '),
        variant: 'destructive',
      });
    }

    return validFiles;
  };

  // Upload files
  const uploadFiles = async (files, isReupload = false) => {
    const validFiles = validateFiles(files);
    if (validFiles.length === 0) return;

    // Set pending files and show CAM number dialog
    setPendingFiles(validFiles);
    setReuploadFile(isReupload ? reuploadFile : null);
    setCamNumberDialogOpen(true);
  };

  // Process upload with CAM number
  const processUpload = async () => {
    if (!camNumber.trim()) {
      toast({
        title: `${numberMeta.label} required`,
        description: `Please enter a ${numberMeta.label} for the uploaded files.`,
        variant: 'destructive',
      });
      return;
    }

    setCamNumberDialogOpen(false);
    const filesToProcess = [...pendingFiles];
    const fileToReplace = reuploadFile;
    setPendingFiles([]);
    setCamNumber('');
    setReuploadFile(null);

    // If this is a reupload, delete old file first
    if (fileToReplace) {
      try {
        await api.mfgDeleteAttachment(token, workOrderId, fileToReplace.filename);
        toast({ title: 'Old file removed successfully' });
      } catch (err) {
        toast({
          title: 'Failed to remove old file',
          description: err?.message || 'Unable to delete old file.',
          variant: 'destructive',
        });
        return;
      }
    }

    for (const file of filesToProcess) {
      const uploadId = `${Date.now()}-${file.name}`;
      setUploadingFiles(prev => new Map(prev).set(uploadId, { file, progress: 0, status: 'uploading' }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        // Determine kind based on file type and upload category
        const fileCategory = getFileCategory(file.name);
        let kind;
        switch (category) {
          case 'nc_drill':
            kind = 'drill_file';
            break;
          case 'phototools':
            kind = 'film';
            break;
          case 'intake':
            switch (fileCategory) {
              case 'drill':
                kind = 'drill_file';
                break;
              case 'gerber':
                kind = 'gerber';
                break;
              case 'image':
                kind = 'spec';
                break;
              case 'jobCard':
                kind = 'job_card';
                break;
              default:
                kind = 'spec';
                break;
            }
            break;
          default:
            switch (fileCategory) {
              case 'drill':
                kind = 'drill_file';
                break;
              case 'gerber':
                kind = 'gerber';
                break;
              case 'image':
                kind = 'spec';
                break;
              case 'jobCard':
                kind = 'job_card';
                break;
              default:
                kind = 'spec';
                break;
            }
            break;
        }

        formData.append('category', category);
        formData.append('kind', kind);
        formData.append('camNumber', camNumber.trim());

        await api.mfgUploadAttachment(token, workOrderId, formData);

        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          newMap.set(uploadId, { file, progress: 100, status: 'completed' });
          return newMap;
        });

        // Remove from uploading after a delay
        setTimeout(() => {
          setUploadingFiles(prev => {
            const newMap = new Map(prev);
            newMap.delete(uploadId);
            return newMap;
          });
          loadAttachments({ notifyParent: true }); // Refresh the list and bubble up
        }, 2000);

        toast({
          title: fileToReplace ? 'File reuploaded successfully' : 'File uploaded successfully',
          description: `${file.name} has been ${fileToReplace ? 'reuploaded' : 'uploaded'} with ${numberMeta.short} number: ${camNumber.trim()}`,
        });

      } catch (err) {
        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          newMap.set(uploadId, { file, progress: 0, status: 'error', error: err?.message });
          return newMap;
        });

        toast({
          title: 'Upload failed',
          description: `Failed to upload ${file.name}: ${err?.message}`,
          variant: 'destructive',
        });
      }
    }
  };

  // Handle reupload
  const handleReupload = (file) => {
    setReuploadFile(file);
    setCamNumber(file.camNumber || '');
    // Create a file input for reupload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.drl,.txt,.gbr,.ger,.pho,.art,.gbl,.gtl,.gbs,.gts,.gbo,.gto,.gml,.gm1,.gm2,.gm3,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.pdf,.docx,.doc';
    input.onchange = (e) => {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
        setPendingFiles([selectedFile]);
        setCamNumberDialogOpen(true);
      }
    };
    input.click();
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const files = event.target.files;
    if (files?.length > 0) {
      uploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      uploadFiles(files);
    }
  };

  // Download file
  const handleDownload = async (filename) => {
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

  // Delete file
  const handleDelete = async (filename) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

    try {
      await api.mfgDeleteAttachment(token, workOrderId, filename);
      toast({ title: 'File deleted successfully' });
      loadAttachments({ notifyParent: true }); // Refresh the list and bubble up
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err?.message || 'Unable to delete file.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {category === 'nc_drill' ? 'NC Drill File Upload' :
           category === 'phototools' ? 'Film File Upload' :
           'CAM File Upload'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragOver ? 'text-primary' : 'text-gray-400'}`} />
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {category === 'nc_drill' ? 'Supported: NC Drill files (.drl, .txt)' :
             category === 'phototools' ? 'Supported: Film files (.png, .jpg, .jpeg, .gif, .bmp, .tiff, .tif)' :
             'Supported: Gerber files, BOM files, Panel drawings, Job cards (.pdf, .docx)'}
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              Browse Files
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept={category === 'nc_drill' ? '.drl,.txt' :
                   category === 'phototools' ? '.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif' :
                   '.drl,.txt,.gbr,.ger,.pho,.art,.gbl,.gtl,.gbs,.gts,.gbo,.gto,.gml,.gm1,.gm2,.gm3,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.pdf,.docx,.doc'}
          />
        </div>

        {/* Uploading Files */}
        {uploadingFiles.size > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploading...</h4>
            {Array.from(uploadingFiles.entries()).map(([uploadId, { file, progress, status, error }]) => (
              <div key={uploadId} className="flex items-center gap-2 p-2 border rounded">
                {getFileIcon(getFileCategory(file.name))}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                {status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
                {status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Files ({uploadedFiles.filter(file => file.category === category).length})</h4>
            {uploadedFiles
              .filter(file => file.category === category)
              .map((file) => (
              <div key={file.filename} className="flex items-center gap-2 p-2 border rounded">
                {getFileIcon(getFileCategory(file.filename))}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{file.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                  {file.camNumber && (
                    <p className="text-xs text-blue-600 font-medium">
                      {numberMeta.short}: {file.camNumber}
                    </p>
                  )}
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
                   file.kind === 'film' ? 'Film' :
                   file.kind.charAt(0).toUpperCase() + file.kind.slice(1).replace('_', ' ')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(file.filename)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReupload(file)}
                  title="Reupload file"
                >
                  <Edit3 className="h-4 w-4" />
                  Reupload
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(file.filename)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm">Loading attachments...</span>
          </div>
        )}
      </CardContent>

      {/* CAM Number Dialog */}
      <Dialog open={camNumberDialogOpen} onOpenChange={setCamNumberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reuploadFile ? 'Reupload File' : 'Upload Files'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="camNumber">{numberMeta.label}</Label>
              <Input
                id="camNumber"
                value={camNumber}
                onChange={(e) => setCamNumber(e.target.value)}
                placeholder={numberMeta.placeholder}
                className="mt-1"
              />
            </div>
            {reuploadFile && (
              <div className="text-sm text-muted-foreground">
                Reuploading: {reuploadFile.filename}
                {reuploadFile.camNumber && (
                  <div>Current {numberMeta.label}: {reuploadFile.camNumber}</div>
                )}
              </div>
            )}
            {!reuploadFile && pendingFiles.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Files to upload: {pendingFiles.map(f => f.name).join(', ')}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCamNumberDialogOpen(false);
                setPendingFiles([]);
                setCamNumber('');
                setReuploadFile(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={processUpload}>
              {reuploadFile ? 'Reupload' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CamFileUpload;