import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CircuitBoard, Search, User, Menu, X, UploadCloud, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Services', path: '/services' },
    { name: 'Capabilities', path: '/capabilities' },
    { name: '3D Printing', path: '/3d-printing' },
    { name: 'Industries', path: '/industries' },
  ];
  
  const moreItems = [
    { name: 'About Us', path: '/about' },
    { name: 'Blog/Resources', path: '/blog' },
    { name: 'Help Center', path: '/help' },
    { name: 'Contact', path: '/contact' },
  ];

  const handleFeatureClick = (featureName) => {
    toast({ title: 'Coming soon', description: `${featureName} will be available shortly.` });
  };
  
  const handleQuoteClick = () => {
    const quoteSection = document.getElementById('instant-quote');
    if (quoteSection) {
      quoteSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const menuVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: 'auto', transition: { staggerChildren: 0.05 } },
    exit: { opacity: 0, height: 0 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 }
  };
  
  const NavLinkItem = ({ to, children, isMobile = false }) => {
    const className = "text-sm font-medium transition-colors";
    const activeClassName = "text-primary";
    const inactiveClassName = "text-muted-foreground hover:text-primary";
    
    if (isMobile) {
      return (
        <NavLink to={to} onClick={() => setIsMenuOpen(false)} className={({isActive}) => `${className} ${isActive ? activeClassName : 'text-foreground'}`}>
          {children}
        </NavLink>
      )
    }
    
    return (
      <NavLink to={to} className={({isActive}) => `${className} ${isActive ? activeClassName : inactiveClassName}`}>
        {children}
      </NavLink>
    );
  };

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80' : 'bg-transparent'}`}>
      <div className="container flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <CircuitBoard className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold font-orbitron tracking-wider">PCB Xpress</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          <NavLinkItem to="/">Home</NavLinkItem>
          <NavLinkItem to="/services">Services</NavLinkItem>
          {navItems.slice(1).map((item) => (
            <button key={item.name} onClick={() => handleFeatureClick(item.name)} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              {item.name}
            </button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus:outline-none">
              More <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {moreItems.map((item) => (
                <DropdownMenuItem key={item.name} onClick={() => handleFeatureClick(item.name)}>{item.name}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => handleFeatureClick('Search')}>
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => handleFeatureClick('Login/Signup')}>
            <User className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="hidden sm:inline-flex gap-2" onClick={handleQuoteClick}>
            <UploadCloud className="h-4 w-4" /> Upload Files
          </Button>
          <Button className="hidden lg:inline-flex" onClick={handleQuoteClick}>
            Get Quote
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="absolute top-full left-0 w-full bg-background/95 backdrop-blur-sm lg:hidden"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={menuVariants}
          >
            <div className="container flex flex-col gap-4 py-4">
              <motion.div variants={itemVariants}>
                <NavLinkItem to="/" isMobile>Home</NavLinkItem>
              </motion.div>
              <motion.div variants={itemVariants}>
                <NavLinkItem to="/services" isMobile>Services</NavLinkItem>
              </motion.div>
              {[...navItems.slice(1), ...moreItems].map((item) => (
                <motion.div key={item.name} variants={itemVariants}>
                  <button
                    onClick={() => {
                      handleFeatureClick(item.name);
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left text-base font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {item.name}
                  </button>
                </motion.div>
              ))}
              <motion.div variants={itemVariants} className="border-t border-border/40 pt-4 flex flex-col gap-2">
                 <Button className="w-full gap-2" onClick={() => { handleQuoteClick(); setIsMenuOpen(false); }}>
                    Get Quote
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
