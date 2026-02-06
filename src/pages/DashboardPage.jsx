import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUser, clearUser, getQuotes, removeQuote, clearQuotes, clearToken, getToken } from '@/lib/storage';
import { api } from '@/lib/api';
import { formatInr } from '@/lib/currency';
import { estimateQuote } from '@/lib/quote';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronDown, LogOut, User, ShieldCheck, Clock} from 'lucide-react';

const SERVICE_NAV_ITEMS = [
  { label: 'PCB Printing', value: 'pcb' },
  { label: 'PCB Assembly', value: 'pcb_assembly' },
  { label: '3D Printing', value: '3dprinting' },
  { label: 'Wire Harness', value: 'wire_harness' },
  { label: 'Testing', value: 'testing' },
];

const DashboardPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [viewQuote, setViewQuote] = useState(null);
  const [editQuote, setEditQuote] = useState(null);
  const [viewPI, setViewPI] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [quotesPage, setQuotesPage] = useState(1);
  const [quotesLimit, setQuotesLimit] = useState(10);
  const [quotesTotal, setQuotesTotal] = useState(0);
  const [orders, setOrders] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [quotesPages, setQuotesPages] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState(10);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPages, setOrdersPages] = useState(1);
  const [activeService, setActiveService] = useState(null);
  const [acceptedQuotes, setAcceptedQuotes] = useState(() => {
    try {
      const raw = localStorage.getItem('px_accepted_quotes');
      const arr = JSON.parse(raw || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  });

  useEffect(() => {
    const u = getUser();
    setUser(u);
    fetchQuotes();
    fetchOrders();
  }, [quotesPage, quotesLimit, ordersPage, ordersLimit]);

  useEffect(() => {
    try { localStorage.setItem('px_accepted_quotes', JSON.stringify(acceptedQuotes)); } catch {}
  }, [acceptedQuotes]);

  const fetchQuotes = async () => {
    const t = getToken();
    if (t) {
      try {
        const res = await api.listMyQuotes(t, { limit: quotesLimit, page: quotesPage });
        setQuotes(res.quotes || []);
        setQuotesTotal(res.total || 0);
        setQuotesPages(res.pages || 1);
      } catch {
        setQuotes(getQuotes());
        setQuotesTotal(0);
        setQuotesPages(1);
      }
    } else {
      setQuotes(getQuotes());
      setQuotesTotal(0);
      setQuotesPages(1);
    }
  };

  const fetchOrders = async () => {
    const t = getToken();
    if (t) {
      try {
        const res = await api.listMyOrders(t, { limit: ordersLimit, page: ordersPage });
        setOrders(res.orders || []);
        setOrdersTotal(res.total || 0);
        setOrdersPages(res.pages || 1);
      } catch {
        setOrders([]);
        setOrdersTotal(0);
        setOrdersPages(1);
      }
    } else {
      try {
        const local = JSON.parse(localStorage.getItem('px_orders') || '[]');
        setOrders(Array.isArray(local) ? local : []);
        setOrdersTotal(local.length);
        setOrdersPages(Math.ceil(local.length / ordersLimit));
      } catch {
        setOrders([]);
        setOrdersTotal(0);
        setOrdersPages(1);
      }
    }
  };

  const stats = useMemo(() => {
    const total = quotesTotal;
    const lastTotal = quotes[0]?.adminQuote?.total ?? quotes[0]?.quote?.total ?? 0;
    const express = quotes.filter((q) => q.delivery?.speed === 'express').length;
    return { total, lastTotal, express };
  }, [quotes, quotesTotal]);

  // Sort recent quotes by service (PCB → Assembly → Wire Harness → 3DP → Testing) and by date desc for clarity
  const sortedQuotes = useMemo(() => {
    const order = { pcb: 0, pcb_assembly: 1, wire_harness: 2, '3dprinting': 3, testing: 4 };
    return [...quotes].sort((a, b) => {
      const oa = order[a?.service] ?? 99;
      const ob = order[b?.service] ?? 99;
      if (oa !== ob) return oa - ob;
      return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
    });
  }, [quotes]);

  const serviceCounts = useMemo(() => {
    return quotes.reduce((acc, q) => {
      const key = q?.service || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [quotes]);

  const displayedQuotes = useMemo(() => {
    if (!activeService) return sortedQuotes;
    return sortedQuotes.filter((q) => q.service === activeService);
  }, [sortedQuotes, activeService]);

  const handleNavLinkClick = useCallback((serviceId) => {
    setActiveService((prev) => (prev === serviceId ? null : serviceId));
  }, []);

  const serviceLabels = {
    pcb: 'PCB Quotes',
    pcb_assembly: 'Assembly Quotes',
    wire_harness: 'Wire Harness Quotes',
    '3dprinting': '3D Printing Quotes',
    testing: 'Testing Quotes',
  };

  const serviceBadges = {
    pcb: 'PCB',
    pcb_assembly: 'ASM',
    wire_harness: 'WH',
    '3dprinting': '3DP',
    testing: 'TEST',
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = () => {
    clearUser();
    clearToken();
    setShowLogoutDialog(false);
    toast({ title: 'Signed out successfully' });
    navigate('/');
  };

  const handleRemove = async (id) => {
    const t = getToken();
    if (t && id) {
      try {
        await api.deleteQuote(id, t);
      } catch {}
    }
    removeQuote(id);
    await fetchQuotes();
  };

  const handleEdit = (q) => {
    setEditQuote(q);
  };

  const handleViewPI = (quote) => {
    setViewPI(quote);
  };

  // Accept a sent quotation: generate a Proforma Invoice for this quote
  const handleAcceptQuotation = async (quote) => {
    try {
      const t = getToken();
      if (!t || !quote) return;

      // Build a transparent PI from estimator (PCB only for now)
      let piPayload = { items: [], notes: '', taxRate: 0 };
      try {
        if (quote?.service === 'pcb' && quote?.specs) {
          const est = estimateQuote({ specs: { ...quote.specs }, delivery: quote.delivery });
          const b = est?.breakdown || {};
          const deliveryMode = b.deliveryMode || (quote?.delivery?.speed === 'express' ? 'EXPRESS' : 'STANDARD');
          piPayload.items = [
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
        } else {
          // Fallback: single-line PI using quoted total
          const amount = Number(quote.adminQuote?.total || quote.quote?.total || 0);
          piPayload.items = [{ description: 'Quoted amount', quantity: 1, unitPrice: amount, totalPrice: amount }];
        }
      } catch {}

      await api.createProformaInvoice(quote._id || quote.id, t, piPayload);
      // Mark PI as sent so it appears in user PI section and admin can edit the same PI
      try {
        await api.sendProformaInvoice(quote._id || quote.id, t);
      } catch {}

      // Refresh quotes so PI appears and stays in sync with admin edits
      const res = await api.listMyQuotes(t, { limit: quotesLimit, page: quotesPage });
      setQuotes(res.quotes || []);
      setQuotesTotal(res.total || 0);
      setQuotesPages(res.pages || 1);

      // Mark this quote as accepted locally for UI logic (badge, hide Edit, hide Accept button)
      const id = quote._id || quote.id;
      if (id && !acceptedQuotes.includes(id)) {
        setAcceptedQuotes((prev) => [...prev, id]);
      }

      toast({ title: 'Quotation accepted', description: 'Proforma Invoice has been generated.' });
      setSelectedQuote(null);
    } catch (err) {
      toast({ title: 'Could not accept quotation', description: err.message || 'Please try again' });
    }
  };

  const handleConfirmPI = async () => {
    try {
      const t = getToken();
      if (!t || !viewPI) return;

      await api.confirmProformaInvoice(viewPI._id || viewPI.id, t);
      
      // Refresh quotes
      const res = await api.listQuotes(t, { limit: quotesLimit, page: quotesPage });
      setQuotes(res.quotes || []);
      setQuotesTotal(res.total || 0);
      setQuotesPages(res.pages || 1);
      
      toast({ title: 'Proforma Invoice confirmed', description: 'PI confirmed successfully' });
      setViewPI(null);
    } catch (err) {
      toast({ title: 'Confirmation failed', description: err.message || 'Could not confirm PI' });
    }
  };

  const handleRejectPI = async () => {
    try {
      const t = getToken();
      if (!t || !viewPI) return;

      // For now, just close the modal - in future could add rejection API
      toast({ title: 'PI rejected', description: 'Please contact us for any changes' });
      setViewPI(null);
    } catch (err) {
      toast({ title: 'Action failed', description: err.message || 'Could not process request' });
    }
  };

  const handleClearAll = async () => {
    const t = getToken();
    if (t) {
      try {
        // Since we have pagination, we need to fetch all quotes to delete them
        const allQuotes = [];
        let page = 1;
        while (true) {
          const res = await api.listMyQuotes(t, { limit: 100, page });
          if (!res.quotes || res.quotes.length === 0) break;
          allQuotes.push(...res.quotes);
          if (res.quotes.length < 100) break;
          page++;
        }
        for (const q of allQuotes) {
          if (q._id) await api.deleteQuote(q._id, t);
        }
      } catch {}
    }
    clearQuotes();
    setQuotes([]);
    setQuotesTotal(0);
    setQuotesPages(1);
    setQuotesPage(1);
  };

  return (
    <>
      <Helmet>
        <title>Dashboard | PCB Xpress</title>
        <meta name="description" content="Your quotes and manufacturing overview." />
      </Helmet>

      <section className="py-16">
        <div className="container grid gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6 lg:sticky lg:top-24">
              <Card>
                <CardHeader>
                  <CardTitle>Services</CardTitle>
                  <CardDescription>Filter the dashboard by manufacturing track.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {SERVICE_NAV_ITEMS.map((item) => {
                    const isActive = activeService === item.value;
                    const count = serviceCounts[item.value] || 0;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleNavLinkClick(item.value)}
                        className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm font-medium transition ${
                          isActive
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <span>{item.label}</span>
                        <Badge
                          variant={isActive ? 'secondary' : 'outline'}
                          className={isActive ? 'border-transparent' : ''}
                        >
                          {count}
                        </Badge>
                      </button>
                    );
                  })}
                  <p className="pt-2 text-xs text-muted-foreground">
                    Tap a service to focus quotes, tap again to view everything.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Track quotes and orders across manufacturing services.
                </p>
              </div>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-3 rounded-full border border-input bg-background px-3 py-2 text-left text-sm font-medium shadow-sm transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </span>
                      <div className="hidden flex-col sm:flex">
                        <span className="text-xs text-muted-foreground">Signed in as</span>
                        <span className="max-w-[160px] truncate text-sm font-semibold leading-tight">
                          {user.name || user.email}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        setShowProfileDialog(true);
                      }}
                      className="gap-2"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        handleLogoutClick();
                      }}
                      className="gap-2 text-red-600 focus:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/login">
                  <Button variant="outline">Sign in</Button>
                </Link>
              )}
            </div>

            <Card>
              <CardContent className="grid grid-cols-2 gap-4 py-6 sm:grid-cols-4">
                <Metric label="Total Quotes" value={stats.total} />
                <Metric label="Express" value={stats.express} />
                <Metric label="Last total" value={formatInr(stats.lastTotal || 0)} />
                <Metric label="Currency" value="INR" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>
                    {activeService ? serviceLabels[activeService] || 'Service Quotes' : 'Recent Quotes'}
                  </CardTitle>
                  <div className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm font-medium">
                    {displayedQuotes.length} {displayedQuotes.length === 1 ? 'Quote' : 'Quotes'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to="/quote">
                    <Button>New Quote</Button>
                  </Link>
                  <Button variant="outline" onClick={handleClearAll} disabled={quotes.length === 0}>
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {displayedQuotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {activeService
                      ? 'No quotes yet for this service.'
                      : 'No quotes yet. Create your first quote to see it here.'}
                  </p>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="py-2 pr-4">Date</th>
                            <th className="py-2 pr-4">Summary</th>
                            <th className="py-2 pr-4">Delivery</th>
                            <th className="py-2 pr-4">Payment Status</th>
                            <th className="py-2 pr-4">Total</th>
                            <th className="py-2 pr-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedQuotes.map((q, idx) => (
                            <React.Fragment key={(q._id || q.id) + '-group'}>
                              {(idx === 0 || displayedQuotes[idx - 1]?.service !== q.service) && (
                                <tr
                                  className="border-b bg-muted/50"
                                  id={`service-${q.service || 'other'}`}
                                >
                                  <td className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground" colSpan={6}>
                                    {serviceLabels[q.service] || 'Other Quotes'}
                                  </td>
                                </tr>
                              )}
                              <tr key={q._id || q.id} className="border-b last:border-0">
                                <td className="py-3 pr-4 whitespace-nowrap">
                                  {new Date(q.createdAt).toLocaleString()}
                                </td>
                                <td className="py-3 pr-4">
                                  {q.service === '3dprinting' && q.specs3d ? (
                                    <>
                                      {q.specs3d.tech?.toUpperCase()} {q.specs3d.dims?.xMm} x {q.specs3d.dims?.yMm} x {q.specs3d.dims?.zMm}mm · {q.specs3d.material} · Qty {q.specs3d.quantity}
                                    </>
                                  ) : q.service === 'pcb_assembly' && q.specsAssembly ? (
                                    <>
                                      {(q.specsAssembly.assemblyType || '').toUpperCase()} assembly · {q.specsAssembly.boardWidthMm} x {q.specsAssembly.boardHeightMm}mm · {q.specsAssembly.componentCount} components · Qty {q.specsAssembly.quantity}
                                    </>
                                  ) : q.service === 'wire_harness' && q.specsHarness ? (
                                    <>
                                      {q.specsHarness.wireCount} wires · {q.specsHarness.connectorCount} connectors · {q.specsHarness.boardWidthMm} x {q.specsHarness.boardHeightMm}mm · Qty {q.specsHarness.quantity}
                                    </>
                                  ) : q.specs ? (
                                    <>
                                      {q.specs.layers}L {q.specs.widthMm} x {q.specs.heightMm}mm · {q.specs.material} · {q.specs.finish} · Qty {q.specs.quantity}
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">(no specs)</span>
                                  )}
                                </td>
                                <td className="py-3 pr-4 whitespace-nowrap">
                                  {q.delivery?.speed === 'express' ? 'Express' : 'Standard'}
                                </td>
                                <td className="py-3 pr-4 whitespace-nowrap">
                                  {q.proformaInvoice ? (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      q.proformaInvoice.status === 'paid' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {q.proformaInvoice.status === 'paid' ? 'Paid' : 'Pending Payment'}
                                    </span>
                                  ) : (
                                    <PaymentProofStatus status={q.paymentProof?.status || 'not_submitted'} />
                                  )}
                                </td>
                                <td className="py-3 pr-4 whitespace-nowrap">
                                  {formatInr(
                                    (q.adminQuote?.total != null ? q.adminQuote.total : q.quote?.total) || 0
                                  )}
                                </td>
                                <td className="py-3 pr-2">
                                  <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setSelectedQuote(q)}>
                                      View Quotation
                                    </Button>
                                    {!(q.userAccepted || acceptedQuotes.includes(q._id || q.id)) && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(q)}
                                      >
                                        Edit Quote
                                      </Button>
                                    )}
                                    {(q.userAccepted || acceptedQuotes.includes(q._id || q.id)) && (
                                      <Badge className="whitespace-nowrap">Quotation Submitted</Badge>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-3 md:hidden">
                      {displayedQuotes.map((q) => (
                        <div
                          key={q._id || q.id}
                          className="rounded-md border p-3"
                          id={`service-${q.service || 'other'}`}
                        >
                          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{new Date(q.createdAt).toLocaleString()}</span>
                            <span className="uppercase font-medium">{serviceBadges[q.service] || (q.service || '').toUpperCase()}</span>
                          </div>
                          <div className="text-sm">
                          {q.service === '3dprinting' && q.specs3d ? (
                            <>
                              {q.specs3d.tech?.toUpperCase()} {q.specs3d.dims?.xMm} x {q.specs3d.dims?.yMm} x {q.specs3d.dims?.zMm}mm · {q.specs3d.material} · Qty {q.specs3d.quantity}
                            </>
                          ) : q.service === 'pcb_assembly' && q.specsAssembly ? (
                            <>
                              {(q.specsAssembly.assemblyType || '').toUpperCase()} assembly · {q.specsAssembly.boardWidthMm} x {q.specsAssembly.boardHeightMm}mm · {q.specsAssembly.componentCount} components · Qty {q.specsAssembly.quantity}
                            </>
                          ) : q.service === 'wire_harness' && q.specsHarness ? (
                            <>
                              {q.specsHarness.wireCount} wires · {q.specsHarness.connectorCount} connectors · {q.specsHarness.boardWidthMm} x {q.specsHarness.boardHeightMm}mm · Qty {q.specsHarness.quantity}
                            </>
                          ) : q.specs ? (
                            <>
                              {q.specs.layers}L {q.specs.widthMm} x {q.specs.heightMm}mm · {q.specs.material} · {q.specs.finish} · Qty {q.specs.quantity}
                            </>
                          ) : (
                            <span className="text-muted-foreground">(no specs)</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span>{q.delivery?.speed === 'express' ? 'Express' : 'Standard'}</span>
                          {q.proformaInvoice ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              q.proformaInvoice.status === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {q.proformaInvoice.status === 'paid' ? 'Paid' : 'Pending Payment'}
                            </span>
                          ) : (
                            <PaymentProofStatus status={q.paymentProof?.status || 'not_submitted'} />
                          )}
                          <span className="font-semibold">{formatInr((q.adminQuote?.total != null ? q.adminQuote.total : q.quote?.total) || 0)}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedQuote(q)}>View</Button>
                          {!(q.userAccepted || acceptedQuotes.includes(q._id || q.id)) && (
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(q)}>Edit</Button>
                          )}
                          {(q.userAccepted || acceptedQuotes.includes(q._id || q.id)) && (
                            <Badge className="flex-1 justify-center">Quotation Submitted</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}

                {/* Pagination for Quotes */}
                {quotesPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Rows per page:</span>
                      <select
                        value={quotesLimit}
                        onChange={(e) => {
                          setQuotesLimit(Number(e.target.value));
                          setQuotesPage(1);
                        }}
                        className="h-8 w-16 border rounded px-2 text-sm"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {Math.min((quotesPage - 1) * quotesLimit + 1, quotesTotal)}-{Math.min(quotesPage * quotesLimit, quotesTotal)} of {quotesTotal}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuotesPage(p => Math.max(1, p - 1))}
                        disabled={quotesPage <= 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuotesPage(p => Math.min(quotesPages, p + 1))}
                        disabled={quotesPage >= quotesPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Proforma Invoices Section */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Proforma Invoices</CardTitle>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total Amount</div>
                  <div className="font-bold text-lg text-primary">
                    {formatInr(
                      quotes
                        .filter(q => q.proformaInvoice && ['sent','paid'].includes(q.proformaInvoice.status))
                        .reduce((sum, q) => sum + (q.proformaInvoice.total || 0), 0)
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {quotes.filter(q => q.proformaInvoice && ['sent','paid'].includes(q.proformaInvoice.status)).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No proforma invoices sent yet.</p>
                ) : (
                  <div className="space-y-4">
                {quotes.filter(q => q.proformaInvoice && ['sent', 'paid'].includes(q.proformaInvoice.status)).map((quote) => {
                 const isPaid = quote.proformaInvoice.status === 'paid';
        return (
  <div key={quote._id || quote.id} className={`border rounded-lg p-4 bg-white shadow-sm ${isPaid ? 'border-green-200 bg-green-50/30' : ''}`}>
    <div className="flex justify-between items-start mb-4">
        <div>
          <div className="font-bold text-lg font-sans tracking-normal">PI NO: {quote.proformaInvoice.piNumber}</div>
        <p className="text-sm text-muted-foreground">
          Issued: {new Date(quote.proformaInvoice.sentAt || quote.createdAt).toLocaleDateString('en-IN')}
        </p>
        {isPaid && (
          <p className="text-xs text-green-600 font-medium mt-1">
            Paid on: {new Date(quote.proformaInvoice.paidAt || Date.now()).toLocaleDateString('en-IN')}
            </p>
          )}
      </div>
      {isPaid ? (
        <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
          <ShieldCheck className="w-3 h-3 me-1" /> Payment Complete
          </Badge>
        ):(

      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
        Pending Payment
      </Badge>
        )}
    </div>

    {/* Inline Itemized List */}
    <div className="overflow-x-auto mb-4 rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left border-b">
            <th className="p-2 font-medium">Description</th>
            <th className="p-2 font-medium text-right">Qty</th>
            <th className="p-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {quote.proformaInvoice.items.map((item, idx) => (
            <tr key={idx} className="border-b last:border-0">
              <td className="p-2">{item.description}</td>
              <td className="p-2 text-right">{item.quantity}</td>
              <td className="p-2 text-right font-medium">{formatInr(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {!isPaid && (
    <div className="space-y-1 text-sm border-t pt-3">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal:</span>
        <span>{formatInr(quote.proformaInvoice.subtotal || quote.proformaInvoice.total)}</span>
      </div>
      {quote.proformaInvoice.discountAmount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Discount:</span>
          <span>-{formatInr(quote.proformaInvoice.discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t">
        <span>Amount to Pay:</span>
        <span className="text-primary font-bold">{formatInr(quote.proformaInvoice.total || 0)}</span>
      </div>
    </div>
    )}

          <div className="mt-4">
            {isPaid ? (
              <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Payment Completed</span>
                </div>
                <div className="mb-3 p-3 bg-white rounded border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Amount Paid:</span>
                    <span className="font-bold text-green-700 text-lg">{formatInr(quote.proformaInvoice.total || 0)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Paid on: {new Date(quote.proformaInvoice.paidAt || Date.now()).toLocaleDateString('en-IN')}
                  </div>
                </div>
                <p className="text-sm text-green-700">
                  Your payment has been successfully processed. We will notify you once your order moves to production.
                </p>
                <div className="mt-3 text-xs text-green-600">
                  <p>• Order confirmation has been sent to your email</p>
                  <p>• Track production status from your dashboard</p>
                  <p>• Expected delivery date will be updated soon</p>
                </div>
              </div>
            ) : quote.paymentProof?.status === 'submitted' ? (
              <div className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-800">Payment Proof Submitted</span>
                </div>
                <div className="mb-3 p-3 bg-white rounded border border-yellow-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Payment Proof Status:</span>
                    <span className="font-bold text-yellow-700 text-lg">Under Review</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Submitted on: {new Date(quote.paymentProof.submittedAt || Date.now()).toLocaleDateString('en-IN')}
                  </div>
                </div>
                <p className="text-sm text-yellow-700">
                  Your payment proof has been submitted and is currently under review. Our team will verify it and update your order status shortly.
                </p>
                <div className="mt-4 space-y-2">
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/payment', { state: { quote } })}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white shadow-md"
                  >
                    Update Payment Proof
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Click to reupload or update your payment proof document
                  </p>
                </div>
              </div>
            ) : (
              <Button 
                size="lg" 
                onClick={() => navigate('/payment', { state: { quote } })}
                className="w-full bg-primary hover:bg-primary/90 text-white shadow-md"
              >
                Pay and Proceed
              </Button>
            )}
          </div>
              </div>
              );
            })}
            </div>
          )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>My Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                ) : (
                  <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">Items</th>
                          <th className="py-2 pr-4">Total</th>
                          <th className="py-2 pr-4">Payment Status</th>
                          <th className="py-2 pr-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => (
                          <tr key={o._id || o.id} className="border-b last:border-0">
                            <td className="py-3 pr-4 whitespace-nowrap">
                              {new Date(o.createdAt || o.created_at || Date.now()).toLocaleString()}
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
                              {Intl.NumberFormat('en-IN', {
                                style: 'currency',
                                currency: 'INR',
                              }).format(o.amounts?.total || o.total || 0)}
                            </td>
                            <td className="py-3 pr-4 whitespace-nowrap">
                              <PaymentProofStatus status={o.paymentProof?.status || 'not_submitted'} />
                            </td>
                            <td className="py-3 pr-4 whitespace-nowrap">{o.status || 'Pending'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-3">
                    {orders.map((o) => (
                      <div key={o._id || o.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>{new Date(o.createdAt || o.created_at || Date.now()).toLocaleString()}</span>
                          <span className="uppercase">{o.status || 'Pending'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>
                            {(() => {
                              if (!Array.isArray(o.items) || o.items.length === 0) return 'Items: 0';
                              const totalQty = o.items.reduce((n, it) => n + (it.quantity || 1), 0);
                              const names = o.items.map(it => it.name || it.part || 'Unknown').join(', ');
                              return `Items: ${names} (${totalQty})`;
                            })()}
                          </span>
                          <PaymentProofStatus status={o.paymentProof?.status || 'not_submitted'} />
                          <span className="font-semibold">{Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(o.amounts?.total || o.total || 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}

                {/* Pagination for Orders */}
                {ordersPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Rows per page:</span>
                      <select
                        value={ordersLimit}
                        onChange={(e) => {
                          setOrdersLimit(Number(e.target.value));
                          setOrdersPage(1);
                        }}
                        className="h-8 w-16 border rounded px-2 text-sm"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {Math.min((ordersPage - 1) * ordersLimit + 1, ordersTotal)}-{Math.min(ordersPage * ordersLimit, ordersTotal)} of {ordersTotal}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                        disabled={ordersPage <= 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOrdersPage(p => Math.min(ordersPages, p + 1))}
                        disabled={ordersPage >= ordersPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>• 50% advance payment is required for all orders</p>
                  <p>• Payment can be made via bank transfer or UPI</p>
                  <p>• Upload payment proof after making the payment</p>
                  <p>• Processing begins only after payment verification</p>
                </div>              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
            <DialogDescription>Review your PCB Xpress account details.</DialogDescription>
          </DialogHeader>
          {user ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Name</p>
                <p className="font-medium">{user.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Email</p>
                <p className="font-medium">{user.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Member Since</p>
                <p className="font-medium">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                You are not signed in. Please sign in to view your profile details.
              </p>
              <Button
                onClick={() => {
                  setShowProfileDialog(false);
                  navigate('/login');
                }}
              >
                Go to sign in
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Quotation Modal */}
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedQuote && (
            <div className="p-6 text-sm">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold">PCB Xpress</h2>
                  <p>
                Mobility House<br />
                1x/92 C, Puthiya Road, near NSS Karayogam Hall<br />
                Eroor PO<br />
                Thripunithura 682306<br/>
                India
                </p>
                  <p>Email: support@pcbxpress.in</p>
                </div>
                <div className="text-right text-xs">
                  <p>Date: {new Date(selectedQuote.createdAt).toLocaleDateString()}</p>
                  <p>Quote ID: {selectedQuote.quoteId || selectedQuote._id || selectedQuote.id}</p>
                </div>
              </div>

              {(selectedQuote.userAccepted || acceptedQuotes.includes(selectedQuote._id || selectedQuote.id)) && (
                <div className="mb-3 inline-block rounded border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">
                  Quotation submitted
                </div>
              )}

              {/* Quote For */}
              <div className="mb-6 space-y-1">
                <p className="font-semibold text-sm">Quote For</p>
                <p className="font-medium text-base">{selectedQuote.contact?.name || user?.name}</p>
                <p className="text-muted-foreground">{selectedQuote.contact?.email || user?.email}</p>
  
              {(selectedQuote.contact?.phone || user?.phone) && (
                <p><span className="font-semibold">Phone:</span> {selectedQuote.contact?.phone || user?.phone}</p>
              )}
              
              {(selectedQuote.contact?.company) && (
                <p><span className="font-semibold">Company:</span> {selectedQuote.contact?.company}</p>
              )}
              
              {(selectedQuote.contact?.gstin || user?.gstNo) && (
                <p><span className="font-semibold">GSTIN:</span> {selectedQuote.contact?.gstin || user?.gstNo}</p>
              )}
              
              {(selectedQuote.contact?.address) && (
                <div className="mt-2 pt-2 border-t border-dashed">
                  <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">Shipping Address</p>
                  <p className="whitespace-pre-line leading-relaxed">{selectedQuote.contact?.address}</p>
                </div>
              )}
            </div>

              {/* Table */}
              <table className="w-full border text-sm mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border text-left">Description</th>
                    <th className="p-2 border text-left">Quantity</th>
                    <th className="p-2 border text-left">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border">
                      {selectedQuote.service === '3dprinting' && selectedQuote.specs3d
                        ? `${selectedQuote.specs3d.tech?.toUpperCase()} ${selectedQuote.specs3d.dims?.xMm} x ${selectedQuote.specs3d.dims?.yMm} x ${selectedQuote.specs3d.dims?.zMm}mm · ${selectedQuote.specs3d.material}`
                        : selectedQuote.service === 'pcb_assembly' && selectedQuote.specsAssembly
                        ? `PCB Assembly (${(selectedQuote.specsAssembly.assemblyType || '').toUpperCase()} · ${selectedQuote.specsAssembly.componentCount} components · ${selectedQuote.specsAssembly.boardWidthMm} x ${selectedQuote.specsAssembly.boardHeightMm}mm)`
                        : selectedQuote.service === 'wire_harness' && selectedQuote.specsHarness
                        ? `Wire Harness (${selectedQuote.specsHarness.wireCount} wires · ${selectedQuote.specsHarness.connectorCount} connectors · ${selectedQuote.specsHarness.boardWidthMm} x ${selectedQuote.specsHarness.boardHeightMm}mm)`
                        : selectedQuote.specs
                        ? `PCB Manufacturing (${selectedQuote.specs.layers} Layer, ${selectedQuote.specs.material}, ${selectedQuote.specs.finish})`
                        : 'N/A'}
                    </td>
                    <td className="p-2 border">
                      {selectedQuote.specs3d?.quantity ||
                        selectedQuote.specsAssembly?.quantity ||
                        selectedQuote.specsHarness?.quantity ||
                        selectedQuote.specs?.quantity ||
                        1}
                    </td>
                    <td className="p-2 border">
                      {formatInr(
                        (selectedQuote.adminQuote?.total != null
                          ? selectedQuote.adminQuote.total
                          : selectedQuote.quote?.total) || 0
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Notes - only show if present */}
              {selectedQuote.adminQuote?.notes && (
                <div className="mb-6">
                  <p className="font-semibold mb-2">Additional Notes</p>
                  <div className="p-3 border rounded bg-gray-50 whitespace-pre-line">
                    {selectedQuote.adminQuote.notes}
                  </div>
                </div>
              )}

              {/* Payment Proof Status */}
              <div className="mb-6">
                <p className="font-semibold mb-2">Payment Status</p>
                <div className="flex items-center gap-4">
                  <PaymentProofStatus status={selectedQuote.paymentProof?.status || 'not_submitted'} />
                  {selectedQuote.paymentProof?.status === 'submitted' && (
                    <span className="text-sm text-muted-foreground">
                      Submitted on {selectedQuote.paymentProof.submittedAt ? new Date(selectedQuote.paymentProof.submittedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  )}
                  {selectedQuote.paymentProof?.status === 'approved' && (
                    <span className="text-sm text-green-600">
                      Approved on {selectedQuote.paymentProof.approvedAt ? new Date(selectedQuote.paymentProof.approvedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  )}
                  {selectedQuote.paymentProof?.status === 'rejected' && (
                    <div className="text-sm text-red-600">
                      <p>Rejected on {selectedQuote.paymentProof.rejectedAt ? new Date(selectedQuote.paymentProof.rejectedAt).toLocaleDateString() : 'N/A'}</p>
                      {selectedQuote.paymentProof.rejectionReason && (
                        <p>Reason: {selectedQuote.paymentProof.rejectionReason}</p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Total */}
              <div className="text-right font-bold text-lg mb-6">
                Total:{' '}
                {formatInr(
                  (selectedQuote.adminQuote?.total != null
                    ? selectedQuote.adminQuote.total
                    : selectedQuote.quote?.total) || 0
                )}
              </div>

              {/* Accept Quotation -> generates PI (only if not yet accepted and quote was sent with a total) */}
              {selectedQuote?.status === 'sent' && (Number(selectedQuote.adminQuote?.total ?? selectedQuote.quote?.total ?? 0) > 0) && !(
                selectedQuote.userAccepted || acceptedQuotes.includes(selectedQuote._id || selectedQuote.id)
              ) && (
                <div className="flex justify-center mb-6">
                  <Button
                    onClick={() => handleAcceptQuotation(selectedQuote)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Accept Quotation
                  </Button>
                </div>
              )}

              {/* Pending Quote Message */}
              {selectedQuote?.status === 'requested' && (
                <div className="flex justify-center mb-6">
                  <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3">
                    <p className="text-sm text-blue-700">
                      <span className="font-semibold">Pending:</span> Admin is reviewing your quotation. You will be able to accept once a quote is sent with pricing details.
                    </p>
                  </div>
                </div>
              )}

              {/* Terms */}
              <div className="text-xs text-gray-600 border-t pt-4">
                <p className="font-semibold mb-1">Terms & Conditions:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>100% advance payment required.</li>
                  <li>Delivery timeline: 7–10 business days (subject to design approval).</li>
                  <li>This quotation is valid for 15 days from the date of issue.</li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Sign Out
            </DialogTitle>
            <DialogDescription className="text-left">
              Are you sure you want to sign out of your account? You will need to sign in again to access your dashboard and quotes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Security Reminder</p>
              <p className="text-yellow-700">Make sure to save any important information before signing out.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogoutConfirm}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Quote Dialog */}
      <Dialog open={!!editQuote} onOpenChange={() => setEditQuote(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {editQuote && (
            <div className="p-6">
              <DialogHeader>
                <DialogTitle>Edit Quote</DialogTitle>
                <DialogDescription>
                  Update your quote details. Changes will be reflected immediately.
                </DialogDescription>
              </DialogHeader>
              {editQuote.paymentProof?.status === 'approved' && (
                <div className="mt-4 mb-2 p-3 rounded border border-yellow-300 bg-yellow-50 text-sm text-yellow-800">
                  Payment has been approved. Editing is disabled to preserve the approved quote.
                </div>
              )}

              <fieldset disabled={editQuote.paymentProof?.status === 'approved'}>
              <div className="space-y-6 mt-4">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h4 className="font-medium">Customer Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <input
                        type="text"
                        value={editQuote.contact?.name || ''}
                        onChange={(e) => setEditQuote(prev => ({
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
                        value={editQuote.contact?.email || ''}
                        onChange={(e) => setEditQuote(prev => ({
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
                        value={editQuote.contact?.phone || ''}
                        onChange={(e) => setEditQuote(prev => ({
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
                        value={editQuote.contact?.company || ''}
                        onChange={(e) => setEditQuote(prev => ({
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
                        value={editQuote.contact?.gstin || ''}
                        onChange={(e) => setEditQuote(prev => ({
                          ...prev,
                          contact: { ...prev.contact, gstin: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-md uppercase"
                        placeholder="GSTIN Number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Address</label>
                    <textarea
                      value={editQuote.contact?.address || ''}
                      onChange={(e) => setEditQuote(prev => ({
                        ...prev,
                        contact: { ...prev.contact, address: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <textarea
                      value={editQuote.contact?.notes || ''}
                      onChange={(e) => setEditQuote(prev => ({
                        ...prev,
                        contact: { ...prev.contact, notes: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-md"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Service-specific specifications */}
                {editQuote.service === 'pcb' && editQuote.specs && (
                  <div className="space-y-4">
                    <h4 className="font-medium">PCB Specifications</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-sm font-medium">Width (mm)</label>
                          <input
                            type="number"
                            value={editQuote.specs.widthMm || ''}
                            onChange={(e) => setEditQuote(prev => ({
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
                            value={editQuote.specs.heightMm || ''}
                            onChange={(e) => setEditQuote(prev => ({
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
                            value={editQuote.specs.layers || ''}
                            onChange={(e) => setEditQuote(prev => ({
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
                            value={editQuote.specs.quantity || ''}
                            onChange={(e) => setEditQuote(prev => ({
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
                            value={editQuote.specs.material || ''}
                            onChange={(e) => setEditQuote(prev => ({
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
                            value={editQuote.specs.finish || ''}
                            onChange={(e) => setEditQuote(prev => ({
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
                            value={editQuote.specs.baseCopperThickness || ''}
                            onChange={(e) => setEditQuote(prev => ({
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
                            value={editQuote.specs.mask || ''}
                            onChange={(e) => setEditQuote(prev => ({
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
                            value={editQuote.specs.maskColor || ''}
                            onChange={(e) => setEditQuote(prev => ({
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
                            value={editQuote.specs.legendColor || ''}
                            onChange={(e) => setEditQuote(prev => ({
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
                )}

                {/* Delivery Options */}
                <div className="space-y-4">
                  <h4 className="font-medium">Delivery Options</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Delivery Speed</label>
                      <select
                        value={editQuote.delivery?.speed || ''}
                        onChange={(e) => setEditQuote(prev => ({
                          ...prev,
                          delivery: { ...prev.delivery, speed: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="standard">Standard</option>
                        <option value="express">Express</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              </fieldset>

              <DialogFooter className="gap-2">
                <Button 
                  onClick={async () => {
                    try {
                      const t = getToken();
                      if (t && editQuote) {
                        await api.updateQuoteCustomer(editQuote._id || editQuote.id, t, {
                          specs: editQuote.specs,
                          delivery: editQuote.delivery,
                          contact: editQuote.contact
                        });
                        toast({ title: 'Quote updated successfully' });
                        setEditQuote(null);
                        await fetchQuotes();
                      }
                    } catch (error) {
                      toast({ 
                        title: 'Error updating quote', 
                        description: error.message || 'Please try again',
                        variant: 'destructive'
                      });
                    }
                  }}
                  disabled={editQuote.paymentProof?.status === 'approved'}
                >
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditQuote(null)}>Cancel</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PI Details Modal */}
      <PIDetailsModal pi={viewPI} onClose={() => setViewPI(null)} />
    </>
  );
};

const Metric = ({ label, value }) => (
  <div className="rounded-md border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold">{value}</p>
  </div>
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

// PI Details Modal Component
const PIDetailsModal = ({ pi, onClose }) => {
  if (!pi) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Proforma Invoice Details</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>

          {/* PI Header */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-muted-foreground">Proforma Invoice</p>
              <p className="font-semibold text-lg">{pi.proformaInvoice.piNumber}</p>
              <p className="text-xs text-muted-foreground">
                Date: {new Date(pi.proformaInvoice.sentAt || pi.createdAt).toLocaleDateString('en-IN')}
              </p>
              <p className="text-xs text-muted-foreground">
                Status: <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  pi.proformaInvoice.status === 'confirmed' 
                    ? 'bg-green-100 text-green-800'
                    : pi.proformaInvoice.status === 'sent'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {pi.proformaInvoice.status === 'confirmed' 
                    ? 'Confirmed'
                    : pi.proformaInvoice.status === 'sent'
                    ? 'Pending'
                    : 'Draft'
                  }
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Valid Until</p>
              <p className="font-medium">
                {pi.proformaInvoice.expiresAt 
                  ? new Date(pi.proformaInvoice.expiresAt).toLocaleDateString('en-IN')
                  : 'No expiry'
                }
              </p>
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Bill To</h3>
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-medium">{pi.contact?.name || '-'}</p>
              <p className="text-sm text-muted-foreground">{pi.contact?.email || '-'}</p>
              <p className="text-sm text-muted-foreground">{pi.contact?.phone || '-'}</p>
              {pi.contact?.company && <p className="text-sm text-muted-foreground">{pi.contact.company}</p>}
              {pi.contact?.gstin && <p className="text-sm text-muted-foreground">GSTIN: {pi.contact.gstin}</p>}
              {pi.contact?.address && <p className="text-sm text-muted-foreground">{pi.contact.address}</p>}
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2 border">Description</th>
                    <th className="p-2 border text-right">Quantity</th>
                    <th className="p-2 border text-right">Unit Price</th>
                    <th className="p-2 border text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pi.proformaInvoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="p-2 border">{item.description}</td>
                      <td className="p-2 border text-right">{item.quantity}</td>
                      <td className="p-2 border text-right">{formatInr(item.unitPrice)}</td>
                      <td className="p-2 border text-right font-medium">{formatInr(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="mb-6">
            <div className="bg-gray-50 p-4 rounded">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatInr(pi.proformaInvoice.subtotal)}</span>
                </div>
                {pi.proformaInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({pi.proformaInvoice.discountPercentage}%):</span>
                    <span>-{formatInr(pi.proformaInvoice.discountAmount)}</span>
                  </div>
                )}
                {pi.proformaInvoice.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({pi.proformaInvoice.taxRate}%):</span>
                    <span>{formatInr(pi.proformaInvoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total:</span>
                  <span>{formatInr(pi.proformaInvoice.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {pi.proformaInvoice.notes && (
            <div className="mb-6">
              <h3 className="font-medium mb-3">Notes</h3>
              <div className="bg-gray-50 p-4 rounded text-sm">
                {pi.proformaInvoice.notes}
              </div>
            </div>
          )}

          {/* Actions */}
          {pi.proformaInvoice.status === 'sent' && (
            <div className="flex gap-2">
              <Button onClick={() => onClose()}>Close</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function formatQuote(q) {
  const parts = [
    `Quote #${q.quoteId || q._id || q.id}`,
    `Date: ${new Date(q.createdAt).toLocaleString()}`,
    q.service === '3dprinting' && q.specs3d
      ? `Specs: ${q.specs3d.tech?.toUpperCase()} ${q.specs3d.dims?.xMm}x${q.specs3d.dims?.yMm}x${q.specs3d.dims?.zMm}mm, ${q.specs3d.material}, ${q.specs3d.resolution}, Qty ${q.specs3d.quantity}`
      : q.service === 'pcb_assembly' && q.specsAssembly
      ? `Specs: ${(q.specsAssembly.assemblyType || '').toUpperCase()} assembly, ${q.specsAssembly.componentCount} components, ${q.specsAssembly.boardWidthMm}x${q.specsAssembly.boardHeightMm}mm panels, Qty ${q.specsAssembly.quantity}`
      : q.service === 'wire_harness' && q.specsHarness
      ? `Specs: ${q.specsHarness.wireCount} wires, ${q.specsHarness.connectorCount} connectors, ${q.specsHarness.wireGauge} gauge, ${q.specsHarness.harnessType} harness, Qty ${q.specsHarness.quantity}`
      : q.specs
      ? `Specs: ${q.specs.layers}L ${q.specs.widthMm}x${q.specs.heightMm}mm, ${q.specs.material}, ${q.specs.finish}, Qty ${q.specs.quantity}`
      : 'Specs: -',
    `Delivery: ${q.delivery?.speed}`,
    `BOM lines: ${q.bomStats?.totalLines ?? 0}`,
    `Total: ${formatInr(
      (q.adminQuote?.total != null ? q.adminQuote.total : q.quote?.total) || 0
    )} ${q.adminQuote?.currency || q.quote?.currency || 'INR'}`,
  ];
  return parts.join('\n');
}

export default DashboardPage;
