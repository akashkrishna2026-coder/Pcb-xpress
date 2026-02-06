import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api, getApiBaseUrl } from '@/lib/api';
import { formatInr } from '@/lib/currency';
import { getToken } from '@/lib/storage';

// Fallback bank transfer details (used if backend isn't configured yet)
const DEFAULT_PAYMENT_METHOD = {
  type: 'bank_transfer',
  bankName: 'STATE BANK OF INDIA, PALARIVATTOM, ERNAKULAM',
  accountNumber: '42037350382',
  ifscCode: 'SBIN0004312',
  beneficiaryName: 'PCB Xpress',
  qrCode: null,
};

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('bank_transfer');

  const quote = location.state?.quote;
  const order = location.state?.order;
  const paymentItem = quote || order;

  useEffect(() => {
    if (!paymentItem) {
      navigate('/dashboard');
      return;
    }

    loadPaymentMethod();
  }, [paymentItem, navigate]);

  const loadPaymentMethod = async () => {
    try {
      const res = await api.getPaymentMethod();
      const pm = res?.paymentMethod;
      if (!pm || (!pm.bankName && !pm.accountNumber && !pm.ifscCode)) {
        setPaymentMethod(DEFAULT_PAYMENT_METHOD);
      } else {
        setPaymentMethod({ ...DEFAULT_PAYMENT_METHOD, ...pm });
      }
    } catch (err) {
      // Use fallback so user can still see bank details
      setPaymentMethod(DEFAULT_PAYMENT_METHOD);
      toast({ title: 'Note', description: 'Using default bank details. Contact support if you need assistance.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: 'Invalid file type', description: 'Please upload a JPEG, PNG, GIF, or PDF file.' });
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Please upload a file smaller than 5MB.' });
        return;
      }
      setProofFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedPaymentMethod === 'bank_transfer' && !proofFile) {
      toast({ title: 'Missing proof', description: 'Please upload proof of payment.' });
      return;
    }

    setSubmitting(true);
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append('paymentMethod', selectedPaymentMethod);

      if (selectedPaymentMethod === 'bank_transfer') {
        fd.append('proof', proofFile);
      }

      if (quote) {
        // Backend expects a database ID; send _id if available, falling back to id, then quoteId last
        fd.append('quoteId', (quote._id || quote.id || quote.quoteId));
      } else if (order) {
        fd.append('orderId', order.id);
      }

      await api.uploadPaymentProof(fd, token);
      toast({
        title: 'Payment proof submitted',
        description: 'We will verify your payment and process your order shortly.'
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Payment submission error:', err);
      toast({ title: 'Submission failed', description: err.message || 'An error occurred while submitting payment.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading payment details...</div>
      </div>
    );
  }

  if (!paymentMethod) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Payment Method Not Available</h2>
              <p className="text-muted-foreground mb-4">
                Payment details are not configured yet. Please contact support.
              </p>
              <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const total = quote ? (quote.adminQuote?.total || quote.quote?.total || 0) : (order?.amounts?.total || 0);

  const serviceLabels = {
    pcb: 'PCB Manufacturing',
    pcb_assembly: 'PCB Assembly',
    wire_harness: 'Wire Harness',
    '3dprinting': '3D Printing',
    testing: 'Testing',
  };

  const summarizeQuote = (q) => {
    if (!q) return '';
    if (q.service === '3dprinting' && q.specs3d) {
      const dims = q.specs3d.dims || {};
      return `${q.specs3d.tech?.toUpperCase()} ${dims.xMm} x ${dims.yMm} x ${dims.zMm}mm · ${q.specs3d.material} · Qty ${q.specs3d.quantity}`;
    }
    if (q.service === 'pcb_assembly' && q.specsAssembly) {
      return `${(q.specsAssembly.assemblyType || '').toUpperCase()} assembly · ${q.specsAssembly.componentCount} components · ${q.specsAssembly.boardWidthMm} x ${q.specsAssembly.boardHeightMm}mm · Qty ${q.specsAssembly.quantity}`;
    }
    if (q.service === 'wire_harness' && q.specsHarness) {
      return `${q.specsHarness.wireCount} wires · ${q.specsHarness.connectorCount} connectors · ${q.specsHarness.wireGauge} gauge · Qty ${q.specsHarness.quantity}`;
    }
    if (q.specs) {
      return `${q.specs.layers}L ${q.specs.widthMm} x ${q.specs.heightMm}mm · ${q.specs.material} · ${q.specs.finish} · Qty ${q.specs.quantity}`;
    }
    return '';
  };

  const quoteSummary = quote ? summarizeQuote(quote) : '';

  return (
    <>
      <Helmet>
        <title>Payment | PCB Xpress</title>
        <meta name="description" content="Complete your payment for PCB manufacturing or 3D printing services." />
      </Helmet>

      <section className="py-16">
        <div className="container max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">Complete Your Payment</h1>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Order/Quote Summary */}
            <Card>
              <CardHeader>
                <CardTitle>{order ? 'Order Summary' : 'Quote Summary'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{order ? 'Order ID' : 'Quote ID'}</p>
                  <p className="font-medium">{paymentItem._id || paymentItem.id}</p>
                </div>
                {quote && (
                  <div>
                    <p className="text-sm text-muted-foreground">Service</p>
                    <p className="font-medium">{serviceLabels[quote.service] || quote.service}</p>
                    {quoteSummary ? (
                      <p className="text-xs text-muted-foreground mt-1">{quoteSummary}</p>
                    ) : null}
                  </div>
                )}
                {order && (
                  <div>
                    <p className="text-sm text-muted-foreground">Items</p>
                    <p className="font-medium">{order.items?.length || 0} item(s)</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold text-green-600">{formatInr(total)}</p>
                </div>
                {quote && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <PaymentProofStatus status={quote.paymentProof?.status || 'not_submitted'} />
                    {quote.paymentProof?.status === 'submitted' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted on {quote.paymentProof.submittedAt ? new Date(quote.paymentProof.submittedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    )}
                    {quote.paymentProof?.status === 'approved' && (
                      <p className="text-xs text-green-600 mt-1">
                        Approved on {quote.paymentProof.approvedAt ? new Date(quote.paymentProof.approvedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    )}
                    {quote.paymentProof?.status === 'rejected' && (
                      <div className="text-xs text-red-600 mt-1">
                        <p>Rejected on {quote.paymentProof.rejectedAt ? new Date(quote.paymentProof.rejectedAt).toLocaleDateString() : 'N/A'}</p>
                        {quote.paymentProof.rejectionReason && (
                          <p>Reason: {quote.paymentProof.rejectionReason}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {quote?.paymentProof?.status === 'rejected'
                      ? 'Please resubmit your payment proof with the corrected information.'
                      : 'Please select your payment method and complete the payment.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={selectedPaymentMethod === 'bank_transfer'}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">Bank Transfer</span>
                  </label>
                </div>
                {selectedPaymentMethod === 'bank_transfer' && paymentMethod && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Name</p>
                      <p className="font-medium">{paymentMethod.bankName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Number</p>
                      <p className="font-medium font-mono">{paymentMethod.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">IFSC Code</p>
                      <p className="font-medium font-mono">{paymentMethod.ifscCode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Beneficiary Name</p>
                      <p className="font-medium">{paymentMethod.beneficiaryName}</p>
                    </div>
                    {paymentMethod.qrCode && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">QR Code</p>
                        <img
                          src={(() => {
                            const base = getApiBaseUrl();
                            const qr = paymentMethod.qrCode || {};
                            if (qr.filename) return `${base}/api/uploads/${encodeURIComponent(qr.filename)}`;
                            const url = qr.url || '';
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
                          alt="Payment QR Code"
                          className="w-48 h-48 object-contain border rounded"
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Proof of Payment Upload */}
          {selectedPaymentMethod === 'bank_transfer' && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>
                  {quote.paymentProof?.status === 'rejected' ? 'Resubmit Proof of Payment' : 'Upload Proof of Payment'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-sm font-medium">Payment Receipt/Screenshot</label>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a screenshot of the transaction, bank receipt, or payment confirmation (JPEG, PNG, GIF, PDF - max 5MB)
                    </p>
                    {proofFile && (
                      <p className="text-sm text-green-600 mt-2">
                        Selected: {proofFile.name} ({(proofFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      disabled={!proofFile || submitting}
                      className="flex-1"
                    >
                      {submitting ? 'Submitting...' : (quote.paymentProof?.status === 'rejected' ? 'Resubmit Payment Proof' : 'Submit Payment Proof')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/dashboard')}
                      className="flex-1"
                    >
                      Back to Dashboard
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

        </div>
      </section>
    </>
  );
};

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

export default PaymentPage;
