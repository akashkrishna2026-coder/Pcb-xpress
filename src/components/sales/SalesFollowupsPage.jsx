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
  Phone, 
  Mail, 
  Calendar,
  User,
  AlertCircle,
  Bell,
  RefreshCw
} from 'lucide-react';

// RescheduleForm component for rescheduling follow-ups
function RescheduleForm({ followup, onRescheduled }) {
  const { toast } = useToast();
  const [date, setDate] = React.useState(followup.scheduledDate?.slice(0, 10) || '');
  const [time, setTime] = React.useState(followup.scheduledTime || '');
  const [loading, setLoading] = React.useState(false);

  const handleReschedule = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = getSalesToken();
      await api.updateSalesFollowup(token, followup.id, {
        scheduledDate: date,
        scheduledTime: time,
      });
      toast({ title: 'Follow-up rescheduled' });
      onRescheduled && onRescheduled();
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to reschedule' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleReschedule} className="space-y-4">
      <div>
        <Label htmlFor="reschedule-date">New Date</Label>
        <Input id="reschedule-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="reschedule-time">New Time</Label>
        <Input id="reschedule-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Rescheduling...' : 'Reschedule'}
      </Button>
    </form>
  );
}

const SalesFollowupsPage = () => {
  const { toast } = useToast();
  const { followups, loadingFollowups: loading, refreshFollowups, refreshEnquiries } = useSalesData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
    reminderSet: false
  });

  // Data comes from SalesDataContext – no local loading needed

  const filteredFollowups = useMemo(() => {
    return (followups || []).filter(followup => {
      const name = (followup.customerName || '').toLowerCase();
      const company = (followup.company || '').toLowerCase();
      const purpose = (followup.purpose || '').toLowerCase();
      const contact = (followup.contactPerson || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = 
        name.includes(term) ||
        company.includes(term) ||
        purpose.includes(term) ||
        contact.includes(term);
      
      // Backend uses "overdue" but UI filter might say "scheduled" – show overdue under "scheduled" filter too
      const matchesStatus = statusFilter === 'all' 
        || followup.status === statusFilter
        || (statusFilter === 'scheduled' && followup.status === 'overdue');
      
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

      const token = getSalesToken();
      if (!token) {
        toast({ title: 'Authentication error', description: 'Please log in again' });
        return;
      }

      await api.createSalesFollowup(token, formData);

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
        reminderSet: false
      });
      setShowAddDialog(false);
      toast({ title: 'Follow-up scheduled successfully' });
      refreshFollowups(); // refresh from backend
    } catch (error) {
      toast({ 
        title: 'Error scheduling follow-up', 
        description: error.message || 'Failed to schedule follow-up' 
      });
    }
  };

  const completeFollowup = async (followupId) => {
    try {
      const token = getSalesToken();
      if (!token) {
        toast({ title: 'Authentication error', description: 'Please log in again' });
        return;
      }

      await api.completeSalesFollowup(token, followupId);
      toast({ title: 'Follow-up marked as completed' });
      // Refresh follow-ups and enquiries (completing an enquiry follow-up changes enquiry status)
      refreshFollowups();
      refreshEnquiries();
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
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
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
              <p className="text-gray-600">
                Schedule and track customer follow-ups
                {followups.length > 0 && (
                  <span className="ml-2 text-sm">
                    — {followups.filter(f => f.status === 'overdue').length} overdue, {followups.filter(f => f.status === 'scheduled').length} scheduled
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshFollowups}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
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
                    <SelectItem value="overdue">Overdue</SelectItem>
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
              <Card key={followup.id} className={`hover:shadow-md transition-shadow ${followup.status === 'overdue' ? 'border-red-200 bg-red-50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{followup.purpose}</CardTitle>
                      <p className="text-sm text-gray-600">{followup.company}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${followup.source === 'enquiry' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {followup.source === 'enquiry' ? 'Enquiry' : 'Visit'}
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
                      <span className={followup.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                        {new Date(followup.scheduledDate).toLocaleDateString()} {followup.scheduledTime ? `at ${followup.scheduledTime}` : ''}
                        {followup.status === 'overdue' && ' (Overdue)'}
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
                      {(followup.status === 'scheduled' || followup.status === 'overdue') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => completeFollowup(followup.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Follow-up Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 text-sm">
                            <div><b>Customer:</b> {followup.customerName}</div>
                            <div><b>Company:</b> {followup.company}</div>
                            <div><b>Contact Person:</b> {followup.contactPerson}</div>
                            <div><b>Type:</b> {followup.followupType}</div>
                            <div><b>Purpose:</b> {followup.purpose}</div>
                            <div><b>Notes:</b> {followup.notes || '—'}</div>
                            {/* Priority removed from UI */}
                            <div><b>Status:</b> {followup.status}</div>
                            <div><b>Scheduled:</b> {new Date(followup.scheduledDate).toLocaleDateString()} {followup.scheduledTime ? `at ${followup.scheduledTime}` : ''}</div>
                            {followup.completedAt && <div><b>Completed:</b> {new Date(followup.completedAt).toLocaleDateString()}</div>}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            Reschedule
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Reschedule Follow-up</DialogTitle>
                          </DialogHeader>
                          <RescheduleForm followup={followup} onRescheduled={refreshFollowups} />
                        </DialogContent>
                      </Dialog>
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
