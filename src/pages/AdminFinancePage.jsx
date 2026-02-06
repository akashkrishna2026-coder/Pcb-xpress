// AdminFinancePage.jsx

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { api, getApiBaseUrl } from '@/lib/api';
import { getAdmin, getAdminToken } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Download,
  Search,
  Filter,
  Calendar,
  Users,
  Package,
  RefreshCw
} from 'lucide-react';

const AdminFinancePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [syncing, setSyncing] = useState(false);
  const hasSyncedRef = useRef(false);

  // Filters
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    service: 'all',
    startDate: '',
    endDate: '',
    search: '',
  });

  // Modal states
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const a = getAdmin();
    if (!a) {
      navigate('/pcbXpress/login');
      return;
    }
    setAdmin(a);
    loadData();
  }, [navigate]);

  const syncTransactions = async (showToast = false) => {
    const token = getAdminToken();
    if (!token) return;
    try {
      console.log('Starting transaction sync...');
      setSyncing(true);
      const res = await api.adminSyncTransactions(token);
      console.log('Sync response:', res);
      hasSyncedRef.current = true;
      if (showToast) {
        toast({ title: 'Transactions synced', description: res?.message || 'Finance records refreshed.' });
      }
    } catch (err) {
      console.error('Sync failed:', err);
      if (showToast) {
        toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
      }
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (!hasSyncedRef.current) {
        try {
          await syncTransactions();
        } catch (_) {
          // ignore sync errors on initial load, data fetch will still attempt
        }
      }

      await Promise.all([
        loadTransactions(),
        loadSummary(),
      ]);
    } catch (err) {
      toast({ title: 'Load failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (page = 1, limitOverride) => {
    const token = getAdminToken();
    if (!token) return;

    const callTimestamp = new Date().toISOString();
    console.log(`[${callTimestamp}] loadTransactions called with page=${page}, limitOverride=${limitOverride}`);

    const effectiveLimit = Number(limitOverride ?? pagination.limit ?? 20) || 20;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: effectiveLimit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value !== 'all')
      ),
    });

    console.log(`[${callTimestamp}] Fetching transactions with params:`, Object.fromEntries(queryParams));
    const res = await api.adminGetFinanceTransactions(token, queryParams);
    console.log(`[${callTimestamp}] Received transactions:`, res.transactions?.length || 0);
    const transactionsData = res.transactions || [];
    const ids = transactionsData.map(t => t._id);
    const uniqueIds = new Set(ids);
    const duplicateCount = ids.length - uniqueIds.size;
    if (duplicateCount > 0) {
      console.warn(`[${callTimestamp}] Duplicate transaction IDs detected: ${duplicateCount} duplicates. IDs:`, ids);
      console.log(`[${callTimestamp}] Full transactions data:`, transactionsData);
    } else {
      console.log(`[${callTimestamp}] No duplicates detected.`);
    }
    setTransactions(transactionsData);
    if (res.pagination) {
      const limitValue = Number(res.pagination.limit ?? effectiveLimit) || effectiveLimit;
      const totalValue = Number(res.pagination.total ?? 0);
      setPagination({
        page: Number(res.pagination.page ?? page) || page,
        limit: limitValue,
        total: totalValue,
        totalPages: Math.max(1, Number(res.pagination.totalPages ?? Math.ceil(totalValue / limitValue)) || 1),
      });
    } else {
      setPagination((prev) => ({
        page,
        limit: effectiveLimit,
        total: res.transactions?.length ?? prev.total,
        totalPages: prev.totalPages,
      }));
    }
  };

  const loadSummary = async () => {
    const token = getAdminToken();
    if (!token) return;

    const queryParams = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([key, value]) =>
          ['startDate', 'endDate'].includes(key) && value !== ''
        )
      )
    );

    const res = await api.adminGetFinanceSummary(token, queryParams);
    setSummary(res || null);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadData();
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      status: 'all',
      service: 'all',
      startDate: '',
      endDate: '',
      search: '',
    });
    loadData();
  };

  const handleStatusUpdate = async (transactionId, newStatus) => {
    setUpdatingStatus(true);
    try {
      const token = getAdminToken();
      await api.adminUpdateTransactionStatus(token, transactionId, newStatus);

      toast({ title: 'Status updated successfully' });
      loadTransactions(pagination.page, pagination.limit);
    } catch (err) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePaymentProofAction = async (transactionId, action) => {
    try {
      const token = getAdminToken();
      const reason = action === 'rejected' ? prompt('Rejection reason:') : '';
      if (action === 'rejected' && !reason) return;

      await api.adminUpdateTransactionPaymentProof(token, transactionId, action, reason);

      toast({ title: `Payment ${action} successfully` });
      loadTransactions(pagination.page, pagination.limit);
      loadSummary();
    } catch (err) {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleExport = async (format) => {
    try {
      const token = getAdminToken();
      const queryParams = new URLSearchParams({ format, ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value !== 'all')
      ) });
      const res = await api.adminExportFinanceData(token, queryParams);

      // Create download link
      const blob = new Blob([res], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance-report.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({ title: 'Export completed' });
    } catch (err) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    }
  };
  

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'secondary', label: 'Pending' },
      completed: { variant: 'default', label: 'Completed' },
      failed: { variant: 'destructive', label: 'Failed' },
      refunded: { variant: 'outline', label: 'Refunded' },
      cancelled: { variant: 'outline', label: 'Cancelled' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const summaryCards = useMemo(() => {
    if (!summary) return [];

    return [
      {
        title: 'Total Revenue',
        value: formatCurrency(summary.summary?.totalRevenue || 0),
        icon: DollarSign,
        color: 'text-green-600',
      },
      {
        title: 'Net Revenue',
        value: formatCurrency(summary.summary?.netRevenue || 0),
        icon: TrendingUp,
        color: 'text-blue-600',
      },
      {
        title: 'Pending Payments',
        value: summary.summary?.pendingPayments || 0,
        icon: AlertCircle,
        color: 'text-yellow-600',
      },
      {
        title: 'Completed Payments',
        value: summary.summary?.completedPayments || 0,
        icon: CreditCard,
        color: 'text-green-600',
      },
    ];
  }, [summary]);

  const currentPage = Math.max(1, Number(pagination.page) || 1);
  const currentLimit = Math.max(1, Number(pagination.limit) || 20);
  const totalTransactions = Number(pagination.total) || transactions.length || 0;
  const totalPages = Math.max(1, Number(pagination.totalPages) || Math.ceil(totalTransactions / currentLimit) || 1);

  if (loading) {
    return (
      <AdminLayout admin={admin}>
        <div className="flex justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout admin={admin}>
      <Helmet>
        <title>Finance | PCB Xpress Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Finance Dashboard</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={syncing || loading}
              onClick={async () => {
                try {
                  await syncTransactions(true);
                  await loadData();
                } catch (_) {
                  // errors surface via toast inside syncTransactions
                }
              }}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync Transactions
            </Button>
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </div>
                  <card.icon className={`h-8 w-8 ${card.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Breakdown */}
        {summary?.revenueByService && summary.revenueByService.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.revenueByService.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="capitalize">{item._id || 'Unknown'}</span>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction Types */}
        {summary?.revenueByType && summary.revenueByType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Transaction Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.revenueByType.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="capitalize">{item._id}</span>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.total)}</div>
                      <div className="text-sm text-muted-foreground">{item.count} transactions</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Service</label>
                <Select value={filters.service} onValueChange={(value) => handleFilterChange('service', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="pcb">PCB</SelectItem>
                    <SelectItem value="pcb_assembly">PCB Assembly</SelectItem>
                    <SelectItem value="3dprinting">3D Printing</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="wire_harness">Wire Harness</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Order/Quote # or Customer"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters}>Apply Filters</Button>
              <Button variant="outline" onClick={clearFilters}>Clear</Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Date</th>
                    <th className="text-left py-2 px-4">Type</th>
                    <th className="text-left py-2 px-4">Reference</th>
                    <th className="text-left py-2 px-4">Customer</th>
                    <th className="text-left py-2 px-4">Amount</th>
                    <th className="text-left py-2 px-4">Status</th>
                    <th className="text-left py-2 px-4">Payment</th>
                    <th className="text-left py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction._id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 capitalize">{transaction.type}</td>
                      <td className="py-3 px-4">
                        {transaction.metadata?.orderNumber || transaction.metadata?.quoteNumber || transaction._id}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{transaction.metadata?.customerName}</div>
                          <div className="text-xs text-muted-foreground">{transaction.metadata?.customerEmail}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(transaction.status)}</td>
                      <td className="py-3 px-4">
                        {transaction.paymentProof?.status === 'submitted' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handlePaymentProofAction(transaction._id, 'approved')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handlePaymentProofAction(transaction._id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {transaction.paymentProof?.status === 'approved' && (
                          <Badge variant="default">Approved</Badge>
                        )}
                        {transaction.paymentProof?.status === 'rejected' && (
                          <Badge variant="destructive">Rejected</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setShowTransactionModal(true);
                            }}
                          >
                            View
                          </Button>
                          {/* Refund functionality removed */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * currentLimit) + 1} to{' '}
                  {Math.min(currentPage * currentLimit, totalTransactions)} of {totalTransactions} transactions
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadTransactions(currentPage - 1, currentLimit)}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadTransactions(currentPage + 1, currentLimit)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Refund UI removed */}

      {/* Transaction Detail Modal */}
      {showTransactionModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Transaction Details</h3>
                <Button variant="ghost" onClick={() => setShowTransactionModal(false)}>×</Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Transaction ID</label>
                    <p className="text-sm text-muted-foreground break-all">{selectedTransaction._id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <p className="capitalize">{selectedTransaction.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Amount</label>
                    <p className="font-medium">{formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    {getStatusBadge(selectedTransaction.status)}
                  </div>
                </div>

                {/* Customer Info */}
                <div>
                  <label className="text-sm font-medium">Customer</label>
                  <div className="mt-1 p-3 bg-muted rounded">
                    <p className="font-medium">{selectedTransaction.metadata?.customerName}</p>
                    <p className="text-sm text-muted-foreground">{selectedTransaction.metadata?.customerEmail}</p>
                  </div>
                </div>

                {/* Audit Trail */}
                {selectedTransaction.auditTrail?.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Audit Trail</label>
                    <div className="mt-2 space-y-2">
                      {selectedTransaction.auditTrail.map((entry, index) => (
                        <div key={index} className="text-xs p-2 bg-muted rounded">
                          <div className="flex justify-between">
                            <span className="font-medium capitalize">{entry.action.replace('_', ' ')}</span>
                            <span className="text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {entry.notes && <p className="mt-1">{entry.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Proof */}
                {selectedTransaction.paymentProof && (
                  <div>
                    <label className="text-sm font-medium">Payment Proof</label>
                    <div className="mt-2 p-3 bg-muted rounded">
                      {(() => {
                        const proof = selectedTransaction.paymentProof.proofFile;
                        if (!proof) return <p className="text-sm text-muted-foreground">No proof file available</p>;
                        const filename = proof.filename || proof.path?.split('/').pop();
                        if (!filename) return <p className="text-sm text-muted-foreground">No file available</p>;

                        const baseUrl = getApiBaseUrl();
                        const fileUrl = `${baseUrl}/api/uploads/${encodeURIComponent(filename)}`;
                        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filename);

                        return (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">{filename}</p>
                            {isImage ? (
                              <img
                                src={fileUrl}
                                alt="Payment Proof"
                                className="max-w-full h-auto max-h-64 rounded border"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'block';
                                }}
                              />
                            ) : null}
                            <a
                              href={fileUrl}
                              download={filename}
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-4 w-4" />
                              {isImage ? 'Download Image' : 'Download File'}
                            </a>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminFinancePage;
