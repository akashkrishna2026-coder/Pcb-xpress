import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCart, clearCart, getUser, getToken } from '@/lib/storage';
import { api, getApiBaseUrl } from '@/lib/api';
import { formatInr } from '@/lib/currency';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [items, setItems] = useState(() => getCart());
  const [placing, setPlacing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('bank_transfer');
  const [proofFile, setProofFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const user = getUser();

  const [form, setForm] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
  });

  useEffect(() => {
    const t = getToken();
    if (!t) {
      navigate('/login', { state: { from: '/checkout' }, replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const onEvt = (e) => {
      const arr = e?.detail?.items;
      if (Array.isArray(arr)) setItems(arr);
      else setItems(getCart());
    };
    window.addEventListener('px:cart-changed', onEvt);
    return () => window.removeEventListener('px:cart-changed', onEvt);
  }, []);

  const subtotal = useMemo(() => items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0), [items]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

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

  const handleProofUpload = async () => {
    if (!proofFile) {
      toast({ title: 'Missing proof', description: 'Please upload proof of payment.' });
      return;
    }

    if (!placedOrder?._id) {
      toast({ title: 'Order not found', description: 'Please refresh the page and try again.' });
      return;
    }

    setUploadingProof(true);
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append('proof', proofFile);
      fd.append('orderId', placedOrder._id); // Use the database ID

      // Upload proof to server
      await api.uploadPaymentProof(fd, token);

      toast({
        title: 'Payment proof submitted',
        description: 'We will verify your payment and process your order shortly.'
      });

      // Close the modal and redirect to dashboard
      setShowConfirmation(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Proof upload error:', err);
      toast({
        title: 'Submission failed',
        description: err.message || 'There was an error submitting your proof. Please try again.'
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const proceedToCheckout = async () => {
    if (!items.length) {
      toast({ title: 'Cart is empty', description: 'Add items before placing an order.' });
      navigate('/components');
      return;
    }
    if (!form.fullName || !form.email || !form.address1 || !form.city || !form.state || !form.postalCode || !form.country) {
      toast({ title: 'Missing details', description: 'Please fill in required shipping fields.' });
      return;
    }

    const t = getToken();
    if (!t) {
      toast({ title: 'Authentication required', description: 'Please log in to place an order.' });
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

    // Load payment method details and show checkout popup for bank transfer
    try {
      const paymentRes = await api.getPaymentMethod();
      setPaymentMethod(paymentRes.paymentMethod);
      setShowCheckout(true);
    } catch (err) {
      console.error('Could not load payment method:', err);
      toast({ title: 'Error', description: 'Could not load payment details. Please try again.' });
    }
  };

  const placeOrderWithProof = async () => {
    if (!proofFile) {
      toast({ title: 'Missing proof', description: 'Please upload proof of payment.' });
      return;
    }

    setUploadingProof(true);
    try {
      const t = getToken();

      // Create order data
      const orderData = {
        items: items.map((it) => ({ part: it.part, name: it.name, mfr: it.mfr, price: it.price || 0, quantity: it.quantity || 1, img: it.img || null })),
        amounts: { subtotal, shipping: 0, taxes: 0, total: subtotal },
        shipping: { ...form },
        paymentMethod: 'bank_transfer',
      };

      // Send to server - this should create the order in database
      console.log('Sending orderData.paymentMethod:', orderData.paymentMethod);
      const serverResponse = await api.createOrder(orderData, t);

      // Create local order object for UI
      const order = {
        id: serverResponse.order.id,
        createdAt: new Date().toISOString(),
        user: user ? { id: user.id, name: user.name, email: user.email } : null,
        items: orderData.items,
        amounts: orderData.amounts,
        shipping: orderData.shipping,
        paymentMethod: 'bank_transfer',
        status: 'Pending',
        _id: serverResponse.order.id, // Store the database ID
      };

      // Upload payment proof
      const fd = new FormData();
      fd.append('proof', proofFile);
      fd.append('orderId', order._id);

      await api.uploadPaymentProof(fd, t);

      clearCart();
      setPlacedOrder(order);
      setShowCheckout(false);
      try { sessionStorage.setItem('last_placed_order', JSON.stringify(order)); } catch (_) {}
      toast({ title: 'Order placed successfully!', description: 'Your payment proof has been submitted.' });
      navigate(`/order-success?orderId=${encodeURIComponent(order._id || order.id)}`);
    } catch (err) {
      console.error('Order placement error:', err);
      toast({ title: 'Could not place order', description: err.message || 'Please try again.' });
    } finally {
      setUploadingProof(false);
    }
  };


  return (
    <>
      <Helmet>
        <title>Checkout | PCB Xpress</title>
        <meta name="description" content="Checkout and place your order." />
      </Helmet>
      <section className="pt-28 md:pt-36 pb-6 bg-secondary">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter">Checkout</h1>
          <p className="text-muted-foreground mt-1">Enter shipping details and review your order.</p>
        </div>
      </section>

      <section className="py-10">
        <div className="container grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Full name*</label>
                    <Input name="fullName" value={form.fullName} onChange={onChange} placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email*</label>
                    <Input name="email" type="email" value={form.email} onChange={onChange} placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone*</label>
                    <Input name="phone" value={form.phone} onChange={onChange} placeholder="+1 555 123 4567" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Address line 1</label>
                  <Input name="address1" value={form.address1} onChange={onChange} placeholder="Street address" />
                </div>
                <div>
                  <label className="text-sm font-medium">Address line 2</label>
                  <Input name="address2" value={form.address2} onChange={onChange} placeholder="Apt, suite, etc. (optional)" />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input name="city" value={form.city} onChange={onChange} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State/Province</label>
                    <Input name="state" value={form.state} onChange={onChange} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Postal code</label>
                    <Input name="postalCode" value={form.postalCode} onChange={onChange} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Input name="country" value={form.country} onChange={onChange} />
                </div>
                <div className="text-xs text-muted-foreground">Payment collection is not enabled in this demo. We will email an invoice after confirming availability.</div>

                {/* Payment Method Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Payment Method</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bank_transfer"
                        checked={selectedPaymentMethod === 'bank_transfer'}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Bank Transfer</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate('/cart')}>Back to Cart</Button>
                  <Button onClick={proceedToCheckout} disabled={placing}>{placing ? 'Loading…' : 'Proceed to Checkout'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No items in cart.</div>
                ) : (
                  items.map((it) => (
                    <div key={it.part} className="flex items-center justify-between text-sm">
                      <div className="truncate mr-2">
                        <div className="font-medium truncate">{it.part}</div>
                        <div className="text-muted-foreground">Qty {it.quantity || 1} × {formatInr(it.price)}</div>
                      </div>
                      <div className="font-medium">{formatInr(((it.price || 0) * (it.quantity || 1)) || 0)}</div>
                    </div>
                  ))
                )}
                <div className="border-t pt-3 mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatInr(subtotal)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>Calculated later</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Taxes</span><span>Calculated later</span></div>
                  <div className="flex justify-between font-semibold text-base pt-2"><span>Total</span><span>{formatInr(subtotal)}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Checkout & Payment Modal */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-blue-600 text-xl">Complete Your Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-xl font-bold text-blue-600">{formatInr(subtotal)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Items</p>
                  <p className="font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-center">Payment & Order Confirmation</h3>

              {paymentMethod ? (
                <div className="space-y-4">
                  {/* Payment Details */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-medium">Bank Transfer Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bank Name:</span>
                          <span className="font-medium">{paymentMethod.bankName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account Number:</span>
                          <span className="font-mono font-medium">{paymentMethod.accountNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IFSC Code:</span>
                          <span className="font-mono font-medium">{paymentMethod.ifscCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Beneficiary:</span>
                          <span className="font-medium">{paymentMethod.beneficiaryName}</span>
                        </div>
                      </div>
                    </div>

                    {paymentMethod.qrCode ? (
                      <div className="flex flex-col items-center">
                        <h4 className="font-medium mb-2">QR Code</h4>
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
                          className="w-32 h-32 object-contain border rounded"
                          onError={(e) => {
                            console.error('QR Code failed to load:', paymentMethod.qrCode.url);
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <h4 className="font-medium mb-2">Payment Method</h4>
                        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                          <div className="text-center text-xs text-muted-foreground">
                            <div>💳</div>
                            <div>Bank Transfer</div>
                            <div className="mt-1 text-xs">No QR code uploaded</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Instructions */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💳 Please make the payment using the bank transfer details above{paymentMethod?.qrCode ? ' or by scanning the QR code' : ''}.
                      <br />
                      📎 Upload your payment proof below to complete your order.
                      <br />
                      📦 Your order will be placed immediately after proof submission.
                    </p>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium">Upload Payment Proof</label>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a screenshot of the transaction, bank receipt, or payment confirmation (JPEG, PNG, GIF, PDF - max 5MB)
                    </p>
                    {proofFile && (
                      <p className="text-sm text-green-600">
                        Selected: {proofFile.name} ({(proofFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCheckout(false);
                        navigate('/cart');
                      }}
                      className="flex-1"
                      disabled={uploadingProof}
                    >
                      Back to Cart
                    </Button>
                    <Button
                      onClick={placeOrderWithProof}
                      disabled={!proofFile || uploadingProof}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {uploadingProof ? 'Placing Order...' : 'Submit and Place Order'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">
                    <p>Loading payment details...</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCheckout(false);
                      navigate('/cart');
                    }}
                  >
                    Back to Cart
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
};

export default CheckoutPage;
