import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const AdminPcbAssemblyDispatchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [admin, setAdmin] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [highlightedDispatchId, setHighlightedDispatchId] = useState(null);

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

    // Check for dispatchId query parameter
    const dispatchId = searchParams.get('dispatchId');
    if (dispatchId) {
      setHighlightedDispatchId(dispatchId);
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = getAdminToken();
        if (!token) {
          setDispatches([]);
          setTotal(0);
          return;
        }

        const res = await api.mfgListDispatches(token, {
          stage: 'assembly_final_dispatch',
          limit: 200,
          page: 1,
          status: 'pending',
        });

        const rows = Array.isArray(res?.dispatches) ? res.dispatches : [];
        const sorted = rows.sort((a, b) => {
          const aTime = new Date(a.releasedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.releasedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        setDispatches(sorted);
        setTotal(sorted.length);
      } catch (err) {
        setDispatches([]);
        setTotal(0);
        toast({
          title: 'Unable to load PCB assembly dispatches',
          description: err?.message || 'Something went wrong while loading assembly dispatch queue.',
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

  const paginatedDispatches = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return dispatches.slice(start, end);
  }, [limit, page, dispatches]);

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>PCB Assembly Dispatch | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">PCB Assembly Dispatch</CardTitle>
            <p className="text-sm text-muted-foreground">
              PCB assembly lots finishing final dispatch awaiting hand-off.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground" htmlFor="pcb-assembly-dispatch-limit">
              Rows per page
            </label>
            <select
              id="pcb-assembly-dispatch-limit"
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
                ? 'No PCB assembly lots waiting for dispatch.'
                : `Showing ${(page - 1) * limit + 1}-${Math.min(
                    (page - 1) * limit + paginatedDispatches.length,
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
                  <th className="px-3 py-2 font-medium">Assembly Dispatch Status</th>
                  <th className="px-3 py-2 font-medium">Released</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDispatches.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                      {loading ? 'Loading PCB assembly dispatch queue…' : 'No PCB assembly dispatches pending.'}
                    </td>
                  </tr>
                )}
                {paginatedDispatches.map((dispatch) => (
                  <tr
                    key={dispatch._id || dispatch.id}
                    className={`border-t ${highlightedDispatchId === (dispatch._id || dispatch.id) ? 'bg-yellow-50' : ''}`}
                  >
                    <td className="px-3 py-2 font-medium">{dispatch.woNumber || '--'}</td>
                    <td className="px-3 py-2">{dispatch.customer || '--'}</td>
                    <td className="px-3 py-2">{dispatch.product || '--'}</td>
                    <td className="px-3 py-2">{Number.isFinite(dispatch.quantity) ? dispatch.quantity : '--'}</td>
                    <td className="px-3 py-2 capitalize">{dispatch.priority || 'normal'}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        Ready
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {dispatch.status ? dispatch.status.toUpperCase() : '--'}
                    </td>
                    <td className="px-3 py-2">
                      {formatDateTime(dispatch.releasedAt || dispatch.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      {dispatch.notes || '--'}
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

export default AdminPcbAssemblyDispatchPage;