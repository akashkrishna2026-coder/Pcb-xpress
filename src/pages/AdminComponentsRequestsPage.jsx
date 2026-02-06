import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api, getApiBaseUrl } from '@/lib/api';
import { getAdmin, getAdminToken, clearAdmin, clearAdminToken, getQuotes, removeQuote } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { formatInr } from '@/lib/currency';

const AdminComponentsRequestsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [viewQuote, setViewQuote] = useState(null);
  const [sendFor, setSendFor] = useState(null);
  const [sendValue, setSendValue] = useState('');
  const [sendNotes, setSendNotes] = useState('');
  const [removeFor, setRemoveFor] = useState(null);
  const [components, setComponents] = useState([]);
  const [componentsLoading, setComponentsLoading] = useState(true);
  const [componentsError, setComponentsError] = useState(null);
  const [importingComponents, setImportingComponents] = useState(false);

  // Utility function to normalize image URLs by removing double slashes
  const normalizeImageUrl = (url) => {
    if (!url) return '';
    return url.replace(/\/+/g, '/').replace(':/', '://');
  };

  useEffect(() => {
    const a = getAdmin();
    if (!a) { navigate('/pcbXpress/login'); return; }
    setAdmin(a);
    const t = getAdminToken();
    if (t) {
      api.listAllQuotesAdmin(t, { limit: 500 })
        .then(res => setQuotes(res.quotes || []))
        .catch(() => setQuotes(getQuotes()));
    } else {
      setQuotes(getQuotes());
    }

    // Fetch components from external API
    fetch('https://api.vfleet360.com/api/get-components')
      .then(res => res.json())
      .then(data => {
        console.log('API Response:', data); // Log the data structure
        const components = data?.data || [];
        setComponents(Array.isArray(components) ? components : []);
        setComponentsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch components:', err);
        setComponentsError('Failed to load components');
        setComponentsLoading(false);
      });
  }, [navigate]);

  const componentsQuotes = useMemo(() => quotes.filter(q => q.service === 'components'), [quotes]);

  const refresh = async () => {
    const t = getAdminToken();
    if (t) {
      try { const res = await api.listAllQuotesAdmin(t, { limit: 500 }); setQuotes(res.quotes || []); return; } catch {}
    }
    setQuotes(getQuotes());
  };

  const handleRemove = async (id) => {
    const t = getAdminToken();
    if (t && id) { try { await api.deleteQuote(id, t); } catch {} }
    removeQuote(id);
    refresh();
    toast({ title: 'Request removed successfully' });
    setRemoveFor(null);
  };

  const handleSignOut = () => {
    clearAdmin();
    clearAdminToken();
    toast({ title: 'Signed out of admin' });
    navigate('/');
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
      const res = await api.listAllQuotesAdmin(t, { limit: 500 });
      setQuotes(res.quotes || []);
      toast({ title: 'Quote sent to user' });
    } catch (err) {
      toast({ title: 'Send failed', description: err.message || 'Could not send quote' });
    }
  };

  const importComponentsAsProducts = async () => {
    if (components.length === 0) {
      toast({ title: 'No components to import' });
      return;
    }
    if (!window.confirm(`Import ${components.length} components as products?`)) return;
    setImportingComponents(true);
    try {
      let imported = 0;
      for (const comp of components) {
        try {
          const product = {
            part: comp.name || `COMP-${comp.id}`,
            mfr: comp.products?.name || 'Unknown',
            desc: comp.description || '',
            pkg: comp.units || '',
            price: Number(comp.price) || 0,
            stock: Number(comp.stocks) || 0,
            img: normalizeImageUrl(comp.image_url) || '',
            datasheet: '',
            tags: comp.products?.name ? [comp.products.name] : [],
          };
          await api.createProduct(product);
          imported++;
        } catch (e) {
          console.error('Failed to import component:', comp, e);
        }
      }
      toast({ title: 'Components imported', description: `${imported} products added` });
    } catch (err) {
      toast({ title: 'Import failed', description: err.message });
    } finally {
      setImportingComponents(false);
    }
  };

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Admin Components Requests | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="grid gap-8">
        <Section
          title={`Components Requests (${componentsQuotes.length})`}
          quotes={componentsQuotes}
          onView={setViewQuote}
          onRemove={setRemoveFor}
          onSend={(q) => { setSendFor(q); setSendValue(String(q.adminQuote?.total ?? '')); setSendNotes(q.adminQuote?.notes || ''); }}
        />

        <ComponentsSection
          components={components}
          loading={componentsLoading}
          error={componentsError}
          onImport={importComponentsAsProducts}
          importing={importingComponents}
        />
      </div>

      {viewQuote && (
        <QuoteModal quote={viewQuote} onClose={() => setViewQuote(null)} />
      )}

      {sendFor && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-start justify-center p-4" onClick={() => setSendFor(null)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Send Quote</h3>
              <Button variant="ghost" size="sm" onClick={() => setSendFor(null)}>Close</Button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div>
                <label className="text-sm font-medium">Total (INR)</label>
                <input className="h-10 w-full border rounded-md px-3 text-sm" type="number" min="0" step="0.01" value={sendValue} onChange={(e) => setSendValue(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <textarea className="w-full min-h-[80px] border rounded-md px-3 py-2 text-sm" value={sendNotes} onChange={(e) => setSendNotes(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={doSend} disabled={!sendValue}>Send</Button>
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
              <p>Are you sure you want to remove this request? This action cannot be undone.</p>
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

const Section = ({ title, quotes, onView, onRemove, onSend }) => (
  <Card>
    <CardHeader className="flex-row items-center justify-between">
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requests to display.</p>
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
                    {q.components ? (
                      <>
                        Unique parts: {q.components.uniqueParts || 0} · BOM rows: {q.components.totalLines || 0}
                      </>
                    ) : (
                      <span className="text-muted-foreground">(no specs)</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{q.delivery?.speed === 'express' ? 'Express' : 'Standard'}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{q.status === 'sent' ? 'Sent' : 'Requested'}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <PaymentProofStatus status={q.paymentProof?.status || 'not_submitted'} />
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{formatInr((q.adminQuote?.total != null ? q.adminQuote.total : q.quote?.total) || 0)}</td>
                  <td className="py-3 pr-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => onView(q)}>View</Button>
                      <Button variant="outline" size="sm" onClick={() => onSend(q)}>{q.status === 'sent' ? 'Edit Sent' : 'Send Quote'}</Button>
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
        <h3 className="text-lg font-semibold">Request Details</h3>
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
        {quote.service === 'components' && quote.components && (
          <>
            <Detail label="Unique parts" value={String(quote.components.uniqueParts || 0)} />
            <Detail label="BOM rows" value={String(quote.components.totalLines || 0)} />
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
                  <a className="text-primary underline" href={(() => {
                    const base = getApiBaseUrl();
                    const url = a?.url || '';
                    try {
                      if (a?.filename) {
                        return `${base}/api/uploads/${encodeURIComponent(a.filename)}`;
                      }
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
                  })()} target="_blank" rel="noreferrer">
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
                        openUrl = `${base}/api/uploads/${encodeURIComponent(pf.filename)}`;
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

const ComponentImage = ({ src, alt, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  if (!src) {
    return (
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors" onClick={onClick}>
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative w-12 h-12 cursor-pointer" onClick={onClick}>
      {imageLoading && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      )}
      {imageError ? (
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-12 h-12 object-cover rounded-lg hover:opacity-80 transition-opacity ${imageLoading ? 'hidden' : 'block'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
    </div>
  );
};

const ComponentsSection = ({ components, loading, error, onImport, importing }) => {
  const [imageModal, setImageModal] = useState(null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Available Components ({components.length})</CardTitle>
        {components.length > 0 && (
          <Button onClick={onImport} disabled={importing}>
            {importing ? 'Importing...' : 'Import as Products'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading components...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : components.length === 0 ? (
          <p className="text-sm text-muted-foreground">No components available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Image</th>
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">GST %</th>
                  <th className="py-2 pr-3">Tax Type</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">GST Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Stock</th>
                  <th className="py-2 pr-3">Units</th>
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Store</th>
                  <th className="py-2 pr-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {components.map((component) => (
                  <tr key={component.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <ComponentImage
                        src={normalizeImageUrl(component.image_url)}
                        alt={component.name}
                        onClick={() => setImageModal(component)}
                      />
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{component.id}</td>
                    <td className="py-2 pr-3 whitespace-nowrap max-w-[150px] truncate" title={component.name}>{component.name}</td>
                    <td className="py-2 pr-3 whitespace-nowrap max-w-[200px] truncate" title={component.description}>{component.description}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatInr(component.price)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{component.gst_percent}%</td>
                    <td className="py-2 pr-3 whitespace-nowrap capitalize">{component.tax_type}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatInr(component.total)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatInr(component.gst)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        component.status === 1 ? 'bg-green-100 text-green-800' :
                        component.status === 0 ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {component.status === 1 ? 'Active' : component.status === 0 ? 'Inactive' : 'Unknown'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{component.stocks || '-'}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{component.units || '-'}</td>
                    <td className="py-2 pr-3 whitespace-nowrap max-w-[120px] truncate" title={component.products?.name}>{component.products?.name || '-'}</td>
                    <td className="py-2 pr-3 whitespace-nowrap max-w-[150px] truncate" title={component.stores?.name}>{component.stores?.name || '-'}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(component.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>
      )}

      {/* Image Modal */}
      {imageModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setImageModal(null)}>
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{imageModal.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setImageModal(null)}>Close</Button>
            </div>
            <div className="p-6 flex justify-center">
              <img
                src={normalizeImageUrl(imageModal.image_url)}
                alt={imageModal.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjE2QzE0IDE3LjEgMTMuMSAxOCA5IDE4QzQuOSAxOCA0IDE3LjEgNCAxNlY0QzQgMi45IDQuOSAyIDYgMkgxOEMxOS4xIDIgMjAgMi45IDIwIDRWMTZDMTggMTcuMSAxNy4xIDE4IDE0IDE4QzE2LjggMTggMTggMTYuOCAxOCA5QzE4IDYuMiAxNi44IDQgMTQgNFoiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTEyIDIyQzEzLjEwNDYgMjIgMjIgMjAuOTA0NiAyMiAxOUMyMiAxNy44OTU0IDIxLjEwNDYgMTcgMjAgMTdDMTguODk1NCAxNyAxOCA5QzE4IDYuMjAyIDE2LjgwMiA0IDE0IDRDMTYuODAyIDQgMTggNi4yMDIgMTggOUMxOCAxNy44OTU0IDE5LjEwNDYgMTkgMjAgMTlaIiBmaWxsPSIjOUNBNEFGIi8+Cjwvc3ZnPgo=';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
  );
};

export default AdminComponentsRequestsPage;
