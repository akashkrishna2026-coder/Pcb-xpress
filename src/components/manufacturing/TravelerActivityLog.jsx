import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import DashboardCard from './DashboardCard';

const TravelerActivityLog = ({
  selectedWorkOrder,
  selectedWorkOrderId,
  travelerEvents = [],
  loading = false,
  onRefresh,
  onSelectWorkOrder,
  workOrders = [],
  onTravelerAction,
  hasPermission,
  eventSubmitting = false
}) => {
  // Auto-refresh traveler events when work order changes
  useEffect(() => {
    if (selectedWorkOrder && onRefresh && hasPermission('traveler:read')) {
      onRefresh();
    }
  }, [selectedWorkOrderId]); // Only depend on the ID to avoid infinite loops

  const formatDateTime = (value) => {
    if (!value) return '--';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '--';
    return dt.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatActionLabel = (action) => {
    switch (String(action || '').toLowerCase()) {
      case 'release':
        return 'Released';
      case 'hold':
        return 'Hold Placed';
      case 'qc_pass':
        return 'QC Passed';
      case 'qc_fail':
        return 'QC Failed';
      case 'scan':
        return 'Traveler Scanned';
      case 'note':
        return 'Note';
      default:
        return action || 'Update';
    }
  };

  const headerActions = (
    <div className="flex flex-col md:flex-row md:items-center gap-2">
      <label className="text-xs uppercase tracking-wide text-muted-foreground">Work order</label>
      <select
        value={selectedWorkOrderId || ''}
        onChange={(e) => onSelectWorkOrder(e.target.value || null)}
        className="h-9 rounded-md border px-2 text-sm"
        disabled={workOrders.length === 0}
      >
        {workOrders.length === 0 ? (
          <option value="">No work orders</option>
        ) : (
          workOrders.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))
        )}
      </select>
    </div>
  );

  return (
    <DashboardCard
      title="Process Activity"
      subtitle="Review scan, release, and hold history for the selected work order."
      headerActions={headerActions}
    >
      {selectedWorkOrder ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">
                {selectedWorkOrder.woNumber || selectedWorkOrder.id}
              </p>
              <p className="text-xs text-muted-foreground">
                Stage: {selectedWorkOrder.stage || '--'} • Priority:{' '}
                {selectedWorkOrder.priority || 'normal'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasPermission('traveler:read') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh Log'}
                </Button>
              )}
              {hasPermission('traveler:release') && (
                <Button
                  size="sm"
                  disabled={eventSubmitting}
                  onClick={() => onTravelerAction('release', selectedWorkOrder, { boardContext: 'activity' })}
                >
                  Release
                </Button>
              )}
              {hasPermission('qc:hold') && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={eventSubmitting}
                  onClick={() => onTravelerAction('hold', selectedWorkOrder, { boardContext: 'activity' })}
                >
                  Hold
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading traveler events...</p>
          ) : travelerEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No traveler events recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {travelerEvents.map((event) => {
                const eventId =
                  event._id ||
                  `${event.workOrderNumber || ''}-${event.occurredAt || event.createdAt}-${event.action}`;
                const metadataEntries =
                  event?.metadata && typeof event.metadata === 'object'
                    ? Object.entries(event.metadata)
                    : [];
                return (
                  <div
                    key={eventId}
                    className="rounded-md border bg-gray-50 p-3"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {formatActionLabel(event.action)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(event.occurredAt || event.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Station: {event.station || '--'} • By:{' '}
                      {event.operatorName || event.operatorLoginId || 'Unknown'}
                    </div>
                    {event.status && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Status: {event.status}
                      </div>
                    )}
                    {metadataEntries.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {metadataEntries.map(([key, value]) => (
                          <span key={`${eventId}-${key}`} className="whitespace-nowrap">
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                    {event.note && (
                      <p className="text-sm mt-2 break-words">{event.note}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a manufacturing work order to view process activity.
        </p>
      )}
    </DashboardCard>
  );
};

export default TravelerActivityLog;