import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  Info,
  Zap,
  Settings,
  Layers
} from 'lucide-react';
import { DFM_TEMPLATES, getAllDfmTemplates, getDfmTemplatesByCategory } from '@/lib/dfmTemplates';

const severityIcons = {
  critical: <AlertTriangle className="h-4 w-4 text-red-500" />,
  high: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  medium: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  low: <AlertTriangle className="h-4 w-4 text-blue-500" />,
  info: <Info className="h-4 w-4 text-gray-500" />
};

const categoryIcons = {
  electrical: <Zap className="h-4 w-4 text-blue-500" />,
  mechanical: <Settings className="h-4 w-4 text-green-500" />,
  process: <Layers className="h-4 w-4 text-purple-500" />
};

const severityColors = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  info: 'bg-gray-100 text-gray-800 border-gray-200',
};

const DfmTemplates = ({ onSelectTemplate, selectedTemplates = [] }) => {
  const { toast } = useToast();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    let templates = selectedCategory === 'all'
      ? getAllDfmTemplates()
      : getDfmTemplatesByCategory(selectedCategory);

    if (searchTerm) {
      templates = templates.filter(template =>
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSeverity !== 'all') {
      templates = templates.filter(template => template.severity === selectedSeverity);
    }

    return templates;
  }, [searchTerm, selectedCategory, selectedSeverity]);

  // Handle template selection
  const handleSelectTemplate = (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
      toast({
        title: 'Template selected',
        description: `${template.code} - ${template.description}`,
      });
    }
  };

  // Check if template is already selected
  const isTemplateSelected = (templateCode) => {
    return selectedTemplates.some(t => t.code === templateCode);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">DFM Issue Templates</h3>
          <p className="text-sm text-muted-foreground">
            Select from predefined templates for common manufacturing issues
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredTemplates.length} templates available
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  className="w-full pl-10 pr-4 py-2 border rounded-md text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="min-w-[150px]">
              <select
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="electrical">Electrical</option>
                <option value="mechanical">Mechanical</option>
                <option value="process">Process</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="min-w-[150px]">
              <select
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card
            key={template.code}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isTemplateSelected(template.code) ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleSelectTemplate(template)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {categoryIcons[template.category]}
                  <span className="text-sm font-mono text-muted-foreground">
                    {template.code}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {severityIcons[template.severity]}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[template.severity]}`}>
                    {template.severity}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm mb-3">{template.description}</p>

              {template.commonCauses && template.commonCauses.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Common Causes:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {template.commonCauses.slice(0, 2).map((cause, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-muted-foreground">•</span>
                        <span>{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="capitalize">{template.category}</span>
                </div>
                <Button
                  size="sm"
                  variant={isTemplateSelected(template.code) ? "secondary" : "outline"}
                  className="h-7 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTemplate(template);
                  }}
                >
                  {isTemplateSelected(template.code) ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Selected
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-1" />
                      Select
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DfmTemplates;