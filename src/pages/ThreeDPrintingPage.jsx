import React, { useMemo, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Layers, Gauge, Package, CheckCircle, Upload, MoveRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

const ThreeDPrintingPage = () => {
  const navigate = useNavigate();

  // Dynamic specifications from admin settings
  const [adminTechs, setAdminTechs] = useState([]);
  const [adminMaterials, setAdminMaterials] = useState([]);
  const [loadingSpecs, setLoadingSpecs] = useState(true);

  // Static tech data with icons and media
  const techData = {
    fdm: {
      icon: Printer,
      title: 'FDM (Fused Deposition)',
      desc: 'Cost‑effective, quick prototypes and functional parts in common thermoplastics.',
      features: ['PLA, ABS, PETG', 'Layer height 0.15–0.3 mm', 'Large build volume'],
      img: './PLA.png',
      video: 'https://cdn.coverr.co/videos/coverr-3d-printing-9677/1080p.mp4',
    },
    sla: {
      icon: Layers,
      title: 'SLA (Resin Printing)',
      desc: 'High detail and smooth surfaces for enclosures, visual models, and fine features.',
      features: ['Standard & tough resin', 'Layer height 0.05–0.1 mm', 'Excellent surface finish'],
      img: './2.jpg',
      video: 'https://cdn.coverr.co/videos/coverr-a-laser-3d-printer-1503/1080p.mp4',
    },
    sls: {
      icon: Gauge,
      title: 'SLS (Nylon Powder)',
      desc: 'Durable, isotropic parts suitable for functional testing and small‑batch production.',
      features: ['PA12 (Nylon)', 'No supports required', 'Strong, functional parts'],
      img: './1.jpg',
      video: 'https://cdn.coverr.co/videos/coverr-industrial-3d-printer-9647/1080p.mp4',
    },
  };

  // Load dynamic specifications from admin settings
  useEffect(() => {
    const loadSpecs = async () => {
      try {
        console.log('Loading 3D printing specifications...');
        const res = await api.getThreeDPrintingSpecifications();
        console.log('3D printing specifications response:', res);
        setAdminTechs(res.techs || []);
        setAdminMaterials(res.materials || []);
        console.log('Materials loaded:', res.materials?.length || 0);
      } catch (err) {
        console.error('Failed to load 3D printing specifications:', err);
        // Fallback to default if API fails
        setAdminTechs([
          { id: 'fdm', name: 'FDM', description: 'Fused Deposition Modeling' },
          { id: 'sla', name: 'SLA', description: 'Stereolithography' },
          { id: 'sls', name: 'SLS', description: 'Selective Laser Sintering' }
        ]);
        setAdminMaterials([
          { id: 'pla', name: 'PLA', description: 'Polylactic Acid - Biodegradable, easy to print, good for prototyping' },
          { id: 'abs', name: 'ABS', description: 'Acrylonitrile Butadiene Styrene - Durable, impact-resistant, good for functional parts' },
          { id: 'petg', name: 'PETG', description: 'Polyethylene Terephthalate Glycol - Chemical resistant, flexible, good layer adhesion' },
          { id: 'tpu', name: 'TPU', description: 'Thermoplastic Polyurethane - Flexible, rubber-like material for elastic parts' },
          { id: 'nylon', name: 'Nylon', description: 'Polyamide - Strong, durable, good for functional and mechanical parts' },
          { id: 'resin', name: 'Resin', description: 'Photopolymer resin - High detail, smooth surface finish' },
          { id: 'tough_resin', name: 'Tough Resin', description: 'Durable photopolymer resin - Impact-resistant with good mechanical properties' },
          { id: 'flexible_resin', name: 'Flexible Resin', description: 'Elastic photopolymer resin - Soft, rubber-like material' }
        ]);
      } finally {
        setLoadingSpecs(false);
      }
    };

    loadSpecs();
  }, []);

  // Create dynamic techs array combining admin data with static UI data
  const techs = useMemo(() => {
    if (loadingSpecs || adminTechs.length === 0) {
      // Fallback to static data while loading
      return Object.entries(techData).map(([key, data]) => ({
        key,
        ...data
      }));
    }

    return adminTechs.map(adminTech => {
      // Try to match admin tech name to static data
      let staticData = null;
      const name = adminTech.name.toLowerCase();

      // Direct matches
      if (name.includes('fdm') || name.includes('fused')) staticData = techData.fdm;
      else if (name.includes('sla') || name.includes('resin') || name.includes('stereo')) staticData = techData.sla;
      else if (name.includes('sls') || name.includes('nylon') || name.includes('powder')) staticData = techData.sls;
      else staticData = techData.fdm; // Default fallback

      return {
        key: adminTech.name.toLowerCase().replace(/\s*\([^)]*\)/, '').replace(/\s+/g, ''),
        ...staticData,
        title: adminTech.name,
        desc: adminTech.description || staticData.desc,
      };
    });
  }, [adminTechs, loadingSpecs]);

  const [activeTech, setActiveTech] = useState('');
  const currentTech = useMemo(() => {
    if (techs.length === 0) return null;
    const active = techs.find(t => t.key === activeTech);
    return active || techs[0];
  }, [activeTech, techs]);

  // Set initial active tech when data loads
  useEffect(() => {
    if (techs.length > 0 && !activeTech) {
      setActiveTech(techs[0].key);
    }
  }, [techs, activeTech]);

  const capabilities = [
    { k: 'Max build (FDM)', v: '300 × 300 × 400 mm' },
    { k: 'Max build (SLA)', v: '192 × 120 × 245 mm' },
    { k: 'Max build (SLS)', v: '200 × 200 × 300 mm' },
    { k: 'Tolerances', v: '±0.2 mm or ±0.5%, whichever greater' },
    { k: 'Wall thickness', v: '≥ 0.8 mm (tech dependent)' },
    { k: 'Post‑processing', v: 'Sanding, priming, painting (on request)' },
  ];

  // Dynamic materials from admin settings
  const materials = useMemo(() => {
    console.log('Processing materials, loadingSpecs:', loadingSpecs, 'adminMaterials length:', adminMaterials.length);
    if (loadingSpecs || adminMaterials.length === 0) {
      console.log('Using fallback materials');
      // Fallback to static data while loading
      return [
        { k: 'PLA', v: 'Easy, rigid, eco‑friendly; concept models and fixtures.' },
        { k: 'ABS', v: 'Tough, heat‑resistant; functional parts, enclosures.' },
        { k: 'PETG', v: 'Impact & chemical resistant; jigs and outdoor parts.' },
        { k: 'Resin', v: 'High detail; smooth visual models and small mechanisms.' },
        { k: 'Nylon (PA12)', v: 'Durable, abrasion‑resistant; snap‑fits, functional prototypes.' },
      ];
    }

    console.log('Mapping admin materials:', adminMaterials);
    const mappedMaterials = adminMaterials.map(material => ({
      k: material.name,
      v: material.description || `${material.name} - High-quality material for 3D printing applications.`,
    }));
    console.log('Mapped materials:', mappedMaterials);
    return mappedMaterials;
  }, [adminMaterials, loadingSpecs]);

  return (
    <>
      <Helmet>
        <title>3D Printing | PCB Xpress</title>
        <meta name="description" content="FDM, SLA, and SLS 3D printing with engineering materials, quick turnaround, and post‑processing options." />
      </Helmet>

      {/* Header */}
      <section className="py-20 bg-secondary">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">3D Printing Services</h1>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground">Rapid prototyping to small‑batch production — FDM, SLA, and SLS with material guidance and QA.</p>
          <div className="mt-6">
            <Link to="/quote"><Button size="lg">Get 3D Printing Quote</Button></Link>
          </div>
        </div>
      </section>

      {/* Sticky CTA bar */}
      <section className="sticky top-16 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-2 flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Get a quote or talk to an engineer</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/quote?service=3dprinting')}>
              <Upload className="h-4 w-4 mr-1" /> Upload 3D Files
            </Button>
            <Button size="sm" onClick={() => navigate('/quote?service=3dprinting')}>Get Quote</Button>
          </div>
        </div>
      </section>

      {/* Technologies tabs */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">Technologies</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Choose the right process for your part’s geometry, finish, and performance needs.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {techs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTech(t.key)}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${activeTech === t.key ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:text-primary'}`}
              >
                {t.title}
              </button>
            ))}
          </div>

          {currentTech ? (
            <Card className="overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-0 items-stretch">
                <div className="relative h-64 lg:h-full">
                  {currentTech.video ? (
                    <video
                      className="w-full h-full object-cover"
                      src={currentTech.video}
                      poster={currentTech.img}
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img src={currentTech.img} alt={currentTech.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-background/10 to-transparent" />
                </div>
                <div className="p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <currentTech.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{currentTech.title}</h3>
                      <p className="text-sm text-muted-foreground">{currentTech.desc}</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm mb-4">
                    {currentTech.features.map(f => (
                      <li key={f} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /><span>{f}</span></li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate(`/quote?service=3dprinting&tech=${currentTech.key}`)}>Use this process</Button>
                    <Button variant="outline" onClick={() => (window.location.href = 'mailto:sales@pcbxpress.com?subject=3D%20Printing%20Consultation')}>Talk to an Engineer</Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="p-8 text-center">
                <div className="text-muted-foreground">Loading 3D printing technologies...</div>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Materials & capabilities */}
      <section className="py-16 bg-secondary">
        <div className="container grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {capabilities.map((c) => (
                      <tr key={c.k} className="border-b last:border-0">
                        <td className="py-3 pr-6 font-medium w-[40%]">{c.k}</td>
                        <td className="py-3 text-muted-foreground">{c.v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {materials.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="py-3 text-center text-muted-foreground">
                          Loading materials...
                        </td>
                      </tr>
                    ) : (
                      materials.map((m) => (
                        <tr key={m.k} className="border-b last:border-0">
                          <td className="py-3 pr-6 font-medium w-[30%]">{m.k}</td>
                          <td className="py-3 text-muted-foreground">{m.v}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">A simple path from CAD to parts in hand.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Step icon={Package} title="Upload" desc="Share STEP/STL files and any tolerance or finish notes." idx={1} />
            <Step icon={Layers} title="Choose" desc="We suggest technology/material; you confirm cost vs. performance." idx={2} />
            <Step icon={Printer} title="Print" desc="Parts produced with QA checkpoints and optional post‑processing." idx={3} />
            <Step icon={Gauge} title="Deliver" desc="Final inspection, packaging, and tracked shipping to your door." idx={4} />
          </div>
          <div className="text-center mt-10">
            <Link to="/quote"><Button size="lg">Request a 3D Printing Quote</Button></Link>
          </div>
        </div>
      </section>
    </>
  );
};

const Step = ({ icon: Icon, title, desc, idx }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-semibold">{idx}. {title}</p>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </CardContent>
  </Card>
);

export default ThreeDPrintingPage;
