// App.jsx

import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Chatbot from '@/components/Chatbot';
import HomePage from '@/pages/HomePage';
import ServicesPage from '@/pages/ServicesPage';
import QuotePage from '@/pages/QuotePage';
import CapabilitiesPage from '@/pages/CapabilitiesPage';
import ComponentsPage from '@/pages/ComponentsPage';
import CartPage from '@/pages/CartPage';
import ThreeDPrintingPage from '@/pages/ThreeDPrintingPage';
import LoginPage from '@/pages/LoginPage';
import CheckoutPage from '@/pages/CheckoutPage';
import DashboardPage from '@/pages/DashboardPage';
import PaymentPage from '@/pages/PaymentPage';
import AdminLoginPage from '@/pages/AdminLoginPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import AdminSettingsPage from '@/pages/AdminSettingsPage';
import AdminQuotesPage from '@/pages/AdminQuotesPage';
import AdminProfilePage from '@/pages/AdminProfilePage';
import AdminProductsPage from '@/pages/AdminProductsPage';
import Admin3DPrintingQuotesPage from '@/pages/Admin3DPrintingQuotesPage';
import AdminAssemblyQuotesPage from '@/pages/AdminAssemblyQuotesPage';
import AdminWireHarnessQuotesPage from '@/pages/AdminWireHarnessQuotesPage';
import AdminTestingQuotesPage from '@/pages/AdminTestingQuotesPage';
import AdminTestingDispatchPage from '@/pages/AdminTestingDispatchPage';
import AdminWireHarnessDispatchPage from '@/pages/AdminWireHarnessDispatchPage';
import Admin3DPrintingDispatchPage from '@/pages/Admin3DPrintingDispatchPage';
import AdminPcbDispatchPage from '@/pages/AdminPcbDispatchPage';
import AdminPcbAssemblyDispatchPage from '@/pages/AdminPcbAssemblyDispatchPage';
import WireHarnessDashboardPage from '@/pages/WireHarnessDashboardPage';
import AdminOrdersPage from '@/pages/AdminOrdersPage';
import AdminFinancePage from '@/pages/AdminFinancePage';
import AdminManufacturingDashboardPage from '@/pages/AdminManufacturingDashboardPage';
import AdminAttendancePage from '@/pages/AdminAttendancePage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import AdminPaymentMethodsPage from '@/pages/AdminPaymentMethodsPage';
import AdminAiAgentSettingsPage from '@/pages/AdminAiAgentSettings';
import MfgLoginPage from '@/pages/MfgLoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import SalesLoginPage from '@/components/sales/SalesLoginPage';
import SalesSignupPage from '@/components/sales/SalesSignupPage';
import SalesDashboardPage from '@/components/sales/SalesDashboardPage';
import SalesCustomersPage from '@/components/sales/SalesCustomersPage';
import SalesEnquiriesPage from '@/components/sales/SalesEnquiriesPage';
import SalesFollowupsPage from '@/components/sales/SalesFollowupsPage';
import SalesNegotiationsPage from '@/components/sales/SalesNegotiationsPage';
import SalesQuotesPage from '@/components/sales/SalesQuotesPage';
import { MfgDashboardRouter } from '@/components/manufacturing';
import AdminMfgPermissionsPage from '@/pages/AdminMfgPermissionsPage';
import AdminMfgRolesPage from '@/pages/AdminMfgRolesPage';
import AdminMfgApprovalPage from '@/pages/AdminMfgApprovalPage';
import Preloader from '@/components/Preloader';
import PromotionalImagePopup from '@/components/PromotionalImagePopup';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import MaintenanceModeBanner from '@/components/MaintenanceModeBanner';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsPage from '@/pages/TermsPage';
import OrderSuccessPage from '@/pages/OrderSuccessPage';
import { getUser } from '@/lib/storage';

