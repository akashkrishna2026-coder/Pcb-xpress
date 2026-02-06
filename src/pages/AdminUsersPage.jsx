import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { api } from '@/lib/api';
import { getAdmin, getAdminToken, clearAdmin, clearAdminToken } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';

const AdminUsersPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [updatingUser, setUpdatingUser] = useState({});

  useEffect(() => {
    const a = getAdmin();
    if (!a) {
      navigate('/pcbXpress/login');
      return;
    }
    setAdmin(a);
    fetchUsers();
  }, [navigate, page, limit]);

  const handleSignOut = () => {
    clearAdmin();
    clearAdminToken();
    toast({ title: 'Signed out of admin' });
    navigate('/');
  };

  const fetchUsers = async () => {
    const t = getAdminToken();
    if (!t) {
      setUsers([]);
      setTotal(0);
      setPages(1);
      return;
    }
    try {
      const res = await api.adminListUsers(t, { limit, page });
      setUsers(res.users || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch {
      setUsers([]);
      setTotal(0);
      setPages(1);
    }
  };

  const refresh = async () => {
    await fetchUsers();
  };

  const handlePromoteToSales = async (userId, userName) => {
    const token = getAdminToken();
    if (!token) return;

    if (!window.confirm(`Are you sure you want to promote ${userName} to Sales Operator?`)) {
      return;
    }

    setUpdatingUser(prev => ({ ...prev, [userId]: true }));
    try {
      await api.adminUpdateUserRole(token, userId, 'sales');
      toast({
        title: 'Success',
        description: `${userName} has been promoted to Sales Operator`,
      });
      await fetchUsers(); // Refresh the user list
    } catch (err) {
      console.error('Error promoting user:', err);
      toast({
        title: 'Error',
        description: 'Failed to promote user to Sales Operator',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUser(prev => ({ ...prev, [userId]: false }));
    }
  };

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const regularCount = users.filter((u) => u.role !== 'admin').length;

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>Admin Users | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <section className="py-2 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Users</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh}>Refresh</Button>
            <a href="/pcbXpress">
              <Button variant="ghost">Back to Dashboard</Button>
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Stat label="Total Users" value={String(total)} />
          <Stat label="Admins" value={String(adminCount)} />
          <Stat label="Regular Users" value={String(regularCount)} />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users to display.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Joined</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id || u.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">{u.name || '-'}</td>
                        <td className="py-3 pr-4">{u.email}</td>
                        <td className="py-3 pr-4 capitalize">{u.role || 'user'}</td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4">
                          {u.role !== 'sales' && u.role !== 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePromoteToSales(u._id || u.id, u.name)}
                              disabled={updatingUser[u._id || u.id]}
                            >
                              {updatingUser[u._id || u.id] ? 'Promoting...' : 'Promote to Sales'}
                            </Button>
                          )}
                          {u.role === 'sales' && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Sales Operator
                            </span>
                          )}
                          {u.role === 'admin' && (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                              Admin
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {pages > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 w-16 border rounded px-2 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {Math.min((page - 1) * limit + 1, total)}-{Math.min(page * limit, total)} of {total}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>
    </AdminLayout>
  );
};

const Stat = ({ label, value }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </CardContent>
  </Card>
);

export default AdminUsersPage;
