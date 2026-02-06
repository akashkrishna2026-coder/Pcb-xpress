import React from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
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

const DashboardLayout = ({
  title,
  subtitle,
  operator,
  workCenter,
  onRefresh,
  refreshing = false,
  onSignOut,
  children,
  loading = false,
  loadingMessage = 'Loading operator workspace...',
  hideAttendance = false
}) => {
  if (loading) {
    return (
      <>
        <Helmet>
          <title>{title} | PCB Xpress</title>
        </Helmet>
        <section className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-sm tracking-wide uppercase text-muted-foreground">{loadingMessage}</p>
        </section>
      </>
    );
  }

  if (!operator) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{title} | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <section className="min-h-screen bg-gray-50 py-10">
        <div className="container space-y-8">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-primary tracking-widest">
                {subtitle}
              </p>
              <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-3">
                {workCenter && <span className="text-primary">{workCenter}</span>}
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">
                Logged in as{' '}
                <span className="font-medium text-gray-900">
                  {operator.name || operator.loginId || operator.email}
                </span>
                {operator.role ? ` - ${operator.role}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Operator Name Display */}
              <div className="flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm text-blue-600 font-medium">Operator:</span>
                <span className="ml-2 text-sm font-semibold text-blue-800">{getOperatorDisplayName(operator)}</span>
              </div>

              {/* Compact attendance actions in header */}
              <AttendanceActions compact />
              {onRefresh && (
                <Button
                  variant="outline"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh data
                </Button>
              )}
              {onSignOut && (
                <Button variant="outline" onClick={onSignOut}>
                  Sign out
                </Button>
              )}
            </div>
          </header>

          {/* Full Attendance Card */}
          {!hideAttendance && (
            <div className="max-w-md">
              <AttendanceActions />
            </div>
          )}

          {children}
        </div>
      </section>
    </>
  );
};

export default DashboardLayout;