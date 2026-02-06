import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Camera, Download, Loader2, Trash2, UploadCloud } from 'lucide-react';

const IMAGE_KINDS = [
  { value: 'inspection_image', label: 'Inspection Image' },
  { value: 'visual_photo', label: 'Visual Photo' },
  { value: 'aoi_image', label: 'AOI Image' },
];

const ACCEPTED_TYPES =
  'image/jpeg,image/png,image/gif,image/bmp,image/tiff,image/webp,image/jpg,image/tif';

const VisualInspectionImagesPanel = ({ workOrder, token, onWorkOrderUpdated }) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedKind, setSelectedKind] = useState(IMAGE_KINDS[0].value);
  const [description, setDescription] = useState('');

  const workOrderId = workOrder?._id || workOrder?.id;

  const loadAttachments = async () => {
    if (!token || !workOrderId) {
      setAttachments([]);
      return;
    }

    setLoading(true);
    try {
      const res = await api.mfgListAttachments(token, workOrderId);
      const list = Array.isArray(res?.attachments) ? res.attachments : [];
      setAttachments(list);
      onWorkOrderUpdated?.({ _id: workOrderId, assemblyAttachments: list });
    } catch (err) {
      toast({
        title: 'Failed to load inspection images',
        description: err?.message || 'Unable to fetch attachments.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId, token]);

  const imageAttachments = useMemo(
    () =>
      (attachments || []).filter((attachment) =>
        ['inspection_image', 'visual_photo', 'aoi_image'].includes(attachment.kind)
      ),
    [attachments]
  );

  const handleFilePick = () => {
    if (!workOrderId) {
      toast({
        title: 'Select a work order',
        description: 'Choose a work order to upload inspection images.',
        variant: 'destructive',
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !workOrderId) {
      return;
    }

    if (!IMAGE_KINDS.some((item) => item.value === selectedKind)) {
      toast({
        title: 'Invalid image type',
        description: 'Choose a valid inspection image type.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    if (!ACCEPTED_TYPES.split(',').includes(file.type)) {
      // Allow browsers that report mimetype subset by sniffing extension
      const extension = file.name?.split('.').pop()?.toLowerCase() || '';
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tif', 'tiff', 'webp'];
      if (!allowedExtensions.includes(extension)) {
        toast({
          title: 'Unsupported file',
          description: 'Upload JPG, PNG, GIF, BMP, TIFF, or WEBP images.',
          variant: 'destructive',
        });
        event.target.value = '';
        return;
      }
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', selectedKind);
      formData.append('category', 'inspection');
      if (description.trim()) formData.append('description', description.trim());

      await api.mfgUploadAttachment(token, workOrderId, formData);

      toast({
        title: 'Image uploaded',
        description: `${file.name} uploaded successfully.`,
      });

      setDescription('');
      event.target.value = '';
      await loadAttachments();
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err?.message || 'Unable to upload inspection image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename) => {
    if (!token || !workOrderId) return;
    try {
      await api.mfgDeleteAttachment(token, workOrderId, filename);
      toast({ title: 'Image removed' });
      await loadAttachments();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err?.message || 'Unable to delete inspection image.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (attachment) => {
    try {
      if (attachment?.url) {
        window.open(attachment.url, '_blank', 'noopener,noreferrer');
        return;
      }
      // Fallback to API download if URL is not exposed
      const blob = await api.mfgDownloadAttachment(token, workOrderId, attachment.filename);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalName || attachment.filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      link.remove();
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err?.message || 'Unable to download inspection image.',
        variant: 'destructive',
      });
    }
  };

  if (!workOrderId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inspection Images</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a work order to manage inspection imagery.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Inspection Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <Label htmlFor="visual-inspection-kind">Image Type</Label>
              <select
                id="visual-inspection-kind"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedKind}
                onChange={(event) => setSelectedKind(event.target.value)}
                disabled={uploading}
              >
                {IMAGE_KINDS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <Label htmlFor="visual-inspection-description">Notes (optional)</Label>
              <Input
                id="visual-inspection-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Lighting setup, inspection station, etc."
                disabled={uploading}
              />
            </div>
            <div className="flex-none">
              <Button onClick={handleFilePick} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Choose Image
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Supported formats: JPG, PNG, GIF, BMP, TIFF, WEBP (max 50 MB).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Captured Images ({imageAttachments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading inspection images…
            </div>
          ) : imageAttachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-10 text-center">
              <Camera className="h-10 w-10 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                No inspection images uploaded yet.
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {imageAttachments.map((attachment) => (
                <div
                  key={attachment.filename}
                  className="flex flex-col overflow-hidden rounded-lg border border-gray-200"
                >
                  <div className="relative h-48 bg-muted">
                    <img
                      src={attachment.url}
                      alt={attachment.description || attachment.originalName || attachment.filename}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="text-sm font-medium text-gray-900">
                      {attachment.originalName || attachment.filename}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {attachment.kind.replace(/_/g, ' ')}
                    </div>
                    {attachment.description ? (
                      <div className="text-xs text-muted-foreground">
                        Notes: {attachment.description}
                      </div>
                    ) : null}
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(attachment.filename)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attachments stored for this work order.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {attachments.map((attachment) => (
                <li key={`all-${attachment.filename}`}>
                  {attachment.kind.replace(/_/g, ' ')} •{' '}
                  {attachment.originalName || attachment.filename}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VisualInspectionImagesPanel;
