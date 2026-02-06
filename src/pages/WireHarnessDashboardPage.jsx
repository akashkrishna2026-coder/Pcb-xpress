import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUser, clearUser, getQuotes, removeQuote, clearQuotes, clearToken, getToken } from '@/lib/storage';
import { api } from '@/lib/api';
import { formatInr } from '@/lib/currency';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, LogOut } from 'lucide-react';

const WireHarnessDashboardPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [editQuote, setEditQuote] = useState(null);

  // Pagination states
  const [quotesPage, setQuotesPage] = useState(1);
  const [quotesLimit, setQuotesLimit] = useState(10);
  const [quotesTotal, setQuotesTotal] = useState(0);
  const [quotesPages, setQuotesPages] = useState(1);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    fetchQuotes();
  }, [quotesPage, quotesLimit]);

  const fetchQuotes = async () => {
    const t = getToken();
    if (t) {
      try {
        const res = await api.listMyQuotes(t, { limit: quotesLimit, page: quotesPage });
        // Filter for wire harness quotes only
        const wireHarnessQuotes = (res.quotes || []).filter(q => q.service === 'wire_harness');
        setQuotes(wireHarnessQuotes);
        setQuotesTotal(wireHarnessQuotes.length);
        setQuotesPages(Math.ceil(wireHarnessQuotes.length / quotesLimit));
      } catch {
        const all = getQuotes().filter(q => q.service === 'wire_harness');
        setQuotes(all);
        setQuotesTotal(all.length);
        setQuotesPages(Math.ceil(all.length / quotesLimit));
      }
    } else {
      const all = getQuotes().filter(q => q.service === 'wire_harness');
      setQuotes(all);
      setQuotesTotal(all.length);
      setQuotesPages(Math.ceil(all.length / quotesLimit));
    }
  };

  const stats = useMemo(() => {
    const total = quotesTotal;
    const lastTotal = quotes[0]?.adminQuote?.total ?? quotes[0]?.quote?.total ?? 0;
    const express = quotes.filter((q) => q.delivery?.speed === 'express').length;
    const approved = quotes.filter((q) => q.paymentProof?.status === 'approved').length;
    const manufacturing = quotes.filter((q) => q.mfgApproved).length;
    return { total, lastTotal, express, approved, manufacturing };
  }, [quotes, quotesTotal]);

  // Sort quotes by date desc
  const sortedQuotes = useMemo(() => {
    return [...quotes].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
  }, [quotes]);

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

  const handleEdit = (quote) => {
    setEditQuote(quote);
  };

  const handleClearAll = async () => {
    const t = getToken();
    if (t) {
      try {
        // Get all wire harness quotes to delete them
        const allQuotes = [];
        let page = 1;
        while (true) {
          const res = await api.listMyQuotes(t, { limit: 100, page });
          const whQuotes = (res.quotes || []).filter(q => q.service === 'wire_harness');
          if (whQuotes.length === 0) break;
          allQuotes.push(...whQuotes);
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
        <title>Wire Harness Dashboard | PCB Xpress</title>
        <meta name="description" content="Your wire harness quotes and manufacturing status." />
      </Helmet>

      <section className="py-16">
        <div className="container grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {user ? (
                  <>
                    <p>
                      <span className="font-medium">Name:</span> {user.name}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span> {user.email}
                    </p>
                    <p className="text-muted-foreground">
                      Member since {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    <div className="pt-2">
                      <Button variant="outline" className="w-full" onClick={handleLogoutClick}>
                        Sign out
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">You are not signed in.</p>
                    <div className="pt-2">
                      <Link to="/login">
                        <Button className="w-full">Sign in</Button>
                      </Link>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Wire Harness Overview</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <Metric label="Total Quotes" value={stats.total} />
                <Metric label="Express" value={stats.express} />
                <Metric label="Payment Approved" value={stats.approved} />
                <Metric label="In Manufacturing" value={stats.manufacturing} />
                <Metric label="Last total" value={formatInr(stats.lastTotal || 0)} />
                <Metric label="Currency" value="INR" />
              </CardContent>
            </Card>
          </div>

          {/* Main */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>My Wire Harness Quotes</CardTitle>
                <div className="flex gap-2">
                  <Link to="/quote?service=wire_harness">
                    <Button>New Wire Harness Quote</Button>
                  </Link>
                  <Button variant="outline" onClick={handleClearAll} disabled={quotes.length === 0}>
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {quotes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">
                      No wire harness quotes yet. Create your first wire harness quote to see it here.
                    </p>
                    <Link to="/quote?service=wire_harness">
                      <Button>Get Started</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">Specifications</th>
                          <th className="py-2 pr-4">Delivery</th>
                          <th className="py-2 pr-4">Payment Status</th>
                          <th className="py-2 pr-4">Manufacturing Status</th>
                          <th className="py-2 pr-4">Total</th>
                          <th className="py-2 pr-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedQuotes.map((q) => (
                          <tr key={q._id || q.id} className="border-b last:border-0">
                            <td className="py-3 pr-4 whitespace-nowrap">
                              {new Date(q.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 pr-4">
                              {q.specsHarness ? (
                                <>
                                  {q.specsHarness.wireCount} wires · {q.specsHarness.connectorCount} connectors · {q.specsHarness.wireGauge} · {q.specsHarness.harnessType} · Qty {q.specsHarness.quantity}
                                </>
                              ) : (
                                <span className="text-muted-foreground">(no specs)</span>
                              )}
                            </td>
                            <td className="py-3 pr-4 whitespace-nowrap">
                              {q.delivery?.speed === 'express' ? 'Express' : 'Standard'}
                            </td>
                            <td className="py-3 pr-4 whitespace-nowrap">
                              <PaymentProofStatus status={q.paymentProof?.status || 'not_submitted'} />
                            </td>
                            <td className="py-3 pr-4 whitespace-nowrap">
                              {q.mfgApproved ? (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  In Manufacturing
                                </span>
                              ) : q.paymentProof?.status === 'approved' ? (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Ready for Manufacturing
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Pending Payment
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-4 whitespace-nowrap">
                              {formatInr(
                                (q.adminQuote?.total != null ? q.adminQuote.total : q.quote?.total) || 0
                              )}
                            </td>
                            <td className="py-3 pr-2">
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setSelectedQuote(q)}>
                                  View Quotation
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(q)}
                                >
                                  Edit Quote
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-3">
                    {sortedQuotes.map((q) => (
                      <div key={q._id || q.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>{new Date(q.createdAt).toLocaleString()}</span>
                          <span className="uppercase font-medium">WH</span>
                        </div>
                        <div className="text-sm mb-2">
                          {q.specsHarness ? (
                            <>
                              {q.specsHarness.wireCount} wires · {q.specsHarness.connectorCount} connectors · {q.specsHarness.wireGauge} · {q.specsHarness.harnessType} · Qty {q.specsHarness.quantity}
                            </>
                          ) : (
                            <span className="text-muted-foreground">(no specs)</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>{q.delivery?.speed === 'express' ? 'Express' : 'Standard'}</span>
                          <PaymentProofStatus status={q.paymentProof?.status || 'not_submitted'} />
                          <span className="font-semibold">{formatInr((q.adminQuote?.total != null ? q.adminQuote.total : q.quote?.total) || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            {q.mfgApproved ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                In Manufacturing
                              </span>
                            ) : q.paymentProof?.status === 'approved' ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Ready for Manufacturing
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Pending Payment
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedQuote(q)}>View</Button>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(q)}>Edit</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}

                {/* Pagination */}
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

            <Card>
              <CardHeader>
                <CardTitle>Wire Harness Manufacturing Process</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>• <strong>Quote Submission:</strong> Submit your wire harness specifications and requirements</p>
                  <p>• <strong>Admin Review:</strong> Our team reviews and provides a formal quote</p>
                  <p>• <strong>Payment:</strong> Submit 50% advance payment and upload proof</p>
                  <p>• <strong>Manufacturing Approval:</strong> Admin approves and creates work order</p>
                  <p>• <strong>Production:</strong> Wire harness assembly begins in our manufacturing facility</p>
                  <p>• <strong>Quality Control:</strong> Final inspection and testing before dispatch</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* View Quotation Modal */}
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedQuote && (
            <div className="p-6 text-sm">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold">PCB Xpress</h2>
                  <p>PCB Xpress<br />
                  Mobility House<br />
                  1x/92 C, Puthiya Road, near NSS Karayogam Hall, Eroor PO<br />
                  Thripunithura 682306, India</p>
                  <p>Email: support@pcbxpress.in</p>
                </div>
                <div className="text-right text-xs">
                  <p>Date: {new Date(selectedQuote.createdAt).toLocaleDateString()}</p>
                  <p>Quote ID: {selectedQuote.quoteId || selectedQuote._id || selectedQuote.id}</p>
                </div>
              </div>

              {/* Quote For */}
              <div className="mb-6">
                <p className="font-semibold">Quote For</p>
                <p>{user?.name}</p>
                <p>{user?.email}</p>
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
                      {selectedQuote.specsHarness
                        ? `Wire Harness (${selectedQuote.specsHarness.wireCount} wires · ${selectedQuote.specsHarness.connectorCount} connectors · ${selectedQuote.specsHarness.wireGauge} · ${selectedQuote.specsHarness.harnessType})`
                        : 'Wire Harness'}
                    </td>
                    <td className="p-2 border">
                      {selectedQuote.specsHarness?.quantity || 1}
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

              {/* Notes */}
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

              {/* Manufacturing Status */}
              <div className="mb-6">
                <p className="font-semibold mb-2">Manufacturing Status</p>
                <div className="flex items-center gap-4">
                  {selectedQuote.mfgApproved ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      In Manufacturing
                    </span>
                  ) : selectedQuote.paymentProof?.status === 'approved' ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Ready for Manufacturing
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Pending Payment Approval
                    </span>
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

              {/* Pay and Proceed Button */}
              {selectedQuote.adminQuote?.total && (!selectedQuote.paymentProof || selectedQuote.paymentProof.status === 'not_submitted' || selectedQuote.paymentProof.status === 'rejected') && (
                <div className="flex justify-center mb-6">
                  <Button
                    onClick={() => {
                      setSelectedQuote(null);
                      navigate('/payment', { state: { quote: selectedQuote } });
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {selectedQuote.paymentProof?.status === 'rejected' ? 'Resubmit Payment Proof' : 'Pay and Proceed'}
                  </Button>
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

                {/* Wire Harness Specifications */}
                {editQuote.service === 'wire_harness' && editQuote.specsHarness && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Wire Harness Specifications</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Wire Count</label>
                        <input
                          type="number"
                          value={editQuote.specsHarness.wireCount || ''}
                          onChange={(e) => setEditQuote(prev => ({
                            ...prev,
                            specsHarness: { ...prev.specsHarness, wireCount: Number(e.target.value) }
                          }))}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Connector Count</label>
                        <input
                          type="number"
                          value={editQuote.specsHarness.connectorCount || ''}
                          onChange={(e) => setEditQuote(prev => ({
                            ...prev,
                            specsHarness: { ...prev.specsHarness, connectorCount: Number(e.target.value) }
                          }))}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-sm font-medium">Board Width (mm)</label>
                          <input
                            type="number"
                            value={editQuote.specsHarness.boardWidthMm || ''}
                            onChange={(e) => setEditQuote(prev => ({
                              ...prev,
                              specsHarness: { ...prev.specsHarness, boardWidthMm: Number(e.target.value) }
                            }))}
                            className="w-full px-3 py-2 border rounded-md"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Board Height (mm)</label>
                          <input
                            type="number"
                            value={editQuote.specsHarness.boardHeightMm || ''}
                            onChange={(e) => setEditQuote(prev => ({
                              ...prev,
                              specsHarness: { ...prev.specsHarness, boardHeightMm: Number(e.target.value) }
                            }))}
                            className="w-full px-3 py-2 border rounded-md"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Quantity</label>
                        <input
                          type="number"
                          value={editQuote.specsHarness.quantity || ''}
                          onChange={(e) => setEditQuote(prev => ({
                            ...prev,
                            specsHarness: { ...prev.specsHarness, quantity: Number(e.target.value) }
                          }))}
                          className="w-full px-3 py-2 border rounded-md"
                        />
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

              <DialogFooter className="gap-2">
                <Button 
                  onClick={async () => {
                    try {
                      const t = getToken();
                      if (t && editQuote) {
                        await api.updateQuoteCustomer(editQuote._id || editQuote.id, t, {
                          specs: editQuote.specs,
                          specsHarness: editQuote.specsHarness,
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
                >
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditQuote(null)}>Cancel</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
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

export default WireHarnessDashboardPage;