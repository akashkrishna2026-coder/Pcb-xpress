import React from 'react';
import { Button } from '@/components/ui/button';
import {
  ClipboardList,
  Eye,
  Settings,
  CheckSquare,
  ArrowRight,
  Image,
  Layers,
  Ruler,
  FileImage,
  FileText,
  GitBranch
} from 'lucide-react';

const PhotoImagingSidebar = ({
  activeSection = 'work-orders',
  onNavigate
}) => {
  const menuItems = [
    { id: 'work-orders', label: 'Work Orders', icon: ClipboardList },
    { id: 'file-viewer', label: 'File Viewer', icon: Eye },
    { id: 'parameters', label: 'Imaging Parameters', icon: Settings },
    { id: 'checklist', label: 'Quality Checklist', icon: CheckSquare },
    { id: 'transfer', label: 'Transfer to Developer', icon: ArrowRight },
    { id: 'pcb-pipeline', label: 'PCB Pipeline', icon: GitBranch }
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

export default PhotoImagingSidebar;