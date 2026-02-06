import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  UploadCloud,
  Cpu,
  Layers,
  Printer,
  Rocket,
  CheckCircle,
  Wrench,
  ArrowRight,
  Smartphone,
  Car,
  Heart,
  Wifi,
  Factory,
  Target,
  ShieldCheck,
  DollarSign,
  BadgeCheck,
  Headphones,
  Users
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const HomePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();


  const handleFeatureClick = (feature) => {
    toast({ title: 'Coming soon', description: `${feature} will be available shortly.` });
  };

  const services = [
    {
      icon: Layers,
      title: 'PCB Fabrication',
      description: 'High-quality multilayer PCBs with fast turnaround times.',
      image: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48',
      video: 'https://cdn.coverr.co/videos/coverr-microchip-inspection-9707/1080p.mp4',
    },
    {
      icon: Cpu,
      title: 'PCB Assembly',
      description: 'Full turnkey and consigned assembly, from prototype to mass production.',
      image: '/assembling.png', // uses public/assembling.png
      video: '',                // image only
    },
    {
      icon: Printer,
      title: '3D Printing',
      description: 'Rapid prototyping and custom part manufacturing with advanced materials.',
      image: '/3d.png',         // uses public/3d.png
      video: '',                // image only
    },
    {
      icon: Wrench,
      title: 'Components Sourcing',
      description: 'Globally sourced, quality-assured electronic components.',
      image: '/sourcing.png',
      video: '',
    },
  ];
  
  const industries = [
    {
      icon: Wifi,
      name: 'IoT & Connectivity',
      desc: 'Low‑power connected devices, gateways, and edge nodes with robust wireless stacks.',
      examples: ['BLE/LoRa/Wi‑Fi gateways', 'Battery‑powered sensors']
    },
    {
      icon: Smartphone,
      name: 'Consumer Electronics',
      desc: 'Compact, reliable boards for wearables, smart home, and lifestyle devices.',
      examples: ['Wearables & trackers', 'Smart home controllers']
    },
    {
      icon: Car,
      name: 'Automotive & EV',
      desc: 'High‑reliability electronics for in‑vehicle systems and EV power management.',
      examples: ['BMS & chargers', 'Telematics & infotainment']
    },
    {
      icon: Heart,
      name: 'Medical Devices',
      desc: 'Precision PCB assemblies with traceability and stringent process controls.',
      examples: ['Patient monitors', 'Point‑of‑care diagnostics']
    },
    {
      icon: Factory,
      name: 'Industrial & Robotics',
      desc: 'Rugged control electronics for factory automation and robotic platforms.',
      examples: ['Motor drivers & PLC I/O', 'Industrial gateways']
    },
    {
      icon: Rocket,
      name: 'Aerospace & Drones',
      desc: 'Lightweight, high‑performance PCBs for UAVs and aerospace R&D projects.',
      examples: ['Flight controllers', 'Telemetry modules']
    },
    {
      icon: Target,
      name: 'RF & High‑Speed',
      desc: 'RF front‑ends and high‑speed digital with controlled impedance and stackups.',
      examples: ['Rogers RF boards', 'Gigabit SERDES backplanes']
    },
    {
      icon: ShieldCheck,
      name: 'Enterprise & Edge',
      desc: 'Reliable edge computing and networking appliances built for 24×7 uptime.',
      examples: ['Edge AI modules', 'Industrial routers']
    },
    {
      icon: DollarSign,
      name: 'FinTech & Payments',
      desc: 'Secure, compact hardware for POS, kiosks, and IoT payment endpoints.',
      examples: ['POS terminals', 'Smart kiosks']
    },
  ];

  const whyChooseUs = [
    { 
      icon: Rocket, 
      title: 'Fast Delivery', 
      description: 'From 24–72h prototypes to scheduled mass production runs.',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e'
    },
    { 
      icon: ShieldCheck, 
      title: 'Global Quality', 
      description: 'ISO 9001 and UL certified processes for guaranteed performance.',
      image: 'https://images.unsplash.com/photo-1581092580502-7c547fd61a1a'
    },
    { 
      icon: DollarSign, 
      title: 'Affordable Pricing', 
      description: 'Competitive pricing without compromising on quality or speed.',
      image: 'https://images.unsplash.com/photo-1554224155-1696413564e9'
    },
    { 
      icon: Target, 
      title: 'IoT-Focused', 
      description: 'Specialized expertise in compact, reliable, connected devices.',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475'
    },
  ];

  const howSteps = [
    { icon: UploadCloud, title: 'Upload', desc: 'Gerbers, BOM, and notes. Files remain confidential.', accent: 'from-blue-600 to-cyan-500' },
    { icon: Layers, title: 'Specify', desc: 'Choose layers, material, finish, and quantity.', accent: 'from-emerald-600 to-teal-500' },
    { icon: Wrench, title: 'Review', desc: 'DFM checks and clarifications from our engineers.', accent: 'from-amber-600 to-orange-500' },
    { icon: CheckCircle, title: 'Build', desc: 'Manufacture, assemble, test, and ship to you.', accent: 'from-violet-600 to-fuchsia-500' },
  ];

  const industriesContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
  };
  const industryItemVariant = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
  };
  
  return (
    <div className="overflow-hidden">
      <Helmet>
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "PCB Xpress",
              "logo": "/favicon.svg",
              "contactPoint": [{
                "@type": "ContactPoint",
                "contactType": "customer support",
                "email": "sales@pcbxpress.online"
              }]
            }
          `}
        </script>
      </Helmet>

      {/* Hero Section */}
<section className="relative pt-24 pb-20 md:pt-36 md:pb-28">
  <div className="absolute inset-0 bg-secondary tech-pattern -z-10"></div>
  <div className="container">
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center lg:text-left lg:order-1"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            🇮🇳 Made in India • Kerala
          </span>
          <span className="px-3 py-1 rounded-full bg-accent/10 text-accent-foreground text-sm">
            Shipping Worldwide
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
          Prototype, Productization , 
          <br />
          <span className="text-gradient-primary">Commercial Manufacturing Small to Medium Volume Assembly</span>
        </h1>
        <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-6">
          Kerala-based team delivering multilayer PCBs, turnkey assembly, on-demand 3D printing, and vetted component sourcing. From 24–72h prototypes to dependable production.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {['PCB Fabrication','PCB Assembly','3D Printing','Component Sourcing'].map((t) => (
            <span key={t} className="px-3 py-1 rounded-full border border-primary/20 bg-background text-sm">
              {t}
            </span>
          ))}
        </div>

        <div className="flex justify-center lg:justify-start gap-4">
          <Button size="lg" onClick={() => navigate('/quote?service=pcb')}>
            PCB Quote <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/quote?service=3dprinting')}
          >
            3D Printing Quote
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-muted-foreground">
            <Rocket className="h-4 w-4 text-primary" /> 24–72h prototypes
          </div>
          <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> ISO/UL quality
          </div>
          <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4 text-primary" /> Competitive pricing
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center lg:justify-start gap-2 text-xs">
          <span title="ISO 9001: Quality Management" className="px-2 py-1 rounded border">ISO 9001</span>
          <span title="UL Certification" className="px-2 py-1 rounded border">UL</span>
          <span title="Restriction of Hazardous Substances" className="px-2 py-1 rounded border">RoHS</span>
          <span className="px-2 py-1 rounded border">NDA on request</span>
        </div>

        <div className="mt-6 opacity-80">
          <p className="text-xs text-muted-foreground mb-2">Trusted by teams at</p>
          <div className="flex flex-wrap gap-6 items-center justify-center lg:justify-start text-muted-foreground">
            <span className="text-sm font-semibold">StartupX</span>
            <span className="text-sm font-semibold">MedTech Labs</span>
            <span className="text-sm font-semibold">AutoWorks</span>
            <span className="text-sm font-semibold">IoT Co.</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="order-2 lg:order-2 mt-10 lg:mt-0"
      >
        <Card className="max-w-2xl mx-auto shadow-2xl bg-background/50 backdrop-blur-sm border-primary/20">
          <CardContent className="p-4">
            <img
              className="w-full rounded-lg"
              alt="Advanced multi-layer PCB board with components"
              src="/pcb.png"             // <- from public/pcbb.png
              decoding="async"
              loading="eager"
              fetchpriority="high"
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  </div>
</section>


    {/* About Us Section */}
<section id="about" className="py-20 bg-background">
  <div className="container">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="text-center mb-12"
    >
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
        About <span className="text-gradient-primary">PCB Xpress</span>
      </h2>
    </motion.div>

    <div className="grid lg:grid-cols-2 gap-10 items-center">
      {/* Left: Story */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-5 text-base md:text-lg">
          <p className="text-foreground/90">
            PCB Xpress was founded, with a vision to provide IoT services of global scale and quality to the needs of innovations across the industry. The global need for quality PCBs with faster delivery at an affordable price resulted in an experienced team focused on speed, reliability, and value.
          </p>
          <p className="text-foreground/80">
            We are now thriving toward our goal of becoming an integrated manufacturing, design, and engineering partner to all innovators—with the support of our customers.
          </p>
        </div>

        {/* Badges */}
        <div className="mt-6 flex flex-wrap gap-2">
          {['Vehicle IoT', 'PCB Manufacturing', 'Design + Fabrication', 'Assembly & QA'].map((t) => (
            <span key={t} className="px-3 py-1 rounded-full border bg-card text-sm text-muted-foreground">
              {t}
            </span>
          ))}
        </div>

        {/* Highlights */}
        <div className="mt-8 space-y-4">
          {/* Experience */}
          <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold">Experience</div>
              <div className="text-sm text-muted-foreground">9+ Years Of Excellence</div>
            </div>
          </div>

          {/* Three facts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Fact icon={BadgeCheck} title="Quality" text="ISO Certified Process" />
            <Fact icon={Headphones} title="Service" text="24/7 Customer Support" />
            <Fact icon={Users} title="100+" text="Trusted Clients" />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Button onClick={() => navigate('/quote?service=pcb')}>PCB Quote</Button>
          <Button
            variant="outline"
            onClick={() => navigate('/quote?service=3dprinting')}
          >
            3D Printing Quote
          </Button>
        </div>
      </motion.div>

     {/* Right: Visual */}
<motion.div
  initial={{ opacity: 0, x: 24 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6 }}
  className="relative"
>
  <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-card">
    {/* Aspect-ratio box so the image isn’t cropped */}
    <div className="w-full" style={{ aspectRatio: '16 / 9' }}>
      <img
        src="BLUEPCB.webp"
        alt="Close-up of blue PCB with traces and components"
        className="h-full w-full object-contain"   // <- show full image
        loading="lazy"
        decoding="async"
      />
    </div>
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
  </div>

  <div className="absolute -bottom-5 -right-5 bg-card border rounded-xl p-4 shadow-lg">
    <p className="text-sm text-muted-foreground">Trusted by startups and enterprises worldwide</p>
  </div>
</motion.div>

    </div>
  </div>
</section>

{/* Why Choose Us Section */}
<section className="py-20">
  <div className="container">
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-bold">Why Partner with PCB Xpress?</h2>
      <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
        We are more than a supplier; we are your integrated manufacturing partner.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {whyChooseUs.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.08 }}
        >
          <Card className="h-full hover-lift overflow-hidden">
            <div className="relative h-36 w-full overflow-hidden">
              <img
                src={
                  item.title === 'Affordable Pricing'
                    ? '/pcb%20image.jpg'
                    : item.title === 'Global Quality'
                    ? '/global.jpg'
                    : item.image
                }
                alt={`${item.title} at PCB Xpress`}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
            </div>
            <CardHeader className="items-center">
              <div className="flex-shrink-0 h-14 w-14 -mt-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-background">
                <item.icon className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-center">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm text-center">{item.description}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>

    <div className="text-center mt-10">
      <Link to="/capabilities">
        <Button variant="outline">See detailed capabilities</Button>
      </Link>
    </div>
  </div>
</section>


      
      {/* How It Works */}
      <section className="py-20 bg-secondary">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">From files to finished boards — in four clear steps.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {howSteps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="relative"
              >
                <HowItem icon={s.icon} title={s.title} desc={s.desc} step={i + 1} accent={s.accent} isLast={i === howSteps.length - 1} />
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <div className="flex items-center gap-3 justify-center">
              <Link to="/quote"><Button size="lg">Start Your Quote</Button></Link>
              <Link to="/capabilities"><Button variant="outline" size="lg">See Capabilities</Button></Link>
            </div>
            <p className="text-xs text-muted-foreground mt-2">No account required • Secure file upload • NDA available</p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-secondary">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Our Core Services</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Integrated solutions to bring your electronic innovations to life, from a single prototype to full-scale production.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover-lift overflow-hidden cursor-pointer" aria-label={service.title} onClick={() => handleFeatureClick(service.title)}>
                  <div className="relative h-40 w-full">
                    {service.video ? (
                      <video
                        className="w-full h-full object-cover"
                        src={service.video}
                        poster={service.image}
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img
                        className="w-full h-full object-cover"
                        src={service.image}
                        alt={`${service.title} preview`}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent" />
                    {service.video && (
                      <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded bg-black/50 text-white backdrop-blur">LIVE</span>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <service.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground text-sm">{service.description}</p>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/services');
                      }}
                    >
                      Explore
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/services">
              <Button size="lg">
                Explore All Services <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Quick answers about specs, lead times, shipping, and support.</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            <Faq q="What files do I need to get a quote?" a="Gerber files (.zip) for fabrication and BOM (.csv/.txt) for assembly. STEP/STL for 3D printing." />
            <Faq q="How fast can you deliver?" a="Prototypes in as fast as 24–72 hours, with express shipping options. Lead time depends on specs and quantity." />
            <Faq q="Do you support impedance control and RF?" a="Yes. We support controlled impedance, RF layouts, and high-frequency materials such as Rogers." />
            <Faq q="Can you source components for me?" a="Yes. We provide global sourcing with QA and traceability. Upload your BOM and we suggest alternates if needed." />
            <Faq q="Where are you based?" a="Kerala, India — serving customers worldwide with export-ready logistics." />
            <Faq q="How do I keep my designs confidential?" a="We can sign NDAs and follow secure file handling practices. Files are used only for quoting and production." />
          </div>
        </div>
      </section>
      
      {/* Industries We Serve Section (Enhanced) */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Powering Innovations Across Industries</h2>
            <p className="text-muted-foreground mt-2 max-w-3xl mx-auto">
              From rapid prototyping to production, our engineering‑first workflows adapt to your domain — bringing
              reliability, speed, and expert DFM to every build.
            </p>
          </div>
          {/* Industry Cards */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={industriesContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {industries.map((industry, index) => (
              <motion.div
                key={industry.name}
                variants={industryItemVariant}
                className="rounded-xl border bg-card p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <industry.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base">{industry.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{industry.desc}</p>
                {!!industry.examples?.length && (
                  <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
                    {industry.examples.map((ex) => (
                      <li key={ex}>{ex}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">DFM review • On‑time delivery</span>
                  <Button size="sm" onClick={() => navigate('/quote')} className="ml-2">Get Quote</Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
          {/* Callout */}
          <div className="mt-10 rounded-xl border p-5 bg-secondary/50 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
            <div className="flex-1">
              <p className="font-medium">Can’t find your industry?</p>
              <p className="text-sm text-muted-foreground">We build for niche applications too — RF, high‑temp, high‑voltage, and more.</p>
            </div>
            <Button onClick={() => navigate('/quote')} variant="outline">Discuss Your Project</Button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;

/* ---------- helpers ---------- */
const Stat = ({ kpi, label }) => (
  <div className="text-center rounded-xl border bg-card text-card-foreground p-4">
    <div className="text-2xl md:text-3xl font-bold text-primary leading-none">{kpi}</div>
    <div className="text-xs md:text-sm text-muted-foreground mt-1">{label}</div>
  </div>
);

const Fact = ({ icon: Icon, title, text }) => (
  <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{text}</div>
    </div>
  </div>
);

const HowItem = ({ icon: Icon, title, desc, step = 1, accent = 'from-primary to-primary/70', isLast = false }) => (
  <div className="relative rounded-xl border bg-card text-card-foreground p-6 h-full transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
    {!isLast && <div className="hidden lg:block absolute top-1/2 -right-5 w-10 h-0.5 bg-border" aria-hidden="true" />}
    <div className="flex items-center gap-3 mb-3">
      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
    </div>
    <p className="font-semibold">{title}</p>
    <p className="text-sm text-muted-foreground mt-1">{desc}</p>
  </div>
);

const Faq = ({ q, a }) => (
  <details className="group rounded-lg border p-4 bg-background">
    <summary className="cursor-pointer list-none font-medium flex items-center justify-between">
      <span>{q}</span>
      <span className="ml-4 text-muted-foreground transition-transform group-open:rotate-180">▾</span>
    </summary>
    <p className="mt-2 text-sm text-muted-foreground">{a}</p>
  </details>
);
