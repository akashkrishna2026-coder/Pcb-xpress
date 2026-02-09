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
import { 
  FileText, 
  Plus, 
  Search, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  Percent,
  Calendar,
  User,
  Building,
  Target
} from 'lucide-react';

const SalesNegotiationsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [negotiations, setNegotiations] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    company: '',
    enquiryId: '',
    subject: '',
    description: '',
    initialValue: '',
    customerOffer: '',
    ourCounter: '',
    finalValue: '',
    status: 'in_progress',
    expectedCloseDate: '',
    assignedTo: '',
    terms: '',
    notes: ''
  });

  useEffect(() => {
    loadNegotiations();
  }, []);

  const loadNegotiations = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const token = getSalesToken();
      // if (!token) return;
      // const response = await api.getSalesNegotiations(token);
      // setNegotiations(response.negotiations || []);
      
      // For now, set empty array
      setNegotiations([]);
    } catch (error) {
      console.error('Failed to load negotiations:', error);
      toast({ 
        title: 'Connection Error', 
        description: 'Unable to connect to database. Please check your connection.' 
      });
      setNegotiations([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredNegotiations = useMemo(() => {
    return negotiations.filter(negotiation => {
      const matchesSearch = 
        negotiation.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        negotiation.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        negotiation.subject.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || negotiation.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [negotiations, searchTerm, statusFilter]);

  const handleAddNegotiation = async () => {
    try {
      // Validate required fields
      if (!formData.customerName || !formData.subject || !formData.initialValue) {
        toast({ title: 'Missing required fields', description: 'Please fill in all required fields' });
        return;
      }

      // Simulate API call
      const newNegotiation = {
        id: negotiations.length + 1,
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setNegotiations([newNegotiation, ...negotiations]);
      setFormData({
        customerId: '',
        customerName: '',
        company: '',
        enquiryId: '',
        subject: '',
        description: '',
        initialValue: '',
        customerOffer: '',
        ourCounter: '',
        finalValue: '',
        status: 'in_progress',
        expectedCloseDate: '',
        assignedTo: '',
        terms: '',
        notes: ''
      });
      setShowAddDialog(false);
      toast({ title: 'Negotiation added successfully' });
    } catch (error) {
      toast({ 
        title: 'Error adding negotiation', 
        description: error.message || 'Failed to add negotiation' 
      });
    }
  };

  const updateNegotiationStatus = async (negotiationId, newStatus, finalValue = null) => {
    try {
      const updatedNegotiations = negotiations.map(negotiation => 
        negotiation.id === negotiationId 
          ? { 
              ...negotiation, 
              status: newStatus, 
              finalValue: finalValue || negotiation.finalValue,
              updatedAt: new Date().toISOString() 
            }
          : negotiation
      );
      setNegotiations(updatedNegotiations);
      toast({ title: 'Status updated successfully' });
    } catch (error) {
      toast({ 
        title: 'Error updating status', 
        description: error.message || 'Failed to update negotiation status' 
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'won':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'lost':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'on_hold':
        return <Target className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'won':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateDiscount = (initial, final) => {
    if (!initial || !final) return 0;
    return ((initial - final) / initial * 100).toFixed(1);
  };

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
        <title>Negotiations | PCB Xpress Sales</title>
        <meta name="description" content="Track and manage deal negotiations" />
      </Helmet>
      
      <SalesLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Deal Negotiations</h1>
              <p className="text-gray-600">Track and manage customer negotiations</p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Negotiation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Negotiation</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer-name">Customer Name *</Label>
                    <Input
                      id="customer-name"
                      value={formData.customerName}
                      onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="enquiry-id">Enquiry ID</Label>
                    <Input
                      id="enquiry-id"
                      value={formData.enquiryId}
                      onChange={(e) => setFormData({...formData, enquiryId: e.target.value})}
                      placeholder="Related enquiry ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="assigned-to">Assigned To</Label>
                    <Input
                      id="assigned-to"
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                      placeholder="Sales representative"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      placeholder="Negotiation subject"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Detailed description of the negotiation..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="initial-value">Initial Value (₹) *</Label>
                    <Input
                      id="initial-value"
                      type="number"
                      value={formData.initialValue}
                      onChange={(e) => setFormData({...formData, initialValue: e.target.value})}
                      placeholder="2500000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-offer">Customer Offer (₹)</Label>
                    <Input
                      id="customer-offer"
                      type="number"
                      value={formData.customerOffer}
                      onChange={(e) => setFormData({...formData, customerOffer: e.target.value})}
                      placeholder="2125000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="our-counter">Our Counter (₹)</Label>
                    <Input
                      id="our-counter"
                      type="number"
                      value={formData.ourCounter}
                      onChange={(e) => setFormData({...formData, ourCounter: e.target.value})}
                      placeholder="2375000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expected-close-date">Expected Close Date</Label>
                    <Input
                      id="expected-close-date"
                      type="date"
                      value={formData.expectedCloseDate}
                      onChange={(e) => setFormData({...formData, expectedCloseDate: e.target.value})}
                    />
                  </div>
                  {/* Priority removed from Negotiations form */}
                  <div className="col-span-2">
                    <Label htmlFor="terms">Terms & Conditions</Label>
                    <Textarea
                      id="terms"
                      value={formData.terms}
                      onChange={(e) => setFormData({...formData, terms: e.target.value})}
                      placeholder="Payment terms, delivery terms, etc..."
                      rows={2}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Additional notes about the negotiation..."
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2">
                    <Button onClick={handleAddNegotiation} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Negotiation
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
                    placeholder="Search negotiations by customer, company, or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Negotiation Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredNegotiations.map((negotiation) => (
              <Card key={negotiation.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{negotiation.subject}</CardTitle>
                      <p className="text-sm text-gray-600">{negotiation.company}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(negotiation.status)}`}>
                        {negotiation.status.replace('_', ' ')}
                      </span>
                      {getStatusIcon(negotiation.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{negotiation.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Expected close: {new Date(negotiation.expectedCloseDate).toLocaleDateString()}</span>
                    </div>
                    {negotiation.assignedTo && (
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-gray-400" />
                        <span>Assigned to: {negotiation.assignedTo}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Financial Summary */}
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Initial Value:</span>
                      <span className="font-medium">₹{(negotiation.initialValue / 100000).toFixed(1)}L</span>
                    </div>
                    {negotiation.customerOffer && (
                      <div className="flex justify-between text-sm">
                        <span>Customer Offer:</span>
                        <span className="font-medium">₹{(negotiation.customerOffer / 100000).toFixed(1)}L</span>
                      </div>
                    )}
                    {negotiation.ourCounter && (
                      <div className="flex justify-between text-sm">
                        <span>Our Counter:</span>
                        <span className="font-medium">₹{(negotiation.ourCounter / 100000).toFixed(1)}L</span>
                      </div>
                    )}
                    {negotiation.finalValue && (
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Final Value:</span>
                        <span className="text-green-600">₹{(negotiation.finalValue / 100000).toFixed(1)}L</span>
                      </div>
                    )}
                    {negotiation.finalValue && (
                      <div className="flex justify-between text-sm">
                        <span>Discount:</span>
                        <span className="text-orange-600">{calculateDiscount(negotiation.initialValue, negotiation.finalValue)}%</span>
                      </div>
                    )}
                  </div>
                  
                  {negotiation.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {negotiation.description}
                    </p>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs text-gray-500">
                        Created: {new Date(negotiation.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        Updated: {new Date(negotiation.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      {negotiation.status === 'in_progress' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateNegotiationStatus(negotiation.id, 'won', negotiation.ourCounter || negotiation.customerOffer)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Won
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateNegotiationStatus(negotiation.id, 'lost')}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Mark Lost
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredNegotiations.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No negotiations found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first negotiation'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Negotiation
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </SalesLayout>
    </>
  );
};

export default SalesNegotiationsPage;
