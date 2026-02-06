import React from 'react';
import { Link } from 'react-router-dom';
import { CircuitBoard, Linkedin, Twitter, Youtube, Mail, Phone, MapPin, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const Footer = () => {
  const { toast } = useToast();

  const handleFeatureClick = (featureName) => {
    toast({ title: 'Coming soon', description: `${featureName} will be available shortly.` });
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get('email') || '').trim();
      if (!/.+@.+\..+/.test(email)) {
        toast({ title: 'Invalid email', description: 'Please enter a valid email address.' });
        return;
      }
      const key = 'px_newsletter';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      if (!list.includes(email)) list.unshift(email);
      localStorage.setItem(key, JSON.stringify(list));
      toast({ title: '✅ Subscribed!', description: 'Thanks for subscribing to our newsletter!' });
      e.currentTarget.reset();
    } catch {
      toast({ title: 'Could not subscribe', description: 'Please try again later.' });
    }
  };

  const quickLinks = [
    { name: 'Services', path: '/services' },
    { name: 'Capabilities', path: '/capabilities' },
    { name: '3D Printing', path: '/3d-printing' },
    { name: 'About Us', path: '/#about' },
    { name: 'Blog', path: '/#blog' },
    { name: 'Contact', path: '/#contact' },
  ];

  const legalLinks = [
    { name: 'Privacy Policy', path: '/privacy' },
    { name: 'Terms of Service', path: '/terms' },
  ];

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          <div className="xl:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <CircuitBoard className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold font-orbitron tracking-wider">PCB Xpress</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              Global supplier of multi layer PCB manufacturer from Kerala providing comprehensive PCB manufacturing services, design, fabrication, and assembly solutions.
            </p>
            <div className="flex space-x-2">
              <a href="https://www.linkedin.com/company/pcbxpress/" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-primary/10" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://twitter.com/pcbxpress" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-primary/10" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://youtube.com/@pcbxpress" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-primary/10" aria-label="YouTube">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-4">Quick Links</p>
            <ul className="space-y-2">
              {quickLinks.map(link => (
                <li key={link.name}>
                  <Link to={link.path} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-4">Contact Us</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 shrink-0 text-primary" />
                <span>VST IoT Solutions Pvt Ltd, Thripunithura 682306, India</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:sales@pcbxpress.online" className="hover:text-primary">sales@pcbxpress.online</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href="tel:+919745001075" className="hover:text-primary">+91 9745001075</a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-4">Newsletter</p>
            <p className="text-sm text-muted-foreground mb-4">Stay updated with our latest innovations.</p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <Input type="email" name="email" placeholder="Your email" className="bg-background flex-1" required />
              <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} PCB Xpress. All Rights Reserved.</p>
          <div className="flex items-center gap-6">
            <p className="text-sm font-medium">Certifications: ISO 9001, UL</p>
            <div className="flex gap-4">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
