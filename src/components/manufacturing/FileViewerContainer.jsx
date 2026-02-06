import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
// Note: Tabs component not available, using simple button-based tabs
import {
  Layers,
  Ruler,
  FileText,
  Image,
  Download,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import GerberViewer from './GerberViewer';
import PanelLayoutViewer from './PanelLayoutViewer';
import JobCardViewer from './JobCardViewer';
import FilmViewer from './FilmViewer';

const FileViewerContainer = ({
  workOrder,
  activeViewer = 'gerber',
  selectedFile,
  onViewerChange,
  onFileSelect,
  token
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Load files for the work order
  useEffect(() => {
    const loadFiles = async () => {
      if (!workOrder || !token) return;

      setLoading(true);
      try {
        const res = await api.mfgListAttachments(token, workOrder._id || workOrder.id);
        const attachments = Array.isArray(res?.attachments) ? res.attachments : [];

        // Filter relevant files for photo imaging
        const relevantFiles = attachments.filter(att =>
          ['gerber', 'photo_file', 'job_card', 'panel_layout'].includes(att.kind)
        );

        setFiles(relevantFiles);
      } catch (err) {
        toast({
          title: 'Failed to load files',
          description: err?.message || 'Unable to fetch work order files.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [workOrder, token, toast]);

  // Handle file download
  const handleDownload = async (file) => {
    try {
      const blob = await api.mfgDownloadAttachment(token, workOrder._id || workOrder.id, file.filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName || file.filename;
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

  // Handle zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
  };

  if (!workOrder) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>File Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a work order to view files.
          </p>
        </CardContent>
      </Card>
    );
  }

  const gerberFiles = files.filter(f => f.kind === 'gerber');
  const panelFiles = files.filter(f => f.kind === 'panel_layout');
  const jobCardFiles = files.filter(f => f.kind === 'job_card');
  const filmFiles = files.filter(f => f.kind === 'photo_file');

  return (
    <div className="space-y-4">
      {/* File List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Files for {workOrder.woNumber}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading files...</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files available for this work order.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => (
                <div key={file.filename} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {file.kind === 'gerber' && <Layers className="h-4 w-4" />}
                    {file.kind === 'panel_layout' && <Ruler className="h-4 w-4" />}
                    {file.kind === 'job_card' && <FileText className="h-4 w-4" />}
                    {file.kind === 'photo_file' && <Image className="h-4 w-4" />}
                    <span className="text-sm font-medium truncate">
                      {file.originalName || file.filename}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''} • {file.kind}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFileSelect(file)}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Viewer Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>File Viewer</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetView}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Simple button-based tabs */}
          <div className="border-b border-gray-200 mb-4">
            <div className="flex space-x-1">
              <button
                onClick={() => onViewerChange('gerber')}
                disabled={gerberFiles.length === 0}
                className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                  activeViewer === 'gerber'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${gerberFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Gerber ({gerberFiles.length})
              </button>
              <button
                onClick={() => onViewerChange('panel')}
                disabled={panelFiles.length === 0}
                className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                  activeViewer === 'panel'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${panelFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Panel Layout ({panelFiles.length})
              </button>
              <button
                onClick={() => onViewerChange('jobcard')}
                disabled={jobCardFiles.length === 0}
                className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                  activeViewer === 'jobcard'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${jobCardFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Job Card ({jobCardFiles.length})
              </button>
              <button
                onClick={() => onViewerChange('film')}
                disabled={filmFiles.length === 0}
                className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                  activeViewer === 'film'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${filmFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Film ({filmFiles.length})
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="mt-4">
            {activeViewer === 'gerber' && (
              <GerberViewer
                files={gerberFiles}
                selectedFile={selectedFile}
                zoom={zoom}
                rotation={rotation}
                workOrder={workOrder}
                token={token}
              />
            )}

            {activeViewer === 'panel' && (
              <PanelLayoutViewer
                files={panelFiles}
                selectedFile={selectedFile}
                zoom={zoom}
                rotation={rotation}
                workOrder={workOrder}
                token={token}
              />
            )}

            {activeViewer === 'jobcard' && (
              <JobCardViewer
                files={jobCardFiles}
                selectedFile={selectedFile}
                workOrder={workOrder}
                token={token}
              />
            )}

            {activeViewer === 'film' && (
              <FilmViewer
                files={filmFiles}
                selectedFile={selectedFile}
                zoom={zoom}
                rotation={rotation}
                workOrder={workOrder}
                token={token}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileViewerContainer;