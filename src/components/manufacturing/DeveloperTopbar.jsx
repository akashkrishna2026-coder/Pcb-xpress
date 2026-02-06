import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Upload,
  Download,
  Search,
  Filter,
  Plus,
  FileText,
  Settings,
  FlaskConical,
  Layers,
  Ruler,
  FileImage,
} from 'lucide-react';

const DeveloperTopbar = ({
  onBulkImport,
  onExport,
  onSearch,
  onFilter,
  onAddWorkOrder,
  onSettings,
  searchQuery = '',
  onSearchChange,
  loading = false
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearchChange?.(localSearch);
    onSearch?.(localSearch);
  };

  const handleSearchChange = (value) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-white border-b">
      {/* Left side - Search */}
      <div className="flex items-center gap-4 flex-1">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search work orders, products..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={loading}
          >
            Search
          </Button>
        </form>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onFilter}
          disabled={loading}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onBulkImport}
          disabled={loading}
        >
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={loading}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onAddWorkOrder}
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Work Order
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSettings}
          disabled={loading}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DeveloperTopbar;