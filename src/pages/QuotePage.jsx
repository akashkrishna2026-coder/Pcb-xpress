import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
// No client-side pricing; admin will send final quote.
import { addQuote, getToken, getUser } from '@/lib/storage';
import { api } from '@/lib/api';
import { useCallback } from 'react';

const QuotePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();

  const token = getToken();
  if (!token) {
    return (
      <>
        <Helmet>
          <title>Login Required | PCB Xpress</title>
          <meta name="description" content="You must be logged in to create a quote." />
        </Helmet>
        <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
          <div className="container max-w-lg text-center px-4">
            <div className="mb-8">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Access Required
              </h1>
              <p className="text-xl text-muted-foreground mb-2">
                Join PCB Xpress to Get Your Quote
              </p>
              <p className="text-muted-foreground">
                Create an account or sign in to access our quote system and start your PCB or 3D printing project.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login">
                <Button size="lg" className="w-full sm:w-auto px-8">
                  Sign In
                </Button>
              </Link>
              <Link to="/login?mode=signup">
                <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
                  Create Account
                </Button>
              </Link>
            </div>
            <div className="mt-8 text-sm text-muted-foreground">
              <p>Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in here</Link></p>
            </div>
          </div>
        </section>
      </>
    );
  }

  const initialService = params.get('service') === '3dprinting' ? '3dprinting' : 'pcb';
  const initialTech = params.get('tech');

  const [service, setService] = useState(initialService);
  const [delivery, setDelivery] = useState({ speed: 'standard' });
  const [contact, setContact] = useState({ name: '', email: '', company: '', phone: '', address: '', gstin: '', notes: '' });
  const [profileFields, setProfileFields] = useState({ name: false, email: false, phone: false });

  // Auto-fill contact information from logged-in user
  useEffect(() => {
    const user = getUser();
    if (user) {
      const updatedContact = {
        name: user.name || contact.name,
        email: user.email || contact.email,
        phone: user.phone || contact.phone,
        // Keep existing company, address, and notes as they're not in user profile
      };
      const updatedProfileFields = {
        name: !!user.name,
        email: !!user.email,
        phone: !!user.phone,
      };
      
      setContact(updatedContact);
      setProfileFields(updatedProfileFields);
    }
  }, []);

  // PCB state
  const [specs, setSpecs] = useState({ 
    widthMm: 100, 
    heightMm: 100, 
    layers: 1, 
    material: 'FR4', 
    finish: 'HASL', 
    quantity: 5,
    baseCopperThickness: '18/18',
    mask: 'Both',
    maskColor: 'Green',
    legendColor: 'White',
    layerType: 'Single'
  });
  const [bomFile, setBomFile] = useState(null);
  const [gerberFile, setGerberFile] = useState(null);
  const [bomStats, setBomStats] = useState({ totalLines: 0, uniqueParts: 0 });

  
  const [fieldErrors, setFieldErrors] = useState({});

  // PCB Specifications
  const [pcbMaterials, setPcbMaterials] = useState([]);
  const [pcbFinishes, setPcbFinishes] = useState([]);
  const [loadingSpecs, setLoadingSpecs] = useState(true);

  // 3D Printing Specifications
  const [threeDTechs, setThreeDTechs] = useState([]);
  const [threeDMaterials, setThreeDMaterials] = useState([]);
  const [threeDResolutions, setThreeDResolutions] = useState([]);
  const [threeDFinishings, setThreeDFinishings] = useState([]);
  const [loadingThreeDSpecs, setLoadingThreeDSpecs] = useState(true);

  // 3D printing state
  const [specs3d, setSpecs3d] = useState({
    tech: initialTech && ['fdm', 'sla', 'sls'].includes(initialTech) ? initialTech : 'fdm',
    material: 'PLA',
    dims: { xMm: 50, yMm: 50, zMm: 30 },
    resolution: 'standard',
    infillPercent: 20,
    finishing: 'raw',
    quantity: 1,
  });
  const [modelFile, setModelFile] = useState(null);

  // PCB Assembly state
  const [specsAssembly, setSpecsAssembly] = useState({
    boardWidthMm: 100,
    boardHeightMm: 100,
    layers: 2,
    assemblyType: 'smt',
    componentCount: 50,
    solderType: 'lead_free',
    quantity: 5,
  });
  const [assemblyFile, setAssemblyFile] = useState(null);

  // Wire Harness state
  const [specsHarness, setSpecsHarness] = useState({
    boardWidthMm: 100,
    boardHeightMm: 100,
    wireCount: 10,
    connectorCount: 4,
    wireGauge: '18AWG',
    connectorType: 'molex',
    harnessType: 'power',
    quantity: 5,
  });
  const [harnessFile, setHarnessFile] = useState(null);

  // Testing state
  const [specsTesting, setSpecsTesting] = useState({
    testType: 'functional',
    requirements: '',
    quantity: 5,
  });
  const [testFile, setTestFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const urlService = params.get('service');
    if (urlService === 'pcb' || urlService === '3dprinting' || urlService === 'pcb_assembly' || urlService === 'wire_harness' || urlService === 'testing') setService(urlService);
    const urlTech = params.get('tech');
    if (urlTech && ['fdm', 'sla', 'sls'].includes(urlTech)) setSpecs3d((s) => ({ ...s, tech: urlTech }));
  }, [params]);

  // Load PCB specifications
  useEffect(() => {
    const loadPcbSpecs = async () => {
      try {
        const res = await api.getPcbSpecifications();
        const materials = res.materials || [];
        const finishes = res.finishes || [];
        setPcbMaterials(materials);
        setPcbFinishes(finishes);

        // Ensure currently selected values are valid against backend-provided lists
        const materialNames = materials.map(m => m.name);
        const finishNames = finishes.map(f => f.name);
        setSpecs(prev => {
          let nextMaterial = prev.material;
          let nextFinish = prev.finish;
          if (materialNames.length > 0 && !materialNames.includes(nextMaterial)) {
            nextMaterial = materialNames[0];
          }
          if (finishNames.length > 0 && !finishNames.includes(nextFinish)) {
            nextFinish = finishNames[0];
          }
          return { ...prev, material: nextMaterial, finish: nextFinish };
        });
      } catch (err) {
        console.error('Failed to load PCB specifications:', err);
        // Fallback to hardcoded defaults if API fails
        const fallbackMaterials = [
          { id: 'fr4', name: 'FR4', description: 'Standard fiberglass material' },
          { id: 'isola', name: 'Isola', description: 'High-performance material' },
          { id: 'rogers', name: 'Rogers', description: 'High-frequency material' }
        ];
        const fallbackFinishes = [
          { id: 'hasl', name: 'HASL', description: 'Hot Air Solder Leveling' },
          { id: 'enig', name: 'ENIG', description: 'Electroless Nickel Immersion Gold' },
          { id: 'osp', name: 'OSP', description: 'Organic Solderability Preservative' }
        ];
        setPcbMaterials(fallbackMaterials);
        setPcbFinishes(fallbackFinishes);
        setSpecs(s => ({
          ...s,
          material: s.material || 'FR4',
          finish: s.finish || 'HASL'
        }));
      } finally {
        setLoadingSpecs(false);
      }
    };

    loadPcbSpecs();
  }, []);

  // Load 3D Printing specifications
  useEffect(() => {
    const loadThreeDSpecs = async () => {
      try {
        const res = await api.getThreeDPrintingSpecifications();
        const techs = res.techs || [];
        const materials = res.materials || [];
        const resolutions = res.resolutions || [];
        const finishings = res.finishings || [];
        setThreeDTechs(techs);
        setThreeDMaterials(materials);
        setThreeDResolutions(resolutions);
        setThreeDFinishings(finishings);

        // Canonicalize current selections against backend-provided lists (case-insensitive)
        const pickFrom = (list = [], current, fallback) => {
          if (!Array.isArray(list) || list.length === 0) return fallback;
          const names = list.map(i => i.name);
          const found = names.find(n => String(n).toLowerCase() === String(current || '').toLowerCase());
          return found || names[0];
        };

        setSpecs3d(prev => {
          let nextTech = pickFrom(techs, prev.tech, (prev.tech || 'FDM'));
          // Ensure common casing (FDM/SLA/SLS)
          const nextTechUpper = String(nextTech).toUpperCase();
          if (['FDM','SLA','SLS'].includes(nextTechUpper)) nextTech = nextTechUpper;

          // Material compatibility: prefer materials whose compatibleTechs includes the selected tech
          let nextMaterial = prev.material;
          if (materials.length > 0) {
            const byName = materials.find(m => String(m.name).toLowerCase() === String(prev.material || '').toLowerCase());
            const compatible = materials.find(m => Array.isArray(m.compatibleTechs) && m.compatibleTechs.includes(nextTech));
            nextMaterial = (byName && Array.isArray(byName.compatibleTechs) && byName.compatibleTechs.includes(nextTech))
              ? byName.name
              : (compatible ? compatible.name : materials[0].name);
          }

          const nextResolution = pickFrom(resolutions, prev.resolution, (prev.resolution || 'Standard'));
          const nextFinishing = pickFrom(finishings, prev.finishing, (prev.finishing || 'Raw'));

          return {
            ...prev,
            tech: nextTech,
            material: nextMaterial,
            resolution: nextResolution,
            finishing: nextFinishing,
          };
        });
      } catch (err) {
        console.error('Failed to load 3D printing specifications:', err);
        // Fallback to hardcoded defaults if API fails
        setThreeDTechs([
          { id: 'fdm', name: 'FDM', description: 'Fused Deposition Modeling' },
          { id: 'sla', name: 'SLA', description: 'Stereolithography' },
          { id: 'sls', name: 'SLS', description: 'Selective Laser Sintering' }
        ]);
        setThreeDMaterials([
          { id: 'pla', name: 'PLA', description: 'Polylactic Acid', compatibleTechs: ['FDM'] },
          { id: 'abs', name: 'ABS', description: 'Acrylonitrile Butadiene Styrene', compatibleTechs: ['FDM'] },
          { id: 'resin', name: 'Resin', description: 'Photopolymer Resin', compatibleTechs: ['SLA'] },
          { id: 'nylon', name: 'Nylon', description: 'Polyamide', compatibleTechs: ['SLS'] }
        ]);
        setThreeDResolutions([
          { id: 'draft', name: 'Draft', description: '0.3mm layer height' },
          { id: 'standard', name: 'Standard', description: '0.2mm layer height' },
          { id: 'high', name: 'High', description: '0.1mm layer height' }
        ]);
        setThreeDFinishings([
          { id: 'raw', name: 'Raw', description: 'No finishing' },
          { id: 'sanded', name: 'Sanded', description: 'Smooth surface' },
          { id: 'painted', name: 'Painted', description: 'Painted finish' }
        ]);
        setSpecs3d(s => ({
          ...s,
          tech: s.tech || 'FDM',
          material: s.material || 'PLA',
          resolution: s.resolution || 'Standard',
          finishing: s.finishing || 'Raw'
        }));
      } finally {
        setLoadingThreeDSpecs(false);
      }
    };

    loadThreeDSpecs();
  }, []);

  // Adjust material options when tech changes
  useEffect(() => {
    setSpecs3d((s) => {
      const t = String(s.tech || '').toUpperCase();
      let material = s.material;
      if (t === 'FDM' && !['PLA', 'ABS', 'PETG'].includes(material)) material = 'PLA';
      if (t === 'SLA' && material !== 'Resin') material = 'Resin';
      if (t === 'SLS' && !['Nylon', 'Nylon (PA12)'].includes(material)) material = 'Nylon';
      return { ...s, material };
    });
  }, [specs3d.tech]);

  // Estimates removed.

  const canSubmit = contact.email && /.+@.+\..+/.test(contact.email) && 
    (service !== 'pcb' || (
      specs.widthMm && specs.heightMm && specs.layers && specs.quantity && 
      specs.material && specs.finish && specs.baseCopperThickness && 
      specs.mask && specs.maskColor && specs.legendColor && 
      gerberFile && bomFile && contact.name && contact.phone && 
      contact.address && delivery.speed
    )) && token;

  const getMissingFields = () => {
    const missing = [];
    if (!contact.email || !/.+@.+\..+/.test(contact.email)) missing.push('Valid email');
    if (service === 'pcb') {
      if (!specs.widthMm) missing.push('Board width');
      if (!specs.heightMm) missing.push('Board height');
      if (!specs.layers) missing.push('Layers');
      if (!specs.quantity) missing.push('Quantity');
      if (!specs.material) missing.push('Material');
      if (!specs.finish) missing.push('Finish');
      if (!specs.baseCopperThickness) missing.push('Base copper thickness');
      if (!specs.mask) missing.push('Mask');
      if (!specs.maskColor) missing.push('Mask colour');
      if (!specs.legendColor) missing.push('Legend colour');
      if (!gerberFile) missing.push('Gerber file');
      if (!bomFile) missing.push('BOM file');
      if (!contact.name) missing.push('Customer name');
      if (!contact.phone) missing.push('Phone number');
      if (!contact.address) missing.push('Address');
      if (!delivery.speed) missing.push('Delivery speed');
    }
    if (!token) missing.push('Authentication');
    return missing;
  };

  const handleBomChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ok = /\.(csv|txt|xlsx)$/i.test(f.name);
    if (!ok) {
      toast({ title: 'Unsupported BOM', description: 'Upload a CSV (.csv), TXT (.txt), or Excel (.xlsx) file.' });
      setBomFile(null);
      setBomStats({ totalLines: 0, uniqueParts: 0 });
      return;
    }
    setBomFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result?.toString() || '';
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const body = lines.slice(1);
        const parts = new Set();
        body.forEach((row) => {
          const cols = row.split(/,|\t/).map((c) => c.trim());
          if (cols[0]) parts.add(cols[0]);
        });
        setBomStats({ totalLines: Math.max(0, body.length), uniqueParts: parts.size });
        toast({ title: 'BOM loaded', description: `Detected ${parts.size} unique parts (${body.length} rows).` });
      } catch (err) {
        setBomStats({ totalLines: 0, uniqueParts: 0 });
        toast({ title: 'BOM parse error', description: 'Could not parse BOM file.' });
      }
    };
    reader.readAsText(f);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    
    // Clear previous errors
    setFieldErrors({});
    
    // Validate PCB service fields
    if (service === 'pcb') {
      const errors = {};
      
      // Validate PCB specifications
      if (!specs.widthMm) errors.widthMm = 'Board width is required';
      if (!specs.heightMm) errors.heightMm = 'Board height is required';
      if (!specs.layers) errors.layers = 'Layers is required';
      if (!specs.quantity) errors.quantity = 'Quantity is required';
      if (!specs.material) errors.material = 'Material is required';
      if (!specs.finish) errors.finish = 'Finish is required';
      if (!specs.baseCopperThickness) errors.baseCopperThickness = 'Base copper thickness is required';
      if (!specs.mask) errors.mask = 'Mask is required';
      if (!specs.maskColor) errors.maskColor = 'Mask colour is required';
      if (!specs.legendColor) errors.legendColor = 'Legend colour is required';
      if (!gerberFile) errors.gerberFile = 'Gerber file is required';
      if (!bomFile) errors.bomFile = 'BOM file is required';
      
      // Validate customer information
      if (!contact.name) errors.name = 'Customer name is required';
      if (!contact.email) errors.email = 'Email is required';
      else if (!/.+@.+\..+/.test(contact.email)) errors.email = 'Please enter a valid email';
      if (!contact.phone) errors.phone = 'Phone number is required';
      if (!contact.address) errors.address = 'Address is required';
      
      // Validate delivery
      if (!delivery.speed) errors.speed = 'Delivery speed is required';
      
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        const firstError = Object.values(errors)[0];
        toast({ 
          title: 'Submittion Error', 
          description: firstError,
          variant: 'destructive'
        });
        return;
      }
    }
    
    if (!canSubmit) {
      const missing = getMissingFields();
      const description = missing.length > 0 
        ? `Please fill in: ${missing.join(', ')}`
        : 'Please enter a valid email.';
      toast({ title: 'Missing details', description });
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    let payload = {};

    try {
      if (service === 'pcb') {
        payload = {
          service,
          specs,
          delivery,
          bomStats,
          contact,
          quote: { currency: 'INR', total: 0, breakdown: {} },
        };
        fd.append('service', 'pcb');
        fd.append('specs', JSON.stringify(specs));
        fd.append('delivery', JSON.stringify(delivery));
        fd.append('bomStats', JSON.stringify(bomStats));
        fd.append('contact', JSON.stringify(contact));
        fd.append('quote', JSON.stringify({ currency: 'INR', total: 0, breakdown: {} }));
        if (gerberFile) fd.append('gerber', gerberFile);
        if (bomFile) fd.append('bom', bomFile);
      } else if (service === '3dprinting') {
        payload = {
          service,
          specs3d,
          delivery,
          contact,
          quote: { currency: 'INR', total: 0, breakdown: {} },
        };
        fd.append('service', '3dprinting');
        // Send current 3D specs; server canonicalizes/validates
        fd.append('specs3d', JSON.stringify(specs3d));
        fd.append('delivery', JSON.stringify(delivery));
        fd.append('contact', JSON.stringify(contact));
        fd.append('quote', JSON.stringify({ currency: 'INR', total: 0, breakdown: {} }));
        if (modelFile) fd.append('model', modelFile);
      } else if (service === 'pcb_assembly') {
        payload = {
          service,
          specsAssembly,
          delivery,
          contact,
          quote: { currency: 'INR', total: 0, breakdown: {} },
        };
        fd.append('service', 'pcb_assembly');
        fd.append('specsAssembly', JSON.stringify(specsAssembly));
        fd.append('delivery', JSON.stringify(delivery));
        fd.append('contact', JSON.stringify(contact));
        fd.append('quote', JSON.stringify({ currency: 'INR', total: 0, breakdown: {} }));
        if (assemblyFile) fd.append('assembly', assemblyFile);
      } else if (service === 'testing') {
        payload = {
          service,
          specsTesting,
          delivery,
          contact,
          quote: { currency: 'INR', total: 0, breakdown: {} },
        };
        fd.append('service', 'testing');
        fd.append('specsTesting', JSON.stringify(specsTesting));
        fd.append('delivery', JSON.stringify(delivery));
        fd.append('contact', JSON.stringify(contact));
        fd.append('quote', JSON.stringify({ currency: 'INR', total: 0, breakdown: {} }));
        if (testFile) fd.append('test', testFile);
      } else if (service === 'wire_harness') {
        payload = {
          service,
          specsHarness,
          delivery,
          contact,
          quote: { currency: 'INR', total: 0, breakdown: {} },
        };
        fd.append('service', 'wire_harness');
        fd.append('specsHarness', JSON.stringify(specsHarness));
        fd.append('delivery', JSON.stringify(delivery));
        fd.append('contact', JSON.stringify(contact));
        fd.append('quote', JSON.stringify({ currency: 'INR', total: 0, breakdown: {} }));
        if (harnessFile) fd.append('harness', harnessFile);
      }

      const res = await api.createQuoteMultipart(fd, token);
      const backend = res?.quote;
      const id = backend?.id || Date.now().toString();
      addQuote({
        id,
        createdAt: backend?.createdAt || new Date().toISOString(),
        ...payload,
        attachments: backend?.attachments || [],
      });
      toast({ title: 'Request submitted', description: 'We will send a quote to your dashboard shortly.' });
      navigate(service === 'wire_harness' ? '/wire-harness-dashboard' : '/dashboard');
    } catch (error) {
      console.error('Submission error:', error);
      const errorMessage = error?.message || error?.error || 'Please try again later.';
      toast({ 
        title: 'Submission failed', 
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Get Quote | PCB Xpress</title>
        <meta name="description" content="Get a quote for PCB manufacturing/assembly or 3D printing." />
      </Helmet>

      {/* Header / Tabs */}
      <section className="py-16 bg-secondary">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-6">Get Quote</h1>
           <div className="flex justify-center gap-2 flex-wrap">
             <button
               className={`px-4 py-2 rounded-full border text-sm ${service === 'pcb' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
               onClick={() => setService('pcb')}
             >
               PCB Quote
             </button>
             <button
               className={`px-4 py-2 rounded-full border text-sm ${service === '3dprinting' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
               onClick={() => setService('3dprinting')}
             >
               3D Printing Quote
             </button>
             <button
               className={`px-4 py-2 rounded-full border text-sm ${service === 'pcb_assembly' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
               onClick={() => setService('pcb_assembly')}
             >
               PCB Assembly Quote
             </button>
             <button
               className={`px-4 py-2 rounded-full border text-sm ${service === 'testing' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
               onClick={() => setService('testing')}
             >
               Testing Quote
             </button>
             <button
               className={`px-4 py-2 rounded-full border text-sm ${service === 'wire_harness' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
               onClick={() => setService('wire_harness')}
             >
               Wire Harness Quote
             </button>
           </div>
        </div>
      </section>

      {/* Forms */}
      <section className="py-12">
        <div className="container grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {service === 'pcb' ? 'PCB Specifications' :
                 service === '3dprinting' ? '3D Printing Specifications' :
                 service === 'pcb_assembly' ? 'PCB Assembly Specifications' :
                 service === 'wire_harness' ? 'Wire Harness Specifications' :
                 'Testing Specifications'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {service === 'pcb' ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Board width (mm)</label>
                    <Input type="number" min="1" inputMode="decimal" value={specs.widthMm}
                      onChange={(e) => setSpecs((s) => ({ ...s, widthMm: e.target.value === '' ? '' : Number(e.target.value) }))}
                      required className={fieldErrors.widthMm ? 'border-red-500' : ''} />
                    {fieldErrors.widthMm && <p className="text-xs text-red-500 mt-1">{fieldErrors.widthMm}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Board height (mm)</label>
                    <Input type="number" min="1" inputMode="decimal" value={specs.heightMm}
                      onChange={(e) => setSpecs((s) => ({ ...s, heightMm: e.target.value === '' ? '' : Number(e.target.value) }))}
                      required className={fieldErrors.heightMm ? 'border-red-500' : ''} />
                    {fieldErrors.heightMm && <p className="text-xs text-red-500 mt-1">{fieldErrors.heightMm}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Layers</label>
                    <select
                      className={`h-10 w-full border rounded-md px-3 text-sm bg-white ${fieldErrors.layers ? 'border-red-500' : ''}`}
                      value={specs.layers}
                      onChange={(e) => {
                        const layersValue = Number(e.target.value);
                        setSpecs((s) => ({ 
                          ...s, 
                          layers: layersValue,
                          layerType: layersValue === 1 ? 'Single' : layersValue === 2 ? 'Double' : 'Multilayer'
                        }))}
                      }
                      required
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="10">10</option>
                      <option value="12">12</option>
                      <option value="14">14</option>
                      <option value="16">16</option>
                      <option value="18">18</option>
                      <option value="20">20</option>
                      <option value="22">22</option>
                      <option value="24">24</option>
                      <option value="26">26</option>
                      <option value="28">28</option>
                      <option value="30">30</option>
                      <option value="32">32</option>
                    </select>
                    {fieldErrors.layers && <p className="text-xs text-red-500 mt-1">{fieldErrors.layers}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity</label>
                    <Input type="number" min="1" inputMode="numeric" value={specs.quantity}
                      onChange={(e) => setSpecs((s) => ({ ...s, quantity: e.target.value === '' ? '' : Number(e.target.value) }))}
                      required className={fieldErrors.quantity ? 'border-red-500' : ''} />
                    {fieldErrors.quantity && <p className="text-xs text-red-500 mt-1">{fieldErrors.quantity}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Material</label>
                    <select
                      className={`h-10 w-full border rounded-md px-3 text-sm bg-white ${fieldErrors.material ? 'border-red-500' : ''}`}
                      value={specs.material}
                      onChange={(e) => setSpecs((s) => ({ ...s, material: e.target.value }))}
                      required
                    >
                      <option value="FR4">FR4</option>
                      <option value="FR1">FR1</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Finish</label>
                    <select
                      className={`h-10 w-full border rounded-md px-3 text-sm bg-white ${fieldErrors.finish ? 'border-red-500' : ''}`}
                      value={specs.finish}
                      onChange={(e) => setSpecs((s) => ({ ...s, finish: e.target.value }))}
                      required
                    >
                      <option value="HASL">HASL</option>
                      <option value="ENIG">ENIG</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Base copper thickness (Micron)</label>
                    <select
                      className={`h-10 w-full border rounded-md px-3 text-sm bg-white ${fieldErrors.baseCopperThickness ? 'border-red-500' : ''}`}
                      value={specs.baseCopperThickness}
                      onChange={(e) => setSpecs((s) => ({ ...s, baseCopperThickness: e.target.value }))}
                      required
                    >
                      <option value="18/18">18/18</option>
                      <option value="25/25">25/25</option>
                      <option value="35/35">35/35</option>
                      <option value="70/70">70/70</option>
                      <option value="18/00">18/00</option>
                      <option value="25/00">25/00</option>
                      <option value="35/00">35/00</option>
                      <option value="70/00">70/00</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Mask</label>
                    <select
                      className={`h-10 w-full border rounded-md px-3 text-sm bg-white ${fieldErrors.mask ? 'border-red-500' : ''}`}
                      value={specs.mask}
                      onChange={(e) => setSpecs((s) => ({ ...s, mask: e.target.value }))}
                      required
                    >
                      <option value="Both">Both</option>
                      <option value="Top">Top</option>
                      <option value="Bottom">Bottom</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Mask Colour</label>
                    <select
                      className={`h-10 w-full border rounded-md px-3 text-sm bg-white ${fieldErrors.maskColor ? 'border-red-500' : ''}`}
                      value={specs.maskColor}
                      onChange={(e) => setSpecs((s) => ({ ...s, maskColor: e.target.value }))}
                      required
                    >
                      <option value="Green">Green</option>
                      <option value="Red">Red</option>
                      <option value="White">White</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Legend Colour</label>
                    <select
                      className={`h-10 w-full border rounded-md px-3 text-sm bg-white ${fieldErrors.legendColor ? 'border-red-500' : ''}`}
                      value={specs.legendColor}
                      onChange={(e) => setSpecs((s) => ({ ...s, legendColor: e.target.value }))}
                      required
                    >
                      <option value="White">White</option>
                      <option value="Black">Black</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Layer</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm bg-gray-50"
                      value={specs.layerType}
                      onChange={(e) => setSpecs((s) => ({ ...s, layerType: e.target.value }))}
                      disabled
                    >
                      <option value="Single">Single</option>
                      <option value="Double">Double</option>
                      <option value="Multilayer">Multilayer</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Automatically set based on Layers selection</p>
                  </div>

                  <div className="sm:col-span-2 mt-2">
                    <label className="text-sm font-medium">Upload Gerbers (.zip) - Max 50MB</label>
                    <input 
                      type="file" 
                      accept=".zip,.drl,.GBL,.GBO,.GBP,.GBS,.GML,.GPI,.GTL,.GTO,.GTP,.GTS,.gbl,.gbo,.gbp,.gbs,.gml,.gpi,.gtl,.gto,.gtp,.gts" 
                      onChange={(e) => setGerberFile(e.target.files?.[0] || null)} 
                      required 
                      className={`h-10 w-full border rounded-md px-3 text-sm ${fieldErrors.gerberFile ? 'border-red-500' : ''}`}
                    />
                    {gerberFile && (<p className="text-xs text-muted-foreground mt-1">Selected: {gerberFile.name}</p>)}
                    {fieldErrors.gerberFile && <p className="text-xs text-red-500 mt-1">{fieldErrors.gerberFile}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                     Upload Gerbers (.zip) - Max 50MB
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium">Upload BOM (.csv, .txt, .xlsx) - Max 50MB</label>
                    <input 
                      type="file" 
                      accept=".csv,.txt,.xlsx" 
                      onChange={handleBomChange} 
                      required 
                      className={`h-10 w-full border rounded-md px-3 text-sm ${fieldErrors.bomFile ? 'border-red-500' : ''}`}
                    />
                    {bomFile && (
                      <p className="text-xs text-muted-foreground mt-1">Selected: {bomFile.name} — {bomStats.uniqueParts} unique parts ({bomStats.totalLines} rows)</p>
                    )}
                    {fieldErrors.bomFile && <p className="text-xs text-red-500 mt-1">{fieldErrors.bomFile}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Supported formats: CSV files, text files, and Excel spreadsheets (.xlsx)
                    </p>
                  </div>
                </div>
              ) : service === '3dprinting' ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Process</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm bg-white"
                      value={specs3d.tech}
                      onChange={(e) => setSpecs3d((s) => ({ ...s, tech: e.target.value }))}
                      disabled={loadingThreeDSpecs}
                    >
                      {loadingThreeDSpecs ? (
                        <option>Loading...</option>
                      ) : (
                        threeDTechs.map((tech) => (
                          <option key={tech.id} value={tech.name}>
                            {tech.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Material</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm bg-white"
                      value={specs3d.material}
                      onChange={(e) => setSpecs3d((s) => ({ ...s, material: e.target.value }))}
                      disabled={loadingThreeDSpecs}
                    >
                      {loadingThreeDSpecs ? (
                        <option>Loading...</option>
                      ) : (
                        threeDMaterials
                          .filter(material =>
                            !material.compatibleTechs?.length ||
                            material.compatibleTechs.includes(specs3d.tech)
                          )
                          .map((material) => (
                            <option key={material.id} value={material.name}>
                              {material.name}
                            </option>
                          ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">X (mm)</label>
                    <Input type="number" min="1" value={specs3d.dims.xMm} onChange={(e) => setSpecs3d((s) => ({ ...s, dims: { ...s.dims, xMm: Number(e.target.value) } }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Y (mm)</label>
                    <Input type="number" min="1" value={specs3d.dims.yMm} onChange={(e) => setSpecs3d((s) => ({ ...s, dims: { ...s.dims, yMm: Number(e.target.value) } }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Z (mm)</label>
                    <Input type="number" min="1" value={specs3d.dims.zMm} onChange={(e) => setSpecs3d((s) => ({ ...s, dims: { ...s.dims, zMm: Number(e.target.value) } }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity</label>
                    <Input type="number" min="1" value={specs3d.quantity} onChange={(e) => setSpecs3d((s) => ({ ...s, quantity: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Resolution</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm bg-white"
                      value={specs3d.resolution}
                      onChange={(e) => setSpecs3d((s) => ({ ...s, resolution: e.target.value }))}
                      disabled={loadingThreeDSpecs}
                    >
                      {loadingThreeDSpecs ? (
                        <option>Loading...</option>
                      ) : (
                        threeDResolutions.map((resolution) => (
                          <option key={resolution.id} value={resolution.name}>
                            {resolution.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  {specs3d.tech === 'FDM' && (
                    <div>
                      <label className="text-sm font-medium">Infill (%)</label>
                      <Input type="number" min="0" max="100" value={specs3d.infillPercent} onChange={(e) => setSpecs3d((s) => ({ ...s, infillPercent: Number(e.target.value) }))} />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Finishing</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm bg-white"
                      value={specs3d.finishing}
                      onChange={(e) => setSpecs3d((s) => ({ ...s, finishing: e.target.value }))}
                      disabled={loadingThreeDSpecs}
                    >
                      {loadingThreeDSpecs ? (
                        <option>Loading...</option>
                      ) : (
                        threeDFinishings.map((finishing) => (
                          <option key={finishing.id} value={finishing.name}>
                            {finishing.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="sm:col-span-2 mt-2">
                    <label className="text-sm font-medium">Upload 3D model (STL/STEP/OBJ) - Max 50MB</label>
                    <input 
                      type="file" 
                      accept=".stl,.step,.stp,.obj" 
                      onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                      className="h-10 w-full border rounded-md px-3 text-sm"
                    />
                    {modelFile && (<p className="text-xs text-muted-foreground mt-1">Selected: {modelFile.name}</p>)}
                  </div>
                </div>
              ) : service === 'pcb_assembly' ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Board width (mm)</label>
                    <Input type="number" min="1" inputMode="decimal" value={specsAssembly.boardWidthMm}
                      onChange={(e) => setSpecsAssembly((s) => ({ ...s, boardWidthMm: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Board height (mm)</label>
                    <Input type="number" min="1" inputMode="decimal" value={specsAssembly.boardHeightMm}
                      onChange={(e) => setSpecsAssembly((s) => ({ ...s, boardHeightMm: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Layers</label>
                    <Input type="number" min="1" inputMode="numeric" value={specsAssembly.layers}
                      onChange={(e) => setSpecsAssembly((s) => ({ ...s, layers: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Assembly Type</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm bg-white"
                      value={specsAssembly.assemblyType}
                      onChange={(e) => setSpecsAssembly((s) => ({ ...s, assemblyType: e.target.value }))}
                    >
                      <option value="smt">SMT (Surface Mount Technology)</option>
                      <option value="tht">THT (Through Hole Technology)</option>
                      <option value="mixed">Mixed (SMT + THT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Component Count</label>
                    <Input type="number" min="1" inputMode="numeric" value={specsAssembly.componentCount}
                      onChange={(e) => setSpecsAssembly((s) => ({ ...s, componentCount: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Solder Type</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm bg-white"
                      value={specsAssembly.solderType}
                      onChange={(e) => setSpecsAssembly((s) => ({ ...s, solderType: e.target.value }))}
                    >
                      <option value="lead_free">Lead Free</option>
                      <option value="leaded">Leaded</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity</label>
                    <Input type="number" min="1" inputMode="numeric" value={specsAssembly.quantity}
                      onChange={(e) => setSpecsAssembly((s) => ({ ...s, quantity: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                  <div className="sm:col-span-2 mt-2">
                    <label className="text-sm font-medium">Upload Assembly Files (Gerbers, BOM, Pick & Place) - Max 50MB</label>
                    <input 
                      type="file" 
                      accept=".zip,.csv,.txt,.xls,.xlsx" 
                      onChange={(e) => setAssemblyFile(e.target.files?.[0] || null)}
                      className="h-10 w-full border rounded-md px-3 text-sm"
                    />
                    {assemblyFile && (<p className="text-xs text-muted-foreground mt-1">Selected: {assemblyFile.name}</p>)}
                  </div>
                </div>
              ) : service === 'testing' ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Test Type</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm bg-white"
                      value={specsTesting.testType}
                      onChange={(e) => setSpecsTesting((s) => ({ ...s, testType: e.target.value }))}
                    >
                      <option value="functional">Functional Testing</option>
                      <option value="electrical">Electrical Testing</option>
                      <option value="burn_in">Burn-in Testing</option>
                      <option value="environmental">Environmental Testing</option>
                      <option value="mixed">Mixed Testing</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity</label>
                    <Input type="number" min="1" inputMode="numeric" value={specsTesting.quantity}
                      onChange={(e) => setSpecsTesting((s) => ({ ...s, quantity: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium">Test Requirements</label>
                    <Textarea rows={4} value={specsTesting.requirements} onChange={(e) => setSpecsTesting((s) => ({ ...s, requirements: e.target.value }))} placeholder="Describe specific test requirements, parameters, or procedures." />
                  </div>
                  <div className="sm:col-span-2 mt-2">
                    <label className="text-sm font-medium">Upload Test Files (Test Plans, Schematics) - Max 50MB</label>
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" 
                      onChange={(e) => setTestFile(e.target.files?.[0] || null)}
                      className="h-10 w-full border rounded-md px-3 text-sm"
                    />
                    {testFile && (<p className="text-xs text-muted-foreground mt-1">Selected: {testFile.name}</p>)}
                  </div>
                </div>
              ) : service === 'wire_harness' ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Board width (mm)</label>
                    <Input type="number" min="1" inputMode="decimal" value={specsHarness.boardWidthMm}
                      onChange={(e) => setSpecsHarness((s) => ({ ...s, boardWidthMm: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Board height (mm)</label>
                    <Input type="number" min="1" inputMode="decimal" value={specsHarness.boardHeightMm}
                      onChange={(e) => setSpecsHarness((s) => ({ ...s, boardHeightMm: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Wire Count</label>
                    <Input type="number" min="1" inputMode="numeric" value={specsHarness.wireCount}
                      onChange={(e) => setSpecsHarness((s) => ({ ...s, wireCount: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Connector Count</label>
                    <Input type="number" min="1" inputMode="numeric" value={specsHarness.connectorCount}
                      onChange={(e) => setSpecsHarness((s) => ({ ...s, connectorCount: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Wire Gauge</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm bg-white"
                      value={specsHarness.wireGauge}
                      onChange={(e) => setSpecsHarness((s) => ({ ...s, wireGauge: e.target.value }))}
                    >
                      <option value="14AWG">14 AWG</option>
                      <option value="16AWG">16 AWG</option>
                      <option value="18AWG">18 AWG</option>
                      <option value="20AWG">20 AWG</option>
                      <option value="22AWG">22 AWG</option>
                      <option value="24AWG">24 AWG</option>
                      <option value="26AWG">26 AWG</option>
                      <option value="28AWG">28 AWG</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Connector Type</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm bg-white"
                      value={specsHarness.connectorType}
                      onChange={(e) => setSpecsHarness((s) => ({ ...s, connectorType: e.target.value }))}
                    >
                      <option value="molex">Molex</option>
                      <option value="jst">JST</option>
                      <option value="dupont">Dupont</option>
                      <option value="te">TE Connectivity</option>
                      <option value="amp">AMP</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Harness Type</label>
                    <select
                      className="h-10 w-full border rounded-md px-3 text-sm bg-white"
                      value={specsHarness.harnessType}
                      onChange={(e) => setSpecsHarness((s) => ({ ...s, harnessType: e.target.value }))}
                    >
                      <option value="power">Power Harness</option>
                      <option value="signal">Signal Harness</option>
                      <option value="mixed">Mixed (Power + Signal)</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity</label>
                    <Input type="number" min="1" inputMode="numeric" value={specsHarness.quantity}
                      onChange={(e) => setSpecsHarness((s) => ({ ...s, quantity: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                  <div className="sm:col-span-2 mt-2">
                    <label className="text-sm font-medium">Upload Harness Files (Wiring Diagrams, Wire Specs, Assembly Cards) - Max 50MB</label>
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.zip" 
                      onChange={(e) => setHarnessFile(e.target.files?.[0] || null)}
                      className="h-10 w-full border rounded-md px-3 text-sm"
                    />
                    {harnessFile && (<p className="text-xs text-muted-foreground mt-1">Selected: {harnessFile.name}</p>)}
                  </div>
                </div>
              ) : null}

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Delivery speed</label>
                  <select className={`h-10 w-full border rounded-md px-3 text-sm bg-white ${fieldErrors.speed ? 'border-red-500' : ''}`} value={delivery.speed} onChange={(e) => setDelivery({ speed: e.target.value })} required>
                    <option value="standard">Standard</option>
                    <option value="express">Express</option>
                  </select>
                  {fieldErrors.speed && <p className="text-xs text-red-500 mt-1">{fieldErrors.speed}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Customer Name</label>
                  <Input 
                    value={contact.name} 
                    onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} 
                    onFocus={() => {
                      if (profileFields.name) {
                        setProfileFields(prev => ({ ...prev, name: false }));
                      }
                    }}
                    placeholder="Your name" 
                    required
                    className={fieldErrors.name ? 'border-red-500' : ''}
                  />
                  {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Company Name (optional)</label>
                  <Input value={contact.company} onChange={(e) => setContact((c) => ({ ...c, company: e.target.value }))} placeholder="Company" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    type="email" 
                    value={contact.email} 
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} 
                    onFocus={() => {
                      if (profileFields.email) {
                        setProfileFields(prev => ({ ...prev, email: false }));
                      }
                    }}
                    placeholder="you@example.com" 
                    required 
                    className={fieldErrors.email ? 'border-red-500' : ''}
                  />
                  {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input 
                    type="tel" 
                    value={contact.phone} 
                    onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} 
                    onFocus={() => {
                      if (profileFields.phone) {
                        setProfileFields(prev => ({ ...prev, phone: false }));
                      }
                    }}
                    placeholder="+91 9876543210" 
                    required
                    className={fieldErrors.phone ? 'border-red-500' : ''}
                  />
                  {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Address</label>
                  <Textarea rows={2} value={contact.address} onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))} placeholder="Your complete address" required className={fieldErrors.address ? 'border-red-500' : ''} />
                  {fieldErrors.address && <p className="text-xs text-red-500 mt-1">{fieldErrors.address}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">GSTIN (optional)</label>
                  <Input 
                    value={contact.gstin} 
                    onChange={(e) => setContact((c) => ({ ...c, gstin: e.target.value }))} 
                    placeholder="GSTIN Number" 
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Enter GSTIN if applicable for tax purposes</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Textarea rows={3} value={contact.notes} onChange={(e) => setContact((c) => ({ ...c, notes: e.target.value }))} placeholder="Share any special requirements, tolerances, or context." />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>{submitting ? 'Submitting…' : 'Request Quote'}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What happens next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Submit your details and attachments. Our team will review and email a formal quote in INR, which will also appear in your dashboard.</p>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium mb-2">Why choose PCB Xpress?</p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  <li>Fast turnaround: 24–72h prototypes</li>
                  <li>ISO/UL quality processes</li>
                  <li>IoT-focused engineering support</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

export default QuotePage;


