import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { api, getApiBaseUrl } from '@/lib/api';
import { getSalesUser, getSalesToken, clearSalesUser, clearSalesToken, getAdminToken } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import SalesLayout from '@/components/sales/SalesLayout';
import { estimateQuote } from '@/lib/quote';
import { formatInr } from '@/lib/currency';
import { FileText } from 'lucide-react';
import PaymentProofModal from '@/components/sales/SalesPaymentProofModal';

const SalesQuotesPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [salesUser, setSalesUser] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [viewQuote, setViewQuote] = useState(null);
  const [sendFor, setSendFor] = useState(null);
  const [sendValue, setSendValue] = useState('');
  const [sendNotes, setSendNotes] = useState('');
  const [sendBreakdown, setSendBreakdown] = useState(null);
  const [sendSuggestedTotal, setSendSuggestedTotal] = useState(null);
  const [piFor, setPiFor] = useState(null);
  const [piData, setPiData] = useState({
    items: [],
    notes: '',
    terms: '100% advance payment required. Delivery timeline: 7–10 business days.',
    taxRate: 18, // Default to 18% GST
    discountPercentage: 0
  });
  const [editFor, setEditFor] = useState(null);
  const [proofFor, setProofFor] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getSalesUser();
    if (!user) { navigate('/sales/login'); return; }
    setSalesUser(user);
  }, [navigate]);

  useEffect(() => {
    // Fetch quotes whenever page/limit changes
    const fetchPage = async () => {
      setLoading(true);
      const token = getSalesToken();
      if (token) {
        try {
          const res = await api.getSalesQuotes(token, { limit, page });
          setQuotes(res.quotes || []);
          setTotal(res.total || 0);
          setPages(res.pages || 1);
        } catch (_) {
          const all = getQuotes();
          setTotal(all.length);
          setPages(Math.max(1, Math.ceil(all.length / limit)));
          const start = (page - 1) * limit;
          setQuotes(all.slice(start, start + limit));
        } finally {
          setLoading(false);
        }
      } else {
        const all = getQuotes();
        setTotal(all.length);
        setPages(Math.max(1, Math.ceil(all.length / limit)));
        const start = (page - 1) * limit;
        setQuotes(all.slice(start, start + limit));
        setLoading(false);
      }
    };
    fetchPage();
  }, [page, limit]);

  // Auto-refresh for payment proof updates
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = getSalesToken();
      if (token) {
        try {
          const res = await api.getSalesQuotes(token, { limit, page });
          setQuotes(res.quotes || []);
          setTotal(res.total || 0);
          setPages(res.pages || 1);
        } catch (_) {}
      }
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [page, limit]);

  useEffect(() => {
    console.log('piData state updated:', piData);
  }, [piData]);

  const refresh = async () => {
    const t = getAdminToken();
    if (t) {
      try {
        const res = await api.listAllQuotesAdmin(t, { limit, page });
        setQuotes(res.quotes || []);
        setTotal(res.total || 0);
        setPages(res.pages || 1);
        return;
      } catch {}
    }
    const all = getQuotes();
    setTotal(all.length);
    setPages(Math.max(1, Math.ceil(all.length / limit)));
    const start = (page - 1) * limit;
    setQuotes(all.slice(start, start + limit));
  };

  const handleEdit = async (quote) => {
    setEditFor(quote);
  };

  const handleSignOut = () => {
    clearSalesUser();
    clearSalesToken();
    toast({ title: 'Signed out of sales' });
    navigate('/');
  };

  const handleMfgApprove = async (quote) => {
    try {
      const token = getSalesToken();
      await api.salesMfgApproveQuote(token, quote._id || quote.id);
      toast({ title: 'Quote approved for manufacturing' });
      refresh();
    } catch (err) {
      toast({ title: 'Approval failed', description: err.message });
    }
  };

  const handlePaymentStatusChange = async (quoteId, newStatus) => {
    try {
      const token = getSalesToken();
      await api.salesUpdatePaymentProofStatus(token, quoteId, newStatus);
      toast({ title: `Payment status updated to ${newStatus}` });
      refresh();
    } catch (err) {
      toast({ title: 'Status update failed', description: err.message });
    }
  };

  const doSend = async () => {
    try {
      const token = getSalesToken();
      // Use MongoDB _id first (for server API), then fallback to other IDs
      const id = sendFor?._id || sendFor?.id || sendFor?.quoteId;
      console.log('Sending quote with ID:', id, 'sendFor object:', sendFor);
      const total = Number(sendValue);
      if (!id || !isFinite(total)) return;
      await api.salesSendQuote(id, token, { total, currency: 'INR', notes: sendNotes });
      setSendFor(null); setSendValue(''); setSendNotes('');
      refresh();
      toast({ title: 'Quote sent to user' });
    } catch (err) {
      console.error('Send quote error:', err);
      toast({ title: 'Send failed', description: err.message || 'Could not send quote' });
    }
  };

  const autoCalculateRate = () => {
    if (!sendFor?.specs) return;
    
    try {
      const estimate = estimateQuote({ 
        specs: sendFor.specs, 
        delivery: sendFor.delivery 
      });
      
      setSendValue(String(Math.round(estimate.total)));
      setSendBreakdown(estimate.breakdown || null);
      setSendSuggestedTotal(Number(estimate.total) || null);
      toast({ 
        title: 'Rate calculated', 
        description: `Auto-calculated based on ${sendFor.specs.layers} layers, ${sendFor.specs.widthMm}×${sendFor.specs.heightMm}mm, ${sendFor.specs.material} ${sendFor.specs.finish}` 
      });
    } catch (error) {
      toast({ 
        title: 'Calculation failed', 
        description: 'Could not calculate rate. Please enter manually.' 
      });
    }
  };

  const handleCreatePI = (quote) => {
    console.log('handleCreatePI called with quote:', quote);
    console.log('quote.proformaInvoice:', quote.proformaInvoice);

    setPiFor(quote);

    // Helper to build a single default line item from the quote
    const buildDefaultItem = () => ({
      description: `PCB Manufacturing (${quote.specs?.layers || '-'} Layer, ${quote.specs?.material || '-'}, ${quote.specs?.finish || '-'})`,
      quantity: quote.specs?.quantity || 1,
      unitPrice: Number(quote.adminQuote?.total) || 0,
      totalPrice: Number(quote.adminQuote?.total) || 0,
    });

    const derivedPiNumber = quote.quoteId ? quote.quoteId.replace(/^Q/, 'PI') : '';

    // If PI already exists, prefer its data but fall back to current quote when empty
    if (quote.proformaInvoice) {
      const existing = quote.proformaInvoice || {};
      const existingItems = Array.isArray(existing.items) ? existing.items : [];
      
      // Calculate current total
      const currentTotal = existingItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
      
      // Get suggested total
      let suggestedTotal = 0;
      try {
        if (quote?.specs) {
          const est = estimateQuote({ specs: { ...quote.specs }, delivery: quote.delivery });
          suggestedTotal = Number(est?.total) || 0;
        }
      } catch {}
      
      // If current total is 0 or empty, use suggested total
      let items = existingItems;
      if (currentTotal === 0 && suggestedTotal > 0) {
        items = [
          {
            description: `PCB Manufacturing (${quote.specs?.layers || '-'} Layer, ${quote.specs?.material || '-'}, ${quote.specs?.finish || '-'})`,
            quantity: 1,
            unitPrice: suggestedTotal,
            totalPrice: suggestedTotal,
          }
        ];
      } else if (existingItems.length === 0) {
        items = [buildDefaultItem()];
      }

      setPiData({
        items,
        notes: existing.notes || '',
        terms: existing.terms || '100% advance payment required. Delivery timeline: 7–10 business days.',
        taxRate: typeof existing.taxRate === 'number' ? existing.taxRate : 18, // Default to 18% GST
        discountPercentage: typeof existing.discountPercentage === 'number' ? existing.discountPercentage : 0,
        piNumber: existing.piNumber || derivedPiNumber,
      });
    } else {
      // New PI: seed from the current quote using a transparent breakdown if possible
      let initialItems = [buildDefaultItem()];
      try {
        if (quote?.specs) {
          const est = estimateQuote({ specs: { ...quote.specs }, delivery: quote.delivery });
          const b = est?.breakdown || {};
          const deliveryMode = b.deliveryMode || (quote?.delivery?.speed === 'express' ? 'EXPRESS' : 'STANDARD');
          initialItems = [
            {
              description: `Material cost (Area ${b.areaPerBoardCm2} cm² × Qty ${b.quantity} @ ${b.rateUsed}/sqcm)`,
              quantity: 1,
              unitPrice: Number(b.materialBase) || 0,
              totalPrice: Number(b.materialBase) || 0,
            },
            {
              description: `${deliveryMode} setup charge`,
              quantity: 1,
              unitPrice: Number(b.setupBase) || 0,
              totalPrice: Number(b.setupBase) || 0,
            },
            {
              description: `GST (18%) on subtotal`,
              quantity: 1,
              unitPrice: Number(b.gstAmount) || 0,
              totalPrice: Number(b.gstAmount) || 0,
            },
          ];
        }
      } catch {}

      setPiData({
        items: initialItems,
        notes: '',
        terms: '100% advance payment required. Delivery timeline: 7–10 business days.',
        taxRate: 18, // Default to 18% GST
        discountPercentage: 0,
        piNumber: derivedPiNumber,
      });
    }
  };

  const handleSavePI = async () => {
    try {
      const t = getAdminToken();
      if (!t || !piFor) return;

      const piPayload = {
        items: piData.items,
        notes: piData.notes,
        taxRate: piData.taxRate
      };

      const response = await api.createProformaInvoice(piFor._id || piFor.id, t, piPayload);
      
      setPiFor(null);
      setPiData({
        items: [],
        notes: '',
        terms: '100% advance payment required. Delivery timeline: 7–10 business days.',
        taxRate: 18, // Default to 18% GST
        discountPercentage: 0
      });
      
      // Refresh quotes
      const res = await api.listAllQuotesAdmin(t, { limit, page });
      setQuotes(res.quotes || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
      
      toast({ title: 'Proforma Invoice created', description: `PI ${response.proformaInvoice.piNumber} created successfully` });
    } catch (err) {
      toast({ title: 'Create failed', description: err.message || 'Could not create proforma invoice' });
    }
  };

  const handleUpdatePIItem = (index, field, value) => {
    const updatedItems = [...piData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // When editing amount directly, keep schema fields consistent
    if (field === 'totalPrice') {
      // Force quantity = 1 and unitPrice = totalPrice so Mongoose required fields are satisfied
      const amt = Number(value) || 0;
      updatedItems[index].quantity = 1;
      updatedItems[index].unitPrice = amt;
      updatedItems[index].totalPrice = amt;
    }
    
    setPiData({ ...piData, items: updatedItems });
  };

  const handleAddPIItem = () => {
    setPiData({
      ...piData,
      items: [...piData.items, {
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      }]
    });
  };

  const handleRemovePIItem = (index) => {
    const updatedItems = piData.items.filter((_, i) => i !== index);
    setPiData({ ...piData, items: updatedItems });
  };

  const calculatePITotals = () => {
    // Ensure all item prices are valid numbers
    const subtotal = piData.items.reduce((sum, item) => {
      const price = Number(item.totalPrice) || 0;
      return sum + price;
    }, 0);
    
    const discountPercentage = Number(piData.discountPercentage) || 0;
    const discountAmount = subtotal * (discountPercentage / 100);
    const taxableAmount = subtotal - discountAmount;
    
    const taxRate = Number(piData.taxRate) || 0;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;

    // Debug logging
    console.log('PI Calculation Debug:', {
      items: piData.items,
      subtotal,
      discountPercentage,
      discountAmount,
      taxableAmount,
      taxRate,
      taxAmount,
      total
    });

    return { subtotal, discountAmount, taxAmount, total };
  };

  // Build suggested cost lines using the estimator for transparency
  const buildSuggestedFromSpecs = () => {
    try {
      if (!piFor?.specs) return null;
      const est = estimateQuote({ specs: { ...piFor.specs }, delivery: piFor.delivery });
      const b = est?.breakdown || {};
      const deliveryMode = b.deliveryMode || (piFor?.delivery?.speed === 'express' ? 'EXPRESS' : 'STANDARD');
      const items = [
        {
          description: `Material cost (Area ${b.areaPerBoardCm2} cm² × Qty ${b.quantity} @ ${b.rateUsed}/sqcm)`,
          quantity: 1,
          unitPrice: Number(b.materialBase) || 0,
          totalPrice: Number(b.materialBase) || 0,
        },
        {
          description: `${deliveryMode} setup charge`,
          quantity: 1,
          unitPrice: Number(b.setupBase) || 0,
          totalPrice: Number(b.setupBase) || 0,
        },
        {
          description: `GST (18%) on subtotal`,
          quantity: 1,
          unitPrice: Number(b.gstAmount) || 0,
          totalPrice: Number(b.gstAmount) || 0,
        },
      ];
      return { est, items };
    } catch {
      return null;
    }
  };

  const handleUpdatePI = async () => {
    try {
      const t = getAdminToken();
      if (!t || !piFor?.proformaInvoice) return;

      const piPayload = {
        items: piData.items,
        notes: piData.notes,
        taxRate: piData.taxRate,
        discountPercentage: piData.discountPercentage
      };

      const response = await api.updateProformaInvoice(piFor._id || piFor.id, t, piPayload);
      
      // Refresh quotes
      const res = await api.listAllQuotesAdmin(t, { limit, page });
      setQuotes(res.quotes || []);
      
      toast({ title: 'Proforma Invoice updated', description: `PI ${response.proformaInvoice.piNumber} updated successfully` });
    } catch (err) {
      toast({ title: 'Update failed', description: err.message || 'Could not update proforma invoice' });
    }
  };

  const handleSendPI = async () => {
    try {
      const t = getSalesToken(); // Use sales token instead of admin token
      if (!t || !piFor?.proformaInvoice) return;

      await api.salesSendProformaInvoice(piFor._id || piFor.id, t);
      
      // Refresh quotes using sales token
      const token = getSalesToken();
      if (token) {
        const res = await api.getSalesQuotes(token, { limit, page });
        setQuotes(res.quotes || []);
        setTotal(res.total || 0);
        setPages(res.pages || 1);
      }
      
      toast({ title: 'Proforma Invoice sent', description: `PI ${piFor.proformaInvoice.piNumber} sent to customer` });
      setPiFor(null);
    } catch (err) {
      console.error('Send PI error:', err);
      toast({ title: 'Send failed', description: err.message || 'Could not send proforma invoice' });
    }
  };

  return (
    <SalesLayout user={salesUser} onLogout={handleSignOut}>
      <Helmet>
        <title>Sales PCB Quotes | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="grid gap-8">
        <Section
          title={`Requested Quotes (${total})`}
          quotes={quotes}
          onView={setViewQuote}
          onEdit={setEditFor}
          onSend={(q) => { setSendFor(q); setSendValue(String(q.adminQuote?.total ?? '')); setSendNotes(q.adminQuote?.notes || ''); setSendBreakdown(null); setSendSuggestedTotal(null); }}
          onPI={handleCreatePI}
          onViewProof={(q) => setProofFor(q)}
          onPaymentStatusChange={handlePaymentStatusChange}
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

      {sendFor && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-start justify-center p-4" onClick={() => setSendFor(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            
            {/* Indian Quotation Layout */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-bold">Quotation (Proforma)</h3>
              <Button variant="ghost" size="sm" onClick={() => setSendFor(null)}>Close</Button>
            </div>

            <div className="p-6 space-y-6 text-sm">
              {/* Company Header */}
              <div className="border-b pb-3">
                <h2 className="text-xl font-semibold">PCB Xpress</h2>
                <p className="text-xs text-muted-foreground">Mobility House,1x/92 C, Puthiya Road
                   near NSS Karayogam Hall,
                   Thripunithura</p>
                <p className="text-xs text-muted-foreground">Email: support@pcbxpress.in</p>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Quote For</p>
                  <p className="font-medium">{sendFor.contact?.name || '(Client)'}</p>
                  <p className="text-xs text-muted-foreground">{sendFor.contact?.email || '-'}</p>
                  <p className="text-xs text-muted-foreground">{sendFor.contact?.phone || '-'}</p>
                  {sendFor.contact?.gstin && <p className="text-xs text-muted-foreground">GSTIN: {sendFor.contact.gstin}</p>}
                  <p className="text-xs text-muted-foreground">{sendFor.contact?.company || ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date().toLocaleDateString('en-IN')}</p>
                  <p className="text-xs text-muted-foreground">Quote ID: {sendFor.quoteId || sendFor._id || sendFor.id}</p>
                </div>
              </div>

              {/* Quote Items */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="p-2 border">Description</th>
                      <th className="p-2 border">Quantity</th>
                      <th className="p-2 border">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border">
                        PCB Manufacturing ({sendFor.specs?.layers || '-'} Layer, {sendFor.specs?.material || '-'}, {sendFor.specs?.finish || '-'})
                      </td>
                      <td className="p-2 border">{sendFor.specs?.quantity || '-'}</td>
                      <td className="p-2 border text-right">
                        <div className="flex items-center gap-2">
                          <input
                            className="h-8 w-28 border rounded-md px-2 text-sm text-right"
                            type="number"
                            min="0"
                            step="0.01"
                            value={sendValue}
                            onChange={(e) => setSendValue(e.target.value)}
                            placeholder="Amount"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={autoCalculateRate}
                            disabled={!sendFor?.specs}
                          >
                            Auto
                          </Button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Cost Breakdown (shown after Auto) */}
              {sendBreakdown && (
                <div className="pt-2">
                  <h4 className="font-medium mb-2">Cost breakdown</h4>
                  <div className="grid grid-cols-2 gap-y-1 text-sm">
                    <div className="text-muted-foreground">Layer:</div>
                    <div className="text-right">{sendBreakdown.layerType}</div>
                    <div className="text-muted-foreground">Delivery:</div>
                    <div className="text-right">{sendBreakdown.deliveryMode}</div>
                    <div className="text-muted-foreground">Area/Board (cm²):</div>
                    <div className="text-right">{sendBreakdown.areaPerBoardCm2}</div>
                    <div className="text-muted-foreground">Rate Used:</div>
                    <div className="text-right">{sendBreakdown.rateUsed}</div>
                    <div className="text-muted-foreground">Material Base:</div>
                    <div className="text-right">{formatInr(Number(sendBreakdown.materialBase || 0))}</div>
                    <div className="text-muted-foreground">Setup Base:</div>
                    <div className="text-right">{formatInr(Number(sendBreakdown.setupBase || 0))}</div>
                    <div className="text-muted-foreground">Subtotal:</div>
                    <div className="text-right">{formatInr(Number(sendBreakdown.subTotal || 0))}</div>
                    <div className="text-muted-foreground">GST (18%):</div>
                    <div className="text-right">{formatInr(Number(sendBreakdown.gstAmount || 0))}</div>
                  </div>
                  <div className="mt-2 font-semibold text-right">
                    Suggested Total: {sendSuggestedTotal != null ? formatInr(Number(sendSuggestedTotal)) : ''}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-sm font-medium">Additional Notes</label>
                <textarea
                  className="w-full min-h-[80px] border rounded-md px-3 py-2 text-sm"
                  value={sendNotes}
                  onChange={(e) => setSendNotes(e.target.value)}
                  placeholder="E.g. Price includes GST. Delivery within 10 working days."
                />
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="text-right space-y-1">
                  <p className="text-base font-semibold">Total: ₹ {Number(sendValue || 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-muted-foreground">All prices in INR, inclusive of applicable taxes.</p>
                </div>
              </div>

              {/* Terms */}
              <div className="text-xs text-muted-foreground border-t pt-3">
                <p><strong>Terms & Conditions:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>100% advance payment required.</li>
                  <li>Delivery timeline: 7–10 business days (subject to design approval).</li>
                  <li>This quotation is valid for 15 days from the date of issue.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
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
                  <div>
                    <label className="text-sm font-medium">GSTIN</label>
                    <input
                      type="text"
                      value={editFor.contact?.gstin || ''}
                      onChange={(e) => setEditFor(prev => ({
                        ...prev,
                        contact: { ...prev.contact, gstin: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-md uppercase"
                      placeholder="GSTIN Number"
                    />
                  </div>
                </div>

                {/* PCB Specifications */}
                <div className="space-y-4">
                  <h4 className="font-medium">PCB Specifications</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Width (mm)</label>
                      <input
                        type="number"
                        value={editFor.specs?.widthMm || ''}
                        onChange={(e) => setEditFor(prev => ({
                          ...prev,
                          specs: { ...prev.specs, widthMm: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Height (mm)</label>
                      <input
                        type="number"
                        value={editFor.specs?.heightMm || ''}
                        onChange={(e) => setEditFor(prev => ({
                          ...prev,
                          specs: { ...prev.specs, heightMm: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Layers</label>
                      <select
                        value={editFor.specs?.layers || ''}
                        onChange={(e) => setEditFor(prev => ({
                          ...prev,
                          specs: { ...prev.specs, layers: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="10">10</option>
                        <option value="12">12</option>
                        <option value="14">14</option>
                        <option value="16">16</option>
                        <option value="18">18</option>
                        <option value="20">20</option>
                        <option value="22">22</option>
                        <option value="24">24</option>
                        <option value="26">26</option>
                        <option value="28">28</option>
                        <option value="30">30</option>
                        <option value="32">32</option>
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
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Material</label>
                      <select
                        value={editFor.specs?.material || ''}
                        onChange={(e) => setEditFor(prev => ({
                          ...prev,
                          specs: { ...prev.specs, material: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="FR4">FR4</option>
                        <option value="FR1">FR1</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Finish</label>
                      <select
                        value={editFor.specs?.finish || ''}
                        onChange={(e) => setEditFor(prev => ({
                          ...prev,
                          specs: { ...prev.specs, finish: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="HASL">HASL</option>
                        <option value="ENIG">ENIG</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Base Copper Thickness (Micron)</label>
                      <select
                        value={editFor.specs?.baseCopperThickness || ''}
                        onChange={(e) => setEditFor(prev => ({
                          ...prev,
                          specs: { ...prev.specs, baseCopperThickness: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="18/18">18/18</option>
                        <option value="25/25">25/25</option>
                        <option value="35/35">35/35</option>
                        <option value="70/70">70/70</option>
                        <option value="18/00">18/00</option>
                        <option value="25/00">25/00</option>
                        <option value="35/00">35/00</option>
                        <option value="70/00">70/00</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Mask</label>
                      <select
                        value={editFor.specs?.mask || ''}
                        onChange={(e) => setEditFor(prev => ({
                          ...prev,
                          specs: { ...prev.specs, mask: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="Both">Both</option>
                        <option value="Top">Top</option>
                        <option value="Bottom">Bottom</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Mask Colour</label>
                      <select
                        value={editFor.specs?.maskColor || ''}
                        onChange={(e) => setEditFor(prev => ({
                          ...prev,
                          specs: { ...prev.specs, maskColor: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="Green">Green</option>
                        <option value="Red">Red</option>
                        <option value="White">White</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Legend Colour</label>
                      <select
                        value={editFor.specs?.legendColor || ''}
                        onChange={(e) => setEditFor(prev => ({
                          ...prev,
                          specs: { ...prev.specs, legendColor: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="White">White</option>
                        <option value="Black">Black</option>
                      </select>
                    </div>
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

      {proofFor && (
        <PaymentProofModal quote={proofFor} onClose={() => setProofFor(null)} onStatusUpdate={refresh} />
      )}

      {piFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  {piFor.proformaInvoice
                    ? `Edit PI ${piFor.proformaInvoice.piNumber || (piFor.quoteId ? piFor.quoteId.replace(/^Q/, 'PI') : piData.piNumber)}`
                    : 'Create Proforma Invoice'}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setPiFor(null)}>Close</Button>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-muted-foreground">Proforma Invoice For</p>
                  <p className="font-medium">{piFor.contact?.name || '(Client)'}</p>
                  <p className="text-xs text-muted-foreground">{piFor.contact?.email || '-'}</p>
                  <p className="text-xs text-muted-foreground">{piFor.contact?.phone || '-'}</p>
                  {piFor.contact?.gstin && <p className="text-xs text-muted-foreground">GSTIN: {piFor.contact.gstin}</p>}
                  <p className="text-xs text-muted-foreground">{piFor.contact?.company || ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date().toLocaleDateString('en-IN')}</p>
                  {piFor.proformaInvoice ? (
                    <p className="text-xs text-muted-foreground">PI Number: {piFor.proformaInvoice.piNumber || (piFor.quoteId ? piFor.quoteId.replace(/^Q/, 'PI') : piData.piNumber)}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">PI Number: {piData.piNumber || (piFor?.quoteId ? piFor.quoteId.replace(/^Q/, 'PI') : '')}</p>
                  )}
                </div>
              </div>

              {/* PI Items */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddPIItem}>
                    Add Item
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-2 border">Description</th>
                        <th className="p-2 border">Amount (₹)</th>
                        <th className="p-2 border">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {piData.items.map((item, index) => (
                        <tr key={index}>
                          <td className="p-2 border">
                            <input
                              className="w-full px-2 py-1 border rounded"
                              type="text"
                              value={item.description}
                              onChange={(e) => handleUpdatePIItem(index, 'description', e.target.value)}
                              placeholder="Item description"
                            />
                          </td>
                          <td className="p-2 border">
                            <input
                              className="w-40 px-2 py-1 border rounded text-right"
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={item.totalPrice ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleUpdatePIItem(index, 'totalPrice', v === '' ? '' : Number(v));
                              }}
                            />
                          </td>
                          <td className="p-2 border">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemovePIItem(index)}
                              disabled={piData.items.length === 1}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Suggested Cost Breakdown (read-only) */}
              <div className="mb-6">
                {(() => {
                  const s = buildSuggestedFromSpecs();
                  if (!s) return null;
                  const { est, items } = s;
                  return (
                    <div className="bg-gray-50 p-4 rounded border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm">Suggested Cost Breakdown</h4>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPiData({ ...piData, items })}
                          >
                            Use Suggested Lines
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const s = buildSuggestedFromSpecs();
                              if (s && s.est) {
                                setPiData({
                                  ...piData,
                                  items: [
                                    {
                                      description: `PCB Manufacturing (${piFor?.specs?.layers || '-'} Layer, ${piFor?.specs?.material || '-'}, ${piFor?.specs?.finish || '-'})`,
                                      quantity: 1,
                                      unitPrice: Number(s.est.total) || 0,
                                      totalPrice: Number(s.est.total) || 0,
                                    }
                                  ],
                                  taxRate: 18 // Set to 18% GST when using suggested total
                                });
                              }
                            }}
                          >
                            Use Suggested Total
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPiData({
                              ...piData,
                              items: [
                                ...piData.items,
                                { description: 'Designing charge', quantity: 1, unitPrice: 0, totalPrice: 0 },
                              ],
                            })}
                          >
                            Add Designing Charge
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between"><span>Layer:</span><span>{est.breakdown?.layerType}</span></div>
                        <div className="flex justify-between"><span>Delivery:</span><span>{est.breakdown?.deliveryMode}</span></div>
                        <div className="flex justify-between"><span>Area/Board (cm²):</span><span>{est.breakdown?.areaPerBoardCm2}</span></div>
                        <div className="flex justify-between"><span>Rate Used:</span><span>{est.breakdown?.rateUsed}/sqcm</span></div>
                        <div className="flex justify-between"><span>Material Base:</span><span>{formatInr(Number(est.breakdown?.materialBase) || 0)}</span></div>
                        <div className="flex justify-between"><span>Setup Base:</span><span>{formatInr(Number(est.breakdown?.setupBase) || 0)}</span></div>
                        <div className="flex justify-between"><span>Subtotal:</span><span>{formatInr(Number(est.breakdown?.subTotal) || 0)}</span></div>
                        <div className="flex justify-between"><span>GST (18%):</span><span>{formatInr(Number(est.breakdown?.gstAmount) || 0)}</span></div>
                        <div className="flex justify-between font-semibold border-t pt-2"><span>Suggested Total:</span><span>{formatInr(Number(est.total) || 0)}</span></div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium">Discount (%)</label>
                  <input
                    className="w-full px-3 py-2 border rounded-md"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.1"
                    value={piData.discountPercentage ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPiData({ ...piData, discountPercentage: v === '' ? '' : Number(v) });
                    }}
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="mb-6">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatInr(calculatePITotals().subtotal)}</span>
                    </div>
                    {calculatePITotals().discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({piData.discountPercentage}%):</span>
                        <span>-{formatInr(calculatePITotals().discountAmount)}</span>
                      </div>
                    )}
                    {calculatePITotals().taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Tax ({piData.taxRate}%):</span>
                        <span>{formatInr(calculatePITotals().taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-2">
                      <span>Total:</span>
                      <span>{formatInr(calculatePITotals().total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="text-sm font-medium">Notes (optional)</label>
                <textarea
                  className="w-full min-h-[80px] border rounded-md px-3 py-2 text-sm"
                  value={piData.notes}
                  onChange={(e) => setPiData({ ...piData, notes: e.target.value })}
                  placeholder="Additional notes for the proforma invoice"
                />
              </div>

              {/* Terms & Conditions */}
              <div className="mb-6 text-xs text-gray-600 border-t pt-4">
                <p className="font-semibold mb-1">Terms & Conditions:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>100% advance payment required.</li>
                  <li>Delivery timeline: 7–10 business days (subject to design approval).</li>
                  <li>This quotation is valid for 15 days from the date of issue.</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!piFor.proformaInvoice ? (
                  <Button onClick={handleSavePI}>Create PI</Button>
                ) : (
                  <>
                    <Button onClick={handleUpdatePI}>Update PI</Button>
                    {piFor.proformaInvoice.status === 'draft' && (
                      <Button variant="outline" onClick={handleSendPI}>Send to Customer</Button>
                    )}
                  </>
                )}
                <Button variant="outline" onClick={() => setPiFor(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SalesLayout>
  );
};

const Section = ({ title, quotes, onView, onEdit, onSend, onPI, onViewProof, pagination, onPaymentStatusChange }) => (
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
                    {q.specs ? (
                      <>
                        {q.specs.layers}L {q.specs.widthMm}×{q.specs.heightMm}mm · {q.specs.material} · {q.specs.finish} · Qty {q.specs.quantity}
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
                      <Button variant="outline" size="sm" onClick={() => onPI(q)}>{q.proformaInvoice ? 'Edit PI' : 'Create PI'}</Button>
                      {q.paymentProof?.status === 'submitted' && (
                        <Button variant="outline" size="sm" onClick={() => onViewProof && onViewProof(q)}>View Proof</Button>
                      )}
                      {(q.paymentMethod === 'cash' && q.paymentProof?.status === 'approved') && (
                        <Button variant="outline" size="sm" onClick={() => handleMfgApprove(q)}>Approve</Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => onEdit(q)}>Edit Quote</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination Controls */}
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

const QuoteModal = ({ quote, onClose }) => (
  <div className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center p-4" onClick={onClose}>
    <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
        <Detail label="GSTIN" value={quote.contact?.gstin || '-'} />
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

        {quote.service === 'pcb' && quote.specs && (() => {
          try {
            const est = estimateQuote({ specs: { ...quote.specs }, delivery: quote.delivery });
            const b = est?.breakdown || null;
            if (!b) return null;
            return (
              <div className="sm:col-span-2 mt-2">
                <p className="font-medium mb-2">Cost breakdown</p>
                <div className="grid grid-cols-2 gap-y-1">
                  <div className="text-muted-foreground">Layer:</div>
                  <div className="text-right">{b.layerType}</div>
                  <div className="text-muted-foreground">Delivery:</div>
                  <div className="text-right">{b.deliveryMode}</div>
                  <div className="text-muted-foreground">Area/Board (cm²):</div>
                  <div className="text-right">{b.areaPerBoardCm2}</div>
                  <div className="text-muted-foreground">Rate Used:</div>
                  <div className="text-right">{b.rateUsed}</div>
                  <div className="text-muted-foreground">Material Base:</div>
                  <div className="text-right">{formatInr(Number(b.materialBase || 0))}</div>
                  <div className="text-muted-foreground">Setup Base:</div>
                  <div className="text-right">{formatInr(Number(b.setupBase || 0))}</div>
                  <div className="text-muted-foreground">Subtotal:</div>
                  <div className="text-right">{formatInr(Number(b.subTotal || 0))}</div>
                  <div className="text-muted-foreground">GST (18%):</div>
                  <div className="text-right">{formatInr(Number(b.gstAmount || 0))}</div>
                </div>
                <div className="mt-2 font-semibold text-right">
                  Suggested Total: {formatInr(Number(est.total || 0))}
                </div>
              </div>
            );
          } catch {
            return null;
          }
        })()}
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
    cash: { label: 'Cash', color: 'bg-yellow-100 text-yellow-800' },
    pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  };
  const config = methodConfig[method] || methodConfig.pending;
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>{config.label}</span>;
};

const EditedBadge = ({ edited }) => {
  if (!edited) return null;
  return <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Edited</span>;
};

export default SalesQuotesPage;
