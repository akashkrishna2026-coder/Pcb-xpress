import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getSalesUser, clearSalesUser, clearSalesToken, getSalesToken } from '@/lib/storage';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import SalesLayout from '@/components/sales/SalesLayout';
import SalesQuotesPage from '@/components/sales/SalesQuotesPage';
import { 
  Users, 
  MessageSquare, 
  Phone, 
  TrendingUp, 
  Eye,
  Calendar,
  DollarSign,
  UserPlus,
  Target,
  Activity,
  AlertCircle,
  CheckCircle,
  Star,
  FileText
} from 'lucide-react';

const SalesDashboardPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [salesUser, setSalesUser] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customersFromQuotes, setCustomersFromQuotes] = useState([]);
  const [quotes, setQuotes] = useState([]); // Add quotes state like Admin Dashboard
  const [financeData, setFinanceData] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalEnquiries: 0,
    activeFollowups: 0,
    ongoingNegotiations: 0,
    customerVisits: 0,
    thisMonthRevenue: 0,
    newCustomersThisMonth: 0,
    conversionRate: 0
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const user = getSalesUser();
      if (!user) {
        navigate('/sales/login');
        return;
      }
      setSalesUser(user);

      try {
        // Load the main datasets in parallel
        // Load customer data first (we need the raw arrays immediately),
        // then load other datasets in parallel and compute monthly aggregates
        const customerResults = await loadCustomerData();
        await Promise.all([
          loadFinanceData(),
          loadUserActivity(),
        ]);

        // After we have the fetched customer/quote arrays, compute monthly aggregates
        await loadMonthlyData(customerResults?.customers || [], customerResults?.quotes || [], customerResults?.customersFromQuotes || []);
        // Load dashboard stats too
        await loadDashboardData();
      } catch (err) {
        console.error('Init load error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  const loadDashboardData = async () => {
    const token = getSalesToken();
    if (!token) {
      toast({ 
        title: 'Authentication error', 
        description: 'Please log in again' 
      });
      navigate('/sales/login');
      return;
    }

    try {
      // Fetch real dashboard stats
      const statsRes = await api.getSalesDashboardStats(token);
      setStats(statsRes.stats || {
        totalCustomers: 0,
        totalEnquiries: 0,
        activeFollowups: 0,
        ongoingNegotiations: 0,
        customerVisits: 0,
        thisMonthRevenue: 0,
        newCustomersThisMonth: 0,
        conversionRate: 0
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set default values if API fails
      setStats({
        totalCustomers: 0,
        totalEnquiries: 0,
        activeFollowups: 0,
        ongoingNegotiations: 0,
        customerVisits: 0,
        thisMonthRevenue: 0,
        newCustomersThisMonth: 0,
        conversionRate: 0
      });
    }
  };

  const loadCustomerData = async () => {
    const token = getSalesToken();
    if (!token) return;

    try {
      // Load customers
      const customersRes = await api.getSalesCustomers(token);
      if (customersRes.customers) {
        setCustomers(customersRes.customers);
      }

      // Load customers from quotes
      const quotesRes = await api.getCustomersFromQuotes(token);
      if (quotesRes.customers) {
        setCustomersFromQuotes(quotesRes.customers);
      }

      // Load quotes data directly like Admin Dashboard
      const quotesListRes = await api.listAllQuotesAdmin(token);
      if (quotesListRes.quotes) {
        setQuotes(quotesListRes.quotes);
      }
      return {
        customers: customersRes?.customers || [],
        customersFromQuotes: quotesRes?.customers || [],
        quotes: quotesListRes?.quotes || []
      };
    } catch (error) {
      console.error('Error loading customer data:', error);
    }
  };

  const loadFinanceData = async () => {
    const token = getSalesToken();
    if (!token) return;

    try {
      const financeRes = await api.getFinanceSummary(token);
      if (financeRes.summary) {
        setFinanceData(financeRes.summary);
      }
    } catch (error) {
      console.error('Error loading finance data:', error);
    }
  };

  const loadUserActivity = async () => {
    const token = getSalesToken();
    if (!token) return;

    try {
      // Try to derive recent user activity from customers list if possible
      // We'll use customer lastLogin/updatedAt fields where available
      // If customers are already loaded, create activity from them
      if (customers && customers.length > 0) {
        const activity = customers.slice(0, 50).map((c, i) => ({
          id: c._id || c.id || `c-${i}`,
          name: c.name || c.company || c.email || 'Unknown',
          email: c.email || '',
          lastLogin: c.lastLogin ? new Date(c.lastLogin) : (c.updatedAt ? new Date(c.updatedAt) : new Date(c.createdAt)),
          role: 'customer'
        }));
        setUserActivity(activity);
      } else {
        // Fallback: keep empty activity until customers load
        setUserActivity([]);
      }
    } catch (error) {
      console.error('Error loading user activity:', error);
    } finally {
    }
  };

  const loadMonthlyData = async (customersParam = null, quotesParam = null, customersFromQuotesParam = null) => {
    try {
      const currentYear = new Date().getFullYear();
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

      const monthly = months.map((month, index) => {
        const monthStart = new Date(currentYear, index, 1);
        const monthEnd = new Date(currentYear, index + 1, 1);

        // Choose data source: prefer passed-in arrays (fresh fetch), fall back to state
        const custSource = Array.isArray(customersParam) ? customersParam : customers;
        const quotesSource = Array.isArray(quotesParam) ? quotesParam : quotes;
        const custFromQuotesSource = Array.isArray(customersFromQuotesParam) ? customersFromQuotesParam : customersFromQuotes;

        // Customer visits in this month
        const customerVisits = (custSource || []).reduce((acc, c) => {
          if (!c.visitHistory || !Array.isArray(c.visitHistory)) return acc;
          const count = c.visitHistory.filter(v => {
            const d = v.visitDate ? new Date(v.visitDate) : null;
            return d && d >= monthStart && d < monthEnd;
          }).length;
          return acc + count;
        }, 0);

        // New contacts (customers created in this month)
        const contactList = customers.filter(c => {
          const d = c.createdAt ? new Date(c.createdAt) : null;
          return d && d >= monthStart && d < monthEnd;
        }).length;

        // Quotes created in this month and considered waiting
        const waitingForQuote = quotes.filter(q => {
          const d = q.createdAt ? new Date(q.createdAt) : null;
          if (!d || d < monthStart || d >= monthEnd) return false;
          const status = (q.status || '').toLowerCase();
          return ['pending', 'sent', 'draft', 'open'].includes(status) || !status;
        }).length;

        // Social media enquiries - try to derive from customer source or quote contact
        const socialFromCustomers = (custSource || []).filter(c => {
          const d = c.createdAt ? new Date(c.createdAt) : null;
          return d && d >= monthStart && d < monthEnd && (c.source === 'social' || c.source === 'facebook' || c.source === 'instagram');
        }).length;
        const socialFromQuotes = (custFromQuotesSource || []).filter(c => {
          const d = c.createdAt ? new Date(c.createdAt) : null;
          return d && d >= monthStart && d < monthEnd && (c.source === 'social' || c.source === 'facebook' || c.source === 'instagram');
        }).length;

        const socialMediaEnquiries = socialFromCustomers + socialFromQuotes;

        // Total sales from quotes in this month
        const totalSales = (quotesSource || []).reduce((acc, q) => {
          const d = q.createdAt ? new Date(q.createdAt) : null;
          if (!d || d < monthStart || d >= monthEnd) return acc;
          const revenue = q.adminQuote?.total || q.quote?.total || q.proformaInvoice?.total || q.total || 0;
          return acc + Number(revenue || 0);
        }, 0);

        // Performa invoices count in this month (approx from quotes)
        const performaInvoices = (quotesSource || []).filter(q => {
          const hasPI = !!q.proformaInvoice;
          if (!hasPI) return false;
          const piDate = q.proformaInvoice?.createdAt ? new Date(q.proformaInvoice.createdAt) : (q.proformaInvoice?.issuedAt ? new Date(q.proformaInvoice.issuedAt) : null);
          return piDate && piDate >= monthStart && piDate < monthEnd;
        }).length;

        return {
          month,
          year: currentYear,
          customerVisits,
          contactList,
          waitingForQuote,
          socialMediaEnquiries,
          totalSales,
          performaInvoices
        };
      });

      setMonthlyData(monthly);
    } catch (error) {
      console.error('Error loading monthly data:', error);
    }
  };

  // Enhanced customer analytics
  const customerAnalytics = useMemo(() => {
    // Merge customers with quote customers
    const allCustomers = [
      ...customers.map(c => ({ ...c, source: 'manual' })),
      ...customersFromQuotes.map(c => ({ ...c, source: 'quote' }))
    ];

    const totalCustomers = allCustomers.length;
    const activeCustomers = allCustomers.filter(c => c.isActive !== false).length;
    const quoteCustomers = allCustomers.filter(c => c.source === 'quote').length;
    const manualCustomers = allCustomers.filter(c => c.source === 'manual').length;
    
    // Calculate total revenue from both quotes and orders (same as Admin Dashboard)
    const totalRevenue = (() => {
      // Calculate quotes revenue (same logic as Admin Dashboard)
      const quotesRevenue = quotes.reduce((acc, q) => {
        const revenue = 
          q.adminQuote?.total || 
          q.quote?.total || 
          q.proformaInvoice?.total ||
          q.total ||
          0;
        return acc + Number(revenue);
      }, 0);

      // Calculate orders revenue (if orders data is available)
      const ordersRevenue = 0; // Sales dashboard doesn't have orders data, but keeping structure consistent
      
      return quotesRevenue + ordersRevenue;
    })();
    
    // Calculate recent user activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLogins = userActivity.filter(user => {
      return user.lastLogin >= thirtyDaysAgo;
    }).length;
    
    // Calculate follow-ups needed
    const followUpsNeeded = allCustomers.filter(customer => {
      if (customer.visitHistory && customer.visitHistory.length > 0) {
        return customer.visitHistory.some(visit => {
          return visit.nextFollowup && new Date(visit.nextFollowup) <= new Date();
        });
      }
      return false;
    }).length;

    // Calculate high priority customers
    const highPriorityCustomers = allCustomers.filter(customer => {
      return (customer.estimatedValue || customer.totalRevenue || 0) > 500000;
    }).length;
    
    return {
      totalCustomers,
      activeCustomers,
      quoteCustomers,
      manualCustomers,
      totalRevenue,
      recentLogins,
      followUpsNeeded,
      highPriorityCustomers,
      conversionRate: totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0
    };
  }, [customers, customersFromQuotes, quotes, financeData, userActivity]);

  const handleSignOut = () => {
    clearSalesUser();
    clearSalesToken();
    toast({ title: 'Signed out successfully' });
    navigate('/sales/login');
  };

  const quickActions = [
    {
      title: 'Add New Customer',
      description: 'Register a new customer with GST number',
      icon: UserPlus,
      link: '/sales/customers?action=add',
      color: 'bg-blue-500'
    },
    {
      title: 'Log Customer Visit',
      description: 'Record customer visit details',
      icon: Eye,
      link: '/sales/customers?action=visit',
      color: 'bg-green-500'
    },
    {
      title: 'Create Enquiry',
      description: 'Add new customer enquiry',
      icon: MessageSquare,
      link: '/sales/enquiries?action=create',
      color: 'bg-orange-500'
    },
    {
      title: 'Schedule Follow-up',
      description: 'Set up customer follow-up',
      icon: Calendar,
      link: '/sales/followups?action=schedule',
      color: 'bg-purple-500'
    }
  ];

  if (loading) {
    return (
      <SalesLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </SalesLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Sales Dashboard | PCB Xpress</title>
        <meta name="description" content="Sales dashboard for PCB Xpress" />
      </Helmet>
      
      <SalesLayout>
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {salesUser?.name}!</h1>
                <p className="text-gray-600">Here's what's happening with your sales today.</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Sales Representative</p>
                <p className="text-lg font-semibold text-orange-600">{salesUser?.email}</p>
              </div>
            </div>
          </div>

          {/* Enhanced Analytics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Customers</p>
                    <p className="text-3xl font-bold">{customerAnalytics.totalCustomers}</p>
                    <p className="text-blue-100 text-xs mt-1">
                      {customerAnalytics.activeCustomers} active ({customerAnalytics.conversionRate}%)
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold">₹{customerAnalytics.totalRevenue.toLocaleString('en-IN')}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Recent Logins</p>
                    <p className="text-3xl font-bold">{customerAnalytics.recentLogins}</p>
                    <p className="text-purple-100 text-xs mt-1">
                      Last 30 days
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Follow-ups Needed</p>
                    <p className="text-3xl font-bold">{customerAnalytics.followUpsNeeded}</p>
                    <p className="text-orange-100 text-xs mt-1">
                      Overdue
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link key={index} to={action.link}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className={`${action.color} p-3 rounded-full`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{action.title}</h3>
                            <p className="text-sm text-gray-600">{action.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Monthly Activity Circle Chart */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Yearly Activity Overview</h2>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="relative w-[900px] h-[900px]">
                    <svg viewBox="0 0 1200 1200" className="w-full h-full">
                      {/* Background circle */}
                      <circle
                        cx="600"
                        cy="600"
                        r="520"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      
                      {/* Monthly slices */}
                      {monthlyData.map((data, index) => {
                        const angle = (index * 30) - 90; // 30 degrees per month, starting from top
                        const nextAngle = ((index + 1) * 30) - 90;
                        const startAngleRad = (angle * Math.PI) / 180;
                        const endAngleRad = (nextAngle * Math.PI) / 180;
                        
                        // Check if this slice is hovered or selected
                        const isActive = hoveredSlice === index || selectedSlice === index;
                        const popOutDistance = isActive ? 50 : 0;
                        
                        const x1 = 600 + (520 + popOutDistance) * Math.cos(startAngleRad);
                        const y1 = 600 + (520 + popOutDistance) * Math.sin(startAngleRad);
                        const x2 = 600 + (520 + popOutDistance) * Math.cos(endAngleRad);
                        const y2 = 600 + (520 + popOutDistance) * Math.sin(endAngleRad);
                        
                        const midAngle = (angle + 15) * Math.PI / 180;
                        const labelX = 600 + (320 + popOutDistance) * Math.cos(midAngle);
                        const labelY = 600 + (320 + popOutDistance) * Math.sin(midAngle);
                        
                        // Fixed base position for text to prevent glitching
                        const baseLabelX = 600 + 320 * Math.cos(midAngle);
                        const baseLabelY = 600 + 320 * Math.sin(midAngle);
                        
                        return (
                          <g key={index}>
                            <path
                              d={`M 600 600 L ${x1} ${y1} A ${520 + popOutDistance} ${520 + popOutDistance} 0 0 1 ${x2} ${y2} Z`}
                              fill={isActive ? "#f3f4f6" : "#e5e7eb"}
                              fillOpacity={1}
                              stroke="white"
                              strokeWidth={isActive ? "4" : "2"}
                              className="transition-all duration-300 cursor-pointer"
                              style={{
                                filter: isActive ? 'brightness(0.95)' : 'brightness(1)',
                                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                transformOrigin: '600px 600px'
                              }}
                              onMouseEnter={() => setHoveredSlice(index)}
                              onMouseLeave={() => setHoveredSlice(null)}
                              onClick={() => setSelectedSlice(selectedSlice === index ? null : index)}
                            />
                            {/* Month name */}
                            <text
                              x={baseLabelX}
                              y={baseLabelY - 50}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className={`${isActive ? 'text-3xl' : 'text-2xl'} font-bold fill-gray-900 transition-all duration-300`}
                              style={{ pointerEvents: 'none' }}
                            >
                              {data.month.substring(0, 3)}
                            </text>
                            {/* Customer Visits */}
                            <text
                              x={baseLabelX}
                              y={baseLabelY - 20}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className={`${isActive ? 'text-xl' : 'text-lg'} fill-gray-900 transition-all duration-300`}
                              style={{ pointerEvents: 'none' }}
                            >
                              Visits: {data.customerVisits}
                            </text>
                            {/* Contact List */}
                            <text
                              x={baseLabelX}
                              y={baseLabelY}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className={`${isActive ? 'text-xl' : 'text-lg'} fill-gray-900 transition-all duration-300`}
                              style={{ pointerEvents: 'none' }}
                            >
                              Contacts: {data.contactList}
                            </text>
                            {/* Waiting for Quote */}
                            <text
                              x={baseLabelX}
                              y={baseLabelY + 20}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className={`${isActive ? 'text-xl' : 'text-lg'} fill-gray-900 transition-all duration-300`}
                              style={{ pointerEvents: 'none' }}
                            >
                              Quotes: {data.waitingForQuote}
                            </text>
                            {/* Social Media Enquiries */}
                            <text
                              x={baseLabelX}
                              y={baseLabelY + 40}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className={`${isActive ? 'text-xl' : 'text-lg'} fill-gray-900 transition-all duration-300`}
                              style={{ pointerEvents: 'none' }}
                            >
                              Social: {data.socialMediaEnquiries}
                            </text>
                            {/* Total Sales */}
                            <text
                              x={baseLabelX}
                              y={baseLabelY + 60}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className={`${isActive ? 'text-xl' : 'text-lg'} fill-gray-900 transition-all duration-300`}
                              style={{ pointerEvents: 'none' }}
                            >
                              Sales: ₹{(data.totalSales / 1000).toFixed(0)}K
                            </text>
                            {/* Performa Invoices */}
                            <text
                              x={baseLabelX}
                              y={baseLabelY + 80}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className={`${isActive ? 'text-xl' : 'text-lg'} fill-gray-900 transition-all duration-300`}
                              style={{ pointerEvents: 'none' }}
                            >
                              Invoices: {data.performaInvoices}
                            </text>
                          </g>
                        );
                      })}
                      
                      {/* Center circle */}
                      <circle
                        cx="600"
                        cy="600"
                        r="180"
                        fill="white"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                      />
                      <text
                        x="600"
                        y="570"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-3xl font-bold fill-gray-900"
                      >
                        {new Date().getFullYear()}
                      </text>
                      <text
                        x="600"
                        y="630"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xl fill-gray-600"
                      >
                        Total Activities
                      </text>
                    </svg>
                  </div>
                  
                                    
                  {/* Monthly Details Table */}
                  <div className="mt-6 w-full">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Monthly Breakdown</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Visits</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contacts</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quotes</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Social</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoices</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {monthlyData.map((data, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{data.month}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{data.customerVisits}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{data.contactList}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{data.waitingForQuote}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{data.socialMediaEnquiries}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">₹{(data.totalSales / 1000).toFixed(1)}K</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{data.performaInvoices}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SalesLayout>
    </>
  );
};

export default SalesDashboardPage;
