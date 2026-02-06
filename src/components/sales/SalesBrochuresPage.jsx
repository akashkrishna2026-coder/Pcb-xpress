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
  Image, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  Edit,
  FileText,
  Calendar,
  User,
  Tag,
  Share2,
  Filter
} from 'lucide-react';

const SalesBrochuresPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brochures, setBrochures] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedBrochure, setSelectedBrochure] = useState(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'pcb_manufacturing',
    fileUrl: '',
    fileSize: '',
    fileType: '',
    thumbnailUrl: '',
    tags: '',
    language: 'english',
    version: '1.0',
    isActive: true
  });

  useEffect(() => {
    loadBrochures();
  }, []);

  const loadBrochures = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual API
      const mockBrochures = [
        {
          id: 1,
          title: 'PCB Manufacturing Capabilities',
          description: 'Complete overview of our PCB manufacturing capabilities including multilayer boards, HDI, and quick turn services.',
          category: 'pcb_manufacturing',
          fileUrl: '/brochures/pcb-manufacturing-capabilities.pdf',
          fileSize: '2.5 MB',
          fileType: 'PDF',
          thumbnailUrl: '/images/brochure-thumbnails/pcb-manufacturing.jpg',
          tags: 'pcb, manufacturing, multilayer, hdi',
          language: 'english',
          version: '2.1',
          downloads: 156,
          views: 423,
          isActive: true,
          createdAt: '2024-01-10T10:30:00Z',
          updatedAt: '2024-01-15T14:20:00Z',
          createdBy: 'John Doe'
        },
        {
          id: 2,
          title: 'PCB Assembly Services',
          description: 'Detailed information about our PCB assembly services including SMT, through-hole, and testing capabilities.',
          category: 'pcb_assembly',
          fileUrl: '/brochures/pcb-assembly-services.pdf',
          fileSize: '3.2 MB',
          fileType: 'PDF',
          thumbnailUrl: '/images/brochure-thumbnails/pcb-assembly.jpg',
          tags: 'pcb, assembly, smt, testing',
          language: 'english',
          version: '1.8',
          downloads: 89,
          views: 267,
          isActive: true,
          createdAt: '2024-01-08T09:15:00Z',
          updatedAt: '2024-01-12T11:45:00Z',
          createdBy: 'Jane Smith'
        },
        {
          id: 3,
          title: '3D Printing Services',
          description: 'Comprehensive guide to our 3D printing services including materials, tolerances, and applications.',
          category: '3d_printing',
          fileUrl: '/brochures/3d-printing-services.pdf',
          fileSize: '4.1 MB',
          fileType: 'PDF',
          thumbnailUrl: '/images/brochure-thumbnails/3d-printing.jpg',
          tags: '3d printing, additive manufacturing, prototyping',
          language: 'english',
          version: '1.3',
          downloads: 67,
          views: 198,
          isActive: true,
          createdAt: '2024-01-05T16:45:00Z',
          updatedAt: '2024-01-10T13:30:00Z',
          createdBy: 'Mike Johnson'
        },
        {
          id: 4,
          title: 'Wire Harness Solutions',
          description: 'Specialized wire harness and cable assembly solutions for various industries.',
          category: 'wire_harness',
          fileUrl: '/brochures/wire-harness-solutions.pdf',
          fileSize: '2.8 MB',
          fileType: 'PDF',
          thumbnailUrl: '/images/brochure-thumbnails/wire-harness.jpg',
          tags: 'wire harness, cable assembly, connectors',
          language: 'english',
          version: '1.5',
          downloads: 45,
          views: 134,
          isActive: true,
          createdAt: '2024-01-03T14:20:00Z',
          updatedAt: '2024-01-08T10:15:00Z',
          createdBy: 'Sarah Wilson'
        }
      ];
      setBrochures(mockBrochures);
    } catch (error) {
      toast({ 
        title: 'Error loading brochures', 
        description: error.message || 'Failed to load brochure data' 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBrochures = useMemo(() => {
    return brochures.filter(brochure => {
      const matchesSearch = 
        brochure.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brochure.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brochure.tags.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || brochure.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [brochures, searchTerm, categoryFilter]);

  const handleAddBrochure = async () => {
    try {
      // Validate required fields
      if (!formData.title || !formData.fileUrl) {
        toast({ title: 'Missing required fields', description: 'Please fill in all required fields' });
        return;
      }

      // Simulate API call
      const newBrochure = {
        id: brochures.length + 1,
        ...formData,
        downloads: 0,
        views: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'Current User'
      };

      setBrochures([newBrochure, ...brochures]);
      setFormData({
        title: '',
        description: '',
        category: 'pcb_manufacturing',
        fileUrl: '',
        fileSize: '',
        fileType: '',
        thumbnailUrl: '',
        tags: '',
        language: 'english',
        version: '1.0',
        isActive: true
      });
      setShowAddDialog(false);
      toast({ title: 'Brochure added successfully' });
    } catch (error) {
      toast({ 
        title: 'Error adding brochure', 
        description: error.message || 'Failed to add brochure' 
      });
    }
  };

  const handleDownload = async (brochure) => {
    try {
      // Simulate download
      const updatedBrochures = brochures.map(b => 
        b.id === brochure.id 
          ? { ...b, downloads: b.downloads + 1 }
          : b
      );
      setBrochures(updatedBrochures);
      toast({ title: 'Download started', description: `${brochure.title} is being downloaded` });
      
      // In a real app, this would trigger actual file download
      console.log('Downloading:', brochure.fileUrl);
    } catch (error) {
      toast({ 
        title: 'Error downloading brochure', 
        description: error.message || 'Failed to download brochure' 
      });
    }
  };

  const handlePreview = (brochure) => {
    setSelectedBrochure(brochure);
    setShowPreviewDialog(true);
    
    // Increment view count
    const updatedBrochures = brochures.map(b => 
      b.id === brochure.id 
        ? { ...b, views: b.views + 1 }
        : b
    );
    setBrochures(updatedBrochures);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'pcb_manufacturing':
        return 'bg-blue-100 text-blue-800';
      case 'pcb_assembly':
        return 'bg-green-100 text-green-800';
      case '3d_printing':
        return 'bg-purple-100 text-purple-800';
      case 'wire_harness':
        return 'bg-orange-100 text-orange-800';
      case 'component_sourcing':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'pcb_manufacturing':
        return 'PCB Manufacturing';
      case 'pcb_assembly':
        return 'PCB Assembly';
      case '3d_printing':
        return '3D Printing';
      case 'wire_harness':
        return 'Wire Harness';
      case 'component_sourcing':
        return 'Component Sourcing';
      default:
        return 'Other';
    }
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
        <title>Brochures | PCB Xpress Sales</title>
        <meta name="description" content="Manage sales brochures and marketing materials" />
      </Helmet>
      
      <SalesLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Brochures</h1>
              <p className="text-gray-600">Manage and share marketing materials</p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Brochure
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Brochure</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Brochure title"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Brief description of the brochure..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pcb_manufacturing">PCB Manufacturing</SelectItem>
                        <SelectItem value="pcb_assembly">PCB Assembly</SelectItem>
                        <SelectItem value="3d_printing">3D Printing</SelectItem>
                        <SelectItem value="wire_harness">Wire Harness</SelectItem>
                        <SelectItem value="component_sourcing">Component Sourcing</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select value={formData.language} onValueChange={(value) => setFormData({...formData, language: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="hindi">Hindi</SelectItem>
                        <SelectItem value="tamil">Tamil</SelectItem>
                        <SelectItem value="telugu">Telugu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="file-url">File URL *</Label>
                    <Input
                      id="file-url"
                      value={formData.fileUrl}
                      onChange={(e) => setFormData({...formData, fileUrl: e.target.value})}
                      placeholder="/brochures/filename.pdf"
                    />
                  </div>
                  <div>
                    <Label htmlFor="file-size">File Size</Label>
                    <Input
                      id="file-size"
                      value={formData.fileSize}
                      onChange={(e) => setFormData({...formData, fileSize: e.target.value})}
                      placeholder="2.5 MB"
                    />
                  </div>
                  <div>
                    <Label htmlFor="thumbnail-url">Thumbnail URL</Label>
                    <Input
                      id="thumbnail-url"
                      value={formData.thumbnailUrl}
                      onChange={(e) => setFormData({...formData, thumbnailUrl: e.target.value})}
                      placeholder="/images/thumbnail.jpg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => setFormData({...formData, version: e.target.value})}
                      placeholder="1.0"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      placeholder="pcb, manufacturing, assembly"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button onClick={handleAddBrochure} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Brochure
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
                    placeholder="Search brochures by title, description, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="pcb_manufacturing">PCB Manufacturing</SelectItem>
                    <SelectItem value="pcb_assembly">PCB Assembly</SelectItem>
                    <SelectItem value="3d_printing">3D Printing</SelectItem>
                    <SelectItem value="wire_harness">Wire Harness</SelectItem>
                    <SelectItem value="component_sourcing">Component Sourcing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Brochure Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrochures.map((brochure) => (
              <Card key={brochure.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    {brochure.thumbnailUrl ? (
                      <img 
                        src={brochure.thumbnailUrl} 
                        alt={brochure.title}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full items-center justify-center text-gray-400" style={{display: brochure.thumbnailUrl ? 'none' : 'flex'}}>
                      <Image className="h-12 w-12" />
                    </div>
                  </div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{brochure.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(brochure.category)}`}>
                          {getCategoryLabel(brochure.category)}
                        </span>
                        <span className="text-xs text-gray-500">v{brochure.version}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {brochure.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">File size:</span>
                      <span>{brochure.fileSize}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Language:</span>
                      <span className="capitalize">{brochure.language}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Downloads:</span>
                      <span>{brochure.downloads}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Views:</span>
                      <span>{brochure.views}</span>
                    </div>
                  </div>
                  
                  {brochure.tags && (
                    <div className="flex flex-wrap gap-1">
                      {brochure.tags.split(',').map((tag, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handlePreview(brochure)}
                        className="flex-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownload(brochure)}
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredBrochures.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No brochures found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || categoryFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first brochure'}
                </p>
                {!searchTerm && categoryFilter === 'all' && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Brochure
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preview Dialog */}
          <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedBrochure?.title}</DialogTitle>
              </DialogHeader>
              {selectedBrochure && (
                <div className="space-y-4">
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-16 w-16 text-gray-400" />
                    <p className="text-gray-500 ml-4">PDF Preview</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Description</Label>
                      <p className="text-sm text-gray-600">{selectedBrochure.description}</p>
                    </div>
                    <div>
                      <Label>Details</Label>
                      <div className="space-y-1 text-sm">
                        <p>Category: {getCategoryLabel(selectedBrochure.category)}</p>
                        <p>Language: {selectedBrochure.language}</p>
                        <p>Version: {selectedBrochure.version}</p>
                        <p>File Size: {selectedBrochure.fileSize}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleDownload(selectedBrochure)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </SalesLayout>
    </>
  );
};

export default SalesBrochuresPage;
