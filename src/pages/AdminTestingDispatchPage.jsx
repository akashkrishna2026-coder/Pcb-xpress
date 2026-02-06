import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import {
  getAdmin,
  getAdminToken,
  clearAdmin,
  clearAdminToken,
} from '@/lib/storage';

const formatDateTime = (value) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString();
};

const AdminTestingDispatchPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [admin, setAdmin] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const pages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / limit)),
    [limit, total],
  );

  useEffect(() => {
    const currentAdmin = getAdmin();
    if (!currentAdmin) {
      navigate('/pcbXpress/login');
      return;
    }
    setAdmin(currentAdmin);
  }, [navigate]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = getAdminToken();
        if (!token) {
          setWorkOrders([]);
          setTotal(0);
          return;
        }

        const FETCH_LIMIT = 200;
        const res = await api.mfgWorkOrders(token, {
          focus: 'testing',
          limit: FETCH_LIMIT,
          page: 1,
        });

        const rows = Array.isArray(res?.workOrders) ? res.workOrders : [];
        const sorted = rows.sort((a, b) => {
          const aTime = new Date(a.testingStatus?.releasedAt || a.updatedAt || 0).getTime();
          const bTime = new Date(b.testingStatus?.releasedAt || b.updatedAt || 0).getTime();
          return bTime - aTime;
        });
        setWorkOrders(sorted);
        setTotal(sorted.length);
      } catch (err) {
        setWorkOrders([]);
        setTotal(0);
        toast({
          title: 'Unable to load testing dispatches',
          description: err?.message || 'Something went wrong while loading final QC queue.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const handleSignOut = () => {
    clearAdmin();
    clearAdminToken();
    toast({ title: 'Signed out of admin' });
    navigate('/');
  };

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return workOrders.slice(start, end);
  }, [limit, page, workOrders]);

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Testing Dispatch | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Testing Dispatch</CardTitle>
            <p className="text-sm text-muted-foreground">
              Dedicated testing work orders awaiting dispatch hand-off.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground" htmlFor="testing-dispatch-limit">
              Rows per page
            </label>
            <select
              id="testing-dispatch-limit"
              className="h-9 rounded-md border px-2 text-sm"
              value={limit}
              onChange={(event) => {
                setPage(1);
                setLimit(Number(event.target.value) || 20);
              }}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total === 0
                ? 'No testing lots waiting for dispatch.'
                : `Showing ${(page - 1) * limit + 1}-${Math.min(
                    (page - 1) * limit + paginatedOrders.length,
                    total,
                  )} of ${total}`}
            </span>
            <span>{loading ? 'Refreshing…' : null}</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">WO #</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Quantity</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium">Traveler Ready</th>
                  <th className="px-3 py-2 font-medium">Testing Status</th>
                  <th className="px-3 py-2 font-medium">Released</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                      {loading ? 'Loading testing queue…' : 'No dedicated testing work orders pending dispatch.'}
                    </td>
                  </tr>
                )}
                {paginatedOrders.map((order) => (
                  <tr key={order._id || order.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{order.woNumber || '--'}</td>
                    <td className="px-3 py-2">{order.customer || '--'}</td>
                    <td className="px-3 py-2">{order.product || '--'}</td>
                    <td className="px-3 py-2">{Number.isFinite(order.quantity) ? order.quantity : '--'}</td>
                    <td className="px-3 py-2 capitalize">{order.priority || 'normal'}</td>
                    <td className="px-3 py-2">
                      {order.travelerReady ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Ready
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {order.testingStatus?.state
                        ? order.testingStatus.state.toUpperCase()
                        : '--'}
                    </td>
                    <td className="px-3 py-2">
                      {formatDateTime(
                        order.testingStatus?.releasedAt ||
                          order.testingStatus?.updatedAt ||
                          order.updatedAt,
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {order.testingStatus?.notes || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(pages, current + 1))}
              disabled={page >= pages || loading}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminTestingDispatchPage;
