import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PromotionalImagesManager = () => {
  const { toast } = useToast();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingImage, setEditingImage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    image: null,
    isActive: true,
    displayOrder: 0,
    displayFrequencyMinutes: 60, // Default 1 hour in minutes
    maxPopupsPerSession: 3, // Max popups per user session
    startDate: '',
    endDate: '',
    targetUrl: ''
  });

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const token = getAdminToken();
      const res = await api.adminGetPromotionalImages(token);
      setImages(res.images || []);
    } catch (err) {
      console.error('Failed to load promotional images:', err);
      toast({ title: 'Failed to load images', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: 'Invalid file type', description: 'Please upload a JPEG, PNG, GIF, or WebP image.' });
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Please upload an image smaller than 5MB.' });
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: 'Title required', description: 'Please enter a title for the promotional image.' });
      return;
    }
    if (!formData.image && !editingImage) {
      toast({ title: 'Image required', description: 'Please select an image file.' });
      return;
    }

    try {
      const token = getAdminToken();
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('isActive', formData.isActive.toString());
      fd.append('displayOrder', formData.displayOrder.toString());
      // Convert minutes to hours for backend
      const displayFrequencyHours = Math.max(0.0167, formData.displayFrequencyMinutes / 60); // Min 1 minute
      fd.append('displayFrequency', displayFrequencyHours.toString());
      fd.append('maxPopupsPerSession', formData.maxPopupsPerSession.toString());
      if (formData.startDate) fd.append('startDate', formData.startDate);
      if (formData.endDate) fd.append('endDate', formData.endDate);
      if (formData.targetUrl) fd.append('targetUrl', formData.targetUrl);
      if (formData.image) fd.append('image', formData.image);

      if (editingImage) {
        await api.adminUpdatePromotionalImage(token, editingImage._id, fd);
        toast({ title: 'Image updated successfully' });
      } else {
        await api.adminCreatePromotionalImage(token, fd);
        toast({ title: 'Image added successfully' });
      }

      // Reset form
      setFormData({
        title: '',
        image: null,
        isActive: true,
        displayOrder: 0,
        displayFrequencyMinutes: 60,
        maxPopupsPerSession: 3,
        startDate: '',
        endDate: '',
        targetUrl: ''
      });
      setShowAddDialog(false);
      setEditingImage(null);
      loadImages();
    } catch (err) {
      toast({ title: 'Failed to save image', description: err.message });
    }
  };

  const handleEdit = (image) => {
    setEditingImage(image);
    setFormData({
      title: image.title,
      image: null, // Don't pre-fill image file
      isActive: image.isActive,
      displayOrder: image.displayOrder,
      displayFrequencyMinutes: Math.round(image.displayFrequency * 60), // Convert hours to minutes
      maxPopupsPerSession: image.maxPopupsPerSession || 3, // Use stored value or default
      startDate: image.startDate ? new Date(image.startDate).toISOString().split('T')[0] : '',
      endDate: image.endDate ? new Date(image.endDate).toISOString().split('T')[0] : '',
      targetUrl: image.targetUrl || ''
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this promotional image?')) return;

    try {
      const token = getAdminToken();
      await api.adminDeletePromotionalImage(token, id);
      toast({ title: 'Image deleted successfully' });
      loadImages();
    } catch (err) {
      toast({ title: 'Failed to delete image', description: err.message });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      image: null,
      isActive: true,
      displayOrder: 0,
      displayFrequencyMinutes: 60,
      maxPopupsPerSession: 3,
      startDate: '',
      endDate: '',
      targetUrl: ''
    });
    setEditingImage(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading promotional images...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Promotional Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <p className="text-sm text-muted-foreground">
                Manage promotional images that appear as popups to users
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, displayFrequencyMinutes: 5, maxPopupsPerSession: 5 }));
                    toast({ title: 'Set to High Frequency', description: 'Every 5 minutes, max 5 per session' });
                  }}
                >
                  High Frequency
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, displayFrequencyMinutes: 60, maxPopupsPerSession: 3 }));
                    toast({ title: 'Set to Moderate', description: 'Every hour, max 3 per session' });
                  }}
                >
                  Moderate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, displayFrequencyMinutes: 1440, maxPopupsPerSession: 1 }));
                    toast({ title: 'Set to Low Frequency', description: 'Once per day, max 1 per session' });
                  }}
                >
                  Low Frequency
                </Button>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
              Add Image
            </Button>
          </div>

          <div className="space-y-3">
            {images.map((image) => (
              <div key={image._id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <img
                    src={image.image.url}
                    alt={image.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div>
                    <p className="font-medium">{image.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Order: {image.displayOrder} | Frequency: {Math.round(image.displayFrequency * 60)}min |
                      Views: {image.viewCount} | Clicks: {image.clickCount}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    image.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {image.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(image)}>
                    ✏️
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(image._id)}>
                    🗑️
                  </Button>
                </div>
              </div>
            ))}
            {images.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No promotional images configured yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingImage ? 'Edit' : 'Add'} Promotional Image</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Special Offer - 20% Off"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Image {!editingImage && '*'}</label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required={!editingImage}
              />
              {editingImage && (
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to keep current image
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Display Order</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: Number(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Lower numbers show first</p>
              </div>
              <div>
                <label className="text-sm font-medium">Frequency (minutes)</label>
                <select
                  className="h-10 w-full border rounded-md px-3 text-sm"
                  value={formData.displayFrequencyMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayFrequencyMinutes: Number(e.target.value) }))}
                >
                  <option value="1">Every 1 minute</option>
                  <option value="5">Every 5 minutes</option>
                  <option value="10">Every 10 minutes</option>
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Every 1 hour</option>
                  <option value="120">Every 2 hours</option>
                  <option value="240">Every 4 hours</option>
                  <option value="480">Every 8 hours</option>
                  <option value="720">Every 12 hours</option>
                  <option value="1440">Every 24 hours</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">How often to show this popup</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Max Popups Per Session</label>
              <select
                className="h-10 w-full border rounded-md px-3 text-sm"
                value={formData.maxPopupsPerSession}
                onChange={(e) => setFormData(prev => ({ ...prev, maxPopupsPerSession: Number(e.target.value) }))}
              >
                <option value="1">1 popup per session</option>
                <option value="2">2 popups per session</option>
                <option value="3">3 popups per session</option>
                <option value="5">5 popups per session</option>
                <option value="10">10 popups per session</option>
                <option value="0">Unlimited per session</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Maximum popups to show per user session</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Target URL (optional)</label>
              <Input
                value={formData.targetUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, targetUrl: e.target.value }))}
                placeholder="https://example.com/special-offer"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="promo-active"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              <label htmlFor="promo-active" className="text-sm">Active</label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingImage ? 'Update' : 'Add'} Image
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PromotionalImagesManager;