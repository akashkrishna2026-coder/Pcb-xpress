import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Menu,
  X,
  Home,
  ClipboardList,
  Activity,
  Users,
  Settings,
  BarChart3,
  Shield,
  Package
} from 'lucide-react';
import AttendanceActions from './AttendanceActions';

// Operator name mapping based on login credentials
const OPERATOR_NAMES = {
  'cam.intake@pcbxpress.in': 'Manoharan',
  'cam.ncdrill@pcbxpress.in': 'Kuldeep',
  'cam.phototools@pcbxpress.in': 'Ajesh',
  'sheet.cutting@pcbxpress.in': 'Kuldeep',
  'cnc.drill@pcbxpress.in': 'Kuldeep',
  'sanding.operator@pcbxpress.in': 'Kuldeep',
  'brushing.operator@pcbxpress.in': 'Kuldeep',
  'pth.operator@pcbxpress.in': 'Ajay',
  'photo.imaging@pcbxpress.in': 'Ajesh & Ashik',
  'developer.operator@pcbxpress.in': 'Ajesh & Ashik',
  'qa.photo@pcbxpress.in': 'M F Lobo & Ajesh',
  'etching.operator@pcbxpress.in': 'Kuldeep, Ajay & Soumya',
  'tin.strip@pcbxpress.in': 'Ajay',
  'qa.etch@pcbxpress.in': 'Ajesh & Lobo',
  'qa.dryfilm@pcbxpress.in': 'Lobo & Ajesh',
  'resist.strip@pcbxpress.in': 'Ajay & Divya',
  'dryfilm.strip@pcbxpress.in': 'Ajay & Divya',
  'pattern.plating@pcbxpress.in': 'Ajay',
  'solder.mask@pcbxpress.in': 'Kuldeep & Suja',
  'qa.soldermask@pcbxpress.in': 'Lobo & Ajesh',
  'hal.operator@pcbxpress.in': 'Ajay',
  'qa.hal@pcbxpress.in': 'Lobo & Ajesh',
  'legend.print@pcbxpress.in': 'Kuldeep & Suja',
  'cnc.routing@pcbxpress.in': 'Kuldeep & Ashik',
  'vscore@pcbxpress.in': 'Kuldeep & Renjini',
  'test.flyingprobe@pcbxpress.in': 'Ajesh',
  'qa.final@pcbxpress.in': 'Lobo & Ajesh',
  'packing@pcbxpress.in': 'Lobo, Ajesh & Ashik',
  'dispatch@pcbxpress.in': 'Ajesh & Ashik',
  'materials.lead@pcbxpress.in': 'Ashik',
  'planner@pcbxpress.in': 'Manoharan & Kuldeep',
  'qa.manager@pcbxpress.in': 'Lobo',
  'assembly.store@pcbxpress.in': 'Anjani & Ashik',
  'stencil.operator@pcbxpress.in': 'Anjani, Ashik & Ajesh',
  'assembly.reflow@pcbxpress.in': 'Anjani',
  'th.soldering@pcbxpress.in': 'Anjani, Ashik & Ajesh',
  'visual.inspection@pcbxpress.in': 'Lobo & Ajesh',
  'ict.operator@pcbxpress.in': 'Steve',
  'flashing.operator@pcbxpress.in': 'Steve',
  'functional.test@pcbxpress.in': 'Steve',
  'wire.harness@pcbxpress.in': 'Vishnu D S',
  '3d.printing@pcbxpress.in': 'Vishnu D S',
  '3d.intake@pcbxpress.in': 'Vishnu D S',
  '3d.fileprep@pcbxpress.in': 'Vishnu D S',
  '3d.slicing@pcbxpress.in': 'Vishnu D S',
  '3d.active@pcbxpress.in': 'Vishnu D S',
  '3d.postprocess@pcbxpress.in': 'Vishnu D S',
  '3d.qc@pcbxpress.in': 'Vishnu D S',
};

// Helper function to get operator display name
const getOperatorDisplayName = (operator) => {
  const email = operator?.email || operator?.loginId || '';
  const emailLower = email.toLowerCase().trim();
  return OPERATOR_NAMES[emailLower] || operator?.name || operator?.loginId || email;
};

const MfgLayout = ({
  title,
  operator,
  onRefresh,
  refreshing = false,
  onSignOut,
  children,
  loading = false,
  loadingMessage = 'Loading operator workspace...'
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <>
        <Helmet>
          <title>{title} | PCB Xpress</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-sm tracking-wide uppercase text-muted-foreground">{loadingMessage}</p>
        </div>
      </>
    );
  }

  if (!operator) {
    return null;
  }

  // Define navigation items based on role
  const getNavigationItems = (role) => {
    const baseItems = [
      { name: 'Dashboard', icon: Home, href: '/mfg/dashboard', current: true },
      { name: 'Work Orders', icon: ClipboardList, href: '/mfg/work-orders', current: false },
      { name: 'Traveler', icon: Activity, href: '/mfg/traveler', current: false },
    ];

    // Add role-specific items
    switch (role) {
      case 'production_control':
      case 'production_planner':
        return [
          ...baseItems,
          { name: 'Planning', icon: BarChart3, href: '/mfg/planning', current: false },
          { name: 'Materials', icon: Package, href: '/mfg/materials', current: false },
        ];
      case 'qa_manager':
      case 'qa_photo_imaging':
      case 'qa_etch':
      case 'qa_dry_film':
      case 'qa_solder_mask':
      case 'qa_hal':
      case 'qa_final':
        return [
          ...baseItems,
          { name: 'Quality Control', icon: Shield, href: '/mfg/qc', current: false },
        ];
      case 'materials_lead':
        return [
          ...baseItems,
          { name: 'Materials', icon: Package, href: '/mfg/materials', current: false },
        ];
      default:
        return baseItems;
    }
  };

  const navigation = getNavigationItems(operator.mfgRole);

  return (
    <>
      <Helmet>
        <title>{title} | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Manufacturing</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="mt-8 px-4">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      item.current
                        ? 'bg-primary text-primary-foreground'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          {/* Topbar */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden mr-4"
                >
                  <Menu className="h-5 w-5" />
                </Button>

                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                  <p className="text-sm text-gray-500">
                    {operator.workCenter && `${operator.workCenter} • `}
                    <span className="font-medium text-gray-700">{getOperatorDisplayName(operator)}</span>
                    {operator.mfgRole && ` • ${operator.mfgRole.replace('_', ' ').toUpperCase()}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Operator Name Display */}
                <div className="hidden sm:flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm text-blue-600 font-medium">Operator:</span>
                  <span className="ml-2 text-sm font-semibold text-blue-800">{getOperatorDisplayName(operator)}</span>
                </div>

                {/* Attendance Actions - compact view in header */}
                <AttendanceActions compact />

                {onRefresh && (
                  <Button
                    variant="outline"
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                )}

                {onSignOut && (
                  <Button variant="outline" onClick={onSignOut}>
                    Sign out
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                {/* Full Attendance Card - shown on all dashboards */}
                <div className="mb-6">
                  <AttendanceActions />
                </div>
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default MfgLayout;