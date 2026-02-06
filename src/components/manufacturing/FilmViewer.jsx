import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import {
  Image,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Search,
  AlertTriangle,
  CheckCircle,
  Target,
} from 'lucide-react';

const FilmViewer = ({
  files = [],
  selectedFile,
  zoom = 1,
  rotation = 0,
  workOrder,
  token
}) => {
  const { toast } = useToast();
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [inspectionMode, setInspectionMode] = useState(false);
  const [defects, setDefects] = useState([]);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  // Load image file
  useEffect(() => {
    const loadImageFile = async () => {
      if (!selectedFile || !token || !workOrder) {
        setImageUrl(null);
        setImageLoaded(false);
        return;
      }

      setLoading(true);
      try {
        const blob = await api.mfgDownloadAttachment(token, workOrder._id || workOrder.id, selectedFile.filename);
        const url = window.URL.createObjectURL(blob);
        setImageUrl(url);
        setImageLoaded(false);
      } catch (err) {
        toast({
          title: 'Failed to load image',
          description: err?.message || 'Unable to load film image.',
          variant: 'destructive',
        });
        setImageUrl(null);
      } finally {
        setLoading(false);
      }
    };

    loadImageFile();

    // Cleanup blob URL on unmount or file change
    return () => {
      if (imageUrl) {
        window.URL.revokeObjectURL(imageUrl);
      }
    };
  }, [selectedFile, token, workOrder, toast]);

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Render image with effects to canvas
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Set canvas size to match image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up transformation
    ctx.save();
    ctx.translate(canvas.width / 2 + panOffset.x, canvas.height / 2 + panOffset.y);
    ctx.scale(zoom, zoom);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Apply brightness and contrast filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Reset filter for overlays
    ctx.filter = 'none';

    // Draw inspection overlays
    if (inspectionMode) {
      // Draw grid for inspection
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1 / zoom;
      const gridSize = 50;

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw defect markers
    defects.forEach((defect, index) => {
      ctx.strokeStyle = defect.type === 'critical' ? '#EF4444' : defect.type === 'major' ? '#F59E0B' : '#10B981';
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.arc(defect.x, defect.y, 10 / zoom, 0, 2 * Math.PI);
      ctx.stroke();

      // Defect label
      ctx.fillStyle = defect.type === 'critical' ? '#EF4444' : defect.type === 'major' ? '#F59E0B' : '#10B981';
      ctx.font = `${12 / zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(`${index + 1}`, defect.x, defect.y - 15 / zoom);
    });

    ctx.restore();
  }, [imageLoaded, zoom, rotation, panOffset, inspectionMode, defects, brightness, contrast]);

  // Handle mouse events for panning
  const handleMouseDown = (e) => {
    if (inspectionMode) {
      // Add defect marker
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // Transform back from zoom/rotation
      const centerX = canvasRef.current.width / 2;
      const centerY = canvasRef.current.height / 2;

      const dx = x - centerX - panOffset.x;
      const dy = y - centerY - panOffset.y;

      const cos = Math.cos((-rotation * Math.PI) / 180);
      const sin = Math.sin((-rotation * Math.PI) / 180);

      const rotatedX = dx * cos - dy * sin;
      const rotatedY = dx * sin + dy * cos;

      const finalX = rotatedX / zoom + centerX;
      const finalY = rotatedY / zoom + centerY;

      const newDefect = {
        x: finalX,
        y: finalY,
        type: 'minor', // Default type
        description: `Defect ${defects.length + 1}`
      };

      setDefects(prev => [...prev, newDefect]);
      return;
    }

    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;

    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
        description: err?.message || 'Unable to download film image.',
        variant: 'destructive',
      });
    }
  };

  // Reset view
  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Film Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No film image files available for this work order.
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
          <CardTitle className="text-lg">Film Inspection Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* View Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={inspectionMode ? "default" : "outline"}
                size="sm"
                onClick={() => setInspectionMode(!inspectionMode)}
              >
                <Target className="h-4 w-4 mr-2" />
                Inspection Mode
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetView}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset View
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            {/* Image Adjustments */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Brightness: {brightness}%</label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contrast: {contrast}%</label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </div>
            </div>

            {/* Defects Summary */}
            {defects.length > 0 && (
              <div className="border rounded p-3">
                <h4 className="text-sm font-medium mb-2">Defects Found ({defects.length})</h4>
                <div className="space-y-1">
                  {defects.map((defect, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className={`w-3 h-3 rounded-full ${
                        defect.type === 'critical' ? 'bg-red-500' :
                        defect.type === 'major' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <span>Defect {index + 1} at ({Math.round(defect.x)}, {Math.round(defect.y)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Viewer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Film Image - {selectedFile?.originalName || selectedFile?.filename || 'No file selected'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-sm text-muted-foreground">Loading film image...</div>
            </div>
          ) : imageUrl ? (
            <div className="relative">
              {/* Hidden image for loading */}
              <img
                ref={imageRef}
                src={imageUrl}
                onLoad={handleImageLoad}
                style={{ display: 'none' }}
                alt="Film"
              />

              {/* Canvas for display */}
              <canvas
                ref={canvasRef}
                className={`border border-gray-200 ${inspectionMode ? 'cursor-crosshair' : 'cursor-move'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  display: imageLoaded ? 'block' : 'none'
                }}
              />

              {/* Status overlay */}
              <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-white px-2 py-1 rounded border">
                Zoom: {Math.round(zoom * 100)}% | Rotation: {rotation}° | {inspectionMode ? 'Inspection' : 'View'} Mode
              </div>

              {/* Instructions overlay */}
              {inspectionMode && (
                <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-white px-2 py-1 rounded border">
                  Click to mark defects • {defects.length} defects found
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center text-muted-foreground">
                <Image className="h-16 w-16 mx-auto mb-4" />
                <p>No image loaded</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FilmViewer;