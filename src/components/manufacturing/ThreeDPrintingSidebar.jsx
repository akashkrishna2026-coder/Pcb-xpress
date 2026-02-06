import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Settings,
  Printer,
  CheckSquare,
  Package,
} from 'lucide-react';

const ThreeDPrintingSidebar = ({ workOrder, onStageChange }) => {
  const navItems = [
    {
      id: 'work-orders',
      label: 'Print Orders',
      icon: LayoutDashboard,
      stage: '3d_printing_intake',
    },
    {
      id: 'file-prep',
      label: 'File Preparation',
      icon: FileText,
      stage: '3d_printing_file_prep',
    },
    {
      id: 'slicing',
      label: 'Slicing Setup',
      icon: Settings,
      stage: '3d_printing_slicing',
    },
    {
      id: 'printing',
      label: 'Active Printing',
      icon: Printer,
      stage: '3d_printing_active',
    },
    {
      id: 'checklist',
      label: 'Checklist',
      icon: CheckSquare,
      stage: '3d_printing_qc',
    },
    {
      id: 'dispatch',
      label: 'Dispatch',
      icon: Package,
      stage: '3d_printing_dispatch',
    },
  ];

  return (
    <div className="w-64 bg-secondary/30 border-r border-border h-full overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">3D Printing</h2>
        <p className="text-sm text-muted-foreground">Print Operations</p>
      </div>
      <nav className="p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = workOrder?.stage === item.stage;
          return (
            <button
              key={item.id}
              onClick={() => onStageChange && onStageChange(item.stage)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-primary hover:bg-accent'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default ThreeDPrintingSidebar;