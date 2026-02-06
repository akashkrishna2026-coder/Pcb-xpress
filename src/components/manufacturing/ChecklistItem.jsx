import React from 'react';

const ChecklistItem = ({ label, completed = false, onToggle }) => (
  <div className="flex items-start gap-2 cursor-pointer" onClick={onToggle}>
    <input
      type="checkbox"
      checked={completed}
      onChange={(e) => {
        e.stopPropagation();
        if (onToggle) onToggle();
      }}
      className="mt-1 h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
    />
    <span className={completed ? 'line-through text-muted-foreground' : ''}>{label}</span>
  </div>
);

export default ChecklistItem;