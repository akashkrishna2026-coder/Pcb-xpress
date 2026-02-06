// AdminDashboardPage.jsx

import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getAdmin, clearAdmin, getQuotes, clearQuotes, removeQuote, clearAdminToken, getAdminToken } from '@/lib/storage';
import { api } from '@/lib/api';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { formatInr } from '@/lib/currency';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AdminDashboardPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [approving, setApproving] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewQuote, setViewQuote] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
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
    const t = getAdminToken();
    if (!t) {
      setLoading(false);
      return;
    }

    try {
      // Load quotes
      const quotesRes = await api.listAllQuotesAdmin(t, { limit: 500 });
      setQuotes(quotesRes.quotes || []);

      // Load orders
      const ordersRes = await api.adminListOrders(t, { limit: 500 });
      setOrders(ordersRes.orders || []);

      // Load manufacturing work orders
      const workOrdersRes = await api.mfgWorkOrders(t, { focus: 'cam', limit: 50 });
      setWorkOrders(workOrdersRes.workOrders || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Fallback to local data
      setQuotes(getQuotes());
      setOrders([]);
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

  const stats = useMemo(() => {
    const filteredQuotes = getFilteredData(quotes);
    const filteredOrders = getFilteredData(orders);

    // Quotes stats
    const quotesTotal = filteredQuotes.length;
    const quotesExpress = filteredQuotes.filter((q) => q.delivery?.speed === 'express').length;
    const quotesStandard = quotesTotal - quotesExpress;
    const quotesRevenue = filteredQuotes.reduce((acc, q) => {
      // Try multiple possible revenue fields
      const revenue = 
        q.adminQuote?.total || 
        q.quote?.total || 
        q.proformaInvoice?.total ||
        q.total ||
        0;
      return acc + Number(revenue);
    }, 0);
    const quotesAvg = quotesTotal ? quotesRevenue / quotesTotal : 0;

    // Orders stats
    const ordersTotal = filteredOrders.length;
    const ordersRevenue = filteredOrders.reduce((acc, o) => {
      // Try multiple possible revenue fields
      const revenue = 
        o.amounts?.total || 
        o.total ||
        o.proformaInvoice?.total ||
        0;
      return acc + Number(revenue);
    }, 0);
    const ordersAvg = ordersTotal ? ordersRevenue / ordersTotal : 0;

    // Payment status breakdown
    const orderPaymentStats = {
      pending: filteredOrders.filter(o => {
        const status = o.paymentProof?.status || o.paymentProofStatus;
        return !status || status === 'not_submitted';
      }).length,
      submitted: filteredOrders.filter(o => {
        const status = o.paymentProof?.status || o.paymentProofStatus;
        return status === 'submitted';
      }).length,
      approved: filteredOrders.filter(o => {
        const status = o.paymentProof?.status || o.paymentProofStatus;
        return status === 'approved';
      }).length,
      rejected: filteredOrders.filter(o => {
        const status = o.paymentProof?.status || o.paymentProofStatus;
        return status === 'rejected';
      }).length,
    };

    const quotePaymentStats = {
      pending: filteredQuotes.filter(q => {
        const status = q.paymentProof?.status || q.paymentProofStatus;
        return !status || status === 'not_submitted';
      }).length,
      submitted: filteredQuotes.filter(q => {
        const status = q.paymentProof?.status || q.paymentProofStatus;
        return status === 'submitted';
      }).length,
      approved: filteredQuotes.filter(q => {
        const status = q.paymentProof?.status || q.paymentProofStatus;
        return status === 'approved';
      }).length,
      rejected: filteredQuotes.filter(q => {
        const status = q.paymentProof?.status || q.paymentProofStatus;
        return status === 'rejected';
      }).length,
    };

    // Total revenue
    const totalRevenue = quotesRevenue + ordersRevenue;

    return {
      quotes: { total: quotesTotal, express: quotesExpress, standard: quotesStandard, revenue: quotesRevenue, avg: quotesAvg },
      orders: { total: ordersTotal, revenue: ordersRevenue, avg: ordersAvg },
      payments: { orders: orderPaymentStats, quotes: quotePaymentStats },
      total: { revenue: totalRevenue, items: quotesTotal + ordersTotal }
    };
  }, [quotes, orders, timeFilter]);

  const handleSignOut = () => {
    clearAdmin();
    clearAdminToken();
    toast({ title: 'Signed out of admin' });
    navigate('/');
  };

  const refresh = async () => {
    const t = getAdminToken();
    if (t) {
      try {
        const res = await api.listAllQuotesAdmin(t, { limit: 200 });
        setQuotes(res.quotes || []);
        return;
      } catch {}
    }
    setQuotes(getQuotes());
  };

  const handleRemove = async (id) => {
    const t = getAdminToken();
    if (t && id) {
      try { await api.deleteQuote(id, t); } catch {}
    }
    removeQuote(id);
    refresh();
  };

  const handleClearAll = async () => {
    const t = getAdminToken();
    if (t) {
      try {
        const res = await api.listAllQuotesAdmin(t, { limit: 500 });
        const all = res.quotes || [];
        for (const q of all) { if (q._id) await api.deleteQuote(q._id, t); }
      } catch {}
    }
    clearQuotes();
    refresh();
  };

  const handleApproveWorkOrder = async (id) => {
    const token = getAdminToken();
    if (!token) return;
    setApproving(prev => ({ ...prev, [id]: true }));
    try {
      await api.mfgApproveWorkOrder(token, id);
      toast({ title: 'Work order approved' });
      loadData();
    } catch (err) {
      toast({
        title: 'Failed to approve',
        description: err?.message || 'Unable to approve work order.',
        variant: 'destructive',
      });
    } finally {
      setApproving(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'id','createdAt','email','layers','widthMm','heightMm','material','finish','quantity','speed','bomLines','total','currency'
    ];
    const lines = [headers.join(',')];
    for (const q of quotes) {
      const row = [
        q.id,
        q.createdAt,
        q.contact?.email || '',
        q.specs?.layers ?? '',
        q.specs?.widthMm ?? '',
        q.specs?.heightMm ?? '',
        q.specs?.material ?? '',
        q.specs?.finish ?? '',
        q.specs?.quantity ?? '',
        q.delivery?.speed ?? '',
        q.bomStats?.totalLines ?? '',
        q.quote?.total ?? '',
        q.quote?.currency ?? 'INR',
      ];
      lines.push(row.map(escapeCsv).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quotes_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AdminLayout admin={admin}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Admin Dashboard | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Comprehensive administrative dashboard with analytics and management tools." />
      </Helmet>

      <section className="py-6">
        {/* Header with Time Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive analytics and management overview</p>
          </div>
          <div className="flex gap-2">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <Button variant="outline" onClick={loadData}>
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatInr(stats.total.revenue)}</p>
                </div>
                <div className="text-green-600">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{stats.total.items}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.quotes.total} quotes, {stats.orders.total} orders
                  </p>
                </div>
                <div className="text-blue-600">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="text-2xl font-bold">
                    {(() => {
                      const totalItems = stats.orders.total + stats.quotes.total;
                      const totalRevenue = stats.orders.revenue + stats.quotes.revenue;
                      const combinedAvg = totalItems > 0 ? totalRevenue / totalItems : 0;
                      return formatInr(combinedAvg);
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Orders: {formatInr(stats.orders.avg)}, Quotes: {formatInr(stats.quotes.avg)}
                  </p>
                </div>
                <div className="text-purple-600">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Success</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(() => {
                      const totalItems = stats.orders.total + stats.quotes.total;
                      const totalApproved = stats.payments.orders.approved + stats.payments.quotes.approved;
                      return totalItems > 0 ? Math.round((totalApproved / totalItems) * 100) : 0;
                    })()}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.payments.orders.approved + stats.payments.quotes.approved} of {stats.orders.total + stats.quotes.total} items
                  </p>
                </div>
                <div className="text-green-600">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">Orders Revenue</p>
                    <p className="text-sm text-muted-foreground">{stats.orders.total} orders</p>
                  </div>
                  <p className="text-xl font-bold text-blue-600">{formatInr(stats.orders.revenue)}</p>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium">Quotes Revenue</p>
                    <p className="text-sm text-muted-foreground">{stats.quotes.total} quotes</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">{formatInr(stats.quotes.revenue)}</p>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <div>
                    <p className="font-medium">Total Revenue</p>
                    <p className="text-sm text-muted-foreground">Combined</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{formatInr(stats.total.revenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Orders Payment Status</span>
                    <span>{stats.orders.total > 0 ? `${stats.payments.orders.approved + stats.payments.orders.submitted + stats.payments.orders.rejected} of ${stats.orders.total}` : 'No orders'}</span>
                  </div>
                  {stats.orders.total > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          Approved
                        </span>
                        <span className="font-medium">{stats.payments.orders.approved}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                          Submitted
                        </span>
                        <span className="font-medium">{stats.payments.orders.submitted}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          Rejected
                        </span>
                        <span className="font-medium">{stats.payments.orders.rejected}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No orders found</p>
                      <p className="text-xs">Orders will appear here when customers place them</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Quotes Payment Status</span>
                    <span>{stats.quotes.total > 0 ? `${stats.payments.quotes.approved + stats.payments.quotes.submitted + stats.payments.quotes.rejected} of ${stats.quotes.total}` : 'No quotes'}</span>
                  </div>
                  {stats.quotes.total > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          Approved
                        </span>
                        <span className="font-medium">{stats.payments.quotes.approved}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                          Submitted
                        </span>
                        <span className="font-medium">{stats.payments.quotes.submitted}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          Rejected
                        </span>
                        <span className="font-medium">{stats.payments.quotes.rejected}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No quotes found</p>
                      <p className="text-xs">Quotes will appear here when customers request them</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Link to="/pcbXpress/orders">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {getFilteredData(orders).slice(0, 5).length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders found</p>
              ) : (
                <div className="space-y-3">
                  {getFilteredData(orders).slice(0, 5).map((order) => (
                    <div key={order._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{order.shipping?.fullName || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()} • {order.items?.length || 0} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatInr(
                          order.amounts?.total || 
                          order.total ||
                          order.proformaInvoice?.total ||
                          0
                        )}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <PaymentProofStatus status={order.paymentProof?.status || 'not_submitted'} />
                          <Button variant="ghost" size="sm" onClick={() => setViewOrder(order)}>
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Quotes */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent Quotes</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={quotes.length === 0}>
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {getFilteredData(quotes).slice(0, 5).length === 0 ? (
                <p className="text-sm text-muted-foreground">No quotes found</p>
              ) : (
                <div className="space-y-3">
                  {getFilteredData(quotes).slice(0, 5).map((quote) => (
                    <div key={quote._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{quote.contact?.name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(quote.createdAt).toLocaleDateString()} • {quote.service}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          {formatInr(
                            quote.adminQuote?.total || 
                            quote.quote?.total || 
                            quote.proformaInvoice?.total ||
                            quote.total ||
                            0
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <PaymentProofStatus status={quote.paymentProof?.status || 'not_submitted'} />
                          <Button variant="ghost" size="sm" onClick={() => setViewQuote(quote)}>
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/pcbXpress/orders">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span className="text-sm">Manage Orders</span>
                </Button>
              </Link>
              <Link to="/pcbXpress/settings">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c1.56.379 2.978-1.56 2.978-2.978a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm">Settings</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col items-center gap-2"
                onClick={() => window.open('/', '_blank')}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm">View Site</span>
              </Button>
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col items-center gap-2"
                onClick={handleSignOut}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm">Sign Out</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manufacturing Work Orders */}
        <Card className="mt-6">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Manufacturing Work Orders</CardTitle>
            <Button variant="outline" size="sm" onClick={loadData}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {workOrders.filter(wo => !wo.mfgApproved).length === 0 ? (
              <p className="text-sm text-muted-foreground">All work orders are approved</p>
            ) : (
              <div className="space-y-3">
                {workOrders.filter(wo => !wo.mfgApproved).slice(0, 5).map((wo) => (
                  <div key={wo._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{wo.woNumber}</p>
                      <p className="text-xs text-muted-foreground">{wo.product}</p>
                      <div className="mt-1">
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {wo.stage || '—'}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleApproveWorkOrder(wo._id)}
                      disabled={approving[wo._id]}
                    >
                      {approving[wo._id] ? 'Approving...' : 'Approve'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Quote Modal */}
        {viewQuote && (
          <Dialog open={!!viewQuote} onOpenChange={() => setViewQuote(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Quote Details</DialogTitle>
              </DialogHeader>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <Detail label="Service" value={viewQuote.service} />
                <Detail label="Date" value={new Date(viewQuote.createdAt).toLocaleString()} />
                <Detail label="Contact" value={`${viewQuote.contact?.name || ''} <${viewQuote.contact?.email || ''}>`} />
                <Detail label="Company" value={viewQuote.contact?.company || '-'} />
                <Detail label="Phone" value={viewQuote.contact?.phone || '-'} />
                <Detail label="Address" value={viewQuote.contact?.address || '-'} />
                <Detail label="Total" value={formatInr(
                  viewQuote.adminQuote?.total || 
                  viewQuote.quote?.total || 
                  viewQuote.proformaInvoice?.total ||
                  viewQuote.total ||
                  0
                )} />
                <Detail label="Payment Status" value={<PaymentProofStatus status={viewQuote.paymentProof?.status || 'not_submitted'} />} />
                {viewQuote.service === 'pcb' && viewQuote.specs && (
                  <>
                    <Detail label="Board Size" value={`${viewQuote.specs.widthMm}×${viewQuote.specs.heightMm} mm`} />
                    <Detail label="Layers" value={viewQuote.specs.layers} />
                    <Detail label="Material" value={viewQuote.specs.material} />
                    <Detail label="Finish" value={viewQuote.specs.finish} />
                    <Detail label="Quantity" value={viewQuote.specs.quantity} />
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* View Order Modal */}
        {viewOrder && (
          <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Order Details</DialogTitle>
              </DialogHeader>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <Detail label="Order ID" value={viewOrder._id} />
                <Detail label="Date" value={new Date(viewOrder.createdAt).toLocaleString()} />
                <Detail label="Customer" value={viewOrder.shipping?.fullName} />
                <Detail label="Email" value={viewOrder.shipping?.email} />
                <Detail label="Status" value={viewOrder.status} />
                <Detail label="Total" value={formatInr(
                  viewOrder.amounts?.total || 
                  viewOrder.total ||
                  viewOrder.proformaInvoice?.total ||
                  0
                )} />
                <Detail label="Payment Status" value={<PaymentProofStatus status={viewOrder.paymentProof?.status || 'not_submitted'} />} />
                <Detail label="Items" value={viewOrder.items?.length || 0} />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </section>
    </AdminLayout>
  );
};

const Metric = ({ label, value }) => (
  <div className="rounded-md border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold">{value}</p>
  </div>
);

function escapeCsv(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const Detail = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium break-words">{value}</p>
  </div>
);

// PaymentProofStatus component
const PaymentProofStatus = ({ status }) => {
  const statusConfig = {
    not_submitted: { label: 'Not Submitted', color: 'bg-gray-100 text-gray-800' },
    submitted: { label: 'Submitted', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[status] || statusConfig.not_submitted;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

export default AdminDashboardPage;
