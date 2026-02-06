import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';

const FlashingControllerPanel = ({ workOrder, token, onWorkOrderUpdated }) => {
  const { toast } = useToast();
  const workOrderId = workOrder?._id || workOrder?.id;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [updating, setUpdating] = useState(false);

  const controller = useMemo(
    () => workOrder?.flashingParams?.controller || null,
    [workOrder]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let ignore = false;
    const loadProducts = async () => {
      if (!token) {
        setProducts([]);
        return;
      }
      setLoadingProducts(true);
      try {
        const { items } = await api.listProducts({
          q: debouncedSearch,
          limit: 25,
          offset: 0,
        });
        if (!ignore) {
          setProducts(Array.isArray(items) ? items : []);
        }
      } catch (err) {
        if (!ignore) {
          setProducts([]);
          toast({
            title: 'Failed to load controller catalog',
            description: err?.message || 'Unable to fetch product list.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!ignore) setLoadingProducts(false);
      }
    };
    loadProducts();
    return () => {
      ignore = true;
    };
  }, [debouncedSearch, refreshCounter, token, toast]);

  const updateController = async (nextController) => {
    if (!token || !workOrderId) {
      toast({
        title: 'Not authorised',
        description: 'Sign in again to update controller selection.',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);
    try {
      const payload = {
        flashingParams: {
          ...(workOrder?.flashingParams || {}),
          controller: nextController,
        },
      };
      const res = await api.mfgUpdateWorkOrder(token, workOrderId, payload);
      if (res?.workOrder) {
        onWorkOrderUpdated?.(res.workOrder);
      } else {
        onWorkOrderUpdated?.({
          _id: workOrderId,
          flashingParams: payload.flashingParams,
        });
      }
      toast({
        title: nextController ? 'Controller assigned' : 'Controller cleared',
        description: nextController
          ? `${nextController.name || 'Controller'} linked to this work order.`
          : 'Controller selection removed.',
      });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err?.message || 'Unable to update controller selection.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSelectController = async (product) => {
    if (!product) return;
    const controllerInfo = {
      productId: product?.id ?? product?.externalId ?? product?._docId ?? null,
      name: product?.name || 'Unnamed Controller',
      sku: product?.product_id || product?.products?.name || null,
      description: product?.description || '',
      units: product?.units || product?.sub_units || '',
      imageUrl: product?.image_url || null,
      store: product?.stores?.name || '',
      reference: product?.box_no || '',
      linkedAt: new Date().toISOString(),
    };
    await updateController(controllerInfo);
  };

  const handleClear = async () => {
    await updateController(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Controller Selection</CardTitle>
            <p className="text-sm text-muted-foreground">
              Link this build to a controller from the master product catalog.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshCounter((value) => value + 1)}
            disabled={loadingProducts}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingProducts ? 'animate-spin' : ''}`} />
            Refresh List
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Current Controller</p>
                {controller ? (
                  <div className="mt-1 text-sm">
                    <div className="font-medium text-gray-900">{controller.name || 'Unnamed'}</div>
                    <div className="text-xs text-muted-foreground">
                      {controller.sku ? `SKU: ${controller.sku}` : null}
                      {controller.reference ? ` • Ref: ${controller.reference}` : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {controller.units ? `Units: ${controller.units}` : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">No controller selected yet.</p>
                )}
              </div>
              {controller ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClear}
                  disabled={updating}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              ) : null}
            </div>
            {controller?.linkedAt ? (
              <p className="text-xs text-muted-foreground">
                Linked on {new Date(controller.linkedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search controllers, SKU, or description"
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearch('')}
              disabled={!search}
            >
              Clear
            </Button>
          </div>

          <div className="space-y-2">
            {loadingProducts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading product catalog…
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-muted-foreground">
                No products match this search.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {products.map((product) => (
                  <div
                    key={`${product.id || product.externalId || product._docId}`}
                    className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {product.name || 'Unnamed Product'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {product.product_id ? `SKU: ${product.product_id}` : null}
                      {product.box_no ? ` • Ref: ${product.box_no}` : null}
                    </div>
                    {product.description ? (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                        {product.description}
                      </p>
                    ) : null}
                    <div className="mt-3">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleSelectController(product)}
                        disabled={updating}
                      >
                        Assign Controller
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FlashingControllerPanel;
