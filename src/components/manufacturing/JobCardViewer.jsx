import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import {
  FileText,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Maximize,
} from 'lucide-react';

const JobCardViewer = ({
  files = [],
  selectedFile,
  workOrder,
  token
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Load PDF file
  useEffect(() => {
    const loadPdfFile = async () => {
      if (!selectedFile || !token || !workOrder) {
        setPdfUrl(null);
        return;
      }

      setLoading(true);
      try {
        // Get PDF blob URL
        const blob = await api.mfgDownloadAttachment(token, workOrder._id || workOrder.id, selectedFile.filename);
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);

        // In a real implementation, you'd use a PDF library to get page count
        // For now, we'll simulate
        setTotalPages(3); // Mock page count
        setCurrentPage(1);

      } catch (err) {
        toast({
          title: 'Failed to load PDF',
          description: err?.message || 'Unable to load job card PDF.',
          variant: 'destructive',
        });
        setPdfUrl(null);
      } finally {
        setLoading(false);
      }
    };

    loadPdfFile();

    // Cleanup blob URL on unmount or file change
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [selectedFile, token, workOrder, toast]);

  // Handle zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
  };

  // Handle page navigation
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Handle download
  const handleDownload = async () => {
    if (!selectedFile || !token || !workOrder) return;

    try {
      const blob = await api.mfgDownloadAttachment(token, workOrder._id || workOrder.id, selectedFile.filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.originalName || selectedFile.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err?.message || 'Unable to download job card.',
        variant: 'destructive',
      });
    }
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Card Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No job card files available for this work order.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Job Card Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* View Controls */}
            <Button variant="outline" size="sm" onClick={handleResetView}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>

            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PDF Viewer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Job Card - {selectedFile?.originalName || selectedFile?.filename || 'No file selected'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-sm text-muted-foreground">Loading job card...</div>
            </div>
          ) : pdfUrl ? (
            <div className="relative">
              {/* PDF Display */}
              <div
                className="border border-gray-200 bg-gray-50 flex items-center justify-center"
                style={{
                  height: '600px',
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center top',
                }}
              >
                {/* Mock PDF content - in a real implementation, you'd use a PDF viewer library */}
                <div className="text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">Job Card PDF</p>
                  <p className="text-sm">Page {currentPage} of {totalPages}</p>
                  <div className="mt-4 p-4 bg-white rounded border max-w-md mx-auto">
                    <h3 className="font-bold text-lg mb-2">Work Order: {workOrder?.woNumber}</h3>
                    <p className="text-sm mb-1">Product: {workOrder?.product}</p>
                    <p className="text-sm mb-1">Stage: Photo Imaging</p>
                    <p className="text-sm mb-1">Operator: {workOrder?.camStatus?.owner || 'Unassigned'}</p>
                    <div className="mt-4 text-xs text-gray-600">
                      <p>Imaging Parameters:</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>Exposure Time: 120 seconds</li>
                        <li>UV Intensity: 25 mW/cm²</li>
                        <li>Focus: Auto</li>
                        <li>Resolution: 5080 DPI</li>
                      </ul>
                    </div>
                    <div className="mt-4 text-xs text-gray-600">
                      <p>Quality Checks:</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>☐ Verify artwork alignment</li>
                        <li>☐ Check emulsion integrity</li>
                        <li>☐ Inspect for pinholes</li>
                        <li>☐ Confirm registration marks</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page indicator overlay */}
              <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded border text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4" />
                <p>No PDF loaded</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JobCardViewer;