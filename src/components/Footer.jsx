import Logo from '@/components/Logo';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Award, Linkedin, Mail, MapPin, Phone, Twitter, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  // Ensure footer year stays current even if static string exists in markup
  useEffect(() => {
    try {
      const year = new Date().getFullYear();
      const container = document.querySelector('footer .border-t .container .flex');
      if (container) {
        const p = container.querySelector('p.text-gray-400.text-sm');
        if (p) {
          p.innerHTML = `&copy; ${year} PCB Xpress. All rights reserved. Everything in VST.`;
        }
      }
    } catch {}
  }, []);
  const handleNewsletterSignup = async (e) => {
  e.preventDefault();

  try {
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();

    if (!/.+@.+\..+/.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }

    const res = await fetch("http://localhost:4000/api/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      toast({
        title: "Could not subscribe",
        description: data?.message || `Request failed (${res.status})`,
      });
      return;
    }

    toast({
      title: "✅ Subscribed",
      description:
        data?.message === "Already subscribed"
          ? "You are already subscribed."
          : "Thanks for subscribing! We'll keep you posted.",
    });

    e.target.reset();
  } catch (err) {
    toast({
      title: "Could not subscribe",
      description: err?.message || "Server not reachable. Please try again later.",
    });
  }
};

  // Removed unused toasts for unimplemented links; links now navigate or open directly.

  const quickLinks = [
    { label: 'Home', to: '/' },
    { label: 'Services', to: '/services' },
    { label: 'Capabilities', to: '/capabilities' },
    { label: 'Get Quote', to: '/quote' },
    { label: 'Components', to: '/components' },
    { label: '3D Printing', to: '/3d-printing' },
    { label: 'Industries', to: '/#industries' },
    { label: 'About Us', to: '/#about' },
    { label: 'Blog/Resources', to: '/#blog' },
    { label: 'Help Center', to: '/#help' },
    { label: 'Contact', to: '/#contact' },
  ];

  const certifications = [
    "ISO 9001:2015", "UL Recognition", "RoHS Compliance", "REACH Compliance"
  ];

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-1"
          >
            <div className="mb-6">
              <Link to="/" aria-label="Go to home" className="inline-flex items-center cursor-pointer">
                <Logo size={42} showText tagline="where dreams are made" theme="dark" />
              </Link>
            </div>
            <p className="text-gray-300 mb-6">
              Global supplier of multi layer PCB manufacturer from Kerala providing comprehensive PCB manufacturing services, design, fabrication, and assembly solutions.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300">sales@pcbxpress.online</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300">+91 9495647399</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-blue-400 mt-1" />
                <span className="text-blue-300">
                  PCB Xpress<br />
                  Mobility House<br />
                  1x/92 C, Puthiya Road, near NSS Karayogam Hall, Eroor PO<br />
                  Thripunithura 682306, India
                </span>
              </div>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h3 className="text-lg font-bold mb-6">Quick Links</h3>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="text-gray-300 hover:text-blue-400 transition-colors text-left py-1"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Certifications */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-lg font-bold mb-6">Certifications</h3>
            <div className="space-y-3">
              {certifications.map((cert) => (
                <div key={cert} className="flex items-center space-x-3">
                  <Award className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">{cert}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-8">
              <h4 className="font-semibold mb-4">Legal</h4>
              <div className="space-y-2">
                <Link to="/privacy" className="block text-gray-300 hover:text-blue-400 transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="block text-gray-300 hover:text-blue-400 transition-colors">Terms & Conditions</Link>
              </div>
            </div>
          </motion.div>

          {/* Newsletter */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className="text-lg font-bold mb-6">Stay Updated</h3>
            <p className="text-gray-300 mb-6">
              Get the latest updates on PCB technology, industry trends, and special offers.
            </p>
            
            <form onSubmit={handleNewsletterSignup} className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                required
              />
              <Button 
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600"
              >
                Subscribe
              </Button>
            </form>

            {/* Social Media */}
            <div className="mt-8">
              <h4 className="font-semibold mb-4">Follow Us</h4>
              <div className="flex space-x-4">
                <a
                  href="https://www.linkedin.com/company/pcbxpress/"
                  target="_blank" rel="noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a
                  href="https://twitter.com/pcbxpress"
                  target="_blank" rel="noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-400 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://youtube.com/@pcbxpress"
                  target="_blank" rel="noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 PCB Xpress. All rights reserved. Everything in VST.
            </p>
            <p className="text-gray-400 text-sm mt-2 md:mt-0">
              Make in India 🦁
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

