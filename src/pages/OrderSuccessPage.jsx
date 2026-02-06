import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatInr } from '@/lib/currency';

const OrderSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const orderId = params.get('orderId') || params.get('id');

  const [order, setOrder] = useState(() => {
    try {
      const raw = sessionStorage.getItem('last_placed_order');
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  });

  // If stored order doesn't match the query param, ignore it
  useEffect(() => {
    if (!orderId) return;
    if (order && (order._id === orderId || order.id === orderId)) return;
    setOrder(null);
  }, [orderId]);

  const total = useMemo(() => order?.amounts?.total || 0, [order]);
  const itemCount = useMemo(() => order?.items?.length || 0, [order]);

  return (
    <>
      <Helmet>
        <title>Order Placed | PCB Xpress</title>
        <meta name="description" content="Your order was placed successfully." />
      </Helmet>

      <section className="pt-28 md:pt-36 pb-6 bg-secondary">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter">Thank you!</h1>
          <p className="text-muted-foreground mt-1">Your order has been placed successfully.</p>
        </div>
      </section>

      <section className="py-10">
        <div className="container max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Order Confirmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderId && (
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-mono font-medium break-all">{orderId}</p>
                </div>
              )}

              {order ? (
                <>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Items</p>
                      <p className="font-medium">{itemCount} item(s)</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-medium">{formatInr(total)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium">Pending</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    We have received your payment proof. Our team will verify it and update your order status shortly.
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  We have received your order. You can view details in your dashboard.
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button className="flex-1" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
                <Button variant="outline" className="flex-1" onClick={() => navigate('/components')}>Continue Shopping</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

export default OrderSuccessPage;

