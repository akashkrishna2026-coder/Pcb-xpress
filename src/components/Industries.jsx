import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Car, Heart, Wifi, Factory, Gamepad2 } from 'lucide-react';

const Industries = () => {
  const industries = [
    {
      icon: Smartphone,
      title: "Consumer Electronics",
      description: "Smartphones, tablets, wearables, and smart home devices with miniaturized PCB solutions.",
      projects: "2000+ Projects",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Wifi,
      title: "IoT & Connectivity",
      description: "Connected devices, sensors, and wireless communication modules for the Internet of Things.",
      projects: "1500+ Projects",
      color: "from-green-500 to-green-600"
    },
    {
      icon: Car,
      title: "Automotive",
      description: "Advanced driver assistance systems, infotainment, and electric vehicle control units.",
      projects: "800+ Projects",
      color: "from-red-500 to-red-600"
    },
    {
      icon: Heart,
      title: "Medical Devices",
      description: "Life-critical medical equipment, diagnostic devices, and patient monitoring systems.",
      projects: "600+ Projects",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Factory,
      title: "Industrial Automation",
      description: "Control systems, robotics, and industrial IoT solutions for smart manufacturing.",
      projects: "1200+ Projects",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: Gamepad2,
      title: "Gaming & Entertainment",
      description: "Gaming consoles, VR/AR devices, and entertainment system electronics.",
      projects: "400+ Projects",
      color: "from-indigo-500 to-indigo-600"
    }
  ];

  return (
    <section id="industries" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Industries We <span className="text-gradient">Serve</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From consumer electronics to life-critical medical devices, our PCB solutions power innovation across diverse industries worldwide.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {industries.map((industry, index) => (
            <motion.div
              key={industry.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg hover-lift group cursor-pointer"
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${industry.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <industry.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{industry.title}</h3>
              <p className="text-gray-600 mb-6">{industry.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-600">{industry.projects}</span>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <span className="text-blue-600 group-hover:text-white text-lg">→</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Success Stories */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16"
        >
          <div className="bg-gradient-to-r from-blue-600 to-green-500 rounded-2xl p-8 lg:p-12 text-white">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-3xl lg:text-4xl font-bold mb-6">Trusted by Global Innovators</h3>
                <p className="text-xl mb-8 opacity-90">
                  From startups to Fortune 500 companies, we've delivered over 6,500 successful projects across 50+ countries.
                </p>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">6.5K+</div>
                    <div className="text-sm opacity-80">Projects Delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">50+</div>
                    <div className="text-sm opacity-80">Countries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">99.8%</div>
                    <div className="text-sm opacity-80">Quality Rate</div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <img  
                  className="w-full h-64 object-cover rounded-xl" 
                  alt="Global PCB manufacturing success stories with diverse electronic devices"
                 src="https://images.unsplash.com/photo-1538179967859-d619bbdcb3d4" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Industries;