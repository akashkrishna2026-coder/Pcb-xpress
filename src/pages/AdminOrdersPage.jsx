// AdminOrdersPage.jsx

import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { api, getApiBaseUrl } from '@/lib/api';
import { getAdmin, getAdminToken, clearAdmin, clearAdminToken } from '@/lib/storage';
import { useNavigate, Link } from 'react-router-dom';

/**
 * IMPORTANT: This list must match the backend enum exactly.
 * Backend (Order.status) allows: ['Pending','Processing','Shipped','Delivered','Cancelled']
 */
const SUPPORTED_STATUS_OPTIONS = [
  'Pending',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const AdminOrdersPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // edit modal state
  const [editFor, setEditFor] = useState(null);
  const [editStatus, setEditStatus] = useState('Pending');
  const [editTracking, setEditTracking] = useState('');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewFor, setViewFor] = useState(null);
  const [deleteFor, setDeleteFor] = useState(null);

  useEffect(() => {
    const a = getAdmin();
    if (!a) {
      navigate('/pcbXpress/login');
      return;
    }
    setAdmin(a);

    fetchOrders();
  }, [navigate, page, limit]);

  const handleSignOut = () => {
    clearAdmin();
    clearAdminToken();
    toast({ title: 'Signed out of admin' });
    navigate('/');
  };

  const fetchOrders = async () => {
    const t = getAdminToken();
    if (!t) {
      setOrders([]);
      setTotal(0);
      setPages(1);
      return;
    }
    try {
      const res = await api.adminListOrders(t, { limit, page });
      setOrders(res.orders || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch {
      setOrders([]);
      setTotal(0);
      setPages(1);
    }
  };

  const refresh = async () => {
    await fetchOrders();
  };


  async function handleDelete(order) {
    try {
      const id = order?._id || order?.id;
      if (!id) return;

      const token = getAdminToken();
      if (token) {
        await api.adminDeleteOrder(token, id);
      }

      setOrders((prev) => prev.filter((o) => (o._id || o.id) !== id));
      if (viewFor && (viewFor._id === id || viewFor.id === id)) setViewFor(null);
      if (editFor && (editFor._id === id || editFor.id === id)) closeEdit();
      toast({ title: token ? 'Order deleted' : 'Order removed locally' });
      setDeleteFor(null);
    } catch (err) {
      toast({ title: 'Delete failed', description: err?.message || 'Could not delete order', variant: 'destructive' });
    }
  }

  const handlePaymentProofAction = async (action) => {
    const t = getAdminToken();
    if (!t) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return;
    }

    if (!editFor?._id) {
      toast({ title: 'Invalid order ID', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);

      let rejectionReason = '';
      if (action === 'rejected') {
        rejectionReason = prompt('Please provide a reason for rejection:');
        if (rejectionReason === null) return; // User cancelled
      }

      // Call the API to update payment proof status
      await api.adminUpdateOrderPaymentProofStatus(t, editFor._id, action, rejectionReason);

      const successMessage = action === 'approved' ? 'Payment proof approved' : 'Payment proof rejected';
      toast({ title: successMessage });

      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          (o._id === editFor._id || o.id === editFor._id)
            ? {
                ...o,
                paymentProof: {
                  ...o.paymentProof,
                  status: action,
                  [action === 'approved' ? 'approvedAt' : 'rejectedAt']: new Date().toISOString(),
                  ...(action === 'rejected' ? { rejectionReason } : {}),
                },
              }
            : o
        )
      );

      // Update editFor to reflect changes
      setEditFor((prev) => ({
        ...prev,
        paymentProof: {
          ...prev.paymentProof,
          status: action,
          [action === 'approved' ? 'approvedAt' : 'rejectedAt']: new Date().toISOString(),
          ...(action === 'rejected' ? { rejectionReason } : {}),
        },
      }));

    } catch (err) {
      toast({
        title: 'Action failed',
        description: err?.message || 'Could not update payment proof status',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const totalOrders = useMemo(() => orders.length, [orders]);
  const totalAmount = useMemo(
    () => orders.reduce((sum, o) => sum + Number(o?.amounts?.total || 0), 0),
    [orders]
  );

  const openEdit = (order) => {
    setEditFor(order);
    // Use whatever is on the order for display; we’ll validate on save.
    setEditStatus(order?.status || 'Pending');
    setEditTracking(order?.shipping?.trackingNumber || '');
    setEditNote(order?.adminNote || '');
  };

  const closeEdit = () => {
    if (saving) return;
    setEditFor(null);
    setEditStatus('Pending');
    setEditTracking('');
    setEditNote('');
  };

  /**
   * For /status endpoint: send ONLY { status } (no other fields).
   * CRITICAL: Pass the status VALUE (string) to api.adminUpdateOrderStatus,
   * not an object, so the request body becomes { status: "<value>" }.
   */
  async function updateStatusOnly(id, token, statusValue) {
    if (typeof api.adminUpdateOrderStatus === 'function') {
      // api.adminUpdateOrderStatus(token, id, statusValue) -> wraps to { status: "<value>" }
      return api.adminUpdateOrderStatus(token, id, statusValue);
    }
    if (typeof api.adminUpdateOrder === 'function') {
      // generic updater (server must accept { status } here)
      return api.adminUpdateOrder(token, id, { status: statusValue });
    }
    throw new Error(
      'No API method found to update order status (define api.adminUpdateOrderStatus or api.adminUpdateOrder).'
    );
  }

  /**
   * Optionally update tracking/note with a SEPARATE call if your API supports it.
   * Many backends reject extra fields on /status.
   */
  async function updateDetailsIfNeeded(id, token, trackingNumber, note, original) {
    const trackingChanged =
      (original?.shipping?.trackingNumber || '') !== (trackingNumber || '');
    const noteChanged = (original?.adminNote || '') !== (note || '');
    if (!trackingChanged && !noteChanged) return;

    if (typeof api.adminUpdateOrder === 'function') {
      const payload = {
        ...(trackingChanged ? { trackingNumber } : {}),
        ...(noteChanged ? { note } : {}),
      };
      await api.adminUpdateOrder(token, id, payload);
    }
  }

  const saveEdit = async () => {
    const t = getAdminToken();
    if (!t) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return;
    }
    if (!editFor?._id && !editFor?.id) {
      toast({ title: 'Invalid order ID', variant: 'destructive' });
      return;
    }

    const id = editFor._id || editFor.id;
    const chosen = editStatus;

    // Guard: don’t let the user send a value the server won’t accept
    if (!SUPPORTED_STATUS_OPTIONS.includes(chosen)) {
      toast({
        title: 'Invalid status for this server',
        description: `“${chosen}” is not supported by the backend. Allowed: ${SUPPORTED_STATUS_OPTIONS.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      // Optimistic UI
      setOrders((prev) =>
        prev.map((o) =>
          (o._id === id || o.id === id)
            ? {
                ...o,
                status: chosen,
                adminNote: editNote,
                shipping: {
                  ...(o.shipping || {}),
                  trackingNumber: editTracking || undefined,
                },
              }
            : o
        )
      );

      // 1) Update STATUS ONLY (pass the STRING, not an object)
      await updateStatusOnly(id, t, chosen);

      // 2) Update tracking/note separately if changed
      await updateDetailsIfNeeded(id, t, editTracking || undefined, editNote || undefined, editFor);

      toast({ title: 'Order updated' });
      closeEdit();
      refresh();
    } catch (err) {
      // Re-sync from server in case optimistic step diverged
      refresh();
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not update order';
      toast({
        title: 'Update failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    editFor &&
    (editStatus !== (editFor.status || 'Pending') ||
      (editFor?.shipping?.trackingNumber || '') !== editTracking ||
      (editFor?.adminNote || '') !== editNote);

  // Build the dropdown list: include current status for visibility even if unsupported,
  // but mark unsupported ones as disabled so they can’t be selected.
  const editOptions = useMemo(() => {
    const s = new Set(SUPPORTED_STATUS_OPTIONS);
    const list = [...SUPPORTED_STATUS_OPTIONS];
    const current = editFor?.status;
    if (current && !s.has(current)) list.unshift(current); // show current at top if unknown
    return list;
  }, [editFor]);

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Admin Orders | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <section className="py-2 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Orders</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh}>Refresh</Button>
            <Link to="/pcbXpress">
              <Button variant="ghost">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Stat label="Total Orders" value={String(totalOrders)} />
          <Stat
            label="Total Value"
            value={Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalAmount)}
          />
          <Stat label="Currency" value="INR" />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders to display.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Customer</th>
                      <th className="py-2 pr-4">Items</th>
                      <th className="py-2 pr-4">Total</th>
                      <th className="py-2 pr-4">Payment</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o._id || o.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {new Date(o.createdAt || o.created_at || Date.now()).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4">
                          {o.shipping?.fullName || '-'}
                          <br />
                          <span className="text-xs text-muted-foreground">{o.shipping?.email || ''}</span>
                        </td>
                        <td className="py-3 pr-4">
                          {(() => {
                            if (!Array.isArray(o.items) || o.items.length === 0) return '0';
                            const totalQty = o.items.reduce((n, it) => n + (it.quantity || 1), 0);
                            const names = o.items.map(it => it.name || it.part || 'Unknown').join(', ');
                            return `${names} (${totalQty} item${totalQty !== 1 ? 's' : ''})`;
                          })()}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(o.amounts?.total || 0)}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <PaymentProofStatus status={o.paymentProof?.status || 'not_submitted'} />
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">{o.status || 'Pending'}</td>
                        <td className="py-3 pr-2">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setViewFor(o)}>View</Button>
                            <Button variant="outline" size="sm" onClick={() => openEdit(o)}>Edit</Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteFor(o)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
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
                <option value={20}>20</option>
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
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page >= pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Edit Modal */}
      {editFor && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-start justify-center p-4" onClick={closeEdit}>
          <div
            className="bg-background rounded-lg shadow-xl w-full max-w-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold">Update Order Status</h3>
              <Button variant="ghost" size="sm" onClick={closeEdit}>Close</Button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Order ID</p>
                  <p className="font-medium break-all">{editFor._id || editFor.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{editFor?.shipping?.fullName || '-'}</p>
                  <p className="text-xs text-muted-foreground">{editFor?.shipping?.email || ''}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="mt-1 h-10 w-full border rounded-md px-3 text-sm bg-background"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  {editOptions.map((s) => {
                    const isSupported = SUPPORTED_STATUS_OPTIONS.includes(s);
                    return (
                      <option key={s} value={s} disabled={!isSupported}>
                        {s}{!isSupported ? ' (unsupported by server)' : ''}
                      </option>
                    );
                  })}
                </select>
                {!SUPPORTED_STATUS_OPTIONS.includes(editStatus) && (
                  <p className="mt-1 text-xs text-red-500">
                    This status isn’t supported by the backend; choose one of: {SUPPORTED_STATUS_OPTIONS.join(', ')}.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Tracking Number (optional)</label>
                <input
                  className="mt-1 h-10 w-full border rounded-md px-3 text-sm"
                  value={editTracking}
                  onChange={(e) => setEditTracking(e.target.value)}
                  placeholder="eg. BLR-EX-123456"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Admin Note (optional)</label>
                <textarea
                  className="mt-1 w-full min-h-[80px] border rounded-md px-3 py-2 text-sm"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Add a short internal note for this order"
                />
              </div>

              {/* Payment Proof Section */}
              {editFor?.paymentProof && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Payment Proof</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status:</span>
                      <PaymentProofStatus status={editFor.paymentProof.status} />
                    </div>
                    {editFor.paymentProof.proofFile && (
                      <div>
                        <span className="text-sm">Proof File:</span>
                        <div className="mt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const pf = editFor.paymentProof.proofFile || {};
                              const base = getApiBaseUrl();
                              let openUrl = '';
                              if (pf.filename) {
                                openUrl = `${getApiBaseUrl()}/api/uploads/${encodeURIComponent(pf.filename)}`;
                              } else if (typeof pf.url === 'string' && pf.url.length > 0) {
                                try {
                                  if (pf.url.startsWith('http')) {
                                    const u = new URL(pf.url);
                                    let p = u.pathname || '';
                                    if (p.startsWith('/uploads/')) p = `/api${p}`;
                                    openUrl = `${base}${p}`;
                                  } else {
                                    let rel = pf.url;
                                    if (rel.startsWith('/uploads/')) rel = `/api${rel}`;
                                    openUrl = `${base}${rel.startsWith('/') ? '' : '/'}${rel}`;
                                  }
                                } catch {
                                  openUrl = pf.url;
                                }
                              }
                              if (openUrl) window.open(openUrl, '_blank', 'noopener');
                            }}
                          >
                            View Proof
                          </Button>
                        </div>
                      </div>
                    )}
                    {editFor.paymentProof.submittedAt && (
                      <div>
                        <span className="text-sm">Submitted:</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {new Date(editFor.paymentProof.submittedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {editFor.paymentProof.status === 'approved' && editFor.paymentProof.approvedAt && (
                      <div>
                        <span className="text-sm">Approved:</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {new Date(editFor.paymentProof.approvedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {editFor.paymentProof.status === 'rejected' && (
                      <div>
                        <span className="text-sm">Rejected:</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {new Date(editFor.paymentProof.rejectedAt).toLocaleString()}
                        </span>
                        {editFor.paymentProof.rejectionReason && (
                          <div className="mt-1">
                            <span className="text-sm">Reason:</span>
                            <p className="text-sm text-red-600 mt-1">{editFor.paymentProof.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment Proof Actions */}
                    {editFor.paymentProof.status === 'submitted' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handlePaymentProofAction('approved')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve Payment
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handlePaymentProofAction('rejected')}
                        >
                          Reject Payment
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t pt-4 text-xs text-muted-foreground">
                <p>The customer may see the updated status in their dashboard and email (if enabled on backend).</p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={saveEdit} disabled={!dirty || saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="outline" onClick={closeEdit} disabled={saving}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* View Modal */}
      {viewFor && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-start justify-center p-4" onClick={() => setViewFor(null)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Order Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setViewFor(null)}>Close</Button>
            </div>
            <div className="p-6 space-y-6 text-sm">
              <div className="grid sm:grid-cols-2 gap-4">
                <Detail label="Order ID" value={viewFor._id || viewFor.id} />
                <Detail label="Date" value={new Date(viewFor.createdAt || Date.now()).toLocaleString()} />
                <Detail label="Status" value={viewFor.status || 'Pending'} />
                <Detail label="Payment" value={<PaymentProofStatus status={viewFor.paymentProof?.status || 'not_submitted'} />} />
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-semibold mb-2">Customer</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Detail label="Name" value={viewFor.shipping?.fullName || '-'} />
                  <Detail label="Email" value={viewFor.shipping?.email || '-'} />
                  <Detail label="Phone" value={viewFor.shipping?.phone || '-'} />
                  <Detail label="Address" value={[
                    viewFor.shipping?.address1,
                    viewFor.shipping?.address2,
                    viewFor.shipping?.city,
                    viewFor.shipping?.state,
                    viewFor.shipping?.postalCode,
                    viewFor.shipping?.country,
                  ].filter(Boolean).join(', ') || '-'} />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-semibold mb-2">Items</p>
                {Array.isArray(viewFor.items) && viewFor.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-4">Component</th>
                          <th className="py-2 pr-4">Mfr</th>
                          <th className="py-2 pr-4">Qty</th>
                          <th className="py-2 pr-4">Unit Price</th>
                          <th className="py-2 pr-4">Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewFor.items.map((it, idx) => {
                          const qty = Number(it.quantity || 0);
                          const price = Number(it.price || 0);
                          const line = qty * price;
                          const cur = viewFor.amounts?.currency || 'INR';
                          const name =
                            it.name ||
                            it.part ||
                            it.title ||
                            it.component ||
                            it.componentName ||
                            it.productName ||
                            it.desc ||
                            it.description ||
                            '-';
                          return (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-2 pr-4">
                                <div>
                                  {name}
                                  {(() => {
                                    const pid = Number(it.part ?? it.partNumber ?? it.product?.id);
                                    if (Number.isFinite(pid)) {
                                      return <span className="text-xs text-muted-foreground ml-2">(#{pid})</span>;
                                    }
                                    const ptxt = it.part || it.partNumber || it.product?.part || '';
                                    return ptxt ? <span className="text-xs text-muted-foreground ml-2">({ptxt})</span> : null;
                                  })()}
                                </div>
                              </td>
                              <td className="py-2 pr-4">{it.mfr || '-'}</td>
                              <td className="py-2 pr-4 whitespace-nowrap">{qty}</td>
                              <td className="py-2 pr-4 whitespace-nowrap">{Intl.NumberFormat('en-IN', { style: 'currency', currency: cur }).format(price)}</td>
                              <td className="py-2 pr-4 whitespace-nowrap">{Intl.NumberFormat('en-IN', { style: 'currency', currency: cur }).format(line)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No items in this order.</p>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-semibold mb-2">Amounts</p>
                <div className="grid sm:grid-cols-4 gap-4">
                  <Detail label="Subtotal" value={Intl.NumberFormat('en-IN', { style: 'currency', currency: viewFor.amounts?.currency || 'INR' }).format(viewFor.amounts?.subtotal || 0)} />
                  <Detail label="Shipping" value={Intl.NumberFormat('en-IN', { style: 'currency', currency: viewFor.amounts?.currency || 'INR' }).format(viewFor.amounts?.shipping || 0)} />
                  <Detail label="Taxes" value={Intl.NumberFormat('en-IN', { style: 'currency', currency: viewFor.amounts?.currency || 'INR' }).format(viewFor.amounts?.taxes || 0)} />
                  <Detail label="Total" value={Intl.NumberFormat('en-IN', { style: 'currency', currency: viewFor.amounts?.currency || 'INR' }).format(viewFor.amounts?.total || 0)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteFor && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-start justify-center p-4" onClick={() => setDeleteFor(null)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Confirm Deletion</h3>
              <Button variant="ghost" size="sm" onClick={() => setDeleteFor(null)}>Close</Button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p>Are you sure you want to delete this order? This will cancel it on the server (if authenticated) or remove it locally. This action cannot be undone.</p>
              <div className="flex gap-2 pt-1">
                <Button variant="destructive" onClick={() => handleDelete(deleteFor)}>Delete</Button>
                <Button variant="outline" onClick={() => setDeleteFor(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const Stat = ({ label, value }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </CardContent>
  </Card>
);

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

export default AdminOrdersPage;

const Detail = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium break-words">{value}</p>
  </div>
);

