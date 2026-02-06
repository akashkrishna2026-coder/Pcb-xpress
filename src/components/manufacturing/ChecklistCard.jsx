import React from 'react';
import { Button } from '@/components/ui/button';
import DashboardCard from './DashboardCard';
import ChecklistItem from './ChecklistItem';

const ChecklistCard = ({
  title,
  items = [],
  className = '',
  onToggleItem,
  headerActions,
}) => {
  const allCompleted = items.length > 0 && items.every(item => item.completed);
  
  const handleToggleAll = () => {
    if (onToggleItem) {
      const newCompletedState = !allCompleted;
      items.forEach((_, index) => {
        // For mark all functionality, we need to directly toggle the item state
        // This will be handled by the parent component's onToggleItem
        onToggleItem(index, newCompletedState);
      });
    }
  };

  const defaultHeaderActions = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggleAll}
      disabled={!onToggleItem || items.length === 0}
    >
      {allCompleted ? 'Unmark all' : 'Mark all as completed'}
    </Button>
  );

  return (
    <DashboardCard
      title={title}
      className={className}
      headerActions={headerActions || defaultHeaderActions}
    >
      <div className="text-sm text-muted-foreground space-y-2">
        {items.map((item, index) => (
          <ChecklistItem
            key={index}
            label={item.label}
            completed={item.completed}
            onToggle={() => onToggleItem && onToggleItem(index)}
          />
        ))}
      </div>
    </DashboardCard>
  );
};

export default ChecklistCard;