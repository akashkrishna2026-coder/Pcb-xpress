import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { getAdmin, getAdminToken, clearAdmin, clearAdminToken } from '@/lib/storage';

const AdminAiAgentSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    model: 'gpt-4.1-mini',
    systemPrompt: '',
    guardrails: '',
    hasApiKey: false,
    modelSettings: { temperature: 0.2, top_p: 1 },
    pricingRules: { markupUnavailable: 0.25, scaleByScarcity: true, rounding: 'nearest_0.99', minPrice: 0, maxPrice: 0 },
    searchVendors: [],
  });
  const [apiKey, setApiKey] = useState('');
  const [clearKey, setClearKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [history, setHistory] = useState([]);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [previewProductId, setPreviewProductId] = useState('');
  const [preview, setPreview] = useState(null);
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(true);

  useEffect(() => {
    const a = getAdmin();
    if (!a) { navigate('/pcbXpress/login'); return; }
    setAdmin(a);
  }, [navigate]);

  useEffect(() => {
    (async () => {
      const token = getAdminToken();
      if (!token) return;
      try {
        const s = await api.getAiPricingSettings(token);
        setSettings((prev) => ({
          ...prev,
          ...(s.settings || {}),
          modelSettings: { temperature: 0.2, top_p: 1, ...(s.settings?.modelSettings || {}) },
          pricingRules: { markupUnavailable: 0.25, scaleByScarcity: true, rounding: 'nearest_0.99', minPrice: 0, maxPrice: 0, ...(s.settings?.pricingRules || {}) },
          searchVendors: Array.isArray(s.settings?.searchVendors) ? s.settings.searchVendors : [],
        }));
        const h = await api.getAiPricingHistory(token);
        setHistory(h.history || []);
      } catch (e) {
        toast({ title: 'Failed to load AI settings', description: e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const handleSignOut = () => {
    clearAdmin();
    clearAdminToken();
    toast({ title: 'Signed out of admin' });
    navigate('/');
  };

  const onSave = async () => {
    const token = getAdminToken();
    if (!token) { toast({ title: 'Session expired', description: 'Please login again' }); return; }
    setSaving(true);
    try {
      const body = {
        model: settings.model,
        systemPrompt: settings.systemPrompt,
        guardrails: settings.guardrails,
        modelSettings: settings.modelSettings,
        pricingRules: settings.pricingRules,
        searchVendors: settings.searchVendors,
      };
      if (clearKey) body.resetApiKey = true;
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      const res = await api.updateAiPricingSettings(token, body);
      setSettings((prev) => ({
        ...prev,
        ...(res.settings || {}),
        modelSettings: { temperature: 0.2, top_p: 1, ...(res.settings?.modelSettings || {}) },
        pricingRules: { markupUnavailable: 0.25, scaleByScarcity: true, rounding: 'nearest_0.99', minPrice: 0, maxPrice: 0, ...(res.settings?.pricingRules || {}) },
        searchVendors: Array.isArray(res.settings?.searchVendors) ? res.settings.searchVendors : [],
      }));
      setApiKey('');
      setClearKey(false);
      toast({ title: 'AI settings saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const onViewReport = async (runId) => {
    const token = getAdminToken();
    if (!token) { toast({ title: 'Session expired', description: 'Please login again' }); return; }
    setReportLoading(true);
    setSelectedRunId(runId);
    try {
      const res = await api.getAiPricingRun(token, runId);
      if (!res.report) {
        toast({ title: 'No detailed report', description: 'This run does not have a stored report.' });
        setReport(null);
        return;
      }
      setReport(res.report || null);
    } catch (e) {
      toast({ title: 'Failed to load report', description: e.message });
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  const onDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-pricing-report-${report.runId || 'latest'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDeleteReport = async (runId) => {
    console.log('onDeleteReport called with runId:', runId);
    if (!runId) {
      console.error('No runId provided to onDeleteReport');
      return;
    }
    if (!window.confirm('Delete this report? This cannot be undone.')) {
      console.log('User cancelled delete for runId:', runId);
      return;
    }
    const token = getAdminToken();
    console.log('Token present:', !!token);
    if (!token) {
      console.error('No admin token found');
      toast({ title: 'Session expired', description: 'Please login again' });
      return;
    }
    try {
      console.log('Calling api.deleteAiPricingRun with runId:', runId);
      await api.deleteAiPricingRun(token, runId);
      console.log('Delete API call successful for runId:', runId);
      toast({ title: 'Report deleted' });
      setHistory((prev) => (Array.isArray(prev) ? prev.filter((h) => h.runId !== runId) : prev));
      if (selectedRunId === runId) { setReport(null); setSelectedRunId(''); }
    } catch (e) {
      console.error('Delete failed for runId:', runId, 'Error:', e);
      toast({ title: 'Delete failed', description: e.message });
    }
  };

  const onAddVendor = () => {
    setSettings((prev) => ({
      ...prev,
      searchVendors: [...(prev.searchVendors || []), { name: '', url: '', enabled: true }],
    }));
  };

  const onVendorChange = (idx, patch) => {
    const next = [...(settings.searchVendors || [])];
    next[idx] = { ...next[idx], ...patch };
    setSettings({ ...settings, searchVendors: next });
  };

  const onRemoveVendor = (idx) => {
    const next = [...(settings.searchVendors || [])];
    next.splice(idx, 1);
    setSettings({ ...settings, searchVendors: next });
  };

  const onPreview = async () => {
    const token = getAdminToken();
    if (!token) { toast({ title: 'Session expired', description: 'Please login again' }); return; }
    if (!previewProductId.trim()) { toast({ title: 'Enter a product ID' }); return; }
    try {
      const res = await api.previewAiPricing(token, { productId: previewProductId.trim() });
      setPreview(res);
    } catch (e) {
      setPreview(null);
      toast({ title: 'Preview failed', description: e.message });
    }
  };

  const onRun = async () => {
    const token = getAdminToken();
    if (!token) { toast({ title: 'Session expired', description: 'Please login again' }); return; }
    setRunning(true);
    try {
      await api.runAiPricing(token, { dryRun });
      toast({ title: `AI pricing started (${dryRun ? 'dry run' : 'apply'})` });
    } catch (e) {
      toast({ title: 'Run failed', description: e.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <AdminLayout admin={admin} onLogout={handleSignOut}>
      <Helmet>
        <title>AI Agent Settings | PCB Xpress</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Agent Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">Model</label>
                  <Input value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })} placeholder="gpt-4.1-mini" />
                </div>
                <div>
                  <label className="text-sm font-medium">System Prompt</label>
                  <Textarea
                    rows={20}
                    className="font-mono text-sm"
                    value={settings.systemPrompt}
                    onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                    placeholder="Enter detailed system prompt for AI agent..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Guardrails</label>
                  <Textarea
                    rows={15}
                    className="font-mono text-sm"
                    value={settings.guardrails}
                    onChange={(e) => setSettings({ ...settings, guardrails: e.target.value })}
                    placeholder="Enter safety constraints and ethical guidelines..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Temperature</label>
                    <Input type="number" step="0.01" min="0" max="1" value={settings.modelSettings?.temperature ?? 0.2} onChange={(e) => setSettings({ ...settings, modelSettings: { ...settings.modelSettings, temperature: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Top P</label>
                    <Input type="number" step="0.01" min="0" max="1" value={settings.modelSettings?.top_p ?? 1} onChange={(e) => setSettings({ ...settings, modelSettings: { ...settings.modelSettings, top_p: Number(e.target.value) } })} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">OpenAI API Key</label>
                  <div className="relative">
                    <Input type={showApiKey ? 'text' : 'password'} placeholder={settings.hasApiKey ? 'Key stored (leave blank to keep)' : 'sk-...'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="pr-10" />
                    <button type="button" onClick={() => setShowApiKey((v) => !v)} className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-primary" tabIndex={-1} aria-label={showApiKey ? 'Hide key' : 'Show key'}>
                      {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {settings.hasApiKey && (
                    <label className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <input type="checkbox" checked={clearKey} onChange={(e) => setClearKey(e.target.checked)} /> Clear stored key on save
                    </label>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Allowed Vendors</h4>
                    <Button type="button" variant="secondary" onClick={onAddVendor}>Add Vendor</Button>
                  </div>
                  <div className="space-y-2">
                    {(settings.searchVendors || []).map((v, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <input type="checkbox" className="col-span-1" checked={v.enabled !== false} onChange={(e) => onVendorChange(idx, { enabled: e.target.checked })} />
                        <Input className="col-span-4" placeholder="Name" value={v.name || ''} onChange={(e) => onVendorChange(idx, { name: e.target.value })} />
                        <Input className="col-span-6" placeholder="https://vendor.example" value={v.url || ''} onChange={(e) => onVendorChange(idx, { url: e.target.value })} />
                        <Button className="col-span-1" variant="destructive" type="button" onClick={() => onRemoveVendor(idx)}>Remove</Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Pricing Rules</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Markup Unavailable (0-3)</label>
                      <Input type="number" step="0.01" min="0" max="3" value={settings.pricingRules?.markupUnavailable ?? 0.25} onChange={(e) => setSettings({ ...settings, pricingRules: { ...settings.pricingRules, markupUnavailable: Number(e.target.value) } })} />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="text-sm font-medium mr-2">Scale by scarcity</label>
                      <input type="checkbox" checked={!!settings.pricingRules?.scaleByScarcity} onChange={(e) => setSettings({ ...settings, pricingRules: { ...settings.pricingRules, scaleByScarcity: e.target.checked } })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Rounding</label>
                      <select className="w-full border rounded px-3 py-2" value={settings.pricingRules?.rounding || 'nearest_0.99'} onChange={(e) => setSettings({ ...settings, pricingRules: { ...settings.pricingRules, rounding: e.target.value } })}>
                        <option value="nearest_0.99">Nearest 0.99</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Min Price</label>
                      <Input type="number" step="0.01" min="0" value={settings.pricingRules?.minPrice ?? 0} onChange={(e) => setSettings({ ...settings, pricingRules: { ...settings.pricingRules, minPrice: Number(e.target.value) } })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Max Price (0 = no cap)</label>
                      <Input type="number" step="0.01" min="0" value={settings.pricingRules?.maxPrice ?? 0} onChange={(e) => setSettings({ ...settings, pricingRules: { ...settings.pricingRules, maxPrice: Number(e.target.value) } })} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3">Run</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Products</th>
                      <th className="py-2 pr-3">Doubled</th>
                      <th className="py-2 pr-3">Normalized</th>
                      <th className="py-2 pr-3">Updated</th>
                      <th className="py-2 pr-3">Started</th>
                      <th className="py-2 pr-3">Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 10).map((h) => (
                      <tr key={h.runId} className="border-b last:border-0">
                        <td className="py-2 pr-3 whitespace-nowrap">{h.runId?.slice(0, 8) || '-'}</td>
                        <td className="py-2 pr-3 capitalize">{h.status}</td>
                        <td className="py-2 pr-3">{h.totals?.products ?? 0}</td>
                        <td className="py-2 pr-3">{h.totals?.doubled ?? 0}</td>
                        <td className="py-2 pr-3">{h.totals?.normalized ?? 0}</td>
                        <td className="py-2 pr-3">{h.totals?.updated ?? 0}</td>
                        <td className="py-2 pr-3">{h.startedAt ? new Date(h.startedAt).toLocaleString() : '-'}</td>
                        <td className="py-2 pr-3 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => onViewReport(h.runId)}>View</Button>
                          <Button size="sm" variant="destructive" onClick={() => onDeleteReport(h.runId)}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {report && (
          <Card>
            <CardHeader>
              <CardTitle>Run Report {selectedRunId ? `(${selectedRunId.slice(0,8)})` : ''}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">Started: {report.startedAt ? new Date(report.startedAt).toLocaleString() : '-'} · Finished: {report.finishedAt ? new Date(report.finishedAt).toLocaleString() : '-'}</div>
              <div className="text-sm">Status: <span className="capitalize">{report.status}</span> · Dry run: {report.dryRun ? 'Yes' : 'No'}</div>
              <div className="text-sm">Totals — Products: {report.totals?.products ?? 0}, Doubled: {report.totals?.doubled ?? 0}, Normalized: {report.totals?.normalized ?? 0}, Updated: {report.totals?.updated ?? 0}</div>
              <div>
                <h4 className="font-medium">Pricing Rules</h4>
                <div className="text-sm text-muted-foreground">Markup Unavailable: {report.pricingRules?.markupUnavailable ?? '-'}, Scale by scarcity: {String(report.pricingRules?.scaleByScarcity)}, Rounding: {report.pricingRules?.rounding}, Min: {report.pricingRules?.minPrice ?? 0}, Max: {report.pricingRules?.maxPrice ?? 0}</div>
              </div>
              <div>
                <h4 className="font-medium">Domains Used</h4>
                <div className="text-sm text-muted-foreground">{(report.vendorsUsed || []).map(v => v.url || v.name).filter(Boolean).join(', ') || '-'}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={onDownloadReport}>Download JSON</Button>
                <Button size="sm" variant="destructive" onClick={() => onDeleteReport(report.runId)}>Delete Report</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Avail</th>
                      <th className="py-2 pr-3">Hits</th>
                      <th className="py-2 pr-3">Old</th>
                      <th className="py-2 pr-3">New</th>
                      <th className="py-2 pr-3">Action</th>
                      <th className="py-2 pr-3">URLs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.items || []).slice(0, 200).map((it, idx) => (
                      <tr key={`${it.productId}-${idx}`} className="border-b last:border-0">
                        <td className="py-2 pr-3">{it.name}</td>
                        <td className="py-2 pr-3 capitalize">{it.availabilityStatus}</td>
                        <td className="py-2 pr-3">{it.availabilityHits}</td>
                        <td className="py-2 pr-3">{it.oldPrice}</td>
                        <td className="py-2 pr-3">{it.newPrice}</td>
                        <td className="py-2 pr-3 capitalize">{it.priceAction}</td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">{(it.sampleUrls || []).join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(report.items || []).length > 200 && (
                  <div className="text-xs text-muted-foreground mt-2">Showing first 200 items. Download full JSON for complete details.</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Preview & Run</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className="text-sm font-medium">Product ID</label>
                <Input value={previewProductId} onChange={(e) => setPreviewProductId(e.target.value)} placeholder="Mongo _id or numeric id" />
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={onPreview}>Preview Price</Button>
              </div>
            </div>
            {preview && (
              <div className="text-sm border rounded p-3 bg-muted/30">
                <div className="font-medium mb-1">{preview.product?.name}</div>
                <div>Base price: {preview.product?.basePrice}</div>
                <div>Current price: {preview.product?.currentPrice}</div>
                <div className="mt-1">Computed price: <span className="font-semibold">{preview.computedPrice}</span></div>
                <div className="mt-2">Availability hits: {preview.availability?.hits}</div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} /> Dry run (no DB writes)
              </label>
              <Button type="button" onClick={onRun} disabled={running}>{running ? 'Starting…' : 'Run Repricing'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAiAgentSettingsPage;
