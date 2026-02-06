import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Zap, Shield, Globe } from 'lucide-react';

const Capabilities = () => {
  const capabilities = [
    {
      category: "PCB Specifications",
      items: [
        "1-32 layer PCBs",
        "0.1mm minimum trace width",
        "0.15mm minimum via size",
        "HDI and microvia technology",
        "Impedance control ±10%",
        "Blind and buried vias"
      ]
    },
    {
      category: "Materials & Finishes",
      items: [
        "FR4, Rogers, Polyimide",
        "HASL, ENIG, OSP finishes",
        "Flexible and rigid-flex",
        "High-frequency materials",
        "Thermal management",
        "EMI shielding"
      ]
    },
    {
      category: "Assembly Capabilities",
      items: [
        "0201 component placement",
        "BGA and QFN packages",
        "Mixed technology assembly",
        "Conformal coating",
        "Functional testing",
        "Box build assembly"
      ]
    },
    {
      category: "Quality Standards",
      items: [
        "ISO 9001:2015 certified",
        "IPC Class 2 & 3",
        "UL recognition",
        "RoHS compliance",
        "REACH compliance",
        "100% electrical testing"
      ]
    }
  ];

  const highlights = [
    {
      icon: Zap,
      title: "24-Hour Turnaround",
      description: "Express PCB fabrication and assembly services for urgent projects",
      color: "text-yellow-500"
    },
    {
      icon: Shield,
      title: "Quality Guaranteed",
      description: "ISO certified processes with comprehensive testing and inspection",
      color: "text-green-500"
    },
    {
      icon: Globe,
      title: "Global Shipping",
      description: "Worldwide delivery with tracking and secure packaging",
      color: "text-blue-500"
    }
  ];

  return (
    <section id="capabilities" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Advanced <span className="text-gradient">Manufacturing Capabilities</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            State-of-the-art equipment and processes ensure the highest quality PCBs and assemblies for your most demanding applications.
          </p>
        </motion.div>

        {/* Capabilities Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {capabilities.map((capability, index) => (
            <motion.div
              key={capability.category}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-gray-50 rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">{capability.category}</h3>
              <ul className="space-y-3">
                {capability.items.map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Highlights */}
        <div className="grid md:grid-cols-3 gap-8">
          {highlights.map((highlight, index) => (
            <motion.div
              key={highlight.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center p-8 bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg hover-lift"
            >
              <div className={`w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center ${highlight.color}`}>
                <highlight.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{highlight.title}</h3>
              <p className="text-gray-600">{highlight.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Manufacturing Image */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 rounded-2xl overflow-hidden shadow-2xl"
        >
          <img  
            className="w-full h-96 object-cover" 
            alt="Advanced PCB manufacturing facility in Kerala with modern SMT assembly lines"
           src="https://images.unsplash.com/photo-1532186773960-85649e5cb70b" />
        </motion.div>
      </div>
    </section>
  );
};

export default Capabilities;