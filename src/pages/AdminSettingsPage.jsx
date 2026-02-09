import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api, getApiBaseUrl } from '@/lib/api';
import { getAdmin, getAdminToken } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PromotionalImagesManager from '@/components/PromotionalImagesManager';

const AdminSettingsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ host: '', port: 587, secure: false, user: '', password: '', fromName: '', fromEmail: '' });
  const [hasPassword, setHasPassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [factoryVideoUrl, setFactoryVideoUrl] = useState('https://www.youtube.com/embed/7YcW25PHnAA');

  // Maintenance Mode state
  const [maintenanceMode, setMaintenanceMode] = useState({ enabled: false, message: 'Site is currently under maintenance. Please check back later.' });

  const toEmbedUrl = (url = '') => {
    try {
      const s = String(url || '').trim();
      if (!s) return s;
      // youtu.be/<id>
      const yb = s.match(/^https?:\/\/(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{6,})/);
      if (yb) return `https://www.youtube.com/embed/${yb[1]}`;
      // youtube.com/watch?v=<id>
      const u = new URL(s);
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
        // already an embed or other path
        if (u.pathname.startsWith('/embed/')) return s;
      }
      return s;
    } catch {
      return url;
    }
  };

  // PCB Specifications state
  const [materials, setMaterials] = useState([]);
  const [finishes, setFinishes] = useState([]);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddFinish, setShowAddFinish] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: '', description: '' });
  const [newFinish, setNewFinish] = useState({ name: '', description: '' });
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editingFinish, setEditingFinish] = useState(null);

  // 3D Printing Specifications state
  const [threeDTechs, setThreeDTechs] = useState([]);
  const [threeDMaterials, setThreeDMaterials] = useState([]);
  const [threeDResolutions, setThreeDResolutions] = useState([]);
  const [threeDFinishings, setThreeDFinishings] = useState([]);
  const [showAddThreeDTech, setShowAddThreeDTech] = useState(false);
  const [showAddThreeDMaterial, setShowAddThreeDMaterial] = useState(false);
  const [showAddThreeDResolution, setShowAddThreeDResolution] = useState(false);
  const [showAddThreeDFinishing, setShowAddThreeDFinishing] = useState(false);
  const [newThreeDTech, setNewThreeDTech] = useState({ name: '', description: '' });
  const [newThreeDMaterial, setNewThreeDMaterial] = useState({ name: '', description: '', compatibleTechs: [] });
  const [newThreeDResolution, setNewThreeDResolution] = useState({ name: '', description: '' });
  const [newThreeDFinishing, setNewThreeDFinishing] = useState({ name: '', description: '' });
  const [editingThreeDTech, setEditingThreeDTech] = useState(null);
  const [editingThreeDMaterial, setEditingThreeDMaterial] = useState(null);
  const [editingThreeDResolution, setEditingThreeDResolution] = useState(null);
  const [editingThreeDFinishing, setEditingThreeDFinishing] = useState(null);

  useEffect(() => {
    const a = getAdmin();
    if (!a) { navigate('/pcbXpress/login'); return; }
    setAdmin(a);
    const t = getAdminToken();
    if (!t) { setLoading(false); return; }

    // Load SMTP settings
    api.adminGetSmtp(t)
      .then(res => {
        if (res?.smtp) {
          const { host = '', port = 587, secure = false, user = '', fromName = '', fromEmail = '', hasPassword: hp = false } = res.smtp;
          setForm(f => ({ ...f, host, port, secure, user, fromName, fromEmail }));
          setHasPassword(Boolean(hp));
        }
      })
      .catch(() => {});

    // Load factory video URL
    fetch(`${getApiBaseUrl()}/api/settings/factory-video`, {
      headers: { Authorization: `Bearer ${t}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data?.value) setFactoryVideoUrl(data.value);
      })
      .catch(() => {});

    // Load PCB specifications
    api.adminGetPcbSpecifications(t)
      .then(res => {
        setMaterials(res.materials || []);
        setFinishes(res.finishes || []);
      })
      .catch(() => {});

    // Load 3D Printing specifications
    api.adminGetThreeDPrintingSpecifications(t)
      .then(res => {
        setThreeDTechs(res.techs || []);
        setThreeDMaterials(res.materials || []);
        setThreeDResolutions(res.resolutions || []);
        setThreeDFinishings(res.finishings || []);
      })
      .catch(() => {});

    // Load maintenance mode settings
    api.adminGetMaintenanceMode(t)
      .then(res => {
        setMaintenanceMode({ enabled: res.enabled, message: res.message });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const t = getAdminToken();
      if (!t) throw new Error('Unauthorized');
      const body = { ...form };
      if (!body.password) delete body.password; // keep existing
      await api.adminUpdateSmtp(t, body);
      toast({ title: 'Settings saved' });
      if (body.password) setHasPassword(true);
      setForm(f => ({ ...f, password: '' }));
    } catch (err) {
      toast({ title: 'Save failed', description: err.message });
    }
  };

  const onSaveFactoryVideo = async () => {
    try {
      const t = getAdminToken();
      if (!t) throw new Error('Unauthorized');

      const normalized = toEmbedUrl(factoryVideoUrl);
      setFactoryVideoUrl(normalized);
      await fetch(`${getApiBaseUrl()}/api/settings/factory-video`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${t}`
        },
        body: JSON.stringify({ value: normalized })
      });

      toast({ title: 'Factory video URL saved' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message });
    }
  };

  const onSaveMaintenanceMode = async () => {
    try {
      const t = getAdminToken();
      if (!t) throw new Error('Unauthorized');
      await api.adminUpdateMaintenanceMode(t, maintenanceMode);
      toast({ title: 'Maintenance mode settings saved' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message });
    }
  };

  // PCB Material functions
  const handleAddMaterial = async () => {
    if (!newMaterial.name.trim()) return;
    try {
      const t = getAdminToken();
      await api.adminCreatePcbMaterial(t, newMaterial);
      toast({ title: 'Material added' });
      setNewMaterial({ name: '', description: '' });
      setShowAddMaterial(false);
      // Refresh materials
      const res = await api.adminGetPcbSpecifications(t);
      setMaterials(res.materials || []);
    } catch (err) {
      toast({ title: 'Failed to add material', description: err.message });
    }
  };

  const handleUpdateMaterial = async () => {
    if (!editingMaterial?.name?.trim()) return;
    try {
      const t = getAdminToken();
      await api.adminUpdatePcbMaterial(t, editingMaterial._id, editingMaterial);
      toast({ title: 'Material updated' });
      setEditingMaterial(null);
      // Refresh materials
      const res = await api.adminGetPcbSpecifications(t);
      setMaterials(res.materials || []);
    } catch (err) {
      toast({ title: 'Failed to update material', description: err.message });
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      const t = getAdminToken();
      await api.adminDeletePcbMaterial(t, id);
      toast({ title: 'Material deleted' });
      // Refresh materials
      const res = await api.adminGetPcbSpecifications(t);
      setMaterials(res.materials || []);
    } catch (err) {
      toast({ title: 'Failed to delete material', description: err.message });
    }
  };

  // PCB Finish functions
  const handleAddFinish = async () => {
    if (!newFinish.name.trim()) return;
    try {
      const t = getAdminToken();
      await api.adminCreatePcbFinish(t, newFinish);
      toast({ title: 'Finish added' });
      setNewFinish({ name: '', description: '' });
      setShowAddFinish(false);
      // Refresh finishes
      const res = await api.adminGetPcbSpecifications(t);
      setFinishes(res.finishes || []);
    } catch (err) {
      toast({ title: 'Failed to add finish', description: err.message });
    }
  };

  const handleUpdateFinish = async () => {
    if (!editingFinish?.name?.trim()) return;
    try {
      const t = getAdminToken();
      await api.adminUpdatePcbFinish(t, editingFinish._id, editingFinish);
      toast({ title: 'Finish updated' });
      setEditingFinish(null);
      // Refresh finishes
      const res = await api.adminGetPcbSpecifications(t);
      setFinishes(res.finishes || []);
    } catch (err) {
      toast({ title: 'Failed to update finish', description: err.message });
    }
  };

  const handleDeleteFinish = async (id) => {
    if (!confirm('Are you sure you want to delete this finish?')) return;
    try {
      const t = getAdminToken();
      await api.adminDeletePcbFinish(t, id);
      toast({ title: 'Finish deleted' });
      // Refresh finishes
      const res = await api.adminGetPcbSpecifications(t);
      setFinishes(res.finishes || []);
    } catch (err) {
      toast({ title: 'Failed to delete finish', description: err.message });
    }
  };

  // 3D Printing Tech functions
  const handleAddThreeDTech = async () => {
    if (!newThreeDTech.name.trim()) return;
    try {
      const t = getAdminToken();
      await api.adminCreateThreeDPrintingTech(t, newThreeDTech);
      toast({ title: 'Technology added' });
      setNewThreeDTech({ name: '', description: '' });
      setShowAddThreeDTech(false);
      // Refresh techs
      const res = await api.adminGetThreeDPrintingSpecifications(t);
      setThreeDTechs(res.techs || []);
    } catch (err) {
      toast({ title: 'Failed to add technology', description: err.message });
    }
  };

  const handleUpdateThreeDTech = async () => {
    if (!editingThreeDTech?.name?.trim()) return;
    try {
      const t = getAdminToken();
      await api.adminUpdateThreeDPrintingTech(t, editingThreeDTech._id, editingThreeDTech);
      toast({ title: 'Technology updated' });
      setEditingThreeDTech(null);
      // Refresh techs
      const res = await api.adminGetThreeDPrintingSpecifications(t);
      setThreeDTechs(res.techs || []);
    } catch (err) {
      toast({ title: 'Failed to update technology', description: err.message });
    }
  };

  const handleDeleteThreeDTech = async (id) => {
    if (!confirm('Are you sure you want to delete this technology?')) return;
    try {
      const t = getAdminToken();
      await api.adminDeleteThreeDPrintingTech(t, id);
      toast({ title: 'Technology deleted' });
      // Refresh techs
      const res = await api.adminGetThreeDPrintingSpecifications(t);
      setThreeDTechs(res.techs || []);
    } catch (err) {
      toast({ title: 'Failed to delete technology', description: err.message });
    }
  };

  // 3D Printing Material functions
  const handleAddThreeDMaterial = async () => {
    if (!newThreeDMaterial.name.trim()) return;
    try {
      const t = getAdminToken();
      await api.adminCreateThreeDPrintingMaterial(t, newThreeDMaterial);
      toast({ title: 'Material added' });
      setNewThreeDMaterial({ name: '', description: '', compatibleTechs: [] });
      setShowAddThreeDMaterial(false);
      // Refresh materials
      const res = await api.adminGetThreeDPrintingSpecifications(t);
      setThreeDMaterials(res.materials || []);
    } catch (err) {
      toast({ title: 'Failed to add material', description: err.message });
    }
  };

  const handleUpdateThreeDMaterial = async () => {
    if (!editingThreeDMaterial?.name?.trim()) return;
    try {
      const t = getAdminToken();
      await api.adminUpdateThreeDPrintingMaterial(t, editingThreeDMaterial._id, editingThreeDMaterial);
      toast({ title: 'Material updated' });
      setEditingThreeDMaterial(null);
      // Refresh materials
      const res = await api.adminGetThreeDPrintingSpecifications(t);
      setThreeDMaterials(res.materials || []);
    } catch (err) {
      toast({ title: 'Failed to update material', description: err.message });
    }
  };

  const handleDeleteThreeDMaterial = async (id) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      const t = getAdminToken();
      await api.adminDeleteThreeDPrintingMaterial(t, id);
      toast({ title: 'Material deleted' });
      // Refresh materials
      const res = await api.adminGetThreeDPrintingSpecifications(t);
      setThreeDMaterials(res.materials || []);
    } catch (err) {
      toast({ title: 'Failed to delete material', description: err.message });
    }
  };

  // 3D Printing Resolution functions
  const handleAddThreeDResolution = async () => {
    if (!newThreeDResolution.name.trim()) return;
    try {
      const t = getAdminToken();
      await api.adminCreateThreeDPrintingResolution(t, newThreeDResolution);
      toast({ title: 'Resolution added' });
      setNewThreeDResolution({ name: '', description: '' });
      setShowAddThreeDResolution(false);
      // Refresh resolutions
      const res = await api.adminGetThreeDPrintingSpecifications(t);
      setThreeDResolutions(res.resolutions || []);
    } catch (err) {
      toast({ title: 'Failed to add resolution', description: err.message });
    }
  };

  const handleUpdateThreeDResolution = async () => {
    if (!editingThreeDResolution?.name?.trim()) return;
    try {
      const t = getAdminToken();
      await api.adminUpdateThreeDPrintingResolution(t, editingThreeDResolution._id, editingThreeDResolution);
      toast({ title: 'Resolution updated' });
      setEditingThreeDResolution(null);
      // Refresh resolutions
      const res = await api.adminGetThreeDPrintingSpecifications(t);
      setThreeDResolutions(res.resolutions || []);
    } catch (err) {
      toast({ title: 'Failed to update resolution', description: err.message });
    }
  };

  const handleDeleteThreeDResolution = async (id) => {
    if (!confirm('Are you sure you want to delete this resolution?')) return;
    try {
      const t = getAdminToken();
      await api.adminDeleteThreeDPrintingResolution(t, id);
      toast({ title: 'Resolution deleted' });
      // Refresh resolutions
      const res = await api.adminGetThreeDPrintingSpecifications(t);
      setThreeDResolutions(res.resolutions || []);
    } catch (err) {
      toast({ title: 'Failed to delete resolution', description: err.message });
    }
  };

  // 3D Printing Finishing functions
  const handleAddThreeDFinishing = async () => {
    if (!newThreeDFinishing.name.trim()) return;
    try {
      const t = getAdminToken();
      await api.adminCreateThreeDPrintingFinishing(t, newThreeDFinishing);
      toast({ title: 'Finishing added' });
      setNewThreeDFinishing({ name: '', description: '' });
      setShowAddThreeDFinishing(false);
      // Refresh finishings
      const res = await api.adminGetThreeDPrintingSpecifications(t);
      setThreeDFinishings(res.finishings || []);
    } catch (err) {
      toast({ title: 'Failed to add finishing', description: err.message });
    }
  };

  const handleUpdateThreeDFinishing = async () => {
    if (!editingThreeDFinishing?.name?.trim()) return;
    try {
      const t = getAdminToken();
      await api.adminUpdateThreeDPrintingFinishing(t, editingThreeDFinishing._id, editingThreeDFinishing);
      toast({ title: 'Finishing updated' });
      setEditingThreeDFinishing(null);
      // Refresh finishings
      const res = await api.adminGetThreeDPrintingSpecifications(t);
      setThreeDFinishings(res.finishings || []);
    } catch (err) {
      toast({ title: 'Failed to update finishing', description: err.message });
    }
  };

  const handleDeleteThreeDFinishing = async (id) => {
    if (!confirm('Are you sure you want to delete this finishing?')) return;
    try {
      const t = getAdminToken();
      await api.adminDeleteThreeDPrintingFinishing(t, id);
      toast({ title: 'Finishing deleted' });
      // Refresh finishings
      const res = await api.adminGetThreeDPrintingSpecifications(t);
      setThreeDFinishings(res.finishings || []);
    } catch (err) {
      toast({ title: 'Failed to delete finishing', description: err.message });
    }
  };

  return (
    <AdminLayout admin={admin}>
      <Helmet>
        <title>Admin Settings | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="space-y-6">
        {/* Top Row - SMTP and Factory Video */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Host</label>
                    <Input name="host" value={form.host} onChange={onChange} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Port</label>
                    <Input name="port" type="number" min={1} max={65535} value={form.port} onChange={onChange} required />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input id="smtp-secure" type="checkbox" name="secure" checked={form.secure} onChange={onChange} />
                  <label htmlFor="smtp-secure" className="text-sm">Use TLS/SSL</label>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">User</label>
                    <Input name="user" value={form.user} onChange={onChange} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Password {hasPassword && <span className="text-xs text-muted-foreground">(set)</span>}</label>
                    <div className="relative">
                      <Input name="password" type={showSmtpPassword ? 'text' : 'password'} value={form.password} onChange={onChange} placeholder={hasPassword ? '••••••••' : ''} className="pr-10" />
                      <button type="button" onClick={() => setShowSmtpPassword((v) => !v)} className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-primary" tabIndex={-1} aria-label={showSmtpPassword ? 'Hide password' : 'Show password'}>
                        {showSmtpPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">From name (optional)</label>
                    <Input name="fromName" value={form.fromName} onChange={onChange} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">From email (optional)</label>
                    <Input name="fromEmail" type="email" value={form.fromEmail} onChange={onChange} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Factory video is hardcoded to /api/uploads/vst.mp4; admin URL input removed */}

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="maintenance-mode-enabled"
                  type="checkbox"
                  checked={maintenanceMode.enabled}
                  onChange={(e) => setMaintenanceMode({ ...maintenanceMode, enabled: e.target.checked })}
                />
                <label htmlFor="maintenance-mode-enabled" className="text-sm font-medium">
                  Enable Maintenance Mode
                </label>
              </div>
              <div>
                <label className="text-sm font-medium">Maintenance Message</label>
                <Input
                  value={maintenanceMode.message}
                  onChange={(e) => setMaintenanceMode({ ...maintenanceMode, message: e.target.value })}
                  placeholder="Site is currently under maintenance. Please check back later."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This message will be displayed to users when maintenance mode is enabled
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={onSaveMaintenanceMode}>Save Maintenance Settings</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PCB Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Materials Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Materials</h4>
                  <Button size="sm" onClick={() => setShowAddMaterial(true)}>Add</Button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {materials.map((material) => (
                    <div key={material._id} className="flex items-center justify-between py-1 px-2 text-sm border rounded">
                      <span className="font-medium truncate">{material.name}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingMaterial(material)}>
                          ✏️
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => handleDeleteMaterial(material._id)}>
                          🗑️
                        </Button>
                      </div>
                    </div>
                  ))}
                  {materials.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">No materials configured</p>
                  )}
                </div>
              </div>

              {/* Finishes Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Finishes</h4>
                  <Button size="sm" onClick={() => setShowAddFinish(true)}>Add</Button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {finishes.map((finish) => (
                    <div key={finish._id} className="flex items-center justify-between py-1 px-2 text-sm border rounded">
                      <span className="font-medium truncate">{finish.name}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingFinish(finish)}>
                          ✏️
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => handleDeleteFinish(finish._id)}>
                          🗑️
                        </Button>
                      </div>
                    </div>
                  ))}
                  {finishes.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">No finishes configured</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
  
          {/* Promotional Images Section */}
          <PromotionalImagesManager />
        </div>

        {/* Bottom Row - 3D Printing Specifications in compact layout */}
        <Card>
          <CardHeader>
            <CardTitle>3D Printing Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-3">
                {/* Technologies Section */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">Technologies</h4>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShowAddThreeDTech(true)}>+</Button>
                  </div>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {threeDTechs.map((tech) => (
                      <div key={tech._id} className="flex items-center justify-between py-1 px-2 text-xs border rounded">
                        <span className="font-medium truncate flex-1">{tech.name}</span>
                        <div className="flex gap-1">
                          <button className="text-blue-500 hover:text-blue-700 text-xs" onClick={() => setEditingThreeDTech(tech)}>✏️</button>
                          <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => handleDeleteThreeDTech(tech._id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                    {threeDTechs.length === 0 && (
                      <p className="text-xs text-muted-foreground py-1">No technologies</p>
                    )}
                  </div>
                </div>

                {/* Materials Section */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">Materials</h4>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShowAddThreeDMaterial(true)}>+</Button>
                  </div>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {threeDMaterials.map((material) => (
                      <div key={material._id} className="flex items-center justify-between py-1 px-2 text-xs border rounded">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{material.name}</span>
                          {material.compatibleTechs?.length > 0 && (
                            <span className="text-blue-600 truncate block opacity-75">
                              {material.compatibleTechs.slice(0, 2).join(', ')}{material.compatibleTechs.length > 2 ? '...' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 ml-1">
                          <button className="text-blue-500 hover:text-blue-700 text-xs" onClick={() => setEditingThreeDMaterial(material)}>✏️</button>
                          <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => handleDeleteThreeDMaterial(material._id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                    {threeDMaterials.length === 0 && (
                      <p className="text-xs text-muted-foreground py-1">No materials</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                {/* Resolutions Section */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">Resolutions</h4>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShowAddThreeDResolution(true)}>+</Button>
                  </div>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {threeDResolutions.map((resolution) => (
                      <div key={resolution._id} className="flex items-center justify-between py-1 px-2 text-xs border rounded">
                        <span className="font-medium truncate flex-1">{resolution.name}</span>
                        <div className="flex gap-1">
                          <button className="text-blue-500 hover:text-blue-700 text-xs" onClick={() => setEditingThreeDResolution(resolution)}>✏️</button>
                          <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => handleDeleteThreeDResolution(resolution._id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                    {threeDResolutions.length === 0 && (
                      <p className="text-xs text-muted-foreground py-1">No resolutions</p>
                    )}
                  </div>
                </div>

                {/* Finishing Section */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">Finishing</h4>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShowAddThreeDFinishing(true)}>+</Button>
                  </div>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {threeDFinishings.map((finishing) => (
                      <div key={finishing._id} className="flex items-center justify-between py-1 px-2 text-xs border rounded">
                        <span className="font-medium truncate flex-1">{finishing.name}</span>
                        <div className="flex gap-1">
                          <button className="text-blue-500 hover:text-blue-700 text-xs" onClick={() => setEditingThreeDFinishing(finishing)}>✏️</button>
                          <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => handleDeleteThreeDFinishing(finishing._id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                    {threeDFinishings.length === 0 && (
                      <p className="text-xs text-muted-foreground py-1">No finishing options</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Material Dialog */}
      <Dialog open={showAddMaterial} onOpenChange={setShowAddMaterial}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add PCB Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newMaterial.name}
                onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                placeholder="e.g., FR4"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={newMaterial.description}
                onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddMaterial(false)}>Cancel</Button>
              <Button onClick={handleAddMaterial}>Add Material</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Finish Dialog */}
      <Dialog open={showAddFinish} onOpenChange={setShowAddFinish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add PCB Finish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newFinish.name}
                onChange={(e) => setNewFinish({ ...newFinish, name: e.target.value })}
                placeholder="e.g., HASL"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={newFinish.description}
                onChange={(e) => setNewFinish({ ...newFinish, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddFinish(false)}>Cancel</Button>
              <Button onClick={handleAddFinish}>Add Finish</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit PCB Material</DialogTitle>
          </DialogHeader>
          {editingMaterial && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingMaterial.name}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  value={editingMaterial.description}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="material-active"
                  checked={editingMaterial.isActive}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, isActive: e.target.checked })}
                />
                <label htmlFor="material-active" className="text-sm">Active</label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingMaterial(null)}>Cancel</Button>
                <Button onClick={handleUpdateMaterial}>Update Material</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Finish Dialog */}
      <Dialog open={!!editingFinish} onOpenChange={() => setEditingFinish(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit PCB Finish</DialogTitle>
          </DialogHeader>
          {editingFinish && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingFinish.name}
                  onChange={(e) => setEditingFinish({ ...editingFinish, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  value={editingFinish.description}
                  onChange={(e) => setEditingFinish({ ...editingFinish, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="finish-active"
                  checked={editingFinish.isActive}
                  onChange={(e) => setEditingFinish({ ...editingFinish, isActive: e.target.checked })}
                />
                <label htmlFor="finish-active" className="text-sm">Active</label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingFinish(null)}>Cancel</Button>
                <Button onClick={handleUpdateFinish}>Update Finish</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 3D Printing Technology Dialogs */}
      <Dialog open={showAddThreeDTech} onOpenChange={setShowAddThreeDTech}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add 3D Printing Technology</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newThreeDTech.name}
                onChange={(e) => setNewThreeDTech({ ...newThreeDTech, name: e.target.value })}
                placeholder="e.g., FDM, SLA, SLS, DLP, PolyJet"
              />
              <p className="text-xs text-muted-foreground mt-1">Common technologies: FDM (Fused Deposition), SLA (Stereolithography), SLS (Selective Laser Sintering)</p>
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={newThreeDTech.description}
                onChange={(e) => setNewThreeDTech({ ...newThreeDTech, description: e.target.value })}
                placeholder="e.g., Fused Deposition Modeling - Cost-effective for prototyping and functional parts"
              />
              <p className="text-xs text-muted-foreground mt-1">Describe the technology's key features, use cases, and advantages</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddThreeDTech(false)}>Cancel</Button>
              <Button onClick={handleAddThreeDTech}>Add Technology</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddThreeDMaterial} onOpenChange={setShowAddThreeDMaterial}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add 3D Printing Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newThreeDMaterial.name}
                onChange={(e) => setNewThreeDMaterial({ ...newThreeDMaterial, name: e.target.value })}
                placeholder="e.g., PLA, ABS, PETG, TPU, Nylon, Resin, Tough Resin"
              />
              <p className="text-xs text-muted-foreground mt-1">Common materials: PLA (biodegradable), ABS (durable), PETG (chemical resistant), TPU (flexible)</p>
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={newThreeDMaterial.description}
                onChange={(e) => setNewThreeDMaterial({ ...newThreeDMaterial, description: e.target.value })}
                placeholder="e.g., Polylactic Acid - Biodegradable, easy to print, good for prototyping"
              />
              <p className="text-xs text-muted-foreground mt-1">Describe material properties, use cases, and key characteristics</p>
            </div>
            <div>
              <label className="text-sm font-medium">Compatible Technologies</label>
              <Input
                value={newThreeDMaterial.compatibleTechs.join(', ')}
                onChange={(e) => setNewThreeDMaterial({
                  ...newThreeDMaterial,
                  compatibleTechs: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
                placeholder="e.g., FDM, SLA, SLS (comma separated)"
              />
              <p className="text-xs text-muted-foreground mt-1">List technologies that can use this material: FDM, SLA, SLS, DLP, etc.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddThreeDMaterial(false)}>Cancel</Button>
              <Button onClick={handleAddThreeDMaterial}>Add Material</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddThreeDResolution} onOpenChange={setShowAddThreeDResolution}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add 3D Printing Resolution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newThreeDResolution.name}
                onChange={(e) => setNewThreeDResolution({ ...newThreeDResolution, name: e.target.value })}
                placeholder="e.g., Draft (0.3mm), Standard (0.2mm), High (0.1mm), Ultra (0.05mm)"
              />
              <p className="text-xs text-muted-foreground mt-1">Quality levels: Draft (fast, rough), Standard (balanced), High (detailed), Ultra (precision)</p>
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={newThreeDResolution.description}
                onChange={(e) => setNewThreeDResolution({ ...newThreeDResolution, description: e.target.value })}
                placeholder="e.g., High quality - 0.1mm layer height, excellent surface finish, slower print time"
              />
              <p className="text-xs text-muted-foreground mt-1">Describe print quality, speed, surface finish, and recommended use cases</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddThreeDResolution(false)}>Cancel</Button>
              <Button onClick={handleAddThreeDResolution}>Add Resolution</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddThreeDFinishing} onOpenChange={setShowAddThreeDFinishing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add 3D Printing Finishing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newThreeDFinishing.name}
                onChange={(e) => setNewThreeDFinishing({ ...newThreeDFinishing, name: e.target.value })}
                placeholder="e.g., Raw, Sanded, Polished, Painted, Dyed, Primed, Assembly"
              />
              <p className="text-xs text-muted-foreground mt-1">Common finishes: Raw (no treatment), Sanded (smooth surface), Polished (shiny), Painted (colored), Dyed (tinted)</p>
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={newThreeDFinishing.description}
                onChange={(e) => setNewThreeDFinishing({ ...newThreeDFinishing, description: e.target.value })}
                placeholder="e.g., Professional sanding and polishing for smooth, glossy finish suitable for display models"
              />
              <p className="text-xs text-muted-foreground mt-1">Describe the finishing process, expected results, and recommended applications</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddThreeDFinishing(false)}>Cancel</Button>
              <Button onClick={handleAddThreeDFinishing}>Add Finishing</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit 3D Printing Dialogs */}
      <Dialog open={!!editingThreeDTech} onOpenChange={() => setEditingThreeDTech(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit 3D Printing Technology</DialogTitle>
          </DialogHeader>
          {editingThreeDTech && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingThreeDTech.name}
                  onChange={(e) => setEditingThreeDTech({ ...editingThreeDTech, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  value={editingThreeDTech.description}
                  onChange={(e) => setEditingThreeDTech({ ...editingThreeDTech, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tech-active"
                  checked={editingThreeDTech.isActive}
                  onChange={(e) => setEditingThreeDTech({ ...editingThreeDTech, isActive: e.target.checked })}
                />
                <label htmlFor="tech-active" className="text-sm">Active</label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingThreeDTech(null)}>Cancel</Button>
                <Button onClick={handleUpdateThreeDTech}>Update Technology</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingThreeDMaterial} onOpenChange={() => setEditingThreeDMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit 3D Printing Material</DialogTitle>
          </DialogHeader>
          {editingThreeDMaterial && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingThreeDMaterial.name}
                  onChange={(e) => setEditingThreeDMaterial({ ...editingThreeDMaterial, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  value={editingThreeDMaterial.description}
                  onChange={(e) => setEditingThreeDMaterial({ ...editingThreeDMaterial, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Compatible Technologies</label>
                <Input
                  value={editingThreeDMaterial.compatibleTechs?.join(', ') || ''}
                  onChange={(e) => setEditingThreeDMaterial({
                    ...editingThreeDMaterial,
                    compatibleTechs: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="material-3d-active"
                  checked={editingThreeDMaterial.isActive}
                  onChange={(e) => setEditingThreeDMaterial({ ...editingThreeDMaterial, isActive: e.target.checked })}
                />
                <label htmlFor="material-3d-active" className="text-sm">Active</label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingThreeDMaterial(null)}>Cancel</Button>
                <Button onClick={handleUpdateThreeDMaterial}>Update Material</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingThreeDResolution} onOpenChange={() => setEditingThreeDResolution(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit 3D Printing Resolution</DialogTitle>
          </DialogHeader>
          {editingThreeDResolution && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingThreeDResolution.name}
                  onChange={(e) => setEditingThreeDResolution({ ...editingThreeDResolution, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  value={editingThreeDResolution.description}
                  onChange={(e) => setEditingThreeDResolution({ ...editingThreeDResolution, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="resolution-active"
                  checked={editingThreeDResolution.isActive}
                  onChange={(e) => setEditingThreeDResolution({ ...editingThreeDResolution, isActive: e.target.checked })}
                />
                <label htmlFor="resolution-active" className="text-sm">Active</label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingThreeDResolution(null)}>Cancel</Button>
                <Button onClick={handleUpdateThreeDResolution}>Update Resolution</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingThreeDFinishing} onOpenChange={() => setEditingThreeDFinishing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit 3D Printing Finishing</DialogTitle>
          </DialogHeader>
          {editingThreeDFinishing && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingThreeDFinishing.name}
                  onChange={(e) => setEditingThreeDFinishing({ ...editingThreeDFinishing, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  value={editingThreeDFinishing.description}
                  onChange={(e) => setEditingThreeDFinishing({ ...editingThreeDFinishing, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="finishing-active"
                  checked={editingThreeDFinishing.isActive}
                  onChange={(e) => setEditingThreeDFinishing({ ...editingThreeDFinishing, isActive: e.target.checked })}
                />
                <label htmlFor="finishing-active" className="text-sm">Active</label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingThreeDFinishing(null)}>Cancel</Button>
                <Button onClick={handleUpdateThreeDFinishing}>Update Finishing</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
