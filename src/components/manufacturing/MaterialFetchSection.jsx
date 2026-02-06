import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  RefreshCw,
  Save,
} from 'lucide-react';

const MaterialFetchSection = ({ workOrder, token, onUpdate }) => {
  const { toast } = useToast();
  const didInitSearchRef = useRef(false);

  // State
  const [products, setProducts] = useState([]);
  const [productCount, setProductCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [productRange, setProductRange] = useState('0:4');
  const [materialsReady, setMaterialsReady] = useState(workOrder.materials?.ready || false);
  const [shortages, setShortages] = useState(workOrder.materials?.shortages || []);
  const [associatedMaterials, setAssociatedMaterials] = useState(workOrder.materials?.associatedMaterials || []);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Load products for search
  const loadProducts = async (query = '', range = productRange) => {
    setLoading(true);
    try {
      const [offsetStr, limitStr] = String(range).split(':');
      const offset = Math.max(0, Number(offsetStr) || 0);
      const limit = Math.max(0, Number(limitStr) || 4);
      const result = await api.listProducts({ q: query, limit, offset });
      setProducts(result.items || []);
      setProductCount(Number(result.count) || 0);
    } catch (err) {
      toast({
        title: 'Failed to load products',
        description: err?.message || 'Unable to fetch products.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Search products
  const handleSearch = () => {
    const firstRange = '0:4';
    setProductRange(firstRange);
    loadProducts(searchQuery, firstRange);
  };

  // Update material readiness
  const handleUpdateReadiness = async (ready) => {
    setUpdating(true);
    try {
      await api.mfgUpdateWorkOrder(token, workOrder._id, {
        materials: {
          ...workOrder.materials,
          ready,
        },
      });
      setMaterialsReady(ready);
      toast({
        title: 'Material status updated',
        description: `Materials marked as ${ready ? 'ready' : 'not ready'}.`,
      });
      onUpdate(token);
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err?.message || 'Unable to update material status.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  // Add product to work order materials
  const handleAddProduct = async (product, quantity = 1) => {
    if (associatedMaterials.some(m => m.id === product.id)) {
      toast({
        title: 'Already associated',
        description: `${product.name} is already associated with this work order.`,
        variant: 'destructive',
      });
      return;
    }

    const qty = Math.max(1, Number(quantity) || 1);

    setUpdating(true);
    try {
      const newMaterial = {
        id: product.id,
        name: product.name,
        partNumber: product.partNumber,
        description: product.description,
        quantity: qty,
        associatedAt: new Date(),
      };

      const updatedMaterials = [...associatedMaterials, newMaterial];
      setAssociatedMaterials(updatedMaterials);

      await api.mfgUpdateWorkOrder(token, workOrder._id, {
        materials: {
          ...workOrder.materials,
          associatedMaterials: updatedMaterials,
        },
      });

      toast({
        title: 'Product associated',
        description: `${product.name} has been associated with the work order.`,
      });

      onUpdate(token);
    } catch (err) {
      toast({
        title: 'Association failed',
        description: err?.message || 'Unable to associate product.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const openQuantityDialog = (product) => {
    setSelectedProduct(product);
    setSelectedQuantity(1);
    setQuantityDialogOpen(true);
  };

  const handleDialogAssociate = async () => {
    if (!selectedProduct) return;
    await handleAddProduct(selectedProduct, selectedQuantity);
    setQuantityDialogOpen(false);
    setSelectedProduct(null);
  };

  // Initial load
  useEffect(() => {
    loadProducts('', productRange);
  }, []);

  // Live search (debounced)
  useEffect(() => {
    // Avoid a redundant fetch on first mount (initial load already happens above)
    if (!didInitSearchRef.current) {
      didInitSearchRef.current = true;
      return;
    }

    const firstRange = '0:4';
    const handle = setTimeout(() => {
      setProductRange(firstRange);
      loadProducts(searchQuery, firstRange);
    }, 300);

    return () => clearTimeout(handle);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Current Material Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Material Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${materialsReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">
                  Materials {materialsReady ? 'Ready' : 'Not Ready'}
                </span>
              </div>

              {/* Associated Materials Display */}
              {associatedMaterials.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Associated Materials ({associatedMaterials.length}):</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {associatedMaterials.map((material) => (
                      <div key={material.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{material.name}</div>
                          {material.partNumber && (
                            <div className="text-xs text-muted-foreground">Part: {material.partNumber}</div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Qty: {material.quantity}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Readiness Controls */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleUpdateReadiness(true)}
                disabled={updating || materialsReady}
                variant={materialsReady ? 'secondary' : 'default'}
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Ready
              </Button>
              <Button
                onClick={() => handleUpdateReadiness(false)}
                disabled={updating || !materialsReady}
                variant={!materialsReady ? 'secondary' : 'outline'}
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Mark Not Ready
              </Button>
            </div>

            {/* Shortages Display */}
            {shortages.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Material Shortages:
                </p>
                {shortages.map((shortage, index) => (
                  <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    <div className="font-medium">{shortage.itemCode || shortage.description}</div>
                    <div>Shortage: {shortage.shortageQty || 0} units</div>
                    {shortage.supplier && <div>Supplier: {shortage.supplier}</div>}
                    {shortage.eta && <div>ETA: {new Date(shortage.eta).toLocaleDateString()}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Search and Association */}
      <Card>
        <CardHeader>
          <CardTitle>Associate Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <div className="w-28">
                <Select
                  value={productRange}
                  onValueChange={(v) => {
                    const [offsetStr] = String(v).split(':');
                    const nextOffset = Math.max(0, Number(offsetStr) || 0);
                    if (productCount > 0 && nextOffset >= productCount) {
                      toast({
                        title: 'No products in this range',
                        description: 'Select a smaller range or refine your search.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    setProductRange(v);
                    loadProducts(searchQuery, v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Show" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0:4">1-4</SelectItem>
                    <SelectItem value="4:6" disabled={productCount > 0 && productCount <= 4}>5-10</SelectItem>
                    <SelectItem value="10:10" disabled={productCount > 0 && productCount <= 10}>11-20</SelectItem>
                    <SelectItem value="20:30" disabled={productCount > 0 && productCount <= 20}>21-50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button onClick={() => loadProducts(searchQuery, productRange)} variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Products List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading products...</p>
              ) : products.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products found.</p>
              ) : (
                products.map((product) => (
                  <Card key={product.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.description || 'No description'}
                        </div>
                        {product.partNumber && (
                          <div className="text-xs text-muted-foreground">
                            Part: {product.partNumber}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => openQuantityDialog(product)}
                        size="sm"
                        variant="outline"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Material Quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {selectedProduct ? selectedProduct.name : ''}
            </div>
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                min="1"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQuantityDialogOpen(false);
                setSelectedProduct(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDialogAssociate}
              disabled={updating || !selectedProduct || !(Number(selectedQuantity) > 0)}
            >
              Associate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Associated Materials */}
      <Card>
        <CardHeader>
          <CardTitle>Associated Materials ({associatedMaterials.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {associatedMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No materials associated yet. Search and associate products above.
            </p>
          ) : (
            <div className="space-y-2">
              {associatedMaterials.map((material) => (
                <Card key={material.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{material.name}</div>
                      {material.partNumber && (
                        <div className="text-sm text-muted-foreground">Part: {material.partNumber}</div>
                      )}
                      {material.description && (
                        <div className="text-sm text-muted-foreground">{material.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        Associated: {new Date(material.associatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">Qty: {material.quantity}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaterialFetchSection;