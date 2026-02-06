import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { useToast } from '../ui/use-toast';

const FilmInventory = () => {
  const { toast } = useToast();
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFilms = async () => {
    try {
      const token = localStorage.getItem('mfg_token');
      const result = await api.filmList(token);
      setFilms(result.films || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load films',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilms();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this film?')) return;
    try {
      const token = localStorage.getItem('mfg_token');
      await api.filmDelete(token, id);
      toast({
        title: 'Success',
        description: 'Film deleted successfully',
      });
      loadFilms();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete film',
        variant: 'destructive',
      });
    }
  };

  const handleUpload = async (id, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('mfg_token');
      await api.filmUpload(token, id, formData);
      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
      loadFilms();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Film Inventory</h3>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2">Name</th>
            <th className="border border-gray-300 p-2">Type</th>
            <th className="border border-gray-300 p-2">Quantity</th>
            <th className="border border-gray-300 p-2">Status</th>
            <th className="border border-gray-300 p-2">Upload</th>
            <th className="border border-gray-300 p-2">View</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {films.map(film => (
            <tr key={film._id}>
              <td className="border border-gray-300 p-2">{film.name}</td>
              <td className="border border-gray-300 p-2">{film.type}</td>
              <td className="border border-gray-300 p-2">{film.quantity}</td>
              <td className="border border-gray-300 p-2">{film.status}</td>
              <td className="border border-gray-300 p-2">
                <input type="file" onChange={(e) => handleUpload(film._id, e.target.files[0])} />
              </td>
              <td className="border border-gray-300 p-2">
                {film.fileUrl ? <Button variant="outline" size="sm" onClick={() => window.open(film.fileUrl)}>View</Button> : 'No file'}
              </td>
              <td className="border border-gray-300 p-2">
                <Button variant="outline" size="sm" onClick={() => handleDelete(film._id)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {films.length === 0 && <p>No films found.</p>}
    </div>
  );
};

export default FilmInventory;