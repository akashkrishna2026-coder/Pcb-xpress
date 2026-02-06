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
  MessageSquare, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  Phone, 
  Mail, 
  Calendar,
  User,
  AlertCircle,
  Bell
} from 'lucide-react';

const SalesFollowupsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [followups, setFollowups] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    company: '',
    contactPerson: '',
    followupType: 'phone',
    scheduledDate: '',
    scheduledTime: '',
    purpose: '',
    notes: '',
    priority: 'medium',
    reminderSet: false
  });

  useEffect(() => {
    loadFollowups();
  }, []);

  const loadFollowups = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const token = getSalesToken();
      // if (!token) return;
      // const response = await api.getSalesFollowups(token);
      // setFollowups(response.followups || []);
      
      // For now, set empty array
      setFollowups([]);
    } catch (error) {
      console.error('Failed to load follow-ups:', error);
      toast({ 
        title: 'Connection Error', 
        description: 'Unable to connect to database. Please check your connection.' 
      });
      setFollowups([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredFollowups = useMemo(() => {
    return followups.filter(followup => {
      const matchesSearch = 
        followup.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        followup.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        followup.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        followup.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || followup.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [followups, searchTerm, statusFilter]);

  const handleAddFollowup = async () => {
    try {
      // Validate required fields
      if (!formData.customerName || !formData.scheduledDate || !formData.purpose) {
        toast({ title: 'Missing required fields', description: 'Please fill in all required fields' });
        return;
      }

      // Simulate API call
      const newFollowup = {
        id: followups.length + 1,
        ...formData,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };

      setFollowups([newFollowup, ...followups]);
      setFormData({
        customerId: '',
        customerName: '',
        company: '',
        contactPerson: '',
        followupType: 'phone',
        scheduledDate: '',
        scheduledTime: '',
        purpose: '',
        notes: '',
        priority: 'medium',
        reminderSet: false
      });
      setShowAddDialog(false);
      toast({ title: 'Follow-up scheduled successfully' });
    } catch (error) {
      toast({ 
        title: 'Error scheduling follow-up', 
        description: error.message || 'Failed to schedule follow-up' 
      });
    }
  };

  const completeFollowup = async (followupId) => {
    try {
      const updatedFollowups = followups.map(followup => 
        followup.id === followupId 
          ? { 
              ...followup, 
              status: 'completed', 
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString() 
            }
          : followup
      );
      setFollowups(updatedFollowups);
      toast({ title: 'Follow-up marked as completed' });
    } catch (error) {
      toast({ 
        title: 'Error completing follow-up', 
        description: error.message || 'Failed to complete follow-up' 
      });
    }
  };

  const getFollowupTypeIcon = (type) => {
    switch (type) {
      case 'phone':
        return <Phone className="h-4 w-4 text-blue-500" />;
      case 'email':
        return <Mail className="h-4 w-4 text-green-500" />;
      case 'meeting':
        return <User className="h-4 w-4 text-purple-500" />;
      case 'site_visit':
        return <Calendar className="h-4 w-4 text-orange-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (scheduledDate) => {
    return new Date(scheduledDate) < new Date() && new Date(scheduledDate).toDateString() !== new Date().toDateString();
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
        <title>Follow-ups | PCB Xpress Sales</title>
        <meta name="description" content="Manage customer follow-ups" />
      </Helmet>
      
      <SalesLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Follow-ups</h1>
              <p className="text-gray-600">Schedule and track customer follow-ups</p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Follow-up
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Schedule New Follow-up</DialogTitle>
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
                    <Label htmlFor="contact-person">Contact Person</Label>
                    <Input
                      id="contact-person"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                      placeholder="Contact person name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="followup-type">Follow-up Type</Label>
                    <Select value={formData.followupType} onValueChange={(value) => setFormData({...formData, followupType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="site_visit">Site Visit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="scheduled-date">Scheduled Date *</Label>
                    <Input
                      id="scheduled-date"
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="scheduled-time">Scheduled Time</Label>
                    <Input
                      id="scheduled-time"
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="purpose">Purpose *</Label>
                    <Textarea
                      id="purpose"
                      value={formData.purpose}
                      onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                      placeholder="Purpose of the follow-up..."
                      rows={2}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Button onClick={handleAddFollowup} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Follow-up
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
                    placeholder="Search follow-ups by customer, company, or purpose..."
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
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Follow-up Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredFollowups.map((followup) => (
              <Card key={followup.id} className={`hover:shadow-md transition-shadow ${isOverdue(followup.scheduledDate) && followup.status === 'scheduled' ? 'border-red-200 bg-red-50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{followup.purpose}</CardTitle>
                      <p className="text-sm text-gray-600">{followup.company}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {followup.reminderSet && <Bell className="h-4 w-4 text-blue-500" />}
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(followup.priority)}`}>
                        {followup.priority}
                      </span>
                      {getStatusIcon(followup.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{followup.contactPerson || followup.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {getFollowupTypeIcon(followup.followupType)}
                      <span className="capitalize">{followup.followupType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className={isOverdue(followup.scheduledDate) && followup.status === 'scheduled' ? 'text-red-600 font-medium' : ''}>
                        {new Date(followup.scheduledDate).toLocaleDateString()} at {followup.scheduledTime || 'Not specified'}
                        {isOverdue(followup.scheduledDate) && followup.status === 'scheduled' && ' (Overdue)'}
                      </span>
                    </div>
                  </div>
                  
                  {followup.notes && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {followup.notes}
                    </p>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs text-gray-500">
                        Scheduled: {new Date(followup.createdAt).toLocaleDateString()}
                      </span>
                      {followup.completedAt && (
                        <span className="text-xs text-green-600">
                          Completed: {new Date(followup.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {followup.status === 'scheduled' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => completeFollowup(followup.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        Reschedule
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredFollowups.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No follow-ups found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by scheduling your first follow-up'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Your First Follow-up
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

export default SalesFollowupsPage;
