import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

const formatDateTime = (value) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString();
};

const AssemblyDispatchDataView = () => {
  const { toast } = useToast();
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDispatches = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('mfg_token');
        if (!token) {
          toast({
            title: 'Authentication required',
            description: 'Please log in to view dispatch data.',
            variant: 'destructive',
          });
          return;
        }

        const res = await api.mfgListDispatches(token, {
          stage: 'assembly_final_dispatch',
          limit: 200,
          page: 1,
          status: 'pending_admin_review',
        });

        const rows = Array.isArray(res?.dispatches) ? res.dispatches : [];
        const sorted = rows.sort((a, b) => {
          const aTime = new Date(a.releasedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.releasedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        setDispatches(sorted);
      } catch (err) {
        console.error('Failed to load assembly dispatches:', err);
        toast({
          title: 'Unable to load assembly dispatches',
          description: err?.message || 'Something went wrong while loading assembly dispatch data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadDispatches();
  }, [toast]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Assembly Dispatch Data</CardTitle>
          <p className="text-sm text-muted-foreground">
            Assembly lots ready for final dispatch and hand-off to shipping.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading assembly dispatch data...</div>
            </div>
          ) : dispatches.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm text-muted-foreground">No assembly dispatches found.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">WO #</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">Quantity</th>
                    <th className="px-3 py-2 font-medium">Priority</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Released</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.map((dispatch) => (
                    <tr key={dispatch._id || dispatch.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{dispatch.woNumber || '--'}</td>
                      <td className="px-3 py-2">{dispatch.customer || '--'}</td>
                      <td className="px-3 py-2">{dispatch.product || '--'}</td>
                      <td className="px-3 py-2">{Number.isFinite(dispatch.quantity) ? dispatch.quantity : '--'}</td>
                      <td className="px-3 py-2 capitalize">{dispatch.priority || 'normal'}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          {dispatch.status ? dispatch.status.toUpperCase() : '--'}
                        </span>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssemblyDispatchDataView;