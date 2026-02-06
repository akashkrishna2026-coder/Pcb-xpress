import React from 'react';
import { Button } from '@/components/ui/button';
import DashboardCard from './DashboardCard';

const WorkOrderBoard = ({
  title,
  subtitle,
  icon,
  workOrders = [],
  columns = [],
  loading = false,
  emptyMessage = 'No work orders found.',
  onSelectWorkOrder,
  selectedWorkOrderId,
  renderActions,
  hasPermission
}) => {
  const renderCell = (workOrder, column) => {
    if (column.render) {
      return column.render(workOrder);
    }
    return workOrder[column.key] || '--';
  };

  return (
    <DashboardCard
      title={title}
      subtitle={subtitle}
      icon={icon}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading data...</p>
      ) : workOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    className={`py-2 pr-4 ${column.className || ''} ${column.align === 'right' ? 'text-right' : ''}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workOrders.map((workOrder) => {
                const id = workOrder._id || workOrder.id || workOrder.woNumber;
                const isSelected = selectedWorkOrderId === id;
                const handleRowClick = () => {
                  if (onSelectWorkOrder) {
                    onSelectWorkOrder(workOrder);
                  }
                };
                return (
                  <tr
                    key={id}
                    onClick={handleRowClick}
                    className={`border-b last:border-0 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                    }`}
                  >
                    {columns.map((column) => (
                      <td
                        key={`${id}-${column.key}`}
                        className={`py-3 pr-4 ${column.className || ''} ${
                          column.align === 'right' ? 'text-right' : ''
                        }`}
                      >
                        {column.key === 'actions' ? (
                          <div className="flex justify-end gap-2">
                            {renderActions && renderActions(workOrder)}
                          </div>
                        ) : (
                          renderCell(workOrder, column)
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardCard>
  );
};

export default WorkOrderBoard;
