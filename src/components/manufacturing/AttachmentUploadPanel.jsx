import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Download, Loader2, Trash2, UploadCloud } from 'lucide-react';

const AttachmentUploadPanel = ({
  workOrder,
  token,
  onWorkOrderUpdated,
  title = 'Upload Files',
  description,
  kinds = [],
  defaultKind,
  category = 'assembly',
  accept = '*/*',
  emptyLabel = 'No files uploaded yet.',
  allowDescription = true,
  referenceLabel,
  referencePlaceholder,
  referenceRequired = false,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const workOrderId = workOrder?._id || workOrder?.id;
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedKind, setSelectedKind] = useState(
    defaultKind || (kinds[0]?.value ?? '')
  );
  const [notes, setNotes] = useState('');
  const [referenceValue, setReferenceValue] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);

  const allowedKindValues = useMemo(
    () => kinds.map((item) => item.value),
    [kinds]
  );

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
        title: 'Unable to load attachments',
        description: err?.message || 'Failed to fetch manufacturing files.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId, token, refreshCounter]);

  const filteredAttachments = useMemo(() => {
    if (!allowedKindValues.length) return attachments;
    return attachments.filter((att) => allowedKindValues.includes(att.kind));
  }, [attachments, allowedKindValues]);

  const handlePickFile = () => {
    if (!workOrderId) {
      toast({
        title: 'Select a work order',
        description: 'Choose a work order before uploading files.',
        variant: 'destructive',
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !workOrderId) return;

    if (referenceRequired && !referenceValue.trim()) {
      toast({
        title: 'Missing reference',
        description: `Please enter ${referenceLabel || 'a reference'} before uploading.`,
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    const kindToUse = selectedKind || defaultKind || kinds[0]?.value || '';
    if (!kindToUse) {
      toast({
        title: 'Select file type',
        description: 'Choose which document type you are uploading.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kindToUse);
      if (category) formData.append('category', category);
      if (referenceValue.trim()) {
        formData.append('camNumber', referenceValue.trim());
      }
      if (allowDescription && notes.trim()) {
        formData.append('description', notes.trim());
      }

      await api.mfgUploadAttachment(token, workOrderId, formData);
      toast({
        title: 'File uploaded',
        description: `${file.name} uploaded successfully.`,
      });

      setNotes('');
      setReferenceValue('');
      event.target.value = '';
      await loadAttachments();
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err?.message || 'Unable to upload file right now.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename) => {
    if (!filename || !token || !workOrderId) return;

    try {
      await api.mfgDeleteAttachment(token, workOrderId, filename);
      toast({
        title: 'File deleted',
        description: 'Attachment removed from work order.',
      });
      await loadAttachments();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err?.message || 'Unable to delete file.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (attachment) => {
    if (!attachment?.filename || !token || !workOrderId) {
      return;
    }
    try {
      const blob = await api.mfgDownloadAttachment(token, workOrderId, attachment.filename);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalName || attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err?.message || 'Unable to download attachment.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description ? (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshCounter((value) => value + 1)}
            disabled={loading || uploading}
          >
            <Loader2 className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4">
            {kinds.length > 1 ? (
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Document Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={selectedKind}
                  onChange={(event) => setSelectedKind(event.target.value)}
                >
                  {kinds.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {allowDescription ? (
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Notes (optional)</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add context for this upload"
                />
              </div>
            ) : null}

            {referenceLabel ? (
              <div className="grid gap-2">
                <Label className="text-sm font-medium">{referenceLabel}{referenceRequired ? ' *' : ''}</Label>
                <Input
                  value={referenceValue}
                  onChange={(event) => setReferenceValue(event.target.value)}
                  placeholder={referencePlaceholder || `Enter ${referenceLabel.toLowerCase()}`}
                  disabled={uploading}
                />
              </div>
            ) : null}

            <div className="flex flex-col items-start gap-3 rounded-lg border border-gray-200 bg-muted/30 p-4">
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                {accept && accept !== '*/*'
                  ? `Supported: ${accept}`
                  : 'Upload files up to 50 MB.'}
              </div>
              <Button onClick={handlePickFile} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Choose File
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          </div>

          <div>
            <CardTitle className="text-base mb-3">
              Uploaded Files ({filteredAttachments.length})
            </CardTitle>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : filteredAttachments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-muted-foreground">
                {emptyLabel}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAttachments.map((attachment) => (
                  <div
                    key={attachment.filename}
                    className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {attachment.originalName || attachment.filename}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {attachment.kind.replace(/_/g, ' ')} • Uploaded{' '}
                        {attachment.uploadedAt
                          ? new Date(attachment.uploadedAt).toLocaleString()
                          : 'unknown'}
                      </div>
                      {attachment.description ? (
                        <div className="text-xs text-muted-foreground">
                          Notes: {attachment.description}
                        </div>
                      ) : null}
                      {attachment.camNumber ? (
                        <div className="text-xs text-muted-foreground">
                          {referenceLabel || 'Reference'}: {attachment.camNumber}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttachmentUploadPanel;
