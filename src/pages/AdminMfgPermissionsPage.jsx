import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdmin, getAdminToken, clearAdmin, clearAdminToken } from '@/lib/storage';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

const PERMISSION_OPTIONS = [
  {
    key: 'cam:review',
    label: 'CAM Review',
    description: 'View intake packages and run DFM checks.',
  },
  {
    key: 'cam:release',
    label: 'CAM Release',
    description: 'Approve revisions and release travelers.',
  },
  {
    key: 'traveler:read',
    label: 'Traveler Read',
    description: 'View traveler details and queue status.',
  },
  {
    key: 'traveler:release',
    label: 'Traveler Release',
    description: 'Advance travelers past station gates.',
  },
  {
    key: 'materials:shortages',
    label: 'Materials Shortages',
    description: 'Update shortage resolution status.',
  },
  {
    key: 'planning:schedule',
    label: 'Planning Schedule',
    description: 'Adjust capacity windows and planned starts.',
  },
  {
    key: 'qc:hold',
    label: 'QC Hold',
    description: 'Place or release quality holds at stations.',
  },
];

const AdminMfgPermissionsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [admin, setAdmin] = useState(null);
  const [operators, setOperators] = useState([]);
  const [draftPermissions, setDraftPermissions] = useState({});
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(true);

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
      setDraftPermissions({});
      return;
    }
    setLoading(true);
    try {
      const res = await api.mfgListOperators(token);
      const ops = Array.isArray(res?.operators) ? res.operators : [];
      setOperators(ops);
      const initialDrafts = {};
      ops.forEach((op) => {
        initialDrafts[op._id || op.id] = Array.isArray(op.permissions) ? op.permissions : [];
      });
      setDraftPermissions(initialDrafts);
    } catch (err) {
      toast({
        title: 'Failed to load operators',
        description: err?.message || 'Unable to fetch manufacturing operators.',
        variant: 'destructive',
      });
      setOperators([]);
      setDraftPermissions({});
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (operatorId, permission) => {
    setDraftPermissions((prev) => {
      const current = new Set(prev[operatorId] || []);
      if (current.has(permission)) {
        current.delete(permission);
      } else {
        current.add(permission);
      }
      return { ...prev, [operatorId]: Array.from(current) };
    });
  };

  const setAllPermissions = (operatorId) => {
    setDraftPermissions((prev) => ({
      ...prev,
      [operatorId]: PERMISSION_OPTIONS.map((p) => p.key),
    }));
  };

  const clearPermissions = (operatorId) => {
    setDraftPermissions((prev) => ({
      ...prev,
      [operatorId]: [],
    }));
  };

  const handleSave = async (operator) => {
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
    const permissions = draftPermissions[operatorId] || [];
    setSaving((prev) => ({ ...prev, [operatorId]: true }));
    try {
      await api.mfgUpdateOperator(token, operatorId, { permissions });
      toast({ title: 'Permissions updated' });
      await loadOperators();
    } catch (err) {
      toast({
        title: 'Failed to update permissions',
        description: err?.message || 'Unable to save permissions for this operator.',
        variant: 'destructive',
      });
    } finally {
      setSaving((prev) => ({ ...prev, [operatorId]: false }));
    }
  };

  const handleSignOut = () => {
    clearAdmin();
    clearAdminToken();
    toast({ title: 'Signed out of admin' });
    navigate('/');
  };

  const permissionIndex = useMemo(() => {
    const map = {};
    PERMISSION_OPTIONS.forEach((option, idx) => {
      map[option.key] = idx;
    });
    return map;
  }, []);

  const sortPermissions = (values = []) => {
    return [...values].sort((a, b) => {
      const ia = permissionIndex[a] ?? Number.MAX_SAFE_INTEGER;
      const ib = permissionIndex[b] ?? Number.MAX_SAFE_INTEGER;
      return ia - ib;
    });
  };

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Manufacturing Permissions | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Manufacturing Permissions</h1>
            <p className="text-sm text-muted-foreground">
              Control manufacturing portal access with per-operator permission sets.
            </p>
          </div>
          <Button variant="outline" onClick={loadOperators} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Operators</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading operators...</p>
            ) : operators.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No manufacturing operators found. Add operators under MFG Roles.
              </p>
            ) : (
              <div className="space-y-6">
                {operators.map((operator) => {
                  const operatorId = operator._id || operator.id;
                  const currentPerms = sortPermissions(draftPermissions[operatorId] || []);
                  return (
                    <div
                      key={operatorId}
                      className="border border-border/60 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <h2 className="text-base font-semibold">
                            {operator.name || operator.loginId || operator.email}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            Login ID: {operator.loginId || '—'} • Role: {operator.mfgRole || '—'} •{' '}
                            {operator.isActive ? 'Active' : 'Disabled'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAllPermissions(operatorId)}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearPermissions(operatorId)}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {PERMISSION_OPTIONS.map((option) => {
                          const checked = currentPerms.includes(option.key);
                          return (
                            <label
                              key={`${operatorId}-${option.key}`}
                              className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 p-3 text-sm"
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4"
                                checked={checked}
                                onChange={() => togglePermission(operatorId, option.key)}
                              />
                              <span>
                                <span className="font-medium">{option.label}</span>
                                <br />
                                <span className="text-xs text-muted-foreground">
                                  {option.description}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadOperators()}
                          disabled={saving[operatorId]}
                        >
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSave(operator)}
                          disabled={saving[operatorId]}
                        >
                          {saving[operatorId] ? 'Saving...' : 'Save Permissions'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </AdminLayout>
  );
};

export default AdminMfgPermissionsPage;
