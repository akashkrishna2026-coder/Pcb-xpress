import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAdmin, getAdminToken, clearAdmin, clearAdminToken } from '@/lib/storage';
import { api } from '@/lib/api';
import { Package, Plus, Edit, Trash2, Upload, Download } from 'lucide-react';
import { formatInr } from '@/lib/currency';

const AdminProductsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [admin, setAdmin] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct());
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    const a = getAdmin();
    if (!a) { navigate('/pcbXpress/login'); return; }
    setAdmin(a);
  }, [navigate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const result = await api.listProducts({ limit: 10000 }); // Load many items for admin
        setAllItems(result.items);
        setTotalItems(result.count);
      } catch (e) {
        console.error('Failed to load products:', e);
        toast({ title: 'Failed to load products', description: e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = getAdminToken();
        if (!token) return;
        const st = await api.getAiPricingStatus(token);
        setAiStatus(st);
        if (st?.currentJob?.status === 'running') setPolling(true);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (!polling) return;
    const token = getAdminToken();
    if (!token) return;
    const h = setInterval(async () => {
      try {
        const st = await api.getAiPricingStatus(token);
        setAiStatus(st);
        if (st?.currentJob?.status !== 'running') {
          clearInterval(h);
          setPolling(false);
          // refresh product list to reflect updates
          try {
            const result = await api.listProducts({ limit: 10000 });
            setAllItems(result.items);
            setTotalItems(result.count);
            setCurrentPage(1);
          } catch (_) {}
        }
      } catch (_) {}
    }, 5000);
    return () => clearInterval(h);
  }, [polling]);

  const triggerAiPricing = async () => {
    const token = getAdminToken();
    if (!token) { toast({ title: 'Please log in', description: 'Admin session needed' }); navigate('/pcbXpress/login'); return; }
    setAiLoading(true);
    try {
      await api.runAiPricing(token, { dryRun: false });
      toast({ title: 'AI pricing started', description: 'Evaluating availability and updating prices' });
      setPolling(true);
      const st = await api.getAiPricingStatus(token);
      setAiStatus(st);
    } catch (e) {
      toast({ title: 'Failed to start AI pricing', description: e.message });
    } finally {
      setAiLoading(false);
    }
  };

  // Pagination effect
  useEffect(() => {
    if (!Array.isArray(allItems)) {
      setItems([]);
      return;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setItems(allItems.slice(startIndex, endIndex));
  }, [allItems, currentPage, itemsPerPage]);

  const handleSignOut = () => {
    clearAdmin();
    clearAdminToken();
    toast({ title: 'Signed out of admin' });
    navigate('/');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const normalized = normalizeForm(form);
    if (!normalized.name) { toast({ title: 'Name required' }); return; }
    try {
      if (editing) {
        await api.updateProduct((editing && (editing._docId || editing._id || editing.docId || editing.mongoId || editing.id)), normalized);
        toast({ title: 'Product updated', description: normalized.name });
        setEditing(null);
      } else {
        await api.createProduct(normalized);
        toast({ title: 'Product added', description: normalized.name });
      }
      setShowAddModal(false);
      setForm(emptyProduct());
      // Refresh data
      const result = await api.listProducts();
      setAllItems(result.items);
      setTotalItems(result.count);
      setCurrentPage(1); // Reset to first page
    } catch (err) {
      toast({ title: 'Save failed', description: err.message });
    }
  };

  const onEdit = (item) => {
    setEditing(item);
    setShowAddModal(true);
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: item.price ?? 0,
      gst_percent: item.gst_percent ?? 0,
      tax_type: item.tax_type || 'inclusive',
      status: item.status ?? 1,
      stocks: item.stocks ?? 0,
      units: item.units || '',
      product_id: item.product_id || '',
      store_id: item.store_id || '',
      box_no: item.box_no || '',
      image_url: item.image_url || '',
    });
  };

  const onRemove = async (item) => {
    setConfirmDeleteProduct(item);
  };

  const confirmDeleteNow = async () => {
    const item = confirmDeleteProduct;
    if (!item) return;
    try {
      await api.deleteProduct((item && (item._docId || item._id || item.docId || item.mongoId || item.id)));
      toast({ title: 'Product deleted', description: item.name });
      // Remove from local state and update pagination
      setAllItems(prevItems => {
        const updatedItems = prevItems.filter(i => i.id !== item.id);
        setTotalItems(updatedItems.length);
        return updatedItems;
      });
      setCurrentPage(1); // Reset to first page
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message });
    } finally {
      setConfirmDeleteProduct(null);
    }
  };

  const onExport = async () => {
    const blob = new Blob([JSON.stringify(allItems, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'components.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        const arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('Invalid JSON');
        // Update local state and pagination
        setAllItems(arr);
        setTotalItems(arr.length);
        setCurrentPage(1); // Reset to first page
        toast({ title: 'Components imported', description: `${arr.length} items` });
      };
      input.click();
    } catch {
      toast({ title: 'Import failed', description: 'Invalid JSON format' });
    }
  };

  const onSyncFromAPI = async () => {
    if (!window.confirm('Sync data from external API? This will replace all current products.')) return;
    try {
      const result = await api.syncProducts();
      console.log('Sync result:', result); // Debug log
      const items = Array.isArray(result) ? result : [];
      console.log('Items array:', items); // Debug log
      setAllItems(items);
      setTotalItems(items.length);
      setCurrentPage(1); // Reset to first page
      toast({ title: 'Data synced', description: `${items.length} items loaded` });
    } catch (err) {
      console.error('Sync error:', err); // Debug log
      toast({ title: 'Sync failed', description: err.message });
    }
  };

  const onClearAllProducts = async () => {
    if (!window.confirm('Clear all products? This action cannot be undone.')) return;
    try {
      await api.deleteAllProducts();
      setAllItems([]);
      setTotalItems(0);
      setCurrentPage(1);
      toast({ title: 'All products cleared' });
    } catch (err) {
      toast({ title: 'Clear failed', description: err.message });
    }
  };

  return (
    <>
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Admin Products | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products ({totalItems})
              {totalItems > itemsPerPage && (
                <span className="text-sm text-muted-foreground">
                  - Page {currentPage} of {Math.ceil(totalItems / itemsPerPage)}
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
              <Button variant="outline" onClick={onExport}><Download className="h-4 w-4 mr-2" />Export</Button>
              <Button variant="outline" onClick={onImport}><Upload className="h-4 w-4 mr-2" />Import</Button>
              <Button variant="outline" onClick={onSyncFromAPI}>Sync from API</Button>
              <Button variant="destructive" onClick={onClearAllProducts}>Clear All Products</Button>
              <Button variant="outline" onClick={triggerAiPricing} disabled={aiLoading || aiStatus?.currentJob?.status === 'running'}>
                {aiLoading || aiStatus?.currentJob?.status === 'running' ? 'AI Pricing running…' : 'AI Pricing Activator'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 rounded-md border p-4 bg-muted/40">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">AI pricing status</p>
                  <h3 className="text-lg font-semibold capitalize">{aiStatus?.currentJob?.status === 'running' ? 'Running' : (aiStatus?.status || 'Idle')}</h3>
                  {aiStatus?.currentJob?.status === 'running' && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {aiStatus.currentJob.stage ? `Stage: ${aiStatus.currentJob.stage}` : ''}
                        {aiStatus.currentJob.message ? ` — ${aiStatus.currentJob.message}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Processed {aiStatus.currentJob.processed ?? 0} / {aiStatus.currentJob.total ?? 0}
                      </p>
                    </>
                  )}
                  {aiStatus?.lastRun && (
                    <p className="text-xs text-muted-foreground">
                      Last run: {aiStatus.lastRun.status} · Updated {aiStatus.lastRun.totals?.updated ?? 0} items
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button variant="ghost" onClick={() => navigate('/pcbXpress/ai-agent')}>View AI settings</Button>
                  {aiStatus?.currentJob?.status === 'running' && (
                    <span className="text-xs text-muted-foreground">Started {new Date(aiStatus.currentJob.startedAt).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3">Image</th>
                      <th className="py-2 pr-3">ID</th>
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Description</th>
                      <th className="py-2 pr-3">Price</th>
                      <th className="py-2 pr-3">GST %</th>
                      <th className="py-2 pr-3">Tax Type</th>
                      <th className="py-2 pr-3">Total</th>
                      <th className="py-2 pr-3">GST Amount</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Stock</th>
                      <th className="py-2 pr-3">Units</th>
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3">Store</th>
                      <th className="py-2 pr-3">Created</th>
                      <th className="py-2 pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {it.image_url ? (
                            <img
                              src={it.image_url}
                              alt={it.name}
                              className="w-12 h-12 object-cover rounded-lg border"
                              onError={(e) => {
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjE2QzE0IDE3LjEgMTMuMSAxOCA5IDE4QzQuOSAxOCA0IDE3LjEgNCAxNlY0QzQgMi45IDQuOSAyIDYgMkgxOEMxOS4xIDIgMjAgMi45IDIwIDRWMTZDMTggMTcuMSAxNy4xIDE4IDE0IDE4QzE2LjggMTggMTggMTYuOCAxOCA5QzE4IDYuMiAxNi44IDQgMTQgNFoiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTEyIDIyQzEzLjEwNDYgMjIgMjIgMjAuOTA0NiAyMiAxOUMyMiAxNy44OTU0IDIxLjEwNDYgMTcgMjAgMTdDMTguODk1NCAxNyAxOCA5QzE4IDYuMjAyIDE2LjgwMiA0IDE0IDRDMTYuODAyIDQgMTggNi4yMDIgMTggOUMxOCAxNy44OTU0IDE5LjEwNDYgMTkgMjAgMTlaIiBmaWxsPSIjOUNBNEFGIi8+Cjwvc3ZnPgo=';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">{it.id}</td>
                        <td className="py-2 pr-3 whitespace-nowrap max-w-[150px] truncate" title={it.name}>{it.name}</td>
                        <td className="py-2 pr-3 whitespace-nowrap max-w-[200px] truncate" title={it.description}>{it.description}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatInr(it.price)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{it.gst_percent}%</td>
                        <td className="py-2 pr-3 whitespace-nowrap capitalize">{it.tax_type}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatInr(it.total)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatInr(it.gst)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            it.status === 1 ? 'bg-green-100 text-green-800' :
                            it.status === 0 ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {it.status === 1 ? 'Active' : it.status === 0 ? 'Inactive' : 'Unknown'}
                          </span>
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">{it.stocks || '-'}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{it.units || '-'}</td>
                        <td className="py-2 pr-3 whitespace-nowrap max-w-[120px] truncate" title={it.products?.name}>{it.products?.name || '-'}</td>
                        <td className="py-2 pr-3 whitespace-nowrap max-w-[150px] truncate" title={it.stores?.name}>{it.stores?.name || '-'}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{it.created_at ? new Date(it.created_at).toLocaleDateString() : '-'}</td>
                        <td className="py-2 pr-2">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => onEdit(it)}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                            <Button variant="outline" size="sm" onClick={() => onRemove(it)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
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

        {/* Pagination Controls */}
        {totalItems > itemsPerPage && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.ceil(totalItems / itemsPerPage) }, (_, i) => i + 1)
                  .filter(page => {
                    const totalPages = Math.ceil(totalItems / itemsPerPage);
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    </React.Fragment>
                  ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalItems / itemsPerPage)))}
                disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-start justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Product' : 'Add Product'}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Close</Button>
            </div>
            <div className="p-6">
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Product ID</label>
                    <Input value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div>
                  <label className="text-sm font-medium">Image URL</label>
                  <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://example.com/image.jpg" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Price (INR)</label>
                    <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">GST %</label>
                    <Input type="number" min="0" step="0.01" value={form.gst_percent} onChange={(e) => setForm({ ...form, gst_percent: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tax Type</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm"
                      value={form.tax_type}
                      onChange={(e) => setForm({ ...form, tax_type: e.target.value })}
                    >
                      <option value="inclusive">Inclusive</option>
                      <option value="exclusive">Exclusive</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Stock</label>
                    <Input type="number" min="0" step="1" value={form.stocks} onChange={(e) => setForm({ ...form, stocks: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Units</label>
                    <Input value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Store ID</label>
                    <Input value={form.store_id} onChange={(e) => setForm({ ...form, store_id: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Box No</label>
                    <Input value={form.box_no} onChange={(e) => setForm({ ...form, box_no: e.target.value })} />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit">{editing ? 'Update' : 'Add'} Product</Button>
                  {editing && (
                    <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(emptyProduct()); setShowAddModal(false); }}>Cancel</Button>
                  )}
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Close</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
    {confirmDeleteProduct && (
      <div className="fixed inset-0 z-[200] bg-black/50 flex items-start justify-center p-4" onClick={() => setConfirmDeleteProduct(null)}>
        <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-red-600">Delete Product</h3>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteProduct(null)}>Close</Button>
          </div>
          <div className="p-6 space-y-4 text-sm">
            <p className="text-muted-foreground">You are about to delete product <span className="font-medium text-foreground">{confirmDeleteProduct?.name}</span> (ID: {confirmDeleteProduct?.id}).</p>
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
              <p className="text-sm font-medium">Warning</p>
              <p className="text-xs">This action cannot be undone. Any references to this product will break.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="destructive" onClick={confirmDeleteNow}>Delete</Button>
              <Button variant="outline" onClick={() => setConfirmDeleteProduct(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

function emptyProduct() {
  return {
    name: '',
    description: '',
    price: 0,
    gst_percent: 0,
    tax_type: 'inclusive',
    status: 1,
    stocks: 0,
    units: '',
    product_id: '',
    store_id: '',
    box_no: '',
    image_url: ''
  };
}

function normalizeForm(f) {
  const S = (v) => (v == null ? '' : String(v));
  const toMaybeNumber = (v) => {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  return {
    name: S(f.name).trim(),
    description: S(f.description).trim(),
    price: Number(f.price) || 0,
    gst_percent: Number(f.gst_percent) || 0,
    tax_type: S(f.tax_type || 'inclusive').trim(),
    status: Number(f.status) ?? 1,
    stocks: Math.max(0, Number(f.stocks) || 0),
    units: S(f.units).trim(),
    product_id: toMaybeNumber(f.product_id),
    store_id: toMaybeNumber(f.store_id),
    box_no: S(f.box_no).trim(),
    image_url: S(f.image_url).trim(),
  };
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || String(Date.now());
}

export default AdminProductsPage;

