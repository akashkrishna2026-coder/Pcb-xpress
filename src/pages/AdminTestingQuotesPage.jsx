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
import { estimateQuote } from '@/lib/quote';
import PaymentProofModal from '@/components/admin/PaymentProofModal';

const AdminTestingQuotesPage = () => {
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
  const [editFor, setEditFor] = useState(null);
  const [proofFor, setProofFor] = useState(null);

  useEffect(() => {
    const a = getAdmin();
    if (!a) { navigate('/pcbXpress/login'); return; }
    setAdmin(a);
    fetchQuotes();
  }, [navigate, page, limit]);

  const testingQuotes = useMemo(() => quotes.filter(q => q.service === 'testing'), [quotes]);

  const fetchQuotes = async () => {
    const t = getAdminToken();
    if (t) {
      try {
        const res = await api.listAllQuotesAdmin(t, { limit, page, service: 'testing' });
        setQuotes(res.quotes || []);
        setTotal(res.total || 0);
        setPages(res.pages || 1);
        return;
      } catch (err) {
        console.error('Failed to fetch admin quotes:', err);
      }
    }
    // For admin, don't fall back to user quotes; show empty
    setQuotes([]);
    setTotal(0);
    setPages(1);
  };

  const refresh = async () => {
    await fetchQuotes();
  };

  const handleEdit = async (quote) => {
    setEditFor(quote);
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

  const autoCalculateRate = () => {
    if (!sendFor?.specsTesting) return;
    
    try {
      const estimate = estimateQuote({ 
        specs: sendFor.specsTesting, 
        delivery: sendFor.delivery 
      });
      
      setSendValue(String(Math.round(estimate.total)));
      toast({ 
        title: 'Rate calculated', 
        description: `Auto-calculated based on ${sendFor.specsTesting.testType} testing, Qty: ${sendFor.specsTesting.quantity}` 
      });
    } catch (error) {
      toast({ 
        title: 'Calculation failed', 
        description: 'Could not calculate rate. Please enter manually.' 
      });
    }
  };

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Admin Testing Quotes | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="grid gap-8">
        <Section
          title={`Testing Quotes (${testingQuotes.length})`}
          quotes={testingQuotes}
          onView={setViewQuote}
          onEdit={setEditFor}
          onSend={(q) => { setSendFor(q); setSendValue(String(q.adminQuote?.total ?? '')); setSendNotes(q.adminQuote?.notes || ''); }}
          onViewProof={(q) => setProofFor(q)}
          onPaymentStatusChange={handlePaymentStatusChange}
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
              {sendFor.service === 'testing' && sendFor.specsTesting && (
                <div>
                  <p className="font-semibold mb-2">Specifications:</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Test Type: {(sendFor.specsTesting.testType || '').toUpperCase()}</li>
                    <li>Quantity: {sendFor.specsTesting.quantity}</li>
                    <li>Requirements: {sendFor.specsTesting.requirements || 'N/A'}</li>
                  </ul>
                </div>
              )}

              {/* Total */}
              <div>
                <label className="text-sm font-medium">Amount (₹)</label>
                <div className="flex gap-2">
                  <input
                    className="h-10 w-full border rounded-md px-3 text-sm mt-1"
                    type="number" min="0" step="0.01"
                    value={sendValue}
                    onChange={(e) => setSendValue(e.target.value)}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={autoCalculateRate}
                    disabled={!sendFor?.specsTesting}
                  >
                    Auto
                  </Button>
                </div>
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
                <p>Thank you for choosing PCB Xpress for your Testing needs.</p>
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

      {editFor && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-start justify-center p-4" onClick={() => setEditFor(null)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Quote</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditFor(null)}>Close</Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h4 className="font-medium">Customer Information</h4>
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <input
                      type="text"
                      value={editFor.contact?.name || ''}
                      onChange={(e) => setEditFor(prev => ({
                        ...prev,
                        contact: { ...prev.contact, name: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <input
                      type="email"
                      value={editFor.contact?.email || ''}
                      onChange={(e) => setEditFor(prev => ({
                        ...prev,
                        contact: { ...prev.contact, email: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <input
                      type="tel"
                      value={editFor.contact?.phone || ''}
                      onChange={(e) => setEditFor(prev => ({
                        ...prev,
                        contact: { ...prev.contact, phone: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <input
                      type="text"
                      value={editFor.contact?.company || ''}
                      onChange={(e) => setEditFor(prev => ({
                        ...prev,
                        contact: { ...prev.contact, company: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                {/* Testing Specifications */}
                <div className="space-y-4">
                  <h4 className="font-medium">Testing Specifications</h4>
                  <div>
                    <label className="text-sm font-medium">Test Type</label>
                    <select
                      value={editFor.specs?.testType || ''}
                      onChange={(e) => setEditFor(prev => ({
                        ...prev,
                        specs: { ...prev.specs, testType: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="functional">Functional Test</option>
                      <option value="ict">In-Circuit Test</option>
                      <option value="flying_probe">Flying Probe</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity</label>
                    <input
                      type="number"
                      value={editFor.specs?.quantity || ''}
                      onChange={(e) => setEditFor(prev => ({
                        ...prev,
                        specs: { ...prev.specs, quantity: Number(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Test Points</label>
                    <input
                      type="number"
                      value={editFor.specs?.testPoints || ''}
                      onChange={(e) => setEditFor(prev => ({
                        ...prev,
                        specs: { ...prev.specs, testPoints: Number(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Options */}
              <div className="space-y-4">
                <h4 className="font-medium">Delivery Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Delivery Speed</label>
                    <select
                      value={editFor.delivery?.speed || ''}
                      onChange={(e) => setEditFor(prev => ({
                        ...prev,
                        delivery: { ...prev.delivery, speed: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="standard">Standard</option>
                      <option value="express">Express</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={editFor.status || ''}
                      onChange={(e) => setEditFor(prev => ({
                        ...prev,
                        status: e.target.value
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="requested">Requested</option>
                      <option value="sent">Sent</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  value={editFor.contact?.notes || ''}
                  onChange={(e) => setEditFor(prev => ({
                    ...prev,
                    contact: { ...prev.contact, notes: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={async () => {
                    try {
                      const t = getAdminToken();
                      if (t && editFor) {
                        await api.updateQuote(editFor._id || editFor.id, t, {
                          specs: editFor.specs,
                          delivery: editFor.delivery,
                          contact: editFor.contact,
                          status: editFor.status
                        });
                        toast({ title: 'Quote updated successfully' });
                        setEditFor(null);
                        refresh();
                      }
                    } catch (error) {
                      toast({ 
                        title: 'Error updating quote', 
                        description: error.message || 'Please try again',
                        variant: 'destructive'
                      });
                    }
                  }}
                >
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditFor(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const Section = ({ title, quotes, onView, onEdit, onSend, onViewProof, onPaymentStatusChange }) => (
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
                    {q.service === 'testing' && q.specsTesting ? (
                      <>
                        {(q.specsTesting.testType || '').toUpperCase()} · Qty {q.specsTesting.quantity}
                      </>
                    ) : (
                      <span className="text-muted-foreground">(no specs)</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{q.delivery?.speed === 'express' ? 'Express' : 'Standard'}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{q.status === 'sent' ? 'Sent' : 'Requested'}<EditedBadge edited={q.edited} /></td>
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
                      <Button variant="outline" size="sm" onClick={() => onEdit(q)}>Edit Quote</Button>
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
        {quote.service === 'testing' && quote.specsTesting && (
          <>
            <Detail label="Test Type" value={(quote.specsTesting.testType || '').toUpperCase()} />
            <Detail label="Quantity" value={String(quote.specsTesting.quantity)} />
            <Detail label="Requirements" value={quote.specsTesting.requirements || '-'} />
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

const EditedBadge = ({ edited }) => {
  if (!edited) return null;
  return <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Edited</span>;
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

export default AdminTestingQuotesPage;
