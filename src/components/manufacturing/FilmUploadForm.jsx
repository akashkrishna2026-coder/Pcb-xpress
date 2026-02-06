import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/use-toast';

const FilmUploadForm = ({ onSuccess, token }) => {
  const { toast } = useToast();
  const [workOrders, setWorkOrders] = useState([]);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    type: 'positive',
    quantity: 1,
    manufacturer: '',
    batchNumber: '',
    expiryDate: '',
    notes: '',
    workOrder: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWorkOrders = async () => {
      try {
        const response = await api.mfgWorkOrders(token, { limit: 100 });
        setWorkOrders(response.workOrders || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load work orders',
          variant: 'destructive',
        });
      } finally {
        setLoadingWorkOrders(false);
      }
    };

    if (token) {
      fetchWorkOrders();
    }
  }, [toast, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/zip'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a PDF, image, or ZIP file',
          variant: 'destructive',
        });
        e.target.value = '';
        return;
      }
      // Validate file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 10MB',
          variant: 'destructive',
        });
        e.target.value = '';
        return;
      }
    }
    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast({
        title: 'File required',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();

      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          submitData.append(key, value);
        }
      });

      // Add file
      submitData.append('file', file);

      const result = await api.filmCreateWithFile(token, submitData);

      toast({
        title: 'Success',
        description: 'Film uploaded successfully',
      });

      // Reset form
      setFormData({
        name: '',
        type: 'positive',
        quantity: 1,
        manufacturer: '',
        batchNumber: '',
        expiryDate: '',
        notes: '',
        workOrder: '',
      });
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';

      if (onSuccess) onSuccess(result.film);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload film',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Work Order</label>
        <select
          name="workOrder"
          value={formData.workOrder}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          disabled={loadingWorkOrders}
        >
          <option value="">
            {loadingWorkOrders ? 'Loading work orders...' : 'Select a work order (optional)'}
          </option>
          {workOrders.map((wo) => (
            <option key={wo._id} value={wo._id}>
              {wo.woNumber} - {wo.product || 'No product'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Film File *</label>
        <Input
          id="file-input"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.zip"
          onChange={handleFileChange}
          required
        />
        {file && (
          <p className="text-sm text-gray-600 mt-1">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Name *</label>
        <Input
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Type *</label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
          <option value="emulsion">Emulsion</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Quantity</label>
        <Input
          name="quantity"
          type="number"
          min="0"
          value={formData.quantity}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Manufacturer</label>
        <Input
          name="manufacturer"
          value={formData.manufacturer}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Batch Number</label>
        <Input
          name="batchNumber"
          value={formData.batchNumber}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Expiry Date</label>
        <Input
          name="expiryDate"
          type="date"
          value={formData.expiryDate}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <Textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
        />
      </div>

      <Button type="submit" disabled={loading || !file}>
        {loading ? 'Uploading...' : 'Upload Film'}
      </Button>
    </form>
  );
};

export default FilmUploadForm;