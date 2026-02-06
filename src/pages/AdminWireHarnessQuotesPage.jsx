import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { api, getApiBaseUrl } from '@/lib/api';
import { getAdmin, getAdminToken, clearAdmin, clearAdminToken, getQuotes, removeQuote } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { formatInr } from '@/lib/currency';
import PaymentProofModal from '@/components/admin/PaymentProofModal';

const AdminWireHarnessQuotesPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [viewQuote, setViewQuote] = useState(null);
  const [sendFor, setSendFor] = useState(null);
  const [sendValue, setSendValue] = useState('');
  const [sendNotes, setSendNotes] = useState('');
  const [removeFor, setRemoveFor] = useState(null);
  const [proofFor, setProofFor] = useState(null);

  useEffect(() => {
    const a = getAdmin();
    if (!a) { navigate('/pcbXpress/login'); return; }
    setAdmin(a);
    fetchQuotes();
  }, [navigate, page, limit]);

  const wireHarnessQuotes = useMemo(() => quotes.filter(q => q.service === 'wire_harness'), [quotes]);

  const fetchQuotes = async () => {
    const t = getAdminToken();
    if (t) {
      try {
        const res = await api.listAllQuotesAdmin(t, { limit, page, service: 'wire_harness' });
        setQuotes(res.quotes || []);
        setTotal(res.total || 0);
        setPages(res.pages || 1);
        return;
      } catch {}
    }
    setQuotes(getQuotes());
    setTotal(0);
    setPages(1);
  };

  const refresh = async () => {
    await fetchQuotes();
  };

  const handleRemove = async (id) => {
    const t = getAdminToken();
    if (t && id) { try { await api.deleteQuote(id, t); } catch {} }
    removeQuote(id);
    refresh();
    toast({ title: 'Quote removed successfully' });
    setRemoveFor(null);
  };

  const handleSignOut = () => {
    clearAdmin();
    clearAdminToken();
    toast({ title: 'Signed out of admin' });
    navigate('/');
  };

  const handlePaymentStatusChange = async (quoteId, newStatus) => {
    try {
      const token = getAdminToken();
      await api.adminUpdatePaymentProofStatus(token, quoteId, newStatus);
      toast({ title: `Payment status updated to ${newStatus}` });
      refresh();
    } catch (err) {
      toast({ title: 'Status update failed', description: err.message });
    }
  };

  const handleMfgApprove = async (quote) => {
    try {
      const token = getAdminToken();
      await api.adminMfgApproveQuote(token, quote._id || quote.id);
      toast({ title: 'Quote approved for manufacturing' });
      refresh();
    } catch (err) {
      toast({ title: 'Approval failed', description: err.message });
    }
  };

  const doSend = async () => {
    try {
      const t = getAdminToken();
      const id = sendFor?._id || sendFor?.id;
      const total = Number(sendValue);
      if (!id || !isFinite(total)) return;
      await api.adminSendQuote(id, t, { total, currency: 'INR', notes: sendNotes });
      setSendFor(null); setSendValue(''); setSendNotes('');
      // refresh quotes
      await refresh();
      toast({ title: 'Quote sent to user' });
    } catch (err) {
      toast({ title: 'Send failed', description: err.message || 'Could not send quote' });
    }
  };

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Admin Wire Harness Quotes | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="grid gap-8">
        <Section
          title={`Wire Harness Quotes (${wireHarnessQuotes.length})`}
          quotes={wireHarnessQuotes}
          onView={setViewQuote}
          onRemove={setRemoveFor}
          onSend={(q) => { setSendFor(q); setSendValue(String(q.adminQuote?.total ?? '')); setSendNotes(q.adminQuote?.notes || ''); }}
          onViewProof={(q) => setProofFor(q)}
          onPaymentStatusChange={handlePaymentStatusChange}
          onMfgApprove={handleMfgApprove}
        />

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
      </div>

      {viewQuote && (
        <QuoteModal quote={viewQuote} onClose={() => setViewQuote(null)} />
      )}

      {proofFor && (
        <PaymentProofModal
          quote={proofFor}
          onClose={() => setProofFor(null)}
          onStatusUpdate={refresh}
        />
      )}

      {sendFor && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-start justify-center p-4" onClick={() => setSendFor(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold">Quotation (India)</h3>
              <Button variant="ghost" size="sm" onClick={() => setSendFor(null)}>Close</Button>
            </div>
            <div className="p-6 space-y-6 text-sm">
              {/* Header */}
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="font-bold text-lg">PCB Xpress</p>
                  <p className="text-xs text-muted-foreground">Bangalore, India</p>
                  <p className="text-xs text-muted-foreground">contact@pcbxpress.in</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Quote ID: {sendFor.quoteId || sendFor._id || sendFor.id}</p>
                  <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {/* Client */}
              <div>
                <p className="font-semibold">Client:</p>
                <p>{sendFor.contact?.name || '-'}</p>
                <p className="text-muted-foreground">{sendFor.contact?.email || '-'}</p>
                <p className="text-muted-foreground">{sendFor.contact?.company || ''}</p>
              </div>

              {/* Specs */}
              {sendFor.service === 'wire_harness' && sendFor.specsHarness && (
                <div>
                  <p className="font-semibold mb-2">Specifications:</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Board size: {sendFor.specsHarness.boardWidthMm} x {sendFor.specsHarness.boardHeightMm} mm</li>
                    <li>Wire count: {sendFor.specsHarness.wireCount}</li>
                    <li>Connector count: {sendFor.specsHarness.connectorCount}</li>
                    <li>Wire gauge: {sendFor.specsHarness.wireGauge}</li>
                    <li>Connector type: {sendFor.specsHarness.connectorType}</li>
                    <li>Harness type: {sendFor.specsHarness.harnessType}</li>
                    <li>Quantity: {sendFor.specsHarness.quantity}</li>
                  </ul>
                </div>
              )}

              {/* Total */}
              <div>
                <label className="text-sm font-medium">Total (INR)</label>
                <input
                  className="h-10 w-full border rounded-md px-3 text-sm mt-1"
                  type="number" min="0" step="0.01"
                  value={sendValue}
                  onChange={(e) => setSendValue(e.target.value)}
                />
                <p className="mt-1 text-green-700 font-semibold">
                  {sendValue ? formatInr(Number(sendValue)) : ''}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <textarea
                  className="w-full min-h-[80px] border rounded-md px-3 py-2 text-sm mt-1"
                  value={sendNotes}
                  onChange={(e) => setSendNotes(e.target.value)}
                />
              </div>

              {/* Footer */}
              <div className="border-t pt-4 text-xs text-muted-foreground">
                <p>All prices are in INR and include applicable taxes.</p>
                <p>Thank you for choosing PCB Xpress for your Wire Harness needs.</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button onClick={doSend} disabled={!sendValue}>Send Quote</Button>
                <Button variant="outline" onClick={() => setSendFor(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {removeFor && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-start justify-center p-4" onClick={() => setRemoveFor(null)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Confirm Removal</h3>
              <Button variant="ghost" size="sm" onClick={() => setRemoveFor(null)}>Close</Button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p>Are you sure you want to remove this quote? This action cannot be undone.</p>
              <div className="flex gap-2 pt-1">
                <Button variant="destructive" onClick={() => handleRemove(removeFor._id || removeFor.id)}>Remove</Button>
                <Button variant="outline" onClick={() => setRemoveFor(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const Section = ({ title, quotes, onView, onRemove, onSend, onViewProof, onPaymentStatusChange, onMfgApprove }) => (
  <Card>
    <CardHeader className="flex-row items-center justify-between">
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No quotes to display.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Specs</th>
                <th className="py-2 pr-4">Delivery</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Payment Status</th>
                <th className="py-2 pr-4">Payment Method</th>
                <th className="py-2 pr-4">Payment Proof</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q._id || q.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 whitespace-nowrap">{new Date(q.createdAt || q.updatedAt || Date.now()).toLocaleString()}</td>
                  <td className="py-3 pr-4">{q.contact?.name || '(no name)'}<br /><span className="text-xs text-muted-foreground">{q.contact?.email || '-'}</span></td>
                  <td className="py-3 pr-4">
                    {q.service === 'wire_harness' && q.specsHarness ? (
                      <>
                        {q.specsHarness.wireCount} wires · {q.specsHarness.connectorCount} connectors · {q.specsHarness.boardWidthMm} x {q.specsHarness.boardHeightMm}mm · Qty {q.specsHarness.quantity}
                      </>
                    ) : (
                      <span class="text-muted-foreground">(no specs)</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{q.delivery?.speed === 'express' ? 'Express' : 'Standard'}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{q.status === 'sent' ? 'Sent' : 'Requested'}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <Select
                      value={q.paymentProof?.status || 'not_submitted'}
                      onValueChange={(value) => onPaymentStatusChange(q._id || q.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_submitted">Not Submitted</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <PaymentMethodBadge method={q.paymentProof?.proofFile ? 'bank_transfer' : (q.status === 'sent' ? 'cash' : 'pending')} />
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <PaymentProofStatus status={q.paymentProof?.status || 'not_submitted'} />
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{formatInr((q.adminQuote?.total != null ? q.adminQuote.total : q.quote?.total) || 0)}</td>
                  <td className="py-3 pr-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => onView(q)}>View</Button>
                      <Button variant="outline" size="sm" onClick={() => onSend(q)}>{q.status === 'sent' ? 'Edit Sent' : 'Send Quote'}</Button>
                      {q.paymentProof?.status === 'submitted' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewProof && onViewProof(q)}
                        >
                          View Proof
                        </Button>
                      )}
                      {(q.paymentMethod === 'cash' && q.paymentProof?.status === 'approved') && (
                        <Button variant="outline" size="sm" onClick={() => onMfgApprove(q)}>Approve</Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => onRemove(q)}>Remove</Button>
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
);

const QuoteModal = ({ quote, onClose }) => (
  <div className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center p-4" onClick={onClose}>
    <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quote Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
      <div className="p-6 grid sm:grid-cols-2 gap-4 text-sm">
        <Detail label="Service" value={quote.service} />
        <Detail label="Date" value={new Date(quote.createdAt || quote.updatedAt || Date.now()).toLocaleString()} />
        <Detail label="Contact Name" value={quote.contact?.name || '-'} />
        <Detail label="Email" value={quote.contact?.email || '-'} />
        <Detail label="Phone" value={quote.contact?.phone || '-'} />
        <Detail label="Company" value={quote.contact?.company || '-'} />
        <Detail label="Address" value={quote.contact?.address || '-'} />
        <Detail label="Delivery" value={quote.delivery?.speed || '-'} />
        <Detail label="Status" value={quote.status || 'requested'} />
        <Detail label="Total" value={formatInr((quote.adminQuote?.total != null ? quote.adminQuote.total : quote.quote?.total) || 0)} />
        {quote.service === 'wire_harness' && quote.specsHarness && (
          <>
            <Detail label="Board Size" value={`${quote.specsHarness.boardWidthMm} x ${quote.specsHarness.boardHeightMm} mm`} />
            <Detail label="Wire Count" value={String(quote.specsHarness.wireCount)} />
            <Detail label="Connector Count" value={String(quote.specsHarness.connectorCount)} />
            <Detail label="Wire Gauge" value={quote.specsHarness.wireGauge || '-'} />
            <Detail label="Connector Type" value={quote.specsHarness.connectorType || '-'} />
            <Detail label="Harness Type" value={quote.specsHarness.harnessType || '-'} />
            <Detail label="Quantity" value={String(quote.specsHarness.quantity)} />
          </>
        )}

        {/* Payment Proof Information */}
        {quote.paymentProof && (
          <>
            <Detail label="Payment Status" value={<PaymentProofStatus status={quote.paymentProof.status} />} />
            {quote.paymentProof.submittedAt && (
              <Detail label="Submitted" value={new Date(quote.paymentProof.submittedAt).toLocaleString()} />
            )}
            {quote.paymentProof.approvedAt && (
              <Detail label="Approved" value={new Date(quote.paymentProof.approvedAt).toLocaleString()} />
            )}
            {quote.paymentProof.rejectedAt && (
              <Detail label="Rejected" value={new Date(quote.paymentProof.rejectedAt).toLocaleString()} />
            )}
            {quote.paymentProof.rejectionReason && (
              <Detail label="Rejection Reason" value={quote.paymentProof.rejectionReason} />
            )}
            {quote.paymentProof.reviewNotes && (
              <Detail label="Review Notes" value={quote.paymentProof.reviewNotes} />
            )}
          </>
        )}
      </div>
      <div className="px-6 pb-6">
        {/* Combined Attachments and Payment Proof */}
        {((Array.isArray(quote.attachments) && quote.attachments.length > 0) || quote.paymentProof?.proofFile) && (
          <div className="rounded-lg border p-4 mt-4">
            <p className="font-semibold mb-2">Attachments & Payment Proof</p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              {/* Regular attachments */}
              {Array.isArray(quote.attachments) && quote.attachments.map((a, idx) => (
                <li key={idx}>
                  <span className="uppercase text-xs mr-2 px-2 py-0.5 rounded bg-accent">{a.kind}</span>
                  <a
                    className="text-primary underline"
                    href={(() => {
                      const base = getApiBaseUrl();
                      if (a?.filename) {
                        return `${getApiBaseUrl()}/api/uploads/${encodeURIComponent(a.filename)}`;
                      }
                      const url = a?.url || '';
                      try {
                        if (url.startsWith('http')) {
                          const u = new URL(url);
                          let p = u.pathname || '';
                          if (p.startsWith('/uploads/')) p = `/api${p}`;
                          return `${base}${p}`;
                        }
                        let rel = url;
                        if (rel.startsWith('/uploads/')) rel = `/api${rel}`;
                        return `${base}${rel.startsWith('/') ? '' : '/'}${rel}`;
                      } catch {
                        return url;
                      }
                    })()}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {a.originalName || a.filename}
                  </a>
                  {typeof a.size === 'number' && (
                    <span className="text-muted-foreground ml-2">({Math.ceil(a.size / 1024)} KB)</span>
                  )}
                </li>
              ))}

              {/* Payment proof file */}
              {quote.paymentProof?.proofFile && (
                <li className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="uppercase text-xs mr-2 px-2 py-0.5 rounded bg-green-100 text-green-800">PAYMENT PROOF</span>
                    <span className="text-primary">
                      {quote.paymentProof.proofFile.originalName || quote.paymentProof.proofFile.filename}
                    </span>
                    {typeof quote.paymentProof.proofFile.size === 'number' && (
                      <span className="text-muted-foreground ml-2">({Math.ceil(quote.paymentProof.proofFile.size / 1024)} KB)</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const pf = quote.paymentProof.proofFile || {};
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
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  </div>
);

const Detail = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium break-words">{value}</p>
  </div>
);

const PaymentProofStatus = ({ status }) => {
  const statusConfig = {
    not_submitted: { label: 'Not Submitted', color: 'bg-red-100 text-red-800' },
    submitted: { label: 'Submitted', color: 'bg-green-100 text-green-800' },
    approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800' },
    rejected: { label: 'Rejected', color: 'bg-orange-100 text-orange-800' },
  };

  const config = statusConfig[status] || statusConfig.not_submitted;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const PaymentMethodBadge = ({ method }) => {
  const methodConfig = {
    bank_transfer: { label: 'Bank Transfer', color: 'bg-blue-100 text-blue-800' },
    upi: { label: 'UPI', color: 'bg-green-100 text-green-800' },
    card: { label: 'Card', color: 'bg-purple-100 text-purple-800' },
    cash: { label: 'Cash', color: 'bg-yellow-100 text-yellow-800' },
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    other: { label: 'Other', color: 'bg-gray-100 text-gray-800' },
  };

  const config = methodConfig[method] || methodConfig.bank_transfer;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

export default AdminWireHarnessQuotesPage;
