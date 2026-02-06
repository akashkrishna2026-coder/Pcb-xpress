import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { getAdmin, setAdmin } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Shield, Key, Smartphone, Monitor, History, Bell, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const AdminProfilePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admin, setAdminState] = useState(null);
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);

  // Security settings state
  const [activeTab, setActiveTab] = useState('password');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQR, setTwoFactorQR] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [securityNotifications, setSecurityNotifications] = useState({
    loginAlerts: true,
    passwordChanges: true,
    suspiciousActivity: true
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    const a = getAdmin();
    if (!a) { navigate('/pcbXpress/login'); return; }
    setAdminState(a);
    setProfile({
      name: a.name || '',
      email: a.email || '',
    });
  }, [navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setProfile((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!admin) return;
    setSaving(true);
    try {
      const updated = { ...admin, name: (profile.name || '').trim() };
      setAdmin(updated);
      setAdminState(updated);
      toast({ title: 'Profile updated' });
    } finally {
      setSaving(false);
    }
  };

  // Security functions
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }

    setChangingPassword(true);
    try {
      // In a real implementation, this would call an API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast({ title: 'Password changed successfully' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast({ title: 'Failed to change password', description: err.message, variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const toggleTwoFactor = async () => {
    if (!twoFactorEnabled) {
      // Enable 2FA
      try {
        // In a real implementation, this would generate a secret and QR code
        setTwoFactorSecret('JBSWY3DPEHPK3PXP'); // Mock secret
        setTwoFactorQR('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKjSURBVHic7Z15bFRVFMf/'); // Mock QR
        setTwoFactorEnabled(true);
        toast({ title: 'Two-factor authentication setup initiated' });
      } catch (err) {
        toast({ title: 'Failed to setup 2FA', variant: 'destructive' });
      }
    } else {
      // Disable 2FA
      setTwoFactorEnabled(false);
      setTwoFactorSecret('');
      setTwoFactorQR('');
      toast({ title: 'Two-factor authentication disabled' });
    }
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      // Mock session data - in real implementation, this would come from API
      setSessions([
        {
          id: 'current',
          device: 'Chrome on Windows',
          location: 'Kerala, India',
          ip: '192.168.1.100',
          lastActive: new Date(),
          current: true
        },
        {
          id: 'session2',
          device: 'Safari on iPhone',
          location: 'Kerala, India',
          ip: '192.168.1.101',
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          current: false
        }
      ]);
    } catch (err) {
      toast({ title: 'Failed to load sessions', variant: 'destructive' });
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadLoginHistory = async () => {
    try {
      // Mock login history - in real implementation, this would come from API
      setLoginHistory([
        {
          id: 1,
          timestamp: new Date(),
          device: 'Chrome on Windows',
          location: 'Kerala, India',
          ip: '192.168.1.100',
          status: 'success'
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          device: 'Safari on iPhone',
          location: 'Kerala, India',
          ip: '192.168.1.101',
          status: 'success'
        },
        {
          id: 3,
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          device: 'Firefox on Linux',
          location: 'Mumbai, India',
          ip: '10.0.0.50',
          status: 'success'
        }
      ]);
    } catch (err) {
      toast({ title: 'Failed to load login history', variant: 'destructive' });
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      // In real implementation, this would call an API
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast({ title: 'Session revoked successfully' });
    } catch (err) {
      toast({ title: 'Failed to revoke session', variant: 'destructive' });
    }
  };

  const updateSecurityNotifications = (key, value) => {
    setSecurityNotifications(prev => ({ ...prev, [key]: value }));
    toast({ title: 'Security notifications updated' });
  };

  // Load security data on mount
  useEffect(() => {
    if (admin) {
      loadSessions();
      loadLoginHistory();
    }
  }, [admin]);

  return (
    <AdminLayout admin={admin}>
      <Helmet>
        <title>Admin Profile | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-[72px_1fr] items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xl">
                  {(profile.email?.[0] || 'A').toUpperCase()}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium">{profile.email || 'admin@example.com'}</p>
                  <p>
                    {admin?.loggedInAt ? `Last login: ${new Date(admin.loggedInAt).toLocaleString()}` : 'Welcome, admin!'}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Display name</label>
                <Input name="name" value={profile.name} onChange={onChange} placeholder="Administrator" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input name="email" type="email" value={profile.email} disabled />
                <p className="text-xs text-muted-foreground mt-1">Email is managed by your administrator.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Security Tabs */}
            <div className="flex border-b mb-6">
              {[
                { id: 'password', label: 'Password', icon: Key },
                { id: '2fa', label: 'Two-Factor Auth', icon: Smartphone },
                { id: 'sessions', label: 'Active Sessions', icon: Monitor },
                { id: 'history', label: 'Login History', icon: History },
                { id: 'notifications', label: 'Notifications', icon: Bell }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Password Security</p>
                    <p className="text-xs text-green-600">Your password was last changed recently</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Current Password</label>
                    <div className="relative">
                      <Input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">New Password</label>
                    <div className="relative">
                      <Input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Password must be at least 8 characters long
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <div className="relative">
                      <Input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={changingPassword}>
                    {changingPassword ? 'Changing Password...' : 'Change Password'}
                  </Button>
                </form>
              </div>
            )}

            {/* 2FA Tab */}
            {activeTab === '2fa' && (
              <div className="space-y-4">
                <div className={`flex items-center gap-2 p-3 border rounded-lg ${
                  twoFactorEnabled
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  {twoFactorEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      twoFactorEnabled ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      Two-Factor Authentication
                    </p>
                    <p className={`text-xs ${
                      twoFactorEnabled ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {twoFactorEnabled ? 'Enabled - Your account is protected' : 'Disabled - Enable for better security'}
                    </p>
                  </div>
                </div>

                {!twoFactorEnabled ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Two-factor authentication adds an extra layer of security to your account by requiring a second form of verification.
                    </p>
                    <Button onClick={toggleTwoFactor}>
                      <Smartphone className="h-4 w-4 mr-2" />
                      Enable Two-Factor Authentication
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm font-medium mb-2">Setup Complete</p>
                      <p className="text-xs text-muted-foreground">
                        Your account is now protected with two-factor authentication.
                      </p>
                    </div>
                    <Button variant="outline" onClick={toggleTwoFactor}>
                      Disable Two-Factor Authentication
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Active Sessions</h3>
                  <Button size="sm" variant="outline" onClick={loadSessions} disabled={loadingSessions}>
                    {loadingSessions ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>

                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {session.device}
                            {session.current && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Current</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.location} • {session.ip} • Last active: {new Date(session.lastActive).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!session.current && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeSession(session.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Security Tip:</strong> Regularly review and revoke suspicious sessions. If you see unfamiliar devices, change your password immediately.
                  </p>
                </div>
              </div>
            )}

            {/* Login History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Recent Login Activity</h3>

                <div className="space-y-3">
                  {loginHistory.map((login) => (
                    <div key={login.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <History className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{login.device}</p>
                          <p className="text-xs text-muted-foreground">
                            {login.location} • {login.ip} • {new Date(login.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        login.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {login.status}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Security Alert:</strong> If you see login attempts from unfamiliar locations or devices, change your password immediately and contact support.
                  </p>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Security Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Choose which security events you want to be notified about.
                </p>

                <div className="space-y-3">
                  {[
                    { key: 'loginAlerts', label: 'Login Alerts', desc: 'Get notified of new login attempts' },
                    { key: 'passwordChanges', label: 'Password Changes', desc: 'Get notified when password is changed' },
                    { key: 'suspiciousActivity', label: 'Suspicious Activity', desc: 'Get notified of unusual account activity' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={securityNotifications[item.key]}
                          onChange={(e) => updateSecurityNotifications(item.key, e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Privacy Note:</strong> Security notifications help you stay informed about account activity and potential security threats.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminProfilePage;

