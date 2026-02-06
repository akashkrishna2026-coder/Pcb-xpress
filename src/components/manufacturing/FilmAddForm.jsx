import { useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/use-toast';

const FilmAddForm = ({ onSuccess }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    type: 'positive',
    quantity: 1,
    manufacturer: '',
    batchNumber: '',
    expiryDate: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('mfg_token');
      const result = await api.filmCreate(token, formData);
      toast({
        title: 'Success',
        description: 'Film added successfully',
      });
      setFormData({
        name: '',
        type: 'positive',
        quantity: 1,
        manufacturer: '',
        batchNumber: '',
        expiryDate: '',
        notes: '',
      });
      if (onSuccess) onSuccess(result.film);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add film',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <Input
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Type</label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="w-full p-2 border rounded"
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
      <Button type="submit" disabled={loading}>
        {loading ? 'Adding...' : 'Add Film'}
      </Button>
    </form>
  );
};

export default FilmAddForm;