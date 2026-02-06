import React, { useEffect, useMemo, useState } from 'react';
import { formatInr } from '@/lib/currency';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { getCart, setCart, updateCartItem, removeCartItem, clearCart, getToken } from '@/lib/storage';
import { Cpu, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';

const CartPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState(() => getCart());

  useEffect(() => {
    const onEvt = (e) => {
      const arr = e?.detail?.items;
      if (Array.isArray(arr)) setItems(arr);
      else setItems(getCart());
    };
    window.addEventListener('px:cart-changed', onEvt);
    return () => window.removeEventListener('px:cart-changed', onEvt);
  }, []);

  const total = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0);
  }, [items]);

  const setQty = (identifier, qty) => {
    const q = Math.max(1, Number(qty) || 1);
    updateCartItem(identifier, { quantity: q });
    // local state will update from event; optimistically update to feel snappy
    setItems((prev) => prev.map((it) => ((it.part || it.id || it.name) === identifier ? { ...it, quantity: q } : it)));
  };

  const remove = (identifier) => {
    removeCartItem(identifier);
    setItems((prev) => prev.filter((it) => (it.part || it.id || it.name) !== identifier));
    toast({ title: 'Removed', description: `${identifier} removed from cart.` });
  };

  const clear = () => {
    clearCart();
    setItems([]);
    toast({ title: 'Cart cleared' });
  };

  return (
    <>
      <Helmet>
        <title>Your Cart | PCB Xpress</title>
        <meta name="description" content="Review items in your cart." />
      </Helmet>

      <section className="pt-28 md:pt-36 pb-6 bg-secondary">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter flex items-center gap-2">
            <ShoppingCart className="h-7 w-7" /> Your Cart
          </h1>
          <p className="text-muted-foreground mt-1">Parts you added from the catalog.</p>
        </div>
      </section>

      <section className="py-10">
        <div className="container grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Your cart is empty.</p>
                  <Button className="mt-4" onClick={() => navigate('/components')}>Browse Components</Button>
                </CardContent>
              </Card>
            ) : (
              items.map((it) => (
                <CartItem key={it.part || it.id || it.name} item={it} onQty={(q) => setQty(it.part || it.id || it.name, q)} onRemove={() => remove(it.part || it.id || it.name)} />
              ))
            )}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Items</span>
                  <span>{items.reduce((n, it) => n + (it.quantity || 1), 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatInr(total)}</span>
                </div>
                <div className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="w-1/2" onClick={() => navigate('/components')}>Continue</Button>
                  <Button
                    className="w-1/2"
                    onClick={() => {
                      if (items.length === 0) {
                        toast({ title: 'Cart is empty', description: 'Add items before checkout.' });
                        return;
                      }
                      const t = getToken();
                      if (!t) {
                        navigate('/login', { state: { from: '/checkout' } });
                      } else {
                        navigate('/checkout');
                      }
                    }}
                  >
                    Checkout
                  </Button>
                </div>
                {items.length > 0 && (
                  <Button variant="outline" className="w-full" onClick={clear}>Clear Cart</Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
};

const CartItem = ({ item, onQty, onRemove }) => {
  return (
    <Card>
      <CardContent className="py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="h-16 w-16 rounded bg-accent/20 flex items-center justify-center overflow-hidden shrink-0">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={`${item.name}`}
              className="max-h-14 w-auto object-contain mix-blend-multiply dark:mix-blend-normal"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <Cpu className="h-6 w-6 opacity-40" />
          )}
        </div>
        <div className="flex-1 min-w-0 w-full">
          <div className="font-medium truncate">{item.name}</div>
          <div className="text-sm text-muted-foreground">{item.products?.name || item.stores?.name || 'N/A'}</div>
          <div className="text-sm mt-1">{formatInr(item.price)} each</div>
        </div>

        {/* Desktop/tablet actions */}
        <div className="hidden sm:flex items-center gap-2 ml-auto">
          <Button size="icon" variant="outline" onClick={() => onQty(Math.max(1, (item.quantity || 1) - 1))} aria-label="Decrease">
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min="1"
            className="w-16 text-center"
            value={item.quantity || 1}
            onChange={(e) => onQty(e.target.value)}
          />
          <Button size="icon" variant="outline" onClick={() => onQty((item.quantity || 1) + 1)} aria-label="Increase">
            <Plus className="h-4 w-4" />
          </Button>
          <div className="w-24 text-right font-medium">
            {formatInr(((item.price || 0) * (item.quantity || 1)) || 0)}
          </div>
          <Button size="icon" variant="outline" onClick={onRemove} aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile actions */}
        <div className="sm:hidden w-full mt-2">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => onQty(Math.max(1, (item.quantity || 1) - 1))} aria-label="Decrease">
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min="1"
              className="w-20 text-center"
              value={item.quantity || 1}
              onChange={(e) => onQty(e.target.value)}
            />
            <Button size="icon" variant="outline" onClick={() => onQty((item.quantity || 1) + 1)} aria-label="Increase">
              <Plus className="h-4 w-4" />
            </Button>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right font-medium">
                {formatInr(((item.price || 0) * (item.quantity || 1)) || 0)}
              </div>
              <Button size="icon" variant="outline" onClick={onRemove} aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CartPage;
