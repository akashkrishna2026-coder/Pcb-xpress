import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Menu, X, Search, User, Upload, FileText, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cart badge: listen for cart changes
  useEffect(() => {
    const readCart = () => {
      try {
        const raw = localStorage.getItem('px_cart');
        const arr = raw ? JSON.parse(raw) : [];
        const count = Array.isArray(arr) ? arr.reduce((n, it) => n + (it.quantity || 1), 0) : 0;
        setCartCount(count);
      } catch {
        setCartCount(0);
      }
    };
    readCart();
    const onEvt = (e) => {
      const items = e?.detail?.items;
      if (Array.isArray(items)) {
        const count = items.reduce((n, it) => n + (it.quantity || 1), 0);
        setCartCount(count);
      } else {
        readCart();
      }
    };
    window.addEventListener('px:cart-changed', onEvt);
    window.addEventListener('storage', readCart);
    return () => {
      window.removeEventListener('px:cart-changed', onEvt);
      window.removeEventListener('storage', readCart);
    };
  }, []);

  // Keyboard shortcuts: Cmd/Ctrl+K to open; Esc to close
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key?.toLowerCase?.();
      if ((e.ctrlKey || e.metaKey) && k === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (k === 'escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus?.(), 0);
    }
  }, [isSearchOpen]);

  const menuItems = [
    { name: 'Home', href: '#home' },
    { name: 'Services', href: '#services' },
    { name: 'Capabilities', href: '#capabilities' },
    { name: 'Get Quote', href: '#quote' },
    { name: 'Components', href: '#components' },
    { name: '3D Printing', href: '#3d-printing' },
    { name: 'Industries', href: '#industries' },
    { name: 'About Us', href: '#about' },
    { name: 'Blog/Resources', href: '#blog' },
    { name: 'Help Center', href: '#help' },
    { name: 'Contact', href: '#contact' }
  ];

  const handleMenuClick = (item) => {
    switch (item.name) {
      case 'Home':
        navigate('/');
        break;
      case 'Services':
        navigate('/services');
        break;
      case 'Capabilities':
        navigate('/capabilities');
        break;
      case 'Components':
        navigate('/components');
        break;
      case 'Get Quote':
        navigate('/quote');
        break;
      case '3D Printing':
        navigate('/3d-printing');
        break;
      default:
        navigate('/services');
    }
  };

  const handleUpload = () => {
    navigate('/quote');
  };

  const handleQuote = () => {
    navigate('/quote');
  };

  const executeSearch = (raw) => {
    const q = (raw ?? searchTerm).trim();
    if (!q) return;
    const ql = q.toLowerCase();
    const isMpnLike = /[a-z]{2,}\d|\d{2,}[a-z]/i.test(q);
    if (ql.includes('component') || ql.includes('bom') || isMpnLike) {
      navigate(`/components?q=${encodeURIComponent(q)}`);
      return;
    }
    if (ql.includes('quote') || ql.includes('gerber')) {
      navigate('/quote');
      return;
    }
    if (ql.includes('3d') || ql.includes('print')) {
      navigate('/3d-printing');
      return;
    }
    if (ql.includes('capab')) {
      navigate('/capabilities');
      return;
    }
    if (ql.includes('service')) {
      navigate('/services');
      return;
    }
    navigate('/services');
    toast({ title: 'Search', description: `Showing results in Services for "${q}"` });
  };

  const handleSearch = () => {
    try {
      const input = window.prompt('Search services, components, or pages');
      if (!input) return;
      const q = input.trim();
      if (!q) return;
      const ql = q.toLowerCase();

      // Heuristics: route based on intent
      const isMpnLike = /[a-z]{2,}\d|\d{2,}[a-z]/i.test(q); // rough MPN pattern
      if (ql.includes('component') || ql.includes('bom') || isMpnLike) {
        navigate(`/components?q=${encodeURIComponent(q)}`);
        return;
      }
      if (ql.includes('quote') || ql.includes('gerber')) {
        navigate('/quote');
        return;
      }
      if (ql.includes('3d') || ql.includes('print')) {
        navigate('/3d-printing');
        return;
      }
      if (ql.includes('capab')) {
        navigate('/capabilities');
        return;
      }
      if (ql.includes('service')) {
        navigate('/services');
        return;
      }
      if (ql.includes('component')) {
        navigate('/components');
        return;
      }
      // Fallback to services
      navigate('/services');
      toast({ title: 'Search', description: `Showing results in Services for "${q}"` });
    } catch {}
  };

  const handleAuth = () => {
    try {
      const raw = localStorage.getItem('px_user');
      if (raw) {
        navigate('/dashboard');
        return;
      }
    } catch {}
    navigate('/login');
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}
    >
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate('/')}
            aria-label="Go to home"
          >
            <Logo size={42} showText tagline="where dreams are made" theme="light" />
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {menuItems.slice(0, 6).map((item) => (
              <button
                key={item.name}
                onClick={() => handleMenuClick(item)}
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                {item.name}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleUpload}
              variant="outline"
              size="sm"
              className="hidden md:flex items-center space-x-2 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Files</span>
            </Button>

            <Button
              onClick={handleQuote}
              className="hidden md:flex bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Get Quote
            </Button>

            <button
              onClick={() => navigate('/cart')}
              className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={handleAuth}
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <User className="w-5 h-5" />
            </button>

            <button
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Open search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden mt-4 py-4 border-t border-gray-200"
          >
            <div className="flex flex-col space-y-4">
              {menuItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    handleMenuClick(item);
                    setIsMenuOpen(false);
                  }}
                  className="text-left text-gray-700 hover:text-blue-600 transition-colors font-medium py-2"
                >
                  {item.name}
                </button>
              ))}
              <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleUpload}
                  variant="outline"
                  className="justify-start border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </Button>
                <Button
                  onClick={handleQuote}
                  className="justify-start bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Get Quote
                </Button>
                <Button
                  onClick={() => { navigate('/cart'); setIsMenuOpen(false); }}
                  variant="outline"
                  className="justify-start"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  View Cart{cartCount ? ` (${cartCount})` : ''}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </nav>
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center p-4"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="mt-20 w-full max-w-2xl rounded-xl border bg-background text-foreground shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <p className="font-semibold">Search</p>
              <button className="p-2 text-muted-foreground hover:text-foreground" onClick={() => setIsSearchOpen(false)} aria-label="Close search">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <form onSubmit={(e) => { e.preventDefault(); executeSearch(); setIsSearchOpen(false); }}>
                <Input
                  ref={searchInputRef}
                  placeholder="Search services, components, or pages"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>
              <div className="text-xs text-muted-foreground">Try queries like: "ESP32-WROOM-32", "3D printing", "quote"</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSearchTerm('components'); executeSearch('components'); setIsSearchOpen(false); }}>Components</Button>
                <Button variant="outline" size="sm" onClick={() => { setSearchTerm('quote'); executeSearch('quote'); setIsSearchOpen(false); }}>Get Quote</Button>
                <Button variant="outline" size="sm" onClick={() => { setSearchTerm('3d printing'); executeSearch('3d printing'); setIsSearchOpen(false); }}>3D Printing</Button>
                <Button variant="outline" size="sm" onClick={() => { setSearchTerm('capabilities'); executeSearch('capabilities'); setIsSearchOpen(false); }}>Capabilities</Button>
                <Button variant="outline" size="sm" onClick={() => { setSearchTerm('services'); executeSearch('services'); setIsSearchOpen(false); }}>Services</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.header>
  );
};

export default Header;
