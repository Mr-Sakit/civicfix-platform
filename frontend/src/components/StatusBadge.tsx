import React from 'react';

interface StatusBadgeProps {
  type: 'status' | 'category' | 'priority';
  value: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  let classes = '';
  let label = value.toUpperCase();
  let icon = '';

  if (type === 'status') {
    switch (value) {
      case 'Reported':
        classes = 'bg-primary/10 text-primary border border-primary/20';
        icon = 'pending_actions';
        label = 'Pending';
        break;
      case 'In Progress':
        classes = 'bg-secondary-container text-on-secondary-container border border-secondary-container';
        icon = 'engineering';
        label = 'Fixing';
        break;
      case 'Resolved':
        classes = 'bg-secondary text-white border border-secondary';
        icon = 'check_circle';
        label = 'Resolved';
        break;
      default:
        classes = 'bg-surface-variant text-on-surface-variant';
    }
  } else if (type === 'category') {
    switch (value) {
      case 'ROADS':
        classes = 'bg-secondary-container text-on-secondary-container';
        label = 'ROADS';
        break;
      case 'UTILITIES':
        classes = 'bg-tertiary-fixed/40 text-on-tertiary-fixed-variant';
        label = 'UTILITIES';
        break;
      case 'SANITATION':
        classes = 'bg-secondary-fixed text-on-secondary-fixed-variant';
        label = 'SANITATION';
        break;
      default:
        classes = 'bg-surface-variant text-on-surface-variant';
    }
  } else if (type === 'priority') {
    switch (value) {
      case 'High':
        classes = 'bg-error-container text-on-error-container font-bold';
        label = 'HIGH';
        break;
      case 'Medium':
        classes = 'bg-surface-container-high text-on-surface-variant';
        label = 'MEDIUM';
        break;
      case 'Low':
        classes = 'bg-surface-container text-on-surface-variant';
        label = 'LOW';
        break;
      default:
        classes = 'bg-surface-variant text-on-surface-variant';
    }
  }

  return (
    <span className={`px-2.5 py-0.5 text-[10px] md:text-xs font-bold rounded-full flex items-center gap-1 w-fit ${classes}`}>
      {icon && <span className="material-symbols-outlined text-sm leading-none">{icon}</span>}
      {label}
    </span>
  );
};
export default StatusBadge;
