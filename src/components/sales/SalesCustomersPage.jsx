import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SalesLayout from '@/components/sales/SalesLayout';
import { getSalesToken } from '@/lib/storage';
import { api } from '@/lib/api';
import { 
  Users, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Phone, 
  Mail, 
  MapPin, 
  Building,
  Calendar,
  UserPlus,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Star,
  Filter,
  Download,
  MessageSquare,
  Flag
} from 'lucide-react';

// Payment Proof Status Component
const PaymentProofStatus = ({ status }) => {
  const statusConfig = {
    not_submitted: { label: 'Not Submitted', color: 'bg-gray-100 text-gray-800' },
    submitted: { label: 'Submitted', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' }
  };

  const config = statusConfig[status] || statusConfig.not_submitted;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const SalesCustomersPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all'); // 'all', 'website', 'phone', 'office_visit', 'email', 'referral', 'quote', 'signup', 'other'
  const [filterPriority, setFilterPriority] = useState('all'); // 'all', 'high', 'normal', 'low'
  const [sortBy, setSortBy] = useState('createdAt'); // 'createdAt', 'name', 'lastVisit', 'revenue'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [customers, setCustomers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [customersFromQuotes, setCustomersFromQuotes] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    gtNumber: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    industry: '',
    visitType: 'office',
    priority: 'normal',
    notes: ''
  });
  const [visitData, setVisitData] = useState({
    customerId: '',
    visitDate: '',
    visitType: 'office',
    purpose: '',
    outcome: '',
    nextFollowup: '',
    notes: ''
  });

  useEffect(() => {
    loadCustomers();
    loadQuotes();
    loadCustomersFromQuotes();
    loadUserActivity();
  }, []);

  const loadCustomersFromQuotes = async () => {
    try {
      const token = getSalesToken();
      if (!token) return;
      
      const response = await api.getCustomersFromQuotes(token);
      if (response.customers) {
        setCustomersFromQuotes(response.customers);
      }
    } catch (error) {
      console.error('Failed to load customers from quotes:', error);
    }
  };

  const handleSyncQuotes = async () => {
    try {
      const token = getSalesToken();
      if (!token) {
        toast({ title: 'Authentication error', description: 'Please log in again' });
        return;
      }

      toast({ title: '...', description: 'Please wait while we sync  to customers' });

      const response = await api.syncQuotesToCustomers(token);
      
      toast({ 
        title: 'Sync completed', 
        description: `Synced ${response.syncedCount} customers from quotes` 
      });
      
      // Reload customers to show the newly synced ones
      loadCustomers();
      loadCustomersFromQuotes();
    } catch (error) {
      console.error('Error Customer:', error);
      toast({ 
        title: 'Error syncing quotes', 
        description: error.message || 'Failed to sync data  to customers' 
      });
    }
  };

  const loadQuotes = async () => {
    try {
      const token = getSalesToken();
      if (!token) return;
      
      const response = await api.getSalesQuotes(token);
      if (response.quotes) {
        setQuotes(response.quotes);
      }
    } catch (error) {
      console.error('Failed to load quotes:', error);
    }
  };

  const loadUserActivity = async () => {
    try {
      const token = getSalesToken();
      if (!token) return;
      
      // TODO: Implement proper user activity tracking
      // For now, set empty array since getUserActivity API doesn't exist
      setUserActivity([]);
      
      // Alternative: Show current user's login activity
      // const currentUser = getSalesUser();
      // if (currentUser) {
      //   setUserActivity([{
      //     userId: currentUser.id,
      //     lastLogin: new Date(),
      //     loginCount: 1
      //   }]);
      // }
    } catch (error) {
      console.error('Failed to load user activity:', error);
      // Set empty array to prevent errors
      setUserActivity([]);
    }
  };

  // Fetch payment data for customers
  const fetchCustomerPayments = async (customers) => {
    const token = getSalesToken();
    if (!token) return customers;

    console.log('Fetching payments for', customers.length, 'customers');
    
    try {
      const customersWithPayments = await Promise.all(
        customers.map(async (customer) => {
          try {
            console.log('Fetching payment for customer:', customer.name, 'ID:', customer.id || customer._id);
            const paymentData = await api.getCustomerPayments(token, customer.id || customer._id);
            console.log('Payment data for', customer.name, ':', paymentData);
            return {
              ...customer,
              totalRevenue: paymentData.totalRevenue || 0,
              paymentCount: paymentData.paymentCount || 0,
              payments: paymentData.payments || []
            };
          } catch (error) {
            console.log('No payment data for customer:', customer.name, 'Error:', error.message);
            return {
              ...customer,
              totalRevenue: 0,
              paymentCount: 0,
              payments: []
            };
          }
        })
      );
      console.log('Final customers with payments:', customersWithPayments.map(c => ({ name: c.name, revenue: c.totalRevenue })));
      return customersWithPayments;
    } catch (error) {
      console.error('Error fetching customer payments:', error);
      return customers;
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const token = getSalesToken();
      if (!token) {
        toast({ title: 'Authentication error', description: 'Please log in again' });
        return;
      }
      
      // Try to load from API first
      try {
        const response = await api.getSalesCustomers(token);
        if (response.customers) {
          // Fetch payment data for each customer
          const customersWithPayments = await fetchCustomerPayments(response.customers);
          setCustomers(customersWithPayments);
          console.log('Loaded customers from API with payments:', customersWithPayments.length);
        }
      } catch (apiError) {
        console.log('API not available:', apiError.message);
        toast({ 
          title: 'Connection Error', 
          description: 'Unable to connect to database. Please check your connection.' 
        });
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast({ 
        title: 'Error loading customers', 
        description: error.message || 'Failed to load customer data' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSourceChange = async (customerId, newSource) => {
    try {
      console.log('=== SOURCE CHANGE DEBUG ===');
      console.log('Customer ID:', customerId);
      console.log('New Source:', newSource);
      console.log('Customer ID type:', typeof customerId);
      
      const token = getSalesToken();
      if (!token) {
        toast({ title: 'Authentication error', description: 'Please log in again' });
        return;
      }
      
      // Find the customer to get more info
      const targetCustomer = customers.find(c => (c.id === customerId || c._id === customerId));
      console.log('Found customer:', targetCustomer?.name, 'current source:', targetCustomer?.source);
      
      // Update local state immediately for instant visual feedback
      setCustomers(prev => prev.map(customer => {
        // Handle both quote-based IDs and regular IDs
        const isTargetCustomer = customer.id === customerId || customer._id === customerId;
        if (isTargetCustomer) {
          console.log('Updating local customer:', customer.name, 'from', customer.source, 'to', newSource);
          return { ...customer, source: newSource };
        }
        return customer;
      }));
      
      console.log('Calling API with:', customerId, newSource);
      const result = await api.updateCustomerSource(token, customerId, newSource);
      console.log('API Response:', result);
       
      toast({ 
        title: 'Source Updated', 
        description: 'Customer source updated successfully' 
      });
      
      // Don't refresh immediately - let the backend update settle
      console.log('=== END SOURCE CHANGE DEBUG ===');
    } catch (error) {
      console.error('=== SOURCE CHANGE ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('=== END SOURCE CHANGE ERROR ===');
      
      toast({ 
        title: 'Update Failed', 
        description: error.message || 'Failed to update customer source' 
      });
      
      // Revert on error
      loadCustomers();
    }
  };

  const handleAddCustomer = async () => {
    try {
      // Validate required fields
      if (!formData.name || !formData.email || !formData.phone) {
        toast({ title: 'Missing required fields', description: 'Please fill in all required fields' });
        return;
      }

      const token = getSalesToken();
      if (!token) {
        toast({ title: 'Authentication error', description: 'Please log in again' });
        return;
      }

      // Normalize data for comparison
      const normalizedEmail = formData.email.toLowerCase().trim();
      const normalizedGstNumber = formData.gtNumber ? formData.gtNumber.toUpperCase().trim() : '';

      console.log('Creating customer with data:', {
        name: formData.name,
        email: normalizedEmail,
        gtNumber: normalizedGstNumber,
        phone: formData.phone
      });

      // Check database directly for duplicates (more reliable than frontend state)
      try {
        const allDbCustomers = await api.getSalesCustomers(token, { limit: 1000 });
        const dbCustomers = allDbCustomers.customers || [];
        
        console.log('Database customers count:', dbCustomers.length);
        
        // Check for exact matches in database (only if fields are provided)
        let emailMatch = null;
        let gstMatch = null;
        
        if (normalizedEmail) {
          emailMatch = dbCustomers.find(c => 
            c.email && c.email.toLowerCase().trim() === normalizedEmail
          );
        }
        
        if (normalizedGstNumber) {
          gstMatch = dbCustomers.find(c => 
            c.gtInfo?.gtNumber && c.gtInfo.gtNumber.toUpperCase().trim() === normalizedGstNumber
          );
        }
        
        if (emailMatch) {
          toast({ 
            title: 'Duplicate Customer', 
            description: `Customer with email "${normalizedEmail}" already exists: ${emailMatch.name}`,
            variant: 'destructive'
          });
          return;
        }
        
        if (gstMatch) {
          toast({ 
            title: 'Duplicate Customer', 
            description: `Customer with GST "${normalizedGstNumber}" already exists: ${gstMatch.name}`,
            variant: 'destructive'
          });
          return;
        }
        
      } catch (dbCheckError) {
        console.error('Database check failed, proceeding with creation:', dbCheckError);
        // Continue with creation even if check fails
      }

      // Prepare complete customer data
      const customerData = {
        name: formData.name.trim(),
        email: normalizedEmail,
        phone: formData.phone.trim(),
        company: formData.company?.trim() || '',
        address: formData.address?.trim() || '',
        city: formData.city?.trim() || '',
        state: formData.state?.trim() || '',
        pincode: formData.pincode?.trim() || '',
        industry: formData.industry?.trim() || '',
        visitType: formData.visitType || 'office',
        priority: formData.priority || 'normal',
        gtInfo: normalizedGstNumber ? {
          gtNumber: normalizedGstNumber,
          issuedDate: new Date().toISOString(),
          issuedBy: 'sales-user' // This will be set by backend
        } : undefined,
        notes: formData.notes?.trim() || ''
      };

      console.log('Sending customer data to API:', customerData);

      // Create customer via API
      const result = await api.createSalesCustomer(token, customerData);
      console.log('Customer creation result:', result);

      toast({ title: 'Success', description: 'Customer added successfully' });
      setShowAddDialog(false);
      
      // Reset form
      setFormData({
        name: '',
        company: '',
        gtNumber: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        industry: '',
        visitType: 'office',
        priority: 'normal',
        notes: ''
      });
      
      // Reload customers to get fresh data
      await loadCustomers();
      
    } catch (error) {
      console.error('Error adding customer:', error);
      
      // Handle specific error cases
      if (error.message && error.message.includes('already exists')) {
        toast({ 
          title: 'Duplicate Customer', 
          description: `A customer with this email or GST number already exists in the database. Please check the existing customers or use different details.`,
          variant: 'destructive'
        });
      } else if (error.message && error.message.includes('400')) {
        toast({ 
          title: 'Validation Error', 
          description: 'Please check all required fields and try again.',
          variant: 'destructive'
        });
      } else if (error.message && error.message.includes('401')) {
        toast({ 
          title: 'Authentication Error', 
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive'
        });
      } else {
        toast({ 
          title: 'Error adding customer', 
          description: error.message || 'Failed to add customer. Please try again.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleLogVisit = async () => {
    try {
      const token = getSalesToken();
      if (!token) {
        toast({ title: 'Authentication error', description: 'Please log in again' });
        return;
      }

      console.log('Sending visit data to backend:', visitData);
      await api.logCustomerVisit(token, visitData.customerId, visitData);
      
      toast({ title: 'Success', description: 'Visit logged successfully' });
      setShowVisitDialog(false);
      setVisitData({
        customerId: '',
        visitDate: '',
        visitType: 'office',
        purpose: '',
        outcome: '',
        nextFollowup: '',
        notes: ''
      });
      loadCustomers();
    } catch (error) {
      console.error('Error logging visit:', error);
      toast({ 
        title: 'Error logging visit', 
        description: error.message || 'Failed to log visit' 
      });
    }
  };

  const handlePriorityChange = async (customerId, newPriority) => {
    try {
      console.log('handlePriorityChange called with customerId:', customerId, 'newPriority:', newPriority);
      
      if (!customerId) {
        console.error('Customer ID is undefined');
        toast({ 
          title: 'Error', 
          description: 'Customer ID is missing. Cannot update priority.' 
        });
        return;
      }

      const token = getSalesToken();
      if (!token) {
        toast({ title: 'Authentication error', description: 'Please log in again' });
        return;
      }

      // Update customer priority via API
      await api.updateCustomerPriority(token, customerId, newPriority);
      
      // Force re-render by creating a new array reference
      setCustomers(prev => {
        console.log('Before update - customers count:', prev.length);
        const updated = prev.map(customer => {
          if (customer.id === customerId || customer._id === customerId) {
            console.log('Updating customer:', customer.name, 'from', customer.priority, 'to', newPriority);
            return { ...customer, priority: newPriority };
          }
          return customer;
        });
        console.log('After update - customers count:', updated.length);
        return [...updated]; // Force new array reference
      });

      // Also reload customers from server to ensure consistency
      setTimeout(() => {
        loadCustomers();
      }, 500);
      
      toast({ 
        title: 'Priority Updated', 
        description: `Customer priority changed to ${newPriority}` 
      });
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({ 
        title: 'Error updating priority', 
        description: error.message || 'Failed to update priority' 
      });
    }
  };

  // Extract unique customers from quotes
  const getCustomersFromQuotesData = useMemo(() => {
    return customersFromQuotes;
  }, [customersFromQuotes]);

  // Helper function to get source display info
  const getSourceDisplay = (source) => {
    const sourceMap = {
      'quote': { label: 'Quote', color: 'bg-purple-100 text-purple-800' },
      'website': { label: 'Website', color: 'bg-blue-100 text-blue-800' },
      'signup': { label: 'Signup', color: 'bg-green-100 text-green-800' },
      'phone': { label: 'Phone', color: 'bg-orange-100 text-orange-800' },
      'office_visit': { label: 'Office Visit', color: 'bg-indigo-100 text-indigo-800' },
      'email': { label: 'Email', color: 'bg-yellow-100 text-yellow-800' },
      'referral': { label: 'Referral', color: 'bg-pink-100 text-pink-800' },
      'other': { label: 'Other', color: 'bg-gray-100 text-gray-800' }
    };
    return sourceMap[source] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  };

  // Enhanced customer status calculation
  const getCustomerStatus = (customer) => {
    // For quote customers, check if they have active quotes
    if (customer.source === 'quote') {
      return customer.status === 'pending' ? 'lead' : 'active';
    }
    
    // For customers who signed up directly
    if (customer.source === 'signup') {
      if (customer.isActive === false) return 'inactive';
      // New signup customers start as prospects until they have interactions
      if (!customer.visitHistory || customer.visitHistory.length === 0) return 'prospect';
      return 'active'; // Signup customers are considered active once they have any interaction
    }
    
    // For customers from various sources (website, phone, office_visit, email, referral, other)
    if (['website', 'phone', 'office_visit', 'email', 'referral', 'other'].includes(customer.source)) {
      if (customer.isActive === false) return 'inactive';
      if (!customer.visitHistory || customer.visitHistory.length === 0) return 'prospect';
      if (customer.visitHistory.length === 1) return 'lead';
      if (customer.totalRevenue > 100000 || customer.estimatedValue > 100000) return 'qualified';
      return 'active';
    }
    
    // Default fallback for any other sources
    if (customer.isActive === false) return 'inactive';
    if (!customer.visitHistory || customer.visitHistory.length === 0) return 'prospect';
    if (customer.visitHistory.length === 1) return 'lead';
    if (customer.totalRevenue > 100000 || customer.estimatedValue > 100000) return 'qualified';
    return 'active';
  };

  const getCustomerPriority = (customer) => {
    // Use actual revenue first, then estimated value as fallback
    const revenue = customer.totalRevenue || customer.estimatedValue || 0;
    if (revenue > 500000) return 'high';
    if (revenue > 100000) return 'normal'; // Changed from 'medium' to 'normal'
    return 'low';
  };

  // Merge customers with quote customers and enhance data
  const allCustomers = useMemo(() => {
    const merged = new Map();
    
    // Add existing customers (use email as key for merging)
    customers.forEach(customer => {
      const enhancedCustomer = {
        ...customer,
        source: customer.source || 'website', // Preserve existing source, default to 'website' for migrated customers
        status: getCustomerStatus(customer),
        priority: customer.priority || getCustomerPriority(customer), // Use customer.priority first, fallback to calculated
        totalOrders: customer.totalOrders || 0,
        totalRevenue: customer.totalRevenue || 0, // Use actual payment revenue, not estimated
        lastVisit: customer.lastVisit || (customer.visitHistory && customer.visitHistory.length > 0 
          ? new Date(Math.max(...customer.visitHistory.map(v => new Date(v.visitDate)))) 
          : null),
        nextFollowup: customer.visitHistory && customer.visitHistory.length > 0
          ? customer.visitHistory
              .filter(v => v.nextFollowup)
              .sort((a, b) => new Date(a.nextFollowup) - new Date(b.nextFollowup))[0]?.nextFollowup
          : null,
        visitCount: customer.visitHistory ? customer.visitHistory.length : 0
      };
      merged.set(customer.email, enhancedCustomer); // Use email as key
    });
    
    // Add quote customers (merge by email, don't overwrite existing ones)
    getCustomersFromQuotesData.forEach(customer => {
      if (!merged.has(customer.email)) {
        const enhancedQuoteCustomer = {
          ...customer,
          source: 'quote',
          status: getCustomerStatus(customer),
          priority: getCustomerPriority(customer),
          totalOrders: 0,
          totalRevenue: customer.totalRevenue || 0, // Use actual revenue if available
          lastVisit: null,
          nextFollowup: null,
          visitCount: 0,
          isActive: true, // Quote customers are considered active
          paymentStatus: customer.paymentProof?.status || 'not_submitted', // Add payment status
          estimatedValue: customer.estimatedValue || 0 // Keep estimated value for display
        };
        merged.set(customer.email, enhancedQuoteCustomer); // Use email as key
      } else {
        // Update existing customer with quote payment info if they have quotes
        const existingCustomer = merged.get(customer.email);
        if (customer.paymentProof?.status && !existingCustomer.paymentStatus) {
          existingCustomer.paymentStatus = customer.paymentProof.status;
        }
        if (customer.estimatedValue && !existingCustomer.estimatedValue) {
          existingCustomer.estimatedValue = customer.estimatedValue;
        }
      }
    });
    
    const result = Array.from(merged.values());
    console.log('All customers merged:', result.length, { 
      manualCustomers: customers.length, 
      quoteCustomers: getCustomersFromQuotesData.length,
      total: result.length 
    });
    
    return result;
  }, [customers, getCustomersFromQuotesData]);

  // Enhanced customer analytics
  const customerAnalytics = useMemo(() => {
    const totalCustomers = allCustomers.length;
    const activeCustomers = allCustomers.filter(c => c.isActive !== false).length;
    const quoteCustomers = allCustomers.filter(c => c.source === 'quote').length;
    const websiteCustomers = allCustomers.filter(c => c.source === 'website').length;
    const signupCustomers = allCustomers.filter(c => c.source === 'signup').length;
    
    // Calculate total revenue
    const totalRevenue = allCustomers.reduce((sum, customer) => {
      return sum + (customer.estimatedValue || customer.totalRevenue || 0);
    }, 0);
    
    // Calculate recent activity (placeholder since userActivity API doesn't exist)
    // Using active customers as a proxy for recent activity
    const recentLogins = activeCustomers; // Show active customers instead of login data
    
    // Calculate follow-ups needed
    const followUpsNeeded = allCustomers.filter(customer => {
      if (customer.visitHistory && customer.visitHistory.length > 0) {
        return customer.visitHistory.some(visit => {
          return visit.nextFollowup && new Date(visit.nextFollowup) <= new Date();
        });
      }
      return false;
    }).length;
    
    return {
      totalCustomers,
      activeCustomers,
      quoteCustomers,
      websiteCustomers,
      signupCustomers,
      totalRevenue,
      recentLogins,
      followUpsNeeded,
      conversionRate: totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0
    };
  }, [allCustomers, userActivity]);

  const filteredCustomers = useMemo(() => {
    console.log('Computing filteredCustomers, allCustomers:', allCustomers.length);
    let filtered = allCustomers.filter(customer => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.company && customer.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.gtNumber && customer.gtNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSource = 
        filterSource === 'all' || 
        (filterSource === 'quote' && customer.source === 'quote') ||
        (filterSource === 'website' && customer.source === 'website') ||
        (filterSource === 'signup' && customer.source === 'signup') ||
        (filterSource === 'phone' && customer.source === 'phone') ||
        (filterSource === 'office_visit' && customer.source === 'office_visit') ||
        (filterSource === 'email' && customer.source === 'email') ||
        (filterSource === 'referral' && customer.source === 'referral') ||
        (filterSource === 'other' && customer.source === 'other');
      
      const matchesPriority = 
        filterPriority === 'all' || customer.priority === filterPriority;
      
      return matchesSearch && matchesSource && matchesPriority;
    });

    console.log('Filtered customers:', filtered.map(c => ({ name: c.name, priority: c.priority })));

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'lastVisit':
          aValue = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
          bValue = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
          break;
        case 'revenue':
          aValue = a.totalRevenue || 0;
          bValue = b.totalRevenue || 0;
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  }, [allCustomers, searchTerm, filterSource, filterPriority, sortBy, sortOrder]);

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
        <title>Customers | PCB Xpress Sales</title>
        <meta name="description" content="Manage customers for PCB Xpress" />
      </Helmet>
      
      <SalesLayout>
        <div className="space-y-6">
          {/* Analytics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Customers</p>
                    <p className="text-3xl font-bold">{customerAnalytics.totalCustomers}</p>
                    <p className="text-blue-100 text-xs mt-1">
                      {customerAnalytics.activeCustomers} active
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Active Customers</p>
                    <p className="text-3xl font-bold">{customerAnalytics.recentLogins}</p>
                    <p className="text-purple-100 text-xs mt-1">
                      Currently active
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

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
              <p className="text-gray-600">Manage your customer relationships</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleSyncQuotes}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <Users className="h-4 w-4 mr-2" />
                Sync
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gtNumber">GST Number</Label>
                    <Input
                      id="gtNumber"
                      value={formData.gtNumber}
                      onChange={(e) => setFormData({ ...formData, gtNumber: e.target.value })}
                      placeholder="GST Number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={formData.industry} onValueChange={(value) => setFormData({ ...formData, industry: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Electronics">Electronics</SelectItem>
                        <SelectItem value="Automotive">Automotive</SelectItem>
                        <SelectItem value="Telecom">Telecom</SelectItem>
                        <SelectItem value="Medical">Medical</SelectItem>
                        <SelectItem value="Industrial">Industrial</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="visitType">Visit Type</Label>
                    <Select value={formData.visitType} onValueChange={(value) => setFormData({ ...formData, visitType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office">Office Visit</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="site">Site Visit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">🔴 High</SelectItem>
                        <SelectItem value="normal">🟡 Normal</SelectItem>
                        <SelectItem value="low">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="Pincode"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about the customer"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCustomer} className="bg-orange-600 hover:bg-orange-700">
                    Add Customer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Select value={filterSource} onValueChange={setFilterSource}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="website">🌐 Website</SelectItem>
                      <SelectItem value="phone">📞 Phone</SelectItem>
                      <SelectItem value="office_visit">🏢 Office Visit</SelectItem>
                      <SelectItem value="email">✉️ Email</SelectItem>
                      <SelectItem value="referral">👥 Referral</SelectItem>
                      <SelectItem value="quote">📄 From Quotes</SelectItem>
                      <SelectItem value="signup">🔗 Direct Signup</SelectItem>
                      <SelectItem value="other">📋 Other</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Created Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="lastVisit">Last Visit</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer List */}
          <Card>
            <CardHeader>
              <CardTitle>Customer List ({filteredCustomers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No customers found</p>
                  <p className="text-sm text-gray-400">Add your first customer or adjust the filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold">Customer</th>
                        <th className="text-left py-3 px-4 font-semibold">Contact</th>
                        <th className="text-left py-3 px-4 font-semibold">Priority</th>
                        <th className="text-left py-3 px-4 font-semibold">Activity</th>
                        <th className="text-left py-3 px-4 font-semibold">Next Follow-up</th>
                        <th className="text-left py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => {
                        console.log('Rendering customer:', customer.name, 'ID:', customer.id, '_id:', customer._id, 'email:', customer.email);
                        return (
                        <tr key={customer.email} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-orange-600 font-semibold text-sm">
                                  {customer.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{customer.name}</p>
                                {customer.company && (
                                  <p className="text-sm text-gray-500">{customer.company}</p>
                                )}
                                {customer.industry && (
                                  <p className="text-xs text-gray-400">{customer.industry}</p>
                                )}
                                <div className="flex items-center space-x-2 mt-1">
                                  {(() => {
                                    const sourceDisplay = getSourceDisplay(customer.source);
                                    return (
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${sourceDisplay.color}`}>
                                        {sourceDisplay.label}
                                      </span>
                                    );
                                  })()}
                                  {customer.visitCount > 0 && (
                                    <span className="text-xs text-gray-500">
                                      {customer.visitCount} visits
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {customer.email && (
                                <div className="flex items-center text-sm">
                                  <Mail className="h-3 w-3 mr-1 text-gray-400" />
                                  {customer.email}
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center text-sm">
                                  <Phone className="h-3 w-3 mr-1 text-gray-400" />
                                  {customer.phone}
                                </div>
                              )}
                              {customer.city && customer.state && (
                                <div className="flex items-center text-sm text-gray-500">
                                  <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                                  {customer.city}, {customer.state}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              customer.priority === 'high' 
                                ? 'bg-red-100 text-red-800' 
                                : customer.priority === 'normal'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {customer.priority === 'high' ? '🔴 High' : 
                               customer.priority === 'normal' ? '🟡 Normal' : '🟢 Low'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {customer.lastVisit && (
                                <div className="text-xs text-gray-600">
                                  Last: {new Date(customer.lastVisit).toLocaleDateString()}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                {customer.visitCount} total visits
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {customer.nextFollowup ? (
                              <div className="text-xs text-gray-600">
                                {(() => {
                                  const dateStr = customer.nextFollowup;
                                  if (dateStr.includes('T')) {
                                    // Extract date part from ISO format: 2026-01-08T00:00:00.000Z -> 2026-01-08
                                    const datePart = dateStr.split('T')[0];
                                    const [year, month, day] = datePart.split('-');
                                    return `${day}/${month}/${year}`;
                                  }
                                  return dateStr;
                                })()}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Not scheduled</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  console.log('Opening visit dialog for customer:', customer.name, 'existing nextFollowup:', customer.nextFollowup);
                                  setSelectedCustomer(customer);
                                  // Reset visit data with completely fresh state
                                  const freshVisitData = {
                                    customerId: customer.id || customer._id,
                                    visitDate: new Date().toISOString().split('T')[0], // Today's date
                                    visitType: 'office',
                                    purpose: '',
                                    outcome: '',
                                    nextFollowup: '', // Explicitly empty
                                    notes: ''
                                  };
                                  console.log('Setting fresh visit data:', freshVisitData);
                                  setVisitData(freshVisitData);
                                  setShowVisitDialog(true);
                                }}
                                title="Log Visit"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    title="Change Priority"
                                    className={`${
                                      customer.priority === 'high' ? 'border-red-300 text-red-600' : 
                                      customer.priority === 'normal' ? 'border-yellow-300 text-yellow-600' : 
                                      'border-green-300 text-green-600'
                                    }`}
                                    onClick={() => console.log('Button clicked - customer:', customer.name, 'priority:', customer.priority)}
                                  >
                                    <Flag className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handlePriorityChange(customer.id || customer._id, 'high')}>
                                    🔴 High Priority
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePriorityChange(customer.id || customer._id, 'normal')}>
                                    🟡 Normal Priority
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePriorityChange(customer.id || customer._id, 'low')}>
                                    🟢 Low Priority
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel>Change Source</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleSourceChange(customer.id || customer._id, 'website')}>
                                    🌐 Website
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSourceChange(customer.id || customer._id, 'phone')}>
                                    📞 Phone
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSourceChange(customer.id || customer._id, 'office_visit')}>
                                    🏢 Office Visit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSourceChange(customer.id || customer._id, 'email')}>
                                    ✉️ Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSourceChange(customer.id || customer._id, 'referral')}>
                                    👥 Referral
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSourceChange(customer.id || customer._id, 'other')}>
                                    📋 Other
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  toast({
                                    title: 'Customer Details',
                                    description: `Viewing details for ${customer.name}`
                                  });
                                }}
                                title="View Details"
                              >
                                <FileText className="h-3 w-3" />
                              </Button>
                              {customer.nextFollowup && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    toast({
                                      title: 'Follow-up Reminder',
                                      description: `Follow-up scheduled for ${new Date(customer.nextFollowup).toLocaleDateString()}`
                                    });
                                  }}
                                  title="Follow-up"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visit Dialog */}
          <Dialog open={showVisitDialog} onOpenChange={setShowVisitDialog}>
            <DialogContent key={showVisitDialog ? 'visit-dialog-open' : 'visit-dialog-closed'}>
              <DialogHeader>
                <DialogTitle>Log Customer Visit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="visitDate">Visit Date *</Label>
                  <Input
                    id="visitDate"
                    type="date"
                    value={visitData.visitDate}
                    onChange={(e) => setVisitData({ ...visitData, visitDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="visitType">Visit Type</Label>
                  <Select value={visitData.visitType} onValueChange={(value) => setVisitData({ ...visitData, visitType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Office Visit</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="site">Site Visit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purpose">Purpose</Label>
                  <Textarea
                    id="purpose"
                    value={visitData.purpose}
                    onChange={(e) => setVisitData({ ...visitData, purpose: e.target.value })}
                    placeholder="Purpose of visit"
                  />
                </div>
                <div>
                  <Label htmlFor="outcome">Outcome</Label>
                  <Textarea
                    id="outcome"
                    value={visitData.outcome}
                    onChange={(e) => setVisitData({ ...visitData, outcome: e.target.value })}
                    placeholder="Visit outcome"
                  />
                </div>
                <div>
                  <Label htmlFor="nextFollowup">Next Follow-up</Label>
                  <Input
                    id="nextFollowup"
                    type="date"
                    value={visitData.nextFollowup}
                    onChange={(e) => setVisitData({ ...visitData, nextFollowup: e.target.value })}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Current value: {visitData.nextFollowup}
                  </div>
                </div>
                <div>
                  <Label htmlFor="visitNotes">Notes</Label>
                  <Textarea
                    id="visitNotes"
                    value={visitData.notes}
                    onChange={(e) => setVisitData({ ...visitData, notes: e.target.value })}
                    placeholder="Additional notes"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setShowVisitDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLogVisit} className="bg-orange-600 hover:bg-orange-700">
                  Log Visit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SalesLayout>
    </>
  );
};

export default SalesCustomersPage;
