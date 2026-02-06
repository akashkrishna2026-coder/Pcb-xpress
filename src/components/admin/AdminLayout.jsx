// AdminLayout.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { CircuitBoard, LayoutDashboard, FileText, LogOut, ArrowLeft, User as UserIcon, Package, ChevronDown, ClipboardList, ClipboardCheck, CreditCard, ChevronDown as ArrowDown, Bot, AlertTriangle, Factory, ShieldCheck, CheckCircle, TestTube, Truck, DollarSign, BarChart3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const AdminLayout = ({ children, admin, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isQuotesOpen, setIsQuotesOpen] = useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [sidebarScrollable, setSidebarScrollable] = useState(false);
  const [contentScrollable, setContentScrollable] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const sidebarRef = useRef(null);
  const contentRef = useRef(null);

  // Update isQuotesOpen based on the current route
  useEffect(() => {
    setIsQuotesOpen(location.pathname.startsWith('/pcbXpress/quotes'));
    setIsDispatchOpen(location.pathname.startsWith('/pcbXpress/dispatch'));
  }, [location.pathname]);

  // Check for scroll availability
  useEffect(() => {
    const checkScroll = () => {
      if (sidebarRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = sidebarRef.current;
        setSidebarScrollable(scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 10);
      }
      if (contentRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = contentRef.current;
        setContentScrollable(scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 10);
      }
    };

    checkScroll();
    const interval = setInterval(checkScroll, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r bg-secondary/30 overflow-hidden">
        <div className="h-16 flex items-center gap-2 px-4 border-b flex-shrink-0">
          <CircuitBoard className="h-6 w-6 text-primary" />
          <span className="font-semibold">pcbXpress</span>
        </div>
        <div className="flex-1 overflow-y-auto relative" ref={sidebarRef}>
          <nav className="p-3 space-y-1">
            <AdminNavLink to="/pcbXpress" icon={<LayoutDashboard className="h-4 w-4" />} end>Dashboard</AdminNavLink>

            <div>
              <button
                onClick={() => setIsQuotesOpen(!isQuotesOpen)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-accent w-full"
              >
                <FileText className="h-4 w-4" />
                <span>Quotes</span>
                <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${isQuotesOpen ? 'rotate-180' : ''}`} />
              </button>
              {isQuotesOpen && (
                <div className="pl-6 space-y-1">
                  <AdminNavLink to="/pcbXpress/quotes" icon={<span className="w-4 h-4" />} end>
                    PCB Quotes
                  </AdminNavLink>
                  <AdminNavLink to="/pcbXpress/quotes/3dprinting" icon={<span className="w-4 h-4" />}>
                    3D Printing Quotes
                  </AdminNavLink>
                  <AdminNavLink to="/pcbXpress/quotes/assembly" icon={<span className="w-4 h-4" />}>
                    Assembly Quotes
                  </AdminNavLink>
                  <AdminNavLink to="/pcbXpress/quotes/wire-harness" icon={<span className="w-4 h-4" />}>
                    Wire Harness Quotes
                  </AdminNavLink>
                  <AdminNavLink to="/pcbXpress/quotes/testing" icon={<span className="w-4 h-4" />}>
                    Testing Quotes
                  </AdminNavLink>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => setIsDispatchOpen(!isDispatchOpen)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-accent w-full"
              >
                <Truck className="h-4 w-4" />
                <span>Dispatches</span>
                <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${isDispatchOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDispatchOpen && (
                <div className="pl-6 space-y-1">
                  <AdminNavLink to="/pcbXpress/dispatch/testing" icon={<span className="w-4 h-4" />} end>
                    Testing Dispatch
                  </AdminNavLink>
                  <AdminNavLink to="/pcbXpress/dispatch/wire-harness" icon={<span className="w-4 h-4" />} end>
                    Wiring Harness Dispatch
                  </AdminNavLink>
                  <AdminNavLink to="/pcbXpress/dispatch/3d-printing" icon={<span className="w-4 h-4" />} end>
                    3D Printing Dispatch
                  </AdminNavLink>
                  <AdminNavLink to="/pcbXpress/dispatch/pcb" icon={<span className="w-4 h-4" />} end>
                    PCB Printing Dispatch
                  </AdminNavLink>
                  <AdminNavLink to="/pcbXpress/dispatch/pcb-assembly" icon={<span className="w-4 h-4" />} end>
                    PCB Assembly Dispatch
                  </AdminNavLink>
                </div>
              )}
            </div>

            <AdminNavLink to="/pcbXpress/orders" icon={<ClipboardList className="h-4 w-4" />}>Orders</AdminNavLink>
            <AdminNavLink to="/pcbXpress/finance" icon={<DollarSign className="h-4 w-4" />}>Finance</AdminNavLink>
            <AdminNavLink to="/pcbXpress/manufacturing" icon={<BarChart3 className="h-4 w-4" />}>Manufacturing</AdminNavLink>
            <AdminNavLink to="/pcbXpress/attendance" icon={<ClipboardCheck className="h-4 w-4" />}>Attendance</AdminNavLink>
            <AdminNavLink to="/pcbXpress/users" icon={<UserIcon className="h-4 w-4" />}>Users</AdminNavLink>
            <AdminNavLink to="/pcbXpress/mfg/roles" icon={<Factory className="h-4 w-4" />}>MFG Roles</AdminNavLink>
            <AdminNavLink to="/pcbXpress/mfg/permissions" icon={<ShieldCheck className="h-4 w-4" />}>MFG Permissions</AdminNavLink>
            <AdminNavLink to="/pcbXpress/mfg/approval" icon={<CheckCircle className="h-4 w-4" />}>Mfg Approval</AdminNavLink>
            <AdminNavLink to="/pcbXpress/payment-methods" icon={<CreditCard className="h-4 w-4" />}>Payment Methods</AdminNavLink>
            <AdminNavLink to="/pcbXpress/products" icon={<Package className="h-4 w-4" />}>Products</AdminNavLink>
            <AdminNavLink to="/pcbXpress/ai-agent" icon={<Bot className="h-4 w-4" />}>AI Agent</AdminNavLink>
            <AdminNavLink to="/pcbXpress/profile" icon={<UserIcon className="h-4 w-4" />}>Profile</AdminNavLink>
            <AdminNavLink to="/pcbXpress/settings" icon={<FileText className="h-4 w-4" />}>Settings</AdminNavLink>
          </nav>
          {sidebarScrollable && <ScrollIndicator />}
        </div>
        <div className="p-3 border-t flex-shrink-0">
          <button onClick={() => navigate('/')} className="w-full inline-flex items-center gap-2 text-sm rounded-md border px-3 py-2 hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2 lg:hidden">
            <CircuitBoard className="h-6 w-6 text-primary" />
            <span className="font-semibold">pcbXpress</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {admin ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full px-2 py-1 hover:bg-accent focus:outline-none">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    {admin?.email?.[0]?.toUpperCase?.() || 'A'}
                  </div>
                  <span className="hidden sm:block text-sm text-muted-foreground max-w-[160px] truncate">{admin.email}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="max-w-[220px] truncate">Signed in as {admin.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); navigate('/pcbXpress/profile'); }} className="gap-2">
                    <UserIcon className="h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-red-600 focus:bg-red-50" onSelect={(e) => { e.preventDefault(); setShowLogoutDialog(true); }}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button onClick={() => navigate('/pcbXpress/login')} className="inline-flex items-center gap-2 text-sm rounded-md border px-3 py-2 hover:bg-accent">
                <UserIcon className="h-4 w-4" /> Sign in
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 relative" ref={contentRef}>
          {children}
          {contentScrollable && <ScrollIndicator />}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Sign Out
            </DialogTitle>
            <DialogDescription className="text-left">
              Are you sure you want to sign out of the admin panel? You will need to sign in again to access administrative features.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Security Reminder</p>
              <p className="text-yellow-700">Make sure to save any unsaved changes before signing out.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowLogoutDialog(false);
                onLogout && onLogout();
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ScrollIndicator = () => (
  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10">
    <div
      className="bg-primary/20 rounded-full p-1 shadow-lg"
      style={{
        animation: 'ballBounce 2.5s ease-in-out infinite, ballGlow 1.5s ease-in-out infinite alternate'
      }}
    >
      <ArrowDown
        className="h-4 w-4 text-primary"
        style={{
          animation: 'ballSquish 2.5s ease-in-out infinite'
        }}
      />
    </div>
    <style dangerouslySetInnerHTML={{
      __html: `
        @keyframes ballBounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0px) scale(1);
          }
          10% {
            transform: translateY(-6px) scale(0.95);
          }
          30% {
            transform: translateY(-3px) scale(0.98);
          }
          40% {
            transform: translateY(-10px) scale(0.9);
          }
          60% {
            transform: translateY(-5px) scale(0.95);
          }
          70% {
            transform: translateY(-14px) scale(0.85);
          }
          90% {
            transform: translateY(-2px) scale(0.98);
          }
        }

        @keyframes ballSquish {
          0%, 20%, 50%, 80%, 100% {
            transform: scaleY(1) scaleX(1);
          }
          10%, 30%, 60%, 90% {
            transform: scaleY(0.9) scaleX(1.1);
          }
          40%, 70% {
            transform: scaleY(0.8) scaleX(1.2);
          }
        }

        @keyframes ballGlow {
          0% {
            box-shadow: 0 0 5px rgba(var(--primary), 0.3);
          }
          100% {
            box-shadow: 0 0 15px rgba(var(--primary), 0.6);
          }
        }
      `
    }} />
  </div>
);

const AdminNavLink = ({ to, icon, children, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary hover:bg-accent'}`}
  >
    {icon}
    <span>{children}</span>
  </NavLink>
);

export default AdminLayout;
