import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Cpu, Activity, Radio, Wifi, Router, ShieldCheck, Gauge, Layers, Zap, Cog, PackageOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, getApiBaseUrl } from '@/lib/api';

const CapabilitiesPage = () => {
  // Hardcoded factory video (served from backend uploads)
  // Put your MP4 at /server/uploads/vst.mp4 and it will be served at /api/uploads/vst.mp4
  const factoryVideoUrl = '/api/uploads/vst.mp4';

  const toEmbedUrl = (url = '') => url; // noop — kept for compatibility

  const techSpecs = [
    { key: 'Layers', value: '1–12 (higher on request)' },
    { key: 'Min trace/space', value: '0.12 mm / 0.12 mm' },
    { key: 'Min drill (mechanical)', value: '0.50 mm' },
    { key: 'Aspect ratio (PTH)', value: '10:1 typical' },
    { key: 'Board thickness', value: '0.8–4.0 mm ' },
    { key: 'Copper weight', value: '0.5–2 oz (inner/outer)' },
    { key: 'Materials', value: 'FR-4, Isola, Rogers (HF)' },
    { key: 'Solder mask', value: 'Green, Black, White, Red, Blue' },
    { key: 'Surface finish', value: 'HASL ,LFHASL, ENIG, '},
    { key: 'Impedance control', value: 'Yes (±10%)' },
    { key: 'Silkscreen', value: 'White/Black' },
    { key: 'Testing', value: '100% E-test for volume' },
  ];

  const viaSpecs = [
    { key: 'Through via', value: 'Drill ≥ 0.30 mm' },
    { key: 'Via-in-pad', value: 'Filled & capped (on request)' },
    { key: 'Tenting', value: 'Supported' },
  ];

  const process = [
    { icon: Cog, title: 'DFM/DFA Review', desc: 'Automated checks and engineer review for manufacturability & assembly.' },
    { icon: Layers, title: 'CAM & Panelization', desc: 'Imposition, tooling, and fiducial planning optimized for yield.' },
    { icon: Activity, title: 'Inner Layer Imaging', desc: 'Photoresist exposure, etching, AOI of inner layers.' },
    { icon: PackageOpen, title: 'Lamination & Drilling', desc: 'Multilayer lamination, CNC drilling, deburr & desmear.' },
    { icon: Zap, title: 'Plating & Copper', desc: 'Electroless/electrolytic copper, PTH barrel formation.' },
    { icon: ShieldCheck, title: 'Mask, Legend, Finish', desc: 'Solder mask, silkscreen, and surface finish (HASL/ENIG/OSP).' },
    { icon: Gauge, title: 'Inspection & Test', desc: 'AOI, impedance checks, 100% E-test for production.' },
    { icon: Cpu, title: 'SMT/THT Assembly', desc: 'SMT placement, reflow, THT, AOI, FCT on demand.' },
  ];

  const iotPoints = [
    { icon: Wifi, title: 'Connectivity', desc: 'BLE, Wi‑Fi, Zigbee, Thread, LoRa, NB‑IoT modules.' },
    { icon: Radio, title: 'RF & Antenna', desc: 'Impedance control, antenna matching, RF layout best practices.' },
    { icon: Router, title: 'Edge & Gateways', desc: 'Gateway designs for robust field connectivity and OTA updates.' },
    { icon: ShieldCheck, title: 'Security', desc: 'Secure boot, device identity, encrypted provisioning.' },
  ];

  return (
    <>
      <Helmet>
        <title>Capabilities | PCB Xpress</title>
        <meta name="description" content="Explore multilayer PCB capabilities, Kerala-based manufacturing process, and IoT-focused engineering services." />
      </Helmet>
      <section className="py-20 bg-secondary">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Manufacturing Capabilities</h1>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground">From prototypes to production — precision multilayer PCBs, high-frequency materials, and IoT-first design.</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Technical Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {techSpecs.map((row) => (
                      <tr key={row.key} className="border-b last:border-0">
                        <td className="py-3 pr-6 font-medium w-[40%]">{row.key}</td>
                        <td className="py-3 text-muted-foreground">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3 className="mt-8 mb-3 font-semibold">Via Capabilities</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {viaSpecs.map((row) => (
                      <tr key={row.key} className="border-b last:border-0">
                        <td className="py-3 pr-6 font-medium w-[40%]">{row.key}</td>
                        <td className="py-3 text-muted-foreground">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-4">Notes: Tighter geometries, HDI stacks, and special materials available upon engineering review.</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Factory Highlight</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">Kerala-based smart factory with automated lines, AOI, impedance control, and end-to-end assembly.</p>
              <div className="aspect-video rounded-lg overflow-hidden border bg-black max-w-4xl mx-auto">
                {factoryVideoUrl && (factoryVideoUrl.endsWith('.mp4') || factoryVideoUrl.includes('/api/uploads/')) ? (
                  <video className="w-full h-full object-contain" controls>
                    <source src={factoryVideoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <iframe
                    className="w-full h-full"
                    src={toEmbedUrl(factoryVideoUrl)}
                    title="PCB Manufacturing — Factory Tour"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>
              <div className="text-center">
                <Link to="/quote"><Button size="lg">Get Quote</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 bg-secondary">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Manufacturing Process</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">From design files to IoT-enabled products — a streamlined path built for speed and reliability.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {process.map((p, idx) => (
              <Card key={p.title} className="h-full">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <p.icon className="h-6 w-6" />
                  </div>
                  <p className="font-semibold">{idx + 1}. {p.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">IoT-Focused Engineering</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Designing for connected devices: low power, robust RF, secure provisioning, and seamless cloud integration.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {iotPoints.map((p) => (
              <Card key={p.title}>
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-full bg-accent/20 text-accent-foreground flex items-center justify-center mb-3">
                    <p.icon className="h-6 w-6" />
                  </div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/quote"><Button size="lg">Start Your IoT Project</Button></Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default CapabilitiesPage;
