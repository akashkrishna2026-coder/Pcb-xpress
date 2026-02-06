import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { getAdmin, getAdminToken, clearAdmin, clearAdminToken } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Download, Filter, RefreshCw, Search, Users, AlertCircle, CheckCircle } from 'lucide-react';

const AdminAttendancePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  
  // Date filtering
  const [dateFilter, setDateFilter] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  
  // Clock out functionality
  const [actionLoading, setActionLoading] = useState({});

  const SHIFT_START_HOUR = 9;
  const SHIFT_START_MINUTE = 0;
  const CLOCK_OUT_HOUR = 18; // 6:30 PM
  const CLOCK_OUT_MINUTE = 30;

  // Format date to YYYY-MM-DD in local time to avoid timezone drift
  const formatDateOnly = useCallback((d) => {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Helper to get date ranges
  const getDateRange = useCallback((filter) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
      case 'yesterday': {
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return { start: yesterday, end: new Date(today.getTime() - 1) };
      }
      case 'thisWeek': {
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        return { start: startOfWeek, end: now };
      }
      case 'lastWeek': {
        const dayOfWeek = today.getDay();
        const startOfThisWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: startOfLastWeek, end: new Date(startOfThisWeek.getTime() - 1) };
      }
      case 'thisMonth': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: startOfMonth, end: now };
      }
      case 'lastMonth': {
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { start: startOfLastMonth, end: new Date(startOfThisMonth.getTime() - 1) };
      }
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : null,
          end: customEndDate ? new Date(customEndDate + 'T23:59:59') : null,
        };
      case 'all':
      default:
        return { start: null, end: null };
    }
  }, [customStartDate, customEndDate]);

  useEffect(() => {
    const a = getAdmin();
    if (!a) {
      navigate('/pcbXpress/login');
      return;
    }
    setAdmin(a);
  }, [navigate]);

  useEffect(() => {
    fetchAttendance();
  }, [page, limit, search, dateFilter, customStartDate, customEndDate]);

  const fetchAttendance = async () => {
    const token = getAdminToken();
    if (!token) {
      setEntries([]);
      setTotal(0);
      setPages(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { start, end } = getDateRange(dateFilter);
      const params = {
        limit,
        page,
        role: 'mfg',
        search,
      };
      const startStr = start ? formatDateOnly(start) : null;
      const endStr = end ? formatDateOnly(end) : null;
      if (startStr) params.startDate = startStr;
      if (endStr) params.endDate = endStr;
      
      const res = await api.adminGetAttendance(token, params);
      setEntries(Array.isArray(res?.entries) ? res.entries : []);
      setTotal(res?.total || 0);
      setPages(res?.pages || 1);
    } catch (err) {
      toast({
        title: 'Failed to load attendance',
        description: err?.message || 'Unable to fetch attendance entries.',
        variant: 'destructive',
      });
      setEntries([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  };

  const upsertEntry = (updated) => {
    if (!updated) return;
    const targetId = updated.id || updated._id || updated.userId;
    if (!targetId) return;
    setEntries((prev) =>
      prev.map((entry) => {
        const entryId = entry.id || entry._id || entry.userId;
        return entryId === targetId ? { ...entry, ...updated } : entry;
      })
    );
  };

  const isLateLogin = (loggedInAt) => {
    if (!loggedInAt) return false;
    const ts = new Date(loggedInAt);
    if (Number.isNaN(ts.getTime())) return false;
    // Build a local shift start time (same day as the login) and
    // consider the user late only if their timestamp is strictly
    // greater than the shift start (i.e., after 09:00:00).
    const shiftStart = new Date(ts);
    shiftStart.setHours(SHIFT_START_HOUR, SHIFT_START_MINUTE, 0, 0);
    return ts.getTime() > shiftStart.getTime();
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  };

  const summarizeEvents = (events = [], labelMap = {}) => {
    if (!Array.isArray(events) || events.length === 0) return 'No events yet';
    const last = events[events.length - 1];
    const label = labelMap[last.type] || last.type;
    return `${label} at ${formatDateTime(last.at)}`;
  };

  const handleSignOut = () => {
    clearAdmin();
    clearAdminToken();
    toast({ title: 'Signed out of admin' });
    navigate('/');
  };

  const applySearch = () => {
    setPage(1);
    setSearch(query.trim());
  };

  const clearSearch = () => {
    setQuery('');
    setSearch('');
    setPage(1);
  };

  const handleDateFilterChange = (filter) => {
    setDateFilter(filter);
    setPage(1);
    if (filter !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const applyCustomDateRange = () => {
    if (!customStartDate || !customEndDate) {
      toast({
        title: 'Invalid date range',
        description: 'Please select both start and end dates.',
        variant: 'destructive',
      });
      return;
    }
    setDateFilter('custom');
    setPage(1);
  };

  const exportToCSV = () => {
    if (entries.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Please fetch attendance data first.',
        variant: 'destructive',
      });
      return;
    }
    
    const headers = ['Operator', 'Email', 'Login ID', 'Role', 'Work Center', 'Logged In', 'Late', 'Breaks', 'Movements'];
    const rows = entries.map((entry) => [
      entry.name || entry.email || 'Unknown',
      entry.email || '',
      entry.loginId || '',
      entry.mfgRole || entry.role || '',
      entry.workCenter || '',
      entry.loggedInAt ? new Date(entry.loggedInAt).toLocaleString() : '',
      (entry.lateLogin ?? isLateLogin(entry.loggedInAt)) ? 'Yes' : 'No',
      entry.breaks?.length || 0,
      entry.movements?.length || 0,
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Export successful', description: `Exported ${entries.length} entries.` });
  };

  const getFilterLabel = () => {
    const labels = {
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This Week',
      lastWeek: 'Last Week',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      custom: customStartDate && customEndDate ? `${customStartDate} to ${customEndDate}` : 'Custom Range',
      all: 'All Time',
    };
    return labels[dateFilter] || 'Today';
  };

  // Check if clock out is allowed (after 6:30 PM)
  const isClockOutAllowed = () => {
    const now = new Date();
    const clockOutTime = new Date();
    clockOutTime.setHours(CLOCK_OUT_HOUR, CLOCK_OUT_MINUTE, 0, 0);
    return now >= clockOutTime;
  };

  const setLoadingKey = (key, value) => {
    setActionLoading((prev) => {
      const next = { ...prev };
      if (value) next[key] = true;
      else delete next[key];
      return next;
    });
  };

  const handleClockOut = async (entry) => {
    const token = getAdminToken();
    if (!token) {
      toast({ title: 'Not authenticated', description: 'Please log in again.', variant: 'destructive' });
      navigate('/pcbXpress/login');
      return;
    }
    
    const attendanceId = entry.id || entry._id;
    if (!attendanceId) {
      toast({ title: 'Missing attendance id', variant: 'destructive' });
      return;
    }

    if (!isClockOutAllowed()) {
      toast({
        title: 'Clock out not allowed',
        description: 'Clock out is only available after 6:30 PM.',
        variant: 'destructive',
      });
      return;
    }

    const key = `${attendanceId}-clock-out`;
    setLoadingKey(key, true);
    try {
      const res = await api.adminClockOut(token, attendanceId);
      if (res?.entry) upsertEntry(res.entry);
      toast({ title: 'Clock out successful', description: `${entry.name || entry.email} has been clocked out.` });
    } catch (err) {
      toast({
        title: 'Failed to clock out',
        description: err?.message || 'Unable to clock out.',
        variant: 'destructive',
      });
    } finally {
      setLoadingKey(key, false);
    }
  };

  const uniqueOperators = useMemo(() => {
    const ids = new Set();
    entries.forEach((entry) => {
      if (entry?.userId) ids.add(String(entry.userId));
    });
    return ids.size;
  }, [entries]);

  // Compute lateness purely from the recorded login timestamp on the client
  const lateCount = useMemo(() => entries.filter((entry) => isLateLogin(entry.loggedInAt)).length, [entries]);

  const onTimeCount = useMemo(() => entries.length - lateCount, [entries, lateCount]);

  const avgBreaks = useMemo(() => {
    if (entries.length === 0) return 0;
    const totalBreaks = entries.reduce((acc, entry) => acc + (entry.breaks?.length || 0), 0);
    return (totalBreaks / entries.length).toFixed(1);
  }, [entries]);

  const avgMovements = useMemo(() => {
    if (entries.length === 0) return 0;
    const totalMovements = entries.reduce((acc, entry) => acc + (entry.movements?.length || 0), 0);
    return (totalMovements / entries.length).toFixed(1);
  }, [entries]);

  const clockedOutCount = useMemo(() => 
    entries.filter((entry) => entry.clockedOut).length, 
    [entries]
  );

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Attendance | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <section className="py-2 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Attendance Management</h1>
            <p className="text-sm text-muted-foreground">
              Viewing: <Badge variant="secondary">{getFilterLabel()}</Badge>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchAttendance} 
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToCSV}
              disabled={entries.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <a href="/pcbXpress">
              <Button variant="ghost" size="sm">Back to Dashboard</Button>
            </a>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <StatCard 
            icon={<Users className="h-4 w-4" />}
            label="Total Logins" 
            value={String(total)} 
            color="blue"
          />
          <StatCard 
            icon={<Users className="h-4 w-4" />}
            label="Unique Operators" 
            value={String(uniqueOperators)} 
            color="purple"
          />
          <StatCard 
            icon={<CheckCircle className="h-4 w-4" />}
            label="On Time" 
            value={String(onTimeCount)} 
            color="green"
          />
          <StatCard 
            icon={<AlertCircle className="h-4 w-4" />}
            label="Late Logins" 
            value={String(lateCount)} 
            color="red"
          />
          <StatCard 
            icon={<Clock className="h-4 w-4" />}
            label="Clocked Out" 
            value={String(clockedOutCount)} 
            color="indigo"
          />
          <StatCard 
            icon={<Clock className="h-4 w-4" />}
            label="Avg Breaks" 
            value={avgBreaks} 
            color="orange"
          />
          <StatCard 
            icon={<Clock className="h-4 w-4" />}
            label="Avg Movements" 
            value={avgMovements} 
            color="slate"
          />
        </div>

        {/* Filters Section */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Date Filters */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Quick Filters</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: 'thisWeek', label: 'This Week' },
                    { key: 'lastWeek', label: 'Last Week' },
                    { key: 'thisMonth', label: 'This Month' },
                    { key: 'lastMonth', label: 'Last Month' },
                    { key: 'all', label: 'All Time' },
                  ].map((filter) => (
                    <Button
                      key={filter.key}
                      variant={dateFilter === filter.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDateFilterChange(filter.key)}
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Custom Date Range</label>
                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">Start Date</label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">End Date</label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Button onClick={applyCustomDateRange} size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Apply Range
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Search</label>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                      placeholder="Search by name, login ID, work center, or email..."
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={applySearch} size="sm">Apply</Button>
                  {search && (
                    <Button variant="ghost" size="sm" onClick={clearSearch}>Clear</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              Login Entries
              {search && <Badge variant="outline" className="ml-2">Filtered: "{search}"</Badge>}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              Showing {entries.length} of {total} entries
            </span>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading attendance data...</span>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No login entries found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters or date range</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b bg-muted/50">
                      <th className="py-3 px-4 font-medium">Operator</th>
                      <th className="py-3 px-4 font-medium">Login ID</th>
                      <th className="py-3 px-4 font-medium">Role</th>
                      <th className="py-3 px-4 font-medium">Work Center</th>
                      <th className="py-3 px-4 font-medium">Logged In</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Breaks</th>
                      <th className="py-3 px-4 font-medium">Movement</th>
                      <th className="py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                          {entries.map((entry, index) => {
                            // Always determine lateness from the timestamp to avoid
                            // relying on potentially stale server flags.
                            const isLate = isLateLogin(entry.loggedInAt);
                      return (
                        <tr 
                          key={`${entry.userId || 'user'}-${entry.loggedInAt || index}`} 
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium">{entry.name || entry.email || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{entry.email || 'No email'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <code className="text-xs bg-muted px-2 py-1 rounded">{entry.loginId || '-'}</code>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="capitalize">
                              {entry.mfgRole || entry.role || '-'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">{entry.workCenter || '-'}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-medium">{formatDateTime(entry.loggedInAt)}</span>
                              <span className="text-xs text-muted-foreground">
                                {entry.loggedInAt ? formatRelativeTime(entry.loggedInAt) : ''}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isLate ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Late
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                On Time
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {entry.breaks?.length || 0}
                              </Badge>
                              <span className="text-xs text-muted-foreground hidden lg:inline">
                                {summarizeEvents(entry.breaks, { start: 'Started', end: 'Ended' })}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {entry.movements?.length || 0}
                              </Badge>
                              <span className="text-xs text-muted-foreground hidden lg:inline">
                                {summarizeEvents(entry.movements, { out: 'Out', in: 'In' })}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {entry.clockedOut ? (
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Clocked Out
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant={isClockOutAllowed() ? "destructive" : "secondary"}
                                  onClick={() => handleClockOut(entry)}
                                  disabled={!isClockOutAllowed() || actionLoading[`${entry.id || entry._id}-clock-out`]}
                                  className="text-xs"
                                >
                                  {actionLoading[`${entry.id || entry._id}-clock-out`] ? (
                                    <>
                                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                      Clocking...
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="h-3 w-3 mr-1" />
                                      Clock Out
                                    </>
                                  )}
                                </Button>
                              )}
                              {!isClockOutAllowed() && !entry.clockedOut && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  Available after 6:30 PM
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {pages > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 w-16 border rounded px-2 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {Math.min((page - 1) * limit + 1, total)}-{Math.min(page * limit, total)} of {total}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>
    </AdminLayout>
  );
};

const formatRelativeTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return '';
};

const colorMap = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const StatCard = ({ icon, label, value, color = 'blue' }) => (
  <Card className={`border ${colorMap[color] || colorMap.blue}`}>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </CardContent>
  </Card>
);

const Stat = ({ label, value }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </CardContent>
  </Card>
);

export default AdminAttendancePage;
