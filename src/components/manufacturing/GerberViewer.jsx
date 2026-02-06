import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import {
  Layers,
  Eye,
  EyeOff,
  Settings,
  Download,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw,
} from 'lucide-react';

const GerberViewer = ({
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
  const [gerberData, setGerberData] = useState(null);
  const [layers, setLayers] = useState([]);
  const [visibleLayers, setVisibleLayers] = useState(new Set());
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Load Gerber file
  useEffect(() => {
    const loadGerberFile = async () => {
      if (!selectedFile || !token || !workOrder) return;

      setLoading(true);
      try {
        // For now, we'll simulate Gerber parsing
        // In a real implementation, you'd use a Gerber parser library
        const mockLayers = [
          { id: 'top_copper', name: 'Top Copper', color: '#FF6B6B', visible: true },
          { id: 'bottom_copper', name: 'Bottom Copper', color: '#4ECDC4', visible: true },
          { id: 'top_silk', name: 'Top Silkscreen', color: '#FFFFFF', visible: true },
          { id: 'bottom_silk', name: 'Bottom Silkscreen', color: '#FFFFFF', visible: false },
          { id: 'top_solder', name: 'Top Solder Mask', color: '#45B7D1', visible: true },
          { id: 'bottom_solder', name: 'Bottom Solder Mask', color: '#96CEB4', visible: true },
        ];

        setLayers(mockLayers);
        setVisibleLayers(new Set(mockLayers.filter(l => l.visible).map(l => l.id)));

        // Mock Gerber data structure
        setGerberData({
          bounds: { minX: 0, minY: 0, maxX: 100, maxY: 80 },
          features: [
            // Mock features would be parsed from actual Gerber file
          ]
        });

      } catch (err) {
        toast({
          title: 'Failed to load Gerber file',
          description: err?.message || 'Unable to parse Gerber data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadGerberFile();
  }, [selectedFile, token, workOrder, toast]);

  // Render Gerber data to canvas
  useEffect(() => {
    if (!canvasRef.current || !gerberData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { bounds } = gerberData;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up transformation
    ctx.save();
    ctx.translate(canvas.width / 2 + panOffset.x, canvas.height / 2 + panOffset.y);
    ctx.scale(zoom, zoom);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate scale to fit canvas
    const scaleX = canvas.width / (bounds.maxX - bounds.minX);
    const scaleY = canvas.height / (bounds.maxY - bounds.minY);
    const scale = Math.min(scaleX, scaleY) * 0.8;

    ctx.scale(scale, scale);
    ctx.translate(-(bounds.minX + bounds.maxX) / 2, -(bounds.minY + bounds.maxY) / 2);

    // Draw grid
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1 / scale;
    const gridSize = 10;

    for (let x = Math.floor(bounds.minX / gridSize) * gridSize; x <= bounds.maxX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, bounds.minY);
      ctx.lineTo(x, bounds.maxY);
      ctx.stroke();
    }

    for (let y = Math.floor(bounds.minY / gridSize) * gridSize; y <= bounds.maxY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(bounds.minX, y);
      ctx.lineTo(bounds.maxX, y);
      ctx.stroke();
    }

    // Draw mock PCB features for each visible layer
    layers.forEach(layer => {
      if (!visibleLayers.has(layer.id)) return;

      ctx.strokeStyle = layer.color;
      ctx.fillStyle = layer.color;
      ctx.lineWidth = 0.1;

      // Draw mock traces and pads
      if (layer.id.includes('copper')) {
        // Draw traces
        ctx.beginPath();
        ctx.moveTo(10, 20);
        ctx.lineTo(90, 20);
        ctx.moveTo(10, 60);
        ctx.lineTo(90, 60);
        ctx.stroke();

        // Draw pads
        [20, 40, 60, 80].forEach(x => {
          ctx.beginPath();
          ctx.arc(x, 20, 1.5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, 60, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      // Draw solder mask openings
      if (layer.id.includes('solder')) {
        ctx.globalAlpha = 0.7;
        [20, 40, 60, 80].forEach(x => {
          ctx.beginPath();
          ctx.arc(x, 20, 2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, 60, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // Draw silkscreen text
      if (layer.id.includes('silk')) {
        ctx.font = `2px Arial`;
        ctx.fillStyle = layer.color;
        ctx.fillText('PCB TEXT', 30, 40);
      }
    });

    ctx.restore();
  }, [gerberData, layers, visibleLayers, zoom, rotation, panOffset]);

  // Handle mouse events for panning
  const handleMouseDown = (e) => {
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

  // Toggle layer visibility
  const toggleLayer = (layerId) => {
    setVisibleLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layerId)) {
        newSet.delete(layerId);
      } else {
        newSet.add(layerId);
      }
      return newSet;
    });
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerber Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No Gerber files available for this work order.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Layer Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Layer Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {layers.map(layer => (
              <Button
                key={layer.id}
                variant={visibleLayers.has(layer.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleLayer(layer.id)}
                className="justify-start"
              >
                <div
                  className="w-3 h-3 rounded mr-2 border"
                  style={{ backgroundColor: layer.color }}
                />
                {visibleLayers.has(layer.id) ? (
                  <Eye className="h-3 w-3 mr-1" />
                ) : (
                  <EyeOff className="h-3 w-3 mr-1" />
                )}
                {layer.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gerber Canvas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Gerber View - {selectedFile?.originalName || selectedFile?.filename || 'No file selected'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-sm text-muted-foreground">Loading Gerber file...</div>
            </div>
          ) : (
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="border border-gray-200 cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-white px-2 py-1 rounded border">
                Zoom: {Math.round(zoom * 100)}% | Rotation: {rotation}°
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GerberViewer;