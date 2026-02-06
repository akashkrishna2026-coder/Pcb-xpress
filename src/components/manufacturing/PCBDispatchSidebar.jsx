import React from 'react';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  GitBranch,
  ClipboardList,
  FileText,
  FileSpreadsheet,
  Tag,
  CheckSquare,
  CheckCircle
} from 'lucide-react';

const PCBDispatchSidebar = ({
  activeSection = 'work-orders',
  onNavigate
}) => {
  const menuItems = [
    { id: 'work-orders', label: 'Work Orders', icon: LayoutDashboard },
    { id: 'pcb-pipeline', label: 'PCB Pipeline', icon: GitBranch },
    { id: 'pcb-orders', label: 'PCB Orders', icon: ClipboardList },
    { id: 'test-reports', label: 'Test Reports', icon: FileText },
    { id: 'invoice', label: 'Invoice', icon: FileSpreadsheet },
    { id: 'shipping-labels', label: 'Shipping Labels', icon: Tag },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'final', label: 'Final Transfer', icon: CheckCircle }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <li key={item.id}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  className={`w-full justify-start ${
                    isActive
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => onNavigate && onNavigate(item.id)}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default PCBDispatchSidebar;