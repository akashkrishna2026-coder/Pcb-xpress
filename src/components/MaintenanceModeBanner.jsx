import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const MaintenanceModeBanner = () => {
  const [maintenanceMode, setMaintenanceMode] = useState({ enabled: false, message: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const res = await api.getMaintenanceModePublic();
        setMaintenanceMode({ enabled: res.enabled, message: res.message });
      } catch (error) {
        console.error('Failed to check maintenance mode:', error);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenanceMode();
  }, []);

  if (loading || !maintenanceMode.enabled) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-black text-center py-3 px-4 font-medium">
      <div className="max-w-4xl mx-auto">
        ⚠️ {maintenanceMode.message}
      </div>
    </div>
  );
};

export default MaintenanceModeBanner;