import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  CheckCircle,
  Circle,
  AlertTriangle,
  FileText,
  Settings,
  Layers,
  Zap,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  CheckSquare
} from 'lucide-react';
import { DFM_CHECKLISTS, getAllDfmChecklists, getDfmChecklistById } from '@/lib/dfmChecklists';
import ChecklistItem from './ChecklistItem';

const processIcons = {
  'CAM Intake': <FileText className="h-5 w-5 text-blue-500" />,
  'NC Drill': <Settings className="h-5 w-5 text-green-500" />,
  'Phototools': <Layers className="h-5 w-5 text-purple-500" />
};

const severityColors = {
  critical: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-yellow-600',
  low: 'text-blue-600',
  info: 'text-gray-600'
};

const categoryColors = {
  file_integrity: 'bg-blue-50 border-blue-200',
  file_preparation: 'bg-blue-50 border-blue-200',
  design_specification: 'bg-green-50 border-green-200',
  manufacturing_requirements: 'bg-purple-50 border-purple-200',
  hole_classification: 'bg-orange-50 border-orange-200',
  spacing_verification: 'bg-red-50 border-red-200',
  special_features: 'bg-yellow-50 border-yellow-200',
  coordinate_system: 'bg-indigo-50 border-indigo-200',
  mask_verification: 'bg-pink-50 border-pink-200',
  silkscreen_verification: 'bg-cyan-50 border-cyan-200',
  layer_polarity: 'bg-emerald-50 border-emerald-200',
  panel_features: 'bg-violet-50 border-violet-200',
  output_quality: 'bg-slate-50 border-slate-200',
  documentation: 'bg-gray-50 border-gray-200'
};

