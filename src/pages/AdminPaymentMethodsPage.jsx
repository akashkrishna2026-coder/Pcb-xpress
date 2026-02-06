import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api, getApiBaseUrl } from '@/lib/api';
import { getAdmin, getAdminToken } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Trash2, Edit, Plus } from 'lucide-react';

const AdminPaymentMethodsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState([]);
  const [form, setForm] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    beneficiaryName: '',
    qrCode: null,
    isActive: false,
  });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // method to delete

  useEffect(() => {
    const a = getAdmin();
    if (!a) { navigate('/pcbXpress/login'); return; }
    setAdmin(a);
    loadMethods();
  }, [navigate]);

  const loadMethods = async () => {
    try {
      const t = getAdminToken();
      if (!t) return;
      const res = await api.adminGetPaymentMethods(t);
      setMethods(res.paymentMethods || []);
    } catch (err) {
      toast({ title: 'Load failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const onChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setForm(f => ({ ...f, [name]: files?.[0] || null }));
    } else {
      setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const resetForm = () => {
    setForm({
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      beneficiaryName: '',
      qrCode: null,
      isActive: false,
    });
    setEditingId(null);
  };

  const editMethod = (method) => {
    setForm({
      bankName: method.bankName,
      accountNumber: method.accountNumber,
      ifscCode: method.ifscCode,
      beneficiaryName: method.beneficiaryName,
      qrCode: null, // Don't pre-fill file input
      isActive: method.isActive,
    });
    setEditingId(method._id);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const t = getAdminToken();
      if (!t) throw new Error('Unauthorized');

      const fd = new FormData();
      fd.append('bankName', form.bankName);
      fd.append('accountNumber', form.accountNumber);
      fd.append('ifscCode', form.ifscCode);
      fd.append('beneficiaryName', form.beneficiaryName);
      fd.append('isActive', form.isActive.toString());
      if (form.qrCode) fd.append('qrCode', form.qrCode);

      if (editingId) {
        await api.adminUpdatePaymentMethod(t, editingId, fd);
        toast({ title: 'Payment method updated' });
      } else {
        await api.adminCreatePaymentMethod(t, fd);
        toast({ title: 'Payment method created' });
      }

      resetForm();
      loadMethods();
    } catch (err) {
      toast({ title: 'Save failed', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMethod = async (id) => {
    try {
      const t = getAdminToken();
      if (!t) throw new Error('Unauthorized');
      await api.adminDeletePaymentMethod(t, id);
      toast({ title: 'Payment method deleted' });
      setConfirmDelete(null);
      loadMethods();
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message });
    }
  };

  if (loading) {
    return (
      <AdminLayout admin={admin}>
        <div className="flex justify-center py-8">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout admin={admin}>
      <Helmet>
        <title>Payment Methods | PCB Xpress Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Payment Method' : 'Add Payment Method'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Bank Name</label>
                <Input name="bankName" value={form.bankName} onChange={onChange} required />
              </div>
              <div>
                <label className="text-sm font-medium">Account Number</label>
                <Input name="accountNumber" value={form.accountNumber} onChange={onChange} required />
              </div>
              <div>
                <label className="text-sm font-medium">IFSC Code</label>
                <Input name="ifscCode" value={form.ifscCode} onChange={onChange} required />
              </div>
              <div>
                <label className="text-sm font-medium">Beneficiary Name</label>
                <Input name="beneficiaryName" value={form.beneficiaryName} onChange={onChange} required />
              </div>
              <div>
                <label className="text-sm font-medium">QR Code (optional)</label>
                <Input name="qrCode" type="file" accept="image/*" onChange={onChange} />
                {editingId && form.qrCode && <p className="text-xs text-muted-foreground mt-1">New QR code will replace existing one</p>}
              </div>
              <div className="flex items-center gap-2">
                <input id="is-active" type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
                <label htmlFor="is-active" className="text-sm">Set as active payment method</label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {methods.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment methods yet.</p>
            ) : (
              <div className="space-y-4">
                {methods.map((method) => (
                  <div key={method._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{method.bankName}</h4>
                        {method.isActive && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => editMethod(method)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setConfirmDelete(method)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Account: {method.accountNumber}</p>
                      <p>IFSC: {method.ifscCode}</p>
                      <p>Beneficiary: {method.beneficiaryName}</p>
                      {method.qrCode && (
                        <div className="mt-2">
                          <p className="mb-1">QR Code:</p>
                          <img
                            src={(() => {
                              const base = getApiBaseUrl();
                              const qr = method.qrCode || {};
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
                            alt="QR Code"
                            className="w-24 h-24 object-contain border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {confirmDelete && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-start justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-red-600">Delete Payment Method</h3>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Close</Button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <p className="text-muted-foreground">
                You are about to delete the payment method
                <span className="font-medium text-foreground"> {confirmDelete.bankName}</span>.
              </p>
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                <p className="text-sm font-medium">Warning</p>
                <p className="text-xs">This action cannot be undone. Customers will no longer see this method. Any associated QR code file will no longer be referenced.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="destructive" onClick={() => deleteMethod(confirmDelete._id)}>Delete</Button>
                <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPaymentMethodsPage;
