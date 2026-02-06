import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { getMfgToken, getMfgUser } from '@/lib/storage';
import { Clock, Coffee, LogOut, LogIn, RefreshCw, User } from 'lucide-react';

const SHIFT_START_HOUR = 9;
const SHIFT_END_HOUR = 19;

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

// Parse operator names from a string like "Ajesh & Ashik" or "Lobo, Ajesh & Ashik"
const parseOperatorNames = (nameString) => {
  if (!nameString) return [];
  // Split by " & " or ", " to get individual names
  const names = nameString.split(/\s*[&,]\s*/).map(n => n.trim()).filter(Boolean);
  return names;
};

// Get operator names for a login email
const getOperatorsForLogin = (email) => {
  const emailLower = (email || '').toLowerCase().trim();
  const nameString = OPERATOR_NAMES[emailLower];
  if (!nameString) return [];
  return parseOperatorNames(nameString);
};

const formatDateTime = (value) => {
  if (!value) return '--';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '--';
  return dt.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AttendanceActions = ({ compact = false }) => {
  const { toast } = useToast();
  const [token] = useState(() => getMfgToken());
  const [operator] = useState(() => getMfgUser());
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState(null);
  const [actionsLoading, setActionsLoading] = useState({});
  const [selectingOperator, setSelectingOperator] = useState(false);

  // Get available operators for this login
  const availableOperators = useMemo(() => {
    const email = operator?.email || operator?.loginId || '';
    return getOperatorsForLogin(email);
  }, [operator]);

  // Check if this login requires operator selection (more than 1 operator)
  const needsOperatorSelection = useMemo(() => {
    return availableOperators.length > 1;
  }, [availableOperators]);

  // Check if operator has been selected
  const operatorSelected = useMemo(() => {
    return !needsOperatorSelection || (entry?.operatorName && entry.operatorName.trim() !== '');
  }, [needsOperatorSelection, entry]);

  const isLateLogin = useCallback((loggedInAt) => {
    if (!loggedInAt) return false;
    const ts = new Date(loggedInAt);
    if (Number.isNaN(ts.getTime())) return false;
    const shiftStart = new Date(ts);
    shiftStart.setHours(SHIFT_START_HOUR, 0, 0, 0);
    // Use epoch comparison for robustness
    return ts.getTime() > shiftStart.getTime();
  }, []);

  const summarizeEvents = useCallback((events = [], labelMap = {}) => {
    if (!Array.isArray(events) || events.length === 0) return 'No events yet';
    const last = events[events.length - 1];
    const label = labelMap[last.type] || last.type;
    return `${label} at ${formatDateTime(last.at)}`;
  }, []);

  const setActionLoading = useCallback((key, value) => {
    setActionsLoading((prev) => {
      const next = { ...prev };
      if (value) next[key] = true;
      else delete next[key];
      return next;
    });
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.mfgGetMyAttendance(token);
      setEntry(res?.entry || null);
    } catch (err) {
      if (err?.message && err.message !== 'No attendance record found') {
        console.error('Failed to load attendance', err);
      }
      setEntry(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleBreakAction = useCallback(
    async (type) => {
      if (!token) return;
      const key = `break-${type}`;
      setActionLoading(key, true);
      try {
        const res = await api.mfgAddAttendanceBreak(token, { type });
        if (res?.entry) setEntry(res.entry);
        toast({ title: 'Break updated', description: type === 'start' ? 'Break started.' : 'Break ended.' });
      } catch (err) {
        toast({
          title: 'Failed to update break',
          description: err?.message || 'Unable to record break.',
          variant: 'destructive',
        });
      } finally {
        setActionLoading(key, false);
      }
    },
    [toast, token, setActionLoading]
  );

  const handleMovementAction = useCallback(
    async (type) => {
      if (!token) return;
      const key = `move-${type}`;
      setActionLoading(key, true);
      try {
        const res = await api.mfgAddAttendanceMovement(token, { type });
        if (res?.entry) setEntry(res.entry);
        toast({
          title: 'Movement updated',
          description: type === 'out' ? 'Marked as out of facility.' : 'Marked as returned.',
        });
      } catch (err) {
        toast({
          title: 'Failed to update movement',
          description: err?.message || 'Unable to record movement.',
          variant: 'destructive',
        });
      } finally {
        setActionLoading(key, false);
      }
    },
    [toast, token, setActionLoading]
  );

  const handleSelectOperator = useCallback(
    async (operatorName) => {
      if (!token || !operatorName) return;
      setSelectingOperator(true);
      try {
        const res = await api.mfgSetOperatorName(token, operatorName);
        if (res?.entry) setEntry(res.entry);
        toast({
          title: 'Operator registered',
          description: `Attendance marked for ${operatorName}`,
        });
      } catch (err) {
        toast({
          title: 'Failed to register operator',
          description: err?.message || 'Unable to set operator name.',
          variant: 'destructive',
        });
      } finally {
        setSelectingOperator(false);
      }
    },
    [toast, token]
  );

  const lastBreakSummary = useMemo(
    () => summarizeEvents(entry?.breaks, { start: 'Started', end: 'Ended' }),
    [entry, summarizeEvents]
  );

  const lastMovementSummary = useMemo(
    () => summarizeEvents(entry?.movements, { out: 'Went out', in: 'Returned' }),
    [entry, summarizeEvents]
  );

  // Always compute lateness from the actual login timestamp to avoid stale server flags
  const lateLogin = useMemo(() => isLateLogin(entry?.loggedInAt), [entry, isLateLogin]);

  // Current break/movement status
  const currentBreakStatus = useMemo(() => {
    if (!entry?.breaks?.length) return null;
    const last = entry.breaks[entry.breaks.length - 1];
    return last?.type === 'start' ? 'on-break' : 'working';
  }, [entry]);

  const currentMovementStatus = useMemo(() => {
    if (!entry?.movements?.length) return null;
    const last = entry.movements[entry.movements.length - 1];
    return last?.type === 'out' ? 'out' : 'in';
  }, [entry]);

  if (!token) return null;

  // Show operator selection if needed (multi-operator login and no operator selected yet)
  if (needsOperatorSelection && !operatorSelected && !loading && entry) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-amber-600 font-medium">Select your name:</span>
          {availableOperators.map((name) => (
            <Button
              key={name}
              size="sm"
              variant="outline"
              onClick={() => handleSelectOperator(name)}
              disabled={selectingOperator}
              className="h-7 text-xs border-amber-400 text-amber-700 hover:bg-amber-50"
            >
              <User className="h-3 w-3 mr-1" />
              {name}
            </Button>
          ))}
        </div>
      );
    }

    return (
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100">
                <User className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Who is logging in?</h3>
                <p className="text-xs text-muted-foreground">
                  This login is shared by multiple operators. Please select your name to register attendance.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableOperators.map((name) => (
                <Button
                  key={name}
                  variant="outline"
                  onClick={() => handleSelectOperator(name)}
                  disabled={selectingOperator}
                  className="flex-1 min-w-[120px] border-amber-400 text-amber-700 hover:bg-amber-50 hover:border-amber-500"
                >
                  <User className="h-4 w-4 mr-2" />
                  {selectingOperator ? 'Registering...' : name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {loading ? (
          <span className="text-xs text-muted-foreground">Loading...</span>
        ) : (
          <>
            {lateLogin && <Badge variant="destructive" className="text-xs">Late</Badge>}
            {currentBreakStatus === 'on-break' && (
              <Badge variant="secondary" className="text-xs">On Break</Badge>
            )}
            {currentMovementStatus === 'out' && (
              <Badge variant="outline" className="text-xs">Out</Badge>
            )}
            <Button
              size="sm"
              variant={currentBreakStatus === 'on-break' ? 'default' : 'outline'}
              onClick={() => handleBreakAction(currentBreakStatus === 'on-break' ? 'end' : 'start')}
              disabled={actionsLoading['break-start'] || actionsLoading['break-end'] || loading}
              className="h-7 text-xs"
            >
              <Coffee className="h-3 w-3 mr-1" />
              {currentBreakStatus === 'on-break' ? 'End Break' : 'Start Break'}
            </Button>
            <Button
              size="sm"
              variant={currentMovementStatus === 'out' ? 'default' : 'secondary'}
              onClick={() => handleMovementAction(currentMovementStatus === 'out' ? 'in' : 'out')}
              disabled={actionsLoading['move-out'] || actionsLoading['move-in'] || loading}
              className="h-7 text-xs"
            >
              {currentMovementStatus === 'out' ? (
                <>
                  <LogIn className="h-3 w-3 mr-1" />
                  Return In
                </>
              ) : (
                <>
                  <LogOut className="h-3 w-3 mr-1" />
                  Gate Pass
                </>
              )}
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading attendance...</span>
          </div>
        ) : !entry ? (
          <p className="text-muted-foreground text-sm">No attendance record found for today. Please log in again.</p>
        ) : (
          <div className="space-y-4">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    Today's Attendance
                    {entry?.operatorName && (
                      <span className="ml-2 text-primary">({entry.operatorName})</span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {entry?.date && new Date(entry.date + 'T00:00:00').toLocaleDateString(undefined, { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {entry?.operatorName && (
                  <Badge variant="secondary" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    {entry.operatorName}
                  </Badge>
                )}
                {lateLogin ? (
                  <Badge variant="destructive" className="text-xs">Late Login</Badge>
                ) : (
                  <Badge variant="default" className="text-xs bg-green-600">On Time</Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={loadAttendance}
                  disabled={loading}
                  className="h-8 w-8"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold">{formatDateTime(entry?.loggedInAt).split(',')[1] || '--'}</p>
                <p className="text-xs text-muted-foreground">First Login</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold">{entry?.breaks?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Breaks</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold">{entry?.movements?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Movements</p>
              </div>
            </div>

            {/* Status Badges */}
            {(currentBreakStatus === 'on-break' || currentMovementStatus === 'out') && (
              <div className="flex items-center gap-2">
                {currentBreakStatus === 'on-break' && (
                  <Badge variant="secondary" className="text-xs">
                    <Coffee className="h-3 w-3 mr-1" />
                    On Break
                  </Badge>
                )}
                {currentMovementStatus === 'out' && (
                  <Badge variant="outline" className="text-xs">
                    <LogOut className="h-3 w-3 mr-1" />
                    Out of Office
                  </Badge>
                )}
              </div>
            )}

            {/* Activity Summary */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Break: {lastBreakSummary}</p>
              <p>Movement: {lastMovementSummary}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant={currentBreakStatus === 'on-break' ? 'default' : 'outline'}
                onClick={() => handleBreakAction(currentBreakStatus === 'on-break' ? 'end' : 'start')}
                disabled={actionsLoading['break-start'] || actionsLoading['break-end'] || loading}
                className="flex-1"
              >
                <Coffee className="h-4 w-4 mr-2" />
                {actionsLoading['break-start'] || actionsLoading['break-end']
                  ? 'Updating...'
                  : currentBreakStatus === 'on-break'
                  ? 'End Break'
                  : 'Start Break'}
              </Button>
              <Button
                size="sm"
                variant={currentMovementStatus === 'out' ? 'default' : 'secondary'}
                onClick={() => handleMovementAction(currentMovementStatus === 'out' ? 'in' : 'out')}
                disabled={actionsLoading['move-out'] || actionsLoading['move-in'] || loading}
                className="flex-1"
              >
                {currentMovementStatus === 'out' ? (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    {actionsLoading['move-in'] ? 'Updating...' : 'Return In'}
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    {actionsLoading['move-out'] ? 'Updating...' : 'Gate Pass'}
                  </>
                )}
              </Button>
            </div>

            {/* Shift Info */}
            <p className="text-xs text-muted-foreground text-center border-t pt-2">
              Shift Hours: 9:00 AM – 7:00 PM
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceActions;
