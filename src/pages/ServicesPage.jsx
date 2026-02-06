import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Layers, Cpu, Wrench, Search, Printer, Package, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ServicesPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleQuoteClick = () => {
    navigate('/quote');
  };

  const services = [
    {
      id: 'fabrication',
      icon: Layers,
      title: "PCB Fabrication",
      description: "High-precision PCB manufacturing for prototypes and mass production. We support a wide range of materials and finishes to meet your exact specifications.",
      features: ["1-32 Layer PCBs", "Rigid, Flex, and Rigid-Flex", "Advanced materials (Rogers, Isola)", "Multiple surface finishes (HASL, ENIG, OSP)"],
      quick: ["Up to 32L", "ENIG/HASL", "FR-4/Rogers"],
      img: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48",
      video: "https://cdn.coverr.co/videos/coverr-microchip-inspection-9707/1080p.mp4"
    },
    {
      id: 'assembly',
      icon: Cpu,
      title: "PCB Assembly",
      description: "Complete turnkey and consigned PCB assembly services. Our state-of-the-art SMT and THT lines ensure high-quality and reliable assembly for any project scale.",
      features: ["Surface Mount (SMT) & Through-Hole (THT)", "BGA, QFN, and 0201 placement", "Automated Optical Inspection (AOI)", "Functional Testing (FCT)"],
      quick: ["0201-BGA", "SMT & THT", "AOI/FCT"],
      img: "/assembling.png",
      video: "https://cdn.coverr.co/videos/coverr-production-line-in-a-factory-5283/1080p.mp4"
    },
    {
      id: 'printing',
      icon: Printer,
      title: "3D Printing",
      description: "Rapid prototyping and production of custom enclosures and mechanical parts using a variety of 3D printing technologies and materials.",
      features: ["FDM, SLA, and SLS printing", "Wide range of materials (PLA, ABS, PETG, Resin)", "High-resolution prints", "Functional prototypes and end-use parts"],
      quick: ["FDM/SLA/SLS", "High detail", "Fast lead"],
      img: "/3d.png",
      video: "https://cdn.coverr.co/videos/coverr-3d-printing-9677/1080p.mp4"
    },
    {
      id: 'components',
      icon: Search,
      title: "Component Sourcing",
      description: "Streamline your supply chain with our global component sourcing service. We procure authentic, high-quality components from trusted suppliers worldwide.",
      features: ["Global supplier network", "Bill of Materials (BOM) analysis", "Cost optimization", "Counterfeit prevention"],
      quick: ["Global vendors", "BOM review", "QA/Trace"],
      img: "/sourcing.png",
      video: ""
    },
    {
      id: 'turnkey',
      icon: Package,
      title: "Full Turnkey Solution",
      description: "From concept to delivery, our full turnkey service manages your entire project. We handle design, fabrication, assembly, and testing for a seamless experience.",
      features: ["End-to-end project management", "DFM/DFA analysis", "Integrated supply chain", "Final assembly and box build"],
      quick: ["DFM/DFA", "Supply chain", "Box build"],
      img: "https://images.unsplash.com/photo-1517048676732-d65bc937f952",
      video: ""
    },
  ];

  return (
    <>
      <Helmet>
        <title>Our Services | PCB Xpress</title>
        <meta name="description" content="Explore our comprehensive services including PCB Fabrication, Assembly, 3D Printing, Component Sourcing, and Full Turnkey Solutions." />
      </Helmet>

      {/* Page Header */}
      <section className="py-20 bg-secondary">
        <div className="container text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-4xl md:text-5xl font-bold tracking-tighter mb-4"
          >
            Our Services
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-muted-foreground"
          >
            End-to-end solutions designed to accelerate your product development cycle and bring your innovations to market faster.
          </motion.p>
        </div>
      </section>

      {/* Sticky Sub‑Nav */}
      <section className="sticky top-16 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container">
          <div className="flex overflow-x-auto no-scrollbar gap-2 py-2">
            {services.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="px-3 py-1 rounded-full border text-sm text-muted-foreground hover:text-primary whitespace-nowrap">
                {s.title}
              </a>
            ))}
            <div className="ml-auto" />
          </div>
        </div>
      </section>

      {/* Services List */}
      <section className="py-24">
        <div className="container">
          <div className="space-y-20">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className={`scroll-mt-28`} // anchor offset
              >
                {/* Anchor target */}
                <div id={service.id} />
                <div className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 !== 0 ? 'lg:grid-flow-col-dense' : ''}`}>
                <div className={index % 2 !== 0 ? 'lg:col-start-2' : ''}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <service.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold">{service.title}</h2>
                  </div>
                  <p className="text-muted-foreground mb-4">{service.description}</p>
                  {/* Quick spec chips */}
                  {service.quick && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {service.quick.map((q) => (
                        <span key={q} className="px-2.5 py-1 rounded-full border text-xs text-muted-foreground">{q}</span>
                      ))}
                    </div>
                  )}
                  <ul className="space-y-3 mb-8">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={handleQuoteClick}>
                    Get a Quote for {service.title} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className={`relative ${index % 2 !== 0 ? 'lg:col-start-1' : ''}`}>
                  <div className="relative w-full h-80 rounded-lg overflow-hidden shadow-xl">
                    {service.video ? (
                      <video
                        className="w-full h-full object-cover"
                        src={service.video}
                        poster={service.img}
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img src={service.img} alt={service.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-background/10 to-transparent" />
                    {service.video && (
                      <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded bg-black/50 text-white backdrop-blur">LIVE</span>
                    )}
                  </div>
                </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-secondary">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build Your Next Project?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">Let's turn your vision into a reality. Get a free, no-obligation quote from our experts today.</p>
          <Button size="lg" onClick={handleQuoteClick}>
            Request a Free Quote <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </>
  );
};

export default ServicesPage;
