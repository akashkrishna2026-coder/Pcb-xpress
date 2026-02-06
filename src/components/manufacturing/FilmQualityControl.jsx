import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { useToast } from '../ui/use-toast';

const FilmQualityControl = () => {
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

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('mfg_token');
      await api.filmUpdate(token, id, { status: newStatus });
      toast({
        title: 'Success',
        description: 'Film status updated successfully',
      });
      loadFilms();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update film status',
        variant: 'destructive',
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Film Quality Control</h3>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2">Name</th>
            <th className="border border-gray-300 p-2">Type</th>
            <th className="border border-gray-300 p-2">Status</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {films.map(film => (
            <tr key={film._id}>
              <td className="border border-gray-300 p-2">{film.name}</td>
              <td className="border border-gray-300 p-2">{film.type}</td>
              <td className="border border-gray-300 p-2">{film.status}</td>
              <td className="border border-gray-300 p-2 space-x-2">
                {film.status !== 'damaged' && (
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange(film._id, 'damaged')}>
                    Mark Damaged
                  </Button>
                )}
                {film.status !== 'expired' && (
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange(film._id, 'expired')}>
                    Mark Expired
                  </Button>
                )}
                {film.status !== 'available' && (
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange(film._id, 'available')}>
                    Mark Available
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {films.length === 0 && <p>No films found.</p>}
    </div>
  );
};

export default FilmQualityControl;