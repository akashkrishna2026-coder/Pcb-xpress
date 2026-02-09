import React from 'react';
import DashboardCard from './DashboardCard';
import ChecklistItem from './ChecklistItem';

const ChecklistCard = ({
  title,
  items = [],
  className = '',
  onToggleItem,
  headerActions,
}) => {
  return (
    <DashboardCard
      title={title}
      className={className}
      headerActions={headerActions}
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