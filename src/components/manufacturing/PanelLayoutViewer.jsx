import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import {
  Ruler,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Target,
  Square,
  Circle,
  Triangle,
} from 'lucide-react';

const PanelLayoutViewer = ({
  files = [],
  selectedFile,
  zoom = 1,
  rotation = 0,
  workOrder,
  token
}) => {
  const { toast } = useToast();
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [panelData, setPanelData] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurements, setMeasurements] = useState([]);

  // Load panel layout file
  useEffect(() => {
    const loadPanelFile = async () => {
      if (!selectedFile || !token || !workOrder) return;

      setLoading(true);
      try {
        // Mock panel layout data
        // In a real implementation, this would parse actual panel layout files
        const mockPanelData = {
          panelSize: { width: 200, height: 150 },
          boards: [
            { id: 1, x: 10, y: 10, width: 80, height: 60, rotation: 0 },
            { id: 2, x: 110, y: 10, width: 80, height: 60, rotation: 0 },
            { id: 3, x: 10, y: 80, width: 80, height: 60, rotation: 0 },
            { id: 4, x: 110, y: 80, width: 80, height: 60, rotation: 0 },
          ],
          fiducials: [
            { x: 5, y: 5, diameter: 3 },
            { x: 195, y: 5, diameter: 3 },
            { x: 5, y: 145, diameter: 3 },
            { x: 195, y: 145, diameter: 3 },
          ],
          toolingHoles: [
            { x: 20, y: 20, diameter: 5 },
            { x: 180, y: 20, diameter: 5 },
            { x: 20, y: 130, diameter: 5 },
            { x: 180, y: 130, diameter: 5 },
          ]
        };

        setPanelData(mockPanelData);
      } catch (err) {
        toast({
          title: 'Failed to load panel layout',
          description: err?.message || 'Unable to parse panel data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadPanelFile();
  }, [selectedFile, token, workOrder, toast]);

  // Render panel layout to canvas
  useEffect(() => {
    if (!canvasRef.current || !panelData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { panelSize, boards, fiducials, toolingHoles } = panelData;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up transformation
    ctx.save();
    ctx.translate(canvas.width / 2 + panOffset.x, canvas.height / 2 + panOffset.y);
    ctx.scale(zoom, zoom);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate scale to fit canvas
    const scaleX = canvas.width / panelSize.width;
    const scaleY = canvas.height / panelSize.height;
    const scale = Math.min(scaleX, scaleY) * 0.8;

    ctx.scale(scale, scale);
    ctx.translate(-panelSize.width / 2, -panelSize.height / 2);

    // Draw panel outline
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, panelSize.width, panelSize.height);

    // Draw grid
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 0.5;
    const gridSize = 10;

    for (let x = 0; x <= panelSize.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, panelSize.height);
      ctx.stroke();
    }

    for (let y = 0; y <= panelSize.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(panelSize.width, y);
      ctx.stroke();
    }

    // Draw fiducials
    ctx.fillStyle = '#EF4444';
    fiducials.forEach(fiducial => {
      ctx.beginPath();
      ctx.arc(fiducial.x, fiducial.y, fiducial.diameter / 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw tooling holes
    ctx.fillStyle = '#F59E0B';
    toolingHoles.forEach(hole => {
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, hole.diameter / 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw individual boards
    boards.forEach((board, index) => {
      // Board outline
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 1;
      ctx.strokeRect(board.x, board.y, board.width, board.height);

      // Board fill
      ctx.fillStyle = '#DBEAFE';
      ctx.globalAlpha = 0.3;
      ctx.fillRect(board.x, board.y, board.width, board.height);
      ctx.globalAlpha = 1;

      // Board label
      ctx.fillStyle = '#1E40AF';
      ctx.font = '4px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Board ${board.id}`,
        board.x + board.width / 2,
        board.y + board.height / 2
      );
    });

    // Draw measurements if enabled
    if (showMeasurements) {
      ctx.strokeStyle = '#10B981';
      ctx.fillStyle = '#10B981';
      ctx.font = '3px Arial';
      ctx.textAlign = 'center';

      // Panel dimensions
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(panelSize.width, -5);
      ctx.moveTo(0, panelSize.height + 5);
      ctx.lineTo(panelSize.width, panelSize.height + 5);
      ctx.stroke();

      ctx.fillText(
        `${panelSize.width}mm`,
        panelSize.width / 2,
        -8
      );

      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-5, panelSize.height);
      ctx.moveTo(panelSize.width + 5, 0);
      ctx.lineTo(panelSize.width + 5, panelSize.height);
      ctx.stroke();

      ctx.save();
      ctx.translate(-8, panelSize.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${panelSize.height}mm`, 0, 0);
      ctx.restore();
    }

    // Draw user measurements
    measurements.forEach(measurement => {
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(measurement.startX, measurement.startY);
      ctx.lineTo(measurement.endX, measurement.endY);
      ctx.stroke();

      // Measurement label
      const midX = (measurement.startX + measurement.endX) / 2;
      const midY = (measurement.startY + measurement.endY) / 2;
      const distance = Math.sqrt(
        Math.pow(measurement.endX - measurement.startX, 2) +
        Math.pow(measurement.endY - measurement.startY, 2)
      );

      ctx.fillStyle = '#8B5CF6';
      ctx.font = '3px Arial';
      ctx.fillText(`${distance.toFixed(1)}mm`, midX, midY - 2);
    });

    ctx.restore();
  }, [panelData, zoom, rotation, panOffset, showMeasurements, measurements]);

  // Handle mouse events for panning and measuring
  const handleMouseDown = (e) => {
    if (measurementMode) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - canvasRef.current.width / 2 - panOffset.x) / zoom;
      const y = (e.clientY - rect.top - canvasRef.current.height / 2 - panOffset.y) / zoom;

      // For measurement mode, we'd implement point selection
      // This is a simplified version
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

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Panel Layout Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No panel layout files available for this work order.
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
          <CardTitle className="text-lg">Panel Layout Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={showMeasurements ? "default" : "outline"}
              size="sm"
              onClick={() => setShowMeasurements(!showMeasurements)}
            >
              <Ruler className="h-4 w-4 mr-2" />
              Measurements
            </Button>
            <Button
              variant={measurementMode ? "default" : "outline"}
              size="sm"
              onClick={() => setMeasurementMode(!measurementMode)}
            >
              <Target className="h-4 w-4 mr-2" />
              Measure
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMeasurements([])}
            >
              Clear Measurements
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Panel Canvas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Panel Layout - {selectedFile?.originalName || selectedFile?.filename || 'No file selected'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-sm text-muted-foreground">Loading panel layout...</div>
            </div>
          ) : (
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className={`border border-gray-200 ${measurementMode ? 'cursor-crosshair' : 'cursor-move'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-white px-2 py-1 rounded border">
                Zoom: {Math.round(zoom * 100)}% | Rotation: {rotation}°
              </div>
              <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-white px-2 py-1 rounded border">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Square className="h-3 w-3 text-blue-500" />
                    <span>Boards</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Circle className="h-3 w-3 text-red-500" />
                    <span>Fiducials</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Circle className="h-3 w-3 text-yellow-500" />
                    <span>Tooling</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PanelLayoutViewer;