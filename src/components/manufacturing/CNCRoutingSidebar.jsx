import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FileStack, CheckSquare, CheckCircle, Workflow } from 'lucide-react';

const CNCRoutingSidebar = ({ activeSection = 'work-orders', onNavigate }) => {
  const menuItems = [
    { id: 'work-orders', label: 'Work Orders', icon: LayoutDashboard },
    { id: 'drill-files', label: 'Drill & Job Cards', icon: FileStack },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'final', label: 'Final', icon: CheckCircle },
    { id: 'pcb-pipeline', label: 'PCB Pipeline', icon: Workflow },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200">
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
    </aside>
  );
};

export default CNCRoutingSidebar;
