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
import SalesLayout from '@/components/sales/SalesLayout';
import { useSalesData } from '@/components/sales/SalesDataContext';
import { getSalesToken } from '@/lib/storage';
import { api } from '@/lib/api';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  User,
  Building,
  Tag,
  Phone,
  Mail,
  MapPin,
  FileText,
  Filter
} from 'lucide-react';

const SalesEnquiriesPage = () => {
  const { toast } = useToast();
  const salesData = useSalesData();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [enquiries, setEnquiries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
    category: 'general',
    source: 'website',
    deadline: '',
    notes: ''
  });
  const [showEnquiryDetails, setShowEnquiryDetails] = useState(false);

  // Quote form state
  const [quoteService, setQuoteService] = useState('pcb');
  const [quoteDelivery, setQuoteDelivery] = useState({ speed: 'standard' });
  const [quoteContact, setQuoteContact] = useState({ 
    name: '', 
    email: '', 
    company: '', 
    phone: '', 
    address: '', 
    gstin: '', 
    notes: '' 
  });
  
  // PCB specifications
  const [quoteSpecs, setQuoteSpecs] = useState({ 
    widthMm: 100, 
    heightMm: 100, 
    layers: 1, 
    material: 'FR4', 
    finish: 'HASL', 
    quantity: 5,
    baseCopperThickness: '18/18',
    mask: 'Both',
    maskColor: 'Green',
    legendColor: 'White',
    layerType: 'Single'
  });

  // 3D Printing specifications
  const [quoteSpecs3d, setQuoteSpecs3d] = useState({
    tech: 'fdm',
    material: 'PLA',
    dims: { xMm: 50, yMm: 50, zMm: 30 },
    resolution: 'standard',
    infillPercent: 20,
    finishing: 'raw',
    quantity: 1,
  });

  // File upload state
  const [quoteGerberFile, setQuoteGerberFile] = useState(null);
  const [quoteBomFile, setQuoteBomFile] = useState(null);
  const [quoteBomStats, setQuoteBomStats] = useState({ totalLines: 0, uniqueParts: 0 });

  // Quote editing state
  const [isEditingQuote, setIsEditingQuote] = useState(false);
  const [existingQuoteId, setExistingQuoteId] = useState(null);
  const [enquiriesWithSentQuotes, setEnquiriesWithSentQuotes] = useState(new Set());
  const [existingQuotes, setExistingQuotes] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [attachmentsToRemove, setAttachmentsToRemove] = useState([]);

  const enquirySources = [
    { value: 'phone', label: '📞 Phone Call', icon: Phone },
    { value: 'email', label: '✉️ Email', icon: Mail },
    { value: 'site_visit', label: '🏢 Site Visit', icon: MapPin },
    { value: 'website', label: '🌐 Website', icon: Building },
    { value: 'referral', label: '👥 Referral', icon: User },
    { value: 'other', label: '📋 Other', icon: FileText }
  ];

  const enquiryPurposes = [
    { value: 'pcb_manufacturing', label: 'PCB Manufacturing' },
    { value: 'wire_harness', label: 'Wire Harness' },
    { value: '3d_printing', label: '3D Printing' },
    { value: 'component_sourcing', label: 'Component Sourcing' },
    { value: 'molding', label: 'Molding' },
    { value: 'pcb_assembly', label: 'PCB Assembly' },
    { value: 'full_turnkey', label: 'Full Turnkey Solution' },
    { value: 'testing', label: 'Testing Services' }
  ];

  useEffect(() => {
    loadEnquiries();
    loadCustomers();
    loadExistingQuotes();

    // Refresh existing quotes when window gains focus (helps reflect quotes sent elsewhere)
    const onFocus = () => {
      loadExistingQuotes();
    };
    window.addEventListener('focus', onFocus);

    // Poll periodically for new sent quotes (every 30s)
    const interval = setInterval(() => {
      loadExistingQuotes();
    }, 30000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, []);

  // Sync shared context data into local state for cross-page propagation
  useEffect(() => {
    if (salesData.customers.length) setCustomers(salesData.customers);
  }, [salesData.customers]);
  useEffect(() => {
    if (salesData.enquiries.length) setEnquiries(salesData.enquiries);
  }, [salesData.enquiries]);

  // Function to load existing quotes and populate enquiriesWithSentQuotes
  const loadExistingQuotes = async () => {
    try {
      const token = getSalesToken();
      if (!token) return;
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/sales/quotes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const quotes = data.quotes || [];
        const enquiryIdsWithSentQuotes = new Set();

        quotes.forEach(quote => {
          // Only track quotes that have been sent (status === 'sent')
          if (quote.enquiryId && quote.status === 'sent') {
            // Normalize to string to avoid ObjectId vs string mismatches
            try {
              enquiryIdsWithSentQuotes.add(String(quote.enquiryId));
              // also add nested _id if present
              if (quote.enquiryId._id) enquiryIdsWithSentQuotes.add(String(quote.enquiryId._id));
            } catch (e) {
              enquiryIdsWithSentQuotes.add(quote.enquiryId);
            }
          }
        });

        setEnquiriesWithSentQuotes(enquiryIdsWithSentQuotes);
        setExistingQuotes(quotes);
      }
    } catch (error) {
      console.error('Error loading existing quotes:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const token = getSalesToken();
      if (!token) return;
      
      const response = await api.getSalesCustomers(token);
      if (response.customers) {
        setCustomers(response.customers);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId || c._id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setFormData(prev => ({
        ...prev,
        customerId: customer.id || customer._id,
        customerName: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company || ''
      }));
    }
  };

  const loadEnquiries = async () => {
    setLoading(true);
    try {
      const token = getSalesToken();
      if (!token) {
        toast({ title: 'Authentication error', description: 'Please log in again' });
        return;
      }

      const response = await api.getEnquiries(token);
      console.log('Enquiries loaded:', response);
      setEnquiries(response.enquiries || []);
    } catch (error) {
      console.error('Failed to load enquiries:', error);
      toast({ 
        title: 'Connection Error', 
        description: 'Unable to connect to database. Please check your connection.' 
      });
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEnquiry = async () => {
    try {
      // Validate required fields
      if (!formData.customerName || !formData.subject || !formData.message) {
        toast({ title: 'Missing required fields', description: 'Please fill in all required fields' });
        return;
      }

      if (!formData.customerId) {
        toast({ title: 'Missing customer', description: 'Please select a customer' });
        return;
      }

      const token = getSalesToken();
      if (!token) {
        toast({ title: 'Authentication error', description: 'Please log in again' });
        return;
      }

      const enquiryData = {
        customerId: formData.customerId,
        customerName: formData.customerName,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        subject: formData.subject,
        message: formData.message,
        category: formData.category || 'general',
        source: formData.source || 'website',
        // Convert date-only string (YYYY-MM-DD) to a Date set at noon to avoid timezone shift
        ...(formData.deadline ? { deadline: new Date(`${formData.deadline}T12:00:00`) } : {})
      };

      console.log('Creating enquiry:', enquiryData);
      
      const response = await api.createEnquiry(token, enquiryData);
      console.log('Enquiry created:', response);
      
      toast({ title: 'Success', description: 'Enquiry added successfully' });
      setShowAddDialog(false);
      resetForm();
      loadEnquiries();
      // Propagate to shared context so other pages see the new enquiry / follow-up
      salesData.refreshEnquiries();
      salesData.refreshFollowups();
    } catch (error) {
      console.error('Failed to create enquiry:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create enquiry' 
      });
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      customerName: '',
      email: '',
      phone: '',
      company: '',
      subject: '',
      message: '',
      category: 'general',
      source: 'website',
      deadline: '',
      notes: ''
    });
    setSelectedCustomer(null);
  };

  const handleCreateQuote = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setIsEditingQuote(false); // Reset to create mode
    setExistingQuoteId(null); // Clear existing quote ID
    
    // Pre-fill quote contact with enquiry customer data
    setQuoteContact({
      name: enquiry.customerName || '',
      email: enquiry.email || '',
      company: enquiry.company || '',
      phone: enquiry.phone || '',
      address: '',
      gstin: '',
      notes: `Quote created from enquiry: ${enquiry.subject}`
    });
    
    // Reset quote specs to default
    setQuoteSpecs({ 
      widthMm: 100, heightMm: 100, layers: 1, material: 'FR4', 
      finish: 'HASL', quantity: 5, baseCopperThickness: '18/18',
      mask: 'Both', maskColor: 'Green', legendColor: 'White', layerType: 'Single'
    });
    setQuoteDelivery({ speed: 'standard' });
    setQuoteGerberFile(null);
    setQuoteBomFile(null);
    setQuoteBomStats({ totalLines: 0, uniqueParts: 0 });
    
    setShowQuoteDialog(true);
  };

  const handleEditQuote = (enquiry, existingQuote) => {
    setSelectedEnquiry(enquiry);
    setIsEditingQuote(true); // Set to edit mode
    setExistingQuoteId(existingQuote._id || existingQuote.id); // Store existing quote ID
    
    // Pre-fill quote contact with existing quote data
    setQuoteContact({
      name: existingQuote.contact?.name || enquiry.customerName || '',
      email: existingQuote.contact?.email || enquiry.email || '',
      company: existingQuote.contact?.company || enquiry.company || '',
      phone: existingQuote.contact?.phone || enquiry.phone || '',
      address: existingQuote.contact?.address || enquiry.address || '',
      gstin: existingQuote.contact?.gstin || enquiry.gstin || '',
      notes: `Quote edited from enquiry: ${enquiry.subject}`
    });
    
    // Pre-fill quote specs with existing quote data
    if (existingQuote.specs) {
      setQuoteSpecs({
        widthMm: existingQuote.specs.widthMm || 100,
        heightMm: existingQuote.specs.heightMm || 100,
        layers: existingQuote.specs.layers || 1,
        material: existingQuote.specs.material || 'FR4',
        finish: existingQuote.specs.finish || 'HASL',
        quantity: existingQuote.specs.quantity || 5,
        baseCopperThickness: existingQuote.specs.baseCopperThickness || '18/18',
        mask: existingQuote.specs.mask || 'Both',
        maskColor: existingQuote.specs.maskColor || 'Green',
        legendColor: existingQuote.specs.legendColor || 'White',
        layerType: existingQuote.specs.layerType || 'Single'
      });
    } else {
      // Reset to default if no existing specs
      setQuoteSpecs({ 
        widthMm: 100, heightMm: 100, layers: 1, material: 'FR4', 
        finish: 'HASL', quantity: 5, baseCopperThickness: '18/18',
        mask: 'Both', maskColor: 'Green', legendColor: 'White', layerType: 'Single'
      });
    }
    
    // Pre-fill delivery with existing quote data
    setQuoteDelivery(existingQuote.delivery || { speed: 'standard' });
    
    // Reset files (user would need to re-upload if they want to change them)
    setQuoteGerberFile(null);
    setQuoteBomFile(null);
    setQuoteBomStats(existingQuote.bomStats || { totalLines: 0, uniqueParts: 0 });
    // Load existing attachments metadata so user can see/download them
    setExistingAttachments(existingQuote.attachments || []);
    
    setShowQuoteDialog(true);
  };

  // Function to check if enquiry has existing quote (for editing purposes)
  const checkExistingQuote = async (enquiryId) => {
    try {
      const token = getSalesToken();
      if (!token) return null;
      
      // Get all quotes and find one with matching enquiryId
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/sales/quotes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const quotes = data.quotes || [];
        const quotesForEnquiry = quotes.filter(q => String(q.enquiryId) === String(enquiryId));
        if (quotesForEnquiry.length === 0) return null;

        // Prefer quotes that were actually sent by sales
        const sentQuotes = quotesForEnquiry.filter(q => (q.status || '').toLowerCase() === 'sent');
        if (sentQuotes.length > 0) {
          // Choose the most recently sent
          sentQuotes.sort((a, b) => {
            const ta = a.sentAt ? new Date(a.sentAt).getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
            const tb = b.sentAt ? new Date(b.sentAt).getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
            return tb - ta;
          });
          return sentQuotes[0];
        }

        // Fallback: return the most recently modified/created quote for this enquiry
        quotesForEnquiry.sort((a, b) => {
          const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return tb - ta;
        });

        return quotesForEnquiry[0] || null;
      }
      return null;
    } catch (error) {
      console.error('Error checking existing quote:', error);
      return null;
    }
  };

  // Handle quote button click - check for existing quote first
  const handleQuoteButtonClick = async (enquiry) => {
    const existingQuote = await checkExistingQuote(enquiry._id);
    
    if (existingQuote) {
      // Edit existing quote
      handleEditQuote(enquiry, existingQuote);
    } else {
      // Create new quote
      handleCreateQuote(enquiry);
    }
  };

  const handleQuoteBomChange = (f) => {
    if (!f) return;
    const ok = /\.(csv|txt|xlsx)$/i.test(f.name);
    if (!ok) {
      toast({ title: 'Unsupported BOM', description: 'Upload a CSV (.csv), TXT (.txt), or Excel (.xlsx) file.' });
      setQuoteBomFile(null);
      setQuoteBomStats({ totalLines: 0, uniqueParts: 0 });
      return;
    }
    setQuoteBomFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const lines = text.split('\n').filter(l => l.trim());
        const parts = new Set();
        lines.forEach(line => {
          const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
          if (cols.length >= 2 && cols[0]) parts.add(cols[0]);
        });
        setQuoteBomStats({ totalLines: lines.length, uniqueParts: parts.size });
      } catch (e) {
        setQuoteBomStats({ totalLines: 0, uniqueParts: 0 });
      }
    };
    reader.readAsText(f);
  };

  const handleQuoteSubmit = async () => {
    try {
      const token = getSalesToken();
      if (!token) {
        toast({ title: 'Authentication error', description: 'Please log in again' });
        return;
      }

      // Validate required fields
      if (!quoteContact.email || !quoteContact.name) {
        toast({ title: 'Missing required fields', description: 'Please fill in customer name and email' });
        return;
      }

      // Validate files for PCB service (only for new quotes)
      if (quoteService === 'pcb' && !isEditingQuote && (!quoteGerberFile || !quoteBomFile)) {
        toast({ title: 'Missing files', description: 'Please upload both Gerber and BOM files for PCB quotes' });
        return;
      }

      const quoteData = {
        service: quoteService,
        delivery: quoteDelivery,
        contact: quoteContact,
        specs: quoteService === 'pcb' ? quoteSpecs : undefined,
        specs3d: quoteService === '3dprinting' ? quoteSpecs3d : undefined,
        enquiryId: selectedEnquiry?._id
      };

      let response, result, successMessage;

      if (isEditingQuote) {
        // Update existing quote
        // attach any attachment removal instructions (backend support required)
        if (attachmentsToRemove && attachmentsToRemove.length > 0) {
          quoteData.attachmentsToRemove = attachmentsToRemove;
        }
        response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/sales/quotes/${existingQuoteId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(quoteData)
        });
        
        result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update quote');
        }
        
        successMessage = 'Quote updated successfully';
        console.log('Quote updated:', result);
      } else {
        // Create new quote
        const formData = new FormData();
        formData.append('data', JSON.stringify(quoteData));
        
        if (quoteGerberFile) {
          formData.append('gerber', quoteGerberFile);
        }
        
        if (quoteBomFile) {
          formData.append('bom', quoteBomFile);
          formData.append('bomStats', JSON.stringify(quoteBomStats));
        }

        console.log('Creating quote with files:', quoteData);
        
        response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/sales/quotes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create quote');
        }
        
        successMessage = 'Quote created successfully';
        console.log('Quote created:', result);
      }
      
      toast({ title: 'Success', description: successMessage });
      setShowQuoteDialog(false);
      
      // Reload existing quotes to update the UI
      await loadExistingQuotes();
      // Propagate quote changes to shared context so Customers page sees updated quote badges
      salesData.refreshQuotes();
      salesData.refreshCustomersFromQuotes();
      
      // Reset quote form
      setQuoteContact({ name: '', email: '', company: '', phone: '', address: '', gstin: '', notes: '' });
      setQuoteSpecs({ 
        widthMm: 100, heightMm: 100, layers: 1, material: 'FR4', 
        finish: 'HASL', quantity: 5, baseCopperThickness: '18/18',
        mask: 'Both', maskColor: 'Green', legendColor: 'White', layerType: 'Single'
      });
      setQuoteDelivery({ speed: 'standard' });
      setQuoteGerberFile(null);
      setQuoteBomFile(null);
      setQuoteBomStats({ totalLines: 0, uniqueParts: 0 });
      setIsEditingQuote(false);
      setExistingQuoteId(null);
      setExistingAttachments([]);
      setAttachmentsToRemove([]);
      
    } catch (error) {
      console.error('Failed to submit quote:', error);
      toast({ 
        title: 'Error', 
        description: error.message || `Failed to ${isEditingQuote ? 'update' : 'create'} quote` 
      });
    }
  };

  const updateEnquiryStatus = async (enquiryId, newStatus) => {
    try {
      const token = getSalesToken();
      if (!token) {
        toast({ title: 'Authentication error', description: 'Please log in again' });
        return;
      }

      // Mock API call - replace with actual implementation
      console.log('Updating enquiry status:', enquiryId, 'to:', newStatus);
      
      setEnquiries(prev => prev.map(enquiry => 
        enquiry.id === enquiryId 
          ? { ...enquiry, status: newStatus, updatedAt: new Date().toISOString() }
          : enquiry
      ));
      
      toast({ 
        title: 'Status Updated', 
        description: `Enquiry status updated to ${newStatus}` 
      });
    } catch (error) {
      console.error('Error updating enquiry status:', error);
      toast({ 
        title: 'Update Failed', 
        description: 'Failed to update enquiry status' 
      });
    }
  };

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(enquiry => {
      const matchesSearch = 
        enquiry.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enquiry.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = filterSource === 'all' || enquiry.source === filterSource;
      const matchesStatus = filterStatus === 'all' || enquiry.status === filterStatus;
      
      return matchesSearch && matchesSource && matchesStatus;
    });
  }, [enquiries, searchTerm, filterSource, filterStatus]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSourceIcon = (source) => {
    const sourceConfig = enquirySources.find(s => s.value === source);
    return sourceConfig ? sourceConfig.icon : MessageSquare;
  };

  const getSourceLabel = (source) => {
    const sourceConfig = enquirySources.find(s => s.value === source);
    return sourceConfig ? sourceConfig.label : source;
  };

  const getPurposeLabel = (purpose) => {
    const purposeConfig = enquiryPurposes.find(p => p.value === purpose);
    return purposeConfig ? purposeConfig.label : purpose;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Priority removed from enquiries UI

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
        <title>Enquiries | PCB Xpress Sales</title>
        <meta name="description" content="Manage customer enquiries" />
      </Helmet>
      
      <SalesLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Enquiries</h1>
              <p className="text-gray-600">Track and manage customer enquiries</p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Enquiry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Enquiry</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer">Select Customer</Label>
                    <Select onValueChange={handleCustomerSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Search and select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id || customer._id} value={customer.id || customer._id}>
                            {customer.name} - {customer.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="source">Enquiry Source</Label>
                    <Select value={formData.source} onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {enquirySources.map(source => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Enquiry subject"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Detailed description of the enquiry..."
                      rows={4}
                    />
                  </div>
                  {/* Priority field removed as per requirements */}
                  {/* Expected Value removed — not required when creating enquiries */}
                  <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Button onClick={handleAddEnquiry} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Enquiry
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search enquiries by customer, company, or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Enquiry Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEnquiries.map((enquiry) => (
              <Card key={enquiry.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{enquiry.subject}</CardTitle>
                      <p className="text-sm text-gray-600">{enquiry.company}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(enquiry.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{enquiry.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span>{enquiry.company}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Deadline: {enquiry.deadline ? new Date(enquiry.deadline).toLocaleDateString() : '—'}</span>
                    </div>
                    {/* Expected value display removed */}
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {enquiry.message}
                  </p>
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs text-gray-500">
                        Created: {new Date(enquiry.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {enquiry.assignedTo ? `Assigned to: ${enquiry.assignedTo}` : 'Unassigned'}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Quotes dropdown: show all quotes related to this enquiry */}
                      {existingQuotes && existingQuotes.length > 0 && (
                        (() => {
                          const quotesForEnquiry = existingQuotes.filter(q => String(q.enquiryId) === String(enquiry._id) || String(q.enquiryId) === String(enquiry.id));
                          if (quotesForEnquiry.length === 0) return null;
                          return (
                            <div className="flex items-center">
                              <label className="text-xs text-gray-500 mr-2">Quotes</label>
                              <select
                                className="text-sm border rounded px-2 py-1 bg-white"
                                onChange={(e) => {
                                  const qid = e.target.value;
                                  const q = quotesForEnquiry.find(x => String(x._id || x.id) === String(qid));
                                  if (q) {
                                    handleEditQuote(enquiry, q);
                                  }
                                }}
                                defaultValue=""
                              >
                                <option value="" disabled>View / Edit quotes ({quotesForEnquiry.length})</option>
                                {quotesForEnquiry.map(q => (
                                  <option key={q._id || q.id} value={q._id || q.id}>
                                    {`${(q._id || q.id).toString().slice(-6)} • ${q.status || 'draft'} • ₹${(q.adminQuote?.total || q.total || 0).toLocaleString()}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })()
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleCreateQuote(enquiry)}>
                        <Plus className="h-3 w-3 mr-1" />
                        New Quote
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleQuoteButtonClick(enquiry)}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {(
                          // Prefer existingQuotes (fresh data). If any sent quote exists for this enquiry, show clearer label
                          (existingQuotes && existingQuotes.some(q => String(q.enquiryId) === String(enquiry._id) && (q.status || '').toLowerCase() === 'sent')) ||
                          enquiriesWithSentQuotes.has(enquiry._id) || enquiriesWithSentQuotes.has(enquiry.id)
                        ) ? 'Edit Sent Quote' : ((existingQuotes && existingQuotes.some(q => String(q.enquiryId) === String(enquiry._id))) || enquiriesWithSentQuotes.has(enquiry._id) || enquiriesWithSentQuotes.has(enquiry.id) ? 'Edit Quote' : 'Create Quote')}
                      </Button>
                      {/* Start Work button removed as requested */}
                      {enquiry.status === 'in_progress' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateEnquiryStatus(enquiry.id, 'completed')}
                        >
                          Mark Complete
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setSelectedEnquiry(enquiry); setShowEnquiryDetails(true); }}>
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredEnquiries.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No enquiries found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first enquiry'}
                </p>
                {!searchTerm && filterStatus === 'all' && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Enquiry
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quote Creation Dialog */}
          <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>

                      {/* Enquiry Details Dialog */}
                      <Dialog open={showEnquiryDetails} onOpenChange={setShowEnquiryDetails}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Enquiry Details</DialogTitle>
                          </DialogHeader>

                          {selectedEnquiry && (
                            <div className="space-y-4">
                              <div>
                                <h3 className="text-lg font-medium">{selectedEnquiry.subject}</h3>
                                <p className="text-sm text-gray-600">{selectedEnquiry.company}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm"><strong>Customer:</strong> {selectedEnquiry.customerName}</p>
                                  <p className="text-sm"><strong>Email:</strong> {selectedEnquiry.email}</p>
                                  <p className="text-sm"><strong>Phone:</strong> {selectedEnquiry.phone}</p>
                                  <p className="text-sm"><strong>Source:</strong> {getSourceLabel(selectedEnquiry.source)}</p>
                                </div>
                                <div>
                                  <p className="text-sm"><strong>Status:</strong> {selectedEnquiry.status}</p>
                                  {/* Priority removed from details */}
                                  <p className="text-sm"><strong>Deadline:</strong> {selectedEnquiry.deadline ? new Date(selectedEnquiry.deadline).toLocaleDateString() : '—'}</p>
                                  {/* Expected value removed from details */}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium">Message</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedEnquiry.message}</p>
                              </div>

                              <div>
                                <h4 className="font-medium">Related Quotes</h4>
                                <div className="mt-2">
                                  {existingQuotes.filter(q => String(q.enquiryId) === String(selectedEnquiry._id) || String(q.enquiryId) === String(selectedEnquiry.id)).length === 0 && (
                                    <p className="text-sm text-gray-500">No quotes found for this enquiry.</p>
                                  )}
                                  {existingQuotes.filter(q => String(q.enquiryId) === String(selectedEnquiry._id) || String(q.enquiryId) === String(selectedEnquiry.id)).map(q => (
                                    <div key={q._id || q.id} className="flex items-center justify-between py-1">
                                      <div>
                                        <div className="text-sm font-medium">{q.quoteId || (q._id || q.id).toString().slice(-8)}</div>
                                        <div className="text-xs text-gray-500">{q.status} • ₹{(q.adminQuote?.total || q.total || 0).toLocaleString()}</div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button size="xs" variant="outline" onClick={() => handleEditQuote(selectedEnquiry, q)}>Edit</Button>
                                        <a href={q.attachments?.[0]?.url || '#'} target="_blank" rel="noreferrer">
                                          <Button size="xs" variant="ghost">Download</Button>
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <Button variant="outline" onClick={() => setShowEnquiryDetails(false)}>Close</Button>
                                <Button className="ml-2" onClick={() => { handleQuoteButtonClick(selectedEnquiry); setShowEnquiryDetails(false); }}>Create/Edit Quote</Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditingQuote ? 'Edit Quote' : 'Create Quote'} for {selectedEnquiry?.customerName}</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Service Selection & Customer Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="service">Service Type</Label>
                    <Select value={quoteService} onValueChange={setQuoteService}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pcb">PCB Manufacturing</SelectItem>
                        <SelectItem value="3dprinting">3D Printing</SelectItem>
                        <SelectItem value="pcb_assembly">PCB Assembly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="delivery">Delivery Speed</Label>
                    <Select value={quoteDelivery.speed} onValueChange={(value) => setQuoteDelivery(prev => ({ ...prev, speed: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (7-10 days)</SelectItem>
                        <SelectItem value="express">Express (3-5 days)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium">Customer Information</h3>
                    <div>
                      <Label htmlFor="quoteName">Customer Name *</Label>
                      <Input
                        id="quoteName"
                        value={quoteContact.name}
                        onChange={(e) => setQuoteContact(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Customer name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quoteEmail">Email *</Label>
                      <Input
                        id="quoteEmail"
                        type="email"
                        value={quoteContact.email}
                        onChange={(e) => setQuoteContact(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quotePhone">Phone Number</Label>
                      <Input
                        id="quotePhone"
                        value={quoteContact.phone}
                        onChange={(e) => setQuoteContact(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quoteCompany">Company Name (Optional)</Label>
                      <Input
                        id="quoteCompany"
                        value={quoteContact.company}
                        onChange={(e) => setQuoteContact(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quoteAddress">Address</Label>
                      <Textarea
                        id="quoteAddress"
                        value={quoteContact.address}
                        onChange={(e) => setQuoteContact(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Customer address"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="quoteNotes">Notes</Label>
                      <Textarea
                        id="quoteNotes"
                        value={quoteContact.notes}
                        onChange={(e) => setQuoteContact(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Technical Specifications */}
                <div className="space-y-4">
                  {quoteService === 'pcb' && (
                    <div className="space-y-3">
                      <h3 className="font-medium">PCB Specifications</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="width">Width (mm)</Label>
                          <Input
                            id="width"
                            type="number"
                            value={quoteSpecs.widthMm}
                            onChange={(e) => setQuoteSpecs(prev => ({ ...prev, widthMm: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="height">Height (mm)</Label>
                          <Input
                            id="height"
                            type="number"
                            value={quoteSpecs.heightMm}
                            onChange={(e) => setQuoteSpecs(prev => ({ ...prev, heightMm: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="layers">Layers</Label>
                          <Select value={quoteSpecs.layers.toString()} onValueChange={(value) => {
                            const layersValue = parseInt(value);
                            setQuoteSpecs(prev => ({ 
                              ...prev, 
                              layers: layersValue,
                              layerType: layersValue === 1 ? 'Single' : layersValue === 2 ? 'Double' : 'Multilayer'
                            }));
                          }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 Layer</SelectItem>
                              <SelectItem value="2">2 Layers</SelectItem>
                              <SelectItem value="4">4 Layers</SelectItem>
                              <SelectItem value="6">6 Layers</SelectItem>
                              <SelectItem value="8">8 Layers</SelectItem>
                              <SelectItem value="10">10 Layers</SelectItem>
                              <SelectItem value="12">12 Layers</SelectItem>
                              <SelectItem value="14">14 Layers</SelectItem>
                              <SelectItem value="16">16 Layers</SelectItem>
                              <SelectItem value="18">18 Layers</SelectItem>
                              <SelectItem value="20">20 Layers</SelectItem>
                              <SelectItem value="22">22 Layers</SelectItem>
                              <SelectItem value="24">24 Layers</SelectItem>
                              <SelectItem value="26">26 Layers</SelectItem>
                              <SelectItem value="28">28 Layers</SelectItem>
                              <SelectItem value="30">30 Layers</SelectItem>
                              <SelectItem value="32">32 Layers</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input
                            id="quantity"
                            type="number"
                            value={quoteSpecs.quantity}
                            onChange={(e) => setQuoteSpecs(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="material">Material</Label>
                          <Select value={quoteSpecs.material} onValueChange={(value) => setQuoteSpecs(prev => ({ ...prev, material: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FR4">FR4</SelectItem>
                              <SelectItem value="FR1">FR1</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="finish">Surface Finish</Label>
                          <Select value={quoteSpecs.finish} onValueChange={(value) => setQuoteSpecs(prev => ({ ...prev, finish: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HASL">HASL</SelectItem>
                              <SelectItem value="ENIG">ENIG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="baseCopperThickness">Base Copper Thickness (Micron)</Label>
                          <Select value={quoteSpecs.baseCopperThickness} onValueChange={(value) => setQuoteSpecs(prev => ({ ...prev, baseCopperThickness: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="18/18">18/18</SelectItem>
                              <SelectItem value="25/25">25/25</SelectItem>
                              <SelectItem value="35/35">35/35</SelectItem>
                              <SelectItem value="70/70">70/70</SelectItem>
                              <SelectItem value="18/00">18/00</SelectItem>
                              <SelectItem value="25/00">25/00</SelectItem>
                              <SelectItem value="35/00">35/00</SelectItem>
                              <SelectItem value="70/00">70/00</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="mask">Mask</Label>
                          <Select value={quoteSpecs.mask} onValueChange={(value) => {
                            setQuoteSpecs(prev => ({ 
                              ...prev, 
                              mask: value,
                              maskColor: value === 'No Mask' ? 'None' : prev.maskColor
                            }));
                          }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Both">Both</SelectItem>
                              <SelectItem value="Top">Top</SelectItem>
                              <SelectItem value="Bottom">Bottom</SelectItem>
                              <SelectItem value="No Mask">No Mask</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="maskColor">Mask Colour</Label>
                          <Select 
                            value={quoteSpecs.maskColor} 
                            onValueChange={(value) => setQuoteSpecs(prev => ({ ...prev, maskColor: value }))}
                            disabled={quoteSpecs.mask === 'No Mask'}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Green">Green</SelectItem>
                              <SelectItem value="Red">Red</SelectItem>
                              <SelectItem value="White">White</SelectItem>
                              <SelectItem value="None">None</SelectItem>
                            </SelectContent>
                          </Select>
                          {quoteSpecs.mask === 'No Mask' && (
                            <p className="text-xs text-gray-500 mt-1">Mask color automatically set to "None" when no mask is selected</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="legendColor">Legend Colour</Label>
                          <Select value={quoteSpecs.legendColor} onValueChange={(value) => setQuoteSpecs(prev => ({ ...prev, legendColor: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="White">White</SelectItem>
                              <SelectItem value="Black">Black</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="layerType">Layer</Label>
                          <Select value={quoteSpecs.layerType} onValueChange={(value) => setQuoteSpecs(prev => ({ ...prev, layerType: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Single">Single</SelectItem>
                              <SelectItem value="Double">Double</SelectItem>
                              <SelectItem value="Multilayer">Multilayer</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">Automatically set based on Layers selection</p>
                        </div>
                      </div>
                      
                      {/* File Upload Section */}
                      <div className="space-y-3 mt-4">
                        <h3 className="font-medium">File Uploads</h3>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label htmlFor="quoteGerber">Upload Gerbers (.zip) - Max 50MB</Label>
                            <Input
                              id="quoteGerber"
                              type="file"
                              accept=".zip,.drl,.GBL,.GBO,.GBP,.GBS,.GML,.GPI,.GTL,.GTO,.GTP,.GTS,.gbl,.gbo,.gbp,.gbs,.gml,.gpi,.gtl,.gto,.gtp,.gts"
                              onChange={(e) => setQuoteGerberFile(e.target.files?.[0] || null)}
                              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                            />
                            {quoteGerberFile && (
                              <p className="text-xs text-gray-600 mt-1">Selected: {quoteGerberFile.name}</p>
                            )}
                            {/* Show existing gerber attachments when editing (Gerber only) */}
                            {isEditingQuote && existingAttachments.filter(a => a.kind === 'gerber').length > 0 && (
                              <div className="mt-2 text-sm text-gray-700">
                                <div className="font-medium">Existing Gerber Files</div>
                                <ul className="list-disc ml-5 mt-1">
                                  {existingAttachments.filter(a => a.kind === 'gerber').map((att, i) => (
                                    <li key={`gerber-${i}`} className="flex items-center gap-2">
                                      <a href={att.url || '#'} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                        {att.originalName || att.filename}
                                      </a>
                                      <button
                                        type="button"
                                        className="text-xs text-red-600 ml-2 underline"
                                        onClick={() => {
                                          // mark for removal (backend support needed to persist)
                                          setAttachmentsToRemove(prev => [...prev, { filename: att.filename || att.originalName, kind: 'gerber' }]);
                                          setExistingAttachments(prev => prev.filter(x => x !== att));
                                        }}
                                      >
                                        Remove Gerber
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="quoteBom">Upload BOM (.csv, .txt, .xlsx) - Max 50MB</Label>
                            <Input
                              id="quoteBom"
                              type="file"
                              accept=".csv,.txt,.xlsx"
                              onChange={(e) => handleQuoteBomChange(e.target.files?.[0] || null)}
                              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                            />
                            {quoteBomFile && (
                              <p className="text-xs text-gray-600 mt-1">
                                Selected: {quoteBomFile.name} — {quoteBomStats.uniqueParts} unique parts ({quoteBomStats.totalLines} rows)
                              </p>
                            )}
                            {/* Show existing BOM if present (with remove) */}
                            {isEditingQuote && existingAttachments.filter(a => a.kind === 'bom').length > 0 && (
                              <div className="mt-2 text-sm text-gray-700">
                                <div className="font-medium">Existing BOM</div>
                                <ul className="list-disc ml-5 mt-1">
                                  {existingAttachments.filter(a => a.kind === 'bom').map((a, i) => (
                                    <li key={`bom-${i}`} className="flex items-center gap-2">
                                      <a href={a.url || '#'} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{a.originalName || a.filename}</a>
                                      <button
                                        type="button"
                                        className="text-xs text-red-600 ml-2 underline"
                                        onClick={() => {
                                          setAttachmentsToRemove(prev => [...prev, { filename: a.filename || a.originalName, kind: 'bom' }]);
                                          setExistingAttachments(prev => prev.filter(x => x !== a));
                                        }}
                                      >
                                        Remove BOM
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {quoteService === '3dprinting' && (
                    <div className="space-y-3">
                      <h3 className="font-medium">3D Printing Specifications</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="tech">Technology</Label>
                          <Select value={quoteSpecs3d.tech} onValueChange={(value) => setQuoteSpecs3d(prev => ({ ...prev, tech: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fdm">FDM</SelectItem>
                              <SelectItem value="sla">SLA</SelectItem>
                              <SelectItem value="sls">SLS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="material3d">Material</Label>
                          <Select value={quoteSpecs3d.material} onValueChange={(value) => setQuoteSpecs3d(prev => ({ ...prev, material: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PLA">PLA</SelectItem>
                              <SelectItem value="ABS">ABS</SelectItem>
                              <SelectItem value="PETG">PETG</SelectItem>
                              <SelectItem value="Resin">Resin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="quantity3d">Quantity</Label>
                          <Input
                            id="quantity3d"
                            type="number"
                            value={quoteSpecs3d.quantity}
                            onChange={(e) => setQuoteSpecs3d(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="infill">Infill (%)</Label>
                          <Input
                            id="infill"
                            type="number"
                            value={quoteSpecs3d.infillPercent}
                            onChange={(e) => setQuoteSpecs3d(prev => ({ ...prev, infillPercent: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleQuoteSubmit} className="bg-orange-600 hover:bg-orange-700">
                  {isEditingQuote ? 'Update Quote' : 'Create Quote'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SalesLayout>
    </>
  );
};

export default SalesEnquiriesPage;
