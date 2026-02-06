import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api, getApiBaseUrl } from '@/lib/api';
import { getAdmin, getAdminToken, clearAdmin, clearAdminToken, getQuotes } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { formatInr } from '@/lib/currency';

const AdminMfgApprovalPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [viewQuote, setViewQuote] = useState(null);
  const [approveFor, setApproveFor] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [service, setService] = useState('pcb');

  const serviceOptions = [
    { id: 'pcb', label: 'PCB Quotes' },
    { id: 'pcb_assembly', label: 'Assembly Quotes' },
    { id: '3dprinting', label: '3D Printing Quotes' },
    { id: 'testing', label: 'Testing Quotes' },
    { id: 'wire_harness', label: 'Wire Harness Quotes' },
  ];

  const currentServiceLabel =
    serviceOptions.find((option) => option.id === service)?.label || 'Quotes';

  useEffect(() => {
    setPage(1);
    setViewQuote(null);
    setApproveFor(null);
    setRejectFor(null);
  }, [service]);

  useEffect(() => {
    const a = getAdmin();
    if (!a) { navigate('/pcbXpress/login'); return; }
    setAdmin(a);
  }, [navigate]);

  useEffect(() => {
    // Fetch quotes with approved payment proof
    const fetchPage = async () => {
      setLoading(true);
      const t = getAdminToken();
      if (t) {
        try {
          const res = await api.listAllQuotesAdmin(t, { limit, page, service });
          // Filter for approved payment proof
          const filtered = (res.quotes || []).filter(
            (q) => q.paymentProof?.status === 'approved' && q.service === service
          );
          setQuotes(filtered);
          setTotal(filtered.length);
          setPages(Math.max(1, Math.ceil(filtered.length / limit)));
        } catch (_) {
          const all = getQuotes().filter(q => q.service === service && q.paymentProof?.status === 'approved');
          setTotal(all.length);
          setPages(Math.max(1, Math.ceil(all.length / limit)));
          const start = (page - 1) * limit;
          setQuotes(all.slice(start, start + limit));
        } finally {
          setLoading(false);
        }
      } else {
        const all = getQuotes().filter(q => q.service === service && q.paymentProof?.status === 'approved');
        setTotal(all.length);
        setPages(Math.max(1, Math.ceil(all.length / limit)));
        const start = (page - 1) * limit;
        setQuotes(all.slice(start, start + limit));
        setLoading(false);
      }
    };
    fetchPage();
  }, [page, limit, service]);

  const refresh = async () => {
    const t = getAdminToken();
    if (t) {
      try {
        const res = await api.listAllQuotesAdmin(t, { limit, page, service });
        const filtered = (res.quotes || []).filter(
          (q) => q.paymentProof?.status === 'approved' && q.service === service
        );
        setQuotes(filtered);
        setTotal(filtered.length);
        setPages(Math.max(1, Math.ceil(filtered.length / limit)));
        return;
      } catch {}
    }
    const all = getQuotes().filter(q => q.service === service && q.paymentProof?.status === 'approved');
    setTotal(all.length);
    setPages(Math.max(1, Math.ceil(all.length / limit)));
    const start = (page - 1) * limit;
    setQuotes(all.slice(start, start + limit));
  };

  const handleApprove = async (quote) => {
    try {
      const token = getAdminToken();
      await api.adminMfgApproveQuote(token, quote._id || quote.id);
      toast({ title: 'Quote approved for manufacturing' });
      refresh();
    } catch (err) {
      toast({ title: 'Approval failed', description: err.message });
    }
    setApproveFor(null);
  };

  const handleReject = async (quote) => {
    // Placeholder: Update quote status or add rejection reason
    toast({ title: 'Quote rejected for manufacturing' });
    setRejectFor(null);
  };

  const handleSignOut = () => {
    clearAdmin();
    clearAdminToken();
    toast({ title: 'Signed out of admin' });
    navigate('/');
  };

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Admin Mfg Approval | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="grid gap-8">
        <div className="mb-4 flex flex-wrap gap-2">
          {serviceOptions.map((option) => (
            <Button
              key={option.id}
              variant={option.id === service ? 'default' : 'outline'}
              size="sm"
              onClick={() => setService(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <Section
          title={`${currentServiceLabel} for Mfg Approval (${total})`}
          quotes={quotes}
          onView={setViewQuote}
          onApprove={setApproveFor}
          onReject={setRejectFor}
          pagination={{
            page,
            pages,
            total,
            limit,
            loading,
            onPrev: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => Math.min(pages, p + 1)),
            onLimitChange: (v) => { setPage(1); setLimit(v); },
          }}
        />
      </div>

      {viewQuote && (
        <QuoteModal quote={viewQuote} onClose={() => setViewQuote(null)} />
      )}

      {approveFor && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-start justify-center p-4" onClick={() => setApproveFor(null)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Approve for Manufacturing</h3>
              <Button variant="ghost" size="sm" onClick={() => setApproveFor(null)}>Close</Button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p>Are you sure you want to approve this quote for manufacturing? This will create a work order.</p>
              <div className="flex gap-2 pt-1">
                <Button onClick={() => handleApprove(approveFor)}>Approve</Button>
                <Button variant="outline" onClick={() => setApproveFor(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectFor && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-start justify-center p-4" onClick={() => setRejectFor(null)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Reject for Manufacturing</h3>
              <Button variant="ghost" size="sm" onClick={() => setRejectFor(null)}>Close</Button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p>Are you sure you want to reject this quote for manufacturing?</p>
              <div className="flex gap-2 pt-1">
                <Button variant="destructive" onClick={() => handleReject(rejectFor)}>Reject</Button>
                <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const Section = ({ title, quotes, onView, onApprove, onReject, pagination }) => {
  const serviceName = (service) => ({
    pcb: 'PCB',
    pcb_assembly: 'Assembly',
    '3dprinting': '3D Printing',
    testing: 'Testing',
    wire_harness: 'Wire Harness',
  }[service] || service);

  const renderSpecs = (quote) => {
    if (quote.service === 'pcb_assembly' && quote.specsAssembly) {
      const s = quote.specsAssembly;
      return [
        (s.assemblyType || '').toUpperCase(),
        `${s.componentCount} components`,
        `${s.boardWidthMm} x ${s.boardHeightMm} mm`,
        `Qty ${s.quantity}`,
      ].filter(Boolean).join(' - ');
    }
    if (quote.service === '3dprinting' && quote.specs3d) {
      const s = quote.specs3d;
      return [
        (s.tech || '').toUpperCase(),
        s.material,
        `${s.dims?.xMm}x${s.dims?.yMm}x${s.dims?.zMm} mm`,
        `Qty ${s.quantity}`,
      ].filter(Boolean).join(' - ');
    }
    if (quote.service === 'testing' && quote.specsTesting) {
      const s = quote.specsTesting;
      return [
        (s.testType || '').toUpperCase(),
        `Qty ${s.quantity}`,
      ].filter(Boolean).join(' - ');
    }
    if (quote.service === 'wire_harness' && quote.specsHarness) {
      const s = quote.specsHarness;
      return [
        (s.harnessType || '').toUpperCase(),
        s.connectorCount != null ? `${s.connectorCount} connectors` : null,
        `Qty ${s.quantity ?? '-'}`,
      ].filter(Boolean).join(' - ');
    }
    if (quote.specs) {
      const s = quote.specs;
      return [
        `${s.layers}L ${s.widthMm} x ${s.heightMm} mm`,
        s.material,
        s.finish,
        `Qty ${s.quantity}`,
      ].filter(Boolean).join(' - ');
    }
    return '(no specs)';
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quotes pending manufacturing approval.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Service</th>
                  <th className="py-2 pr-4">Specs</th>
                  <th className="py-2 pr-4">Files</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const isApproved = Boolean(q.mfgApproved);
                  return (
                    <tr key={q._id || q.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap">{new Date(q.createdAt || q.updatedAt || Date.now()).toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        {q.contact?.name || '(no name)'}
                        <br />
                        <span className="text-xs text-muted-foreground">{q.contact?.email || '-'}</span>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">{serviceName(q.service)}</td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-muted-foreground">{renderSpecs(q)}</span>
                      </td>
                      <td className="py-3 pr-4">
                        {Array.isArray(q.attachments) && q.attachments.length > 0 ? (
                          <div className="space-y-1 text-xs">
                            {q.attachments.map((a, idx) => (
                              <div key={idx}>
                                <span className="font-medium uppercase">{a.kind || 'file'}:</span> {a.originalName || a.filename}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">No files</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">{formatInr((q.adminQuote?.total != null ? q.adminQuote.total : q.quote?.total) || 0)}</td>
                      <td className="py-3 pr-2">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => onView(q)}>View</Button>
                          <Button
                            variant={isApproved ? 'secondary' : 'outline'}
                            size="sm"
                            disabled={isApproved}
                            onClick={() => {
                              if (!isApproved) onApprove(q);
                            }}
                          >
                            {isApproved ? 'Approved' : 'Approve'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReject(q)}
                            disabled={isApproved}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pagination && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <div className="text-xs text-muted-foreground">
                  {(() => {
                    const start = (pagination.page - 1) * pagination.limit + 1;
                    const end = Math.min(pagination.page * pagination.limit, pagination.total);
                    return `Showing ${pagination.total === 0 ? 0 : start}-${end} of ${pagination.total}`;
                  })()}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground">Rows per page</label>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={pagination.limit}
                    onChange={(e) => pagination.onLimitChange && pagination.onLimitChange(Number(e.target.value))}
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={pagination.onPrev}
                      disabled={pagination.loading || pagination.page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {pagination.page} of {Math.max(1, pagination.pages || 1)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={pagination.onNext}
                      disabled={pagination.loading || pagination.page >= (pagination.pages || 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};const Detail = ({ label, value }) => (
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
        {quote.service === 'pcb' && quote.specs && (
          <>
            <Detail label="Board size" value={`${quote.specs.widthMm}×${quote.specs.heightMm} mm`} />
            <Detail label="Layers" value={String(quote.specs.layers)} />
            <Detail label="Material" value={quote.specs.material} />
            <Detail label="Finish" value={quote.specs.finish} />
            <Detail label="Quantity" value={String(quote.specs.quantity)} />
            <Detail label="BOM lines" value={String(quote.bomStats?.totalLines || 0)} />
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

        {/* Manufacturing Files - Gerber and BOM */}
        {quote.paymentProof?.status === 'approved' && (() => {
          const gerberFiles = quote.attachments?.filter(a => a.kind === 'gerber') || [];
          const bomFiles = quote.attachments?.filter(a => a.kind === 'bom') || [];
          if (gerberFiles.length === 0 && bomFiles.length === 0) return null;
          return (
            <div className="rounded-lg border p-4 mt-4">
              <p className="font-semibold mb-2">Manufacturing Files</p>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {gerberFiles.map((a, idx) => (
                  <li key={`gerber-${idx}`}>
                    <span className="uppercase text-xs mr-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800">GERBER</span>
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
                {bomFiles.map((a, idx) => (
                  <li key={`bom-${idx}`}>
                    <span className="uppercase text-xs mr-2 px-2 py-0.5 rounded bg-green-100 text-green-800">BOM</span>
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
              </ul>
            </div>
          );
        })()}
      </div>
    </div>
  </div>
);

export default AdminMfgApprovalPage;







