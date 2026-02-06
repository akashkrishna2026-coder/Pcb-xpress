import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const SummaryTile = ({ title, value, caption, icon, highlight, loading }) => {
  const accent =
    highlight === 'alert'
      ? 'border-red-200 bg-red-50'
      : highlight === 'warning'
      ? 'border-yellow-200 bg-yellow-50'
      : highlight === 'info'
      ? 'border-blue-200 bg-blue-50'
      : 'border-gray-200 bg-gray-50';

  return (
    <Card className={`border ${accent}`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
            <div className="text-2xl font-semibold mt-1">
              {loading ? '...' : value}
            </div>
            {caption && <p className="text-xs text-muted-foreground mt-1">{caption}</p>}
          </div>
          <div className="p-2 rounded-full bg-gray-100">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryTile;