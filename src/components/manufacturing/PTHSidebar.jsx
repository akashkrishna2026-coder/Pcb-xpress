import React from 'react';
import { Button } from '@/components/ui/button';
import {
  ClipboardList,
  FileText,
  Settings,
  CheckCircle,
  LayoutDashboard,
  Beaker
} from 'lucide-react';

const PTHSidebar = ({
  activeSection = 'work-orders',
  onNavigate
}) => {
  const menuItems = [
    { id: 'work-orders', label: 'Work Orders', icon: LayoutDashboard },
    { id: 'job-cards', label: 'Job Cards', icon: ClipboardList },
    { id: 'checklist', label: 'Checklist', icon: Settings },
    { id: 'pth-parameters', label: 'PTH Parameters', icon: Beaker },
    { id: 'final-checklist', label: 'Final Checklist', icon: CheckCircle }
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

export default PTHSidebar;