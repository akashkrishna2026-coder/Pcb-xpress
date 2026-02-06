import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Loader2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

const mapTrayComponent = (item) => ({
  productId: item?.productId ?? item?.externalId ?? item?.id ?? '',
  externalId: item?.externalId ?? item?.id ?? null,
  name: item?.name || 'Unnamed Component',
  description: item?.description || '',
  units: item?.units || item?.sub_units || 'pcs',
  reference: item?.reference || item?.box_no || '',
  quantity: Number.isFinite(Number(item?.quantity)) ? Number(item.quantity) : 1,
  notes: item?.notes || '',
});

const ThTrayComponentsPanel = ({ workOrder, token, onWorkOrderUpdated }) => {
  const { toast } = useToast();
  const [localWorkOrder, setLocalWorkOrder] = useState(workOrder || null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setLocalWorkOrder(workOrder || null);
  }, [workOrder]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let ignore = false;
    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const { items } = await api.listProducts({
          q: debouncedSearch,
          limit: 50,
          offset: 0,
        });
        if (!ignore) {
          setProducts(Array.isArray(items) ? items : []);
        }
      } catch (err) {
        if (!ignore) {
          setProducts([]);
          toast({
            title: 'Failed to load components',
            description: err?.message || 'Unable to fetch products from catalog.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!ignore) {
          setLoadingProducts(false);
        }
      }
    };

    loadProducts();
    return () => {
      ignore = true;
    };
  }, [debouncedSearch, refreshCounter, toast]);

  const trayComponents = useMemo(() => {
    if (!localWorkOrder?.thSolderingParams?.trayComponents) return [];
    return localWorkOrder.thSolderingParams.trayComponents.map(mapTrayComponent);
  }, [localWorkOrder]);

  const [draftValues, setDraftValues] = useState([]);

  useEffect(() => {
    setDraftValues(
      trayComponents.map((component) => ({
        quantity: component.quantity,
        notes: component.notes,
      }))
    );
  }, [trayComponents]);

  const updateTrayComponents = async (nextComponents) => {
    if (!token) {
      toast({
        title: 'Not authenticated',
        description: 'Sign in again to update tray components.',
        variant: 'destructive',
      });
      return;
    }

    if (!localWorkOrder) return;

    setUpdating(true);
    try {
      const payload = {
        thSolderingParams: {
          ...(localWorkOrder.thSolderingParams || {}),
          trayComponents: nextComponents.map(mapTrayComponent),
        },
      };

      const result = await api.mfgUpdateWorkOrder(
        token,
        localWorkOrder._id || localWorkOrder.id,
        payload
      );

      const updated = result?.workOrder || {
        ...localWorkOrder,
        thSolderingParams: payload.thSolderingParams,
      };

      setLocalWorkOrder(updated);
      setDraftValues(
        (updated.thSolderingParams?.trayComponents || []).map(mapTrayComponent).map((component) => ({
          quantity: component.quantity,
          notes: component.notes,
        }))
      );
      onWorkOrderUpdated?.(updated);

      toast({
        title: 'Tray components updated',
        description: 'Component assignments saved.',
      });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err?.message || 'Unable to update tray components.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleAddComponent = async (product) => {
    const productId = product?.externalId ?? product?.id ?? product?._docId;
    if (!productId) {
      toast({
        title: 'Missing identifier',
        description: 'Selected product does not have a valid id.',
        variant: 'destructive',
      });
      return;
    }

    if (trayComponents.some((item) => item.productId === productId || item.externalId === productId)) {
      toast({
        title: 'Already added',
        description: 'This component is already part of the tray list.',
      });
      return;
    }

    const next = [
      ...trayComponents,
      {
        productId,
        externalId: product?.externalId ?? product?.id ?? null,
        name: product?.name || 'Unnamed Component',
        description: product?.description || '',
        units: product?.units || product?.sub_units || 'pcs',
        reference: product?.box_no || product?.products?.name || '',
        quantity: 1,
        notes: '',
      },
    ];

    await updateTrayComponents(next);
  };

  const handleRemoveComponent = async (index) => {
    const next = trayComponents.filter((_, idx) => idx !== index);
    await updateTrayComponents(next);
  };

  const handleApplyDraft = async (index) => {
    if (!Number.isFinite(Number(draftValues[index]?.quantity)) || Number(draftValues[index]?.quantity) <= 0) {
      toast({
        title: 'Invalid quantity',
        description: 'Quantity must be a positive number.',
        variant: 'destructive',
      });
      return;
    }

    const next = trayComponents.map((item, idx) =>
      idx === index
        ? {
            ...item,
            quantity: Number(draftValues[idx]?.quantity) || 1,
            notes: draftValues[idx]?.notes || '',
          }
        : item
    );

    await updateTrayComponents(next);
  };

  const handleDraftChange = (index, field, value) => {
    setDraftValues((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: field === 'quantity' ? value : value,
      };
      return next;
    });
  };

  const handleRefreshProducts = () => setRefreshCounter((value) => value + 1);

  if (!workOrder) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tray Components</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a work order to manage tray components.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assigned Tray Components</CardTitle>
        </CardHeader>
        <CardContent>
          {trayComponents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tray components assigned to this work order yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Component</th>
                    <th className="py-2 pr-3">Units</th>
                    <th className="py-2 pr-3">Quantity</th>
                    <th className="py-2 pr-3">Notes</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trayComponents.map((component, index) => (
                    <tr key={`${component.productId}-${index}`} className="border-b last:border-0">
                      <td className="py-3 pr-3 align-top">
                        <div className="font-medium text-gray-900">{component.name}</div>
                        {component.description ? (
                          <div className="text-xs text-muted-foreground">{component.description}</div>
                        ) : null}
                        {component.reference ? (
                          <div className="text-xs text-muted-foreground">Ref: {component.reference}</div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        {component.units || 'pcs'}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <Input
                          type="number"
                          min={1}
                          value={draftValues[index]?.quantity ?? component.quantity ?? 1}
                          onChange={(event) => handleDraftChange(index, 'quantity', event.target.value)}
                          className="w-24"
                          disabled={updating}
                        />
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <Input
                          value={draftValues[index]?.notes ?? component.notes ?? ''}
                          onChange={(event) => handleDraftChange(index, 'notes', event.target.value)}
                          placeholder="Soldering notes"
                          disabled={updating}
                        />
                      </td>
                      <td className="py-3 pr-0 align-top text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplyDraft(index)}
                            disabled={updating}
                          >
                            {updating ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Save
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveComponent(index)}
                            disabled={updating}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
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

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg">Add Components From Catalog</CardTitle>
            <p className="text-sm text-muted-foreground">
              Search existing products and add them to the tray list.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefreshProducts} disabled={loadingProducts}>
            {loadingProducts ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tray-component-search">Search Components</Label>
            <div className="relative mt-1">
              <Input
                id="tray-component-search"
                placeholder="Filter by component name or description"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {loadingProducts ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading components...
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No components found for the current search.</p>
          ) : (
            <div className="space-y-2">
              {products.map((product) => {
                const productId = product?.externalId ?? product?.id ?? product?._docId;
                const alreadyAdded = trayComponents.some(
                  (item) => item.productId === productId || item.externalId === productId
                );

                return (
                  <div
                    key={productId || product?._docId}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{product?.name || 'Unnamed Component'}</div>
                      {product?.description ? (
                        <div className="text-xs text-muted-foreground">{product.description}</div>
                      ) : null}
                      <div className="text-xs text-muted-foreground">
                        Units: {product?.units || product?.sub_units || 'pcs'}
                        {product?.box_no ? ` - Tray: ${product.box_no}` : ''}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddComponent(product)}
                      disabled={alreadyAdded || updating}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {alreadyAdded ? 'Added' : 'Add'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ThTrayComponentsPanel;
