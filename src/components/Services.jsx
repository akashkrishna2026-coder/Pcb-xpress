import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Layers, Wrench, Package, Search, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const Services = () => {
  const services = [
    {
      icon: Layers,
      title: "Multilayer PCB Design",
      description: "Advanced multilayer PCB design and layout services with cutting-edge CAD tools and expert engineering.",
      features: ["Up to 32 layers", "HDI technology", "Impedance control", "Signal integrity"],
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Cpu,
      title: "PCB Fabrication",
      description: "High-precision PCB manufacturing with state-of-the-art equipment and rigorous quality control.",
      features: ["Quick turnaround", "High-density interconnect", "Flexible PCBs", "Rigid-flex boards"],
      color: "from-green-500 to-green-600"
    },
    {
      icon: Wrench,
      title: "PCB Assembly",
      description: "Complete PCB assembly services including SMT, THT, and mixed technology assembly solutions.",
      features: ["SMT assembly", "Through-hole", "BGA placement", "Testing & QC"],
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: Search,
      title: "Component Sourcing",
      description: "Global component procurement with authentic parts sourcing and supply chain management.",
      features: ["Authentic parts", "Global suppliers", "Cost optimization", "Inventory management"],
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Printer,
      title: "3D Printing",
      description: "Professional 3D printing services for prototyping, enclosures, and custom mechanical parts.",
      features: ["Multiple materials", "High precision", "Rapid prototyping", "Custom enclosures"],
      color: "from-red-500 to-red-600"
    },
    {
      icon: Package,
      title: "Full Turnkey",
      description: "Complete end-to-end solutions from design to delivery with integrated project management.",
      features: ["Design to delivery", "Project management", "Quality assurance", "Global shipping"],
      color: "from-indigo-500 to-indigo-600"
    }
  ];

  const handleServiceClick = (service) => {
    toast({ title: `🔧 ${service.title}`, description: 'More details coming soon.' });
  };

  return (
    <section id="services" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Comprehensive <span className="text-gradient">PCB Solutions</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From initial design concepts to final delivery, we provide end-to-end PCB manufacturing and 3D printing services that power innovation across industries.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg hover-lift group cursor-pointer"
              onClick={() => handleServiceClick(service)}
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${service.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <service.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{service.title}</h3>
              <p className="text-gray-600 mb-6">{service.description}</p>
              
              <ul className="space-y-2 mb-6">
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-sm text-gray-500">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Button 
                variant="outline" 
                className="w-full group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  handleServiceClick(service);
                }}
              >
                Learn More
              </Button>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-blue-600 to-green-500 rounded-2xl p-8 text-white">
            <h3 className="text-3xl font-bold mb-4">Ready to Start Your Project?</h3>
            <p className="text-xl mb-6 opacity-90">Get a quote and see how we can bring your ideas to life.</p>
            <Button 
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8"
              onClick={() => (window.location.href = '/quote')}
            >
              Get Quote
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;
