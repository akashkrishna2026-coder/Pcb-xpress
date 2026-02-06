// AdminManufacturingDashboardPage.jsx

import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { getAdmin, getAdminToken } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import {
  Factory,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  RefreshCw,
  Activity,
  Target,
  Zap,
  Settings,
  Eye,
  Timer,
  Package,
  Wrench,
  ShieldCheck
} from 'lucide-react';

const AdminManufacturingDashboardPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [operators, setOperators] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'week', 'month'

  useEffect(() => {
    const a = getAdmin();
    if (!a) {
      navigate('/pcbXpress/login');
      return;
    }
    setAdmin(a);
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      if (!token) return;

      // Load all manufacturing data in parallel
      const [
        summaryRes,
        workOrdersRes,
        operatorsRes,
        analyticsRes
      ] = await Promise.all([
        api.mfgSummary(token),
        api.mfgWorkOrders(token, { limit: 100 }),
        api.mfgListOperators(token, { limit: 100 }),
        api.mfgAnalytics(token)
      ]);

      setSummary(summaryRes.summary);
      setWorkOrders(workOrdersRes.workOrders || []);
      setOperators(operatorsRes.operators || []);
      setAnalytics(analyticsRes.analytics);
    } catch (err) {
      console.error('Failed to load manufacturing data:', err);
      toast({
        title: 'Load failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = (data, dateField = 'createdAt') => {
    if (timeFilter === 'all') return data;

    const now = new Date();
    const filterDate = new Date();

    switch (timeFilter) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      default:
        return data;
    }

    return data.filter(item => {
      const itemDate = new Date(item[dateField] || item.created_at || Date.now());
      return itemDate >= filterDate;
    });
  };

  const metrics = useMemo(() => {
    if (!summary || !workOrders.length) return {};

    const filteredWorkOrders = getFilteredData(workOrders);

    // Production metrics
    const totalWorkOrders = filteredWorkOrders.length;
    const completedWorkOrders = filteredWorkOrders.filter(wo => 
      wo.stage === 'dispatch' || wo.stage === 'shipped' || wo.status === 'completed'
    ).length;
    const inProgressWorkOrders = filteredWorkOrders.filter(wo => 
      wo.stage && !['dispatch', 'shipped', 'cam'].includes(wo.stage)
    ).length;
    const blockedWorkOrders = filteredWorkOrders.filter(wo =>
      wo.dfmExceptions?.some(dfm => dfm.status === 'blocked') ||
      wo.camStatus?.state === 'blocked'
    ).length;

    // Stage distribution
    const stageDistribution = {};
    filteredWorkOrders.forEach(wo => {
      const stage = wo.stage || 'unknown';
      stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
    });

    // Priority distribution
    const priorityDistribution = {};
    filteredWorkOrders.forEach(wo => {
      const priority = wo.priority || 'normal';
      priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1;
    });

    // Operator performance - based on work center assignments and traveler events
    const activeOperators = operators.filter(op => op.isActive).length;
    const operatorWorkload = {};
    
    // Group work orders by work center or stage responsibility
    filteredWorkOrders.forEach(wo => {
      // Get the operator responsible for current stage
      const stageOwner = wo.stage || 'unassigned';
      const key = stageOwner.replace('_', ' ').toUpperCase();
      operatorWorkload[key] = (operatorWorkload[key] || 0) + 1;
    });

    // Quality metrics - improved detection
    const qualityIssues = filteredWorkOrders.filter(wo => {
      const hasDfmIssues = wo.dfmExceptions && wo.dfmExceptions.length > 0;
      const hasRejections = wo.camAttachments?.some(att => att.approvalStatus === 'rejected');
      return hasDfmIssues || hasRejections;
    }).length;

    // Efficiency metrics - completion time calculation
    let totalCompletionDays = 0;
    let completedCount = 0;
    
    filteredWorkOrders.forEach(wo => {
      if ((wo.stage === 'dispatch' || wo.stage === 'shipped') && wo.createdAt) {
        const createdDate = new Date(wo.createdAt);
        const completedDate = wo.completedAt ? new Date(wo.completedAt) : new Date();
        const days = (completedDate - createdDate) / (1000 * 60 * 60 * 24);
        totalCompletionDays += days;
        completedCount++;
      }
    });

    const avgCompletionTime = completedCount > 0 ? totalCompletionDays / completedCount : 0;

    return {
      production: {
        totalWorkOrders,
        completedWorkOrders,
        inProgressWorkOrders,
        blockedWorkOrders,
        completionRate: totalWorkOrders > 0 ? (completedWorkOrders / totalWorkOrders) * 100 : 0
      },
      stages: stageDistribution,
      priorities: priorityDistribution,
      operators: {
        active: activeOperators,
        total: operators.length,
        workload: operatorWorkload
      },
      quality: {
        issues: qualityIssues,
        issueRate: totalWorkOrders > 0 ? (qualityIssues / totalWorkOrders) * 100 : 0
      },
      efficiency: {
        avgCompletionTime: avgCompletionTime || 0
      }
    };
  }, [summary, workOrders, operators, timeFilter]);

  const handleSignOut = () => {
    navigate('/pcbXpress/login');
  };

  if (loading) {
    return (
      <AdminLayout admin={admin}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading manufacturing dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Manufacturing Dashboard | PCB Xpress Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manufacturing Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive manufacturing operations overview</p>
          </div>
          <div className="flex gap-2">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Work Orders</p>
                  <p className="text-3xl font-bold">{metrics.production?.totalWorkOrders || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.production?.completedWorkOrders || 0} completed
                  </p>
                </div>
                <Factory className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-3xl font-bold text-green-600">
                    {Math.round(metrics.production?.completionRate || 0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.production?.inProgressWorkOrders || 0} in progress
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Operators</p>
                  <p className="text-3xl font-bold">{metrics.operators?.active || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    of {metrics.operators?.total || 0} total
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quality Issues</p>
                  <p className="text-3xl font-bold text-red-600">{metrics.quality?.issues || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(metrics.quality?.issueRate || 0)}% of orders
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Production Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Production Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Completed</span>
                  </div>
                  <Badge variant="default">{metrics.production?.completedWorkOrders || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">In Progress</span>
                  </div>
                  <Badge variant="secondary">{metrics.production?.inProgressWorkOrders || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="font-medium">Blocked</span>
                  </div>
                  <Badge variant="destructive">{metrics.production?.blockedWorkOrders || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Stage Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics.stages || {}).map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between">
                    <span className="capitalize text-sm">{stage.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${metrics.production?.totalWorkOrders ?
                              (count / metrics.production.totalWorkOrders) * 100 : 0}%`
                          }}
                        ></div>
                      </div>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operator Performance & Quality Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Operator Workload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics.operators?.workload || {}).slice(0, 5).map(([operator, count]) => (
                  <div key={operator} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{operator}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{
                            width: `${metrics.production?.totalWorkOrders ?
                              (count / metrics.production.totalWorkOrders) * 100 : 0}%`
                          }}
                        ></div>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  </div>
                ))}
                {Object.keys(metrics.operators?.workload || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground">No operator assignments found</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Quality Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="font-medium text-sm">Quality Issues</span>
                  <Badge variant="destructive">{metrics.quality?.issues || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="font-medium text-sm">Issue Rate</span>
                  <Badge variant="outline">{Math.round(metrics.quality?.issueRate || 0)}%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium text-sm">Avg Completion Time</span>
                  <Badge variant="default">{Math.round(metrics.efficiency?.avgCompletionTime || 0)} days</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Work Orders */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent Work Orders</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/pcbXpress/mfg')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {workOrders.slice(0, 5).length === 0 ? (
              <p className="text-sm text-muted-foreground">No work orders found</p>
            ) : (
              <div className="space-y-3">
                {workOrders.slice(0, 5).map((wo) => (
                  <div key={wo._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{wo.woNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {wo.customer} • {wo.product} • {wo.quantity} units
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        wo.status === 'completed' ? 'default' :
                        wo.status === 'in_progress' ? 'secondary' :
                        wo.status === 'blocked' ? 'destructive' : 'outline'
                      }>
                        {wo.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {wo.stage?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center gap-2" onClick={() => navigate('/mfgpcbxpress')}>
                <Package className="h-6 w-6" />
                <span className="text-sm">Work Orders</span>
              </Button>
              <Button variant="outline" className="w-full h-20 flex flex-col items-center gap-2" onClick={() => navigate('/pcbXpress/mfg/roles')}>
                <Users className="h-6 w-6" />
                <span className="text-sm">Operators</span>
              </Button>
              <Button variant="outline" className="w-full h-20 flex flex-col items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                <span className="text-sm">Analytics</span>
              </Button>
              <Button variant="outline" className="w-full h-20 flex flex-col items-center gap-2" onClick={() => navigate('/pcbXpress/settings')}>
                <Settings className="h-6 w-6" />
                <span className="text-sm">Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminManufacturingDashboardPage;