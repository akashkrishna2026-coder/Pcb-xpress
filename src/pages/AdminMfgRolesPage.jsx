import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Helmet } from 'react-helmet';
import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getAdmin, getAdminToken, clearAdmin, clearAdminToken } from '@/lib/storage';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

const createEmptyForm = () => ({
  name: '',
  email: '',
  loginId: '',
  password: '',
  mfgRole: '',
  workCenter: '',
  isActive: true,
});

const AdminMfgRolesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [admin, setAdmin] = useState(null);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [form, setForm] = useState(createEmptyForm);
  const [toggleBusy, setToggleBusy] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const a = getAdmin();
    if (!a) {
      navigate('/pcbXpress/login');
      return;
    }
    setAdmin(a);
    loadOperators();
  }, [navigate]);

  const loadOperators = async () => {
    const token = getAdminToken();
    if (!token) {
      setOperators([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.mfgListOperators(token);
      setOperators(Array.isArray(res?.operators) ? res.operators : []);
    } catch (err) {
      toast({
        title: 'Failed to load operators',
        description: err?.message || 'Unable to fetch manufacturing operators.',
        variant: 'destructive',
      });
      setOperators([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    clearAdmin();
    clearAdminToken();
    toast({ title: 'Signed out of admin' });
    navigate('/');
  };

  const openCreate = () => {
    setEditingOperator(null);
    setForm(createEmptyForm());
    setShowDialog(true);
  };

  const openEdit = (operator) => {
    setEditingOperator(operator);
    setForm({
      name: operator.name || '',
      email: operator.email || '',
      loginId: operator.loginId || '',
      password: '',
      mfgRole: operator.mfgRole || '',
      workCenter: operator.workCenter || '',
      isActive: operator.isActive !== false,
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingOperator(null);
    setForm(createEmptyForm());
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const token = getAdminToken();
    if (!token) {
      toast({
        title: 'Not authenticated',
        description: 'Sign in again to manage operators.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      loginId: form.loginId.trim().toLowerCase(),
      mfgRole: form.mfgRole.trim(),
      workCenter: form.workCenter.trim(),
      isActive: !!form.isActive,
    };

    if (!payload.email || !payload.loginId) {
      toast({
        title: 'Email and login ID required',
        description: 'Provide both email and login ID for the operator.',
        variant: 'destructive',
      });
      return;
    }

    const trimmedPassword = form.password.trim();
    if (editingOperator) {
      if (trimmedPassword) {
        if (trimmedPassword.length < 6) {
          toast({
            title: 'Password too short',
            description: 'Password must be at least 6 characters.',
            variant: 'destructive',
          });
          return;
        }
        payload.password = trimmedPassword;
      }
    } else {
      if (!trimmedPassword || trimmedPassword.length < 6) {
        toast({
          title: 'Password required',
          description: 'Set an initial password (minimum 6 characters).',
          variant: 'destructive',
        });
        return;
      }
      payload.password = trimmedPassword;
    }

    setFormSubmitting(true);
    try {
      if (editingOperator) {
        await api.mfgUpdateOperator(token, editingOperator._id || editingOperator.id, payload);
        toast({ title: 'Operator updated' });
      } else {
        await api.mfgCreateOperator(token, payload);
        toast({
          title: 'Operator created',
          description: 'Assign detailed permissions under the MFG Permissions page.',
        });
      }
      closeDialog();
      loadOperators();
    } catch (err) {
      toast({
        title: 'Failed to save operator',
        description: err?.message || 'Unable to save operator changes.',
        variant: 'destructive',
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const toggleOperatorActive = async (operator) => {
    const token = getAdminToken();
    if (!token) {
      toast({
        title: 'Not authenticated',
        description: 'Sign in again to manage operators.',
        variant: 'destructive',
      });
      return;
    }
    const operatorId = operator._id || operator.id;
    setToggleBusy(operatorId);
    try {
      await api.mfgUpdateOperator(token, operatorId, { isActive: !operator.isActive });
      toast({
        title: operator.isActive ? 'Operator disabled' : 'Operator enabled',
      });
      loadOperators();
    } catch (err) {
      toast({
        title: 'Failed to update operator',
        description: err?.message || 'Unable to toggle operator status.',
        variant: 'destructive',
      });
    } finally {
      setToggleBusy(null);
    }
  };

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Manufacturing Roles | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Manufacturing Roles</h1>
            <p className="text-sm text-muted-foreground">
              Manage operator accounts, work centers, and activation status for the manufacturing portal.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadOperators} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={openCreate}>Add Operator</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Operators</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading manufacturing operators...</p>
            ) : operators.length === 0 ? (
              <p className="text-sm text-muted-foreground">No manufacturing operators configured yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Login ID</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Work Center</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-0 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operators.map((op) => {
                      const operatorId = op._id || op.id;
                      return (
                        <tr key={operatorId} className="border-b last:border-0">
                          <td className="py-3 pr-4">
                            <div className="font-medium">{op.name || '-'}</div>
                            <div className="text-xs text-muted-foreground">
                              Created {new Date(op.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 pr-4">{op.loginId || '-'}</td>
                          <td className="py-3 pr-4">{op.mfgRole || '-'}</td>
                          <td className="py-3 pr-4">{op.workCenter || '-'}</td>
                          <td className="py-3 pr-4">{op.email}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                op.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {op.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-3 pr-0 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEdit(op)}>
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleOperatorActive(op)}
                                disabled={toggleBusy === operatorId}
                              >
                                {op.isActive ? 'Disable' : 'Enable'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={showDialog}
          onOpenChange={(open) => {
            if (!open) {
              closeDialog();
            } else {
              setShowDialog(true);
            }
          }}
        >
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingOperator ? 'Edit Operator' : 'Add Operator'}</DialogTitle>
              <DialogDescription>
                Configure manufacturing operator details. Permissions can be assigned separately on the MFG Permissions page.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="Operator name"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder="operator@pcbxpress.in"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Login ID</label>
                <Input
                  name="loginId"
                  value={form.loginId}
                  onChange={handleInputChange}
                  placeholder="cam-intake-01"
                  required
                  autoComplete="username"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Password{' '}
                  {editingOperator && (
                    <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>
                  )}
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleInputChange}
                    placeholder="Set operator password"
                    required={!editingOperator}
                    minLength={6}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-primary" tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Manufacturing Role</label>
                <Input
                  name="mfgRole"
                  value={form.mfgRole}
                  onChange={handleInputChange}
                  placeholder="e.g. cam_intake, planner, qa_stage"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Work Center</label>
                <Input
                  name="workCenter"
                  value={form.workCenter}
                  onChange={handleInputChange}
                  placeholder="CAM Intake"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="operator-active"
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4"
                />
                <label htmlFor="operator-active" className="text-sm">
                  Allow this operator to log in
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                After saving, configure detailed permissions from the Manufacturing Permissions page.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} disabled={formSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving...' : 'Save Operator'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </section>
    </AdminLayout>
  );
};

export default AdminMfgRolesPage;
