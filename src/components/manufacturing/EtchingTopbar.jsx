import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, Plus, Search, Settings, Upload, Download } from 'lucide-react';

const EtchingTopbar = ({
  onBulkImport,
  onExport,
  onSearch,
  onFilter,
  onAddWorkOrder,
  onSettings,
  searchQuery = '',
  onSearchChange,
  loading = false,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearchChange?.(localSearch);
    onSearch?.(localSearch);
  };

  const handleChange = (value) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between p-4 bg-white border-b">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full lg:max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search work orders, products..."
            value={localSearch}
            onChange={(e) => handleChange(e.target.value)}
            className="pl-9"
            disabled={loading}
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={loading}>
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onFilter} disabled={loading}>
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button variant="outline" size="sm" onClick={onBulkImport} disabled={loading}>
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={onAddWorkOrder} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          Add Work Order
        </Button>
        <Button variant="outline" size="sm" onClick={onSettings} disabled={loading}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default EtchingTopbar;