function AppShell() {
  const location = useLocation();
  const [initialLoading, setInitialLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const firstLoadRef = useRef(true);
  const user = getUser();
  const isPortalRoute =
    location.pathname.startsWith('/pcbXpress') || 
    location.pathname.startsWith('/mfgpcbxpress') || 
    location.pathname.startsWith('/sales');

  // Initial load: wait for window load or fallback timeout
  useEffect(() => {
    const onLoad = () => setInitialLoading(false);
    if (document.readyState === 'complete') {
      setTimeout(() => setInitialLoading(false), 300);
    } else {
      window.addEventListener('load', onLoad, { once: true });
      const t = setTimeout(() => setInitialLoading(false), 2000);
      return () => {
        window.removeEventListener('load', onLoad);
        clearTimeout(t);
      };
    }
  }, []);

  // Route change preloader (skip first render)
  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    setRouteLoading(true);
    const t = setTimeout(() => setRouteLoading(false), 350);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Preloader active={(initialLoading || routeLoading) && !isPortalRoute} />
      <Helmet>
        <title>PCB Xpress | PCB Manufacturing, Design & 3D Printing</title>
        <meta name="description" content="PCB Xpress offers fast, affordable, and high-quality multilayer PCB manufacturing, design, fabrication, assembly, component sourcing, and 3D printing services for innovators worldwide." />
        <meta property="og:title" content="PCB Xpress | PCB Manufacturing, Design & 3D Printing" />
        <meta property="og:description" content="Your integrated partner for IoT-focused PCB and 3D printing solutions." />
      </Helmet>
      {!isPortalRoute && <MaintenanceModeBanner />}
      {!isPortalRoute && <Header />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/quote" element={<QuotePage />} />
          <Route path="/capabilities" element={<CapabilitiesPage />} />
          <Route path="/components" element={<ComponentsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/3d-printing" element={<ThreeDPrintingPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {user ? (
            <Route path="/dashboard" element={<DashboardPage />} />
          ) : (
            <Route path="/dashboard" element={<Navigate to="/login" replace />} />
          )}
          {user ? (
            <Route path="/wire-harness-dashboard" element={<WireHarnessDashboardPage />} />
          ) : (
            <Route path="/wire-harness-dashboard" element={<Navigate to="/login" replace />} />
          )}
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/order-success" element={<OrderSuccessPage />} />
          <Route path="/pcbXpress/login" element={<AdminLoginPage />} />
          <Route path="/pcbXpress" element={<AdminDashboardPage />} />
          <Route path="/pcbXpress/quotes" element={<AdminQuotesPage />} />
          <Route path="/pcbXpress/quotes/3dprinting" element={<Admin3DPrintingQuotesPage />} />
          <Route path="/pcbXpress/quotes/assembly" element={<AdminAssemblyQuotesPage />} />
          <Route path="/pcbXpress/quotes/wire-harness" element={<AdminWireHarnessQuotesPage />} />
          <Route path="/pcbXpress/quotes/testing" element={<AdminTestingQuotesPage />} />
          <Route path="/pcbXpress/dispatch/testing" element={<AdminTestingDispatchPage />} />
          <Route path="/pcbXpress/dispatch/wire-harness" element={<AdminWireHarnessDispatchPage />} />
          <Route path="/pcbXpress/dispatch/3d-printing" element={<Admin3DPrintingDispatchPage />} />
          <Route path="/pcbXpress/dispatch/pcb" element={<AdminPcbDispatchPage />} />
          <Route path="/pcbXpress/dispatch/pcb-assembly" element={<AdminPcbAssemblyDispatchPage />} />
          <Route path="/pcbXpress/products" element={<AdminProductsPage />} />
          <Route path="/pcbXpress/settings" element={<AdminSettingsPage />} />
          <Route path="/pcbXpress/profile" element={<AdminProfilePage />} />
          <Route path="/pcbXpress/orders" element={<AdminOrdersPage />} /> {/* new */}
          <Route path="/pcbXpress/finance" element={<AdminFinancePage />} />
          <Route path="/pcbXpress/manufacturing" element={<AdminManufacturingDashboardPage />} />
          <Route path="/pcbXpress/attendance" element={<AdminAttendancePage />} />
          <Route path="/pcbXpress/users" element={<AdminUsersPage />} />
          <Route path="/pcbXpress/mfg/roles" element={<AdminMfgRolesPage />} />
          <Route path="/pcbXpress/mfg/permissions" element={<AdminMfgPermissionsPage />} />
          <Route path="/pcbXpress/mfg/approval" element={<AdminMfgApprovalPage />} />
          <Route path="/pcbXpress/payment-methods" element={<AdminPaymentMethodsPage />} />
          <Route path="/pcbXpress/ai-agent" element={<AdminAiAgentSettingsPage />} />
          <Route path="/mfgpcbxpress/login" element={<MfgLoginPage />} />
          <Route path="/mfgpcbxpress" element={<Navigate to="/mfgpcbxpress/dashboard" replace />} />
          <Route path="/mfgpcbxpress/dashboard" element={<MfgDashboardRouter />} />
          
          {/* Sales Routes */}
          <Route path="/sales/login" element={<SalesLoginPage />} />
          <Route path="/sales/signup" element={<SalesSignupPage />} />
          <Route path="/sales" element={<Navigate to="/sales/dashboard" replace />} />
          <Route path="/sales/dashboard" element={<SalesDashboardPage />} />
          <Route path="/sales/customers" element={<SalesCustomersPage />} />
          <Route path="/sales/enquiries" element={<SalesEnquiriesPage />} />
          <Route path="/sales/followups" element={<SalesFollowupsPage />} />
          <Route path="/sales/negotiations" element={<SalesNegotiationsPage />} />
          <Route path="/sales/quotes" element={<SalesQuotesPage />} />
        </Routes>
      </main>
      {!isPortalRoute && <Footer />}
      {!isPortalRoute && <Chatbot />}
      {!isPortalRoute && <ScrollToTopButton />}
      {!isPortalRoute && <PromotionalImagePopup />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