const DfmChecklists = ({
  workOrderId,
  token,
  operator,
  hasPermission,
  onChecklistUpdate
}) => {
  const { toast } = useToast();

  // State
  const [selectedProcess, setSelectedProcess] = useState('cam_intake');
  const [checklistData, setChecklistData] = useState({});
  const [showCompleted, setShowCompleted] = useState(true);
  const [saving, setSaving] = useState(false);

  // Get current checklist
  const currentChecklist = useMemo(() => {
    return getDfmChecklistById(selectedProcess);
  }, [selectedProcess]);

  // Get checklist progress
  const checklistProgress = useMemo(() => {
    if (!currentChecklist) return { completed: 0, total: 0, percentage: 0 };

    const items = currentChecklist.items;
    const completed = items.filter(item => checklistData[item.id]?.completed).length;
    const required = items.filter(item => item.required);
    const requiredCompleted = required.filter(item => checklistData[item.id]?.completed).length;

    return {
      completed,
      total: items.length,
      percentage: Math.round((completed / items.length) * 100),
      requiredCompleted,
      requiredTotal: required.length,
      allRequiredComplete: requiredCompleted === required.length
    };
  }, [currentChecklist, checklistData]);

  // Handle checklist item toggle
  const handleItemToggle = (itemId) => {
    setChecklistData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        completed: !prev[itemId]?.completed,
        completedAt: !prev[itemId]?.completed ? new Date() : null,
        completedBy: !prev[itemId]?.completed ? operator?.name || operator?.loginId : null
      }
    }));
  };

  // Handle notes update
  const handleNotesUpdate = (itemId, notes) => {
    setChecklistData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes,
        updatedAt: new Date()
      }
    }));
  };

  // Save checklist progress
  const handleSaveChecklist = async () => {
    if (!hasPermission('dfm:manage')) {
      toast({
        title: 'Permission denied',
        description: 'You do not have permission to save checklist progress.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // Here you would typically save to the backend
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      if (onChecklistUpdate) {
        onChecklistUpdate(selectedProcess, checklistData);
      }

      toast({
        title: 'Checklist saved',
        description: `${currentChecklist.title} progress has been saved.`,
      });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err?.message || 'Unable to save checklist progress.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset checklist
  const handleResetChecklist = () => {
    if (window.confirm('Are you sure you want to reset this checklist? All progress will be lost.')) {
      setChecklistData({});
      toast({
        title: 'Checklist reset',
        description: 'All checklist items have been unmarked.',
      });
    }
  };

  // Filter items based on completion status
  const filteredItems = useMemo(() => {
    if (!currentChecklist) return [];

    return currentChecklist.items.filter(item => {
      if (showCompleted) return true;
      return !checklistData[item.id]?.completed;
    });
  }, [currentChecklist, checklistData, showCompleted]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  if (!currentChecklist) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Checklist not found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {processIcons[currentChecklist.process]}
              <div>
                <CardTitle className="text-xl">{currentChecklist.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentChecklist.description}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {checklistProgress.percentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                {checklistProgress.completed}/{checklistProgress.total} completed
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Process Selection */}
          <div className="flex gap-2 mb-4">
            {getAllDfmChecklists().map((checklist) => (
              <Button
                key={checklist.id}
                variant={selectedProcess === checklist.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedProcess(checklist.id)}
                className="flex items-center gap-2"
              >
                {processIcons[checklist.process]}
                {checklist.process}
              </Button>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{checklistProgress.completed}/{checklistProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${checklistProgress.percentage}%` }}
              />
            </div>
            {checklistProgress.requiredTotal > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Required items: {checklistProgress.requiredCompleted}/{checklistProgress.requiredTotal}</span>
                <span className={checklistProgress.allRequiredComplete ? 'text-green-600' : 'text-orange-600'}>
                  {checklistProgress.allRequiredComplete ? 'All required complete' : 'Required items pending'}
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                {showCompleted ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showCompleted ? 'Hide' : 'Show'} Completed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetChecklist}
                disabled={!Object.keys(checklistData).length}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
            {hasPermission('dfm:manage') && (
              <Button
                onClick={handleSaveChecklist}
                disabled={saving}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Progress'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <div className="space-y-4">
        {Object.entries(groupedItems).map(([category, items]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg capitalize flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${categoryColors[category]?.split(' ')[0] || 'bg-gray-400'}`} />
                {category.replace(/_/g, ' ')}
                <span className="text-sm font-normal text-muted-foreground ml-auto">
                  {items.filter(item => checklistData[item.id]?.completed).length}/{items.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg transition-all ${
                    checklistData[item.id]?.completed
                      ? 'bg-green-50 border-green-200'
                      : categoryColors[item.category] || 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleItemToggle(item.id)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {checklistData[item.id]?.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${
                          checklistData[item.id]?.completed ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {item.label}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.required && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Required
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[item.severity]} bg-opacity-10`}>
                            {item.severity}
                          </span>
                        </div>
                      </div>

                      {checklistData[item.id]?.completed && checklistData[item.id]?.completedBy && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed by {checklistData[item.id].completedBy} on{' '}
                          {new Date(checklistData[item.id].completedAt).toLocaleDateString()}
                        </p>
                      )}

                      {checklistData[item.id]?.notes && (
                        <div className="mt-2 p-2 bg-white rounded border">
                          <p className="text-xs text-muted-foreground">
                            <strong>Notes:</strong> {checklistData[item.id].notes}
                          </p>
                        </div>
                      )}

                      {/* Notes input for completed items */}
                      {checklistData[item.id]?.completed && (
                        <div className="mt-2">
                          <textarea
                            placeholder="Add notes (optional)..."
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            rows={2}
                            value={checklistData[item.id]?.notes || ''}
                            onChange={(e) => handleNotesUpdate(item.id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckSquare className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {showCompleted ? 'No items in this checklist' : 'All items completed!'}
            </h3>
            <p className="text-muted-foreground">
              {showCompleted
                ? 'This checklist appears to be empty.'
                : 'Great job! All checklist items have been completed.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DfmChecklists;